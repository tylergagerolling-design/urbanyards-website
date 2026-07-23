const {
  ipFromEvent,
  json,
  rateLimit,
  requestIdFromEvent,
  requirePermission,
  supabaseAdminRequest,
  writeSystemError
} = require("./lib/dashboard-auth");

const MAX_PAGE_SIZE = 100;
const SORTS = new Set([
  "expense_date.desc", "expense_date.asc", "total.desc", "total.asc",
  "vendor_name.asc", "vendor_name.desc", "updated_at.desc"
]);

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

async function handleAction(body) {
  const action = String(body.action || "");
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
    const auth = await requirePermission(event, "money:read", { action: body.action });
    actor = auth.actor;
    if (!auth.ok) return json(auth.statusCode, { error: auth.error, requestId });
    const data = await handleAction(body);
    return json(200, { ok: true, data, requestId });
  } catch (error) {
    await writeSystemError({ route: "dashboard-financial", error, actor, metadata: { action: body?.action } });
    const statusCode = error.statusCode && error.statusCode < 500 ? error.statusCode : 500;
    return json(statusCode, { error: statusCode >= 500 ? "Financial records could not be loaded." : error.message, requestId });
  }
};

exports._internals = { expensePath, safeDate, safeText };
