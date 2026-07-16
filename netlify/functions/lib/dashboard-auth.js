const crypto = require("node:crypto");

// Required environment variables for privileged dashboard functions:
// SUPABASE_URL or VITE_SUPABASE_URL
// SUPABASE_SERVICE_ROLE_KEY
// VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY
// Optional: VITE_DASHBOARD_OWNER_EMAIL, DASHBOARD_ADMIN_EMAILS

const ROLE_ORDER = ["client", "viewer", "field_worker", "worker", "sales_outreach", "staff", "accountant", "manager", "admin", "owner"];
const PROTECTED_ROLES = new Set(ROLE_ORDER);
const RATE_LIMIT_BUCKETS = new Map();

const ROLE_PERMISSIONS = {
  owner: ["*"],
  admin: ["*"],
  manager: [
    "dashboard:read",
    "tickets:read", "tickets:write", "tickets:assign",
    "leads:read", "leads:write", "leads:delete",
    "clients:read", "clients:write",
    "appointments:read", "appointments:write", "appointments:delete",
    "equipment:read", "equipment:write", "equipment:delete",
    "documentation:read", "documentation:write", "documentation:review",
    "operations:read", "operations:write", "operations:approve", "operations:automate", "operations:share",
    "notes:read", "notes:write", "notes:delete",
    "call_logs:read", "call_logs:write",
    "route:read", "route:write", "route:delete",
    "invoices:read",
    "settings:read",
    "exports:read",
    "imports:read", "imports:write", "imports:rollback",
    "backups:download",
    "sheets:manage"
  ],
  staff: [
    "dashboard:read",
    "tickets:read", "tickets:write",
    "leads:read", "leads:write",
    "clients:read", "clients:write",
    "appointments:read", "appointments:write",
    "equipment:read", "equipment:write",
    "documentation:read", "documentation:write",
    "operations:read", "operations:write",
    "notes:read", "notes:write",
    "call_logs:read", "call_logs:write",
    "route:read", "route:write",
    "invoices:read",
    "settings:read",
    "exports:read",
    "imports:read", "imports:write"
  ],
  worker: [
    "dashboard:read",
    "tickets:read", "tickets:write",
    "clients:read",
    "appointments:read", "appointments:write",
    "equipment:read",
    "documentation:read", "documentation:write",
    "operations:read", "operations:write",
    "notes:read", "notes:write",
    "call_logs:read", "call_logs:write",
    "route:read", "route:write"
  ],
  field_worker: [
    "dashboard:read",
    "tickets:read", "tickets:write",
    "clients:read",
    "appointments:read", "appointments:write",
    "equipment:read",
    "documentation:read", "documentation:write",
    "operations:read", "operations:write",
    "notes:read", "notes:write",
    "call_logs:read", "call_logs:write",
    "route:read", "route:write"
  ],
  sales_outreach: [
    "dashboard:read",
    "tickets:read", "tickets:write",
    "leads:read", "leads:write",
    "clients:read", "clients:write",
    "documentation:read",
    "notes:read", "notes:write",
    "call_logs:read", "call_logs:write",
    "exports:read"
  ],
  accountant: [
    "dashboard:read",
    "tickets:read", "tickets:write",
    "clients:read",
    "appointments:read",
    "documentation:read", "documentation:write", "documentation:review",
    "operations:read",
    "notes:read", "notes:write",
    "invoices:read",
    "settings:read",
    "exports:read",
    "backups:download"
  ],
  viewer: [
    "dashboard:read",
    "tickets:read",
    "leads:read",
    "clients:read",
    "appointments:read",
    "equipment:read",
    "documentation:read",
    "operations:read",
    "notes:read",
    "call_logs:read",
    "route:read"
  ],
  client: ["client_portal:read"]
};

const TABLE_PERMISSIONS = {
  quote_submissions: { GET: "leads:read", POST: "leads:write", PATCH: "leads:write", DELETE: "leads:delete" },
  outreach_prospects: { GET: "leads:read", POST: "leads:write", PATCH: "leads:write", DELETE: "leads:delete" },
  outreach_companies: { GET: "leads:read", POST: "leads:write", PATCH: "leads:write", DELETE: "leads:delete" },
  outreach_properties: { GET: "leads:read", POST: "leads:write", PATCH: "leads:write", DELETE: "leads:delete" },
  contacts: { GET: "clients:read", POST: "clients:write", PATCH: "clients:write", DELETE: "admin:manage" },
  clients: { GET: "clients:read", POST: "clients:write", PATCH: "clients:write", DELETE: "admin:manage" },
  properties: { GET: "clients:read", POST: "clients:write", PATCH: "clients:write", DELETE: "admin:manage" },
  scheduled_jobs: { GET: "appointments:read", POST: "appointments:write", PATCH: "appointments:write", DELETE: "appointments:delete" },
  appointments: { GET: "appointments:read", POST: "appointments:write", PATCH: "appointments:write", DELETE: "appointments:delete" },
  follow_up_reminders: { GET: "appointments:read", POST: "appointments:write", PATCH: "appointments:write", DELETE: "appointments:delete" },
  operations_records: { GET: "appointments:read", POST: "appointments:write", PATCH: "appointments:write", DELETE: "appointments:delete" },
  route_stops: { GET: "route:read", POST: "route:write", PATCH: "route:write", DELETE: "route:delete" },
  job_notes: { GET: "notes:read", POST: "notes:write", PATCH: "notes:write", DELETE: "notes:delete" },
  lead_notes: { GET: "notes:read", POST: "notes:write", PATCH: "notes:write", DELETE: "notes:delete" },
  lead_activity: { GET: "call_logs:read", POST: "call_logs:write", PATCH: "call_logs:write", DELETE: "admin:manage" },
  call_logs: { GET: "call_logs:read", POST: "call_logs:write", PATCH: "call_logs:write", DELETE: "admin:manage" },
  equipment_items: { GET: "equipment:read", POST: "equipment:write", PATCH: "equipment:write", DELETE: "equipment:delete" },
  equipment: { GET: "equipment:read", POST: "equipment:write", PATCH: "equipment:write", DELETE: "equipment:delete" },
  equipment_maintenance: { GET: "equipment:read", POST: "equipment:write", PATCH: "equipment:write", DELETE: "equipment:delete" },
  hardware_guide: { GET: "equipment:read", POST: "equipment:write", PATCH: "equipment:write", DELETE: "equipment:delete" },
  sales_documents: { GET: "invoices:read", POST: "admin:manage", PATCH: "admin:manage", DELETE: "admin:manage" },
  invoices: { GET: "invoices:read", POST: "admin:manage", PATCH: "admin:manage", DELETE: "admin:manage" },
  recurring_services: { GET: "operations:read", POST: "operations:write", PATCH: "operations:write", DELETE: "admin:manage" },
  recurring_service_visits: { GET: "operations:read", POST: "operations:write", PATCH: "operations:write", DELETE: "admin:manage" },
  job_checklist_templates: { GET: "operations:read", POST: "operations:write", PATCH: "operations:write", DELETE: "admin:manage" },
  job_checklist_template_items: { GET: "operations:read", POST: "operations:write", PATCH: "operations:write", DELETE: "admin:manage" },
  job_checklists: { GET: "operations:read", POST: "operations:write", PATCH: "operations:write", DELETE: "admin:manage" },
  job_checklist_items: { GET: "operations:read", POST: "operations:write", PATCH: "operations:write", DELETE: "admin:manage" },
  job_time_entries: { GET: "operations:read", POST: "operations:write", PATCH: "operations:write", DELETE: "admin:manage" },
  job_site_photos: { GET: "operations:read", POST: "operations:write", PATCH: "operations:write", DELETE: "admin:manage" },
  approval_requests: { GET: "operations:read", POST: "operations:write", PATCH: "operations:approve", DELETE: "admin:manage" },
  communications: { GET: "operations:read", POST: "operations:write", PATCH: "operations:write", DELETE: "admin:manage" },
  communication_templates: { GET: "operations:read", POST: "operations:write", PATCH: "operations:write", DELETE: "admin:manage" },
  client_share_links: { GET: "operations:read", POST: "operations:share", PATCH: "operations:share", DELETE: "admin:manage" },
  client_share_link_permissions: { GET: "operations:read", POST: "operations:share", PATCH: "operations:share", DELETE: "admin:manage" },
  client_share_link_events: { GET: "operations:read", POST: "operations:share", PATCH: "operations:share", DELETE: "admin:manage" },
  equipment_maintenance_schedules: { GET: "equipment:read", POST: "equipment:write", PATCH: "equipment:write", DELETE: "equipment:delete" },
  equipment_maintenance_records: { GET: "equipment:read", POST: "equipment:write", PATCH: "equipment:write", DELETE: "equipment:delete" },
  automation_rules: { GET: "operations:read", POST: "operations:automate", PATCH: "operations:automate", DELETE: "admin:manage" },
  automation_runs: { GET: "operations:read", POST: "operations:automate", PATCH: "operations:automate", DELETE: "admin:manage" },
  command_usage_history: { GET: "operations:read", POST: "operations:write", PATCH: "admin:manage", DELETE: "admin:manage" },
  job_tickets: { GET: "dashboard:read", POST: "tickets:write", PATCH: "tickets:write", DELETE: "admin:manage" },
  job_ticket_events: { GET: "dashboard:read", POST: "tickets:write", PATCH: "admin:manage", DELETE: "admin:manage" },
  job_ticket_links: { GET: "dashboard:read", POST: "tickets:write", PATCH: "tickets:write", DELETE: "admin:manage" },
  documentation_templates: { GET: "documentation:read", POST: "admin:manage", PATCH: "admin:manage", DELETE: "admin:manage" },
  documentation_template_versions: { GET: "documentation:read", POST: "admin:manage", PATCH: "admin:manage", DELETE: "admin:manage" },
  documentation_assignments: { GET: "documentation:read", POST: "documentation:write", PATCH: "documentation:write", DELETE: "admin:manage" },
  documentation_submissions: { GET: "documentation:read", POST: "documentation:write", PATCH: "documentation:review", DELETE: "admin:manage" },
  documentation_attachments: { GET: "documentation:read", POST: "documentation:write", PATCH: "documentation:write", DELETE: "admin:manage" },
  documentation_audit_logs: { GET: "documentation:review", POST: "documentation:write", PATCH: "admin:manage", DELETE: "admin:manage" },
  ai_settings: { GET: "ai:manage", POST: "ai:manage", PATCH: "ai:manage", DELETE: "ai:manage" },
  ai_knowledge: { GET: "ai:manage", POST: "ai:manage", PATCH: "ai:manage", DELETE: "ai:manage" },
  ai_faqs: { GET: "ai:manage", POST: "ai:manage", PATCH: "ai:manage", DELETE: "ai:manage" },
  ai_rules: { GET: "ai:manage", POST: "ai:manage", PATCH: "ai:manage", DELETE: "ai:manage" },
  ai_saved_answers: { GET: "ai:manage", POST: "ai:manage", PATCH: "ai:manage", DELETE: "ai:manage" },
  ai_training_rules: { GET: "ai:manage", POST: "ai:manage", PATCH: "ai:manage", DELETE: "ai:manage" },
  ai_helper_versions: { GET: "ai:manage", POST: "ai:manage", PATCH: "ai:manage", DELETE: "ai:manage" },
  ai_conversation_logs: { GET: "ai:manage", POST: "ai:manage", PATCH: "ai:manage", DELETE: "ai:manage" },
  ai_feedback: { GET: "ai:manage", POST: "ai:manage", PATCH: "ai:manage", DELETE: "ai:manage" },
  settings: { GET: "settings:read", POST: "admin:manage", PATCH: "admin:manage", DELETE: "admin:manage" },
  feature_flags: { GET: "settings:read", POST: "admin:manage", PATCH: "admin:manage", DELETE: "admin:manage" },
  import_batches: { GET: "imports:read", POST: "imports:write", PATCH: "imports:rollback", DELETE: "admin:manage" },
  import_rows: { GET: "imports:read", POST: "imports:write", PATCH: "admin:manage", DELETE: "admin:manage" },
  import_changes: { GET: "imports:read", POST: "imports:write", PATCH: "admin:manage", DELETE: "admin:manage" },
  import_mappings: { GET: "imports:read", POST: "imports:write", PATCH: "imports:write", DELETE: "admin:manage" },
  export_jobs: { GET: "exports:read", POST: "exports:read", PATCH: "admin:manage", DELETE: "admin:manage" },
  google_connections: { GET: "sheets:manage", POST: "sheets:manage", PATCH: "sheets:manage", DELETE: "sheets:manage" },
  sheet_connections: { GET: "sheets:manage", POST: "sheets:manage", PATCH: "sheets:manage", DELETE: "sheets:manage" },
  sync_runs: { GET: "sheets:manage", POST: "sheets:manage", PATCH: "sheets:manage", DELETE: "admin:manage" },
  sync_conflicts: { GET: "sheets:manage", POST: "sheets:manage", PATCH: "sheets:manage", DELETE: "admin:manage" },
  backup_history: { GET: "imports:read", POST: "backups:download", PATCH: "admin:manage", DELETE: "admin:manage" },
  budget_settings: { GET: "settings:read", POST: "admin:manage", PATCH: "admin:manage", DELETE: "admin:manage" },
  job_budgets: { GET: "invoices:read", POST: "admin:manage", PATCH: "admin:manage", DELETE: "admin:manage" },
  job_budget_labor: { GET: "invoices:read", POST: "admin:manage", PATCH: "admin:manage", DELETE: "admin:manage" },
  job_budget_materials: { GET: "invoices:read", POST: "admin:manage", PATCH: "admin:manage", DELETE: "admin:manage" },
  budget_material_catalog: { GET: "invoices:read", POST: "admin:manage", PATCH: "admin:manage", DELETE: "admin:manage" },
  job_budget_equipment: { GET: "invoices:read", POST: "admin:manage", PATCH: "admin:manage", DELETE: "admin:manage" },
  job_budget_costs: { GET: "invoices:read", POST: "admin:manage", PATCH: "admin:manage", DELETE: "admin:manage" },
  job_budget_change_orders: { GET: "invoices:read", POST: "admin:manage", PATCH: "admin:manage", DELETE: "admin:manage" },
  job_budget_documents: { GET: "invoices:read", POST: "admin:manage", PATCH: "admin:manage", DELETE: "admin:manage" },
  job_budget_templates: { GET: "invoices:read", POST: "admin:manage", PATCH: "admin:manage", DELETE: "admin:manage" },
  job_budget_template_items: { GET: "invoices:read", POST: "admin:manage", PATCH: "admin:manage", DELETE: "admin:manage" },
  job_budget_history: { GET: "invoices:read", POST: "admin:manage", PATCH: "admin:manage", DELETE: "admin:manage" },
  profiles: { GET: "admin:manage", POST: "admin:manage", PATCH: "admin:manage", DELETE: "admin:manage" },
  roles: { GET: "admin:manage", POST: "admin:manage", PATCH: "admin:manage", DELETE: "admin:manage" },
  audit_logs: { GET: "admin:manage", POST: "admin:manage", PATCH: "admin:manage", DELETE: "admin:manage" },
  system_errors: { GET: "admin:manage", POST: "admin:manage", PATCH: "admin:manage", DELETE: "admin:manage" }
};

const FEATURE_BY_TABLE = {
  ai_settings: "ai_helper_enabled",
  ai_knowledge: "ai_helper_enabled",
  ai_faqs: "ai_helper_enabled",
  ai_rules: "ai_helper_enabled",
  ai_saved_answers: "ai_helper_enabled",
  ai_training_rules: "ai_helper_enabled",
  ai_helper_versions: "ai_helper_enabled",
  outreach_prospects: "outreach_enabled",
  outreach_companies: "outreach_enabled",
  outreach_properties: "outreach_enabled",
  equipment_items: "equipment_enabled",
  equipment: "equipment_enabled",
  equipment_maintenance: "equipment_enabled",
  hardware_guide: "equipment_enabled",
  scheduled_jobs: "scheduler_enabled",
  appointments: "scheduler_enabled",
  route_stops: "scheduler_enabled",
  sales_documents: "square_invoices_enabled",
  invoices: "square_invoices_enabled",
  recurring_services: "connected_operations_enabled",
  recurring_service_visits: "connected_operations_enabled",
  job_checklist_templates: "connected_operations_enabled",
  job_checklist_template_items: "connected_operations_enabled",
  job_checklists: "connected_operations_enabled",
  job_checklist_items: "connected_operations_enabled",
  job_time_entries: "connected_operations_enabled",
  job_site_photos: "connected_operations_enabled",
  approval_requests: "connected_operations_enabled",
  communications: "connected_operations_enabled",
  communication_templates: "connected_operations_enabled",
  client_share_links: "connected_operations_enabled",
  client_share_link_permissions: "connected_operations_enabled",
  client_share_link_events: "connected_operations_enabled",
  equipment_maintenance_schedules: "equipment_enabled",
  equipment_maintenance_records: "equipment_enabled",
  automation_rules: "connected_operations_enabled",
  automation_runs: "connected_operations_enabled",
  command_usage_history: "connected_operations_enabled",
  job_tickets: "job_tickets_enabled",
  job_ticket_events: "job_tickets_enabled",
  job_ticket_links: "job_tickets_enabled",
  documentation_templates: "documentation_enabled",
  documentation_template_versions: "documentation_enabled",
  documentation_assignments: "documentation_enabled",
  documentation_submissions: "documentation_enabled",
  documentation_attachments: "documentation_enabled",
  documentation_audit_logs: "documentation_enabled"
};

function json(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...headers
    },
    body: JSON.stringify(body)
  };
}

function getSupabaseUrl() {
  return (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
}

function getSupabaseAnonKey() {
  return process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
}

function getSupabaseServiceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";
}

function normalizeHeaders(headers = {}) {
  return Object.fromEntries(Object.entries(headers || {}).map(([key, value]) => [String(key).toLowerCase(), value]));
}

function bearerToken(headers = {}) {
  const normalized = normalizeHeaders(headers);
  return String(normalized.authorization || "").replace(/^Bearer\s+/i, "").trim();
}

function ownerEmails() {
  return new Set([
    process.env.VITE_DASHBOARD_OWNER_EMAIL || "team@urbanyards.us",
    process.env.DASHBOARD_OWNER_EMAIL || "",
    ...String(process.env.DASHBOARD_ADMIN_EMAILS || "").split(",")
  ].map((value) => value.trim().toLowerCase()).filter(Boolean));
}

function normalizeRole(role) {
  const value = String(role || "").trim().toLowerCase();
  if (value === "sales") return "sales_outreach";
  if (["field", "crew", "employee"].includes(value)) return "field_worker";
  if (value === "accounting") return "accountant";
  return PROTECTED_ROLES.has(value) ? value : "";
}

function roleRank(role) {
  return ROLE_ORDER.indexOf(normalizeRole(role));
}

function hasRoleAtLeast(role, minimum) {
  return roleRank(role) >= roleRank(minimum);
}

function hasPermission(role, permission) {
  const normalizedRole = normalizeRole(role);
  const permissions = ROLE_PERMISSIONS[normalizedRole] || [];
  if (String(permission || "").startsWith("owner:")) return normalizedRole === "owner";
  if (permissions.includes("*")) return true;
  if (permissions.includes(permission)) return true;
  const [area, verb] = String(permission || "").split(":");
  return permissions.includes(`${area}:*`) || (verb === "read" && permissions.includes("dashboard:read"));
}

function permissionForTable(table, method) {
  const normalizedTable = String(table || "").replace(/[^a-zA-Z0-9_]/g, "");
  return TABLE_PERMISSIONS[normalizedTable]?.[String(method || "GET").toUpperCase()] || "";
}

function featureFlagForTable(table) {
  return FEATURE_BY_TABLE[String(table || "").replace(/[^a-zA-Z0-9_]/g, "")] || "";
}

async function supabaseAuthUser(token) {
  const supabaseUrl = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  if (!token || !supabaseUrl || !anonKey) return null;
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`
    },
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) return null;
  return response.json();
}

async function supabaseAdminRequest(path, options = {}) {
  const supabaseUrl = getSupabaseUrl();
  const serviceKey = getSupabaseServiceKey();
  if (!supabaseUrl || !serviceKey) throw new Error("Supabase service role is not configured.");

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      ...(options && options.headers ? options.headers : {})
    },
    signal: AbortSignal.timeout(Number(process.env.SUPABASE_FUNCTION_TIMEOUT_MS || 10000))
  });

  const bodyText = await response.text();
  let payload = null;
  if (bodyText) {
    try { payload = JSON.parse(bodyText); }
    catch { payload = bodyText; }
  }
  if (!response.ok) {
    const message = payload?.message || payload?.hint || `Supabase request failed (${response.status})`;
    const error = new Error(message);
    error.statusCode = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

async function firstExistingRow(paths) {
  for (const path of paths) {
    try {
      const rows = await supabaseAdminRequest(path, { method: "GET" });
      if (Array.isArray(rows) && rows[0]) return rows[0];
    } catch (error) {
      if (!/does not exist|schema cache|relation/i.test(error.message)) throw error;
    }
  }
  return null;
}

async function loadUserProfile(user) {
  if (!user?.id && !user?.email) return null;
  const paths = [];
  if (user.id) {
    paths.push(`profiles?id=eq.${encodeURIComponent(user.id)}&select=*&limit=1`);
    paths.push(`profiles?user_id=eq.${encodeURIComponent(user.id)}&select=*&limit=1`);
    paths.push(`roles?user_id=eq.${encodeURIComponent(user.id)}&select=*&limit=1`);
  }
  if (user.email) {
    paths.push(`profiles?email=eq.${encodeURIComponent(user.email)}&select=*&limit=1`);
    paths.push(`roles?email=eq.${encodeURIComponent(user.email)}&select=*&limit=1`);
  }
  return firstExistingRow(paths);
}

function resolveRole(user, profile) {
  const email = String(user?.email || profile?.email || "").toLowerCase();
  if (ownerEmails().has(email)) return "owner";
  return normalizeRole(
    profile?.role ||
    profile?.dashboard_role ||
    profile?.app_role ||
    user?.app_metadata?.role ||
    user?.user_metadata?.role ||
    "viewer"
  ) || "viewer";
}

async function actorFromHeaders(headers = {}) {
  const token = bearerToken(headers);
  const user = await supabaseAuthUser(token);
  if (!user) return null;
  const profile = await loadUserProfile(user).catch(() => null);
  const role = resolveRole(user, profile);
  const disabledAt = profile?.disabled_at || profile?.disabledAt || null;
  return {
    user,
    profile,
    role,
    disabled: Boolean(disabledAt),
    disabledAt,
    userId: user.id || profile?.user_id || profile?.id || "",
    email: String(user.email || profile?.email || "").toLowerCase()
  };
}

function ipFromEvent(event = {}) {
  const headers = normalizeHeaders(event.headers || {});
  return String(headers["x-nf-client-connection-ip"] || headers["x-forwarded-for"] || headers["client-ip"] || "unknown").split(",")[0].trim();
}

function userAgentFromEvent(event = {}) {
  return String(normalizeHeaders(event.headers || {})["user-agent"] || "").slice(0, 500);
}

function rateLimit(key, limit = 60, windowMs = 60000) {
  const now = Date.now();
  const bucket = RATE_LIMIT_BUCKETS.get(key);
  if (!bucket || bucket.resetAt <= now) {
    RATE_LIMIT_BUCKETS.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }
  bucket.count += 1;
  return {
    allowed: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    retryAfter: Math.ceil((bucket.resetAt - now) / 1000)
  };
}

async function writeAuditLog({ actor = null, action, entityType, entityId = null, metadata = {}, event = null, oldValue = null, newValue = null, module = "" } = {}) {
  const baseRow = {
    actor_user_id: actor?.userId || actor?.user?.id || null,
    actor_role: actor?.role || null,
    action: String(action || "unknown").slice(0, 120),
    entity_type: String(entityType || "").slice(0, 120),
    entity_id: entityId === undefined ? null : String(entityId || "").slice(0, 160),
    metadata,
    ip_address: event ? ipFromEvent(event) : null,
    user_agent: event ? userAgentFromEvent(event) : null
  };
  const expandedRow = {
    ...baseRow,
    actor_email: actor?.email || actor?.user?.email || null,
    old_value: oldValue,
    new_value: newValue,
    module: String(module || entityType || "").slice(0, 80)
  };
  try {
    await supabaseAdminRequest("audit_logs", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(expandedRow)
    });
  } catch (error) {
    if (/actor_email|old_value|new_value|module|schema cache|column/i.test(error.message || "")) {
      try {
        await supabaseAdminRequest("audit_logs", {
          method: "POST",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify(baseRow)
        });
        return;
      } catch (fallbackError) {
        if (/does not exist|schema cache|relation/i.test(fallbackError.message)) return;
      }
    }
    if (!/does not exist|schema cache|relation/i.test(error.message)) {
      console.warn(JSON.stringify({ event: "audit_log_failed", message: error.message }));
    }
  }
}

async function writeSystemError({ route, error, actor = null, severity = "error", metadata = {} } = {}) {
  try {
    await supabaseAdminRequest("system_errors", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        route: String(route || "").slice(0, 160),
        user_id: actor?.userId || actor?.user?.id || null,
        severity: String(severity || "error").slice(0, 40),
        message: String(error?.message || error || "Unknown error").slice(0, 1000),
        stack_trace: process.env.NODE_ENV === "production" ? null : String(error?.stack || "").slice(0, 6000),
        metadata,
        resolved: false
      })
    });
  } catch (loggingError) {
    if (!/does not exist|schema cache|relation/i.test(loggingError.message)) {
      console.warn(JSON.stringify({ event: "system_error_log_failed", message: loggingError.message }));
    }
  }
}

async function getFeatureFlag(flag, fallback = true) {
  if (!flag) return fallback;
  if (!getSupabaseUrl() || !getSupabaseServiceKey()) return fallback;
  try {
    const rows = await supabaseAdminRequest(`feature_flags?flag_key=eq.${encodeURIComponent(flag)}&select=enabled&limit=1`, { method: "GET" });
    if (Array.isArray(rows) && rows[0] && typeof rows[0].enabled === "boolean") return rows[0].enabled;
  } catch (error) {
    if (!/does not exist|schema cache|relation/i.test(error.message)) throw error;
  }
  return fallback;
}

async function requirePermission(eventOrHeaders, permission, context = {}) {
  const headers = eventOrHeaders?.headers || eventOrHeaders || {};
  const actor = await actorFromHeaders(headers);
  if (!actor) {
    return { ok: false, statusCode: 401, error: "Unauthorized.", actor: null };
  }
  if (actor.disabled) {
    await writeAuditLog({
      actor,
      action: "permission_denied_disabled_user",
      entityType: context.entityType || context.table || "",
      entityId: context.entityId || "",
      metadata: { permission, ...context },
      event: eventOrHeaders?.headers ? eventOrHeaders : null
    });
    return { ok: false, statusCode: 403, error: "This dashboard user has been disabled.", actor };
  }
  if (!hasPermission(actor.role, permission)) {
    await writeAuditLog({
      actor,
      action: "permission_denied",
      entityType: context.entityType || context.table || "",
      entityId: context.entityId || "",
      metadata: { permission, ...context },
      event: eventOrHeaders?.headers ? eventOrHeaders : null
    });
    return { ok: false, statusCode: 403, error: "You do not have permission to perform this action.", actor };
  }
  return { ok: true, actor };
}

async function verifyOwner(event) {
  const result = await requirePermission(event, "admin:manage");
  return result.ok && hasRoleAtLeast(result.actor.role, "admin");
}

function requestIdFromEvent(event = {}) {
  return String(normalizeHeaders(event.headers || {})["x-request-id"] || crypto.randomUUID()).slice(0, 80);
}

module.exports = {
  ROLE_ORDER,
  ROLE_PERMISSIONS,
  TABLE_PERMISSIONS,
  actorFromHeaders,
  featureFlagForTable,
  getFeatureFlag,
  getSupabaseAnonKey,
  getSupabaseServiceKey,
  getSupabaseUrl,
  hasPermission,
  hasRoleAtLeast,
  ipFromEvent,
  json,
  permissionForTable,
  rateLimit,
  requestIdFromEvent,
  requirePermission,
  normalizeRole,
  resolveRole,
  supabaseAdminRequest,
  verifyOwner,
  writeAuditLog,
  writeSystemError
};
