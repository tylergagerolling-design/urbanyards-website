const PDFDocument = require("pdfkit");
const {
  requirePermission,
  requestIdFromEvent,
  supabaseAdminRequest,
  writeSystemError
} = require("./lib/dashboard-auth");

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function currency(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0));
}

function safeFileName(value) {
  return String(value || "invoice").replace(/[^a-z0-9_-]/gi, "_").slice(0, 80);
}

function renderInvoicePdf({ invoice, lineItems, ticket }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 54, info: { Title: `Invoice ${invoice.invoice_number || "Draft"}`, Author: "Urban Yards Groundskeeping" } });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    const lineTotal = (line) => Math.round(Number(line.quantity || 0) * Number(line.unit_price || 0) * 100) / 100;
    const subtotal = lineItems.length ? lineItems.reduce((sum, line) => sum + lineTotal(line), 0) : Number(invoice.subtotal || 0);
    const total = Math.max(0, subtotal + Number(invoice.tax || 0) - Number(invoice.discount || 0));
    const paid = Number(invoice.amount_paid || 0) + Number(invoice.deposit || 0);
    doc.fillColor("#0b6541").fontSize(24).font("Helvetica-Bold").text("URBAN YARDS");
    doc.fillColor("#111827").fontSize(20).text(`Invoice ${invoice.invoice_number || "Draft"}`, { align: "right" });
    doc.moveDown(0.4).fontSize(10).font("Helvetica").fillColor("#4b5563").text(`Issue date: ${invoice.issue_date || "Not set"}`, { align: "right" }).text(`Due date: ${invoice.due_date || "Not set"}`, { align: "right" });
    doc.moveDown(2).fillColor("#111827").fontSize(11).font("Helvetica-Bold").text(ticket?.customer_name || invoice.client_name || "Client not linked");
    doc.font("Helvetica").fillColor("#4b5563").text(ticket?.property_name || ticket?.property_address || "Property not linked");
    if (ticket?.ticket_number) doc.text(`Ticket: ${ticket.ticket_number}`);
    doc.moveDown(1.5);
    const columns = [54, 340, 405, 480];
    doc.font("Helvetica-Bold").fillColor("#111827").text("Description", columns[0]).text("Qty", columns[1], undefined, { width: 55, align: "right" }).text("Rate", columns[2], undefined, { width: 65, align: "right" }).text("Amount", columns[3], undefined, { width: 78, align: "right" });
    doc.moveTo(54, doc.y + 5).lineTo(558, doc.y + 5).strokeColor("#d1d5db").stroke();
    doc.moveDown(1);
    (lineItems.length ? lineItems : [{ description: "Invoice services", quantity: 1, unit_price: subtotal }]).forEach((line) => {
      const y = doc.y;
      doc.font("Helvetica").fontSize(10).fillColor("#1f2937").text(line.description || "Service", columns[0], y, { width: 270 });
      doc.text(String(line.quantity || 0), columns[1], y, { width: 55, align: "right" });
      doc.text(currency(line.unit_price), columns[2], y, { width: 65, align: "right" });
      doc.text(currency(lineTotal(line)), columns[3], y, { width: 78, align: "right" });
      doc.moveDown(1.2);
    });
    doc.moveDown().font("Helvetica").text(`Subtotal  ${currency(subtotal)}`, { align: "right" }).text(`Tax  ${currency(invoice.tax)}`, { align: "right" }).text(`Discount  -${currency(invoice.discount)}`, { align: "right" });
    doc.font("Helvetica-Bold").fontSize(13).text(`Total  ${currency(total)}`, { align: "right" });
    doc.font("Helvetica").fontSize(11).text(`Paid  ${currency(paid)}`, { align: "right" }).text(`Balance Due  ${currency(Math.max(0, total - paid))}`, { align: "right" });
    if (invoice.client_notes) doc.moveDown(2).fontSize(10).fillColor("#4b5563").text(invoice.client_notes);
    doc.moveDown(3).fontSize(9).fillColor("#6b7280").text("Generated securely from the current Urban Yards invoice record.", { align: "center" });
    doc.end();
  });
}

exports.handler = async (event) => {
  const requestId = requestIdFromEvent(event);
  if (event.httpMethod !== "GET") return { statusCode: 405, headers: { Allow: "GET" }, body: "Method not allowed." };
  let actor = null;
  try {
    const auth = await requirePermission(event, "money:read", { action: "download-invoice-pdf" });
    actor = auth.actor;
    if (!auth.ok) return { statusCode: auth.statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: auth.error, requestId }) };
    const invoiceId = String(event.queryStringParameters?.invoiceId || "");
    if (!UUID_PATTERN.test(invoiceId)) return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Invoice is required.", requestId }) };
    const encoded = encodeURIComponent(invoiceId);
    const [invoices, lineItems] = await Promise.all([
      supabaseAdminRequest(`invoices?id=eq.${encoded}&select=*&limit=1`, { method: "GET" }),
      supabaseAdminRequest(`invoice_line_items?invoice_id=eq.${encoded}&select=*&order=position.asc&limit=200`, { method: "GET" })
    ]);
    const invoice = invoices?.[0];
    if (!invoice) return { statusCode: 404, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Invoice not found.", requestId }) };
    const tickets = invoice.ticket_id ? await supabaseAdminRequest(`job_tickets?id=eq.${encodeURIComponent(invoice.ticket_id)}&select=id,ticket_number,customer_name,property_name,property_address&limit=1`, { method: "GET" }) : [];
    const bytes = await renderInvoicePdf({ invoice, lineItems: lineItems || [], ticket: tickets?.[0] || null });
    return { statusCode: 200, isBase64Encoded: true, headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="Invoice_${safeFileName(invoice.invoice_number)}.pdf"`, "Cache-Control": "private, no-store" }, body: bytes.toString("base64") };
  } catch (error) {
    await writeSystemError({ route: "invoice-pdf", error, actor, metadata: { requestId } });
    return { statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Invoice PDF could not be generated.", requestId }) };
  }
};

exports._internals = { currency, renderInvoicePdf, safeFileName };
