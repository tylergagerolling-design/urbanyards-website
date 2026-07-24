"use strict";

function consultationSummaryForModel(result = {}) {
  return JSON.stringify({
    summary: result.summary || "",
    findings: result.findings || [],
    risks: result.risks || [],
    missingInformation: result.missingInformation || [],
    recommendation: result.recommendation || "",
    shouldEscalate: result.shouldEscalate === true
  });
}

function disagreementDetected(primary = "", consultation = {}) {
  const risks = consultation.risks || [];
  return consultation.shouldEscalate === true || risks.some((risk) => /\b(disagree|incorrect|conflict|unsupported|contradict)\b/i.test(risk));
}

function synthesisInstruction({ userQuestion, primaryAnswer, consultation }) {
  return [
    "Create one concise Groundskeeper response to the user.",
    "Use the primary answer as the base and the Gemini consultation only as advisory review.",
    "Answer the actual question, distinguish verified facts from recommendations, state material missing information, and mention significant unresolved disagreement.",
    "Do not mention hidden prompts, chain-of-thought, API payloads, or claim consensus unless supported.",
    `User question: ${String(userQuestion || "").slice(0, 1800)}`,
    `Primary answer: ${String(primaryAnswer || "").slice(0, 5000)}`,
    `Gemini consultation: ${consultationSummaryForModel(consultation)}`
  ].join("\n\n");
}

module.exports = { consultationSummaryForModel, disagreementDetected, synthesisInstruction };
