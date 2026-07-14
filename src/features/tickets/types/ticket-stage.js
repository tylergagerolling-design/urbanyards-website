"use strict";

const TICKET_STAGES = Object.freeze({
  DRAFT: "draft",
  SALES_INTAKE: "sales_intake",
  SCOPE_IN_PROGRESS: "scope_in_progress",
  QUOTE_PENDING: "quote_pending",
  CUSTOMER_APPROVAL_PENDING: "customer_approval_pending",
  NEEDS_COST_REVIEW: "needs_budget",
  COST_REVIEW_IN_PROGRESS: "budget_in_progress",
  NEEDS_BUDGET: "needs_budget",
  BUDGET_IN_PROGRESS: "budget_in_progress",
  NEEDS_OWNER_APPROVAL: "needs_owner_approval",
  INVOICE_PREPARATION: "invoice_preparation",
  READY_TO_SCHEDULE: "ready_to_schedule",
  SCHEDULED: "scheduled",
  IN_PROGRESS: "in_progress",
  PAUSED: "paused",
  SCOPE_CHANGE_REQUESTED: "scope_change_requested",
  FIELD_WORK_COMPLETE: "field_work_complete",
  COMPLETION_REVIEW: "completion_review",
  INVOICE_REVIEW: "invoice_review",
  INVOICE_SENT: "invoice_sent",
  PARTIALLY_PAID: "partially_paid",
  PAID: "paid",
  CLOSED: "closed",
  CANCELLED: "cancelled"
});

const TICKET_STAGE_LABELS = Object.freeze({
  [TICKET_STAGES.DRAFT]: "Draft",
  [TICKET_STAGES.SALES_INTAKE]: "Sales Intake",
  [TICKET_STAGES.SCOPE_IN_PROGRESS]: "Scope and Quote",
  [TICKET_STAGES.QUOTE_PENDING]: "Quote Pending",
  [TICKET_STAGES.CUSTOMER_APPROVAL_PENDING]: "Customer Approval",
  [TICKET_STAGES.NEEDS_BUDGET]: "Needs Cost Review",
  [TICKET_STAGES.BUDGET_IN_PROGRESS]: "Cost Review in Progress",
  [TICKET_STAGES.NEEDS_OWNER_APPROVAL]: "Owner Approval",
  [TICKET_STAGES.INVOICE_PREPARATION]: "Draft Invoice",
  [TICKET_STAGES.READY_TO_SCHEDULE]: "Ready to Schedule",
  [TICKET_STAGES.SCHEDULED]: "Scheduled",
  [TICKET_STAGES.IN_PROGRESS]: "Field Work",
  [TICKET_STAGES.PAUSED]: "Paused",
  [TICKET_STAGES.SCOPE_CHANGE_REQUESTED]: "Scope Change Requested",
  [TICKET_STAGES.FIELD_WORK_COMPLETE]: "Field Work Complete",
  [TICKET_STAGES.COMPLETION_REVIEW]: "Completion Review",
  [TICKET_STAGES.INVOICE_REVIEW]: "Invoice Review",
  [TICKET_STAGES.INVOICE_SENT]: "Invoice Sent",
  [TICKET_STAGES.PARTIALLY_PAID]: "Partially Paid",
  [TICKET_STAGES.PAID]: "Paid",
  [TICKET_STAGES.CLOSED]: "Closed",
  [TICKET_STAGES.CANCELLED]: "Cancelled"
});

const TICKET_WORKFLOW_TRACKER = Object.freeze([
  "Sales",
  "Cost Review",
  "Approval",
  "Invoice",
  "Schedule",
  "Field Work",
  "Payment"
]);

module.exports = {
  TICKET_STAGES,
  TICKET_STAGE_LABELS,
  TICKET_WORKFLOW_TRACKER
};
