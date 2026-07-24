"use strict";

const ASSISTANT_INTENTS = Object.freeze([
  "question", "record_search", "summary", "analysis", "comparison",
  "recommendation", "report", "navigation", "planning", "simulation",
  "create_action", "update_action", "schedule_action", "financial_action",
  "document_action", "automation_request", "ambiguous"
]);

const RECORD_TYPES = Object.freeze([
  "ticket", "job", "visit", "client", "contact", "property", "lead",
  "quote", "invoice", "expense", "worker", "document", "equipment",
  "schedule", "report"
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
