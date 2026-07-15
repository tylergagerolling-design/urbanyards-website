"use strict";

const { TICKET_STAGES, TICKET_STAGE_LABELS } = require("../types/ticket-stage");

const TICKET_STAGE_META = Object.freeze({
  [TICKET_STAGES.DRAFT]: { tone: "new", lane: "sales", owner: "Leads" },
  [TICKET_STAGES.SALES_INTAKE]: { tone: "new", lane: "sales", owner: "Leads" },
  [TICKET_STAGES.SCOPE_IN_PROGRESS]: { tone: "new", lane: "sales", owner: "Leads" },
  [TICKET_STAGES.QUOTE_PENDING]: { tone: "new", lane: "sales", owner: "Leads" },
  [TICKET_STAGES.CUSTOMER_APPROVAL_PENDING]: { tone: "watch", lane: "sales", owner: "Leads" },
  [TICKET_STAGES.NEEDS_BUDGET]: { tone: "watch", lane: "accounting", owner: "Money" },
  [TICKET_STAGES.BUDGET_IN_PROGRESS]: { tone: "watch", lane: "accounting", owner: "Money" },
  [TICKET_STAGES.NEEDS_OWNER_APPROVAL]: { tone: "risk", lane: "accounting", owner: "Owner" },
  [TICKET_STAGES.INVOICE_PREPARATION]: { tone: "watch", lane: "accounting", owner: "Money" },
  [TICKET_STAGES.READY_TO_SCHEDULE]: { tone: "ready", lane: "ready", owner: "Work" },
  [TICKET_STAGES.SCHEDULED]: { tone: "field", lane: "field", owner: "Work" },
  [TICKET_STAGES.IN_PROGRESS]: { tone: "field", lane: "field", owner: "Work" },
  [TICKET_STAGES.PAUSED]: { tone: "risk", lane: "field", owner: "Work" },
  [TICKET_STAGES.SCOPE_CHANGE_REQUESTED]: { tone: "risk", lane: "sales", owner: "Leads" },
  [TICKET_STAGES.FIELD_WORK_COMPLETE]: { tone: "review", lane: "review", owner: "Owner" },
  [TICKET_STAGES.COMPLETION_REVIEW]: { tone: "review", lane: "review", owner: "Owner" },
  [TICKET_STAGES.INVOICE_REVIEW]: { tone: "review", lane: "accounting", owner: "Money" },
  [TICKET_STAGES.INVOICE_SENT]: { tone: "money", lane: "money", owner: "Money" },
  [TICKET_STAGES.PARTIALLY_PAID]: { tone: "money", lane: "money", owner: "Money" },
  [TICKET_STAGES.PAID]: { tone: "done", lane: "money", owner: "Owner" },
  [TICKET_STAGES.CLOSED]: { tone: "done", lane: "closed", owner: "Owner" },
  [TICKET_STAGES.CANCELLED]: { tone: "muted", lane: "closed", owner: "Owner" }
});

const TICKET_OWNER_GROUPS = Object.freeze([
  {
    id: "sales",
    label: "Leads",
    detail: "Intake, scope, quote, and customer approval.",
    stages: Object.freeze([
      TICKET_STAGES.DRAFT,
      TICKET_STAGES.SALES_INTAKE,
      TICKET_STAGES.SCOPE_IN_PROGRESS,
      TICKET_STAGES.QUOTE_PENDING,
      TICKET_STAGES.CUSTOMER_APPROVAL_PENDING,
      TICKET_STAGES.SCOPE_CHANGE_REQUESTED
    ])
  },
  {
    id: "accounting",
    label: "Money",
    detail: "Cost review, owner approval, invoice prep, payment, and closeout.",
    stages: Object.freeze([
      TICKET_STAGES.NEEDS_BUDGET,
      TICKET_STAGES.BUDGET_IN_PROGRESS,
      TICKET_STAGES.NEEDS_OWNER_APPROVAL,
      TICKET_STAGES.INVOICE_PREPARATION,
      TICKET_STAGES.INVOICE_REVIEW,
      TICKET_STAGES.INVOICE_SENT,
      TICKET_STAGES.PARTIALLY_PAID,
      TICKET_STAGES.PAID
    ])
  },
  {
    id: "ready",
    label: "Ready",
    detail: "Approved tickets that can move into schedule, route planning, and work assignment.",
    stages: Object.freeze([
      TICKET_STAGES.READY_TO_SCHEDULE
    ])
  },
  {
    id: "field",
    label: "Work",
    detail: "Scheduling, route, arrival proof, work updates, photos, and completion notes.",
    stages: Object.freeze([
      TICKET_STAGES.SCHEDULED,
      TICKET_STAGES.IN_PROGRESS,
      TICKET_STAGES.PAUSED
    ])
  },
  {
    id: "review",
    label: "Owner Review",
    detail: "Completion proof, actuals, missing documents, and final approval.",
    stages: Object.freeze([
      TICKET_STAGES.FIELD_WORK_COMPLETE,
      TICKET_STAGES.COMPLETION_REVIEW
    ])
  }
]);

function compactValue(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function normalizeTicketStage(value, fallback = TICKET_STAGES.SALES_INTAKE) {
  const compact = compactValue(value);
  if (TICKET_STAGE_META[compact]) return compact;
  if (/cost.*progress|review.*progress|budget.*progress/.test(compact)) return TICKET_STAGES.BUDGET_IN_PROGRESS;
  if (/cost|budget/.test(compact)) return TICKET_STAGES.NEEDS_BUDGET;
  if (/owner.*approval/.test(compact)) return TICKET_STAGES.NEEDS_OWNER_APPROVAL;
  if (/invoice.*sent/.test(compact)) return TICKET_STAGES.INVOICE_SENT;
  if (/invoice|billing/.test(compact)) return TICKET_STAGES.INVOICE_REVIEW;
  if (/ready.*schedule/.test(compact)) return TICKET_STAGES.READY_TO_SCHEDULE;
  if (/complete|done/.test(compact)) return TICKET_STAGES.FIELD_WORK_COMPLETE;
  if (/progress|started|active/.test(compact)) return TICKET_STAGES.IN_PROGRESS;
  if (/cancel|declined|lost/.test(compact)) return TICKET_STAGES.CANCELLED;
  return TICKET_STAGE_META[fallback] ? fallback : TICKET_STAGES.SALES_INTAKE;
}

function getTicketStageMeta(stage) {
  const normalized = normalizeTicketStage(stage);
  return Object.freeze({
    stage: normalized,
    label: TICKET_STAGE_LABELS[normalized] || "Lead Intake",
    ...(TICKET_STAGE_META[normalized] || TICKET_STAGE_META[TICKET_STAGES.SALES_INTAKE])
  });
}

function getTicketNextAction(stage) {
  switch (normalizeTicketStage(stage)) {
    case TICKET_STAGES.DRAFT:
    case TICKET_STAGES.SALES_INTAKE:
      return "Confirm scope";
    case TICKET_STAGES.SCOPE_IN_PROGRESS:
      return "Finish scope";
    case TICKET_STAGES.QUOTE_PENDING:
      return "Prepare quote";
    case TICKET_STAGES.CUSTOMER_APPROVAL_PENDING:
      return "Follow up on approval";
    case TICKET_STAGES.NEEDS_BUDGET:
      return "Review internal costs";
    case TICKET_STAGES.BUDGET_IN_PROGRESS:
      return "Finish cost review";
    case TICKET_STAGES.NEEDS_OWNER_APPROVAL:
      return "Owner approval";
    case TICKET_STAGES.INVOICE_PREPARATION:
      return "Prepare draft invoice";
    case TICKET_STAGES.READY_TO_SCHEDULE:
      return "Schedule work";
    case TICKET_STAGES.SCHEDULED:
      return "Work the visit";
    case TICKET_STAGES.IN_PROGRESS:
      return "Add work update";
    case TICKET_STAGES.PAUSED:
      return "Resolve blocker";
    case TICKET_STAGES.SCOPE_CHANGE_REQUESTED:
      return "Review scope change";
    case TICKET_STAGES.FIELD_WORK_COMPLETE:
      return "Review completion";
    case TICKET_STAGES.COMPLETION_REVIEW:
      return "Check actuals/photos";
    case TICKET_STAGES.INVOICE_REVIEW:
      return "Finalize invoice";
    case TICKET_STAGES.INVOICE_SENT:
    case TICKET_STAGES.PARTIALLY_PAID:
      return "Collect payment";
    case TICKET_STAGES.PAID:
      return "Close ticket";
    default:
      return "Open ticket";
  }
}

function getTicketBlockers(stage) {
  switch (normalizeTicketStage(stage)) {
    case TICKET_STAGES.SALES_INTAKE:
      return ["Scope", "Contact", "Property"];
    case TICKET_STAGES.SCOPE_IN_PROGRESS:
      return ["Scope", "Photos", "Quote"];
    case TICKET_STAGES.QUOTE_PENDING:
      return ["Quote"];
    case TICKET_STAGES.CUSTOMER_APPROVAL_PENDING:
      return ["Customer approval"];
    case TICKET_STAGES.NEEDS_BUDGET:
      return ["Cost review", "Owner approval", "Draft invoice"];
    case TICKET_STAGES.BUDGET_IN_PROGRESS:
      return ["Owner approval", "Draft invoice"];
    case TICKET_STAGES.NEEDS_OWNER_APPROVAL:
      return ["Owner approval"];
    case TICKET_STAGES.INVOICE_PREPARATION:
      return ["Draft invoice"];
    case TICKET_STAGES.READY_TO_SCHEDULE:
      return [];
    case TICKET_STAGES.SCHEDULED:
    case TICKET_STAGES.IN_PROGRESS:
      return ["Arrival photos", "Completion photos", "Forms"];
    case TICKET_STAGES.FIELD_WORK_COMPLETE:
    case TICKET_STAGES.COMPLETION_REVIEW:
      return ["Actuals", "Photos", "Invoice review"];
    case TICKET_STAGES.INVOICE_REVIEW:
      return ["Invoice approval"];
    case TICKET_STAGES.INVOICE_SENT:
    case TICKET_STAGES.PARTIALLY_PAID:
      return ["Payment"];
    default:
      return [];
  }
}

function normalizeTicketSourceType(value) {
  const compact = compactValue(value);
  if (/quote|submission|lead/.test(compact)) return "quote";
  if (/job|visit|schedule/.test(compact)) return "job";
  if (/invoice|estimate|document/.test(compact)) return "document";
  return "ticket";
}

function ticketSourceKey(ticket = {}) {
  const source = ticket.sourceType || ticket.source || "ticket";
  const id = ticket.sourceId || ticket.id || "";
  return `${source}:${id}`;
}

function mergeCanonicalTickets(canonicalTickets = [], fallbackTickets = []) {
  const canonical = canonicalTickets.filter((ticket) => ticket && ticket.id);
  if (!canonical.length) {
    return [...fallbackTickets].sort(sortTicketsByDate);
  }
  const canonicalSourceKeys = new Set(canonical.map(ticketSourceKey).filter((key) => !key.endsWith(":")));
  const unmatchedFallbacks = fallbackTickets.filter((ticket) => !canonicalSourceKeys.has(ticketSourceKey(ticket)));
  return [...canonical, ...unmatchedFallbacks].sort(sortTicketsByDate);
}

function sortTicketsByDate(a, b) {
  return String(a?.dateRaw || "").localeCompare(String(b?.dateRaw || ""));
}

module.exports = {
  TICKET_STAGE_META,
  TICKET_OWNER_GROUPS,
  normalizeTicketStage,
  getTicketStageMeta,
  getTicketNextAction,
  getTicketBlockers,
  normalizeTicketSourceType,
  ticketSourceKey,
  mergeCanonicalTickets
};
