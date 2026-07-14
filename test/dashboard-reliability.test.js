const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  buildConfig,
  validatePublicConfig,
  validHttpsUrl
} = require("../scripts/build-dashboard-config");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function withEnv(patch, callback) {
  const original = {};
  Object.keys(patch).forEach((key) => {
    original[key] = process.env[key];
    if (patch[key] === undefined) delete process.env[key];
    else process.env[key] = patch[key];
  });

  try {
    return callback();
  } finally {
    Object.keys(patch).forEach((key) => {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    });
  }
}

test("dashboard public config builder validates production deploy requirements", () => {
  assert.equal(validHttpsUrl("https://example.com"), true);
  assert.equal(validHttpsUrl("http://example.com"), false);
  assert.deepEqual(validatePublicConfig({
    supabaseUrl: "https://project.supabase.co",
    supabaseAnonKey: "anon",
    ownerEmail: "team@urbanyards.us"
  }), []);

  assert.throws(() => withEnv({
    APP_ENV: "production",
    CONTEXT: "production",
    NETLIFY: "true",
    VITE_SUPABASE_URL: undefined,
    VITE_SUPABASE_ANON_KEY: undefined,
    VITE_DASHBOARD_OWNER_EMAIL: undefined
  }, () => buildConfig()), /Dashboard config is incomplete for production deploy/);
});

test("dashboard checked-in config keeps safe local diagnostics fields", () => {
  const config = read("dashboard-config.js");
  assert.match(config, /"appEnv": "local"/);
  assert.match(config, /"buildVersion": "local"/);
  assert.doesNotMatch(config, /service_role/i);
});

test("netlify deploy runs dashboard checks and has dashboard cache guards", () => {
  const toml = read("netlify.toml");
  assert.match(toml, /node scripts\/build-dashboard-config\.js && npm run check && npm test/);
  assert.match(toml, /from = "\/dashboard"/);
  assert.match(toml, /from = "\/budgets\/\*"/);
  assert.match(toml, /from = "\/operations"/);
  assert.match(toml, /for = "\/dashboard-config\.js"[\s\S]*Cache-Control = "no-store, max-age=0"/);
});

test("dashboard route aliases and new reliability diagnostics are wired", () => {
  const html = read("dashboard.html");
  const js = read("dashboard.js");

  assert.match(js, /operations: "connected-operations"/);
  assert.match(js, /function loadModule/);
  assert.match(js, /function safeRender/);
  assert.match(js, /function renderDashboardHealth/);
  assert.match(html, /data-dashboard-health/);
  assert.match(html, /copy-dashboard-diagnostics/);
});

test("optional dashboard module migrations include tables queried by the UI", () => {
  const budgetSql = read("supabase/migrations/20260713_job_budgeter.sql");
  const connectedSql = read("supabase/migrations/20260713_connected_operations.sql");
  const docsSql = read("supabase/migrations/20260710_documentation_forms.sql");

  [
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
    "job_budget_history"
  ].forEach((table) => assert.match(budgetSql, new RegExp(`public\\.${table}\\b`)));

  [
    "recurring_services",
    "recurring_service_visits",
    "job_checklist_templates",
    "job_checklists",
    "job_checklist_items",
    "job_time_entries",
    "job_site_photos",
    "approval_requests",
    "communications",
    "communication_templates",
    "client_share_links",
    "client_share_link_events",
    "equipment_maintenance_schedules",
    "equipment_maintenance_records",
    "automation_rules",
    "automation_runs",
    "command_usage_history"
  ].forEach((table) => assert.match(connectedSql, new RegExp(`public\\.${table}\\b`)));

  [
    "documentation_templates",
    "documentation_template_versions",
    "documentation_assignments",
    "documentation_submissions",
    "documentation_attachments",
    "documentation_audit_logs"
  ].forEach((table) => assert.match(docsSql, new RegExp(`public\\.${table}\\b`)));
});
