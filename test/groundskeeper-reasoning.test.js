const test = require("node:test");
const assert = require("node:assert/strict");

const { calculateLandscapeMaterial } = require("../src/assistant/calculators");
const { routeIntent } = require("../src/assistant/intent-router");
const { orchestrateDashboardRequest } = require("../src/assistant/orchestrator");
const { buildExecutionPlan, reasoningModes } = require("../src/assistant/reasoning-planner");
const { consultantRoleFor, consultationDecision } = require("../src/assistant/consultation/policy");
const { verifyAssistantResult } = require("../src/assistant/verification-service");

test("multi-intent classification captures property, photo, diagnosis, material, and estimate work", () => {
  const routed = routeIntent("Look at this property's photos, diagnose the brown turf, and calculate mulch for an estimate.");
  assert.ok(routed.intents.includes("photo_review"));
  assert.ok(routed.intents.includes("diagnostic_request"));
  assert.ok(routed.intents.includes("material_calculation"));
  assert.ok(routed.intents.includes("estimate_request"));
  assert.ok(routed.entities.includes("property"));
});

test("reasoning modes remain lightweight for simple requests and combine for meaningful work", () => {
  assert.deepEqual(reasoningModes("Hello"), ["general"]);
  const modes = reasoningModes("Inspect this property drainage hazard and estimate the repair.");
  assert.ok(modes.includes("property_analysis"));
  assert.ok(modes.includes("landscaping_diagnostic"));
  assert.ok(modes.includes("estimating"));
  assert.ok(modes.includes("safety_compliance"));
});

test("execution plans expose bounded conclusions rather than hidden reasoning", () => {
  const routing = routeIntent("Estimate mulch for this property.");
  const plan = buildExecutionPlan({
    message: "Estimate mulch for this property.",
    routing,
    resolvedEntity: null,
    calls: [{ name: "retrieve_landscaping_knowledge" }, { name: "calculate_landscape_material" }]
  });
  assert.equal(plan.significant, true);
  assert.ok(plan.missingInformation.some((item) => /property/i.test(item)));
  assert.deepEqual(plan.selectedTools, ["retrieve_landscaping_knowledge", "calculate_landscape_material"]);
  assert.doesNotMatch(JSON.stringify(plan), /chain.of.thought/i);
});

test("material calculator refuses invented measurements", () => {
  const result = calculateLandscapeMaterial({ query: "How much mulch do I need?" });
  assert.equal(result.result, null);
  assert.equal(result.confidence, "insufficient_information");
  assert.ok(result.missingInformation.includes("Measured area in square feet"));
  assert.ok(result.missingInformation.includes("Desired finished depth in inches"));
});

test("material calculator shows supplied inputs, formula, result, and contingency", () => {
  const result = calculateLandscapeMaterial({ query: "Calculate mulch for 540 square feet at 3 inches deep." });
  assert.deepEqual(result.inputs, { material: "mulch", areaSquareFeet: 540, depthInches: 3 });
  assert.equal(result.result.baseCubicYards, 5);
  assert.equal(result.result.recommendedCubicYards, 5.5);
  assert.equal(result.contingency.percent, 10);
  assert.match(result.formula, /540/);
});

test("orchestrator selects approved knowledge and calculator tools together", async () => {
  const result = await orchestrateDashboardRequest({
    message: "Calculate mulch for 540 square feet at 3 inches deep.",
    context: { pageContext: {} },
    actor: { userId: "owner-1", role: "owner" },
    hasPermission: () => true
  });
  assert.ok(result.toolResults.some((tool) => tool.name === "retrieve_landscaping_knowledge" && tool.ok));
  const calculator = result.toolResults.find((tool) => tool.name === "calculate_landscape_material");
  assert.equal(calculator?.ok, true);
  assert.equal(calculator.output.result.recommendedCubicYards, 5.5);
  assert.ok(result.executionPlan.reasoningModes.includes("estimating"));
});

test("verification calibrates incomplete calculations and safety blockers", () => {
  const incomplete = verifyAssistantResult({
    toolResults: [{ name: "calculate_landscape_material", ok: true, output: { partial: true, missingInformation: ["Measured area"] } }],
    citations: [],
    intent: "material_calculation"
  });
  assert.equal(incomplete.confidenceLevel, "moderate");
  assert.equal(incomplete.confidenceFactors.informationComplete, false);
  const unsafe = verifyAssistantResult({
    toolResults: [{ name: "diagnose_landscaping_issue", ok: true, output: { safetyWarnings: ["Stop work near power lines."] } }],
    citations: [],
    intent: "diagnostic_request"
  });
  assert.equal(unsafe.confidenceLevel, "do_not_proceed");
});

test("Gemini receives one targeted specialist role and remains selective", () => {
  assert.equal(consultantRoleFor("Review an irrigation zone with low pressure."), "irrigation_consultant");
  assert.equal(consultantRoleFor("Is this backflow work licensed?"), "licensing_reviewer");
  const trivial = consultationDecision({ message: "Open tickets" });
  assert.equal(trivial.consult, false);
  const material = consultationDecision({ message: "Review this complex drainage problem." });
  assert.equal(material.consult, true);
  assert.equal(material.consultantRole, "drainage_consultant");
});

test("verified deterministic material calculations do not call Gemini", () => {
  const decision = consultationDecision({ message: "Calculate mulch for 540 square feet at 3 inches deep." });
  assert.equal(decision.consult, false);
  assert.equal(decision.reason, "verified_deterministic_calculation");
});
