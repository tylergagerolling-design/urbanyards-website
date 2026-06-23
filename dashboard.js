(function () {
  "use strict";

  const STATUSES = ["New", "Contacted", "Scheduled", "Completed", "Invoiced"];
  const ROUTE_STATUSES = ["Planned", "In Progress", "Complete"];
  const COMMAND_CATEGORIES = ["task", "client", "payment", "deadline", "equipment"];
  const SESSION_KEY = "urbanYardsDashboardSession";
  const DEMO_QUERY_KEYS = ["demo", "test"];

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
    calendarRangeOffset: 0,
    operationsFilter: "All",
    routeDate: todayKey(),
    selectedRouteStopId: "",
    search: "",
    propertyFilter: "All",
    selectedSubmissionId: "",
    selectedJobId: "",
    documentsReady: true,
    operationsReady: true,
    routeStopsReady: true,
    data: {
      submissions: [],
      contacts: [],
      jobs: [],
      notes: [],
      reminders: [],
      documents: [],
      operations: [],
      routeStops: []
    },
    loading: false,
    error: ""
  };

  const els = {};
  let demoIdCount = 100;
  let googleRouteMap = null;
  let googleRouteLine = null;
  let googleMapsLoadPromise = null;
  let googleMapsBrowserKeyPromise = null;
  const addressAutocompleteInputs = new WeakSet();
  let googleRouteMarkers = [];
  const routeGeocodingIds = new Set();
  const PORTLAND_CENTER = { lat: 45.5152, lng: -122.6784 };

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

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(String(value));
    return String(value).replace(/["\\]/g, "\\$&");
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

  function routeStatusSelect(id, status) {
    const safeStatus = ROUTE_STATUSES.includes(status) ? status : "Planned";
    const options = ROUTE_STATUSES.map((item) => `<option value="${item}"${item === safeStatus ? " selected" : ""}>${item}</option>`).join("");
    return `<select class="status-select route-status-select" data-route-status-id="${escapeHtml(id)}" aria-label="Update route stop status">${options}</select>`;
  }

  function buttonContent(label, action) {
    const icons = {
      "cancel-job": "x",
      "clear-demo-data": "x",
      "complete-operation": "OK",
      "complete-reminder": "OK",
      "create-estimate": "+",
      "create-invoice": "$",
      "create-reminder": "+",
      "delete-contact": "x",
      "delete-document": "x",
      "delete-note": "x",
      "delete-operation": "x",
      "delete-reminder": "x",
      "delete-route-stop": "x",
      "delete-submission": "x",
      "edit-job": "/",
      "edit-route-stop": "/",
      "export-full-backup": "JSON",
      "find-stop-map": "M",
      "go-calendar": "+",
      "go-contacts": "-&gt;",
      "go-documents": "$",
      "go-route-planner": "M",
      "go-settings": "-&gt;",
      "mark-route-complete": "OK",
      "move-route-down": "v",
      "move-route-up": "^",
      "open-route-map": "M",
      "open-contact": "-&gt;",
      "open-document": "-&gt;",
      "open-submission": "-&gt;",
      "print-document": "PDF",
      "quick-add-job": "+",
      "quick-add-operation": "+",
      "quick-add-quote": "+",
      "sync-contact": "~",
      "sync-square-document": "~"
    };
    const icon = icons[action] || "";
    return `${icon ? `<span class="button-icon" aria-hidden="true">${icon}</span>` : ""}<span>${escapeHtml(label)}</span>`;
  }

  function actionButton(label, action, id) {
    return `<button class="inline-action" type="button" data-action="${escapeHtml(action)}" data-id="${escapeHtml(id)}">${buttonContent(label, action)}</button>`;
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
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(value))
      ? new Date(`${value}T12:00:00`)
      : new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function dateKey(value) {
    if (!value) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
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

  function addDaysKey(value, count) {
    const date = new Date(`${value}T12:00:00`);
    date.setDate(date.getDate() + count);
    return date.toISOString().slice(0, 10);
  }

  function monthLabel(value) {
    const date = new Date(`${value}T12:00:00`);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }

  function isDemoMode() {
    const params = new URLSearchParams(window.location.search);
    return DEMO_QUERY_KEYS.some((key) => ["1", "true", "yes"].includes(String(params.get(key) || "").toLowerCase()));
  }

  function nextDemoId(prefix) {
    demoIdCount += 1;
    return `${prefix}-${demoIdCount}`;
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
    const legacyTypeMap = {
      daily_check: "task",
      property_issue: "task",
      client_follow_up: "client",
      admin_task: "task",
      equipment_reminder: "equipment",
      maintenance_reminder: "deadline"
    };
    const rawType = row.record_type || "task";
    return {
      id: row.id,
      type: COMMAND_CATEGORIES.includes(rawType) ? rawType : legacyTypeMap[rawType] || "task",
      title: row.title || "Untitled operation",
      clientName: row.client_name || row.description || "",
      propertyAddress: row.property_address || row.description || "",
      description: row.description || row.property_address || row.client_name || "",
      dueDate: formatDate(row.due_date),
      dueDateRaw: row.due_date || "",
      status: row.status === "Active" || row.status === "Follow-up needed" ? "Open" : row.status === "Completed" ? "Done" : row.status || "Open",
      priority: row.priority || row.payload?.priority || "Normal",
      completedAt: row.completed_at ? formatDate(row.completed_at) : "",
      notes: row.notes || "",
      payload: row.payload && typeof row.payload === "object" ? row.payload : {},
      createdAt: formatDate(row.created_at)
    };
  }

  function normalizeRouteStop(row) {
    const estimatedMinutes = Number(row.estimated_minutes || 0);
    const latitude = Number(row.latitude ?? row.lat ?? row.payload?.latitude);
    const longitude = Number(row.longitude ?? row.lng ?? row.payload?.longitude);
    return {
      id: row.id,
      routeDate: row.route_date || "",
      clientName: row.client_name || "Unnamed stop",
      address: row.address || "",
      serviceType: row.service_type || "Service",
      estimatedMinutes: Number.isFinite(estimatedMinutes) ? estimatedMinutes : 0,
      notes: row.notes || "",
      status: ROUTE_STATUSES.includes(row.status) ? row.status : "Planned",
      stopOrder: Number(row.stop_order || 0),
      latitude: Number.isFinite(latitude) ? latitude : null,
      longitude: Number.isFinite(longitude) ? longitude : null,
      createdAt: formatDate(row.created_at),
      updatedAt: formatDate(row.updated_at)
    };
  }

  function normalizeDocument(row) {
    const total = Number(row.total || 0);
    const lineItems = Array.isArray(row.line_items) ? row.line_items : [];
    const normalizedLineItems = lineItems.length ? lineItems.map((item, index) => {
      const quantity = Number(item.quantity || 1) || 1;
      const amount = Number(item.amount || 0);
      const unitPrice = Number(item.unit_price || 0);
      const shouldUseTotal = index === 0 && lineItems.length === 1 && total > 0 && amount === 0 && unitPrice === 0;
      return {
        ...item,
        quantity,
        unit_price: shouldUseTotal ? total / quantity : unitPrice,
        amount: shouldUseTotal ? total : amount
      };
    }) : [];
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
      lineItems: normalizedLineItems,
      subtotal: Number(row.subtotal || 0),
      tax: Number(row.tax || 0),
      total,
      notes: row.notes || ""
    };
  }

  function demoDashboardData() {
    const today = todayKey();
    const now = new Date().toISOString();
    return {
      submissions: [
        normalizeSubmission({
          id: "demo-quote-1",
          name: "Hannah Edge",
          email: "hannah@edgemgt.com",
          phone: "(971) 555-0188",
          property_type: "Multifamily",
          city: "Portland",
          service: "Recurring groundskeeping and pressure washing",
          status: "Contacted",
          source: "Quote form",
          follow_up: "Send estimate this afternoon",
          notes: "Wants courtyard cleanup, weekly mowing, and entry pressure washing.",
          created_at: now
        }),
        normalizeSubmission({
          id: "demo-quote-2",
          name: "Mason Lee",
          email: "mason@example.com",
          phone: "(971) 555-0112",
          property_type: "Home",
          city: "Beaverton",
          service: "Backyard cleanup and planting refresh",
          status: "New",
          source: "Website assistant",
          follow_up: "Call tomorrow morning",
          notes: "Overgrown side yard, wants lower-maintenance beds.",
          created_at: daysFromToday(-1)
        }),
        normalizeSubmission({
          id: "demo-quote-3",
          name: "River Court HOA",
          email: "board@example.com",
          phone: "(360) 555-0144",
          property_type: "HOA",
          city: "Vancouver",
          service: "Seasonal cleanup and mulch",
          status: "Scheduled",
          source: "Referral",
          follow_up: "Site walk scheduled",
          notes: "Shared frontage, mailbox beds, and pond-edge weeds.",
          created_at: daysFromToday(-4)
        })
      ],
      contacts: [
        normalizeContact({ id: "demo-contact-1", name: "Hannah Edge", email: "hannah@edgemgt.com", phone: "(971) 555-0188", contact_type: "Property manager", city: "Portland", status: "Contacted" }),
        normalizeContact({ id: "demo-contact-2", name: "Mason Lee", email: "mason@example.com", phone: "(971) 555-0112", contact_type: "Homeowner", city: "Beaverton", status: "New" }),
        normalizeContact({ id: "demo-contact-3", name: "River Court HOA", email: "board@example.com", phone: "(360) 555-0144", contact_type: "HOA", city: "Vancouver", status: "Scheduled" })
      ],
      jobs: [
        normalizeJob({ id: "demo-job-1", visit_date: today, visit_window: "8:30 AM - 10:00 AM", site_name: "Hannah Edge", city: "Portland", service: "Courtyard mow, blow, and pressure wash check", status: "Scheduled" }),
        normalizeJob({ id: "demo-job-2", visit_date: daysFromToday(2), visit_window: "1:00 PM - 3:00 PM", site_name: "River Court HOA", city: "Vancouver", service: "Site walk and seasonal cleanup plan", status: "Scheduled" }),
        normalizeJob({ id: "demo-job-3", visit_date: daysFromToday(5), visit_window: "Morning", site_name: "Mason Lee", city: "Beaverton", service: "Backyard cleanup", status: "New" })
      ],
      notes: [
        normalizeNote({ id: "demo-note-1", title: "Order mulch samples", body: "Bring dark hemlock and fine bark options for River Court.", created_at: now }),
        normalizeNote({ id: "demo-note-2", title: "Check route fuel", body: "Plan Portland to Beaverton to Vancouver route before Friday.", created_at: daysFromToday(-1) })
      ],
      reminders: [
        normalizeReminder({ id: "demo-reminder-1", due_date: daysFromToday(1), task: "Follow up with Hannah on estimate approval", status: "New" }),
        normalizeReminder({ id: "demo-reminder-2", due_date: daysFromToday(3), task: "Send before/after photos to Mason", status: "Contacted" })
      ],
      documents: [
        normalizeDocument({
          id: "demo-doc-1",
          document_type: "estimate",
          document_number: "EST-DEMO-001",
          client_name: "Hannah Edge",
          client_email: "hannah@edgemgt.com",
          issue_date: today,
          due_date: daysFromToday(14),
          status: "sent",
          line_items: [{ description: "Monthly groundskeeping test estimate", quantity: 1, unit_price: 1500, amount: 1500 }],
          subtotal: 1500,
          tax: 0,
          total: 1500,
          square_invoice_number: "000008",
          square_status: "UNPAID",
          square_payment_url: "https://square.link/u/test-demo",
          square_amount_due_cents: 150000,
          square_currency: "USD",
          square_synced_at: now,
          notes: "Demo document. Square link is a placeholder."
        }),
        normalizeDocument({
          id: "demo-doc-2",
          document_type: "invoice",
          document_number: "INV-DEMO-001",
          client_name: "River Court HOA",
          client_email: "board@example.com",
          issue_date: today,
          due_date: daysFromToday(21),
          status: "draft",
          line_items: [{ description: "Seasonal cleanup deposit", quantity: 1, unit_price: 425, amount: 425 }],
          subtotal: 425,
          tax: 0,
          total: 425,
          notes: "Demo invoice draft."
        })
      ],
      operations: [
        normalizeOperation({ id: "demo-operation-1", record_type: "client", title: "Call Hannah about estimate", description: "Hannah Edge", due_date: today, status: "Waiting", priority: "High", notes: "Confirm scope and next visit window.", created_at: now }),
        normalizeOperation({ id: "demo-operation-2", record_type: "deadline", title: "Friday recurring visit checklist", description: "Courtyard and frontage", due_date: daysFromToday(4), status: "Open", priority: "Normal", notes: "Mow, edge, blow, weeds at entry, check pressure wash stain.", created_at: now }),
        normalizeOperation({ id: "demo-operation-3", record_type: "equipment", title: "Sharpen mower blades", description: "Equipment", due_date: daysFromToday(2), status: "Open", priority: "Normal", notes: "Do before next full mowing route.", created_at: now })
      ],
      routeStops: [
        normalizeRouteStop({ id: "demo-route-1", route_date: today, client_name: "Hannah Edge", address: "SE Division St, Portland, OR", service_type: "Groundskeeping", estimated_minutes: 75, notes: "Start with courtyard before residents return.", status: "Planned", stop_order: 1, latitude: 45.5045, longitude: -122.6235, created_at: now, updated_at: now }),
        normalizeRouteStop({ id: "demo-route-2", route_date: today, client_name: "Mason Lee", address: "Beaverton, OR", service_type: "Cleanup estimate", estimated_minutes: 45, notes: "Take photos and measure bed edges.", status: "In Progress", stop_order: 2, latitude: 45.4871, longitude: -122.8037, created_at: now, updated_at: now }),
        normalizeRouteStop({ id: "demo-route-3", route_date: today, client_name: "River Court HOA", address: "Vancouver, WA", service_type: "Site walk", estimated_minutes: 60, notes: "Review frontage and shared pond edge.", status: "Planned", stop_order: 3, latitude: 45.628, longitude: -122.672, created_at: now, updated_at: now })
      ]
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
    if (isDemoMode() && state.data.submissions.length) {
      return state.data;
    }

    if (isDemoMode()) {
      state.documentsReady = true;
      state.operationsReady = true;
      state.routeStopsReady = true;
      return demoDashboardData();
    }

    const [submissions, contacts, jobs, notes, reminders, documents, operations, routeStops] = await Promise.all([
      supabaseRestRequest("quote_submissions?select=*&order=created_at.desc", { method: "GET" }),
      supabaseRestRequest("contacts?select=*&order=created_at.desc", { method: "GET" }),
      supabaseRestRequest("scheduled_jobs?select=*&order=visit_date.asc", { method: "GET" }),
      supabaseRestRequest("job_notes?select=*&order=created_at.desc", { method: "GET" }),
      supabaseRestRequest("follow_up_reminders?select=*&order=due_date.asc", { method: "GET" }),
      loadSalesDocuments(),
      loadOperationsRecords(),
      loadRouteStops()
    ]);

    return {
      submissions: submissions.map(normalizeSubmission),
      contacts: contacts.map(normalizeContact),
      jobs: jobs.map(normalizeJob),
      notes: notes.map(normalizeNote),
      reminders: reminders.map(normalizeReminder),
      documents,
      operations,
      routeStops
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

  async function loadRouteStops() {
    try {
      const rows = await supabaseRestRequest("route_stops?select=*&order=route_date.asc,stop_order.asc,created_at.asc", { method: "GET" });
      state.routeStopsReady = true;
      return rows.map(normalizeRouteStop);
    } catch (error) {
      state.routeStopsReady = false;
      return [];
    }
  }

  async function insertJobNote(title, body) {
    if (isDemoMode()) {
      return normalizeNote({
        id: nextDemoId("note"),
        title,
        body,
        created_at: new Date().toISOString()
      });
    }

    const rows = await supabaseRestRequest("job_notes", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ title, body })
    });
    return normalizeNote(rows[0]);
  }

  async function insertScheduledJob(payload) {
    if (isDemoMode()) {
      const job = normalizeJob({ id: nextDemoId("job"), ...payload });
      state.data.jobs.unshift(job);
      return job;
    }

    const rows = await supabaseRestRequest("scheduled_jobs", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload)
    });
    return normalizeJob(rows[0]);
  }

  async function deleteRow(table, id) {
    if (isDemoMode()) {
      const map = {
        quote_submissions: "submissions",
        contacts: "contacts",
        scheduled_jobs: "jobs",
        job_notes: "notes",
        follow_up_reminders: "reminders",
        sales_documents: "documents",
        operations_records: "operations",
        route_stops: "routeStops"
      };
      const key = map[table];
      if (key && Array.isArray(state.data[key])) {
        state.data[key] = state.data[key].filter((item) => item.id !== id);
      }
      return;
    }

    await supabaseRestRequest(`${table}?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" }
    });
  }

  async function updateScheduledJob(id, payload) {
    if (isDemoMode()) {
      const index = state.data.jobs.findIndex((job) => job.id === id);
      if (index >= 0) state.data.jobs[index] = normalizeJob({ id, ...payload });
      return;
    }

    await supabaseRestRequest(`scheduled_jobs?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(payload)
    });
  }

  async function cancelScheduledJob(id) {
    if (isDemoMode()) {
      await deleteRow("scheduled_jobs", id);
      return;
    }

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
    if (isDemoMode()) {
      const document = normalizeDocument({
        id: nextDemoId("doc"),
        ...buildDocumentPayload(input),
        created_at: new Date().toISOString()
      });
      state.data.documents.unshift(document);
      return document;
    }

    const rows = await supabaseRestRequest("sales_documents", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(buildDocumentPayload(input))
    });
    return normalizeDocument(rows[0]);
  }

  async function syncSquareInvoice(documentId) {
    if (isDemoMode()) {
      const doc = state.data.documents.find((item) => item.id === documentId);
      if (!doc) return null;
      doc.squareStatus = doc.status === "paid" ? "PAID" : "UNPAID";
      doc.squareAmountDueCents = Math.round(Number(doc.total || 0) * 100);
      doc.squarePaymentUrl = "https://square.link/u/test-demo";
      doc.squareSyncedAt = formatDate(new Date().toISOString());
      return doc;
    }

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
    if (isDemoMode()) {
      const existing = state.data.documents.find((doc) => doc.id === id);
      const updated = normalizeDocument({
        id,
        ...buildDocumentPayload({
          ...input,
          document_number: existing?.number,
          square_invoice_id: existing?.squareInvoiceId
        }),
        issue_date: existing?.issueDateRaw || new Date().toISOString().slice(0, 10),
        status: input.status || "draft",
        square_status: existing?.squareStatus || "",
        square_payment_url: existing?.squarePaymentUrl || "",
        square_amount_due_cents: existing?.squareAmountDueCents,
        square_currency: existing?.squareCurrency || "USD",
        square_synced_at: existing?.squareSyncedAt || "",
        created_at: new Date().toISOString()
      });
      const index = state.data.documents.findIndex((doc) => doc.id === id);
      if (index >= 0) state.data.documents[index] = updated;
      return updated;
    }

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
    if (isDemoMode()) {
      const reminder = normalizeReminder({
        id: nextDemoId("reminder"),
        due_date: payload.due_date || daysFromToday(2),
        task: payload.task,
        status: payload.status || "New"
      });
      state.data.reminders.unshift(reminder);
      return reminder;
    }

    const rows = await supabaseRestRequest("follow_up_reminders", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload)
    });
    return normalizeReminder(rows[0]);
  }

  async function insertContact(payload) {
    if (isDemoMode()) {
      const contact = normalizeContact({ id: nextDemoId("contact"), ...payload });
      state.data.contacts.unshift(contact);
      return contact;
    }

    const rows = await supabaseRestRequest("contacts", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload)
    });
    return normalizeContact(rows[0]);
  }

  async function updateContact(id, payload) {
    if (isDemoMode()) {
      const index = state.data.contacts.findIndex((contact) => contact.id === id);
      if (index >= 0) state.data.contacts[index] = normalizeContact({ id, ...payload });
      return;
    }

    await supabaseRestRequest(`contacts?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(payload)
    });
  }

  async function updateReminder(id, payload) {
    if (isDemoMode()) {
      const existing = state.data.reminders.find((reminder) => reminder.id === id);
      const index = state.data.reminders.findIndex((reminder) => reminder.id === id);
      if (index >= 0) {
        state.data.reminders[index] = { ...existing, ...payload, due: existing.due, dueRaw: existing.dueRaw, task: payload.task || existing.task };
      }
      return;
    }

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
    if (isDemoMode()) {
      const operation = normalizeOperation({
        id: nextDemoId("operation"),
        ...payload,
        created_at: new Date().toISOString()
      });
      state.data.operations.unshift(operation);
      return operation;
    }

    let rows;
    try {
      rows = await supabaseRestRequest("operations_records", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      if (!/description|priority|completed_at/i.test(error.message || "")) {
        throw error;
      }
      rows = await supabaseRestRequest("operations_records", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          record_type: payload.record_type,
          title: payload.title,
          client_name: payload.description || null,
          property_address: payload.description || null,
          due_date: payload.due_date || null,
          status: payload.status || "Open",
          notes: payload.notes || "",
          payload: { priority: payload.priority || "Normal" }
        })
      });
    }
    return normalizeOperation(rows[0]);
  }

  function selectedRouteStops() {
    return state.data.routeStops
      .filter((stop) => stop.routeDate === state.routeDate)
      .sort((a, b) => a.stopOrder - b.stopOrder || a.createdAt.localeCompare(b.createdAt));
  }

  function nextRouteStopOrder() {
    const stops = selectedRouteStops();
    return stops.length ? Math.max(...stops.map((stop) => stop.stopOrder || 0)) + 1 : 1;
  }

  async function insertRouteStop(input) {
    if (!state.routeStopsReady) {
      throw new Error("Create the route_stops table first. See DASHBOARD_SETUP.md.");
    }
    if (isDemoMode()) {
      const stop = normalizeRouteStop({
        id: nextDemoId("route"),
        route_date: state.routeDate,
        client_name: input.client_name,
        address: input.address,
        service_type: input.service_type,
        estimated_minutes: input.estimated_minutes || null,
        notes: input.notes || null,
        status: input.status || "Planned",
        stop_order: nextRouteStopOrder(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      state.data.routeStops.push(stop);
      return stop;
    }

    const rows = await supabaseRestRequest("route_stops", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        route_date: state.routeDate,
        client_name: input.client_name,
        address: input.address,
        service_type: input.service_type,
        estimated_minutes: input.estimated_minutes || null,
        notes: input.notes || null,
        status: input.status || "Planned",
        stop_order: nextRouteStopOrder()
      })
    });
    return normalizeRouteStop(rows[0]);
  }

  async function updateRouteStop(id, input) {
    if (isDemoMode()) {
      const existing = state.data.routeStops.find((stop) => stop.id === id);
      const index = state.data.routeStops.findIndex((stop) => stop.id === id);
      if (index >= 0) {
        state.data.routeStops[index] = {
          ...existing,
          clientName: input.client_name,
          address: input.address,
          serviceType: input.service_type,
          estimatedMinutes: input.estimated_minutes || 0,
          notes: input.notes || "",
          status: input.status || "Planned",
          updatedAt: formatDate(new Date().toISOString())
        };
      }
      return state.data.routeStops[index];
    }

    const rows = await supabaseRestRequest(`route_stops?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        client_name: input.client_name,
        address: input.address,
        service_type: input.service_type,
        estimated_minutes: input.estimated_minutes || null,
        notes: input.notes || null,
        status: input.status || "Planned",
        updated_at: new Date().toISOString()
      })
    });
    return normalizeRouteStop(rows[0]);
  }

  async function updateRouteStopCoordinates(id, coordinates) {
    const latitude = Number(coordinates?.lat);
    const longitude = Number(coordinates?.lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error("Map lookup did not return usable coordinates.");
    }

    if (isDemoMode()) {
      const stop = state.data.routeStops.find((item) => item.id === id);
      if (stop) {
        stop.latitude = latitude;
        stop.longitude = longitude;
        stop.updatedAt = formatDate(new Date().toISOString());
      }
      return stop;
    }

    const rows = await supabaseRestRequest(`route_stops?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        latitude,
        longitude,
        updated_at: new Date().toISOString()
      })
    });
    return normalizeRouteStop(rows[0]);
  }

  async function clearRouteStopCoordinates(id) {
    if (isDemoMode()) {
      const stop = state.data.routeStops.find((item) => item.id === id);
      if (stop) {
        stop.latitude = null;
        stop.longitude = null;
        stop.updatedAt = formatDate(new Date().toISOString());
      }
      return;
    }

    await supabaseRestRequest(`route_stops?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        latitude: null,
        longitude: null,
        updated_at: new Date().toISOString()
      })
    });
  }

  async function updateRouteStopStatus(id, status) {
    if (!ROUTE_STATUSES.includes(status)) throw new Error("Invalid route status.");
    if (isDemoMode()) {
      const stop = state.data.routeStops.find((item) => item.id === id);
      if (stop) stop.status = status;
      return;
    }

    await supabaseRestRequest(`route_stops?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status, updated_at: new Date().toISOString() })
    });
  }

  async function moveRouteStop(id, direction) {
    const stops = selectedRouteStops();
    const index = stops.findIndex((stop) => stop.id === id);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || swapIndex < 0 || swapIndex >= stops.length) return;
    const current = stops[index];
    const other = stops[swapIndex];
    if (isDemoMode()) {
      const currentOrder = current.stopOrder;
      current.stopOrder = other.stopOrder;
      other.stopOrder = currentOrder;
      return;
    }

    await Promise.all([
      supabaseRestRequest(`route_stops?id=eq.${encodeURIComponent(current.id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ stop_order: other.stopOrder, updated_at: new Date().toISOString() })
      }),
      supabaseRestRequest(`route_stops?id=eq.${encodeURIComponent(other.id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ stop_order: current.stopOrder, updated_at: new Date().toISOString() })
      })
    ]);
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
      if (isDemoMode()) {
        await updateContact(existing.id, payload);
        return;
      }

      await supabaseRestRequest(`contacts?id=eq.${encodeURIComponent(existing.id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(payload)
      });
      return;
    }

    if (isDemoMode()) {
      await insertContact(payload);
      return;
    }

    await supabaseRestRequest("contacts", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(payload)
    });
  }

  async function updateSubmission(id, payload) {
    if (isDemoMode()) {
      const item = state.data.submissions.find((submission) => submission.id === id);
      if (item) {
        item.status = payload.status || item.status;
        item.followUp = payload.follow_up || "Not set";
        item.notes = payload.notes || "";
      }
      return;
    }

    await supabaseRestRequest(`quote_submissions?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(payload)
    });
  }

  async function updateStatus(table, id, status) {
    if (!STATUSES.includes(status)) throw new Error("Invalid status.");
    if (isDemoMode()) {
      const map = {
        quote_submissions: "submissions",
        contacts: "contacts",
        scheduled_jobs: "jobs",
        follow_up_reminders: "reminders"
      };
      const key = map[table];
      const item = key ? state.data[key].find((record) => record.id === id) : null;
      if (item) item.status = status;
      return null;
    }

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
    if (els.ownerEmail) els.ownerEmail.textContent = isDemoMode() ? "Demo mode" : getOwnerEmail();
    if (els.demoBadge) els.demoBadge.hidden = !isDemoMode();
    await refreshDashboard();
  }

  function setActiveSection(section) {
    const sectionMap = {
      quotes: "documents",
      pipeline: "documents",
      schedule: "calendar",
      operations: "overview",
      "command-center": "overview",
      notes: "settings",
      reminders: "settings"
    };
    state.activeSection = sectionMap[section] || section || "overview";
    qsa("[data-section]").forEach((node) => {
      node.classList.toggle("is-active", node.dataset.section === state.activeSection);
    });
    qsa("[data-dashboard-link]").forEach((node) => {
      const isActive = node.dataset.dashboardLink === state.activeSection;
      node.classList.toggle("is-active", isActive);
      if (isActive) {
        node.setAttribute("aria-current", "page");
      } else {
        node.removeAttribute("aria-current");
      }
    });
    if (state.activeSection === "route-planner" && googleRouteMap && window.google?.maps) {
      setTimeout(() => {
        window.google.maps.event.trigger(googleRouteMap, "resize");
        if (!selectedRouteStops().some(hasRouteCoordinates)) {
          googleRouteMap.setCenter(PORTLAND_CENTER);
          googleRouteMap.setZoom(11);
        }
      }, 80);
    }
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

  function operationFilterGroups() {
    return [
      ["All", "All"],
      ["daily_check", "Daily"],
      ["property_issue", "Issues"],
      ["client_follow_up", "Follow-ups"],
      ["admin_task", "Admin"],
      ["equipment_reminder", "Equipment"],
      ["maintenance_reminder", "Maintenance"]
    ];
  }

  function findRouteStop(id) {
    return state.data.routeStops.find((stop) => stop.id === id);
  }

  function routeStopFormPayload(form) {
    const formData = new FormData(form);
    return {
      client_name: String(formData.get("client_name") || "").trim(),
      address: String(formData.get("address") || "").trim(),
      service_type: String(formData.get("service_type") || "").trim(),
      estimated_minutes: Number(formData.get("estimated_minutes") || 0),
      status: String(formData.get("status") || "Planned"),
      notes: String(formData.get("notes") || "").trim()
    };
  }

  function normalizedRouteLookupAddress(address) {
    const compact = String(address || "").replace(/\s+/g, " ").trim();
    if (!compact) return "";
    const hasCityOrState = /\b(portland|beaverton|vancouver)\b/i.test(compact) || /\b(or|oregon|wa|washington)\b/i.test(compact);
    return hasCityOrState ? compact : `${compact}, Portland, OR`;
  }

  async function geocodeRouteAddress(address) {
    const normalizedAddress = normalizedRouteLookupAddress(address);
    if (!normalizedAddress) throw new Error("Add an address before looking up a map pin.");

    const response = await fetch("/.netlify/functions/route-geocode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: normalizedAddress })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Unable to find a map pin for this address.");
    }
    return payload;
  }

  async function geocodeAndStoreRouteStop(stop) {
    if (!stop || !stop.id || !stop.address) return null;
    routeGeocodingIds.add(stop.id);
    renderRoutePlanner();
    try {
      const coordinates = await geocodeRouteAddress(stop.address);
      const updated = await updateRouteStopCoordinates(stop.id, coordinates);
      return updated || { ...stop, latitude: coordinates.lat, longitude: coordinates.lng };
    } finally {
      routeGeocodingIds.delete(stop.id);
    }
  }

  function resetRouteForm() {
    if (!els.routeForm) return;
    els.routeForm.reset();
    const idInput = els.routeForm.querySelector("input[name='route_stop_id']");
    if (idInput) idInput.value = "";
    const heading = qs(".route-form-panel .panel-heading h3");
    if (heading) heading.textContent = "Add Stop";
    if (els.routeSubmit) {
      els.routeSubmit.innerHTML = buttonContent("Save Stop", "quick-add-job");
    }
  }

  function editRouteStop(id) {
    const stop = findRouteStop(id);
    if (!stop || !els.routeForm) return;
    els.routeForm.route_stop_id.value = stop.id;
    els.routeForm.client_name.value = stop.clientName;
    els.routeForm.address.value = stop.address;
    els.routeForm.service_type.value = stop.serviceType;
    els.routeForm.estimated_minutes.value = stop.estimatedMinutes || "";
    els.routeForm.status.value = stop.status;
    els.routeForm.notes.value = stop.notes;
    const heading = qs(".route-form-panel .panel-heading h3");
    if (heading) heading.textContent = "Edit Stop";
    if (els.routeSubmit) {
      els.routeSubmit.innerHTML = buttonContent("Save Changes", "edit-route-stop");
    }
    els.routeForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function routeMapsUrl() {
    const addresses = selectedRouteStops()
      .map((stop) => stop.address.trim())
      .filter(Boolean);
    if (!addresses.length) return "";
    const encode = (value) => encodeURIComponent(value);
    if (addresses.length === 1) {
      return `https://www.google.com/maps/dir/?api=1&destination=${encode(addresses[0])}`;
    }
    const origin = addresses[0];
    const destination = addresses[addresses.length - 1];
    const waypoints = addresses.slice(1, -1);
    return `https://www.google.com/maps/dir/?api=1&origin=${encode(origin)}&destination=${encode(destination)}${waypoints.length ? `&waypoints=${waypoints.map(encode).join("%7C")}` : ""}`;
  }

  function hasRouteCoordinates(stop) {
    return typeof stop.latitude === "number" && typeof stop.longitude === "number";
  }

  function formatRouteDuration(seconds) {
    const totalMinutes = Math.max(1, Math.round(Number(seconds || 0) / 60));
    if (totalMinutes < 60) return `${totalMinutes} min drive`;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours} hr${hours === 1 ? "" : "s"}${minutes ? ` ${minutes} min` : ""} drive`;
  }

  function formatRouteDistance(meters) {
    const miles = Number(meters || 0) / 1609.344;
    if (!Number.isFinite(miles) || miles <= 0) return "";
    return `${miles.toFixed(miles >= 10 ? 0 : 1)} mi`;
  }

  function decodeGooglePolyline(encoded) {
    let index = 0;
    let lat = 0;
    let lng = 0;
    const path = [];
    while (index < encoded.length) {
      let result = 0;
      let shift = 0;
      let byte = null;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      lat += result & 1 ? ~(result >> 1) : result >> 1;

      result = 0;
      shift = 0;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      lng += result & 1 ? ~(result >> 1) : result >> 1;
      path.push({ lat: lat / 1e5, lng: lng / 1e5 });
    }
    return path;
  }

  async function fetchDrivingRoute(pinnedStops) {
    if (pinnedStops.length < 2) return null;
    const response = await fetch("/.netlify/functions/route-directions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        stops: pinnedStops.map((stop) => ({
          lat: stop.latitude,
          lng: stop.longitude,
          address: stop.address
        }))
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Driving route preview is unavailable.");
    }
    return {
      ...payload,
      path: decodeGooglePolyline(payload.encodedPolyline || "")
    };
  }

  async function getGoogleMapsBrowserKey() {
    if (googleMapsBrowserKeyPromise) return googleMapsBrowserKeyPromise;
    googleMapsBrowserKeyPromise = fetch("/.netlify/functions/google-maps-browser-key", {
      method: "GET",
      headers: { "Accept": "application/json" }
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.key) {
          throw new Error(payload.error || "Google Maps browser key is not configured.");
        }
        return String(payload.key);
      });
    return googleMapsBrowserKeyPromise;
  }

  async function loadGoogleMapsScript() {
    if (window.google?.maps) return Promise.resolve(window.google.maps);
    if (googleMapsLoadPromise) return googleMapsLoadPromise;
    const key = await getGoogleMapsBrowserKey();
    if (!key) return Promise.reject(new Error("Google Maps browser key is not configured."));

    googleMapsLoadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector("script[data-google-maps-route]");
      if (existing) {
        existing.addEventListener("load", () => resolve(window.google.maps), { once: true });
        existing.addEventListener("error", () => reject(new Error("Google Maps failed to load.")), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&libraries=places`;
      script.async = true;
      script.defer = true;
      script.dataset.googleMapsRoute = "true";
      script.addEventListener("load", () => resolve(window.google.maps), { once: true });
      script.addEventListener("error", () => reject(new Error("Google Maps failed to load.")), { once: true });
      document.head.appendChild(script);
    });

    return googleMapsLoadPromise;
  }

  async function ensureGoogleRouteMap() {
    if (!els.routeMap) return null;
    await loadGoogleMapsScript();
    if (googleRouteMap) return googleRouteMap;
    googleRouteMap = new window.google.maps.Map(els.routeMap, {
      center: PORTLAND_CENTER,
      zoom: 11,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      clickableIcons: false,
      gestureHandling: "greedy"
    });
    return googleRouteMap;
  }

  async function initAddressAutocomplete(input) {
    if (!input || addressAutocompleteInputs.has(input)) return;
    try {
      await loadGoogleMapsScript();
    } catch (error) {
      console.warn("Google address autocomplete is unavailable.", error);
      return;
    }
    if (!window.google?.maps?.places) return;
    const autocomplete = new window.google.maps.places.Autocomplete(input, {
      componentRestrictions: { country: "us" },
      fields: ["formatted_address", "geometry", "name"],
      types: ["geocode"]
    });
    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      const address = place.formatted_address || place.name || "";
      if (address) input.value = address;
    });
    addressAutocompleteInputs.add(input);
  }

  function initVisibleAddressAutocompletes(root) {
    const scope = root || document;
    Array.from(scope.querySelectorAll("[data-address-autocomplete]")).forEach((input) => {
      initAddressAutocomplete(input);
    });
  }

  async function renderGoogleRouteMap(stops) {
    if (!els.routeMapStatus) return;
    try {
      const map = await ensureGoogleRouteMap();
      if (!map) {
        els.routeMapStatus.textContent = "Route map is loading.";
        return;
      }

      googleRouteMarkers.forEach((marker) => marker.setMap(null));
      googleRouteMarkers = [];
      if (googleRouteLine) {
        googleRouteLine.setMap(null);
        googleRouteLine = null;
      }

      const pinnedStops = stops.filter(hasRouteCoordinates);
      const missingPins = stops.filter((stop) => stop.address && !hasRouteCoordinates(stop));
      if (!stops.length) {
        els.routeMapStatus.textContent = "Add stops to preview today's route.";
        map.setCenter(PORTLAND_CENTER);
        map.setZoom(11);
        return;
      }
      if (!pinnedStops.length) {
        els.routeMapStatus.textContent = "Map pin needed.";
        map.setCenter(PORTLAND_CENTER);
        map.setZoom(11);
        return;
      }

      els.routeMapStatus.textContent = missingPins.length
        ? `${pinnedStops.length} pinned / ${missingPins.length} need pins.`
        : `${pinnedStops.length} stop${pinnedStops.length === 1 ? "" : "s"} mapped with Google Maps.`;

      const bounds = new window.google.maps.LatLngBounds();
      const path = pinnedStops.map((stop) => ({ lat: stop.latitude, lng: stop.longitude }));
      pinnedStops.forEach((stop) => {
        const stopIndex = stops.findIndex((item) => item.id === stop.id) + 1;
        const position = { lat: stop.latitude, lng: stop.longitude };
        bounds.extend(position);
        const marker = new window.google.maps.Marker({
          position,
          map,
          label: String(stopIndex),
          title: stop.clientName || stop.address
        });
        marker.addListener("click", () => {
          state.selectedRouteStopId = stop.id;
          renderRoutePlanner();
          const card = qs(`[data-route-stop-card][data-id="${cssEscape(stop.id)}"]`);
          if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
        });
        googleRouteMarkers.push(marker);
      });

      if (path.length > 1) {
        let routePath = path;
        let routeLabel = "";
        try {
          els.routeMapStatus.textContent = "Previewing driving route...";
          const drivingRoute = await fetchDrivingRoute(pinnedStops);
          if (drivingRoute?.path?.length) {
            routePath = drivingRoute.path;
            routeLabel = [formatRouteDuration(drivingRoute.durationSeconds), formatRouteDistance(drivingRoute.distanceMeters)]
              .filter(Boolean)
              .join(" / ");
          }
        } catch (error) {
          routeLabel = "Straight-line preview; driving route unavailable.";
        }
        routePath.forEach((point) => bounds.extend(point));
        googleRouteLine = new window.google.maps.Polyline({
          path: routePath,
          map,
          strokeColor: "#2f6b4f",
          strokeOpacity: .82,
          strokeWeight: 4
        });
        els.routeMapStatus.textContent = routeLabel
          ? `${routeLabel}${missingPins.length ? ` / ${missingPins.length} need pins.` : ""}`
          : `${pinnedStops.length} stop${pinnedStops.length === 1 ? "" : "s"} mapped with Google driving directions.`;
      }

      if (path.length === 1) {
        map.setCenter(path[0]);
        map.setZoom(13);
      } else {
        map.fitBounds(bounds, 52);
      }
    } catch (error) {
      els.routeMapStatus.textContent = error.message || "Google Maps could not load.";
    }
  }

  function renderRouteMap(stops) {
    if (!els.routeMapStatus) return;
    renderGoogleRouteMap(stops);
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
    const todayJobs = data.jobs.filter((job) => job.dateRaw === todayKey());
    if (!todayJobs.length) {
      els.upcoming.innerHTML = emptyState("No jobs scheduled for today.");
      return;
    }
    els.upcoming.innerHTML = todayJobs.slice(0, 5).map((job) => `
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

  function renderHomeNotes(data) {
    if (!els.homeNotes) return;
    const notes = data.notes.slice(0, 4);
    if (!notes.length) {
      els.homeNotes.innerHTML = emptyState("No job notes yet.");
      return;
    }
    els.homeNotes.innerHTML = notes.map((note) => `
      <article class="note-card">
        <div class="item-topline">
          <h4>${escapeHtml(note.title)}</h4>
          <span class="meta">${escapeHtml(note.date)}</span>
        </div>
        <p class="item-body">${escapeHtml(note.body)}</p>
      </article>
    `).join("");
  }

  function renderTodayRouteSnapshot(data) {
    if (!els.todayRouteSnapshot) return;
    const today = todayKey();
    const stops = data.routeStops
      .filter((stop) => stop.routeDate === today)
      .sort((a, b) => a.stopOrder - b.stopOrder || a.createdAt.localeCompare(b.createdAt));
    if (!stops.length) {
      els.todayRouteSnapshot.innerHTML = emptyState("No route stops planned for today.");
      return;
    }
    const openStops = stops.filter((stop) => stop.status !== "Complete");
    els.todayRouteSnapshot.innerHTML = `
      <article class="route-snapshot-card">
        <strong>${openStops.length} open / ${stops.length} total</strong>
        <p>${escapeHtml(stops.slice(0, 3).map((stop) => stop.clientName).join(" / "))}${stops.length > 3 ? " / ..." : ""}</p>
        <button class="inline-action" type="button" data-action="go-route-planner">${buttonContent("Open Route Planner", "go-route-planner")}</button>
      </article>
    `;
  }

  function renderDashboardAlerts(data) {
    if (!els.dashboardAlerts) return;
    const today = todayKey();
    const soon = daysFromToday(7);
    const overdueReminders = data.reminders.filter((item) => item.dueRaw && item.dueRaw < today && item.status !== "Completed");
    const overdueInvoices = data.documents.filter((item) => item.type === "invoice" && item.dueDateRaw && item.dueDateRaw < today && item.status !== "paid");
    const dueInvoices = data.documents.filter((item) => item.type === "invoice" && item.dueDateRaw && item.dueDateRaw <= soon && item.status !== "paid");
    const unsentQuotes = data.documents.filter((item) => item.type === "quote" && ["draft", "Draft", "New"].includes(item.status));
    const newQuotes = data.submissions.filter((item) => item.status === "New");
    const alerts = [
      overdueReminders.length ? `${overdueReminders.length} incomplete follow-up${overdueReminders.length === 1 ? "" : "s"} overdue` : "",
      overdueInvoices.length ? `${overdueInvoices.length} overdue invoice${overdueInvoices.length === 1 ? "" : "s"}` : "",
      !overdueInvoices.length && dueInvoices.length ? `${dueInvoices.length} invoice${dueInvoices.length === 1 ? "" : "s"} due soon` : "",
      unsentQuotes.length ? `${unsentQuotes.length} unsent quote${unsentQuotes.length === 1 ? "" : "s"}` : "",
      newQuotes.length ? `${newQuotes.length} new quote request${newQuotes.length === 1 ? "" : "s"}` : ""
    ].filter(Boolean);
    if (!alerts.length) {
      els.dashboardAlerts.innerHTML = "";
      return;
    }
    els.dashboardAlerts.innerHTML = alerts.map((alert) => `<button type="button" data-action="quick-add-follow-up">${buttonContent(alert, "quick-add-quote")}</button>`).join("");
  }

  function operationTypeLabel(value) {
    return String(value || "")
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function isOperationOpen(item) {
    return !["Completed", "Done", "Paid", "Archived"].includes(item.status);
  }

  function operationCommandItems(data) {
    const today = todayKey();
    const tomorrow = daysFromToday(1);
    const weekEnd = daysFromToday(7);
    const commands = [];
    const pushCommand = (item) => {
      if (commands.length < 8) commands.push(item);
    };

    const newQuotes = data.submissions.filter((item) => item.status === "New");
    if (newQuotes.length) {
      pushCommand({
        label: "New lead review",
        title: `${newQuotes.length} quote request${newQuotes.length === 1 ? "" : "s"} need first contact`,
        detail: newQuotes.slice(0, 2).map((item) => item.name).join(", "),
        action: "quick-add-quote",
        actionLabel: "Open Leads",
        type: "client_follow_up",
        priority: "High"
      });
    }

    const overdueReminders = data.reminders.filter((item) => item.dueRaw && item.dueRaw < today && item.status !== "Completed");
    if (overdueReminders.length) {
      pushCommand({
        label: "Overdue follow-up",
        title: `${overdueReminders.length} reminder${overdueReminders.length === 1 ? "" : "s"} overdue`,
        detail: overdueReminders[0].task,
        action: "go-settings",
        actionLabel: "Open Reminders",
        type: "client_follow_up",
        priority: "High"
      });
    }

    const todaysJobs = data.jobs.filter((job) => job.dateRaw === today);
    const tomorrowJobs = data.jobs.filter((job) => job.dateRaw === tomorrow);
    if (todaysJobs.length || tomorrowJobs.length) {
      pushCommand({
        label: "Schedule check",
        title: todaysJobs.length ? `${todaysJobs.length} job${todaysJobs.length === 1 ? "" : "s"} today` : `${tomorrowJobs.length} job${tomorrowJobs.length === 1 ? "" : "s"} tomorrow`,
        detail: (todaysJobs[0] || tomorrowJobs[0]).site,
        action: "go-calendar",
        actionLabel: "Open Work",
        type: "daily_check",
        priority: "Normal"
      });
    }

    const routeStopsToday = data.routeStops.filter((stop) => stop.routeDate === today);
    const incompleteStops = routeStopsToday.filter((stop) => stop.status !== "Complete");
    if (incompleteStops.length) {
      pushCommand({
        label: "Route status",
        title: `${incompleteStops.length} route stop${incompleteStops.length === 1 ? "" : "s"} still open`,
        detail: incompleteStops[0].clientName,
        action: "go-route-planner",
        actionLabel: "Open Route",
        type: "daily_check",
        priority: "Normal"
      });
    }

    const unpaidInvoices = data.documents.filter((doc) => doc.type === "invoice" && doc.status !== "paid");
    const overdueInvoices = unpaidInvoices.filter((doc) => doc.dueDateRaw && doc.dueDateRaw < today);
    if (overdueInvoices.length || unpaidInvoices.length) {
      const invoices = overdueInvoices.length ? overdueInvoices : unpaidInvoices;
      pushCommand({
        label: overdueInvoices.length ? "Invoice issue" : "Payment follow-up",
        title: `${invoices.length} invoice${invoices.length === 1 ? "" : "s"} need attention`,
        detail: invoices[0].clientName,
        action: "go-documents",
        actionLabel: "Open Money",
        type: "admin_task",
        priority: overdueInvoices.length ? "High" : "Normal"
      });
    }

    const incompleteContacts = data.contacts.filter((contact) => contact.email === "No email" || contact.phone === "No phone");
    if (incompleteContacts.length) {
      pushCommand({
        label: "Client data",
        title: `${incompleteContacts.length} contact${incompleteContacts.length === 1 ? "" : "s"} missing details`,
        detail: incompleteContacts[0].name,
        action: "go-contacts",
        actionLabel: "Open Clients",
        type: "admin_task",
        priority: "Low"
      });
    }

    const dueOperations = data.operations.filter((item) => item.dueDateRaw && item.dueDateRaw <= weekEnd && isOperationOpen(item));
    if (dueOperations.length) {
      pushCommand({
        label: "Saved ops",
        title: `${dueOperations.length} priority task${dueOperations.length === 1 ? "" : "s"} due soon`,
        detail: dueOperations[0].title,
        action: "quick-add-operation",
        actionLabel: "Add Task",
        type: "daily_check",
        priority: "Normal"
      });
    }

    return commands;
  }

  function renderOperations(data) {
    if (!els.operationsHealth || !els.commandToday) return;
    const today = todayKey();
    const next30 = daysFromToday(30);
    const unpaidInvoices = data.documents.filter((doc) => doc.type === "invoice" && doc.status !== "paid");
    const pendingQuotes = data.submissions.filter((item) => ["New", "Contacted"].includes(item.status));
    const openOperations = data.operations.filter(isOperationOpen);
    const commandItems = operationCommandItems(data).map((item) => ({
      ...item,
      id: item.id || `system-${slug(item.title)}`,
      status: item.status || "Open",
      source: "system"
    }));
    const savedItems = openOperations.map((item) => ({
      id: item.id,
      label: item.type,
      title: item.title,
      detail: item.description || item.notes || "Review and decide the next step.",
      dueDateRaw: item.dueDateRaw,
      dueDate: item.dueDate,
      priority: item.priority || "Normal",
      status: item.status || "Open",
      type: item.type,
      source: "operation"
    }));
    const paymentItems = unpaidInvoices.map((doc) => ({
      id: doc.id,
      label: "payment",
      title: `${doc.clientName || "Client"} payment`,
      detail: `${doc.number || "Invoice"}${doc.dueDateRaw ? ` due ${doc.dueDate}` : ""}`,
      dueDateRaw: doc.dueDateRaw,
      dueDate: doc.dueDate,
      priority: doc.dueDateRaw && doc.dueDateRaw < today ? "High" : "Normal",
      status: "Waiting",
      type: "payment",
      action: "open-document",
      actionLabel: "Open Money",
      source: "payment"
    }));
    const waitingQuoteItems = pendingQuotes.map((item) => ({
      id: item.id,
      label: "client",
      title: `${item.name} quote follow-up`,
      detail: item.followUp || item.service,
      dueDateRaw: "",
      dueDate: "",
      priority: item.status === "New" ? "High" : "Normal",
      status: "Waiting",
      type: "client",
      action: "open-submission",
      actionLabel: "Open Lead",
      source: "quote"
    }));
    const reminderDeadlineItems = data.reminders
      .filter((item) => item.status !== "Completed")
      .map((item) => ({
        id: item.id,
        label: "deadline",
        title: item.task,
        detail: `Follow-up due ${item.due || "soon"}`,
        dueDateRaw: item.dueRaw,
        dueDate: item.due,
        priority: item.dueRaw && item.dueRaw <= today ? "High" : "Normal",
        status: "Open",
        type: "deadline",
        action: "complete-reminder",
        actionLabel: "Done",
        source: "reminder"
      }));

    const todayItems = [
      ...savedItems.filter((item) => (item.dueDateRaw && item.dueDateRaw <= today) || item.priority === "High"),
      ...commandItems.filter((item) => item.priority === "High")
    ]
      .sort((a, b) => {
        const dateSort = String(a.dueDateRaw || "9999").localeCompare(String(b.dueDateRaw || "9999"));
        if (dateSort) return dateSort;
        return String(a.priority === "High" ? "0" : "1").localeCompare(String(b.priority === "High" ? "0" : "1"));
      })
      .slice(0, 10);
    const waitingItems = [
      ...savedItems.filter((item) => item.status === "Waiting" || ["client", "payment"].includes(item.type)),
      ...waitingQuoteItems,
      ...paymentItems
    ].slice(0, 10);
    const deadlineItems = [
      ...savedItems.filter((item) => item.dueDateRaw && item.dueDateRaw >= today && item.dueDateRaw <= next30),
      ...reminderDeadlineItems.filter((item) => item.dueDateRaw && item.dueDateRaw >= today && item.dueDateRaw <= next30),
      ...paymentItems.filter((item) => item.dueDateRaw && item.dueDateRaw >= today && item.dueDateRaw <= next30)
    ].sort((a, b) => String(a.dueDateRaw || "9999").localeCompare(String(b.dueDateRaw || "9999"))).slice(0, 12);
    const equipmentItems = savedItems.filter((item) => item.type === "equipment").slice(0, 10);

    const healthCards = [
      ["Tasks Due Today", todayItems.length, "Priority items for today"],
      ["Waiting On Clients", waitingQuoteItems.length + savedItems.filter((item) => item.type === "client" && item.status === "Waiting").length, "Responses, approvals, info"],
      ["Waiting On Payment", paymentItems.length, "Open unpaid invoices"],
      ["Upcoming Deadlines", deadlineItems.length, "Due in the next 30 days"],
      ["Equipment Alerts", equipmentItems.length, "Tools, mower, vehicle"]
    ];

    els.operationsHealth.innerHTML = healthCards.map(([label, value, detail]) => `
      <article class="operations-health-card">
        <strong>${escapeHtml(value)}</strong>
        <span>${escapeHtml(label)}</span>
        <small>${escapeHtml(detail)}</small>
      </article>
    `).join("");

    if (!state.operationsReady) {
      els.commandToday.innerHTML = emptyState("Saved tasks need the operations_records table. The dashboard can still summarize quotes, jobs, invoices, and reminders.");
      if (els.commandWaiting) els.commandWaiting.innerHTML = renderCommandList(waitingItems, "Nothing waiting right now.");
      if (els.commandDeadlines) els.commandDeadlines.innerHTML = renderCommandList(deadlineItems, "No upcoming deadlines.");
      if (els.commandEquipment) els.commandEquipment.innerHTML = emptyState("No equipment reminders.");
      return;
    }

    els.commandToday.innerHTML = renderCommandList(todayItems, "No priority tasks for today.");
    if (els.commandWaiting) els.commandWaiting.innerHTML = renderCommandList(waitingItems, "Nothing waiting right now.");
    if (els.commandDeadlines) els.commandDeadlines.innerHTML = renderCommandList(deadlineItems, "No upcoming deadlines.");
    if (els.commandEquipment) els.commandEquipment.innerHTML = renderCommandList(equipmentItems, "No equipment reminders.");
  }

  function renderCommandList(items, emptyMessage) {
    if (!items.length) return emptyState(emptyMessage);
    return items.map((item) => `
      <article class="operations-command-item priority-${slug(item.priority || "Normal")}">
        <div>
          <p class="eyebrow">${escapeHtml(operationTypeLabel(item.label || item.type || "task"))}</p>
          <h4>${escapeHtml(item.title)}</h4>
          <p>${escapeHtml(item.detail || "Review and decide the next step.")}</p>
          <p class="small">${escapeHtml(item.priority || "Normal")} priority${item.dueDate ? ` / Due ${escapeHtml(item.dueDate)}` : ""} / ${escapeHtml(item.status || "Open")}</p>
        </div>
        <div class="operations-command-item-actions">
          ${item.source === "operation" ? actionButton("Done", "complete-operation", item.id) : ""}
          ${item.action ? `<button class="inline-action" type="button" data-action="${escapeHtml(item.action)}" data-id="${escapeHtml(item.id)}">${buttonContent(item.actionLabel || "Open", item.action)}</button>` : ""}
          ${item.source === "operation" ? actionButton("Delete", "delete-operation", item.id).replace("inline-action", "inline-action danger-action") : ""}
        </div>
      </article>
    `).join("");
  }

  function renderRoutePlanner() {
    if (!els.routeDate || !els.routeStops || !els.routeSummary) return;
    els.routeDate.value = state.routeDate;

    if (!state.routeStopsReady) {
      els.routeSummary.textContent = "Route Planner needs the route_stops table.";
      els.routeStops.innerHTML = emptyState("Create the route_stops table in Supabase, then refresh this dashboard.");
      return;
    }

    const stops = selectedRouteStops();
    const minutes = stops.reduce((sum, stop) => sum + (stop.estimatedMinutes || 0), 0);
    els.routeSummary.textContent = stops.length
      ? `${stops.length} stop${stops.length === 1 ? "" : "s"} / ${minutes || 0} min estimated`
      : "No stops planned for this date.";

    if (!stops.length) {
      els.routeStops.innerHTML = emptyState("No route stops yet. Add the first property for this day.");
      renderRouteMap(stops);
      return;
    }

    els.routeStops.innerHTML = stops.map((stop, index) => {
      const isFindingPin = routeGeocodingIds.has(stop.id);
      const needsPin = stop.address && !hasRouteCoordinates(stop);
      return `
      <article class="route-stop-card route-stop-${slug(stop.status)} ${state.selectedRouteStopId === stop.id ? "is-selected" : ""} ${isFindingPin ? "is-finding-pin" : ""}" data-route-stop-card data-action="select-route-stop" data-id="${escapeHtml(stop.id)}">
        <div class="route-stop-order">
          <span>${index + 1}</span>
        </div>
        <div class="route-stop-body">
          <div class="item-topline">
            <div>
              <h4>${escapeHtml(stop.clientName)}</h4>
              <div class="meta">${escapeHtml(stop.serviceType)} / ${stop.estimatedMinutes ? `${escapeHtml(stop.estimatedMinutes)} min` : "Time not set"}</div>
            </div>
            ${routeStatusSelect(stop.id, stop.status)}
          </div>
          <p class="route-address">${escapeHtml(stop.address)}</p>
          ${isFindingPin ? `<p class="route-pin-needed route-pin-loading">Finding map pin...</p>` : ""}
          ${needsPin && !isFindingPin ? `<p class="route-pin-needed">Map pin needed.</p>` : ""}
          <p class="small">${escapeHtml(stop.notes || "No notes yet.")}</p>
          <div class="route-stop-actions">
            <button class="inline-action" type="button" data-action="move-route-up" data-id="${escapeHtml(stop.id)}"${index === 0 ? " disabled" : ""}>${buttonContent("Up", "move-route-up")}</button>
            <button class="inline-action" type="button" data-action="move-route-down" data-id="${escapeHtml(stop.id)}"${index === stops.length - 1 ? " disabled" : ""}>${buttonContent("Down", "move-route-down")}</button>
            <button class="inline-action" type="button" data-action="mark-route-complete" data-id="${escapeHtml(stop.id)}">${buttonContent("Mark Complete", "mark-route-complete")}</button>
            ${needsPin ? `<button class="inline-action" type="button" data-action="retry-stop-map" data-id="${escapeHtml(stop.id)}"${isFindingPin ? " disabled" : ""}>${buttonContent(isFindingPin ? "Finding..." : "Retry Map Lookup", "open-route-map")}</button>` : ""}
            <button class="inline-action" type="button" data-action="edit-route-stop" data-id="${escapeHtml(stop.id)}">${buttonContent("Edit", "edit-route-stop")}</button>
            <button class="inline-action danger-action" type="button" data-action="delete-route-stop" data-id="${escapeHtml(stop.id)}">${buttonContent("Delete", "delete-route-stop")}</button>
          </div>
        </div>
      </article>
    `;
    }).join("");
    renderRouteMap(stops);
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
      const end = addDaysKey(today, 7);
      return events.filter((event) => event.date >= today && event.date <= end);
    }
    if (state.calendarView === "thirty") {
      const start = addDaysKey(today, state.calendarRangeOffset * 30);
      const end = addDaysKey(start, 30);
      return events.filter((event) => event.date >= start && event.date <= end);
    }
    return events.filter((event) => event.date >= today);
  }

  function calendarGridDays() {
    const today = new Date(`${todayKey()}T12:00:00`);
    if (state.calendarView === "week") {
      const start = new Date(today);
      return Array.from({ length: 8 }, (_, index) => {
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
          const dayClasses = [
            "calendar-day",
            day === todayKey() ? "is-today" : "",
            day.slice(0, 7) !== currentMonth ? "is-muted" : "",
            dayEvents.length ? "has-events" : ""
          ].filter(Boolean).join(" ");
          return `
            <section class="${dayClasses}">
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
          ${event.action ? `<button class="inline-action" type="button" data-action="${escapeHtml(event.action)}" data-id="${escapeHtml(event.sourceId)}">${buttonContent(event.actionLabel || "Open", event.action)}</button>` : ""}
          ${event.deleteAction ? `<button class="inline-action danger-action" type="button" data-action="${escapeHtml(event.deleteAction)}" data-id="${escapeHtml(event.sourceId)}">${buttonContent("Delete", event.deleteAction)}</button>` : ""}
        </div>
      </article>
    `;
  }

  function renderCalendarGrouped(events) {
    if (!events.length) return emptyState("No calendar items match this view.");
    let currentMonth = "";
    let currentDate = "";
    let monthIndex = -1;
    const parts = [];
    events.forEach((event) => {
      const eventMonth = event.date.slice(0, 7);
      if (eventMonth !== currentMonth) {
        currentMonth = eventMonth;
        monthIndex += 1;
        parts.push(`<section class="calendar-month-group calendar-month-tone-${monthIndex % 3}"><h4>${escapeHtml(monthLabel(event.date))}</h4>`);
        currentDate = "";
      }
      if (event.date !== currentDate) {
        if (currentDate) parts.push(`</div>`);
        currentDate = event.date;
        parts.push(`<div class="calendar-date-group"><p>${escapeHtml(formatDate(event.date))}</p>`);
      }
      parts.push(renderCalendarListCard(event));
    });
    if (currentDate) parts.push(`</div>`);
    if (currentMonth) parts.push(`</section>`);
    return parts.join("");
  }

  function renderCalendar(data) {
    if (!els.calendarList) return;
    let events = buildCalendarEvents(data);
    if (state.calendarFilter !== "All") {
      events = events.filter((event) => event.type === state.calendarFilter);
    }
    events = calendarWindow(events);
    const isThirty = state.calendarView === "thirty";
    if (els.calendarRangeControls) els.calendarRangeControls.hidden = !isThirty;
    if (els.calendarRangeLabel) {
      const start = addDaysKey(todayKey(), state.calendarRangeOffset * 30);
      const end = addDaysKey(start, 30);
      els.calendarRangeLabel.textContent = `${formatDate(start)} - ${formatDate(end)}`;
    }
    qsa("[data-calendar-view]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.calendarView === state.calendarView);
    });
    if (!events.length) {
      els.calendarList.innerHTML = emptyState("No calendar items match this view.");
      return;
    }
    els.calendarList.innerHTML = renderCalendarGrouped(events);
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
    if (!els.jobs) return;
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
            ${actionButton("Open", "open-document", doc.id)}
            ${actionButton("Sync", "sync-square-document", doc.id)}
            ${actionButton("Delete", "delete-document", doc.id).replace("inline-action", "inline-action danger-action")}
          </div>
        </div>
        <p class="item-body">${escapeHtml(doc.clientName)}<br>${escapeHtml(doc.clientEmail || "No email")}</p>
        <strong class="document-total">${doc.squareAmountDueCents !== null ? `${escapeHtml(formatCurrency(doc.squareAmountDueCents, doc.squareCurrency))} due` : `$${doc.total.toFixed(2)}`}</strong>
      </article>
    `).join("");
  }

  function renderNotes() {
    if (!els.notes) return;
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
    if (!els.reminders) return;
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
            <button type="submit">${buttonContent("Save Quote", "complete-reminder")}</button>
            <button type="button" data-action="sync-contact" data-id="${escapeHtml(item.id)}">${buttonContent("Sync Contact", "sync-contact")}</button>
            <button type="button" data-action="create-estimate" data-id="${escapeHtml(item.id)}">${buttonContent("Estimate", "create-estimate")}</button>
            <button type="button" data-action="create-invoice" data-id="${escapeHtml(item.id)}">${buttonContent("Invoice", "create-invoice")}</button>
            <button type="button" class="danger-action" data-action="delete-submission" data-id="${escapeHtml(item.id)}">${buttonContent("Delete Quote", "delete-submission")}</button>
          </div>
        </form>

        <form class="schedule-form" data-schedule-form>
          <h4>Create scheduled job/visit</h4>
          <input name="visit_date" type="date" required>
          <input name="visit_window" placeholder="Visit window, e.g. 9 AM - 11 AM">
          <input name="service" value="${escapeHtml(item.service)}" placeholder="Service">
          <div class="drawer-actions">
            <button type="submit">${buttonContent("Create Job", "quick-add-job")}</button>
            <button type="button" data-action="create-reminder" data-id="${escapeHtml(item.id)}">${buttonContent("Follow-Up", "create-reminder")}</button>
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
          <label>Property / area<input name="city" value="${escapeHtml(contact.city === "Not provided" ? "" : contact.city)}" autocomplete="street-address" data-address-autocomplete></label>
          <label>Type<input name="contact_type" value="${escapeHtml(contact.type === "Contact" ? "" : contact.type)}"></label>
          <label>Status<select name="status">${STATUSES.map((status) => `<option value="${status}"${status === contact.status ? " selected" : ""}>${status}</option>`).join("")}</select></label>
          <div class="drawer-actions">
            <button type="submit">${buttonContent("Save Client", "complete-reminder")}</button>
            <button type="button" data-action="quick-add-job">${buttonContent("Add Job", "quick-add-job")}</button>
            <button type="button" data-action="quick-add-quote">${buttonContent("Add Quote", "quick-add-quote")}</button>
            <button type="button" class="danger-action" data-action="delete-contact" data-id="${escapeHtml(contact.id)}">${buttonContent("Delete Client", "delete-contact")}</button>
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
            <input name="site_name" value="${escapeHtml(job.site)}" autocomplete="organization">
          </label>
          <label>City
            <input name="city" value="${escapeHtml(job.city === "Not provided" ? "" : job.city)}" autocomplete="street-address" data-address-autocomplete>
          </label>
          <label>Service
            <input name="service" value="${escapeHtml(job.service)}" required>
          </label>
          <label>Status
            <select name="status">${STATUSES.map((status) => `<option value="${status}"${status === job.status ? " selected" : ""}>${status}</option>`).join("")}</select>
          </label>
          <div class="drawer-actions">
            <button type="submit">${buttonContent("Save Visit", "complete-reminder")}</button>
            <button type="button" class="danger-action" data-action="cancel-job" data-id="${escapeHtml(job.id)}">${buttonContent("Cancel Visit", "cancel-job")}</button>
          </div>
        </form>
      </div>
    `;
  }

  function openDocumentDrawer(id) {
    const doc = state.data.documents.find((item) => item.id === id);
    if (!doc || !els.detailDrawer || !els.detailContent) return;
    const typeLabel = doc.type === "invoice" ? "Invoice" : "Estimate / Quote";
    const squareStatus = doc.squareStatus || "Not synced";
    const amountDue = doc.squareAmountDueCents !== null ? formatCurrency(doc.squareAmountDueCents, doc.squareCurrency) : "Not synced";
    els.detailDrawer.hidden = false;
    els.detailContent.innerHTML = `
      <div class="drawer-content document-drawer">
        <div class="document-drawer-heading">
          <div>
            <p class="eyebrow">${escapeHtml(typeLabel)}</p>
            <h3>${escapeHtml(doc.number)}</h3>
            <p>${escapeHtml(doc.clientName)}${doc.clientEmail ? ` / ${escapeHtml(doc.clientEmail)}` : ""}</p>
          </div>
          ${documentStatusBadge(doc)}
        </div>
        ${renderPrintableDocument(doc)}
        <section class="document-sidebar-card">
          <div class="document-sidebar-total">
            <span>${doc.squareAmountDueCents !== null ? "Square amount due" : "Document total"}</span>
            <strong>${doc.squareAmountDueCents !== null ? escapeHtml(amountDue) : `$${doc.total.toFixed(2)}`}</strong>
          </div>
          <div class="drawer-grid document-meta-grid">
            <div class="drawer-field"><span>Square invoice</span>${escapeHtml(doc.squareInvoiceNumber || "Not linked")}</div>
            <div class="drawer-field"><span>Square status</span>${escapeHtml(squareStatus)}</div>
            <div class="drawer-field"><span>Issued</span>${escapeHtml(doc.issueDate)}</div>
            <div class="drawer-field"><span>Due</span>${escapeHtml(doc.dueDate)}</div>
            <div class="drawer-field"><span>Last sync</span>${escapeHtml(doc.squareSyncedAt || "Never")}</div>
            <div class="drawer-field"><span>Dashboard status</span>${escapeHtml(doc.status)}</div>
          </div>
          <div class="drawer-actions document-primary-actions">
            <button type="button" data-action="sync-square-document" data-id="${escapeHtml(doc.id)}">${buttonContent("Sync Square", "sync-square-document")}</button>
            ${doc.squarePaymentUrl ? `<a class="button" href="${escapeHtml(doc.squarePaymentUrl)}" target="_blank" rel="noopener noreferrer">Open Payment Link</a>` : ""}
            <button type="button" data-action="print-document" data-id="${escapeHtml(doc.id)}">${buttonContent("Print / PDF", "print-document")}</button>
          </div>
          <button type="button" class="inline-action danger-action document-delete-action" data-action="delete-document" data-id="${escapeHtml(doc.id)}">${buttonContent("Delete Document", "delete-document")}</button>
        </section>
        <form class="drawer-form document-edit-form" data-document-edit data-id="${escapeHtml(doc.id)}">
          <div class="document-form-heading">
            <h4>Edit details</h4>
            <p>Update dashboard records here. Square payment details come from Square sync.</p>
          </div>
          <label>Type
            <select name="document_type">
              <option value="estimate"${doc.type === "estimate" ? " selected" : ""}>Estimate / Quote</option>
              <option value="invoice"${doc.type === "invoice" ? " selected" : ""}>Invoice</option>
            </select>
          </label>
          <label>Client name<input name="client_name" value="${escapeHtml(doc.clientName)}" required></label>
          <label>Client email<input name="client_email" type="email" value="${escapeHtml(doc.clientEmail)}"></label>
          <label>Square invoice #<input name="square_invoice_number" value="${escapeHtml(doc.squareInvoiceNumber)}"></label>
          <label class="span-full">Description<input name="description" value="${escapeHtml(doc.lineItems[0]?.description || "")}" required></label>
          <label>Amount<input name="amount" type="number" min="0" step="0.01" value="${escapeHtml(doc.total)}"></label>
          <label>Due date<input name="due_date" type="date" value="${escapeHtml(doc.dueDateRaw)}"></label>
          <label>Status
            <select name="status">
              <option value="draft"${doc.status === "draft" ? " selected" : ""}>Draft</option>
              <option value="sent"${doc.status === "sent" ? " selected" : ""}>Sent</option>
              <option value="paid"${doc.status === "paid" ? " selected" : ""}>Paid</option>
              <option value="void"${doc.status === "void" ? " selected" : ""}>Void</option>
            </select>
          </label>
          <label class="span-full">Notes<textarea name="notes" rows="3">${escapeHtml(doc.notes)}</textarea></label>
          <div class="drawer-actions document-save-actions">
            <button type="submit">${buttonContent("Save Changes", "complete-reminder")}</button>
          </div>
        </form>
      </div>
    `;
  }

  function renderPrintableDocument(doc) {
    const lineItems = doc.lineItems.length ? doc.lineItems : [{
      description: "Landscape service",
      quantity: 1,
      unit_price: doc.total,
      amount: doc.total
    }];
    return `
      <section class="print-document">
        <div class="print-document-top">
          <div>
            <h1>Urban Yards</h1>
            <p>${escapeHtml(doc.type === "invoice" ? "Invoice" : "Estimate / Quote")} ${escapeHtml(doc.number)}</p>
          </div>
          <strong>$${doc.total.toFixed(2)}</strong>
        </div>
        <div class="print-document-parties">
          <p><span>Prepared for</span>${escapeHtml(doc.clientName)}${doc.clientEmail ? `<br>${escapeHtml(doc.clientEmail)}` : ""}</p>
          <p><span>Dates</span>Issued ${escapeHtml(doc.issueDate)}<br>Due ${escapeHtml(doc.dueDate)}</p>
        </div>
        <table>
          <thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead>
          <tbody>${lineItems.map((item) => `
            <tr>
              <td>${escapeHtml(item.description || "")}</td>
              <td>${escapeHtml(item.quantity || 1)}</td>
              <td>$${Number(item.unit_price || 0).toFixed(2)}</td>
              <td>$${Number(item.amount || 0).toFixed(2)}</td>
            </tr>
          `).join("")}</tbody>
        </table>
        <p class="print-total"><span>Total</span><strong>$${doc.total.toFixed(2)}</strong></p>
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
    win.document.write(`<!DOCTYPE html><html><head><title>${escapeHtml(doc.number)}</title><style>
      body{font-family:Inter,Arial,sans-serif;color:#17251d;padding:32px}
      .print-document{font-family:Georgia,"Times New Roman",serif}
      .print-document-top,.print-document-parties,.print-total{display:flex;justify-content:space-between;gap:18px}
      .print-document-top{align-items:flex-start;padding-bottom:16px;border-bottom:1px solid #dfe6df}
      h1{margin:0 0 4px;color:#123f31;font-size:2rem;line-height:1}
      p{margin-top:0}.print-document-top strong{color:#123f31;font-family:Inter,Arial,sans-serif;font-size:1.7rem}
      .print-document-parties{margin:18px 0;font-family:Inter,Arial,sans-serif;font-size:.92rem}
      .print-document-parties span,.print-total span{display:block;margin-bottom:4px;color:#65756c;font-size:.72rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
      table{width:100%;border-collapse:collapse;margin:0;font-family:Inter,Arial,sans-serif;font-size:.92rem}
      th,td{border-bottom:1px solid #dfe6df;padding:10px 8px;text-align:left}
      th:not(:first-child),td:not(:first-child){text-align:right}
      .print-total{align-items:center;margin-top:14px;padding-top:10px;border-top:2px solid #123f31;font-family:Inter,Arial,sans-serif}
      .print-total strong{color:#123f31;font-size:1.3rem}
    </style></head><body>${renderPrintableDocument(doc)}</body></html>`);
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

  function downloadJson(filename, payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
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

  function exportFullBackup() {
    downloadJson(`urban-yards-dashboard-backup-${todayKey()}.json`, {
      exported_at: new Date().toISOString(),
      source: isDemoMode() ? "demo" : "dashboard",
      data: state.data
    });
  }

  async function importBackupFile(file) {
    if (!file) return;
    if (!isDemoMode()) {
      setDashboardState("Import backup is available in demo/test mode for now to prevent accidental live data changes.", "error");
      return;
    }
    const text = await file.text();
    const payload = JSON.parse(text);
    const imported = payload.data || payload;
    state.data = {
      submissions: Array.isArray(imported.submissions) ? imported.submissions : [],
      contacts: Array.isArray(imported.contacts) ? imported.contacts : [],
      jobs: Array.isArray(imported.jobs) ? imported.jobs : [],
      notes: Array.isArray(imported.notes) ? imported.notes : [],
      reminders: Array.isArray(imported.reminders) ? imported.reminders : [],
      documents: Array.isArray(imported.documents) ? imported.documents : [],
      operations: Array.isArray(imported.operations) ? imported.operations : [],
      routeStops: Array.isArray(imported.routeStops) ? imported.routeStops : []
    };
    await render();
    setDashboardState("Backup imported into demo mode.");
  }

  async function render() {
    const data = state.data;
    populatePropertyFilter(data);
    renderMetrics(data);
    renderDashboardAlerts(data);
    renderSubmissions(data);
    renderUpcoming(data);
    renderHomeReminders(data);
    renderHomeNotes(data);
    renderTodayRouteSnapshot(data);
    renderQuoteTable(data);
    renderPipeline(data);
    renderDocuments(data);
    renderContacts(data);
    renderJobs(data);
    renderNotes();
    renderReminders(data);
    renderCalendar(data);
    renderOperations(data);
    renderRoutePlanner(data);
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
      await render();
      setDashboardState(isDemoMode() ? "Demo mode: sample records only. Changes stay in this browser session and do not touch Supabase, Square, or real client data." : "");
    } catch (error) {
      state.loading = false;
      state.error = error.message || "Unable to load dashboard records.";
      setDashboardState(state.error, "error");
      els.submissions.innerHTML = emptyState("Dashboard records could not be loaded.");
      els.upcoming.innerHTML = emptyState("Scheduled visits could not be loaded.");
    }
  }

  function setSidebarOpen(isOpen) {
    if (!els.appView) return;
    els.appView.classList.toggle("is-sidebar-open", Boolean(isOpen));
    if (els.sidebarToggle) {
      els.sidebarToggle.setAttribute("aria-expanded", String(Boolean(isOpen)));
    }
  }

  function bindPullToRefresh() {
    if (!els.pullRefresh) return;
    let startY = 0;
    let distance = 0;
    let pulling = false;
    const threshold = 88;

    function setPull(distanceValue, isReady) {
      const clamped = Math.min(Math.max(distanceValue, 0), 96);
      const progress = Math.min(clamped / threshold, 1);
      els.pullRefresh.style.setProperty("--pull-distance", `${clamped}px`);
      els.pullRefresh.style.setProperty("--pull-progress", String(progress));
      els.pullRefresh.classList.toggle("is-visible", clamped > 8);
      els.pullRefresh.classList.toggle("is-ready", Boolean(isReady));
      const label = els.pullRefresh.querySelector("strong");
      if (label) label.textContent = isReady ? "Release to refresh" : "Pull to refresh";
    }

    function resetPull() {
      distance = 0;
      pulling = false;
      els.pullRefresh.classList.remove("is-visible", "is-ready", "is-refreshing");
      els.pullRefresh.style.setProperty("--pull-distance", "0px");
      els.pullRefresh.style.setProperty("--pull-progress", "0");
      const label = els.pullRefresh.querySelector("strong");
      if (label) label.textContent = "Pull to refresh";
    }

    document.addEventListener("touchstart", (event) => {
      if (!els.appView || els.appView.hidden || window.scrollY > 0 || state.loading) return;
      startY = event.touches[0]?.clientY || 0;
      pulling = true;
    }, { passive: true });

    document.addEventListener("touchmove", (event) => {
      if (!pulling || !startY || window.scrollY > 0) return;
      distance = Math.max((event.touches[0]?.clientY || 0) - startY, 0);
      if (distance > 6) {
        setPull(distance * .72, distance >= threshold);
      }
    }, { passive: true });

    document.addEventListener("touchend", async () => {
      if (!pulling) return;
      const shouldRefresh = distance >= threshold;
      if (!shouldRefresh) {
        resetPull();
        return;
      }

      els.pullRefresh.classList.remove("is-ready");
      els.pullRefresh.classList.add("is-refreshing");
      const label = els.pullRefresh.querySelector("strong");
      if (label) label.textContent = "Refreshing";
      try {
        await refreshDashboard();
      } finally {
        resetPull();
      }
    }, { passive: true });
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

    if (els.sidebarClose) {
      els.sidebarClose.addEventListener("click", () => setSidebarOpen(false));
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setSidebarOpen(false);
    });

    document.addEventListener("focusin", (event) => {
      if (event.target.matches("[data-address-autocomplete]")) {
        initAddressAutocomplete(event.target);
      }
    });

    qsa("[data-calendar-view]").forEach((button) => {
      button.addEventListener("click", async () => {
        state.calendarView = button.dataset.calendarView || "agenda";
        if (state.calendarView !== "thirty") state.calendarRangeOffset = 0;
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

    if (els.routeDate) {
      els.routeDate.addEventListener("change", async () => {
        state.routeDate = els.routeDate.value || todayKey();
        resetRouteForm();
        await render();
      });
    }

    if (els.importBackup) {
      els.importBackup.addEventListener("change", async () => {
        const file = els.importBackup.files && els.importBackup.files[0];
        try {
          await importBackupFile(file);
        } catch (error) {
          setDashboardState(error.message || "Unable to import backup.", "error");
        } finally {
          els.importBackup.value = "";
        }
      });
    }

    if (els.noteForm) {
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
    }

    els.appView.addEventListener("change", async (event) => {
      const target = event.target;
      if (!target) return;

      if (target.matches("[data-route-status-id]")) {
        try {
          setDashboardState("Updating route stop...");
          await updateRouteStopStatus(target.dataset.routeStatusId, target.value);
          await refreshDashboard();
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to update route stop.", "error");
        }
        return;
      }

      if (!target.matches("[data-status-table][data-status-id]")) return;

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
        setActiveSection("overview");
        history.replaceState(null, "", "#overview");
        const form = qs("[data-operations-form]");
        if (form) {
          form.record_type.value = action === "quick-add-invoice-reminder" ? "payment" : "client";
          form.title.value = action === "quick-add-invoice-reminder" ? "Invoice reminder" : "Follow-up";
          form.status.value = "Open";
          form.title.focus();
        }
      } else if (action === "quick-add-client") {
        setActiveSection("contacts");
        history.replaceState(null, "", "#contacts");
        const input = qs("[data-client-form] input[name='name']");
        if (input) input.focus();
      } else if (action === "quick-add-operation") {
        setActiveSection("overview");
        history.replaceState(null, "", "#overview");
        const input = qs("[data-operations-form] input[name='title']");
        if (input) input.focus();
      } else if (action === "go-route-planner") {
        setActiveSection("route-planner");
        history.replaceState(null, "", "#route-planner");
      } else if (action === "go-calendar") {
        setActiveSection("calendar");
        history.replaceState(null, "", "#calendar");
        const input = qs("[data-job-create-form] input[name='site_name']");
        if (input) input.focus();
      } else if (action === "go-documents") {
        setActiveSection("documents");
        history.replaceState(null, "", "#documents");
      } else if (action === "go-settings") {
        setActiveSection("settings");
        history.replaceState(null, "", "#settings");
      } else if (action === "go-contacts") {
        setActiveSection("contacts");
        history.replaceState(null, "", "#contacts");
      } else if (action === "set-operation-filter") {
        state.operationsFilter = target.dataset.filter || "All";
        if (els.operationsFilter) els.operationsFilter.value = state.operationsFilter;
        await render();
      } else if (action === "prefill-operation") {
        setActiveSection("overview");
        history.replaceState(null, "", "#overview");
        const form = qs("[data-operations-form]");
        if (form) {
          form.record_type.value = target.dataset.type || "task";
          form.title.value = target.dataset.title || "";
          if (form.elements.description) form.elements.description.value = target.dataset.notes || "";
          if (form.elements.priority) form.elements.priority.value = target.dataset.priority || "Normal";
          form.status.value = "Open";
          form.title.focus();
        }
      } else if (action === "previous-30-days") {
        state.calendarView = "thirty";
        state.calendarRangeOffset -= 1;
        await render();
      } else if (action === "next-30-days") {
        state.calendarView = "thirty";
        state.calendarRangeOffset += 1;
        await render();
      } else if (action === "select-route-stop") {
        state.selectedRouteStopId = id;
        renderRoutePlanner();
      } else if (action === "retry-stop-map" || action === "find-stop-map") {
        const stop = findRouteStop(id);
        if (!stop || !stop.address) return;
        try {
          setDashboardState("Finding map pin...");
          await geocodeAndStoreRouteStop(stop);
          await refreshDashboard();
          setDashboardState("");
        } catch (error) {
          routeGeocodingIds.delete(id);
          renderRoutePlanner();
          setDashboardState(error.message || "Unable to find a map pin for this stop.", "error");
        }
      } else if (action === "open-route-map") {
        const url = routeMapsUrl();
        if (!url) {
          setDashboardState("Add at least one route stop address before opening Google Maps.", "error");
          return;
        }
        window.open(url, "_blank", "noopener");
      } else if (action === "reset-route-form") {
        resetRouteForm();
      } else if (action === "move-route-up" || action === "move-route-down") {
        try {
          setDashboardState("Reordering route...");
          await moveRouteStop(id, action === "move-route-up" ? "up" : "down");
          await refreshDashboard();
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to reorder route.", "error");
        }
      } else if (action === "mark-route-complete") {
        try {
          setDashboardState("Marking stop complete...");
          await updateRouteStopStatus(id, "Complete");
          await refreshDashboard();
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to complete stop.", "error");
        }
      } else if (action === "edit-route-stop") {
        editRouteStop(id);
      } else if (action === "delete-route-stop") {
        const ok = window.confirm("Delete this route stop?");
        if (!ok) return;
        try {
          setDashboardState("Deleting route stop...");
          await deleteRow("route_stops", id);
          resetRouteForm();
          await refreshDashboard();
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to delete route stop.", "error");
        }
      } else if (action === "refresh-dashboard") {
        await refreshDashboard();
      } else if (action === "export-full-backup") {
        exportFullBackup();
      } else if (action === "import-backup") {
        if (els.importBackup) els.importBackup.click();
      } else if (action === "clear-demo-data") {
        if (!isDemoMode()) {
          setDashboardState("Clear Demo Data only affects demo/test mode.", "error");
          return;
        }
        state.data = demoDashboardData();
        await render();
        setDashboardState("Demo data reset.");
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
        const ok = window.confirm("Delete this task?");
        if (!ok) return;
        try {
          setDashboardState("Deleting operation...");
          await deleteRow("operations_records", id);
          await refreshDashboard();
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to delete operation.", "error");
        }
      } else if (action === "complete-operation") {
        try {
          setDashboardState("Marking task done...");
          await updateStatus("operations_records", id, "Done");
          await refreshDashboard();
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to mark task done.", "error");
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
          setDashboardState("Saving task...");
          await insertOperation({
            record_type: String(formData.get("record_type") || "task"),
            title: String(formData.get("title") || ""),
            description: String(formData.get("description") || "") || null,
            due_date: String(formData.get("due_date") || "") || null,
            status: String(formData.get("status") || "Open"),
            priority: String(formData.get("priority") || "Normal"),
            completed_at: String(formData.get("status") || "") === "Done" ? new Date().toISOString() : null,
            notes: String(formData.get("notes") || "")
          });
          event.target.reset();
          await refreshDashboard();
          setActiveSection("overview");
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to save operation.", "error");
        }
      } else if (event.target.matches("[data-route-form]")) {
        event.preventDefault();
        const payload = routeStopFormPayload(event.target);
        if (!payload.client_name || !payload.address || !payload.service_type) return;
        const id = String(new FormData(event.target).get("route_stop_id") || "");
        const existingStop = id ? findRouteStop(id) : null;
        const addressChanged = existingStop && normalizedRouteLookupAddress(existingStop.address) !== normalizedRouteLookupAddress(payload.address);
        let savedStop = null;
        let pinWarning = "";
        try {
          setDashboardState(id ? "Saving route stop..." : "Adding route stop...");
          if (id) {
            savedStop = await updateRouteStop(id, payload);
            if (addressChanged) {
              try {
                await clearRouteStopCoordinates(id);
                savedStop = { ...savedStop, latitude: null, longitude: null };
              } catch (error) {
                console.warn("Unable to clear old route coordinates.", error);
              }
            }
          } else {
            savedStop = await insertRouteStop(payload);
          }
          if (savedStop?.address && (!hasRouteCoordinates(savedStop) || addressChanged)) {
            try {
              setDashboardState("Finding map pin...");
              await geocodeAndStoreRouteStop(savedStop);
            } catch (error) {
              pinWarning = error.message || "Stop saved, but the map pin lookup failed.";
              routeGeocodingIds.delete(savedStop.id);
            }
          }
          resetRouteForm();
          await refreshDashboard();
          setActiveSection("route-planner");
          setDashboardState(pinWarning ? `${pinWarning} Use Retry Map Lookup on the stop card.` : "");
        } catch (error) {
          if (savedStop?.id) routeGeocodingIds.delete(savedStop.id);
          setDashboardState(error.message || "Unable to save route stop.", "error");
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

    bindPullToRefresh();

    if (els.newNote) {
      els.newNote.addEventListener("click", () => {
        setActiveSection("overview");
        history.replaceState(null, "", "#overview");
        const titleInput = qs("[data-operations-form] input[name='title']");
        if (titleInput) titleInput.focus();
      });
    }

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
    els.calendarRangeControls = qs("[data-calendar-range-controls]");
    els.calendarRangeLabel = qs("[data-calendar-range-label]");
    els.operationsFilter = qs("[data-operations-filter]");
    els.calendarList = qs("[data-calendar-list]");
    els.operationsSummary = qs("[data-operations-summary]");
    els.operationsList = qs("[data-operations-list]");
    els.operationsHealth = qs("[data-operations-health]");
    els.operationsFilterPills = qs("[data-operations-filter-pills]");
    els.operationsCommandList = qs("[data-operations-command-list]");
    els.commandToday = qs("[data-command-today]");
    els.commandWaiting = qs("[data-command-waiting]");
    els.commandDeadlines = qs("[data-command-deadlines]");
    els.commandEquipment = qs("[data-command-equipment]");
    els.routeDate = qs("[data-route-date]");
    els.routeForm = qs("[data-route-form]");
    els.routeAddressInput = qs("[data-route-address-input]");
    els.routeSubmit = qs("[data-route-submit]");
    els.routeStops = qs("[data-route-stops]");
    els.routeSummary = qs("[data-route-summary]");
    els.routeMap = qs("[data-route-map]");
    els.routeMapStatus = qs("[data-route-map-status]");
    els.importBackup = qs("[data-import-backup]");
    els.homeReminders = qs("[data-home-reminders]");
    els.homeNotes = qs("[data-home-notes]");
    els.todayRouteSnapshot = qs("[data-today-route-snapshot]");
    els.dashboardAlerts = qs("[data-dashboard-alerts]");
    els.todayChip = qs("[data-today-chip]");
    els.detailDrawer = qs("[data-detail-drawer]");
    els.detailContent = qs("[data-detail-content]");
    els.closeDetail = qs("[data-close-detail]");
    els.pullRefresh = qs("[data-pull-refresh]");
    els.demoBadge = qs("[data-demo-badge]");
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
    els.sidebarToggle = qs("[data-sidebar-toggle]");
    els.sidebarClose = qs("[data-sidebar-close]");
  }

  async function init() {
    cacheElements();
    bindEvents();
    const hashSection = window.location.hash.replace("#", "");
    if (hashSection) state.activeSection = hashSection === "operations" || hashSection === "command-center" ? "overview" : hashSection;

    if (isDemoMode()) {
      clearSession();
      await showApp();
      return;
    }

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
