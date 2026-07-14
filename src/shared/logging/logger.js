"use strict";

const SENSITIVE_KEYS = new Set([
  "apikey",
  "api_key",
  "authorization",
  "cookie",
  "password",
  "secret",
  "service_role",
  "token"
]);

function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => {
    const normalized = key.toLowerCase().replace(/[^a-z0-9_]/g, "_");
    return [key, SENSITIVE_KEYS.has(normalized) || normalized.includes("secret") || normalized.includes("token") ? "[redacted]" : redact(item)];
  }));
}

function createLogger({ sink = console, environment = process.env.NODE_ENV || "development" } = {}) {
  function write(level, fields = {}) {
    const entry = redact({
      timestamp: new Date().toISOString(),
      level,
      environment,
      ...fields
    });
    const method = level === "error" ? "error" : level === "warning" ? "warn" : "log";
    sink[method]?.(JSON.stringify(entry));
    return entry;
  }

  return {
    debug: (fields) => environment === "production" ? null : write("debug", fields),
    info: (fields) => write("info", fields),
    warning: (fields) => write("warning", fields),
    error: (fields) => write("error", fields)
  };
}

module.exports = {
  createLogger,
  redact
};
