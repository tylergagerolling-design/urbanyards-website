const { json, supabaseAdminRequest, verifyOwner } = require("./lib/dashboard-auth");
const { findInvoicesByEmail, getInvoice, safeInvoice } = require("./lib/square-invoices");

function squareFields(invoice) {
  const safe = safeInvoice(invoice);
  return {
    square_invoice_id: safe.id,
    square_invoice_number: safe.invoiceNumber,
    square_status: safe.status,
    square_payment_url: safe.paymentUrl,
    square_amount_due_cents: safe.amountDueCents,
    square_currency: safe.currency,
    square_synced_at: new Date().toISOString(),
    due_date: safe.dueDate || null,
    total: safe.amountDueCents === null ? undefined : safe.amountDueCents / 100,
    status: safe.status === "PAID" ? "paid" : "sent"
  };
}

function cleanPatch(payload) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
}

async function findSquareInvoiceForDocument(document) {
  if (document.square_invoice_id) {
    return getInvoice(document.square_invoice_id);
  }

  if (!document.client_email || !document.square_invoice_number && !document.document_number) {
    throw new Error("Add a Square invoice number or Square invoice id before syncing.");
  }

  const invoiceNumber = String(document.square_invoice_number || document.document_number || "").toLowerCase();
  const invoices = await findInvoicesByEmail(String(document.client_email).toLowerCase());
  const match = invoices.find((invoice) => {
    const number = String(invoice.invoice_number || invoice.title || invoice.id || "").toLowerCase();
    return number === invoiceNumber;
  });

  if (!match) throw new Error("No matching Square invoice found for this client and invoice number.");
  return match;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed." });

  try {
    const allowed = await verifyOwner(event);
    if (!allowed) return json(401, { error: "Unauthorized." });

    const body = JSON.parse(event.body || "{}");
    const documentId = String(body.documentId || "").trim();
    if (!documentId) return json(400, { error: "Missing document id." });

    const documents = await supabaseAdminRequest(`sales_documents?id=eq.${encodeURIComponent(documentId)}&select=*`, {
      method: "GET"
    });
    const document = documents && documents[0];
    if (!document) return json(404, { error: "Document not found." });

    const invoice = await findSquareInvoiceForDocument(document);
    const patch = cleanPatch(squareFields(invoice));
    const updated = await supabaseAdminRequest(`sales_documents?id=eq.${encodeURIComponent(documentId)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(patch)
    });

    return json(200, { ok: true, document: updated[0] || null });
  } catch (error) {
    console.error(JSON.stringify({ event: "square_invoice_sync_error", message: error.message }));
    return json(502, { error: error.message || "Unable to sync Square invoice." });
  }
};
