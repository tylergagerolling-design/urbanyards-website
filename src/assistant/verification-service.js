"use strict";

function verifyAssistantResult({ toolResults = [], citations = [], intent, requiresWritePreview }) {
  const successful = toolResults.filter((result) => result.ok);
  const failed = toolResults.filter((result) => !result.ok);
  const citationIds = new Set(citations.map((citation) => `${citation.recordType}:${citation.recordId}`));
  const unresolvedIssues = [];
  if (failed.length) unresolvedIssues.push(...failed.map((result) => `${result.name}: ${result.error}`));
  if (requiresWritePreview) unresolvedIssues.push("A write was requested; Phase 1 may recommend or preview it but cannot execute it.");
  const outputs = successful.map((result) => result.output || {});
  const contradictions = outputs.flatMap((output) => output.conflictingEvidence || output.conflicts || []);
  const missingInformation = [...new Set(outputs.flatMap((output) => output.missingInformation || output.requiredObservations || []).map(String))];
  const safetyWarnings = [...new Set(outputs.flatMap((output) => output.safetyWarnings || []).map(String))];
  const licensingConcerns = [...new Set(outputs.flatMap((output) => output.licensingConcerns || []).map(String))];
  const doNotProceed = safetyWarnings.some((warning) => /\b(power line|electrical|life-threatening|stop|do not proceed)\b/i.test(warning))
    || licensingConcerns.some((concern) => /\b(licensed|permit|required|regulated)\b/i.test(concern));
  const confidenceLevel = doNotProceed
    ? "do_not_proceed"
    : failed.length || contradictions.length
      ? "low"
      : !successful.length
        ? "insufficient_information"
        : missingInformation.length || successful.some((result) => result.output?.partial)
          ? "moderate"
          : "high";
  return {
    factualClaimsVerified: successful.length > 0 || intent === "question",
    calculationsVerified: !["analysis", "financial_action", "simulation"].includes(intent) || successful.length > 0,
    permissionsVerified: failed.every((result) => result.code !== "PERMISSION_DENIED"),
    citationsComplete: successful.every((result) => (result.output?.citations || []).every((citation) => citationIds.has(`${citation.recordType}:${citation.recordId}`))),
    partialResultsDetected: failed.length > 0 || successful.some((result) => result.output?.partial),
    confidenceLevel,
    confidenceFactors: {
      informationComplete: missingInformation.length === 0,
      sourceReliability: citations.length > 0 ? "grounded" : "no_record_sources",
      contradictionCount: contradictions.length,
      safetyRisk: safetyWarnings.length > 0,
      licensingRisk: licensingConcerns.length > 0,
      specialistReviewRecommended: doNotProceed || contradictions.length > 0
    },
    selfCheck: {
      addressedRequest: true,
      correctRecordResolved: successful.length > 0 || intent === "question",
      unsupportedMeasurementsBlocked: !outputs.some((output) => output.result && output.assumptions === undefined),
      contradictionsAddressed: contradictions.length === 0 || unresolvedIssues.length > 0,
      regionalContextConsidered: outputs.some((output) => output.region || output.contextBoundaries?.generalAndRegionalKnowledge) || null,
      seasonalContextConsidered: outputs.some((output) => output.season) || null,
      practicalNextActionPresent: outputs.some((output) => output.safeImmediateAction || output.recommendation || output.missingInformation?.length) || null
    },
    missingInformation: missingInformation.slice(0, 8),
    unresolvedIssues,
    safeToReturn: failed.every((result) => !["PERMISSION_DENIED", "CONFIRMATION_REQUIRED"].includes(result.code))
  };
}

module.exports = { verifyAssistantResult };
