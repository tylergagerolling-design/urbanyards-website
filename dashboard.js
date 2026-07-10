(function () {
  "use strict";

  const STATUSES = ["New", "Contacted", "Scheduled", "Completed", "Invoiced"];
  const ROUTE_STATUSES = ["Planned", "In Progress", "Complete"];
  const OUTREACH_STATUSES = ["Prospect", "Researched", "Contacted", "Follow-Up Needed", "Interested", "Quote Needed", "Quoted", "Won", "Lost / No Fit"];
  const OUTREACH_ACTIVE_STATUSES = OUTREACH_STATUSES.filter((status) => !["Won", "Lost / No Fit"].includes(status));
  const OUTREACH_PROPERTY_TYPES = ["Apartment", "HOA", "Small Commercial", "Mixed-Use", "Residential", "Property Management", "Other"];
  const OUTREACH_SERVICE_INTERESTS = ["Seasonal Cleanup", "Trash Area Care", "Day Porter / Groundskeeping", "Mulch / Bed Refresh", "Apartment Turnover Cleaning", "Repair / Touch-Up", "Lawn Care", "Shrub / Hedge Trimming", "General Property Care", "Other"];
  const OUTREACH_PRIORITIES = ["High", "Normal", "Low"];
  const EQUIPMENT_CATEGORIES = ["Mowers", "String trimmers", "Edgers", "Blowers", "Hedge trimmers", "Chainsaws / pole saws", "Pressure washing", "Hand tools", "Batteries", "Chargers", "PPE / safety gear", "Cleaning supplies", "Vehicle / transport", "Irrigation / watering", "Mulch / soil tools", "Miscellaneous"];
  const EQUIPMENT_CONDITIONS = ["New", "Good", "Fair", "Needs Repair", "Replace Soon", "Retired"];
  const EQUIPMENT_STATUSES = ["Ready", "In Use", "Needs Maintenance", "Needs Repair", "Missing", "Retired"];
  const EQUIPMENT_PRIORITIES = ["High", "Normal", "Low"];
  const HARDWARE_STATUSES = ["Researching", "Recommended", "Bought", "Not Chosen"];
  const COMMAND_CATEGORIES = ["task", "client", "payment", "deadline", "equipment"];
  const CALL_OUTCOMES = ["not_set", "no_answer", "left_voicemail", "spoke_with_contact", "follow_up_needed", "not_interested", "wrong_number", "bad_number", "follow_up_later"];
  const CALL_PANEL_OUTCOMES = ["no_answer", "left_voicemail", "spoke_with_contact", "follow_up_needed", "not_interested", "wrong_number"];
  const CALL_OUTCOME_LABELS = {
    not_set: "Not set",
    no_answer: "No answer",
    left_voicemail: "Voicemail left",
    spoke_with_contact: "Spoke with contact",
    follow_up_needed: "Follow-up needed",
    not_interested: "Not interested",
    wrong_number: "Wrong number",
    bad_number: "Wrong number",
    follow_up_later: "Follow-up needed"
  };
  const SESSION_KEY = "urbanYardsDashboardSession";
  const CALL_METHOD_KEY = "urbanYardsPreferredCallMethod";
  const DASHBOARD_THEME_KEY = "urbanYardsDashboardTheme";
  const DASHBOARD_COMPACT_KEY = "urbanYardsDashboardCompact";
  const DASHBOARD_REDUCED_MOTION_KEY = "urbanYardsDashboardReducedMotion";
  const GOOGLE_VOICE_HOME_URL = "https://voice.google.com/";
  const GOOGLE_VOICE_CALLS_URL = "https://voice.google.com/u/0/calls";
  const URBAN_YARDS_GOOGLE_VOICE_NUMBER = "(971) 258-1109";
  const USER_AVATAR_MAX_BYTES = 2 * 1024 * 1024;
  const USER_AVATAR_ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
  const USER_AVATAR_ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);
  const PROTECTED_USER_EMAIL = "team@urbanyards.us";
  const DASHBOARD_ROLES = ["owner", "admin", "manager", "worker", "viewer"];
  const DASHBOARD_ROLE_LABELS = {
    owner: "Owner",
    admin: "Admin",
    manager: "Manager",
    worker: "Worker",
    viewer: "Viewer"
  };
  const DASHBOARD_ROLE_PERMISSIONS = {
    owner: ["*"],
    admin: ["*"],
    manager: ["view", "create", "edit", "archive", "import", "export"],
    worker: ["view", "create", "edit"],
    viewer: ["view"]
  };
  const AI_TRAINING_CATEGORIES = {
    tone: "Tone & Voice",
    services: "Services",
    service_area: "Service Areas",
    pricing: "Pricing & Estimates",
    faq: "FAQs",
    lead_capture: "Lead Capture",
    escalation: "Escalation Rules",
    do_dont: "Do / Don't Rules",
    website_reference: "Website Content References",
    other: "Other"
  };
  const AI_TRAINING_STATUS_LABELS = {
    draft: "Draft",
    approved: "Approved",
    live: "Live",
    archived: "Archived",
    published: "Live"
  };
  const DEMO_QUERY_KEYS = ["demo", "test"];
  const DASHBOARD_ICON_PATH = "images/dashboard-icons/";
  const HOME_DASHBOARD_ICON_PATH = "images/home-dashboard/";
  const WORK_DASHBOARD_ICON_PATH = "images/work-dashboard/";
  const DASHBOARD_DATA_KEYS = [
    "submissions",
    "contacts",
    "jobs",
    "notes",
    "reminders",
    "documents",
    "operations",
    "outreachProspects",
    "outreachCompanies",
    "outreachProperties",
    "routeStops",
    "equipmentItems",
    "equipmentMaintenance",
    "hardwareGuide",
    "leadActivity",
    "userProfiles",
    "auditLogs"
  ];

  const config = window.URBAN_YARDS_DASHBOARD_CONFIG || {
    supabaseUrl: "",
    supabaseAnonKey: "",
    siteUrl: "",
    ownerEmail: "team@urbanyards.us",
    appEnv: "production"
  };

  function readStoredPreference(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null || value === "" ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }

  function applyDashboardPreferences() {
    const root = document.documentElement;
    root.dataset.theme = readStoredPreference(DASHBOARD_THEME_KEY, "urban-yards");
    root.dataset.compact = readStoredPreference(DASHBOARD_COMPACT_KEY, "false");
    const reducedMotionFallback = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "true" : "false";
    root.dataset.reducedMotion = readStoredPreference(DASHBOARD_REDUCED_MOTION_KEY, reducedMotionFallback);
  }

  const state = {
    activeSection: "overview",
    statusFilter: "All",
    calendarFilter: "All",
    calendarView: "agenda",
    calendarRangeOffset: 0,
    operationsFilter: "All",
    outreachStatusFilter: "Active",
    outreachTypeFilter: "All",
    outreachServiceFilter: "All",
    outreachPriorityFilter: "All",
    outreachSearch: "",
    outreachView: "pipeline",
    outreachCompanyFilter: "All",
    outreachCityFilter: "All",
    outreachNeighborhoodFilter: "All",
    outreachVisibleNeedsFilter: "",
    outreachVerifiedFilter: "All",
    equipmentView: "inventory",
    equipmentSearch: "",
    equipmentCategoryFilter: "All",
    equipmentStatusFilter: "All",
    equipmentConditionFilter: "All",
    equipmentPriorityFilter: "All",
    groundskeeperAiView: "training",
    groundskeeperAiSearch: "",
    trainingPreviewMode: "draft",
    trainingMessages: [],
    trainingPreviewMessages: [],
    trainingEditingRuleId: "",
    trainingPublishModalOpen: false,
    selectedOutreachIds: new Set(),
    selectedOutreachPropertyIds: new Set(),
    pendingOutreachImport: null,
    routeDate: todayKey(),
    selectedRouteStopId: "",
    search: "",
    propertyFilter: "All",
    selectedSubmissionId: "",
    selectedJobId: "",
    documentsReady: true,
    operationsReady: true,
    outreachReady: true,
    outreachCompaniesReady: true,
    outreachPropertiesReady: true,
    routeStopsReady: true,
    equipmentReady: true,
    equipmentMaintenanceReady: true,
    hardwareGuideReady: true,
    groundskeeperAiReady: false,
    leadActivityReady: true,
    userProfilesReady: true,
    auditLogsReady: true,
    avatarUploadTargetId: "",
    preferredCallMethod: localStorage.getItem(CALL_METHOD_KEY) || "browser_tel",
    groundskeeperMessages: [],
    data: {
      submissions: [],
      contacts: [],
      jobs: [],
      notes: [],
      reminders: [],
      documents: [],
      operations: [],
      outreachProspects: [],
      outreachCompanies: [],
      outreachProperties: [],
      routeStops: [],
      equipmentItems: [],
      equipmentMaintenance: [],
      hardwareGuide: [],
      leadActivity: [],
      userProfiles: [],
      auditLogs: [],
      groundskeeperAi: {
        settings: [],
        knowledge: [],
        faqs: [],
        rules: [],
        savedAnswers: [],
        trainingRules: [],
        versions: [],
        logs: [],
        feedback: [],
        fallback: {}
      }
    },
    loading: false,
    error: ""
  };

  const els = {};
  const sectionAliases = {
    home: "overview",
    work: "calendar",
    properties: "contacts",
    more: "settings",
    quotes: "documents",
    pipeline: "documents",
    schedule: "calendar",
    operations: "overview",
    "command-center": "overview",
    notes: "settings",
    reminders: "settings"
  };
  let demoIdCount = 100;
  let googleRouteMap = null;
  let googleRouteLine = null;
  let googleMapsLoadPromise = null;
  let googleMapsBrowserKeyPromise = null;
  let notificationCloseTimer = null;
  const addressAutocompleteInputs = new WeakSet();
  let googleRouteMarkers = [];
  const googleMapViews = new Map();
  const routePreviewState = new Map();
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
      "call-lead": "GV",
      "clear-demo-data": "x",
      "complete-operation": "OK",
      "complete-reminder": "OK",
      "copy-phone": "Copy",
      "create-estimate": "+",
      "create-invoice": "$",
      "create-outreach-quote": "+",
      "create-reminder": "+",
      "delete-contact": "x",
      "delete-document": "x",
      "delete-note": "x",
      "delete-operation": "x",
      "delete-outreach-property": "x",
      "delete-reminder": "x",
      "delete-outreach-prospect": "x",
      "delete-route-stop": "x",
      "delete-submission": "x",
      "edit-job": "/",
      "edit-outreach-prospect": "/",
      "edit-route-stop": "/",
      "export-full-backup": "JSON",
      "export-backend-backup": "DB",
      "find-stop-map": "M",
      "go-calendar": "+",
      "go-contacts": "-&gt;",
      "go-documents": "$",
      "go-route-planner": "M",
      "go-settings": "-&gt;",
      "import-outreach-csv": "CSV",
      "mark-route-complete": "OK",
      "mark-outreach-contacted": "OK",
      "move-route-down": "v",
      "move-route-up": "^",
      "new-outreach-prospect": "+",
      "open-route-map": "M",
      "open-contact": "-&gt;",
      "open-document": "-&gt;",
      "open-outreach-prospect": "-&gt;",
      "open-submission": "-&gt;",
      "print-document": "PDF",
      "quick-add-job": "+",
      "quick-add-operation": "+",
      "quick-add-quote": "+",
      "reschedule-job": "R",
      "route-outreach-prospect": "M",
      "sync-contact": "~",
      "sync-square-document": "~"
    };
    const icon = icons[action] || "";
    return `${icon ? `<span class="button-icon" aria-hidden="true">${icon}</span>` : ""}<span>${escapeHtml(label)}</span>`;
  }

  function actionButton(label, action, id) {
    return `<button class="inline-action" type="button" data-action="${escapeHtml(action)}" data-id="${escapeHtml(id)}">${buttonContent(label, action)}</button>`;
  }

  function dashboardIcon(name) {
    return `${DASHBOARD_ICON_PATH}${escapeHtml(name)}`;
  }

  function homeDashboardIcon(name) {
    return `${HOME_DASHBOARD_ICON_PATH}${escapeHtml(name)}`;
  }

  function workDashboardIcon(name) {
    return `${WORK_DASHBOARD_ICON_PATH}${escapeHtml(name)}`;
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

  function normalizeDashboardRole(role) {
    const normalized = String(role || "").trim().toLowerCase();
    if (normalized === "staff") return "manager";
    return DASHBOARD_ROLES.includes(normalized) ? normalized : "viewer";
  }

  function roleLabel(role) {
    return DASHBOARD_ROLE_LABELS[normalizeDashboardRole(role)] || "Viewer";
  }

  function currentSessionRole() {
    const session = getSession() || {};
    return normalizeDashboardRole(session.role || session.profile?.role);
  }

  function hasDashboardPermission(permission, role = currentSessionRole()) {
    const permissions = DASHBOARD_ROLE_PERMISSIONS[normalizeDashboardRole(role)] || [];
    return permissions.includes("*") || permissions.includes(permission);
  }

  function canManageUsers() {
    return ["owner", "admin"].includes(currentSessionRole());
  }

  function dashboardEnvironment() {
    return String(config.appEnv || "production").trim().toLowerCase();
  }

  function renderEnvironmentIndicator() {
    if (!els.environmentIndicator) return;
    const env = dashboardEnvironment();
    const shouldShow = env && !["production", "prod", "main"].includes(env);
    els.environmentIndicator.hidden = !shouldShow;
    els.environmentIndicator.textContent = shouldShow ? env : "";
  }

  function profileText(value) {
    return String(value || "").trim();
  }

  function firstProfileText(...values) {
    for (const value of values) {
      const cleaned = profileText(value);
      if (cleaned) return cleaned;
    }
    return "";
  }

  function profileFullName(record = {}) {
    return firstProfileText(
      record.full_name,
      record.fullName,
      record.display_name,
      record.displayName,
      record.name,
      record.preferred_name,
      record.preferredName,
      [record.first_name, record.last_name].map(profileText).filter(Boolean).join(" "),
      [record.firstName, record.lastName].map(profileText).filter(Boolean).join(" ")
    );
  }

  function profileRole(record = {}) {
    const role = firstProfileText(
      record.title,
      record.job_title,
      record.jobTitle,
      record.position,
      record.role_title,
      record.roleTitle,
      record.role_name,
      record.roleName,
      record.role
    );
    return role.toLowerCase() === "authenticated" ? "" : role;
  }

  function profileAvatarUrl(record = {}) {
    return firstProfileText(record.avatar_url, record.avatarUrl, record.photo_url, record.photoUrl, record.picture);
  }

  function profileId(record = {}) {
    return firstProfileText(record.id, record.user_id, record.userId);
  }

  function profileEmail(record = {}) {
    return firstProfileText(record.email, record.user_email, record.userEmail);
  }

  function initialsForName(name, email) {
    const source = firstProfileText(name, email, "UY");
    const words = source
      .replace(/@.*/, "")
      .replace(/[^a-zA-Z0-9\s-]/g, " ")
      .split(/[\s-]+/)
      .map((word) => word.trim())
      .filter(Boolean);
    if (!words.length) return "UY";
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
  }

  function avatarMarkup(record = {}, sizeClass = "") {
    const name = firstProfileText(profileFullName(record), profileEmail(record));
    const avatarUrl = profileAvatarUrl(record);
    const initials = initialsForName(name, profileEmail(record));
    return `
      <span class="user-avatar ${escapeHtml(sizeClass)}">
        ${avatarUrl ? `<img data-avatar-img src="${escapeHtml(avatarUrl)}" alt="" loading="lazy">` : ""}
        <span${avatarUrl ? " hidden" : ""}>${escapeHtml(initials)}</span>
      </span>
    `;
  }

  function bindAvatarFallbacks(scope = document) {
    qsa("[data-avatar-img]", scope).forEach((img) => {
      img.onerror = () => {
        img.hidden = true;
        const fallback = img.nextElementSibling;
        if (fallback) fallback.hidden = false;
      };
    });
  }

  function setAvatarElement(img, initialsNode, record = {}, fallbackName = "") {
    const avatarUrl = profileAvatarUrl(record);
    const initials = initialsForName(firstProfileText(profileFullName(record), fallbackName), profileEmail(record));
    if (initialsNode) {
      initialsNode.textContent = initials;
      initialsNode.hidden = Boolean(avatarUrl);
    }
    if (!img) return;
    img.hidden = !avatarUrl;
    img.removeAttribute("src");
    if (avatarUrl) {
      img.src = avatarUrl;
      img.onerror = () => {
        img.hidden = true;
        if (initialsNode) initialsNode.hidden = false;
      };
    }
  }

  function authProfileFromUser(user = {}, email = "") {
    const userMetadata = user.user_metadata || {};
    const appMetadata = user.app_metadata || {};
    const name = firstProfileText(
      profileFullName(userMetadata),
      profileFullName(appMetadata),
      profileFullName(user),
      email
    );
    const role = normalizeDashboardRole(firstProfileText(profileRole(userMetadata), profileRole(user), appMetadata.role));
    return { name, role };
  }

  function displayProfileFromSession(session, profileRecord = null) {
    const email = profileText(session && session.email);
    const sessionProfile = session && session.profile ? session.profile : {};
    const profile = profileRecord || {};
    return {
      name: firstProfileText(profileFullName(profile), sessionProfile.name, email, getOwnerEmail()),
      role: firstProfileText(profileRole(profile), roleLabel(session.role || sessionProfile.role)),
      avatar_url: firstProfileText(profileAvatarUrl(profile), sessionProfile.avatar_url, sessionProfile.avatarUrl),
      email
    };
  }

  function syncSessionRoleFromProfile(profileRecord = {}) {
    const session = getSession();
    if (!session) return;
    const role = normalizeDashboardRole(firstProfileText(profileRecord.role, profileRecord.dashboard_role, profileRecord.app_role, session.role, session.profile?.role));
    const nextSession = {
      ...session,
      role,
      profile: {
        ...(session.profile || {}),
        role,
        name: firstProfileText(profileFullName(profileRecord), session.profile?.name, session.email),
        avatar_url: firstProfileText(profileAvatarUrl(profileRecord), session.profile?.avatar_url, session.profile?.avatarUrl)
      }
    };
    setSession(nextSession);
  }

  function renderSidebarUserProfile(profileRecord = null) {
    const session = getSession();
    const display = isDemoMode()
      ? { name: "Demo mode", role: "" }
      : displayProfileFromSession(session, profileRecord);

    if (els.sidebarUserName) {
      els.sidebarUserName.textContent = display.name;
    }
    if (els.sidebarUserRole) {
      els.sidebarUserRole.textContent = display.role || "";
      els.sidebarUserRole.hidden = !display.role;
    }
    setAvatarElement(els.sidebarUserAvatar, els.sidebarUserInitials, display, display.name);
    setAvatarElement(els.headerUserAvatar, els.headerUserInitials, display, display.name);
    if (els.ownerEmail) {
      els.ownerEmail.textContent = isDemoMode() ? "Demo mode" : firstProfileText(session && session.email, getOwnerEmail());
    }
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

    const method = String(options?.method || "GET").toUpperCase();
    if (method !== "GET") {
      const response = await fetch("/.netlify/functions/dashboard-records", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`
        },
        body: JSON.stringify({
          path,
          method,
          prefer: options?.headers?.Prefer || options?.headers?.prefer || "",
          body: options?.body ? JSON.parse(options.body) : null
        })
      });
      const text = await response.text();
      const payload = text ? JSON.parse(text) : {};
      if (!response.ok) {
        throw new Error(payload?.error || "Dashboard database request failed.");
      }
      return payload.data;
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

  async function loadCurrentUserProfile(session) {
    if (isDemoMode() || !session || !session.accessToken) return null;

    const queries = [];
    if (session.userId) {
      const userId = encodeURIComponent(session.userId);
      queries.push(`profiles?select=*&user_id=eq.${userId}&limit=1`);
      queries.push(`profiles?select=*&id=eq.${userId}&limit=1`);
    }
    if (session.email) {
      queries.push(`profiles?select=*&email=eq.${encodeURIComponent(session.email)}&limit=1`);
    }

    const seen = new Set();
    for (const query of queries) {
      if (seen.has(query)) continue;
      seen.add(query);

      try {
        const rows = await supabaseRestRequest(query, { method: "GET" });
        if (Array.isArray(rows) && rows.length) {
          syncSessionRoleFromProfile(rows[0]);
          return rows[0];
        }
      } catch (error) {
        const message = String(error && error.message ? error.message : "");
        if (/relation .*profiles|profiles.*does not exist|could not find the table/i.test(message)) {
          return null;
        }
      }
    }

    try {
      const result = await dashboardUsersRequest("me");
      if (result.user) {
        syncSessionRoleFromProfile(result.user);
        return result.user;
      }
    } catch (error) {
      // Keep the dashboard usable while the admin function or SQL is being installed.
    }

    return null;
  }

  function normalizeUserProfile(row = {}) {
    const id = profileId(row);
    const email = profileEmail(row);
    const name = firstProfileText(profileFullName(row), email, "Dashboard User");
    return {
      ...row,
      id,
      userId: id,
      email,
      name,
      role: normalizeDashboardRole(firstProfileText(row.role, row.dashboard_role, row.app_role, "viewer")),
      title: firstProfileText(row.title, row.job_title, row.role_title, row.role_name),
      avatarUrl: profileAvatarUrl(row),
      avatarPath: firstProfileText(row.avatar_path, row.avatarPath),
      avatarUpdatedAt: firstProfileText(row.avatar_updated_at, row.avatarUpdatedAt, row.updated_at),
      disabledAt: firstProfileText(row.disabled_at, row.disabledAt),
      lastLoginAt: firstProfileText(row.last_login_at, row.lastLoginAt, row.last_sign_in_at, row.lastSignInAt),
      invitedAt: firstProfileText(row.invited_at, row.invitedAt),
      lastSeenAt: firstProfileText(row.last_seen_at, row.lastSeenAt)
    };
  }

  async function loadUserProfiles() {
    if (isDemoMode()) {
      state.userProfilesReady = true;
      const session = getSession();
      return [normalizeUserProfile({
        id: session?.userId || "demo-user",
        email: session?.email || "demo@urbanyards.us",
        full_name: "Demo User",
        role: "owner",
        title: "Dashboard user"
      })];
    }

    try {
      const result = await dashboardUsersRequest("list");
      state.userProfilesReady = true;
      const profiles = Array.isArray(result.users) ? result.users.map(normalizeUserProfile) : [];
      const session = getSession();
      const current = profiles.find((profile) => profile.userId && profile.userId === session?.userId)
        || profiles.find((profile) => profile.email && profile.email.toLowerCase() === String(session?.email || "").toLowerCase());
      if (current) syncSessionRoleFromProfile(current);
      return profiles;
    } catch (error) {
      state.userProfilesReady = false;
      const session = getSession();
      const ownProfile = await loadCurrentUserProfile(session).catch(() => null);
      if (ownProfile) return [normalizeUserProfile(ownProfile)];
      if (session) {
        return [normalizeUserProfile({ id: session.userId, email: session.email, role: "viewer", title: "Dashboard user" })];
      }
      return [];
    }
  }

  async function loadAuditLogs() {
    if (isDemoMode()) {
      state.auditLogsReady = true;
      return [
        {
          id: "demo-audit-1",
          created_at: new Date().toISOString(),
          actor_email: "demo@urbanyards.us",
          actor_role: "owner",
          action: "demo_activity",
          entity_type: "dashboard",
          metadata: { note: "Demo activity log entry" }
        }
      ];
    }

    try {
      const result = await dashboardActivityRequest({ limit: "150" });
      state.auditLogsReady = true;
      return Array.isArray(result.logs) ? result.logs : [];
    } catch (error) {
      state.auditLogsReady = false;
      return [];
    }
  }

  function avatarFileExtension(file) {
    const match = String(file?.name || "").toLowerCase().match(/\.([a-z0-9]+)$/);
    return match ? match[1] : "";
  }

  function validateAvatarFile(file) {
    if (!file) throw new Error("Choose an avatar image first.");
    if (file.size > USER_AVATAR_MAX_BYTES) throw new Error("Avatar file must be 2 MB or smaller.");
    if (!USER_AVATAR_ALLOWED_TYPES.has(String(file.type || "").toLowerCase())) {
      throw new Error("Avatar must be a JPG, PNG, or WebP image.");
    }
    if (!USER_AVATAR_ALLOWED_EXTENSIONS.has(avatarFileExtension(file))) {
      throw new Error("Avatar file extension must be .jpg, .jpeg, .png, or .webp.");
    }
  }

  function fileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Unable to read avatar file."));
      reader.readAsDataURL(file);
    });
  }

  async function avatarRequest(path, payload = {}) {
    const session = getSession();
    if (!session || !session.accessToken) throw new Error("Please sign in again.");
    const response = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`
      },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Avatar request failed.");
    return result;
  }

  async function uploadUserAvatar(targetUserId, file) {
    validateAvatarFile(file);
    const session = getSession();
    const data = await fileAsDataUrl(file);
    const isSelf = !targetUserId || targetUserId === session?.userId;
    return avatarRequest(isSelf ? "/.netlify/functions/user-upload-avatar" : "/.netlify/functions/admin-upload-user-avatar", {
      targetUserId: targetUserId || session?.userId,
      fileName: file.name,
      mimeType: file.type,
      data
    });
  }

  async function removeUserAvatar(targetUserId) {
    const session = getSession();
    return avatarRequest("/.netlify/functions/user-delete-avatar", {
      targetUserId: targetUserId || session?.userId
    });
  }

  async function dashboardUsersRequest(action, payload = {}) {
    const session = getSession();
    if (!session || !session.accessToken) throw new Error("Please sign in again.");
    const response = await fetch("/.netlify/functions/dashboard-users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`
      },
      body: JSON.stringify({ action, ...payload })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "User admin request failed.");
    return result;
  }

  async function dashboardActivityRequest(params = {}) {
    const session = getSession();
    if (!session || !session.accessToken) throw new Error("Please sign in again.");
    const query = new URLSearchParams(params);
    const response = await fetch(`/.netlify/functions/dashboard-activity?${query.toString()}`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`
      }
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Activity log request failed.");
    return result;
  }

  async function groundskeeperRequest(action, payload = {}) {
    const session = getSession();
    if (!session || !session.accessToken) throw new Error("Please sign in again.");
    const response = await fetch("/.netlify/functions/groundskeeper-ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`
      },
      body: JSON.stringify({
        action,
        mode: "dashboard",
        payload
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Groundskeeper AI request failed.");
    return result;
  }

  async function groundskeeperChat(message) {
    const session = getSession();
    if (!session || !session.accessToken) throw new Error("Please sign in again.");
    const response = await fetch("/.netlify/functions/groundskeeper-ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`
      },
      body: JSON.stringify({
        mode: "dashboard",
        message,
        page: "Urban Yards Owner Dashboard",
        history: state.groundskeeperMessages.slice(-10),
        context: {
          activeSection: state.activeSection,
          openQuotes: state.data.submissions.filter((item) => item.status !== "Completed").length,
          dueFollowUps: state.data.reminders.filter((item) => item.dueRaw && item.dueRaw <= todayKey() && item.status !== "Done").length,
          activeOutreachProspects: state.data.outreachProspects.filter((item) => OUTREACH_ACTIVE_STATUSES.includes(item.status)).length
        }
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "The Groundskeeper is unavailable.");
    return result.reply;
  }

  async function groundskeeperTrainingChat(message) {
    const history = state.trainingMessages
      .filter((entry) => ["user", "assistant"].includes(entry.role))
      .slice(-8)
      .filter((entry, index, items) => !(index === items.length - 1 && entry.role === "user" && entry.content === message))
      .map((entry) => ({ role: entry.role, content: entry.content }));
    return groundskeeperRequest("training-chat", { message, history });
  }

  async function previewWebsiteHelper(message) {
    const history = state.trainingPreviewMessages
      .filter((entry) => ["user", "assistant"].includes(entry.role))
      .slice(-8)
      .filter((entry, index, items) => !(index === items.length - 1 && entry.role === "user" && entry.content === message))
      .map((entry) => ({ role: entry.role, content: entry.content }));
    return groundskeeperRequest("preview-helper", {
      message,
      history,
      version: state.trainingPreviewMode,
      page: "Dashboard AI Helper Training preview"
    });
  }

  async function saveTrainingRule(record) {
    return groundskeeperRequest("upsert-training-rule", { record });
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

  function addMonthsKey(value, count) {
    const source = new Date(`${value}T12:00:00`);
    const day = source.getDate();
    const target = new Date(source.getFullYear(), source.getMonth() + count, 1, 12);
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0, 12).getDate();
    target.setDate(Math.min(day, lastDay));
    return target.toISOString().slice(0, 10);
  }

  function nextRecurringDate(value, interval, unit) {
    if (unit === "months") return addMonthsKey(value, interval);
    return addDaysKey(value, interval * (unit === "weeks" ? 7 : 1));
  }

  function scheduledJobPayloads(formData, basePayload) {
    if (String(formData.get("is_recurring") || "") !== "on") return [basePayload];

    const interval = Number(formData.get("recurrence_interval") || 1);
    const unit = String(formData.get("recurrence_unit") || "weeks");
    const endDate = String(formData.get("recurrence_end_date") || "");
    if (!Number.isInteger(interval) || interval < 1 || interval > 365) {
      throw new Error("Choose a repeat interval between 1 and 365.");
    }
    if (!["days", "weeks", "months"].includes(unit)) {
      throw new Error("Choose days, weeks, or months for the recurring visit.");
    }
    if (!endDate || endDate < basePayload.visit_date) {
      throw new Error("Choose a repeat-until date on or after the first visit.");
    }

    const jobs = [];
    let visitDate = basePayload.visit_date;
    let occurrence = 0;
    while (visitDate <= endDate && jobs.length < 120) {
      jobs.push({ ...basePayload, visit_date: visitDate });
      occurrence += 1;
      const nextDate = unit === "months"
        ? addMonthsKey(basePayload.visit_date, interval * occurrence)
        : nextRecurringDate(basePayload.visit_date, interval * occurrence, unit);
      if (!nextDate || nextDate <= visitDate) break;
      visitDate = nextDate;
    }
    if (visitDate <= endDate) {
      throw new Error("This series creates more than 120 visits. Use a shorter date range or a larger interval.");
    }
    return jobs;
  }

  function recurringFieldsMarkup() {
    return `
      <label class="recurring-toggle">
        <input name="is_recurring" type="checkbox" data-recurring-toggle>
        <span>Recurring visit</span>
      </label>
      <div class="recurring-controls" data-recurring-controls hidden>
        <label>Repeat every
          <input name="recurrence_interval" type="number" min="1" max="365" value="1" inputmode="numeric">
        </label>
        <label>Frequency
          <select name="recurrence_unit">
            <option value="days">Days</option>
            <option value="weeks" selected>Weeks</option>
            <option value="months">Months</option>
          </select>
        </label>
        <label>Repeat until
          <input name="recurrence_end_date" type="date">
        </label>
        <p>Each occurrence is saved as its own visit.</p>
      </div>
    `;
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

  function normalizeLookup(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9@.]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function hasLookupMatch(needles, haystacks) {
    const normalizedNeedles = needles
      .map(normalizeLookup)
      .filter((value) => value && !["no email", "no phone", "not provided", "contact"].includes(value));
    if (!normalizedNeedles.length) return false;
    const normalizedHaystacks = haystacks.map(normalizeLookup).filter(Boolean);
    return normalizedNeedles.some((needle) => normalizedHaystacks.some((haystack) => haystack === needle || haystack.includes(needle) || needle.includes(haystack)));
  }

  function phoneInfo(value) {
    const raw = String(value || "").trim();
    const digits = raw.replace(/[^\d]/g, "");
    const usDigits = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
    if (usDigits.length !== 10) {
      return { valid: false, display: raw && !/no phone/i.test(raw) ? raw : "No valid phone number.", href: "", e164: "" };
    }
    return {
      valid: true,
      e164: `+1${usDigits}`,
      href: `tel:+1${usDigits}`,
      display: `(${usDigits.slice(0, 3)}) ${usDigits.slice(3, 6)}-${usDigits.slice(6)}`
    };
  }

  function googleVoiceCallUrl(phone) {
    const digits = String(phone || "").replace(/\D/g, "");
    const normalizedDigits = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
    if (normalizedDigits.length !== 10) return GOOGLE_VOICE_HOME_URL;
    const normalized = `+1${normalizedDigits}`;
    return `${GOOGLE_VOICE_CALLS_URL}?a=nc,${encodeURIComponent(normalized)}`;
  }

  async function copyPhoneSilently(phone) {
    const info = phoneInfo(phone);
    if (!info.valid || !navigator.clipboard?.writeText) return false;
    try {
      await navigator.clipboard.writeText(info.e164);
      return true;
    } catch (error) {
      return false;
    }
  }

  function openGoogleVoiceWindow(phoneNumber) {
    const voiceUrl = googleVoiceCallUrl(phoneNumber);
    const features = [
      "width=1030",
      "height=810",
      "left=0",
      "top=90",
      "resizable=yes",
      "scrollbars=yes",
      "status=no",
      "toolbar=no",
      "menubar=no",
      "location=yes"
    ].join(",");

    // Browsers and operating systems can adjust exact popup bounds, but these
    // features give Google Voice a consistent preferred call-window size.
    const popup = window.open(voiceUrl, "UrbanYardsGoogleVoice", features);
    if (popup) {
      popup.focus();
      return true;
    }

    window.open(voiceUrl, "_blank");
    return false;
  }

  function renderPhoneActions(phone, options = {}) {
    const info = phoneInfo(phone);
    const leadId = options.leadId || "";
    const leadType = options.leadType || "lead";
    const compactClass = options.compact ? " phone-call-control-compact" : "";
    if (!info.valid) {
      return `<div class="phone-call-control phone-call-control-invalid${compactClass}"><span>No valid phone number.</span><button class="inline-action" type="button" disabled>${buttonContent("Call", "call-lead")}</button></div>`;
    }
    return `
      <div class="phone-call-control${compactClass}">
        <a class="phone-call-link" href="${escapeHtml(info.href)}">${escapeHtml(info.display)}</a>
        <button class="inline-action phone-call-button" type="button" data-action="call-lead" data-id="${escapeHtml(leadId)}" data-lead-type="${escapeHtml(leadType)}" data-phone="${escapeHtml(info.e164)}">${buttonContent("Call", "call-lead")}</button>
        <button class="inline-action" type="button" data-action="copy-phone" data-phone="${escapeHtml(info.e164)}">${buttonContent("Copy number", "copy-phone")}</button>
        ${options.helper === false ? "" : `<small>Google Voice opens in a separate call window. Calls are handled by Google Voice. <a href="${escapeHtml(GOOGLE_VOICE_HOME_URL)}" target="_blank" rel="noopener noreferrer">Open Google Voice</a></small>`}
      </div>
    `;
  }

  function normalizeLeadActivity(row) {
    const rawOutcome = CALL_OUTCOMES.includes(row.outcome) ? row.outcome : "not_set";
    const outcome = rawOutcome === "bad_number" ? "wrong_number" : rawOutcome === "follow_up_later" ? "follow_up_needed" : rawOutcome;
    return {
      id: row.id,
      leadId: row.lead_id || "",
      leadType: row.lead_type || "lead",
      phoneNumber: row.phone_number || "",
      phoneDisplay: phoneInfo(row.phone_number).display,
      type: row.type || "call_attempt",
      outcome,
      outcomeLabel: CALL_OUTCOME_LABELS[outcome] || outcome,
      notes: row.notes || "",
      followUpDateRaw: dateKey(row.follow_up_date),
      followUpDate: formatDate(row.follow_up_date),
      createdAtRaw: row.created_at || "",
      createdAt: row.created_at ? new Date(row.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : ""
    };
  }

  function callHistoryFor(leadId) {
    return state.data.leadActivity
      .filter((activity) => activity.leadId === leadId)
      .sort((a, b) => String(b.createdAtRaw).localeCompare(String(a.createdAtRaw)));
  }

  function renderCallHistory(leadId) {
    const history = callHistoryFor(leadId);
    if (!history.length) {
      return `<section class="call-history"><h4>Call History</h4>${emptyState(state.leadActivityReady ? "No call attempts logged yet." : "Run DASHBOARD_CALL_ACTIVITY_SQL.md to enable call history.")}</section>`;
    }
    return `
      <section class="call-history">
        <h4>Call History</h4>
        <div class="call-history-list">
          ${history.map((activity) => `
            <article class="call-history-item">
              <strong>${escapeHtml(activity.createdAt || formatDate(activity.createdAtRaw))}</strong>
              <span>${escapeHtml(activity.phoneDisplay)} / ${escapeHtml(activity.outcomeLabel)}</span>
              ${activity.notes ? `<p>${escapeHtml(activity.notes)}</p>` : ""}
              ${activity.followUpDateRaw ? `<small>Follow-up: ${escapeHtml(activity.followUpDate)}</small>` : ""}
            </article>
          `).join("")}
        </div>
      </section>
    `;
  }

  function callPanelContext(leadType, leadId) {
    if (leadType === "quote_submission") {
      const item = findSubmission(leadId);
      if (!item) return null;
      return {
        leadId: item.id,
        leadType,
        leadName: item.name,
        companyProperty: [item.propertyType, item.city, item.service].filter(Boolean).join(" / "),
        phone: item.phone
      };
    }
    if (leadType === "contact") {
      const item = state.data.contacts.find((contact) => contact.id === leadId);
      if (!item) return null;
      return {
        leadId: item.id,
        leadType,
        leadName: item.name,
        companyProperty: [item.type, item.city].filter(Boolean).join(" / "),
        phone: item.phone
      };
    }
    if (leadType === "outreach_prospect") {
      const item = findOutreachProspect(leadId);
      if (!item) return null;
      return {
        leadId: item.id,
        leadType,
        leadName: item.contactName || item.propertyName || "Outreach prospect",
        companyProperty: [item.managementCompany, item.propertyName, item.city].filter(Boolean).join(" / "),
        phone: item.phone
      };
    }
    if (leadType === "outreach_company") {
      const item = state.data.outreachCompanies.find((company) => company.id === leadId);
      if (!item) return null;
      return {
        leadId: item.id,
        leadType,
        leadName: item.contact || item.company || "Outreach company",
        companyProperty: [item.company, item.serviceArea || item.city].filter(Boolean).join(" / "),
        phone: item.phone
      };
    }
    return null;
  }

  function renderCallPanel(context, activity = null) {
    const info = phoneInfo(context?.phone || "");
    const recent = activity || callHistoryFor(context?.leadId || "")[0] || null;
    const selectedOutcome = CALL_PANEL_OUTCOMES.includes(recent?.outcome) ? recent.outcome : "";
    return `
      <section class="call-helper-panel" data-call-panel-slot data-lead-id="${escapeHtml(context?.leadId || "")}" data-lead-type="${escapeHtml(context?.leadType || "lead")}" data-lead-name="${escapeHtml(context?.leadName || "Lead")}" data-company-property="${escapeHtml(context?.companyProperty || "No company or property set")}" data-phone="${escapeHtml(info.e164 || context?.phone || "")}">
        <div class="call-helper-head">
          <div>
            <p class="eyebrow">Google Voice Call Panel</p>
            <h4>${escapeHtml(context?.leadName || "Lead")}</h4>
            <span>${escapeHtml(context?.companyProperty || "No company or property set")}</span>
          </div>
          <div class="call-helper-number">
            <small>Urban Yards Google Voice</small>
            <strong>${escapeHtml(URBAN_YARDS_GOOGLE_VOICE_NUMBER)}</strong>
          </div>
        </div>
        <div class="call-helper-phone-row">
          <div>
            <small>Selected phone</small>
            ${info.valid ? `<a class="phone-call-link" href="${escapeHtml(info.href)}">${escapeHtml(info.display)}</a>` : `<span class="phone-call-invalid">No valid phone number.</span>`}
          </div>
          <div class="call-helper-actions">
            <button type="button" data-action="call-lead" data-id="${escapeHtml(context?.leadId || "")}" data-lead-type="${escapeHtml(context?.leadType || "lead")}" data-phone="${escapeHtml(info.e164 || "")}"${info.valid ? "" : " disabled"}>${buttonContent("Call", "call-lead")}</button>
            <button class="inline-action" type="button" data-action="copy-phone" data-phone="${escapeHtml(info.e164 || "")}"${info.valid ? "" : " disabled"}>${buttonContent("Copy number", "copy-phone")}</button>
            <button class="inline-action" type="button" data-action="open-google-voice-call" data-phone="${escapeHtml(info.e164 || "")}">${buttonContent("Open Google Voice", "call-lead")}</button>
          </div>
        </div>
        <p class="call-helper-note">Google Voice opens in a separate call window. Calls are handled by Google Voice. The number is copied as a backup when your browser allows it.</p>
        <form class="call-panel-form" data-call-panel-form data-id="${escapeHtml(recent?.id || "")}" data-lead-id="${escapeHtml(context?.leadId || "")}" data-lead-type="${escapeHtml(context?.leadType || "lead")}" data-phone="${escapeHtml(info.e164 || "")}">
          <label>Outcome
            <select name="outcome">
              <option value="not_set"${selectedOutcome ? "" : " selected"}>Choose outcome</option>
              ${CALL_PANEL_OUTCOMES.map((outcome) => `<option value="${escapeHtml(outcome)}"${selectedOutcome === outcome ? " selected" : ""}>${escapeHtml(CALL_OUTCOME_LABELS[outcome])}</option>`).join("")}
            </select>
          </label>
          <label>Follow-up date
            <input name="follow_up_date" type="date" value="${escapeHtml(recent?.followUpDateRaw || "")}">
          </label>
          <label class="span-full">Call notes
            <textarea name="notes" rows="3" placeholder="Notes from the call, voicemail, or next step...">${escapeHtml(recent?.notes || "")}</textarea>
          </label>
          <div class="drawer-actions span-full">
            <button type="submit">${buttonContent("Save call note", "complete-reminder")}</button>
          </div>
        </form>
      </section>
    `;
  }

  function renderCallOutcomePanel(activity) {
    const context = callPanelContext(activity.leadType, activity.leadId);
    if (context) return renderCallPanel(context, activity);
    return `
      <section class="call-outcome-panel" data-call-outcome-panel>
        <div class="panel-heading">
          <div>
            <h4>Log call outcome</h4>
            <p>${escapeHtml(activity.phoneDisplay || phoneInfo(activity.phoneNumber).display)}</p>
          </div>
        </div>
        <form class="call-outcome-form" data-call-outcome-form data-id="${escapeHtml(activity.id)}" data-lead-id="${escapeHtml(activity.leadId)}" data-lead-type="${escapeHtml(activity.leadType)}">
          <div class="call-outcome-options">
            ${CALL_PANEL_OUTCOMES.map((outcome) => `
              <label><input type="radio" name="outcome" value="${escapeHtml(outcome)}"${outcome === activity.outcome ? " checked" : ""}> ${escapeHtml(CALL_OUTCOME_LABELS[outcome])}</label>
            `).join("")}
          </div>
          <label>Notes<textarea name="notes" rows="3" placeholder="Quick notes from the call">${escapeHtml(activity.notes || "")}</textarea></label>
          <label>Follow-up date<input name="follow_up_date" type="date" value="${escapeHtml(activity.followUpDateRaw || "")}"></label>
          <button type="submit">${buttonContent("Save Call Outcome", "complete-reminder")}</button>
        </form>
      </section>
    `;
  }

  function openLeadDrawerByType(leadType, leadId) {
    if (leadType === "quote_submission") openSubmissionDrawer(leadId);
    else if (leadType === "contact") openContactDrawer(leadId);
    else if (leadType === "outreach_prospect") openOutreachDrawer(leadId);
    else if (leadType === "outreach_company") openOutreachCompanyDrawer(leadId);
  }

  function openDetailDrawer() {
    if (!els.detailDrawer) return;
    els.detailDrawer.hidden = false;
    document.body.classList.add("is-detail-drawer-open");
    requestAnimationFrame(() => {
      const panel = els.detailDrawer ? els.detailDrawer.querySelector(".drawer-panel") : null;
      if (panel) panel.scrollTop = 0;
      if (els.detailContent) els.detailContent.scrollTop = 0;
      if (els.closeDetail) els.closeDetail.focus({ preventScroll: true });
    });
  }

  function isDocumentUnpaid(doc) {
    const squareStatus = String(doc.squareStatus || "").toUpperCase();
    const dashboardStatus = String(doc.status || "").toLowerCase();
    const hasSquareLink = Boolean(doc.squareInvoiceId || doc.squareInvoiceNumber || doc.squarePaymentUrl || doc.squareStatus);
    return hasSquareLink && squareStatus !== "PAID" && dashboardStatus !== "paid" && dashboardStatus !== "void";
  }

  function documentAmountOwedCents(doc) {
    if (typeof doc.squareAmountDueCents === "number") return doc.squareAmountDueCents;
    const total = Number(doc.total || 0);
    return Number.isFinite(total) ? Math.round(total * 100) : 0;
  }

  function isOverdueInvoice(doc) {
    const dashboardStatus = String(doc.status || "").toLowerCase();
    const squareStatus = String(doc.squareStatus || "").toUpperCase();
    return doc.type === "invoice"
      && doc.dueDateRaw
      && doc.dueDateRaw < todayKey()
      && dashboardStatus !== "paid"
      && dashboardStatus !== "void"
      && squareStatus !== "PAID";
  }

  function notificationActionAttributes(item) {
    const attrs = [`data-action="${escapeHtml(item.action)}"`];
    if (item.id) attrs.push(`data-id="${escapeHtml(item.id)}"`);
    if (item.leadId) attrs.push(`data-lead-id="${escapeHtml(item.leadId)}"`);
    if (item.leadType) attrs.push(`data-lead-type="${escapeHtml(item.leadType)}"`);
    return attrs.join(" ");
  }

  function buildNotifications(data = state.data) {
    const websiteRequests = data.submissions
      .filter((item) => item.status === "New")
      .map((item) => ({
        id: item.id,
        type: "request",
        label: "Website request",
        title: `${item.name} requested ${item.service || "service"}`,
        detail: [item.city, item.source || "Quote form"].filter(Boolean).join(" / "),
        action: "open-submission",
        sort: item.receivedAtRaw || item.createdAtRaw || ""
      }));

    const overduePayments = data.documents
      .filter(isOverdueInvoice)
      .map((doc) => ({
        id: doc.id,
        type: "payment",
        label: "Payment overdue",
        title: `${doc.clientName || "Client"} payment is overdue`,
        detail: `Due ${doc.dueDate || doc.dueDateRaw}${documentAmountOwedCents(doc) ? ` / ${formatCurrency(documentAmountOwedCents(doc), doc.squareCurrency)}` : ""}`,
        action: "open-document",
        sort: doc.dueDateRaw || ""
      }));

    const rescheduleNeeded = data.jobs
      .filter(isOverdueJob)
      .map((job) => ({
        id: job.id,
        type: "schedule",
        label: "Needs reschedule",
        title: `${job.site} was not completed as scheduled`,
        detail: [job.date, job.service].filter(Boolean).join(" / "),
        action: "reschedule-job",
        sort: job.dateRaw || ""
      }));

    const voicemails = data.leadActivity
      .filter((activity) => activity.outcome === "left_voicemail")
      .map((activity) => ({
        id: activity.id,
        leadId: activity.leadId,
        leadType: activity.leadType,
        type: "voicemail",
        label: "Voicemail",
        title: `Voicemail left for ${activity.phoneDisplay || activity.phoneNumber || "lead"}`,
        detail: [activity.createdAt, activity.followUpDateRaw ? `Follow up ${activity.followUpDate}` : ""].filter(Boolean).join(" / "),
        action: "open-call-activity",
        sort: activity.createdAtRaw || ""
      }));

    return [...websiteRequests, ...overduePayments, ...rescheduleNeeded, ...voicemails]
      .sort((a, b) => String(b.sort || "").localeCompare(String(a.sort || "")));
  }

  function renderNotifications(data = state.data) {
    const notifications = buildNotifications(data);
    const count = notifications.length;
    if (els.notificationCount) {
      els.notificationCount.hidden = count === 0;
      els.notificationCount.textContent = count > 99 ? "99+" : String(count);
    }
    if (els.notificationButton) {
      els.notificationButton.classList.toggle("has-notifications", count > 0);
      els.notificationButton.setAttribute("aria-label", count ? `${count} dashboard notification${count === 1 ? "" : "s"}` : "No dashboard notifications");
    }
    if (els.notificationSummary) {
      els.notificationSummary.textContent = count ? `${count} item${count === 1 ? "" : "s"} need attention` : "No urgent items";
    }
    if (!els.notificationList) return;
    if (!count) {
      els.notificationList.innerHTML = `<p class="sidebar-notification-empty">No website requests, overdue payments, missed visits, or voicemails right now.</p>`;
      return;
    }
    els.notificationList.innerHTML = notifications.slice(0, 8).map((item) => `
      <button class="sidebar-notification-item notification-${escapeHtml(item.type)}" type="button" ${notificationActionAttributes(item)}>
        <span class="notification-dot" aria-hidden="true"></span>
        <span>
          <small>${escapeHtml(item.label)}</small>
          <strong>${escapeHtml(item.title)}</strong>
          <em>${escapeHtml(item.detail || "Review this item.")}</em>
        </span>
      </button>
    `).join("") + (count > 8 ? `<p class="sidebar-notification-more">${escapeHtml(count - 8)} more notifications in dashboard records.</p>` : "");
  }

  function setNotificationsOpen(isOpen) {
    if (notificationCloseTimer) {
      clearTimeout(notificationCloseTimer);
      notificationCloseTimer = null;
    }
    if (els.notificationPanel) els.notificationPanel.hidden = !isOpen;
    if (els.notificationButton) els.notificationButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }

  function isNotificationsOpen() {
    return Boolean(els.notificationPanel && !els.notificationPanel.hidden);
  }

  function pointerIsOverNotifications() {
    return Boolean(
      els.notificationButton?.matches(":hover")
      || els.notificationPanel?.matches(":hover")
      || els.notificationButton?.contains(document.activeElement)
      || els.notificationPanel?.contains(document.activeElement)
    );
  }

  function scheduleNotificationsClose() {
    if (!isNotificationsOpen()) return;
    if (notificationCloseTimer) clearTimeout(notificationCloseTimer);
    notificationCloseTimer = setTimeout(() => {
      if (!pointerIsOverNotifications()) setNotificationsOpen(false);
    }, 260);
  }

  function cancelNotificationsClose() {
    if (!notificationCloseTimer) return;
    clearTimeout(notificationCloseTimer);
    notificationCloseTimer = null;
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

  function normalizeEquipmentItem(row) {
    const condition = EQUIPMENT_CONDITIONS.includes(row.condition) ? row.condition : "Good";
    const status = EQUIPMENT_STATUSES.includes(row.status) ? row.status : "Ready";
    const priority = EQUIPMENT_PRIORITIES.includes(row.replacement_priority) ? row.replacement_priority : "Normal";
    return {
      id: row.id,
      name: row.name || "Unnamed item",
      category: row.category || "Miscellaneous",
      brand: row.brand || "",
      model: row.model || "",
      serialNumber: row.serial_number || "",
      quantity: Number(row.quantity || 1),
      condition,
      status,
      storageLocation: row.storage_location || "",
      purchaseDateRaw: dateKey(row.purchase_date),
      purchaseDate: formatDate(row.purchase_date),
      purchasePrice: Number(row.purchase_price || 0),
      supplier: row.supplier || "",
      productUrl: row.product_url || "",
      imageUrl: row.image_url || "",
      notes: row.notes || "",
      lastMaintenanceRaw: dateKey(row.last_maintenance_date),
      lastMaintenance: formatDate(row.last_maintenance_date),
      nextMaintenanceRaw: dateKey(row.next_maintenance_date),
      nextMaintenance: formatDate(row.next_maintenance_date),
      replacementPriority: priority,
      createdAt: formatDate(row.created_at),
      updatedAt: formatDate(row.updated_at)
    };
  }

  function normalizeEquipmentMaintenance(row) {
    const item = state.data.equipmentItems.find((equipment) => equipment.id === row.equipment_id);
    return {
      id: row.id,
      equipmentId: row.equipment_id || "",
      equipmentName: item?.name || row.equipment_name || "Equipment item",
      maintenanceDateRaw: dateKey(row.maintenance_date),
      maintenanceDate: formatDate(row.maintenance_date),
      maintenanceType: row.maintenance_type || "Maintenance",
      notes: row.notes || "",
      cost: Number(row.cost || 0),
      performedBy: row.performed_by || "",
      nextMaintenanceRaw: dateKey(row.next_maintenance_date),
      nextMaintenance: formatDate(row.next_maintenance_date),
      createdAt: formatDate(row.created_at)
    };
  }

  function normalizeHardwareGuideItem(row) {
    const priority = EQUIPMENT_PRIORITIES.includes(row.priority) ? row.priority : "Normal";
    const status = HARDWARE_STATUSES.includes(row.status) ? row.status : "Researching";
    return {
      id: row.id,
      name: row.name || "Unnamed guide item",
      category: row.category || "Miscellaneous",
      recommendedUse: row.recommended_use || "",
      brand: row.brand || "",
      model: row.model || "",
      estimatedPrice: Number(row.estimated_price || 0),
      priority,
      productUrl: row.product_url || "",
      supplier: row.supplier || "",
      notes: row.notes || "",
      status,
      goodFor: row.good_for || "",
      createdAt: formatDate(row.created_at),
      updatedAt: formatDate(row.updated_at)
    };
  }

  function normalizeOutreachProspect(row) {
    const status = OUTREACH_STATUSES.includes(row.status) ? row.status : "Prospect";
    const priority = OUTREACH_PRIORITIES.includes(row.priority) ? row.priority : "Normal";
    return {
      id: row.id,
      createdAtRaw: row.created_at || "",
      updatedAtRaw: row.updated_at || "",
      createdAt: formatDate(row.created_at),
      updatedAt: formatDate(row.updated_at),
      propertyName: row.property_name || "",
      managementCompany: row.management_company || "",
      contactName: row.contact_name || "",
      email: row.email || "",
      phone: row.phone || "",
      address: row.address || "",
      city: row.city || "",
      propertyType: row.property_type || "Other",
      serviceInterest: row.service_interest || "General Property Care",
      source: row.source || "",
      status,
      lastContactedAtRaw: dateKey(row.last_contacted_at),
      lastContactedAt: formatDate(row.last_contacted_at),
      nextFollowUpAtRaw: dateKey(row.next_follow_up_at),
      nextFollowUpAt: formatDate(row.next_follow_up_at),
      notes: row.notes || "",
      priority,
      routeAdded: Boolean(row.route_added),
      convertedToQuote: Boolean(row.converted_to_quote)
    };
  }

  function normalizeOutreachCompany(row) {
    const status = OUTREACH_STATUSES.includes(row.status) ? row.status : "Prospect";
    const priority = OUTREACH_PRIORITIES.includes(row.priority) ? row.priority : "Normal";
    return {
      id: row.id,
      company: row.company || "Unnamed company",
      contact: row.contact || "",
      email: row.email || "",
      phone: row.phone || "",
      website: row.website || "",
      city: row.city || "",
      serviceArea: row.service_area || "",
      type: row.type || "Property Management",
      service: row.service || "General Property Care",
      source: row.source || "",
      sourceUrl: row.source_url || "",
      status,
      followUpRaw: dateKey(row.follow_up),
      followUp: formatDate(row.follow_up),
      notes: row.notes || "",
      priority,
      createdAtRaw: row.created_at || "",
      updatedAtRaw: row.updated_at || "",
      createdAt: formatDate(row.created_at),
      updatedAt: formatDate(row.updated_at)
    };
  }

  function normalizeOutreachProperty(row) {
    const status = OUTREACH_STATUSES.includes(row.status) ? row.status : "Prospect";
    const priority = OUTREACH_PRIORITIES.includes(row.priority) ? row.priority : "Normal";
    const latitude = Number(row.lat);
    const longitude = Number(row.lng);
    return {
      id: row.id,
      companyId: row.company_id || "",
      company: row.company || "",
      propertyName: row.property_name || "Unnamed property",
      address: row.address || "",
      city: row.city || "",
      state: row.state || "",
      zip: row.zip || "",
      neighborhood: row.neighborhood || "",
      propertyType: row.property_type || "Other",
      estimatedUnits: row.estimated_units || "",
      serviceFit: row.service_fit || "",
      service: row.service || "General Property Care",
      visibleNeeds: row.visible_needs || "",
      notes: row.notes || "",
      source: row.source || "",
      sourceUrl: row.source_url || "",
      googleMapsUrl: row.google_maps_url || "",
      verifiedAtRaw: dateKey(row.verified_at),
      verifiedAt: formatDate(row.verified_at),
      status,
      followUpRaw: dateKey(row.follow_up),
      followUp: formatDate(row.follow_up),
      priority,
      lat: Number.isFinite(latitude) ? latitude : null,
      lng: Number.isFinite(longitude) ? longitude : null,
      createdAtRaw: row.created_at || "",
      updatedAtRaw: row.updated_at || "",
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
      outreachProspects: [
        normalizeOutreachProspect({
          id: "demo-outreach-1",
          created_at: daysFromToday(-12),
          updated_at: now,
          property_name: "Cedar Court Apartments",
          management_company: "Northbank Property Group",
          contact_name: "Erin Wallace",
          email: "erin@example.com",
          phone: "(503) 555-0134",
          address: "SE 52nd Ave, Portland, OR",
          city: "Portland",
          property_type: "Apartment",
          service_interest: "Day Porter / Groundskeeping",
          source: "Drive-by",
          status: "Follow-Up Needed",
          last_contacted_at: daysFromToday(-8),
          next_follow_up_at: today,
          priority: "High",
          notes: "Trash enclosure and entry beds look like a good fit for recurring care."
        }),
        normalizeOutreachProspect({
          id: "demo-outreach-2",
          created_at: daysFromToday(-6),
          updated_at: now,
          property_name: "Maple Grove HOA",
          management_company: "Board managed",
          contact_name: "",
          email: "",
          phone: "",
          address: "Vancouver, WA",
          city: "Vancouver",
          property_type: "HOA",
          service_interest: "Mulch / Bed Refresh",
          source: "Referral",
          status: "Interested",
          next_follow_up_at: daysFromToday(2),
          priority: "Normal",
          notes: "Shared frontage and mailbox beds need a spring reset."
        }),
        normalizeOutreachProspect({
          id: "demo-outreach-3",
          created_at: daysFromToday(-18),
          updated_at: now,
          property_name: "Hawthorne Duplex",
          contact_name: "Sam Patel",
          phone: "(971) 555-0199",
          address: "Hawthorne Blvd, Portland, OR",
          city: "Portland",
          property_type: "Residential",
          service_interest: "Seasonal Cleanup",
          source: "Neighborhood list",
          status: "Prospect",
          priority: "Low",
          notes: "Possible one-time cleanup before rental photos."
        })
      ],
      outreachCompanies: [
        normalizeOutreachCompany({
          id: "demo-company-1",
          company: "Princeton Property Management",
          contact: "Leasing office",
          email: "info@example.com",
          phone: "(503) 555-0120",
          website: "https://example.com",
          city: "Portland",
          service_area: "Portland, North Portland, Vancouver",
          type: "Property Management",
          service: "General Property Care",
          source: "ChatGPT research",
          source_url: "https://example.com/properties",
          status: "Researched",
          follow_up: today,
          notes: "Several managed apartment locations look like good exterior-care fits.",
          priority: "High",
          created_at: now,
          updated_at: now
        }),
        normalizeOutreachCompany({
          id: "demo-company-2",
          company: "Northbank Property Group",
          contact: "Erin Wallace",
          email: "erin@example.com",
          phone: "(503) 555-0134",
          city: "Vancouver",
          service_area: "Vancouver, North Portland",
          type: "Property Management",
          service: "Trash Area Care",
          source: "Referral",
          status: "Follow-Up Needed",
          follow_up: daysFromToday(1),
          notes: "Focus pitch on trash enclosure care and recurring walks.",
          priority: "Normal",
          created_at: now,
          updated_at: now
        })
      ],
      outreachProperties: [
        normalizeOutreachProperty({
          id: "demo-property-1",
          company_id: "demo-company-1",
          company: "Princeton Property Management",
          property_name: "Example Apartments",
          address: "123 Main St",
          city: "Portland",
          state: "OR",
          zip: "97211",
          neighborhood: "North Portland",
          property_type: "Apartment",
          estimated_units: 42,
          service_fit: "Entry cleanup, trash area care, mulch refresh, and recurring exterior walks.",
          service: "Day Porter / Groundskeeping",
          visible_needs: "Trash area care, entry cleanup, mulch refresh",
          source: "ChatGPT research",
          source_url: "https://example.com/properties/example-apartments",
          google_maps_url: "https://maps.google.com/",
          verified_at: today,
          status: "Researched",
          follow_up: daysFromToday(2),
          priority: "High",
          lat: 45.558,
          lng: -122.682,
          created_at: now,
          updated_at: now
        }),
        normalizeOutreachProperty({
          id: "demo-property-2",
          company_id: "demo-company-1",
          company: "Princeton Property Management",
          property_name: "Example Court Apartments",
          address: "456 N Example Ave",
          city: "Portland",
          state: "OR",
          zip: "97217",
          neighborhood: "Kenton",
          property_type: "Apartment",
          service_fit: "Possible shrub trimming, leaf cleanup, and courtyard cleanup.",
          service: "Shrub / Hedge Trimming",
          visible_needs: "Shrub trimming, leaf cleanup, courtyard cleanup",
          source: "ChatGPT research",
          verified_at: today,
          status: "Prospect",
          priority: "Normal",
          created_at: now,
          updated_at: now
        }),
        normalizeOutreachProperty({
          id: "demo-property-3",
          company_id: "demo-company-2",
          company: "Northbank Property Group",
          property_name: "River Gate Flats",
          address: "Vancouver, WA",
          city: "Vancouver",
          state: "WA",
          neighborhood: "Downtown Vancouver",
          property_type: "Mixed-Use",
          service_fit: "Recurring trash area care and storefront/entry cleanup.",
          service: "Trash Area Care",
          visible_needs: "Trash enclosure, entry cleanup",
          source: "Referral",
          status: "Interested",
          follow_up: daysFromToday(1),
          priority: "Normal",
          created_at: now,
          updated_at: now
        })
      ],
      routeStops: [
        normalizeRouteStop({ id: "demo-route-1", route_date: today, client_name: "Hannah Edge", address: "SE Division St, Portland, OR", service_type: "Groundskeeping", estimated_minutes: 75, notes: "Start with courtyard before residents return.", status: "Planned", stop_order: 1, latitude: 45.5045, longitude: -122.6235, created_at: now, updated_at: now }),
        normalizeRouteStop({ id: "demo-route-2", route_date: today, client_name: "Mason Lee", address: "Beaverton, OR", service_type: "Cleanup estimate", estimated_minutes: 45, notes: "Take photos and measure bed edges.", status: "In Progress", stop_order: 2, latitude: 45.4871, longitude: -122.8037, created_at: now, updated_at: now }),
        normalizeRouteStop({ id: "demo-route-3", route_date: today, client_name: "River Court HOA", address: "Vancouver, WA", service_type: "Site walk", estimated_minutes: 60, notes: "Review frontage and shared pond edge.", status: "Planned", stop_order: 3, latitude: 45.628, longitude: -122.672, created_at: now, updated_at: now })
      ],
      equipmentItems: [],
      equipmentMaintenance: [],
      hardwareGuide: [
        normalizeHardwareGuideItem({ id: "demo-guide-1", name: "Commercial battery mower", category: "Mowers", recommended_use: "Quiet mowing for homeowner and small multifamily properties.", brand: "", model: "", estimated_price: 0, priority: "High", supplier: "", product_url: "", good_for: "Mowing, homeowner jobs, apartments", status: "Researching", notes: "Add preferred model and supplier link when ready.", created_at: now, updated_at: now }),
        normalizeHardwareGuideItem({ id: "demo-guide-2", name: "Compact pressure washer", category: "Pressure washing", recommended_use: "Walkways, bins, entries, and common areas.", brand: "", model: "", estimated_price: 0, priority: "Normal", supplier: "", product_url: "", good_for: "Pressure washing, trash area care, apartments", status: "Researching", notes: "Manual price/link only for now.", created_at: now, updated_at: now })
      ],
      groundskeeperAi: {
        settings: [
          { setting_key: "business_name", label: "Business name", value: "Urban Yards Groundskeeping", visibility: "public", status: "published", updated_at: now },
          { setting_key: "service_area", label: "Service area", value: "Portland, Vancouver & Beaverton", visibility: "public", status: "published", updated_at: now }
        ],
        knowledge: [
          { title: "Main Services", category: "Services", content: "Lawn mowing, edging, weed control, seasonal cleanup, mulch refreshes, landscape maintenance, pressure washing, apartment groundskeeping, HOA landscape maintenance, trash area care, property management support, apartment turnover support, and light property-care tasks.", visibility: "public", status: "published", updated_at: now }
        ],
        faqs: [
          { question: "How much does service cost?", answer: "Pricing depends on property size, condition, access, frequency, and scope. Request a free quote for property-specific pricing.", visibility: "public", status: "published", updated_at: now }
        ],
        rules: [
          { title: "Do not invent pricing", content: "Never give final pricing. Explain the variables and guide visitors to Request a Free Quote.", visibility: "public", status: "published", updated_at: now }
        ],
        savedAnswers: [],
        trainingRules: [
          { id: "demo-training-1", title: "Grounded pricing guidance", category: "pricing", content: "When visitors ask about price, explain that exact pricing depends on property size, condition, access, frequency, and scope. Invite them to request a free quote or walkthrough.", visibility: "public", status: "live", priority: 20, updated_at: now, published_at: now },
          { id: "demo-training-2", title: "Friendly owner-operated tone", category: "tone", content: "Use practical, friendly, local language. Avoid pushy sales wording, corporate jargon, and overpromising.", visibility: "public", status: "approved", priority: 30, updated_at: now }
        ],
        versions: [
          { id: "demo-version-1", version_name: "Demo live helper version", published_at: now, published_by: "team@urbanyards.us", notes: "Demo training version." }
        ],
        logs: [],
        feedback: [],
        fallback: {}
      },
      leadActivity: [],
      userProfiles: [
        normalizeUserProfile({
          id: "demo-user",
          email: "demo@urbanyards.us",
          full_name: "Demo User",
          role: "owner",
          title: "Dashboard user",
          created_at: now,
          updated_at: now
        })
      ],
      auditLogs: [
        {
          id: "demo-audit-1",
          created_at: now,
          actor_email: "demo@urbanyards.us",
          actor_role: "owner",
          action: "demo_activity",
          entity_type: "dashboard",
          metadata: { note: "Demo mode activity sample" }
        }
      ]
    };
  }

  function normalizeAuthSession(payload) {
    const user = payload.user || {};
    const userEmail = String(user.email ? user.email : "").toLowerCase();

    const expiresIn = Number(payload.expires_in || 3600);
    const profile = authProfileFromUser(user, userEmail);

    return {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token,
      expiresAt: Date.now() + expiresIn * 1000,
      email: userEmail,
      userId: profileText(user.id),
      role: normalizeDashboardRole(profile.role),
      profile
    };
  }

  async function signInOwner(email, password) {
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

    const userEmail = String(payload.email || "").toLowerCase();
    const profile = authProfileFromUser(payload, userEmail);

    return {
      ...session,
      email: userEmail,
      userId: profileText(payload.id || session.userId),
      role: normalizeDashboardRole(session.role || profile.role),
      profile
    };
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
      state.outreachReady = true;
      state.outreachCompaniesReady = true;
      state.outreachPropertiesReady = true;
      state.routeStopsReady = true;
      state.equipmentReady = true;
      state.equipmentMaintenanceReady = true;
      state.hardwareGuideReady = true;
      state.groundskeeperAiReady = true;
      state.leadActivityReady = true;
      state.userProfilesReady = true;
      state.auditLogsReady = true;
      return demoDashboardData();
    }

    const [submissions, contacts, jobs, notes, reminders, documents, operations, outreachProspects, outreachCompanies, outreachProperties, routeStops, equipmentItems, equipmentMaintenance, hardwareGuide, groundskeeperAi, leadActivity, userProfiles, auditLogs] = await Promise.all([
      supabaseRestRequest("quote_submissions?select=*&order=created_at.desc", { method: "GET" }),
      supabaseRestRequest("contacts?select=*&order=created_at.desc", { method: "GET" }),
      supabaseRestRequest("scheduled_jobs?select=*&order=visit_date.asc", { method: "GET" }),
      supabaseRestRequest("job_notes?select=*&order=created_at.desc", { method: "GET" }),
      supabaseRestRequest("follow_up_reminders?select=*&order=due_date.asc", { method: "GET" }),
      loadSalesDocuments(),
      loadOperationsRecords(),
      loadOutreachProspects(),
      loadOutreachCompanies(),
      loadOutreachProperties(),
      loadRouteStops(),
      loadEquipmentItems(),
      loadEquipmentMaintenance(),
      loadHardwareGuide(),
      loadGroundskeeperAi(),
      loadLeadActivity(),
      loadUserProfiles(),
      loadAuditLogs()
    ]);

    return {
      submissions: submissions.map(normalizeSubmission),
      contacts: contacts.map(normalizeContact),
      jobs: jobs.map(normalizeJob),
      notes: notes.map(normalizeNote),
      reminders: reminders.map(normalizeReminder),
      documents,
      operations,
      outreachProspects,
      outreachCompanies,
      outreachProperties,
      routeStops,
      equipmentItems,
      equipmentMaintenance,
      hardwareGuide,
      groundskeeperAi,
      leadActivity,
      userProfiles,
      auditLogs
    };
  }

  async function loadLeadActivity() {
    try {
      const rows = await supabaseRestRequest("lead_activity?select=*&order=created_at.desc&limit=500", { method: "GET" });
      state.leadActivityReady = true;
      return rows.map(normalizeLeadActivity);
    } catch (error) {
      state.leadActivityReady = false;
      return [];
    }
  }

  async function loadGroundskeeperAi() {
    try {
      const snapshot = await groundskeeperRequest("admin-list");
      state.groundskeeperAiReady = true;
      return {
        settings: snapshot.settings || [],
        knowledge: snapshot.knowledge || [],
        faqs: snapshot.faqs || [],
        rules: snapshot.rules || [],
        savedAnswers: snapshot.savedAnswers || [],
        trainingRules: snapshot.trainingRules || [],
        versions: snapshot.versions || [],
        logs: snapshot.logs || [],
        feedback: snapshot.feedback || [],
        fallback: snapshot.fallback || {}
      };
    } catch (error) {
      state.groundskeeperAiReady = false;
      return {
        settings: [],
        knowledge: [],
        faqs: [],
        rules: [],
        savedAnswers: [],
        trainingRules: [],
        versions: [],
        logs: [],
        feedback: [],
        fallback: {}
      };
    }
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

  async function loadEquipmentItems() {
    try {
      const rows = await supabaseRestRequest("equipment_items?select=*&order=category.asc,name.asc", { method: "GET" });
      state.equipmentReady = true;
      return rows.map(normalizeEquipmentItem);
    } catch (error) {
      state.equipmentReady = false;
      return [];
    }
  }

  async function loadEquipmentMaintenance() {
    try {
      const rows = await supabaseRestRequest("equipment_maintenance?select=*&order=maintenance_date.desc,created_at.desc", { method: "GET" });
      state.equipmentMaintenanceReady = true;
      return rows.map(normalizeEquipmentMaintenance);
    } catch (error) {
      state.equipmentMaintenanceReady = false;
      return [];
    }
  }

  async function loadHardwareGuide() {
    try {
      const rows = await supabaseRestRequest("hardware_guide?select=*&order=priority.asc,name.asc", { method: "GET" });
      state.hardwareGuideReady = true;
      return rows.map(normalizeHardwareGuideItem);
    } catch (error) {
      state.hardwareGuideReady = false;
      return [];
    }
  }

  async function loadOutreachProspects() {
    try {
      const rows = await supabaseRestRequest("outreach_prospects?select=*&order=next_follow_up_at.asc.nullslast,updated_at.desc", { method: "GET" });
      state.outreachReady = true;
      return rows.map(normalizeOutreachProspect);
    } catch (error) {
      state.outreachReady = false;
      return [];
    }
  }

  async function loadOutreachCompanies() {
    try {
      const rows = await supabaseRestRequest("outreach_companies?select=*&order=company.asc", { method: "GET" });
      state.outreachCompaniesReady = true;
      return rows.map(normalizeOutreachCompany);
    } catch (error) {
      state.outreachCompaniesReady = false;
      return [];
    }
  }

  async function loadOutreachProperties() {
    try {
      const rows = await supabaseRestRequest("outreach_properties?select=*&order=company.asc,property_name.asc", { method: "GET" });
      state.outreachPropertiesReady = true;
      return rows.map(normalizeOutreachProperty);
    } catch (error) {
      state.outreachPropertiesReady = false;
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

  async function insertScheduledJobs(payloads) {
    if (isDemoMode()) {
      const jobs = payloads.map((payload) => normalizeJob({ id: nextDemoId("job"), ...payload }));
      state.data.jobs.unshift(...jobs);
      return jobs;
    }

    const rows = await supabaseRestRequest("scheduled_jobs", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payloads)
    });
    return rows.map(normalizeJob);
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
        outreach_prospects: "outreachProspects",
        outreach_companies: "outreachCompanies",
        outreach_properties: "outreachProperties",
        route_stops: "routeStops",
        equipment_items: "equipmentItems",
        equipment_maintenance: "equipmentMaintenance",
        hardware_guide: "hardwareGuide",
        lead_activity: "leadActivity"
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

  async function insertEquipmentItem(payload) {
    if (!state.equipmentReady) throw new Error("Create the equipment_items table first. Use DASHBOARD_EQUIPMENT_SQL.md.");
    if (isDemoMode()) {
      const item = normalizeEquipmentItem({ id: nextDemoId("equipment"), ...payload, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      state.data.equipmentItems.unshift(item);
      return item;
    }
    const rows = await supabaseRestRequest("equipment_items", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload)
    });
    return normalizeEquipmentItem(rows[0]);
  }

  async function updateEquipmentItem(id, payload) {
    if (isDemoMode()) {
      const index = state.data.equipmentItems.findIndex((item) => item.id === id);
      if (index >= 0) {
        const existing = state.data.equipmentItems[index];
        state.data.equipmentItems[index] = normalizeEquipmentItem({
          id,
          name: payload.name ?? existing.name,
          category: payload.category ?? existing.category,
          brand: payload.brand ?? existing.brand,
          model: payload.model ?? existing.model,
          serial_number: payload.serial_number ?? existing.serialNumber,
          quantity: payload.quantity ?? existing.quantity,
          condition: payload.condition ?? existing.condition,
          status: payload.status ?? existing.status,
          storage_location: payload.storage_location ?? existing.storageLocation,
          purchase_date: payload.purchase_date ?? existing.purchaseDateRaw,
          purchase_price: payload.purchase_price ?? existing.purchasePrice,
          supplier: payload.supplier ?? existing.supplier,
          product_url: payload.product_url ?? existing.productUrl,
          image_url: payload.image_url ?? existing.imageUrl,
          notes: payload.notes ?? existing.notes,
          last_maintenance_date: payload.last_maintenance_date ?? existing.lastMaintenanceRaw,
          next_maintenance_date: payload.next_maintenance_date ?? existing.nextMaintenanceRaw,
          replacement_priority: payload.replacement_priority ?? existing.replacementPriority,
          updated_at: new Date().toISOString()
        });
      }
      return state.data.equipmentItems[index] || null;
    }
    const rows = await supabaseRestRequest(`equipment_items?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ ...payload, updated_at: new Date().toISOString() })
    });
    return rows?.[0] ? normalizeEquipmentItem(rows[0]) : null;
  }

  async function insertEquipmentMaintenance(payload) {
    if (!state.equipmentMaintenanceReady) throw new Error("Create the equipment_maintenance table first. Use DASHBOARD_EQUIPMENT_SQL.md.");
    if (isDemoMode()) {
      const record = normalizeEquipmentMaintenance({ id: nextDemoId("equipment-maintenance"), ...payload, created_at: new Date().toISOString() });
      state.data.equipmentMaintenance.unshift(record);
      return record;
    }
    const rows = await supabaseRestRequest("equipment_maintenance", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload)
    });
    return normalizeEquipmentMaintenance(rows[0]);
  }

  async function insertHardwareGuideItem(payload) {
    if (!state.hardwareGuideReady) throw new Error("Create the hardware_guide table first. Use DASHBOARD_EQUIPMENT_SQL.md.");
    if (isDemoMode()) {
      const item = normalizeHardwareGuideItem({ id: nextDemoId("hardware"), ...payload, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      state.data.hardwareGuide.unshift(item);
      return item;
    }
    const rows = await supabaseRestRequest("hardware_guide", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload)
    });
    return normalizeHardwareGuideItem(rows[0]);
  }

  async function updateHardwareGuideItem(id, payload) {
    if (isDemoMode()) {
      const index = state.data.hardwareGuide.findIndex((item) => item.id === id);
      if (index >= 0) {
        const existing = state.data.hardwareGuide[index];
        state.data.hardwareGuide[index] = normalizeHardwareGuideItem({
          id,
          name: payload.name ?? existing.name,
          category: payload.category ?? existing.category,
          recommended_use: payload.recommended_use ?? existing.recommendedUse,
          brand: payload.brand ?? existing.brand,
          model: payload.model ?? existing.model,
          estimated_price: payload.estimated_price ?? existing.estimatedPrice,
          priority: payload.priority ?? existing.priority,
          product_url: payload.product_url ?? existing.productUrl,
          supplier: payload.supplier ?? existing.supplier,
          notes: payload.notes ?? existing.notes,
          status: payload.status ?? existing.status,
          good_for: payload.good_for ?? existing.goodFor,
          updated_at: new Date().toISOString()
        });
      }
      return state.data.hardwareGuide[index] || null;
    }
    const rows = await supabaseRestRequest(`hardware_guide?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ ...payload, updated_at: new Date().toISOString() })
    });
    return rows?.[0] ? normalizeHardwareGuideItem(rows[0]) : null;
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

  async function insertLeadActivity(payload) {
    const phone = phoneInfo(payload.phone_number);
    if (!phone.valid) throw new Error("No valid phone number.");
    const recordPayload = {
      lead_id: payload.lead_id,
      lead_type: payload.lead_type || "lead",
      phone_number: phone.e164,
      type: payload.type || "call_attempt",
      outcome: payload.outcome || "not_set",
      notes: payload.notes || "",
      follow_up_date: payload.follow_up_date || null
    };
    if (isDemoMode()) {
      const activity = normalizeLeadActivity({
        id: nextDemoId("call"),
        ...recordPayload,
        created_at: new Date().toISOString()
      });
      state.data.leadActivity.unshift(activity);
      return activity;
    }
    if (!state.leadActivityReady) throw new Error("Run DASHBOARD_CALL_ACTIVITY_SQL.md to enable call logging.");
    const rows = await supabaseRestRequest("lead_activity", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(recordPayload)
    });
    const activity = normalizeLeadActivity(rows[0]);
    state.data.leadActivity.unshift(activity);
    return activity;
  }

  async function updateLeadActivity(id, payload) {
    const safeOutcome = CALL_OUTCOMES.includes(payload.outcome) ? payload.outcome : "not_set";
    const recordPayload = {
      outcome: safeOutcome,
      notes: payload.notes || "",
      follow_up_date: payload.follow_up_date || null
    };
    if (isDemoMode()) {
      const index = state.data.leadActivity.findIndex((activity) => activity.id === id);
      if (index >= 0) {
        const existing = state.data.leadActivity[index];
        state.data.leadActivity[index] = normalizeLeadActivity({
          id: existing.id,
          lead_id: existing.leadId,
          lead_type: existing.leadType,
          phone_number: existing.phoneNumber,
          type: existing.type,
          created_at: existing.createdAtRaw,
          ...recordPayload
        });
      }
      return state.data.leadActivity[index] || null;
    }
    if (!state.leadActivityReady) throw new Error("Run DASHBOARD_CALL_ACTIVITY_SQL.md to enable call logging.");
    const rows = await supabaseRestRequest(`lead_activity?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(recordPayload)
    });
    const activity = rows?.[0] ? normalizeLeadActivity(rows[0]) : null;
    if (activity) {
      const index = state.data.leadActivity.findIndex((item) => item.id === id);
      if (index >= 0) state.data.leadActivity[index] = activity;
    }
    return activity;
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

  function outreachPayloadFromForm(form) {
    const formData = new FormData(form);
    const payload = {
      property_name: String(formData.get("property_name") || "").trim() || null,
      management_company: String(formData.get("management_company") || "").trim() || null,
      contact_name: String(formData.get("contact_name") || "").trim() || null,
      email: String(formData.get("email") || "").trim() || null,
      phone: String(formData.get("phone") || "").trim() || null,
      address: String(formData.get("address") || "").trim() || null,
      city: String(formData.get("city") || "").trim() || null,
      property_type: String(formData.get("property_type") || "Other"),
      service_interest: String(formData.get("service_interest") || "General Property Care"),
      source: String(formData.get("source") || "").trim() || null,
      status: String(formData.get("status") || "Prospect"),
      last_contacted_at: String(formData.get("last_contacted_at") || "") || null,
      next_follow_up_at: String(formData.get("next_follow_up_at") || "") || null,
      notes: String(formData.get("notes") || "").trim() || null,
      priority: String(formData.get("priority") || "Normal")
    };
    const hasName = Boolean(payload.property_name || payload.contact_name);
    const hasContactOrAddress = Boolean(payload.email || payload.phone || payload.address || payload.city);
    if (!hasName) throw new Error("Add either a property name or contact name.");
    if (!hasContactOrAddress) throw new Error("Add at least one email, phone, address, or city.");
    if (!OUTREACH_STATUSES.includes(payload.status)) throw new Error("Choose a valid outreach status.");
    if (!OUTREACH_PRIORITIES.includes(payload.priority)) throw new Error("Choose a valid priority.");
    return payload;
  }

  function outreachCompanyPayloadFromForm(form) {
    const formData = new FormData(form);
    const payload = {
      company: String(formData.get("company") || "").trim(),
      contact: String(formData.get("contact") || "").trim() || null,
      email: String(formData.get("email") || "").trim() || null,
      phone: String(formData.get("phone") || "").trim() || null,
      website: String(formData.get("website") || "").trim() || null,
      service_area: String(formData.get("service_area") || "").trim() || null,
      follow_up: String(formData.get("follow_up") || "") || null,
      status: String(formData.get("status") || "Prospect"),
      priority: String(formData.get("priority") || "Normal"),
      notes: String(formData.get("notes") || "").trim() || null
    };
    if (!payload.company) throw new Error("Add a company name.");
    if (!OUTREACH_STATUSES.includes(payload.status)) throw new Error("Choose a valid company status.");
    if (!OUTREACH_PRIORITIES.includes(payload.priority)) throw new Error("Choose a valid priority.");
    return payload;
  }

  function outreachPropertyPayloadFromForm(form, company) {
    const formData = new FormData(form);
    const propertyName = String(formData.get("property_name") || "").trim();
    const address = String(formData.get("address") || "").trim();
    const city = String(formData.get("city") || "").trim();
    if (!propertyName && !address) throw new Error("Add a property name or address.");
    return {
      company_id: company.id,
      company: company.company,
      property_name: propertyName || null,
      address: address || null,
      city: city || company.serviceArea || company.city || null,
      neighborhood: String(formData.get("neighborhood") || "").trim() || null,
      notes: String(formData.get("notes") || "").trim() || null,
      status: "Prospect",
      priority: company.priority || "Normal"
    };
  }

  function prospectMatchesCompany(prospect, company) {
    const companyKey = normalizeDedupeKey(company.company);
    const prospectCompanyKey = normalizeDedupeKey(prospect.managementCompany || prospect.propertyName);
    if (!companyKey || companyKey !== prospectCompanyKey) return false;
    const emailMatches = company.email && prospect.email && normalizeDedupeKey(company.email) === normalizeDedupeKey(prospect.email);
    const phoneMatches = company.phone && prospect.phone && normalizeDedupeKey(company.phone) === normalizeDedupeKey(prospect.phone);
    return emailMatches || phoneMatches || (!company.email && !company.phone);
  }

  function prospectMatchesProperty(prospect, property) {
    const nameMatches = normalizeDedupeKey(prospect.propertyName) === normalizeDedupeKey(property.propertyName);
    const addressMatches = normalizeDedupeKey(prospect.address) === normalizeDedupeKey(property.address);
    return Boolean(property.propertyName && property.address && nameMatches && addressMatches);
  }

  function companyProspectPayload(company) {
    return {
      property_name: company.company,
      management_company: company.company,
      contact_name: company.contact || null,
      email: company.email || null,
      phone: company.phone || null,
      address: null,
      city: company.serviceArea || company.city || null,
      property_type: "Property Management",
      service_interest: company.service || "General Property Care",
      source: "Outreach Company",
      status: "Prospect",
      last_contacted_at: null,
      next_follow_up_at: company.followUpRaw || null,
      notes: company.notes || null,
      priority: company.priority || "Normal"
    };
  }

  function propertyProspectPayload(property, company) {
    const notes = [
      company.notes ? `Company notes: ${company.notes}` : "",
      property.serviceFit ? `Service fit: ${property.serviceFit}` : "",
      property.visibleNeeds ? `Visible needs: ${property.visibleNeeds}` : "",
      property.notes ? `Property notes: ${property.notes}` : ""
    ].filter(Boolean).join("\n");
    return {
      property_name: property.propertyName,
      management_company: company.company || property.company,
      contact_name: company.contact || null,
      email: company.email || null,
      phone: company.phone || null,
      address: property.address || null,
      city: property.city || company.serviceArea || company.city || null,
      property_type: "Managed Property",
      service_interest: property.service || company.service || "General Property Care",
      source: "Outreach Property",
      status: "Prospect",
      last_contacted_at: null,
      next_follow_up_at: company.followUpRaw || null,
      notes: notes || null,
      priority: company.priority || property.priority || "Normal"
    };
  }

  function normalizeCsvHeader(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;
    const source = String(text || "").replace(/^\uFEFF/, "");
    for (let index = 0; index < source.length; index += 1) {
      const char = source[index];
      const next = source[index + 1];
      if (char === "\"") {
        if (inQuotes && next === "\"") {
          field += "\"";
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        row.push(field);
        field = "";
      } else if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && next === "\n") index += 1;
        row.push(field);
        if (row.some((cell) => String(cell).trim())) rows.push(row);
        row = [];
        field = "";
      } else {
        field += char;
      }
    }
    row.push(field);
    if (row.some((cell) => String(cell).trim())) rows.push(row);
    return rows;
  }

  function csvCell(row, headerMap, names) {
    for (const name of names) {
      const index = headerMap.get(normalizeCsvHeader(name));
      if (index !== undefined) return String(row[index] || "").trim();
    }
    return "";
  }

  function normalizeOutreachStatus(value) {
    const normalized = normalizeCsvHeader(value);
    return OUTREACH_STATUSES.find((status) => normalizeCsvHeader(status) === normalized) || "Prospect";
  }

  function normalizeOutreachPriority(value) {
    const normalized = normalizeCsvHeader(value);
    return OUTREACH_PRIORITIES.find((priority) => normalizeCsvHeader(priority) === normalized) || "Normal";
  }

  function normalizeOptionValue(value, options, fallback) {
    const normalized = normalizeCsvHeader(value);
    return options.find((option) => normalizeCsvHeader(option) === normalized) || value || fallback;
  }

  function validatedOptionValue(value, options, fallback, label, errors) {
    const trimmed = String(value || "").trim();
    if (!trimmed) return fallback;
    const normalized = normalizeCsvHeader(trimmed);
    const match = options.find((option) => normalizeCsvHeader(option) === normalized);
    if (match) return match;
    errors.push(`${label}: ${trimmed}`);
    return fallback;
  }

  function parseIntegerCell(value) {
    const trimmed = String(value || "").trim();
    if (!trimmed) return null;
    const parsed = Number.parseInt(trimmed.replace(/,/g, ""), 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function normalizeDedupeKey(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  }

  function isPropertyLocationCsv(headers) {
    const set = new Set(headers.map(normalizeCsvHeader));
    const propertySignals = ["state", "zip", "neighborhood", "service_fit", "visible_needs", "source_url", "google_maps_url", "verified_at"];
    return set.has("company") && (set.has("property_name") || set.has("property")) && propertySignals.some((field) => set.has(field));
  }

  function outreachPayloadFromCsvRow(row, headerMap) {
    const payload = {
      property_name: csvCell(row, headerMap, ["property_name", "property name", "property", "site", "site name", "building"]),
      management_company: csvCell(row, headerMap, ["management_company", "management company", "company", "management", "owner company"]),
      contact_name: csvCell(row, headerMap, ["contact_name", "contact name", "contact", "name", "person"]),
      email: csvCell(row, headerMap, ["email", "email address"]),
      phone: csvCell(row, headerMap, ["phone", "phone number", "telephone"]),
      address: csvCell(row, headerMap, ["address", "street address", "property address", "location"]),
      city: csvCell(row, headerMap, ["city", "area"]),
      property_type: normalizeOptionValue(csvCell(row, headerMap, ["property_type", "property type", "type"]), OUTREACH_PROPERTY_TYPES, "Other"),
      service_interest: normalizeOptionValue(csvCell(row, headerMap, ["service_interest", "service interest", "service", "services", "need", "scope"]), OUTREACH_SERVICE_INTERESTS, "General Property Care"),
      source: csvCell(row, headerMap, ["source", "lead source", "where found"]),
      status: normalizeOutreachStatus(csvCell(row, headerMap, ["status", "pipeline status", "stage"])),
      last_contacted_at: csvCell(row, headerMap, ["last_contacted_at", "last contacted", "last contact"]),
      next_follow_up_at: csvCell(row, headerMap, ["next_follow_up_at", "next follow up", "follow up", "follow-up", "followup", "next follow-up"]),
      notes: csvCell(row, headerMap, ["notes", "note", "details", "summary"]),
      priority: normalizeOutreachPriority(csvCell(row, headerMap, ["priority", "importance"]))
    };
    Object.keys(payload).forEach((key) => {
      if (payload[key] === "") payload[key] = null;
    });
    const hasName = Boolean(payload.property_name || payload.contact_name);
    const hasContactOrAddress = Boolean(payload.email || payload.phone || payload.address || payload.city);
    if (!hasName) throw new Error("missing property_name/contact_name");
    if (!hasContactOrAddress) throw new Error("missing email/phone/address/city");
    return payload;
  }

  async function importOutreachCsvFile(file) {
    if (!file) return;
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) throw new Error("CSV needs a header row and at least one prospect row.");
    const headers = rows[0].map(normalizeCsvHeader);
    const headerMap = new Map(headers.map((header, index) => [header, index]));
    if (isPropertyLocationCsv(headers)) {
      if (!state.outreachCompaniesReady || !state.outreachPropertiesReady) {
        throw new Error("Create outreach_companies and outreach_properties first. See DASHBOARD_OUTREACH_SQL.md.");
      }
      state.pendingOutreachImport = buildOutreachPropertyImportPreview(rows.slice(1), headerMap);
      openOutreachImportPreview();
      return;
    }
    if (!state.outreachReady) {
      throw new Error("Create the outreach_prospects table first. See DASHBOARD_OUTREACH_SQL.md.");
    }
    let imported = 0;
    const skipped = [];
    for (const row of rows.slice(1)) {
      try {
        const prospect = await insertOutreachProspect(outreachPayloadFromCsvRow(row, headerMap));
        if (!isDemoMode()) state.data.outreachProspects.unshift(prospect);
        imported += 1;
      } catch (error) {
        skipped.push(error.message || "invalid row");
      }
    }
    await refreshDashboard();
    const skippedMessage = skipped.length ? ` Skipped ${skipped.length} row${skipped.length === 1 ? "" : "s"}.` : "";
    setDashboardState(`Imported ${imported} prospect${imported === 1 ? "" : "s"}.${skippedMessage}`, skipped.length && !imported ? "error" : "");
  }

  function outreachCompanyPayloadFromCsvRow(row, headerMap) {
    const company = csvCell(row, headerMap, ["company", "management_company", "management company"]);
    if (!company) throw new Error("missing company");
    const errors = [];
    return {
      company,
      contact: csvCell(row, headerMap, ["contact", "contact_name", "contact name"]) || null,
      email: csvCell(row, headerMap, ["email", "email address"]) || null,
      phone: csvCell(row, headerMap, ["phone", "phone number"]) || null,
      website: csvCell(row, headerMap, ["website", "site"]) || null,
      city: csvCell(row, headerMap, ["city"]) || null,
      service_area: csvCell(row, headerMap, ["service_area", "service area"]) || null,
      type: "Property Management",
      service: validatedOptionValue(csvCell(row, headerMap, ["service"]), OUTREACH_SERVICE_INTERESTS, "General Property Care", "service", errors),
      source: csvCell(row, headerMap, ["source"]) || "CSV import",
      source_url: csvCell(row, headerMap, ["source_url", "source url"]) || null,
      status: validatedOptionValue(csvCell(row, headerMap, ["status"]), OUTREACH_STATUSES, "Prospect", "status", errors),
      follow_up: csvCell(row, headerMap, ["follow_up", "follow up"]) || null,
      notes: csvCell(row, headerMap, ["notes"]) || null,
      priority: validatedOptionValue(csvCell(row, headerMap, ["priority"]), OUTREACH_PRIORITIES, "Normal", "priority", errors)
    };
  }

  function outreachPropertyPayloadFromCsvRow(row, headerMap, companyId, validationErrors = []) {
    const propertyName = csvCell(row, headerMap, ["property_name", "property name"]);
    const company = csvCell(row, headerMap, ["company"]);
    const email = csvCell(row, headerMap, ["email", "email address"]);
    const phone = csvCell(row, headerMap, ["phone", "phone number"]);
    const address = csvCell(row, headerMap, ["address"]);
    const city = csvCell(row, headerMap, ["city"]);
    if (!propertyName && !company) throw new Error("missing property name/company");
    if (!address && !city && !email && !phone) throw new Error("missing address/city/email/phone");
    return {
      company_id: companyId || null,
      company: company || null,
      property_name: propertyName || null,
      address: address || null,
      city: city || null,
      state: csvCell(row, headerMap, ["state"]) || null,
      zip: csvCell(row, headerMap, ["zip", "zipcode", "postal code"]) || null,
      neighborhood: csvCell(row, headerMap, ["neighborhood"]) || null,
      property_type: validatedOptionValue(csvCell(row, headerMap, ["type", "property_type", "property type"]), OUTREACH_PROPERTY_TYPES, "Other", "type", validationErrors),
      estimated_units: parseIntegerCell(csvCell(row, headerMap, ["estimated_units", "estimated units", "units"])),
      service_fit: csvCell(row, headerMap, ["service_fit", "service fit"]) || null,
      service: validatedOptionValue(csvCell(row, headerMap, ["service"]), OUTREACH_SERVICE_INTERESTS, "General Property Care", "service", validationErrors),
      visible_needs: csvCell(row, headerMap, ["visible_needs", "visible needs"]) || null,
      source: csvCell(row, headerMap, ["source"]) || "CSV import",
      source_url: csvCell(row, headerMap, ["source_url", "source url"]) || null,
      google_maps_url: csvCell(row, headerMap, ["google_maps_url", "google maps url"]) || null,
      verified_at: csvCell(row, headerMap, ["verified_at", "verified at"]) || null,
      status: validatedOptionValue(csvCell(row, headerMap, ["status"]), OUTREACH_STATUSES, "Prospect", "status", validationErrors),
      follow_up: csvCell(row, headerMap, ["follow_up", "follow up"]) || null,
      notes: csvCell(row, headerMap, ["notes"]) || null,
      priority: validatedOptionValue(csvCell(row, headerMap, ["priority"]), OUTREACH_PRIORITIES, "Normal", "priority", validationErrors)
    };
  }

  function buildOutreachPropertyImportPreview(rows, headerMap) {
    const companyByName = new Map(state.data.outreachCompanies.map((company) => [normalizeDedupeKey(company.company), company]));
    const propertyByAddress = new Map(state.data.outreachProperties.filter((item) => item.address).map((item) => [normalizeDedupeKey(item.address), item]));
    const propertyByNameCompany = new Map(state.data.outreachProperties.map((item) => [normalizeDedupeKey(`${item.propertyName} ${item.company}`), item]));
    const seenCompanies = new Set();
    const seenAddresses = new Set();
    const seenNameCompany = new Set();
    const validRows = [];
    const invalidRows = [];
    let rowsMissingAddress = 0;
    let possibleDuplicates = 0;
    let newProperties = 0;

    rows.forEach((row, index) => {
      const errors = [];
      let companyPayload = null;
      let propertyPayload = null;
      try {
        const company = csvCell(row, headerMap, ["company", "management_company", "management company"]);
        if (company) companyPayload = outreachCompanyPayloadFromCsvRow(row, headerMap);
        propertyPayload = outreachPropertyPayloadFromCsvRow(row, headerMap, null, errors);
        if (errors.length) throw new Error(errors.join("; "));

        const companyKey = normalizeDedupeKey(company);
        const addressKey = normalizeDedupeKey(propertyPayload.address);
        const fallbackKey = normalizeDedupeKey(`${propertyPayload.property_name || ""} ${propertyPayload.company || ""}`);
        const duplicate = addressKey
          ? propertyByAddress.has(addressKey) || seenAddresses.has(addressKey)
          : propertyByNameCompany.has(fallbackKey) || seenNameCompany.has(fallbackKey);

        if (!propertyPayload.address) rowsMissingAddress += 1;
        if (duplicate) {
          possibleDuplicates += 1;
        } else {
          newProperties += 1;
        }
        if (companyKey && !companyByName.has(companyKey)) seenCompanies.add(companyKey);
        if (addressKey) seenAddresses.add(addressKey);
        if (fallbackKey) seenNameCompany.add(fallbackKey);
        validRows.push({
          rowNumber: index + 2,
          companyKey,
          addressKey,
          fallbackKey,
          duplicate,
          companyPayload,
          propertyPayload
        });
      } catch (error) {
        const address = csvCell(row, headerMap, ["address"]);
        if (!address) rowsMissingAddress += 1;
        invalidRows.push({
          rowNumber: index + 2,
          message: error.message || "invalid row",
          label: csvCell(row, headerMap, ["property_name", "property name"]) || csvCell(row, headerMap, ["company"]) || `Row ${index + 2}`
        });
      }
    });

    return {
      type: "property",
      totalRows: rows.length,
      newCompanies: seenCompanies.size,
      newProperties,
      possibleDuplicates,
      rowsMissingAddress,
      invalidRows,
      validRows
    };
  }

  async function commitOutreachPropertyImport(preview) {
    if (!preview || preview.type !== "property") return;
    if (!state.outreachCompaniesReady || !state.outreachPropertiesReady) {
      throw new Error("Create outreach_companies and outreach_properties first. See DASHBOARD_OUTREACH_SQL.md.");
    }
    let imported = 0;
    let updated = 0;
    const skipped = [];
    const companyByName = new Map(state.data.outreachCompanies.map((company) => [normalizeDedupeKey(company.company), company]));
    const propertyByAddress = new Map(state.data.outreachProperties.filter((item) => item.address).map((item) => [normalizeDedupeKey(item.address), item]));
    const propertyByNameCompany = new Map(state.data.outreachProperties.map((item) => [normalizeDedupeKey(`${item.propertyName} ${item.company}`), item]));

    for (const item of preview.validRows) {
      try {
        let company = item.companyKey ? companyByName.get(item.companyKey) : null;
        if (!company && item.companyPayload) {
          company = await insertOutreachCompany(item.companyPayload);
          companyByName.set(item.companyKey, company);
          if (!isDemoMode()) state.data.outreachCompanies.unshift(company);
        }

        const propertyPayload = {
          ...item.propertyPayload,
          company_id: company?.id || null
        };
        const addressKey = normalizeDedupeKey(propertyPayload.address);
        const fallbackKey = normalizeDedupeKey(`${propertyPayload.property_name || ""} ${propertyPayload.company || ""}`);
        const existing = addressKey ? propertyByAddress.get(addressKey) : propertyByNameCompany.get(fallbackKey);
        let saved = null;
        if (existing) {
          saved = await updateOutreachProperty(existing.id, propertyPayload);
          updated += 1;
        } else {
          saved = await insertOutreachProperty(propertyPayload);
          imported += 1;
        }
        if (saved?.address && (saved.lat === null || saved.lng === null)) {
          geocodeAndStoreOutreachProperty(saved).catch(() => {});
        }
        if (saved?.address) propertyByAddress.set(normalizeDedupeKey(saved.address), saved);
        propertyByNameCompany.set(normalizeDedupeKey(`${saved.propertyName} ${saved.company}`), saved);
      } catch (error) {
        skipped.push(`row ${item.rowNumber}: ${error.message || "invalid row"}`);
      }
    }

    state.pendingOutreachImport = null;
    state.outreachView = "properties";
    await refreshDashboard();
    const skippedTotal = skipped.length + preview.invalidRows.length;
    const skippedMessage = skippedTotal ? ` Skipped ${skippedTotal} row${skippedTotal === 1 ? "" : "s"}.` : "";
    setDashboardState(`Imported ${imported} propert${imported === 1 ? "y" : "ies"} and updated ${updated}.${skippedMessage}`, skippedTotal && !imported && !updated ? "error" : "");
  }

  async function insertOutreachProspect(payload) {
    if (!state.outreachReady) {
      throw new Error("Create the outreach_prospects table first. See DASHBOARD_OUTREACH_SQL.md.");
    }
    if (isDemoMode()) {
      const prospect = normalizeOutreachProspect({
        id: nextDemoId("outreach"),
        ...payload,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      state.data.outreachProspects.unshift(prospect);
      return prospect;
    }
    const rows = await supabaseRestRequest("outreach_prospects", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload)
    });
    return normalizeOutreachProspect(rows[0]);
  }

  async function insertOutreachCompany(payload) {
    if (!state.outreachCompaniesReady) throw new Error("Create the outreach_companies table first. See DASHBOARD_OUTREACH_SQL.md.");
    if (isDemoMode()) {
      const company = normalizeOutreachCompany({ id: nextDemoId("company"), ...payload, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      state.data.outreachCompanies.unshift(company);
      return company;
    }
    const rows = await supabaseRestRequest("outreach_companies", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload)
    });
    return normalizeOutreachCompany(rows[0]);
  }

  async function updateOutreachCompany(id, payload) {
    if (isDemoMode()) {
      const index = state.data.outreachCompanies.findIndex((company) => company.id === id);
      const existing = state.data.outreachCompanies[index];
      if (index >= 0) {
        state.data.outreachCompanies[index] = normalizeOutreachCompany({
          id,
          created_at: existing.createdAtRaw,
          company: existing.company,
          contact: existing.contact,
          email: existing.email,
          phone: existing.phone,
          website: existing.website,
          city: existing.city,
          service_area: existing.serviceArea,
          type: existing.type,
          service: existing.service,
          source: existing.source,
          source_url: existing.sourceUrl,
          status: existing.status,
          follow_up: existing.followUpRaw || null,
          notes: existing.notes,
          priority: existing.priority,
          ...payload,
          updated_at: new Date().toISOString()
        });
      }
      return state.data.outreachCompanies[index];
    }
    const rows = await supabaseRestRequest(`outreach_companies?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ ...payload, updated_at: new Date().toISOString() })
    });
    return normalizeOutreachCompany(rows[0]);
  }

  async function insertOutreachProperty(payload) {
    if (!state.outreachPropertiesReady) throw new Error("Create the outreach_properties table first. See DASHBOARD_OUTREACH_SQL.md.");
    if (isDemoMode()) {
      const property = normalizeOutreachProperty({ id: nextDemoId("property"), ...payload, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      state.data.outreachProperties.unshift(property);
      return property;
    }
    const rows = await supabaseRestRequest("outreach_properties", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload)
    });
    return normalizeOutreachProperty(rows[0]);
  }

  async function updateOutreachProperty(id, payload) {
    if (isDemoMode()) {
      const index = state.data.outreachProperties.findIndex((property) => property.id === id);
      const existing = state.data.outreachProperties[index];
      if (index >= 0) {
        state.data.outreachProperties[index] = normalizeOutreachProperty({
          id,
          created_at: existing.createdAtRaw,
          company_id: existing.companyId,
          company: existing.company,
          property_name: existing.propertyName,
          address: existing.address,
          city: existing.city,
          state: existing.state,
          zip: existing.zip,
          neighborhood: existing.neighborhood,
          property_type: existing.propertyType,
          estimated_units: existing.estimatedUnits,
          service_fit: existing.serviceFit,
          service: existing.service,
          visible_needs: existing.visibleNeeds,
          notes: existing.notes,
          source: existing.source,
          source_url: existing.sourceUrl,
          google_maps_url: existing.googleMapsUrl,
          verified_at: existing.verifiedAtRaw || null,
          status: existing.status,
          follow_up: existing.followUpRaw || null,
          priority: existing.priority,
          lat: existing.lat,
          lng: existing.lng,
          ...payload,
          updated_at: new Date().toISOString()
        });
      }
      return state.data.outreachProperties[index];
    }
    const rows = await supabaseRestRequest(`outreach_properties?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ ...payload, updated_at: new Date().toISOString() })
    });
    return normalizeOutreachProperty(rows[0]);
  }

  async function geocodeAndStoreOutreachProperty(property) {
    if (!property?.address) return null;
    const lookup = [property.address, property.city, property.state, property.zip].filter(Boolean).join(", ");
    const coordinates = await geocodeRouteAddress(lookup);
    return updateOutreachProperty(property.id, { lat: coordinates.lat, lng: coordinates.lng });
  }

  async function updateOutreachProspect(id, payload) {
    if (isDemoMode()) {
      const existing = state.data.outreachProspects.find((prospect) => prospect.id === id);
      const index = state.data.outreachProspects.findIndex((prospect) => prospect.id === id);
      if (index >= 0) {
        const merged = {
          property_name: existing.propertyName,
          management_company: existing.managementCompany,
          contact_name: existing.contactName,
          email: existing.email,
          phone: existing.phone,
          address: existing.address,
          city: existing.city,
          property_type: existing.propertyType,
          service_interest: existing.serviceInterest,
          source: existing.source,
          status: existing.status,
          last_contacted_at: existing.lastContactedAtRaw || null,
          next_follow_up_at: existing.nextFollowUpAtRaw || null,
          notes: existing.notes,
          priority: existing.priority,
          route_added: existing.routeAdded,
          converted_to_quote: existing.convertedToQuote,
          ...payload
        };
        state.data.outreachProspects[index] = normalizeOutreachProspect({
          id,
          created_at: existing?.createdAtRaw || new Date().toISOString(),
          ...merged,
          updated_at: new Date().toISOString()
        });
      }
      return state.data.outreachProspects[index];
    }
    const rows = await supabaseRestRequest(`outreach_prospects?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ ...payload, updated_at: new Date().toISOString() })
    });
    return normalizeOutreachProspect(rows[0]);
  }

  async function markOutreachContacted(id) {
    const prospect = findOutreachProspect(id);
    if (!prospect) return null;
    const nextStatus = ["Prospect", "Researched"].includes(prospect.status) ? "Contacted" : prospect.status;
    return updateOutreachProspect(id, {
      status: nextStatus,
      last_contacted_at: todayKey(),
      next_follow_up_at: prospect.nextFollowUpAtRaw || daysFromToday(7)
    });
  }

  function outreachQuotePayload(prospect) {
    const notes = [
      prospect.propertyName ? `Property: ${prospect.propertyName}` : "",
      prospect.managementCompany ? `Management company: ${prospect.managementCompany}` : "",
      prospect.address ? `Address: ${prospect.address}` : "",
      prospect.notes || ""
    ].filter(Boolean).join("\n");
    return {
      name: prospect.contactName || prospect.propertyName || "Outreach lead",
      email: prospect.email || null,
      phone: prospect.phone || null,
      property_type: prospect.propertyType || null,
      city: prospect.city || null,
      service: prospect.serviceInterest || null,
      source: "Outreach",
      status: "New",
      notes
    };
  }

  async function createQuoteFromOutreach(id) {
    const prospect = findOutreachProspect(id);
    if (!prospect) return null;
    if (prospect.convertedToQuote) {
      throw new Error("This prospect has already been converted to a quote lead.");
    }
    if (isDemoMode()) {
      const quote = normalizeSubmission({
        id: nextDemoId("quote"),
        ...outreachQuotePayload(prospect),
        created_at: new Date().toISOString()
      });
      state.data.submissions.unshift(quote);
      await updateOutreachProspect(id, { converted_to_quote: true, status: prospect.status === "Won" ? "Won" : "Quote Needed" });
      return quote;
    }
    const rows = await supabaseRestRequest("quote_submissions", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(outreachQuotePayload(prospect))
    });
    await updateOutreachProspect(id, { converted_to_quote: true, status: prospect.status === "Won" ? "Won" : "Quote Needed" });
    return normalizeSubmission(rows[0]);
  }

  async function addOutreachToRoute(id) {
    const prospect = findOutreachProspect(id);
    if (!prospect) return null;
    if (!prospect.address && !prospect.city) throw new Error("Add an address or city before adding this prospect to the route.");
    const stop = await insertRouteStop({
      client_name: prospect.propertyName || prospect.contactName || "Outreach prospect",
      address: prospect.address || prospect.city,
      service_type: prospect.serviceInterest || "General Property Care",
      estimated_minutes: 30,
      status: "Planned",
      notes: `Outreach prospect${prospect.managementCompany ? ` / ${prospect.managementCompany}` : ""}. ${prospect.notes || ""}`.trim()
    });
    await updateOutreachProspect(id, { route_added: true });
    return stop;
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

  function syncPanelGroup({ buttonSelector, panelSelector, stateKey, fallback, buttonDatasetKey, panelDatasetKey }) {
    const panels = qsa(panelSelector);
    if (!panels.length) return;
    const current = state[stateKey];
    const hasCurrent = panels.some((panel) => panel.dataset[panelDatasetKey] === current);
    if (!hasCurrent) state[stateKey] = fallback;
    qsa(buttonSelector).forEach((button) => {
      const isActive = button.dataset[buttonDatasetKey] === state[stateKey];
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    panels.forEach((panel) => {
      const isActive = panel.dataset[panelDatasetKey] === state[stateKey];
      panel.hidden = !isActive;
      panel.classList.toggle("is-active", isActive);
    });
  }

  function syncDashboardSubviewVisibility(scope = "all") {
    if (scope === "all" || scope === "outreach") {
      syncPanelGroup({
        buttonSelector: ".outreach-view-tabs [data-outreach-view]",
        panelSelector: "[data-outreach-view-panel]",
        stateKey: "outreachView",
        fallback: "pipeline",
        buttonDatasetKey: "outreachView",
        panelDatasetKey: "outreachViewPanel"
      });
    }
    if (scope === "all" || scope === "equipment") {
      syncPanelGroup({
        buttonSelector: "[data-equipment-view]",
        panelSelector: "[data-equipment-panel]",
        stateKey: "equipmentView",
        fallback: "inventory",
        buttonDatasetKey: "equipmentView",
        panelDatasetKey: "equipmentPanel"
      });
    }
  }

  function setLoginStatus(message, tone) {
    if (!els.loginStatus) return;
    els.loginStatus.textContent = message || "";
    els.loginStatus.dataset.tone = tone || "";
  }

  function showLogin() {
    document.body.classList.add("is-login-screen");
    els.loginView.hidden = false;
    els.appView.hidden = true;
  }

  async function showApp() {
    document.body.classList.remove("is-login-screen");
    els.loginView.hidden = true;
    els.appView.hidden = false;
    if (els.demoBadge) els.demoBadge.hidden = !isDemoMode();
    renderSidebarUserProfile();
    const profile = await loadCurrentUserProfile(getSession()).catch(() => null);
    if (profile) renderSidebarUserProfile(profile);
    syncDashboardSubviewVisibility();
    await refreshDashboard();
  }

  function setActiveSection(section) {
    const requestedSection = sectionAliases[section] || section || "overview";
    const hasSection = Boolean(qs(`[data-section="${cssEscape(requestedSection)}"]`));
    state.activeSection = hasSection ? requestedSection : "overview";
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
    setTimeout(() => {
      renderActiveRoutePreviews();
      if (!window.google?.maps) return;
      googleMapViews.forEach((view, key) => {
        if (!key.startsWith("preview-") || !view?.map) return;
        window.google.maps.event.trigger(view.map, "resize");
      });
    }, 100);
    syncDashboardSubviewVisibility();
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

  function matchesSearchValues(values, overrideQuery) {
    const query = String(overrideQuery ?? state.search).trim().toLowerCase();
    if (!query) return true;
    return values.some((value) => String(value || "").toLowerCase().includes(query));
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

  function isIncompleteJob(job) {
    return job.status !== "Completed";
  }

  function isOverdueJob(job) {
    return Boolean(job.dateRaw && job.dateRaw < todayKey() && isIncompleteJob(job));
  }

  function overdueJobs(data = state.data) {
    return data.jobs
      .filter(isOverdueJob)
      .filter(matchesSearch)
      .sort((a, b) => a.dateRaw.localeCompare(b.dateRaw));
  }

  function filteredDocuments() {
    return state.data.documents.filter(matchesSearch);
  }

  function filteredRouteStops(stops) {
    return stops.filter((stop) => matchesSearchValues([stop.clientName, stop.address, stop.serviceType, stop.notes, stop.status, stop.routeDate]));
  }

  function findOutreachProspect(id) {
    return state.data.outreachProspects.find((item) => item.id === id);
  }

  function outreachMatchesSearch(item) {
    const query = (state.outreachSearch || state.search || "").trim().toLowerCase();
    if (!query) return true;
    return [
      item.propertyName,
      item.contactName,
      item.managementCompany,
      item.email,
      item.phone,
      item.city,
      item.address,
      item.propertyType,
      item.serviceInterest,
      item.source,
      item.status,
      item.notes
    ].some((value) => String(value || "").toLowerCase().includes(query));
  }

  function isClosedOutreach(item) {
    return ["Won", "Lost / No Fit"].includes(item.status);
  }

  function filteredOutreachProspects(options = {}) {
    return state.data.outreachProspects.filter((item) => {
      const statusMatches = state.outreachStatusFilter === "All"
        || (state.outreachStatusFilter === "Active" ? OUTREACH_ACTIVE_STATUSES.includes(item.status) : item.status === state.outreachStatusFilter);
      const typeMatches = state.outreachTypeFilter === "All" || item.propertyType === state.outreachTypeFilter;
      const serviceMatches = state.outreachServiceFilter === "All" || item.serviceInterest === state.outreachServiceFilter;
      const priorityMatches = state.outreachPriorityFilter === "All" || item.priority === state.outreachPriorityFilter;
      const archiveMatches = options.archive ? isClosedOutreach(item) : !options.activeOnly || !isClosedOutreach(item);
      return archiveMatches && statusMatches && typeMatches && serviceMatches && priorityMatches && outreachMatchesSearch(item);
    });
  }

  function outreachCompanyPropertyCount(company) {
    const key = normalizeDedupeKey(company.company);
    return state.data.outreachProperties.filter((item) => item.companyId === company.id || normalizeDedupeKey(item.company) === key).length;
  }

  function outreachCompanyProspects(company) {
    const key = normalizeDedupeKey(company.company);
    return state.data.outreachProspects.filter((item) => normalizeDedupeKey(item.managementCompany) === key);
  }

  function outreachCompanyFollowUps(company) {
    const today = todayKey();
    const prospectsDue = outreachCompanyProspects(company).filter((item) => !isClosedOutreach(item) && item.nextFollowUpAtRaw && item.nextFollowUpAtRaw <= today).length;
    const companyDue = !isClosedOutreach(company) && company.followUpRaw && company.followUpRaw <= today ? 1 : 0;
    return companyDue + prospectsDue;
  }

  function outreachCompanyNextAction(company) {
    const dates = [company.followUpRaw, ...outreachCompanyProspects(company).map((item) => item.nextFollowUpAtRaw)].filter(Boolean).sort();
    if (dates.length) return formatDate(dates[0]);
    if (company.status === "Prospect") return "Research / call";
    if (company.status === "Interested") return "Create estimate";
    if (company.status === "Quote Needed") return "Send estimate";
    return "Not set";
  }

  function companyMatchesSearch(company) {
    const query = (state.outreachSearch || state.search || "").trim().toLowerCase();
    if (!query) return true;
    return [company.company, company.contact, company.email, company.phone, company.website, company.city, company.serviceArea, company.service, company.source, company.notes]
      .some((value) => String(value || "").toLowerCase().includes(query));
  }

  function propertyMatchesSearch(property) {
    const query = (state.outreachSearch || state.search || "").trim().toLowerCase();
    if (!query) return true;
    return [property.company, property.propertyName, property.address, property.city, property.neighborhood, property.visibleNeeds, property.serviceFit, property.notes, property.service]
      .some((value) => String(value || "").toLowerCase().includes(query));
  }

  function filteredOutreachCompanies() {
    return state.data.outreachCompanies.filter((company) => {
      const statusMatches = state.outreachStatusFilter === "All"
        || (state.outreachStatusFilter === "Active" ? OUTREACH_ACTIVE_STATUSES.includes(company.status) : company.status === state.outreachStatusFilter);
      const priorityMatches = state.outreachPriorityFilter === "All" || company.priority === state.outreachPriorityFilter;
      return statusMatches && priorityMatches && companyMatchesSearch(company);
    });
  }

  function filteredOutreachProperties() {
    return state.data.outreachProperties.filter((property) => {
      const companyMatches = state.outreachCompanyFilter === "All" || property.company === state.outreachCompanyFilter;
      const cityMatches = state.outreachCityFilter === "All" || property.city === state.outreachCityFilter;
      const neighborhoodMatches = state.outreachNeighborhoodFilter === "All" || property.neighborhood === state.outreachNeighborhoodFilter;
      const serviceMatches = state.outreachServiceFilter === "All" || property.service === state.outreachServiceFilter;
      const statusMatches = state.outreachStatusFilter === "All"
        || (state.outreachStatusFilter === "Active" ? OUTREACH_ACTIVE_STATUSES.includes(property.status) : property.status === state.outreachStatusFilter);
      const priorityMatches = state.outreachPriorityFilter === "All" || property.priority === state.outreachPriorityFilter;
      const needsMatches = !state.outreachVisibleNeedsFilter || property.visibleNeeds.toLowerCase().includes(state.outreachVisibleNeedsFilter.toLowerCase());
      const verifiedMatches = state.outreachVerifiedFilter === "All"
        || (state.outreachVerifiedFilter === "Verified" ? Boolean(property.verifiedAtRaw) : !property.verifiedAtRaw);
      return companyMatches && cityMatches && neighborhoodMatches && serviceMatches && statusMatches && priorityMatches && needsMatches && verifiedMatches && propertyMatchesSearch(property);
    });
  }

  function filteredReminders() {
    return state.data.reminders.filter(matchesSearch);
  }

  function filteredNotes() {
    return state.data.notes.filter(matchesSearch);
  }

  function contactNeedles(contact) {
    return [contact.name, contact.email, contact.phone, contact.city, contact.type];
  }

  function recordRelatesToContact(contact, values) {
    return hasLookupMatch(contactNeedles(contact), values);
  }

  function clientProfile(contact, data = state.data) {
    const quotes = data.submissions.filter((item) => recordRelatesToContact(contact, [item.name, item.email, item.phone, item.city, item.propertyType, item.service, item.notes]));
    const jobs = data.jobs.filter((job) => recordRelatesToContact(contact, [job.site, job.city, job.service]));
    const documents = data.documents.filter((doc) => recordRelatesToContact(contact, [doc.clientName, doc.clientEmail, doc.number, doc.squareInvoiceNumber, doc.notes]));
    const routeStops = data.routeStops.filter((stop) => recordRelatesToContact(contact, [stop.clientName, stop.address, stop.serviceType, stop.notes]));
    const reminders = data.reminders.filter((reminder) => recordRelatesToContact(contact, [reminder.task]));
    const notes = data.notes.filter((note) => recordRelatesToContact(contact, [note.title, note.body]));
    const tasks = data.operations.filter((task) => recordRelatesToContact(contact, [task.title, task.clientName, task.propertyAddress, task.description, task.notes]));
    const unpaidDocuments = documents.filter(isDocumentUnpaid);
    const amountOwedCents = unpaidDocuments.reduce((sum, doc) => sum + documentAmountOwedCents(doc), 0);
    const upcomingJobs = jobs.filter((job) => job.dateRaw && job.dateRaw >= todayKey()).sort((a, b) => a.dateRaw.localeCompare(b.dateRaw));
    const openFollowUps = reminders.filter((reminder) => reminder.status !== "Completed");
    return {
      contact,
      quotes,
      jobs,
      documents,
      routeStops,
      reminders,
      notes,
      tasks,
      unpaidDocuments,
      amountOwedCents,
      upcomingJobs,
      openFollowUps
    };
  }

  function miniCount(label, value) {
    return `<span class="profile-count"><strong>${escapeHtml(value)}</strong>${escapeHtml(label)}</span>`;
  }

  function renderMiniList(items, renderItem, emptyMessage, limit = 4) {
    if (!items.length) return emptyState(emptyMessage);
    return `<div class="profile-mini-list">${items.slice(0, limit).map(renderItem).join("")}</div>`;
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

  function googleMapOptions(options = {}) {
    const compact = Boolean(options.compact);
    return {
      center: PORTLAND_CENTER,
      zoom: options.zoom || 11,
      controlSize: compact ? 24 : 32,
      disableDefaultUI: compact,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: !compact,
      fullscreenControlOptions: {
        position: window.google.maps.ControlPosition.RIGHT_BOTTOM
      },
      rotateControl: false,
      scaleControl: false,
      zoomControl: false,
      clickableIcons: false,
      gestureHandling: compact ? "cooperative" : "greedy"
    };
  }

  function clearGoogleMapView(view) {
    if (!view) return;
    (view.markers || []).forEach((marker) => marker.setMap(null));
    if (view.line) view.line.setMap(null);
    view.markers = [];
    view.line = null;
  }

  async function ensureGoogleMapView(key, mapElement, options = {}) {
    if (!mapElement) return null;
    await loadGoogleMapsScript();
    const existing = googleMapViews.get(key);
    if (existing?.map && existing.mapElement === mapElement) return existing;
    clearGoogleMapView(existing);
    const view = {
      map: new window.google.maps.Map(mapElement, googleMapOptions(options)),
      mapElement,
      markers: [],
      line: null
    };
    googleMapViews.set(key, view);
    return view;
  }

  async function ensureGoogleRouteMap() {
    if (!els.routeMap) return null;
    const view = await ensureGoogleMapView("planner", els.routeMap, { compact: false });
    googleRouteMap = view?.map || null;
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

  async function renderGoogleRouteMapView({
    key,
    mapElement,
    statusElement,
    stops = [],
    compact = false,
    emptyText = "Add stops to preview today's route.",
    noPinsText = "Map pin needed.",
    errorText = "Google Maps could not load.",
    enableStopSelection = false
  }) {
    if (!mapElement) return;
    const shell = mapElement.closest(".dashboard-map-preview-shell");
    if (shell) {
      shell.classList.add("is-loading");
      shell.classList.remove("is-ready", "is-error");
    }
    if (statusElement) {
      statusElement.hidden = false;
      statusElement.textContent = compact ? "Loading Google Map..." : "Route map is loading.";
    }
    try {
      const view = await ensureGoogleMapView(key, mapElement, { compact });
      const map = view?.map;
      if (!map) {
        if (statusElement) statusElement.textContent = compact ? "Loading Google Map..." : "Route map is loading.";
        return;
      }

      clearGoogleMapView(view);

      const pinnedStops = stops.filter(hasRouteCoordinates);
      const missingPins = stops.filter((stop) => stop.address && !hasRouteCoordinates(stop));
      if (!stops.length) {
        if (statusElement) {
          statusElement.textContent = emptyText;
          statusElement.hidden = compact;
        }
        map.setCenter(PORTLAND_CENTER);
        map.setZoom(11);
        if (shell) shell.classList.add("is-ready");
        return;
      }
      if (!pinnedStops.length) {
        if (statusElement) {
          statusElement.textContent = noPinsText;
          statusElement.hidden = compact;
        }
        map.setCenter(PORTLAND_CENTER);
        map.setZoom(11);
        if (shell) shell.classList.add("is-ready");
        return;
      }

      if (statusElement) {
        statusElement.textContent = missingPins.length
          ? `${pinnedStops.length} pinned / ${missingPins.length} need pins.`
          : `${pinnedStops.length} stop${pinnedStops.length === 1 ? "" : "s"} mapped with Google Maps.`;
        statusElement.hidden = compact;
      }

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
          if (enableStopSelection) {
            state.selectedRouteStopId = stop.id;
            renderRoutePlanner();
            const card = qs(`[data-route-stop-card][data-id="${cssEscape(stop.id)}"]`);
            if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
          }
          setActiveSection("route-planner");
          history.replaceState(null, "", "#route-planner");
        });
        view.markers.push(marker);
      });

      if (path.length > 1) {
        let routePath = path;
        let routeLabel = "";
        try {
          if (statusElement && !compact) statusElement.textContent = "Previewing driving route...";
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
        view.line = new window.google.maps.Polyline({
          path: routePath,
          map,
          strokeColor: "#2f6b4f",
          strokeOpacity: .82,
          strokeWeight: compact ? 3 : 4
        });
        if (statusElement) {
          statusElement.textContent = routeLabel
            ? `${routeLabel}${missingPins.length ? ` / ${missingPins.length} need pins.` : ""}`
            : `${pinnedStops.length} stop${pinnedStops.length === 1 ? "" : "s"} mapped with Google driving directions.`;
          statusElement.hidden = compact;
        }
      }

      if (path.length === 1) {
        map.setCenter(path[0]);
        map.setZoom(13);
      } else {
        map.fitBounds(bounds, 52);
      }
      if (shell) shell.classList.add("is-ready");
    } catch (error) {
      if (shell) shell.classList.add("is-error");
      if (statusElement) {
        statusElement.hidden = false;
        statusElement.textContent = compact ? "Google Map unavailable. Check Maps API configuration." : (error.message || errorText);
      }
    } finally {
      if (shell) shell.classList.remove("is-loading");
    }
  }

  async function renderGoogleRouteMap(stops) {
    if (!els.routeMapStatus) return;
    await renderGoogleRouteMapView({
      key: "planner",
      mapElement: els.routeMap,
      statusElement: els.routeMapStatus,
      stops,
      compact: false,
      emptyText: "Add stops to preview today's route.",
      noPinsText: "Map pin needed.",
      enableStopSelection: true
    });
    const view = googleMapViews.get("planner");
    googleRouteMap = view?.map || null;
    googleRouteMarkers = view?.markers || [];
    googleRouteLine = view?.line || null;
  }

  function renderRouteMap(stops) {
    if (!els.routeMapStatus) return;
    renderGoogleRouteMap(stops);
  }

  function dashboardRouteStopsForDate(data = state.data, routeDate = todayKey()) {
    return data.routeStops
      .filter((stop) => stop.routeDate === routeDate)
      .sort((a, b) => a.stopOrder - b.stopOrder || a.createdAt.localeCompare(b.createdAt));
  }

  function routePreviewMapShell(key) {
    return `
      <div class="dashboard-map-preview-shell">
        <div class="dashboard-map-preview" data-route-preview-map="${escapeHtml(key)}"></div>
        <div class="dashboard-map-preview-message" data-route-preview-status="${escapeHtml(key)}" role="status">Loading Google Map...</div>
      </div>
    `;
  }

  function setRoutePreviewState(key, options) {
    routePreviewState.set(key, options);
    requestAnimationFrame(() => renderRoutePreview(key));
  }

  function renderRoutePreview(key) {
    const config = routePreviewState.get(key);
    if (!config || config.section !== state.activeSection) return;
    const mapElement = qs(`[data-route-preview-map="${cssEscape(key)}"]`);
    if (!mapElement) return;
    const statusElement = qs(`[data-route-preview-status="${cssEscape(key)}"]`);
    renderGoogleRouteMapView({
      key: `preview-${key}`,
      mapElement,
      statusElement,
      stops: config.stops || [],
      compact: true,
      emptyText: config.emptyText,
      noPinsText: "Map pin needed.",
      errorText: "Google Map unavailable. Check Maps API configuration.",
      enableStopSelection: false
    });
  }

  function renderActiveRoutePreviews() {
    routePreviewState.forEach((_, key) => renderRoutePreview(key));
  }

  function populatePropertyFilter(data) {
    if (!els.propertyFilter) return;
    const current = state.propertyFilter;
    const properties = Array.from(new Set(data.submissions.map((item) => item.propertyType).filter(Boolean))).sort();
    els.propertyFilter.innerHTML = `<option value="All">All Properties</option>${properties.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("")}`;
    els.propertyFilter.value = properties.includes(current) ? current : "All";
    state.propertyFilter = els.propertyFilter.value;
  }

  function currentUserProfile(data = state.data) {
    const session = getSession() || {};
    const profiles = data.userProfiles || [];
    return profiles.find((profile) => profile.userId && profile.userId === session.userId)
      || profiles.find((profile) => profile.email && profile.email.toLowerCase() === String(session.email || "").toLowerCase())
      || normalizeUserProfile({ id: session.userId, email: session.email, ...session.profile });
  }

  function renderCurrentProfileAvatar(data = state.data) {
    if (isDemoMode()) return renderSidebarUserProfile({ full_name: "Demo mode" });
    renderSidebarUserProfile(currentUserProfile(data));
  }

  function roleOptions(selectedRole) {
    const selected = normalizeDashboardRole(selectedRole);
    return DASHBOARD_ROLES.map((role) => `<option value="${escapeHtml(role)}"${role === selected ? " selected" : ""}>${escapeHtml(roleLabel(role))}</option>`).join("");
  }

  function formatAuditAction(action) {
    return String(action || "unknown").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function renderUsersAccess(data = state.data) {
    if (!els.usersAccessList) return;
    const profiles = data.userProfiles || [];
    const isAdmin = canManageUsers();
    if (els.usersAccessStatus) {
      els.usersAccessStatus.textContent = state.userProfilesReady
        ? "Invite users, assign dashboard roles, disable access, and manage safe profile avatars."
        : "User profile listing is limited until the profile SQL is installed or your role has access.";
    }

    const inviteForm = isAdmin ? `
      <form class="users-access-invite" data-users-invite-form>
        <label>
          <span>Email</span>
          <input type="email" name="email" placeholder="new.user@example.com" required>
        </label>
        <label>
          <span>Role</span>
          <select name="role">${roleOptions("viewer")}</select>
        </label>
        <button type="submit">Invite User</button>
      </form>
    ` : "";

    if (!profiles.length) {
      els.usersAccessList.innerHTML = `${inviteForm}${emptyState("No dashboard users found yet.")}`;
      return;
    }

    els.usersAccessList.innerHTML = `${inviteForm}${profiles.map((profile) => {
      const name = profile.name || profile.email || "Dashboard user";
      const subtitle = [profile.email, profile.title || roleLabel(profile.role)].filter(Boolean).join(" / ");
      const isDisabled = Boolean(profile.disabledAt);
      const canEdit = isAdmin && (profile.userId || profile.email);
      const canEditAccess = isAdmin && profile.userId;
      const canEditAvatar = (isAdmin && profile.userId) || profile.userId === getSession()?.userId;
      const isProtectedUser = String(profile.email || "").toLowerCase() === PROTECTED_USER_EMAIL;
      return `
        <article class="users-access-row${isDisabled ? " is-disabled" : ""}">
          <div class="users-access-identity">
            ${avatarMarkup(profile, "users-access-avatar")}
            <div>
              <strong>${escapeHtml(name)}</strong>
              <small>${escapeHtml(subtitle || "Dashboard user")}</small>
              <small>${escapeHtml(profile.lastLoginAt ? `Last login ${formatDate(profile.lastLoginAt)}` : profile.invitedAt ? `Invited ${formatDate(profile.invitedAt)}` : "No login recorded")}</small>
            </div>
          </div>
          <div class="users-access-meta">
            <span>${escapeHtml(isDisabled ? "Disabled" : roleLabel(profile.role))}</span>
            ${canEdit ? `<select data-user-role-select data-user-id="${escapeHtml(profile.userId)}" data-user-email="${escapeHtml(profile.email)}" aria-label="Change role for ${escapeHtml(name)}">${roleOptions(profile.role)}</select>` : ""}
            <small>${profile.avatarUpdatedAt ? `Avatar updated ${escapeHtml(formatDate(profile.avatarUpdatedAt))}` : "No uploaded avatar"}</small>
          </div>
          <div class="users-access-actions">
            <button class="inline-action" type="button" data-action="upload-user-avatar" data-user-id="${escapeHtml(profile.userId)}"${canEditAvatar ? "" : " disabled"}>Upload</button>
            <button class="inline-action" type="button" data-action="remove-user-avatar" data-user-id="${escapeHtml(profile.userId)}"${profile.avatarUrl && canEditAvatar ? "" : " disabled"}>Remove Avatar</button>
            ${canEditAccess ? `<button class="inline-action" type="button" data-action="${isDisabled ? "enable-dashboard-user" : "disable-dashboard-user"}" data-user-id="${escapeHtml(profile.userId)}" data-user-email="${escapeHtml(profile.email)}">${isDisabled ? "Enable" : "Disable"}</button>` : ""}
            ${profile.userId ? `<button class="inline-action" type="button" data-action="view-user-activity" data-user-id="${escapeHtml(profile.userId)}">Activity</button>` : ""}
            ${canEdit && isProtectedUser ? `<button class="inline-action" type="button" disabled title="The primary Urban Yards owner account cannot be removed.">Protected</button>` : ""}
            ${canEdit && !isProtectedUser ? `<button class="inline-action danger-action" type="button" data-action="remove-dashboard-user" data-user-id="${escapeHtml(profile.userId)}" data-user-email="${escapeHtml(profile.email)}">Remove User</button>` : ""}
          </div>
        </article>
      `;
    }).join("")}`;
    bindAvatarFallbacks(els.usersAccessList);
  }

  function renderActivityLog(data = state.data) {
    if (!els.activityLogList) return;
    const logs = data.auditLogs || [];
    if (!state.auditLogsReady) {
      els.activityLogList.innerHTML = emptyState("Activity log is limited until audit SQL is installed or your role has access.");
      return;
    }
    if (!logs.length) {
      els.activityLogList.innerHTML = emptyState("No audit activity recorded yet.");
      return;
    }
    els.activityLogList.innerHTML = logs.slice(0, 80).map((log) => `
      <article class="activity-log-row">
        <div>
          <strong>${escapeHtml(formatAuditAction(log.action))}</strong>
          <small>${escapeHtml([log.entity_type, log.entity_id].filter(Boolean).join(" / ") || "Dashboard")}</small>
        </div>
        <div>
          <span>${escapeHtml(log.actor_email || log.actor_role || "System")}</span>
          <small>${escapeHtml(log.created_at ? `${formatDate(log.created_at)} ${new Date(log.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : "")}</small>
        </div>
      </article>
    `).join("");
  }

  function renderMetrics(data) {
    const today = todayKey();
    const todayJobs = data.jobs.filter((item) => item.dateRaw === today && matchesSearch(item));
    const activeProperties = data.contacts.filter(matchesSearch).length + data.outreachProperties.filter((item) => matchesSearchValues([item.propertyName, item.address, item.city, item.company, item.neighborhood])).length;
    const unpaidInvoices = data.documents.filter((doc) => doc.type === "invoice" && doc.status !== "paid" && matchesSearchValues([doc.clientName, doc.number, doc.status, doc.notes]));
    const equipmentAlerts = data.operations.filter((item) => item.type === "equipment" && isOperationOpen(item) && matchesSearchValues([item.title, item.description, item.notes, item.status, item.priority])).length;
    const metrics = [
      {
        label: "Jobs Today",
        value: todayJobs.length,
        detail: todayJobs[0] ? `${todayJobs[0].site} / ${todayJobs[0].window}` : "No visits scheduled",
        icon: "jobs-calendar.svg",
        action: "go-calendar",
        link: "View all jobs"
      },
      {
        label: "Active Properties",
        value: activeProperties,
        detail: "Clients and managed properties",
        icon: "properties-building.svg",
        action: "go-contacts",
        link: "View all properties"
      },
      {
        label: "Waiting on Payment",
        value: unpaidInvoices.length,
        detail: unpaidInvoices[0] ? `${unpaidInvoices[0].clientName || "Client"} / ${unpaidInvoices[0].number || "Invoice"}` : "No open unpaid invoices",
        icon: "waiting-payment.svg",
        action: "go-documents",
        link: "Open invoices"
      },
      {
        label: "Equipment Alerts",
        value: equipmentAlerts,
        detail: equipmentAlerts ? "Review mower, tools, or supply checks" : "No equipment reminders",
        icon: "equipment-alert.svg",
        action: "quick-add-operation",
        link: "Add reminder"
      }
    ];

    els.metrics.innerHTML = metrics
      .map((metric) => `
        <article class="metric-card overview-summary-card home-snapshot-metric">
          <div class="overview-summary-icon" aria-hidden="true"><img src="${homeDashboardIcon(metric.icon)}" alt=""></div>
          <div class="overview-summary-body">
            <span>${escapeHtml(metric.label)}</span>
            <strong>${escapeHtml(metric.value)}</strong>
            <p>${escapeHtml(metric.detail)}</p>
            <button type="button" data-action="${escapeHtml(metric.action)}">${escapeHtml(metric.link)} <img src="${dashboardIcon("chevron-right.svg")}" alt="" aria-hidden="true"></button>
          </div>
        </article>
      `)
      .join("");
  }

  function renderSubmissions(data) {
    const activities = [
      ...data.jobs.filter((job) => job.dateRaw >= todayKey()).slice(0, 3).map((job) => ({
        title: job.site,
        detail: `${job.service} / ${job.window}`,
        context: job.city || "Work",
        action: "edit-job",
        id: job.id,
        icon: "calendar.svg"
      })),
      ...filteredSubmissions().slice(0, 3).map((item) => ({
        title: `${item.name} requested ${item.service}`,
        detail: `${item.city} / ${item.propertyType}`,
        context: "Quote",
        action: "open-submission",
        id: item.id,
        icon: "new-lead-user.svg"
      })),
      ...data.contacts.filter(matchesSearch).slice(0, 2).map((contact) => ({
        title: contact.name,
        detail: contact.propertyType || contact.address || "Client profile",
        context: "Property",
        action: "open-contact",
        id: contact.id,
        icon: "properties-building.svg"
      }))
    ].slice(0, 5);
    if (!activities.length) {
      els.submissions.innerHTML = emptyState("No recent activity matches this view yet.");
      return;
    }
    els.submissions.innerHTML = activities.map((item) => `
      <button class="overview-activity-row" type="button" data-action="${escapeHtml(item.action)}" data-id="${escapeHtml(item.id)}">
        <span class="overview-row-icon" aria-hidden="true"><img src="${dashboardIcon(item.icon)}" alt=""></span>
        <span class="overview-row-main">
          <strong>${escapeHtml(item.title)}</strong>
          <small>${escapeHtml(item.detail)}</small>
        </span>
        <span class="overview-row-context">${escapeHtml(item.context)}</span>
        <img class="overview-row-chevron" src="${dashboardIcon("chevron-right.svg")}" alt="" aria-hidden="true">
      </button>
    `).join("");
  }

  function taskDashboardCounts(data) {
    const completed = data.operations.filter((item) => item.status === "Done").length + data.reminders.filter((item) => item.status === "Completed").length;
    const inProgress = data.operations.filter((item) => item.status === "Waiting").length;
    const todo = data.operations.filter((item) => item.status === "Open").length + data.reminders.filter((item) => item.status !== "Completed").length + data.notes.length;
    return { completed, inProgress, todo };
  }

  function renderTaskDonut(counts) {
    const total = Math.max(counts.completed + counts.inProgress + counts.todo, 1);
    const completedDeg = Math.round((counts.completed / total) * 360);
    const progressDeg = Math.round(((counts.completed + counts.inProgress) / total) * 360);
    return `
      <div class="overview-task-donut" style="--completed-deg:${completedDeg}deg; --progress-deg:${progressDeg}deg">
        <strong>${escapeHtml(counts.completed)}</strong>
        <span>Completed</span>
      </div>
    `;
  }

  function renderTaskLegend(counts) {
    return `
      <div class="overview-task-legend">
        <span><i class="is-completed"></i>Completed <strong>${escapeHtml(counts.completed)}</strong></span>
        <span><i class="is-progress"></i>In Progress <strong>${escapeHtml(counts.inProgress)}</strong></span>
        <span><i class="is-todo"></i>To Do <strong>${escapeHtml(counts.todo)}</strong></span>
      </div>
      <button class="overview-task-link" type="button" data-action="quick-add-operation">View all tasks <img src="${dashboardIcon("chevron-right.svg")}" alt="" aria-hidden="true"></button>
    `;
  }

  function renderUpcoming(data) {
    const todayJobs = data.jobs.filter((job) => job.dateRaw === todayKey() && matchesSearch(job));
    if (!todayJobs.length) {
      els.upcoming.innerHTML = `
        <div class="home-empty-state home-schedule-empty">
          <img src="${homeDashboardIcon("empty-schedule.svg")}" alt="" aria-hidden="true">
          <strong>No jobs scheduled for today.</strong>
          <p>Use Add Job when a visit needs to land on the calendar.</p>
          <button class="inline-action" type="button" data-action="quick-add-job">Add Job</button>
        </div>
      `;
      return;
    }
    els.upcoming.innerHTML = todayJobs.slice(0, 5).map((job) => `
      <article class="job-card home-schedule-row ${isOverdueJob(job) ? "job-card-overdue" : ""}">
        <div class="item-topline">
          <div>
            <h4>${escapeHtml(job.site)}</h4>
            <div class="meta">${escapeHtml(job.date)} / ${escapeHtml(job.window)}</div>
          </div>
          ${statusBadge(job.status)}
        </div>
        <p class="item-body">${escapeHtml(job.service)} in ${escapeHtml(job.city)}</p>
        ${isOverdueJob(job) ? `<p class="job-overdue-note">Overdue: reschedule or mark complete.</p>` : ""}
      </article>
    `).join("");
  }

  function renderHomeReminders(data) {
    if (!els.homeReminders) return;
    const counts = taskDashboardCounts(data);
    els.homeReminders.innerHTML = `
      ${renderTaskDonut(counts)}
      ${renderTaskLegend(counts)}
    `;
  }

  function renderHomeNotes(data) {
    if (!els.homeNotes) return;
    const notes = data.notes.filter(matchesSearch).slice(0, 4);
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
    const stops = dashboardRouteStopsForDate(data, todayKey());
    if (!stops.length) {
      els.todayRouteSnapshot.innerHTML = `
        ${routePreviewMapShell("home")}
        <div class="home-empty-state compact">
          <strong>No route stops planned for today.</strong>
          <p>Add stops from a client, lead, or property when the route needs attention.</p>
        </div>
      `;
      setRoutePreviewState("home", {
        section: "overview",
        stops,
        emptyText: "No route stops planned for today."
      });
      return;
    }
    const openStops = stops.filter((stop) => stop.status !== "Complete");
    els.todayRouteSnapshot.innerHTML = `
      <article class="route-snapshot-card">
        ${routePreviewMapShell("home")}
        <strong>${openStops.length} open / ${stops.length} total</strong>
        <p>${escapeHtml(stops.slice(0, 3).map((stop) => stop.clientName).join(" / "))}${stops.length > 3 ? " / ..." : ""}</p>
        <button class="inline-action" type="button" data-action="go-route-planner">${buttonContent("Open Route Planner", "go-route-planner")}</button>
      </article>
    `;
    setRoutePreviewState("home", {
      section: "overview",
      stops,
      emptyText: "No route stops planned for today."
    });
  }

  function renderDashboardAlerts(data) {
    if (!els.dashboardAlerts) return;
    const today = todayKey();
    const soon = daysFromToday(7);
    const overdueVisits = overdueJobs(data);
    const overdueReminders = data.reminders.filter((item) => item.dueRaw && item.dueRaw < today && item.status !== "Completed");
    const overdueInvoices = data.documents.filter((item) => item.type === "invoice" && item.dueDateRaw && item.dueDateRaw < today && item.status !== "paid");
    const dueInvoices = data.documents.filter((item) => item.type === "invoice" && item.dueDateRaw && item.dueDateRaw <= soon && item.status !== "paid");
    const unsentQuotes = data.documents.filter((item) => item.type === "quote" && ["draft", "Draft", "New"].includes(item.status));
    const newQuotes = data.submissions.filter((item) => item.status === "New");
    const alerts = [
      overdueVisits.length ? `${overdueVisits.length} incomplete visit${overdueVisits.length === 1 ? "" : "s"} overdue` : "",
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

  function renderOverdueJobAlerts(data) {
    const jobs = overdueJobs(data);
    const targets = [els.overdueJobs, els.calendarOverdueJobs].filter(Boolean);
    if (!targets.length) return;
    const html = jobs.length ? `
      <article class="overdue-jobs-card">
        <div class="overdue-jobs-heading">
          <div>
            <strong>${jobs.length} overdue visit${jobs.length === 1 ? "" : "s"}</strong>
            <span>Past scheduled date and not marked complete.</span>
          </div>
        </div>
        <div class="overdue-jobs-list">
          ${jobs.slice(0, 6).map((job) => `
            <div class="overdue-job-item">
              <div>
                <strong>${escapeHtml(job.site)}</strong>
                <span>${escapeHtml(job.date)} / ${escapeHtml(job.window)} / ${escapeHtml(job.service)}</span>
              </div>
              <div class="overdue-job-actions">
                <button class="inline-action" type="button" data-action="reschedule-job" data-id="${escapeHtml(job.id)}">${buttonContent("Reschedule", "reschedule-job")}</button>
                <button class="inline-action" type="button" data-action="complete-job" data-id="${escapeHtml(job.id)}">${buttonContent("Complete", "complete-reminder")}</button>
              </div>
            </div>
          `).join("")}
        </div>
        ${jobs.length > 6 ? `<p class="small">Showing 6 of ${escapeHtml(jobs.length)} overdue visits.</p>` : ""}
      </article>
    ` : "";
    targets.forEach((target) => {
      target.innerHTML = html;
      target.hidden = !jobs.length;
    });
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

    const commandMatchesSearch = (item) => matchesSearchValues([item.label, item.title, item.detail, item.dueDate, item.priority, item.status, item.type]);
    const todayItems = [
      ...savedItems.filter((item) => (item.dueDateRaw && item.dueDateRaw <= today) || item.priority === "High"),
      ...commandItems.filter((item) => item.priority === "High")
    ]
      .filter(commandMatchesSearch)
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
    ].filter(commandMatchesSearch).slice(0, 10);
    const deadlineItems = [
      ...savedItems.filter((item) => item.dueDateRaw && item.dueDateRaw >= today && item.dueDateRaw <= next30),
      ...reminderDeadlineItems.filter((item) => item.dueDateRaw && item.dueDateRaw >= today && item.dueDateRaw <= next30),
      ...paymentItems.filter((item) => item.dueDateRaw && item.dueDateRaw >= today && item.dueDateRaw <= next30)
    ].filter(commandMatchesSearch).sort((a, b) => String(a.dueDateRaw || "9999").localeCompare(String(b.dueDateRaw || "9999"))).slice(0, 12);
    const equipmentItems = savedItems.filter((item) => item.type === "equipment").filter(commandMatchesSearch).slice(0, 10);

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

    els.commandToday.innerHTML = renderCommandList(todayItems, "No priority tasks for today.", 4);
    if (els.commandWaiting) els.commandWaiting.innerHTML = renderCommandList(waitingItems, "Nothing waiting right now.", 4);
    if (els.commandDeadlines) els.commandDeadlines.innerHTML = renderCommandList(deadlineItems, "No upcoming deadlines.", 4);
    if (els.commandEquipment) els.commandEquipment.innerHTML = renderCommandList(equipmentItems, "No equipment reminders.", 4);
  }

  function renderCommandList(items, emptyMessage, limit = 5) {
    if (!items.length) return `
      <div class="home-empty-state compact">
        <img src="${homeDashboardIcon("activity-check.svg")}" alt="" aria-hidden="true">
        <strong>${escapeHtml(emptyMessage)}</strong>
      </div>
    `;
    const visibleItems = items.slice(0, limit);
    const hiddenCount = Math.max(0, items.length - visibleItems.length);
    return `
      ${visibleItems.map((item) => `
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
      `).join("")}
      ${hiddenCount ? `<p class="dashboard-preview-note">${escapeHtml(hiddenCount)} more item${hiddenCount === 1 ? "" : "s"} in the full dashboard view.</p>` : ""}
    `;
  }

  function renderRoutePlanner() {
    if (!els.routeDate || !els.routeStops || !els.routeSummary) return;
    els.routeDate.value = state.routeDate;

    if (!state.routeStopsReady) {
      els.routeSummary.textContent = "Route Planner needs the route_stops table.";
      els.routeStops.innerHTML = emptyState("Create the route_stops table in Supabase, then refresh this dashboard.");
      return;
    }

    const stops = filteredRouteStops(selectedRouteStops());
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
        status: isOverdueJob(job) ? "Overdue" : job.status,
        action: isOverdueJob(job) ? "reschedule-job" : "edit-job",
        actionLabel: isOverdueJob(job) ? "Reschedule" : "Open"
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
    data.outreachProspects.forEach((prospect) => {
      if (prospect.nextFollowUpAtRaw && !isClosedOutreach(prospect)) {
        events.push({
          id: `outreach-${prospect.id}`,
          sourceId: prospect.id,
          type: "follow-up",
          date: prospect.nextFollowUpAtRaw,
          title: outreachTitle(prospect),
          client: "Outreach",
          property: prospect.city || prospect.propertyType,
          time: prospect.serviceInterest,
          status: prospect.status,
          action: "open-outreach-prospect",
          actionLabel: "Open"
        });
      }
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

  function renderWorkEmptyState(icon, title, detail, actionLabel, action) {
    return `
      <div class="work-empty-state">
        <img src="${workDashboardIcon(icon)}" alt="" aria-hidden="true">
        <strong>${escapeHtml(title)}</strong>
        ${detail ? `<p>${escapeHtml(detail)}</p>` : ""}
        ${actionLabel && action ? `<button class="inline-action" type="button" data-action="${escapeHtml(action)}">${escapeHtml(actionLabel)}</button>` : ""}
      </div>
    `;
  }

  function renderWorkSnapshot(data) {
    if (!els.workSnapshot) return;
    const today = todayKey();
    const weekEnd = addDaysKey(today, 7);
    const todayJobs = data.jobs.filter((job) => job.dateRaw === today && matchesSearch(job));
    const inProgressJobs = data.jobs.filter((job) => job.status === "In Progress" && matchesSearch(job));
    const completedJobs = data.jobs.filter((job) => job.status === "Completed" && matchesSearch(job));
    const followUps = [
      ...data.reminders.filter((item) => item.status !== "Completed" && item.dueRaw && item.dueRaw <= weekEnd),
      ...data.operations.filter((item) => item.type === "client" && isOperationOpen(item) && (!item.dueDateRaw || item.dueDateRaw <= weekEnd))
    ].filter((item) => matchesSearchValues([item.task, item.title, item.description, item.due, item.dueDate, item.status]));
    const metrics = [
      ["Jobs Today", todayJobs.length, todayJobs[0] ? `${todayJobs[0].site} / ${todayJobs[0].window}` : "No visits scheduled", "work-jobs-today.svg"],
      ["In Progress", inProgressJobs.length, "Jobs on the go", "work-in-progress.svg"],
      ["Completed", completedJobs.length, "Jobs completed", "work-completed.svg"],
      ["Follow-Ups", followUps.length, "Due this week", "work-follow-up.svg"]
    ];
    els.workSnapshot.innerHTML = metrics.map(([label, value, detail, icon]) => `
      <article class="work-snapshot-metric">
        <span class="work-metric-icon" aria-hidden="true"><img src="${workDashboardIcon(icon)}" alt=""></span>
        <div>
          <strong>${escapeHtml(value)}</strong>
          <span>${escapeHtml(label)}</span>
          <p>${escapeHtml(detail)}</p>
        </div>
      </article>
    `).join("");
  }

  function renderWorkSchedule(data) {
    if (!els.workSchedule) return;
    const jobs = data.jobs
      .filter((job) => job.dateRaw === todayKey() && matchesSearch(job))
      .sort((a, b) => a.window.localeCompare(b.window));
    if (!jobs.length) {
      els.workSchedule.innerHTML = renderWorkEmptyState("schedule-empty.svg", "No jobs scheduled for today.", "Add a job or schedule one for later.", "Add Job", "quick-add-job");
      return;
    }
    els.workSchedule.innerHTML = jobs.slice(0, 5).map((job) => `
      <button class="work-list-row" type="button" data-action="edit-job" data-id="${escapeHtml(job.id)}">
        <span class="work-row-icon" aria-hidden="true"><img src="${workDashboardIcon("activity-job-scheduled.svg")}" alt=""></span>
        <span>
          <strong>${escapeHtml(job.site)}</strong>
          <small>${escapeHtml(job.service)} / ${escapeHtml(job.window || "Time TBD")}</small>
        </span>
        <em>${escapeHtml(job.status)}</em>
      </button>
    `).join("");
  }

  function renderWorkRoute(data) {
    if (!els.workRoute) return;
    const stops = dashboardRouteStopsForDate(data, todayKey());
    if (!stops.length) {
      els.workRoute.innerHTML = `
        ${routePreviewMapShell("work")}
        ${renderWorkEmptyState("route.svg", "No route stops planned.", "Add stops to build your route.", "Open Route", "go-route-planner")}
      `;
      setRoutePreviewState("work", {
        section: "calendar",
        stops,
        emptyText: "No route stops planned."
      });
      return;
    }
    const openStops = stops.filter((stop) => stop.status !== "Complete");
    els.workRoute.innerHTML = `
      ${routePreviewMapShell("work")}
      <button class="work-route-summary" type="button" data-action="go-route-planner">
        <strong>${escapeHtml(openStops.length)} open / ${escapeHtml(stops.length)} total</strong>
        <span>${escapeHtml(stops.slice(0, 3).map((stop) => stop.clientName).join(" / "))}${stops.length > 3 ? " / ..." : ""}</span>
      </button>
    `;
    setRoutePreviewState("work", {
      section: "calendar",
      stops,
      emptyText: "No route stops planned."
    });
  }

  function renderWorkPipeline(data) {
    if (!els.workPipeline) return;
    const walkthrough = data.submissions.filter((item) => ["New", "Contacted"].includes(item.status) && matchesSearchValues([item.name, item.service, item.city, item.status]));
    const estimates = data.documents.filter((doc) => doc.type === "estimate" && doc.status !== "accepted" && matchesSearchValues([doc.clientName, doc.number, doc.status]));
    const scheduled = data.jobs.filter((job) => job.status === "Scheduled" && matchesSearch(job));
    const inProgress = data.jobs.filter((job) => job.status === "In Progress" && matchesSearch(job));
    const completed = data.jobs.filter((job) => job.status === "Completed" && matchesSearch(job));
    const rows = [
      ["Walkthrough", walkthrough, "Open quote requests", "pipeline-walkthrough.svg"],
      ["Estimate", estimates, "Quotes and estimates", "pipeline-estimate.svg"],
      ["Scheduled", scheduled, "Upcoming field work", "pipeline-scheduled.svg"],
      ["In Progress", inProgress, "Active visits", "work-in-progress.svg"],
      ["Completed", completed, "Finished work", "pipeline-completed.svg"]
    ];
    els.workPipeline.innerHTML = rows.map(([label, items, detail, icon]) => `
      <button class="work-pipeline-row" type="button" data-action="go-calendar">
        <span class="work-row-icon" aria-hidden="true"><img src="${workDashboardIcon(icon)}" alt=""></span>
        <span>
          <strong>${escapeHtml(label)}</strong>
          <small>${escapeHtml(items[0]?.site || items[0]?.clientName || items[0]?.name || detail)}</small>
        </span>
        <em>${escapeHtml(items.length)} jobs</em>
      </button>
    `).join("");
  }

  function renderWorkTasks(data) {
    if (!els.workTasks) return;
    const counts = taskDashboardCounts(data);
    els.workTasks.innerHTML = `
      ${renderTaskDonut(counts)}
      ${renderTaskLegend(counts)}
    `;
  }

  function renderWorkActivity(data) {
    if (!els.workActivity) return;
    const today = todayKey();
    const activities = [
      ...data.jobs.filter((job) => job.status === "Completed").slice(0, 1).map((job) => ({
        title: "Walkthrough completed",
        detail: job.site,
        time: job.date || "Recently",
        icon: "activity-walkthrough.svg",
        action: "edit-job",
        id: job.id
      })),
      ...data.jobs.filter((job) => job.dateRaw >= today).slice(0, 1).map((job) => ({
        title: "Job scheduled",
        detail: job.site,
        time: job.date,
        icon: "activity-job-scheduled.svg",
        action: "edit-job",
        id: job.id
      })),
      ...data.documents.filter((doc) => doc.type === "invoice").slice(0, 1).map((doc) => ({
        title: "Invoice sent",
        detail: doc.clientName || doc.number || "Invoice",
        time: doc.issueDate || "Recently",
        icon: "activity-invoice.svg",
        action: "open-document",
        id: doc.id
      })),
      ...data.reminders.filter((item) => item.status !== "Completed").slice(0, 1).map((item) => ({
        title: "Follow-up added",
        detail: item.task,
        time: item.due || "Due soon",
        icon: "activity-follow-up.svg",
        action: "go-settings",
        id: item.id
      }))
    ].slice(0, 4);
    if (!activities.length) {
      els.workActivity.innerHTML = renderWorkEmptyState("activity-job-scheduled.svg", "No recent work activity yet.", "Scheduled jobs and completed work will show here.", "", "");
      return;
    }
    els.workActivity.innerHTML = activities.map((item) => `
      <button class="work-activity-item" type="button" data-action="${escapeHtml(item.action)}" data-id="${escapeHtml(item.id)}">
        <span class="work-row-icon" aria-hidden="true"><img src="${workDashboardIcon(item.icon)}" alt=""></span>
        <strong>${escapeHtml(item.title)}</strong>
        <small>${escapeHtml(item.detail)}</small>
        <em>${escapeHtml(item.time)}</em>
      </button>
    `).join("");
  }

  function renderWorkPage(data) {
    renderWorkSnapshot(data);
    renderWorkSchedule(data);
    renderWorkRoute(data);
    renderWorkPipeline(data);
    renderWorkTasks(data);
    renderWorkActivity(data);
  }

  function renderCalendar(data) {
    if (!els.calendarList) return;
    renderWorkPage(data);
    let events = buildCalendarEvents(data);
    if (state.search.trim()) {
      events = events.filter((event) => matchesSearchValues([event.title, event.client, event.property, event.time, event.status, event.type, event.date]));
    }
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
        <td><strong>${escapeHtml(item.name)}</strong><br><span class="meta">${escapeHtml(item.email)}</span>${renderPhoneActions(item.phone, { leadId: item.id, leadType: "quote_submission", compact: true, helper: false })}</td>
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
      els.contacts.innerHTML = emptyState("No client/property profiles yet.");
      return;
    }
    els.contacts.innerHTML = contacts.map((contact) => {
      const profile = clientProfile(contact, data);
      const nextJob = profile.upcomingJobs[0];
      const routeStop = profile.routeStops.find((stop) => stop.routeDate >= todayKey()) || profile.routeStops[0];
      return `
      <article class="contact-card client-profile-card">
        <div class="client-profile-top">
          <div class="client-profile-identity">
            <p class="eyebrow">${escapeHtml(contact.type)}</p>
            <h4>${escapeHtml(contact.name)}</h4>
            <p>${escapeHtml(contact.city)}</p>
          </div>
          <div class="card-actions">
            ${statusSelect("contacts", contact.id, contact.status)}
            ${actionButton("Open", "open-contact", contact.id)}
            ${actionButton("Delete", "delete-contact", contact.id).replace("inline-action", "inline-action danger-action")}
          </div>
        </div>
        <div class="client-profile-contact-line">
          <span>${escapeHtml(contact.email)}</span>
          ${renderPhoneActions(contact.phone, { leadId: contact.id, leadType: "contact", compact: true, helper: false })}
        </div>
        <div class="client-profile-counts">
          ${miniCount("jobs", profile.jobs.length)}
          ${miniCount("quotes", profile.quotes.length)}
          ${miniCount("invoices/docs", profile.documents.length)}
          ${miniCount("route stops", profile.routeStops.length)}
          ${miniCount("follow-ups", profile.openFollowUps.length)}
        </div>
        <div class="client-profile-snapshot">
          <div><span>Next job</span><strong>${nextJob ? `${escapeHtml(nextJob.date)} / ${escapeHtml(nextJob.service)}` : "None scheduled"}</strong></div>
          <div><span>Route</span><strong>${routeStop ? `${escapeHtml(routeStop.routeDate)} / ${escapeHtml(routeStop.status)}` : "No route history"}</strong></div>
          <div><span>Square owed</span><strong>${escapeHtml(formatCurrency(profile.amountOwedCents, "USD"))}</strong></div>
        </div>
        <div class="client-profile-actions">
          <button class="inline-action" type="button" data-action="add-client-job" data-id="${escapeHtml(contact.id)}">${buttonContent("Schedule Job", "quick-add-job")}</button>
          <button class="inline-action" type="button" data-action="add-client-route" data-id="${escapeHtml(contact.id)}">${buttonContent("Route Stop", "go-route-planner")}</button>
          <button class="inline-action" type="button" data-action="add-client-follow-up" data-id="${escapeHtml(contact.id)}">${buttonContent("Follow-Up", "quick-add-follow-up")}</button>
          <button class="inline-action" type="button" data-action="add-client-document" data-id="${escapeHtml(contact.id)}">${buttonContent("Quote / Invoice", "quick-add-quote")}</button>
        </div>
      </article>
    `;
    }).join("");
  }

  function optionList(options, selected) {
    return options.map((option) => `<option value="${escapeHtml(option)}"${option === selected ? " selected" : ""}>${escapeHtml(option)}</option>`).join("");
  }

  function outreachStatusSelect(id, status) {
    const safeStatus = OUTREACH_STATUSES.includes(status) ? status : "Prospect";
    return `<select class="status-select outreach-status-select" data-outreach-status-id="${escapeHtml(id)}" aria-label="Update outreach status">${optionList(OUTREACH_STATUSES, safeStatus)}</select>`;
  }

  function outreachTitle(item) {
    return item.propertyName || item.contactName || item.managementCompany || "Unnamed prospect";
  }

  function outreachSubtitle(item) {
    return [item.managementCompany, item.contactName, item.city].filter(Boolean).join(" / ") || "No contact details yet";
  }

  function outreachDueProspects() {
    const today = todayKey();
    return state.data.outreachProspects
      .filter((item) => !isClosedOutreach(item) && item.nextFollowUpAtRaw && item.nextFollowUpAtRaw <= today && outreachMatchesSearch(item))
      .sort((a, b) => a.nextFollowUpAtRaw.localeCompare(b.nextFollowUpAtRaw));
  }

  function outreachHotProspects() {
    return state.data.outreachProspects
      .filter((item) => ["Interested", "Quote Needed"].includes(item.status) && outreachMatchesSearch(item))
      .sort((a, b) => {
        const prioritySort = OUTREACH_PRIORITIES.indexOf(a.priority) - OUTREACH_PRIORITIES.indexOf(b.priority);
        if (prioritySort) return prioritySort;
        return String(a.nextFollowUpAtRaw || "9999").localeCompare(String(b.nextFollowUpAtRaw || "9999"));
      });
  }

  function renderOutreachActions(item, compact = false) {
    const routeDisabled = state.routeStopsReady ? "" : " disabled title=\"Create the route_stops table first\"";
    return `
      <div class="outreach-actions">
        ${renderPhoneActions(item.phone, { leadId: item.id, leadType: "outreach_prospect", compact: true, helper: false })}
        ${actionButton(compact ? "Open" : "Edit", "open-outreach-prospect", item.id)}
        <details class="record-more-menu">
          <summary>More</summary>
          <div>
            ${actionButton("Mark Contacted", "mark-outreach-contacted", item.id)}
            <button class="inline-action" type="button" data-action="create-outreach-quote" data-id="${escapeHtml(item.id)}"${item.convertedToQuote ? " disabled" : ""}>${buttonContent(item.convertedToQuote ? "Quote Lead Created" : "Create Quote Lead", "create-outreach-quote")}</button>
            <button class="inline-action" type="button" data-action="route-outreach-prospect" data-id="${escapeHtml(item.id)}"${routeDisabled}>${buttonContent(item.routeAdded ? "Route Added" : "Add Route", "route-outreach-prospect")}</button>
          </div>
        </details>
      </div>
    `;
  }

  function renderOutreachCard(item, tone = "") {
    const checked = state.selectedOutreachIds.has(item.id) ? " checked" : "";
    return `
      <article class="outreach-card ${tone ? `outreach-card-${escapeHtml(tone)}` : ""}">
        <div class="item-topline">
          <div class="outreach-card-select-wrap">
            <input data-outreach-select type="checkbox" value="${escapeHtml(item.id)}" aria-label="Select ${escapeHtml(outreachTitle(item))}"${checked}>
            <div>
              <h4>${escapeHtml(outreachTitle(item))}</h4>
              <div class="meta">${escapeHtml(outreachSubtitle(item))}</div>
            </div>
          </div>
          ${outreachStatusSelect(item.id, item.status)}
        </div>
        <p class="item-body">${escapeHtml(item.serviceInterest)} / ${escapeHtml(item.propertyType)}</p>
        <p class="small">Follow-up: ${escapeHtml(item.nextFollowUpAt)} / Last contacted: ${escapeHtml(item.lastContactedAt)}</p>
        ${item.notes ? `<p class="small">${escapeHtml(item.notes)}</p>` : ""}
        ${renderOutreachActions(item, true)}
      </article>
    `;
  }

  function populateOutreachFilters(data) {
    if (!els.outreachTypeFilter || !els.outreachServiceFilter) return;
    const typeCurrent = state.outreachTypeFilter;
    const serviceCurrent = state.outreachServiceFilter;
    const types = Array.from(new Set([...OUTREACH_PROPERTY_TYPES, ...data.outreachProspects.map((item) => item.propertyType).filter(Boolean)])).sort();
    const services = Array.from(new Set([...OUTREACH_SERVICE_INTERESTS, ...data.outreachProspects.map((item) => item.serviceInterest).filter(Boolean)])).sort();
    els.outreachTypeFilter.innerHTML = `<option value="All">All Property Types</option>${types.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("")}`;
    els.outreachServiceFilter.innerHTML = `<option value="All">All Services</option>${services.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("")}`;
    els.outreachTypeFilter.value = types.includes(typeCurrent) ? typeCurrent : "All";
    els.outreachServiceFilter.value = services.includes(serviceCurrent) ? serviceCurrent : "All";
    state.outreachTypeFilter = els.outreachTypeFilter.value;
    state.outreachServiceFilter = els.outreachServiceFilter.value;

    const populateSelect = (element, label, values, current) => {
      if (!element) return "All";
      const unique = Array.from(new Set(values.filter(Boolean))).sort();
      element.innerHTML = `<option value="All">${escapeHtml(label)}</option>${unique.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("")}`;
      element.value = unique.includes(current) ? current : "All";
      return element.value;
    };
    state.outreachCompanyFilter = populateSelect(els.outreachPropertyCompanyFilter, "All Companies", data.outreachCompanies.map((item) => item.company).concat(data.outreachProperties.map((item) => item.company)), state.outreachCompanyFilter);
    state.outreachCityFilter = populateSelect(els.outreachPropertyCityFilter, "All Cities", data.outreachProperties.map((item) => item.city), state.outreachCityFilter);
    state.outreachNeighborhoodFilter = populateSelect(els.outreachPropertyNeighborhoodFilter, "All Neighborhoods", data.outreachProperties.map((item) => item.neighborhood), state.outreachNeighborhoodFilter);
  }

  function setOutreachViewVisibility() {
    syncDashboardSubviewVisibility("outreach");
  }

  function applyOutreachPreset(preset) {
    if (!preset) return;
    if (preset === "call-today" || preset === "follow-up-due") {
      state.outreachStatusFilter = "Active";
      state.outreachPriorityFilter = "All";
      state.outreachSearch = "";
    } else if (preset === "high-priority") {
      state.outreachStatusFilter = "Active";
      state.outreachPriorityFilter = "High";
      state.outreachSearch = "";
    } else if (preset === "quote-needed") {
      state.outreachStatusFilter = "Quote Needed";
      state.outreachPriorityFilter = "All";
      state.outreachSearch = "";
    } else if (preset === "interested") {
      state.outreachStatusFilter = "Interested";
      state.outreachPriorityFilter = "All";
      state.outreachSearch = "";
    } else if (preset === "unverified-properties") {
      state.outreachVerifiedFilter = "Unverified";
      state.outreachStatusFilter = "Active";
      state.outreachPriorityFilter = "All";
      state.outreachSearch = "";
    }
  }

  function renderOutreachCompanies() {
    if (!els.outreachCompanyTable) return;
    if (!state.outreachCompaniesReady) {
      const message = "Companies need the outreach_companies table. Run DASHBOARD_OUTREACH_SQL.md, then refresh.";
      els.outreachCompanyTable.innerHTML = `<tr><td colspan="8">${emptyState(message)}</td></tr>`;
      if (els.outreachCompanyCards) els.outreachCompanyCards.innerHTML = emptyState(message);
      return;
    }
    const companies = filteredOutreachCompanies();
    if (!companies.length) {
      els.outreachCompanyTable.innerHTML = `<tr><td colspan="8">${emptyState("No companies match this view yet.")}</td></tr>`;
      if (els.outreachCompanyCards) els.outreachCompanyCards.innerHTML = emptyState("No companies match this view yet.");
      return;
    }
    els.outreachCompanyTable.innerHTML = companies.map((company) => `
      <tr>
        <td><strong>${escapeHtml(company.company)}</strong><br><span class="meta">${escapeHtml([company.contact, company.serviceArea || company.city].filter(Boolean).join(" / ") || company.website || "No contact details")}</span></td>
        <td>${escapeHtml(outreachCompanyPropertyCount(company))}</td>
        <td>${escapeHtml(outreachCompanyProspects(company).length)}</td>
        <td>${escapeHtml(outreachCompanyFollowUps(company))}</td>
        <td>${escapeHtml(company.status)}</td>
        <td>${escapeHtml(company.priority)}</td>
        <td>${escapeHtml(outreachCompanyNextAction(company))}</td>
        <td><div class="outreach-actions">${renderPhoneActions(company.phone, { leadId: company.id, leadType: "outreach_company", compact: true, helper: false })}${actionButton("Open", "open-outreach-company", company.id)}</div></td>
      </tr>
    `).join("");
    if (els.outreachCompanyCards) {
      els.outreachCompanyCards.innerHTML = companies.map((company) => `
        <article class="outreach-card">
          <div class="item-topline"><div><h4>${escapeHtml(company.company)}</h4><div class="meta">${escapeHtml(company.serviceArea || company.city || "No service area")}</div></div><span class="status">${escapeHtml(company.status)}</span></div>
          <p class="item-body">${escapeHtml(company.contact || "No contact")} / ${escapeHtml(company.email || "No email")}</p>
          ${renderPhoneActions(company.phone, { leadId: company.id, leadType: "outreach_company", compact: true, helper: false })}
          <p class="small">${escapeHtml(outreachCompanyPropertyCount(company))} managed properties / ${escapeHtml(company.priority)} priority</p>
          ${actionButton("Open", "open-outreach-company", company.id)}
        </article>
      `).join("");
    }
  }

  function renderOutreachProperties() {
    if (!els.outreachPropertyTable) return;
    if (!state.outreachPropertiesReady) {
      const message = "Managed properties need the outreach_properties table. Run DASHBOARD_OUTREACH_SQL.md, then refresh.";
      els.outreachPropertyTable.innerHTML = `<tr><td colspan="12">${emptyState(message)}</td></tr>`;
      if (els.outreachPropertyCards) els.outreachPropertyCards.innerHTML = emptyState(message);
      return;
    }
    const properties = filteredOutreachProperties();
    const validIds = new Set(properties.map((property) => property.id));
    state.selectedOutreachPropertyIds.forEach((id) => {
      if (!validIds.has(id)) state.selectedOutreachPropertyIds.delete(id);
    });
    if (els.outreachPropertyBulkBar) els.outreachPropertyBulkBar.hidden = state.selectedOutreachPropertyIds.size === 0;
    if (els.outreachPropertySelectedCount) {
      const count = state.selectedOutreachPropertyIds.size;
      els.outreachPropertySelectedCount.textContent = `${count} selected`;
    }
    if (els.outreachPropertySelectAll) {
      els.outreachPropertySelectAll.checked = properties.length > 0 && properties.every((property) => state.selectedOutreachPropertyIds.has(property.id));
      els.outreachPropertySelectAll.indeterminate = properties.some((property) => state.selectedOutreachPropertyIds.has(property.id)) && !els.outreachPropertySelectAll.checked;
    }
    if (!properties.length) {
      els.outreachPropertyTable.innerHTML = `<tr><td colspan="12">${emptyState("No managed properties match this view yet.")}</td></tr>`;
      if (els.outreachPropertyCards) els.outreachPropertyCards.innerHTML = emptyState("No managed properties match this view yet.");
      return;
    }
    els.outreachPropertyTable.innerHTML = properties.map((property) => `
      <tr>
        <td><input data-outreach-property-select type="checkbox" value="${escapeHtml(property.id)}" aria-label="Select ${escapeHtml(property.propertyName)}"${state.selectedOutreachPropertyIds.has(property.id) ? " checked" : ""}></td>
        <td><strong>${escapeHtml(property.propertyName)}</strong><br><span class="meta">${escapeHtml(property.propertyType)}</span></td>
        <td>${escapeHtml(property.company)}</td>
        <td>${escapeHtml([property.address, property.city, property.state, property.zip].filter(Boolean).join(", "))}</td>
        <td>${escapeHtml(property.neighborhood)}</td>
        <td>${escapeHtml(property.serviceFit)}</td>
        <td>${escapeHtml(property.visibleNeeds)}</td>
        <td>${escapeHtml(property.status)}</td>
        <td>${escapeHtml(property.followUp)}</td>
        <td>${escapeHtml(property.priority)}</td>
        <td>${escapeHtml(property.verifiedAt)}</td>
        <td><div class="outreach-actions">${actionButton("Open", "open-outreach-property", property.id)}${actionButton("Delete", "delete-outreach-property", property.id).replace("inline-action", "inline-action danger-action")}</div></td>
      </tr>
    `).join("");
    if (els.outreachPropertyCards) {
      els.outreachPropertyCards.innerHTML = properties.map((property) => `
        <article class="outreach-card">
          <div class="item-topline"><div class="outreach-card-select-wrap"><input data-outreach-property-select type="checkbox" value="${escapeHtml(property.id)}" aria-label="Select ${escapeHtml(property.propertyName)}"${state.selectedOutreachPropertyIds.has(property.id) ? " checked" : ""}><div><h4>${escapeHtml(property.propertyName)}</h4><div class="meta">${escapeHtml(property.company)} / ${escapeHtml(property.city)}</div></div></div><span class="status">${escapeHtml(property.status)}</span></div>
          <p class="item-body">${escapeHtml(property.serviceFit || property.service)}</p>
          <p class="small">${escapeHtml(property.visibleNeeds || "No visible needs noted")} / ${escapeHtml(property.priority)} priority</p>
          <div class="outreach-actions">${actionButton("Open", "open-outreach-property", property.id)}${actionButton("Delete", "delete-outreach-property", property.id).replace("inline-action", "inline-action danger-action")}</div>
        </article>
      `).join("");
    }
  }

  function renderOutreach(data) {
    if (!els.outreachMetrics) return;
    populateOutreachFilters(data);
    setOutreachViewVisibility();
    if (els.outreachSearch && els.outreachSearch.value !== state.outreachSearch) els.outreachSearch.value = state.outreachSearch;
    if (els.outreachStatusFilter) els.outreachStatusFilter.value = state.outreachStatusFilter;
    if (els.outreachPriorityFilter) els.outreachPriorityFilter.value = state.outreachPriorityFilter;
    if (els.outreachCompanySearch && els.outreachCompanySearch.value !== state.outreachSearch) els.outreachCompanySearch.value = state.outreachSearch;
    if (els.outreachCompanyStatusFilter) els.outreachCompanyStatusFilter.value = state.outreachStatusFilter;
    if (els.outreachCompanyPriorityFilter) els.outreachCompanyPriorityFilter.value = state.outreachPriorityFilter;
    if (els.outreachPropertySearch && els.outreachPropertySearch.value !== state.outreachSearch) els.outreachPropertySearch.value = state.outreachSearch;
    if (els.outreachPropertyStatusFilter) els.outreachPropertyStatusFilter.value = state.outreachStatusFilter;
    if (els.outreachPropertyPriorityFilter) els.outreachPropertyPriorityFilter.value = state.outreachPriorityFilter;
    if (els.outreachPropertyNeedsFilter && els.outreachPropertyNeedsFilter.value !== state.outreachVisibleNeedsFilter) els.outreachPropertyNeedsFilter.value = state.outreachVisibleNeedsFilter;
    if (els.outreachPropertyVerifiedFilter) els.outreachPropertyVerifiedFilter.value = state.outreachVerifiedFilter;

    if (!state.outreachReady) {
      const message = "Outreach needs the outreach_prospects table. Run DASHBOARD_OUTREACH_SQL.md, then refresh.";
      els.outreachMetrics.innerHTML = "";
      if (els.outreachFollowups) els.outreachFollowups.innerHTML = emptyState(message);
      if (els.outreachHot) els.outreachHot.innerHTML = emptyState("No quote-ready leads.");
      if (els.outreachTable) els.outreachTable.innerHTML = `<tr><td colspan="6">${emptyState(message)}</td></tr>`;
      if (els.outreachCards) els.outreachCards.innerHTML = "";
      if (els.outreachArchive) els.outreachArchive.innerHTML = "";
      return;
    }

    const validIds = new Set(data.outreachProspects.map((item) => item.id));
    state.selectedOutreachIds.forEach((id) => {
      if (!validIds.has(id)) state.selectedOutreachIds.delete(id);
    });

    const active = data.outreachProspects.filter((item) => !isClosedOutreach(item));
    const due = outreachDueProspects();
    const hot = outreachHotProspects();
    const metrics = [
      { label: "Companies", value: data.outreachCompanies.length, icon: "properties-building.svg", detail: "Owner groups" },
      { label: "Properties", value: data.outreachProperties.length, icon: "add-property-building.svg", detail: "Managed locations" },
      { label: "Total Prospects", value: data.outreachProspects.length, icon: "new-lead-user.svg", detail: "Lead records" },
      { label: "Follow-ups Due", value: due.length, icon: "log-time-clock.svg", detail: "Needs contact" },
      { label: "Interested", value: data.outreachProspects.filter((item) => item.status === "Interested").length + data.outreachCompanies.filter((item) => item.status === "Interested").length + data.outreachProperties.filter((item) => item.status === "Interested").length, icon: "outreach-send.svg", detail: "Warm opportunities" }
    ];
    els.outreachMetrics.innerHTML = metrics.map((metric) => `
      <article class="outreach-metric-card">
        <span class="outreach-metric-icon" aria-hidden="true"><img src="${dashboardIcon(metric.icon)}" alt=""></span>
        <strong>${escapeHtml(metric.value)}</strong>
        <span>${escapeHtml(metric.label)}</span>
        <small>${escapeHtml(metric.detail)}</small>
      </article>
    `).join("");

    renderOutreachCompanies();
    renderOutreachProperties();

    if (els.outreachFollowups) {
      els.outreachFollowups.innerHTML = due.length ? due.slice(0, 6).map((item) => renderOutreachCard(item, "due")).join("") : emptyState("No follow-ups due.");
    }
    if (els.outreachHot) {
      els.outreachHot.innerHTML = hot.length ? hot.slice(0, 6).map((item) => renderOutreachCard(item, "hot")).join("") : emptyState("No quote-ready leads.");
    }

    const prospects = filteredOutreachProspects({ activeOnly: true }).filter((item) => !isClosedOutreach(item));
    const selectedVisibleCount = prospects.filter((item) => state.selectedOutreachIds.has(item.id)).length;
    if (els.outreachBulkBar) els.outreachBulkBar.hidden = state.selectedOutreachIds.size === 0;
    if (els.outreachSelectedCount) {
      const count = state.selectedOutreachIds.size;
      els.outreachSelectedCount.textContent = `${count} selected`;
    }
    if (els.outreachSelectAll) {
      els.outreachSelectAll.checked = Boolean(prospects.length && selectedVisibleCount === prospects.length);
      els.outreachSelectAll.indeterminate = Boolean(selectedVisibleCount && selectedVisibleCount < prospects.length);
      els.outreachSelectAll.disabled = !prospects.length;
    }
    if (!prospects.length) {
      if (els.outreachTable) els.outreachTable.innerHTML = `<tr><td colspan="6">${emptyState(active.length ? "No prospects match these filters." : "No prospects yet.")}</td></tr>`;
      if (els.outreachCards) els.outreachCards.innerHTML = emptyState(active.length ? "No prospects match these filters." : "No prospects yet.");
    } else {
      if (els.outreachTable) {
        els.outreachTable.innerHTML = prospects.map((item) => `
          <tr>
            <td><input data-outreach-select type="checkbox" value="${escapeHtml(item.id)}" aria-label="Select ${escapeHtml(outreachTitle(item))}"${state.selectedOutreachIds.has(item.id) ? " checked" : ""}></td>
            <td><strong>${escapeHtml(outreachTitle(item))}</strong><br><span class="meta">${escapeHtml(outreachSubtitle(item))}</span></td>
            <td>${escapeHtml(item.propertyType)}<br><span class="meta">${escapeHtml(item.serviceInterest)} / ${escapeHtml(item.priority)}</span></td>
            <td>${outreachStatusSelect(item.id, item.status)}</td>
            <td>${escapeHtml(item.nextFollowUpAt)}<br><span class="meta">Last: ${escapeHtml(item.lastContactedAt)}</span></td>
            <td>${renderOutreachActions(item)}</td>
          </tr>
        `).join("");
      }
      if (els.outreachCards) els.outreachCards.innerHTML = prospects.map((item) => renderOutreachCard(item)).join("");
    }

    const archive = data.outreachProspects.filter(isClosedOutreach).filter(outreachMatchesSearch);
    if (els.outreachArchiveCount) els.outreachArchiveCount.textContent = archive.length;
    if (els.outreachArchive) {
      els.outreachArchive.innerHTML = archive.length ? archive.map((item) => renderOutreachCard(item, "archive")).join("") : emptyState("No won or lost prospects yet.");
    }
  }

  function openOutreachDrawer(id = "") {
    if (!els.detailDrawer || !els.detailContent) return;
    const item = id ? findOutreachProspect(id) : null;
    const title = item ? "Edit Prospect" : "Add Prospect";
    openDetailDrawer();
    els.detailContent.innerHTML = `
      <div class="drawer-content outreach-drawer">
        <p class="eyebrow">Outreach</p>
        <h3>${escapeHtml(title)}</h3>
        <form class="drawer-form outreach-form" data-outreach-form data-id="${escapeHtml(item?.id || "")}">
          <label>Property name<input name="property_name" value="${escapeHtml(item?.propertyName || "")}" placeholder="Example: Cedar Court Apartments"></label>
          <label>Management company<input name="management_company" value="${escapeHtml(item?.managementCompany || "")}" placeholder="Company or owner group"></label>
          <label>Contact name<input name="contact_name" value="${escapeHtml(item?.contactName || "")}" placeholder="Primary contact"></label>
          <label>Email<input name="email" type="email" value="${escapeHtml(item?.email || "")}"></label>
          <label>Phone<input name="phone" value="${escapeHtml(item?.phone || "")}"></label>
          <label>Address<input name="address" value="${escapeHtml(item?.address || "")}" autocomplete="street-address" data-address-autocomplete></label>
          <label>City<input name="city" value="${escapeHtml(item?.city || "")}"></label>
          <label>Property type<select name="property_type">${optionList(OUTREACH_PROPERTY_TYPES, item?.propertyType || "Apartment")}</select></label>
          <label>Service interest<select name="service_interest">${optionList(OUTREACH_SERVICE_INTERESTS, item?.serviceInterest || "General Property Care")}</select></label>
          <label>Source<input name="source" value="${escapeHtml(item?.source || "")}" placeholder="Drive-by, referral, web search..."></label>
          <label>Status<select name="status">${optionList(OUTREACH_STATUSES, item?.status || "Prospect")}</select></label>
          <label>Priority<select name="priority">${optionList(OUTREACH_PRIORITIES, item?.priority || "Normal")}</select></label>
          <label>Last contacted<input name="last_contacted_at" type="date" value="${escapeHtml(item?.lastContactedAtRaw || "")}"></label>
          <label>Next follow-up<input name="next_follow_up_at" type="date" value="${escapeHtml(item?.nextFollowUpAtRaw || "")}"></label>
          <label class="span-full">Notes<textarea name="notes" rows="5">${escapeHtml(item?.notes || "")}</textarea></label>
          <div class="drawer-actions">
            <button type="submit">${buttonContent(item ? "Save Prospect" : "Add Prospect", "new-outreach-prospect")}</button>
            ${item ? `<button type="button" data-action="mark-outreach-contacted" data-id="${escapeHtml(item.id)}">${buttonContent("Mark Contacted", "mark-outreach-contacted")}</button>` : ""}
            ${item ? `<button type="button" data-action="create-outreach-quote" data-id="${escapeHtml(item.id)}"${item.convertedToQuote ? " disabled" : ""}>${buttonContent(item.convertedToQuote ? "Quote Lead Created" : "Create Quote Lead", "create-outreach-quote")}</button>` : ""}
            ${item ? `<button type="button" data-action="route-outreach-prospect" data-id="${escapeHtml(item.id)}"${state.routeStopsReady ? "" : " disabled"}>${buttonContent(item.routeAdded ? "Route Added" : "Add to Route", "route-outreach-prospect")}</button>` : ""}
            ${item ? `<button type="button" class="danger-action" data-action="delete-outreach-prospect" data-id="${escapeHtml(item.id)}">${buttonContent("Delete Prospect", "delete-outreach-prospect")}</button>` : ""}
          </div>
        </form>
        ${item ? renderCallPanel(callPanelContext("outreach_prospect", item.id)) : ""}
        ${item ? `<div data-call-outcome-slot></div>${renderCallHistory(item.id)}` : ""}
      </div>
    `;
  }

  function openOutreachImportPreview() {
    const preview = state.pendingOutreachImport;
    if (!preview || !els.detailDrawer || !els.detailContent) return;
    const invalidItems = preview.invalidRows.slice(0, 8).map((row) => `
      <div class="drawer-field">
        <span>Row ${escapeHtml(row.rowNumber)}</span>
        ${escapeHtml(row.label)} - ${escapeHtml(row.message)}
      </div>
    `).join("");
    openDetailDrawer();
    els.detailContent.innerHTML = `
      <div class="drawer-content outreach-drawer">
        <p class="eyebrow">Outreach Import Preview</p>
        <h3>Property CSV ready to review</h3>
        <div class="drawer-grid">
          <div class="drawer-field"><span>Total rows</span>${escapeHtml(preview.totalRows)}</div>
          <div class="drawer-field"><span>New companies</span>${escapeHtml(preview.newCompanies)}</div>
          <div class="drawer-field"><span>New properties</span>${escapeHtml(preview.newProperties)}</div>
          <div class="drawer-field"><span>Possible duplicates</span>${escapeHtml(preview.possibleDuplicates)}</div>
          <div class="drawer-field"><span>Rows missing address</span>${escapeHtml(preview.rowsMissingAddress)}</div>
          <div class="drawer-field"><span>Rows with invalid values</span>${escapeHtml(preview.invalidRows.length)}</div>
        </div>
        <p class="item-body">${escapeHtml(preview.validRows.length)} valid row${preview.validRows.length === 1 ? "" : "s"} will be imported. Duplicate matches will update the existing property record.</p>
        ${preview.invalidRows.length ? `
          <h4>Rows to skip</h4>
          <div class="drawer-grid">
            ${invalidItems}
          </div>
          ${preview.invalidRows.length > 8 ? `<p class="meta">Showing 8 of ${escapeHtml(preview.invalidRows.length)} skipped rows.</p>` : ""}
        ` : ""}
        <div class="drawer-actions">
          <button type="button" data-action="confirm-outreach-import"${preview.validRows.length ? "" : " disabled"}>${buttonContent("Import Valid Rows", "import-outreach-csv")}</button>
          <button type="button" class="secondary-action" data-action="cancel-outreach-import">${buttonContent("Cancel Import", "delete-outreach-prospect")}</button>
        </div>
      </div>
    `;
    setDashboardState(`Preview ready: ${preview.validRows.length} valid row${preview.validRows.length === 1 ? "" : "s"}, ${preview.invalidRows.length} invalid.`);
  }

  function openOutreachCompanyDrawer(id, editingPropertyId = "") {
    const company = state.data.outreachCompanies.find((item) => item.id === id);
    if (!company || !els.detailDrawer || !els.detailContent) return;
    const properties = state.data.outreachProperties.filter((property) => property.companyId === company.id || normalizeDedupeKey(property.company) === normalizeDedupeKey(company.company));
    const propertyForm = (property = null) => `
      <form class="drawer-form outreach-property-inline-form" data-outreach-property-form data-id="${escapeHtml(property?.id || "")}" data-company-id="${escapeHtml(company.id)}">
        <label>Property name<input name="property_name" value="${escapeHtml(property?.propertyName || "")}" placeholder="Managed property name"></label>
        <label>Address<input name="address" value="${escapeHtml(property?.address || "")}" placeholder="Street address"></label>
        <label>City<input name="city" value="${escapeHtml(property?.city || "")}" placeholder="City or service area"></label>
        <label>Neighborhood<input name="neighborhood" value="${escapeHtml(property?.neighborhood || "")}" placeholder="Neighborhood / location notes"></label>
        <label class="span-full">Notes<textarea name="notes" rows="3">${escapeHtml(property?.notes || "")}</textarea></label>
        <div class="drawer-actions span-full">
          <button type="submit">${buttonContent(property ? "Save Property" : "Add Managed Property", "complete-reminder")}</button>
          ${property ? `<button type="button" class="secondary-action" data-action="cancel-managed-property-edit" data-id="${escapeHtml(company.id)}">${buttonContent("Cancel", "delete-outreach-prospect")}</button>` : ""}
        </div>
      </form>
    `;
    openDetailDrawer();
    els.detailContent.innerHTML = `
      <div class="drawer-content outreach-drawer">
        <p class="eyebrow">Outreach Company</p>
        <h3>${escapeHtml(company.company)}</h3>
        <form class="drawer-form outreach-form" data-outreach-company-form data-id="${escapeHtml(company.id)}">
          <label>Company name<input name="company" value="${escapeHtml(company.company)}" required></label>
          <label>Contact<input name="contact" value="${escapeHtml(company.contact || "")}"></label>
          <label>Email<input name="email" type="email" value="${escapeHtml(company.email || "")}"></label>
          <label>Phone<input name="phone" value="${escapeHtml(company.phone || "")}"></label>
          <label>Website<input name="website" value="${escapeHtml(company.website || "")}"></label>
          <label>Service area<input name="service_area" value="${escapeHtml(company.serviceArea || company.city || "")}"></label>
          <label>Follow-up date<input name="follow_up" type="date" value="${escapeHtml(company.followUpRaw || "")}"></label>
          <label>Status<select name="status">${optionList(OUTREACH_STATUSES, company.status || "Prospect")}</select></label>
          <label>Priority<select name="priority">${optionList(OUTREACH_PRIORITIES, company.priority || "Normal")}</select></label>
          <label class="span-full">Notes<textarea name="notes" rows="4">${escapeHtml(company.notes || "")}</textarea></label>
          <div class="drawer-actions span-full">
            <button type="submit">${buttonContent("Save Changes", "complete-reminder")}</button>
            <button type="button" class="secondary-action" data-action="open-outreach-company" data-id="${escapeHtml(company.id)}">${buttonContent("Cancel", "delete-outreach-prospect")}</button>
            <button type="button" data-action="add-company-as-prospect" data-id="${escapeHtml(company.id)}">${buttonContent("Add Company as Prospect", "new-outreach-prospect")}</button>
          </div>
        </form>
        ${renderCallPanel(callPanelContext("outreach_company", company.id))}
        <div data-call-outcome-slot></div>
        ${renderCallHistory(company.id)}
        <h4>Managed properties (${properties.length})</h4>
        <div class="profile-mini-list">
          ${properties.length ? properties.map((property) => `
            ${editingPropertyId === property.id ? propertyForm(property) : `
              <div class="profile-mini-item outreach-managed-property">
                <strong>${escapeHtml(property.propertyName)}</strong>
                <span>${escapeHtml([property.address, property.city, property.neighborhood].filter(Boolean).join(" / ") || "No location details")}</span>
                <div class="outreach-actions">
                  <button class="inline-action" type="button" data-action="edit-managed-property" data-id="${escapeHtml(property.id)}" data-company-id="${escapeHtml(company.id)}">${buttonContent("Edit", "edit-outreach-prospect")}</button>
                  <button class="inline-action" type="button" data-action="add-property-as-prospect" data-id="${escapeHtml(property.id)}" data-company-id="${escapeHtml(company.id)}">${buttonContent("Add as Prospect", "new-outreach-prospect")}</button>
                </div>
              </div>
            `}
          `).join("") : emptyState("No managed properties attached yet.")}
        </div>
        <h4>Add managed property</h4>
        ${propertyForm()}
      </div>
    `;
  }

  function openOutreachPropertyDrawer(id) {
    const property = state.data.outreachProperties.find((item) => item.id === id);
    if (!property || !els.detailDrawer || !els.detailContent) return;
    openDetailDrawer();
    els.detailContent.innerHTML = `
      <div class="drawer-content outreach-drawer">
        <p class="eyebrow">Managed Property</p>
        <h3>${escapeHtml(property.propertyName)}</h3>
        <div class="drawer-grid">
          <div class="drawer-field"><span>Company</span>${escapeHtml(property.company || "Not set")}</div>
          <div class="drawer-field"><span>Address</span>${escapeHtml([property.address, property.city, property.state, property.zip].filter(Boolean).join(", ") || "Not set")}</div>
          <div class="drawer-field"><span>Neighborhood</span>${escapeHtml(property.neighborhood || "Not set")}</div>
          <div class="drawer-field"><span>Type / Units</span>${escapeHtml(property.propertyType)}${property.estimatedUnits ? ` / ${escapeHtml(property.estimatedUnits)} units` : ""}</div>
          <div class="drawer-field"><span>Status</span>${escapeHtml(property.status)}</div>
          <div class="drawer-field"><span>Follow-up</span>${escapeHtml(property.followUp)}</div>
          <div class="drawer-field"><span>Priority</span>${escapeHtml(property.priority)}</div>
          <div class="drawer-field"><span>Verified</span>${escapeHtml(property.verifiedAt)}</div>
          <div class="drawer-field"><span>Map pin</span>${property.lat !== null && property.lng !== null ? `${escapeHtml(property.lat)}, ${escapeHtml(property.lng)}` : "No lat/lng"}</div>
          <div class="drawer-field"><span>Google Maps</span>${property.googleMapsUrl ? `<a href="${escapeHtml(property.googleMapsUrl)}" target="_blank" rel="noopener noreferrer">Open map</a>` : "Not set"}</div>
          <div class="drawer-field"><span>Source</span>${property.sourceUrl ? `<a href="${escapeHtml(property.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(property.source || "Source")}</a>` : escapeHtml(property.source || "Not set")}</div>
        </div>
        <h4>Service fit</h4>
        <p class="item-body">${escapeHtml(property.serviceFit || property.service || "No service fit noted.")}</p>
        <h4>Visible needs</h4>
        <p class="item-body">${escapeHtml(property.visibleNeeds || "No visible needs noted.")}</p>
        <h4>Notes</h4>
        <p class="item-body">${escapeHtml(property.notes || "No property notes yet.")}</p>
        <div class="drawer-actions">
          <button type="button" data-action="route-outreach-property" data-id="${escapeHtml(property.id)}">${buttonContent("Add to Route", "route-outreach-prospect")}</button>
          <button type="button" data-action="geocode-outreach-property" data-id="${escapeHtml(property.id)}">${buttonContent("Find Map Pin", "find-stop-map")}</button>
          <button type="button" class="danger-action" data-action="delete-outreach-property" data-id="${escapeHtml(property.id)}">${buttonContent("Delete Property", "delete-outreach-property")}</button>
        </div>
      </div>
    `;
  }

  function renderJobs(data) {
    if (!els.jobs) return;
    const jobs = filteredJobs();
    if (!jobs.length) {
      els.jobs.innerHTML = emptyState("No scheduled jobs/visits yet.");
      return;
    }
    els.jobs.innerHTML = jobs.map((job) => `
      <article class="job-card ${isOverdueJob(job) ? "job-card-overdue" : ""}">
        <div class="item-topline">
          <div>
            <h4>${escapeHtml(job.site)}</h4>
            <div class="meta">${escapeHtml(job.date)} / ${escapeHtml(job.window)}</div>
          </div>
          ${statusSelect("scheduled_jobs", job.id, job.status)}
        </div>
        <p class="item-body">${escapeHtml(job.service)}<br>${escapeHtml(job.city)}</p>
        ${isOverdueJob(job) ? `<p class="job-overdue-note">Overdue: this visit passed its scheduled date and is not complete.</p>` : ""}
        <div class="job-actions">
          ${job.status !== "Completed" ? actionButton("Complete", "complete-job", job.id) : ""}
          ${isOverdueJob(job) ? actionButton("Reschedule", "reschedule-job", job.id) : ""}
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
    openDetailDrawer();
    els.detailContent.innerHTML = `
      <div class="drawer-content">
        <p class="eyebrow">Quote Detail</p>
        <h3>${escapeHtml(item.name)}</h3>
        ${statusBadge(item.status)}
        <div class="drawer-grid">
          <div class="drawer-field"><span>Email</span>${escapeHtml(item.email)}</div>
          <div class="drawer-field drawer-phone-field"><span>Phone</span>${escapeHtml(phoneInfo(item.phone).display)}</div>
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

        ${renderCallPanel(callPanelContext("quote_submission", item.id))}
        <div data-call-outcome-slot></div>
        ${renderCallHistory(item.id)}

        <form class="schedule-form" data-schedule-form>
          <h4>Create scheduled job/visit</h4>
          <input name="visit_date" type="date" required>
          <input name="visit_window" placeholder="Visit window, e.g. 9 AM - 11 AM">
          <input name="service" value="${escapeHtml(item.service)}" placeholder="Service">
          ${recurringFieldsMarkup()}
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
    const profile = clientProfile(contact);
    openDetailDrawer();
    els.detailContent.innerHTML = `
      <div class="drawer-content">
        <p class="eyebrow">Client / Property Profile</p>
        <h3>${escapeHtml(contact.name)}</h3>
        <div class="profile-drawer-metrics">
          ${miniCount("jobs", profile.jobs.length)}
          ${miniCount("route stops", profile.routeStops.length)}
          ${miniCount("quotes", profile.quotes.length)}
          ${miniCount("docs", profile.documents.length)}
          ${miniCount("open follow-ups", profile.openFollowUps.length)}
          ${miniCount("Square owed", formatCurrency(profile.amountOwedCents, "USD"))}
        </div>
        <form class="drawer-form" data-contact-edit data-id="${escapeHtml(contact.id)}">
          <label>Name<input name="name" value="${escapeHtml(contact.name)}" required></label>
          <label>Email<input name="email" type="email" value="${escapeHtml(contact.email === "No email" ? "" : contact.email)}"></label>
          <label>Phone<input name="phone" value="${escapeHtml(contact.phone === "No phone" ? "" : contact.phone)}"></label>
          <label>Property / area<input name="city" value="${escapeHtml(contact.city === "Not provided" ? "" : contact.city)}" autocomplete="street-address" data-address-autocomplete></label>
          <label>Type<input name="contact_type" value="${escapeHtml(contact.type === "Contact" ? "" : contact.type)}"></label>
          <label>Status<select name="status">${STATUSES.map((status) => `<option value="${status}"${status === contact.status ? " selected" : ""}>${status}</option>`).join("")}</select></label>
          <div class="drawer-actions">
            <button type="submit">${buttonContent("Save Client", "complete-reminder")}</button>
            <button type="button" data-action="add-client-job" data-id="${escapeHtml(contact.id)}">${buttonContent("Add Job", "quick-add-job")}</button>
            <button type="button" data-action="add-client-route" data-id="${escapeHtml(contact.id)}">${buttonContent("Route Stop", "go-route-planner")}</button>
            <button type="button" data-action="add-client-follow-up" data-id="${escapeHtml(contact.id)}">${buttonContent("Follow-Up", "quick-add-follow-up")}</button>
            <button type="button" data-action="add-client-document" data-id="${escapeHtml(contact.id)}">${buttonContent("Quote / Invoice", "quick-add-quote")}</button>
            <button type="button" class="danger-action" data-action="delete-contact" data-id="${escapeHtml(contact.id)}">${buttonContent("Delete Client", "delete-contact")}</button>
          </div>
        </form>
        ${renderCallPanel(callPanelContext("contact", contact.id))}
        <div data-call-outcome-slot></div>
        ${renderCallHistory(contact.id)}
        <div class="profile-drawer-grid">
          <section>
            <h4>Jobs / Visits</h4>
            ${renderMiniList(profile.jobs, (job) => `<button class="profile-mini-item" type="button" data-action="edit-job" data-id="${escapeHtml(job.id)}"><strong>${escapeHtml(job.date)}</strong><span>${escapeHtml(job.service)} / ${escapeHtml(job.status)}</span></button>`, "No jobs or visits yet.")}
          </section>
          <section>
            <h4>Quotes & Invoices</h4>
            ${renderMiniList(profile.documents, (doc) => `<button class="profile-mini-item" type="button" data-action="open-document" data-id="${escapeHtml(doc.id)}"><strong>${escapeHtml(doc.number)}</strong><span>${escapeHtml(doc.type)} / ${escapeHtml(doc.squareStatus || doc.status)} / ${escapeHtml(doc.squareAmountDueCents !== null ? formatCurrency(doc.squareAmountDueCents, doc.squareCurrency) : `$${doc.total.toFixed(2)}`)}</span></button>`, "No estimates or invoices yet.")}
          </section>
          <section>
            <h4>Quote Requests</h4>
            ${renderMiniList(profile.quotes, (item) => `<button class="profile-mini-item" type="button" data-action="open-submission" data-id="${escapeHtml(item.id)}"><strong>${escapeHtml(item.service)}</strong><span>${escapeHtml(item.status)} / ${escapeHtml(item.receivedAt)}</span></button>`, "No quote requests yet.")}
          </section>
          <section>
            <h4>Route History</h4>
            ${renderMiniList(profile.routeStops, (stop) => `<button class="profile-mini-item" type="button" data-action="go-route-planner"><strong>${escapeHtml(stop.routeDate || "No date")}</strong><span>${escapeHtml(stop.serviceType)} / ${escapeHtml(stop.status)}</span></button>`, "No route stops yet.")}
          </section>
          <section>
            <h4>Follow-Ups & Communication</h4>
            ${renderMiniList([...profile.openFollowUps, ...profile.tasks], (item) => `<div class="profile-mini-item"><strong>${escapeHtml(item.task || item.title)}</strong><span>${escapeHtml(item.due || item.dueDate || item.status || "Open")}</span></div>`, "No open follow-ups right now.")}
          </section>
          <section>
            <h4>Notes / Photo History</h4>
            ${renderMiniList(profile.notes, (note) => `<div class="profile-mini-item"><strong>${escapeHtml(note.title)}</strong><span>${escapeHtml(note.body)}</span></div>`, "No notes yet. Photo storage can be added later with Supabase Storage.")}
          </section>
        </div>
      </div>
    `;
  }

  function openJobDrawer(id, options = {}) {
    const job = state.data.jobs.find((item) => item.id === id);
    if (!job || !els.detailDrawer || !els.detailContent) return;
    state.selectedJobId = id;
    const isReschedule = Boolean(options.reschedule);
    const visitDateValue = isReschedule && isOverdueJob(job) ? todayKey() : toDateInputValue(job.dateRaw);
    openDetailDrawer();
    els.detailContent.innerHTML = `
      <div class="drawer-content">
        <p class="eyebrow">${isReschedule ? "Overdue Visit" : "Schedule Detail"}</p>
        <h3>${escapeHtml(isReschedule ? `Reschedule ${job.site}` : job.site)}</h3>
        ${isOverdueJob(job) ? `<p class="job-overdue-note">This visit was scheduled for ${escapeHtml(job.date)} and is not marked complete.</p>` : ""}
        <form class="drawer-form" data-job-edit-form>
          <label>Visit date
            <input name="visit_date" type="date" value="${escapeHtml(visitDateValue)}" required>
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
            <button type="submit">${buttonContent(isReschedule ? "Save New Date" : "Save Visit", "complete-reminder")}</button>
            ${job.status !== "Completed" ? `<button type="button" data-action="complete-job" data-id="${escapeHtml(job.id)}">${buttonContent("Mark Complete", "complete-reminder")}</button>` : ""}
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
    openDetailDrawer();
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
    state.selectedJobId = "";
    if (els.detailDrawer) els.detailDrawer.hidden = true;
    if (els.detailContent) els.detailContent.innerHTML = "";
    document.body.classList.remove("is-detail-drawer-open");
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

  async function exportBackendBackup() {
    if (isDemoMode()) {
      exportFullBackup();
      return;
    }
    const session = getSession();
    if (!session || !session.accessToken) throw new Error("Please sign in again.");
    const response = await fetch("/.netlify/functions/dashboard-export?table=all&format=json", {
      headers: { Authorization: `Bearer ${session.accessToken}` }
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};
    if (!response.ok) throw new Error(payload?.error || "Backend export failed.");
    downloadJson(`urban-yards-backend-export-${todayKey()}.json`, payload);
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
    const fallback = demoDashboardData();
    const restored = {};
    DASHBOARD_DATA_KEYS.forEach((key) => {
      restored[key] = Array.isArray(imported[key]) ? imported[key] : [];
    });
    restored.groundskeeperAi = imported.groundskeeperAi && typeof imported.groundskeeperAi === "object"
      ? imported.groundskeeperAi
      : fallback.groundskeeperAi;
    state.data = restored;
    await render();
    setDashboardState("Backup imported into demo mode.");
  }

  function itemTitle(item, type) {
    if (type === "settings") return item.label || item.setting_key || "Business fact";
    if (type === "faqs" || type === "savedAnswers") return item.question || "Saved question";
    return item.title || item.category || "AI entry";
  }

  function aiBadge(value, fallback) {
    const textValue = value || fallback;
    const tone = String(textValue || "").toLowerCase().replace(/\s+/g, "-");
    return `<span class="ai-badge ai-badge-${escapeHtml(tone)}">${escapeHtml(textValue)}</span>`;
  }

  function formatDollars(value) {
    const amount = Number(value || 0);
    if (!amount) return "";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  }

  function equipmentOptions(items, selected = "") {
    return items.map((item) => `<option value="${escapeHtml(item)}"${item === selected ? " selected" : ""}>${escapeHtml(item)}</option>`).join("");
  }

  function populateEquipmentControls(data) {
    qsa("[data-equipment-category-options], [data-hardware-category-options]").forEach((select) => {
      const current = select.value || "Miscellaneous";
      select.innerHTML = equipmentOptions(EQUIPMENT_CATEGORIES, current);
    });
    qsa(".equipment-form select[name='condition']").forEach((select) => {
      const current = select.value || "Good";
      select.innerHTML = equipmentOptions(EQUIPMENT_CONDITIONS, current);
    });
    qsa(".equipment-form select[name='status']").forEach((select) => {
      const current = select.value || "Ready";
      select.innerHTML = equipmentOptions(EQUIPMENT_STATUSES, current);
    });
    qsa(".equipment-form select[name='replacement_priority'], .hardware-guide-form select[name='priority']").forEach((select) => {
      const current = select.value || "Normal";
      select.innerHTML = equipmentOptions(EQUIPMENT_PRIORITIES, current);
    });
    qsa(".hardware-guide-form select[name='status']").forEach((select) => {
      const current = select.value || "Researching";
      select.innerHTML = equipmentOptions(HARDWARE_STATUSES, current);
    });
    if (els.equipmentCategoryFilter) {
      els.equipmentCategoryFilter.innerHTML = `<option value="All">All Categories</option>${equipmentOptions(EQUIPMENT_CATEGORIES, state.equipmentCategoryFilter)}`;
      els.equipmentCategoryFilter.value = state.equipmentCategoryFilter;
    }
    if (els.equipmentStatusFilter) {
      els.equipmentStatusFilter.innerHTML = `<option value="All">All Statuses</option>${equipmentOptions(EQUIPMENT_STATUSES, state.equipmentStatusFilter)}`;
      els.equipmentStatusFilter.value = state.equipmentStatusFilter;
    }
    if (els.equipmentConditionFilter) {
      els.equipmentConditionFilter.innerHTML = `<option value="All">All Conditions</option>${equipmentOptions(EQUIPMENT_CONDITIONS, state.equipmentConditionFilter)}`;
      els.equipmentConditionFilter.value = state.equipmentConditionFilter;
    }
    if (els.equipmentPriorityFilter) {
      els.equipmentPriorityFilter.innerHTML = `<option value="All">All Priorities</option>${equipmentOptions(EQUIPMENT_PRIORITIES, state.equipmentPriorityFilter)}`;
      els.equipmentPriorityFilter.value = state.equipmentPriorityFilter;
    }
    if (els.equipmentMaintenanceItemOptions) {
      els.equipmentMaintenanceItemOptions.innerHTML = data.equipmentItems.length
        ? data.equipmentItems.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join("")
        : `<option value="">Add inventory first</option>`;
    }
  }

  function equipmentStatusBadge(value) {
    return `<span class="ai-badge ai-badge-${escapeHtml(slug(value || "status"))}">${escapeHtml(value || "None")}</span>`;
  }

  function filteredEquipmentItems() {
    return state.data.equipmentItems.filter((item) => {
      const searchMatch = matchesSearchValues([item.name, item.category, item.brand, item.model, item.serialNumber, item.storageLocation, item.supplier, item.notes], state.equipmentSearch);
      return searchMatch
        && (state.equipmentCategoryFilter === "All" || item.category === state.equipmentCategoryFilter)
        && (state.equipmentStatusFilter === "All" || item.status === state.equipmentStatusFilter)
        && (state.equipmentConditionFilter === "All" || item.condition === state.equipmentConditionFilter)
        && (state.equipmentPriorityFilter === "All" || item.replacementPriority === state.equipmentPriorityFilter);
    });
  }

  function equipmentItemMeta(item) {
    return [item.brand, item.model, item.storageLocation, item.supplier].filter(Boolean).join(" Â· ");
  }

  function renderEquipmentActions(item) {
    return `<div class="equipment-actions">
      ${actionButton("Edit", "edit-equipment-item", item.id)}
      ${item.status !== "Ready" ? actionButton("Ready", "mark-equipment-ready", item.id) : ""}
      ${item.status !== "Needs Maintenance" ? actionButton("Needs Maint.", "mark-equipment-maintenance", item.id) : ""}
      ${actionButton("Delete", "delete-equipment-item", item.id)}
    </div>`;
  }

  function renderEquipmentCard(item) {
    return `<article class="equipment-card">
      <div class="equipment-card-head">
        <div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(equipmentItemMeta(item) || item.category)}</small></div>
        <span>${equipmentStatusBadge(item.status)}</span>
      </div>
      <p>${escapeHtml(item.notes || "No notes saved.")}</p>
      <div class="equipment-card-meta">
        <span>${escapeHtml(item.category)}</span>
        <span>${escapeHtml(item.condition)}</span>
        <span>Next: ${escapeHtml(item.nextMaintenanceRaw ? item.nextMaintenance : "Not set")}</span>
        <span>${escapeHtml(item.replacementPriority)} priority</span>
      </div>
      ${item.productUrl ? `<a href="${escapeHtml(item.productUrl)}" target="_blank" rel="noopener noreferrer">Open product link</a>` : ""}
      ${renderEquipmentActions(item)}
    </article>`;
  }

  function renderEquipmentInventory() {
    if (!els.equipmentTable || !els.equipmentCards) return;
    if (!state.equipmentReady) {
      const setup = "Create the equipment_items table with DASHBOARD_EQUIPMENT_SQL.md, then refresh.";
      els.equipmentTable.innerHTML = `<tr><td colspan="8">${emptyState(setup)}</td></tr>`;
      els.equipmentCards.innerHTML = emptyState(setup);
      return;
    }
    const items = filteredEquipmentItems();
    if (!items.length) {
      els.equipmentTable.innerHTML = `<tr><td colspan="8">${emptyState("No equipment matches this view yet.")}</td></tr>`;
      els.equipmentCards.innerHTML = emptyState("No equipment matches this view yet.");
      return;
    }
    els.equipmentTable.innerHTML = items.map((item) => `<tr>
      <td><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(equipmentItemMeta(item))}</small></td>
      <td>${escapeHtml(item.category)}</td>
      <td>${equipmentStatusBadge(item.condition)}</td>
      <td>${equipmentStatusBadge(item.status)}</td>
      <td>${escapeHtml(item.nextMaintenanceRaw ? item.nextMaintenance : "Not set")}</td>
      <td>${equipmentStatusBadge(item.replacementPriority)}</td>
      <td>${item.productUrl ? `<a href="${escapeHtml(item.productUrl)}" target="_blank" rel="noopener noreferrer">Open</a>` : "-"}</td>
      <td>${renderEquipmentActions(item)}</td>
    </tr>`).join("");
    els.equipmentCards.innerHTML = items.map(renderEquipmentCard).join("");
  }

  function renderEquipmentMaintenance() {
    if (!els.equipmentMaintenanceList) return;
    if (!state.equipmentMaintenanceReady) {
      els.equipmentMaintenanceList.innerHTML = emptyState("Create the equipment_maintenance table with DASHBOARD_EQUIPMENT_SQL.md, then refresh.");
      return;
    }
    const soon = daysFromToday(14);
    const dueItems = state.data.equipmentItems.filter((item) => ["Needs Maintenance", "Needs Repair"].includes(item.status) || (item.nextMaintenanceRaw && item.nextMaintenanceRaw <= soon));
    const records = state.data.equipmentMaintenance.slice(0, 20);
    const dueHtml = dueItems.length ? dueItems.map((item) => `<article class="equipment-card is-due">
      <div class="equipment-card-head"><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.category)}</small></div>${equipmentStatusBadge(item.status)}</div>
      <p>${escapeHtml(item.nextMaintenanceRaw ? `Next maintenance: ${item.nextMaintenance}` : "No next maintenance date set.")}</p>
      ${renderEquipmentActions(item)}
    </article>`).join("") : emptyState("No equipment is due for maintenance in the next two weeks.");
    const historyHtml = records.length ? records.map((record) => {
      const item = state.data.equipmentItems.find((equipment) => equipment.id === record.equipmentId);
      return `<article class="equipment-card">
        <div class="equipment-card-head"><div><strong>${escapeHtml(item?.name || record.equipmentName)}</strong><small>${escapeHtml(record.maintenanceType)} Â· ${escapeHtml(record.maintenanceDate)}</small></div><span>${escapeHtml(formatDollars(record.cost))}</span></div>
        <p>${escapeHtml(record.notes || "No notes saved.")}</p>
        <div class="equipment-card-meta"><span>${escapeHtml(record.performedBy || "Performed by not set")}</span><span>Next: ${escapeHtml(record.nextMaintenanceRaw ? record.nextMaintenance : "Not set")}</span></div>
      </article>`;
    }).join("") : emptyState("No maintenance history yet.");
    els.equipmentMaintenanceList.innerHTML = `<h4>Due / Repair Needed</h4>${dueHtml}<h4>Maintenance History</h4>${historyHtml}`;
  }

  function renderHardwareGuide() {
    if (!els.hardwareGuideList) return;
    if (!state.hardwareGuideReady) {
      els.hardwareGuideList.innerHTML = emptyState("Create the hardware_guide table with DASHBOARD_EQUIPMENT_SQL.md, then refresh.");
      return;
    }
    const items = state.data.hardwareGuide.filter((item) => matchesSearchValues([item.name, item.category, item.brand, item.model, item.recommendedUse, item.goodFor, item.notes], state.equipmentSearch));
    els.hardwareGuideList.innerHTML = items.length ? items.map((item) => `<article class="equipment-card">
      <div class="equipment-card-head"><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml([item.brand, item.model, item.supplier].filter(Boolean).join(" Â· ") || item.category)}</small></div>${equipmentStatusBadge(item.priority)}</div>
      <p>${escapeHtml(item.recommendedUse || item.notes || "No recommendation notes saved.")}</p>
      <div class="equipment-card-meta"><span>${escapeHtml(item.status)}</span><span>${escapeHtml(item.goodFor || "Use not set")}</span><span>${escapeHtml(formatDollars(item.estimatedPrice))}</span></div>
      <div class="equipment-actions">
        ${item.productUrl ? `<a class="inline-action" href="${escapeHtml(item.productUrl)}" target="_blank" rel="noopener noreferrer">Open Link</a>` : ""}
        ${actionButton("Edit", "edit-hardware-guide", item.id)}
        ${actionButton("Bought", "mark-hardware-bought", item.id)}
        ${actionButton("To Inventory", "convert-hardware-inventory", item.id)}
        ${actionButton("Delete", "delete-hardware-guide", item.id)}
      </div>
    </article>`).join("") : emptyState("No hardware guide items match this view yet.");
  }

  function renderEquipmentWishlist() {
    if (!els.equipmentWishlist) return;
    const guide = state.data.hardwareGuide.filter((item) => item.priority === "High" || item.status === "Recommended");
    const replacements = state.data.equipmentItems.filter((item) => item.condition === "Replace Soon" || item.replacementPriority === "High");
    const guideHtml = guide.map((item) => `<article class="equipment-card">
      <div class="equipment-card-head"><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.category)}</small></div>${equipmentStatusBadge(item.priority)}</div>
      <p>${escapeHtml(item.recommendedUse || item.notes || "Needed soon.")}</p>
      <div class="equipment-card-meta"><span>${escapeHtml(formatDollars(item.estimatedPrice))}</span><span>${escapeHtml(item.status)}</span></div>
      <div class="equipment-actions">${item.productUrl ? `<a class="inline-action" href="${escapeHtml(item.productUrl)}" target="_blank" rel="noopener noreferrer">Open Link</a>` : ""}${actionButton("To Inventory", "convert-hardware-inventory", item.id)}</div>
    </article>`);
    const replaceHtml = replacements.map((item) => `<article class="equipment-card">
      <div class="equipment-card-head"><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.category)}</small></div>${equipmentStatusBadge("Replace Soon")}</div>
      <p>${escapeHtml(item.notes || "Marked for replacement planning.")}</p>
      ${renderEquipmentActions(item)}
    </article>`);
    els.equipmentWishlist.innerHTML = guideHtml.concat(replaceHtml).join("") || emptyState("No high-priority purchases or replacement needs yet.");
  }

  function setEquipmentViewVisibility() {
    syncDashboardSubviewVisibility("equipment");
  }

  function renderEquipment(data = state.data) {
    if (!els.equipmentTable) return;
    populateEquipmentControls(data);
    setEquipmentViewVisibility();
    if (els.equipmentSearch && els.equipmentSearch.value !== state.equipmentSearch) els.equipmentSearch.value = state.equipmentSearch;
    renderEquipmentInventory();
    renderEquipmentMaintenance();
    renderHardwareGuide();
    renderEquipmentWishlist();
  }

  function equipmentPayloadFromForm(form) {
    const data = new FormData(form);
    return {
      name: String(data.get("name") || "").trim(),
      category: String(data.get("category") || "Miscellaneous"),
      brand: String(data.get("brand") || "").trim() || null,
      model: String(data.get("model") || "").trim() || null,
      serial_number: String(data.get("serial_number") || "").trim() || null,
      quantity: Number(data.get("quantity") || 1) || 1,
      condition: String(data.get("condition") || "Good"),
      status: String(data.get("status") || "Ready"),
      storage_location: String(data.get("storage_location") || "").trim() || null,
      purchase_date: String(data.get("purchase_date") || "") || null,
      purchase_price: Number(data.get("purchase_price") || 0) || null,
      supplier: String(data.get("supplier") || "").trim() || null,
      product_url: String(data.get("product_url") || "").trim() || null,
      image_url: String(data.get("image_url") || "").trim() || null,
      notes: String(data.get("notes") || "").trim() || null,
      last_maintenance_date: String(data.get("last_maintenance_date") || "") || null,
      next_maintenance_date: String(data.get("next_maintenance_date") || "") || null,
      replacement_priority: String(data.get("replacement_priority") || "Normal")
    };
  }

  function maintenancePayloadFromForm(form) {
    const data = new FormData(form);
    return {
      equipment_id: String(data.get("equipment_id") || ""),
      maintenance_date: String(data.get("maintenance_date") || todayKey()),
      maintenance_type: String(data.get("maintenance_type") || "Maintenance"),
      notes: String(data.get("notes") || "").trim() || null,
      cost: Number(data.get("cost") || 0) || null,
      performed_by: String(data.get("performed_by") || "").trim() || null,
      next_maintenance_date: String(data.get("next_maintenance_date") || "") || null
    };
  }

  function hardwarePayloadFromForm(form) {
    const data = new FormData(form);
    return {
      name: String(data.get("name") || "").trim(),
      category: String(data.get("category") || "Miscellaneous"),
      recommended_use: String(data.get("recommended_use") || "").trim() || null,
      brand: String(data.get("brand") || "").trim() || null,
      model: String(data.get("model") || "").trim() || null,
      estimated_price: Number(data.get("estimated_price") || 0) || null,
      priority: String(data.get("priority") || "Normal"),
      product_url: String(data.get("product_url") || "").trim() || null,
      supplier: String(data.get("supplier") || "").trim() || null,
      notes: String(data.get("notes") || "").trim() || null,
      status: String(data.get("status") || "Researching"),
      good_for: String(data.get("good_for") || "").trim() || null
    };
  }

  function renderAiRecord(item, type) {
    const body = item.content || item.value || item.answer || "";
    const meta = [item.category, item.source_url].filter(Boolean).join(" Â· ");
    return `<article class="groundskeeper-ai-record">
      <div class="groundskeeper-ai-record-head">
        <strong>${escapeHtml(itemTitle(item, type))}</strong>
        <span>${aiBadge(item.status, "draft")}${aiBadge(item.visibility === "internal" ? "Internal Only" : "Public Website", "Public Website")}</span>
      </div>
      ${meta ? `<small>${escapeHtml(meta)}</small>` : ""}
      <p>${escapeHtml(body || "No content saved yet.")}</p>
      <time>${escapeHtml(item.updated_at ? `Updated ${formatDate(item.updated_at)}` : "")}</time>
    </article>`;
  }

  function renderAiList(element, items, type, emptyMessage) {
    if (!element) return;
    if (!items.length) {
      element.innerHTML = emptyState(emptyMessage);
      return;
    }
    const limits = {
      settings: 5,
      knowledge: 5,
      faqs: 4,
      rules: 4,
      savedAnswers: 4
    };
    const limit = limits[type] || 5;
    const visibleItems = items.slice(0, limit);
    const hiddenCount = items.length - visibleItems.length;
    element.innerHTML = `${visibleItems.map((item) => renderAiRecord(item, type)).join("")}${hiddenCount > 0 ? `<div class="groundskeeper-ai-more">Showing ${visibleItems.length} of ${items.length} entries.</div>` : ""}`;
  }

  function renderGroundskeeperChat() {
    if (!els.groundskeeperChat) return;
    if (!state.groundskeeperMessages.length) {
      els.groundskeeperChat.innerHTML = `<article class="groundskeeper-chat-message is-assistant">Ask me to draft follow-ups, summarize leads, improve AI knowledge, or plan outreach. Dashboard mode can use internal-only knowledge.</article>`;
      return;
    }
    els.groundskeeperChat.innerHTML = state.groundskeeperMessages.map((message) => (
      `<article class="groundskeeper-chat-message is-${escapeHtml(message.role)}">${escapeHtml(message.content)}</article>`
    )).join("");
    els.groundskeeperChat.scrollTop = els.groundskeeperChat.scrollHeight;
  }

  function renderAiLogs(logs) {
    if (!els.aiLogsList) return;
    if (!logs.length) {
      els.aiLogsList.innerHTML = emptyState(state.groundskeeperAiReady ? "No AI questions logged yet." : "Create the Groundskeeper AI tables, then refresh this panel.");
      return;
    }
    const visibleLogs = logs.slice(0, 6);
    const hiddenLogCount = logs.length - visibleLogs.length;
    els.aiLogsList.innerHTML = `${visibleLogs.map((log) => `
      <article class="groundskeeper-ai-record">
        <div class="groundskeeper-ai-record-head">
          <strong>${escapeHtml(log.question || "Question")}</strong>
          <span>${aiBadge(log.mode || "public", "public")}</span>
        </div>
        <small>${escapeHtml([log.page, log.created_at ? formatDate(log.created_at) : ""].filter(Boolean).join(" Â· "))}</small>
        <p>${escapeHtml(log.answer || "No answer saved.")}</p>
        <div class="groundskeeper-ai-record-actions">
          <button class="inline-action" type="button" data-action="save-ai-log-knowledge" data-id="${escapeHtml(log.id)}">Save as Knowledge</button>
          <button class="inline-action" type="button" data-action="save-ai-log-rule" data-id="${escapeHtml(log.id)}">Save as Rule</button>
        </div>
      </article>
    `).join("")}${hiddenLogCount > 0 ? `<div class="groundskeeper-ai-more">Showing ${visibleLogs.length} of ${logs.length} recent questions.</div>` : ""}`;
  }

  const AI_SECTIONS = [
    { id: "training", icon: "TR", title: "AI Helper Training", table: "ai_training_rules", type: "trainingRules", description: "Train, test, approve, and publish how the public website helper responds to visitors." },
    { id: "assistant", icon: "AI", title: "Dashboard Assistant", table: "", type: "", description: "Ask for follow-up drafts, lead summaries, copy ideas, or outreach planning. Dashboard mode can use internal AI knowledge." },
    { id: "settings", icon: "BF", title: "Business Facts", table: "ai_settings", type: "settings", description: "Settings, service area, contact info, tone, quote process, and payment process." },
    { id: "knowledge", icon: "SK", title: "Services & Knowledge", table: "ai_knowledge", type: "knowledge", description: "Published and draft knowledge entries for services, site content, and business context." },
    { id: "faqs", icon: "FAQ", title: "Website FAQ", table: "ai_faqs", type: "faqs", description: "Visitor-facing questions and approved answers for the public helper." },
    { id: "rules", icon: "R", title: "AI Rules", table: "ai_rules", type: "rules", description: "Behavior rules, boundaries, tone, fallback guidance, and safety instructions." },
    { id: "savedAnswers", icon: "SA", title: "Saved Answers", table: "ai_saved_answers", type: "savedAnswers", description: "Reusable answers that can become official knowledge after review." },
    { id: "logs", icon: "IN", title: "Visitor Question Logs", table: "", type: "logs", description: "Review recent questions and turn good answers into official AI knowledge." }
  ];

  function aiSectionById(id) {
    return AI_SECTIONS.find((section) => section.id === id) || AI_SECTIONS[0];
  }

  function aiItemsForSection(ai, section) {
    if (section.id === "training") return ai.trainingRules || [];
    if (section.id === "logs") return ai.logs || [];
    if (section.id === "settings") return ai.settings || [];
    if (section.id === "knowledge") return ai.knowledge || [];
    if (section.id === "faqs") return ai.faqs || [];
    if (section.id === "rules") return ai.rules || [];
    if (section.id === "savedAnswers") return ai.savedAnswers || [];
    return [];
  }

  function aiItemText(item, type) {
    return [itemTitle(item, type), item.category, item.label, item.value, item.content, item.answer, item.question, item.notes, item.page, item.source_url].filter(Boolean).join(" ");
  }

  function trainingCategoryLabel(category) {
    return AI_TRAINING_CATEGORIES[String(category || "other").toLowerCase()] || AI_TRAINING_CATEGORIES.other;
  }

  function trainingStatusLabel(status) {
    return AI_TRAINING_STATUS_LABELS[String(status || "draft").toLowerCase()] || "Draft";
  }

  function trainingRulesByCategory(rules = []) {
    return Object.keys(AI_TRAINING_CATEGORIES).map((category) => ({
      category,
      label: trainingCategoryLabel(category),
      rules: rules.filter((rule) => String(rule.category || "other").toLowerCase() === category)
    })).filter((group) => group.rules.length);
  }

  function liveTrainingVersion(ai) {
    const version = (ai.versions || [])[0];
    const lastPublished = (ai.settings || []).find((item) => item.setting_key === "last_published_at");
    const publishedAt = version?.published_at || lastPublished?.value || "";
    return {
      label: publishedAt ? `Live helper version: ${formatDate(publishedAt)}${version?.published_at ? ` - ${new Date(version.published_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : ""}` : "Live helper version: Not published from dashboard yet",
      notes: version?.notes || "Approved training items become public only after Push to Live."
    };
  }

  function filteredAiItems(ai, section) {
    const search = normalizeLookup(state.groundskeeperAiSearch);
    const items = aiItemsForSection(ai, section);
    if (!search) return items;
    return items.filter((item) => normalizeLookup(aiItemText(item, section.type)).includes(search));
  }

  function renderAiNav(ai) {
    if (!els.aiNav) return;
    els.aiNav.innerHTML = AI_SECTIONS.map((section) => {
      const count = section.id === "assistant" ? state.groundskeeperMessages.length : aiItemsForSection(ai, section).length;
      const active = state.groundskeeperAiView === section.id ? " is-active" : "";
      return `<button type="button" class="ai-nav-item${active}" data-ai-view="${escapeHtml(section.id)}">
        <span class="ai-nav-icon">${escapeHtml(section.icon)}</span>
        <span>${escapeHtml(section.title)}</span>
        ${count ? `<strong>${escapeHtml(count)}</strong>` : ""}
      </button>`;
    }).join("");
  }

  function aiEditorDefaults(section) {
    return {
      table: section.table || "ai_knowledge",
      title: "",
      category: section.title,
      visibility: section.id === "rules" ? "internal" : "public",
      status: "draft",
      content: ""
    };
  }

  function aiFormValuesFromItem(item, section, overrides = {}) {
    const values = aiEditorDefaults(section);
    values.title = overrides.title || itemTitle(item, section.type);
    values.category = item.category || item.label || item.notes || section.title;
    values.visibility = item.visibility || values.visibility;
    values.status = overrides.status || item.status || values.status;
    values.content = overrides.content || item.content || item.value || item.answer || "";
    return values;
  }

  function renderAiEditorForm(section, values = aiEditorDefaults(section)) {
    return `<form class="groundskeeper-ai-form ai-command-editor" data-groundskeeper-entry-form>
      <label>Content Type
        <select name="table">
          <option value="ai_settings"${values.table === "ai_settings" ? " selected" : ""}>Business Fact / Setting</option>
          <option value="ai_knowledge"${values.table === "ai_knowledge" ? " selected" : ""}>Knowledge</option>
          <option value="ai_faqs"${values.table === "ai_faqs" ? " selected" : ""}>Website FAQ</option>
          <option value="ai_rules"${values.table === "ai_rules" ? " selected" : ""}>AI Rule</option>
          <option value="ai_saved_answers"${values.table === "ai_saved_answers" ? " selected" : ""}>Saved Answer</option>
        </select>
      </label>
      <label>Title / Question / Key
        <input name="title" required value="${escapeHtml(values.title)}" placeholder="Example: Pricing Guidance">
      </label>
      <label>Category / Label
        <input name="category" value="${escapeHtml(values.category)}" placeholder="Business Facts, Services, Quote Process...">
      </label>
      <label>Visibility
        <select name="visibility">
          <option value="public"${values.visibility === "public" ? " selected" : ""}>Public Website</option>
          <option value="internal"${values.visibility === "internal" ? " selected" : ""}>Internal Only</option>
        </select>
      </label>
      <label>Status
        <select name="status">
          <option value="draft"${values.status === "draft" ? " selected" : ""}>Draft</option>
          <option value="published"${values.status === "published" ? " selected" : ""}>Published</option>
          <option value="archived"${values.status === "archived" ? " selected" : ""}>Archived</option>
        </select>
      </label>
      <label class="span-full">Content / Answer / Rule
        <textarea name="content" rows="10" required placeholder="Write the approved fact, FAQ answer, rule, or saved response...">${escapeHtml(values.content)}</textarea>
      </label>
      <div class="ai-editor-actions span-full">
        <button type="submit" data-ai-save-status="draft"><span class="button-icon" aria-hidden="true">+</span><span>Save Draft</span></button>
        <button type="submit" data-ai-save-status="published"><span class="button-icon" aria-hidden="true">OK</span><span>Publish</span></button>
      </div>
    </form>`;
  }

  function renderAiEntryRows(items, section) {
    if (!items.length) return emptyState(state.groundskeeperAiSearch ? "No entries match that search." : "No entries saved yet.");
    return `<div class="ai-entry-list">
      ${items.map((item, index) => {
        const title = itemTitle(item, section.type);
        const body = item.content || item.value || item.answer || "";
        return `<article class="ai-entry-row">
          <div>
            <strong>${escapeHtml(title)}</strong>
            <p>${escapeHtml(body || "No content saved yet.")}</p>
          </div>
          <span>${escapeHtml(item.category || item.label || item.notes || section.title)}</span>
          <span>${aiBadge(item.visibility === "internal" ? "Internal Only" : "Public Website", "Public Website")}</span>
          <span>${aiBadge(item.status, "draft")}</span>
          <time>${escapeHtml(item.updated_at ? formatDate(item.updated_at) : "")}</time>
          <div class="ai-entry-actions">
            <button class="inline-action" type="button" data-action="edit-ai-entry" data-section="${escapeHtml(section.id)}" data-index="${escapeHtml(index)}">Edit</button>
            <button class="inline-action" type="button" data-action="duplicate-ai-entry" data-section="${escapeHtml(section.id)}" data-index="${escapeHtml(index)}">Duplicate</button>
            <button class="inline-action" type="button" data-action="archive-ai-entry" data-section="${escapeHtml(section.id)}" data-index="${escapeHtml(index)}">Archive</button>
          </div>
        </article>`;
      }).join("")}
    </div>`;
  }

  function renderAssistantWorkspace() {
    if (!els.aiMain) return;
    els.aiMain.innerHTML = `
      <section class="panel groundskeeper-ai-chat-panel ai-command-panel">
        <div class="panel-heading">
          <div>
            <h3>Dashboard Assistant</h3>
            <p>Internal copilot for follow-ups, lead summaries, website copy, and AI knowledge cleanup.</p>
          </div>
        </div>
        <div class="ai-quick-actions">
          ${["Draft follow-up", "Summarize lead", "Improve website copy", "Create FAQ answer", "Review visitor question", "Add service rule"].map((label) => `<button type="button" data-action="ai-quick-prompt" data-prompt="${escapeHtml(label)}">${escapeHtml(label)}</button>`).join("")}
        </div>
        <div class="groundskeeper-ai-chat" data-groundskeeper-chat></div>
        <form class="groundskeeper-ai-chat-form ai-command-chat-form" data-groundskeeper-chat-form>
          <textarea name="message" rows="5" placeholder="Ask The Groundskeeper to draft a follow-up, summarize a lead, improve website copy, or turn a visitor question into reusable knowledge..."></textarea>
          <button type="submit"><span class="button-icon" aria-hidden="true">-&gt;</span><span>Ask</span></button>
        </form>
      </section>`;
    els.groundskeeperChat = qs("[data-groundskeeper-chat]");
    renderGroundskeeperChat();
  }

  function renderKnowledgeWorkspace(ai, section) {
    if (!els.aiMain) return;
    const items = filteredAiItems(ai, section);
    els.aiMain.innerHTML = `
      <section class="panel ai-command-panel">
        <div class="ai-workspace-heading">
          <div>
            <p class="eyebrow">${escapeHtml(section.title)}</p>
            <h3>${escapeHtml(section.title)}</h3>
            <p>${escapeHtml(section.description)}</p>
          </div>
          <button type="button" data-action="new-ai-entry" data-section="${escapeHtml(section.id)}"><span class="button-icon" aria-hidden="true">+</span><span>New Entry</span></button>
        </div>
        ${renderAiEditorForm(section)}
        <div class="ai-entry-table-heading">
          <h4>Existing Entries</h4>
          <span>${escapeHtml(items.length)} shown</span>
        </div>
        ${renderAiEntryRows(items, section)}
      </section>`;
  }

  function renderLogWorkspace(ai) {
    if (!els.aiMain) return;
    const section = aiSectionById("logs");
    const logs = filteredAiItems(ai, section);
    els.aiMain.innerHTML = `
      <section class="panel ai-command-panel ai-log-queue">
        <div class="ai-workspace-heading">
          <div>
            <p class="eyebrow">Review Queue</p>
            <h3>Visitor Question Logs</h3>
            <p>Review recent public and dashboard questions, then save useful answers as official AI knowledge.</p>
          </div>
        </div>
        <div class="ai-log-list">
          ${logs.length ? logs.map((log) => `
            <article class="ai-log-item">
              <div>
                <strong>${escapeHtml(log.question || "Question")}</strong>
                <p>${escapeHtml(log.answer || "No suggested answer saved.")}</p>
                <small>${escapeHtml([log.page, log.mode, log.created_at ? formatDate(log.created_at) : ""].filter(Boolean).join(" / "))}</small>
              </div>
              <div class="ai-log-actions">
                <button class="inline-action" type="button" data-action="save-ai-log-faq" data-id="${escapeHtml(log.id)}">Save as FAQ</button>
                <button class="inline-action" type="button" data-action="save-ai-log-rule" data-id="${escapeHtml(log.id)}">Save as Rule</button>
                <button class="inline-action" type="button" data-action="save-ai-log-knowledge" data-id="${escapeHtml(log.id)}">Save as Knowledge</button>
                <button class="inline-action" type="button" data-action="dismiss-ai-log" data-id="${escapeHtml(log.id)}">Dismiss</button>
              </div>
            </article>
          `).join("") : emptyState(state.groundskeeperAiSearch ? "No logs match that search." : "No AI questions logged yet.")}
        </div>
      </section>`;
  }

  function renderAiWorkspace(ai) {
    renderAiNav(ai);
    const section = aiSectionById(state.groundskeeperAiView);
    if (section.id === "training") renderTrainingWorkspace(ai);
    else if (section.id === "assistant") renderAssistantWorkspace();
    else if (section.id === "logs") renderLogWorkspace(ai);
    else renderKnowledgeWorkspace(ai, section);
  }

  function aiItemFromAction(sectionId, index) {
    const section = aiSectionById(sectionId);
    const items = filteredAiItems(state.data.groundskeeperAi || {}, section);
    return { section, item: items[Number(index)] || null };
  }

  function fillAiEditor(section, item, overrides = {}) {
    state.groundskeeperAiView = section.id;
    renderAiWorkspace(state.data.groundskeeperAi || {});
    const form = qs("[data-groundskeeper-entry-form]");
    if (!form) return;
    const values = item ? aiFormValuesFromItem(item, section, overrides) : { ...aiEditorDefaults(section), ...overrides };
    form.table.value = values.table;
    form.title.value = values.title;
    form.category.value = values.category;
    form.visibility.value = values.visibility;
    form.status.value = values.status;
    form.content.value = values.content;
    form.title.focus();
  }

  function trainingSuggestionActions(messageIndex, suggestionIndex) {
    const actions = [
      ["tone", "Save as Tone Rule"],
      ["faq", "Save as FAQ"],
      ["other", "Save as Business Rule"],
      ["do_dont", "Save as Do/Don't Rule"]
    ];
    return `<div class="training-suggestion-actions">
      ${actions.map(([category, label]) => `<button class="inline-action" type="button" data-action="save-training-suggestion" data-message-index="${messageIndex}" data-suggestion-index="${suggestionIndex}" data-category="${category}">${label}</button>`).join("")}
      <button class="inline-action" type="button" data-action="ignore-training-suggestion" data-message-index="${messageIndex}" data-suggestion-index="${suggestionIndex}">Ignore</button>
    </div>`;
  }

  function renderTrainingMessages() {
    const messages = state.trainingMessages;
    if (!messages.length) {
      return `<article class="training-message is-assistant">
        <p>Tell me how the website helper should behave. I will turn your instruction into clean training rules you can save, approve, test, and push live.</p>
      </article>`;
    }
    return messages.map((message, messageIndex) => `
      <article class="training-message is-${escapeHtml(message.role)}">
        <p>${escapeHtml(message.content)}</p>
        ${message.suggestions?.length ? `<div class="training-suggestion-stack">
          ${message.suggestions.map((suggestion, suggestionIndex) => suggestion.ignored ? "" : `
            <div class="training-suggestion-card">
              <div>
                <span>${escapeHtml(trainingCategoryLabel(suggestion.category))}</span>
                <strong>${escapeHtml(suggestion.title || "Training suggestion")}</strong>
              </div>
              <p>${escapeHtml(suggestion.content || "")}</p>
              ${trainingSuggestionActions(messageIndex, suggestionIndex)}
            </div>
          `).join("")}
        </div>` : ""}
      </article>
    `).join("");
  }

  function trainingRuleCard(rule) {
    const status = String(rule.status || "draft").toLowerCase();
    return `<article class="training-rule-card">
      <div class="training-rule-card-head">
        <div>
          <strong>${escapeHtml(rule.title || "Training rule")}</strong>
          <small>${escapeHtml(trainingCategoryLabel(rule.category))} / Updated ${escapeHtml(rule.updated_at ? formatDate(rule.updated_at) : "recently")}</small>
        </div>
        <span class="training-status-badge is-${escapeHtml(status)}">${escapeHtml(trainingStatusLabel(status))}</span>
      </div>
      <p>${escapeHtml(rule.content || "No rule content saved yet.")}</p>
      <div class="training-rule-actions">
        <button class="inline-action" type="button" data-action="edit-training-rule" data-id="${escapeHtml(rule.id)}">Edit</button>
        ${status !== "approved" && status !== "live" ? `<button class="inline-action" type="button" data-action="approve-training-rule" data-id="${escapeHtml(rule.id)}">Approve</button>` : ""}
        <button class="inline-action" type="button" data-action="test-training-rule" data-id="${escapeHtml(rule.id)}">Test</button>
        ${status !== "archived" ? `<button class="inline-action" type="button" data-action="archive-training-rule" data-id="${escapeHtml(rule.id)}">Archive</button>` : ""}
      </div>
    </article>`;
  }

  function renderTrainingLibrary(ai) {
    const search = normalizeLookup(state.groundskeeperAiSearch);
    const rules = (ai.trainingRules || []).filter((rule) => {
      if (!search) return true;
      return normalizeLookup([rule.title, rule.category, rule.content, rule.status].filter(Boolean).join(" ")).includes(search);
    });
    const activeRules = rules.filter((rule) => String(rule.status || "").toLowerCase() !== "archived");
    const archivedCount = rules.length - activeRules.length;
    const groups = trainingRulesByCategory(activeRules);
    if (!groups.length) {
      return emptyState(search ? "No training rules match that search." : "No training rules saved yet. Use the training chat to create your first draft rule.");
    }
    return `${groups.map((group) => `
      <section class="training-library-group">
        <div class="training-library-group-head">
          <h4>${escapeHtml(group.label)}</h4>
          <span>${escapeHtml(group.rules.length)} item${group.rules.length === 1 ? "" : "s"}</span>
        </div>
        ${group.rules.map(trainingRuleCard).join("")}
      </section>
    `).join("")}${archivedCount ? `<p class="training-library-footnote">${escapeHtml(archivedCount)} archived item${archivedCount === 1 ? "" : "s"} hidden from the active library.</p>` : ""}`;
  }

  function renderTrainingPreviewMessages() {
    if (!state.trainingPreviewMessages.length) {
      return `<article class="training-preview-message is-assistant">Ask a sample visitor question to see how the public website helper would respond.</article>`;
    }
    return state.trainingPreviewMessages.map((message) => (
      `<article class="training-preview-message is-${escapeHtml(message.role)}">${escapeHtml(message.content)}</article>`
    )).join("");
  }

  function renderTrainingEditorModal(ai) {
    const rule = (ai.trainingRules || []).find((item) => item.id === state.trainingEditingRuleId);
    if (!rule) return "";
    return `<div class="ai-training-modal" role="dialog" aria-modal="true" aria-label="Edit training rule">
      <form class="ai-training-modal-card" data-training-rule-form data-id="${escapeHtml(rule.id)}">
        <div class="ai-training-modal-head">
          <div>
            <p class="eyebrow">Rule Editor</p>
            <h3>Edit Training Rule</h3>
          </div>
          <button class="inline-action" type="button" data-action="close-training-modal">Close</button>
        </div>
        <label>Title
          <input name="title" required value="${escapeHtml(rule.title || "")}">
        </label>
        <label>Category
          <select name="category">
            ${Object.entries(AI_TRAINING_CATEGORIES).map(([value, label]) => `<option value="${escapeHtml(value)}"${String(rule.category || "other").toLowerCase() === value ? " selected" : ""}>${escapeHtml(label)}</option>`).join("")}
          </select>
        </label>
        <label>Status
          <select name="status">
            ${["draft", "approved", "live", "archived"].map((status) => `<option value="${status}"${String(rule.status || "draft").toLowerCase() === status ? " selected" : ""}>${escapeHtml(trainingStatusLabel(status))}</option>`).join("")}
          </select>
        </label>
        <label>Priority
          <input name="priority" type="number" min="1" max="999" value="${escapeHtml(rule.priority || 50)}">
        </label>
        <label class="span-full">Training guidance
          <textarea name="content" rows="8" required>${escapeHtml(rule.content || "")}</textarea>
        </label>
        <div class="ai-training-modal-actions span-full">
          <button type="submit"><span class="button-icon" aria-hidden="true">OK</span><span>Save Rule</span></button>
          <button class="inline-action" type="button" data-action="close-training-modal">Cancel</button>
        </div>
      </form>
    </div>`;
  }

  function renderPublishModal(ai) {
    if (!state.trainingPublishModalOpen) return "";
    const approved = (ai.trainingRules || []).filter((rule) => String(rule.status || "").toLowerCase() === "approved");
    return `<div class="ai-training-modal" role="dialog" aria-modal="true" aria-label="Push AI helper training live">
      <div class="ai-training-modal-card">
        <div class="ai-training-modal-head">
          <div>
            <p class="eyebrow">Publish Controls</p>
            <h3>Push Approved Rules Live?</h3>
          </div>
          <button class="inline-action" type="button" data-action="close-training-modal">Close</button>
        </div>
        <p class="training-publish-copy">This will publish ${escapeHtml(approved.length)} approved training item${approved.length === 1 ? "" : "s"} to the public website helper. Draft items will stay private.</p>
        <div class="training-publish-list">
          ${approved.length ? approved.map((rule) => `<span>${escapeHtml(rule.title || "Training rule")}</span>`).join("") : "<span>No approved items are ready to publish.</span>"}
        </div>
        <div class="ai-training-modal-actions">
          <button type="button" data-action="confirm-publish-training" ${approved.length ? "" : "disabled"}><span class="button-icon" aria-hidden="true">OK</span><span>Push to Live</span></button>
          <button class="inline-action" type="button" data-action="close-training-modal">Cancel</button>
        </div>
      </div>
    </div>`;
  }

  function renderTrainingWorkspace(ai) {
    if (!els.aiMain) return;
    const version = liveTrainingVersion(ai);
    const approvedCount = (ai.trainingRules || []).filter((rule) => String(rule.status || "").toLowerCase() === "approved").length;
    els.aiMain.innerHTML = `
      <div class="ai-training-studio">
        <section class="panel ai-training-chat-panel">
          <div class="ai-training-panel-head">
            <div>
              <p class="eyebrow">Private Training Room</p>
              <h3>Conversational Trainer</h3>
              <p>Give plain-language instructions. The trainer will organize them into rules you can save and approve.</p>
            </div>
          </div>
          <div class="ai-quick-actions">
            ${["Less salesy", "Pricing disclaimer", "Service area boundary", "Property management support", "Licensing boundary"].map((label) => `<button type="button" data-action="training-quick-prompt" data-prompt="${escapeHtml(label)}">${escapeHtml(label)}</button>`).join("")}
          </div>
          <div class="training-chat-log" data-training-chat-log>${renderTrainingMessages()}</div>
          <form class="training-chat-form" data-training-chat-form>
            <textarea name="message" rows="5" placeholder="Example: Make sure the AI only says we serve Portland, Vancouver, and Beaverton."></textarea>
            <button type="submit"><span class="button-icon" aria-hidden="true">-&gt;</span><span>Train</span></button>
          </form>
        </section>
        <aside class="panel ai-training-library-panel">
          <div class="ai-training-panel-head">
            <div>
              <p class="eyebrow">Training Library</p>
              <h3>Rules & Guidance</h3>
              <p>${escapeHtml(version.label)}</p>
            </div>
            <span class="training-status-badge is-approved">${escapeHtml(approvedCount)} approved</span>
          </div>
          <div class="training-version-note">${escapeHtml(version.notes)}</div>
          <div class="training-library-list">${renderTrainingLibrary(ai)}</div>
        </aside>
        <section class="panel ai-training-preview-panel" data-helper-preview-panel>
          <div class="ai-training-panel-head">
            <div>
              <p class="eyebrow">Website Helper Preview</p>
              <h3>Test Visitor Questions</h3>
              <p>Preview the public helper with live rules or with drafts included before publishing.</p>
            </div>
            <div class="training-preview-toggle" role="group" aria-label="Preview version">
              <button type="button" class="${state.trainingPreviewMode === "live" ? "is-active" : ""}" data-action="set-preview-mode" data-mode="live">Test Live Version</button>
              <button type="button" class="${state.trainingPreviewMode === "draft" ? "is-active" : ""}" data-action="set-preview-mode" data-mode="draft">Test Draft Version</button>
            </div>
          </div>
          <div class="ai-quick-actions">
            ${["How much does mulch cost?", "Do you service Vancouver?", "Can you do apartment trash area cleanup?", "Are you licensed?", "Can I book a walkthrough?"].map((question) => `<button type="button" data-action="preview-sample-question" data-question="${escapeHtml(question)}">${escapeHtml(question)}</button>`).join("")}
          </div>
          <div class="training-preview-log" data-training-preview-log>${renderTrainingPreviewMessages()}</div>
          <form class="training-preview-form" data-training-preview-form>
            <input name="message" placeholder="Ask a sample visitor question...">
            <button type="submit"><span class="button-icon" aria-hidden="true">?</span><span>Preview Answer</span></button>
          </form>
        </section>
      </div>
      ${renderTrainingEditorModal(ai)}
      ${renderPublishModal(ai)}`;
  }

  function renderGroundskeeperAi(data = state.data) {
    const ai = data.groundskeeperAi || {};
    const liveRules = (ai.trainingRules || []).filter((rule) => String(rule.status || "").toLowerCase() === "live").length;
    const approvedRules = (ai.trainingRules || []).filter((rule) => String(rule.status || "").toLowerCase() === "approved").length;
    if (els.groundskeeperAiStatus) {
      els.groundskeeperAiStatus.innerHTML = state.groundskeeperAiReady
        ? `<span>${aiBadge("Secure Backend", "Secure Backend")} Website helper uses live training through <code>/.netlify/functions/groundskeeper-ai</code>.</span><span>${escapeHtml(liveTrainingVersion(ai).label)} / ${escapeHtml(liveRules)} live / ${escapeHtml(approvedRules)} approved</span>`
        : `<span>${aiBadge("Setup Needed", "Setup Needed")} Run <code>DASHBOARD_GROUNDSKEEPER_AI_SQL.md</code> in Supabase, then refresh. The public helper still uses bundled website knowledge until tables exist.</span>`;
    }
    if (els.aiSearch && els.aiSearch.value !== state.groundskeeperAiSearch) els.aiSearch.value = state.groundskeeperAiSearch;
    renderAiWorkspace(ai);
  }

  function aiEntryPayloadFromForm(form) {
    const data = new FormData(form);
    const table = String(data.get("table") || "ai_knowledge");
    const title = String(data.get("title") || "").trim();
    const category = String(data.get("category") || "").trim();
    const content = String(data.get("content") || "").trim();
    const base = {
      visibility: String(data.get("visibility") || "public"),
      status: String(data.get("status") || "draft")
    };
    if (table === "ai_settings") {
      return { table, record: { ...base, setting_key: slug(title || category || "setting"), label: title || category || "Business Fact", value: content, notes: category } };
    }
    if (table === "ai_faqs") {
      return { table, record: { ...base, question: title, answer: content, category: category || "Website FAQ" } };
    }
    if (table === "ai_rules") {
      return { table, record: { ...base, title, content } };
    }
    if (table === "ai_saved_answers") {
      return { table, record: { ...base, question: title, answer: content } };
    }
    return { table, record: { ...base, title, category: category || "General", content } };
  }

  async function saveAiEntryFromLog(logId, table) {
    const log = (state.data.groundskeeperAi.logs || []).find((item) => item.id === logId);
    if (!log) return;
    if (table === "ai_rules") {
      await groundskeeperRequest("upsert", {
        table,
        record: {
          title: `Rule from ${formatDate(log.created_at)}`,
          content: log.answer || log.question,
          visibility: "internal",
          status: "draft"
        }
      });
      return;
    }
    if (table === "ai_faqs") {
      await groundskeeperRequest("upsert", {
        table,
        record: {
          question: log.question || "Visitor question",
          answer: log.answer || "",
          category: "Visitor Question Logs",
          visibility: "public",
          status: "draft"
        }
      });
      return;
    }
    await groundskeeperRequest("upsert", {
      table,
      record: {
        title: log.question || "Visitor question",
        category: "Visitor Question Logs",
        content: `Question: ${log.question}\n\nAnswer: ${log.answer || ""}`,
        visibility: "public",
        status: "draft"
      }
    });
  }

  async function render() {
    const data = state.data;
    renderNotifications(data);
    populatePropertyFilter(data);
    renderMetrics(data);
    renderDashboardAlerts(data);
    renderOverdueJobAlerts(data);
    renderSubmissions(data);
    renderUpcoming(data);
    renderHomeReminders(data);
    renderHomeNotes(data);
    renderTodayRouteSnapshot(data);
    renderQuoteTable(data);
    renderPipeline(data);
    renderDocuments(data);
    renderContacts(data);
    renderOutreach(data);
    renderEquipment(data);
    renderJobs(data);
    renderNotes();
    renderReminders(data);
    renderCalendar(data);
    renderOperations(data);
    renderRoutePlanner(data);
    renderGroundskeeperAi(data);
    renderUsersAccess(data);
    renderActivityLog(data);
    renderCurrentProfileAvatar(data);
    renderEnvironmentIndicator();
    bindAvatarFallbacks();
    if (els.todayChip) els.todayChip.textContent = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
    setActiveSection(state.activeSection);
  }

  async function refreshDashboard() {
    state.loading = true;
    state.error = "";
    setDashboardState("Loading dashboard records...");
    els.metrics.innerHTML = [
      ["Today's Jobs", "..."],
      ["Active Properties", "..."],
      ["Upcoming", "..."]
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

    if (els.sidebar) {
      const isDesktopSidebar = () => window.matchMedia("(min-width: 901px)").matches;
      const closeSidebarWhenPointerIsOutside = (event) => {
        if (!isDesktopSidebar() || !els.appView?.classList.contains("is-sidebar-open")) return;
        if (event.target instanceof Node && els.sidebar.contains(event.target)) return;
        setSidebarOpen(false);
      };

      els.sidebar.addEventListener("pointerenter", () => {
        if (isDesktopSidebar()) setSidebarOpen(true);
      });
      els.sidebar.addEventListener("pointerleave", () => {
        if (isDesktopSidebar()) setSidebarOpen(false);
      });
      els.sidebar.addEventListener("click", () => {
        if (!isDesktopSidebar()) return;
        requestAnimationFrame(() => {
          if (!els.sidebar.matches(":hover")) setSidebarOpen(false);
        });
      });
      els.sidebar.addEventListener("focusin", () => {
        if (isDesktopSidebar()) setSidebarOpen(true);
      });
      els.sidebar.addEventListener("focusout", () => {
        if (!isDesktopSidebar()) return;
        requestAnimationFrame(() => {
          if (!els.sidebar.contains(document.activeElement)) {
            setSidebarOpen(false);
          }
        });
      });
      document.addEventListener("pointerdown", closeSidebarWhenPointerIsOutside);
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
        setNotificationsOpen(false);
      }
    });

    document.addEventListener("click", (event) => {
      if (!isNotificationsOpen()) return;
      const target = event.target;
      if (els.notificationButton?.contains(target) || els.notificationPanel?.contains(target)) return;
      setNotificationsOpen(false);
    });

    [els.notificationButton, els.notificationPanel].filter(Boolean).forEach((node) => {
      node.addEventListener("pointerenter", cancelNotificationsClose);
      node.addEventListener("pointerleave", scheduleNotificationsClose);
      node.addEventListener("mouseenter", cancelNotificationsClose);
      node.addEventListener("mouseleave", scheduleNotificationsClose);
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
        if (els.clientSearch && els.clientSearch.value !== state.search) els.clientSearch.value = state.search;
        if (els.overviewSearch && els.overviewSearch.value !== state.search) els.overviewSearch.value = state.search;
        if (els.workSearch && els.workSearch.value !== state.search) els.workSearch.value = state.search;
        await render();
      });
    }

    if (els.globalSearch) {
      els.globalSearch.addEventListener("input", async () => {
        state.search = els.globalSearch.value;
        if (els.search && els.search.value !== state.search) els.search.value = state.search;
        if (els.clientSearch && els.clientSearch.value !== state.search) els.clientSearch.value = state.search;
        if (els.overviewSearch && els.overviewSearch.value !== state.search) els.overviewSearch.value = state.search;
        if (els.workSearch && els.workSearch.value !== state.search) els.workSearch.value = state.search;
        await render();
      });
    }

    if (els.overviewSearch) {
      els.overviewSearch.addEventListener("input", async () => {
        state.search = els.overviewSearch.value;
        if (els.search && els.search.value !== state.search) els.search.value = state.search;
        if (els.globalSearch && els.globalSearch.value !== state.search) els.globalSearch.value = state.search;
        if (els.clientSearch && els.clientSearch.value !== state.search) els.clientSearch.value = state.search;
        if (els.workSearch && els.workSearch.value !== state.search) els.workSearch.value = state.search;
        await render();
      });
    }

    if (els.workSearch) {
      els.workSearch.addEventListener("input", async () => {
        state.search = els.workSearch.value;
        if (els.search && els.search.value !== state.search) els.search.value = state.search;
        if (els.globalSearch && els.globalSearch.value !== state.search) els.globalSearch.value = state.search;
        if (els.overviewSearch && els.overviewSearch.value !== state.search) els.overviewSearch.value = state.search;
        if (els.clientSearch && els.clientSearch.value !== state.search) els.clientSearch.value = state.search;
        await render();
      });
    }

    if (els.clientSearch) {
      els.clientSearch.addEventListener("input", async () => {
        state.search = els.clientSearch.value;
        if (els.search && els.search.value !== state.search) els.search.value = state.search;
        if (els.globalSearch && els.globalSearch.value !== state.search) els.globalSearch.value = state.search;
        if (els.overviewSearch && els.overviewSearch.value !== state.search) els.overviewSearch.value = state.search;
        if (els.workSearch && els.workSearch.value !== state.search) els.workSearch.value = state.search;
        await render();
      });
    }

    if (els.outreachSearch) {
      els.outreachSearch.addEventListener("input", async () => {
        state.outreachSearch = els.outreachSearch.value;
        await render();
      });
    }

    qsa("[data-outreach-view]").forEach((button) => {
      button.addEventListener("click", async () => {
        applyOutreachPreset(button.dataset.outreachPreset || "");
        state.outreachView = button.dataset.outreachView || "companies";
        await render();
      });
    });

    [
      [els.outreachStatusFilter, "outreachStatusFilter"],
      [els.outreachTypeFilter, "outreachTypeFilter"],
      [els.outreachServiceFilter, "outreachServiceFilter"],
      [els.outreachPriorityFilter, "outreachPriorityFilter"],
      [els.outreachCompanyStatusFilter, "outreachStatusFilter"],
      [els.outreachCompanyPriorityFilter, "outreachPriorityFilter"],
      [els.outreachPropertyCompanyFilter, "outreachCompanyFilter"],
      [els.outreachPropertyCityFilter, "outreachCityFilter"],
      [els.outreachPropertyNeighborhoodFilter, "outreachNeighborhoodFilter"],
      [els.outreachPropertyServiceFilter, "outreachServiceFilter"],
      [els.outreachPropertyStatusFilter, "outreachStatusFilter"],
      [els.outreachPropertyPriorityFilter, "outreachPriorityFilter"],
      [els.outreachPropertyVerifiedFilter, "outreachVerifiedFilter"]
    ].forEach(([element, key]) => {
      if (!element) return;
      element.addEventListener("change", async () => {
        state[key] = element.value;
        await render();
      });
    });

    if (els.outreachCompanySearch) {
      els.outreachCompanySearch.addEventListener("input", async () => {
        state.outreachSearch = els.outreachCompanySearch.value;
        await render();
      });
    }

    if (els.outreachPropertySearch) {
      els.outreachPropertySearch.addEventListener("input", async () => {
        state.outreachSearch = els.outreachPropertySearch.value;
        await render();
      });
    }

    if (els.outreachPropertyNeedsFilter) {
      els.outreachPropertyNeedsFilter.addEventListener("input", async () => {
        state.outreachVisibleNeedsFilter = els.outreachPropertyNeedsFilter.value;
        await render();
      });
    }

    if (els.aiSearch) {
      els.aiSearch.addEventListener("input", async () => {
        state.groundskeeperAiSearch = els.aiSearch.value;
        await render();
      });
    }

    qsa("[data-equipment-view]").forEach((button) => {
      button.addEventListener("click", async () => {
        state.equipmentView = button.dataset.equipmentView || "inventory";
        await render();
      });
    });

    if (els.equipmentSearch) {
      els.equipmentSearch.addEventListener("input", async () => {
        state.equipmentSearch = els.equipmentSearch.value;
        await render();
      });
    }

    [
      [els.equipmentCategoryFilter, "equipmentCategoryFilter"],
      [els.equipmentStatusFilter, "equipmentStatusFilter"],
      [els.equipmentConditionFilter, "equipmentConditionFilter"],
      [els.equipmentPriorityFilter, "equipmentPriorityFilter"]
    ].forEach(([element, key]) => {
      if (!element) return;
      element.addEventListener("change", async () => {
        state[key] = element.value;
        await render();
      });
    });

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

    if (els.outreachImport) {
      els.outreachImport.addEventListener("change", async () => {
        const file = els.outreachImport.files && els.outreachImport.files[0];
        try {
          setDashboardState("Importing outreach CSV...");
          await importOutreachCsvFile(file);
        } catch (error) {
          setDashboardState(error.message || "Unable to import outreach CSV.", "error");
        } finally {
          els.outreachImport.value = "";
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

      if (target.matches("[data-user-avatar-upload]")) {
        const file = target.files && target.files[0];
        if (!file) return;
        const targetUserId = state.avatarUploadTargetId;
        try {
          setDashboardState("Uploading avatar...");
          await uploadUserAvatar(targetUserId, file);
          state.avatarUploadTargetId = "";
          target.value = "";
          await refreshDashboard();
          setActiveSection("settings");
          setDashboardState("Avatar updated.");
        } catch (error) {
          state.avatarUploadTargetId = "";
          target.value = "";
          setDashboardState(error.message || "Unable to upload avatar.", "error");
        }
        return;
      }

      if (target.matches("[data-recurring-toggle]")) {
        const form = target.closest("form");
        const controls = form?.querySelector("[data-recurring-controls]");
        const endDate = controls?.querySelector("input[name='recurrence_end_date']");
        const firstDate = form?.querySelector("input[name='visit_date']");
        if (controls) controls.hidden = !target.checked;
        if (endDate) {
          endDate.required = target.checked;
          if (target.checked && !endDate.value && firstDate?.value) {
            endDate.value = addMonthsKey(firstDate.value, 12);
          }
        }
        return;
      }

      if (target.matches("input[name='visit_date']")) {
        const form = target.closest("form");
        const toggle = form?.querySelector("[data-recurring-toggle]");
        const endDate = form?.querySelector("input[name='recurrence_end_date']");
        if (toggle?.checked && endDate && !endDate.value && target.value) {
          endDate.value = addMonthsKey(target.value, 12);
        }
      }

      if (target.matches("[data-call-method-setting]")) {
        state.preferredCallMethod = target.checked ? "browser_tel" : "browser_tel";
        localStorage.setItem(CALL_METHOD_KEY, state.preferredCallMethod);
        setDashboardState("Call setting saved. Google Voice must be configured as your browser phone handler.");
        return;
      }

      if (target.matches("[data-user-role-select]")) {
        try {
          setDashboardState("Updating user role...");
          await dashboardUsersRequest("update-role", {
            userId: target.dataset.userId || "",
            email: target.dataset.userEmail || "",
            role: target.value
          });
          await refreshDashboard();
          setActiveSection("settings");
          setDashboardState("User role updated.");
        } catch (error) {
          setDashboardState(error.message || "Unable to update user role.", "error");
        }
        return;
      }

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

      if (target.matches("[data-outreach-status-id]")) {
        try {
          setDashboardState("Updating prospect...");
          await updateOutreachProspect(target.dataset.outreachStatusId, { status: target.value });
          await refreshDashboard();
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to update prospect.", "error");
        }
        return;
      }

      if (target.matches("[data-outreach-select]")) {
        if (target.checked) {
          state.selectedOutreachIds.add(target.value);
        } else {
          state.selectedOutreachIds.delete(target.value);
        }
        await render();
        return;
      }

      if (target.matches("[data-outreach-select-all]")) {
        const visibleProspects = filteredOutreachProspects({ activeOnly: true }).filter((item) => !isClosedOutreach(item));
        visibleProspects.forEach((item) => {
          if (target.checked) {
            state.selectedOutreachIds.add(item.id);
          } else {
            state.selectedOutreachIds.delete(item.id);
          }
        });
        await render();
        return;
      }

      if (target.matches("[data-outreach-property-select]")) {
        if (target.checked) {
          state.selectedOutreachPropertyIds.add(target.value);
        } else {
          state.selectedOutreachPropertyIds.delete(target.value);
        }
        await render();
        return;
      }

      if (target.matches("[data-outreach-property-select-all]")) {
        const visibleProperties = filteredOutreachProperties();
        visibleProperties.forEach((item) => {
          if (target.checked) {
            state.selectedOutreachPropertyIds.add(item.id);
          } else {
            state.selectedOutreachPropertyIds.delete(item.id);
          }
        });
        await render();
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

      if (action === "toggle-notifications") {
        const isOpen = els.notificationPanel ? els.notificationPanel.hidden : false;
        setNotificationsOpen(isOpen);
        return;
      }

      if (action !== "toggle-notifications") {
        setNotificationsOpen(false);
      }

      if (action === "open-call-activity") {
        const leadType = target.dataset.leadType || "";
        const leadId = target.dataset.leadId || "";
        if (leadId) {
          openLeadDrawerByType(leadType, leadId);
          setDashboardState("Opened voicemail lead.");
        } else {
          setDashboardState("This voicemail is logged, but it is not linked to a lead record.", "error");
        }
        return;
      }

      if (action === "upload-user-avatar") {
        state.avatarUploadTargetId = target.dataset.userId || "";
        if (els.userAvatarUpload) {
          els.userAvatarUpload.value = "";
          els.userAvatarUpload.click();
        }
        return;
      }

      if (action === "remove-user-avatar") {
        const targetUserId = target.dataset.userId || "";
        if (!targetUserId || !window.confirm("Remove this user's avatar?")) return;
        try {
          setDashboardState("Removing avatar...");
          await removeUserAvatar(targetUserId);
          await refreshDashboard();
          setActiveSection("settings");
          setDashboardState("Avatar removed.");
        } catch (error) {
          setDashboardState(error.message || "Unable to remove avatar.", "error");
        }
        return;
      }

      if (action === "disable-dashboard-user" || action === "enable-dashboard-user") {
        const targetUserId = target.dataset.userId || "";
        if (!targetUserId) return;
        const disabling = action === "disable-dashboard-user";
        if (disabling && !window.confirm("Disable this dashboard user? They will lose access to protected dashboard actions.")) return;
        try {
          setDashboardState(disabling ? "Disabling user..." : "Enabling user...");
          await dashboardUsersRequest(disabling ? "disable" : "enable", { userId: targetUserId });
          await refreshDashboard();
          setActiveSection("settings");
          setDashboardState(disabling ? "User disabled." : "User enabled.");
        } catch (error) {
          setDashboardState(error.message || "Unable to update user access.", "error");
        }
        return;
      }

      if (action === "remove-dashboard-user") {
        const targetUserId = target.dataset.userId || "";
        const targetEmail = String(target.dataset.userEmail || "").trim().toLowerCase();
        if (!targetUserId && !targetEmail) return;
        if (targetEmail === PROTECTED_USER_EMAIL) {
          setDashboardState("The primary Urban Yards owner account cannot be removed.", "error");
          return;
        }
        if (!window.confirm(`Remove ${targetEmail || "this dashboard user"}? This removes their dashboard access and cannot be undone from this screen.`)) return;
        try {
          const session = getSession();
          setDashboardState("Removing user...");
          await dashboardUsersRequest("remove", { userId: targetUserId, email: targetEmail });
          const removedSelf = (targetUserId && targetUserId === session?.userId) || (targetEmail && targetEmail === String(session?.email || "").toLowerCase());
          if (removedSelf) {
            clearSession();
            showLogin();
            setLoginStatus("Your dashboard account was removed.");
            return;
          }
          await refreshDashboard();
          setActiveSection("settings");
          setDashboardState("User removed.");
        } catch (error) {
          setDashboardState(error.message || "Unable to remove user.", "error");
        }
        return;
      }

      if (action === "view-user-activity") {
        const targetUserId = target.dataset.userId || "";
        if (!targetUserId) return;
        try {
          setDashboardState("Loading user activity...");
          const result = await dashboardUsersRequest("activity", { userId: targetUserId });
          state.data.auditLogs = Array.isArray(result.logs) ? result.logs : [];
          state.auditLogsReady = true;
          renderActivityLog(state.data);
          setDashboardState("Showing recent activity for selected user.");
        } catch (error) {
          setDashboardState(error.message || "Unable to load user activity.", "error");
        }
        return;
      }

      if (action === "publish-groundskeeper-ai" && state.activeSection === "groundskeeper-ai") {
        state.trainingPublishModalOpen = true;
        renderGroundskeeperAi(state.data);
        return;
      }

      if (action === "close-training-modal") {
        state.trainingPublishModalOpen = false;
        state.trainingEditingRuleId = "";
        renderGroundskeeperAi(state.data);
        return;
      }

      if (action === "confirm-publish-training") {
        try {
          setDashboardState("Publishing approved AI training rules...");
          await groundskeeperRequest("publish-training");
          state.trainingPublishModalOpen = false;
          state.data.groundskeeperAi = await loadGroundskeeperAi();
          await render();
          setDashboardState("Approved AI training rules are now live on the website helper.");
        } catch (error) {
          setDashboardState(error.message || "Unable to push AI training live.", "error");
        }
        return;
      }

      if (target.matches("[data-ai-view]")) {
        state.groundskeeperAiView = target.dataset.aiView || "assistant";
        await render();
        return;
      }

      if (action === "ai-quick-prompt") {
        const promptMap = {
          "Draft follow-up": "Draft a concise follow-up message for a lead. Ask me for any missing lead details first.",
          "Summarize lead": "Summarize this lead into key details, likely service fit, next step, and follow-up priority.",
          "Improve website copy": "Improve this Urban Yards website copy while keeping the tone practical, local, owner-operated, and clear.",
          "Create FAQ answer": "Create a public website FAQ answer using Urban Yards service area, quote process, and brand voice.",
          "Review visitor question": "Review this visitor question and suggest whether it should become a FAQ, rule, or knowledge entry.",
          "Add service rule": "Draft a clear AI rule for how The Groundskeeper should answer service-related questions."
        };
        const textarea = qs("[data-groundskeeper-chat-form] textarea[name='message']");
        if (textarea) {
          textarea.value = promptMap[target.dataset.prompt] || target.dataset.prompt || "";
          textarea.focus();
        }
        return;
      }

      if (action === "training-quick-prompt") {
        const promptMap = {
          "Less salesy": "Make the website AI sound more helpful and less salesy. It should be friendly, practical, and grounded.",
          "Pricing disclaimer": "When someone asks about pricing, explain that quotes depend on property size, condition, access, frequency, and scope, then invite them to request a free quote or walkthrough.",
          "Service area boundary": "Make sure the helper only says Urban Yards serves Portland, Vancouver, and Beaverton unless the service area is updated later.",
          "Property management support": "If someone asks about property management support, mention trash areas, seasonal cleanup, mulch refreshes, apartment groundskeeping, and small exterior property-care tasks.",
          "Licensing boundary": "Do not claim licensed trade work, legal guarantees, insurance promises, or regulated contractor work unless explicitly approved."
        };
        const textarea = qs("[data-training-chat-form] textarea[name='message']");
        if (textarea) {
          textarea.value = promptMap[target.dataset.prompt] || target.dataset.prompt || "";
          textarea.focus();
        }
        return;
      }

      if (action === "save-training-suggestion") {
        const messageIndex = Number(target.dataset.messageIndex);
        const suggestionIndex = Number(target.dataset.suggestionIndex);
        const suggestion = state.trainingMessages[messageIndex]?.suggestions?.[suggestionIndex];
        if (!suggestion) return;
        try {
          setDashboardState("Saving training rule...");
          await saveTrainingRule({
            ...suggestion,
            category: target.dataset.category || suggestion.category || "other",
            status: "draft"
          });
          suggestion.ignored = true;
          state.data.groundskeeperAi = await loadGroundskeeperAi();
          await render();
          setDashboardState("Training rule saved as a draft.");
        } catch (error) {
          setDashboardState(error.message || "Unable to save training rule.", "error");
        }
        return;
      }

      if (action === "ignore-training-suggestion") {
        const messageIndex = Number(target.dataset.messageIndex);
        const suggestionIndex = Number(target.dataset.suggestionIndex);
        const suggestion = state.trainingMessages[messageIndex]?.suggestions?.[suggestionIndex];
        if (suggestion) suggestion.ignored = true;
        renderGroundskeeperAi(state.data);
        return;
      }

      if (action === "approve-training-rule" || action === "archive-training-rule") {
        try {
          setDashboardState(action === "approve-training-rule" ? "Approving training rule..." : "Archiving training rule...");
          await groundskeeperRequest(action, { id });
          state.data.groundskeeperAi = await loadGroundskeeperAi();
          await render();
          setDashboardState(action === "approve-training-rule" ? "Training rule approved. Push to Live when ready." : "Training rule archived.");
        } catch (error) {
          setDashboardState(error.message || "Unable to update training rule.", "error");
        }
        return;
      }

      if (action === "edit-training-rule") {
        state.trainingEditingRuleId = id;
        state.trainingPublishModalOpen = false;
        renderGroundskeeperAi(state.data);
        return;
      }

      if (action === "test-training-rule") {
        const rule = (state.data.groundskeeperAi.trainingRules || []).find((item) => item.id === id);
        const input = qs("[data-training-preview-form] input[name='message']");
        if (input && rule) {
          state.trainingPreviewMode = "draft";
          input.value = `How would you answer a visitor question related to: ${rule.title || "this training rule"}?`;
          input.focus();
          input.scrollIntoView({ block: "center", behavior: "smooth" });
        }
        return;
      }

      if (action === "set-preview-mode") {
        state.trainingPreviewMode = target.dataset.mode === "live" ? "live" : "draft";
        renderGroundskeeperAi(state.data);
        return;
      }

      if (action === "preview-sample-question") {
        const input = qs("[data-training-preview-form] input[name='message']");
        if (input) {
          input.value = target.dataset.question || "";
          input.focus();
        }
        return;
      }

      if (action === "focus-helper-preview") {
        state.groundskeeperAiView = "training";
        renderGroundskeeperAi(state.data);
        const panel = qs("[data-helper-preview-panel]");
        if (panel) panel.scrollIntoView({ block: "center", behavior: "smooth" });
        return;
      }

      if (action === "new-ai-entry") {
        const section = aiSectionById(target.dataset.section || state.groundskeeperAiView);
        fillAiEditor(section, null);
        return;
      }

      if (action === "edit-ai-entry" || action === "duplicate-ai-entry" || action === "archive-ai-entry") {
        const { section, item } = aiItemFromAction(target.dataset.section, target.dataset.index);
        if (!item) return;
        const overrides = {};
        if (action === "duplicate-ai-entry") overrides.title = `${itemTitle(item, section.type)} Copy`;
        if (action === "archive-ai-entry") overrides.status = "archived";
        fillAiEditor(section, item, overrides);
        if (action === "archive-ai-entry") setDashboardState("Review this archived status, then save to confirm.");
        return;
      }

      if (action === "save-ai-log-faq") {
        try {
          setDashboardState("Saving log as draft FAQ...");
          await saveAiEntryFromLog(id, "ai_faqs");
          state.data.groundskeeperAi = await loadGroundskeeperAi();
          await render();
          setDashboardState("Saved as draft FAQ. Review and publish when ready.");
        } catch (error) {
          setDashboardState(error.message || "Unable to save AI FAQ.", "error");
        }
        return;
      }

      if (action === "dismiss-ai-log") {
        setDashboardState("Log dismissed for now. No source data was changed.");
        return;
      }

      if (action === "copy-phone") {
        const phone = target.dataset.phone || "";
        const copied = await copyPhoneSilently(phone);
        if (copied) {
          setDashboardState("Phone number copied. Paste into Google Voice to call.");
        } else {
          setDashboardState(`Copy this number: ${phone}`, "error");
        }
        return;
      }

      if (action === "open-google-voice-call") {
        const phone = phoneInfo(target.dataset.phone || "");
        if (phone.valid) await copyPhoneSilently(phone.e164);
        openGoogleVoiceWindow(phone.valid ? phone.e164 : "");
        setDashboardState(phone.valid ? "Google Voice opened in the call window. Phone number copied as backup." : "Google Voice opened.");
        return;
      }

      if (action === "call-lead") {
        const phone = phoneInfo(target.dataset.phone || "");
        if (!phone.valid) {
          setDashboardState("No valid phone number.", "error");
          return;
        }
        openGoogleVoiceWindow(phone.e164);
        const copied = await copyPhoneSilently(phone.e164);
        try {
          const activity = await insertLeadActivity({
            lead_id: id,
            lead_type: target.dataset.leadType || "lead",
            phone_number: phone.e164,
            type: "call_attempt",
            outcome: "not_set",
            notes: ""
          });
          const panel = renderCallOutcomePanel(activity);
          const existingPanel = qs(`[data-call-panel-slot][data-lead-id="${cssEscape(activity.leadId)}"][data-lead-type="${cssEscape(activity.leadType)}"]`);
          const existingOutcomePanel = qs("[data-call-outcome-panel]");
          if (existingPanel) existingPanel.outerHTML = panel;
          const slot = qs("[data-call-outcome-slot]");
          if (existingOutcomePanel) existingOutcomePanel.remove();
          if (existingPanel) {
            setDashboardState(copied ? "Google Voice opened in the call window. Phone number copied as backup. Call attempt logged." : "Google Voice opened. Call attempt logged.");
            return;
          }
          let outcomeSlot = slot;
          if (!outcomeSlot || els.detailDrawer?.hidden) {
            openLeadDrawerByType(activity.leadType, activity.leadId);
            outcomeSlot = qs("[data-call-outcome-slot]");
          }
          if (outcomeSlot) {
            outcomeSlot.innerHTML = panel;
          } else if (els.detailContent) {
            els.detailContent.insertAdjacentHTML("afterbegin", panel);
          }
          setDashboardState(copied ? "Google Voice opened in the call window. Phone number copied as backup. Call attempt logged." : "Google Voice opened. Call attempt logged.");
        } catch (error) {
          setDashboardState(error.message || "Google Voice opened, but the activity log could not be saved.", "error");
        }
        return;
      }

      if (action === "clear-equipment-form") {
        const form = qs("[data-equipment-form]");
        if (form) {
          form.reset();
          form.elements.id.value = "";
        }
        return;
      }

      if (action === "clear-hardware-form") {
        const form = qs("[data-hardware-guide-form]");
        if (form) {
          form.reset();
          form.elements.id.value = "";
        }
        return;
      }

      if (action === "edit-equipment-item") {
        const item = state.data.equipmentItems.find((entry) => entry.id === id);
        const form = qs("[data-equipment-form]");
        if (!item || !form) return;
        form.elements.id.value = item.id;
        form.elements.name.value = item.name;
        form.elements.category.value = item.category;
        form.elements.brand.value = item.brand;
        form.elements.model.value = item.model;
        form.elements.serial_number.value = item.serialNumber;
        form.elements.quantity.value = item.quantity || 1;
        form.elements.condition.value = item.condition;
        form.elements.status.value = item.status;
        form.elements.storage_location.value = item.storageLocation;
        form.elements.purchase_date.value = item.purchaseDateRaw;
        form.elements.purchase_price.value = item.purchasePrice || "";
        form.elements.supplier.value = item.supplier;
        form.elements.product_url.value = item.productUrl;
        form.elements.image_url.value = item.imageUrl;
        form.elements.last_maintenance_date.value = item.lastMaintenanceRaw;
        form.elements.next_maintenance_date.value = item.nextMaintenanceRaw;
        form.elements.replacement_priority.value = item.replacementPriority;
        form.elements.notes.value = item.notes;
        state.equipmentView = "inventory";
        await render();
        form.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      if (action === "mark-equipment-ready" || action === "mark-equipment-maintenance") {
        try {
          setDashboardState("Updating equipment...");
          await updateEquipmentItem(id, { status: action === "mark-equipment-ready" ? "Ready" : "Needs Maintenance" });
          await refreshDashboard();
          setActiveSection("equipment");
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to update equipment.", "error");
        }
        return;
      }

      if (action === "delete-equipment-item") {
        if (!window.confirm("Delete this equipment item?")) return;
        try {
          setDashboardState("Deleting equipment...");
          await deleteRow("equipment_items", id);
          await refreshDashboard();
          setActiveSection("equipment");
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to delete equipment.", "error");
        }
        return;
      }

      if (action === "edit-hardware-guide") {
        const item = state.data.hardwareGuide.find((entry) => entry.id === id);
        const form = qs("[data-hardware-guide-form]");
        if (!item || !form) return;
        form.elements.id.value = item.id;
        form.elements.name.value = item.name;
        form.elements.category.value = item.category;
        form.elements.recommended_use.value = item.recommendedUse;
        form.elements.brand.value = item.brand;
        form.elements.model.value = item.model;
        form.elements.estimated_price.value = item.estimatedPrice || "";
        form.elements.priority.value = item.priority;
        form.elements.supplier.value = item.supplier;
        form.elements.product_url.value = item.productUrl;
        form.elements.good_for.value = item.goodFor;
        form.elements.status.value = item.status;
        form.elements.notes.value = item.notes;
        state.equipmentView = "guide";
        await render();
        form.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      if (action === "mark-hardware-bought") {
        try {
          setDashboardState("Marking guide item bought...");
          await updateHardwareGuideItem(id, { status: "Bought" });
          state.equipmentView = "guide";
          await refreshDashboard();
          setActiveSection("equipment");
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to update guide item.", "error");
        }
        return;
      }

      if (action === "convert-hardware-inventory") {
        const item = state.data.hardwareGuide.find((entry) => entry.id === id);
        if (!item) return;
        try {
          setDashboardState("Adding guide item to inventory...");
          await insertEquipmentItem({
            name: item.name,
            category: item.category,
            brand: item.brand || null,
            model: item.model || null,
            quantity: 1,
            condition: "New",
            status: "Ready",
            purchase_price: item.estimatedPrice || null,
            supplier: item.supplier || null,
            product_url: item.productUrl || null,
            notes: item.notes || item.recommendedUse || null,
            replacement_priority: "Normal"
          });
          await updateHardwareGuideItem(id, { status: "Bought" });
          state.equipmentView = "inventory";
          await refreshDashboard();
          setActiveSection("equipment");
          setDashboardState("Guide item added to inventory.");
        } catch (error) {
          setDashboardState(error.message || "Unable to add guide item to inventory.", "error");
        }
        return;
      }

      if (action === "delete-hardware-guide") {
        if (!window.confirm("Delete this hardware guide item?")) return;
        try {
          setDashboardState("Deleting guide item...");
          await deleteRow("hardware_guide", id);
          await refreshDashboard();
          setActiveSection("equipment");
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to delete guide item.", "error");
        }
        return;
      }

      if (action === "open-submission") {
        openSubmissionDrawer(id);
      } else if (action === "open-contact") {
        openContactDrawer(id);
      } else if (action === "reschedule-job") {
        openJobDrawer(id, { reschedule: true });
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
        const tools = qs(".home-secondary-tools");
        if (tools) tools.open = true;
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
      } else if (action === "new-outreach-prospect") {
        openOutreachDrawer();
      } else if (action === "import-outreach-csv") {
        if (els.outreachImport) els.outreachImport.click();
      } else if (action === "confirm-outreach-import") {
        try {
          setDashboardState("Importing property CSV...");
          await commitOutreachPropertyImport(state.pendingOutreachImport);
          closeSubmissionDrawer();
        } catch (error) {
          setDashboardState(error.message || "Unable to import property CSV.", "error");
        }
      } else if (action === "cancel-outreach-import") {
        state.pendingOutreachImport = null;
        closeSubmissionDrawer();
        setDashboardState("Property CSV import canceled.");
      } else if (action === "open-outreach-prospect" || action === "edit-outreach-prospect") {
        openOutreachDrawer(id);
      } else if (action === "open-outreach-company") {
        openOutreachCompanyDrawer(id);
      } else if (action === "open-outreach-property") {
        openOutreachPropertyDrawer(id);
      } else if (action === "prefill-outreach-property") {
        const company = state.data.outreachCompanies.find((item) => item.id === id);
        if (!company) return;
        setDashboardState("Use Import CSV to add properties for this company, or import a row with this company name.");
      } else if (action === "edit-managed-property") {
        const companyId = target.dataset.companyId || "";
        if (!companyId) return;
        openOutreachCompanyDrawer(companyId, id);
      } else if (action === "cancel-managed-property-edit") {
        openOutreachCompanyDrawer(id);
      } else if (action === "add-company-as-prospect") {
        const company = state.data.outreachCompanies.find((item) => item.id === id);
        if (!company) return;
        if (state.data.outreachProspects.some((prospect) => prospectMatchesCompany(prospect, company))) {
          setDashboardState("A matching prospect already exists for this company.", "error");
          return;
        }
        try {
          setDashboardState("Adding company as prospect...");
          await insertOutreachProspect(companyProspectPayload(company));
          await refreshDashboard();
          openOutreachCompanyDrawer(id);
          setDashboardState("Company added as prospect.");
        } catch (error) {
          setDashboardState(error.message || "Unable to add company as prospect.", "error");
        }
      } else if (action === "add-property-as-prospect") {
        const companyId = target.dataset.companyId || "";
        const company = state.data.outreachCompanies.find((item) => item.id === companyId);
        const property = state.data.outreachProperties.find((item) => item.id === id);
        if (!company || !property) return;
        if (state.data.outreachProspects.some((prospect) => prospectMatchesProperty(prospect, property))) {
          setDashboardState("A matching prospect already exists for this property.", "error");
          return;
        }
        try {
          setDashboardState("Adding property as prospect...");
          await insertOutreachProspect(propertyProspectPayload(property, company));
          await refreshDashboard();
          openOutreachCompanyDrawer(company.id);
          setDashboardState("Property added as prospect.");
        } catch (error) {
          setDashboardState(error.message || "Unable to add property as prospect.", "error");
        }
      } else if (action === "route-outreach-property") {
        const property = state.data.outreachProperties.find((item) => item.id === id);
        if (!property) return;
        try {
          setDashboardState("Adding property to route...");
          const stop = await insertRouteStop({
            client_name: property.propertyName,
            address: [property.address, property.city, property.state, property.zip].filter(Boolean).join(", "),
            service_type: property.service || "General Property Care",
            estimated_minutes: 30,
            status: "Planned",
            notes: `Managed by ${property.company}. ${property.serviceFit || property.visibleNeeds || property.notes || ""}`.trim()
          });
          if (stop?.address && !hasRouteCoordinates(stop)) {
            try {
              await geocodeAndStoreRouteStop(stop);
            } catch (error) {
              setDashboardState(error.message || "Route stop added, but map pin lookup failed.", "error");
            }
          }
          await refreshDashboard();
          setActiveSection("route-planner");
          history.replaceState(null, "", "#route-planner");
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to add property to route.", "error");
        }
      } else if (action === "geocode-outreach-property") {
        const property = state.data.outreachProperties.find((item) => item.id === id);
        if (!property) return;
        try {
          setDashboardState("Finding property map pin...");
          const updated = await geocodeAndStoreOutreachProperty(property);
          await refreshDashboard();
          if (updated) openOutreachPropertyDrawer(updated.id);
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to find property map pin.", "error");
        }
      } else if (action === "add-client-job") {
        const contact = state.data.contacts.find((item) => item.id === id);
        if (!contact) return;
        setActiveSection("calendar");
        history.replaceState(null, "", "#calendar");
        closeSubmissionDrawer();
        const form = qs("[data-job-create-form]");
        if (form) {
          form.visit_date.value = todayKey();
          form.visit_window.value = "";
          form.site_name.value = contact.name;
          form.city.value = contact.city === "Not provided" ? "" : contact.city;
          form.service.value = "Groundskeeping visit";
          form.service.focus();
        }
      } else if (action === "add-client-route") {
        const contact = state.data.contacts.find((item) => item.id === id);
        if (!contact) return;
        setActiveSection("route-planner");
        history.replaceState(null, "", "#route-planner");
        closeSubmissionDrawer();
        if (els.routeForm) {
          els.routeForm.client_name.value = contact.name;
          els.routeForm.address.value = contact.city === "Not provided" ? "" : contact.city;
          els.routeForm.service_type.value = "Groundskeeping";
          els.routeForm.estimated_minutes.value = "";
          els.routeForm.status.value = "Planned";
          els.routeForm.notes.value = "";
          els.routeForm.service_type.focus();
        }
      } else if (action === "add-client-follow-up") {
        const contact = state.data.contacts.find((item) => item.id === id);
        if (!contact) return;
        setActiveSection("overview");
        history.replaceState(null, "", "#overview");
        const tools = qs(".home-secondary-tools");
        if (tools) tools.open = true;
        closeSubmissionDrawer();
        const form = qs("[data-operations-form]");
        if (form) {
          form.record_type.value = "client";
          form.title.value = `Follow up with ${contact.name}`;
          form.description.value = contact.city === "Not provided" ? contact.name : contact.city;
          form.priority.value = "Normal";
          form.status.value = "Open";
          form.title.focus();
        }
      } else if (action === "add-client-document") {
        const contact = state.data.contacts.find((item) => item.id === id);
        if (!contact) return;
        setActiveSection("documents");
        history.replaceState(null, "", "#documents");
        closeSubmissionDrawer();
        const form = qs("[data-document-form]");
        if (form) {
          form.document_type.value = "estimate";
          form.client_name.value = contact.name;
          form.client_email.value = contact.email === "No email" ? "" : contact.email;
          form.square_invoice_number.value = "";
          form.description.value = "Groundskeeping service";
          form.amount.value = "";
          form.description.focus();
        }
      } else if (action === "quick-add-operation") {
        setActiveSection("overview");
        history.replaceState(null, "", "#overview");
        const tools = qs(".home-secondary-tools");
        if (tools) tools.open = true;
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
        const tools = qs(".home-secondary-tools");
        if (tools) tools.open = true;
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
      } else if (action === "route-zoom-in" || action === "route-zoom-out") {
        if (!googleRouteMap) return;
        const currentZoom = googleRouteMap.getZoom() ?? 12;
        googleRouteMap.setZoom(currentZoom + (action === "route-zoom-in" ? 1 : -1));
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
      } else if (action === "mark-outreach-contacted") {
        try {
          setDashboardState("Marking prospect contacted...");
          await markOutreachContacted(id);
          await refreshDashboard();
          if (!els.detailDrawer.hidden) openOutreachDrawer(id);
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to update prospect.", "error");
        }
      } else if (action === "create-outreach-quote") {
        try {
          setDashboardState("Creating quote lead...");
          const quote = await createQuoteFromOutreach(id);
          await refreshDashboard();
          if (quote) {
            setActiveSection("documents");
            history.replaceState(null, "", "#documents");
            openSubmissionDrawer(quote.id);
          }
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to create quote lead.", "error");
        }
      } else if (action === "route-outreach-prospect") {
        try {
          setDashboardState("Adding prospect to route...");
          const stop = await addOutreachToRoute(id);
          if (stop?.address && !hasRouteCoordinates(stop)) {
            try {
              await geocodeAndStoreRouteStop(stop);
            } catch (error) {
              setDashboardState(error.message || "Route stop added, but map pin lookup failed.", "error");
            }
          }
          await refreshDashboard();
          setActiveSection("route-planner");
          history.replaceState(null, "", "#route-planner");
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to add route stop.", "error");
        }
      } else if (action === "delete-outreach-prospect") {
        const ok = window.confirm("Delete this outreach prospect?");
        if (!ok) return;
        try {
          setDashboardState("Deleting prospect...");
          await deleteRow("outreach_prospects", id);
          state.selectedOutreachIds.delete(id);
          closeSubmissionDrawer();
          await refreshDashboard();
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to delete prospect.", "error");
        }
      } else if (action === "delete-outreach-property") {
        const ok = window.confirm("Delete this managed property?");
        if (!ok) return;
        try {
          setDashboardState("Deleting property...");
          await deleteRow("outreach_properties", id);
          state.selectedOutreachPropertyIds.delete(id);
          closeSubmissionDrawer();
          await refreshDashboard();
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to delete property.", "error");
        }
      } else if (action === "clear-outreach-selection") {
        state.selectedOutreachIds.clear();
        await render();
      } else if (action === "clear-outreach-property-selection") {
        state.selectedOutreachPropertyIds.clear();
        await render();
      } else if (action === "delete-selected-outreach") {
        const ids = Array.from(state.selectedOutreachIds);
        if (!ids.length) return;
        const ok = window.confirm(`Delete ${ids.length} selected prospect${ids.length === 1 ? "" : "s"}?`);
        if (!ok) return;
        try {
          setDashboardState("Deleting selected prospects...");
          for (const selectedId of ids) {
            await deleteRow("outreach_prospects", selectedId);
          }
          state.selectedOutreachIds.clear();
          closeSubmissionDrawer();
          await refreshDashboard();
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to delete selected prospects.", "error");
        }
      } else if (action === "delete-selected-outreach-properties") {
        const ids = Array.from(state.selectedOutreachPropertyIds);
        if (!ids.length) return;
        const ok = window.confirm(`Delete ${ids.length} selected propert${ids.length === 1 ? "y" : "ies"}?`);
        if (!ok) return;
        try {
          setDashboardState("Deleting selected properties...");
          for (const selectedId of ids) {
            await deleteRow("outreach_properties", selectedId);
          }
          state.selectedOutreachPropertyIds.clear();
          closeSubmissionDrawer();
          await refreshDashboard();
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to delete selected properties.", "error");
        }
      } else if (action === "refresh-dashboard") {
        await refreshDashboard();
      } else if (action === "refresh-groundskeeper-ai") {
        try {
          setDashboardState("Refreshing Groundskeeper AI...");
          state.data.groundskeeperAi = await loadGroundskeeperAi();
          await render();
          setDashboardState("Groundskeeper AI refreshed.");
        } catch (error) {
          setDashboardState(error.message || "Unable to refresh Groundskeeper AI.", "error");
        }
      } else if (action === "publish-groundskeeper-ai") {
        try {
          setDashboardState("Publishing Groundskeeper AI updates...");
          await groundskeeperRequest("publish");
          state.data.groundskeeperAi = await loadGroundskeeperAi();
          await render();
          setDashboardState("Groundskeeper AI updates published.");
        } catch (error) {
          setDashboardState(error.message || "Unable to publish AI updates.", "error");
        }
      } else if (action === "save-ai-log-knowledge") {
        try {
          setDashboardState("Saving log as draft knowledge...");
          await saveAiEntryFromLog(id, "ai_knowledge");
          state.data.groundskeeperAi = await loadGroundskeeperAi();
          await render();
          setDashboardState("Saved as draft knowledge. Review and publish when ready.");
        } catch (error) {
          setDashboardState(error.message || "Unable to save AI knowledge.", "error");
        }
      } else if (action === "save-ai-log-rule") {
        try {
          setDashboardState("Saving log as draft rule...");
          await saveAiEntryFromLog(id, "ai_rules");
          state.data.groundskeeperAi = await loadGroundskeeperAi();
          await render();
          setDashboardState("Saved as draft rule. Review and publish when ready.");
        } catch (error) {
          setDashboardState(error.message || "Unable to save AI rule.", "error");
        }
      } else if (action === "export-full-backup") {
        exportFullBackup();
      } else if (action === "export-backend-backup") {
        try {
          setDashboardState("Preparing backend export...");
          await exportBackendBackup();
          setDashboardState("Backend export downloaded.");
        } catch (error) {
          setDashboardState(error.message || "Unable to export backend data.", "error");
        }
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
      } else if (action === "complete-job") {
        try {
          setDashboardState("Marking visit complete...");
          await updateStatus("scheduled_jobs", id, "Completed");
          await refreshDashboard();
          openJobDrawer(id);
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to complete visit.", "error");
        }
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
      if (event.target.matches("[data-users-invite-form]")) {
        event.preventDefault();
        const formData = new FormData(event.target);
        try {
          setDashboardState("Sending dashboard invite...");
          await dashboardUsersRequest("invite", {
            email: String(formData.get("email") || "").trim(),
            role: String(formData.get("role") || "viewer")
          });
          event.target.reset();
          await refreshDashboard();
          setActiveSection("settings");
          setDashboardState("Dashboard invite saved.");
        } catch (error) {
          setDashboardState(error.message || "Unable to send invite.", "error");
        }
      } else if (event.target.matches("[data-call-panel-form]")) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const activityId = event.target.dataset.id || "";
        const leadId = event.target.dataset.leadId || "";
        const leadType = event.target.dataset.leadType || "";
        const phone = phoneInfo(event.target.dataset.phone || "");
        try {
          setDashboardState("Saving call note...");
          if (activityId) {
            await updateLeadActivity(activityId, {
              outcome: String(formData.get("outcome") || "not_set"),
              notes: String(formData.get("notes") || ""),
              follow_up_date: String(formData.get("follow_up_date") || "") || null
            });
          } else {
            if (!phone.valid) throw new Error("No valid phone number.");
            await insertLeadActivity({
              lead_id: leadId,
              lead_type: leadType || "lead",
              phone_number: phone.e164,
              type: "call_attempt",
              outcome: String(formData.get("outcome") || "not_set"),
              notes: String(formData.get("notes") || ""),
              follow_up_date: String(formData.get("follow_up_date") || "") || null
            });
          }
          await refreshDashboard();
          openLeadDrawerByType(leadType, leadId);
          setDashboardState("Call note saved.");
        } catch (error) {
          setDashboardState(error.message || "Unable to save call note.", "error");
        }
      } else if (event.target.matches("[data-call-outcome-form]")) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const activityId = event.target.dataset.id || "";
        const leadId = event.target.dataset.leadId || "";
        const leadType = event.target.dataset.leadType || "";
        try {
          setDashboardState("Saving call outcome...");
          await updateLeadActivity(activityId, {
            outcome: String(formData.get("outcome") || "not_set"),
            notes: String(formData.get("notes") || ""),
            follow_up_date: String(formData.get("follow_up_date") || "") || null
          });
          await refreshDashboard();
          if (leadType === "quote_submission") openSubmissionDrawer(leadId);
          else if (leadType === "contact") openContactDrawer(leadId);
          else if (leadType === "outreach_prospect") openOutreachDrawer(leadId);
          else if (leadType === "outreach_company") openOutreachCompanyDrawer(leadId);
          setDashboardState("Call outcome saved.");
        } catch (error) {
          setDashboardState(error.message || "Unable to save call outcome.", "error");
        }
      } else if (event.target.matches("[data-submission-edit]")) {
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
          const payloads = scheduledJobPayloads(formData, {
            visit_date: String(formData.get("visit_date") || ""),
            visit_window: String(formData.get("visit_window") || ""),
            site_name: item.name,
            city: item.city,
            service: String(formData.get("service") || item.service),
            status: "Scheduled"
          });
          await insertScheduledJobs(payloads);
          await updateStatus("quote_submissions", item.id, "Scheduled");
          await refreshDashboard();
          openSubmissionDrawer(item.id);
          setDashboardState(payloads.length > 1 ? `${payloads.length} recurring visits created.` : "");
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
      } else if (event.target.matches("[data-outreach-company-form]")) {
        event.preventDefault();
        const id = event.target.dataset.id;
        try {
          setDashboardState("Saving company...");
          const existingCompany = state.data.outreachCompanies.find((item) => item.id === id);
          const payload = outreachCompanyPayloadFromForm(event.target);
          const updated = await updateOutreachCompany(id, payload);
          const oldCompanyKey = normalizeDedupeKey(existingCompany?.company || "");
          const linkedProperties = state.data.outreachProperties.filter((property) => property.companyId === id || normalizeDedupeKey(property.company) === oldCompanyKey);
          for (const property of linkedProperties) {
            if (property.company !== payload.company || property.companyId !== id) {
              await updateOutreachProperty(property.id, { company: payload.company, company_id: id });
            }
          }
          await refreshDashboard();
          openOutreachCompanyDrawer(updated?.id || id);
          setDashboardState("Company updated.");
        } catch (error) {
          setDashboardState(error.message || "Unable to save company.", "error");
        }
      } else if (event.target.matches("[data-outreach-property-form]")) {
        event.preventDefault();
        const id = event.target.dataset.id || "";
        const companyId = event.target.dataset.companyId || "";
        const company = state.data.outreachCompanies.find((item) => item.id === companyId);
        if (!company) return;
        try {
          setDashboardState(id ? "Saving property..." : "Adding property...");
          const payload = outreachPropertyPayloadFromForm(event.target, company);
          const saved = id ? await updateOutreachProperty(id, payload) : await insertOutreachProperty(payload);
          if (saved?.address && (saved.lat === null || saved.lng === null)) {
            geocodeAndStoreOutreachProperty(saved).catch(() => {});
          }
          await refreshDashboard();
          openOutreachCompanyDrawer(company.id);
          setDashboardState(id ? "Managed property updated." : "Managed property added.");
        } catch (error) {
          setDashboardState(error.message || "Unable to save managed property.", "error");
        }
      } else if (event.target.matches("[data-outreach-form]")) {
        event.preventDefault();
        const id = event.target.dataset.id;
        try {
          setDashboardState(id ? "Saving prospect..." : "Adding prospect...");
          const payload = outreachPayloadFromForm(event.target);
          const prospect = id ? await updateOutreachProspect(id, payload) : await insertOutreachProspect(payload);
          await refreshDashboard();
          openOutreachDrawer(prospect?.id || id);
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to save prospect.", "error");
        }
      } else if (event.target.matches("[data-training-chat-form]")) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const message = String(formData.get("message") || "").trim();
        if (!message) return;
        try {
          state.trainingMessages.push({ role: "user", content: message });
          event.target.reset();
          renderGroundskeeperAi(state.data);
          const result = await groundskeeperTrainingChat(message);
          state.trainingMessages.push({
            role: "assistant",
            content: result.reply || "I turned that into training guidance you can review.",
            suggestions: result.suggestions || []
          });
          state.data.groundskeeperAi = await loadGroundskeeperAi();
          await render();
          setDashboardState("");
        } catch (error) {
          state.trainingMessages.push({ role: "assistant", content: error.message || "The training assistant is unavailable right now." });
          renderGroundskeeperAi(state.data);
          setDashboardState(error.message || "Unable to train the AI helper.", "error");
        }
      } else if (event.target.matches("[data-training-preview-form]")) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const message = String(formData.get("message") || "").trim();
        if (!message) return;
        try {
          state.trainingPreviewMessages.push({ role: "user", content: message });
          event.target.reset();
          renderGroundskeeperAi(state.data);
          const result = await previewWebsiteHelper(message);
          state.trainingPreviewMessages.push({ role: "assistant", content: result.reply || "No preview response returned." });
          await render();
          setDashboardState("");
        } catch (error) {
          state.trainingPreviewMessages.push({ role: "assistant", content: error.message || "Preview is unavailable right now." });
          renderGroundskeeperAi(state.data);
          setDashboardState(error.message || "Unable to preview the helper.", "error");
        }
      } else if (event.target.matches("[data-training-rule-form]")) {
        event.preventDefault();
        const formData = new FormData(event.target);
        try {
          setDashboardState("Saving training rule...");
          await saveTrainingRule({
            id: event.target.dataset.id,
            title: String(formData.get("title") || "").trim(),
            category: String(formData.get("category") || "other"),
            content: String(formData.get("content") || "").trim(),
            status: String(formData.get("status") || "draft"),
            priority: Number(formData.get("priority") || 50) || 50,
            visibility: "public"
          });
          state.trainingEditingRuleId = "";
          state.data.groundskeeperAi = await loadGroundskeeperAi();
          await render();
          setDashboardState("Training rule saved.");
        } catch (error) {
          setDashboardState(error.message || "Unable to save training rule.", "error");
        }
      } else if (event.target.matches("[data-groundskeeper-entry-form]")) {
        event.preventDefault();
        try {
          setDashboardState("Saving Groundskeeper AI entry...");
          const requestedStatus = event.submitter?.dataset.aiSaveStatus;
          if (requestedStatus && event.target.elements.status) event.target.elements.status.value = requestedStatus;
          const payload = aiEntryPayloadFromForm(event.target);
          await groundskeeperRequest("upsert", payload);
          event.target.reset();
          state.data.groundskeeperAi = await loadGroundskeeperAi();
          await render();
          setDashboardState("Groundskeeper AI entry saved. Publish when it should affect the public helper.");
        } catch (error) {
          setDashboardState(error.message || "Unable to save AI entry.", "error");
        }
      } else if (event.target.matches("[data-groundskeeper-chat-form]")) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const message = String(formData.get("message") || "").trim();
        if (!message) return;
        try {
          state.groundskeeperMessages.push({ role: "user", content: message });
          event.target.reset();
          renderGroundskeeperChat();
          const reply = await groundskeeperChat(message);
          state.groundskeeperMessages.push({ role: "assistant", content: reply });
          state.data.groundskeeperAi = await loadGroundskeeperAi();
          await render();
          setDashboardState("");
        } catch (error) {
          state.groundskeeperMessages.push({ role: "assistant", content: error.message || "The Groundskeeper is unavailable." });
          renderGroundskeeperChat();
          setDashboardState(error.message || "Unable to ask The Groundskeeper.", "error");
        }
      } else if (event.target.matches("[data-job-create-form]")) {
        event.preventDefault();
        const formData = new FormData(event.target);
        try {
          setDashboardState("Adding visit...");
          const payloads = scheduledJobPayloads(formData, {
            visit_date: String(formData.get("visit_date") || ""),
            visit_window: String(formData.get("visit_window") || ""),
            site_name: String(formData.get("site_name") || ""),
            city: String(formData.get("city") || ""),
            service: String(formData.get("service") || ""),
            status: "Scheduled"
          });
          await insertScheduledJobs(payloads);
          event.target.reset();
          const controls = event.target.querySelector("[data-recurring-controls]");
          if (controls) controls.hidden = true;
          await refreshDashboard();
          setDashboardState(payloads.length > 1 ? `${payloads.length} recurring visits created.` : "");
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
      } else if (event.target.matches("[data-equipment-form]")) {
        event.preventDefault();
        const id = String(new FormData(event.target).get("id") || "");
        try {
          setDashboardState(id ? "Saving equipment..." : "Adding equipment...");
          const payload = equipmentPayloadFromForm(event.target);
          if (!payload.name) return;
          if (id) {
            await updateEquipmentItem(id, payload);
          } else {
            await insertEquipmentItem(payload);
          }
          event.target.reset();
          state.equipmentView = "inventory";
          await refreshDashboard();
          setActiveSection("equipment");
          setDashboardState(id ? "Equipment updated." : "Equipment added.");
        } catch (error) {
          setDashboardState(error.message || "Unable to save equipment.", "error");
        }
      } else if (event.target.matches("[data-equipment-maintenance-form]")) {
        event.preventDefault();
        try {
          setDashboardState("Saving maintenance...");
          const payload = maintenancePayloadFromForm(event.target);
          if (!payload.equipment_id) throw new Error("Add an inventory item first.");
          await insertEquipmentMaintenance(payload);
          await updateEquipmentItem(payload.equipment_id, {
            last_maintenance_date: payload.maintenance_date,
            next_maintenance_date: payload.next_maintenance_date,
            status: "Ready"
          });
          event.target.reset();
          state.equipmentView = "maintenance";
          await refreshDashboard();
          setActiveSection("equipment");
          setDashboardState("Maintenance saved.");
        } catch (error) {
          setDashboardState(error.message || "Unable to save maintenance.", "error");
        }
      } else if (event.target.matches("[data-hardware-guide-form]")) {
        event.preventDefault();
        const id = String(new FormData(event.target).get("id") || "");
        try {
          setDashboardState(id ? "Saving guide item..." : "Adding guide item...");
          const payload = hardwarePayloadFromForm(event.target);
          if (!payload.name) return;
          if (id) {
            await updateHardwareGuideItem(id, payload);
          } else {
            await insertHardwareGuideItem(payload);
          }
          event.target.reset();
          state.equipmentView = "guide";
          await refreshDashboard();
          setActiveSection("equipment");
          setDashboardState(id ? "Guide item updated." : "Guide item added.");
        } catch (error) {
          setDashboardState(error.message || "Unable to save guide item.", "error");
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

    if (els.detailDrawer) {
      els.detailDrawer.addEventListener("click", (event) => {
        if (event.target === els.detailDrawer) {
          closeSubmissionDrawer();
        }
      });
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && els.detailDrawer && !els.detailDrawer.hidden) {
        closeSubmissionDrawer();
      }
    });

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
    els.environmentIndicator = qs("[data-environment-indicator]");
    els.sidebarUserName = qs("[data-sidebar-user-name]");
    els.sidebarUserRole = qs("[data-sidebar-user-role]");
    els.sidebarUserAvatar = qs("[data-sidebar-user-avatar]");
    els.sidebarUserInitials = qs("[data-sidebar-user-initials]");
    els.headerUserAvatar = qs("[data-header-user-avatar]");
    els.headerUserInitials = qs("[data-header-user-initials]");
    els.sidebar = qs("#dashboard-sidebar");
    els.signOut = qs("[data-sign-out]");
    els.newNote = qs("[data-new-note]");
    els.refreshDashboard = qs("[data-refresh-dashboard]");
    els.dashboardState = qs("[data-dashboard-state]");
    els.search = qs("[data-dashboard-search]");
    els.globalSearch = qs("[data-global-search]");
    els.overviewSearch = qs("[data-overview-search]");
    els.workSearch = qs("[data-work-search]");
    els.clientSearch = qs("[data-client-search]");
    els.outreachSearch = qs("[data-outreach-search]");
    els.outreachCompanySearch = qs("[data-outreach-company-search]");
    els.outreachPropertySearch = qs("[data-outreach-property-search]");
    els.outreachStatusFilter = qs("[data-outreach-status-filter]");
    els.outreachTypeFilter = qs("[data-outreach-type-filter]");
    els.outreachServiceFilter = qs("[data-outreach-service-filter]");
    els.outreachPriorityFilter = qs("[data-outreach-priority-filter]");
    els.outreachCompanyStatusFilter = qs("[data-outreach-company-status-filter]");
    els.outreachCompanyPriorityFilter = qs("[data-outreach-company-priority-filter]");
    els.outreachPropertyCompanyFilter = qs("[data-outreach-property-company-filter]");
    els.outreachPropertyCityFilter = qs("[data-outreach-property-city-filter]");
    els.outreachPropertyNeighborhoodFilter = qs("[data-outreach-property-neighborhood-filter]");
    els.outreachPropertyServiceFilter = qs("[data-outreach-property-service-filter]");
    els.outreachPropertyStatusFilter = qs("[data-outreach-property-status-filter]");
    els.outreachPropertyPriorityFilter = qs("[data-outreach-property-priority-filter]");
    els.outreachPropertyNeedsFilter = qs("[data-outreach-property-needs-filter]");
    els.outreachPropertyVerifiedFilter = qs("[data-outreach-property-verified-filter]");
    els.outreachMetrics = qs("[data-outreach-metrics]");
    els.outreachFollowups = qs("[data-outreach-followups]");
    els.outreachHot = qs("[data-outreach-hot]");
    els.outreachCompanyTable = qs("[data-outreach-company-table]");
    els.outreachCompanyCards = qs("[data-outreach-company-cards]");
    els.outreachPropertyTable = qs("[data-outreach-property-table]");
    els.outreachPropertyCards = qs("[data-outreach-property-cards]");
    els.outreachPropertyBulkBar = qs("[data-outreach-property-bulk-bar]");
    els.outreachPropertySelectedCount = qs("[data-outreach-property-selected-count]");
    els.outreachPropertySelectAll = qs("[data-outreach-property-select-all]");
    els.outreachTable = qs("[data-outreach-table]");
    els.outreachCards = qs("[data-outreach-cards]");
    els.outreachArchive = qs("[data-outreach-archive]");
    els.outreachArchiveCount = qs("[data-outreach-archive-count]");
    els.outreachBulkBar = qs("[data-outreach-bulk-bar]");
    els.outreachSelectedCount = qs("[data-outreach-selected-count]");
    els.outreachSelectAll = qs("[data-outreach-select-all]");
    els.outreachImport = qs("[data-outreach-import]");
    els.equipmentSearch = qs("[data-equipment-search]");
    els.equipmentCategoryFilter = qs("[data-equipment-category-filter]");
    els.equipmentStatusFilter = qs("[data-equipment-status-filter]");
    els.equipmentConditionFilter = qs("[data-equipment-condition-filter]");
    els.equipmentPriorityFilter = qs("[data-equipment-priority-filter]");
    els.equipmentTable = qs("[data-equipment-table]");
    els.equipmentCards = qs("[data-equipment-cards]");
    els.equipmentMaintenanceItemOptions = qs("[data-equipment-maintenance-item-options]");
    els.equipmentMaintenanceList = qs("[data-equipment-maintenance-list]");
    els.hardwareGuideList = qs("[data-hardware-guide-list]");
    els.equipmentWishlist = qs("[data-equipment-wishlist]");
    els.propertyFilter = qs("[data-property-filter]");
    els.pipeline = qs("[data-pipeline]");
    els.documents = qs("[data-documents]");
    els.calendarFilter = qs("[data-calendar-filter]");
    els.calendarRangeControls = qs("[data-calendar-range-controls]");
    els.calendarRangeLabel = qs("[data-calendar-range-label]");
    els.workSnapshot = qs("[data-work-snapshot]");
    els.workSchedule = qs("[data-work-schedule]");
    els.workRoute = qs("[data-work-route]");
    els.workPipeline = qs("[data-work-pipeline]");
    els.workTasks = qs("[data-work-tasks]");
    els.workActivity = qs("[data-work-activity]");
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
    els.userAvatarUpload = qs("[data-user-avatar-upload]");
    els.usersAccessStatus = qs("[data-users-access-status]");
    els.usersAccessList = qs("[data-users-access-list]");
    els.activityLogList = qs("[data-activity-log-list]");
    els.groundskeeperAiStatus = qs("[data-groundskeeper-ai-status]");
    els.aiNav = qs("[data-ai-nav]");
    els.aiMain = qs("[data-ai-main]");
    els.aiSearch = qs("[data-ai-search]");
    els.groundskeeperChat = qs("[data-groundskeeper-chat]");
    els.groundskeeperChatForm = qs("[data-groundskeeper-chat-form]");
    els.groundskeeperEntryForm = qs("[data-groundskeeper-entry-form]");
    els.aiSettingsList = qs("[data-ai-settings-list]");
    els.aiKnowledgeList = qs("[data-ai-knowledge-list]");
    els.aiFaqList = qs("[data-ai-faq-list]");
    els.aiRulesList = qs("[data-ai-rules-list]");
    els.aiSavedAnswersList = qs("[data-ai-saved-answers-list]");
    els.aiLogsList = qs("[data-ai-logs-list]");
    els.homeReminders = qs("[data-home-reminders]");
    els.homeNotes = qs("[data-home-notes]");
    els.todayRouteSnapshot = qs("[data-today-route-snapshot]");
    els.dashboardAlerts = qs("[data-dashboard-alerts]");
    els.overdueJobs = qs("[data-overdue-jobs]");
    els.calendarOverdueJobs = qs("[data-calendar-overdue-jobs]");
    els.todayChip = qs("[data-today-chip]");
    els.detailDrawer = qs("[data-detail-drawer]");
    els.detailContent = qs("[data-detail-content]");
    els.closeDetail = qs("[data-close-detail]");
    els.pullRefresh = qs("[data-pull-refresh]");
    els.demoBadge = qs("[data-demo-badge]");
    els.metrics = qs("[data-metrics]");
    els.notificationButton = qs("[data-notification-button]");
    els.notificationCount = qs("[data-notification-count]");
    els.notificationPanel = qs("[data-notification-panel]");
    els.notificationSummary = qs("[data-notification-summary]");
    els.notificationList = qs("[data-notification-list]");
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
    applyDashboardPreferences();
    cacheElements();
    bindEvents();
    const hashSection = window.location.hash.replace("#", "");
    if (hashSection) state.activeSection = sectionAliases[hashSection] || hashSection;

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

