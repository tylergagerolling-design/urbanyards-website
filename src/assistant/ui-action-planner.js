"use strict";

const ALLOWED_ROUTES = new Set([
  "overview", "tickets", "calendar", "route-planner", "outreach", "call-queue",
  "documents", "contacts", "equipment", "documentation", "import-export",
  "groundskeeper-ai", "ai-memory", "settings"
]);
const ALLOWED_RECORD_TYPES = new Set(["ticket", "job", "client", "contact", "property", "lead", "invoice", "expense", "document"]);
const ALLOWED_ACTION_TYPES = new Set(["navigate", "open_record", "apply_filters", "highlight_records", "scroll_to", "switch_tab"]);

function navigationRoute(message) {
  const value = String(message || "").toLowerCase();
  const routes = [
    [/\b(memory|saved rules?|preferences?)\b/, "ai-memory"],
    [/\b(invoice|financial|money|report)s?\b/, "documents"],
    [/\b(call queue)\b/, "call-queue"],
    [/\b(lead|prospect|outreach)s?\b/, "outreach"],
    [/\b(schedule|calendar|next week|today'?s schedule)\b/, "calendar"],
    [/\b(route planner|route)\b/, "route-planner"],
    [/\b(kanban|ticket|job)s?\b/, "tickets"],
    [/\b(client|contact)s?\b/, "contacts"],
    [/\b(equipment|tools?)\b/, "equipment"],
    [/\b(documentation|forms?)\b/, "documentation"],
    [/\b(settings?)\b/, "settings"],
    [/\b(home|overview)\b/, "overview"]
  ];
  return routes.find(([pattern]) => pattern.test(value))?.[1] || "";
}

function planUIActions({ message, routing, resolvedEntity, citations = [] }) {
  const value = String(message || "");
  const command = /\b(open|show|pull up|take me|go to|filter|highlight|switch|view)\b/i.test(value);
  if (!command) return [];
  const actions = [];
  const route = navigationRoute(value);
  if (route) actions.push({ type: "navigate", route });
  if (resolvedEntity && /\b(open|pull up|show)\b/i.test(value)) {
    actions.push({
      type: "open_record",
      recordType: resolvedEntity.recordType,
      recordId: resolvedEntity.recordId,
      presentation: "side_panel"
    });
  }
  const filters = {};
  if (route === "documents" && /\binvoices?\b/i.test(value)) filters.moneyView = "invoicing";
  if (route === "documents" && /\breports?\b/i.test(value)) filters.moneyView = "reports";
  if (route === "calendar" && /\bnext week\b/i.test(value)) filters.dateRange = "next_week";
  if (route === "calendar" && /\btoday\b/i.test(value)) filters.dateRange = "today";
  if (/\boverdue\b/i.test(value)) filters.status = "overdue";
  if (/\bmissing completion photos?\b/i.test(value)) filters.missingRequirement = "completion_photos";
  if (/\bmissing forms?\b/i.test(value)) filters.missingRequirement = "forms";
  if (/\bunassigned|without assigned workers?\b/i.test(value)) filters.assignment = "unassigned";
  const quotedClient = value.match(/\b(?:show|filter)\s+(?:me\s+)?(?:all\s+)?(.+?)\s+(?:jobs?|tickets?)\b/i)?.[1];
  if (quotedClient) filters.client = quotedClient.trim();
  if (Object.keys(filters).length) actions.push({ type: "apply_filters", page: route || "tickets", filters });
  if (/\bhighlight\b/i.test(value) || Object.keys(filters).length) {
    const ids = citations.map((citation) => citation.recordId).filter(Boolean).slice(0, 50);
    if (ids.length) actions.push({ type: "highlight_records", recordIds: ids });
  }
  return actions.filter(validateUIAction);
}

function validateUIAction(action) {
  if (!action || !ALLOWED_ACTION_TYPES.has(action.type)) return false;
  if (action.type === "navigate") return ALLOWED_ROUTES.has(action.route);
  if (action.type === "open_record") {
    return ALLOWED_RECORD_TYPES.has(action.recordType)
      && Boolean(String(action.recordId || "").trim())
      && ["page", "side_panel", "modal"].includes(action.presentation);
  }
  if (action.type === "apply_filters") return ALLOWED_ROUTES.has(action.page) && action.filters && typeof action.filters === "object" && !Array.isArray(action.filters);
  if (action.type === "highlight_records") return Array.isArray(action.recordIds) && action.recordIds.length <= 50;
  if (action.type === "scroll_to") return Boolean(String(action.targetId || "").match(/^[a-zA-Z0-9_-]{1,100}$/));
  if (action.type === "switch_tab") return Boolean(String(action.tabId || "").match(/^[a-zA-Z0-9_-]{1,100}$/));
  return false;
}

module.exports = { ALLOWED_ACTION_TYPES, ALLOWED_RECORD_TYPES, ALLOWED_ROUTES, navigationRoute, planUIActions, validateUIAction };
