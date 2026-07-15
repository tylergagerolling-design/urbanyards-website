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
const {
  WORKSPACES,
  normalizeWorkspaceKey,
  getWorkspace,
  getVisibleWorkspaces,
  getVisibleWorkspaceNav
} = require("../src/app/routing/workspace-registry");
const {
  TICKET_OWNER_GROUPS,
  normalizeTicketStage,
  getTicketStageMeta,
  getTicketNextAction,
  getTicketBlockers,
  normalizeTicketSourceType,
  ticketSourceKey,
  mergeCanonicalTickets
} = require("../src/features/tickets/view-model/ticket-dashboard-view-model");
const {
  _internals: ticketFunctionInternals
} = require("../netlify/functions/dashboard-tickets");
const dashboardAuth = require("../netlify/functions/lib/dashboard-auth");

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

test("workspace registry matches the rebuilt five-area dashboard shell", () => {
  assert.deepEqual(WORKSPACES.map((workspace) => workspace.key), [
    "overview",
    "calendar",
    "outreach",
    "documents",
    "settings"
  ]);

  assert.equal(normalizeWorkspaceKey("route-planner"), "calendar");
  assert.equal(normalizeWorkspaceKey("groundskeeper-ai"), "settings");
  assert.equal(normalizeWorkspaceKey("sales-outreach"), "outreach");
  assert.equal(normalizeWorkspaceKey("job-budgeter"), "documents");
  assert.equal(getWorkspace("field-worker").key, "calendar");

  const permissionService = { hasPermission };
  const owner = { role: ROLES.OWNER, userId: "owner-1" };
  const fieldWorker = { role: ROLES.FIELD_WORKER, userId: "worker-1" };

  assert.deepEqual(getVisibleWorkspaces(owner, permissionService).map((workspace) => workspace.key), [
    "overview",
    "calendar",
    "outreach",
    "documents",
    "settings"
  ]);
  assert.equal(getVisibleWorkspaces(fieldWorker, permissionService).some((workspace) => workspace.key === "calendar"), true);
  assert.equal(getVisibleWorkspaceNav("route-planner", fieldWorker, permissionService).some((item) => item.key === "route"), true);
});

test("ticket dashboard view model normalizes workflow language for the rebuilt shell", () => {
  assert.equal(normalizeTicketStage("Cost review in progress"), TICKET_STAGES.BUDGET_IN_PROGRESS);
  assert.equal(normalizeTicketStage("Ready to schedule"), TICKET_STAGES.READY_TO_SCHEDULE);
  assert.equal(normalizeTicketStage("lost / no fit"), TICKET_STAGES.CANCELLED);

  assert.deepEqual(getTicketBlockers(TICKET_STAGES.SCHEDULED), ["Arrival photos", "Completion photos", "Forms"]);
  assert.equal(getTicketNextAction(TICKET_STAGES.INVOICE_SENT), "Collect payment");
  assert.equal(getTicketStageMeta(TICKET_STAGES.NEEDS_OWNER_APPROVAL).owner, "Owner");
  assert.equal(normalizeTicketSourceType("quote_submission"), "quote");
  assert.equal(normalizeTicketSourceType("scheduled_visit"), "job");
  assert.equal(TICKET_OWNER_GROUPS.some((group) => group.id === "field" && group.stages.includes(TICKET_STAGES.IN_PROGRESS)), true);
});

test("ticket dashboard view model merges canonical tickets over legacy fallbacks", () => {
  const canonical = [
    { id: "ticket-1", source: "ticket", sourceType: "quote", sourceId: "quote-1", dateRaw: "2026-07-15" }
  ];
  const fallback = [
    { id: "quote-1", source: "quote", sourceType: "quote", sourceId: "quote-1", dateRaw: "2026-07-14" },
    { id: "job-1", source: "job", sourceType: "job", sourceId: "job-1", dateRaw: "2026-07-16" }
  ];

  assert.equal(ticketSourceKey(canonical[0]), "quote:quote-1");
  assert.deepEqual(mergeCanonicalTickets(canonical, fallback).map((ticket) => ticket.id), ["ticket-1", "job-1"]);
  assert.deepEqual(mergeCanonicalTickets([], fallback).map((ticket) => ticket.id), ["quote-1", "job-1"]);
});

test("dashboard ticket backend sanitizes mutation payloads before Supabase writes", () => {
  const actor = { userId: "bb2f637a-61c8-4ca4-8e29-f4b7286f10a2", email: "team@urbanyards.us" };
  const payload = ticketFunctionInternals.cleanTicketPayload({
    title: "  Mulch refresh  ",
    stage: "not-a-stage",
    status: "also-bad",
    source_type: "Quote",
    source_id: "not-a-uuid",
    proposed_price: "1200.129",
    blockers: ["Photos", "", "Forms"]
  }, actor);

  assert.equal(payload.title, "Mulch refresh");
  assert.equal(payload.stage, TICKET_STAGES.SALES_INTAKE);
  assert.equal(payload.status, "open");
  assert.equal(payload.source_type, "quote");
  assert.equal(payload.source_id, null);
  assert.equal(payload.proposed_price, 1200.13);
  assert.deepEqual(payload.blockers, ["Photos", "Forms"]);
  assert.equal(payload.created_by, actor.userId);
});

test("dashboard ticket backend accepts field proof updates through protected payloads", () => {
  const actor = { userId: "bb2f637a-61c8-4ca4-8e29-f4b7286f10a2", email: "team@urbanyards.us" };
  const payload = ticketFunctionInternals.cleanTicketPayload({
    arrival_photos_uploaded: true,
    completion_photos_uploaded: true,
    before_photos_uploaded: true,
    after_photos_uploaded: true,
    field_completion_notes: "Arrived, completed, and photographed the work area."
  }, actor, { partial: true });

  assert.equal(payload.arrival_photos_uploaded, true);
  assert.equal(payload.completion_photos_uploaded, true);
  assert.equal(payload.before_photos_uploaded, true);
  assert.equal(payload.after_photos_uploaded, true);
  assert.equal(payload.field_completion_notes, "Arrived, completed, and photographed the work area.");
  assert.equal(payload.updated_by, actor.userId);
});

test("dashboard ticket backend exposes read actions through the protected ticket endpoint", () => {
  const source = require("node:fs").readFileSync(require("node:path").join(__dirname, "..", "netlify/functions/dashboard-tickets.js"), "utf8");
  assert.match(source, /"list"/);
  assert.match(source, /"events"/);
  assert.match(source, /"transition"/);
  assert.match(source, /async function listTickets/);
  assert.match(source, /async function listTicketEvents/);
  assert.match(source, /async function transitionTicket/);
  assert.match(source, /requirePermission\(event, "dashboard:read"/);
});

test("dashboard ticket backend adapts legacy dashboard actors to rebuilt workflow roles", () => {
  assert.deepEqual(ticketFunctionInternals.actorForWorkflow({ role: "admin", userId: "admin-1" }), {
    role: ROLES.OWNER,
    userId: "admin-1",
    permissionOverrides: [],
    deniedPermissions: []
  });
  assert.equal(ticketFunctionInternals.actorForWorkflow({ role: "field", userId: "field-1" }).role, ROLES.FIELD_WORKER);
  assert.equal(ticketFunctionInternals.actorForWorkflow({ role: "sales", userId: "sales-1" }).role, ROLES.SALES_OUTREACH);
  assert.equal(ticketFunctionInternals.actorForWorkflow({ role: "accounting", userId: "acct-1" }).role, ROLES.ACCOUNTANT);
});

test("dashboard ticket backend maps stored rows into workflow validation fields", () => {
  const ticket = ticketFunctionInternals.ticketForWorkflow({
    id: "ticket-1",
    stage: TICKET_STAGES.IN_PROGRESS,
    contact_name: "Taylor",
    requested_service: "Mulch refresh",
    scope_of_work: "Refresh entry beds.",
    arrival_photos_uploaded: true,
    completion_photos_uploaded: true,
    field_completion_notes: "Beds refreshed and cleaned.",
    assigned_user_id: "worker-1"
  });

  assert.equal(ticket.primaryContact, "Taylor");
  assert.equal(ticket.requestedService, "Mulch refresh");
  assert.equal(ticket.beforePhotosUploaded, true);
  assert.equal(ticket.afterPhotosUploaded, true);
  assert.equal(ticket.assignedUserId, "worker-1");
});

test("protected dashboard auth recognizes rebuilt job-ticket roles", () => {
  assert.equal(dashboardAuth.normalizeRole("sales"), "sales_outreach");
  assert.equal(dashboardAuth.normalizeRole("field"), "field_worker");
  assert.equal(dashboardAuth.normalizeRole("accounting"), "accountant");
  assert.equal(dashboardAuth.hasPermission("sales_outreach", "leads:write"), true);
  assert.equal(dashboardAuth.hasPermission("sales_outreach", "tickets:write"), true);
  assert.equal(dashboardAuth.hasPermission("field_worker", "appointments:write"), true);
  assert.equal(dashboardAuth.hasPermission("field_worker", "admin:manage"), false);
  assert.equal(dashboardAuth.hasPermission("accountant", "invoices:read"), true);
  assert.equal(dashboardAuth.hasPermission("accountant", "leads:write"), false);
});
