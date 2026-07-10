const {
  ROLE_ORDER,
  actorFromHeaders,
  getSupabaseServiceKey,
  getSupabaseUrl,
  hasRoleAtLeast,
  json,
  normalizeRole,
  rateLimit,
  ipFromEvent,
  requestIdFromEvent,
  requirePermission,
  supabaseAdminRequest,
  writeAuditLog,
  writeSystemError
} = require("./lib/dashboard-auth");
const { buildAuthCallbackUrl } = require("./lib/site-url");

const ADMIN_ROLES = new Set(["owner", "admin"]);
const USER_ROLES = ROLE_ORDER.filter((role) => role !== "client" && role !== "staff");

function parseBody(event) {
  try {
    return event.body ? JSON.parse(event.body) : {};
  } catch {
    const error = new Error("Invalid JSON.");
    error.statusCode = 400;
    throw error;
  }
}

function cleanEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function cleanRole(value) {
  const normalized = normalizeRole(value);
  if (normalized === "staff") return "manager";
  return USER_ROLES.includes(normalized) ? normalized : "";
}

function cleanUserId(value) {
  return String(value || "").trim().replace(/[^a-fA-F0-9-]/g, "").slice(0, 80);
}

function canManageUsers(actor) {
  return actor && ADMIN_ROLES.has(actor.role);
}

async function authAdminRequest(path, options = {}) {
  const supabaseUrl = getSupabaseUrl();
  const serviceKey = getSupabaseServiceKey();
  if (!supabaseUrl || !serviceKey) throw new Error("Supabase service role is not configured.");

  const response = await fetch(`${supabaseUrl}/auth/v1/${path.replace(/^\/+/, "")}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    signal: AbortSignal.timeout(Number(process.env.SUPABASE_FUNCTION_TIMEOUT_MS || 10000))
  });

  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : {}; } catch { payload = text; }
  if (!response.ok) {
    const error = new Error(payload?.msg || payload?.message || `Supabase Auth admin request failed (${response.status}).`);
    error.statusCode = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

async function safeRows(path) {
  try {
    const rows = await supabaseAdminRequest(path, { method: "GET" });
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    if (/does not exist|schema cache|relation/i.test(error.message || "")) return [];
    throw error;
  }
}

async function listAuthUsers() {
  try {
    const payload = await authAdminRequest("admin/users?page=1&per_page=1000", { method: "GET" });
    return Array.isArray(payload?.users) ? payload.users : [];
  } catch (error) {
    if (error.statusCode === 404 || /not found|disabled/i.test(error.message || "")) return [];
    throw error;
  }
}

function profileKey(profile = {}) {
  return String(profile.id || profile.user_id || profile.email || "").toLowerCase();
}

function authUserToProfile(user = {}) {
  const meta = user.user_metadata || {};
  return {
    id: user.id || "",
    user_id: user.id || "",
    email: cleanEmail(user.email),
    full_name: meta.full_name || meta.name || "",
    display_name: meta.display_name || "",
    role: user.app_metadata?.role || user.user_metadata?.role || "viewer",
    title: meta.title || "",
    created_at: user.created_at || null,
    last_login_at: user.last_sign_in_at || null,
    invited_at: user.invited_at || null,
    disabled_at: user.banned_until && new Date(user.banned_until) > new Date() ? user.banned_until : null
  };
}

async function listUsers() {
  const [authUsers, profiles, roleRows] = await Promise.all([
    listAuthUsers(),
    safeRows("profiles?select=*&order=email.asc.nullslast,full_name.asc.nullslast"),
    safeRows("roles?select=*&order=email.asc.nullslast,created_at.asc")
  ]);

  const byKey = new Map();
  authUsers.forEach((user) => {
    const profile = authUserToProfile(user);
    byKey.set(profile.id || profile.email, profile);
  });

  profiles.forEach((profile) => {
    const id = profile.id || profile.user_id || "";
    const email = cleanEmail(profile.email);
    const existing = byKey.get(id) || byKey.get(email) || {};
    byKey.set(id || email || profileKey(profile), { ...existing, ...profile, user_id: id || profile.user_id || existing.user_id || "" });
  });

  roleRows.forEach((roleRow) => {
    const id = roleRow.user_id || "";
    const email = cleanEmail(roleRow.email);
    const existing = byKey.get(id) || byKey.get(email) || {};
    const key = id || email || roleRow.id;
    byKey.set(key, {
      ...existing,
      id: existing.id || id,
      user_id: existing.user_id || id,
      email: existing.email || email,
      role: roleRow.role || existing.role || "viewer",
      role_updated_at: roleRow.updated_at,
      invited_at: existing.invited_at || roleRow.created_at
    });
  });

  return Array.from(byKey.values())
    .filter((user) => user.id || user.user_id || user.email)
    .map((user) => ({
      ...user,
      role: cleanRole(user.role) || "viewer",
      disabled_at: user.disabled_at || null
    }))
    .sort((a, b) => cleanEmail(a.email).localeCompare(cleanEmail(b.email)) || String(a.full_name || "").localeCompare(String(b.full_name || "")));
}

async function upsertRole({ userId = "", email = "", role }) {
  const cleanUser = cleanUserId(userId);
  const cleanMail = cleanEmail(email);
  const body = {
    user_id: cleanUser || null,
    email: cleanMail || null,
    role,
    updated_at: new Date().toISOString()
  };
  const conflict = cleanUser ? "user_id" : "email";
  return supabaseAdminRequest(`roles?on_conflict=${conflict}`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(body)
  });
}

async function updateProfileFields(userId, fields) {
  const cleanUser = cleanUserId(userId);
  if (!cleanUser) return [];
  return supabaseAdminRequest(`profiles?id=eq.${encodeURIComponent(cleanUser)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ ...fields, updated_at: new Date().toISOString() })
  });
}

async function inviteUser(actor, event, payload) {
  const email = cleanEmail(payload.email);
  const role = cleanRole(payload.role) || "viewer";
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json(400, { error: "Enter a valid email address." });
  }
  if (!role) return json(400, { error: "Choose a valid dashboard role." });

  await upsertRole({ email, role });

  let invited = false;
  let inviteMessage = "";
  try {
    const redirectTo = buildAuthCallbackUrl(event);
    await authAdminRequest(`invite?redirect_to=${encodeURIComponent(redirectTo)}`, {
      method: "POST",
      body: JSON.stringify({
        email,
        data: { role, invited_by: actor.email || actor.userId }
      })
    });
    invited = true;
  } catch (error) {
    inviteMessage = error.message || "Role saved, but Supabase invite could not be sent.";
  }

  await writeAuditLog({
    actor,
    action: invited ? "user_invited" : "user_role_precreated",
    entityType: "user",
    entityId: email,
    newValue: { email, role, invited },
    metadata: { email, role, invited, inviteMessage, redirectTo: buildAuthCallbackUrl(event) },
    event,
    module: "users"
  });

  return json(200, { ok: true, invited, message: invited ? "Invite sent." : inviteMessage || "Role saved for this email." });
}

async function changeRole(actor, event, payload) {
  const targetUserId = cleanUserId(payload.userId || payload.targetUserId);
  const targetEmail = cleanEmail(payload.email);
  const role = cleanRole(payload.role);
  if (!targetUserId && !targetEmail) return json(400, { error: "Choose a user to update." });
  if (!role) return json(400, { error: "Choose a valid dashboard role." });
  if (role === "owner" && !hasRoleAtLeast(actor.role, "owner")) {
    return json(403, { error: "Only the owner can assign owner access." });
  }

  const before = targetUserId
    ? await safeRows(`profiles?id=eq.${encodeURIComponent(targetUserId)}&select=*&limit=1`)
    : await safeRows(`roles?email=eq.${encodeURIComponent(targetEmail)}&select=*&limit=1`);

  await upsertRole({ userId: targetUserId, email: targetEmail, role });
  if (targetUserId) {
    await updateProfileFields(targetUserId, { role });
  }

  await writeAuditLog({
    actor,
    action: "user_role_changed",
    entityType: "user",
    entityId: targetUserId || targetEmail,
    oldValue: before[0] || null,
    newValue: { userId: targetUserId || null, email: targetEmail || null, role },
    metadata: { userId: targetUserId || null, email: targetEmail || null, role },
    event,
    module: "users"
  });

  return json(200, { ok: true, message: "User role updated." });
}

async function setDisabled(actor, event, payload, disabled) {
  const targetUserId = cleanUserId(payload.userId || payload.targetUserId);
  if (!targetUserId) return json(400, { error: "Choose a user to update." });
  if (targetUserId === actor.userId && disabled) {
    return json(400, { error: "You cannot disable your own dashboard account." });
  }

  const before = await safeRows(`profiles?id=eq.${encodeURIComponent(targetUserId)}&select=*&limit=1`);
  const fields = disabled
    ? { disabled_at: new Date().toISOString(), disabled_by: actor.userId || null }
    : { disabled_at: null, disabled_by: null };
  await updateProfileFields(targetUserId, fields);

  await writeAuditLog({
    actor,
    action: disabled ? "user_disabled" : "user_enabled",
    entityType: "user",
    entityId: targetUserId,
    oldValue: before[0] || null,
    newValue: fields,
    metadata: { userId: targetUserId },
    event,
    module: "users"
  });

  return json(200, { ok: true, message: disabled ? "User disabled." : "User enabled." });
}

async function userActivity(targetUserId) {
  const cleanUser = cleanUserId(targetUserId);
  if (!cleanUser) return [];
  return safeRows(`audit_logs?actor_user_id=eq.${encodeURIComponent(cleanUser)}&select=*&order=created_at.desc&limit=20`);
}

exports.handler = async (event) => {
  const requestId = requestIdFromEvent(event);
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed.", requestId }, { Allow: "POST" });
  }

  const limit = rateLimit(`dashboard-users:${ipFromEvent(event)}`, 80, 10 * 60 * 1000);
  if (!limit.allowed) {
    return json(429, { error: "Too many user admin requests. Try again shortly.", requestId }, { "Retry-After": String(limit.retryAfter || 60) });
  }

  let actor = null;
  let payload = {};
  try {
    payload = parseBody(event);
    const action = String(payload.action || "list").trim();

    if (action === "me") {
      actor = await actorFromHeaders(event.headers || {});
      if (!actor) return json(401, { error: "Unauthorized.", requestId });
      if (actor.disabled) return json(403, { error: "This dashboard user has been disabled.", requestId });
      return json(200, { ok: true, user: { ...actor.profile, id: actor.userId, user_id: actor.userId, email: actor.email, role: actor.role }, requestId });
    }

    const auth = await requirePermission(event, "admin:manage", { route: "dashboard-users", action });
    actor = auth.actor;
    if (!auth.ok) return json(auth.statusCode, { error: auth.error, requestId });
    if (!canManageUsers(actor)) return json(403, { error: "Only an owner or admin can manage users.", requestId });

    if (action === "list") {
      return json(200, { ok: true, users: await listUsers(), roles: USER_ROLES, requestId });
    }
    if (action === "invite") return inviteUser(actor, event, payload);
    if (action === "update-role") return changeRole(actor, event, payload);
    if (action === "disable") return setDisabled(actor, event, payload, true);
    if (action === "enable") return setDisabled(actor, event, payload, false);
    if (action === "activity") return json(200, { ok: true, logs: await userActivity(payload.userId), requestId });

    return json(400, { error: "Unsupported user admin action.", requestId });
  } catch (error) {
    await writeSystemError({ route: "dashboard-users", error, actor, metadata: { action: payload?.action } });
    const statusCode = error.statusCode && error.statusCode < 500 ? error.statusCode : 500;
    return json(statusCode, { error: statusCode >= 500 ? "User admin request failed." : error.message, requestId });
  }
};
