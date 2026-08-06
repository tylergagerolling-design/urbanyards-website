"use strict";

const REQUESTERS = new Set(["openai", "google"]);

function stableObject(value) {
  if (Array.isArray(value)) return value.map(stableObject);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableObject(value[key])]));
}

function validateValue(value, expectedType, key) {
  const valid = expectedType === "array"
    ? Array.isArray(value)
    : expectedType === "object"
      ? Boolean(value) && typeof value === "object" && !Array.isArray(value)
      : typeof value === expectedType;
  if (!valid) {
    const error = new Error(`Invalid argument ${key} for assistant tool.`);
    error.code = "TOOL_ARGUMENT_INVALID";
    throw error;
  }
}

function validateArguments(args, schema = {}) {
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    const error = new Error("Assistant tool arguments must be an object.");
    error.code = "TOOL_ARGUMENT_INVALID";
    throw error;
  }
  Object.entries(args).forEach(([key, value]) => {
    if (!Object.prototype.hasOwnProperty.call(schema, key)) {
      const error = new Error(`Unsupported argument ${key} for assistant tool.`);
      error.code = "TOOL_ARGUMENT_INVALID";
      throw error;
    }
    if (value !== undefined) validateValue(value, schema[key], key);
  });
  return true;
}

function createAssistantToolBroker({ registry, audit = async () => {} } = {}) {
  if (!registry || typeof registry.execute !== "function" || typeof registry.definitions !== "function") {
    throw new Error("Assistant tool broker requires the application tool registry.");
  }
  const definitions = new Map(registry.definitions().map((definition) => [definition.name, definition]));
  const inFlight = new Map();
  return {
    definitions: () => [...definitions.values()],
    async execute(request = {}, runtime = {}) {
      const requestedBy = String(request.requestedBy || "");
      if (!REQUESTERS.has(requestedBy)) {
        const error = new Error("Assistant tool requester is not approved.");
        error.code = "TOOL_REQUESTER_INVALID";
        throw error;
      }
      const actorId = String(runtime.actor?.userId || "");
      if (!actorId || actorId !== String(request.authenticatedUserId || "")) {
        const error = new Error("Assistant tool user identity does not match the authenticated session.");
        error.code = "TOOL_IDENTITY_MISMATCH";
        throw error;
      }
      const definition = definitions.get(request.toolName);
      if (!definition) {
        const error = new Error("Assistant tool is not approved.");
        error.code = "TOOL_NOT_FOUND";
        throw error;
      }
      validateArguments(request.arguments || {}, definition.inputSchema || {});
      const key = JSON.stringify({ toolName: request.toolName, arguments: stableObject(request.arguments || {}) });
      if (inFlight.has(key)) return inFlight.get(key);
      const execution = (async () => {
        const startedAt = Date.now();
        try {
          await audit({ requestedBy, toolName: request.toolName, actorId, argumentKeys: Object.keys(request.arguments || {}), status: "started" });
        } catch (_) { /* Audit outages must not expose data or bypass the registry. */ }
        const result = await registry.execute(request.toolName, request.arguments || {}, runtime);
        try {
          await audit({ requestedBy, toolName: request.toolName, actorId, status: result.ok ? "completed" : "failed", code: result.code || "", latencyMs: Date.now() - startedAt });
        } catch (_) { /* The normalized tool result remains available during audit outages. */ }
        return result;
      })();
      inFlight.set(key, execution);
      return execution;
    }
  };
}

module.exports = { REQUESTERS, createAssistantToolBroker, stableObject, validateArguments };
