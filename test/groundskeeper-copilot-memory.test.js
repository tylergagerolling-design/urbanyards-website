const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  correctionPreview,
  normalizeMemory,
  relevantMemories,
  sanitizeScope
} = require("../src/assistant/memory-service");
const {
  navigationRoute,
  planUIActions,
  validateUIAction
} = require("../src/assistant/ui-action-planner");

test("memory normalization separates type, scope, approval, and expiry", () => {
  const memory = normalizeMemory({
    memoryType: "record",
    statement: "North loading entrance.",
    scope: { propertyId: "p1", ignored: "no" },
    source: "user_correction",
    confidence: "high"
  }, { userId: "owner-1" });
  assert.equal(memory.memory_type, "record");
  assert.deepEqual(memory.scope, { propertyId: "p1" });
  assert.equal(memory.approved_by, "owner-1");
  assert.equal(memory.expires_at, null);
});

test("conversation memory receives an automatic expiry", () => {
  const memory = normalizeMemory({ memoryType: "conversation", statement: "That ticket means JOB-1." }, { userId: "owner-1" });
  assert.ok(Date.parse(memory.expires_at) > Date.now());
  assert.equal(memory.approved_by, null);
});

test("scope sanitizer rejects arbitrary keys", () => {
  assert.deepEqual(sanitizeScope({ userId: "u1", clientId: "c1", secret: "discard" }), { userId: "u1", clientId: "c1" });
});

test("relevant memory retrieval respects record scope and expiry", () => {
  const memories = [
    { id: "m1", memory_type: "record", statement: "Kennedy note", scope: { propertyId: "p1" }, is_active: true },
    { id: "m2", memory_type: "record", statement: "Other note", scope: { propertyId: "p2" }, is_active: true },
    { id: "m3", memory_type: "business_rule", statement: "Company rule", scope: {}, is_active: true },
    { id: "m4", memory_type: "conversation", statement: "Expired", scope: {}, is_active: true, expires_at: "2020-01-01T00:00:00Z" }
  ];
  const result = relevantMemories(memories, { actor: { userId: "u1" }, pageContext: { selectedRecordType: "property", selectedRecordId: "p1" } });
  assert.deepEqual(result.map((memory) => memory.id), ["m1", "m3"]);
});

test("corrections produce previews rather than permanent memory writes", () => {
  const preview = correctionPreview("That property belongs to Edge, not Kennedy Management.", { selectedRecordType: "property", selectedRecordId: "p1" });
  assert.equal(preview.scope.propertyId, "p1");
  assert.match(preview.statement, /Edge, not Kennedy Management/);
});

test("navigation route selection is allowlisted", () => {
  assert.equal(navigationRoute("Take me to invoices"), "documents");
  assert.equal(navigationRoute("Open AI memory"), "ai-memory");
  assert.equal(navigationRoute("Go to today's schedule"), "calendar");
});

test("invoice navigation selects the invoicing workspace", () => {
  const actions = planUIActions({ message: "Take me to invoices", routing: {}, resolvedEntity: null, citations: [] });
  assert.ok(actions.some((action) => action.type === "navigate" && action.route === "documents"));
  assert.ok(actions.some((action) => action.type === "apply_filters" && action.filters.moneyView === "invoicing"));
});

test("record commands produce validated side-panel actions", () => {
  const actions = planUIActions({
    message: "Open JOB-0159A",
    routing: { primaryIntent: "record_search" },
    resolvedEntity: { recordType: "ticket", recordId: "t1" },
    citations: []
  });
  assert.deepEqual(actions.find((action) => action.type === "open_record"), {
    type: "open_record",
    recordType: "ticket",
    recordId: "t1",
    presentation: "side_panel"
  });
});

test("filter commands produce bounded filter and highlight actions", () => {
  const actions = planUIActions({
    message: "Show Edge jobs missing completion photos",
    routing: { primaryIntent: "record_search" },
    resolvedEntity: null,
    citations: [{ recordId: "t1" }, { recordId: "t2" }]
  });
  assert.ok(actions.some((action) => action.type === "apply_filters" && action.filters.missingRequirement === "completion_photos"));
  assert.ok(actions.some((action) => action.type === "highlight_records" && action.recordIds.length === 2));
});

test("action validator rejects arbitrary routes, scripts, and oversized highlights", () => {
  assert.equal(validateUIAction({ type: "navigate", route: "javascript:alert(1)" }), false);
  assert.equal(validateUIAction({ type: "execute_script", script: "alert(1)" }), false);
  assert.equal(validateUIAction({ type: "highlight_records", recordIds: Array.from({ length: 51 }, (_, index) => String(index)) }), false);
});

test("questions without command language do not manipulate the UI", () => {
  assert.deepEqual(planUIActions({ message: "Why is this ticket blocked?", routing: {}, resolvedEntity: null, citations: [] }), []);
});

test("memory persistence migration is private, indexed, and typed", () => {
  const sql = fs.readFileSync(path.join(__dirname, "../supabase/migrations/20260724_groundskeeper_memory.sql"), "utf8");
  assert.match(sql, /create table if not exists public\.assistant_memories/);
  assert.match(sql, /create table if not exists public\.assistant_outcomes/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /revoke all on public\.assistant_memories from anon, authenticated/);
  assert.match(sql, /using gin \(scope\)/);
});

test("dashboard uses a controlled action bus and inspectable memory page", () => {
  const dashboard = fs.readFileSync(path.join(__dirname, "../dashboard.js"), "utf8");
  const html = fs.readFileSync(path.join(__dirname, "../dashboard.html"), "utf8");
  assert.match(dashboard, /function validDashboardUIAction/);
  assert.match(dashboard, /function executeDashboardUIActions/);
  assert.match(dashboard, /data-ai-memory-form/);
  assert.match(dashboard, /copilot-rate-outcome/);
  assert.match(html, /data-dashboard-link="ai-memory"/);
  assert.match(html, /data-ai-memory-workspace/);
});
