"use strict";

function verifyAssistantResult({ toolResults = [], citations = [], intent, requiresWritePreview }) {
  const successful = toolResults.filter((result) => result.ok);
  const failed = toolResults.filter((result) => !result.ok);
  const citationIds = new Set(citations.map((citation) => `${citation.recordType}:${citation.recordId}`));
  const unresolvedIssues = [];
  if (failed.length) unresolvedIssues.push(...failed.map((result) => `${result.name}: ${result.error}`));
  if (requiresWritePreview) unresolvedIssues.push("A write was requested; Phase 1 may recommend or preview it but cannot execute it.");
  return {
    factualClaimsVerified: successful.length > 0 || intent === "question",
    calculationsVerified: !["analysis", "financial_action", "simulation"].includes(intent) || successful.length > 0,
    permissionsVerified: failed.every((result) => result.code !== "PERMISSION_DENIED"),
    citationsComplete: successful.every((result) => (result.output?.citations || []).every((citation) => citationIds.has(`${citation.recordType}:${citation.recordId}`))),
    partialResultsDetected: failed.length > 0 || successful.some((result) => result.output?.partial),
    unresolvedIssues,
    safeToReturn: failed.every((result) => !["PERMISSION_DENIED", "CONFIRMATION_REQUIRED"].includes(result.code))
  };
}

module.exports = { verifyAssistantResult };
