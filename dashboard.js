(function () {
  "use strict";

  const STATUSES = ["New", "Contacted", "Scheduled", "Completed", "Invoiced"];
  const SESSION_KEY = "urbanYardsDashboardSession";

  const config = window.URBAN_YARDS_DASHBOARD_CONFIG || {
    supabaseUrl: "",
    supabaseAnonKey: "",
    ownerEmail: "team@urbanyards.us"
  };

  const state = {
    activeSection: "overview",
    statusFilter: "All",
    calendarFilter: "All",
    calendarView: "agenda",
    operationsFilter: "All",
    search: "",
    propertyFilter: "All",
    selectedSubmissionId: "",
    selectedJobId: "",
    documentsReady: true,
    operationsReady: true,
    data: {
      submissions: [],
      contacts: [],
      jobs: [],
      notes: [],
      reminders: [],
      documents: [],
      operations: []
    },
    loading: false,
    error: ""
  };

  const els = {};

  function qs(selector) {
    return document.querySelector(selector);
  }

  function qsa(selector) {
    return Array.from(document.querySelectorAll(selector));
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function slug(value) {
    return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function statusBadge(status) {
    const safeStatus = STATUSES.includes(status) ? status : "New";
    return `<span class="status status-${slug(safeStatus)}">${escapeHtml(safeStatus)}</span>`;
  }

  function statusSelect(table, id, status) {
    const safeStatus = STATUSES.includes(status) ? status : "New";
    const options = STATUSES.map((item) => `<option value="${item}"${item === safeStatus ? " selected" : ""}>${item}</option>`).join("");
    return `<select class="status-select" data-status-table="${escapeHtml(table)}" data-status-id="${escapeHtml(id)}" aria-label="Update status">${options}</select>`;
  }

  function actionButton(label, action, id) {
    return `<button class="inline-action" type="button" data-action="${escapeHtml(action)}" data-id="${escapeHtml(id)}">${escapeHtml(label)}</button>`;
  }

  function emptyState(message) {
    return `<div class="empty-state">${escapeHtml(message)}</div>`;
  }

  function loadingState(message) {
    return `<div class="loading-state">${escapeHtml(message)}</div>`;
  }

  function setDashboardState(message, tone) {
    if (!els.dashboardState) return;
    els.dashboardState.hidden = !message;
    els.dashboardState.textContent = message || "";
    els.dashboardState.dataset.tone = tone || "";
  }

  function getOwnerEmail() {
    return (config.ownerEmail || "team@urbanyards.us").toLowerCase();
  }

  function getSupabaseUrl() {
    return String(config.supabaseUrl || "").replace(/\/$/, "");
  }

  function isSupabaseConfigured() {
    return Boolean(getSupabaseUrl() && config.supabaseAnonKey);
  }

  async function supabaseAuthRequest(path, options, accessToken) {
    if (!isSupabaseConfigured()) {
      throw new Error("Supabase is missing configuration. Add the Netlify environment variables and redeploy.");
    }

    const headers = {
      apikey: config.supabaseAnonKey,
      "Content-Type": "application/json",
      ...(options && options.headers ? options.headers : {})
    };

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${getSupabaseUrl()}${path}`, {
      ...options,
      headers
    });

    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};

    if (!response.ok) {
      throw new Error(payload.error_description || payload.msg || payload.message || "Supabase request failed.");
    }

    return payload;
  }

  async function supabaseRestRequest(path, options) {
    const session = getSession();
    if (!session || !session.accessToken) {
      throw new Error("Please sign in again.");
    }

    const headers = {
      apikey: config.supabaseAnonKey,
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
      ...(options && options.headers ? options.headers : {})
    };

    const response = await fetch(`${getSupabaseUrl()}/rest/v1/${path}`, {
      ...options,
      headers
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;

    if (!response.ok) {
      throw new Error(payload?.message || payload?.hint || "Supabase database request failed.");
    }

    return payload;
  }

  function formatDate(value) {
    if (!value) return "Not scheduled";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function dateKey(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
  }

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function daysFromToday(count) {
    const date = new Date();
    date.setDate(date.getDate() + count);
    return date.toISOString().slice(0, 10);
  }

  function formatCurrency(cents, currency) {
    if (typeof cents !== "number") return "";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(cents / 100);
  }

  function toDateInputValue(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
  }

  function normalizeSubmission(row) {
    return {
      id: row.id,
      name: row.name || "Unnamed lead",
      email: row.email || "No email",
      phone: row.phone || "No phone",
      propertyType: row.property_type || "Not provided",
      city: row.city || "Not provided",
      service: row.service || "Not provided",
      status: row.status || "New",
      source: row.source || "Quote form",
      createdAtRaw: row.created_at || "",
      receivedAt: formatDate(row.created_at),
      followUp: row.follow_up || "Not set",
      notes: row.notes || ""
    };
  }

  function normalizeContact(row) {
    return {
      id: row.id,
      name: row.name || "Unnamed contact",
      type: row.contact_type || "Contact",
      city: row.city || "Not provided",
      email: row.email || "No email",
      phone: row.phone || "No phone",
      status: row.status || "New"
    };
  }

  function normalizeJob(row) {
    return {
      id: row.id,
      date: formatDate(row.visit_date),
      dateRaw: row.visit_date || "",
      window: row.visit_window || "Window not set",
      site: row.site_name || "Unnamed site",
      city: row.city || "Not provided",
      service: row.service || "Not provided",
      status: row.status || "Scheduled"
    };
  }

  function normalizeNote(row) {
    return {
      id: row.id,
      title: row.title || "Untitled note",
      body: row.body || "",
      date: formatDate(row.created_at)
    };
  }

  function normalizeReminder(row) {
    return {
      id: row.id,
      due: formatDate(row.due_date),
      dueRaw: row.due_date || "",
      task: row.task || "Untitled reminder",
      status: row.status || "New"
    };
  }

  function normalizeOperation(row) {
    return {
      id: row.id,
      type: row.record_type || "property_profile",
      title: row.title || "Untitled operation",
      clientName: row.client_name || "",
      propertyAddress: row.property_address || "",
      dueDate: formatDate(row.due_date),
      dueDateRaw: row.due_date || "",
      status: row.status || "Active",
      notes: row.notes || "",
      payload: row.payload && typeof row.payload === "object" ? row.payload : {},
      createdAt: formatDate(row.created_at)
    };
  }

  function normalizeDocument(row) {
    return {
      id: row.id,
      type: row.document_type || "estimate",
      number: row.document_number || "Draft",
      clientName: row.client_name || "Unnamed client",
      clientEmail: row.client_email || "",
      issueDate: formatDate(row.issue_date || row.created_at),
      dueDate: formatDate(row.due_date),
      dueDateRaw: row.due_date || "",
      status: row.status || "draft",
      squareInvoiceId: row.square_invoice_id || "",
      squareInvoiceNumber: row.square_invoice_number || "",
      squareStatus: row.square_status || "",
      squarePaymentUrl: row.square_payment_url || "",
      squareAmountDueCents: typeof row.square_amount_due_cents === "number" ? row.square_amount_due_cents : null,
      squareCurrency: row.square_currency || "USD",
      squareSyncedAt: row.square_synced_at ? formatDate(row.square_synced_at) : "",
      lineItems: Array.isArray(row.line_items) ? row.line_items : [],
      subtotal: Number(row.subtotal || 0),
      tax: Number(row.tax || 0),
      total: Number(row.total || 0),
      notes: row.notes || ""
    };
  }

  function normalizeAuthSession(payload) {
    const userEmail = String(payload.user && payload.user.email ? payload.user.email : "").toLowerCase();

    if (userEmail !== getOwnerEmail()) {
      throw new Error(`Only ${getOwnerEmail()} can access this dashboard.`);
    }

    const expiresIn = Number(payload.expires_in || 3600);

    return {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token,
      expiresAt: Date.now() + expiresIn * 1000,
      email: userEmail
    };
  }

  async function signInOwner(email, password) {
    if (email.toLowerCase() !== getOwnerEmail()) {
      throw new Error(`Only ${getOwnerEmail()} can access this dashboard.`);
    }

    const payload = await supabaseAuthRequest("/auth/v1/token?grant_type=password", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    return normalizeAuthSession(payload);
  }

  async function refreshSession(session) {
    if (!session || !session.refreshToken) {
      return null;
    }

    const payload = await supabaseAuthRequest("/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      body: JSON.stringify({ refresh_token: session.refreshToken })
    });

    return normalizeAuthSession(payload);
  }

  async function verifySession(session) {
    if (!session || !session.accessToken) {
      return null;
    }

    if (Date.now() > Number(session.expiresAt || 0) - 60000) {
      return refreshSession(session);
    }

    const payload = await supabaseAuthRequest("/auth/v1/user", {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    }, session.accessToken);

    if (String(payload.email || "").toLowerCase() !== getOwnerEmail()) {
      throw new Error(`Only ${getOwnerEmail()} can access this dashboard.`);
    }

    return session;
  }

  async function signOutOwner() {
    const session = getSession();
    if (session && session.accessToken && isSupabaseConfigured()) {
      try {
        await supabaseAuthRequest("/auth/v1/logout", { method: "POST" }, session.accessToken);
      } catch (error) {
        // Local session cleanup should still happen if the remote token is already expired.
      }
    }

    clearSession();
  }

  async function loadDashboardData() {
    const [submissions, contacts, jobs, notes, reminders, documents, operations] = await Promise.all([
      supabaseRestRequest("quote_submissions?select=*&order=created_at.desc", { method: "GET" }),
      supabaseRestRequest("contacts?select=*&order=created_at.desc", { method: "GET" }),
      supabaseRestRequest("scheduled_jobs?select=*&order=visit_date.asc", { method: "GET" }),
      supabaseRestRequest("job_notes?select=*&order=created_at.desc", { method: "GET" }),
      supabaseRestRequest("follow_up_reminders?select=*&order=due_date.asc", { method: "GET" }),
      loadSalesDocuments(),
      loadOperationsRecords()
    ]);

    return {
      submissions: submissions.map(normalizeSubmission),
      contacts: contacts.map(normalizeContact),
      jobs: jobs.map(normalizeJob),
      notes: notes.map(normalizeNote),
      reminders: reminders.map(normalizeReminder),
      documents,
      operations
    };
  }

  async function loadSalesDocuments() {
    try {
      const rows = await supabaseRestRequest("sales_documents?select=*&order=created_at.desc", { method: "GET" });
      state.documentsReady = true;
      return rows.map(normalizeDocument);
    } catch (error) {
      state.documentsReady = false;
      return [];
    }
  }

  async function loadOperationsRecords() {
    try {
      const rows = await supabaseRestRequest("operations_records?select=*&order=created_at.desc", { method: "GET" });
      state.operationsReady = true;
      return rows.map(normalizeOperation);
    } catch (error) {
      state.operationsReady = false;
      return [];
    }
  }

  async function insertJobNote(title, body) {
    const rows = await supabaseRestRequest("job_notes", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ title, body })
    });
    return normalizeNote(rows[0]);
  }

  async function insertScheduledJob(payload) {
    const rows = await supabaseRestRequest("scheduled_jobs", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload)
    });
    return normalizeJob(rows[0]);
  }

  async function deleteRow(table, id) {
    await supabaseRestRequest(`${table}?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" }
    });
  }

  async function updateScheduledJob(id, payload) {
    await supabaseRestRequest(`scheduled_jobs?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(payload)
    });
  }

  async function cancelScheduledJob(id) {
    await supabaseRestRequest(`scheduled_jobs?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" }
    });
  }

  function buildDocumentPayload(input) {
    const amount = Number(input.amount || 0);
    const lineItems = [{
      description: input.description || "Landscape service",
      quantity: 1,
      unit_price: amount,
      amount
    }];
    return {
      document_type: input.document_type || "estimate",
      document_number: input.document_number || nextDocumentNumber(input.document_type || "estimate"),
      square_invoice_number: input.square_invoice_number || null,
      square_invoice_id: input.square_invoice_id || null,
      client_name: input.client_name,
      client_email: input.client_email || null,
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: input.due_date || null,
      status: "draft",
      line_items: lineItems,
      subtotal: amount,
      tax: 0,
      total: amount,
      notes: input.notes || ""
    };
  }

  function nextDocumentNumber(type) {
    const prefix = type === "invoice" ? "INV" : "EST";
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const count = state.data.documents.filter((doc) => doc.type === type).length + 1;
    return `${prefix}-${stamp}-${String(count).padStart(3, "0")}`;
  }

  async function insertSalesDocument(input) {
    if (!state.documentsReady) {
      throw new Error("Create the sales_documents table first. See DASHBOARD_SETUP.md.");
    }
    const rows = await supabaseRestRequest("sales_documents", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(buildDocumentPayload(input))
    });
    return normalizeDocument(rows[0]);
  }

  async function syncSquareInvoice(documentId) {
    const session = getSession();
    if (!session || !session.accessToken) throw new Error("Please sign in again.");

    const response = await fetch("/api/sync-square-invoice", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`
      },
      body: JSON.stringify({ documentId })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to sync Square invoice.");
    return data.document ? normalizeDocument(data.document) : null;
  }

  async function updateSalesDocument(id, input) {
    const amount = Number(input.amount || 0);
    const lineItems = [{
      description: input.description || "Landscape service",
      quantity: 1,
      unit_price: amount,
      amount
    }];
    const rows = await supabaseRestRequest(`sales_documents?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        document_type: input.document_type || "estimate",
        client_name: input.client_name,
        client_email: input.client_email || null,
        square_invoice_number: input.square_invoice_number || null,
        due_date: input.due_date || null,
        status: input.status || "draft",
        line_items: lineItems,
        subtotal: amount,
        tax: 0,
        total: amount,
        notes: input.notes || ""
      })
    });
    return normalizeDocument(rows[0]);
  }

  async function insertReminder(payload) {
    const rows = await supabaseRestRequest("follow_up_reminders", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload)
    });
    return normalizeReminder(rows[0]);
  }

  async function insertContact(payload) {
    const rows = await supabaseRestRequest("contacts", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload)
    });
    return normalizeContact(rows[0]);
  }

  async function updateContact(id, payload) {
    await supabaseRestRequest(`contacts?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(payload)
    });
  }

  async function updateReminder(id, payload) {
    await supabaseRestRequest(`follow_up_reminders?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(payload)
    });
  }

  async function insertOperation(payload) {
    if (!state.operationsReady) {
      throw new Error("Create the operations_records table first. See DASHBOARD_OPERATIONS_SQL.md.");
    }
    const rows = await supabaseRestRequest("operations_records", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload)
    });
    return normalizeOperation(rows[0]);
  }

  async function upsertContactFromSubmission(item) {
    const existing = state.data.contacts.find((contact) => {
      const sameEmail = item.email !== "No email" && contact.email.toLowerCase() === item.email.toLowerCase();
      const samePhone = item.phone !== "No phone" && contact.phone === item.phone;
      return sameEmail || samePhone;
    });

    const payload = {
      name: item.name,
      email: item.email === "No email" ? null : item.email,
      phone: item.phone === "No phone" ? null : item.phone,
      contact_type: item.propertyType,
      city: item.city,
      status: item.status
    };

    if (existing) {
      await supabaseRestRequest(`contacts?id=eq.${encodeURIComponent(existing.id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(payload)
      });
      return;
    }

    await supabaseRestRequest("contacts", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(payload)
    });
  }

  async function updateSubmission(id, payload) {
    await supabaseRestRequest(`quote_submissions?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(payload)
    });
  }

  async function updateStatus(table, id, status) {
    if (!STATUSES.includes(status)) throw new Error("Invalid status.");
    return supabaseRestRequest(`${table}?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status })
    });
  }

  function getSession() {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    } catch (error) {
      clearSession();
      return null;
    }
  }

  function setSession(session) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  function setLoginStatus(message, tone) {
    if (!els.loginStatus) return;
    els.loginStatus.textContent = message || "";
    els.loginStatus.dataset.tone = tone || "";
  }

  function showLogin() {
    els.loginView.hidden = false;
    els.appView.hidden = true;
  }

  async function showApp() {
    els.loginView.hidden = true;
    els.appView.hidden = false;
    if (els.ownerEmail) els.ownerEmail.textContent = getOwnerEmail();
    await refreshDashboard();
  }

  function setActiveSection(section) {
    const sectionMap = {
      quotes: "documents",
      pipeline: "documents",
      schedule: "calendar",
      notes: "settings",
      reminders: "settings"
    };
    state.activeSection = sectionMap[section] || section || "overview";
    qsa("[data-section]").forEach((node) => {
      node.classList.toggle("is-active", node.dataset.section === state.activeSection);
    });
    qsa("[data-dashboard-link]").forEach((node) => {
      node.classList.toggle("is-active", node.dataset.dashboardLink === state.activeSection);
    });
  }

  function matchesSearch(item) {
    const query = state.search.trim().toLowerCase();
    if (!query) return true;
    return Object.values(item).some((value) => String(value || "").toLowerCase().includes(query)) || [
      item.name,
      item.email,
      item.phone,
      item.city,
      item.propertyType,
      item.service,
      item.source,
      item.followUp,
      item.notes
    ].some((value) => String(value || "").toLowerCase().includes(query));
  }

  function filteredSubmissions() {
    return state.data.submissions.filter((item) => {
      const statusMatches = state.statusFilter === "All" || item.status === state.statusFilter;
      const propertyMatches = state.propertyFilter === "All" || item.propertyType === state.propertyFilter;
      return statusMatches && propertyMatches && matchesSearch(item);
    });
  }

  function findSubmission(id) {
    return state.data.submissions.find((item) => item.id === id);
  }

  function filteredContacts() {
    return state.data.contacts.filter(matchesSearch);
  }

  function filteredJobs() {
    return state.data.jobs.filter(matchesSearch);
  }

  function filteredDocuments() {
    return state.data.documents.filter(matchesSearch);
  }

  function filteredReminders() {
    return state.data.reminders.filter(matchesSearch);
  }

  function filteredNotes() {
    return state.data.notes.filter(matchesSearch);
  }

  function filteredOperations() {
    return state.data.operations.filter((item) => {
      const typeMatches = state.operationsFilter === "All" || item.type === state.operationsFilter;
      return typeMatches && matchesSearch(item);
    });
  }

  function populatePropertyFilter(data) {
    if (!els.propertyFilter) return;
    const current = state.propertyFilter;
    const properties = Array.from(new Set(data.submissions.map((item) => item.propertyType).filter(Boolean))).sort();
    els.propertyFilter.innerHTML = `<option value="All">All Properties</option>${properties.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("")}`;
    els.propertyFilter.value = properties.includes(current) ? current : "All";
    state.propertyFilter = els.propertyFilter.value;
  }

  function renderMetrics(data) {
    const today = todayKey();
    const weekEnd = daysFromToday(7);
    const jobsThisWeek = data.jobs.filter((item) => item.dateRaw >= today && item.dateRaw <= weekEnd).length;
    const quotesPending = data.submissions.filter((item) => ["New", "Contacted"].includes(item.status)).length;
    const invoicesDue = data.documents.filter((item) => item.type === "invoice" && item.status !== "paid").length;
    const followUps = data.reminders.filter((item) => item.status !== "Completed").length;
    const openTasks = data.notes.length;
    const metrics = [
      ["Jobs this week", jobsThisWeek],
      ["Quotes pending", quotesPending],
      ["Invoices due", invoicesDue],
      ["Follow-ups needed", followUps],
      ["Open tasks", openTasks]
    ];

    els.metrics.innerHTML = metrics
      .map(([label, value]) => `<article class="metric-card"><strong>${value}</strong><span>${label}</span></article>`)
      .join("");
  }

  function renderSubmissions(data) {
    const items = filteredSubmissions();
    if (!items.length) {
      els.submissions.innerHTML = emptyState("No quote/contact submissions match this view yet.");
      return;
    }
    els.submissions.innerHTML = items.map((item) => `
      <article class="submission-card">
        <div class="item-topline">
          <div>
            <h4>${escapeHtml(item.name)}</h4>
            <div class="meta">${escapeHtml(item.city)} / ${escapeHtml(item.propertyType)} / ${escapeHtml(item.receivedAt)}</div>
          </div>
          ${statusBadge(item.status)}
        </div>
        <p class="item-body">${escapeHtml(item.service)}. ${escapeHtml(item.notes)}</p>
        <p class="small">Follow-up: ${escapeHtml(item.followUp)} / ${escapeHtml(item.phone)} / ${escapeHtml(item.email)}</p>
      </article>
    `).join("");
  }

  function renderUpcoming(data) {
    if (!data.jobs.length) {
      els.upcoming.innerHTML = emptyState("No scheduled visits yet.");
      return;
    }
    els.upcoming.innerHTML = data.jobs.slice(0, 3).map((job) => `
      <article class="job-card">
        <div class="item-topline">
          <div>
            <h4>${escapeHtml(job.site)}</h4>
            <div class="meta">${escapeHtml(job.date)} / ${escapeHtml(job.window)}</div>
          </div>
          ${statusBadge(job.status)}
        </div>
        <p class="item-body">${escapeHtml(job.service)} in ${escapeHtml(job.city)}</p>
      </article>
    `).join("");
  }

  function renderHomeReminders(data) {
    if (!els.homeReminders) return;
    const reminders = data.reminders.filter((item) => item.status !== "Completed").slice(0, 5);
    if (!reminders.length) {
      els.homeReminders.innerHTML = emptyState("No active follow-ups right now.");
      return;
    }
    els.homeReminders.innerHTML = reminders.map((reminder) => `
      <article class="reminder-card">
        <div class="item-topline">
          <div>
            <h4>${escapeHtml(reminder.task)}</h4>
            <div class="meta">Due: ${escapeHtml(reminder.due)}</div>
          </div>
          ${statusBadge(reminder.status)}
        </div>
      </article>
    `).join("");
  }

  function renderDashboardAlerts(data) {
    if (!els.dashboardAlerts) return;
    const today = todayKey();
    const soon = daysFromToday(7);
    const overdueReminders = data.reminders.filter((item) => item.dueRaw && item.dueRaw < today && item.status !== "Completed");
    const dueInvoices = data.documents.filter((item) => item.type === "invoice" && item.dueDateRaw && item.dueDateRaw <= soon && item.status !== "paid");
    const newQuotes = data.submissions.filter((item) => item.status === "New");
    const alerts = [
      overdueReminders.length ? `${overdueReminders.length} overdue follow-up${overdueReminders.length === 1 ? "" : "s"}` : "",
      dueInvoices.length ? `${dueInvoices.length} invoice${dueInvoices.length === 1 ? "" : "s"} due soon` : "",
      newQuotes.length ? `${newQuotes.length} new quote request${newQuotes.length === 1 ? "" : "s"}` : ""
    ].filter(Boolean);
    if (!alerts.length) {
      els.dashboardAlerts.innerHTML = "";
      return;
    }
    els.dashboardAlerts.innerHTML = alerts.map((alert) => `<button type="button" data-action="quick-add-follow-up">${escapeHtml(alert)}</button>`).join("");
  }

  function operationTypeLabel(value) {
    return String(value || "")
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function renderOperations(data) {
    if (!els.operationsSummary || !els.operationsList) return;
    const today = todayKey();
    const weekEnd = daysFromToday(7);
    const unpaidInvoices = data.documents.filter((doc) => doc.type === "invoice" && doc.status !== "paid");
    const overdueInvoices = unpaidInvoices.filter((doc) => doc.dueDateRaw && doc.dueDateRaw < today);
    const routeJobs = data.jobs.filter((job) => job.dateRaw >= today && job.dateRaw <= weekEnd);
    const pendingQuotes = data.submissions.filter((item) => ["New", "Contacted"].includes(item.status));
    const featureCards = [
      ["Recurring jobs", `${routeJobs.length} jobs in next 7 days`, "recurring_job"],
      ["Property profiles", `${data.contacts.length} clients to profile`, "property_profile"],
      ["Job checklists", "Templates for field work", "job_checklist"],
      ["Before/after photos", "Paste photo links or notes", "photo_log"],
      ["Estimate approvals", `${pendingQuotes.length} pending quotes`, "estimate_approval"],
      ["Invoice aging", `${overdueInvoices.length} overdue`, "invoice_aging"],
      ["Daily route", `${routeJobs.length} route stops`, "daily_route"],
      ["Quick call/email", "Use client cards", "quick_action"],
      ["Open in maps", "Track address actions", "quick_action"],
      ["Activity timeline", "Client history entries", "activity_timeline"],
      ["Archive notes", "Hide or preserve context", "archive"],
      ["Follow-up rules", "3-day and 7-day reminders", "automation_rule"],
      ["Maintenance plans", "Recurring service packages", "maintenance_plan"],
      ["Inspection notes", "Soil, drainage, plant health", "inspection_note"],
      ["Service history", "Property work records", "service_history"],
      ["Crew/day notes", "Daily field observations", "crew_note"],
      ["Revenue summary", `${formatCurrency(unpaidInvoices.reduce((sum, doc) => sum + (doc.squareAmountDueCents || Math.round(doc.total * 100)), 0), "USD")} open`, "revenue_note"],
      ["Quote to job", "Convert approved work", "quote_conversion"],
      ["Completion reports", "Notes, photos, timestamp", "completion_report"],
      ["Notifications", "Due work and missing info", "notification"]
    ];
    els.operationsSummary.innerHTML = featureCards.map(([title, detail, type]) => `
      <button class="operation-feature" type="button" data-action="prefill-operation" data-type="${escapeHtml(type)}" data-title="${escapeHtml(title)}">
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(detail)}</span>
      </button>
    `).join("");

    if (!state.operationsReady) {
      els.operationsList.innerHTML = emptyState("Saved operation records need the operations_records table. The feature cards above still summarize existing dashboard data.");
      return;
    }

    const operations = filteredOperations();
    if (!operations.length) {
      els.operationsList.innerHTML = emptyState("No saved operation records yet.");
      return;
    }
    els.operationsList.innerHTML = operations.map((item) => `
      <article class="operation-card">
        <div class="item-topline">
          <div>
            <p class="eyebrow">${escapeHtml(operationTypeLabel(item.type))}</p>
            <h4>${escapeHtml(item.title)}</h4>
            <div class="meta">${escapeHtml(item.clientName || "No client")} / ${escapeHtml(item.dueDate || "No due date")}</div>
          </div>
          <div class="card-actions">
            <span class="status">${escapeHtml(item.status)}</span>
            ${actionButton("Delete", "delete-operation", item.id).replace("inline-action", "inline-action danger-action")}
          </div>
        </div>
        <p class="item-body">${escapeHtml(item.propertyAddress || "")}</p>
        <p class="small">${escapeHtml(item.notes || "No notes yet.")}</p>
      </article>
    `).join("");
  }

  function documentStatusBadge(doc) {
    const squareStatus = String(doc.squareStatus || "").toUpperCase();
    const status = squareStatus === "PAID" || doc.status === "paid" ? "Paid" :
      doc.dueDateRaw && doc.dueDateRaw < todayKey() ? "Overdue" :
      squareStatus || doc.status || "Draft";
    return `<span class="status document-status document-status-${slug(status)}">${escapeHtml(status)}</span>`;
  }

  function buildCalendarEvents(data) {
    const events = [];
    data.jobs.forEach((job) => {
      events.push({
        id: `job-${job.id}`,
        sourceId: job.id,
        type: "job",
        date: job.dateRaw,
        title: job.service,
        client: job.site,
        property: job.city,
        time: job.window,
        status: job.status,
        action: "edit-job"
      });
    });
    data.submissions.forEach((item) => {
      if (item.createdAtRaw) {
        events.push({
          id: `quote-${item.id}`,
          sourceId: item.id,
          type: "quote",
          date: dateKey(item.createdAtRaw),
          title: item.service,
          client: item.name,
          property: item.city,
          time: "Quote request",
        status: item.status,
        action: "open-submission",
        actionLabel: "Open"
        });
      }
    });
    data.reminders.forEach((reminder) => {
      events.push({
      id: `reminder-${reminder.id}`,
      sourceId: reminder.id,
      type: "follow-up",
        date: reminder.dueRaw,
        title: reminder.task,
        client: "Follow-up",
        property: "",
        time: "Reminder",
        status: reminder.status,
        action: "complete-reminder",
        actionLabel: "Done",
        deleteAction: "delete-reminder"
      });
    });
    data.documents.forEach((doc) => {
      if (doc.dueDateRaw) {
        events.push({
          id: `invoice-${doc.id}`,
          sourceId: doc.id,
          type: doc.type === "invoice" ? "invoice" : "quote",
          date: doc.dueDateRaw,
          title: doc.number,
          client: doc.clientName,
          property: doc.clientEmail,
          time: doc.squareStatus || doc.status,
          status: doc.status,
          action: "open-document",
          actionLabel: "Open"
        });
      }
    });
    data.notes.forEach((note) => {
      events.push({
        id: `task-${note.id}`,
        sourceId: note.id,
        type: "task",
        date: todayKey(),
        title: note.title,
        client: "Task",
        property: note.body,
        time: "Open task",
        status: "New",
        deleteAction: "delete-note"
      });
    });
    return events
      .filter((event) => event.date)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  function calendarWindow(events) {
    const today = todayKey();
    if (state.calendarView === "today") {
      return events.filter((event) => event.date === today);
    }
    if (state.calendarView === "week") {
      const end = daysFromToday(7);
      return events.filter((event) => event.date >= today && event.date <= end);
    }
    if (state.calendarView === "month") {
      const currentMonth = today.slice(0, 7);
      return events.filter((event) => event.date.slice(0, 7) === currentMonth);
    }
    return events.filter((event) => event.date >= today).slice(0, 30);
  }

  function calendarGridDays() {
    const today = new Date(`${todayKey()}T12:00:00`);
    if (state.calendarView === "week") {
      const day = today.getDay();
      const start = new Date(today);
      start.setDate(today.getDate() - day);
      return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        return date.toISOString().slice(0, 10);
      });
    }
    if (state.calendarView === "month") {
      const first = new Date(today.getFullYear(), today.getMonth(), 1, 12);
      const start = new Date(first);
      start.setDate(first.getDate() - first.getDay());
      return Array.from({ length: 42 }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        return date.toISOString().slice(0, 10);
      });
    }
    return [];
  }

  function renderCalendarGrid(events) {
    const days = calendarGridDays();
    const currentMonth = todayKey().slice(0, 7);
    return `
      <div class="calendar-grid" data-view="${escapeHtml(state.calendarView)}">
        ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => `<div class="calendar-weekday">${day}</div>`).join("")}
        ${days.map((day) => {
          const dayEvents = events.filter((event) => event.date === day);
          return `
            <section class="calendar-day${day === todayKey() ? " is-today" : ""}${day.slice(0, 7) !== currentMonth ? " is-muted" : ""}">
              <div class="calendar-day-number">${new Date(`${day}T12:00:00`).getDate()}</div>
              <div class="calendar-day-events">
                ${dayEvents.slice(0, 3).map((event) => `
                  <button type="button" class="calendar-pill calendar-${escapeHtml(event.type)}" ${event.action ? `data-action="${escapeHtml(event.action)}" data-id="${escapeHtml(event.sourceId)}"` : ""}>
                    <span>${escapeHtml(event.title)}</span>
                  </button>
                `).join("")}
                ${dayEvents.length > 3 ? `<span class="calendar-more">+${dayEvents.length - 3} more</span>` : ""}
              </div>
            </section>
          `;
        }).join("")}
      </div>
      <div class="calendar-agenda-after-grid">
        ${events.length ? events.slice(0, 8).map(renderCalendarListCard).join("") : emptyState("No calendar items match this view.")}
      </div>
    `;
  }

  function renderCalendarListCard(event) {
    return `
      <article class="calendar-card calendar-${escapeHtml(event.type)}">
        <div>
          <p class="calendar-date">${escapeHtml(formatDate(event.date))}</p>
          <h4>${escapeHtml(event.title)}</h4>
          <p class="meta">${escapeHtml(event.client)}${event.property ? ` / ${escapeHtml(event.property)}` : ""}</p>
          <p class="item-body">${escapeHtml(event.time)} / ${escapeHtml(event.status)}</p>
        </div>
        <div class="calendar-actions">
          <span>${escapeHtml(event.type)}</span>
          ${event.action ? `<button class="inline-action" type="button" data-action="${escapeHtml(event.action)}" data-id="${escapeHtml(event.sourceId)}">${escapeHtml(event.actionLabel || "Open")}</button>` : ""}
          ${event.deleteAction ? `<button class="inline-action danger-action" type="button" data-action="${escapeHtml(event.deleteAction)}" data-id="${escapeHtml(event.sourceId)}">Delete</button>` : ""}
        </div>
      </article>
    `;
  }

  function renderCalendar(data) {
    if (!els.calendarList) return;
    let events = buildCalendarEvents(data);
    if (state.calendarFilter !== "All") {
      events = events.filter((event) => event.type === state.calendarFilter);
    }
    events = calendarWindow(events);
    qsa("[data-calendar-view]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.calendarView === state.calendarView);
    });
    if (!events.length) {
      els.calendarList.innerHTML = emptyState("No calendar items match this view.");
      return;
    }
    els.calendarList.innerHTML = ["week", "month"].includes(state.calendarView)
      ? renderCalendarGrid(events)
      : events.map(renderCalendarListCard).join("");
  }

  function renderQuoteTable(data) {
    const items = filteredSubmissions();
    if (!items.length) {
      els.quoteTable.innerHTML = `<tr><td colspan="6">${emptyState("No quote/contact submissions match this view yet.")}</td></tr>`;
      return;
    }
    els.quoteTable.innerHTML = items.map((item) => `
      <tr>
        <td><strong>${escapeHtml(item.name)}</strong><br><span class="meta">${escapeHtml(item.email)}<br>${escapeHtml(item.phone)}</span></td>
        <td>${escapeHtml(item.service)}<br><span class="meta">${escapeHtml(item.source)} / ${escapeHtml(item.receivedAt)}</span></td>
        <td>${escapeHtml(item.propertyType)}<br><span class="meta">${escapeHtml(item.city)}</span></td>
        <td>${statusSelect("quote_submissions", item.id, item.status)}</td>
        <td>${escapeHtml(item.followUp)}</td>
        <td>${actionButton("Open", "open-submission", item.id)}</td>
      </tr>
    `).join("");
  }

  function renderPipeline(data) {
    if (!els.pipeline) return;
    const items = filteredSubmissions();
    els.pipeline.innerHTML = STATUSES.map((status) => {
      const cards = items.filter((item) => item.status === status);
      return `
        <section class="pipeline-column">
          <h4>${escapeHtml(status)} <span>${cards.length}</span></h4>
          ${cards.length ? cards.map((item) => `
            <button class="pipeline-card" type="button" data-action="open-submission" data-id="${escapeHtml(item.id)}">
              <strong>${escapeHtml(item.name)}</strong>
              <span class="meta">${escapeHtml(item.service)} / ${escapeHtml(item.city)}</span>
            </button>
          `).join("") : emptyState("No leads")}
        </section>
      `;
    }).join("");
  }

  function renderContacts(data) {
    const contacts = filteredContacts();
    if (!contacts.length) {
      els.contacts.innerHTML = emptyState("No contacts yet.");
      return;
    }
    els.contacts.innerHTML = contacts.map((contact) => {
      const relatedJobs = data.jobs.filter((job) => job.site.toLowerCase() === contact.name.toLowerCase()).length;
      const relatedDocs = data.documents.filter((doc) => doc.clientName.toLowerCase() === contact.name.toLowerCase() || doc.clientEmail.toLowerCase() === contact.email.toLowerCase()).length;
      const relatedQuotes = data.submissions.filter((item) => item.name.toLowerCase() === contact.name.toLowerCase() || item.email.toLowerCase() === contact.email.toLowerCase()).length;
      return `
      <article class="contact-card">
        <div class="item-topline">
          <div>
            <h4>${escapeHtml(contact.name)}</h4>
            <div class="meta">${escapeHtml(contact.type)} / ${escapeHtml(contact.city)}</div>
          </div>
          <div class="card-actions">
            ${statusSelect("contacts", contact.id, contact.status)}
            ${actionButton("Open", "open-contact", contact.id)}
            ${actionButton("Delete", "delete-contact", contact.id).replace("inline-action", "inline-action danger-action")}
          </div>
        </div>
        <p class="item-body">${escapeHtml(contact.email)}<br>${escapeHtml(contact.phone)}</p>
        <p class="small">Related: ${relatedJobs} jobs / ${relatedQuotes} quotes / ${relatedDocs} docs</p>
      </article>
    `;
    }).join("");
  }

  function renderJobs(data) {
    const jobs = filteredJobs();
    if (!jobs.length) {
      els.jobs.innerHTML = emptyState("No scheduled jobs/visits yet.");
      return;
    }
    els.jobs.innerHTML = jobs.map((job) => `
      <article class="job-card">
        <div class="item-topline">
          <div>
            <h4>${escapeHtml(job.site)}</h4>
            <div class="meta">${escapeHtml(job.date)} / ${escapeHtml(job.window)}</div>
          </div>
          ${statusSelect("scheduled_jobs", job.id, job.status)}
        </div>
        <p class="item-body">${escapeHtml(job.service)}<br>${escapeHtml(job.city)}</p>
        <div class="job-actions">
          ${actionButton("Edit", "edit-job", job.id)}
          ${actionButton("Delete", "cancel-job", job.id).replace("inline-action", "inline-action danger-action")}
        </div>
      </article>
    `).join("");
  }

  function renderDocuments(data) {
    if (!els.documents) return;
    if (!state.documentsReady) {
      els.documents.innerHTML = emptyState("Document storage is not set up yet. Run the sales_documents SQL in DASHBOARD_SETUP.md.");
      return;
    }
    const docs = filteredDocuments();
    if (!docs.length) {
      els.documents.innerHTML = emptyState("No estimates or invoices yet.");
      return;
    }
    els.documents.innerHTML = docs.map((doc) => `
      <article class="document-card">
        <div class="item-topline">
          <div>
            <h4>${escapeHtml(doc.number)}</h4>
            <div class="meta">${escapeHtml(doc.type === "invoice" ? "Invoice" : "Estimate / Quote")} / ${escapeHtml(doc.status)}</div>
            ${documentStatusBadge(doc)}
            <div class="meta">Square invoice: ${escapeHtml(doc.squareInvoiceNumber || "Add invoice #, then sync")}</div>
            ${doc.squareStatus ? `<div class="meta">Square: ${escapeHtml(doc.squareStatus)}${doc.squareSyncedAt ? ` / synced ${escapeHtml(doc.squareSyncedAt)}` : ""}</div>` : ""}
          </div>
          <div class="document-card-actions">
            <button class="inline-action" type="button" data-action="open-document" data-id="${escapeHtml(doc.id)}">Open</button>
            <button class="inline-action" type="button" data-action="sync-square-document" data-id="${escapeHtml(doc.id)}">Sync Square</button>
            <button class="inline-action danger-action" type="button" data-action="delete-document" data-id="${escapeHtml(doc.id)}">Delete</button>
          </div>
        </div>
        <p class="item-body">${escapeHtml(doc.clientName)}<br>${escapeHtml(doc.clientEmail || "No email")}</p>
        <strong class="document-total">${doc.squareAmountDueCents !== null ? `${escapeHtml(formatCurrency(doc.squareAmountDueCents, doc.squareCurrency))} due` : `$${doc.total.toFixed(2)}`}</strong>
      </article>
    `).join("");
  }

  function renderNotes() {
    const notes = filteredNotes();
    if (!notes.length) {
      els.notes.innerHTML = emptyState("No job notes yet.");
      return;
    }
    els.notes.innerHTML = notes.map((note) => `
      <article class="note-card">
        <div class="item-topline">
          <h4>${escapeHtml(note.title)}</h4>
          <div class="card-actions">
            <span class="meta">${escapeHtml(note.date)}</span>
            ${actionButton("Delete", "delete-note", note.id).replace("inline-action", "inline-action danger-action")}
          </div>
        </div>
        <p class="item-body">${escapeHtml(note.body)}</p>
      </article>
    `).join("");
  }

  function renderReminders(data) {
    const reminders = filteredReminders();
    if (!reminders.length) {
      els.reminders.innerHTML = emptyState("No follow-up reminders yet.");
      return;
    }
    els.reminders.innerHTML = reminders.map((reminder) => `
      <article class="reminder-card">
        <div class="item-topline">
          <div>
            <h4>${escapeHtml(reminder.task)}</h4>
            <div class="meta">Due: ${escapeHtml(reminder.due)}</div>
          </div>
          <div class="card-actions">
            ${statusSelect("follow_up_reminders", reminder.id, reminder.status)}
            ${actionButton("Done", "complete-reminder", reminder.id)}
            ${actionButton("Delete", "delete-reminder", reminder.id).replace("inline-action", "inline-action danger-action")}
          </div>
        </div>
      </article>
    `).join("");
  }

  function renderTimeline(item) {
    const relatedJobs = state.data.jobs.filter((job) => job.site === item.name || job.site === item.propertyType);
    const relatedReminders = state.data.reminders.filter((reminder) => reminder.task.toLowerCase().includes(item.name.toLowerCase()));
    const entries = [
      { label: "Quote received", detail: item.receivedAt },
      { label: "Current status", detail: item.status },
      { label: "Follow-up", detail: item.followUp },
      ...relatedJobs.map((job) => ({ label: "Scheduled job", detail: `${job.date} / ${job.service}` })),
      ...relatedReminders.map((reminder) => ({ label: "Reminder", detail: `${reminder.due} / ${reminder.task}` }))
    ];
    return `<div class="timeline">${entries.map((entry) => `<div class="timeline-item"><strong>${escapeHtml(entry.label)}</strong><br>${escapeHtml(entry.detail)}</div>`).join("")}</div>`;
  }

  function openSubmissionDrawer(id) {
    const item = findSubmission(id);
    if (!item || !els.detailDrawer || !els.detailContent) return;
    state.selectedSubmissionId = id;
    els.detailDrawer.hidden = false;
    els.detailContent.innerHTML = `
      <div class="drawer-content">
        <p class="eyebrow">Quote Detail</p>
        <h3>${escapeHtml(item.name)}</h3>
        ${statusBadge(item.status)}
        <div class="drawer-grid">
          <div class="drawer-field"><span>Email</span>${escapeHtml(item.email)}</div>
          <div class="drawer-field"><span>Phone</span>${escapeHtml(item.phone)}</div>
          <div class="drawer-field"><span>City</span>${escapeHtml(item.city)}</div>
          <div class="drawer-field"><span>Property</span>${escapeHtml(item.propertyType)}</div>
          <div class="drawer-field"><span>Service</span>${escapeHtml(item.service)}</div>
          <div class="drawer-field"><span>Source</span>${escapeHtml(item.source)}</div>
        </div>

        <form class="drawer-form" data-submission-edit>
          <label>Status
            <select name="status">${STATUSES.map((status) => `<option value="${status}"${status === item.status ? " selected" : ""}>${status}</option>`).join("")}</select>
          </label>
          <label>Follow-up
            <input name="follow_up" value="${escapeHtml(item.followUp === "Not set" ? "" : item.followUp)}" placeholder="Call today, send estimate, check in Friday...">
          </label>
          <label>Notes
            <textarea name="notes" rows="5">${escapeHtml(item.notes)}</textarea>
          </label>
          <div class="drawer-actions">
            <button type="submit">Save Quote</button>
            <button type="button" data-action="sync-contact" data-id="${escapeHtml(item.id)}">Sync Contact</button>
            <button type="button" data-action="create-estimate" data-id="${escapeHtml(item.id)}">Create Estimate</button>
            <button type="button" data-action="create-invoice" data-id="${escapeHtml(item.id)}">Create Invoice</button>
            <button type="button" class="danger-action" data-action="delete-submission" data-id="${escapeHtml(item.id)}">Delete Quote</button>
          </div>
        </form>

        <form class="schedule-form" data-schedule-form>
          <h4>Create scheduled job/visit</h4>
          <input name="visit_date" type="date" required>
          <input name="visit_window" placeholder="Visit window, e.g. 9 AM - 11 AM">
          <input name="service" value="${escapeHtml(item.service)}" placeholder="Service">
          <div class="drawer-actions">
            <button type="submit">Create Job</button>
            <button type="button" data-action="create-reminder" data-id="${escapeHtml(item.id)}">Create Follow-Up Reminder</button>
          </div>
        </form>

        <h4>Contact timeline</h4>
        ${renderTimeline(item)}
      </div>
    `;
  }

  function openContactDrawer(id) {
    const contact = state.data.contacts.find((item) => item.id === id);
    if (!contact || !els.detailDrawer || !els.detailContent) return;
    const relatedJobs = state.data.jobs.filter((job) => job.site.toLowerCase() === contact.name.toLowerCase());
    const relatedDocs = state.data.documents.filter((doc) => doc.clientName.toLowerCase() === contact.name.toLowerCase() || doc.clientEmail.toLowerCase() === contact.email.toLowerCase());
    const relatedQuotes = state.data.submissions.filter((item) => item.name.toLowerCase() === contact.name.toLowerCase() || item.email.toLowerCase() === contact.email.toLowerCase());
    els.detailDrawer.hidden = false;
    els.detailContent.innerHTML = `
      <div class="drawer-content">
        <p class="eyebrow">Client Detail</p>
        <h3>${escapeHtml(contact.name)}</h3>
        <form class="drawer-form" data-contact-edit data-id="${escapeHtml(contact.id)}">
          <label>Name<input name="name" value="${escapeHtml(contact.name)}" required></label>
          <label>Email<input name="email" type="email" value="${escapeHtml(contact.email === "No email" ? "" : contact.email)}"></label>
          <label>Phone<input name="phone" value="${escapeHtml(contact.phone === "No phone" ? "" : contact.phone)}"></label>
          <label>Property / area<input name="city" value="${escapeHtml(contact.city === "Not provided" ? "" : contact.city)}"></label>
          <label>Type<input name="contact_type" value="${escapeHtml(contact.type === "Contact" ? "" : contact.type)}"></label>
          <label>Status<select name="status">${STATUSES.map((status) => `<option value="${status}"${status === contact.status ? " selected" : ""}>${status}</option>`).join("")}</select></label>
          <div class="drawer-actions">
            <button type="submit">Save Client</button>
            <button type="button" data-action="quick-add-job">Add Job</button>
            <button type="button" data-action="quick-add-quote">Add Quote</button>
            <button type="button" class="danger-action" data-action="delete-contact" data-id="${escapeHtml(contact.id)}">Delete Client</button>
          </div>
        </form>
        <h4>Related work</h4>
        <div class="timeline">
          ${relatedQuotes.map((item) => `<div class="timeline-item"><strong>Quote</strong><br>${escapeHtml(item.service)} / ${escapeHtml(item.status)}</div>`).join("")}
          ${relatedJobs.map((job) => `<div class="timeline-item"><strong>Job</strong><br>${escapeHtml(job.date)} / ${escapeHtml(job.service)}</div>`).join("")}
          ${relatedDocs.map((doc) => `<div class="timeline-item"><strong>${escapeHtml(doc.type)}</strong><br>${escapeHtml(doc.number)} / ${escapeHtml(doc.status)}</div>`).join("")}
          ${!relatedQuotes.length && !relatedJobs.length && !relatedDocs.length ? emptyState("No related work yet.") : ""}
        </div>
      </div>
    `;
  }

  function openJobDrawer(id) {
    const job = state.data.jobs.find((item) => item.id === id);
    if (!job || !els.detailDrawer || !els.detailContent) return;
    state.selectedJobId = id;
    els.detailDrawer.hidden = false;
    els.detailContent.innerHTML = `
      <div class="drawer-content">
        <p class="eyebrow">Schedule Detail</p>
        <h3>${escapeHtml(job.site)}</h3>
        <form class="drawer-form" data-job-edit-form>
          <label>Visit date
            <input name="visit_date" type="date" value="${escapeHtml(toDateInputValue(job.dateRaw))}" required>
          </label>
          <label>Visit window
            <input name="visit_window" value="${escapeHtml(job.window === "Window not set" ? "" : job.window)}">
          </label>
          <label>Site / customer
            <input name="site_name" value="${escapeHtml(job.site)}" required>
          </label>
          <label>City
            <input name="city" value="${escapeHtml(job.city === "Not provided" ? "" : job.city)}">
          </label>
          <label>Service
            <input name="service" value="${escapeHtml(job.service)}" required>
          </label>
          <label>Status
            <select name="status">${STATUSES.map((status) => `<option value="${status}"${status === job.status ? " selected" : ""}>${status}</option>`).join("")}</select>
          </label>
          <div class="drawer-actions">
            <button type="submit">Save Visit</button>
            <button type="button" class="danger-action" data-action="cancel-job" data-id="${escapeHtml(job.id)}">Cancel Visit</button>
          </div>
        </form>
      </div>
    `;
  }

  function openDocumentDrawer(id) {
    const doc = state.data.documents.find((item) => item.id === id);
    if (!doc || !els.detailDrawer || !els.detailContent) return;
    els.detailDrawer.hidden = false;
    els.detailContent.innerHTML = `
      <div class="drawer-content">
        <p class="eyebrow">${escapeHtml(doc.type === "invoice" ? "Invoice" : "Estimate / Quote")}</p>
        ${renderPrintableDocument(doc)}
        <div class="drawer-grid">
          <div class="drawer-field"><span>Square Invoice</span>${escapeHtml(doc.squareInvoiceNumber || "Not linked")}</div>
          <div class="drawer-field"><span>Square Status</span>${escapeHtml(doc.squareStatus || "Not synced")}</div>
          <div class="drawer-field"><span>Amount Due</span>${doc.squareAmountDueCents !== null ? escapeHtml(formatCurrency(doc.squareAmountDueCents, doc.squareCurrency)) : "Not synced"}</div>
          <div class="drawer-field"><span>Last Sync</span>${escapeHtml(doc.squareSyncedAt || "Never")}</div>
        </div>
        <div class="drawer-actions">
          <button type="button" data-action="sync-square-document" data-id="${escapeHtml(doc.id)}">Sync with Square</button>
          <button type="button" data-action="print-document" data-id="${escapeHtml(doc.id)}">Print / Save PDF</button>
          ${doc.squarePaymentUrl ? `<a class="button" href="${escapeHtml(doc.squarePaymentUrl)}" target="_blank" rel="noopener noreferrer">Open Square Payment Link</a>` : ""}
          <button type="button" class="danger-action" data-action="delete-document" data-id="${escapeHtml(doc.id)}">Delete Document</button>
        </div>
        <form class="drawer-form" data-document-edit data-id="${escapeHtml(doc.id)}">
          <h4>Edit document</h4>
          <label>Type<select name="document_type"><option value="estimate"${doc.type === "estimate" ? " selected" : ""}>Estimate / Quote</option><option value="invoice"${doc.type === "invoice" ? " selected" : ""}>Invoice</option></select></label>
          <label>Client name<input name="client_name" value="${escapeHtml(doc.clientName)}" required></label>
          <label>Client email<input name="client_email" type="email" value="${escapeHtml(doc.clientEmail)}"></label>
          <label>Square invoice #<input name="square_invoice_number" value="${escapeHtml(doc.squareInvoiceNumber)}"></label>
          <label>Description<input name="description" value="${escapeHtml(doc.lineItems[0]?.description || "")}" required></label>
          <label>Amount<input name="amount" type="number" min="0" step="0.01" value="${escapeHtml(doc.total)}"></label>
          <label>Due date<input name="due_date" type="date" value="${escapeHtml(doc.dueDateRaw)}"></label>
          <label>Status<select name="status"><option value="draft"${doc.status === "draft" ? " selected" : ""}>Draft</option><option value="sent"${doc.status === "sent" ? " selected" : ""}>Sent</option><option value="paid"${doc.status === "paid" ? " selected" : ""}>Paid</option><option value="void"${doc.status === "void" ? " selected" : ""}>Void</option></select></label>
          <label>Notes<textarea name="notes" rows="3">${escapeHtml(doc.notes)}</textarea></label>
          <div class="drawer-actions"><button type="submit">Save Document</button></div>
        </form>
      </div>
    `;
  }

  function renderPrintableDocument(doc) {
    return `
      <section class="print-document">
        <h1>Urban Yards</h1>
        <p><strong>${escapeHtml(doc.type === "invoice" ? "Invoice" : "Estimate / Quote")} ${escapeHtml(doc.number)}</strong></p>
        <p>${escapeHtml(doc.clientName)}<br>${escapeHtml(doc.clientEmail || "")}</p>
        <p>Issued: ${escapeHtml(doc.issueDate)}<br>Due: ${escapeHtml(doc.dueDate)}</p>
        <table>
          <thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead>
          <tbody>${doc.lineItems.map((item) => `
            <tr>
              <td>${escapeHtml(item.description || "")}</td>
              <td>${escapeHtml(item.quantity || 1)}</td>
              <td>$${Number(item.unit_price || 0).toFixed(2)}</td>
              <td>$${Number(item.amount || 0).toFixed(2)}</td>
            </tr>
          `).join("")}</tbody>
        </table>
        <p><strong>Total: $${doc.total.toFixed(2)}</strong></p>
        ${doc.notes ? `<p>${escapeHtml(doc.notes)}</p>` : ""}
      </section>
    `;
  }

  function printDocument(id) {
    const doc = state.data.documents.find((item) => item.id === id);
    if (!doc) return;
    const win = window.open("", "_blank", "noopener,noreferrer");
    if (!win) {
      setDashboardState("Popup blocked. Allow popups to print documents.", "error");
      return;
    }
    win.document.write(`<!DOCTYPE html><html><head><title>${escapeHtml(doc.number)}</title><style>body{font-family:Georgia,serif;color:#17251d;padding:32px}h1{color:#123f31}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{border-bottom:1px solid #dfe6df;padding:10px;text-align:left}</style></head><body>${renderPrintableDocument(doc)}</body></html>`);
    win.document.close();
    win.print();
  }

  function closeSubmissionDrawer() {
    state.selectedSubmissionId = "";
    if (els.detailDrawer) els.detailDrawer.hidden = true;
    if (els.detailContent) els.detailContent.innerHTML = "";
  }

  function csvValue(value) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
  }

  function downloadCsv(filename, rows) {
    const csv = rows.map((row) => row.map(csvValue).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function exportData(type) {
    if (type === "submissions") {
      downloadCsv("urban-yards-quotes.csv", [
        ["Name", "Email", "Phone", "City", "Property", "Service", "Status", "Follow-Up", "Source", "Received", "Notes"],
        ...filteredSubmissions().map((item) => [item.name, item.email, item.phone, item.city, item.propertyType, item.service, item.status, item.followUp, item.source, item.receivedAt, item.notes])
      ]);
    } else if (type === "contacts") {
      downloadCsv("urban-yards-contacts.csv", [
        ["Name", "Email", "Phone", "Type", "City", "Status"],
        ...state.data.contacts.map((item) => [item.name, item.email, item.phone, item.type, item.city, item.status])
      ]);
    } else if (type === "jobs") {
      downloadCsv("urban-yards-jobs.csv", [
        ["Site", "City", "Service", "Date", "Window", "Status"],
        ...state.data.jobs.map((item) => [item.site, item.city, item.service, item.date, item.window, item.status])
      ]);
    }
  }

  async function render() {
    const data = state.data;
    populatePropertyFilter(data);
    renderMetrics(data);
    renderDashboardAlerts(data);
    renderSubmissions(data);
    renderUpcoming(data);
    renderHomeReminders(data);
    renderQuoteTable(data);
    renderPipeline(data);
    renderDocuments(data);
    renderContacts(data);
    renderJobs(data);
    renderNotes();
    renderReminders(data);
    renderCalendar(data);
    renderOperations(data);
    if (els.todayChip) els.todayChip.textContent = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
    setActiveSection(state.activeSection);
  }

  async function refreshDashboard() {
    state.loading = true;
    state.error = "";
    setDashboardState("Loading dashboard records...");
    els.metrics.innerHTML = [
      ["Jobs this week", "..."],
      ["Quotes pending", "..."],
      ["Invoices due", "..."],
      ["Follow-ups needed", "..."],
      ["Open tasks", "..."]
    ].map(([label, value]) => `<article class="metric-card"><strong>${value}</strong><span>${label}</span></article>`).join("");
    els.submissions.innerHTML = loadingState("Loading submissions...");
    els.upcoming.innerHTML = loadingState("Loading visits...");

    try {
      state.data = await loadDashboardData();
      state.loading = false;
      setDashboardState("");
      await render();
    } catch (error) {
      state.loading = false;
      state.error = error.message || "Unable to load dashboard records.";
      setDashboardState(state.error, "error");
      els.submissions.innerHTML = emptyState("Dashboard records could not be loaded.");
      els.upcoming.innerHTML = emptyState("Scheduled visits could not be loaded.");
    }
  }

  function bindEvents() {
    els.loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(els.loginForm);
      const email = String(formData.get("email") || "").trim();
      const password = String(formData.get("password") || "");

      try {
        setLoginStatus("Checking access...");
        const session = await signInOwner(email, password);
        setSession(session);
        setLoginStatus("");
        await showApp();
      } catch (error) {
        setLoginStatus(error.message || "Unable to sign in.", "error");
      }
    });

    qsa("[data-dashboard-link]").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        setActiveSection(link.dataset.dashboardLink);
        history.replaceState(null, "", `#${link.dataset.dashboardLink}`);
      });
    });

    qsa("[data-calendar-view]").forEach((button) => {
      button.addEventListener("click", async () => {
        state.calendarView = button.dataset.calendarView || "agenda";
        await render();
      });
    });

    els.statusFilter.addEventListener("change", async () => {
      state.statusFilter = els.statusFilter.value;
      await render();
    });

    if (els.search) {
      els.search.addEventListener("input", async () => {
        state.search = els.search.value;
        if (els.globalSearch && els.globalSearch.value !== state.search) els.globalSearch.value = state.search;
        await render();
      });
    }

    if (els.globalSearch) {
      els.globalSearch.addEventListener("input", async () => {
        state.search = els.globalSearch.value;
        if (els.search && els.search.value !== state.search) els.search.value = state.search;
        await render();
      });
    }

    if (els.propertyFilter) {
      els.propertyFilter.addEventListener("change", async () => {
        state.propertyFilter = els.propertyFilter.value;
        await render();
      });
    }

    if (els.calendarFilter) {
      els.calendarFilter.addEventListener("change", async () => {
        state.calendarFilter = els.calendarFilter.value;
        await render();
      });
    }

    if (els.operationsFilter) {
      els.operationsFilter.addEventListener("change", async () => {
        state.operationsFilter = els.operationsFilter.value;
        await render();
      });
    }

    els.noteForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(els.noteForm);
      const title = String(formData.get("title") || "").trim();
      const body = String(formData.get("body") || "").trim();
      if (!title || !body) return;

      try {
        setDashboardState("Saving note...");
        const note = await insertJobNote(title, body);
        state.data.notes.unshift(note);
        els.noteForm.reset();
        renderNotes();
        setDashboardState("");
      } catch (error) {
        setDashboardState(error.message || "Unable to save note.", "error");
      }
    });

    els.appView.addEventListener("change", async (event) => {
      const target = event.target;
      if (!target || !target.matches("[data-status-table][data-status-id]")) return;

      try {
        setDashboardState("Updating status...");
        await updateStatus(target.dataset.statusTable, target.dataset.statusId, target.value);
        await refreshDashboard();
      } catch (error) {
        setDashboardState(error.message || "Unable to update status.", "error");
      }
    });

    els.appView.addEventListener("click", async (event) => {
      const target = event.target.closest("[data-action], [data-export]");
      if (!target) return;

      const action = target.dataset.action;
      const id = target.dataset.id;

      if (target.dataset.export) {
        exportData(target.dataset.export);
        return;
      }

      if (action === "open-submission") {
        openSubmissionDrawer(id);
      } else if (action === "open-contact") {
        openContactDrawer(id);
      } else if (action === "quick-add-job") {
        setActiveSection("calendar");
        history.replaceState(null, "", "#calendar");
        const input = qs("[data-job-create-form] input[name='site_name']");
        if (input) input.focus();
      } else if (action === "quick-add-quote") {
        setActiveSection("documents");
        history.replaceState(null, "", "#documents");
        const input = qs("[data-document-form] input[name='client_name']");
        if (input) input.focus();
      } else if (action === "quick-add-follow-up" || action === "quick-add-invoice-reminder") {
        setActiveSection("settings");
        history.replaceState(null, "", "#settings");
        if (els.noteForm) {
          const titleInput = els.noteForm.querySelector("input[name='title']");
          if (titleInput) {
            titleInput.value = action === "quick-add-invoice-reminder" ? "Invoice reminder" : "Follow-up";
            titleInput.focus();
          }
        }
      } else if (action === "quick-add-client") {
        setActiveSection("contacts");
        history.replaceState(null, "", "#contacts");
        const input = qs("[data-client-form] input[name='name']");
        if (input) input.focus();
      } else if (action === "quick-add-operation") {
        setActiveSection("operations");
        history.replaceState(null, "", "#operations");
        const input = qs("[data-operations-form] input[name='title']");
        if (input) input.focus();
      } else if (action === "prefill-operation") {
        setActiveSection("operations");
        history.replaceState(null, "", "#operations");
        const form = qs("[data-operations-form]");
        if (form) {
          form.record_type.value = target.dataset.type || "property_profile";
          form.title.value = target.dataset.title || "";
          form.notes.focus();
        }
      } else if (action === "refresh-dashboard") {
        await refreshDashboard();
      } else if (action === "sync-contact") {
        const item = findSubmission(id);
        if (!item) return;
        try {
          setDashboardState("Syncing contact...");
          await upsertContactFromSubmission(item);
          await refreshDashboard();
          openSubmissionDrawer(id);
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to sync contact.", "error");
        }
      } else if (action === "create-reminder") {
        const item = findSubmission(id);
        if (!item) return;
        try {
          setDashboardState("Creating reminder...");
          await insertReminder({
            task: `Follow up with ${item.name}`,
            status: "New",
            related_submission_id: item.id
          });
          await refreshDashboard();
          openSubmissionDrawer(id);
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to create reminder.", "error");
        }
      } else if (action === "create-estimate" || action === "create-invoice") {
        const item = findSubmission(id);
        if (!item) return;
        try {
          setDashboardState("Creating document...");
          await insertSalesDocument({
            document_type: action === "create-invoice" ? "invoice" : "estimate",
            client_name: item.name,
            client_email: item.email === "No email" ? "" : item.email,
            square_invoice_number: "",
            description: item.service,
            amount: 0,
            notes: `Created from quote submission ${item.id}. ${item.notes}`
          });
          if (action === "create-invoice") await updateStatus("quote_submissions", item.id, "Invoiced");
          await refreshDashboard();
          setActiveSection("documents");
          closeSubmissionDrawer();
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to create document.", "error");
        }
      } else if (action === "edit-job") {
        openJobDrawer(id);
      } else if (action === "cancel-job") {
        const ok = window.confirm("Delete this scheduled visit?");
        if (!ok) return;
        try {
          setDashboardState("Canceling visit...");
          await cancelScheduledJob(id);
          closeSubmissionDrawer();
          await refreshDashboard();
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to cancel visit.", "error");
        }
      } else if (action === "open-document") {
        openDocumentDrawer(id);
      } else if (action === "delete-document") {
        const ok = window.confirm("Delete this document record? Square invoices are not deleted.");
        if (!ok) return;
        try {
          setDashboardState("Deleting document...");
          await deleteRow("sales_documents", id);
          closeSubmissionDrawer();
          await refreshDashboard();
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to delete document.", "error");
        }
      } else if (action === "sync-square-document") {
        try {
          setDashboardState("Syncing with Square...");
          const document = await syncSquareInvoice(id);
          await refreshDashboard();
          if (document) openDocumentDrawer(document.id);
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to sync Square invoice.", "error");
        }
      } else if (action === "print-document") {
        printDocument(id);
      } else if (action === "delete-contact") {
        const ok = window.confirm("Delete this client?");
        if (!ok) return;
        try {
          setDashboardState("Deleting client...");
          await deleteRow("contacts", id);
          closeSubmissionDrawer();
          await refreshDashboard();
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to delete client.", "error");
        }
      } else if (action === "delete-submission") {
        const ok = window.confirm("Delete this quote/contact submission?");
        if (!ok) return;
        try {
          setDashboardState("Deleting quote...");
          await deleteRow("quote_submissions", id);
          closeSubmissionDrawer();
          await refreshDashboard();
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to delete quote.", "error");
        }
      } else if (action === "complete-reminder") {
        try {
          setDashboardState("Marking complete...");
          await updateReminder(id, { status: "Completed" });
          await refreshDashboard();
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to update reminder.", "error");
        }
      } else if (action === "delete-reminder") {
        const ok = window.confirm("Delete this reminder?");
        if (!ok) return;
        try {
          setDashboardState("Deleting reminder...");
          await deleteRow("follow_up_reminders", id);
          await refreshDashboard();
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to delete reminder.", "error");
        }
      } else if (action === "delete-note") {
        const ok = window.confirm("Delete this task/note?");
        if (!ok) return;
        try {
          setDashboardState("Deleting task...");
          await deleteRow("job_notes", id);
          await refreshDashboard();
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to delete task.", "error");
        }
      } else if (action === "delete-operation") {
        const ok = window.confirm("Delete this operation record?");
        if (!ok) return;
        try {
          setDashboardState("Deleting operation...");
          await deleteRow("operations_records", id);
          await refreshDashboard();
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to delete operation.", "error");
        }
      }
    });

    els.appView.addEventListener("submit", async (event) => {
      if (event.target.matches("[data-submission-edit]")) {
        event.preventDefault();
        const item = findSubmission(state.selectedSubmissionId);
        if (!item) return;
        const formData = new FormData(event.target);
        try {
          setDashboardState("Saving quote...");
          await updateSubmission(item.id, {
            status: String(formData.get("status") || "New"),
            follow_up: String(formData.get("follow_up") || ""),
            notes: String(formData.get("notes") || "")
          });
          await refreshDashboard();
          openSubmissionDrawer(item.id);
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to save quote.", "error");
        }
      } else if (event.target.matches("[data-schedule-form]")) {
        event.preventDefault();
        const item = findSubmission(state.selectedSubmissionId);
        if (!item) return;
        const formData = new FormData(event.target);
        try {
          setDashboardState("Creating job...");
          await insertScheduledJob({
            visit_date: String(formData.get("visit_date") || ""),
            visit_window: String(formData.get("visit_window") || ""),
            site_name: item.name,
            city: item.city,
            service: String(formData.get("service") || item.service),
            status: "Scheduled"
          });
          await updateStatus("quote_submissions", item.id, "Scheduled");
          await refreshDashboard();
          openSubmissionDrawer(item.id);
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to create job.", "error");
        }
      } else if (event.target.matches("[data-job-edit-form]")) {
        event.preventDefault();
        const formData = new FormData(event.target);
        try {
          setDashboardState("Saving visit...");
          await updateScheduledJob(state.selectedJobId, {
            visit_date: String(formData.get("visit_date") || ""),
            visit_window: String(formData.get("visit_window") || ""),
            site_name: String(formData.get("site_name") || ""),
            city: String(formData.get("city") || ""),
            service: String(formData.get("service") || ""),
            status: String(formData.get("status") || "Scheduled")
          });
          closeSubmissionDrawer();
          await refreshDashboard();
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to save visit.", "error");
        }
      } else if (event.target.matches("[data-document-form]")) {
        event.preventDefault();
        const formData = new FormData(event.target);
        try {
          setDashboardState("Creating document...");
          const document = await insertSalesDocument({
            document_type: String(formData.get("document_type") || "estimate"),
            client_name: String(formData.get("client_name") || ""),
            client_email: String(formData.get("client_email") || ""),
            square_invoice_number: String(formData.get("square_invoice_number") || ""),
            description: String(formData.get("description") || ""),
            amount: Number(formData.get("amount") || 0),
            due_date: String(formData.get("due_date") || "")
          });
          event.target.reset();
          await refreshDashboard();
          openDocumentDrawer(document.id);
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to create document.", "error");
        }
      } else if (event.target.matches("[data-job-create-form]")) {
        event.preventDefault();
        const formData = new FormData(event.target);
        try {
          setDashboardState("Adding visit...");
          await insertScheduledJob({
            visit_date: String(formData.get("visit_date") || ""),
            visit_window: String(formData.get("visit_window") || ""),
            site_name: String(formData.get("site_name") || ""),
            city: String(formData.get("city") || ""),
            service: String(formData.get("service") || ""),
            status: "Scheduled"
          });
          event.target.reset();
          await refreshDashboard();
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to add visit.", "error");
        }
      } else if (event.target.matches("[data-client-form]")) {
        event.preventDefault();
        const formData = new FormData(event.target);
        try {
          setDashboardState("Adding client...");
          await insertContact({
            name: String(formData.get("name") || ""),
            email: String(formData.get("email") || "") || null,
            phone: String(formData.get("phone") || "") || null,
            city: String(formData.get("city") || "") || null,
            contact_type: String(formData.get("contact_type") || "") || "Client",
            status: "New"
          });
          event.target.reset();
          await refreshDashboard();
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to add client.", "error");
        }
      } else if (event.target.matches("[data-operations-form]")) {
        event.preventDefault();
        const formData = new FormData(event.target);
        try {
          setDashboardState("Saving operation...");
          await insertOperation({
            record_type: String(formData.get("record_type") || "property_profile"),
            title: String(formData.get("title") || ""),
            client_name: String(formData.get("client_name") || "") || null,
            property_address: String(formData.get("property_address") || "") || null,
            due_date: String(formData.get("due_date") || "") || null,
            status: String(formData.get("status") || "Active"),
            notes: String(formData.get("notes") || ""),
            payload: {}
          });
          event.target.reset();
          await refreshDashboard();
          setActiveSection("operations");
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to save operation.", "error");
        }
      } else if (event.target.matches("[data-contact-edit]")) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const id = event.target.dataset.id;
        try {
          setDashboardState("Saving client...");
          await updateContact(id, {
            name: String(formData.get("name") || ""),
            email: String(formData.get("email") || "") || null,
            phone: String(formData.get("phone") || "") || null,
            city: String(formData.get("city") || "") || null,
            contact_type: String(formData.get("contact_type") || "") || "Client",
            status: String(formData.get("status") || "New")
          });
          await refreshDashboard();
          openContactDrawer(id);
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to save client.", "error");
        }
      } else if (event.target.matches("[data-document-edit]")) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const id = event.target.dataset.id;
        try {
          setDashboardState("Saving document...");
          const document = await updateSalesDocument(id, {
            document_type: String(formData.get("document_type") || "estimate"),
            client_name: String(formData.get("client_name") || ""),
            client_email: String(formData.get("client_email") || ""),
            square_invoice_number: String(formData.get("square_invoice_number") || ""),
            description: String(formData.get("description") || ""),
            amount: Number(formData.get("amount") || 0),
            due_date: String(formData.get("due_date") || ""),
            status: String(formData.get("status") || "draft"),
            notes: String(formData.get("notes") || "")
          });
          await refreshDashboard();
          openDocumentDrawer(document.id);
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to save document.", "error");
        }
      }
    });

    if (els.closeDetail) {
      els.closeDetail.addEventListener("click", closeSubmissionDrawer);
    }

    if (els.refreshDashboard) {
      els.refreshDashboard.addEventListener("click", refreshDashboard);
    }

    els.newNote.addEventListener("click", () => {
      setActiveSection("settings");
      history.replaceState(null, "", "#settings");
      const titleInput = els.noteForm.querySelector("input[name='title']");
      if (titleInput) titleInput.focus();
    });

    els.signOut.addEventListener("click", async () => {
      await signOutOwner();
      showLogin();
    });
  }

  function cacheElements() {
    els.loginView = qs("[data-view='login']");
    els.appView = qs("[data-view='app']");
    els.loginForm = qs("[data-login-form]");
    els.loginStatus = qs("[data-login-status]");
    els.ownerEmail = qs("[data-owner-email]");
    els.signOut = qs("[data-sign-out]");
    els.newNote = qs("[data-new-note]");
    els.refreshDashboard = qs("[data-refresh-dashboard]");
    els.dashboardState = qs("[data-dashboard-state]");
    els.search = qs("[data-dashboard-search]");
    els.globalSearch = qs("[data-global-search]");
    els.propertyFilter = qs("[data-property-filter]");
    els.pipeline = qs("[data-pipeline]");
    els.documents = qs("[data-documents]");
    els.calendarFilter = qs("[data-calendar-filter]");
    els.operationsFilter = qs("[data-operations-filter]");
    els.calendarList = qs("[data-calendar-list]");
    els.operationsSummary = qs("[data-operations-summary]");
    els.operationsList = qs("[data-operations-list]");
    els.homeReminders = qs("[data-home-reminders]");
    els.dashboardAlerts = qs("[data-dashboard-alerts]");
    els.todayChip = qs("[data-today-chip]");
    els.detailDrawer = qs("[data-detail-drawer]");
    els.detailContent = qs("[data-detail-content]");
    els.closeDetail = qs("[data-close-detail]");
    els.metrics = qs("[data-metrics]");
    els.statusFilter = qs("[data-status-filter]");
    els.submissions = qs("[data-submissions]");
    els.upcoming = qs("[data-upcoming]");
    els.quoteTable = qs("[data-quote-table]");
    els.contacts = qs("[data-contacts]");
    els.jobs = qs("[data-jobs]");
    els.noteForm = qs("[data-note-form]");
    els.clientForm = qs("[data-client-form]");
    els.notes = qs("[data-notes]");
    els.reminders = qs("[data-reminders]");
  }

  async function init() {
    cacheElements();
    bindEvents();
    const hashSection = window.location.hash.replace("#", "");
    if (hashSection) state.activeSection = hashSection;

    const session = getSession();
    if (!session) {
      showLogin();
      return;
    }

    try {
      const verifiedSession = await verifySession(session);
      setSession(verifiedSession);
      await showApp();
    } catch (error) {
      clearSession();
      showLogin();
      setLoginStatus("Please sign in again.");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
