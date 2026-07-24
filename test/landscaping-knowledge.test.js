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
