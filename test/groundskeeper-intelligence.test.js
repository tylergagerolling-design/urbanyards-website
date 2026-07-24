const test = require("node:test");
const assert = require("node:assert/strict");
const intelligence = require("../src/assistant/intelligence-service");
const { orchestrateDashboardRequest, toolsForRouting } = require("../src/assistant/orchestrator");
const { routeIntent } = require("../src/assistant/intent-router");

const ticket = {
  id: "t1", number: "JOB-1", title: "Kennedy cleanup", clientId: "c1",
  propertyId: "p1", property: "Kennedy", service: "Cleanup", stage: "work",
  scheduledDate: "2026-07-25T09:00:00Z", assignedUserId: "worker-1",
  arrivalPhotosComplete: true, completionPhotosNa: true, formsComplete: true,
  actualCostsNa: true, rentDeduction: true
};

test("relationship intelligence connects authorized operational and financial records", () => {
  const result = intelligence.relationshipMap({
    snapshot: {
      tickets: [ticket],
      invoices: [{ id: "i1", number: "INV-1", ticketId: "t1", clientId: "c1" }],
      documents: [{ id: "d1", title: "Completion form", ticketId: "t1" }]
    },
    recordType: "ticket", record: ticket
  });
  assert.equal(result.calculation.relationshipCount, 2);
  assert.deepEqual(new Set(result.records.map((item) => item.recordType)), new Set(["invoice", "document"]));
});

test("ticket readiness accepts completed requirements and explicit N/A values", () => {
  const result = intelligence.assessTicketReadiness({ ticket: { ...ticket, paymentNa: true } });
  assert.equal(result.calculation.completionPercent, 100);
  assert.deepEqual(result.missingInformation, []);
  assert.equal(result.confidence, 1);
});

test("ticket readiness exposes missing requirements with evidence and confidence", () => {
  const result = intelligence.assessTicketReadiness({ ticket: { id: "t2", number: "JOB-2", title: "Incomplete" } });
  assert.ok(result.missingInformation.includes("Property"));
  assert.ok(result.evidence.every((item) => typeof item.complete === "boolean"));
  assert.ok(result.confidence < 1);
});

test("schedule intelligence finds overlaps without inventing travel or weather", () => {
  const result = intelligence.scheduleInsights({ snapshot: { jobs: [
    { id: "j1", title: "First", startAt: "2026-07-25T09:00:00Z", durationMinutes: 120, assignedUserId: "w1" },
    { id: "j2", title: "Second", startAt: "2026-07-25T10:00:00Z", assignedUserId: "w1" }
  ], tickets: [] } });
  assert.equal(result.calculation.conflictCount, 1);
  assert.match(result.safetyNotice, /Travel-time and weather.*neither is inferred/i);
});

test("document intelligence reports incompleteness without claiming unread contents", () => {
  const result = intelligence.documentInsights({ snapshot: { documents: [{ id: "d1", title: "Contract", status: "Draft" }] }, record: null });
  assert.equal(result.partial, true);
  assert.match(result.extractionCapability, /does not invent unread file contents/i);
});

test("completed-work learning calculates estimate-to-actual variance", () => {
  const result = intelligence.completedWorkLearning({ snapshot: { tickets: [
    { id: "t1", number: "JOB-1", stage: "closed", estimatedTotalCost: 100, actualTotalCost: 125 }
  ] } });
  assert.equal(result.calculation.variance, 25);
  assert.equal(result.records[0].variancePercent, 25);
  assert.match(result.recommendation, /do not alter pricing automatically/i);
});

test("lead intelligence ranks overdue follow-ups and recommends the next touch", () => {
  const result = intelligence.leadInsights({ snapshot: { leads: [
    { id: "l1", name: "Overdue Lead", status: "Prospect", phone: "555", nextFollowUpAt: "2020-01-01" },
    { id: "l2", name: "Future Lead", status: "Prospect", email: "x@example.com", nextFollowUpAt: "2099-01-01" }
  ] } });
  assert.equal(result.records[0].title, "Overdue Lead");
  assert.match(result.recommendation, /Overdue Lead/);
});

test("proactive intelligence combines ticket, invoice, and document risks", () => {
  const result = intelligence.proactiveRisks({ snapshot: {
    tickets: [{ id: "t1", title: "Blocked", blockers: ["Photos"] }],
    invoices: [{ id: "i1", number: "INV-1", status: "sent", balance: 50 }],
    documents: [{ id: "d1", title: "Draft", status: "draft" }]
  } });
  assert.deepEqual(result.calculation, { blockedTickets: 1, unpaidInvoices: 1, documentsNeedingReview: 1 });
});

test("orchestrator selects intelligence tools from natural language", async () => {
  const routing = { ...routeIntent("Analyze scheduling conflicts and weather"), message: "Analyze scheduling conflicts and weather" };
  assert.ok(toolsForRouting(routing, null).some((call) => call.name === "analyze_schedule"));
  const result = await orchestrateDashboardRequest({
    message: "What proactive risks need attention across operations?",
    context: { tickets: [], invoices: [], documents: [] },
    actor: { userId: "owner-1", role: "owner" },
    hasPermission: () => true
  });
  assert.ok(result.toolResults.some((tool) => tool.name === "detect_operational_risks" && tool.ok));
  assert.match(result.modelContext, /confidence.*relationships.*conflicts.*missingInformation/i);
});
