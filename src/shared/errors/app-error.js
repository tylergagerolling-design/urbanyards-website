"use strict";

const ERROR_CATEGORIES = Object.freeze({
  AUTHENTICATION: "authentication",
  AUTHORIZATION: "authorization",
  VALIDATION: "validation",
  NOT_FOUND: "not_found",
  CONFLICT: "conflict",
  DATABASE: "database",
  INTEGRATION: "integration",
  NETWORK: "network",
  UNEXPECTED: "unexpected"
});

class AppError extends Error {
  constructor({
    code = "APP_ERROR",
    category = ERROR_CATEGORIES.UNEXPECTED,
    userMessage = "Something went wrong. Please try again.",
    technicalMessage = "",
    entityType = "",
    entityId = "",
    operation = "",
    cause = null,
    context = {},
    requestId = ""
  } = {}) {
    super(technicalMessage || userMessage);
    this.name = "AppError";
    this.code = code;
    this.category = category;
    this.userMessage = userMessage;
    this.technicalMessage = technicalMessage || userMessage;
    this.entityType = entityType;
    this.entityId = entityId;
    this.operation = operation;
    this.cause = cause;
    this.context = context;
    this.requestId = requestId;
    this.timestamp = new Date().toISOString();
  }

  toSafeResponse() {
    return {
      code: this.code,
      category: this.category,
      message: this.userMessage,
      entityType: this.entityType || undefined,
      entityId: this.entityId || undefined,
      operation: this.operation || undefined,
      requestId: this.requestId || undefined,
      timestamp: this.timestamp
    };
  }

  toLogFields() {
    return {
      code: this.code,
      category: this.category,
      userMessage: this.userMessage,
      technicalMessage: this.technicalMessage,
      entityType: this.entityType,
      entityId: this.entityId,
      operation: this.operation,
      requestId: this.requestId,
      timestamp: this.timestamp,
      context: this.context
    };
  }
}

function normalizeError(error, fallback = {}) {
  if (error instanceof AppError) return error;
  return new AppError({
    code: fallback.code || "UNEXPECTED_ERROR",
    category: fallback.category || ERROR_CATEGORIES.UNEXPECTED,
    userMessage: fallback.userMessage || "Something went wrong. Please try again.",
    technicalMessage: error && error.message ? error.message : String(error || "Unknown error"),
    operation: fallback.operation || "",
    entityType: fallback.entityType || "",
    entityId: fallback.entityId || "",
    context: fallback.context || {},
    requestId: fallback.requestId || "",
    cause: error || null
  });
}

module.exports = {
  AppError,
  ERROR_CATEGORIES,
  normalizeError
};
