const {
  getFeatureFlag,
  hasPermission,
  ipFromEvent,
  json,
  rateLimit,
  requestIdFromEvent,
  requirePermission,
  supabaseAdminRequest,
  writeAuditLog,
  writeSystemError
} = require("./lib/dashboard-auth");
const { transitionTicketStage } = require("../../src/features/tickets/services/ticket-workflow-service");

const ALLOWED_STAGES = new Set([
  "draft",
  "sales_intake",
  "scope_in_progress",
  "quote_pending",
  "customer_approval_pending",
  "needs_budget",
  "budget_in_progress",
  "needs_owner_approval",
  "invoice_preparation",
  "ready_to_schedule",
  "scheduled",
  "in_progress",
  "paused",
  "scope_change_requested",
  "field_work_complete",
  "completion_review",
  "invoice_review",
  "invoice_sent",
  "partially_paid",
  "paid",
  "closed",
  "cancelled"
]);

const ALLOWED_STATUSES = new Set(["open", "active", "on_hold", "blocked", "completed", "cancelled", "archived"]);
const ALLOWED_SOURCES = new Set(["ticket", "quote", "job", "document", "outreach", "contact", "property", "client", "manual"]);

function parseBody(event) {
  try {
    return event.body ? JSON.parse(event.body) : {};
  } catch {
    const error = new Error("Invalid JSON.");
    error.statusCode = 400;
    throw error;
  }
}

function cleanText(value, max = 1200) {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, max) : null;
}

function uuidOrNull(value) {
  const text = String(value ?? "").trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text) ? text : null;
}

function normalizeStage(value, fallback = "sales_intake") {
  const stage = String(value || fallback).trim().toLowerCase();
  return ALLOWED_STAGES.has(stage) ? stage : fallback;
}

function statusForStage(stage) {
  if (stage === "cancelled") return "cancelled";
  if (["closed", "paid"].includes(stage)) return "completed";
  if (["paused", "scope_change_requested"].includes(stage)) return "on_hold";
  if (["scheduled", "in_progress", "field_work_complete", "completion_review", "invoice_review", "invoice_sent", "partially_paid"].includes(stage)) return "active";
  return "open";
}

function normalizeStatus(value, stage) {
  const status = String(value || "").trim().toLowerCase();
  return ALLOWED_STATUSES.has(status) ? status : statusForStage(stage);
}

function normalizeSourceType(value) {
  const sourceType = String(value || "").trim().toLowerCase();
  return ALLOWED_SOURCES.has(sourceType) ? sourceType : null;
}

function cleanMoney(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : null;
}

function cleanBool(value) {
  if (value === true || value === false) return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function cleanBlockers(value) {
  if (!Array.isArray(value)) return undefined;
  return value.map((item) => cleanText(item, 140)).filter(Boolean).slice(0, 12);
}

function pickDate(value) {
  const text = cleanText(value, 40);
  return /^\d{4}-\d{2}-\d{2}$/.test(text || "") ? text : null;
}

function cleanTicketPayload(input = {}, actor = null, { partial = false } = {}) {
  const output = {};
  const set = (key, value) => {
    if (!partial || Object.prototype.hasOwnProperty.call(input, key)) output[key] = value;
  };

  const stage = normalizeStage(input.stage, partial ? undefined : "sales_intake");
  if (!partial || Object.prototype.hasOwnProperty.call(input, "stage")) output.stage = stage;
  if (!partial || Object.prototype.hasOwnProperty.call(input, "status")) output.status = normalizeStatus(input.status, stage);

  set("title", cleanText(input.title, 180) || cleanText(input.service || input.requested_service, 180) || "Job ticket");
  set("source_type", normalizeSourceType(input.source_type || input.sourceType));
  set("source_id", uuidOrNull(input.source_id || input.sourceId));
  set("quote_id", uuidOrNull(input.quote_id || input.quoteId));
  set("job_id", uuidOrNull(input.job_id || input.jobId));
  set("invoice_id", uuidOrNull(input.invoice_id || input.invoiceId));
  set("customer_id", uuidOrNull(input.customer_id || input.customerId));
  set("property_id", uuidOrNull(input.property_id || input.propertyId));
  set("customer_name", cleanText(input.customer_name || input.customerName, 220));
  set("client_name", cleanText(input.client_name || input.clientName, 220));
  set("contact_name", cleanText(input.contact_name || input.contactName, 220));
  set("company_name", cleanText(input.company_name || input.companyName, 220));
  set("property_name", cleanText(input.property_name || input.propertyName, 220));
  set("property_address", cleanText(input.property_address || input.propertyAddress, 260));
  set("city", cleanText(input.city, 120));
  set("requested_service", cleanText(input.requested_service || input.requestedService || input.service, 220));
  set("service", cleanText(input.service || input.requested_service || input.requestedService, 220));
  set("scope_of_work", cleanText(input.scope_of_work || input.scopeOfWork, 2000));
  set("description", cleanText(input.description, 2000));
  set("notes", cleanText(input.notes, 4000));
  set("internal_notes", cleanText(input.internal_notes || input.internalNotes, 4000));
  set("proposed_price", cleanMoney(input.proposed_price || input.proposedPrice));
  set("expected_revenue", cleanMoney(input.expected_revenue || input.expectedRevenue));
  set("estimated_total_cost", cleanMoney(input.estimated_total_cost || input.estimatedTotalCost));
  set("estimated_profit", cleanMoney(input.estimated_profit || input.estimatedProfit));
  set("target_margin", cleanMoney(input.target_margin || input.targetMargin));
  set("scheduled_date", pickDate(input.scheduled_date || input.scheduledDate));
  set("visit_date", pickDate(input.visit_date || input.visitDate));
  set("due_date", pickDate(input.due_date || input.dueDate));
  set("assigned_user_id", uuidOrNull(input.assigned_user_id || input.assignedUserId));
  set("owner_label", cleanText(input.owner_label || input.ownerLabel, 80));
  set("next_action", cleanText(input.next_action || input.nextAction, 180));

  const blockers = cleanBlockers(input.blockers);
  if (blockers !== undefined || !partial) output.blockers = blockers || [];

  [
    ["cost_review_complete", "costReviewComplete"],
    ["budget_complete", "budgetComplete"],
    ["scope_complete", "scopeComplete"],
    ["customer_approval_recorded", "customerApprovalRecorded"],
    ["owner_approval_recorded", "ownerApprovalRecorded"],
    ["draft_invoice_exists", "draftInvoiceExists"],
    ["deposit_required", "depositRequired"],
    ["deposit_paid", "depositPaid"],
    ["required_documents_present", "requiredDocumentsPresent"],
    ["before_photos_uploaded", "beforePhotosUploaded"],
    ["after_photos_uploaded", "afterPhotosUploaded"],
    ["arrival_photos_uploaded", "arrivalPhotosUploaded"],
    ["completion_photos_uploaded", "completionPhotosUploaded"],
    ["invoice_finalized", "invoiceFinalized"]
  ].forEach(([snake, camel]) => {
    const value = cleanBool(input[snake] ?? input[camel]);
    if (value !== undefined || !partial) output[snake] = value === undefined ? false : value;
  });

  if (!partial || Object.prototype.hasOwnProperty.call(input, "field_completion_notes") || Object.prototype.hasOwnProperty.call(input, "fieldCompletionNotes")) {
    output.field_completion_notes = cleanText(input.field_completion_notes || input.fieldCompletionNotes, 3000);
  }
  if (!partial || Object.prototype.hasOwnProperty.call(input, "payment_status") || Object.prototype.hasOwnProperty.call(input, "paymentStatus")) {
    output.payment_status = cleanText(input.payment_status || input.paymentStatus, 80);
  }
  if (actor?.userId) output[partial ? "updated_by" : "created_by"] = actor.userId;
  if (partial && actor?.userId) output.updated_by = actor.userId;

  Object.keys(output).forEach((key) => {
    if (output[key] === undefined) delete output[key];
  });
  return output;
}

function cleanEventPayload(input = {}, ticketId, actor = null) {
  return {
    ticket_id: uuidOrNull(ticketId),
    event_type: cleanText(input.event_type || input.eventType, 120) || "ticket_updated",
    actor_user_id: uuidOrNull(input.actor_user_id || input.actorUserId || actor?.userId),
    actor_email: cleanText(input.actor_email || input.actorEmail || actor?.email, 220),
    from_stage: cleanText(input.from_stage || input.fromStage, 80),
    to_stage: cleanText(input.to_stage || input.toStage, 80),
    notes: cleanText(input.notes, 2000),
    old_value: input.old_value || input.oldValue || null,
    new_value: input.new_value || input.newValue || null
  };
}

function workflowRole(role) {
  const normalized = String(role || "").trim().toLowerCase();
  if (["owner", "admin", "manager"].includes(normalized)) return "owner";
  if (normalized === "staff") return "staff";
  if (["sales", "sales_outreach"].includes(normalized)) return "sales_outreach";
  if (["field", "crew", "employee", "worker", "field_worker"].includes(normalized)) return "field_worker";
  if (["accounting", "accountant"].includes(normalized)) return "accountant";
  return normalized;
}

function actorForWorkflow(actor = {}) {
  return {
    role: workflowRole(actor.role),
    userId: actor.userId || actor.id || "",
    permissionOverrides: [],
    deniedPermissions: []
  };
}

function ticketForWorkflow(row = {}) {
  return {
    id: row.id,
    stage: row.stage,
    customerId: row.customer_id,
    propertyId: row.property_id,
    primaryContact: row.contact_name || row.customer_name || row.client_name || row.company_name,
    requestedService: row.requested_service || row.service,
    scopeOfWork: row.scope_of_work || row.description,
    proposedPrice: row.proposed_price,
    expectedRevenue: row.expected_revenue,
    estimatedTotalCost: row.estimated_total_cost,
    estimatedProfit: row.estimated_profit,
    targetMargin: row.target_margin,
    costReviewComplete: row.cost_review_complete,
    budgetComplete: row.budget_complete,
    scopeComplete: row.scope_complete,
    customerApprovalRecorded: row.customer_approval_recorded,
    ownerApprovalRecorded: row.owner_approval_recorded,
    draftInvoiceExists: row.draft_invoice_exists,
    depositRequired: row.deposit_required,
    depositPaid: row.deposit_paid,
    requiredDocumentsPresent: row.required_documents_present,
    scheduledDate: row.scheduled_date || row.visit_date,
    assignedUserId: row.assigned_user_id,
    beforePhotosUploaded: row.before_photos_uploaded || row.arrival_photos_uploaded,
    afterPhotosUploaded: row.after_photos_uploaded || row.completion_photos_uploaded,
    fieldCompletionNotes: row.field_completion_notes,
    invoiceFinalized: row.invoice_finalized,
    paymentStatus: row.payment_status,
    createdBy: row.created_by,
    updatedBy: row.updated_by
  };
}

function canWriteTicket(actor) {
  return Boolean(actor && (
    hasPermission(actor.role, "admin:manage") ||
    hasPermission(actor.role, "tickets:write") ||
    hasPermission(actor.role, "leads:write") ||
    hasPermission(actor.role, "appointments:write")
  ));
}

function tableMissing(error) {
  return /does not exist|schema cache|relation|could not find the table/i.test(String(error?.message || ""));
}

async function existingTicketBySource(payload) {
  if (!payload.source_type || !payload.source_id) return null;
  const query = `job_tickets?source_type=eq.${encodeURIComponent(payload.source_type)}&source_id=eq.${encodeURIComponent(payload.source_id)}&select=*&limit=1`;
  const rows = await supabaseAdminRequest(query, { method: "GET" });
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function createTicket(payload, actor, event) {
  const existing = await existingTicketBySource(payload);
  if (existing) return { ticket: existing, created: false };

  const rows = await supabaseAdminRequest("job_tickets", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(payload)
  });
  const ticket = Array.isArray(rows) ? rows[0] : null;
  if (!ticket?.id) return { ticket, created: true };

  await supabaseAdminRequest("job_ticket_events", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(cleanEventPayload(event || {
      event_type: "ticket_created",
      to_stage: ticket.stage,
      new_value: { sourceType: ticket.source_type, sourceId: ticket.source_id, title: ticket.title }
    }, ticket.id, actor))
  }).catch((error) => {
    if (!tableMissing(error)) throw error;
  });
  return { ticket, created: true };
}

async function updateTicket(id, payload) {
  const rows = await supabaseAdminRequest(`job_tickets?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(payload)
  });
  return Array.isArray(rows) ? rows[0] || null : null;
}

function canDeleteTicket(actor) {
  return Boolean(actor && hasPermission(actor.role, "admin:manage"));
}

const RENT_DEDUCTION_MONTHLY_LIMIT = 350;
const RENT_DEDUCTION_CLOSE_STAGES = new Set(["field_work_complete", "completion_review", "invoice_review", "invoice_sent", "partially_paid", "paid"]);
const OWNER_FINALIZE_STAGES = new Set(["field_work_complete", "completion_review", "invoice_review", "invoice_sent", "partially_paid", "paid"]);
const OWNER_FINALIZE_REQUIREMENTS = Object.freeze([
  ["beforePhotosUploaded", "Arrival photos"],
  ["afterPhotosUploaded", "Completion photos"],
  ["fieldCompletionNotes", "Completion notes"],
  ["requiredDocumentsPresent", "Required forms and documents"],
  ["actualsRecorded", "Actual costs"],
  ["invoiceFinalized", "Final invoice"],
  ["paymentStatus", "Payment"]
]);

function cleanCompletionExceptions(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value)
    .filter(([key, reason]) => OWNER_FINALIZE_REQUIREMENTS.some(([field]) => field === key) && cleanText(reason, 500))
    .map(([key, reason]) => [key, cleanText(reason, 500)]));
}

function ownerFinalizeValue(ticket, field, completed = []) {
  if (field === "paymentStatus") return String(ticket.payment_status || ticket.paymentStatus || "").toLowerCase() === "paid";
  if (field === "actualsRecorded") return completed.includes(field);
  const snake = field.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  return Boolean(ticket[field] ?? ticket[snake]);
}

async function ownerFinalizeTicket(id, body, actor) {
  if (String(actor?.role || "").trim().toLowerCase() !== "owner") {
    const error = new Error("Only the Owner can complete a ticket from the unified checklist.");
    error.statusCode = 403;
    throw error;
  }
  const existing = await getTicket(id);
  if (!existing?.id) {
    const error = new Error("Ticket was not found.");
    error.statusCode = 404;
    throw error;
  }
  if (!OWNER_FINALIZE_STAGES.has(String(existing.stage || "").toLowerCase())) {
    const error = new Error("Mark the field work complete before using the final completion checklist.");
    error.statusCode = 409;
    throw error;
  }
  const updates = cleanTicketPayload(body.ticket || body.payload || {}, actor, { partial: true });
  const merged = { ...existing, ...updates };
  const completed = Array.isArray(body.completed) ? body.completed.map((item) => cleanText(item, 80)).filter(Boolean) : [];
  const notApplicable = cleanCompletionExceptions(body.notApplicable);
  if (Object.keys(notApplicable).length && !cleanText(body.notes, 2000)) {
    const error = new Error("Add a closeout note explaining why the N/A items do not apply.");
    error.statusCode = 400;
    throw error;
  }
  const missing = OWNER_FINALIZE_REQUIREMENTS
    .filter(([field]) => !ownerFinalizeValue(merged, field, completed) && !notApplicable[field])
    .map(([, label]) => label);
  if (missing.length) {
    const error = new Error(`Resolve every completion item before closing: ${missing.join(", ")}.`);
    error.statusCode = 409;
    throw error;
  }
  const updatePayload = {
    ...updates,
    stage: "closed",
    status: "completed",
    responsible_role: "owner",
    next_action: "Completed from unified checklist"
  };
  if (actor?.userId) updatePayload.updated_by = actor.userId;
  const ticket = await updateTicket(id, updatePayload);
  await supabaseAdminRequest("job_ticket_events", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(cleanEventPayload({
      event_type: "ticket_completed_from_checklist",
      from_stage: existing.stage,
      to_stage: "closed",
      notes: cleanText(body.notes, 2000) || "Owner completed every unified closeout requirement.",
      old_value: { stage: existing.stage },
      new_value: { stage: "closed", completed, notApplicable }
    }, id, actor))
  }).catch((error) => {
    if (!tableMissing(error)) throw error;
  });
  return { ticket, completed, notApplicable };
}

function isLandscapingTicket(ticket = {}) {
  const description = [ticket.title, ticket.requested_service, ticket.service, ticket.scope_of_work, ticket.description]
    .filter(Boolean).join(" ").toLowerCase();
  return /\blandscap(?:e|ing|er|ers)?\b|\blawn\b|\bmow(?:ing)?\b/.test(description);
}

function monthBounds(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}

async function ownerCloseRentDeduction(id, amount, notes, actor, event) {
  if (String(actor?.role || "").trim().toLowerCase() !== "owner") {
    const error = new Error("Only the Owner can close a ticket as a rent deduction.");
    error.statusCode = 403;
    throw error;
  }
  const ticket = await getTicket(id);
  if (!ticket?.id) {
    const error = new Error("Ticket was not found.");
    error.statusCode = 404;
    throw error;
  }
  if (!RENT_DEDUCTION_CLOSE_STAGES.has(String(ticket.stage || "").toLowerCase())) {
    const error = new Error("Complete the field work before using rent-deduction closeout.");
    error.statusCode = 409;
    throw error;
  }
  if (isLandscapingTicket(ticket)) {
    const error = new Error("Landscaping work is excluded from rent deductions and must use normal invoice closeout.");
    error.statusCode = 409;
    throw error;
  }
  const deductionAmount = cleanMoney(amount);
  if (!deductionAmount || deductionAmount <= 0 || deductionAmount > RENT_DEDUCTION_MONTHLY_LIMIT) {
    const error = new Error("Enter a rent deduction amount between $0.01 and $350.00.");
    error.statusCode = 400;
    throw error;
  }
  const bounds = monthBounds();
  const priorEvents = await supabaseAdminRequest(`job_ticket_events?event_type=eq.rent_deduction_ticket_closed&created_at=gte.${encodeURIComponent(bounds.start)}&created_at=lt.${encodeURIComponent(bounds.end)}&select=new_value&limit=1000`, { method: "GET" });
  const used = (Array.isArray(priorEvents) ? priorEvents : []).reduce((total, row) => {
    const value = row?.new_value && typeof row.new_value === "object" ? row.new_value : {};
    return total + (Number(value.rentDeductionAmount) || 0);
  }, 0);
  if (Math.round((used + deductionAmount) * 100) > RENT_DEDUCTION_MONTHLY_LIMIT * 100) {
    const remaining = Math.max(0, RENT_DEDUCTION_MONTHLY_LIMIT - used);
    const error = new Error(`This would exceed the $350 monthly rent-deduction limit. $${remaining.toFixed(2)} remains this month.`);
    error.statusCode = 409;
    throw error;
  }
  const updatePayload = {
    stage: "closed",
    status: "completed",
    responsible_role: "owner",
    next_action: "Closed as rent deduction"
  };
  if (actor?.userId) updatePayload.updated_by = actor.userId;
  const closedTicket = await updateTicket(id, updatePayload);
  const eventPayload = cleanEventPayload({
    event_type: "rent_deduction_ticket_closed",
    from_stage: ticket.stage,
    to_stage: "closed",
    notes: cleanText(notes, 2000) || `Closed as a $${deductionAmount.toFixed(2)} rent deduction.`,
    old_value: { stage: ticket.stage, status: ticket.status },
    new_value: {
      stage: "closed",
      status: "completed",
      closeoutType: "rent_deduction",
      rentDeductionAmount: deductionAmount,
      monthlyLimit: RENT_DEDUCTION_MONTHLY_LIMIT
    }
  }, id, actor);
  await supabaseAdminRequest("job_ticket_events", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(eventPayload) });
  await writeAuditLog({
    actor,
    action: "rent_deduction_ticket_closed",
    entityType: "job_tickets",
    entityId: id,
    oldValue: eventPayload.old_value,
    newValue: eventPayload.new_value,
    metadata: { monthly_used: used + deductionAmount, monthly_limit: RENT_DEDUCTION_MONTHLY_LIMIT },
    event,
    module: "tickets"
  });
  return { ticket: closedTicket, amount: deductionAmount, monthlyUsed: used + deductionAmount, monthlyRemaining: RENT_DEDUCTION_MONTHLY_LIMIT - used - deductionAmount };
}

async function deleteTicket(id) {
  await supabaseAdminRequest(`job_ticket_events?ticket_id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" }
  }).catch((error) => {
    if (!tableMissing(error)) throw error;
  });
  await supabaseAdminRequest(`job_tickets?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" }
  });
}

async function getTicket(id) {
  const rows = await supabaseAdminRequest(`job_tickets?id=eq.${encodeURIComponent(id)}&select=*&limit=1`, {
    method: "GET"
  });
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function transitionTicket(id, toStage, options, actor, event, requestId) {
  const current = await getTicket(id);
  if (!current?.id) {
    const error = new Error("Ticket was not found.");
    error.statusCode = 404;
    throw error;
  }

  const normalizedTo = normalizeStage(toStage, current.stage);
  const nextAction = cleanText(options.next_action || options.nextAction, 180);
  const notes = cleanText(options.notes, 2000) || "";

  if (current.stage === normalizedTo) {
    const noopPayload = {};
    if (nextAction) noopPayload.next_action = nextAction;
    if (actor?.userId) noopPayload.updated_by = actor.userId;
    const ticket = Object.keys(noopPayload).length ? await updateTicket(id, noopPayload) : current;
    return { ticket: ticket || current, event: null, changed: false, fromStage: current.stage, toStage: normalizedTo };
  }

  const result = transitionTicketStage({
    user: actorForWorkflow(actor),
    ticket: ticketForWorkflow(current),
    toStage: normalizedTo,
    notes,
    correlationId: requestId
  });

  if (!result.success) {
    const error = new Error(result.error || "Ticket stage transition failed.");
    error.statusCode = result.errorCode === "TICKET_STAGE_TRANSITION_DENIED" ? 403 : 400;
    error.context = result.context || {};
    throw error;
  }

  const updatePayload = {
    stage: result.data.stage,
    status: statusForStage(result.data.stage),
    responsible_role: result.data.responsibleRole,
    next_action: nextAction || current.next_action || null
  };
  if (actor?.userId) updatePayload.updated_by = actor.userId;
  const ticket = await updateTicket(id, updatePayload);

  const eventPayload = cleanEventPayload({
    event_type: result.context.auditEvent || "ticket_stage_changed",
    from_stage: result.context.fromStage,
    to_stage: result.context.toStage,
    notes,
    old_value: {
      stage: current.stage,
      status: current.status,
      nextAction: current.next_action
    },
    new_value: {
      stage: result.data.stage,
      status: updatePayload.status,
      nextAction: updatePayload.next_action,
      sourceStatus: options.source_status || options.sourceStatus || null
    }
  }, id, actor);
  const rows = await supabaseAdminRequest("job_ticket_events", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(eventPayload)
  });
  const ticketEvent = Array.isArray(rows) ? rows[0] || null : null;

  await writeAuditLog({
    actor,
    action: eventPayload.event_type,
    entityType: "job_tickets",
    entityId: id,
    oldValue: eventPayload.old_value,
    newValue: eventPayload.new_value,
    metadata: { from_stage: eventPayload.from_stage, to_stage: eventPayload.to_stage },
    event,
    module: "tickets"
  });

  return {
    ticket,
    event: ticketEvent,
    changed: true,
    fromStage: result.context.fromStage,
    toStage: result.context.toStage
  };
}

async function listTickets(limit = 1000) {
  const safeLimit = Math.min(Math.max(Number(limit) || 1000, 1), 2000);
  const rows = await supabaseAdminRequest(`job_tickets?select=*&order=updated_at.desc.nullslast,created_at.desc&limit=${safeLimit}`, {
    method: "GET"
  });
  return Array.isArray(rows) ? rows : [];
}

async function listTicketEvents(limit = 500) {
  const safeLimit = Math.min(Math.max(Number(limit) || 500, 1), 2000);
  const rows = await supabaseAdminRequest(`job_ticket_events?select=*&order=created_at.desc&limit=${safeLimit}`, {
    method: "GET"
  });
  return Array.isArray(rows) ? rows : [];
}

exports.handler = async (event) => {
  const requestId = requestIdFromEvent(event);
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed.", requestId }, { Allow: "POST" });
  }

  const limit = rateLimit(`dashboard-tickets:${ipFromEvent(event)}`, 120, 10 * 60 * 1000);
  if (!limit.allowed) {
    return json(429, { error: "Too many ticket requests. Try again shortly.", requestId }, { "Retry-After": String(limit.retryAfter || 60) });
  }

  let body = {};
  let actor = null;
  try {
    body = parseBody(event);
    const action = String(body.action || "").trim().toLowerCase();
    if (!["list", "events", "create", "update", "delete", "transition", "owner-close-rent-deduction", "owner-finalize-ticket", "event"].includes(action)) {
      return json(400, { error: "Unsupported ticket action.", requestId });
    }

    if (!(await getFeatureFlag("job_tickets_enabled", true))) {
      return json(403, { error: "Job Tickets are currently unavailable.", requestId });
    }

    const auth = await requirePermission(event, "dashboard:read", { route: "dashboard-tickets", action });
    actor = auth.actor;
    if (!auth.ok) return json(auth.statusCode, { error: auth.error, requestId });

    if (action === "list") {
      const tickets = await listTickets(body.limit);
      return json(200, { ok: true, tickets, requestId });
    }

    if (action === "events") {
      const events = await listTicketEvents(body.limit);
      return json(200, { ok: true, events, requestId });
    }

    if (!canWriteTicket(actor)) {
      await writeAuditLog({
        actor,
        action: "permission_denied_ticket_update",
        entityType: "job_tickets",
        metadata: { action },
        event,
        module: "tickets"
      });
      return json(403, { error: "You do not have permission to update job tickets.", requestId });
    }

    if (action === "create") {
      const ticketPayload = cleanTicketPayload(body.ticket || body.payload || {}, actor);
      if (!ticketPayload.title) return json(400, { error: "Ticket title is required.", requestId });
      const result = await createTicket(ticketPayload, actor, body.event);
      await writeAuditLog({
        actor,
        action: result.created ? "ticket_created" : "ticket_reused_existing",
        entityType: "job_tickets",
        entityId: result.ticket?.id,
        metadata: { source_type: result.ticket?.source_type, source_id: result.ticket?.source_id },
        event,
        module: "tickets"
      });
      return json(200, { ok: true, ticket: result.ticket, created: result.created, requestId });
    }

    if (action === "update") {
      const id = uuidOrNull(body.id || body.ticketId);
      if (!id) return json(400, { error: "A valid ticket id is required.", requestId });
      const ticketPayload = cleanTicketPayload(body.ticket || body.payload || {}, actor, { partial: true });
      if (!Object.keys(ticketPayload).length) return json(400, { error: "No ticket updates were provided.", requestId });
      const ticket = await updateTicket(id, ticketPayload);
      await writeAuditLog({
        actor,
        action: "ticket_updated",
        entityType: "job_tickets",
        entityId: id,
        newValue: ticketPayload,
        event,
        module: "tickets"
      });
      return json(200, { ok: true, ticket, requestId });
    }

    if (action === "delete") {
      if (!canDeleteTicket(actor)) {
        await writeAuditLog({
          actor,
          action: "permission_denied_ticket_delete",
          entityType: "job_tickets",
          entityId: body.id || body.ticketId || null,
          event,
          module: "tickets"
        });
        return json(403, { error: "Only an owner or admin can delete job tickets.", requestId });
      }
      const id = uuidOrNull(body.id || body.ticketId);
      if (!id) return json(400, { error: "A valid ticket id is required.", requestId });
      await deleteTicket(id);
      await writeAuditLog({
        actor,
        action: "ticket_deleted",
        entityType: "job_tickets",
        entityId: id,
        event,
        module: "tickets"
      });
      return json(200, { ok: true, deleted: true, id, requestId });
    }

    if (action === "transition") {
      const id = uuidOrNull(body.id || body.ticketId);
      if (!id) return json(400, { error: "A valid ticket id is required.", requestId });
      const result = await transitionTicket(id, body.toStage || body.stage, body, actor, event, requestId);
      return json(200, { ok: true, ...result, requestId });
    }

    if (action === "owner-close-rent-deduction") {
      const id = uuidOrNull(body.id || body.ticketId);
      if (!id) return json(400, { error: "A valid ticket id is required.", requestId });
      const result = await ownerCloseRentDeduction(id, body.amount, body.notes, actor, event);
      return json(200, { ok: true, ...result, requestId });
    }

    if (action === "owner-finalize-ticket") {
      const id = uuidOrNull(body.id || body.ticketId);
      if (!id) return json(400, { error: "A valid ticket id is required.", requestId });
      const result = await ownerFinalizeTicket(id, body, actor);
      return json(200, { ok: true, ...result, requestId });
    }

    const ticketId = uuidOrNull(body.ticketId || body.id);
    if (!ticketId) return json(400, { error: "A valid ticket id is required.", requestId });
    const eventPayload = cleanEventPayload(body.event || body.payload || {}, ticketId, actor);
    const rows = await supabaseAdminRequest("job_ticket_events", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(eventPayload)
    });
    await writeAuditLog({
      actor,
      action: "ticket_event_added",
      entityType: "job_ticket_events",
      entityId: Array.isArray(rows) && rows[0] ? rows[0].id : null,
      metadata: { ticket_id: ticketId, event_type: eventPayload.event_type },
      event,
      module: "tickets"
    });
    return json(200, { ok: true, event: Array.isArray(rows) ? rows[0] || null : null, requestId });
  } catch (error) {
    await writeSystemError({ route: "dashboard-tickets", error, actor, metadata: { action: body?.action } });
    if (tableMissing(error)) {
      return json(503, { error: "Job Ticket tables are not installed yet. Run supabase/migrations/20260714_job_ticket_foundation.sql, then refresh.", requestId });
    }
    const statusCode = error.statusCode && error.statusCode < 500 ? error.statusCode : 500;
    return json(statusCode, { error: statusCode >= 500 ? "Job Ticket request failed." : error.message, requestId });
  }
};

module.exports._internals = {
  canDeleteTicket,
  cleanTicketPayload,
  cleanEventPayload,
  normalizeStage,
  normalizeStatus,
  actorForWorkflow,
  statusForStage,
  ticketForWorkflow,
  transitionTicket,
  ownerFinalizeTicket,
  uuidOrNull
};
