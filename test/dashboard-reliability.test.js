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

test("dashboard design system locks the six-page rebuild contract", () => {
  const styleSystem = read("DASHBOARD_STYLE_SYSTEM.md");
  const foundation = read("docs/DASHBOARD_REBUILD_V2_FOUNDATION.md");

  [
    "Home",
    "Tickets",
    "Work",
    "Leads",
    "Money",
    "Tools",
    "Page Layout Contract",
    "Component Interface Contracts",
    "Responsive QA Targets"
  ].forEach((phrase) => assert.match(styleSystem, new RegExp(phrase)));

  [
    "Lead or client request",
    "Job Ticket",
    "Quote and approval",
    "Budget preparation",
    "Work assignment and scheduling",
    "Field completion and documentation",
    "Final invoice",
    "Closed ticket"
  ].forEach((phrase) => assert.match(styleSystem, new RegExp(phrase)));

  assert.match(foundation, /Visible primary labels:[\s\S]*Home[\s\S]*Tickets[\s\S]*Work[\s\S]*Leads[\s\S]*Money[\s\S]*Tools/);
  assert.match(foundation, /Design-first planning is required/);
});

test("dashboard architecture inventory protects existing Supabase surfaces", () => {
  const inventory = read("docs/DASHBOARD_ARCHITECTURE_INVENTORY.md");
  const foundation = read("docs/DASHBOARD_REBUILD_V2_FOUNDATION.md");

  [
    "Home",
    "Tickets",
    "Work",
    "Leads",
    "Money",
    "Tools",
    "supabase/DATABASE_INVENTORY_READONLY.sql",
    "job_tickets",
    "job_ticket_events",
    "quote_submissions",
    "scheduled_jobs",
    "outreach_prospects",
    "sales_documents",
    "documentation_templates",
    "route_stops",
    "user-avatars",
    "documentation-submissions",
    "job-site-photos"
  ].forEach((phrase) => assert.match(inventory, new RegExp(phrase)));

  assert.match(inventory, /No current checkpoint removes data/);
  assert.match(inventory, /Do not globally disable RLS/);
  assert.match(inventory, /Lead or client request -> Job Ticket -> Quote and approval -> Budget preparation -> Work assignment and scheduling -> Field completion and documentation -> Final invoice -> Closed ticket/);
  assert.match(foundation, /DASHBOARD_ARCHITECTURE_INVENTORY\.md/);
});

test("dashboard route aliases and new reliability diagnostics are wired", () => {
  const html = read("dashboard.html");
  const css = read("dashboard.css");
  const js = read("dashboard.js");
  const workspaceRegistry = read("src/app/routing/workspace-registry.js");

  assert.doesNotMatch(html, /id="budgets"/);
  assert.doesNotMatch(html, /id="connected-operations"/);
  assert.match(html, /scripts\/budget-calculations\.js/);
  assert.match(html, /<section class="dashboard-section home-ticket-page" id="overview"/);
  assert.match(html, /data-home-workspace/);
  const primaryDrawerLabels = [...html.matchAll(/<a href="#[^"]+"(?![^>]*legacy-nav-route)[^>]*data-dashboard-link="[^"]+"[\s\S]*?<span class="nav-label">([^<]+)<\/span><\/a>/g)].map((match) => match[1]);
  assert.deepEqual(primaryDrawerLabels, ["Home", "Tickets", "Work", "Leads", "Money", "Tools"]);
  const mobileTabLabels = [...html.matchAll(/<nav class="mobile-tabbar"[\s\S]*?<\/nav>/g)][0][0]
    .matchAll(/<a href="#[^"]+" data-dashboard-link="[^"]+">([^<]+)<\/a>/g);
  assert.deepEqual([...mobileTabLabels].map((match) => match[1]), primaryDrawerLabels);
  assert.match(js, /function loadModule/);
  assert.match(js, /function safeRender/);
  assert.match(js, /function renderHomeWorkspace/);
  assert.match(js, /safeRender\("home ticket workspace", \(\) => renderHomeWorkspace\(data\)\)/);
  assert.match(js, /function renderDashboardHealth/);
  assert.match(js, /activeSection: "overview"/);
  assert.match(js, /const DEFAULT_DASHBOARD_SECTION = "overview"/);
  assert.match(js, /owner: "overview"/);
  assert.match(js, /admin: "overview"/);
  assert.match(js, /manager: "overview"/);
  assert.match(js, /sales_outreach: "outreach"/);
  assert.match(js, /accountant: "documents"/);
  assert.match(js, /field_worker: "calendar"/);
  assert.match(js, /data-dashboard-health/);
  assert.match(js, /copy-dashboard-diagnostics/);
  assert.match(js, /"route-planner": "calendar"/);
  assert.match(js, /DASHBOARD_WORKSPACE_ACCESS/);
  assert.match(js, /staff: "Staff"/);
  assert.doesNotMatch(js, /normalized === "staff"\) return "manager"/);
  assert.match(js, /overview: \["owner", "admin", "manager", "sales_outreach", "accountant", "field_worker", "worker", "staff", "viewer"\]/);
  assert.match(js, /outreach: \["owner", "admin", "manager", "sales_outreach", "staff"\]/);
  assert.match(js, /documents: \["owner", "admin", "manager", "accountant"\]/);
  assert.match(js, /settings: \["owner", "admin"\]/);
  assert.match(js, /function dashboardSectionForRole/);
  assert.match(js, /syncDashboardNavAccess\(role\)/);
  assert.match(js, /els\.loginForm\?\.addEventListener\("submit"/);
  assert.match(js, /if \(els\.statusFilter\) \{\s*els\.statusFilter\.addEventListener\("change"/);
  assert.match(js, /els\.signOut\?\.addEventListener\("click"/);
  assert.doesNotMatch(js, /DASHBOARD_OPERATIONS_SQL/);
  assert.doesNotMatch(js, /20260713_connected_operations\.sql/);
  assert.match(js, /Job Tickets are not installed yet\. Run supabase\/migrations\/20260714_job_ticket_foundation\.sql/);
  assert.match(css, /\.dashboard-nav a\.legacy-nav-route \{\s*display: none !important;/);
  assert.match(js, /contacts: "outreach"/);
  assert.match(js, /clients: "outreach"/);
  assert.match(js, /documentation: "settings"/);
  assert.match(js, /"import-export": "settings"/);
  assert.match(js, /equipment: "settings"/);
  assert.match(js, /"groundskeeper-ai": "settings"/);
  assert.doesNotMatch(js, /label: "Sales"/);
  assert.doesNotMatch(js, /owner_label: "Sales"/);
  assert.doesNotMatch(js, /owner_label: "Field"/);
  assert.doesNotMatch(js, /label: "Field", detail: "Schedule and work"/);
  assert.doesNotMatch(js, /Today in the Field/);
  assert.doesNotMatch(js, /field work/);
  assert.doesNotMatch(js, /field assignment/);
  assert.doesNotMatch(js, /field update/);
  assert.doesNotMatch(js, /field visit/);
  assert.doesNotMatch(js, /field ticket/);
  assert.doesNotMatch(js, /Mobile Field Mode/);
  assert.doesNotMatch(js, /Upcoming Field Jobs/);
  assert.match(js, /owner_label: "Work"/);
  assert.doesNotMatch(js, />-&gt;</);
  assert.match(js, /const dashboardWorkspaceLinks = \[/);
  assert.match(js, /function visibleDashboardWorkspaceLinks/);
  assert.match(js, /dashboardWorkspaceLinks\.filter\(\(item\) => canAccessDashboardSection\(item\.id, role\)\)/);
  assert.match(js, /const links = visibleDashboardWorkspaceLinks\(\)/);
  assert.doesNotMatch(js, /\$\{renderWorkspaceSwitcher\(/);
  assert.match(js, /function canCreateTicketType/);
  assert.match(js, /function canManageLeadWorkflow/);
  assert.match(js, /function canManageMoneyWorkflow/);
  assert.match(js, /Your dashboard role cannot create that type of ticket/);
  assert.match(js, /Your dashboard role cannot manage leads/);
  assert.match(js, /Your dashboard role cannot import leads/);
  assert.doesNotMatch(js, /function renderWorkspaceFocusStrip/);
  assert.doesNotMatch(js, /renderWorkspaceWorkflowRibbon/);
  assert.doesNotMatch(css, /workspace-workflow-ribbon/);
  assert.doesNotMatch(js, /Leads handoff rule/);
  const overviewSection = html.match(/<section class="dashboard-section home-ticket-page" id="overview"[\s\S]*?<\/section>/)?.[0] || "";
  assert.match(overviewSection, /data-home-workspace/);
  assert.doesNotMatch(overviewSection, /overview-command-header|home-secondary-tools|data-metrics|data-command-deadlines/);
  const workSection = html.match(/<section class="dashboard-section work-page work-hub-page" id="calendar"[\s\S]*?<\/section>/)?.[0] || "";
  assert.match(workSection, /data-work-workspace/);
  assert.doesNotMatch(workSection, /work-command-header|work-secondary-tools|data-work-snapshot|data-calendar-list/);
  const leadsSection = html.match(/<section class="dashboard-section uy-standard-page leads-page" id="outreach"[\s\S]*?<\/section>/)?.[0] || "";
  assert.match(leadsSection, /data-leads-workspace/);
  assert.doesNotMatch(leadsSection, /outreach-hero|data-outreach-view-panel|data-outreach-table|data-outreach-company-table/);
  const moneySection = html.match(/<section class="dashboard-section uy-standard-page money-page" id="documents"[\s\S]*?<\/section>/)?.[0] || "";
  assert.match(moneySection, /data-money-workspace/);
  assert.doesNotMatch(moneySection, /data-quote-table|data-pipeline|data-document-form/);
  const moneyWorkspace = js.match(/function renderMoneyWorkspace[\s\S]*?function renderToolsRunwayCard/)?.[0] || "";
  assert.doesNotMatch(moneyWorkspace, /Money workspace signals/);
  const toolsWorkspace = js.match(/function renderToolsWorkspace[\s\S]*?function renderToolsCard/)?.[0] || "";
  assert.match(toolsWorkspace, /data-users-access-list/);
  assert.match(toolsWorkspace, /data-dashboard-health/);
  assert.match(toolsWorkspace, /data-activity-log-list/);
  assert.match(toolsWorkspace, /renderUsersAccess\(data\)/);
  assert.match(toolsWorkspace, /renderActivityLog\(data\)/);
  assert.match(toolsWorkspace, /renderDashboardHealth\(\)/);
  assert.doesNotMatch(toolsWorkspace, /data-import-backup|data-user-avatar-upload/);
  assert.doesNotMatch(toolsWorkspace, /Tools workspace signals|tools-health-strip/);
  const toolsSection = html.match(/<section class="dashboard-section uy-standard-page tools-page" id="settings"[\s\S]*?<\/section>/)?.[0] || "";
  assert.match(toolsSection, /data-tools-workspace/);
  assert.match(toolsSection, /data-tools-runtime/);
  assert.match(toolsSection, /data-import-backup/);
  assert.match(toolsSection, /data-user-avatar-upload/);
  assert.doesNotMatch(toolsSection, /uy-page-intro-panel|rebuild-tool-grid|settings-grid/);
  assert.doesNotMatch(js, /function renderTicketEndToEndFlow/);
  assert.doesNotMatch(js, /data-ticket-lifecycle-map/);
  assert.doesNotMatch(js, /renderTicketEndToEndFlow\(activeTickets/);
  assert.doesNotMatch(js, /renderTicketEndToEndFlow\(openTickets\)/);
  assert.doesNotMatch(js, /renderTicketEndToEndFlow\(dashboardTickets\(\), ticket\.stage/);
  const homeWorkspace = js.match(/function renderHomeWorkspace[\s\S]*?function renderTicketNextStepCard/)?.[0] || "";
  assert.doesNotMatch(homeWorkspace, /renderTicketOwnerStrip/);
  const ticketWorkspace = js.match(/function renderJobTicketWorkspace[\s\S]*?function renderWorkPlanTile/)?.[0] || "";
  assert.doesNotMatch(ticketWorkspace, /renderTicketOwnerStrip/);
  assert.doesNotMatch(js, /function renderTicketOwnerStrip/);
  assert.doesNotMatch(css, /ticket-owner-strip/);
  assert.match(js, /function renderMoneyBudgetPanel/);
  assert.match(js, /function findTicketForBudget/);
  assert.match(js, /function findBudgetForTicket/);
  assert.doesNotMatch(js, /Cost Review Queue/);
  assert.doesNotMatch(js, /Financial Closeout/);
  assert.match(js, /function budgetPayloadFromTicket/);
  assert.match(js, /async function ensureBudgetForTicket/);
  assert.match(js, /async function syncBudgetToTicket/);
  assert.match(js, /function openMoneyBudgetDrawer/);
  assert.match(js, /data-money-budget-panel/);
  assert.match(js, /data-action="\$\{budget \? "open-budget" : "prepare-ticket-budget"\}"/);
  assert.match(js, /data-action="sync-budget-to-ticket"/);
  assert.match(js, /data-money-budget-form/);
  assert.match(js, /await ensureBudgetForTicket\(ticket\)/);
  assert.match(js, /await syncBudgetToTicket\(budget\)/);
  assert.match(js, /function canManageWorkWorkflow/);
  assert.match(js, /field-proof-actions[\s\S]*data-action="go-route-planner"[\s\S]*data-action="go-documentation"[\s\S]*data-action="copy-dashboard-diagnostics"/);
  assert.match(js, /function renderTicketWorkAssignmentBridge/);
  assert.match(js, /async function saveTicketWorkAssignment/);
  assert.match(js, /data-ticket-assignment-form/);
  assert.match(js, /assigned_user_id/);
  assert.match(js, /await saveTicketWorkAssignment\(event\.target\)/);
  assert.match(css, /\.ticket-work-assignment-bridge/);
  assert.match(css, /\.ticket-work-assignment-form/);
  assert.match(js, /Budget and Profitability/);
  assert.match(js, /Budget records stay inside Money/);
  assert.match(js, /budgetsReady: false/);
  assert.match(js, /budgets: emptyBudgetBundle\(\)/);
  assert.match(js, /state\.budgetsReady = true/);
  assert.match(js, /key: "budgets", name: "job budgets", loader: loadBudgets, fallback: emptyBudgetBundle/);
  assert.match(js, /budgets: normalizeBudgetBundle\(demoBudgetBundle\(\)\)/);
  assert.match(js, /restored\.budgets = imported\.budgets && typeof imported\.budgets === "object"/);
  ["go-leads", "go-work", "go-money", "go-tools", "go-tickets"].forEach((action) => {
    assert.match(js, new RegExp(`"${action}"`));
    assert.match(js, new RegExp(`action === "${action}"`));
  });
  assert.match(js, /action: "go-leads"[\s\S]*actionLabel: "Open Leads"/);
  assert.match(js, /action: "go-work"[\s\S]*actionLabel: "Open Work"/);
  assert.match(js, /action: "go-money"[\s\S]*actionLabel: "Open Money"/);
  assert.match(js, /action: "go-tools"[\s\S]*actionLabel: "Open Tools"/);
  assert.doesNotMatch(js, /label: "Budgets"/);
  ["Leads", "Approval", "Cost Review", "Invoice Prep", "Work", "Review", "Close"].forEach((label) => {
    assert.match(js, new RegExp(`label: "${label}"`));
  });
  ["home", "tickets", "work", "leads", "money", "tools"].forEach((page) => {
    assert.match(js, new RegExp(`data-uy-page-contract="${page}"`));
  });
  assert.doesNotMatch(js, /Tickets workspace signals|Work workspace signals|Leads workspace signals|Money workspace signals/);
  assert.doesNotMatch(css, /workspace-focus-strip|workspace-focus-card/);
  assert.match(css, /ticket-metrics[\s\S]*grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, 190px\), 1fr\)\)/);
  assert.match(js, /function renderHomeFocusPanel/);
  assert.match(js, /Start with the next handoff/);
  assert.match(css, /home-focus-grid[\s\S]*grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, 240px\), 1fr\)\)/);
  assert.match(css, /home-focus-card-head[\s\S]*grid-template-columns: minmax\(0, 1fr\) auto/);
  assert.match(css, /home-focus-card-head strong[\s\S]*border-radius: 999px/);
  assert.doesNotMatch(js, /renderHomeRunway/);
  assert.doesNotMatch(css, /home-runway/);
  assert.match(css, /work-readiness-grid[\s\S]*repeat\(auto-fit, minmax\(min\(100%, 220px\), 1fr\)\)/);
  assert.match(css, /leads-runway-card,[\s\S]*money-runway-card,[\s\S]*tools-runway-card[\s\S]*grid-template-areas:[\s\S]*"label value"[\s\S]*"detail detail"[\s\S]*"action action"/);
  assert.match(css, /tools-runway-card > strong[\s\S]*border-radius: 999px/);
  assert.match(js, /Intake Focus/);
  assert.match(js, /Financial Focus/);
  assert.match(js, /Support Focus/);
  assert.doesNotMatch(js, />Lead Runway</);
  assert.doesNotMatch(js, />Money Runway</);
  assert.doesNotMatch(js, />Tools Runway</);
  assert.match(css, /work-readiness-card-main[\s\S]*grid-template-areas:[\s\S]*"label value"[\s\S]*"detail detail"/);
  assert.match(css, /work-readiness-card-main strong[\s\S]*border-radius: 999px/);
  assert.match(js, /function renderWorkFieldPacketPanel/);
  assert.match(js, /What the crew needs on-site/);
  assert.match(css, /work-field-packet-grid[\s\S]*grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, 260px\), 1fr\)\)/);
  assert.match(css, /work-field-packet-step[\s\S]*grid-template-areas:[\s\S]*"step copy value"[\s\S]*"step copy action"/);
  assert.match(css, /work-field-packet-step em[\s\S]*border-radius: 999px/);
  assert.match(js, /function renderLeadsHandoffPanel/);
  assert.match(js, /From prospect to ticket/);
  assert.match(css, /leads-handoff-grid[\s\S]*grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, 240px\), 1fr\)\)/);
  assert.match(css, /lead-handoff-card[\s\S]*grid-template-rows: auto auto minmax\(0, 1fr\) auto/);
  assert.match(css, /lead-handoff-card-head[\s\S]*grid-template-columns: minmax\(0, 1fr\) auto/);
  assert.match(css, /lead-handoff-card li strong,[\s\S]*lead-handoff-card li span[\s\S]*text-overflow: ellipsis/);
  assert.match(js, /ticket-workflow-board-index/);
  assert.match(js, /function renderTicketHandoffPanel/);
  assert.match(js, /ticket-handoff-panel/);
  assert.match(js, /Who owns the next move\?/);
  assert.match(css, /ticket-workflow-board-grid[\s\S]*grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, 196px\), 1fr\)\)/);
  assert.match(css, /ticket-handoff-grid[\s\S]*grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, 230px\), 1fr\)\)/);
  assert.match(css, /ticket-handoff-card-main[\s\S]*grid-template-areas:[\s\S]*"label value"[\s\S]*"detail detail"/);
  assert.match(css, /ticket-handoff-card-main strong[\s\S]*border-radius: 999px/);
  assert.match(css, /ticket-workflow-board-column-head[\s\S]*grid-template-columns: auto minmax\(0, 1fr\) auto/);
  assert.match(css, /ticket-workflow-board-column-head em[\s\S]*border-radius: 999px/);
  assert.match(css, /ticket-workflow-empty[\s\S]*text-align: center/);
  assert.doesNotMatch(css, /\.ticket-end-to-end-flow/);
  assert.doesNotMatch(css, /\.ticket-flow-step/);
  assert.doesNotMatch(css, /ticket-flow-steps/);
  assert.match(css, /ticket-lane-heading > span[\s\S]*flex: 0 0 auto/);
  assert.match(css, /ticket-card-actions[\s\S]*grid-template-columns: minmax\(0, 1fr\) auto/);
  assert.match(css, /ticket-card-actions span[\s\S]*text-wrap: pretty/);
  assert.match(js, /compact \? "ticket-card--compact" : ""/);
  assert.match(css, /ticket-card--compact[\s\S]*gap: 10px/);
  assert.match(css, /ticket-workflow-board-list \.ticket-card--compact \.ticket-card-checklist[\s\S]*display: none/);
  assert.match(css, /leads-workspace \.ticket-metrics[\s\S]*repeat\(auto-fit, minmax\(min\(100%, 190px\), 1fr\)\)/);
  assert.match(css, /lead-queue-item[\s\S]*grid-template-columns: minmax\(0, 1fr\) minmax\(236px, \.58fr\)/);
  assert.match(css, /lead-queue-meta[\s\S]*flex-wrap: wrap/);
  assert.match(css, /lead-queue-detail-grid[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /lead-queue-actions[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /lead-queue-actions \.phone-call-control[\s\S]*grid-column: 1 \/ -1/);
  assert.match(css, /@media \(max-width: 1380px\) and \(min-width: 761px\)[\s\S]*home-command-center,[\s\S]*ticket-command-center[\s\S]*grid-template-columns: 1fr/);
  assert.match(css, /@media \(max-width: 1380px\) and \(min-width: 761px\)[\s\S]*leads-command-center[\s\S]*grid-template-columns: 1fr/);
  assert.match(css, /@media \(max-width: 1380px\) and \(min-width: 761px\)[\s\S]*money-command-center[\s\S]*grid-template-columns: 1fr/);
  assert.match(css, /@media \(max-width: 1280px\) and \(min-width: 761px\)[\s\S]*tools-admin-grid[\s\S]*grid-template-columns: 1fr/);
  assert.match(js, /function resizeGoogleMapView\(view\)/);
  assert.match(js, /window\.google\.maps\.event\.trigger\(view\.map, "resize"\)/);
  assert.match(js, /window\.setTimeout\(triggerResize, 160\)/);
  assert.match(css, /dashboard-map-preview > div[\s\S]*height: 100% !important/);
  assert.match(css, /dashboard-map-preview \.gm-style > div[\s\S]*height: 100% !important/);
  assert.match(css, /work-day-map-card \.dashboard-map-preview-shell[\s\S]*height: clamp\(184px, 16vw, 246px\)/);
  assert.match(css, /work-day-map-card \.dashboard-map-preview-shell[\s\S]*margin-bottom: 0/);
  assert.match(css, /work-day-map-card \.dashboard-map-preview \.gm-style[\s\S]*height: 100% !important/);
  assert.match(js, /ticket-drawer-operating-grid/);
  assert.doesNotMatch(js, /renderTicketEndToEndFlow\(dashboardTickets\(\), ticket\.stage, "Current ticket lifecycle"\)/);
  assert.match(css, /ticket-drawer-operating-grid[\s\S]*grid-template-columns: minmax\(240px, \.82fr\) minmax\(300px, 1\.18fr\)/);
  assert.match(js, /function renderMoneyCloseoutPanel/);
  assert.match(js, /Closeout Checklist/);
  assert.match(js, /Protect the final handoff/);
  assert.match(css, /money-closeout-grid[\s\S]*grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, 240px\), 1fr\)\)/);
  assert.match(css, /money-closeout-step[\s\S]*grid-template-rows: auto auto minmax\(0, 1fr\) auto/);
  assert.match(css, /money-closeout-step-head[\s\S]*grid-template-columns: minmax\(0, 1fr\) auto/);
  assert.match(css, /money-closeout-step li strong,[\s\S]*money-closeout-step li span[\s\S]*text-overflow: ellipsis/);
  assert.match(css, /\.money-budget-panel/);
  assert.match(css, /\.money-budget-item/);
  assert.match(css, /\.money-budget-stats/);
  assert.match(css, /money-budget-item dl[\s\S]*grid-template-columns: repeat\(3, minmax\(68px, 1fr\)\)/);
  assert.match(css, /money-budget-actions[\s\S]*flex-wrap: wrap/);
  assert.match(css, /money-budget-actions \.inline-action[\s\S]*flex: 1 1 128px/);
  assert.match(css, /tools-control-card[\s\S]*grid-template-rows: auto minmax\(0, 1fr\) auto/);
  assert.match(js, /function renderToolsSystemsPanel/);
  assert.match(js, /Where each utility lives/);
  assert.match(css, /tools-systems-grid[\s\S]*grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, 240px\), 1fr\)\)/);
  assert.match(css, /tools-system-card[\s\S]*grid-template-rows: auto auto minmax\(0, 1fr\) auto/);
  assert.match(css, /tools-system-card-head[\s\S]*grid-template-columns: minmax\(0, 1fr\) auto/);
  assert.match(css, /tools-system-card li[\s\S]*grid-template-columns: minmax\(0, 1fr\) auto/);
  assert.match(css, /tools-control-grid[\s\S]*repeat\(auto-fit, minmax\(min\(100%, 260px\), 1fr\)\)/);
  assert.match(css, /tools-control-card \.ticket-card-actions[\s\S]*flex-wrap: wrap/);
  assert.match(css, /tools-control-card \.ticket-card-actions button[\s\S]*flex: 1 1 136px/);
  assert.doesNotMatch(css, /tools-health-strip|tools-health-row/);
  assert.match(css, /\.ticket-budget-bridge/);
  assert.match(css, /\.money-budget-drawer/);
  assert.match(js, /function ticketStage\(ticket = \{\}\)/);
  assert.match(js, /function ticketLane\(ticket = \{\}\)/);
  assert.match(js, /function ticketIsOpen\(ticket = \{\}\)/);
  assert.match(js, /function ticketInLane\(ticket = \{\}, lanes = \[\]\)/);
  assert.match(js, /function ticketActionItems\(data = state\.data\)/);
  assert.match(js, /ticketActionItems\(data\)\.forEach\(push\)/);
  assert.match(js, /data-ticket-source="\$\{escapeHtml\(item\.ticketSource\)\}"/);
  assert.match(js, /ticketInLane\(ticket, \["ready", "field", "review"\]\)/);
  assert.match(js, /ticketInLane\(ticket, \["sales"\]\)/);
  assert.match(js, /dashboardTickets\(data\)\.filter\(ticketIsOpen\)/);
  assert.doesNotMatch(js, /ticket\.source === "job" && ticket\.stage !== "cancelled"/);
  assert.doesNotMatch(js, /dashboardTickets\(data\)\.filter\(\(ticket\) => ticket\.source === "quote"\)/);
  assert.match(js, /document\.addEventListener\("click", \(event\) => \{/);
  assert.match(js, /closest\("\[data-dashboard-link\]"\)/);
  assert.doesNotMatch(js, /qsa\("\[data-dashboard-link\]"\)\.forEach\(\(link\) => \{\s*link\.addEventListener\("click"/);
  assert.match(js, /label: "Leads"/);
  assert.match(workspaceRegistry, /Lead Dashboard/);
  assert.match(js, /Intake Focus/);
  assert.match(js, /data-action="\$\{escapeHtml\(secondaryAction\)\}">/);
  assert.match(js, /secondaryAction: "refresh-documentation"/);
  assert.doesNotMatch(html, /data-action="go-documents">Open Money<\/button>\s*<\/article>/);
  assert.match(css, /#overview\.home-ticket-page > :not\(\[data-home-workspace\]\)/);
  assert.match(css, /#tickets\.job-ticket-page > :not\(\[data-job-ticket-workspace\]\)/);
  assert.match(css, /#calendar\.work-hub-page > :not\(\[data-work-workspace\]\)/);
  assert.match(css, /#outreach\.leads-page > :not\(\[data-leads-workspace\]\)/);
  assert.match(css, /#documents\.money-page > :not\(\[data-money-workspace\]\)/);
  assert.match(css, /#settings\.tools-page > :not\(\[data-tools-workspace\]\):not\(\[data-tools-runtime\]\)/);
  assert.doesNotMatch(html, /sales-ticket-page|field-mode-page|accountant-page/);
  assert.doesNotMatch(js, /renderFieldModeWorkspace|renderSalesWorkspace|renderAccountantWorkspace/);
  assert.doesNotMatch(css, /field-mode-page|sales-ticket-page|accountant-page/);
  assert.match(css, /\.ticket-workbench \{/);
  assert.match(css, /\.ticket-workbench-grid \{/);
  assert.match(css, /\.ticket-workbench-section\.is-active/);
  assert.match(js, /function renderTicketBoardControls/);
  assert.match(js, /function ticketMatchesBoardFilters/);
  assert.match(js, /function titleCase\(value\)/);
  assert.match(js, /function findTicketForDrawer\(source, id\)/);
  assert.match(js, /item\.sourceId === idText/);
  assert.match(js, /renderTicketDrawerFallback\(source, id/);
  assert.match(js, /The ticket matched, but the detail panel hit a rendering error/);
  assert.match(js, /Ticket Command Center/);
  assert.match(js, /Board Filters/);
  assert.match(js, /Find the right ticket fast/);
  assert.match(js, /data-ticket-board-search/);
  assert.match(js, /data-ticket-board-stage-filter/);
  assert.match(js, /data-ticket-board-owner-filter/);
  assert.match(js, /data-ticket-board-result-count/);
  assert.match(js, /reset-ticket-board-filters/);
  assert.match(css, /\.ticket-board-controls/);
  assert.match(css, /ticket-board-controls[\s\S]*grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /ticket-board-filter-row[\s\S]*grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, 156px\), 1fr\)\)/);
  assert.match(css, /\.ticket-board-result-count/);
  assert.doesNotMatch(js, /workspace-focus-value/);
  assert.match(js, /Home workspace signals/);
  assert.doesNotMatch(js, /Tickets workspace signals/);
  assert.doesNotMatch(css, /#overview\.job-ticket-page > :not\(\[data-job-ticket-workspace\]\)/);
});

test("dashboard sidebar exposes accordion subtabs for multi-workspace sections", () => {
  const html = read("dashboard.html");
  const js = read("dashboard.js");
  const css = read("dashboard.css");

  assert.match(html, /data-sidebar-nav-group="calendar"[\s\S]*Route Planner/);
  assert.match(html, /data-sidebar-nav-group="outreach"[\s\S]*Clients/);
  assert.match(html, /data-sidebar-nav-group="settings"[\s\S]*Equipment[\s\S]*Documentation[\s\S]*Import &amp; Export[\s\S]*Groundskeeper AI/);
  assert.match(js, /function setSidebarSubnavOpen[\s\S]*aria-expanded/);
  assert.match(js, /data-sidebar-subnav-toggle[\s\S]*setSidebarSubnavOpen/);
  assert.match(css, /dashboard-nav-group\.is-open \.dashboard-subnav[\s\S]*display: grid/);
});

test("ticket drawer workbench layouts wrap without overlapping content", () => {
  const css = read("dashboard.css");

  assert.match(css, /ticket-work-assignment-form[\s\S]*grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, 190px\), 1fr\)\)/);
  assert.match(css, /ticket-invoice-form[\s\S]*grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, 210px\), 1fr\)\)/);
  assert.match(css, /ticket-cockpit-stats[\s\S]*grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, 118px\), 1fr\)\)/);
  assert.match(css, /ticket-cockpit-track[\s\S]*grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, 92px\), 1fr\)\)/);
  assert.match(css, /ticket-drawer-action-strip[\s\S]*grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, 180px\), 1fr\)\)/);
  assert.match(css, /ticket-drawer-action-strip-actions[\s\S]*grid-column: 1 \/ -1[\s\S]*flex-wrap: wrap/);
  assert.match(css, /ticket-drawer-action-strip-actions button[\s\S]*flex: 1 1 150px/);
  assert.match(css, /ticket-source-context \{[\s\S]*grid-template-columns: 1fr/);
  assert.match(css, /ticket-source-context-meta[\s\S]*grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, 140px\), 1fr\)\)/);
});

test("owner overview kanban keeps four freely movable stages and reserves completion for the ticket workflow", () => {
  const js = read("dashboard.js");
  const css = read("dashboard.css");

  assert.match(js, /\{ key: "new", label: "New"[\s\S]*\{ key: "planned", label: "Planned"[\s\S]*\{ key: "in_progress", label: "In Progress"[\s\S]*\{ key: "review", label: "Review"/);
  assert.doesNotMatch(js, /\{ key: "completed", label: "Completed"/);
  assert.match(js, /function ownerKanbanTargetStage/);
  assert.doesNotMatch(js, /owner-kanban-drag-handle/);
  assert.match(js, /addEventListener\("pointerdown"[\s\S]*closest\?\.\("\[data-owner-kanban-card\]"\)[\s\S]*document\.addEventListener\("pointermove"[\s\S]*Math\.hypot[\s\S]*distance < 7[\s\S]*document\.addEventListener\("pointerup"/);
  assert.match(js, /ownerKanbanSuppressClickUntil/);
  assert.match(js, /cloneNode\(true\)[\s\S]*owner-kanban-drag-ghost[\s\S]*document\.body\.appendChild/);
  assert.match(css, /owner-kanban-drag-ghost[\s\S]*position: fixed[\s\S]*opacity: \.82[\s\S]*pointer-events: none/);
  assert.doesNotMatch(js, /owner-kanban-add[\s\S]*\+ Add Ticket/);
  assert.match(js, /await moveOwnerKanbanSourceCard[\s\S]*clearOwnerKanbanPointerDrag\(\)[\s\S]*renderHomeWorkspace/);
  assert.doesNotMatch(js, /draggable="true" data-owner-kanban-card/);
  assert.doesNotMatch(js, /data-owner-kanban-move/);
  assert.match(js, /data-action="clear-owner-kanban-leads"/);
  assert.match(js, /async function moveOwnerKanbanSourceCard[\s\S]*updateSubmission[\s\S]*updateScheduledJob/);
  assert.match(js, /\{ new: "New", planned: "Scheduled", in_progress: "Contacted", review: "Invoiced" \}/);
  assert.match(js, /status === "new"[\s\S]*status === "contacted"/);
  assert.match(js, /addEventListener\("pointerup"[\s\S]*moveOwnerKanbanSourceCard[\s\S]*refreshDashboard/);
  assert.match(js, /Clear New Column/);
  assert.match(js, /action === "clear-owner-kanban-leads"[\s\S]*window\.confirm[\s\S]*deleteRow\("quote_submissions"[\s\S]*deleteRow\("scheduled_jobs"[\s\S]*deleteJobTicket[\s\S]*refreshDashboard/);
  assert.match(css, /grid-template-columns: repeat\(4, minmax\(220px, 1fr\)\)/);
  assert.match(js, /async function moveOwnerKanbanTicket[\s\S]*previousTickets[\s\S]*updateJobTicket[\s\S]*insertJobTicketEvent[\s\S]*state\.data\.tickets = previousTickets/);
  assert.match(js, /data-owner-kanban-search/);
  assert.match(js, /data-owner-kanban-filter="assignee"/);
  assert.match(js, /data-owner-kanban-filter="priority"/);
  assert.match(js, /data-owner-kanban-filter="type"/);
  assert.match(js, /data-owner-kanban-filter="date"/);
  assert.match(js, /data-owner-kanban-filter="status"/);
  assert.match(js, /data-owner-kanban-filter="sort"/);
  assert.match(js, /owner-kanban-empty[\s\S]*Clear for now/);
  assert.match(css, /owner-kanban-scroll[\s\S]*grid-template-columns: repeat\(4, minmax\(220px, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*grid-auto-columns: minmax\(260px, 84vw\)/);
});

test("dashboard creates canonical job tickets without removing source fallbacks", () => {
  const js = read("dashboard.js");

  assert.match(js, /async function insertJobTicket/);
  assert.match(js, /async function updateJobTicket/);
  assert.match(js, /async function insertJobTicketEvent/);
  assert.match(js, /async function ensureJobTicketForScheduledJob/);
  assert.match(js, /async function ensureJobTicketForQuoteSubmission/);
  assert.match(js, /async function ensureJobTicketForSalesDocument/);
  assert.match(js, /function findJobTicketForSalesDocument/);
  assert.match(js, /function ticketPayloadFromSalesDocument/);
  assert.match(js, /function salesDocumentStage/);
  assert.match(js, /async function completeScheduledJobWithTicket/);
  assert.match(js, /async function syncJobTicketPhotoProof/);
  assert.match(js, /async function dashboardTicketRequest/);
  assert.match(js, /async function loadCanonicalTicketEvents/);
  assert.match(js, /function renderTicketHistory/);
  assert.match(js, /function renderTicketDocumentSource/);
  assert.match(js, /function renderTicketWorkbench/);
  assert.match(js, /function renderTicketInvoiceBridge/);
  assert.match(js, /function findInvoiceForTicket/);
  assert.match(js, /async function ensureInvoiceForTicket/);
  assert.match(js, /async function saveTicketInvoiceStatus/);
  assert.match(js, /data-ticket-workbench/);
  assert.match(js, /data-ticket-invoice-form/);
  assert.match(js, /data-action="create-ticket-invoice"/);
  assert.match(js, /Sales & Scope/);
  assert.match(js, /Cost Review/);
  assert.match(js, /Owner Approval/);
  assert.match(js, /Draft Invoice/);
  assert.match(js, /Work & Site Proof/);
  assert.match(js, /Closeout/);
  assert.match(js, /renderTicketWorkbench\(ticket\)/);
  assert.match(js, /const ticketLifecycleTransitions = \{/);
  assert.match(js, /function renderTicketCommandCenter/);
  assert.match(js, /data-action="transition-ticket-stage"/);
  assert.match(js, /data-action="save-ticket-command"/);
  assert.match(js, /ticketMissingRequirementsForStage/);
  assert.match(js, /ticketRequirementLabel/);
  assert.match(js, /fetch\("\/\.netlify\/functions\/dashboard-tickets"/);
  assert.match(js, /dashboardTicketRequest\("list"/);
  assert.match(js, /dashboardTicketRequest\("events"/);
  assert.match(js, /dashboardTicketRequest\("create"/);
  assert.match(js, /dashboardTicketRequest\("update"/);
  assert.match(js, /dashboardTicketRequest\("transition"/);
  assert.match(js, /dashboardTicketRequest\("event"/);
  assert.match(js, /async function transitionJobTicketStage/);
  assert.match(js, /await transitionJobTicketStage\(ticketId, nextStage/);
  assert.match(js, /await completeScheduledJobWithTicket\(id\)/);
  assert.match(js, /await completeScheduledJobWithTicket\(updatedJob\)/);
  assert.match(js, /await ensureJobTicketForScheduledJob\(job, \{/);
  assert.match(js, /const ticket = findJobTicketForScheduledJob\(id\)/);
  assert.match(js, /await ensureJobTicketForQuoteSubmission\(updatedSubmission \|\| item/);
  assert.match(js, /await ensureJobTicketForQuoteSubmission\(updatedQuote \|\| item/);
  assert.match(js, /await ensureJobTicketForQuoteSubmission\(updatedSubmission \|\| item, \{/);
  assert.match(js, /await ensureJobTicketForSalesDocument\(document\)/);
  assert.match(js, /await ensureInvoiceForTicket\(ticket\)/);
  assert.match(js, /await saveTicketInvoiceStatus\(event\.target\)/);
  assert.match(js, /const ticket = findJobTicketForSalesDocument\(id\)/);
  assert.match(js, /state\.data\.documents\.find\(\(item\) => item\.id === sourceId\)/);
  assert.match(js, /renderTicketDocumentSource\(sourceItem\)/);
  assert.match(js, /await syncJobTicketPhotoProof\(jobId, photoStage\)/);
  assert.match(js, /field_completion_notes/);
  assert.match(js, /arrival_photos_uploaded/);
  assert.match(js, /completion_photos_uploaded/);
  assert.match(js, /invoice_id: document\?\.id/);
  assert.match(js, /invoice_finalized/);
  assert.match(js, /payment_status/);
  assert.doesNotMatch(js, /job_tickets\?select=\*/);
  assert.doesNotMatch(js, /job_ticket_events\?select=\*/);
  assert.match(js, /source_type: "quote"/);
  assert.match(js, /source_type: "job"/);
  assert.match(js, /source_type: "document"/);
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
