const crypto = require("node:crypto");
const {
  getSupabaseServiceKey,
  getSupabaseUrl,
  ipFromEvent,
  json,
  rateLimit,
  requestIdFromEvent,
  requirePermission,
  supabaseAdminRequest,
  writeAuditLog,
  writeSystemError
} = require("./lib/dashboard-auth");

const BUCKET = "financial-documents";
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const EXTENSIONS = new Set(["pdf", "jpg", "jpeg", "png", "heic", "heif", "docx", "xlsx", "csv"]);
const MIME_TYPES = new Set([
  "application/pdf", "image/jpeg", "image/png", "image/heic", "image/heif",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv", "application/csv", "application/octet-stream"
]);

function parseBody(event) {
  try { return event.body ? JSON.parse(event.body) : {}; }
  catch {
    const error = new Error("Invalid JSON.");
    error.statusCode = 400;
    throw error;
  }
}

function safeId(value, label) {
  const text = String(value || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(text)) {
    const error = new Error(`${label} is required.`);
    error.statusCode = 400;
    throw error;
  }
  return text;
}

function safeName(value) {
  return String(value || "receipt").replace(/[^\w.\- ]+/g, "").trim().slice(0, 120) || "receipt";
}

function extension(value) {
  return safeName(value).toLowerCase().split(".").pop();
}

function safePath(value) {
  const path = String(value || "").replace(/^\/+/, "");
  if (!path.startsWith("financial-documents/") || path.includes("..") || !/^[\w./-]+$/.test(path)) {
    const error = new Error("Invalid financial document path.");
    error.statusCode = 400;
    throw error;
  }
  return path;
}

function validateUpload(body) {
  const fileName = safeName(body.fileName);
  const ext = extension(fileName);
  const mimeType = String(body.mimeType || "application/octet-stream").toLowerCase();
  const buffer = Buffer.from(String(body.contentBase64 || ""), "base64");
  if (!EXTENSIONS.has(ext) || !MIME_TYPES.has(mimeType)) {
    const error = new Error("Use PDF, JPG, PNG, HEIC, DOCX, XLSX, or CSV files.");
    error.statusCode = 400;
    throw error;
  }
  if (!buffer.length || buffer.length > MAX_FILE_BYTES) {
    const error = new Error("Financial documents must be 25 MB or smaller.");
    error.statusCode = 400;
    throw error;
  }
  return { fileName, ext, mimeType, buffer };
}

function objectUrl(path, sign = false) {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${getSupabaseUrl()}/storage/v1/object/${sign ? "sign/" : ""}${encodeURIComponent(BUCKET)}/${encoded}`;
}

async function storageRequest(url, options = {}) {
  const key = getSupabaseServiceKey();
  const response = await fetch(url, {
    ...options,
    headers: { apikey: key, Authorization: `Bearer ${key}`, ...(options.headers || {}) },
    signal: AbortSignal.timeout(15000)
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const error = new Error(payload.message || payload.error || "Financial file request failed.");
    error.statusCode = response.status;
    throw error;
  }
  return payload;
}

exports.handler = async (event) => {
  const requestId = requestIdFromEvent(event);
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed.", requestId }, { Allow: "POST" });
  const rate = rateLimit(`dashboard-financial-storage:${ipFromEvent(event)}`, 50, 10 * 60 * 1000);
  if (!rate.allowed) return json(429, { error: "Too many file requests. Please retry shortly.", requestId });

  let body = null;
  let actor = null;
  try {
    body = parseBody(event);
    const action = String(body.action || "");
    const permission = action === "signed-url" ? "money:read" : "money:write";
    let auth = await requirePermission(event, permission, { action, entityType: "financial_document" });
    if (!auth.ok && action === "upload-expense-receipt") {
      auth = await requirePermission(event, "operations:write", { action, entityType: "financial_document" });
    }
    actor = auth.actor;
    if (!auth.ok) return json(auth.statusCode, { error: auth.error, requestId });

    if (action === "signed-url") {
      const path = safePath(body.path);
      const signed = await storageRequest(objectUrl(path, true), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresIn: 300 })
      });
      const signedUrl = signed.signedURL || signed.signedUrl || "";
      return json(200, { ok: true, signedUrl: signedUrl.startsWith("http") ? signedUrl : `${getSupabaseUrl()}/storage/v1${signedUrl}`, requestId });
    }

    if (action === "upload-expense-receipt") {
      const expenseId = safeId(body.expenseId, "Expense");
      if (["field_worker", "worker", "staff"].includes(String(actor.role || ""))) {
        const expenses = await supabaseAdminRequest(`expenses?id=eq.${encodeURIComponent(expenseId)}&select=id,created_by,ticket_id&limit=1`, { method: "GET" });
        const expense = expenses?.[0];
        let assigned = false;
        if (expense?.ticket_id) {
          const tickets = await supabaseAdminRequest(`job_tickets?id=eq.${encodeURIComponent(expense.ticket_id)}&select=assigned_user_id&limit=1`, { method: "GET" });
          assigned = tickets?.[0]?.assigned_user_id === actor.userId;
        }
        if (!expense || (expense.created_by !== actor.userId && !assigned)) {
          const error = new Error("You can only upload receipts for your own or assigned expenses.");
          error.statusCode = 403;
          throw error;
        }
      }
      const businessId = /^[0-9a-f-]{36}$/i.test(String(body.businessId || "")) ? body.businessId : "default";
      const fileId = crypto.randomUUID();
      const upload = validateUpload(body);
      const path = `financial-documents/${businessId}/expenses/${expenseId}/${fileId}.${upload.ext}`;
      await storageRequest(objectUrl(path), {
        method: "POST",
        headers: { "Content-Type": upload.mimeType, "x-upsert": "false" },
        body: upload.buffer
      });
      const rows = await supabaseAdminRequest("expense_attachments", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          id: fileId,
          business_id: /^[0-9a-f-]{36}$/i.test(businessId) ? businessId : null,
          expense_id: expenseId,
          file_bucket: BUCKET,
          file_path: path,
          file_name: upload.fileName,
          mime_type: upload.mimeType,
          file_size: upload.buffer.length,
          uploaded_by: actor.userId || null
        })
      });
      await supabaseAdminRequest("financial_documents", {
        method: "POST",
        body: JSON.stringify({
          business_id: /^[0-9a-f-]{36}$/i.test(businessId) ? businessId : null,
          document_type: "Receipt",
          title: upload.fileName,
          file_bucket: BUCKET,
          file_path: path,
          file_name: upload.fileName,
          mime_type: upload.mimeType,
          file_size: upload.buffer.length,
          expense_id: expenseId,
          document_date: new Date().toISOString().slice(0, 10),
          uploaded_by: actor.userId || null
        })
      });
      await writeAuditLog({ actor, action: "expense_receipt_uploaded", entityType: "expenses", entityId: expenseId, metadata: { attachmentId: fileId, fileName: upload.fileName }, event });
      return json(200, { ok: true, attachment: rows?.[0], requestId });
    }

    const error = new Error("Unsupported financial storage action.");
    error.statusCode = 400;
    throw error;
  } catch (error) {
    await writeSystemError({ route: "dashboard-financial-storage", error, actor, metadata: { action: body?.action } });
    const statusCode = error.statusCode && error.statusCode < 500 ? error.statusCode : 500;
    return json(statusCode, { error: statusCode >= 500 ? "Financial document request failed." : error.message, requestId });
  }
};

exports._internals = { extension, safePath, validateUpload };
