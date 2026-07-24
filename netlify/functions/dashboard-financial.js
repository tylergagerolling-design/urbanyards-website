const {
  ipFromEvent,
  json,
  rateLimit,
  requestIdFromEvent,
  requirePermission,
  supabaseAdminRequest,
  writeSystemError
} = require("./lib/dashboard-auth");
const crypto = require("node:crypto");

const MAX_PAGE_SIZE = 100;
const SORTS = new Set([
  "expense_date.desc", "expense_date.asc", "total.desc", "total.asc",
  "vendor_name.asc", "vendor_name.desc", "updated_at.desc"
]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EXPENSE_CATEGORIES = new Set(["Materials","Equipment","Fuel","Vehicle","Insurance","Software","Advertising","Office","Subcontractor","Labor","Permits and Fees","Professional Services","Rent","Utilities","Taxes","Meals","Other"]);
const DELETABLE_FINANCIAL_ENTITIES = Object.freeze({
  expense: { table: "expenses", select: "id,expense_date,vendor_name,description,total,status,archived_at" },
  invoice: { table: "invoices", select: "id,invoice_number,issue_date,subtotal,tax,discount,deposit,amount_paid,status,archived_at" },
  vendor: { table: "vendors", select: "id,vendor_name,contact_name,status,archived_at" },
  document: { table: "financial_documents", select: "id,title,file_name,document_type,document_date,archived_at" }
});

function parseBody(event) {
  try {
    return event.body ? JSON.parse(event.body) : {};
  } catch {
    const error = new Error("Invalid JSON.");
    error.statusCode = 400;
    throw error;
  }
}

function safeDate(value, fallback) {
  const text = String(value || "");
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : fallback;
}

function safeText(value, max = 100) {
  return String(value || "").trim().replace(/[%_,()]/g, " ").slice(0, max);
}

function createInvoiceNumber(now = new Date(), suffix = crypto.randomUUID().slice(0, 4)) {
  const stamp = now.toISOString().replace(/\D/g, "").slice(0, 14);
  return `INV-${stamp.slice(0, 8)}-${stamp.slice(8)}-${String(suffix).replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase()}`;
}

function expensePath(body) {
  const page = Math.max(1, Number.parseInt(body.page, 10) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(10, Number.parseInt(body.pageSize, 10) || 50));
  const offset = (page - 1) * pageSize;
  const sort = SORTS.has(body.sort) ? body.sort : "expense_date.desc";
  const [column, direction] = sort.split(".");
  const params = new URLSearchParams({
    select: "id,expense_date,vendor_id,vendor_name,category,description,client_id,property_id,job_id,ticket_id,payment_method,subtotal,tax,total,reimbursable,status,notes,created_by,created_at,updated_at,version",
    archived_at: "is.null",
    order: `${column}.${direction}`,
    limit: String(pageSize),
    offset: String(offset)
  });
  const status = safeText(body.status, 40);
  if (status && status !== "All") params.set("status", `eq.${status}`);
  const search = safeText(body.search, 80);
  if (search) params.set("or", `(vendor_name.ilike.*${search}*,description.ilike.*${search}*,notes.ilike.*${search}*)`);
  return `expenses?${params}`;
}

async function handleAction(body, actor = {}) {
  const action = String(body.action || "");
  if (action === "list-deleted") {
    const entries = await Promise.all(Object.entries(DELETABLE_FINANCIAL_ENTITIES).map(async ([entityType, config]) => {
      const rows = await supabaseAdminRequest(
        `${config.table}?select=${config.select}&archived_at=not.is.null&order=archived_at.desc&limit=100`,
        { method: "GET" }
      );
      return (rows || []).map((row) => ({ entityType, ...row }));
    }));
    return entries.flat().sort((left, right) => String(right.archived_at || "").localeCompare(String(left.archived_at || "")));
  }
  if (["archive-record", "restore-record", "delete-record-permanently"].includes(action)) {
    const entityType = String(body.entityType || "");
    const config = DELETABLE_FINANCIAL_ENTITIES[entityType];
    const id = String(body.id || "");
    if (!config || !UUID_PATTERN.test(id)) {
      const error = new Error("A valid financial record is required.");
      error.statusCode = 400;
      throw error;
    }
    const path = `${config.table}?id=eq.${encodeURIComponent(id)}`;
    if (action === "delete-record-permanently") {
      await supabaseAdminRequest(path, { method: "DELETE" });
      await supabaseAdminRequest("financial_activity", {
        method: "POST",
        body: JSON.stringify({
          entity_type: entityType,
          entity_id: null,
          action: "permanently_deleted",
          details: { deleted_record_id: id },
          actor_user_id: actor.userId || null
        })
      });
      return { id, entityType, permanentlyDeleted: true };
    }
    const archivedAt = action === "archive-record" ? new Date().toISOString() : null;
    const rows = await supabaseAdminRequest(path, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ archived_at: archivedAt })
    });
    await supabaseAdminRequest("financial_activity", {
      method: "POST",
      body: JSON.stringify({
        entity_type: entityType,
        entity_id: id,
        action: action === "archive-record" ? "moved_to_recently_deleted" : "restored",
        details: {},
        actor_user_id: actor.userId || null
      })
    });
    return rows?.[0] || { id, entityType, archived_at: archivedAt };
  }
  if (action === "overview") {
    const today = new Date().toISOString().slice(0, 10);
    const start = safeDate(body.start, `${today.slice(0, 8)}01`);
    const end = safeDate(body.end, today);
    return supabaseAdminRequest("rpc/financial_overview", {
      method: "POST",
      body: JSON.stringify({
        range_start: start,
        range_end: end,
        target_business_id: body.businessId || null
      })
    });
  }
  if (action === "list-expenses") return supabaseAdminRequest(expensePath(body), { method: "GET" });
  if (action === "list-vendors") {
    return supabaseAdminRequest(
      "vendors?select=id,vendor_name,contact_name,email,phone,website,default_expense_category,status,notes,updated_at&archived_at=is.null&order=vendor_name.asc&limit=200",
      { method: "GET" }
    );
  }
  if (action === "list-invoices") {
    return supabaseAdminRequest(
      "invoices?select=id,invoice_number,client_id,property_id,ticket_id,issue_date,due_date,subtotal,tax,discount,deposit,amount_paid,status,payment_method,square_invoice_url,last_sent_at,updated_at&archived_at=is.null&order=issue_date.desc&limit=100",
      { method: "GET" }
    );
  }
  if (action === "list-documents") {
    return supabaseAdminRequest(
      "financial_documents?select=id,document_type,title,file_name,mime_type,expense_id,invoice_id,vendor_id,client_id,property_id,ticket_id,document_date,uploaded_by,created_at&archived_at=is.null&order=created_at.desc&limit=100",
      { method: "GET" }
    );
  }
  if (action === "create-invoice") {
    const invoiceNumber = createInvoiceNumber();
    return supabaseAdminRequest("invoices", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        business_id: body.businessId || null,
        invoice_number: invoiceNumber,
        status: "Draft",
        issue_date: safeDate(body.issueDate, new Date().toISOString().slice(0, 10)),
        due_date: safeDate(body.dueDate, new Date().toISOString().slice(0, 10)),
        client_id: UUID_PATTERN.test(String(body.clientId || "")) ? body.clientId : null,
        property_id: UUID_PATTERN.test(String(body.propertyId || "")) ? body.propertyId : null,
        ticket_id: UUID_PATTERN.test(String(body.ticketId || "")) ? body.ticketId : null,
        subtotal: Math.max(0, Number(body.subtotal || 0)),
        created_by: actor.userId || null,
        updated_by: actor.userId || null
      })
    });
  }
  if (action === "submit-expense") {
    const ticketId = UUID_PATTERN.test(String(body.ticketId || "")) ? body.ticketId : null;
    if (ticketId && ["field_worker", "worker"].includes(String(actor.role || ""))) {
      const tickets = await supabaseAdminRequest(`job_tickets?id=eq.${encodeURIComponent(ticketId)}&select=id,assigned_user_id&limit=1`, { method: "GET" });
      if (!tickets?.[0] || tickets[0].assigned_user_id !== actor.userId) {
        const error = new Error("You can only submit expenses for tickets assigned to you.");
        error.statusCode = 403;
        throw error;
      }
    }
    const total = Number(body.total);
    if (!Number.isFinite(total) || total < 0) {
      const error = new Error("Expense total must be a nonnegative number.");
      error.statusCode = 400;
      throw error;
    }
    return supabaseAdminRequest("expenses", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        expense_date: safeDate(body.expenseDate, new Date().toISOString().slice(0, 10)),
        ticket_id: ticketId,
        vendor_name: safeText(body.vendorName, 120) || null,
        category: EXPENSE_CATEGORIES.has(body.category) ? body.category : "Other",
        description: safeText(body.description, 500) || null,
        total,
        status: "Pending Receipt",
        created_by: actor.userId || null,
        updated_by: actor.userId || null
      })
    });
  }
  if (action === "invoice-detail") {
    if (!UUID_PATTERN.test(String(body.invoiceId || ""))) {
      const error = new Error("Invoice is required.");
      error.statusCode = 400;
      throw error;
    }
    const invoiceId = encodeURIComponent(body.invoiceId);
    const [invoice, lineItems, payments, attachments, activity] = await Promise.all([
      supabaseAdminRequest(`invoices?id=eq.${invoiceId}&select=*&limit=1`, { method: "GET" }),
      supabaseAdminRequest(`invoice_line_items?invoice_id=eq.${invoiceId}&select=*&order=position.asc&limit=200`, { method: "GET" }),
      supabaseAdminRequest(`invoice_payments?invoice_id=eq.${invoiceId}&select=*&order=payment_date.desc&limit=100`, { method: "GET" }),
      supabaseAdminRequest(`invoice_attachments?invoice_id=eq.${invoiceId}&select=*&archived_at=is.null&order=created_at.desc&limit=100`, { method: "GET" }),
      supabaseAdminRequest(`financial_activity?entity_type=eq.invoice&entity_id=eq.${invoiceId}&select=*&order=created_at.desc&limit=100`, { method: "GET" })
    ]);
    return { invoice: invoice?.[0] || null, lineItems, payments, attachments, activity };
  }
  const error = new Error("Unsupported financial action.");
  error.statusCode = 400;
  throw error;
}

exports.handler = async (event) => {
  const requestId = requestIdFromEvent(event);
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed.", requestId }, { Allow: "POST" });
  const limit = rateLimit(`dashboard-financial:${ipFromEvent(event)}`, 120, 10 * 60 * 1000);
  if (!limit.allowed) return json(429, { error: "Too many financial requests. Please retry shortly.", requestId });

  let body = null;
  let actor = null;
  try {
    body = parseBody(event);
    const requestedAction = String(body.action || "");
    const permission = requestedAction === "submit-expense"
      ? "operations:write"
      : requestedAction === "delete-record-permanently"
        ? "admin:manage"
      : ["create-invoice", "archive-record", "restore-record"].includes(requestedAction)
        ? "money:write"
        : "money:read";
    const auth = await requirePermission(event, permission, { action: body.action });
    actor = auth.actor;
    if (!auth.ok) return json(auth.statusCode, { error: auth.error, requestId });
    const data = await handleAction(body, actor);
    return json(200, { ok: true, data, requestId });
  } catch (error) {
    await writeSystemError({ route: "dashboard-financial", error, actor, metadata: { action: body?.action } });
    const statusCode = error.statusCode && error.statusCode < 500 ? error.statusCode : 500;
    return json(statusCode, { error: statusCode >= 500 ? "Financial records could not be loaded." : error.message, requestId });
  }
};

exports._internals = { createInvoiceNumber, expensePath, safeDate, safeText };
