const crypto = require("node:crypto");
const { json, supabaseAdminRequest } = require("./lib/dashboard-auth");
const { getInvoice, safeInvoice } = require("./lib/square-invoices");

function verifySquareSignature(event) {
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  const notificationUrl = process.env.SQUARE_WEBHOOK_URL;
  if (!signatureKey || !notificationUrl) return false;

  const signature = event.headers["x-square-hmacsha256-signature"] || event.headers["X-Square-Hmacsha256-Signature"];
  if (!signature) return false;

  // Square signs the notification URL plus raw request body with HMAC-SHA256.
  // If Square changes the header/canonical string, adjust this small block.
  const hmac = crypto.createHmac("sha256", signatureKey);
  hmac.update(notificationUrl + (event.body || ""));
  const expected = hmac.digest("base64");

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

function statusForSquare(status) {
  if (status === "PAID") return "paid";
  if (status === "CANCELED" || status === "REFUNDED") return "void";
  return "sent";
}

async function updateDocumentFromInvoice(invoice) {
  const safe = safeInvoice(invoice);
  const matchPath = `sales_documents?square_invoice_id=eq.${encodeURIComponent(safe.id)}`;
  let rows = await supabaseAdminRequest(`${matchPath}&select=id`, { method: "GET" });

  if (!rows?.length && safe.invoiceNumber) {
    rows = await supabaseAdminRequest(`sales_documents?square_invoice_number=eq.${encodeURIComponent(safe.invoiceNumber)}&select=id`, { method: "GET" });
  }

  if (!rows?.length) return false;

  await supabaseAdminRequest(`sales_documents?id=eq.${encodeURIComponent(rows[0].id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      square_invoice_id: safe.id,
      square_invoice_number: safe.invoiceNumber,
      square_status: safe.status,
      square_payment_url: safe.paymentUrl,
      square_amount_due_cents: safe.amountDueCents,
      square_currency: safe.currency,
      square_synced_at: new Date().toISOString(),
      status: statusForSquare(safe.status)
    })
  });
  return true;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed." });
  if (!verifySquareSignature(event)) return json(401, { error: "Invalid signature." });

  try {
    const body = JSON.parse(event.body || "{}");
    const invoiceId =
      body?.data?.object?.invoice?.id ||
      body?.data?.object?.invoice_id ||
      body?.data?.id;

    if (!invoiceId) return json(200, { ok: true, ignored: true });

    const invoice = await getInvoice(invoiceId);
    const updated = await updateDocumentFromInvoice(invoice);
    return json(200, { ok: true, updated });
  } catch (error) {
    console.error(JSON.stringify({ event: "square_webhook_error", message: error.message }));
    return json(200, { ok: false });
  }
};
