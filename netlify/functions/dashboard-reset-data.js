const {
  json,
  requestIdFromEvent,
  requirePermission,
  supabaseAdminRequest,
  writeAuditLog
} = require("./lib/dashboard-auth");

const RESET_PHRASE = "DELETE ALL OPERATIONAL DATA";

// Children and history first, then their parent operational records.
// User accounts, roles, settings, templates, feature flags, and equipment are preserved.
const OPERATIONAL_TABLES = [
  "financial_import_batch_rows", "import_rows", "import_errors", "import_changes",
  "invoice_payments", "invoice_line_items", "expenses",
  "documentation_attachments", "documentation_submissions", "documentation_assignments", "documentation_audit_logs",
  "job_site_photos", "job_time_entries", "job_checklist_items", "job_checklists",
  "client_share_link_events", "client_share_link_permissions", "client_share_links",
  "job_budget_documents", "job_budget_change_orders", "job_budget_costs", "job_budget_equipment",
  "job_budget_materials", "job_budget_labor", "job_budget_history",
  "job_ticket_links", "job_ticket_events",
  "approval_requests", "communications", "call_logs", "lead_activity", "lead_notes",
  "follow_up_reminders", "job_notes", "route_stops", "recurring_service_visits",
  "automation_runs", "command_usage_history", "ai_sessions", "system_errors", "audit_logs",
  "sync_conflicts", "sync_runs", "import_batches", "financial_import_batches", "export_jobs", "backup_history",
  "sales_documents", "invoices", "job_budgets", "job_tickets",
  "scheduled_jobs", "appointments", "recurring_services", "operations_records",
  "outreach_properties", "outreach_prospects", "outreach_companies",
  "quote_submissions", "leads", "contacts", "properties", "clients", "vendors"
];

function parseBody(event) {
  try {
    return event.body ? JSON.parse(event.body) : {};
  } catch {
    return {};
  }
}

function optionalTableError(error) {
  return /relation .* does not exist|could not find the table|schema cache/i.test(String(error?.message || ""));
}

async function deleteTable(table) {
  try {
    const rows = await supabaseAdminRequest(`${table}?select=id&limit=5000`, { method: "GET" });
    const ids = Array.isArray(rows) ? rows.map((row) => row.id).filter(Boolean) : [];
    for (let index = 0; index < ids.length; index += 100) {
      const encoded = ids.slice(index, index + 100).map((id) => `"${String(id).replace(/"/g, "")}"`).join(",");
      await supabaseAdminRequest(`${table}?id=in.(${encodeURIComponent(encoded)})`, {
        method: "DELETE",
        headers: { Prefer: "return=minimal" }
      });
    }
    return { table, deleted: ids.length };
  } catch (error) {
    if (optionalTableError(error)) return { table, deleted: 0, unavailable: true };
    return { table, deleted: 0, error: error.message || "Delete failed." };
  }
}

exports.handler = async (event) => {
  const requestId = requestIdFromEvent(event);
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed.", requestId });

  const auth = await requirePermission(event, "admin:manage", { entityType: "dashboard_reset" });
  if (!auth.ok) return json(auth.statusCode, { error: auth.error, requestId });

  const body = parseBody(event);
  if (body.confirmation !== RESET_PHRASE) {
    return json(400, { error: `Confirmation must exactly match ${RESET_PHRASE}.`, requestId });
  }

  const results = [];
  for (const table of OPERATIONAL_TABLES) results.push(await deleteTable(table));
  const failures = results.filter((result) => result.error);
  const deleted = results.reduce((sum, result) => sum + result.deleted, 0);

  await writeAuditLog({
    actor: auth.actor,
    action: "all_operational_data_deleted",
    entityType: "dashboard_reset",
    metadata: { deleted, failures: failures.map((item) => item.table) },
    event,
    module: "settings"
  });

  return json(failures.length ? 409 : 200, { deleted, results, failures, requestId });
};

exports._internals = { OPERATIONAL_TABLES, RESET_PHRASE };
