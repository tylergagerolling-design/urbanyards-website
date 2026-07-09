const {
  featureFlagForTable,
  getFeatureFlag,
  ipFromEvent,
  json,
  permissionForTable,
  rateLimit,
  requestIdFromEvent,
  requirePermission,
  supabaseAdminRequest,
  writeAuditLog,
  writeSystemError
} = require("./lib/dashboard-auth");

// Required environment variables:
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_ANON_KEY
// Optional: VITE_DASHBOARD_OWNER_EMAIL, DASHBOARD_ADMIN_EMAILS

const ALLOWED_METHODS = new Set(["GET", "POST", "PATCH", "DELETE"]);
const TABLE_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const SAFE_PATH_PATTERN = /^[a-zA-Z0-9_?=&.,:%\-()\[\]*!~'"]+$/;

function parseBody(event) {
  try {
    return event.body ? JSON.parse(event.body) : {};
  } catch {
    const error = new Error("Invalid JSON.");
    error.statusCode = 400;
    throw error;
  }
}

function cleanPath(value) {
  const path = String(value || "").trim().replace(/^\/+/, "");
  if (!path || path.length > 1200 || !SAFE_PATH_PATTERN.test(path)) {
    const error = new Error("Unsupported dashboard data path.");
    error.statusCode = 400;
    throw error;
  }
  const table = path.split("?")[0];
  if (!TABLE_PATTERN.test(table)) {
    const error = new Error("Unsupported dashboard table.");
    error.statusCode = 400;
    throw error;
  }
  return { path, table };
}

function sanitizePrefer(value) {
  const prefer = String(value || "").trim();
  return /^[a-z=,\-\s]+$/i.test(prefer) ? prefer.slice(0, 160) : "";
}

function hasScopedMutationFilter(path, method) {
  if (method === "POST") return true;
  const query = path.split("?")[1] || "";
  return /(^|&)id=eq\.[^&]+/.test(query) || /(^|&)[a-zA-Z0-9_]+_id=eq\.[^&]+/.test(query);
}

exports.handler = async (event) => {
  const requestId = requestIdFromEvent(event);
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed.", requestId }, { Allow: "POST" });
  }

  const ip = ipFromEvent(event);
  const limit = rateLimit(`dashboard-records:${ip}`, 180, 10 * 60 * 1000);
  if (!limit.allowed) {
    return json(429, { error: "Too many requests. Please try again later.", requestId }, { "Retry-After": String(limit.retryAfter) });
  }

  let payload;
  let actor = null;
  try {
    payload = parseBody(event);
    const method = String(payload.method || "GET").toUpperCase();
    if (!ALLOWED_METHODS.has(method)) return json(400, { error: "Unsupported dashboard data method.", requestId });

    const { path, table } = cleanPath(payload.path);
    const permission = permissionForTable(table, method);
    if (!permission) return json(400, { error: "Unsupported dashboard table.", requestId });

    const featureFlag = featureFlagForTable(table);
    if (featureFlag && !(await getFeatureFlag(featureFlag, true))) {
      return json(403, { error: "This dashboard feature is currently unavailable.", requestId });
    }

    const auth = await requirePermission(event, permission, { table, method, path });
    actor = auth.actor;
    if (!auth.ok) return json(auth.statusCode, { error: auth.error, requestId });

    if (!hasScopedMutationFilter(path, method)) {
      await writeAuditLog({
        actor,
        action: "unsafe_dashboard_mutation_blocked",
        entityType: table,
        metadata: { method, path },
        event
      });
      return json(400, { error: "This update needs a specific record id.", requestId });
    }

    const headers = {};
    const prefer = sanitizePrefer(payload.prefer || payload.headers?.Prefer || payload.headers?.prefer);
    if (prefer) headers.Prefer = prefer;

    const result = await supabaseAdminRequest(path, {
      method,
      headers,
      body: method === "GET" || method === "DELETE" ? undefined : JSON.stringify(payload.body ?? null)
    });

    await writeAuditLog({
      actor,
      action: `dashboard_${method.toLowerCase()}`,
      entityType: table,
      metadata: { path, method },
      event
    });

    return json(200, { ok: true, data: result, requestId });
  } catch (error) {
    await writeSystemError({
      route: "dashboard-records",
      error,
      actor,
      metadata: {
        path: payload?.path,
        method: payload?.method
      }
    });
    const statusCode = error.statusCode && error.statusCode < 500 ? error.statusCode : 500;
    return json(statusCode, { error: statusCode >= 500 ? "Dashboard update failed." : error.message, requestId });
  }
};
