(function () {
  "use strict";

  const STATUSES = ["New", "Contacted", "Scheduled", "Completed", "Invoiced"];
  const SESSION_KEY = "urbanYardsDashboardSession";

  const config = window.URBAN_YARDS_DASHBOARD_CONFIG || {
    supabaseUrl: "",
    supabaseAnonKey: "",
    ownerEmail: "team@urbanyards.us"
  };

  const mockData = {
    submissions: [
      {
        id: "Q-1048",
        name: "Maya Reynolds",
        email: "maya@example.com",
        phone: "(971) 555-0182",
        propertyType: "Homeowner",
        city: "Portland",
        service: "Lawn care and seasonal cleanup",
        status: "New",
        source: "Quote form",
        receivedAt: "Jun 18, 2026",
        followUp: "Call today",
        notes: "Front yard needs regular mowing and edging. Asked about pollinator-friendly plantings."
      },
      {
        id: "Q-1047",
        name: "Cedar Court Apartments",
        email: "manager@example.com",
        phone: "(360) 555-0134",
        propertyType: "Multifamily",
        city: "Vancouver",
        service: "Groundskeeping and pressure washing",
        status: "Contacted",
        source: "Quote form",
        receivedAt: "Jun 17, 2026",
        followUp: "Send estimate",
        notes: "Needs recurring common-area care and breezeway cleanup."
      },
      {
        id: "Q-1046",
        name: "Alder Commons HOA",
        email: "board@example.com",
        phone: "(971) 555-0199",
        propertyType: "Community property",
        city: "Beaverton",
        service: "Landscape refresh",
        status: "Scheduled",
        source: "Phone",
        receivedAt: "Jun 16, 2026",
        followUp: "Site walk Friday",
        notes: "Interested in cleaner entries, mulch, and resilient planting around shared paths."
      },
      {
        id: "Q-1045",
        name: "Northline Townhomes",
        email: "leasing@example.com",
        phone: "(503) 555-0108",
        propertyType: "Property management",
        city: "Portland",
        service: "Recurring groundskeeping",
        status: "Completed",
        source: "Email",
        receivedAt: "Jun 14, 2026",
        followUp: "Check in next week",
        notes: "Initial cleanup completed. Owner wants recurring visit options."
      },
      {
        id: "Q-1044",
        name: "Sam Torres",
        email: "sam@example.com",
        phone: "(503) 555-0140",
        propertyType: "Homeowner",
        city: "Portland",
        service: "Garden bed cleanup",
        status: "Invoiced",
        source: "Quote form",
        receivedAt: "Jun 12, 2026",
        followUp: "Payment reminder if needed",
        notes: "One-time cleanup and mulch. Possible fall maintenance."
      }
    ],
    contacts: [
      { name: "Maya Reynolds", type: "Homeowner", city: "Portland", email: "maya@example.com", phone: "(971) 555-0182", status: "New" },
      { name: "Cedar Court Apartments", type: "Multifamily", city: "Vancouver", email: "manager@example.com", phone: "(360) 555-0134", status: "Contacted" },
      { name: "Alder Commons HOA", type: "Community", city: "Beaverton", email: "board@example.com", phone: "(971) 555-0199", status: "Scheduled" },
      { name: "Northline Townhomes", type: "Property management", city: "Portland", email: "leasing@example.com", phone: "(503) 555-0108", status: "Completed" }
    ],
    jobs: [
      { date: "Fri, Jun 19", window: "9:00 AM - 10:30 AM", site: "Alder Commons HOA", city: "Beaverton", service: "Site walk and scope", status: "Scheduled" },
      { date: "Mon, Jun 22", window: "8:00 AM - 12:00 PM", site: "Cedar Court Apartments", city: "Vancouver", service: "Pressure washing estimate visit", status: "Contacted" },
      { date: "Wed, Jun 24", window: "10:00 AM - 2:00 PM", site: "Northline Townhomes", city: "Portland", service: "Recurring maintenance visit", status: "Scheduled" }
    ],
    notes: [
      { title: "Cedar Court scope", body: "Ask about water access and preferred service window before quoting pressure washing.", date: "Jun 18, 2026" },
      { title: "Alder Commons planting", body: "Bring photos of dense native planting examples and ask about irrigation limits.", date: "Jun 17, 2026" },
      { title: "Northline follow-up", body: "Recommend biweekly growing-season visits with seasonal cleanup add-ons.", date: "Jun 15, 2026" }
    ],
    reminders: [
      { due: "Today", task: "Call Maya Reynolds about lawn care quote", status: "New" },
      { due: "Tomorrow", task: "Send Cedar Court pressure washing estimate", status: "Contacted" },
      { due: "Jun 24", task: "Check in after Northline recurring maintenance visit", status: "Scheduled" }
    ]
  };

  const state = {
    activeSection: "overview",
    statusFilter: "All",
    notes: mockData.notes.slice()
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
    // Future database wiring belongs here. Planned tables:
    // quote_submissions, contacts, scheduled_jobs, job_notes, follow_up_reminders.
    // Use Supabase RLS so only the authorized owner account can read/write records.
    return mockData;
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
    await render();
  }

  function setActiveSection(section) {
    state.activeSection = section || "overview";
    qsa("[data-section]").forEach((node) => {
      node.classList.toggle("is-active", node.dataset.section === state.activeSection);
    });
    qsa("[data-dashboard-link]").forEach((node) => {
      node.classList.toggle("is-active", node.dataset.dashboardLink === state.activeSection);
    });
  }

  function renderMetrics(data) {
    const openLeads = data.submissions.filter((item) => ["New", "Contacted"].includes(item.status)).length;
    const scheduled = data.jobs.filter((item) => item.status === "Scheduled").length;
    const completed = data.submissions.filter((item) => item.status === "Completed").length;
    const invoiced = data.submissions.filter((item) => item.status === "Invoiced").length;
    const metrics = [
      ["Open leads", openLeads],
      ["Scheduled visits", scheduled],
      ["Completed jobs", completed],
      ["Invoiced", invoiced]
    ];

    els.metrics.innerHTML = metrics
      .map(([label, value]) => `<article class="metric-card"><strong>${value}</strong><span>${label}</span></article>`)
      .join("");
  }

  function renderSubmissions(data) {
    const items = data.submissions.filter((item) => state.statusFilter === "All" || item.status === state.statusFilter);
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

  function renderQuoteTable(data) {
    els.quoteTable.innerHTML = data.submissions.map((item) => `
      <tr>
        <td><strong>${escapeHtml(item.name)}</strong><br><span class="meta">${escapeHtml(item.email)}<br>${escapeHtml(item.phone)}</span></td>
        <td>${escapeHtml(item.service)}<br><span class="meta">${escapeHtml(item.source)} / ${escapeHtml(item.receivedAt)}</span></td>
        <td>${escapeHtml(item.propertyType)}<br><span class="meta">${escapeHtml(item.city)}</span></td>
        <td>${statusBadge(item.status)}</td>
        <td>${escapeHtml(item.followUp)}</td>
      </tr>
    `).join("");
  }

  function renderContacts(data) {
    els.contacts.innerHTML = data.contacts.map((contact) => `
      <article class="contact-card">
        <div class="item-topline">
          <div>
            <h4>${escapeHtml(contact.name)}</h4>
            <div class="meta">${escapeHtml(contact.type)} / ${escapeHtml(contact.city)}</div>
          </div>
          ${statusBadge(contact.status)}
        </div>
        <p class="item-body">${escapeHtml(contact.email)}<br>${escapeHtml(contact.phone)}</p>
      </article>
    `).join("");
  }

  function renderJobs(data) {
    els.jobs.innerHTML = data.jobs.map((job) => `
      <article class="job-card">
        <div class="item-topline">
          <div>
            <h4>${escapeHtml(job.site)}</h4>
            <div class="meta">${escapeHtml(job.date)} / ${escapeHtml(job.window)}</div>
          </div>
          ${statusBadge(job.status)}
        </div>
        <p class="item-body">${escapeHtml(job.service)}<br>${escapeHtml(job.city)}</p>
      </article>
    `).join("");
  }

  function renderNotes() {
    els.notes.innerHTML = state.notes.map((note) => `
      <article class="note-card">
        <div class="item-topline">
          <h4>${escapeHtml(note.title)}</h4>
          <span class="meta">${escapeHtml(note.date)}</span>
        </div>
        <p class="item-body">${escapeHtml(note.body)}</p>
      </article>
    `).join("");
  }

  function renderReminders(data) {
    els.reminders.innerHTML = data.reminders.map((reminder) => `
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

  async function render() {
    const data = await loadDashboardData();
    renderMetrics(data);
    renderSubmissions(data);
    renderUpcoming(data);
    renderQuoteTable(data);
    renderContacts(data);
    renderJobs(data);
    renderNotes();
    renderReminders(data);
    setActiveSection(state.activeSection);
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

    els.statusFilter.addEventListener("change", async () => {
      state.statusFilter = els.statusFilter.value;
      await render();
    });

    els.noteForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(els.noteForm);
      state.notes.unshift({
        title: String(formData.get("title") || "").trim(),
        body: String(formData.get("body") || "").trim(),
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      });
      els.noteForm.reset();
      renderNotes();
    });

    els.newNote.addEventListener("click", () => {
      setActiveSection("notes");
      history.replaceState(null, "", "#notes");
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
    els.metrics = qs("[data-metrics]");
    els.statusFilter = qs("[data-status-filter]");
    els.submissions = qs("[data-submissions]");
    els.upcoming = qs("[data-upcoming]");
    els.quoteTable = qs("[data-quote-table]");
    els.contacts = qs("[data-contacts]");
    els.jobs = qs("[data-jobs]");
    els.noteForm = qs("[data-note-form]");
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
