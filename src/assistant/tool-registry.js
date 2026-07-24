"use strict";

const { flattenSnapshot, normalize } = require("./record-resolver");
const { recordReference } = require("./types");

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
    ticket: "#tickets", job: "#calendar", lead: "#outreach", property: "#contacts",
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

function searchRecords({ query, snapshot, limit = 10 }) {
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

function findUnpaidInvoices({ snapshot, limit = 20 }) {
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

function createToolRegistry({ permissionGuard }) {
  const definitions = new Map();
  const register = (tool) => {
    if (!tool?.name || typeof tool.execute !== "function") throw new Error("Invalid assistant tool definition.");
    definitions.set(tool.name, Object.freeze({ timeoutMs: 2500, classification: "read", requiresConfirmation: false, ...tool }));
  };
  register({ name: "search_records", description: "Search the permitted dashboard snapshot.", requiredPermission: "dashboard:read", inputSchema: { query: "string" }, outputSchema: { records: "array", citations: "array" }, execute: searchRecords });
  register({ name: "find_blocked_tickets", description: "Find tickets with explicit workflow blockers.", requiredPermission: "tickets:read", inputSchema: {}, outputSchema: { records: "array", citations: "array" }, execute: findBlockedTickets });
  register({ name: "get_attention_items", description: "Return deterministic priority items already calculated by the dashboard.", requiredPermission: "dashboard:read", inputSchema: {}, outputSchema: { records: "array", citations: "array" }, execute: getAttentionItems });
  register({ name: "get_ticket_details", description: "Get one resolved ticket from the permitted context.", requiredPermission: "tickets:read", inputSchema: { recordId: "string" }, outputSchema: { records: "array", citations: "array" }, execute: getTicketDetails });
  register({ name: "find_unpaid_invoices", description: "Find unpaid invoices and calculate their known outstanding balance.", requiredPermission: "invoices:read", inputSchema: {}, outputSchema: { records: "array", calculation: "object", citations: "array" }, execute: findUnpaidInvoices });
  register({ name: "find_completed_uninvoiced_work", description: "Find completed work without a finalized invoice and total known value.", requiredPermission: "tickets:read", inputSchema: {}, outputSchema: { records: "array", calculation: "object", citations: "array" }, execute: findCompletedUninvoicedWork });
  return {
    definitions: () => [...definitions.values()].map(({ execute, ...definition }) => definition),
    async execute(name, input, runtime) {
      const tool = definitions.get(name);
      if (!tool) {
        const error = new Error(`Groundskeeper does not have a registered tool named ${name}.`);
        error.code = "TOOL_NOT_FOUND";
        throw error;
      }
      const startedAt = Date.now();
      try {
        permissionGuard.assert(runtime.actor, tool.requiredPermission);
        if (tool.classification !== "read" || tool.requiresConfirmation) {
          const error = new Error(`${name} must produce an approval preview before it can change records.`);
          error.code = "CONFIRMATION_REQUIRED";
          throw error;
        }
        const output = await timeout(tool.execute({ ...input, snapshot: runtime.snapshot, pageContext: runtime.pageContext }), tool.timeoutMs, name);
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

module.exports = { createToolRegistry, findCompletedUninvoicedWork, findUnpaidInvoices, getAttentionItems, getTicketDetails, searchRecords };
