"use strict";

const MATERIAL_DENSITY = Object.freeze({
  mulch: { unit: "cubic yards", contingencyPercent: 10 },
  soil: { unit: "cubic yards", contingencyPercent: 10 },
  gravel: { unit: "cubic yards", contingencyPercent: 12 }
});

function numberFrom(query, patterns) {
  for (const pattern of patterns) {
    const match = String(query || "").match(pattern);
    if (match) return Number(match[1]);
  }
  return null;
}

function materialFrom(query, requested = "") {
  const value = `${requested} ${query}`.toLowerCase();
  return ["mulch", "soil", "gravel"].find((material) => value.includes(material)) || "";
}

function calculateLandscapeMaterial({ query = "", material = "", areaSquareFeet, depthInches, contingencyPercent } = {}) {
  const selectedMaterial = materialFrom(query, material);
  const area = Number(areaSquareFeet) || numberFrom(query, [
    /(\d+(?:\.\d+)?)\s*(?:square\s*(?:feet|foot)|sq\.?\s*ft|ft²)/i,
    /(?:area|bed)\s*(?:is|=|of)?\s*(\d+(?:\.\d+)?)/i
  ]);
  const depth = Number(depthInches) || numberFrom(query, [
    /(\d+(?:\.\d+)?)\s*(?:inches|inch|in\.?)(?:\s+deep|\s+depth)?/i,
    /depth\s*(?:is|=|of)?\s*(\d+(?:\.\d+)?)/i
  ]);
  const missingInformation = [];
  if (!selectedMaterial) missingInformation.push("Material type: mulch, soil, or gravel");
  if (!(area > 0)) missingInformation.push("Measured area in square feet");
  if (!(depth > 0)) missingInformation.push("Desired finished depth in inches");
  if (missingInformation.length) {
    return {
      summary: "The material quantity cannot be calculated until the missing measurements are supplied.",
      inputs: { material: selectedMaterial || null, areaSquareFeet: area || null, depthInches: depth || null },
      assumptions: [],
      formula: "cubic yards = square feet × (depth inches ÷ 12) ÷ 27",
      result: null,
      contingency: null,
      missingInformation,
      confidence: "insufficient_information",
      records: [],
      citations: [],
      partial: true
    };
  }
  const defaults = MATERIAL_DENSITY[selectedMaterial];
  const contingency = Number.isFinite(Number(contingencyPercent))
    ? Math.max(0, Math.min(30, Number(contingencyPercent)))
    : defaults.contingencyPercent;
  const baseCubicYards = area * (depth / 12) / 27;
  const recommendedCubicYards = baseCubicYards * (1 + contingency / 100);
  return {
    summary: `${recommendedCubicYards.toFixed(2)} cubic yards of ${selectedMaterial} including ${contingency}% contingency.`,
    inputs: { material: selectedMaterial, areaSquareFeet: area, depthInches: depth },
    units: { area: "square feet", depth: "inches", result: defaults.unit },
    assumptions: ["Area and depth were supplied by the user; no site dimensions or prices were inferred."],
    formula: `${area} × (${depth} ÷ 12) ÷ 27`,
    result: { baseCubicYards: Number(baseCubicYards.toFixed(3)), recommendedCubicYards: Number(recommendedCubicYards.toFixed(3)) },
    contingency: { percent: contingency, reason: "Planning allowance; confirm material-specific ordering and compaction requirements." },
    missingInformation: [],
    confidence: "verified",
    calculation: { baseCubicYards, recommendedCubicYards, contingencyPercent: contingency },
    records: [],
    citations: [],
    partial: false
  };
}

module.exports = { MATERIAL_DENSITY, calculateLandscapeMaterial };
