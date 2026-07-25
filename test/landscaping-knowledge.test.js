const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  landscapingIntent,
  landscapingKnowledgeCatalog,
  retrieveLandscapingKnowledge
} = require("../src/assistant/landscaping-knowledge");
const { orchestrateDashboardRequest } = require("../src/assistant/orchestrator");
const { consultationDecision } = require("../src/assistant/consultation/policy");
const {
  currentSeason,
  detectRecordContradictions,
  diagnoseLandscapingIssue
} = require("../src/assistant/landscaping-diagnostics");

const root = path.join(__dirname, "..");
const records = JSON.parse(fs.readFileSync(path.join(root, "knowledge/indexes/records.json"), "utf8"));
const schema = JSON.parse(fs.readFileSync(path.join(root, "knowledge/schemas/knowledge-record.schema.json"), "utf8"));
const evaluations = JSON.parse(fs.readFileSync(path.join(root, "knowledge/evaluations/starter-evaluations.json"), "utf8"));

test("landscaping records are small, versioned, approved, and schema-shaped", () => {
  const required = schema.required;
  assert.ok(records.length >= 10);
  records.forEach((record) => {
    required.forEach((key) => assert.notEqual(record[key], undefined, `${record.id} missing ${key}`));
    assert.ok(JSON.stringify(record).length < 12000, `${record.id} is oversized`);
    assert.ok(["general", "regional", "company", "safety"].includes(record.layer));
  });
});

test("retrieval evaluations return expected records and safety context", () => {
  evaluations.forEach((evaluation) => {
    const result = retrieveLandscapingKnowledge({ query: evaluation.question, region: "Portland", limit: 8 });
    const ids = result.records.map((record) => record.id);
    evaluation.expectedIds.forEach((id) => assert.ok(ids.includes(id), `${evaluation.question} did not retrieve ${id}`));
    if (evaluation.requiresSafety) assert.ok(result.records.some((record) => record.layer === "safety" || record.safetyWarnings.length || record.escalationConditions.length));
    assert.ok(result.records.length <= 9);
  });
});

test("retrieval preserves knowledge-layer boundaries and returns citations", () => {
  const result = retrieveLandscapingKnowledge({ query: "Portland wet turf mowing quality", region: "Portland" });
  assert.ok(result.records.some((record) => record.layer === "regional"));
  assert.ok(result.records.some((record) => record.layer === "general"));
  assert.equal(result.contextBoundaries.customerOrPropertyMemory, false);
  assert.equal(result.citations.length, result.records.length);
});

test("non-landscaping conversation does not load the landscaping library", () => {
  assert.equal(landscapingIntent("Open the invoices page"), false);
  assert.equal(landscapingIntent("How should we troubleshoot this irrigation leak?"), true);
});

test("orchestrator retrieves landscaping knowledge lazily and keeps property memory separate", async () => {
  const result = await orchestrateDashboardRequest({
    message: "What should we inspect for standing water at this Portland property?",
    context: { properties: [{ id: "p1", name: "Kennedy", city: "Portland" }], pageContext: {} },
    actor: { userId: "owner-1", role: "owner" },
    hasPermission: () => true
  });
  const tool = result.toolResults.find((item) => item.name === "retrieve_landscaping_knowledge");
  assert.equal(tool.ok, true);
  assert.ok(tool.output.records.some((record) => record.id === "general.drainage.standing-water-001"));
  assert.equal(tool.output.contextBoundaries.customerOrPropertyMemory, false);
});

test("Gemini auto-review triggers for uncertain landscaping and regulated work", () => {
  assert.equal(consultationDecision({ message: "This is an uncertain plant identification from one photo" }).consult, true);
  assert.equal(consultationDecision({ message: "Review licensing concerns for an irrigation backflow repair" }).consult, true);
});

test("owner catalog exposes review metadata without loading full record detail", () => {
  const catalog = landscapingKnowledgeCatalog();
  assert.equal(catalog.length, records.length);
  assert.ok(catalog.every((item) => item.id && item.version && item.lastReviewedDate));
  assert.ok(catalog.every((item) => !Object.prototype.hasOwnProperty.call(item, "procedureSteps")));
});

test("repository documents separate knowledge, property memory, and temporary context", () => {
  const readme = fs.readFileSync(path.join(root, "knowledge/README.md"), "utf8");
  const dashboard = fs.readFileSync(path.join(root, "dashboard.js"), "utf8");
  assert.match(readme, /Customer\/property memory and temporary ticket\/conversation context are intentionally stored elsewhere/i);
  assert.match(dashboard, /Landscaping Intelligence Library/);
  assert.match(dashboard, /approval-controlled knowledge editor/);
});

test("diagnostic guidance keeps symptoms uncertain and lists field observations", () => {
  const result = diagnoseLandscapingIssue({
    query: "Why is this Portland lawn brown and yellow?",
    region: "Portland",
    season: "summer"
  });
  assert.equal(result.diagnostic, true);
  assert.equal(result.confidence, "moderate");
  assert.ok(result.requiredObservations.includes("damage pattern"));
  assert.ok(result.otherReasonablePossibilities.length > 0);
  assert.match(result.safeImmediateAction, /document/i);
  assert.ok(result.records.some((record) => record.id === "general.turf.brown-yellow-001"));
});

test("diagnostic contradiction checking never silently picks between verified facts", () => {
  const conflicts = detectRecordContradictions([
    { id: "property-1", verifiedFacts: { irrigationZone: "Zone 3", soil: "clay" } },
    { id: "ticket-1", verifiedFacts: { irrigationZone: "Zone 4", soil: "clay" } }
  ]);
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].field, "irrigationzone");
  assert.equal(conflicts[0].requiresOwnerReview, true);
});

test("season context is derived without loading weather data", () => {
  assert.equal(currentSeason(new Date("2026-01-15T00:00:00Z")), "winter");
  assert.equal(currentSeason(new Date("2026-04-15T00:00:00Z")), "spring");
  assert.equal(currentSeason(new Date("2026-07-15T00:00:00Z")), "summer");
  assert.equal(currentSeason(new Date("2026-10-15T00:00:00Z")), "fall");
});

test("orchestrator uses the structured diagnostic tool for landscaping symptoms", async () => {
  const result = await orchestrateDashboardRequest({
    message: "Why does this mossy lawn keep returning in Portland?",
    context: { properties: [], tickets: [], pageContext: {} },
    actor: { userId: "owner-1", role: "owner" },
    hasPermission: () => true
  });
  const diagnostic = result.toolResults.find((tool) => tool.name === "diagnose_landscaping_issue");
  assert.equal(diagnostic?.ok, true);
  assert.equal(diagnostic.output.diagnostic, true);
  assert.ok(diagnostic.output.records.some((record) => record.id === "regional.pnw.moss-compaction-001"));
});
