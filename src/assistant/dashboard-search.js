"use strict";

const ENTITY_TYPES = Object.freeze([
  "ticket", "job", "lead", "client", "property", "contact", "quote", "invoice",
  "payment", "expense", "schedule", "worker", "work_note", "call_queue", "document",
  "photo", "form", "activity"
]);

const ENTITY_TYPE_SET = new Set(ENTITY_TYPES);

function clean(value, max = 240) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function normalize(value) {
  return clean(value, 2000).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function phoneDigits(value) {
  return String(value || "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
}

function amountValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : undefined;
}

function firstValue(row, fields = []) {
  for (const field of fields) {
    const value = row?.[field];
    if (value !== undefined && value !== null && String(value).trim()) return value;
  }
  return "";
}

function firstDate(row, fields = []) {
  const value = clean(firstValue(row, fields), 60);
  return value ? value.slice(0, 10) : undefined;
}

function routeFor(entityType) {
  return ({
    ticket: "#tickets",
    job: "#calendar",
    lead: "#outreach",
    client: "#contacts",
    property: "#contacts",
    contact: "#contacts",
    quote: "#documents",
    invoice: "#documents",
    payment: "#documents",
    expense: "#documents",
    schedule: "#route-planner",
    worker: "#calendar",
    work_note: "#tickets",
    call_queue: "#call-queue",
    document: "#documentation",
    photo: "#tickets",
    form: "#documentation",
    activity: "#tickets"
  })[entityType] || "#overview";
}

function invoiceBalance(row = {}) {
  const direct = amountValue(firstValue(row, ["balance", "balance_due", "amount_due"]));
  if (direct !== undefined) return direct;
  const cents = Number(row.amount_due_cents);
  if (Number.isFinite(cents)) return Math.round(cents) / 100;
  const subtotal = Number(row.subtotal || 0);
  const tax = Number(row.tax || 0);
  const discount = Number(row.discount || 0);
  const deposit = Number(row.deposit || 0);
  const paid = Number(row.amount_paid || 0);
  return Math.max(0, Math.round((subtotal + tax - discount - deposit - paid) * 100) / 100);
}

function optionalBoolean(row = {}, fields = []) {
  for (const field of fields) {
    if (typeof row[field] === "boolean") return row[field];
  }
  return undefined;
}

function ticketSearchDetails(row = {}) {
  return Object.fromEntries(Object.entries({
    requestedService: clean(firstValue(row, ["requested_service", "service"]), 160) || undefined,
    propertyAddress: clean(firstValue(row, ["property_address", "address"]), 220) || undefined,
    customerApprovalRecorded: optionalBoolean(row, ["customer_approval_recorded", "customerApprovalRecorded"]),
    ownerApprovalRecorded: optionalBoolean(row, ["owner_approval_recorded", "ownerApprovalRecorded"]),
    depositRequired: optionalBoolean(row, ["deposit_required", "depositRequired"]),
    depositPaid: optionalBoolean(row, ["deposit_paid", "depositPaid"]),
    assignedUserId: clean(firstValue(row, ["assigned_user_id", "assignedUserId"]), 160) || undefined
  }).filter(([, value]) => value !== undefined));
}

function standardResult(definition, row = {}) {
  const id = clean(firstValue(row, definition.idFields || ["id"]), 160);
  const title = clean(firstValue(row, definition.titleFields), 180) || `${definition.label} record`;
  const subtitleValues = (definition.subtitleFields || []).map((field) => clean(row[field], 160)).filter(Boolean);
  const result = {
    id,
    entityType: definition.entityType,
    sourceKind: "internal",
    title,
    subtitle: clean(subtitleValues.join(" · "), 260) || undefined,
    status: clean(firstValue(row, definition.statusFields || ["status", "stage"]), 80) || undefined,
    date: firstDate(row, definition.dateFields || ["updated_at", "created_at"]),
    route: routeFor(definition.entityType),
    section: definition.section || undefined,
    sourceTable: definition.table,
    matchedFields: []
  };
  if (definition.amount) result.amount = amountValue(definition.amount(row));
  if (definition.details) result.details = definition.details(row);
  return result;
}

const SEARCH_DEFINITIONS = Object.freeze([
  { key: "tickets", table: "job_tickets", entityType: "ticket", label: "Ticket", permission: "tickets:read", titleFields: ["ticket_number", "title"], subtitleFields: ["title", "customer_name", "property_name", "property_address", "requested_service"], statusFields: ["stage", "status"], dateFields: ["scheduled_date", "visit_date", "due_date", "updated_at"], searchFields: ["id", "ticket_number", "title", "customer_name", "client_name", "contact_name", "company_name", "property_name", "property_address", "city", "requested_service", "service", "scope_of_work", "description", "notes", "internal_notes", "stage", "status", "scheduled_date", "visit_date", "due_date"], section: "overview", amount: (row) => firstValue(row, ["proposed_price", "expected_revenue", "final_revenue"]), details: ticketSearchDetails },
  { key: "jobs", table: "scheduled_jobs", entityType: "job", label: "Job", permission: "appointments:read", titleFields: ["site_name", "title", "service"], subtitleFields: ["service", "address", "city", "visit_window"], statusFields: ["status"], dateFields: ["visit_date", "scheduled_date", "starts_at", "updated_at"], searchFields: ["id", "site_name", "title", "service", "address", "city", "status", "visit_date", "scheduled_date", "visit_window", "assigned_user_id", "notes"] },
  { key: "leads", table: "leads", entityType: "lead", label: "Lead", permission: "leads:read", titleFields: ["name", "company"], subtitleFields: ["company", "address", "city", "service", "phone", "email"], statusFields: ["status"], dateFields: ["updated_at", "created_at"], searchFields: ["id", "name", "company", "email", "phone", "address", "city", "service", "status", "priority", "notes"] },
  { key: "call_queue", table: "outreach_prospects", entityType: "call_queue", label: "Call Queue", permission: "leads:read", titleFields: ["property_name", "management_company", "contact_name"], subtitleFields: ["management_company", "contact_name", "phone", "city", "website"], statusFields: ["status"], dateFields: ["next_follow_up_at", "last_contacted_at", "updated_at"], searchFields: ["id", "property_name", "management_company", "contact_name", "phone", "email", "address", "city", "website", "status", "notes", "next_follow_up_at", "last_contacted_at"] },
  { key: "quote_requests", table: "quote_submissions", entityType: "quote", label: "Quote request", permission: "leads:read", titleFields: ["name", "property", "service"], subtitleFields: ["service", "address", "phone", "email"], statusFields: ["status"], dateFields: ["follow_up", "created_at"], searchFields: ["id", "name", "email", "phone", "property", "address", "service", "message", "notes", "status", "follow_up"], section: "quote" },
  { key: "clients", table: "clients", entityType: "client", label: "Client", permission: "clients:read", titleFields: ["name", "email"], subtitleFields: ["email", "phone"], statusFields: ["status"], dateFields: ["updated_at", "created_at"], searchFields: ["id", "name", "email", "phone", "notes", "status"] },
  { key: "contacts", table: "contacts", entityType: "contact", label: "Contact", permission: "clients:read", titleFields: ["name", "company", "email"], subtitleFields: ["company", "property", "phone", "email", "city"], statusFields: ["status"], dateFields: ["updated_at", "created_at"], searchFields: ["id", "name", "contact_name", "company", "company_name", "property", "property_name", "email", "phone", "address", "city", "notes", "status"] },
  { key: "properties", table: "properties", entityType: "property", label: "Property", permission: "clients:read", titleFields: ["name", "address"], subtitleFields: ["address", "city", "state", "zip"], dateFields: ["updated_at", "created_at"], searchFields: ["id", "client_id", "name", "address", "city", "state", "zip", "notes"] },
  { key: "invoices", table: "invoices", entityType: "invoice", label: "Invoice", permission: "invoices:read", titleFields: ["invoice_number", "id"], subtitleFields: ["client_name", "status", "client_notes"], statusFields: ["status"], dateFields: ["due_date", "issue_date", "updated_at"], searchFields: ["id", "invoice_number", "client_id", "client_name", "customer_name", "property_id", "job_id", "ticket_id", "status", "issue_date", "due_date", "internal_notes", "client_notes", "square_payment_reference"], section: "details", amount: invoiceBalance },
  { key: "payments", table: "invoice_payments", entityType: "payment", label: "Payment", permission: "money:read", titleFields: ["external_reference", "invoice_id", "id"], subtitleFields: ["payment_method", "notes"], statusFields: ["status"], dateFields: ["payment_date", "created_at"], searchFields: ["id", "invoice_id", "payment_date", "payment_method", "external_reference", "notes", "created_by"], section: "payments", amount: (row) => row.amount },
  { key: "expenses", table: "expenses", entityType: "expense", label: "Expense", permission: "money:read", titleFields: ["description", "vendor_name", "id"], subtitleFields: ["vendor_name", "category", "payment_method"], statusFields: ["status"], dateFields: ["expense_date", "updated_at"], searchFields: ["id", "vendor_name", "category", "description", "client_id", "property_id", "job_id", "ticket_id", "payment_method", "status", "notes", "external_reference", "expense_date"], section: "costs", amount: (row) => row.total },
  { key: "routes", table: "route_stops", entityType: "schedule", label: "Route stop", permission: "route:read", titleFields: ["site_name", "title", "address"], subtitleFields: ["address", "city", "service", "visit_window"], statusFields: ["status"], dateFields: ["visit_date", "route_date", "scheduled_date", "updated_at"], searchFields: ["id", "site_name", "title", "address", "city", "service", "status", "visit_date", "route_date", "scheduled_date", "visit_window", "notes"] },
  { key: "crew", table: "job_ticket_crew_assignments", entityType: "worker", label: "Assigned employee", permission: "operations:read", titleFields: ["employee_name", "employee_email", "employee_id"], subtitleFields: ["role_label", "ticket_id"], statusFields: ["status"], dateFields: ["assigned_at", "created_at"], searchFields: ["id", "ticket_id", "employee_id", "employee_name", "employee_email", "role_label", "status"] },
  { key: "work_notes", table: "job_notes", entityType: "work_note", label: "Work note", permission: "notes:read", titleFields: ["title", "body"], subtitleFields: ["body", "job_id", "ticket_id"], dateFields: ["created_at", "updated_at"], searchFields: ["id", "title", "body", "job_id", "ticket_id", "client_id", "created_by"] },
  { key: "financial_documents", table: "financial_documents", entityType: "document", label: "Document", permission: "money:read", titleFields: ["title", "file_name"], subtitleFields: ["document_type", "file_name"], dateFields: ["document_date", "created_at"], searchFields: ["id", "title", "file_name", "document_type", "expense_id", "invoice_id", "vendor_id", "client_id", "property_id", "job_id", "ticket_id", "document_date"] },
  { key: "photos", table: "job_site_photos", entityType: "photo", label: "Photo", permission: "operations:read", titleFields: ["caption", "photo_type", "file_name"], subtitleFields: ["photo_type", "file_name", "ticket_id", "job_id"], statusFields: ["review_status"], dateFields: ["taken_at", "created_at"], searchFields: ["id", "ticket_id", "job_id", "photo_type", "caption", "file_name", "review_status", "taken_at"] },
  { key: "forms", table: "documentation_submissions", entityType: "form", label: "Form", permission: "documentation:read", titleFields: ["title", "submission_number", "id"], subtitleFields: ["status", "assignment_id", "ticket_id"], statusFields: ["status", "review_status"], dateFields: ["submitted_at", "updated_at", "created_at"], searchFields: ["id", "title", "submission_number", "assignment_id", "ticket_id", "job_id", "client_id", "property_id", "status", "review_status", "notes"] },
  { key: "ticket_activity", table: "job_ticket_events", entityType: "activity", label: "Ticket activity", permission: "tickets:read", titleFields: ["event_type", "notes", "id"], subtitleFields: ["notes", "actor_email", "ticket_id"], statusFields: ["to_stage", "from_stage"], dateFields: ["created_at"], searchFields: ["id", "ticket_id", "event_type", "actor_email", "from_stage", "to_stage", "notes", "created_at"] }
]);

function allowedTypes(entityTypes = []) {
  const requested = Array.isArray(entityTypes) ? entityTypes.map((value) => clean(value, 40).toLowerCase()) : [];
  return requested.length ? requested.filter((value) => ENTITY_TYPE_SET.has(value)) : [...ENTITY_TYPES];
}

function searchableValues(definition, row) {
  const fields = [...(definition.searchFields || []), "_linked_ticket", "_linked_invoice", "_linked_client", "_linked_property", "_linked_job"];
  return [...new Set(fields)].map((field) => ({ field, value: clean(row?.[field], 1200) })).filter((entry) => entry.value);
}

function indexedRows(rowsByTable, table) {
  return new Map((rowsByTable.get(table) || []).map((row) => [String(row.id || ""), row]).filter(([id]) => id));
}

function searchIdentity(row = {}) {
  return clean([
    row.ticket_number, row.invoice_number, row.name, row.title, row.customer_name, row.client_name,
    row.company, row.company_name, row.property_name, row.site_name, row.address, row.property_address,
    row.email, row.phone, row.service, row.requested_service, row.status, row.stage
  ].filter(Boolean).join(" "), 1800);
}

function enrichLinkedSearchRow(row = {}, rowsByTable = new Map()) {
  const enriched = { ...row };
  const tickets = indexedRows(rowsByTable, "job_tickets");
  const invoices = indexedRows(rowsByTable, "invoices");
  const clients = indexedRows(rowsByTable, "clients");
  const contacts = indexedRows(rowsByTable, "contacts");
  const properties = indexedRows(rowsByTable, "properties");
  const jobs = indexedRows(rowsByTable, "scheduled_jobs");
  const ticket = tickets.get(String(row.ticket_id || row.job_ticket_id || ""));
  const invoice = invoices.get(String(row.invoice_id || ""));
  const clientId = row.client_id || invoice?.client_id;
  const propertyId = row.property_id || invoice?.property_id;
  const jobId = row.job_id || invoice?.job_id;
  const client = clients.get(String(clientId || "")) || contacts.get(String(clientId || ""));
  const property = properties.get(String(propertyId || ""));
  const job = jobs.get(String(jobId || ""));
  if (ticket) enriched._linked_ticket = searchIdentity(ticket);
  if (invoice) enriched._linked_invoice = [searchIdentity(invoice), searchIdentity(clients.get(String(invoice.client_id || "")) || contacts.get(String(invoice.client_id || "")) || {})].filter(Boolean).join(" ");
  if (client) enriched._linked_client = searchIdentity(client);
  if (property) enriched._linked_property = searchIdentity(property);
  if (job) enriched._linked_job = searchIdentity(job);
  return enriched;
}

function editDistanceAtMost(value, target, maximum = 1) {
  const left = normalize(value);
  const right = normalize(target);
  if (!left || !right || Math.abs(left.length - right.length) > maximum) return false;
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    let rowMinimum = current[0];
    for (let j = 1; j <= right.length; j += 1) {
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1));
      rowMinimum = Math.min(rowMinimum, current[j]);
    }
    if (rowMinimum > maximum) return false;
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length] <= maximum;
}

function scoreRow(definition, row, query) {
  const phrase = normalize(query);
  const tokens = phrase.split(" ").filter((token) => token.length > 1);
  if (!phrase) return { score: 50, matchedFields: [] };
  const values = searchableValues(definition, row);
  const matchedFields = new Set();
  let score = 0;
  const queryPhone = phoneDigits(query);
  values.forEach(({ field, value }) => {
    const normalizedValue = normalize(value);
    if (!normalizedValue) return;
    if (normalizedValue === phrase) {
      score += 180;
      matchedFields.add(field);
    } else if (normalizedValue.includes(phrase)) {
      score += 70;
      matchedFields.add(field);
    }
    tokens.forEach((token) => {
      const words = normalizedValue.split(" ");
      if (words.includes(token)) {
        score += 24;
        matchedFields.add(field);
      } else if (normalizedValue.includes(token)) {
        score += 12;
        matchedFields.add(field);
      } else if (token.length >= 5 && words.some((word) => word.length >= 5 && editDistanceAtMost(word, token, token.length >= 9 ? 2 : 1))) {
        score += 6;
        matchedFields.add(field);
      }
    });
    const valuePhone = phoneDigits(value);
    if (queryPhone.length >= 7 && valuePhone) {
      if (valuePhone === queryPhone) {
        score += 200;
        matchedFields.add(field);
      } else if (valuePhone.includes(queryPhone) || queryPhone.includes(valuePhone)) {
        score += 70;
        matchedFields.add(field);
      }
    }
  });
  return { score, matchedFields: [...matchedFields].slice(0, 8) };
}

function rowMatchesFilters(result, row, filters = {}, actor = {}) {
  if (filters.recordId && ![result.id, row.id, row.ticket_id, row.job_id, row.client_id, row.property_id, row.invoice_id, row.lead_id].map(String).includes(String(filters.recordId))) return false;
  if (filters.ticketId && ![row.ticket_id, row.job_ticket_id, row.id].map(String).includes(String(filters.ticketId))) return false;
  if (filters.ticketReference && !normalize(row._linked_ticket).includes(normalize(filters.ticketReference))) return false;
  if (filters.paymentCustomer && result.entityType === "payment" && !normalize([row._linked_invoice, row._linked_client].filter(Boolean).join(" ")).includes(normalize(filters.paymentCustomer))) return false;
  if (filters.status && normalize(filters.status) !== "all" && normalize(result.status) !== normalize(filters.status)) return false;
  if (filters.financialStatus === "unpaid") {
    if (result.entityType !== "invoice") return false;
    if (["paid", "voided", "void", "cancelled", "canceled", "uncollectible"].includes(normalize(result.status))) return false;
    if (!(Number(result.amount || 0) > 0)) return false;
  }
  if (filters.date && result.date !== String(filters.date).slice(0, 10)) return false;
  if (filters.dateFrom && (!result.date || result.date < String(filters.dateFrom).slice(0, 10))) return false;
  if (filters.dateTo && (!result.date || result.date > String(filters.dateTo).slice(0, 10))) return false;
  if (filters.assignedToCurrentUser) {
    const assigned = firstValue(row, ["assigned_user_id", "employee_id", "actor_user_id", "created_by"]);
    if (!assigned || String(assigned) !== String(actor.userId || "")) return false;
  }
  if (filters.customerApprovalMissing && row.customer_approval_recorded !== false && row.customerApprovalRecorded !== false) return false;
  if (row.archived_at && filters.includeArchived !== true) return false;
  return true;
}

function uniqueSearchMatch(results = []) {
  if (results.length === 1) return true;
  if (!results.length) return false;
  const [first, second] = results;
  return first.relevanceScore >= 180 && (!second || first.relevanceScore - second.relevanceScore >= 50);
}

function createDashboardSearchService({ loadRows, hasPermission, maxRowsPerSource = 120 } = {}) {
  if (typeof loadRows !== "function") throw new Error("Dashboard search requires an authenticated row loader.");
  if (typeof hasPermission !== "function") throw new Error("Dashboard search requires a permission checker.");
  return {
    async search({ actor, query = "", entityTypes = [], filters = {}, limit = 8 } = {}) {
      if (!actor?.userId || !actor?.role) {
        const error = new Error("Sign in again before searching dashboard records.");
        error.statusCode = 401;
        throw error;
      }
      const boundedLimit = Math.max(1, Math.min(20, Number(limit) || 8));
      const types = new Set(allowedTypes(entityTypes));
      const eligible = SEARCH_DEFINITIONS.filter((definition) => types.has(definition.entityType));
      const dependencyKeys = new Set();
      if (filters.ticketReference) dependencyKeys.add("tickets");
      if (filters.paymentCustomer) ["invoices", "clients", "contacts"].forEach((key) => dependencyKeys.add(key));
      const loadDefinitions = [...eligible, ...SEARCH_DEFINITIONS.filter((definition) => dependencyKeys.has(definition.key))]
        .filter((definition, index, definitions) => definitions.findIndex((candidate) => candidate.key === definition.key) === index);
      const permitted = eligible.filter((definition) => hasPermission(actor.role, definition.permission));
      const deniedEntityTypes = [...new Set(eligible.filter((definition) => !hasPermission(actor.role, definition.permission)).map((definition) => definition.entityType))];
      const permittedLoads = loadDefinitions.filter((definition) => hasPermission(actor.role, definition.permission));
      const settled = await Promise.allSettled(permittedLoads.map(async (definition) => ({
        definition,
        rows: await loadRows(definition, { limit: maxRowsPerSource, actor })
      })));
      const failures = [];
      const ranked = [];
      const rowsByTable = new Map();
      settled.forEach((entry) => {
        if (entry.status !== "fulfilled") return;
        const existing = rowsByTable.get(entry.value.definition.table) || [];
        rowsByTable.set(entry.value.definition.table, [...existing, ...(Array.isArray(entry.value.rows) ? entry.value.rows : [])]);
      });
      const eligibleKeys = new Set(permitted.map((definition) => definition.key));
      settled.forEach((entry, index) => {
        if (entry.status === "rejected") {
          failures.push({ source: permittedLoads[index]?.key || "records", message: "Source unavailable" });
          return;
        }
        const { definition, rows } = entry.value;
        if (!eligibleKeys.has(definition.key)) return;
        (Array.isArray(rows) ? rows : []).forEach((row) => {
          const enrichedRow = enrichLinkedSearchRow(row, rowsByTable);
          const result = standardResult(definition, enrichedRow);
          if (!result.id || !rowMatchesFilters(result, enrichedRow, filters, actor)) return;
          const rankedRow = scoreRow(definition, enrichedRow, query);
          if (query && rankedRow.score <= 0) return;
          result.matchedFields = rankedRow.matchedFields;
          result.relevanceScore = rankedRow.score;
          ranked.push(result);
        });
      });
      ranked.sort((left, right) => right.relevanceScore - left.relevanceScore || String(right.date || "").localeCompare(String(left.date || "")) || left.title.localeCompare(right.title));
      const deduped = [];
      const seen = new Set();
      ranked.forEach((result) => {
        const key = `${result.entityType}:${result.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(result);
        }
      });
      const results = deduped.slice(0, boundedLimit);
      const uniqueMatch = uniqueSearchMatch(results);
      const totalAmount = deduped.reduce((total, result) => total + (Number.isFinite(result.amount) ? result.amount : 0), 0);
      return {
        query: clean(query, 240),
        entityTypes: [...types],
        results,
        totalResults: deduped.length,
        uniqueMatch,
        requiresClarification: results.length > 1 && !uniqueMatch,
        deniedEntityTypes,
        partial: failures.length > 0,
        failures,
        summary: {
          count: deduped.length,
          returned: results.length,
          totalAmount: Math.round(totalAmount * 100) / 100,
          currency: "USD"
        }
      };
    }
  };
}

function nextDate(dateText, days) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(dateText || "")) ? new Date(`${dateText}T12:00:00Z`) : new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function weekBounds(dateText) {
  const date = new Date(`${dateText || new Date().toISOString().slice(0, 10)}T12:00:00Z`);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - mondayOffset);
  const from = date.toISOString().slice(0, 10);
  date.setUTCDate(date.getUTCDate() + 6);
  return { dateFrom: from, dateTo: date.toISOString().slice(0, 10) };
}

function inferEntityTypes(message) {
  const value = normalize(message);
  const types = [];
  const add = (...items) => items.forEach((item) => { if (!types.includes(item)) types.push(item); });
  if (/\b(tickets?|job tickets?|approval|scope|closeout)\b/.test(value)) add("ticket");
  if (/\b(jobs?|visits?|scheduled work|assigned to me)\b/.test(value)) add("job", "ticket");
  if (/\b(leads?|prospects?|quote requests?)\b/.test(value)) add("lead", "quote", "call_queue");
  if (/\b(clients?|customers?)\b/.test(value)) add("client", "contact");
  if (/\b(properties|property|addresses|address|streets?|avenues?|roads?|drives?|lanes?|boulevards?)\b/.test(value)) add("property", "ticket", "job", "lead", "call_queue");
  if (/\b(contacts?|phones?|phone numbers?|emails?)\b/.test(value)) add("contact", "client", "lead", "call_queue");
  if (/\b(quotes?|estimates?)\b/.test(value)) add("quote", "ticket", "document");
  if (/\b(invoices?|unpaid|receivables?)\b/.test(value)) add("invoice");
  if (/\b(payments?|paid us|has .* paid)\b/.test(value)) add("payment", "invoice", "client");
  if (/\b(expenses?|costs?|receipts?)\b/.test(value)) add("expense", "document");
  if (/\b(schedules?|tomorrow|routes?|this week|next week)\b/.test(value)) add("job", "schedule", "ticket");
  if (/\b(employees?|workers?|crew|assigned)\b/.test(value)) add("worker", "job", "ticket");
  if (/\b(notes?|conversations?)\b/.test(value)) add("work_note", "activity");
  if (/\b(call queue|caller|call history)\b/.test(value)) add("call_queue", "activity", "lead");
  if (/\b(documents?|files?|attachments?|uploaded)\b/.test(value)) add("document");
  if (/\b(photos?|pictures?|images?)\b/.test(value)) add("photo", "document");
  if (/\b(forms?|submissions?)\b/.test(value)) add("form", "document");
  if (/\b(activity|history|last conversation)\b/.test(value)) add("activity", "work_note");
  return types;
}

function searchQueryFromMessage(message) {
  return clean(String(message || "")
    .replace(/\b(?:find|search(?: the dashboard)?(?: for)?|show me|show|locate|pull up|open|take me to|go to|navigate to|what is happening with|what is the status of|which|all|the|this|that|for|record|records|ticket|tickets|job|jobs|invoice|invoices|client|clients|property|properties|lead|leads|contact|contacts|expense|expenses|payment|payments|quote|quotes|document|documents|page|tab)\b/gi, " ")
    .replace(/\b(?:unpaid|outstanding|scheduled|tomorrow|today|this week|next week|assigned to me|still need customer approval)\b/gi, " ")
    .replace(/\s+/g, " "), 240);
}

function planDashboardSearch(message, pageContext = {}) {
  const value = String(message || "");
  const normalized = normalize(value);
  const explicitWeb = /\b(?:search|look up|find)\b[\s\S]*\b(?:the web|web|internet|online|official website|current weather|weather forecast)\b/i.test(value);
  const internalRequested = /\b(?:our|my|the)\s+(?:dashboard|database|records?|leads?|clients?|customers?|contacts?|call queue|tickets?|properties)\b/i.test(value)
    || /\b(?:already|existing|currently)\b[\s\S]*\b(?:lead|client|customer|contact|record|database|dashboard)\b/i.test(value);
  let entityTypes = inferEntityTypes(value);
  const filters = {};
  if (/\b(unpaid|outstanding|receivable)\b/.test(normalized) && /\binvoice/.test(normalized)) filters.financialStatus = "unpaid";
  if (/\btomorrow\b/.test(normalized)) filters.date = nextDate(pageContext.currentDate, 1);
  if (/\btoday\b/.test(normalized)) filters.date = String(pageContext.currentDate || new Date().toISOString().slice(0, 10));
  if (/\bthis week\b/.test(normalized)) Object.assign(filters, weekBounds(pageContext.currentDate));
  if (/\bassigned to me\b/.test(normalized)) filters.assignedToCurrentUser = true;
  if (/\b(?:need|needs|missing|without|still need) customer approval\b/.test(normalized)) filters.customerApprovalMissing = true;
  const ticketReference = value.match(/\bticket\s*#?\s*([a-z]*-?\d[a-z0-9-]*)\b/i)?.[1] || "";
  if (ticketReference && /\b(expenses?|costs?|receipts?|documents?|photos?|forms?)\b/.test(normalized)) {
    filters.ticketReference = ticketReference;
    entityTypes = entityTypes.filter((type) => type !== "ticket");
  }
  const paymentCustomer = value.match(/\bhow much (?:has|have)?\s*(.+?)\s+paid us\b/i)?.[1]?.trim() || "";
  if (paymentCustomer) {
    filters.paymentCustomer = paymentCustomer;
    entityTypes = ["payment"];
  }
  if (/\b(this|that|it|current|selected)\b/.test(normalized) && pageContext.selectedRecordId) {
    if (/\b(expense|quote|invoice|document|photo|form)\b/.test(normalized)) filters.ticketId = pageContext.selectedRecordId;
    else filters.recordId = pageContext.selectedRecordId;
  }
  const navigationRequested = /\b(?:take me|go to|navigate|open|pull up|show this|view this)\b/i.test(value);
  const explicitSearch = /\b(?:find|search|show(?: me)?|locate|pull up|open|which|how much|who|take me|go to|navigate)\b/i.test(value);
  const operationalQuestion = /\bwhat\b[\s\S]*\b(?:status|happening|scheduled|assigned|expenses?|documents?|photos?|invoices?|payments?|approval)\b/i.test(value);
  const searchRequested = explicitSearch || operationalQuestion || (Object.keys(filters).length > 0 && entityTypes.length > 0);
  const section = /\bquotes?\b/.test(normalized) ? "quote" : /\b(?:expenses?|costs?)\b/.test(normalized) ? "costs" : /\bpayments?\b/.test(normalized) ? "payments" : "";
  return {
    external: explicitWeb,
    internalRequested: explicitWeb && internalRequested,
    searchRequested: searchRequested && (!explicitWeb || internalRequested),
    navigationRequested,
    entityTypes,
    query: paymentCustomer || searchQueryFromMessage(value),
    filters,
    section
  };
}

function authenticatedSupabaseLoader({ supabaseUrl, anonKey, authorization, fetchImpl = globalThis.fetch } = {}) {
  const baseUrl = String(supabaseUrl || "").replace(/\/$/, "");
  const token = String(authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!baseUrl || !anonKey || !token || typeof fetchImpl !== "function") {
    throw new Error("Authenticated dashboard search is not configured.");
  }
  return async function loadRows(definition, { limit = 120 } = {}) {
    const boundedLimit = Math.max(1, Math.min(250, Number(limit) || 120));
    const response = await fetchImpl(`${baseUrl}/rest/v1/${encodeURIComponent(definition.table)}?select=*&limit=${boundedLimit}`, {
      method: "GET",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      }
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const error = new Error(payload.message || payload.error || `Search source ${definition.key} is unavailable.`);
      error.statusCode = response.status;
      throw error;
    }
    const rows = await response.json().catch(() => []);
    return Array.isArray(rows) ? rows : [];
  };
}

module.exports = {
  ENTITY_TYPES,
  SEARCH_DEFINITIONS,
  authenticatedSupabaseLoader,
  createDashboardSearchService,
  inferEntityTypes,
  planDashboardSearch,
  routeFor,
  scoreRow,
  uniqueSearchMatch
};
