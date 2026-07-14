"use strict";

const { AppError, ERROR_CATEGORIES } = require("../errors/app-error");
const { ok, fail } = require("../result");

const REQUIRED_TICKET_INTAKE_FIELDS = Object.freeze([
  "customerId",
  "propertyId",
  "primaryContact",
  "requestedService",
  "scopeOfWork",
  "requestedTimeframe",
  "proposedPrice"
]);

function validateTicketIntakeInput(input = {}) {
  const missing = REQUIRED_TICKET_INTAKE_FIELDS.filter((field) => input[field] === undefined || input[field] === null || input[field] === "");
  if (missing.length > 0) {
    return fail(new AppError({
      code: "TICKET_INTAKE_INPUT_INVALID",
      category: ERROR_CATEGORIES.VALIDATION,
      userMessage: "Some required ticket intake details are missing.",
      operation: "tickets.intake.validate",
      context: { missing }
    }));
  }

  const proposedPrice = Number(input.proposedPrice);
  if (!Number.isFinite(proposedPrice) || proposedPrice < 0) {
    return fail(new AppError({
      code: "TICKET_PROPOSED_PRICE_INVALID",
      category: ERROR_CATEGORIES.VALIDATION,
      userMessage: "The proposed price must be a valid nonnegative number.",
      operation: "tickets.intake.validate"
    }));
  }

  return ok({
    ...input,
    proposedPrice
  });
}

module.exports = {
  REQUIRED_TICKET_INTAKE_FIELDS,
  validateTicketIntakeInput
};
