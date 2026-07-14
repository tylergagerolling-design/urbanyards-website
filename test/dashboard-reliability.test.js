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

  const productionConfig = withEnv({
    APP_ENV: "production",
    CONTEXT: "production",
    NETLIFY: "true",
    VITE_SUPABASE_URL: "https://project.supabase.co",
    VITE_SUPABASE_ANON_KEY: "anon",
    VITE_DASHBOARD_OWNER_EMAIL: "team@urbanyards.us"
  }, () => buildConfig());
  assert.equal(productionConfig.supabaseUrl, "https://project.supabase.co");
  assert.equal(productionConfig.supabaseAnonKey, "anon");
  assert.equal(productionConfig.appEnv, "production");

  assert.match(validatePublicConfig({
    supabaseUrl: "",
    supabaseAnonKey: "",
    ownerEmail: "team@urbanyards.us"
  }).join(" "), /VITE_SUPABASE_URL is required/);
});

test("dashboard checked-in config keeps safe public diagnostics fields", () => {
  const config = read("dashboard-config.js");
  assert.match(config, /URBAN_YARDS_DASHBOARD_CONFIG/);
  assert.match(config, /"appEnv":/);
  assert.match(config, /"ownerEmail":/);
  assert.doesNotMatch(config, /service_role/i);
});

test("netlify deploy runs dashboard checks and has dashboard cache guards", () => {
  const toml = read("netlify.toml");
  assert.match(toml, /node scripts\/build-dashboard-config\.js && npm run check && npm test/);
  assert.match(toml, /from = "\/dashboard"/);
  assert.doesNotMatch(toml, /from = "\/budgets/);
  assert.doesNotMatch(toml, /from = "\/operations/);
  assert.match(toml, /for = "\/dashboard-config\.js"[\s\S]*Cache-Control = "no-store, max-age=0"/);
});

test("dashboard route aliases and new reliability diagnostics are wired", () => {
  const html = read("dashboard.html");
  const js = read("dashboard.js");

  assert.doesNotMatch(html, /id="budgets"/);
  assert.doesNotMatch(html, /id="connected-operations"/);
  assert.match(js, /function loadModule/);
  assert.match(js, /function safeRender/);
  assert.match(js, /function renderDashboardHealth/);
  assert.match(js, /activeSection: "calendar"/);
  assert.match(js, /const DEFAULT_DASHBOARD_SECTION = "calendar"/);
  assert.match(html, /data-dashboard-health/);
  assert.match(html, /copy-dashboard-diagnostics/);
  assert.match(js, /"route-planner": "calendar"/);
});

test("dashboard creates canonical job tickets without removing source fallbacks", () => {
  const js = read("dashboard.js");

  assert.match(js, /async function insertJobTicket/);
  assert.match(js, /async function updateJobTicket/);
  assert.match(js, /async function insertJobTicketEvent/);
  assert.match(js, /async function dashboardTicketRequest/);
  assert.match(js, /async function loadCanonicalTicketEvents/);
  assert.match(js, /function renderTicketHistory/);
  assert.match(js, /fetch\("\/\.netlify\/functions\/dashboard-tickets"/);
  assert.match(js, /dashboardTicketRequest\("list"/);
  assert.match(js, /dashboardTicketRequest\("events"/);
  assert.match(js, /dashboardTicketRequest\("create"/);
  assert.match(js, /dashboardTicketRequest\("update"/);
  assert.match(js, /dashboardTicketRequest\("transition"/);
  assert.match(js, /dashboardTicketRequest\("event"/);
  assert.match(js, /async function transitionJobTicketStage/);
  assert.match(js, /await transitionJobTicketStage\(ticketId, nextStage/);
  assert.doesNotMatch(js, /job_tickets\?select=\*/);
  assert.doesNotMatch(js, /job_ticket_events\?select=\*/);
  assert.match(js, /source_type: "quote"/);
  assert.match(js, /source_type: "job"/);
  assert.match(js, /ticket_stage_changed/);
  assert.match(js, /openTicketDrawer\("ticket", canonicalTicket\.id\)/);
  assert.match(js, /isMissingOptionalTableError\(error\)\) return null/);

  const ticketFunction = read("netlify/functions/dashboard-tickets.js");
  assert.match(ticketFunction, /"transition"/);
  assert.match(ticketFunction, /transitionTicketStage/);
  assert.match(ticketFunction, /async function transitionTicket/);
  assert.match(ticketFunction, /ticket_stage_changed/);
});

test("optional dashboard module migrations include tables queried by the UI", () => {
  const docsSql = read("supabase/migrations/20260710_documentation_forms.sql");
  const ticketSql = read("supabase/migrations/20260714_job_ticket_foundation.sql");

  [
    "documentation_templates",
    "documentation_template_versions",
    "documentation_assignments",
    "documentation_submissions",
    "documentation_attachments",
    "documentation_audit_logs"
  ].forEach((table) => assert.match(docsSql, new RegExp(`public\\.${table}\\b`)));

  [
    "job_tickets",
    "job_ticket_events",
    "job_ticket_links"
  ].forEach((table) => assert.match(ticketSql, new RegExp(`public\\.${table}\\b`)));

  assert.match(ticketSql, /alter table public\.job_tickets enable row level security/);
  assert.match(ticketSql, /needs_budget/);
  assert.match(ticketSql, /budget_in_progress/);
  assert.doesNotMatch(ticketSql, /\b(drop table|truncate table|delete from)\b/i);
});
