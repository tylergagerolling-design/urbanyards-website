"use strict";

const ASSISTANT_INTENTS = Object.freeze([
  "question", "record_search", "summary", "analysis", "comparison",
  "recommendation", "report", "navigation", "planning", "simulation",
  "create_action", "update_action", "schedule_action", "financial_action",
  "document_action", "automation_request", "ambiguous",
  "landscaping_question", "plant_identification", "diagnostic_request",
  "irrigation_troubleshooting", "drainage_troubleshooting", "property_inspection",
  "estimate_request", "material_calculation", "labor_calculation", "field_guidance",
  "safety_question", "licensing_question", "photo_review", "memory_request",
  "search_records", "retrieve_record_details", "summarize_information", "navigate",
  "filter_and_navigate", "dashboard_question", "general_question", "clarification_needed",
  "search_internal", "search_external", "search_internal_and_external",
  "retrieve_internal_record", "research_entity", "compare_sources", "summarize_research"
]);

const RECORD_TYPES = Object.freeze([
  "ticket", "job", "visit", "client", "contact", "property", "lead",
  "quote", "invoice", "expense", "worker", "document", "equipment",
  "schedule", "report", "payment", "call_queue", "work_note", "photo", "form", "activity"
]);

function recordReference(input = {}) {
  return {
    recordType: String(input.recordType || "record"),
    recordId: String(input.recordId || ""),
    displayId: input.displayId ? String(input.displayId) : undefined,
    title: String(input.title || input.displayId || "Record"),
    route: input.route ? String(input.route) : undefined
  };
}

module.exports = { ASSISTANT_INTENTS, RECORD_TYPES, recordReference };
