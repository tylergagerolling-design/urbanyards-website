const { OPEN_INVOICE_STATUSES, findInvoicesByEmail, getPaymentUrl, safeInvoice } = require("./lib/square-invoices");
const RATE_LIMIT = new Map();

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
    const invoices = await findInvoicesByEmail(email);
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
