"use strict";

const { routeIntent } = require("./intent-router");
const { sanitizePageContext } = require("./page-context");
const { createPermissionGuard } = require("./permission-guard");
const { resolveRecord } = require("./record-resolver");
const { composeModelContext } = require("./response-composer");
const { createToolRegistry } = require("./tool-registry");
const { verifyAssistantResult } = require("./verification-service");
const { correctionPreview, relevantMemories, toModelMemory } = require("./memory-service");
const { planUIActions } = require("./ui-action-planner");

function queryFromMessage(message) {
  return String(message || "")
    .replace(/\b(find|search|show|locate|pull up|open|all|records?)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function requestedTicketStage(message) {
  const match = String(message || "").match(/\b(?:move|transition|advance|push)\b[\s\S]*?\bto\s+([a-z][a-z _-]{1,60})\s*[.!?]?$/i);
  return match?.[1]?.trim() || "";
}

function toolsForRouting(routing, resolvedEntity) {
  const calls = [];
  if (routing.intents.includes("record_search")) calls.push({ name: "search_records", input: { query: queryFromMessage(routing.message) } });
  if (routing.intents.includes("analysis") && /\b(blocked|missing|complete|ready)\b/i.test(routing.message)) calls.push({ name: "find_blocked_tickets", input: {} });
  if (/\b(attention|today|urgent|priority|falls through)\b/i.test(routing.message)) calls.push({ name: "get_attention_items", input: {} });
  if (/\b(unpaid|outstanding|receivable)\b/i.test(routing.message) && /\binvoices?\b/i.test(routing.message)) calls.push({ name: "find_unpaid_invoices", input: {} });
  if (/\b(completed|finished)\b/i.test(routing.message) && /\b(uninvoiced|not (?:yet )?(?:been )?invoiced|without an invoice)\b/i.test(routing.message)) calls.push({ name: "find_completed_uninvoiced_work", input: {} });
  if (resolvedEntity?.recordType === "ticket") calls.push({ name: "get_ticket_details", input: { recordId: resolvedEntity.recordId } });
  if (resolvedEntity?.record && /\b(related|relationship|history|everything about|connected)\b/i.test(routing.message)) {
    calls.push({ name: "map_record_relationships", input: { recordType: resolvedEntity.recordType, record: resolvedEntity.record } });
  }
  if (resolvedEntity?.recordType === "ticket" && /\b(ready|readiness|complete|completion|missing|close|closeout)\b/i.test(routing.message)) {
    calls.push({ name: "assess_ticket_readiness", input: { ticket: resolvedEntity.record } });
  }
  if (/\b(schedule|scheduling|calendar|conflict|availability|route|weather)\b/i.test(routing.message)) calls.push({ name: "analyze_schedule", input: {} });
  if (/\b(document|documents|form|forms|proof|receipt|contract|attachment)\b/i.test(routing.message)) calls.push({ name: "analyze_documents", input: { record: resolvedEntity?.record || null } });
  if (/\b(learn|estimate|estimated|actual|variance|future price|future quote)\b/i.test(routing.message) && /\b(job|jobs|work|cost|pricing|estimate|quote)\b/i.test(routing.message)) calls.push({ name: "learn_from_completed_work", input: {} });
  if (/\b(lead|leads|prospect|follow.?up|next touch|conversion)\b/i.test(routing.message) && /\b(next|priority|recommend|overdue|insight|analy|who)\b/i.test(routing.message)) calls.push({ name: "analyze_lead_next_actions", input: {} });
  if (/\b(proactive|risk|risks|what needs attention|falling through|missing across|operations check)\b/i.test(routing.message)) calls.push({ name: "detect_operational_risks", input: {} });
  const transitionStage = requestedTicketStage(routing.message);
  if (transitionStage && resolvedEntity?.recordType === "ticket") {
    calls.push({ name: "transition_ticket_stage", input: { ticketId: resolvedEntity.recordId, newStage: transitionStage } });
  }
  return calls.filter((call, index, items) => items.findIndex((candidate) => candidate.name === call.name && JSON.stringify(candidate.input) === JSON.stringify(call.input)) === index);
}

async function orchestrateDashboardRequest({ message, context = {}, actor, hasPermission, recentEntities = [], memories = [] }) {
  const startedAt = Date.now();
  const routed = routeIntent(message);
  const routing = { ...routed, message: String(message || "") };
  const pageContext = sanitizePageContext(context.pageContext || context, actor);
  const snapshot = {
    priorityActions: context.priorityActions || [],
    tickets: context.tickets || [],
    clients: context.clients || [],
    leads: context.leads || [],
    jobs: context.jobs || [],
    properties: context.properties || [],
    invoices: context.invoices || [],
    expenses: context.expenses || [],
    documents: context.documents || []
  };
  const resolvedEntity = resolveRecord({ message, snapshot, pageContext, recentEntities });
  const permissionGuard = createPermissionGuard({ hasPermission });
  const registry = createToolRegistry({ permissionGuard });
  const calls = toolsForRouting(routing, resolvedEntity);
  const toolStartedAt = Date.now();
  const toolResults = await Promise.all(calls.map((call) => registry.execute(call.name, call.input, { actor, snapshot, pageContext })));
  const citations = [];
  const seen = new Set();
  toolResults.filter((result) => result.ok).flatMap((result) => result.output?.citations || []).forEach((citation) => {
    const key = `${citation.recordType}:${citation.recordId}`;
    if (!seen.has(key)) {
      seen.add(key);
      citations.push(citation);
    }
  });
  const verification = verifyAssistantResult({
    toolResults,
    citations,
    intent: routing.primaryIntent,
    requiresWritePreview: routing.requiresWritePreview
  });
  const memoryPreview = correctionPreview(message, pageContext);
  const conversationMemories = (context.conversationMemories || []).slice(-20).map((memory, index) => ({
    id: memory.id || `conversation-${index}`,
    memory_type: "conversation",
    statement: String(memory.statement || "").slice(0, 2000),
    scope: memory.scope || { userId: actor?.userId },
    source: memory.source || "user_correction",
    confidence: memory.confidence || "medium",
    expires_at: memory.expiresAt,
    is_active: memory.isActive !== false
  })).filter((memory) => memory.statement);
  const relevantMemory = relevantMemories([...memories, ...conversationMemories], { actor, pageContext, resolvedEntity }).map(toModelMemory);
  const uiActions = planUIActions({ message, routing, resolvedEntity, citations });
  const transitionResult = toolResults.find((result) => result.name === "transition_ticket_stage") || null;
  const transitionPreview = transitionResult?.ok ? transitionResult.output?.preview || null : null;
  const transitionAttempt = transitionResult ? {
    ticketId: resolvedEntity?.recordId || "",
    currentStage: (snapshot.tickets || []).find((ticket) => String(ticket.id) === String(resolvedEntity?.recordId || ""))?.stage || "",
    requestedStage: requestedTicketStage(message),
    outcome: transitionResult.ok ? "preview_ready" : (transitionResult.code === "TICKET_STAGE_TRANSITION_DENIED" || transitionResult.code === "PERMISSION_DENIED" ? "permission_denied" : "invalid"),
    error: transitionResult.ok ? "" : transitionResult.error,
    code: transitionResult.ok ? "" : transitionResult.code
  } : null;
  const diagnostics = {
    intentRoutingMs: toolStartedAt - startedAt,
    recordResolutionMs: 0,
    toolExecutionMs: Date.now() - toolStartedAt,
    totalOrchestrationMs: Date.now() - startedAt,
    toolFailures: toolResults.filter((result) => !result.ok).length,
    retries: 0,
    contextRecords: Object.values(snapshot).reduce((total, value) => total + (Array.isArray(value) ? value.length : 0), 0)
  };
  return {
    routing,
    pageContext,
    resolvedEntity,
    toolResults,
    citations,
    verification,
    diagnostics,
    registeredTools: registry.definitions(),
    memoryPreview,
    transitionPreview,
    transitionAttempt,
    relevantMemory,
    uiActions,
    modelContext: composeModelContext({ routing, pageContext, resolvedEntity, toolResults, verification, memories: relevantMemory, uiActions, memoryPreview })
  };
}

module.exports = { orchestrateDashboardRequest, requestedTicketStage, toolsForRouting };
