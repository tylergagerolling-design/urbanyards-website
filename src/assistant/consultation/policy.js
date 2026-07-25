"use strict";

const CONSULTATION_MODES = new Set(["off", "auto", "always_review"]);
const TRIVIAL = /\b(hello|hi|thanks|thank you|open|go to|navigate|show page|which tab|where is|sign out)\b/i;
const MATERIAL = /\b(financial|budget|profit|margin|cost|estimate|calculate|compare|options|plan|risk|review|recommend|strategy|debug|complex|multi(?:ple)?|client (?:email|message|communication)|large summary|double[- ]check|second opinion|consult gemini|plant identification|plant health|irrigation|drainage|unusual site|safety|hazard|licens|customer dispute|low confidence)\b/i;

function normalizeMode(value) {
  const mode = String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
  return CONSULTATION_MODES.has(mode) ? mode : "auto";
}

function explicitConsultation(message, request = {}) {
  return request.manual === true
    || request.doubleCheck === true
    || /\b(consult gemini|ask gemini|double[- ]check|second opinion|review (?:that|this) answer)\b/i.test(String(message || ""));
}

function consultantRoleFor(message) {
  const value = String(message || "");
  if (/\b(license|permit|regulated|backflow)\b/i.test(value)) return "licensing_reviewer";
  if (/\b(safety|hazard|danger|power line|chemical|tree risk)\b/i.test(value)) return "safety_reviewer";
  if (/\b(irrigation|sprinkler|zone|water pressure)\b/i.test(value)) return "irrigation_consultant";
  if (/\b(drainage|standing water|ponding|runoff|erosion)\b/i.test(value)) return "drainage_consultant";
  if (/\b(turf|lawn|moss|grass|mow)\b/i.test(value)) return "turf_consultant";
  if (/\b(plant|shrub|tree|leaf|wilt|horticultur)\b/i.test(value)) return "horticulture_consultant";
  if (/\b(estimate|quote|cost|margin|labor|material)\b/i.test(value)) return "estimating_reviewer";
  if (/\b(customer|tenant|property|operations|inspection)\b/i.test(value)) return "property_operations_reviewer";
  return "critical_reviewer";
}

function consultationDecision({ message, mode = "auto", enabled = true, emergencyStop = false, manual = false, doubleCheck = false } = {}) {
  const normalizedMode = normalizeMode(mode);
  const explicit = explicitConsultation(message, { manual, doubleCheck });
  const consultantRole = consultantRoleFor(message);
  if (emergencyStop) return { consult: false, reason: "emergency_stop", explicit, consultantRole };
  if (!enabled && !explicit) return { consult: false, reason: "disabled", explicit, consultantRole };
  if (explicit) return { consult: true, reason: doubleCheck ? "double_check" : "manual_request", explicit: true, consultantRole };
  if (normalizedMode === "off") return { consult: false, reason: "mode_off", explicit: false, consultantRole };
  if (TRIVIAL.test(String(message || "")) && !MATERIAL.test(String(message || ""))) {
    return { consult: false, reason: "trivial_request", explicit: false, consultantRole };
  }
  if (normalizedMode === "always_review") {
    return { consult: String(message || "").trim().length >= 30, reason: "always_review", explicit: false, consultantRole };
  }
  return MATERIAL.test(String(message || ""))
    ? { consult: true, reason: "auto_material_request", explicit: false, consultantRole }
    : { consult: false, reason: "auto_not_needed", explicit: false, consultantRole };
}

module.exports = { CONSULTATION_MODES, consultationDecision, consultantRoleFor, explicitConsultation, normalizeMode };
