const {
  json,
  rateLimit,
  ipFromEvent,
  requestIdFromEvent,
  requirePermission,
  supabaseAdminRequest,
  writeAuditLog,
  writeSystemError
} = require("./lib/dashboard-auth");

function cleanFilter(value, max = 120) {
  return String(value || "").trim().replace(/[^\w@.+:/ -]/g, "").slice(0, max);
}

function buildAuditPath(params = {}) {
  const query = new URLSearchParams();
  query.set("select", "*");
  query.set("order", "created_at.desc");
  query.set("limit", String(Math.min(Math.max(Number(params.limit || 200), 1), 500)));

  const action = cleanFilter(params.action);
  const entityType = cleanFilter(params.entityType);
  const actorUserId = cleanFilter(params.actorUserId, 80);
  const moduleName = cleanFilter(params.module, 80);
  const from = cleanFilter(params.from, 40);
  const to = cleanFilter(params.to, 40);

  if (action) query.set("action", `ilike.*${action}*`);
  if (entityType) query.set("entity_type", `eq.${entityType}`);
  if (actorUserId) query.set("actor_user_id", `eq.${actorUserId}`);
  if (moduleName) query.set("module", `eq.${moduleName}`);
  if (from) query.set("created_at", `gte.${from}`);
  if (to) query.append("created_at", `lte.${to}`);

  return `audit_logs?${query.toString()}`;
}

exports.handler = async (event) => {
  const requestId = requestIdFromEvent(event);
  if (event.httpMethod !== "GET") {
    return json(405, { error: "Method not allowed.", requestId }, { Allow: "GET" });
  }

  const limit = rateLimit(`dashboard-activity:${ipFromEvent(event)}`, 80, 10 * 60 * 1000);
  if (!limit.allowed) {
    return json(429, { error: "Too many activity requests. Try again shortly.", requestId }, { "Retry-After": String(limit.retryAfter || 60) });
  }

  let actor = null;
  try {
    const auth = await requirePermission(event, "admin:manage", { route: "dashboard-activity" });
    actor = auth.actor;
    if (!auth.ok) return json(auth.statusCode, { error: auth.error, requestId });

    const rows = await supabaseAdminRequest(buildAuditPath(event.queryStringParameters || {}), { method: "GET" });
    await writeAuditLog({
      actor,
      action: "activity_log_viewed",
      entityType: "audit_logs",
      metadata: { filters: event.queryStringParameters || {} },
      event,
      module: "activity"
    });
    return json(200, { ok: true, logs: Array.isArray(rows) ? rows : [], requestId });
  } catch (error) {
    if (/module|schema cache|column/i.test(error.message || "")) {
      try {
        const fallbackParams = { ...(event.queryStringParameters || {}) };
        delete fallbackParams.module;
        const rows = await supabaseAdminRequest(buildAuditPath(fallbackParams), { method: "GET" });
        return json(200, { ok: true, logs: Array.isArray(rows) ? rows : [], requestId });
      } catch (fallbackError) {
        error = fallbackError;
      }
    }
    await writeSystemError({ route: "dashboard-activity", error, actor });
    const statusCode = error.statusCode && error.statusCode < 500 ? error.statusCode : 500;
    return json(statusCode, { error: statusCode >= 500 ? "Activity log request failed." : error.message, requestId });
  }
};
