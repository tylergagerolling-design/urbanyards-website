"use strict";

const MEMORY_TYPES = new Set(["conversation", "record", "business_rule", "user_preference", "outcome"]);
const MEMORY_SOURCES = new Set(["user_correction", "approved_rule", "record", "outcome"]);
const CONFIDENCE_LEVELS = new Set(["low", "medium", "high"]);
const SCOPE_KEYS = new Set(["userId", "clientId", "propertyId", "ticketId", "serviceType"]);

function clean(value, max = 1000) {
  return String(value || "").trim().slice(0, max);
}

function sanitizeScope(scope = {}) {
  return Object.fromEntries(Object.entries(scope)
    .filter(([key, value]) => SCOPE_KEYS.has(key) && clean(value, 160))
    .map(([key, value]) => [key, clean(value, 160)]));
}

function normalizeMemory(input = {}, actor = {}) {
  const memoryType = MEMORY_TYPES.has(input.memoryType) ? input.memoryType : "conversation";
  const source = MEMORY_SOURCES.has(input.source) ? input.source : "user_correction";
  const confidence = CONFIDENCE_LEVELS.has(input.confidence) ? input.confidence : "medium";
  const statement = clean(input.statement, 2000);
  if (!statement) throw new Error("Memory statement is required.");
  return {
    ...(input.id ? { id: clean(input.id, 100) } : {}),
    memory_type: memoryType,
    statement,
    scope: sanitizeScope(input.scope),
    source,
    confidence,
    approved_by: input.approvedBy ? clean(input.approvedBy, 160) : (memoryType === "conversation" ? null : clean(actor.userId || actor.email, 160)),
    expires_at: input.expiresAt || (memoryType === "conversation" ? new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString() : null),
    is_active: input.isActive !== false,
    updated_at: new Date().toISOString()
  };
}

function relevantMemories(memories = [], { actor = {}, pageContext = {}, resolvedEntity = null } = {}) {
  const now = Date.now();
  const selectedType = resolvedEntity?.recordType || pageContext.selectedRecordType || "";
  const selectedId = resolvedEntity?.recordId || pageContext.selectedRecordId || "";
  return memories.filter((memory) => {
    if (!memory?.is_active) return false;
    if (memory.expires_at && Date.parse(memory.expires_at) <= now) return false;
    const scope = memory.scope || {};
    if (scope.userId && String(scope.userId) !== String(actor.userId || "")) return false;
    const scopedPairs = [
      ["clientId", "client"], ["propertyId", "property"], ["ticketId", "ticket"]
    ];
    const recordScoped = scopedPairs.filter(([key]) => scope[key]);
    if (recordScoped.length && !recordScoped.some(([key, type]) => type === selectedType && String(scope[key]) === String(selectedId))) return false;
    return true;
  }).slice(0, 30);
}

function correctionPreview(message, pageContext = {}) {
  const value = clean(message, 1400);
  const correction = value.match(/\b(.+?)\s+(?:is|belongs to|should be)\s+(.+?),?\s+not\s+(.+?)[.!]?$/i);
  if (!correction) return null;
  const statement = `${clean(correction[1], 300)} is ${clean(correction[2], 300)}, not ${clean(correction[3], 300)}.`;
  const scope = {};
  if (pageContext.selectedRecordType && pageContext.selectedRecordId) {
    const keyByType = { ticket: "ticketId", job: "ticketId", client: "clientId", property: "propertyId" };
    const scopeKey = keyByType[pageContext.selectedRecordType];
    if (scopeKey) scope[scopeKey] = pageContext.selectedRecordId;
  }
  return { statement, scope, confidence: "high", source: "user_correction" };
}

function toModelMemory(memory = {}) {
  return {
    id: memory.id,
    memoryType: memory.memory_type,
    statement: memory.statement,
    scope: memory.scope || {},
    confidence: memory.confidence,
    source: memory.source
  };
}

module.exports = {
  CONFIDENCE_LEVELS,
  MEMORY_SOURCES,
  MEMORY_TYPES,
  correctionPreview,
  normalizeMemory,
  relevantMemories,
  sanitizeScope,
  toModelMemory
};
