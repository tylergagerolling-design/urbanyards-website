"use strict";

function ok(data = null, context = {}) {
  return {
    success: true,
    data,
    error: null,
    errorCode: null,
    context
  };
}

function fail(error, context = {}) {
  const normalized = typeof error === "string" ? { message: error } : (error || {});
  return {
    success: false,
    data: null,
    error: normalized.message || "Operation failed.",
    errorCode: normalized.code || normalized.errorCode || "APP_ERROR",
    context: {
      ...context,
      ...(normalized.context || {})
    }
  };
}

function isSuccess(result) {
  return Boolean(result && result.success === true);
}

function isFailure(result) {
  return Boolean(result && result.success === false);
}

module.exports = {
  ok,
  fail,
  isSuccess,
  isFailure
};
