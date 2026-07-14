"use strict";

const { AppError, ERROR_CATEGORIES } = require("../../../shared/errors/app-error");
const { ok, fail } = require("../../../shared/result");
const {
  TRANSITIONS,
  canTransitionTicket,
  getMissingRequirements,
  getResponsibleRole,
  normalizeTicketStage
} = require("../workflow/ticket-workflow");

function transitionTicketStage({ user, ticket, toStage, notes = "", correlationId = "", now = new Date().toISOString() }) {
  const fromStage = normalizeTicketStage(ticket && ticket.stage);
  const normalizedTo = normalizeTicketStage(toStage);

  if (!fromStage || !normalizedTo) {
    return fail(new AppError({
      code: "TICKET_STAGE_INVALID",
      category: ERROR_CATEGORIES.VALIDATION,
      userMessage: "This ticket stage is not supported.",
      operation: "tickets.transition_stage",
      entityType: "job_ticket",
      entityId: ticket && ticket.id,
      requestId: correlationId
    }));
  }

  const transition = (TRANSITIONS[fromStage] || []).find((item) => item.to === normalizedTo);
  if (!transition) {
    return fail(new AppError({
      code: "TICKET_STAGE_TRANSITION_INVALID",
      category: ERROR_CATEGORIES.VALIDATION,
      userMessage: "This ticket cannot move to that stage from its current stage.",
      operation: "tickets.transition_stage",
      entityType: "job_ticket",
      entityId: ticket && ticket.id,
      requestId: correlationId,
      context: { fromStage, toStage: normalizedTo }
    }));
  }

  const missing = getMissingRequirements(ticket, normalizedTo);
  if (missing.length > 0) {
    return fail(new AppError({
      code: "TICKET_STAGE_REQUIREMENTS_MISSING",
      category: ERROR_CATEGORIES.VALIDATION,
      userMessage: "This ticket is missing required details before it can move forward.",
      operation: "tickets.transition_stage",
      entityType: "job_ticket",
      entityId: ticket && ticket.id,
      requestId: correlationId,
      context: { fromStage, toStage: normalizedTo, missing }
    }));
  }

  if (!canTransitionTicket(user, ticket, normalizedTo)) {
    return fail(new AppError({
      code: "TICKET_STAGE_TRANSITION_DENIED",
      category: ERROR_CATEGORIES.AUTHORIZATION,
      userMessage: "You do not have permission to move this ticket to that stage.",
      operation: "tickets.transition_stage",
      entityType: "job_ticket",
      entityId: ticket && ticket.id,
      requestId: correlationId,
      context: { fromStage, toStage: normalizedTo }
    }));
  }

  return ok({
    ...ticket,
    stage: normalizedTo,
    responsibleRole: getResponsibleRole(normalizedTo),
    stageEnteredAt: now,
    updatedAt: now
  }, {
    auditEvent: transition.auditEvent,
    notificationEvent: transition.notificationEvent,
    fromStage,
    toStage: normalizedTo,
    notes,
    correlationId
  });
}

module.exports = {
  transitionTicketStage
};
