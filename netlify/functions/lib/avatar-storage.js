const crypto = require("node:crypto");

const {
  getSupabaseServiceKey,
  getSupabaseUrl,
  hasRoleAtLeast,
  json,
  rateLimit,
  supabaseAdminRequest,
  writeAuditLog,
  writeSystemError
} = require("./dashboard-auth");

const AVATAR_BUCKET = "user-avatars";
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function normalizeUserId(value) {
  return String(value || "").trim().replace(/[^a-fA-F0-9-]/g, "").slice(0, 80);
}

function extensionFromName(fileName = "") {
  const match = String(fileName || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "";
}

function extensionForMime(mimeType) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

function stripDataUrl(value = "") {
  const text = String(value || "");
  const commaIndex = text.indexOf(",");
  return text.startsWith("data:") && commaIndex >= 0 ? text.slice(commaIndex + 1) : text;
}

function validateMagicBytes(buffer, mimeType) {
  if (mimeType === "image/jpeg") {
    return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === "image/png") {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return signature.every((byte, index) => buffer[index] === byte);
  }
  if (mimeType === "image/webp") {
    return buffer.slice(0, 4).toString("ascii") === "RIFF" && buffer.slice(8, 12).toString("ascii") === "WEBP";
  }
  return false;
}

function decodeAvatarPayload(body = {}) {
  const fileName = String(body.fileName || body.filename || "").trim();
  const mimeType = String(body.mimeType || body.type || "").trim().toLowerCase();
  const extension = extensionFromName(fileName);

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw Object.assign(new Error("Avatar must be a JPG, PNG, or WebP image."), { statusCode: 400 });
  }
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw Object.assign(new Error("Avatar file type is not allowed."), { statusCode: 400 });
  }

  const buffer = Buffer.from(stripDataUrl(body.data || body.base64 || ""), "base64");
  if (!buffer.length) {
    throw Object.assign(new Error("Avatar file is empty."), { statusCode: 400 });
  }
  if (buffer.length > MAX_AVATAR_BYTES) {
    throw Object.assign(new Error("Avatar file must be 2 MB or smaller."), { statusCode: 400 });
  }
  if (!validateMagicBytes(buffer, mimeType)) {
    throw Object.assign(new Error("Avatar image did not pass file validation."), { statusCode: 400 });
  }

  return { buffer, extension: extensionForMime(mimeType), mimeType };
}

function objectUrlForPath(path) {
  return `${getSupabaseUrl()}/storage/v1/object/public/${AVATAR_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

async function uploadAvatarObject(path, buffer, mimeType) {
  const storageUrl = `${getSupabaseUrl()}/storage/v1/object/${AVATAR_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
  const response = await fetch(storageUrl, {
    method: "POST",
    headers: {
      apikey: getSupabaseServiceKey(),
      Authorization: `Bearer ${getSupabaseServiceKey()}`,
      "Content-Type": mimeType,
      "Cache-Control": "3600",
      "x-upsert": "true"
    },
    body: buffer,
    signal: AbortSignal.timeout(Number(process.env.SUPABASE_FUNCTION_TIMEOUT_MS || 10000))
  });

  const text = await response.text();
  if (!response.ok) {
    let payload = {};
    try { payload = text ? JSON.parse(text) : {}; } catch { payload = {}; }
    throw new Error(payload.message || `Avatar upload failed (${response.status}).`);
  }
}

async function deleteAvatarObject(path) {
  if (!path) return;
  try {
    const response = await fetch(`${getSupabaseUrl()}/storage/v1/object/${AVATAR_BUCKET}`, {
      method: "DELETE",
      headers: {
        apikey: getSupabaseServiceKey(),
        Authorization: `Bearer ${getSupabaseServiceKey()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prefixes: [path] }),
      signal: AbortSignal.timeout(Number(process.env.SUPABASE_FUNCTION_TIMEOUT_MS || 10000))
    });
    if (!response.ok && response.status !== 404) {
      const text = await response.text();
      console.warn(JSON.stringify({ event: "avatar_delete_old_failed", status: response.status, body: text.slice(0, 500) }));
    }
  } catch (error) {
    console.warn(JSON.stringify({ event: "avatar_delete_old_failed", message: error.message }));
  }
}

async function loadProfile(targetUserId) {
  const rows = await supabaseAdminRequest(`profiles?id=eq.${encodeURIComponent(targetUserId)}&select=*&limit=1`, { method: "GET" });
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function upsertAvatarProfile(targetUserId, actor, avatarUrl, avatarPath) {
  const rows = await supabaseAdminRequest("profiles?on_conflict=id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      id: targetUserId,
      email: actor.userId === targetUserId ? actor.email : undefined,
      avatar_url: avatarUrl,
      avatar_path: avatarPath,
      avatar_updated_at: new Date().toISOString()
    })
  });
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function clearAvatarProfile(targetUserId) {
  const rows = await supabaseAdminRequest(`profiles?id=eq.${encodeURIComponent(targetUserId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      avatar_url: null,
      avatar_path: null,
      avatar_updated_at: new Date().toISOString()
    })
  });
  return Array.isArray(rows) ? rows[0] || null : null;
}

function canUpdateTarget(actor, targetUserId) {
  return actor?.userId === targetUserId || hasRoleAtLeast(actor?.role, "admin");
}

async function handleAvatarUpload(event, actor, { adminOnly = false } = {}) {
  const limit = rateLimit(`avatar:${actor.userId}`, 12, 10 * 60 * 1000);
  if (!limit.allowed) return json(429, { error: "Too many avatar updates. Try again shortly." }, { "Retry-After": String(limit.retryAfter || 60) });

  const body = event.body ? JSON.parse(event.body) : {};
  const requestedTarget = normalizeUserId(body.targetUserId || body.userId || actor.userId);
  const targetUserId = requestedTarget || actor.userId;

  if (adminOnly && !hasRoleAtLeast(actor.role, "admin")) {
    await writeAuditLog({
      actor,
      action: "permission_denied_avatar_update",
      entityType: "profile",
      entityId: targetUserId,
      metadata: { reason: "admin_required" },
      event
    });
    return json(403, { error: "Only an owner or admin can update another user's avatar." });
  }
  if (!canUpdateTarget(actor, targetUserId)) {
    await writeAuditLog({
      actor,
      action: "permission_denied_avatar_update",
      entityType: "profile",
      entityId: targetUserId,
      metadata: { reason: "not_owner" },
      event
    });
    return json(403, { error: "You can only update your own avatar." });
  }

  const previousProfile = await loadProfile(targetUserId).catch(() => null);
  const { buffer, extension, mimeType } = decodeAvatarPayload(body);
  const timestamp = Date.now();
  const random = crypto.randomBytes(6).toString("hex");
  const avatarPath = `${targetUserId}/avatar-${timestamp}-${random}.${extension}`;
  const avatarUrl = objectUrlForPath(avatarPath);

  await uploadAvatarObject(avatarPath, buffer, mimeType);
  const profile = await upsertAvatarProfile(targetUserId, actor, avatarUrl, avatarPath);
  if (previousProfile?.avatar_path && previousProfile.avatar_path !== avatarPath) {
    await deleteAvatarObject(previousProfile.avatar_path);
  }

  await writeAuditLog({
    actor,
    action: previousProfile?.avatar_path ? "user_avatar_changed" : "user_avatar_uploaded",
    entityType: "profile",
    entityId: targetUserId,
    metadata: { avatar_path: avatarPath },
    event
  });

  return json(200, { avatarUrl, avatarPath, profile });
}

async function handleAvatarDelete(event, actor) {
  const body = event.body ? JSON.parse(event.body) : {};
  const requestedTarget = normalizeUserId(body.targetUserId || body.userId || actor.userId);
  const targetUserId = requestedTarget || actor.userId;

  if (!canUpdateTarget(actor, targetUserId)) {
    await writeAuditLog({
      actor,
      action: "permission_denied_avatar_update",
      entityType: "profile",
      entityId: targetUserId,
      metadata: { reason: "delete_not_owner" },
      event
    });
    return json(403, { error: "You can only remove your own avatar." });
  }

  const previousProfile = await loadProfile(targetUserId).catch(() => null);
  if (previousProfile?.avatar_path) {
    await deleteAvatarObject(previousProfile.avatar_path);
  }
  const profile = await clearAvatarProfile(targetUserId);

  await writeAuditLog({
    actor,
    action: "user_avatar_removed",
    entityType: "profile",
    entityId: targetUserId,
    metadata: { avatar_path: previousProfile?.avatar_path || null },
    event
  });

  return json(200, { profile });
}

async function withAvatarErrors(event, actor, route, callback) {
  try {
    return await callback();
  } catch (error) {
    await writeSystemError({ route, error, actor, metadata: { feature: "user_avatars" } });
    return json(error.statusCode || 500, { error: error.statusCode ? error.message : "Avatar update failed." });
  }
}

module.exports = {
  handleAvatarDelete,
  handleAvatarUpload,
  withAvatarErrors
};
