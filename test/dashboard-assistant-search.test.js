"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  authenticatedSupabaseLoader,
  createDashboardSearchService,
  planDashboardSearch
} = require("../src/assistant/dashboard-search");
const { orchestrateDashboardRequest } = require("../src/assistant/orchestrator");
const { sanitizePageContext } = require("../src/assistant/page-context");

const actor = { userId: "user-1", role: "owner", email: "tyler@example.com", profile: { first_name: "Tyler" } };
const rowsByTable = {
  job_tickets: [
    {
      id: "ticket-dakota",
      ticket_number: "UY-1042",
      title: "Dakota Street gutter cleaning",
      customer_name: "Greenbridge",
      property_address: "1420 Dakota Street, Portland",
      requested_service: "Gutter cleaning",
      stage: "quote_sent",
      proposed_price: 2500,
      scheduled_date: "2026-08-06",
      assigned_user_id: "user-1",
      customer_approval_recorded: false
    }
  ],
  contacts: [{ id: "contact-jen", name: "Jen Rivera", phone: "(971) 555-0188", email: "jen@example.com", company: "Community PM" }],
  clients: [{ id: "client-community", name: "Community PM" }, { id: "client-greenbridge", name: "Greenbridge" }],
  properties: [{ id: "property-dakota", name: "Dakota Court", address: "1420 Dakota Street", city: "Portland" }],
  scheduled_jobs: [{ id: "job-dakota", site_name: "Dakota Court", address: "1420 Dakota Street", service: "Gutter cleaning", visit_date: "2026-08-06", assigned_user_id: "user-1", status: "Scheduled" }],
  invoices: [
    { id: "invoice-1", invoice_number: "INV-1001", client_id: "client-greenbridge", client_name: "Greenbridge", status: "Sent", balance: 2500, due_date: "2026-08-10" },
    { id: "invoice-2", invoice_number: "INV-1002", client_id: "client-community", client_name: "Community PM", status: "Overdue", balance: 1250, due_date: "2026-08-01" },
    { id: "invoice-3", invoice_number: "INV-1003", client_name: "Paid Client", status: "Paid", balance: 0, due_date: "2026-07-20" }
  ],
  invoice_payments: [
    { id: "payment-1", invoice_id: "invoice-2", amount: 500, payment_date: "2026-07-15", payment_method: "ACH" },
    { id: "payment-2", invoice_id: "invoice-2", amount: 750, payment_date: "2026-08-01", payment_method: "Check" },
    { id: "payment-3", invoice_id: "invoice-1", amount: 400, payment_date: "2026-07-20", payment_method: "Card" }
  ],
  expenses: [{ id: "expense-1042", ticket_id: "ticket-dakota", vendor_name: "Gutter Supply", description: "Downspout parts", total: 185, expense_date: "2026-08-04", status: "Recorded" }]
};

function serviceWith(sourceRows = rowsByTable, permission = () => true) {
  return createDashboardSearchService({
    loadRows: async (definition) => sourceRows[definition.table] || [],
    hasPermission: permission
  });
}

test("secure dashboard search returns the exact Dakota Street ticket as an internal result", async () => {
  const search = await serviceWith().search({ actor, query: "Dakota Street", entityTypes: ["ticket"] });
  assert.equal(search.uniqueMatch, true);
  assert.equal(search.results[0].id, "ticket-dakota");
  assert.equal(search.results[0].sourceKind, "internal");
  assert.equal(search.results[0].route, "#tickets");
  assert.ok(search.results[0].matchedFields.includes("property_address"));
});

test("multiple comparable ticket matches require selection instead of guessing", async () => {
  const sourceRows = structuredClone(rowsByTable);
  sourceRows.job_tickets.push({
    ...sourceRows.job_tickets[0],
    id: "ticket-dakota-2",
    ticket_number: "UY-1043",
    title: "Dakota Street cleanup"
  });
  const search = await serviceWith(sourceRows).search({ actor, query: "Dakota Street", entityTypes: ["ticket"] });
  assert.equal(search.uniqueMatch, false);
  assert.equal(search.requiresClarification, true);
  assert.equal(search.results.length, 2);
});

test("phone and partial-address searches find authorized contacts, properties, and tickets", async () => {
  const service = serviceWith();
  const phone = await service.search({ actor, query: "9715550188", entityTypes: ["contact", "client", "lead", "call_queue"] });
  assert.equal(phone.results[0].id, "contact-jen");
  assert.ok(phone.results[0].matchedFields.includes("phone"));
  const address = await service.search({ actor, query: "1420 Dakota", entityTypes: ["property", "ticket"] });
  assert.deepEqual(new Set(address.results.map((result) => result.entityType)), new Set(["property", "ticket"]));
});

test("unpaid invoice filtering returns an accurate permission-scoped total", async () => {
  const search = await serviceWith().search({ actor, query: "", entityTypes: ["invoice"], filters: { financialStatus: "unpaid" }, limit: 1 });
  assert.equal(search.totalResults, 2);
  assert.equal(search.results.length, 1);
  assert.equal(search.summary.totalAmount, 3750);
});

test("linked searches retrieve ticket expenses and customer payments without exposing dependency rows", async () => {
  const service = serviceWith();
  const expensePlan = planDashboardSearch("What expenses are connected to ticket 1042?", { currentDate: "2026-08-05" });
  const expenses = await service.search({ actor, query: expensePlan.query, entityTypes: expensePlan.entityTypes, filters: expensePlan.filters });
  assert.deepEqual(expenses.results.map((result) => result.id), ["expense-1042"]);
  assert.equal(expenses.summary.totalAmount, 185);

  const paymentPlan = planDashboardSearch("How much has Community PM paid us?", { currentDate: "2026-08-05" });
  const payments = await service.search({ actor, query: paymentPlan.query, entityTypes: paymentPlan.entityTypes, filters: paymentPlan.filters });
  assert.equal(payments.totalResults, 2);
  assert.equal(payments.summary.totalAmount, 1250);
  assert.ok(payments.results.every((result) => result.entityType === "payment"));
});

test("financial entity types are omitted when the server permission check denies them", async () => {
  const search = await serviceWith(rowsByTable, (_role, permission) => permission === "dashboard:read").search({
    actor: { userId: "viewer-1", role: "viewer" },
    query: "Greenbridge",
    entityTypes: ["invoice"]
  });
  assert.deepEqual(search.results, []);
  assert.deepEqual(search.deniedEntityTypes, ["invoice"]);
});

test("authenticated Supabase loader forwards the user JWT so database RLS remains active", async () => {
  let request = null;
  const loadRows = authenticatedSupabaseLoader({
    supabaseUrl: "https://example.supabase.co",
    anonKey: "public-anon-key",
    authorization: "Bearer user-jwt",
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => [] };
    }
  });
  await loadRows({ table: "job_tickets", key: "tickets" }, { limit: 12 });
  assert.match(request.url, /\/rest\/v1\/job_tickets\?select=\*&limit=12$/);
  assert.equal(request.options.headers.Authorization, "Bearer user-jwt");
  assert.equal(request.options.headers.apikey, "public-anon-key");
});

test("search planning distinguishes internal lookup from an explicit outside-web request", () => {
  const internal = planDashboardSearch("Find the Dakota Street ticket", { currentDate: "2026-08-05" });
  assert.equal(internal.external, false);
  assert.equal(internal.searchRequested, true);
  assert.deepEqual(internal.entityTypes, ["ticket", "property", "job", "lead", "call_queue"]);
  const external = planDashboardSearch("Search the web for Greenbridge's official website", { currentDate: "2026-08-05" });
  assert.equal(external.external, true);
  assert.equal(external.searchRequested, false);
  const hybrid = planDashboardSearch("Find Greenbridge online and see whether we already have it in our leads", { currentDate: "2026-08-05" });
  assert.equal(hybrid.external, true);
  assert.equal(hybrid.internalRequested, true);
  assert.equal(hybrid.searchRequested, true);
  assert.ok(hybrid.entityTypes.includes("lead"));
});

test("unique secure search results can open existing records while ambiguous results cannot", async () => {
  const uniqueService = {
    search: async () => ({
      query: "Dakota Street",
      results: [{ id: "ticket-dakota", entityType: "ticket", sourceKind: "internal", title: "UY-1042", subtitle: "Dakota Street gutter cleaning", route: "#tickets", section: "overview", relevanceScore: 240 }],
      totalResults: 1,
      uniqueMatch: true,
      requiresClarification: false,
      deniedEntityTypes: [],
      partial: false,
      summary: { count: 1, returned: 1, totalAmount: 0, currency: "USD" }
    })
  };
  const unique = await orchestrateDashboardRequest({ message: "Open the Dakota Street ticket", context: {}, actor, hasPermission: () => true, searchService: uniqueService });
  assert.ok(unique.uiActions.some((action) => action.type === "open_record" && action.recordId === "ticket-dakota"));

  const ambiguousService = {
    search: async () => ({
      query: "Dakota Street",
      results: [
        { id: "ticket-1", entityType: "ticket", sourceKind: "internal", title: "UY-1", route: "#tickets", relevanceScore: 120 },
        { id: "ticket-2", entityType: "ticket", sourceKind: "internal", title: "UY-2", route: "#tickets", relevanceScore: 118 }
      ],
      totalResults: 2,
      uniqueMatch: false,
      requiresClarification: true,
      deniedEntityTypes: [],
      partial: false,
      summary: { count: 2, returned: 2, totalAmount: 0, currency: "USD" }
    })
  };
  const ambiguous = await orchestrateDashboardRequest({ message: "Open the Dakota Street ticket", context: {}, actor, hasPermission: () => true, searchService: ambiguousService });
  assert.equal(ambiguous.uiActions.some((action) => action.type === "open_record"), false);
  assert.match(ambiguous.clarification, /possible matches/i);
});

test("page context recognizes the authenticated user's first name without trusting the browser for role", () => {
  const context = sanitizePageContext({ currentRoute: "#tickets" }, actor);
  assert.equal(context.currentUserFirstName, "Tyler");
  assert.equal(context.currentUserRole, "owner");
});
