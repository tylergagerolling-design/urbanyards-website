"use strict";

const { retrieveLandscapingKnowledge, SAFETY_TERMS } = require("./landscaping-knowledge");

const DIAGNOSTIC_TERMS = /\b(brown|yellow|bare|moss|wilt|spot|scorch|dead|dying|rot|leak|pressure|standing water|ponding|uneven|damage|failed|compaction|diagnos|identify|what is wrong|keep(?:s)? returning)\b/i;

function clean(value) {
  return String(value || "").trim();
}

function unique(values, limit = 12) {
  return [...new Set(values.map(clean).filter(Boolean))].slice(0, limit);
}

function currentSeason(date = new Date()) {
  const month = date.getUTCMonth() + 1;
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "fall";
  return "winter";
}

function factEntries(record = {}) {
  const sources = [record.verifiedFacts, record.facts, record.siteConditions]
    .filter((value) => value && typeof value === "object" && !Array.isArray(value));
  return sources.flatMap((source) => Object.entries(source).map(([key, value]) => ({
    key: clean(key).toLowerCase(),
    value: clean(value),
    source: record.number || record.name || record.title || record.id || "record"
  }))).filter((fact) => fact.key && fact.value);
}

function detectRecordContradictions(records = []) {
  const facts = records.flatMap(factEntries);
  const byKey = new Map();
  facts.forEach((fact) => {
    if (!byKey.has(fact.key)) byKey.set(fact.key, []);
    byKey.get(fact.key).push(fact);
  });
  return [...byKey.entries()].flatMap(([key, values]) => {
    if (new Set(values.map((item) => item.value.toLowerCase())).size < 2) return [];
    return [{
      field: key,
      values,
      authority: "Verified property facts take priority; request owner review when two verified records disagree.",
      requiresOwnerReview: true
    }];
  });
}

function diagnoseLandscapingIssue({
  query,
  snapshot = {},
  pageContext = {},
  region = "Portland",
  season = currentSeason(),
  propertyType = "",
  jobType = ""
} = {}) {
  const knowledge = retrieveLandscapingKnowledge({ query, region, season, propertyType, jobType, limit: 8 });
  const relatedRecords = [
    ...(snapshot.properties || []).filter((item) => !pageContext.selectedRecordId || String(item.id) === String(pageContext.selectedRecordId)),
    ...(snapshot.tickets || []).filter((item) => !pageContext.selectedRecordId || String(item.id) === String(pageContext.selectedRecordId))
  ];
  const contradictions = detectRecordContradictions(relatedRecords);
  const requiredObservations = unique(knowledge.records.flatMap((record) => record.requiredObservations || []), 10);
  const possibleExplanations = unique(knowledge.records.map((record) => record.summary), 5);
  const safetyWarnings = unique(knowledge.records.flatMap((record) => record.safetyWarnings || []), 8);
  const escalationConditions = unique(knowledge.records.flatMap((record) => record.escalationConditions || []), 8);
  const diagnostic = DIAGNOSTIC_TERMS.test(clean(query));
  const confidence = contradictions.length
    ? "low"
    : !knowledge.records.length
      ? "insufficient_information"
      : diagnostic && requiredObservations.length
        ? "moderate"
        : "high";
  return {
    summary: diagnostic
      ? "A structured field diagnosis was prepared without treating the symptom as a confirmed cause."
      : "Relevant landscaping guidance was prepared.",
    diagnostic,
    mostLikelyExplanation: possibleExplanations[0] || "",
    otherReasonablePossibilities: possibleExplanations.slice(1),
    supportingEvidence: relatedRecords.map((record) => record.number || record.name || record.title || record.id).filter(Boolean),
    conflictingEvidence: contradictions,
    safeImmediateAction: safetyWarnings.length
      ? "Pause work that could worsen the condition or create exposure, document the site, and follow the listed safety limits."
      : "Document current conditions and avoid irreversible treatment until the required observations are collected.",
    requiredObservations,
    inspectionSteps: requiredObservations.map((observation) => `Observe and document ${observation}.`),
    longTermRecommendation: knowledge.records[0]?.procedureSteps || [],
    escalationConditions,
    safetyWarnings,
    confidence,
    confidenceReason: contradictions.length
      ? "Conflicting verified record values require owner review."
      : diagnostic && requiredObservations.length
        ? "The symptom has multiple plausible causes and field observations are still required."
        : knowledge.records.length
          ? "The recommendation is supported by approved knowledge records."
          : "No approved matching knowledge record was found.",
    region,
    season,
    records: knowledge.records,
    citations: knowledge.citations,
    partial: knowledge.partial || confidence === "insufficient_information",
    requiresSpecialistReview: SAFETY_TERMS.test(clean(query)) || escalationConditions.length > 0
  };
}

module.exports = { DIAGNOSTIC_TERMS, currentSeason, detectRecordContradictions, diagnoseLandscapingIssue };
