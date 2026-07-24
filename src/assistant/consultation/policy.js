"use strict";

const CONSULTATION_MODES = new Set(["off", "auto", "always_review"]);
const TRIVIAL = /\b(hello|hi|thanks|thank you|open|go to|navigate|show page|which tab|where is|sign out)\b/i;
const MATERIAL = /\b(financial|budget|profit|margin|cost|estimate|calculate|compare|options|plan|risk|review|recommend|strategy|debug|complex|multi(?:ple)?|client (?:email|message|communication)|large summary|double[- ]check|second opinion|consult gemini)\b/i;

function normalizeMode(value) {
  const mode = String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
  return CONSULTATION_MODES.has(mode) ? mode : "auto";
}

function explicitConsultation(message, request = {}) {
  return request.manual === true
    || request.doubleCheck === true
    || /\b(consult gemini|ask gemini|double[- ]check|second opinion|review (?:that|this) answer)\b/i.test(String(message || ""));
}

function consultationDecision({ message, mode = "auto", enabled = true, emergencyStop = false, manual = false, doubleCheck = false } = {}) {
  const normalizedMode = normalizeMode(mode);
  const explicit = explicitConsultation(message, { manual, doubleCheck });
  if (emergencyStop) return { consult: false, reason: "emergency_stop", explicit };
  if (!enabled && !explicit) return { consult: false, reason: "disabled", explicit };
  if (explicit) return { consult: true, reason: doubleCheck ? "double_check" : "manual_request", explicit: true };
  if (normalizedMode === "off") return { consult: false, reason: "mode_off", explicit: false };
  if (TRIVIAL.test(String(message || "")) && !MATERIAL.test(String(message || ""))) {
    return { consult: false, reason: "trivial_request", explicit: false };
  }
  if (normalizedMode === "always_review") {
    return { consult: String(message || "").trim().length >= 30, reason: "always_review", explicit: false };
  }
  return MATERIAL.test(String(message || ""))
    ? { consult: true, reason: "auto_material_request", explicit: false }
    : { consult: false, reason: "auto_not_needed", explicit: false };
}

module.exports = { CONSULTATION_MODES, consultationDecision, explicitConsultation, normalizeMode };
