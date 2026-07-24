"use strict";

const records = require("../../knowledge/indexes/records.json");

const SAFETY_TERMS = /\b(safety|hazard|danger|toxic|poison|power line|electrical|licensed?|permit|backflow|pesticide|tree risk|hanging limb|structural)\b/i;
const LANDSCAPING_TERMS = /\b(lawn|turf|mow|edge|aerat|seed|thatch|plant|tree|shrub|perennial|annual|groundcover|grass|weed|prun|hedge|soil|compost|mulch|bed|irrigation|sprinkler|drain|drainage|standing water|ponding|grading|rain garden|erosion|pest|disease|seasonal|grounds|pressure wash|equipment|estimate|material|crew|inspection|landscap)\b/i;

function normalize(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokens(value) {
  return [...new Set(normalize(value).split(" ").filter((token) => token.length > 2))];
}

function landscapingIntent(message) {
  return LANDSCAPING_TERMS.test(String(message || ""));
}

function recordText(record) {
  return normalize([
    record.id, record.title, record.category, record.subcategory, ...(record.aliases || []),
    record.summary, record.detail, ...(record.triggers || []), ...(record.jobTypes || []),
    ...(record.requiredObservations || []), ...(record.escalationConditions || [])
  ].join(" "));
}

function scoreRecord(record, queryTokens, context = {}) {
  const text = recordText(record);
  let score = queryTokens.reduce((sum, token) => sum + (text.includes(token) ? (record.aliases || []).some((alias) => normalize(alias).includes(token)) ? 5 : 2 : 0), 0);
  const region = normalize(context.region);
  const season = normalize(context.season);
  const propertyType = normalize(context.propertyType);
  const jobType = normalize(context.jobType);
  if (region && (record.region || []).some((value) => normalize(value).includes(region) || region.includes(normalize(value)))) score += 4;
  if (season && (record.seasons || []).some((value) => normalize(value) === season || value === "year-round")) score += 2;
  if (propertyType && (record.propertyTypes || []).some((value) => normalize(value) === "all" || propertyType.includes(normalize(value)))) score += 2;
  if (jobType && (record.jobTypes || []).some((value) => jobType.includes(normalize(value)) || normalize(value).includes(jobType))) score += 3;
  if (context.preferredLayers?.includes(record.layer)) score += 2;
  if (SAFETY_TERMS.test(context.message || "") && record.layer === "safety") score += 8;
  return score;
}

function compactRecord(record) {
  return {
    id: record.id, title: record.title, layer: record.layer, category: record.category,
    subcategory: record.subcategory, summary: record.summary, detail: record.detail,
    requiredObservations: record.requiredObservations || [], tools: record.tools || [],
    materials: record.materials || [], ppe: record.ppe || [],
    procedureSteps: record.procedureSteps || [], qualityStandard: record.qualityStandard || [],
    prohibitedActions: record.prohibitedActions || [], safetyWarnings: record.safetyWarnings || [],
    licensingConcerns: record.licensingConcerns || [], escalationConditions: record.escalationConditions || [],
    confidenceLevel: record.confidenceLevel, version: record.version, lastReviewedDate: record.lastReviewedDate
  };
}

function retrieveLandscapingKnowledge({ query, region = "Portland", season = "", propertyType = "", jobType = "", limit = 6 } = {}) {
  const queryTokens = tokens(query);
  if (!queryTokens.length) return { summary: "No landscaping search terms were supplied.", records: [], citations: [], partial: true };
  const context = { message: query, region, season, propertyType, jobType, preferredLayers: ["regional", "company"] };
  const ranked = records.filter((record) => record.status === "approved")
    .map((record) => ({ record, score: scoreRecord(record, queryTokens, context) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.record.id.localeCompare(b.record.id));
  const selected = ranked.slice(0, Math.max(1, Math.min(8, Number(limit) || 6)))
    .map((item) => ({ ...compactRecord(item.record), retrievalScore: item.score }));
  if (SAFETY_TERMS.test(query) && !selected.some((record) => record.layer === "safety")) {
    const safety = records.find((record) => record.layer === "safety" && record.status === "approved");
    if (safety) selected.push({ ...compactRecord(safety), retrievalScore: 1 });
  }
  const layers = [...new Set(selected.map((record) => record.layer))];
  return {
    summary: `${selected.length} approved landscaping knowledge record${selected.length === 1 ? "" : "s"} retrieved from ${layers.join(", ") || "no"} layer${layers.length === 1 ? "" : "s"}.`,
    records: selected,
    citations: selected.map((record) => ({ recordType: "knowledge", recordId: record.id, displayId: record.id, title: record.title, route: "#groundskeeper-ai" })),
    calculation: { retrievedCount: selected.length, availableApprovedRecords: records.filter((record) => record.status === "approved").length },
    contextBoundaries: {
      generalAndRegionalKnowledge: true,
      companyPolicy: selected.some((record) => record.layer === "company"),
      customerOrPropertyMemory: false,
      ticketContext: false,
      safetyReview: selected.some((record) => record.layer === "safety")
    },
    partial: selected.length === 0
  };
}

function landscapingKnowledgeCatalog() {
  return records.map((record) => ({
    id: record.id, title: record.title, layer: record.layer, category: record.category,
    status: record.status, confidenceLevel: record.confidenceLevel, version: record.version,
    lastReviewedDate: record.lastReviewedDate, reviewFrequencyDays: record.reviewFrequencyDays,
    summary: record.summary
  }));
}

module.exports = { LANDSCAPING_TERMS, SAFETY_TERMS, landscapingIntent, landscapingKnowledgeCatalog, retrieveLandscapingKnowledge, scoreRecord };
