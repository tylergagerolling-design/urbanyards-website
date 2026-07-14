"use strict";

const { PERMISSIONS, ROLES, hasPermission } = require("../../../shared/permissions/permissions");
const { TICKET_STAGES } = require("../types/ticket-stage");

const COST_REVIEW_ACCESS = Object.freeze({
  edit: [ROLES.OWNER, ROLES.ACCOUNTANT],
  view: [ROLES.OWNER, ROLES.ACCOUNTANT]
});

const RESPONSIBLE_ROLE_BY_STAGE = Object.freeze({
  [TICKET_STAGES.DRAFT]: ROLES.SALES_OUTREACH,
  [TICKET_STAGES.SALES_INTAKE]: ROLES.SALES_OUTREACH,
  [TICKET_STAGES.SCOPE_IN_PROGRESS]: ROLES.SALES_OUTREACH,
  [TICKET_STAGES.QUOTE_PENDING]: ROLES.SALES_OUTREACH,
  [TICKET_STAGES.CUSTOMER_APPROVAL_PENDING]: ROLES.SALES_OUTREACH,
  [TICKET_STAGES.NEEDS_BUDGET]: ROLES.ACCOUNTANT,
  [TICKET_STAGES.BUDGET_IN_PROGRESS]: ROLES.ACCOUNTANT,
  [TICKET_STAGES.NEEDS_OWNER_APPROVAL]: ROLES.OWNER,
  [TICKET_STAGES.INVOICE_PREPARATION]: ROLES.ACCOUNTANT,
  [TICKET_STAGES.READY_TO_SCHEDULE]: ROLES.OWNER,
  [TICKET_STAGES.SCHEDULED]: ROLES.FIELD_WORKER,
  [TICKET_STAGES.IN_PROGRESS]: ROLES.FIELD_WORKER,
  [TICKET_STAGES.PAUSED]: ROLES.FIELD_WORKER,
  [TICKET_STAGES.SCOPE_CHANGE_REQUESTED]: ROLES.OWNER,
  [TICKET_STAGES.FIELD_WORK_COMPLETE]: ROLES.ACCOUNTANT,
  [TICKET_STAGES.COMPLETION_REVIEW]: ROLES.ACCOUNTANT,
  [TICKET_STAGES.INVOICE_REVIEW]: ROLES.ACCOUNTANT,
  [TICKET_STAGES.INVOICE_SENT]: ROLES.ACCOUNTANT,
  [TICKET_STAGES.PARTIALLY_PAID]: ROLES.ACCOUNTANT,
  [TICKET_STAGES.PAID]: ROLES.ACCOUNTANT,
  [TICKET_STAGES.CLOSED]: ROLES.OWNER,
  [TICKET_STAGES.CANCELLED]: ROLES.OWNER
});

const SECTION_ACCESS = Object.freeze({
  sales: {
    edit: [ROLES.OWNER, ROLES.SALES_OUTREACH],
    view: [ROLES.OWNER, ROLES.SALES_OUTREACH, ROLES.ACCOUNTANT, ROLES.FIELD_WORKER]
  },
  scope: {
    edit: [ROLES.OWNER, ROLES.SALES_OUTREACH],
    view: [ROLES.OWNER, ROLES.SALES_OUTREACH, ROLES.ACCOUNTANT, ROLES.FIELD_WORKER]
  },
  costReview: COST_REVIEW_ACCESS,
  budget: COST_REVIEW_ACCESS,
  ownerApproval: {
    edit: [ROLES.OWNER],
    view: [ROLES.OWNER, ROLES.ACCOUNTANT]
  },
  draftInvoice: {
    edit: [ROLES.OWNER, ROLES.ACCOUNTANT],
    view: [ROLES.OWNER, ROLES.ACCOUNTANT]
  },
  scheduling: {
    edit: [ROLES.OWNER],
    view: [ROLES.OWNER, ROLES.ACCOUNTANT, ROLES.FIELD_WORKER]
  },
  fieldWork: {
    edit: [ROLES.FIELD_WORKER],
    view: [ROLES.OWNER, ROLES.ACCOUNTANT, ROLES.FIELD_WORKER]
  },
  payments: {
    edit: [ROLES.OWNER, ROLES.ACCOUNTANT],
    view: [ROLES.OWNER, ROLES.ACCOUNTANT]
  },
  audit: {
    edit: [],
    view: [ROLES.OWNER, ROLES.ACCOUNTANT]
  }
});

const TRANSITIONS = Object.freeze({
  [TICKET_STAGES.DRAFT]: [
    transition(TICKET_STAGES.SALES_INTAKE, PERMISSIONS.TICKETS_CREATE, "ticket_created")
  ],
  [TICKET_STAGES.SALES_INTAKE]: [
    transition(TICKET_STAGES.SCOPE_IN_PROGRESS, PERMISSIONS.TICKETS_EDIT_SALES, "ticket_scope_started"),
    transition(TICKET_STAGES.CANCELLED, PERMISSIONS.TICKETS_CANCEL, "ticket_cancelled")
  ],
  [TICKET_STAGES.SCOPE_IN_PROGRESS]: [
    transition(TICKET_STAGES.QUOTE_PENDING, PERMISSIONS.QUOTES_CREATE, "quote_created"),
    transition(TICKET_STAGES.CANCELLED, PERMISSIONS.TICKETS_CANCEL, "ticket_cancelled")
  ],
  [TICKET_STAGES.QUOTE_PENDING]: [
    transition(TICKET_STAGES.CUSTOMER_APPROVAL_PENDING, PERMISSIONS.QUOTES_EDIT, "quote_sent_for_approval"),
    transition(TICKET_STAGES.SCOPE_IN_PROGRESS, PERMISSIONS.TICKETS_EDIT_SCOPE, "ticket_returned_to_scope")
  ],
  [TICKET_STAGES.CUSTOMER_APPROVAL_PENDING]: [
    transition(TICKET_STAGES.NEEDS_BUDGET, PERMISSIONS.QUOTES_APPROVE, "customer_approval_recorded"),
    transition(TICKET_STAGES.SCOPE_IN_PROGRESS, PERMISSIONS.TICKETS_EDIT_SCOPE, "ticket_returned_to_scope")
  ],
  [TICKET_STAGES.NEEDS_BUDGET]: [
    transition(TICKET_STAGES.BUDGET_IN_PROGRESS, PERMISSIONS.COST_REVIEW_CREATE, "cost_review_started"),
    transition(TICKET_STAGES.SCOPE_IN_PROGRESS, PERMISSIONS.COST_REVIEW_EDIT, "ticket_returned_to_sales")
  ],
  [TICKET_STAGES.BUDGET_IN_PROGRESS]: [
    transition(TICKET_STAGES.NEEDS_OWNER_APPROVAL, PERMISSIONS.COST_REVIEW_EDIT, "cost_review_submitted_to_owner"),
    transition(TICKET_STAGES.SCOPE_IN_PROGRESS, PERMISSIONS.COST_REVIEW_EDIT, "ticket_returned_to_sales")
  ],
  [TICKET_STAGES.NEEDS_OWNER_APPROVAL]: [
    transition(TICKET_STAGES.INVOICE_PREPARATION, PERMISSIONS.TICKETS_APPROVE_OWNER, "owner_approved"),
    transition(TICKET_STAGES.BUDGET_IN_PROGRESS, PERMISSIONS.TICKETS_APPROVE_OWNER, "owner_returned_to_accounting"),
    transition(TICKET_STAGES.SCOPE_IN_PROGRESS, PERMISSIONS.TICKETS_APPROVE_OWNER, "owner_returned_to_sales"),
    transition(TICKET_STAGES.CANCELLED, PERMISSIONS.TICKETS_CANCEL, "ticket_cancelled")
  ],
  [TICKET_STAGES.INVOICE_PREPARATION]: [
    transition(TICKET_STAGES.READY_TO_SCHEDULE, PERMISSIONS.INVOICES_CREATE, "draft_invoice_created"),
    transition(TICKET_STAGES.NEEDS_OWNER_APPROVAL, PERMISSIONS.INVOICES_CREATE, "invoice_returned_for_approval")
  ],
  [TICKET_STAGES.READY_TO_SCHEDULE]: [
    transition(TICKET_STAGES.SCHEDULED, PERMISSIONS.TICKETS_ASSIGN, "ticket_scheduled")
  ],
  [TICKET_STAGES.SCHEDULED]: [
    transition(TICKET_STAGES.IN_PROGRESS, PERMISSIONS.TICKETS_START_FIELD_WORK, "work_started"),
    transition(TICKET_STAGES.SCOPE_CHANGE_REQUESTED, PERMISSIONS.TICKETS_REQUEST_SCOPE_CHANGE, "scope_change_requested"),
    transition(TICKET_STAGES.CANCELLED, PERMISSIONS.TICKETS_CANCEL, "ticket_cancelled")
  ],
  [TICKET_STAGES.IN_PROGRESS]: [
    transition(TICKET_STAGES.PAUSED, PERMISSIONS.TICKETS_PAUSE_FIELD_WORK, "work_paused"),
    transition(TICKET_STAGES.SCOPE_CHANGE_REQUESTED, PERMISSIONS.TICKETS_REQUEST_SCOPE_CHANGE, "scope_change_requested"),
    transition(TICKET_STAGES.FIELD_WORK_COMPLETE, PERMISSIONS.TICKETS_COMPLETE_FIELD_WORK, "field_work_completed")
  ],
  [TICKET_STAGES.PAUSED]: [
    transition(TICKET_STAGES.IN_PROGRESS, PERMISSIONS.TICKETS_START_FIELD_WORK, "work_resumed"),
    transition(TICKET_STAGES.SCOPE_CHANGE_REQUESTED, PERMISSIONS.TICKETS_REQUEST_SCOPE_CHANGE, "scope_change_requested")
  ],
  [TICKET_STAGES.SCOPE_CHANGE_REQUESTED]: [
    transition(TICKET_STAGES.IN_PROGRESS, PERMISSIONS.TICKETS_APPROVE_OWNER, "scope_change_approved"),
    transition(TICKET_STAGES.BUDGET_IN_PROGRESS, PERMISSIONS.TICKETS_APPROVE_OWNER, "scope_change_requires_cost_review"),
    transition(TICKET_STAGES.SCOPE_IN_PROGRESS, PERMISSIONS.TICKETS_APPROVE_OWNER, "scope_change_returned_to_sales")
  ],
  [TICKET_STAGES.FIELD_WORK_COMPLETE]: [
    transition(TICKET_STAGES.COMPLETION_REVIEW, PERMISSIONS.FINANCIALS_VIEW, "completion_review_started")
  ],
  [TICKET_STAGES.COMPLETION_REVIEW]: [
    transition(TICKET_STAGES.INVOICE_REVIEW, PERMISSIONS.FINANCIALS_VIEW, "actuals_reviewed")
  ],
  [TICKET_STAGES.INVOICE_REVIEW]: [
    transition(TICKET_STAGES.INVOICE_SENT, PERMISSIONS.INVOICES_EDIT, "invoice_finalized")
  ],
  [TICKET_STAGES.INVOICE_SENT]: [
    transition(TICKET_STAGES.PARTIALLY_PAID, PERMISSIONS.PAYMENTS_RECORD, "partial_payment_recorded"),
    transition(TICKET_STAGES.PAID, PERMISSIONS.PAYMENTS_RECORD, "payment_recorded")
  ],
  [TICKET_STAGES.PARTIALLY_PAID]: [
    transition(TICKET_STAGES.PAID, PERMISSIONS.PAYMENTS_RECORD, "payment_recorded")
  ],
  [TICKET_STAGES.PAID]: [
    transition(TICKET_STAGES.CLOSED, PERMISSIONS.PAYMENTS_RECORD, "ticket_closed")
  ],
  [TICKET_STAGES.CLOSED]: [],
  [TICKET_STAGES.CANCELLED]: []
});

function transition(to, permission, auditEvent) {
  return {
    to,
    permission,
    auditEvent,
    notificationEvent: auditEvent
  };
}

function normalizeTicketStage(stage) {
  const value = String(stage || "").trim().toLowerCase();
  return Object.values(TICKET_STAGES).includes(value) ? value : "";
}

function getRequiredFieldsForStage(stage) {
  switch (normalizeTicketStage(stage)) {
    case TICKET_STAGES.NEEDS_BUDGET:
      return ["customerId", "propertyId", "primaryContact", "requestedService", "scopeOfWork", "proposedPrice", "customerApprovalRecorded"];
    case TICKET_STAGES.NEEDS_OWNER_APPROVAL:
      return ["costReviewComplete", "expectedRevenue", "estimatedTotalCost", "estimatedProfit", "targetMargin"];
    case TICKET_STAGES.READY_TO_SCHEDULE:
      return ["scopeComplete", "customerApprovalRecorded", "costReviewComplete", "ownerApprovalRecorded", "draftInvoiceExists"];
    case TICKET_STAGES.SCHEDULED:
      return ["scheduledDate", "assignedUserId"];
    case TICKET_STAGES.FIELD_WORK_COMPLETE:
      return ["beforePhotosUploaded", "afterPhotosUploaded", "fieldCompletionNotes"];
    case TICKET_STAGES.CLOSED:
      return ["invoiceFinalized", "paymentStatus"];
    default:
      return [];
  }
}

function getMissingRequirements(ticket = {}, toStage) {
  const required = getRequiredFieldsForStage(toStage);
  const missing = required.filter((field) => {
    if (field === "paymentStatus") return ticket.paymentStatus !== "paid";
    if (field === "costReviewComplete") return !ticket.costReviewComplete && !ticket.budgetComplete;
    return ticket[field] === undefined || ticket[field] === null || ticket[field] === "" || ticket[field] === false;
  });

  if (normalizeTicketStage(toStage) === TICKET_STAGES.READY_TO_SCHEDULE) {
    if (ticket.depositRequired && !ticket.depositPaid) missing.push("depositPaid");
    if (ticket.requiredDocumentsPresent === false) missing.push("requiredDocumentsPresent");
  }

  return missing;
}

function getAllowedTicketTransitions(stage, user, ticket = {}) {
  return (TRANSITIONS[normalizeTicketStage(stage)] || []).filter((item) => {
    return hasPermission(user, item.permission) && getMissingRequirements(ticket, item.to).length === 0;
  });
}

function canTransitionTicket(user, ticket, toStage) {
  const target = normalizeTicketStage(toStage);
  return getAllowedTicketTransitions(ticket && ticket.stage, user, ticket).some((item) => item.to === target);
}

function getResponsibleRole(stage) {
  return RESPONSIBLE_ROLE_BY_STAGE[normalizeTicketStage(stage)] || "";
}

function getTicketSectionAccess(role, section) {
  const config = SECTION_ACCESS[section] || { view: [], edit: [] };
  return {
    canView: config.view.includes(role) || role === ROLES.OWNER,
    canEdit: config.edit.includes(role) || role === ROLES.OWNER
  };
}

module.exports = {
  RESPONSIBLE_ROLE_BY_STAGE,
  SECTION_ACCESS,
  TRANSITIONS,
  normalizeTicketStage,
  getRequiredFieldsForStage,
  getMissingRequirements,
  getAllowedTicketTransitions,
  canTransitionTicket,
  getResponsibleRole,
  getTicketSectionAccess
};
