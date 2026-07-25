"use strict";

const MODE_RULES = [
  ["safety_compliance", /\b(safety|hazard|danger|power line|chemical|pesticide|license|permit|backflow|tree risk|utility)\b/i],
  ["landscaping_diagnostic", /\b(diagnos|brown|yellow|bare|moss|wilt|spot|scorch|rot|leak|pressure|drainage|standing water|pest|disease|damage)\b/i],
  ["estimating", /\b(estimate|quote|calculate|quantity|square feet|linear feet|labor|crew hours|material cost|margin)\b/i],
  ["property_analysis", /\b(property|site|history|last time|recurring|inspection|photos?)\b/i],
  ["field_worker", /\b(field|work sequence|bring|tools|equipment|ppe|checklist|instructions?)\b/i],
  ["quality_control", /\b(quality|closeout|complete|proof|actuals|rework|inspection)\b/i],
  ["business_operations", /\b(customer|lead|schedule|ticket|invoice|expense|follow.?up|report)\b/i]
];

function reasoningModes(message) {
  const value = String(message || "");
  const modes = MODE_RULES.filter(([, pattern]) => pattern.test(value)).map(([mode]) => mode);
  return modes.length ? modes : ["general"];
}

function buildExecutionPlan({ message, routing, resolvedEntity, calls = [] } = {}) {
  const modes = reasoningModes(message);
  const toolNames = calls.map((call) => call.name);
  const significant = modes.some((mode) => mode !== "general")
    || routing.intents.some((intent) => ["analysis", "comparison", "planning", "simulation", "recommendation", "estimate_request", "material_calculation"].includes(intent));
  const missingInformation = [];
  if (routing.entities.includes("property") && resolvedEntity?.recordType !== "property") missingInformation.push("A specific property has not been resolved.");
  if (routing.entities.includes("ticket") && resolvedEntity?.recordType !== "ticket") missingInformation.push("A specific ticket has not been resolved.");
  if (routing.intents.includes("photo_review")) missingInformation.push("Photo contents are available only when an authorized image record or attachment is supplied.");
  return {
    significant,
    desiredOutcome: String(message || "").trim().slice(0, 500),
    reasoningModes: modes,
    requiredRecords: [...new Set(routing.entities)],
    requiredKnowledge: modes.includes("landscaping_diagnostic") || modes.includes("safety_compliance") ? ["approved landscaping knowledge"] : [],
    selectedTools: toolNames,
    missingInformation,
    possibleSafetyConcern: modes.includes("safety_compliance"),
    possibleLicensingConcern: /\b(license|permit|backflow|electrical|pesticide|tree risk)\b/i.test(String(message || "")),
    geminiConsultationCandidate: modes.includes("safety_compliance") || modes.includes("landscaping_diagnostic") || modes.includes("estimating"),
    expectedOutput: modes.includes("estimating") ? "inputs, assumptions, formula, result, contingency, and missing measurements" : modes.includes("landscaping_diagnostic") ? "likely explanations, evidence gaps, safe action, inspection, confidence, and escalation" : "concise answer with relevant records and next action"
  };
}

module.exports = { buildExecutionPlan, reasoningModes };
