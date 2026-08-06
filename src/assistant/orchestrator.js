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
const { landscapingIntent } = require("./landscaping-knowledge");
const { DIAGNOSTIC_TERMS, currentSeason } = require("./landscaping-diagnostics");
const { buildExecutionPlan } = require("./reasoning-planner");
const { planDashboardSearch } = require("./dashboard-search");
const { createAssistantToolBroker } = require("./tool-broker");
const {
  ExternalResearchError,
  buildSuggestedRecordUpdates,
  externalResearchFailure,
  matchInternalExternalEntities,
  planExternalResearch
} = require("./external-research");

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

function toolsForRouting(routing, resolvedEntity, searchPlan = {}) {
  const calls = [];
  if ((!searchPlan.external || searchPlan.internalRequested) && (searchPlan.searchRequested || routing.intents.includes("record_search"))) {
    calls.push({
      name: "search_records",
      input: {
        query: searchPlan.query ?? queryFromMessage(routing.message),
        entityTypes: searchPlan.entityTypes || [],
        filters: searchPlan.filters || {},
        limit: 10
      }
    });
  }
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
  if (landscapingIntent(routing.message)) {
    const selected = resolvedEntity?.record || {};
    const landscapingInput = {
      query: routing.message,
      region: selected.city || selected.region || "Portland",
      season: currentSeason(),
      propertyType: selected.propertyType || selected.type || "",
      jobType: selected.service || selected.requestedService || ""
    };
    calls.push({ name: "retrieve_landscaping_knowledge", input: landscapingInput });
    if (DIAGNOSTIC_TERMS.test(routing.message)) calls.push({ name: "diagnose_landscaping_issue", input: landscapingInput });
  }
  if (routing.intents.includes("material_calculation")) {
    calls.push({ name: "calculate_landscape_material", input: { query: routing.message } });
  }
  const transitionStage = requestedTicketStage(routing.message);
  if (transitionStage && resolvedEntity?.recordType === "ticket") {
    calls.push({ name: "transition_ticket_stage", input: { ticketId: resolvedEntity.recordId, newStage: transitionStage } });
  }
  return calls.filter((call, index, items) => items.findIndex((candidate) => candidate.name === call.name && JSON.stringify(candidate.input) === JSON.stringify(call.input)) === index);
}

function resolvedFromSearch(search) {
  if (!search?.uniqueMatch || !search.results?.length) return null;
  const result = search.results[0];
  return {
    recordType: result.entityType,
    recordId: result.id,
    displayName: result.title,
    confidence: Math.min(1, Math.max(.6, Number(result.relevanceScore || 0) / 200)),
    matchedBy: "secure_dashboard_search",
    record: result,
    alternatives: []
  };
}

async function orchestrateDashboardRequest({ message, context = {}, actor, hasPermission, searchService = null, externalResearchService = null, recentEntities = [], memories = [], toolAudit = async () => {} }) {
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
  const snapshotResolvedEntity = resolveRecord({ message, snapshot, pageContext, recentEntities });
  const baseSearchPlan = planDashboardSearch(message, pageContext);
  const researchPlan = planExternalResearch(message, {
    settings: context.externalResearchSettings || {},
    internalPlan: baseSearchPlan,
    currentDate: pageContext.currentDate
  });
  const searchPlan = {
    ...baseSearchPlan,
    external: researchPlan.requiresExternalSearch,
    internalRequested: researchPlan.requiresInternalSearch && researchPlan.requiresExternalSearch,
    searchRequested: researchPlan.requiresInternalSearch && (baseSearchPlan.searchRequested || researchPlan.requiresEntityMatching)
  };
  routing.researchIntents = researchPlan.intents;
  const permissionGuard = createPermissionGuard({ hasPermission });
  const registry = createToolRegistry({ permissionGuard });
  const broker = createAssistantToolBroker({ registry, audit: toolAudit });
  const calls = toolsForRouting(routing, snapshotResolvedEntity, searchPlan);
  const executionPlan = buildExecutionPlan({ message, routing, resolvedEntity: snapshotResolvedEntity, calls });
  const toolStartedAt = Date.now();
  const toolResultsTask = Promise.all(calls.map((call) => broker.execute({
    requestedBy: "openai",
    toolName: call.name,
    arguments: call.input,
    authenticatedUserId: actor?.userId
  }, { actor, snapshot, pageContext, searchService })));
  const externalResearchTask = researchPlan.requiresExternalSearch
    ? (externalResearchService?.search({
      authenticatedUserId: actor?.userId,
      query: researchPlan.externalQuery,
      searchType: researchPlan.searchType,
      location: context.externalResearchRequest?.location,
      dateRange: context.externalResearchRequest?.dateRange,
      preferredDomains: context.externalResearchRequest?.preferredDomains,
      excludedDomains: context.externalResearchRequest?.excludedDomains,
      officialSourcesOnly: researchPlan.settings.officialSourcesOnly,
      queryRedactions: researchPlan.queryRedactions,
      allowDirectIdentifier: true
    }) || Promise.reject(new ExternalResearchError("provider_not_configured", "External research is temporarily unavailable. Your internal Urban Yards search is still working.", 503, true)))
      .catch(externalResearchFailure)
    : Promise.resolve({ status: "not_requested", summary: "", results: [], findings: [], entityMatches: [], updateProposals: [] });
  const [toolResults, externalResearch] = await Promise.all([toolResultsTask, externalResearchTask]);
  const searchOutput = toolResults.find((result) => result.name === "search_records" && result.ok)?.output?.search || null;
  const resolvedEntity = searchOutput
    ? resolvedFromSearch(searchOutput)
    : snapshotResolvedEntity;
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
  let uiActions = planUIActions({ message, routing, resolvedEntity, citations, searchPlan });
  const searchResults = searchOutput?.results || [];
  const entityMatches = researchPlan.requiresEntityMatching
    ? matchInternalExternalEntities({ internalResults: searchResults, externalResults: externalResearch.results || [] })
    : [];
  const updateProposals = buildSuggestedRecordUpdates({
    internalResults: searchResults,
    externalResults: externalResearch.results || [],
    entityMatches,
    settings: researchPlan.settings
  });
  const research = {
    ...externalResearch,
    intent: researchPlan.primaryIntent,
    intents: researchPlan.intents,
    sourceTypes: researchPlan.requiresInternalSearch && researchPlan.requiresExternalSearch ? ["internal", "external_web"] : researchPlan.requiresExternalSearch ? ["external_web"] : ["internal"],
    entityMatches,
    updateProposals,
    settings: researchPlan.settings
  };
  const reliableMatchIds = new Set(entityMatches.filter((match) => ["confirmed", "likely"].includes(match.matchStatus)).map((match) => String(match.internalRecordId)));
  if (researchPlan.requiresEntityMatching && researchPlan.intents.includes("navigate")) {
    uiActions = uiActions.filter((action) => action.type !== "open_record" || reliableMatchIds.has(String(action.recordId)));
  }
  let clarification = searchOutput?.requiresClarification
    ? `I found ${searchResults.length} possible matches. Which one would you like?`
    : "";
  if (!clarification && researchPlan.requiresEntityMatching && researchPlan.intents.includes("navigate") && searchResults.length && !reliableMatchIds.size) {
    clarification = "I found an internal record, but the public identifiers are not strong enough to confirm it is the same organization. Choose the record or provide another identifier before I open it.";
  }
  const assistantActions = [];
  if (searchResults.length) assistantActions.push({ type: "SHOW_RESULTS", results: searchResults });
  if (research.results?.length || research.status === "failed") assistantActions.push({ type: "SHOW_RESEARCH", research });
  if (clarification) assistantActions.push({ type: "REQUEST_CLARIFICATION", message: clarification });
  uiActions.forEach((action) => assistantActions.push({
    ...action,
    type: String(action.type || "").toUpperCase()
  }));
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
    executionPlan,
    pageContext,
    resolvedEntity,
    toolResults,
    citations,
    verification,
    diagnostics,
    registeredTools: broker.definitions(),
    memoryPreview,
    transitionPreview,
    transitionAttempt,
    relevantMemory,
    uiActions,
    assistantActions,
    searchPlan,
    researchPlan,
    research,
    searchResults,
    clarification,
    modelContext: composeModelContext({ routing, executionPlan, pageContext, resolvedEntity, toolResults, verification, memories: relevantMemory, uiActions, memoryPreview, researchPlan, research })
  };
}

module.exports = { orchestrateDashboardRequest, requestedTicketStage, resolvedFromSearch, toolsForRouting };
