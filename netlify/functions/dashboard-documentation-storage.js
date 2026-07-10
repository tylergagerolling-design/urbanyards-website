const crypto = require("node:crypto");

const {
  getSupabaseServiceKey,
  getSupabaseUrl,
  ipFromEvent,
  json,
  rateLimit,
  requestIdFromEvent,
  requirePermission,
  writeAuditLog,
  writeSystemError
} = require("./lib/dashboard-auth");

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const ALLOWED_BUCKETS = new Set(["documentation-templates", "documentation-submissions"]);
const ALLOWED_EXTENSIONS = new Set(["pdf", "docx", "jpg", "jpeg", "png", "webp", "xlsx", "csv"]);
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/csv",
  "application/csv",
  "application/octet-stream"
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

function extensionFromName(fileName = "") {
  const match = String(fileName || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "";
}

function safeOriginalName(fileName = "") {
  const cleaned = String(fileName || "documentation-file").replace(/[^\w.\- ]+/g, "").trim();
  return cleaned.slice(0, 120) || "documentation-file";
}

function storagePathForUpload({ actor, kind, fileName, templateId = "", assignmentId = "" }) {
  const extension = extensionFromName(fileName);
  const userKey = String(actor?.userId || actor?.email || "dashboard-user").replace(/[^a-zA-Z0-9_-]/g, "-");
  const entityKey = String(templateId || assignmentId || crypto.randomUUID()).replace(/[^a-zA-Z0-9_-]/g, "-");
  const stamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
  const random = crypto.randomBytes(5).toString("hex");
  const folder = kind === "template" ? "templates" : "submissions";
  return `urban-yards/${folder}/${entityKey}/${userKey}/file-${stamp}-${random}.${extension}`;
}

function validateBucket(bucket) {
  const value = String(bucket || "").trim();
  if (!ALLOWED_BUCKETS.has(value)) {
    const error = new Error("Unsupported documentation storage bucket.");
    error.statusCode = 400;
    throw error;
  }
  return value;
}

function validatePath(path) {
  const value = String(path || "").trim().replace(/^\/+/, "");
  if (!value || value.includes("..") || value.length > 700 || !/^[a-zA-Z0-9/_=.,:%+\- ]+$/.test(value)) {
    const error = new Error("Unsupported documentation storage path.");
    error.statusCode = 400;
    throw error;
  }
  return value;
}

function validateUpload({ fileName, mimeType, size, contentBase64 }) {
  const originalName = safeOriginalName(fileName);
  const extension = extensionFromName(originalName);
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    const error = new Error("Documentation files must be PDF, DOCX, JPG, PNG, WebP, XLSX, or CSV.");
    error.statusCode = 400;
    throw error;
  }
  const safeMime = String(mimeType || "application/octet-stream").trim().toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(safeMime)) {
    const error = new Error("That documentation file type is not allowed.");
    error.statusCode = 400;
    throw error;
  }
  const buffer = Buffer.from(String(contentBase64 || ""), "base64");
  const declaredSize = Number(size || buffer.length);
  if (!buffer.length || buffer.length > MAX_FILE_BYTES || declaredSize > MAX_FILE_BYTES) {
    const error = new Error("Documentation files must be 15 MB or smaller.");
    error.statusCode = 400;
    throw error;
  }
  return { originalName, safeMime, buffer };
}

function storageObjectUrl(bucket, path) {
  const supabaseUrl = getSupabaseUrl();
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `${supabaseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encodedPath}`;
}

async function storageFetch(url, options = {}) {
  const serviceKey = getSupabaseServiceKey();
  if (!getSupabaseUrl() || !serviceKey) {
    const error = new Error("Supabase storage is not configured.");
    error.statusCode = 500;
    throw error;
  }
  const response = await fetch(url, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      ...(options.headers || {})
    },
    signal: AbortSignal.timeout(Number(process.env.SUPABASE_FUNCTION_TIMEOUT_MS || 12000))
  });
  const text = await response.text();
  let payload = null;
  if (text) {
    try { payload = JSON.parse(text); }
    catch { payload = text; }
  }
  if (!response.ok) {
    const error = new Error(payload?.message || payload?.error || `Supabase storage request failed (${response.status}).`);
    error.statusCode = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

async function createSignedUrl(bucket, path) {
  const supabaseUrl = getSupabaseUrl();
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const payload = await storageFetch(`${supabaseUrl}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${encodedPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 300 })
  });
  const signed = payload?.signedURL || payload?.signedUrl || "";
  if (!signed) return "";
  return signed.startsWith("http") ? signed : `${supabaseUrl}/storage/v1${signed}`;
}

exports.handler = async (event) => {
  const requestId = requestIdFromEvent(event);
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed.", requestId }, { Allow: "POST" });
  }

  const ip = ipFromEvent(event);
  const limit = rateLimit(`documentation-storage:${ip}`, 40, 10 * 60 * 1000);
  if (!limit.allowed) {
    return json(429, { error: "Too many documentation requests. Please try again later.", requestId }, { "Retry-After": String(limit.retryAfter) });
  }

  let actor = null;
  let body = null;
  try {
    body = parseBody(event);
    const action = String(body.action || "").trim();

    if (action === "signed-url") {
      const bucket = validateBucket(body.bucket);
      const path = validatePath(body.path);
      const auth = await requirePermission(event, "documentation:read", { entityType: "documentation_file", bucket, path });
      actor = auth.actor;
      if (!auth.ok) return json(auth.statusCode, { error: auth.error, requestId });

      const signedUrl = await createSignedUrl(bucket, path);
      await writeAuditLog({
        actor,
        action: "documentation_file_signed_url_created",
        entityType: "documentation_file",
        entityId: path,
        metadata: { bucket },
        event
      });
      return json(200, { ok: true, bucket, path, signedUrl, requestId });
    }

    if (action !== "upload") {
      return json(400, { error: "Unsupported documentation storage action.", requestId });
    }

    const kind = String(body.kind || "").trim() === "template" ? "template" : "submission";
    const bucket = kind === "template" ? "documentation-templates" : "documentation-submissions";
    const auth = await requirePermission(event, kind === "template" ? "owner:manage" : "documentation:write", { entityType: "documentation_file", bucket, kind });
    actor = auth.actor;
    if (!auth.ok) return json(auth.statusCode, { error: auth.error, requestId });

    const { originalName, safeMime, buffer } = validateUpload(body);
    const path = storagePathForUpload({
      actor,
      kind,
      fileName: originalName,
      templateId: body.templateId,
      assignmentId: body.assignmentId
    });

    await storageFetch(storageObjectUrl(bucket, path), {
      method: "POST",
      headers: {
        "Content-Type": safeMime,
        "x-upsert": "false"
      },
      body: buffer
    });

    await writeAuditLog({
      actor,
      action: kind === "template" ? "documentation_template_file_uploaded" : "documentation_submission_file_uploaded",
      entityType: "documentation_file",
      entityId: path,
      metadata: {
        bucket,
        kind,
        fileName: originalName,
        size: buffer.length,
        templateId: body.templateId || null,
        assignmentId: body.assignmentId || null
      },
      event
    });

    return json(200, {
      ok: true,
      bucket,
      path,
      fileName: originalName,
      mimeType: safeMime,
      size: buffer.length,
      requestId
    });
  } catch (error) {
    await writeSystemError({
      route: "dashboard-documentation-storage",
      error,
      actor,
      metadata: {
        action: body?.action,
        kind: body?.kind
      }
    });
    const statusCode = error.statusCode && error.statusCode < 500 ? error.statusCode : 500;
    return json(statusCode, { error: statusCode >= 500 ? "Documentation storage request failed." : error.message, requestId });
  }
};
