const OPEN_INVOICE_STATUSES = new Set(["UNPAID", "SCHEDULED", "PARTIALLY_PAID", "PAYMENT_PENDING"]);

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function getSquareAccessToken() {
  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token) throw new Error("Square is not configured.");
  return token;
}

function parseEnvList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function squareRequest(method, path, body) {
  const response = await fetch(`https://connect.squareup.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${getSquareAccessToken()}`,
      "Content-Type": "application/json",
      "Square-Version": process.env.SQUARE_VERSION || "2025-06-18"
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
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
  // Square Customers Search documents email_address.fuzzy for email matching.
  // We still verify the exact email client-side before using the customer id.
  const payload = await squareRequest("POST", "/v2/customers/search", {
    query: {
      filter: {
        email_address: {
          fuzzy: email
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

function getAmountMoney(invoice) {
  // Square invoice response fields can vary by API version. Prefer direct
  // balance/total fields, then fall back to payment request amounts.
  return invoice.balance_money ||
    invoice.amount_money ||
    invoice.total_money ||
    (Array.isArray(invoice.payment_requests) && invoice.payment_requests[0]?.computed_amount_money) ||
    (Array.isArray(invoice.payment_requests) && invoice.payment_requests[0]?.fixed_amount_requested_money) ||
    null;
}

function formatMoney(money) {
  if (!money || typeof money.amount !== "number") return "";
  const currency = money.currency || "USD";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(money.amount / 100);
}

function getPaymentUrl(invoice) {
  return invoice.public_url || invoice.payment_url || invoice.checkout_url || "";
}

function getInvoiceNumber(invoice) {
  return invoice.invoice_number || invoice.title || invoice.id || "";
}

function safeInvoice(invoice) {
  const money = getAmountMoney(invoice);
  return {
    id: invoice.id,
    invoiceNumber: getInvoiceNumber(invoice),
    status: invoice.status,
    dueDate: getInvoiceDueDate(invoice),
    amountDue: formatMoney(money),
    amountDueCents: typeof money?.amount === "number" ? money.amount : null,
    currency: money?.currency || "USD",
    paymentUrl: getPaymentUrl(invoice)
  };
}

async function getInvoice(invoiceId) {
  const payload = await squareRequest("GET", `/v2/invoices/${encodeURIComponent(invoiceId)}`);
  return payload.invoice;
}

async function findLocationIds() {
  const configured = parseEnvList(process.env.SQUARE_LOCATION_ID);
  if (configured.length) return configured;

  const payload = await squareRequest("GET", "/v2/locations");
  return (payload.locations || [])
    .filter((location) => !location.status || location.status === "ACTIVE")
    .map((location) => location.id)
    .filter(Boolean);
}

async function searchInvoices(customerIds) {
  const filter = {};
  const locationIds = await findLocationIds();
  if (locationIds.length) filter.location_ids = locationIds;
  if (customerIds.length) filter.customer_ids = customerIds;

  const payload = await squareRequest("POST", "/v2/invoices/search", {
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

async function findInvoicesByEmail(email) {
  const customerIds = await findCustomerIdsByEmail(email);
  if (!customerIds.length) return [];
  return searchInvoices(customerIds);
}

module.exports = {
  OPEN_INVOICE_STATUSES,
  findInvoicesByEmail,
  getInvoice,
  getPaymentUrl,
  safeInvoice
};
