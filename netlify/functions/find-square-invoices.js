const RATE_LIMIT = new Map();
const OPEN_INVOICE_STATUSES = new Set(["UNPAID", "SCHEDULED", "PARTIALLY_PAID", "PAYMENT_PENDING"]);

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(body)
  };
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function rateLimit(key) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const current = RATE_LIMIT.get(key) || [];
  const recent = current.filter((time) => now - time < windowMs);
  recent.push(now);
  RATE_LIMIT.set(key, recent);
  return recent.length <= 12;
}

async function squareRequest(path, body) {
  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token) throw new Error("Square is not configured.");

  const response = await fetch(`https://connect.squareup.com${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Square-Version": process.env.SQUARE_VERSION || "2025-06-18"
    },
    body: JSON.stringify(body || {}),
    signal: AbortSignal.timeout(12000)
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.errors?.[0]?.detail || payload.errors?.[0]?.code || `Square request failed (${response.status})`;
    throw new Error(message);
  }
  return payload;
}

async function findCustomerIdsByEmail(email) {
  // Square Customers Search supports email filtering. If Square adjusts this shape,
  // update the query object here while keeping the response trimmed below.
  const payload = await squareRequest("/v2/customers/search", {
    query: {
      filter: {
        email_address: {
          exact: email
        }
      }
    },
    limit: 10
  });
  return (payload.customers || [])
    .filter((customer) => normalizeEmail(customer.email_address) === email)
    .map((customer) => customer.id)
    .filter(Boolean);
}

function getInvoiceDueDate(invoice) {
  const requests = Array.isArray(invoice.payment_requests) ? invoice.payment_requests : [];
  return requests.find((request) => request.due_date)?.due_date || "";
}

function getAmountDue(invoice) {
  // Square invoice response fields have varied across API versions. Prefer the
  // most direct amount fields, then fall back to the payment request amount.
  const money =
    invoice.balance_money ||
    invoice.amount_money ||
    invoice.total_money ||
    (Array.isArray(invoice.payment_requests) && invoice.payment_requests[0]?.computed_amount_money) ||
    (Array.isArray(invoice.payment_requests) && invoice.payment_requests[0]?.fixed_amount_requested_money);

  if (!money || typeof money.amount !== "number") return "";
  const currency = money.currency || "USD";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(money.amount / 100);
}

function getPaymentUrl(invoice) {
  return invoice.public_url || invoice.payment_url || invoice.checkout_url || "";
}

function safeInvoice(invoice) {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoice_number || invoice.title || invoice.id,
    status: invoice.status,
    dueDate: getInvoiceDueDate(invoice),
    amountDue: getAmountDue(invoice),
    paymentUrl: getPaymentUrl(invoice)
  };
}

async function searchInvoices(customerIds) {
  const filter = {};
  if (process.env.SQUARE_LOCATION_ID) filter.location_ids = [process.env.SQUARE_LOCATION_ID];
  if (customerIds.length) filter.customer_ids = customerIds;

  const payload = await squareRequest("/v2/invoices/search", {
    query: {
      filter,
      sort: {
        field: "INVOICE_SORT_DATE",
        order: "DESC"
      }
    },
    limit: 20
  });
  return payload.invoices || [];
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed." });
  }

  const ip = event.headers["x-nf-client-connection-ip"] || event.headers["client-ip"] || "unknown";
  if (!rateLimit(ip)) {
    return json(429, { error: "Too many lookup attempts. Please try again later." });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (error) {
    return json(400, { error: "Invalid request." });
  }

  const email = normalizeEmail(body.email);
  const invoiceNumber = String(body.invoiceNumber || "").trim().toLowerCase();
  if (!email || !isValidEmail(email)) {
    return json(400, { error: "Please enter a valid email address." });
  }

  try {
    const customerIds = await findCustomerIdsByEmail(email);
    if (!customerIds.length) return json(200, { invoices: [] });

    const invoices = await searchInvoices(customerIds);
    const safeResults = invoices
      .filter((invoice) => OPEN_INVOICE_STATUSES.has(invoice.status))
      .filter((invoice) => getPaymentUrl(invoice))
      .filter((invoice) => !invoiceNumber || String(invoice.invoice_number || invoice.title || "").toLowerCase() === invoiceNumber)
      .map(safeInvoice);

    return json(200, { invoices: safeResults });
  } catch (error) {
    console.error(JSON.stringify({ event: "square_invoice_lookup_error", message: error.message }));
    return json(502, { error: "Invoice lookup is temporarily unavailable. Please request invoice help." });
  }
};
