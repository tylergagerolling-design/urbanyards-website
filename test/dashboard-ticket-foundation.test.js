const test = require("node:test");
const assert = require("node:assert/strict");

const { ROLES, PERMISSIONS, hasPermission, canViewTicket } = require("../src/shared/permissions/permissions");
const { TICKET_STAGES } = require("../src/features/tickets/types/ticket-stage");
const {
  getMissingRequirements,
  canTransitionTicket,
  getResponsibleRole,
  getTicketSectionAccess
} = require("../src/features/tickets/workflow/ticket-workflow");
const { transitionTicketStage } = require("../src/features/tickets/services/ticket-workflow-service");
const { formatTicketNumber } = require("../src/features/tickets/services/ticket-number");
const { validateTicketIntakeInput } = require("../src/shared/validation/ticket-validation");
const { readDashboardConfig, validateDashboardConfig } = require("../src/shared/config/dashboard-config");
const { redact } = require("../src/shared/logging/logger");

test("ticket permissions keep one canonical role-aware workflow", () => {
  const owner = { role: ROLES.OWNER, userId: "owner-1" };
  const sales = { role: ROLES.SALES_OUTREACH, userId: "sales-1" };
  const worker = { role: ROLES.FIELD_WORKER, userId: "worker-1" };
  const accountant = { role: ROLES.ACCOUNTANT, userId: "acct-1" };

  assert.equal(hasPermission(owner, PERMISSIONS.TICKETS_CREATE), true);
  assert.equal(hasPermission(sales, PERMISSIONS.TICKETS_CREATE), true);
  assert.equal(hasPermission(worker, PERMISSIONS.TICKETS_CREATE), false);
  assert.equal(hasPermission(accountant, PERMISSIONS.COST_REVIEW_CREATE), true);
  assert.equal(hasPermission(sales, PERMISSIONS.COST_REVIEW_CREATE), false);
});

test("field workers can only view assigned tickets", () => {
  const worker = { role: ROLES.FIELD_WORKER, userId: "worker-1" };
  assert.equal(canViewTicket(worker, { assignedUserId: "worker-1" }), true);
  assert.equal(canViewTicket(worker, { assignedUserId: "worker-2" }), false);
});

test("ticket intake validation catches missing fields and normalizes proposed price", () => {
  const invalid = validateTicketIntakeInput({ customerId: "client-1" });
  assert.equal(invalid.success, false);
  assert.equal(invalid.errorCode, "TICKET_INTAKE_INPUT_INVALID");

  const valid = validateTicketIntakeInput({
    customerId: "client-1",
    propertyId: "property-1",
    primaryContact: "Taylor",
    requestedService: "Mulch refresh",
    scopeOfWork: "Refresh entry beds.",
    requestedTimeframe: "Next week",
    proposedPrice: "1200"
  });
  assert.equal(valid.success, true);
  assert.equal(valid.data.proposedPrice, 1200);
});

test("ticket workflow blocks scheduling without owner approval and draft invoice", () => {
  const accountant = { role: ROLES.ACCOUNTANT, userId: "acct-1" };
  const ticket = {
    id: "ticket-1",
    stage: TICKET_STAGES.INVOICE_PREPARATION,
    scopeComplete: true,
    customerApprovalRecorded: true,
    costReviewComplete: true,
    ownerApprovalRecorded: false,
    draftInvoiceExists: false
  };

  const missing = getMissingRequirements(ticket, TICKET_STAGES.READY_TO_SCHEDULE);
  assert.deepEqual(missing, ["ownerApprovalRecorded", "draftInvoiceExists"]);

  const result = transitionTicketStage({ user: accountant, ticket, toStage: TICKET_STAGES.READY_TO_SCHEDULE });
  assert.equal(result.success, false);
  assert.equal(result.errorCode, "TICKET_STAGE_REQUIREMENTS_MISSING");
});

test("required deposit blocks ready-to-schedule until paid", () => {
  const ticket = {
    stage: TICKET_STAGES.INVOICE_PREPARATION,
    scopeComplete: true,
    customerApprovalRecorded: true,
    costReviewComplete: true,
    ownerApprovalRecorded: true,
    draftInvoiceExists: true,
    depositRequired: true,
    depositPaid: false
  };
  assert.deepEqual(getMissingRequirements(ticket, TICKET_STAGES.READY_TO_SCHEDULE), ["depositPaid"]);
});

test("legacy budgetComplete still satisfies cost review requirements", () => {
  const ticket = {
    stage: TICKET_STAGES.INVOICE_PREPARATION,
    scopeComplete: true,
    customerApprovalRecorded: true,
    budgetComplete: true,
    ownerApprovalRecorded: true,
    draftInvoiceExists: true
  };
  assert.deepEqual(getMissingRequirements(ticket, TICKET_STAGES.READY_TO_SCHEDULE), []);
});

test("ticket workflow allows complete lifecycle handoffs with the right roles", () => {
  const sales = { role: ROLES.SALES_OUTREACH, userId: "sales-1" };
  const accountant = { role: ROLES.ACCOUNTANT, userId: "acct-1" };
  const owner = { role: ROLES.OWNER, userId: "owner-1" };
  const worker = { role: ROLES.FIELD_WORKER, userId: "worker-1" };

  assert.equal(canTransitionTicket(sales, { stage: TICKET_STAGES.DRAFT }, TICKET_STAGES.SALES_INTAKE), true);
  assert.equal(canTransitionTicket(sales, { stage: TICKET_STAGES.CUSTOMER_APPROVAL_PENDING, customerId: "c", propertyId: "p", primaryContact: "t", requestedService: "s", scopeOfWork: "scope", proposedPrice: 500, customerApprovalRecorded: true }, TICKET_STAGES.NEEDS_BUDGET), true);
  assert.equal(canTransitionTicket(accountant, { stage: TICKET_STAGES.NEEDS_BUDGET }, TICKET_STAGES.BUDGET_IN_PROGRESS), true);
  assert.equal(canTransitionTicket(owner, { stage: TICKET_STAGES.NEEDS_OWNER_APPROVAL }, TICKET_STAGES.INVOICE_PREPARATION), true);
  assert.equal(canTransitionTicket(owner, { stage: TICKET_STAGES.READY_TO_SCHEDULE, scheduledDate: "2026-07-20", assignedUserId: "worker-1" }, TICKET_STAGES.SCHEDULED), true);
  assert.equal(canTransitionTicket(worker, { stage: TICKET_STAGES.SCHEDULED }, TICKET_STAGES.IN_PROGRESS), true);
});

test("transition service records audit and notification metadata for handoffs", () => {
  const accountant = { role: ROLES.ACCOUNTANT, userId: "acct-1" };
  const ticket = {
    id: "ticket-1",
    ticketNumber: "UY-2026-00001",
    stage: TICKET_STAGES.BUDGET_IN_PROGRESS,
    costReviewComplete: true,
    expectedRevenue: 1200,
    estimatedTotalCost: 700,
    estimatedProfit: 500,
    targetMargin: 35
  };
  const result = transitionTicketStage({
    user: accountant,
    ticket,
    toStage: TICKET_STAGES.NEEDS_OWNER_APPROVAL,
    correlationId: "corr-1",
    now: "2026-07-14T00:00:00.000Z"
  });

  assert.equal(result.success, true);
  assert.equal(result.data.stage, TICKET_STAGES.NEEDS_OWNER_APPROVAL);
  assert.equal(result.data.responsibleRole, ROLES.OWNER);
  assert.equal(result.context.auditEvent, "cost_review_submitted_to_owner");
  assert.equal(result.context.notificationEvent, "cost_review_submitted_to_owner");
  assert.equal(result.context.correlationId, "corr-1");
});

test("role-specific ticket section access prevents protected edits", () => {
  assert.equal(getTicketSectionAccess(ROLES.SALES_OUTREACH, "costReview").canEdit, false);
  assert.equal(getTicketSectionAccess(ROLES.ACCOUNTANT, "budget").canEdit, true);
  assert.equal(getTicketSectionAccess(ROLES.ACCOUNTANT, "scope").canEdit, false);
  assert.equal(getTicketSectionAccess(ROLES.FIELD_WORKER, "payments").canView, false);
  assert.equal(getTicketSectionAccess(ROLES.FIELD_WORKER, "fieldWork").canEdit, true);
});

test("ticket numbers are stable human-readable identifiers", () => {
  assert.equal(formatTicketNumber(1, new Date("2026-07-14T00:00:00Z")), "UY-2026-00001");
  assert.throws(() => formatTicketNumber(0), /positive integer/);
});

test("dashboard config validation separates public and private configuration", () => {
  const config = readDashboardConfig({
    SITE_URL: "https://urbanyards.us",
    VITE_SUPABASE_URL: "https://example.supabase.co",
    VITE_SUPABASE_ANON_KEY: "anon",
    SUPABASE_SERVICE_ROLE_KEY: "service-role"
  });
  assert.equal(config.public.supabaseAnonKey, "anon");
  assert.equal(config.private.supabaseServiceRoleKey, "service-role");
  assert.deepEqual(validateDashboardConfig(config, { requirePrivate: true }).missing, []);
});

test("structured logger redacts sensitive fields before writing logs", () => {
  const redacted = redact({
    userId: "user-1",
    authorization: "Bearer secret",
    nested: {
      openAiToken: "hidden"
    }
  });
  assert.equal(redacted.authorization, "[redacted]");
  assert.equal(redacted.nested.openAiToken, "[redacted]");
});

test("responsible role makes the next owner visible", () => {
  assert.equal(getResponsibleRole(TICKET_STAGES.NEEDS_BUDGET), ROLES.ACCOUNTANT);
  assert.equal(getResponsibleRole(TICKET_STAGES.READY_TO_SCHEDULE), ROLES.OWNER);
  assert.equal(getResponsibleRole(TICKET_STAGES.IN_PROGRESS), ROLES.FIELD_WORKER);
});
