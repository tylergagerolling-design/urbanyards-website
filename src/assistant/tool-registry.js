"use strict";

const { flattenSnapshot, normalize } = require("./record-resolver");
const { recordReference } = require("./types");
const { TICKET_STAGE_LABELS } = require("../features/tickets/types/ticket-stage");
const { transitionTicketStage } = require("../features/tickets/services/ticket-workflow-service");
const {
  assessTicketReadiness, completedWorkLearning, documentInsights, leadInsights,
  proactiveRisks, relationshipMap, scheduleInsights
} = require("./intelligence-service");
const { retrieveLandscapingKnowledge } = require("./landscaping-knowledge");
const { diagnoseLandscapingIssue } = require("./landscaping-diagnostics");
const { calculateLandscapeMaterial } = require("./calculators");

function timeout(promise, timeoutMs, toolName) {
  let timer;
  return Promise.race([
    Promise.resolve(promise),
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        const error = new Error(`${toolName} timed out. You can retry this read without changing records.`);
        error.code = "TOOL_TIMEOUT";
        reject(error);
      }, timeoutMs);
    })
  ]).finally(() => clearTimeout(timer));
}

function routeFor(recordType) {
  return ({
    ticket: "#tickets", job: "#calendar", lead: "#outreach", client: "#contacts", property: "#contacts",
    invoice: "#documents", expense: "#documents", document: "#documentation"
  })[recordType] || "#overview";
}

function toReference(recordType, record) {
  return recordReference({
    recordType,
    recordId: record.id,
    displayId: record.number,
    title: record.number || record.title || record.name || record.property || record.site || record.vendor || "Record",
    route: routeFor(recordType)
  });
}

async function searchRecords({ query, snapshot, limit = 10, entityTypes = [], filters = {}, actor, pageContext, searchService }) {
  if (searchService?.search) {
    const search = await searchService.search({ actor, query, entityTypes, filters, limit, pageContext });
    const citations = search.results.map((result) => recordReference({
      recordType: result.entityType,
      recordId: result.id,
      displayId: result.title,
      title: result.subtitle || result.title,
      route: result.route
    }));
    return {
      summary: `${search.totalResults} matching records`,
      records: search.results,
      citations,
      search,
      partial: search.partial
    };
  }
  const words = normalize(query).split(" ").filter((word) => word.length > 2);
  const results = flattenSnapshot(snapshot).map(({ recordType, record }) => {
    const haystack = normalize(Object.values(record).flat(2).filter((value) => typeof value !== "object").join(" "));
    const score = words.reduce((total, word) => total + (haystack.includes(word) ? 1 : 0), 0);
    return { recordType, record, score };
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
  return {
    summary: `${results.length} matching records`,
    records: results.map(({ recordType, record, score }) => ({
      ...toReference(recordType, record),
      relevanceScore: score,
      subtitle: [record.client, record.customer, record.property, record.company, record.stage, record.status].filter(Boolean).join(" / ")
    })),
    citations: results.map(({ recordType, record }) => toReference(recordType, record)),
    partial: false
  };
}

function findBlockedTickets({ snapshot, limit = 12 }) {
  const tickets = (snapshot.tickets || []).filter((ticket) => {
    const blockers = Array.isArray(ticket.blockers) ? ticket.blockers : [];
    return blockers.length || ticket.stage === "Paused" || ticket.stage === "Needs Owner Approval";
  }).slice(0, limit);
  return {
    summary: `${tickets.length} blocked tickets`,
    records: tickets.map((ticket) => ({
      ...toReference("ticket", ticket),
      blockers: ticket.blockers || [],
      stage: ticket.stage,
      nextAction: ticket.nextAction
    })),
    citations: tickets.map((ticket) => toReference("ticket", ticket)),
    partial: false
  };
}

function getAttentionItems({ snapshot, limit = 12 }) {
  const actions = Array.isArray(snapshot.priorityActions) ? snapshot.priorityActions.slice(0, limit) : [];
  return {
    summary: `${actions.length} priority actions`,
    records: actions,
    citations: actions.filter((item) => item.id).map((item) => recordReference({
      recordType: item.type || "record",
      recordId: item.id,
      displayId: item.number,
      title: item.title || item.status || item.number || "Priority item",
      route: routeFor(item.type)
    })),
    partial: false
  };
}

function getTicketDetails({ recordId, snapshot }) {
  const ticket = (snapshot.tickets || []).find((item) => String(item.id) === String(recordId));
  if (!ticket) return { summary: "Ticket was not present in the available context.", records: [], citations: [], partial: true };
  return {
    summary: `Details for ${ticket.number || ticket.title || "ticket"}`,
    records: [ticket],
    citations: [toReference("ticket", ticket)],
    partial: false
  };
}

const NAVIGATION_ROUTES = new Set([
  "overview", "tickets", "calendar", "route-planner", "outreach", "call-queue",
  "documents", "contacts", "equipment", "documentation", "import-export",
  "groundskeeper-ai", "ai-memory", "settings"
]);

const DASHBOARD_RECORD_TYPES = new Set([
  "ticket", "job", "lead", "client", "property", "contact", "quote", "invoice",
  "payment", "expense", "schedule", "worker", "work_note", "call_queue", "document",
  "photo", "form", "activity"
]);

function safeSnapshotRecord(recordType, record) {
  return {
    ...toReference(recordType, record),
    status: record.status || record.stage || undefined,
    date: record.date || record.updated_at || record.created_at || undefined,
    amount: Number.isFinite(Number(record.amount)) ? Number(record.amount) : undefined
  };
}

async function getDashboardRecord({ recordType, recordId, snapshot, actor, pageContext, searchService }) {
  const type = normalize(recordType).replace(/\s+/g, "_");
  const id = String(recordId || "").trim();
  if (!DASHBOARD_RECORD_TYPES.has(type)) {
    const error = new Error("A valid dashboard record type is required.");
    error.code = "RECORD_TYPE_INVALID";
    throw error;
  }
  if (!/^[-a-zA-Z0-9._:]{1,180}$/.test(id)) {
    const error = new Error("A valid dashboard record ID is required.");
    error.code = "RECORD_ID_INVALID";
    throw error;
  }
  if (searchService?.search) {
    const search = await searchService.search({ actor, query: "", entityTypes: [type], filters: { recordId: id }, limit: 2, pageContext });
    const record = (search.results || []).find((item) => item.entityType === type && String(item.id) === id);
    if (!record) {
      if (search.deniedEntityTypes?.includes(type)) {
        const error = new Error("You do not have permission to view that dashboard record.");
        error.code = "RECORD_PERMISSION_DENIED";
        throw error;
      }
      return { summary: "The dashboard record was not found.", records: [], citations: [], notFound: true, partial: false, search };
    }
    return {
      summary: `Retrieved ${record.title || `${type} record`}`,
      records: [record],
      citations: [recordReference({ recordType: type, recordId: record.id, displayId: record.title, title: record.subtitle || record.title, route: record.route })],
      notFound: false,
      partial: Boolean(search.partial),
      search
    };
  }
  const match = flattenSnapshot(snapshot).find((item) => item.recordType === type && String(item.record?.id) === id);
  if (!match) return { summary: "The dashboard record was not found.", records: [], citations: [], notFound: true, partial: false };
  const record = safeSnapshotRecord(type, match.record);
  return { summary: `Retrieved ${record.title}`, records: [record], citations: [record], notFound: false, partial: false };
}

async function navigateDashboard({ route, recordType, recordId, snapshot, actor, pageContext, searchService }) {
  const normalizedRoute = String(route || "").trim().replace(/^#/, "");
  if (normalizedRoute && !NAVIGATION_ROUTES.has(normalizedRoute)) {
    const error = new Error("That dashboard destination is not registered.");
    error.code = "NAVIGATION_ROUTE_INVALID";
    throw error;
  }
  if (recordType || recordId) {
    const recordResult = await getDashboardRecord({ recordType, recordId, snapshot, actor, pageContext, searchService });
    if (recordResult.notFound) {
      const error = new Error("I found the reference, but the dashboard record no longer exists or is not available to you.");
      error.code = "NAVIGATION_RECORD_NOT_FOUND";
      throw error;
    }
    const record = recordResult.records[0];
    return {
      summary: `Validated navigation to ${record.title}`,
      navigation: { type: "open_record", recordType: record.entityType || recordType, recordId: record.id || recordId, route: String(record.route || routeFor(recordType)).replace(/^#/, "") },
      records: recordResult.records,
      citations: recordResult.citations,
      partial: recordResult.partial
    };
  }
  if (!normalizedRoute) {
    const error = new Error("A registered dashboard destination is required.");
    error.code = "NAVIGATION_ROUTE_REQUIRED";
    throw error;
  }
  return { summary: `Validated navigation to ${normalizedRoute}`, navigation: { type: "navigate", route: normalizedRoute }, records: [], citations: [], partial: false };
}

async function findUnpaidInvoices({ snapshot, limit = 20, actor, pageContext, searchService }) {
  if (searchService?.search) {
    const search = await searchService.search({
      actor,
      query: "",
      entityTypes: ["invoice"],
      filters: { financialStatus: "unpaid" },
      limit,
      pageContext
    });
    const totalOutstanding = Number(search.summary?.totalAmount || 0);
    return {
      summary: `${search.totalResults} unpaid invoices totaling ${totalOutstanding.toFixed(2)}`,
      calculation: { count: search.totalResults, totalOutstanding, currency: "USD", source: "permission-scoped invoice balance" },
      records: search.results,
      citations: search.results.map((invoice) => recordReference({
        recordType: "invoice",
        recordId: invoice.id,
        displayId: invoice.title,
        title: invoice.subtitle || invoice.title,
        route: invoice.route
      })),
      search,
      partial: search.partial
    };
  }
  const invoices = (snapshot.invoices || []).filter((invoice) => {
    const status = normalize(invoice.status);
    return !["paid", "void", "cancelled", "canceled"].includes(status) && Number(invoice.balance ?? invoice.total ?? 0) > 0;
  }).slice(0, limit);
  const totalOutstanding = invoices.reduce((total, invoice) => total + Number(invoice.balance ?? invoice.total ?? 0), 0);
  return {
    summary: `${invoices.length} unpaid invoices totaling ${totalOutstanding.toFixed(2)}`,
    calculation: { totalOutstanding, currency: "USD", source: "invoice balance, falling back to total" },
    records: invoices.map((invoice) => ({ ...toReference("invoice", invoice), status: invoice.status, balance: Number(invoice.balance ?? invoice.total ?? 0) })),
    citations: invoices.map((invoice) => toReference("invoice", invoice)),
    partial: false
  };
}

function findCompletedUninvoicedWork({ snapshot, limit = 20 }) {
  const tickets = (snapshot.tickets || []).filter((ticket) => {
    const stage = normalize(ticket.stage);
    return ["field work complete", "completion review", "closed", "completed"].includes(stage) && !ticket.invoiceFinalized;
  }).slice(0, limit);
  const totalValue = tickets.reduce((total, ticket) => total + Number(ticket.finalRevenue || ticket.expectedRevenue || ticket.proposedPrice || 0), 0);
  const missingValueCount = tickets.filter((ticket) => !Number(ticket.finalRevenue || ticket.expectedRevenue || ticket.proposedPrice || 0)).length;
  return {
    summary: `${tickets.length} completed uninvoiced tickets with ${totalValue.toFixed(2)} in known value`,
    calculation: { totalValue, currency: "USD", missingValueCount, source: "final revenue, expected revenue, then proposed price" },
    records: tickets.map((ticket) => ({ ...toReference("ticket", ticket), stage: ticket.stage, knownValue: Number(ticket.finalRevenue || ticket.expectedRevenue || ticket.proposedPrice || 0) })),
    citations: tickets.map((ticket) => toReference("ticket", ticket)),
    partial: missingValueCount > 0
  };
}

function resolveTicketStage(value) {
  const normalized = normalize(value).replace(/\s+/g, "_");
  if (Object.prototype.hasOwnProperty.call(TICKET_STAGE_LABELS, normalized)) return normalized;
  const labelMatch = Object.entries(TICKET_STAGE_LABELS).find(([, label]) => normalize(label) === normalize(value));
  return labelMatch?.[0] || "";
}

function previewTicketStageTransition({ ticketId, newStage, snapshot, actor }) {
  const ticket = (snapshot.tickets || []).find((item) => String(item.id) === String(ticketId));
  if (!ticket) {
    const error = new Error("The requested ticket was not found in the permitted dashboard records.");
    error.code = "TICKET_NOT_FOUND";
    throw error;
  }
  if (ticket.source !== "ticket" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(ticket.id || ""))) {
    const error = new Error("Only canonical job tickets can be moved by The Lawnmower Man.");
    error.code = "TICKET_NOT_CANONICAL";
    throw error;
  }
  const target = resolveTicketStage(newStage);
  if (!target) {
    const error = new Error("The requested ticket stage is not supported.");
    error.code = "TICKET_STAGE_INVALID";
    throw error;
  }
  const result = transitionTicketStage({ user: actor, ticket, toStage: target, correlationId: "assistant-preview" });
  if (!result.success) {
    const error = new Error(result.error || "That ticket stage transition is not allowed.");
    error.code = result.errorCode || "TICKET_STAGE_TRANSITION_INVALID";
    error.context = result.context || {};
    throw error;
  }
  return {
    summary: `${ticket.number || ticket.title || "Ticket"} can move from ${TICKET_STAGE_LABELS[ticket.stage] || ticket.stage} to ${TICKET_STAGE_LABELS[target] || target} after explicit approval.`,
    preview: {
      action: "transition_ticket_stage",
      ticketId: ticket.id,
      ticketNumber: ticket.number || "",
      ticketTitle: ticket.title || "",
      currentStage: ticket.stage,
      currentStageLabel: TICKET_STAGE_LABELS[ticket.stage] || ticket.stage,
      newStage: target,
      newStageLabel: TICKET_STAGE_LABELS[target] || target,
      auditEvent: result.context.auditEvent
    },
    records: [{ ...toReference("ticket", ticket), stage: ticket.stage }],
    citations: [toReference("ticket", ticket)],
    partial: false
  };
}

function createToolRegistry({ permissionGuard }) {
  const definitions = new Map();
  const register = (tool) => {
    if (!tool?.name || typeof tool.execute !== "function") throw new Error("Invalid assistant tool definition.");
    definitions.set(tool.name, Object.freeze({ timeoutMs: 2500, classification: "read", requiresConfirmation: false, ...tool }));
  };
  register({ name: "search_dashboard", description: "Search authenticated, permission-scoped dashboard records through the secure server search layer.", requiredPermission: "dashboard:read", inputSchema: { query: "string", entityTypes: "array", filters: "object", limit: "number" }, outputSchema: { records: "array", citations: "array", search: "object" }, execute: searchRecords });
  register({ name: "search_records", description: "Compatibility alias for the authenticated dashboard search.", requiredPermission: "dashboard:read", inputSchema: { query: "string", entityTypes: "array", filters: "object", limit: "number" }, outputSchema: { records: "array", citations: "array", search: "object" }, execute: searchRecords });
  register({ name: "get_dashboard_record", description: "Retrieve one identified, permission-scoped dashboard record by real type and ID.", requiredPermission: "dashboard:read", inputSchema: { recordType: "string", recordId: "string" }, outputSchema: { records: "array", citations: "array", notFound: "boolean" }, execute: getDashboardRecord });
  register({ name: "navigate_dashboard", description: "Validate an existing dashboard route or identified record before the client performs navigation.", requiredPermission: "dashboard:read", inputSchema: { route: "string", recordType: "string", recordId: "string" }, outputSchema: { navigation: "object", records: "array", citations: "array" }, execute: navigateDashboard });
  register({ name: "find_blocked_tickets", description: "Find tickets with explicit workflow blockers.", requiredPermission: "tickets:read", inputSchema: {}, outputSchema: { records: "array", citations: "array" }, execute: findBlockedTickets });
  register({ name: "get_attention_items", description: "Return deterministic priority items already calculated by the dashboard.", requiredPermission: "dashboard:read", inputSchema: {}, outputSchema: { records: "array", citations: "array" }, execute: getAttentionItems });
  register({ name: "get_ticket_details", description: "Get one resolved ticket from the permitted context.", requiredPermission: "tickets:read", inputSchema: { recordId: "string" }, outputSchema: { records: "array", citations: "array" }, execute: getTicketDetails });
  register({ name: "find_unpaid_invoices", description: "Find unpaid invoices and calculate their known outstanding balance.", requiredPermission: "invoices:read", inputSchema: {}, outputSchema: { records: "array", calculation: "object", citations: "array" }, execute: findUnpaidInvoices });
  register({ name: "find_completed_uninvoiced_work", description: "Find completed work without a finalized invoice and total known value.", requiredPermission: "tickets:read", inputSchema: {}, outputSchema: { records: "array", calculation: "object", citations: "array" }, execute: findCompletedUninvoicedWork });
  register({ name: "map_record_relationships", description: "Map authorized records related to the selected client, property, lead, ticket, invoice, expense, or document.", requiredPermission: "dashboard:read", inputSchema: { recordType: "string", record: "object" }, outputSchema: { records: "array", calculation: "object", citations: "array" }, execute: relationshipMap });
  register({ name: "assess_ticket_readiness", description: "Check every tracked ticket requirement and explain what is complete, missing, or marked N/A.", requiredPermission: "tickets:read", inputSchema: { ticket: "object" }, outputSchema: { records: "array", calculation: "object", evidence: "array", missingInformation: "array", citations: "array" }, execute: assessTicketReadiness });
  register({ name: "analyze_schedule", description: "Review authorized scheduled work for time conflicts and missing assignments without inventing travel or weather.", requiredPermission: "tickets:read", inputSchema: {}, outputSchema: { records: "array", conflicts: "array", calculation: "object", citations: "array" }, execute: scheduleInsights });
  register({ name: "analyze_documents", description: "Review related document metadata and extracted content availability, identifying incomplete records.", requiredPermission: "dashboard:read", inputSchema: { record: "object" }, outputSchema: { records: "array", missingInformation: "array", citations: "array" }, execute: documentInsights });
  register({ name: "learn_from_completed_work", description: "Compare completed-job estimated and actual costs to support better future estimates.", requiredPermission: "tickets:read", inputSchema: {}, outputSchema: { records: "array", calculation: "object", citations: "array" }, execute: completedWorkLearning });
  register({ name: "analyze_lead_next_actions", description: "Rank active leads using follow-up timing and record completeness, then recommend the next touch.", requiredPermission: "leads:read", inputSchema: {}, outputSchema: { records: "array", recommendation: "string", citations: "array" }, execute: leadInsights });
  register({ name: "detect_operational_risks", description: "Proactively identify blocked tickets, unpaid invoices, and documents needing review.", requiredPermission: "dashboard:read", inputSchema: {}, outputSchema: { records: "array", calculation: "object" }, execute: proactiveRisks });
  register({ name: "retrieve_landscaping_knowledge", description: "Retrieve ranked approved landscaping, regional, company, and safety records.", requiredPermission: "dashboard:read", inputSchema: { query: "string", region: "string", season: "string", propertyType: "string", jobType: "string" }, outputSchema: { records: "array", citations: "array", contextBoundaries: "object" }, execute: retrieveLandscapingKnowledge });
  register({ name: "diagnose_landscaping_issue", description: "Build a cautious symptom assessment with alternatives, missing observations, contradictions, confidence, safety, and escalation conditions.", requiredPermission: "dashboard:read", inputSchema: { query: "string", region: "string", season: "string", propertyType: "string", jobType: "string" }, outputSchema: { records: "array", citations: "array", conflictingEvidence: "array", requiredObservations: "array", confidence: "string" }, execute: diagnoseLandscapingIssue });
  register({ name: "calculate_landscape_material", description: "Calculate mulch, soil, or gravel volume only from supplied area and depth measurements.", requiredPermission: "dashboard:read", inputSchema: { query: "string", material: "string", areaSquareFeet: "number", depthInches: "number", contingencyPercent: "number" }, outputSchema: { inputs: "object", assumptions: "array", formula: "string", result: "object", contingency: "object", missingInformation: "array" }, execute: calculateLandscapeMaterial });
  register({
    name: "transition_ticket_stage",
    description: "Validate and preview one legal ticket stage transition. Execution requires explicit button approval.",
    requiredPermission: "tickets:read",
    classification: "write",
    requiresConfirmation: true,
    inputSchema: { ticketId: "string", newStage: "string" },
    outputSchema: { preview: "object", records: "array", citations: "array" },
    preview: previewTicketStageTransition,
    execute: previewTicketStageTransition
  });
  return {
    definitions: () => [...definitions.values()].map(({ execute, ...definition }) => definition),
    async execute(name, input, runtime) {
      const tool = definitions.get(name);
      if (!tool) {
        const error = new Error(`The Lawnmower Man does not have a registered tool named ${name}.`);
        error.code = "TOOL_NOT_FOUND";
        throw error;
      }
      const startedAt = Date.now();
      try {
        permissionGuard.assert(runtime.actor, tool.requiredPermission);
        if (tool.classification !== "read") {
          if (!tool.requiresConfirmation || typeof tool.preview !== "function") {
            const error = new Error(`${name} is not permitted to change records without a registered approval preview.`);
            error.code = "CONFIRMATION_REQUIRED";
            throw error;
          }
          const output = await timeout(tool.preview({ ...input, snapshot: runtime.snapshot, pageContext: runtime.pageContext, actor: runtime.actor, searchService: runtime.searchService }), tool.timeoutMs, name);
          return { name, ok: true, output, previewOnly: true, requiresConfirmation: true, latencyMs: Date.now() - startedAt };
        }
        const output = await timeout(tool.execute({ ...input, snapshot: runtime.snapshot, pageContext: runtime.pageContext, actor: runtime.actor, searchService: runtime.searchService }), tool.timeoutMs, name);
        return { name, ok: true, output, latencyMs: Date.now() - startedAt };
      } catch (error) {
        return {
          name,
          ok: false,
          error: error.message,
          code: error.code || (error.statusCode === 403 ? "PERMISSION_DENIED" : "TOOL_ERROR"),
          latencyMs: Date.now() - startedAt
        };
      }
    }
  };
}

module.exports = { createToolRegistry, findCompletedUninvoicedWork, findUnpaidInvoices, getAttentionItems, getDashboardRecord, getTicketDetails, navigateDashboard, previewTicketStageTransition, resolveTicketStage, searchRecords };
