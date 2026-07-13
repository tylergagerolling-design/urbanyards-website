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

// Required environment variables:
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_ANON_KEY
// Optional: VITE_DASHBOARD_OWNER_EMAIL, DASHBOARD_ADMIN_EMAILS

const EXPORT_TABLES = new Set([
  "quote_submissions",
  "contacts",
  "clients",
  "properties",
  "scheduled_jobs",
  "appointments",
  "outreach_prospects",
  "outreach_companies",
  "outreach_properties",
  "equipment_items",
  "equipment_maintenance",
  "lead_activity",
  "call_logs",
  "sales_documents",
  "invoices",
  "budget_settings",
  "job_budgets",
  "job_budget_labor",
  "job_budget_materials",
  "budget_material_catalog",
  "job_budget_equipment",
  "job_budget_costs",
  "job_budget_change_orders",
  "job_budget_documents",
  "job_budget_templates",
  "job_budget_template_items",
  "job_budget_history",
  "settings",
  "feature_flags"
]);

function queryParam(event, name) {
  return String(event.queryStringParameters?.[name] || "").trim();
}

function csvCell(value) {
  if (value === null || value === undefined) return "\"\"";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function rowsToCsv(rows) {
  const columns = Array.from(rows.reduce((set, row) => {
    Object.keys(row || {}).forEach((key) => set.add(key));
    return set;
  }, new Set()));
  return [
    columns.map(csvCell).join(","),
    ...rows.map((row) => columns.map((column) => csvCell(row?.[column])).join(","))
  ].join("\r\n");
}

async function exportTable(table) {
  try {
    const rows = await supabaseAdminRequest(`${table}?select=*&limit=10000`, { method: "GET" });
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    if (/does not exist|schema cache|relation/i.test(error.message)) return [];
    throw error;
  }
}

exports.handler = async (event) => {
  const requestId = requestIdFromEvent(event);
  if (event.httpMethod !== "GET") {
    return json(405, { error: "Method not allowed.", requestId }, { Allow: "GET" });
  }

  const limit = rateLimit(`dashboard-export:${ipFromEvent(event)}`, 12, 60 * 60 * 1000);
  if (!limit.allowed) {
    return json(429, { error: "Too many requests. Please try again later.", requestId }, { "Retry-After": String(limit.retryAfter) });
  }

  let actor = null;
  try {
    const auth = await requirePermission(event, "admin:manage", { route: "dashboard-export" });
    actor = auth.actor;
    if (!auth.ok) return json(auth.statusCode, { error: auth.error, requestId });

    const requestedTable = queryParam(event, "table") || "all";
    const format = queryParam(event, "format") === "csv" ? "csv" : "json";
    const tables = requestedTable === "all"
      ? Array.from(EXPORT_TABLES)
      : [requestedTable].filter((table) => EXPORT_TABLES.has(table));

    if (!tables.length) return json(400, { error: "Unsupported export table.", requestId });

    const exported = {};
    for (const table of tables) {
      exported[table] = await exportTable(table);
    }

    await writeAuditLog({
      actor,
      action: "dashboard_export",
      entityType: requestedTable,
      metadata: { tables, format },
      event
    });

    if (format === "csv" && tables.length === 1) {
      const table = tables[0];
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Cache-Control": "no-store",
          "Content-Disposition": `attachment; filename="urban-yards-${table}-${new Date().toISOString().slice(0, 10)}.csv"`
        },
        body: rowsToCsv(exported[table])
      };
    }

    return json(200, {
      ok: true,
      exportedAt: new Date().toISOString(),
      tables: exported,
      requestId
    });
  } catch (error) {
    await writeSystemError({ route: "dashboard-export", error, actor });
    return json(500, { error: "Dashboard export failed.", requestId });
  }
};
