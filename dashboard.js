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
  const SIDEBAR_CLOSE_SETTLE_MS = 280;
  const USER_AVATAR_MAX_BYTES = 2 * 1024 * 1024;
  const USER_AVATAR_ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
  const USER_AVATAR_ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);
  const PROTECTED_USER_EMAIL = "team@urbanyards.us";
  const DASHBOARD_ROLES = ["owner", "admin", "manager", "sales_outreach", "accountant", "field_worker", "worker", "staff", "viewer"];
  const DASHBOARD_ROLE_LABELS = {
    owner: "Owner",
    admin: "Admin",
    manager: "Manager",
    sales_outreach: "Leads",
    accountant: "Money",
    field_worker: "Work",
    worker: "Worker",
    staff: "Staff",
    viewer: "Viewer"
  };
  const DASHBOARD_ROLE_PERMISSIONS = {
    owner: ["*"],
    admin: ["*"],
    manager: ["view", "create", "edit", "archive", "import", "export"],
    sales_outreach: ["view", "create", "edit", "import", "export"],
    accountant: ["view", "create", "edit", "export"],
    field_worker: ["view", "create", "edit"],
    worker: ["view", "create", "edit"],
    staff: ["view", "create", "edit"],
    viewer: ["view"]
  };
  const DASHBOARD_WORKSPACE_ACCESS = {
    overview: ["owner", "admin", "manager", "sales_outreach", "accountant", "field_worker", "worker", "staff", "viewer"],
    tickets: ["owner", "admin", "manager", "sales_outreach", "accountant", "field_worker", "worker", "staff"],
    calendar: ["owner", "admin", "manager", "field_worker", "worker", "staff"],
    outreach: ["owner", "admin", "manager", "sales_outreach", "staff"],
    documents: ["owner", "admin", "manager", "accountant"],
    settings: ["owner", "admin"]
  };
  const DASHBOARD_ROLE_DEFAULT_SECTIONS = {
    owner: "overview",
    admin: "overview",
    manager: "overview",
    sales_outreach: "outreach",
    accountant: "documents",
    field_worker: "calendar",
    worker: "calendar",
    staff: "overview",
    viewer: "overview"
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
  const IMPORT_EXPORT_VIEWS = {
    import: "Import Data",
    export: "Export Data",
    sheets: "Google Sheets",
    history: "Backups & History"
  };
  const IMPORT_EXPORT_DEFAULT_MODULE = "outreach_prospects";
  const IMPORT_EXPORT_FORMATS = ["xlsx", "csv", "pdf", "json"];
  const IMPORT_EXPORT_TEMPLATE_FORMATS = ["xlsx", "csv"];
  const DOCUMENTATION_DEFAULT_VIEW = "archive";
  const DOCUMENTATION_STATUSES = ["Active", "Inactive", "Not Started", "In Progress", "Submitted", "Needs Correction", "Approved", "Overdue", "Archived"];
  const DOCUMENTATION_ARCHIVE_TYPES = ["Template", "Submission", "Attachment"];
  const DOCUMENTATION_CATEGORIES = [
    "Property Cleaning",
    "Property Inspection",
    "Grounds Maintenance",
    "Equipment Inspection",
    "Incident Report",
    "Job Completion",
    "Employee Documentation",
    "Customer Authorization",
    "Safety Documentation",
    "Custom Forms"
  ];
  const DOCUMENTATION_MAX_FILE_BYTES = 15 * 1024 * 1024;
  const JOB_SITE_PHOTO_MAX_FILES = 10;
  const DOCUMENTATION_ALLOWED_EXTENSIONS = new Set(["pdf", "docx", "jpg", "jpeg", "png", "webp", "xlsx", "csv"]);
  const DOCUMENTATION_ALLOWED_MIME_TYPES = new Set([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/jpeg",
    "image/png",
    "image/webp",
    "text/csv",
    "application/csv",
    "application/octet-stream"
  ]);
  const DOCUMENTATION_VIEW_LABELS = {
    archive: "Forms Archive",
    upload: "Upload Form",
    assign: "Assign Forms",
    forms: "Assign Forms",
    submitted: "Submitted Forms",
    templates: "Template Library",
    audit: "Audit History"
  };
  const BUDGET_STATUSES = ["Draft", "Ready for Review", "Approved", "Active", "At Risk", "Over Budget", "Completed", "Archived"];
  const BUDGET_JOB_STATUSES = ["Not Scheduled", "Scheduled", "In Progress", "Completed", "Invoiced"];
  const BUDGET_COST_CATEGORIES = ["Disposal and dump fees", "Delivery fees", "Mileage", "Travel time", "Parking", "Permits", "Subcontractors", "Equipment rentals", "Payment processing fees", "Administrative costs", "Miscellaneous expenses", "Contingency"];
  const BUDGET_DEFAULT_SETTINGS = {
    default_target_margin: 35,
    minimum_margin: 15,
    warning_margin: 25,
    default_contingency_percent: 10,
    default_labor_burden_percent: 18,
    payment_processing_percent: 3,
    owner_hourly_rate: 55
  };
  const BUDGET_DETAIL_TABS = [
    { key: "overview", label: "Overview" },
    { key: "labor", label: "Labor" },
    { key: "materials", label: "Materials" },
    { key: "equipment", label: "Equipment" },
    { key: "costs", label: "Other Costs" },
    { key: "change_orders", label: "Change Orders" },
    { key: "documents", label: "Documents" },
    { key: "history", label: "History" },
    { key: "reports", label: "Reports" }
  ];
  const DEMO_QUERY_KEYS = ["demo", "test"];
  const DASHBOARD_ICON_PATH = "images/dashboard-icons/";
  const HOME_DASHBOARD_ICON_PATH = "images/home-dashboard/";
  const WORK_DASHBOARD_ICON_PATH = "images/work-dashboard/";
  const DASHBOARD_DATA_KEYS = [
    "submissions",
    "contacts",
    "jobs",
    "tickets",
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
    "documentation",
    "importExport",
    "leadActivity",
    "userProfiles",
    "auditLogs"
  ];
  const GLOBAL_ADD_ITEMS = [
    { key: "prospect", label: "Prospect", action: "new-outreach-prospect", icon: "outreach-send.svg", permission: "create" },
    { key: "contact", label: "Contact", action: "quick-add-client", icon: "new-lead-user.svg", permission: "create" },
    { key: "property", label: "Property", action: "quick-add-property", icon: "properties-building.svg", permission: "create" },
    { key: "job", label: "Job", action: "quick-add-job", icon: "calendar.svg", permission: "create" },
    { key: "follow-up", label: "Follow-up", action: "quick-add-follow-up", icon: "upcoming-clock.svg", permission: "create" },
    { key: "equipment", label: "Equipment Item", action: "quick-add-equipment", icon: "activity-check-circle.svg", permission: "create" }
  ];
  const FOLLOW_UP_SUGGESTIONS = [
    ["tomorrow", "Tomorrow", 1],
    ["three-days", "3 Days", 3],
    ["one-week", "1 Week", 7],
    ["two-weeks", "2 Weeks", 14]
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
    documentationView: DOCUMENTATION_DEFAULT_VIEW,
    documentationSearch: "",
    documentationTypeFilter: "All",
    documentationStatusFilter: "All",
    documentationCategoryFilter: "All",
    importExportView: "import",
    importExportModule: IMPORT_EXPORT_DEFAULT_MODULE,
    importExportFormat: "xlsx",
    importExportTemplateFormat: "xlsx",
    importExportPendingFile: null,
    importExportPreview: null,
    importExportHistoryLoadedAt: "",
    ticketBoardSearch: "",
    ticketBoardStageFilter: "All",
    ticketBoardOwnerFilter: "All",
    addMenuOpen: false,
    globalSearchOpen: false,
    globalSearchActiveIndex: -1,
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
    ticketsReady: false,
    ticketEventsReady: false,
    ticketsError: "",
    groundskeeperAiReady: false,
    groundskeeperAiError: "",
    documentationReady: false,
    documentationError: "",
    importExportReady: false,
    importExportError: "",
    budgetsReady: false,
    budgetsError: "",
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
      tickets: [],
      ticketEvents: [],
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
      },
      documentation: {
        assignments: [],
        submissions: [],
        templates: [],
        audit: []
      },
      importExport: {
        modules: [],
        limits: {},
        history: { imports: [], exports: [], syncs: [], backups: [] },
        google: { configured: false, connections: [] },
        fallback: ""
      },
      budgets: emptyBudgetBundle()
    },
    moduleErrors: [],
    lastRefreshAt: "",
    loading: false,
    error: ""
  };

  const els = {};
  const sectionAliases = {
    home: "overview",
    tickets: "tickets",
    ticket: "tickets",
    "job-tickets": "tickets",
    work: "calendar",
    properties: "outreach",
    contacts: "outreach",
    clients: "outreach",
    leads: "outreach",
    sales: "outreach",
    more: "settings",
    docs: "settings",
    forms: "settings",
    documentation: "settings",
    "import-export": "settings",
    data: "settings",
    equipment: "settings",
    "groundskeeper-ai": "settings",
    ai: "settings",
    tools: "settings",
    "route-planner": "calendar",
    route: "calendar",
    quotes: "documents",
    money: "documents",
    pipeline: "documents",
    schedule: "calendar",
    operations: "tickets",
    "connected-operations": "tickets",
    budgets: "documents",
    budget: "documents",
    "job-budgeter": "documents",
    "command-center": "tickets",
    notes: "settings",
    reminders: "settings"
  };
  const rebuildPrimarySections = new Set(["overview", "tickets", "calendar", "outreach", "documents", "settings"]);
  const DEFAULT_DASHBOARD_SECTION = "overview";
  const supportModuleWarningNames = new Set([
    "operations",
    "route planner",
    "equipment",
    "equipment maintenance",
    "hardware guide",
    "Groundskeeper AI",
    "Documentation",
    "Import & Export",
    "import/export",
    "call history",
    "user profiles",
    "users access",
    "audit logs",
    "activity log",
    "profile avatar",
    "environment indicator",
    "dashboard health",
    "global add menu",
    "global search",
    "avatar fallbacks",
    "canonical tickets"
  ]);
  let demoIdCount = 100;
  let googleRouteMap = null;
  let googleRouteLine = null;
  let googleMapsLoadPromise = null;
  let googleMapsBrowserKeyPromise = null;
  let sidebarCloseTimer = null;
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
      "download-documentation-template": "DL",
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
      "go-contacts": "Open",
      "go-documents": "$",
      "go-leads": "Open",
      "go-money": "$",
      "go-route-planner": "M",
      "go-settings": "Open",
      "go-tickets": "Open",
      "go-tools": "Open",
      "go-work": "+",
      "refresh-documentation": "R",
      "import-outreach-csv": "CSV",
      "mark-route-complete": "OK",
      "mark-outreach-contacted": "OK",
      "move-route-down": "v",
      "move-route-up": "^",
      "new-outreach-prospect": "+",
      "open-route-map": "M",
      "open-contact": "Open",
      "open-document": "Open",
      "open-documentation-form": "Open",
      "open-outreach-prospect": "Open",
      "open-submission": "Open",
      "print-document": "PDF",
      "request-documentation-corrections": "!",
      "quick-add-equipment": "+",
      "quick-add-job": "+",
      "quick-add-operation": "+",
      "quick-add-property": "+",
      "quick-add-quote": "+",
      "review-import-history": "IN",
      "approve-documentation-submission": "OK",
      "reject-documentation-submission": "x",
      "reschedule-job": "R",
      "route-outreach-prospect": "M",
      "save": "OK",
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

  function authErrorMessage(error) {
    return /sign in|jwt|token|auth|unauthorized|permission|401|403/i.test(String(error?.message || ""));
  }

  function safeModuleMessage(error) {
    if (authErrorMessage(error)) return "Authentication or permissions need attention.";
    if (/does not exist|schema cache|relation|table/i.test(String(error?.message || ""))) return "Required table may be unavailable.";
    if (/network|failed to fetch|timeout|abort/i.test(String(error?.message || ""))) return "Network or backend request failed.";
    return "Module could not load.";
  }

  function isMissingOptionalTableError(error) {
    return /does not exist|schema cache|relation|table|could not find the table/i.test(String(error?.message || ""));
  }

  function moduleWarningScope(name) {
    const key = String(name || "").replace(/^render:/, "");
    return supportModuleWarningNames.has(key) ? "support" : "critical";
  }

  function recordModuleError(name, error) {
    const message = safeModuleMessage(error);
    state.moduleErrors.push({
      name,
      message,
      detail: error?.message || String(error || ""),
      scope: moduleWarningScope(name),
      occurredAt: new Date().toISOString()
    });
    if (config.appEnv !== "production") {
      console.warn(`[dashboard:${name}]`, error);
    }
  }

  async function loadModule(name, loader, fallback) {
    try {
      const value = await loader();
      return value;
    } catch (error) {
      recordModuleError(name, error);
      return typeof fallback === "function" ? fallback() : fallback;
    }
  }

  function safeRender(name, renderer) {
    try {
      renderer();
    } catch (error) {
      recordModuleError(`render:${name}`, error);
      setDashboardState(`${name} could not render. Other dashboard sections are still available.`, "error");
    }
  }

  function dashboardCanCreate() {
    return hasDashboardPermission("create");
  }

  function setGlobalAddOpen(open) {
    state.addMenuOpen = Boolean(open);
    renderGlobalAddMenu();
  }

  function renderGlobalAddMenu() {
    if (!els.globalAddMenu || !els.globalAddButton) return;
    els.globalAddButton.setAttribute("aria-expanded", state.addMenuOpen ? "true" : "false");
    els.globalAddMenu.hidden = !state.addMenuOpen;
    if (!state.addMenuOpen) return;
    const items = GLOBAL_ADD_ITEMS.filter((item) => !item.permission || hasDashboardPermission(item.permission));
    els.globalAddMenu.innerHTML = items.length ? items.map((item) => `
      <button type="button" role="menuitem" data-action="${escapeHtml(item.action)}">
        <img src="${dashboardIcon(item.icon)}" alt="" aria-hidden="true">
        <span>${escapeHtml(item.label)}</span>
      </button>
    `).join("") : `<div class="global-add-empty">You do not have permission to add records.</div>`;
  }

  function closeGlobalSearchPanel() {
    state.globalSearchOpen = false;
    state.globalSearchActiveIndex = -1;
    renderGlobalSearchPanel();
  }

  function recordMatchesGlobalQuery(values, query) {
    const normalizedQuery = normalizeLookup(query);
    const digits = String(query || "").replace(/\D/g, "");
    if (!normalizedQuery && digits.length < 3) return false;
    return values.some((value) => {
      const normalized = normalizeLookup(value);
      const valueDigits = String(value || "").replace(/\D/g, "");
      return Boolean(
        (normalizedQuery && normalized.includes(normalizedQuery))
        || (digits.length >= 3 && valueDigits.includes(digits))
      );
    });
  }

  function groupedGlobalSearchResults(query, data = state.data) {
    const search = String(query || "").trim();
    if (search.length < 2) return [];
    const groups = [
      {
        label: "Contacts",
        rows: data.contacts
          .filter((item) => recordMatchesGlobalQuery([item.name, item.email, item.phone, item.city, item.type], search))
          .slice(0, 5)
          .map((item) => ({
            title: item.name,
            detail: [item.type, item.city, phoneInfo(item.phone).valid ? phoneInfo(item.phone).display : ""].filter(Boolean).join(" / "),
            action: "open-contact",
            id: item.id,
            phone: item.phone,
            leadType: "contact"
          }))
      },
      {
        label: "Companies",
        rows: data.outreachCompanies
          .filter((item) => recordMatchesGlobalQuery([item.company, item.contact, item.email, item.phone, item.website, item.serviceArea, item.notes], search))
          .slice(0, 5)
          .map((item) => ({
            title: item.company,
            detail: [item.contact, item.serviceArea || item.city, phoneInfo(item.phone).valid ? phoneInfo(item.phone).display : ""].filter(Boolean).join(" / "),
            action: "open-outreach-company",
            id: item.id,
            phone: item.phone,
            leadType: "outreach_company"
          }))
      },
      {
        label: "Properties",
        rows: data.outreachProperties
          .filter((item) => recordMatchesGlobalQuery([item.propertyName, item.company, item.address, item.city, item.neighborhood, item.visibleNeeds, item.notes], search))
          .slice(0, 5)
          .map((item) => ({
            title: item.propertyName || item.address || "Managed property",
            detail: [item.company, item.address, item.city].filter(Boolean).join(" / "),
            action: "open-outreach-property",
            id: item.id
          }))
      },
      {
        label: "Prospects",
        rows: data.outreachProspects
          .filter((item) => recordMatchesGlobalQuery([item.propertyName, item.managementCompany, item.contactName, item.email, item.phone, item.address, item.city, item.notes], search))
          .slice(0, 5)
          .map((item) => ({
            title: item.contactName || item.propertyName || "Prospect",
            detail: [item.managementCompany, item.city, phoneInfo(item.phone).valid ? phoneInfo(item.phone).display : ""].filter(Boolean).join(" / "),
            action: "open-outreach-prospect",
            id: item.id,
            phone: item.phone,
            leadType: "outreach_prospect"
          }))
      },
      {
        label: "Jobs",
        rows: data.jobs
          .filter((item) => recordMatchesGlobalQuery([item.site, item.city, item.service, item.status, item.date, item.window], search))
          .slice(0, 5)
          .map((item) => ({
            title: item.site,
            detail: [item.service, item.date, item.status].filter(Boolean).join(" / "),
            action: "edit-job",
            id: item.id
          }))
      },
      {
        label: "Notes",
        rows: data.notes
          .filter((item) => recordMatchesGlobalQuery([item.title, item.body, item.date], search))
          .slice(0, 4)
          .map((item) => ({
            title: item.title,
            detail: item.body || item.date,
            action: "",
            id: item.id
          }))
      }
    ].map((group) => ({ ...group, rows: group.rows.filter(Boolean) })).filter((group) => group.rows.length);
    return groups;
  }

  function globalSearchFlatResults(groups) {
    return groups.flatMap((group) => group.rows.map((row) => ({ ...row, group: group.label })));
  }

  function renderGlobalSearchPanel() {
    if (!els.globalSearchPanel) return;
    const query = String(state.search || "").trim();
    const groups = state.globalSearchOpen ? groupedGlobalSearchResults(query) : [];
    const flat = globalSearchFlatResults(groups);
    if (!state.globalSearchOpen || query.length < 2) {
      els.globalSearchPanel.hidden = true;
      els.globalSearchPanel.innerHTML = "";
      return;
    }
    els.globalSearchPanel.hidden = false;
    if (!flat.length) {
      els.globalSearchPanel.innerHTML = `
        <div class="global-search-empty">
          <strong>No matching results</strong>
          <span>Try another name, phone number, address, or email.</span>
        </div>
      `;
      return;
    }
    let flatIndex = -1;
    els.globalSearchPanel.innerHTML = groups.map((group) => `
      <section class="global-search-group">
        <h4>${escapeHtml(group.label)}</h4>
        ${group.rows.map((row) => {
          flatIndex += 1;
          const isActive = flatIndex === state.globalSearchActiveIndex;
          const phone = phoneInfo(row.phone);
          return `
            <div class="global-search-result-row${isActive ? " is-active" : ""}">
              ${row.action ? `<button class="global-search-result" type="button" data-global-search-result data-action="${escapeHtml(row.action)}" data-id="${escapeHtml(row.id)}">
                <span><strong>${escapeHtml(row.title)}</strong><small>${escapeHtml(row.detail || row.group || "")}</small></span>
              </button>` : `<div class="global-search-result"><span><strong>${escapeHtml(row.title)}</strong><small>${escapeHtml(row.detail || "")}</small></span></div>`}
              ${phone.valid ? `<button class="inline-action" type="button" data-action="call-lead" data-id="${escapeHtml(row.id)}" data-lead-type="${escapeHtml(row.leadType || "lead")}" data-phone="${escapeHtml(phone.e164)}">Call</button>` : ""}
            </div>
          `;
        }).join("")}
      </section>
    `).join("");
  }

  function openGlobalSearchResult(row) {
    if (!row || !row.action) return;
    closeGlobalSearchPanel();
    if (row.action === "open-contact") openContactDrawer(row.id);
    else if (row.action === "open-outreach-company") openOutreachCompanyDrawer(row.id);
    else if (row.action === "open-outreach-property") openOutreachPropertyDrawer(row.id);
    else if (row.action === "open-outreach-prospect") openOutreachDrawer(row.id);
    else if (row.action === "edit-job") openJobDrawer(row.id);
  }

  function dueStatusLabel(dateRaw) {
    const today = todayKey();
    if (!dateRaw) return "Upcoming";
    if (dateRaw < today) return "Overdue";
    if (dateRaw === today) return "Today";
    return "Upcoming";
  }

  function urgencyRank(dateRaw, fallback = 3) {
    const today = todayKey();
    if (!dateRaw) return fallback;
    if (dateRaw < today) return 0;
    if (dateRaw === today) return 1;
    return 2;
  }

  function ticketActionUrgency(ticket, today = todayKey()) {
    const stage = ticketStage(ticket);
    if (["paused", "needs_owner_approval", "field_work_complete", "completion_review", "invoice_review", "invoice_sent", "partially_paid"].includes(stage)) return 0;
    if (["needs_budget", "budget_in_progress", "quote_pending", "customer_approval_pending", "scope_change_requested"].includes(stage)) return 1;
    if (["sales_intake", "scope_in_progress", "ready_to_schedule"].includes(stage)) return 2;
    const dateRaw = dateKey(ticket.dateRaw);
    if (dateRaw && dateRaw <= today) return 2;
    return 3;
  }

  function ticketActionItems(data = state.data) {
    const today = todayKey();
    return dashboardTickets(data)
      .filter(ticketIsOpen)
      .map((ticket) => {
        const stage = ticketStage(ticket);
        const transitionMissing = ticketTransitionOptions(ticket).flatMap((item) => item.missing || []);
        const currentMissing = ticket.source === "ticket" ? ticketMissingRequirementsForStage(ticket, stage) : [];
        const blockers = Array.from(new Set([...(ticket.blockers || []), ...currentMissing, ...transitionMissing].filter(Boolean))).slice(0, 4);
        const urgency = ticketActionUrgency(ticket, today);
        return {
          type: "ticket",
          status: ticketStageLabel(stage),
          urgency,
          title: `${ticket.number || "Ticket"} / ${ticket.customer || ticket.title}`,
          detail: blockers.length
            ? `Missing: ${blockers.join(", ")}`
            : `${ticket.ownerLabel || "Unassigned"} / ${ticket.nextAction || "Open ticket"}`,
          action: "open-ticket",
          actionLabel: "Open Ticket",
          id: ticket.id,
          ticketSource: ticket.source,
          blockerCount: blockers.length
        };
      })
      .filter((item) => item.blockerCount || item.urgency < 3)
      .sort((a, b) => (a.urgency - b.urgency) || (b.blockerCount - a.blockerCount) || String(a.title).localeCompare(String(b.title)))
      .slice(0, 6);
  }

  function todayActionItems(data = state.data) {
    const today = todayKey();
    const soon = daysFromToday(3);
    const items = [];
    const push = (item) => items.push({ id: `${item.type || "item"}-${item.id || items.length}`, ...item });

    ticketActionItems(data).forEach(push);

    overdueJobs(data).slice(0, 4).forEach((job) => push({
      type: "job",
      status: "Overdue",
      urgency: 0,
      title: `${job.site} missed its deadline`,
      detail: `${job.date} / ${job.service}`,
      action: "reschedule-job",
      actionLabel: "Reschedule",
      id: job.id
    }));

    data.reminders
      .filter((item) => item.status !== "Completed" && item.dueRaw && item.dueRaw <= soon)
      .slice(0, 5)
      .forEach((item) => push({
        type: "follow-up",
        status: dueStatusLabel(item.dueRaw),
        urgency: urgencyRank(item.dueRaw),
        title: item.task,
        detail: item.dueRaw ? `Due ${item.due}` : "Follow-up",
        action: "complete-reminder",
        actionLabel: "Done",
        id: item.id
      }));

    data.outreachProspects
      .filter((item) => OUTREACH_ACTIVE_STATUSES.includes(item.status) && item.nextFollowUpAtRaw && item.nextFollowUpAtRaw <= soon)
      .slice(0, 6)
      .forEach((item) => {
        const phone = phoneInfo(item.phone);
        push({
          type: "lead",
          status: dueStatusLabel(item.nextFollowUpAtRaw),
          urgency: urgencyRank(item.nextFollowUpAtRaw),
          title: item.contactName || item.propertyName || "Prospect follow-up",
          detail: [item.managementCompany, item.nextFollowUpAt].filter(Boolean).join(" / "),
          action: phone.valid ? "call-lead" : "open-outreach-prospect",
          actionLabel: phone.valid ? "Call" : "Open",
          id: item.id,
          leadType: "outreach_prospect",
          phone: phone.e164
        });
      });

    data.outreachCompanies
      .filter((item) => OUTREACH_ACTIVE_STATUSES.includes(item.status) && item.followUpRaw && item.followUpRaw <= soon)
      .slice(0, 4)
      .forEach((item) => {
        const phone = phoneInfo(item.phone);
        push({
          type: "company",
          status: dueStatusLabel(item.followUpRaw),
          urgency: urgencyRank(item.followUpRaw),
          title: item.company,
          detail: [item.contact, item.followUp].filter(Boolean).join(" / "),
          action: phone.valid ? "call-lead" : "open-outreach-company",
          actionLabel: phone.valid ? "Call" : "Open",
          id: item.id,
          leadType: "outreach_company",
          phone: phone.e164
        });
      });

    data.jobs
      .filter((job) => job.dateRaw >= today && job.dateRaw <= soon && isIncompleteJob(job))
      .slice(0, 5)
      .forEach((job) => push({
        type: "job",
        status: dueStatusLabel(job.dateRaw),
        urgency: urgencyRank(job.dateRaw),
        title: job.site,
        detail: `${job.date} / ${job.window} / ${job.service}`,
        action: "edit-job",
        actionLabel: "Open Job",
        id: job.id
      }));

    data.documents
      .filter((doc) => doc.type === "invoice" && doc.status !== "paid" && doc.dueDateRaw && doc.dueDateRaw <= soon)
      .slice(0, 4)
      .forEach((doc) => push({
        type: "payment",
        status: dueStatusLabel(doc.dueDateRaw),
        urgency: urgencyRank(doc.dueDateRaw),
        title: `${doc.clientName || "Client"} payment`,
        detail: `${doc.number || "Invoice"} due ${doc.dueDate}`,
        action: "open-document",
        actionLabel: "Review",
        id: doc.id
      }));

    (data.importExport?.history?.imports || [])
      .filter((row) => !row.rollback_status && ["partial", "warning", "needs_review"].includes(String(row.status || "").toLowerCase()))
      .slice(0, 3)
      .forEach((row) => push({
        type: "import",
        status: "Review",
        urgency: 3,
        title: "Recent import needs review",
        detail: row.created_at ? formatDate(row.created_at) : "Import history",
        action: "review-import-history",
        actionLabel: "Review Import",
        id: row.id,
        importView: "history"
      }));

    return items
      .sort((a, b) => (a.urgency - b.urgency) || String(a.title).localeCompare(String(b.title)))
      .slice(0, 8);
  }

  function renderTodayActionButton(item) {
    const attrs = [`type="button"`, `data-action="${escapeHtml(item.action)}"`];
    if (item.id) attrs.push(`data-id="${escapeHtml(item.id)}"`);
    if (item.ticketSource) attrs.push(`data-ticket-source="${escapeHtml(item.ticketSource)}"`);
    if (item.leadType) attrs.push(`data-lead-type="${escapeHtml(item.leadType)}"`);
    if (item.phone) attrs.push(`data-phone="${escapeHtml(item.phone)}"`);
    if (item.importView) attrs.push(`data-import-export-view="${escapeHtml(item.importView)}"`);
    return `<button class="inline-action" ${attrs.join(" ")}>${buttonContent(item.actionLabel || "Open", item.action)}</button>`;
  }

  function renderTodayActions(data) {
    if (!els.todayActions) return;
    const items = todayActionItems(data);
    if (!items.length) {
      els.todayActions.innerHTML = `
        <div class="home-empty-state compact today-caught-up">
          <img src="${homeDashboardIcon("activity-check.svg")}" alt="" aria-hidden="true">
          <strong>You're caught up.</strong>
          <p>Nothing needs immediate attention today.</p>
        </div>
      `;
      return;
    }
    els.todayActions.innerHTML = items.map((item) => `
      <article class="today-action-item urgency-${escapeHtml(slug(item.status))}">
        <span class="today-action-status">${escapeHtml(item.status)}</span>
        <div>
          <strong>${escapeHtml(item.title)}</strong>
          <small>${escapeHtml(item.detail || "Review this item.")}</small>
        </div>
        ${renderTodayActionButton(item)}
      </article>
    `).join("");
  }

  function safeEmail(value) {
    const email = String(value || "").trim();
    return email && !/no email/i.test(email) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
  }

  function renderContactQuickActions(context = {}) {
    const phone = phoneInfo(context.phone || "");
    const email = safeEmail(context.email);
    return `
      <section class="contact-quick-actions" aria-label="Contact quick actions">
        <button type="button" data-action="call-lead" data-id="${escapeHtml(context.leadId || "")}" data-lead-type="${escapeHtml(context.leadType || "lead")}" data-phone="${escapeHtml(phone.e164 || "")}"${phone.valid ? "" : " disabled title=\"No valid phone number\""}>${buttonContent("Call", "call-lead")}</button>
        ${email ? `<a class="inline-action" href="mailto:${escapeHtml(email)}">${buttonContent("Email", "quick-add-client")}</a>` : `<button class="inline-action" type="button" disabled title="No email saved">${buttonContent("Email", "quick-add-client")}</button>`}
        <button class="inline-action" type="button" data-action="quick-add-note-from-detail" data-related-title="${escapeHtml(context.name || "Contact")}">${buttonContent("Add Note", "quick-add-operation")}</button>
        <button class="inline-action" type="button" data-action="schedule-follow-up-from-detail" data-related-title="${escapeHtml(context.name || "Contact")}" data-related-context="${escapeHtml(context.companyProperty || "")}">${buttonContent("Schedule Follow-Up", "quick-add-follow-up")}</button>
        <button class="inline-action" type="button" data-action="focus-drawer-edit">${buttonContent("Edit", "edit-job")}</button>
      </section>
    `;
  }

  function activityEntry(type, title, detail, dateRaw, meta = {}) {
    return {
      type,
      title,
      detail,
      dateRaw: dateRaw || "",
      date: dateRaw ? formatDate(dateRaw) : "",
      ...meta
    };
  }

  function activityTimelineFor(context = {}) {
    const terms = [context.name, context.companyProperty, context.email, context.phone].filter(Boolean);
    const matchesContext = (values) => terms.some((term) => recordMatchesGlobalQuery(values, term));
    const entries = [];
    callHistoryFor(context.leadId || "").forEach((activity) => entries.push(activityEntry("Call", activity.outcomeLabel, activity.notes || activity.phoneDisplay, activity.createdAtRaw)));
    state.data.reminders
      .filter((item) => matchesContext([item.task, item.status, item.due]))
      .slice(0, 6)
      .forEach((item) => entries.push(activityEntry("Follow-Up", item.task, `Due ${item.due} / ${item.status}`, item.dueRaw)));
    state.data.notes
      .filter((item) => matchesContext([item.title, item.body]))
      .slice(0, 6)
      .forEach((item) => entries.push(activityEntry("Note", item.title, item.body, item.createdAtRaw)));
    state.data.jobs
      .filter((item) => matchesContext([item.site, item.city, item.service, item.status]))
      .slice(0, 6)
      .forEach((item) => entries.push(activityEntry("Job", item.site, `${item.service} / ${item.status}`, item.dateRaw)));
    state.data.documents
      .filter((item) => matchesContext([item.clientName, item.clientEmail, item.number, item.type, item.status]))
      .slice(0, 6)
      .forEach((item) => entries.push(activityEntry("Quote", item.number || item.type, `${item.type} / ${item.status}`, item.issueDateRaw || item.dueDateRaw)));
    return entries
      .sort((a, b) => String(b.dateRaw || "").localeCompare(String(a.dateRaw || "")))
      .slice(0, 12);
  }

  function renderActivityTimeline(context = {}) {
    const entries = activityTimelineFor(context);
    if (!entries.length) {
      return `<section class="activity-timeline-panel"><h4>Activity Timeline</h4>${emptyState("No calls, notes, jobs, or follow-ups are linked yet.")}</section>`;
    }
    return `
      <section class="activity-timeline-panel">
        <div class="panel-heading">
          <div>
            <h4>Activity Timeline</h4>
            <p>Calls, notes, follow-ups, jobs, and quote activity in one place.</p>
          </div>
        </div>
        <div class="activity-timeline-list">
          ${entries.map((entry) => `
            <article class="activity-timeline-item">
              <span>${escapeHtml(entry.type)}</span>
              <div>
                <strong>${escapeHtml(entry.title)}</strong>
                <p>${escapeHtml(entry.detail || "No extra detail.")}</p>
                ${entry.date ? `<small>${escapeHtml(entry.date)}</small>` : ""}
              </div>
            </article>
          `).join("")}
        </div>
      </section>
    `;
  }

  function likelyDuplicateMatches(scope, form) {
    const data = new FormData(form);
    const name = String(data.get("name") || data.get("contact_name") || data.get("property_name") || data.get("company") || "").trim();
    const company = String(data.get("management_company") || data.get("company") || "").trim();
    const email = safeEmail(data.get("email"));
    const phone = phoneInfo(data.get("phone"));
    const address = String(data.get("address") || data.get("city") || "").trim();
    const matches = [];
    const pushMatch = (label, title, detail, action, id) => {
      if (id && !matches.some((item) => item.id === id && item.action === action)) {
        matches.push({ label, title, detail, action, id });
      }
    };

    state.data.contacts.forEach((contact) => {
      const contactPhone = phoneInfo(contact.phone);
      const phoneMatch = phone.valid && contactPhone.valid && phone.e164 === contactPhone.e164;
      const emailMatch = email && safeEmail(contact.email).toLowerCase() === email.toLowerCase();
      const nameMatch = name && hasLookupMatch([name], [contact.name, contact.type, contact.city]);
      if (phoneMatch || emailMatch || (scope === "contact" && nameMatch)) {
        pushMatch("Contact", contact.name, [contact.email, contactPhone.display, contact.city].filter(Boolean).join(" / "), "open-contact", contact.id);
      }
    });

    state.data.outreachProspects.forEach((prospect) => {
      const prospectPhone = phoneInfo(prospect.phone);
      const phoneMatch = phone.valid && prospectPhone.valid && phone.e164 === prospectPhone.e164;
      const emailMatch = email && safeEmail(prospect.email).toLowerCase() === email.toLowerCase();
      const nameCompanyMatch = name && company && hasLookupMatch([name, company], [prospect.propertyName, prospect.contactName, prospect.managementCompany]);
      if (phoneMatch || emailMatch || nameCompanyMatch) {
        pushMatch("Prospect", prospect.contactName || prospect.propertyName, [prospect.managementCompany, prospectPhone.display].filter(Boolean).join(" / "), "open-outreach-prospect", prospect.id);
      }
    });

    state.data.outreachCompanies.forEach((item) => {
      const companyPhone = phoneInfo(item.phone);
      const phoneMatch = phone.valid && companyPhone.valid && phone.e164 === companyPhone.e164;
      const emailMatch = email && safeEmail(item.email).toLowerCase() === email.toLowerCase();
      const companyMatch = company && normalizeDedupeKey(company) === normalizeDedupeKey(item.company);
      if (phoneMatch || emailMatch || companyMatch) {
        pushMatch("Company", item.company, [item.contact, item.serviceArea, companyPhone.display].filter(Boolean).join(" / "), "open-outreach-company", item.id);
      }
    });

    state.data.outreachProperties.forEach((property) => {
      const addressMatch = address && normalizeDedupeKey(address) === normalizeDedupeKey(property.address);
      const nameCompanyMatch = name && company && normalizeDedupeKey(`${name} ${company}`) === normalizeDedupeKey(`${property.propertyName} ${property.company}`);
      if (addressMatch || nameCompanyMatch) {
        pushMatch("Property", property.propertyName || property.address, [property.company, property.address, property.city].filter(Boolean).join(" / "), "open-outreach-property", property.id);
      }
    });
    return matches.slice(0, 4);
  }

  function renderDuplicateWarning(form) {
    const slot = form.querySelector("[data-duplicate-warning]");
    if (!slot) return;
    const scope = slot.dataset.duplicateScope || form.dataset.duplicateScope || "record";
    const matches = likelyDuplicateMatches(scope, form);
    slot.hidden = !matches.length;
    slot.innerHTML = matches.length ? `
      <strong>Possible duplicate found</strong>
      <p>A similar ${escapeHtml(scope)} may already exist. You can open it or keep saving a separate record.</p>
      <div>
        ${matches.map((item) => `<button class="inline-action" type="button" data-action="${escapeHtml(item.action)}" data-id="${escapeHtml(item.id)}"><span>${escapeHtml(item.label)}:</span> ${escapeHtml(item.title)}</button>`).join("")}
      </div>
    ` : "";
  }

  function applyFollowUpSuggestion(form, days) {
    const input = form?.querySelector("input[name='follow_up_date'], input[name='next_follow_up_at'], input[name='follow_up'], input[name='due_date']");
    if (input) {
      input.value = daysFromToday(days);
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
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
    if (normalized === "sales") return "sales_outreach";
    if (["field", "crew", "employee"].includes(normalized)) return "field_worker";
    if (normalized === "accounting") return "accountant";
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

  function canCreateTicketType(type = "quote", role = currentSessionRole()) {
    const normalizedRole = normalizeDashboardRole(role);
    if (["owner", "admin", "manager"].includes(normalizedRole)) return true;
    if (type === "field") return normalizedRole === "staff";
    return ["sales_outreach", "staff"].includes(normalizedRole);
  }

  function canManageLeadWorkflow(role = currentSessionRole()) {
    return ["owner", "admin", "manager", "sales_outreach", "staff"].includes(normalizeDashboardRole(role));
  }

  function canManageMoneyWorkflow(role = currentSessionRole()) {
    return ["owner", "admin", "manager", "accountant"].includes(normalizeDashboardRole(role));
  }

  function canManageWorkWorkflow(role = currentSessionRole()) {
    return ["owner", "admin", "manager", "field_worker", "staff"].includes(normalizeDashboardRole(role));
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

  function dashboardHealthRows() {
    const session = getSession();
    const warnings = dashboardHealthWarnings();
    const criticalWarnings = dashboardHealthWarnings({ scope: "critical" });
    const supportWarnings = dashboardHealthWarnings({ scope: "support" });
    return [
      ["Environment", config.appEnv || "unknown"],
      ["Build", config.buildVersion || "not set"],
      ["Supabase config", isSupabaseConfigured() ? "present" : "missing"],
      ["Auth session", session?.accessToken ? "present" : "not signed in"],
      ["Current role", currentSessionRole()],
      ["Last refresh", state.lastRefreshAt ? formatDateTime(state.lastRefreshAt) : "not refreshed"],
      ["Active workflow warnings", String(criticalWarnings.length)],
      ["Support module warnings", String(supportWarnings.length)],
      ["Total module warnings", String(warnings.length)]
    ];
  }

  function dashboardHealthWarnings(options = {}) {
    const warnings = state.moduleErrors.map((item) => ({
      ...item,
      scope: item.scope || moduleWarningScope(item.name)
    }));
    if (!state.groundskeeperAiReady && state.groundskeeperAiError) {
      warnings.push({ name: "Groundskeeper AI", message: state.groundskeeperAiError, detail: state.groundskeeperAiError, scope: "support" });
    }
    if (!state.documentationReady && state.documentationError) {
      warnings.push({ name: "Documentation", message: state.documentationError, detail: state.documentationError, scope: "support" });
    }
    if (!state.importExportReady) {
      warnings.push({ name: "Import & Export", message: state.importExportError || "Import/export center is not ready.", detail: state.importExportError || "", scope: "support" });
    }
    if (options.scope === "critical") return warnings.filter((item) => item.scope !== "support");
    if (options.scope === "support") return warnings.filter((item) => item.scope === "support");
    return warnings;
  }

  function diagnosticSummaryText() {
    const rows = dashboardHealthRows().map(([label, value]) => `${label}: ${value}`);
    const warnings = dashboardHealthWarnings().map((item) => (
      `- ${item.scope === "support" ? "[support] " : ""}${item.name}: ${item.message}${item.detail ? ` (${item.detail})` : ""}`
    ));
    return [
      "Urban Yards Dashboard Diagnostics",
      `Generated: ${new Date().toISOString()}`,
      "",
      ...rows,
      "",
      "Module warnings:",
      warnings.length ? warnings.join("\n") : "None"
    ].join("\n");
  }

  function renderDashboardHealth() {
    if (!els.dashboardHealth) return;
    const rows = dashboardHealthRows();
    const warnings = dashboardHealthWarnings().slice(0, 8);
    els.dashboardHealth.innerHTML = `
      <div class="dashboard-health-grid">
        ${rows.map(([label, value]) => `
          <div class="dashboard-health-item">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value || "not set")}</strong>
          </div>
        `).join("")}
      </div>
      ${warnings.length ? `
        <div class="dashboard-health-warning">
          <strong>${escapeHtml(warnings.length === 1 ? "1 module warning" : `${warnings.length} module warnings`)}</strong>
          ${warnings.map((item) => `<small>${item.scope === "support" ? "Support: " : ""}${escapeHtml(item.name)}: ${escapeHtml(item.message)}</small>`).join("")}
        </div>
      ` : `<div class="empty-state">No module warnings from the latest refresh.</div>`}
    `;
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
    const showFallback = () => {
      if (img) img.hidden = true;
      if (initialsNode) initialsNode.hidden = false;
    };
    const showAvatar = () => {
      if (img) img.hidden = false;
      if (initialsNode) initialsNode.hidden = true;
    };
    if (initialsNode) {
      initialsNode.textContent = initials;
      initialsNode.hidden = false;
    }
    if (!img) return;
    img.loading = "eager";
    img.decoding = "async";
    img.onerror = showFallback;

    if (!avatarUrl) {
      img.removeAttribute("src");
      showFallback();
      return;
    }

    const currentSrc = img.getAttribute("src") || "";
    img.onload = showAvatar;
    if (currentSrc !== avatarUrl) {
      showFallback();
      img.src = avatarUrl;
      return;
    }

    if (img.complete && img.naturalWidth > 0) {
      showAvatar();
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
    syncDashboardNavAccess(role);
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

  function upsertUserProfileRecord(record = {}) {
    const profile = normalizeUserProfile(record);
    if (!profile.userId && !profile.email) return null;
    const profiles = Array.isArray(state.data.userProfiles) ? state.data.userProfiles : [];
    const index = profiles.findIndex((item) => (
      (profile.userId && item.userId === profile.userId)
      || (profile.email && item.email && item.email.toLowerCase() === profile.email.toLowerCase())
    ));
    if (index >= 0) profiles[index] = { ...profiles[index], ...profile };
    else profiles.unshift(profile);
    state.data.userProfiles = profiles;
    syncSessionRoleFromProfile(profile);
    renderCurrentProfileAvatar(state.data);
    renderUsersAccess(state.data);
    bindAvatarFallbacks();
    return profile;
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

  async function dashboardTicketRequest(action, payload = {}) {
    const session = getSession();
    if (!session || !session.accessToken) throw new Error("Please sign in again.");
    const response = await fetch("/.netlify/functions/dashboard-tickets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`
      },
      body: JSON.stringify({
        action,
        ...payload
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Job Ticket request failed.");
    return result;
  }

  function demoImportExportSnapshot() {
    return {
      modules: [
        { key: "contacts", label: "Contacts", pluralLabel: "Contacts", description: "Demo client contacts.", fields: [] },
        { key: "contact_call_list", label: "Call List", pluralLabel: "Call List", description: "Demo contact call list.", fields: [] },
        { key: "jobs", label: "Jobs", pluralLabel: "Jobs", description: "Demo scheduled jobs.", fields: [] },
        { key: "outreach_prospects", label: "Prospects", pluralLabel: "Prospects", description: "Demo outreach prospects.", fields: [] },
        { key: "equipment", label: "Equipment", pluralLabel: "Equipment", description: "Demo equipment records.", fields: [] }
      ],
      limits: { maxImportRows: 2000, maxImportBytes: 5242880, rollbackRetentionDays: 30 },
      history: { imports: [], exports: [], syncs: [], backups: [] },
      google: { configured: false, connections: [] },
      fallback: "Demo mode can export local JSON/CSV shortcuts. Live imports, rollback, and Google Sheets run through the protected backend after sign-in."
    };
  }

  async function importExportRequest(action, payload = {}) {
    if (isDemoMode()) throw new Error("Import & Export Center is available after signing in to the live dashboard.");
    const session = getSession();
    if (!session || !session.accessToken) throw new Error("Please sign in again.");
    const response = await fetch(`/.netlify/functions/dashboard-import-export?action=${encodeURIComponent(action)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`
      },
      body: JSON.stringify({ action, ...payload })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Import/export request failed.");
    return result;
  }

  function filenameFromDisposition(disposition, fallback) {
    const match = String(disposition || "").match(/filename="?([^";]+)"?/i);
    return match ? match[1] : fallback;
  }

  async function importExportDownload(action, payload = {}, fallbackName = "urban-yards-export.dat") {
    if (isDemoMode()) {
      exportFullBackup();
      return;
    }
    const session = getSession();
    if (!session || !session.accessToken) throw new Error("Please sign in again.");
    const response = await fetch(`/.netlify/functions/dashboard-import-export?action=${encodeURIComponent(action)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`
      },
      body: JSON.stringify({ action, ...payload })
    });
    const contentType = response.headers.get("Content-Type") || "";
    if (!response.ok) {
      const result = contentType.includes("application/json") ? await response.json().catch(() => ({})) : {};
      throw new Error(result.error || "Download failed.");
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filenameFromDisposition(response.headers.get("Content-Disposition"), fallbackName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function readFileAsBase64(file) {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }
    return btoa(binary);
  }

  async function loadImportExportCenter() {
    if (isDemoMode()) {
      state.importExportReady = true;
      return demoImportExportSnapshot();
    }
    try {
      const [registry, history, google] = await Promise.all([
        importExportRequest("registry"),
        importExportRequest("history").catch(() => ({ imports: [], exports: [], syncs: [], backups: [] })),
        importExportRequest("google-status").catch((error) => ({ configured: false, connections: [], error: error.message }))
      ]);
      state.importExportReady = true;
      state.importExportError = "";
      state.importExportHistoryLoadedAt = new Date().toISOString();
      const modules = Array.isArray(registry.modules) ? registry.modules : [];
      if (!modules.some((module) => module.key === state.importExportModule) && modules[0]) {
        state.importExportModule = modules[0].key;
      }
      return {
        modules,
        limits: registry.limits || {},
        history: {
          imports: history.imports || [],
          exports: history.exports || [],
          syncs: history.syncs || [],
          backups: history.backups || []
        },
        google: {
          configured: Boolean(google.configured),
          connections: google.connections || [],
          error: google.error || ""
        },
        fallback: ""
      };
    } catch (error) {
      state.importExportReady = false;
      state.importExportError = error.message || "Import & Export Center could not be loaded.";
      return {
        modules: [],
        limits: {},
        history: { imports: [], exports: [], syncs: [], backups: [] },
        google: { configured: false, connections: [] },
        fallback: state.importExportError
      };
    }
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

  function formatDateTime(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
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
      return `<section class="call-history"><h4>Call History</h4>${emptyState(state.leadActivityReady ? "No call attempts logged yet." : "Call history is unavailable right now. Refresh the dashboard or check Supabase access.")}</section>`;
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
          <div class="follow-up-suggestions span-full" aria-label="Quick follow-up dates">
            ${FOLLOW_UP_SUGGESTIONS.map(([key, label, days]) => `<button class="inline-action" type="button" data-action="set-follow-up-suggestion" data-days="${escapeHtml(days)}" data-suggestion="${escapeHtml(key)}">${escapeHtml(label)}</button>`).join("")}
            <button class="inline-action" type="button" data-action="clear-follow-up-suggestion">No Follow-Up</button>
          </div>
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
          <div class="follow-up-suggestions">
            ${FOLLOW_UP_SUGGESTIONS.map(([key, label, days]) => `<button class="inline-action" type="button" data-action="set-follow-up-suggestion" data-days="${escapeHtml(days)}" data-suggestion="${escapeHtml(key)}">${escapeHtml(label)}</button>`).join("")}
            <button class="inline-action" type="button" data-action="clear-follow-up-suggestion">No Follow-Up</button>
          </div>
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
      firstName: row.first_name || "",
      lastName: row.last_name || "",
      name: row.name || "Unnamed contact",
      jobTitle: row.job_title || "",
      company: row.company || "",
      property: row.property || "",
      type: row.contact_type || "Contact",
      city: row.city || "Not provided",
      state: row.state || "",
      zip: row.zip || "",
      address: row.address || "",
      email: row.email || "No email",
      phone: row.phone_display || row.phone || row.phone_e164 || "No phone",
      phoneE164: row.phone_e164 || "",
      phoneExtension: row.phone_extension || "",
      secondaryPhone: row.secondary_phone || "",
      preferredContactMethod: row.preferred_contact_method || "No Preference",
      priority: row.priority || "Normal",
      assignedUser: row.assigned_user || "",
      lastContactedAtRaw: row.last_contacted_at || "",
      nextFollowUpAtRaw: row.next_follow_up_at || "",
      callOutcome: row.call_outcome || "Not Called",
      notes: row.notes || "",
      source: row.source || "",
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

  function budgetNumber(value) {
    const calculator = window.UrbanYardsBudgetCalculations;
    return calculator ? calculator.roundMoney(value) : Number(value || 0);
  }

  function budgetNumberOrNull(value) {
    if (value === undefined || value === null || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? budgetNumber(parsed) : null;
  }

  function normalizeBudgetStatus(status) {
    return BUDGET_STATUSES.includes(status) ? status : "Draft";
  }

  function normalizeBudgetJobStatus(status) {
    return BUDGET_JOB_STATUSES.includes(status) ? status : "Not Scheduled";
  }

  function normalizeBudgetCostCategory(category) {
    const value = String(category || "").trim();
    if (BUDGET_COST_CATEGORIES.includes(value)) return value;
    const normalized = value.toLowerCase();
    const aliases = {
      disposal: "Disposal and dump fees",
      dump: "Disposal and dump fees",
      "dump fees": "Disposal and dump fees",
      delivery: "Delivery fees",
      "travel time": "Travel time",
      travel: "Travel time",
      "equipment rental": "Equipment rentals",
      "equipment rentals": "Equipment rentals",
      processing: "Payment processing fees",
      "payment processing": "Payment processing fees",
      administrative: "Administrative costs",
      admin: "Administrative costs",
      miscellaneous: "Miscellaneous expenses",
      misc: "Miscellaneous expenses"
    };
    return aliases[normalized] || "Miscellaneous expenses";
  }

  function normalizeBudget(row = {}) {
    return {
      id: row.id,
      budgetName: row.budget_name || row.name || "Untitled budget",
      jobId: row.job_id || "",
      quoteId: row.quote_id || "",
      invoiceId: row.invoice_id || "",
      clientId: row.client_id || "",
      propertyId: row.property_id || "",
      clientName: row.client_name || "",
      propertyName: row.property_name || "",
      jobName: row.job_name || row.budget_name || "",
      serviceType: row.service_type || "",
      jobDescription: row.job_description || "",
      proposedStartDateRaw: dateKey(row.proposed_start_date),
      proposedStartDate: formatDate(row.proposed_start_date),
      proposedCompletionDateRaw: dateKey(row.proposed_completion_date),
      proposedCompletionDate: formatDate(row.proposed_completion_date),
      scheduledVisits: row.scheduled_visits || [],
      assignedEmployees: row.assigned_employees || [],
      budgetOwner: row.budget_owner || "",
      status: normalizeBudgetStatus(row.status),
      jobStatus: normalizeBudgetJobStatus(row.job_status),
      targetMarginPercent: budgetNumber(row.target_margin_percent || BUDGET_DEFAULT_SETTINGS.default_target_margin),
      baseQuotedPrice: budgetNumber(row.base_quoted_price),
      approvedAddons: budgetNumber(row.approved_addons),
      discounts: budgetNumber(row.discounts),
      taxes: budgetNumber(row.taxes),
      otherRevenue: budgetNumber(row.other_revenue),
      expectedRevenue: budgetNumber(row.expected_revenue),
      finalInvoicedRevenue: budgetNumber(row.final_invoiced_revenue),
      amountPaid: budgetNumber(row.amount_paid),
      outstandingBalance: budgetNumber(row.outstanding_balance),
      notes: row.notes || "",
      createdAtRaw: row.created_at || "",
      updatedAtRaw: row.updated_at || "",
      createdAt: formatDate(row.created_at),
      updatedAt: formatDate(row.updated_at),
      archivedAtRaw: row.archived_at || ""
    };
  }

  function normalizeBudgetLabor(row = {}) {
    return {
      id: row.id,
      budgetId: row.budget_id || "",
      employeeId: row.employee_id || "",
      employeeName: row.employee_name || "",
      role: row.role || "",
      crew: row.crew || "",
      task: row.task || row.description || "Labor",
      description: row.description || "",
      scheduledVisitId: row.scheduled_visit_id || "",
      estimatedHours: budgetNumber(row.estimated_hours),
      hourlyWage: budgetNumber(row.hourly_wage),
      payrollBurdenPercent: budgetNumber(row.payroll_burden_percent),
      workersCompPercent: budgetNumber(row.workers_comp_percent),
      otherLaborBurden: budgetNumber(row.other_labor_burden ?? row.other_burden_amount),
      trueHourlyCost: budgetNumber(row.true_hourly_labor_cost ?? row.true_hourly_cost),
      estimatedCost: budgetNumber(row.estimated_labor_cost || row.estimated_cost),
      actualHours: budgetNumber(row.actual_hours),
      actualCost: budgetNumber(row.actual_labor_cost || row.actual_cost),
      notes: row.notes || ""
    };
  }

  function normalizeBudgetMaterial(row = {}) {
    return {
      id: row.id,
      budgetId: row.budget_id || "",
      materialName: row.material_name || "Material",
      category: row.category || "Other",
      vendor: row.vendor || "",
      quantity: budgetNumber(row.quantity),
      unit: row.unit || "",
      unitCost: budgetNumber(row.unit_cost),
      estimatedCost: budgetNumber(row.estimated_cost),
      actualQuantity: budgetNumber(row.actual_quantity),
      actualUnitCost: budgetNumber(row.actual_unit_cost),
      actualCost: budgetNumber(row.actual_cost),
      tax: budgetNumber(row.tax),
      deliveryFee: budgetNumber(row.delivery_fee),
      receiptDocumentId: row.receipt_document_id || "",
      notes: row.notes || ""
    };
  }

  function normalizeBudgetEquipment(row = {}) {
    return {
      id: row.id,
      budgetId: row.budget_id || "",
      equipmentId: row.equipment_id || "",
      equipmentName: row.equipment_name || "Equipment",
      usageType: row.usage_type || "Owned",
      estimatedQuantity: budgetNumber(row.estimated_hours || row.estimated_days),
      internalRate: budgetNumber(row.internal_rate ?? row.internal_hourly_rate ?? row.internal_daily_rate ?? row.mileage_rate),
      rentalRate: budgetNumber(row.rental_rate),
      fuelEstimate: budgetNumber(row.fuel_estimate),
      estimatedCost: budgetNumber(row.estimated_cost),
      actualUsage: budgetNumber(row.actual_usage),
      actualCost: budgetNumber(row.actual_cost),
      notes: row.notes || ""
    };
  }

  function normalizeBudgetCost(row = {}) {
    return {
      id: row.id,
      budgetId: row.budget_id || "",
      category: normalizeBudgetCostCategory(row.category),
      description: row.description || row.category || "Other cost",
      estimatedCost: budgetNumber(row.estimated_cost),
      actualCost: budgetNumber(row.actual_cost),
      notes: row.notes || "",
      receiptDocumentId: row.receipt_document_id || ""
    };
  }

  function normalizeBudgetChangeOrder(row = {}) {
    return {
      id: row.id,
      budgetId: row.budget_id || "",
      title: row.title || "Change order",
      description: row.description || "",
      requestedDateRaw: dateKey(row.requested_date),
      requestedDate: formatDate(row.requested_date),
      requestedBy: row.requested_by || "",
      additionalRevenue: budgetNumber(row.additional_revenue),
      additionalLabor: budgetNumber(row.additional_labor ?? row.additional_labor_cost),
      additionalMaterials: budgetNumber(row.additional_materials ?? row.additional_material_cost),
      additionalCosts: budgetNumber(row.additional_costs ?? row.additional_other_cost),
      approvalStatus: row.approval_status || "Draft",
      approvedDateRaw: dateKey(row.approved_date),
      approvedDate: formatDate(row.approved_date),
      clientApprovalNotes: row.client_approval_notes || "",
      internalNotes: row.internal_notes || "",
      invoicedAtRaw: row.invoiced_at || ""
    };
  }

  function normalizeBudgetSettings(row = {}) {
    return {
      ...BUDGET_DEFAULT_SETTINGS,
      ...row,
      default_target_margin: budgetNumber(row.default_target_margin ?? row.default_target_margin_percent ?? BUDGET_DEFAULT_SETTINGS.default_target_margin),
      minimum_margin: budgetNumber(row.minimum_margin ?? row.minimum_margin_percent ?? BUDGET_DEFAULT_SETTINGS.minimum_margin),
      warning_margin: budgetNumber(row.warning_margin ?? row.warning_margin_percent ?? BUDGET_DEFAULT_SETTINGS.warning_margin),
      default_contingency_percent: budgetNumber(row.default_contingency_percent ?? BUDGET_DEFAULT_SETTINGS.default_contingency_percent),
      default_labor_burden_percent: budgetNumber(row.default_labor_burden_percent ?? BUDGET_DEFAULT_SETTINGS.default_labor_burden_percent),
      payment_processing_percent: budgetNumber(row.payment_processing_percent ?? row.default_payment_processing_percent ?? BUDGET_DEFAULT_SETTINGS.payment_processing_percent),
      owner_hourly_rate: budgetNumber(row.owner_hourly_rate ?? row.default_owner_hourly_rate ?? BUDGET_DEFAULT_SETTINGS.owner_hourly_rate)
    };
  }

  function emptyBudgetBundle() {
    return {
      settings: normalizeBudgetSettings(),
      budgets: [],
      labor: [],
      materials: [],
      materialCatalog: [],
      equipment: [],
      costs: [],
      changeOrders: [],
      documents: [],
      templates: [],
      templateItems: [],
      history: []
    };
  }

  function normalizeBudgetBundle(raw = {}) {
    return {
      settings: normalizeBudgetSettings(raw.settings || {}),
      budgets: (raw.budgets || []).map(normalizeBudget),
      labor: (raw.labor || []).map(normalizeBudgetLabor),
      materials: (raw.materials || []).map(normalizeBudgetMaterial),
      materialCatalog: raw.materialCatalog || raw.material_catalog || [],
      equipment: (raw.equipment || []).map(normalizeBudgetEquipment),
      costs: (raw.costs || []).map(normalizeBudgetCost),
      changeOrders: (raw.changeOrders || raw.change_orders || []).map(normalizeBudgetChangeOrder),
      documents: raw.documents || [],
      templates: raw.templates || [],
      templateItems: raw.templateItems || raw.template_items || [],
      history: raw.history || []
    };
  }

  function emptyConnectedOpsBundle() {
    return {
      recurringServices: [],
      recurringVisits: [],
      checklistTemplates: [],
      checklists: [],
      checklistItems: [],
      timeEntries: [],
      sitePhotos: [],
      approvals: [],
      communications: [],
      communicationTemplates: [],
      shareLinks: [],
      shareEvents: [],
      maintenanceSchedules: [],
      maintenanceRecords: [],
      automationRules: [],
      automationRuns: [],
      commandHistory: []
    };
  }

  function emptyGroundskeeperAiBundle() {
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

  function normalizeRecurringService(row = {}) {
    return {
      id: row.id || "",
      serviceName: row.service_name || "Recurring service",
      serviceType: row.service_type || "Property care",
      description: row.description || "",
      frequency: row.frequency || "Weekly",
      intervalCount: Number(row.interval_count || 1),
      preferredWeekdays: Array.isArray(row.preferred_weekdays) ? row.preferred_weekdays : [],
      visitWindow: row.visit_window || "",
      assignedUserIds: Array.isArray(row.assigned_user_ids) ? row.assigned_user_ids : [],
      startDateRaw: dateKey(row.start_date),
      startDate: formatDate(row.start_date),
      endDateRaw: dateKey(row.end_date),
      endDate: formatDate(row.end_date),
      nextVisitDateRaw: dateKey(row.next_visit_date),
      nextVisitDate: formatDate(row.next_visit_date),
      lastVisitDateRaw: dateKey(row.last_visit_date),
      lastVisitDate: formatDate(row.last_visit_date),
      status: row.status || "Active",
      pricePerVisit: Number(row.price_per_visit || 0),
      notes: row.notes || "",
      createdAtRaw: row.created_at || "",
      updatedAtRaw: row.updated_at || "",
      updatedAt: formatDate(row.updated_at)
    };
  }

  function normalizeRecurringVisit(row = {}) {
    return {
      id: row.id || "",
      recurringServiceId: row.recurring_service_id || "",
      scheduledJobId: row.scheduled_job_id || "",
      visitDateRaw: dateKey(row.visit_date),
      visitDate: formatDate(row.visit_date),
      visitWindow: row.visit_window || "",
      status: row.status || "Scheduled",
      completionPercent: Number(row.completion_percent || 0),
      notes: row.notes || "",
      createdAtRaw: row.created_at || "",
      updatedAtRaw: row.updated_at || ""
    };
  }

  function normalizeChecklistTemplate(row = {}) {
    return {
      id: row.id || "",
      title: row.title || row.name || "Checklist template",
      category: row.category || "General",
      serviceType: row.service_type || "",
      description: row.description || "",
      status: row.status || "Active",
      visibility: row.visibility || "Internal",
      updatedAtRaw: row.updated_at || "",
      updatedAt: formatDate(row.updated_at)
    };
  }

  function normalizeJobChecklist(row = {}) {
    return {
      id: row.id || "",
      templateId: row.template_id || "",
      jobId: row.job_id || "",
      scheduledJobId: row.scheduled_job_id || "",
      title: row.title || "Job checklist",
      status: row.status || "Not Started",
      dueDateRaw: dateKey(row.due_date),
      dueDate: formatDate(row.due_date),
      completedAtRaw: row.completed_at || "",
      completedAt: formatDate(row.completed_at),
      notes: row.notes || "",
      updatedAtRaw: row.updated_at || "",
      updatedAt: formatDate(row.updated_at)
    };
  }

  function normalizeApprovalRequest(row = {}) {
    return {
      id: row.id || "",
      requestType: row.request_type || "General",
      relatedTable: row.related_table || "",
      relatedId: row.related_id || "",
      title: row.title || "Approval request",
      description: row.description || "",
      priority: row.priority || "Normal",
      status: row.status || "Pending",
      dueAtRaw: row.due_at || "",
      dueAt: formatDate(row.due_at),
      reviewedAtRaw: row.reviewed_at || "",
      reviewedAt: formatDate(row.reviewed_at),
      decisionNotes: row.decision_notes || "",
      createdAtRaw: row.created_at || "",
      createdAt: formatDate(row.created_at),
      updatedAtRaw: row.updated_at || "",
      updatedAt: formatDate(row.updated_at)
    };
  }

  function normalizeCommunication(row = {}) {
    return {
      id: row.id || "",
      direction: row.direction || "outbound",
      channel: row.channel || "note",
      relatedTable: row.related_table || "",
      relatedId: row.related_id || "",
      contactName: row.contact_name || "",
      contactEmail: row.contact_email || "",
      contactPhone: row.contact_phone || "",
      subject: row.subject || "",
      body: row.body || "",
      outcome: row.outcome || "",
      followUpDateRaw: dateKey(row.follow_up_date),
      followUpDate: formatDate(row.follow_up_date),
      sentAtRaw: row.sent_at || "",
      sentAt: formatDate(row.sent_at || row.created_at),
      createdAtRaw: row.created_at || "",
      createdAt: formatDate(row.created_at)
    };
  }

  function normalizeShareLink(row = {}) {
    return {
      id: row.id || "",
      title: row.title || "Client share link",
      relatedTable: row.related_table || "",
      relatedId: row.related_id || "",
      contactEmail: row.contact_email || "",
      tokenHint: row.token_hint || "",
      status: row.status || "Active",
      expiresAtRaw: row.expires_at || "",
      expiresAt: formatDate(row.expires_at),
      lastViewedAtRaw: row.last_viewed_at || "",
      lastViewedAt: formatDate(row.last_viewed_at),
      viewCount: Number(row.view_count || 0),
      allowedSections: Array.isArray(row.allowed_sections) ? row.allowed_sections : [],
      createdAtRaw: row.created_at || "",
      createdAt: formatDate(row.created_at)
    };
  }

  function normalizeMaintenanceSchedule(row = {}) {
    return {
      id: row.id || "",
      equipmentId: row.equipment_id || "",
      equipmentName: row.equipment_name || "Equipment",
      maintenanceType: row.maintenance_type || "Maintenance",
      frequency: row.frequency || "Monthly",
      nextDueDateRaw: dateKey(row.next_due_date),
      nextDueDate: formatDate(row.next_due_date),
      nextDueHours: Number(row.next_due_hours || 0),
      assignedTo: row.assigned_to || "",
      status: row.status || "Active",
      notes: row.notes || "",
      updatedAtRaw: row.updated_at || "",
      updatedAt: formatDate(row.updated_at)
    };
  }

  function normalizeAutomationRule(row = {}) {
    return {
      id: row.id || "",
      title: row.title || "Automation rule",
      triggerKey: row.trigger_key || "",
      actionKey: row.action_key || "",
      enabled: Boolean(row.enabled),
      lastRunAtRaw: row.last_run_at || "",
      lastRunAt: formatDate(row.last_run_at),
      createdAtRaw: row.created_at || "",
      updatedAtRaw: row.updated_at || "",
      updatedAt: formatDate(row.updated_at)
    };
  }

  function normalizeConnectedOpsBundle(raw = {}) {
    return {
      recurringServices: (raw.recurringServices || raw.recurring_services || []).map(normalizeRecurringService),
      recurringVisits: (raw.recurringVisits || raw.recurring_service_visits || []).map(normalizeRecurringVisit),
      checklistTemplates: (raw.checklistTemplates || raw.job_checklist_templates || []).map(normalizeChecklistTemplate),
      checklists: (raw.checklists || raw.job_checklists || []).map(normalizeJobChecklist),
      checklistItems: raw.checklistItems || raw.job_checklist_items || [],
      timeEntries: raw.timeEntries || raw.job_time_entries || [],
      sitePhotos: raw.sitePhotos || raw.job_site_photos || [],
      approvals: (raw.approvals || raw.approval_requests || []).map(normalizeApprovalRequest),
      communications: (raw.communications || []).map(normalizeCommunication),
      communicationTemplates: raw.communicationTemplates || raw.communication_templates || [],
      shareLinks: (raw.shareLinks || raw.client_share_links || []).map(normalizeShareLink),
      shareEvents: raw.shareEvents || raw.client_share_link_events || [],
      maintenanceSchedules: (raw.maintenanceSchedules || raw.equipment_maintenance_schedules || []).map(normalizeMaintenanceSchedule),
      maintenanceRecords: raw.maintenanceRecords || raw.equipment_maintenance_records || [],
      automationRules: (raw.automationRules || raw.automation_rules || []).map(normalizeAutomationRule),
      automationRuns: raw.automationRuns || raw.automation_runs || [],
      commandHistory: raw.commandHistory || raw.command_usage_history || []
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

  function normalizeDocumentationStatus(value) {
    const status = String(value || "").trim();
    return DOCUMENTATION_STATUSES.includes(status) ? status : "Not Started";
  }

  function normalizeDocumentationCategory(value) {
    const category = String(value || "").trim();
    return category || "Custom Forms";
  }

  function normalizeDocumentationTemplate(row = {}) {
    const version = Number(row.current_version || row.version || row.version_number || 1) || 1;
    const allowedRoles = Array.isArray(row.allowed_roles)
      ? row.allowed_roles
      : String(row.allowed_roles || "owner,admin,manager,staff,worker")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    return {
      id: row.id || "",
      name: row.name || row.template_name || "Untitled template",
      category: normalizeDocumentationCategory(row.category),
      status: row.status || (row.is_active === false ? "Inactive" : "Active"),
      currentVersion: version,
      versionLabel: row.version_label || `Version ${version}`,
      instructions: row.instructions || "",
      allowedRoles,
      requiresSignature: Boolean(row.requires_signature || row.signature_required),
      requiresPhotos: Boolean(row.requires_photos || row.photos_required),
      isRecurring: Boolean(row.is_recurring || row.recurring),
      recurrenceRule: row.recurrence_rule || row.recurrence || "",
      requiredByDefault: Boolean(row.required_by_default || row.required),
      fileBucket: row.file_bucket || "documentation-templates",
      fileName: row.file_name || row.original_file_name || "",
      filePath: row.file_path || row.storage_path || "",
      mimeType: row.mime_type || "",
      fileSizeBytes: Number(row.file_size_bytes || 0) || 0,
      updatedBy: row.updated_by_name || row.uploaded_by_name || row.created_by_name || "",
      updatedAtRaw: row.updated_at || row.created_at || "",
      updatedAt: formatDate(row.updated_at || row.created_at)
    };
  }

  function normalizeDocumentationAssignment(row = {}) {
    const metadata = row.metadata || {};
    return {
      id: row.id || "",
      templateId: row.template_id || "",
      templateName: row.template_name || row.form_name || row.title || "Assigned form",
      templateVersion: Number(row.template_version || row.version_number || 1) || 1,
      category: normalizeDocumentationCategory(row.category),
      assignedTo: row.assigned_to_name || row.assigned_person || row.assigned_to_email || row.assigned_to || "Unassigned",
      assignedToEmail: row.assigned_to_email || "",
      assignedUserId: row.assigned_user_id || row.assigned_to_user_id || "",
      targetType: row.target_type || metadata.targetType || "general",
      targetId: row.target_id || metadata.targetId || metadata.scheduledJobId || "",
      propertyName: row.property_name || row.property || "",
      contactName: row.contact_name || row.contact || "",
      jobName: row.job_name || row.job || row.visit_name || "",
      scheduledVisitName: row.scheduled_visit_name || metadata.scheduledVisitName || "",
      equipmentName: row.equipment_name || "",
      dueDateRaw: row.due_date || "",
      dueDate: formatDate(row.due_date),
      priority: row.priority || "Normal",
      status: normalizeDocumentationStatus(row.status),
      required: row.required !== false,
      recurring: Boolean(row.recurring || row.is_recurring),
      nextAction: row.next_action || "",
      instructions: row.instructions || "",
      notes: row.notes || "",
      createdAtRaw: row.created_at || "",
      createdAt: formatDate(row.created_at),
      metadata
    };
  }

  function normalizeDocumentationSubmission(row = {}) {
    const metadata = row.metadata || {};
    return {
      id: row.id || "",
      assignmentId: row.assignment_id || "",
      templateId: row.template_id || "",
      templateName: row.template_name || row.form_name || row.title || "Submitted form",
      templateVersion: Number(row.template_version || row.version_number || 1) || 1,
      category: normalizeDocumentationCategory(row.category),
      targetId: row.target_id || metadata.targetId || metadata.scheduledJobId || "",
      propertyName: row.property_name || row.property || "",
      contactName: row.contact_name || row.contact || "",
      jobName: row.job_name || row.job || "",
      scheduledVisitName: row.scheduled_visit_name || metadata.scheduledVisitName || "",
      equipmentName: row.equipment_name || "",
      completedBy: row.completed_by_name || row.submitted_by_name || row.employee_name || row.completed_by_email || "Unknown",
      submittedAtRaw: row.submitted_at || row.created_at || "",
      submittedAt: formatDate(row.submitted_at || row.created_at),
      status: normalizeDocumentationStatus(row.status || "Submitted"),
      reviewer: row.reviewer_name || row.reviewed_by_name || "",
      reviewedAtRaw: row.reviewed_at || "",
      reviewedAt: formatDate(row.reviewed_at),
      fileBucket: row.file_bucket || "documentation-submissions",
      fileName: row.file_name || row.original_file_name || "",
      filePath: row.file_path || row.storage_path || "",
      mimeType: row.mime_type || "",
      fileSizeBytes: Number(row.file_size_bytes || 0) || 0,
      documentType: row.document_type || row.file_type || "",
      notes: row.notes || "",
      correctionNotes: row.correction_notes || row.rejection_notes || "",
      metadata
    };
  }

  function normalizeDocumentationAttachment(row = {}) {
    const metadata = row.metadata || {};
    return {
      id: row.id || "",
      assignmentId: row.assignment_id || "",
      submissionId: row.submission_id || "",
      attachmentType: row.attachment_type || "other",
      category: normalizeDocumentationCategory(row.category || metadata.category),
      status: row.status || metadata.status || "Submitted",
      targetId: row.target_id || metadata.targetId || metadata.scheduledJobId || "",
      propertyName: row.property_name || row.property || metadata.propertyName || "",
      contactName: row.contact_name || row.contact || metadata.contactName || "",
      jobName: row.job_name || row.job || metadata.jobName || "",
      scheduledVisitName: row.scheduled_visit_name || metadata.scheduledVisitName || "",
      equipmentName: row.equipment_name || metadata.equipmentName || "",
      completedBy: row.uploaded_by_name || row.uploaded_by_email || "Dashboard user",
      fileBucket: row.file_bucket || "documentation-submissions",
      fileName: row.file_name || row.original_file_name || "",
      filePath: row.file_path || row.storage_path || "",
      mimeType: row.mime_type || "",
      fileSizeBytes: Number(row.file_size_bytes || 0) || 0,
      createdAtRaw: row.created_at || "",
      createdAt: formatDate(row.created_at),
      metadata
    };
  }

  function normalizeDocumentationAudit(row = {}) {
    return {
      id: row.id || "",
      action: row.action || "documentation_event",
      templateName: row.template_name || row.form_name || "",
      entityType: row.entity_type || row.record_type || "documentation",
      entityId: row.entity_id || "",
      actorName: row.actor_name || row.actor_email || row.user_email || "Dashboard user",
      detail: row.detail || row.notes || row.description || "",
      metadata: row.metadata || {},
      createdAtRaw: row.created_at || "",
      createdAt: formatDate(row.created_at)
    };
  }

  function normalizeDocumentationBundle(raw = {}) {
    return {
      assignments: Array.isArray(raw.assignments) ? raw.assignments.map(normalizeDocumentationAssignment) : [],
      submissions: Array.isArray(raw.submissions) ? raw.submissions.map(normalizeDocumentationSubmission) : [],
      templates: Array.isArray(raw.templates) ? raw.templates.map(normalizeDocumentationTemplate) : [],
      attachments: Array.isArray(raw.attachments) ? raw.attachments.map(normalizeDocumentationAttachment) : [],
      audit: Array.isArray(raw.audit) ? raw.audit.map(normalizeDocumentationAudit) : []
    };
  }

  function demoBudgetBundle() {
    const today = todayKey();
    const now = new Date().toISOString();
    return {
      settings: BUDGET_DEFAULT_SETTINGS,
      budgets: [
        {
          id: "demo-budget-1",
          budget_name: "Kennedy Apartments mulch refresh",
          client_name: "Edge Asset Management",
          property_name: "The Kennedy Apartments",
          job_name: "Mulch & Entry Bed Refresh",
          service_type: "Mulch Refresh",
          proposed_start_date: today,
          proposed_completion_date: daysFromToday(2),
          status: "Active",
          job_status: "Scheduled",
          target_margin_percent: 35,
          base_quoted_price: 2400,
          approved_addons: 175,
          discounts: 0,
          taxes: 0,
          other_revenue: 0,
          final_invoiced_revenue: 0,
          amount_paid: 0,
          job_description: "Entry bed cleanup, mulch refresh, and first-impression polish.",
          notes: "Use before/after photos for project proof.",
          created_at: daysFromToday(-2),
          updated_at: now
        },
        {
          id: "demo-budget-2",
          budget_name: "Cedar Court trash area reset",
          client_name: "Northbank Property Group",
          property_name: "Cedar Court Apartments",
          job_name: "Trash Area Care",
          service_type: "Trash Area Care",
          proposed_start_date: daysFromToday(5),
          status: "Ready for Review",
          job_status: "Not Scheduled",
          target_margin_percent: 35,
          base_quoted_price: 950,
          approved_addons: 0,
          discounts: 0,
          taxes: 0,
          other_revenue: 0,
          final_invoiced_revenue: 0,
          amount_paid: 0,
          job_description: "Initial cleanup and pressure wash prep for trash enclosure.",
          notes: "Check access before scheduling.",
          created_at: daysFromToday(-1),
          updated_at: now
        }
      ],
      labor: [
        { id: "demo-budget-labor-1", budget_id: "demo-budget-1", role: "Owner", task: "Bed prep and mulch install", estimated_hours: 10, hourly_wage: 40, payroll_burden_percent: 12, workers_comp_percent: 4, other_labor_burden: 4, actual_hours: 3 },
        { id: "demo-budget-labor-2", budget_id: "demo-budget-2", role: "Owner", task: "Cleanup and staging", estimated_hours: 5, hourly_wage: 40, payroll_burden_percent: 12, workers_comp_percent: 4, other_labor_burden: 4 }
      ],
      materials: [
        { id: "demo-budget-material-1", budget_id: "demo-budget-1", material_name: "Fine mulch", category: "Mulch", vendor: "Local supplier", quantity: 7, unit: "yard", unit_cost: 42, tax: 0, delivery_fee: 95, actual_quantity: 2, actual_unit_cost: 42 },
        { id: "demo-budget-material-2", budget_id: "demo-budget-2", material_name: "Cleaning supplies", category: "Cleaning supplies", quantity: 1, unit: "lot", unit_cost: 55 }
      ],
      materialCatalog: [],
      equipment: [
        { id: "demo-budget-equipment-1", budget_id: "demo-budget-1", equipment_name: "Truck and trailer", usage_type: "Vehicle", estimated_hours: 1, internal_rate: 75, estimated_cost: 75, actual_usage: 0.5, actual_cost: 37.5 }
      ],
      costs: [
        { id: "demo-budget-cost-1", budget_id: "demo-budget-1", category: "Delivery", description: "Mulch delivery", estimated_cost: 95, actual_cost: 95 },
        { id: "demo-budget-cost-2", budget_id: "demo-budget-2", category: "Disposal", description: "Bagged debris dump fee", estimated_cost: 65 }
      ],
      changeOrders: [
        { id: "demo-budget-change-1", budget_id: "demo-budget-1", title: "Add courtyard weed pull", approval_status: "Approved", additional_revenue: 175, additional_labor: 80, additional_materials: 0, additional_costs: 0, requested_date: today, approved_date: today }
      ],
      documents: [],
      templates: [],
      templateItems: [],
      history: [
        { id: "demo-budget-history-1", budget_id: "demo-budget-1", action: "budget_created", actor_name: "Demo User", new_value: "Budget created from walkthrough estimate", created_at: daysFromToday(-2) }
      ]
    };
  }

  function demoConnectedOpsBundle() {
    const today = todayKey();
    const now = new Date().toISOString();
    return {
      recurringServices: [
        {
          id: "demo-recurring-1",
          service_name: "Kennedy Apartments weekly care",
          service_type: "Apartment groundskeeping",
          description: "Weekly mow, blow, entry check, trash enclosure scan, and quick exterior notes.",
          frequency: "Weekly",
          preferred_weekdays: ["Friday"],
          visit_window: "8-11am",
          start_date: today,
          next_visit_date: daysFromToday(4),
          status: "Active",
          price_per_visit: 425,
          notes: "Use arrival and completion photos for the first month.",
          updated_at: now
        },
        {
          id: "demo-recurring-2",
          service_name: "River Court HOA seasonal route",
          service_type: "HOA landscape maintenance",
          frequency: "Monthly",
          preferred_weekdays: ["Wednesday"],
          visit_window: "Morning",
          start_date: daysFromToday(-15),
          next_visit_date: daysFromToday(12),
          status: "Needs Review",
          price_per_visit: 680,
          notes: "Review common-area weeds before next visit.",
          updated_at: daysFromToday(-1)
        }
      ],
      recurringVisits: [
        { id: "demo-recurring-visit-1", recurring_service_id: "demo-recurring-1", visit_date: daysFromToday(4), visit_window: "8-11am", status: "Scheduled" },
        { id: "demo-recurring-visit-2", recurring_service_id: "demo-recurring-2", visit_date: daysFromToday(12), visit_window: "Morning", status: "Needs Reschedule" }
      ],
      checklistTemplates: [
        { id: "demo-check-template-1", title: "Arrival and completion photo checklist", category: "Work Photos", service_type: "Property care", status: "Active", visibility: "Work", description: "Capture arrival condition, completed work, and visible exceptions." },
        { id: "demo-check-template-2", title: "Trash area inspection", category: "Apartment Support", service_type: "Trash Area Care", status: "Active", visibility: "Work", description: "Document bins, overflow, enclosure, and follow-up notes." }
      ],
      checklists: [
        { id: "demo-checklist-1", template_id: "demo-check-template-1", scheduled_job_id: "demo-job-1", title: "Kennedy visit field proof", status: "In Progress", due_date: today },
        { id: "demo-checklist-2", template_id: "demo-check-template-2", title: "Cedar Court trash enclosure", status: "Not Started", due_date: daysFromToday(2) }
      ],
      approvals: [
        { id: "demo-approval-1", request_type: "Change Order", title: "Approve courtyard weed pull add-on", description: "Adds two labor hours and $175 revenue to Kennedy refresh.", priority: "High", status: "Pending", due_at: daysFromToday(1), created_at: now },
        { id: "demo-approval-2", request_type: "Schedule Exception", title: "Move River Court recurring visit", description: "Weather conflict requires a new service window.", priority: "Normal", status: "Needs More Info", due_at: daysFromToday(2), created_at: daysFromToday(-1) }
      ],
      communications: [
        { id: "demo-comm-1", direction: "outbound", channel: "email", contact_name: "Hannah Edge", subject: "Walkthrough follow-up", body: "Sent estimate and photo request.", follow_up_date: daysFromToday(1), created_at: now },
        { id: "demo-comm-2", direction: "inbound", channel: "phone", contact_name: "River Court HOA", subject: "Common area schedule", body: "Requested Wednesday morning if possible.", created_at: daysFromToday(-1) }
      ],
      shareLinks: [
        { id: "demo-share-1", title: "Kennedy project photo proof", contact_email: "hannah@edgemgt.com", token_hint: "ken...", status: "Active", view_count: 2, allowed_sections: ["photos", "invoice"], created_at: daysFromToday(-1) }
      ],
      maintenanceSchedules: [
        { id: "demo-maint-1", equipment_name: "Electric mower", maintenance_type: "Blade and deck check", frequency: "Every Use", next_due_date: today, status: "Active" },
        { id: "demo-maint-2", equipment_name: "Pressure washer", maintenance_type: "Hose and pump inspection", frequency: "Monthly", next_due_date: daysFromToday(7), status: "Active" }
      ],
      automationRules: [
        { id: "demo-auto-1", title: "Overdue visit creates reschedule approval", trigger_key: "visit_overdue", action_key: "create_approval", enabled: true, updated_at: now },
        { id: "demo-auto-2", title: "Approved change order prompts invoice check", trigger_key: "change_order_approved", action_key: "create_reminder", enabled: false, updated_at: daysFromToday(-2) }
      ],
      automationRuns: [],
      commandHistory: []
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
      tickets: [],
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
      documentation: normalizeDocumentationBundle({
        templates: [
          {
            id: "demo-template-1",
            name: "Weekly Property Cleaning Checklist",
            category: "Property Cleaning",
            status: "Active",
            current_version: 2,
            instructions: "Confirm entries, walkways, trash area, and shared outdoor spaces are clean before submitting photos.",
            allowed_roles: ["owner", "admin", "manager", "staff", "worker"],
            requires_photos: true,
            requires_signature: false,
            is_recurring: true,
            recurrence_rule: "Weekly",
            file_name: "weekly-property-cleaning-checklist.pdf",
            updated_by_name: "Urban Yards",
            updated_at: daysFromToday(-5)
          },
          {
            id: "demo-template-2",
            name: "Monthly Property Inspection",
            category: "Property Inspection",
            status: "Active",
            current_version: 1,
            instructions: "Document visible maintenance needs, safety items, irrigation issues, weeds, and curb appeal notes.",
            allowed_roles: ["owner", "admin", "manager"],
            requires_photos: true,
            requires_signature: true,
            is_recurring: true,
            recurrence_rule: "Monthly",
            file_name: "monthly-property-inspection.docx",
            updated_by_name: "Urban Yards",
            updated_at: daysFromToday(-12)
          },
          {
            id: "demo-template-3",
            name: "Equipment Inspection Every 30 Days",
            category: "Equipment Inspection",
            status: "Active",
            current_version: 1,
            instructions: "Check batteries, blades, guards, charger condition, and storage location.",
            allowed_roles: ["owner", "admin", "manager", "staff"],
            requires_photos: false,
            requires_signature: false,
            is_recurring: true,
            recurrence_rule: "Every 30 days",
            file_name: "equipment-inspection.xlsx",
            updated_by_name: "Urban Yards",
            updated_at: daysFromToday(-18)
          }
        ],
        assignments: [
          {
            id: "demo-form-1",
            template_id: "demo-template-1",
            template_name: "Weekly Property Cleaning Checklist",
            category: "Property Cleaning",
            assigned_to_name: "Demo User",
            property_name: "The Kennedy Apartments",
            job_name: "Friday common-area care",
            due_date: today,
            priority: "High",
            status: "In Progress",
            required: true,
            recurring: true,
            instructions: "Attach two photos: trash enclosure and front entry.",
            created_at: daysFromToday(-1)
          },
          {
            id: "demo-form-2",
            template_id: "demo-template-2",
            template_name: "Monthly Property Inspection",
            category: "Property Inspection",
            assigned_to_name: "Demo User",
            property_name: "River Court HOA",
            due_date: daysFromToday(3),
            priority: "Normal",
            status: "Not Started",
            required: true,
            recurring: true,
            instructions: "Capture landscape condition, irrigation notes, and any trip hazards.",
            created_at: now
          },
          {
            id: "demo-form-3",
            template_id: "demo-template-3",
            template_name: "Equipment Inspection Every 30 Days",
            category: "Equipment Inspection",
            assigned_to_name: "Demo User",
            equipment_name: "Electric mower",
            due_date: daysFromToday(-1),
            priority: "High",
            status: "Overdue",
            required: true,
            recurring: true,
            instructions: "Check mower deck, blade, battery, and charger.",
            created_at: daysFromToday(-10)
          }
        ],
        submissions: [
          {
            id: "demo-submission-1",
            assignment_id: "demo-form-1",
            template_id: "demo-template-1",
            template_name: "Weekly Property Cleaning Checklist",
            template_version: 2,
            category: "Property Cleaning",
            property_name: "Hannah Edge",
            job_name: "Courtyard mow, blow, and pressure wash check",
            completed_by_name: "Demo User",
            submitted_at: daysFromToday(-2),
            status: "Submitted",
            file_name: "hannah-edge-cleaning-checklist.pdf",
            notes: "Photos attached for entry beds and trash area."
          },
          {
            id: "demo-submission-2",
            assignment_id: "demo-form-4",
            template_id: "demo-template-2",
            template_name: "Monthly Property Inspection",
            template_version: 1,
            category: "Property Inspection",
            property_name: "Cedar Court Apartments",
            completed_by_name: "Demo User",
            submitted_at: daysFromToday(-6),
            status: "Approved",
            reviewer_name: "Urban Yards",
            reviewed_at: daysFromToday(-5),
            file_name: "cedar-court-monthly-inspection.pdf",
            notes: "Approved. Add mulch refresh recommendation to next estimate."
          }
        ],
        audit: [
          {
            id: "demo-documentation-audit-1",
            action: "template_version_uploaded",
            template_name: "Weekly Property Cleaning Checklist",
            actor_name: "Urban Yards",
            detail: "Version 2 uploaded and marked active.",
            created_at: daysFromToday(-5)
          },
          {
            id: "demo-documentation-audit-2",
            action: "form_assigned",
            template_name: "Monthly Property Inspection",
            actor_name: "Urban Yards",
            detail: "Assigned to Demo User for River Court HOA.",
            created_at: now
          },
          {
            id: "demo-documentation-audit-3",
            action: "submission_approved",
            template_name: "Monthly Property Inspection",
            actor_name: "Urban Yards",
            detail: "Cedar Court monthly inspection approved.",
            created_at: daysFromToday(-5)
          }
        ]
      }),
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
      importExport: demoImportExportSnapshot(),
      budgets: normalizeBudgetBundle(demoBudgetBundle()),
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
      const refreshed = await refreshSession(session);
      if (!refreshed || !refreshed.accessToken) {
        throw new Error("Please sign in again.");
      }
      return refreshed;
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
      state.ticketsReady = true;
      state.groundskeeperAiReady = true;
      state.documentationReady = true;
      state.importExportReady = true;
      state.budgetsReady = true;
      state.leadActivityReady = true;
      state.userProfilesReady = true;
      state.auditLogsReady = true;
      return demoDashboardData();
    }

    state.moduleErrors = [];

    const [
      submissions,
      contacts,
      jobs,
      tickets,
      ticketEvents,
      notes,
      reminders,
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
      documentation,
      importExport,
      budgets,
      leadActivity,
      userProfiles,
      auditLogs
    ] = await Promise.all([
      loadModule("quote submissions", () => supabaseRestRequest("quote_submissions?select=*&order=created_at.desc", { method: "GET" }), []),
      loadModule("contacts", () => supabaseRestRequest("contacts?select=*&order=created_at.desc", { method: "GET" }), []),
      loadModule("scheduled jobs", () => supabaseRestRequest("scheduled_jobs?select=*&order=visit_date.asc", { method: "GET" }), []),
      loadCanonicalTickets(),
      loadCanonicalTicketEvents(),
      loadModule("job notes", () => supabaseRestRequest("job_notes?select=*&order=created_at.desc", { method: "GET" }), []),
      loadModule("follow-up reminders", () => supabaseRestRequest("follow_up_reminders?select=*&order=due_date.asc", { method: "GET" }), []),
      loadModule("documents", loadSalesDocuments, []),
      loadModule("operations", loadOperationsRecords, []),
      loadModule("outreach prospects", loadOutreachProspects, []),
      loadModule("outreach companies", loadOutreachCompanies, []),
      loadModule("outreach properties", loadOutreachProperties, []),
      loadModule("route planner", loadRouteStops, []),
      loadModule("equipment", loadEquipmentItems, []),
      loadModule("equipment maintenance", loadEquipmentMaintenance, []),
      loadModule("hardware guide", loadHardwareGuide, []),
      loadModule("Groundskeeper AI", loadGroundskeeperAi, emptyGroundskeeperAiBundle),
      loadModule("documentation", loadDocumentation, () => normalizeDocumentationBundle()),
      loadModule("import/export", loadImportExportCenter, () => ({ modules: [], limits: {}, history: { imports: [], exports: [], syncs: [], backups: [] }, google: { configured: false, connections: [] }, fallback: "Import & Export Center could not be loaded." })),
      loadModule("job budgets", loadBudgets, emptyBudgetBundle),
      loadModule("call history", loadLeadActivity, []),
      loadModule("user profiles", loadUserProfiles, []),
      loadModule("audit logs", loadAuditLogs, [])
    ]);

    return {
      submissions: submissions.map(normalizeSubmission),
      contacts: contacts.map(normalizeContact),
      jobs: jobs.map(normalizeJob),
      tickets,
      ticketEvents,
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
      documentation,
      importExport,
      budgets,
      leadActivity,
      userProfiles,
      auditLogs
    };
  }

  async function loadCanonicalTickets() {
    try {
      const result = await dashboardTicketRequest("list", { limit: 1000 });
      const rows = Array.isArray(result.tickets) ? result.tickets : [];
      state.ticketsReady = true;
      state.ticketsError = "";
      return rows.map(normalizeCanonicalTicket);
    } catch (error) {
      state.ticketsReady = false;
      state.ticketsError = error.message || "Canonical job tickets could not load.";
      if (!isMissingOptionalTableError(error)) {
        recordModuleError("canonical tickets", error);
      }
      return [];
    }
  }

  async function loadCanonicalTicketEvents() {
    try {
      const result = await dashboardTicketRequest("events", { limit: 500 });
      const rows = Array.isArray(result.events) ? result.events : [];
      state.ticketEventsReady = true;
      return rows.map(normalizeJobTicketEvent);
    } catch (error) {
      state.ticketEventsReady = false;
      if (!isMissingOptionalTableError(error)) {
        recordModuleError("canonical tickets", error);
      }
      return [];
    }
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
      state.groundskeeperAiError = "";
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
      state.groundskeeperAiError = error.message || "Groundskeeper AI could not load.";
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

  async function loadDocumentation() {
    try {
      const [templates, assignments, submissions, audit] = await Promise.all([
        supabaseRestRequest("documentation_templates?select=*&order=category.asc,name.asc", { method: "GET" }),
        supabaseRestRequest("documentation_assignments?select=*&order=due_date.asc.nullslast,created_at.desc", { method: "GET" }),
        supabaseRestRequest("documentation_submissions?select=*&order=submitted_at.desc.nullslast,created_at.desc", { method: "GET" }),
        supabaseRestRequest("documentation_audit_logs?select=*&order=created_at.desc&limit=200", { method: "GET" })
      ]);
      let attachments = [];
      try {
        attachments = await supabaseRestRequest("documentation_attachments?select=*&order=created_at.desc&limit=500", { method: "GET" });
      } catch {
        attachments = [];
      }
      state.documentationReady = true;
      state.documentationError = "";
      return normalizeDocumentationBundle({ templates, assignments, submissions, attachments, audit });
    } catch (error) {
      state.documentationReady = false;
      state.documentationError = error.message || "Documentation records could not load.";
      return normalizeDocumentationBundle();
    }
  }

  async function loadBudgets() {
    if (isDemoMode()) {
      state.budgetsReady = true;
      return normalizeBudgetBundle(demoBudgetBundle());
    }

    try {
      const [settingsRows, budgets, labor, materials, materialCatalog, equipment, costs, changeOrders, documents, templates, templateItems, history] = await Promise.all([
        supabaseRestRequest("budget_settings?select=*&limit=1", { method: "GET" }),
        supabaseRestRequest("job_budgets?select=*&order=updated_at.desc", { method: "GET" }),
        supabaseRestRequest("job_budget_labor?select=*&order=created_at.asc", { method: "GET" }),
        supabaseRestRequest("job_budget_materials?select=*&order=created_at.asc", { method: "GET" }),
        supabaseRestRequest("budget_material_catalog?select=*&order=category.asc,material_name.asc", { method: "GET" }),
        supabaseRestRequest("job_budget_equipment?select=*&order=created_at.asc", { method: "GET" }),
        supabaseRestRequest("job_budget_costs?select=*&order=created_at.asc", { method: "GET" }),
        supabaseRestRequest("job_budget_change_orders?select=*&order=requested_date.desc.nullslast,created_at.desc", { method: "GET" }),
        supabaseRestRequest("job_budget_documents?select=*&order=created_at.desc", { method: "GET" }),
        supabaseRestRequest("job_budget_templates?select=*&order=name.asc", { method: "GET" }),
        supabaseRestRequest("job_budget_template_items?select=*&order=created_at.asc", { method: "GET" }),
        supabaseRestRequest("job_budget_history?select=*&order=created_at.desc&limit=300", { method: "GET" })
      ]);
      state.budgetsReady = true;
      state.budgetsError = "";
      return normalizeBudgetBundle({
        settings: settingsRows?.[0] || {},
        budgets,
        labor,
        materials,
        materialCatalog,
        equipment,
        costs,
        changeOrders,
        documents,
        templates,
        templateItems,
        history
      });
    } catch (error) {
      state.budgetsReady = false;
      state.budgetsError = error.message || "Job budgets could not load.";
      return emptyBudgetBundle();
    }
  }

  async function loadConnectedOperations() {
    if (isDemoMode()) {
      state.connectedOpsReady = true;
      return normalizeConnectedOpsBundle(demoConnectedOpsBundle());
    }

    try {
      const [
        recurringServices,
        recurringVisits,
        checklistTemplates,
        checklists,
        checklistItems,
        timeEntries,
        sitePhotos,
        approvals,
        communications,
        communicationTemplates,
        shareLinks,
        shareEvents,
        maintenanceSchedules,
        maintenanceRecords,
        automationRules,
        automationRuns,
        commandHistory
      ] = await Promise.all([
        supabaseRestRequest("recurring_services?select=*&order=next_visit_date.asc.nullslast,updated_at.desc", { method: "GET" }),
        supabaseRestRequest("recurring_service_visits?select=*&order=visit_date.asc", { method: "GET" }),
        supabaseRestRequest("job_checklist_templates?select=*&order=category.asc,title.asc", { method: "GET" }),
        supabaseRestRequest("job_checklists?select=*&order=due_date.asc.nullslast,updated_at.desc", { method: "GET" }),
        supabaseRestRequest("job_checklist_items?select=*&order=sort_order.asc,created_at.asc", { method: "GET" }),
        supabaseRestRequest("job_time_entries?select=*&order=entry_date.desc,created_at.desc&limit=500", { method: "GET" }),
        supabaseRestRequest("job_site_photos?select=*&order=created_at.desc&limit=500", { method: "GET" }),
        supabaseRestRequest("approval_requests?select=*&order=due_at.asc.nullslast,created_at.desc", { method: "GET" }),
        supabaseRestRequest("communications?select=*&order=created_at.desc&limit=500", { method: "GET" }),
        supabaseRestRequest("communication_templates?select=*&order=category.asc,title.asc", { method: "GET" }),
        supabaseRestRequest("client_share_links?select=*&order=created_at.desc", { method: "GET" }),
        supabaseRestRequest("client_share_link_events?select=*&order=created_at.desc&limit=500", { method: "GET" }),
        supabaseRestRequest("equipment_maintenance_schedules?select=*&order=next_due_date.asc.nullslast,updated_at.desc", { method: "GET" }),
        supabaseRestRequest("equipment_maintenance_records?select=*&order=performed_at.desc&limit=500", { method: "GET" }),
        supabaseRestRequest("automation_rules?select=*&order=updated_at.desc", { method: "GET" }),
        supabaseRestRequest("automation_runs?select=*&order=created_at.desc&limit=200", { method: "GET" }),
        supabaseRestRequest("command_usage_history?select=*&order=created_at.desc&limit=200", { method: "GET" })
      ]);
      state.connectedOpsReady = true;
      state.connectedOpsError = "";
      return normalizeConnectedOpsBundle({
        recurringServices,
        recurringVisits,
        checklistTemplates,
        checklists,
        checklistItems,
        timeEntries,
        sitePhotos,
        approvals,
        communications,
        communicationTemplates,
        shareLinks,
        shareEvents,
        maintenanceSchedules,
        maintenanceRecords,
        automationRules,
        automationRuns,
        commandHistory
      });
    } catch (error) {
      state.connectedOpsReady = false;
      state.connectedOpsError = error.message || "Connected Operations could not load.";
      return emptyConnectedOpsBundle();
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

  function blankToNull(value) {
    const text = String(value ?? "").trim();
    return text ? text : null;
  }

  function uuidOrNull(value) {
    const text = String(value ?? "").trim();
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text) ? text : null;
  }

  function ticketRecordStatusForStage(stage) {
    const normalized = normalizeTicketStageForDashboard(stage);
    if (normalized === "cancelled") return "cancelled";
    if (["closed", "paid"].includes(normalized)) return "completed";
    if (["paused", "scope_change_requested"].includes(normalized)) return "on_hold";
    if (["scheduled", "in_progress", "field_work_complete", "completion_review", "invoice_review", "invoice_sent", "partially_paid"].includes(normalized)) return "active";
    return "open";
  }

  function canonicalTicketPayload(input = {}) {
    const stage = normalizeTicketStageForDashboard(input.stage || "sales_intake");
    const service = blankToNull(input.service || input.requested_service);
    const title = blankToNull(input.title) || service || "Job ticket";
    return {
      title,
      stage,
      status: input.status || ticketRecordStatusForStage(stage),
      source_type: blankToNull(input.source_type || input.sourceType),
      source_id: uuidOrNull(input.source_id || input.sourceId),
      quote_id: uuidOrNull(input.quote_id || input.quoteId),
      job_id: uuidOrNull(input.job_id || input.jobId),
      invoice_id: uuidOrNull(input.invoice_id || input.invoiceId),
      customer_id: uuidOrNull(input.customer_id || input.customerId),
      property_id: uuidOrNull(input.property_id || input.propertyId),
      customer_name: blankToNull(input.customer_name || input.customerName),
      client_name: blankToNull(input.client_name || input.clientName),
      contact_name: blankToNull(input.contact_name || input.contactName),
      company_name: blankToNull(input.company_name || input.companyName),
      property_name: blankToNull(input.property_name || input.propertyName),
      property_address: blankToNull(input.property_address || input.propertyAddress),
      city: blankToNull(input.city),
      requested_service: service,
      service,
      scope_of_work: blankToNull(input.scope_of_work || input.scopeOfWork),
      description: blankToNull(input.description),
      notes: blankToNull(input.notes),
      internal_notes: blankToNull(input.internal_notes || input.internalNotes),
      scheduled_date: blankToNull(input.scheduled_date || input.scheduledDate),
      visit_date: blankToNull(input.visit_date || input.visitDate),
      due_date: blankToNull(input.due_date || input.dueDate),
      owner_label: blankToNull(input.owner_label || input.ownerLabel),
      next_action: blankToNull(input.next_action || input.nextAction),
      proposed_price: budgetNumberOrNull(input.proposed_price ?? input.proposedPrice),
      expected_revenue: budgetNumberOrNull(input.expected_revenue ?? input.expectedRevenue),
      estimated_total_cost: budgetNumberOrNull(input.estimated_total_cost ?? input.estimatedTotalCost),
      estimated_profit: budgetNumberOrNull(input.estimated_profit ?? input.estimatedProfit),
      target_margin: budgetNumberOrNull(input.target_margin ?? input.targetMargin),
      cost_review_complete: Boolean(input.cost_review_complete ?? input.costReviewComplete),
      budget_complete: Boolean(input.budget_complete ?? input.budgetComplete),
      blockers: Array.isArray(input.blockers) ? input.blockers.filter(Boolean) : undefined
    };
  }

  function canonicalTicketUpdatePayload(input = {}) {
    const payload = {};
    const textFields = [
      ["source_type", "sourceType"],
      ["source_id", "sourceId"],
      ["quote_id", "quoteId"],
      ["job_id", "jobId"],
      ["invoice_id", "invoiceId"],
      ["customer_id", "customerId"],
      ["property_id", "propertyId"],
      ["title", "title"],
      ["customer_name", "customerName"],
      ["client_name", "clientName"],
      ["contact_name", "contactName"],
      ["company_name", "companyName"],
      ["property_name", "propertyName"],
      ["property_address", "propertyAddress"],
      ["city", "city"],
      ["requested_service", "requestedService"],
      ["service", "service"],
      ["scope_of_work", "scopeOfWork"],
      ["description", "description"],
      ["scheduled_date", "scheduledDate"],
      ["visit_date", "visitDate"],
      ["due_date", "dueDate"],
      ["assigned_user_id", "assignedUserId"],
      ["owner_label", "ownerLabel"],
      ["field_completion_notes", "fieldCompletionNotes"],
      ["payment_status", "paymentStatus"]
    ];
    const boolFields = [
      ["cost_review_complete", "costReviewComplete"],
      ["budget_complete", "budgetComplete"],
      ["scope_complete", "scopeComplete"],
      ["customer_approval_recorded", "customerApprovalRecorded"],
      ["owner_approval_recorded", "ownerApprovalRecorded"],
      ["draft_invoice_exists", "draftInvoiceExists"],
      ["deposit_required", "depositRequired"],
      ["deposit_paid", "depositPaid"],
      ["before_photos_uploaded", "beforePhotosUploaded"],
      ["after_photos_uploaded", "afterPhotosUploaded"],
      ["arrival_photos_uploaded", "arrivalPhotosUploaded"],
      ["completion_photos_uploaded", "completionPhotosUploaded"],
      ["invoice_finalized", "invoiceFinalized"]
    ];
    if (Object.prototype.hasOwnProperty.call(input, "stage")) {
      payload.stage = normalizeTicketStageForDashboard(input.stage);
    }
    if (Object.prototype.hasOwnProperty.call(input, "status")) {
      payload.status = input.status || ticketRecordStatusForStage(payload.stage);
    }
    if (Object.prototype.hasOwnProperty.call(input, "next_action") || Object.prototype.hasOwnProperty.call(input, "nextAction")) {
      payload.next_action = blankToNull(input.next_action || input.nextAction);
    }
    if (Object.prototype.hasOwnProperty.call(input, "notes")) {
      payload.notes = blankToNull(input.notes);
    }
    if (Object.prototype.hasOwnProperty.call(input, "internal_notes") || Object.prototype.hasOwnProperty.call(input, "internalNotes")) {
      payload.internal_notes = blankToNull(input.internal_notes || input.internalNotes);
    }
    [
      ["proposed_price", "proposedPrice"],
      ["expected_revenue", "expectedRevenue"],
      ["estimated_total_cost", "estimatedTotalCost"],
      ["estimated_profit", "estimatedProfit"],
      ["target_margin", "targetMargin"]
    ].forEach(([snake, camel]) => {
      if (Object.prototype.hasOwnProperty.call(input, snake) || Object.prototype.hasOwnProperty.call(input, camel)) {
        payload[snake] = budgetNumberOrNull(input[snake] ?? input[camel]);
      }
    });
    textFields.forEach(([snake, camel]) => {
      if (Object.prototype.hasOwnProperty.call(input, snake) || Object.prototype.hasOwnProperty.call(input, camel)) {
        payload[snake] = blankToNull(input[snake] ?? input[camel]);
      }
    });
    boolFields.forEach(([snake, camel]) => {
      if (Object.prototype.hasOwnProperty.call(input, snake) || Object.prototype.hasOwnProperty.call(input, camel)) {
        payload[snake] = Boolean(input[snake] ?? input[camel]);
      }
    });
    return payload;
  }

  async function insertJobTicket(input) {
    const payload = canonicalTicketPayload(input);
    if (isDemoMode()) {
      const ticket = normalizeCanonicalTicket({
        id: nextDemoId("ticket"),
        ...payload,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      state.data.tickets.unshift(ticket);
      return ticket;
    }

    try {
      const result = await dashboardTicketRequest("create", { ticket: payload });
      state.ticketsReady = true;
      state.ticketsError = "";
      const ticket = normalizeCanonicalTicket(result.ticket);
      const existingIndex = state.data.tickets.findIndex((item) => item.id === ticket.id);
      if (existingIndex >= 0) state.data.tickets[existingIndex] = ticket;
      else state.data.tickets.unshift(ticket);
      return ticket;
    } catch (error) {
      state.ticketsReady = false;
      state.ticketsError = error.message || "Canonical job tickets could not save.";
      if (isMissingOptionalTableError(error)) return null;
      throw error;
    }
  }

  async function updateJobTicket(id, input) {
    if (!id) return null;
    const payload = canonicalTicketUpdatePayload(input);
    if (!Object.keys(payload).length) return null;
    if (isDemoMode()) {
      const index = state.data.tickets.findIndex((ticket) => ticket.id === id);
      if (index < 0) return null;
      const updated = normalizeCanonicalTicket({
        ...state.data.tickets[index],
        ...payload,
        updated_at: new Date().toISOString()
      });
      state.data.tickets[index] = updated;
      return updated;
    }

    const result = await dashboardTicketRequest("update", { id, ticket: payload });
    const ticket = normalizeCanonicalTicket(result.ticket);
    const index = state.data.tickets.findIndex((item) => item.id === ticket.id);
    if (index >= 0) state.data.tickets[index] = ticket;
    else state.data.tickets.unshift(ticket);
    return ticket;
  }

  async function transitionJobTicketStage(id, toStage, input = {}) {
    if (!id || !toStage) return null;
    const nextStage = normalizeTicketStageForDashboard(toStage);
    const nextAction = blankToNull(input.next_action || input.nextAction || ticketNextAction(nextStage));
    if (isDemoMode()) {
      return updateJobTicket(id, {
        stage: nextStage,
        status: ticketRecordStatusForStage(nextStage),
        next_action: nextAction
      });
    }

    const result = await dashboardTicketRequest("transition", {
      id,
      toStage: nextStage,
      notes: blankToNull(input.notes),
      nextAction,
      sourceStatus: blankToNull(input.sourceStatus || input.source_status)
    });
    const ticket = normalizeCanonicalTicket(result.ticket);
    const index = state.data.tickets.findIndex((item) => item.id === ticket.id);
    if (index >= 0) state.data.tickets[index] = ticket;
    else state.data.tickets.unshift(ticket);
    return ticket;
  }

  async function insertJobTicketEvent(ticketId, input = {}) {
    if (!ticketId) return null;
    if (isDemoMode()) return null;
    const session = getSession() || {};
    const ticketUuid = uuidOrNull(ticketId);
    if (!ticketUuid) return null;
    const payload = {
      ticket_id: ticketUuid,
      event_type: blankToNull(input.event_type || input.eventType) || "ticket_updated",
      actor_user_id: uuidOrNull(session.userId),
      actor_email: blankToNull(session.email),
      from_stage: blankToNull(input.from_stage || input.fromStage),
      to_stage: blankToNull(input.to_stage || input.toStage),
      notes: blankToNull(input.notes),
      old_value: input.old_value || input.oldValue || null,
      new_value: input.new_value || input.newValue || null
    };
    try {
      const result = await dashboardTicketRequest("event", { ticketId: ticketUuid, event: payload });
      return result.event || null;
    } catch (error) {
      if (isMissingOptionalTableError(error)) return null;
      recordModuleError("canonical tickets", error);
      return null;
    }
  }

  function findJobTicketForScheduledJob(jobId) {
    const id = String(jobId || "");
    if (!id) return null;
    return (state.data.tickets || []).find((ticket) => (
      ticket?.sourceType === "job" && ticket.sourceId === id
    )) || null;
  }

  function ticketPayloadFromScheduledJob(job = {}, overrides = {}) {
    const stage = normalizeTicketStageForDashboard(overrides.stage || jobStage(job), "scheduled");
    const visitDate = blankToNull(overrides.visit_date || overrides.visitDate || job.dateRaw);
    const siteName = blankToNull(overrides.customer_name || overrides.customerName || job.site) || "Scheduled visit";
    const service = blankToNull(overrides.service || overrides.requested_service || overrides.requestedService || job.service) || "Scheduled visit";
    return {
      title: service,
      stage,
      status: overrides.status || ticketRecordStatusForStage(stage),
      source_type: "job",
      source_id: job.id,
      job_id: job.id,
      customer_name: siteName,
      property_name: siteName,
      city: blankToNull(overrides.city || job.city),
      requested_service: service,
      service,
      description: blankToNull(overrides.description) || [job.date, job.window].filter(Boolean).join(" / "),
      notes: blankToNull(overrides.notes),
      internal_notes: blankToNull(overrides.internal_notes || overrides.internalNotes),
      scheduled_date: visitDate,
      visit_date: visitDate,
      owner_label: blankToNull(overrides.owner_label || overrides.ownerLabel) || "Work",
      next_action: blankToNull(overrides.next_action || overrides.nextAction) || ticketNextAction(stage),
      field_completion_notes: blankToNull(overrides.field_completion_notes || overrides.fieldCompletionNotes),
      arrival_photos_uploaded: overrides.arrival_photos_uploaded ?? overrides.arrivalPhotosUploaded,
      completion_photos_uploaded: overrides.completion_photos_uploaded ?? overrides.completionPhotosUploaded,
      before_photos_uploaded: overrides.before_photos_uploaded ?? overrides.beforePhotosUploaded,
      after_photos_uploaded: overrides.after_photos_uploaded ?? overrides.afterPhotosUploaded
    };
  }

  async function ensureJobTicketForScheduledJob(jobOrId, overrides = {}) {
    const job = typeof jobOrId === "string"
      ? state.data.jobs.find((item) => item.id === jobOrId)
      : jobOrId;
    if (!job?.id) return null;
    const existing = findJobTicketForScheduledJob(job.id);
    const payload = ticketPayloadFromScheduledJob(job, {
      stage: existing?.stage,
      ...overrides
    });
    if (existing?.id) {
      return await updateJobTicket(existing.id, payload) || existing;
    }
    return insertJobTicket(payload);
  }

  function findJobTicketForQuoteSubmission(submissionId) {
    const id = String(submissionId || "");
    if (!id) return null;
    return (state.data.tickets || []).find((ticket) => (
      ticket?.sourceType === "quote" && ticket.sourceId === id
    )) || null;
  }

  function ticketPayloadFromQuoteSubmission(item = {}, overrides = {}) {
    const stage = normalizeTicketStageForDashboard(overrides.stage || quoteStage(item), "sales_intake");
    const service = blankToNull(overrides.service || overrides.requested_service || overrides.requestedService || item.service) || "Quote request";
    const customerName = blankToNull(overrides.customer_name || overrides.customerName || item.name) || "Unnamed lead";
    const followUpDue = item.followUp === "Not set" ? "" : item.followUp;
    return {
      title: service,
      stage,
      status: overrides.status || ticketRecordStatusForStage(stage),
      source_type: "quote",
      source_id: item.id,
      quote_id: item.id,
      invoice_id: overrides.invoice_id || overrides.invoiceId || null,
      customer_name: customerName,
      contact_name: customerName,
      property_name: blankToNull(overrides.property_name || overrides.propertyName || item.propertyType),
      city: blankToNull(overrides.city || item.city),
      requested_service: service,
      service,
      description: blankToNull(overrides.description) || item.notes || item.source || "Quote request from the website or dashboard.",
      notes: blankToNull(overrides.notes) || item.notes,
      internal_notes: blankToNull(overrides.internal_notes || overrides.internalNotes),
      due_date: blankToNull(overrides.due_date || overrides.dueDate || followUpDue),
      owner_label: blankToNull(overrides.owner_label || overrides.ownerLabel) || "Leads",
      next_action: blankToNull(overrides.next_action || overrides.nextAction) || ticketNextAction(stage)
    };
  }

  async function ensureJobTicketForQuoteSubmission(submissionOrId, overrides = {}) {
    const item = typeof submissionOrId === "string"
      ? findSubmission(submissionOrId)
      : submissionOrId;
    if (!item?.id) return null;
    const existing = findJobTicketForQuoteSubmission(item.id);
    const payload = ticketPayloadFromQuoteSubmission(item, {
      stage: existing?.stage,
      ...overrides
    });
    if (existing?.id) {
      return await updateJobTicket(existing.id, payload) || existing;
    }
    return insertJobTicket(payload);
  }

  function findJobTicketForSalesDocument(documentId) {
    const id = String(documentId || "");
    if (!id) return null;
    return (state.data.tickets || []).find((ticket) => (
      ticket?.sourceType === "document" && ticket.sourceId === id
    )) || null;
  }

  function salesDocumentStage(document = {}) {
    const status = statusText([document.status, document.squareStatus].filter(Boolean).join(" "));
    const isInvoice = document.type === "invoice";
    if (/void|cancel|canceled|cancelled|lost|declined/.test(status)) return "cancelled";
    if (/paid|closed/.test(status)) return "paid";
    if (/partial/.test(status)) return "partially_paid";
    if (isInvoice) {
      if (/sent|open|unpaid|outstanding/.test(status)) return "invoice_sent";
      return "invoice_preparation";
    }
    if (/accepted|approved|won/.test(status)) return "needs_budget";
    if (/sent|open/.test(status)) return "customer_approval_pending";
    return "quote_pending";
  }

  function salesDocumentDescription(document = {}) {
    return blankToNull(document.lineItems?.[0]?.description)
      || blankToNull(document.notes)
      || (document.type === "invoice" ? "Invoice" : "Estimate / Quote");
  }

  function ticketPayloadFromSalesDocument(document = {}, overrides = {}) {
    const stage = normalizeTicketStageForDashboard(overrides.stage || salesDocumentStage(document), "quote_pending");
    const typeLabel = document.type === "invoice" ? "Invoice" : "Estimate / Quote";
    const description = salesDocumentDescription(document);
    const total = Number(document.total || 0);
    return {
      title: blankToNull(overrides.title) || `${typeLabel}: ${description}`,
      stage,
      status: overrides.status || ticketRecordStatusForStage(stage),
      source_type: "document",
      source_id: document.id,
      invoice_id: document.type === "invoice" ? document.id : overrides.invoice_id || overrides.invoiceId || null,
      customer_name: blankToNull(overrides.customer_name || overrides.customerName || document.clientName),
      contact_name: blankToNull(overrides.contact_name || overrides.contactName || document.clientName),
      requested_service: description,
      service: description,
      description: `${typeLabel} ${document.number || "Draft"}${total ? ` for $${total.toFixed(2)}` : ""}`,
      notes: blankToNull(overrides.notes) || document.notes,
      due_date: blankToNull(overrides.due_date || overrides.dueDate || document.dueDateRaw),
      owner_label: blankToNull(overrides.owner_label || overrides.ownerLabel) || "Money",
      next_action: blankToNull(overrides.next_action || overrides.nextAction) || ticketNextAction(stage)
    };
  }

  async function ensureJobTicketForSalesDocument(documentOrId, overrides = {}) {
    const document = typeof documentOrId === "string"
      ? state.data.documents.find((item) => item.id === documentOrId)
      : documentOrId;
    if (!document?.id) return null;
    const existing = findJobTicketForSalesDocument(document.id);
    const payload = ticketPayloadFromSalesDocument(document, {
      stage: existing?.stage,
      ...overrides
    });
    if (existing?.id) {
      return await updateJobTicket(existing.id, payload) || existing;
    }
    return insertJobTicket(payload);
  }

  async function syncJobTicketPhotoProof(jobId, photoStage) {
    const ticket = await ensureJobTicketForScheduledJob(jobId);
    if (!ticket?.id) return null;
    if (photoStage === "arrival") {
      return updateJobTicket(ticket.id, {
        arrival_photos_uploaded: true,
        before_photos_uploaded: true,
        next_action: ticketNextAction(normalizeTicketStageForDashboard(ticket.stage, "scheduled"))
      });
    }
    if (photoStage === "completion") {
      return updateJobTicket(ticket.id, {
        completion_photos_uploaded: true,
        after_photos_uploaded: true,
        next_action: ticketNextAction(normalizeTicketStageForDashboard(ticket.stage, "scheduled"))
      });
    }
    return ticket;
  }

  async function completeScheduledJobWithTicket(jobOrId) {
    const job = typeof jobOrId === "string"
      ? state.data.jobs.find((item) => item.id === jobOrId)
      : jobOrId;
    if (!job) throw new Error("Scheduled visit was not found.");
    const baseTicket = await ensureJobTicketForScheduledJob(job);
    if (baseTicket?.id) {
      const currentStage = normalizeTicketStageForDashboard(baseTicket.stage || jobStage(job), "scheduled");
      let activeTicket = baseTicket;
      if (currentStage === "scheduled") {
        activeTicket = await transitionJobTicketStage(baseTicket.id, "in_progress", {
          notes: "Work started from the schedule detail panel.",
          nextAction: ticketNextAction("in_progress"),
          sourceStatus: "In Progress"
        });
      }
      const ticketId = activeTicket?.id || baseTicket.id;
      const completionNotes = `Marked complete from the schedule detail panel on ${formatDate(new Date().toISOString())}.`;
      await updateJobTicket(ticketId, {
        field_completion_notes: completionNotes,
        next_action: ticketNextAction("field_work_complete")
      });
      await transitionJobTicketStage(ticketId, "field_work_complete", {
        notes: completionNotes,
        nextAction: ticketNextAction("field_work_complete"),
        sourceStatus: "Completed"
      });
    }
    await updateStatus("scheduled_jobs", job.id, "Completed");
  }

  async function saveTicketWorkAssignment(form) {
    if (!canManageWorkWorkflow()) throw new Error("Your dashboard role cannot assign work visits.");
    const ticketId = form.dataset.ticketId || "";
    const jobId = form.dataset.jobId || "";
    const ticket = dashboardTickets().find((item) => item.source === "ticket" && item.id === ticketId);
    if (!ticket) throw new Error("Open a unified Job Ticket before assigning work.");
    const formData = new FormData(form);
    const visitDate = String(formData.get("visit_date") || "").trim();
    const visitWindow = String(formData.get("visit_window") || "").trim();
    const assignedUserId = String(formData.get("assigned_user_id") || "").trim();
    if (!visitDate) throw new Error("Choose a visit date before assigning work.");
    if (!assignedUserId) throw new Error("Choose a field owner before assigning work.");

    const assignedProfile = assignmentProfileForId(assignedUserId);
    const assignedUser = assignmentProfileLabel(assignedProfile || { email: assignedUserId });
    const jobPayload = {
      visit_date: visitDate,
      visit_window: visitWindow,
      site_name: ticket.customer || ticket.title || "Scheduled visit",
      city: ticket.property && ticket.property !== "Property not set" ? ticket.property : "",
      service: ticket.requestedService || ticket.title || "Scheduled visit",
      status: "Scheduled",
      assigned_user: assignedUser
    };
    const job = jobId
      ? await updateScheduledJob(jobId, jobPayload)
      : (await insertScheduledJobs([jobPayload]))[0];
    if (!job?.id) throw new Error("Unable to create the scheduled visit.");

    const updatePayload = {
      source_type: "job",
      source_id: job.id,
      job_id: job.id,
      scheduled_date: visitDate,
      visit_date: visitDate,
      assigned_user_id: assignedUserId,
      owner_label: "Work",
      next_action: ticketNextAction("scheduled")
    };
    await updateJobTicket(ticket.id, updatePayload);
    const refreshed = dashboardTickets().find((item) => item.source === "ticket" && item.id === ticket.id) || ticket;
    if (ticketStage(refreshed) === "ready_to_schedule") {
      await transitionJobTicketStage(ticket.id, "scheduled", {
        notes: `Work assigned to ${assignedUser} for ${formatDate(visitDate)}.`,
        nextAction: ticketNextAction("scheduled"),
        sourceStatus: "Scheduled"
      });
    } else {
      await insertJobTicketEvent(ticket.id, {
        event_type: "ticket_work_assigned",
        notes: `Work assigned to ${assignedUser} for ${formatDate(visitDate)}.`,
        new_value: { jobId: job.id, assignedUser, visitDate, visitWindow }
      });
    }
    return { ticketId: ticket.id, job };
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
        documentation_templates: "documentation.templates",
        documentation_assignments: "documentation.assignments",
        documentation_submissions: "documentation.submissions",
        documentation_audit_logs: "documentation.audit",
        lead_activity: "leadActivity"
      };
      const key = map[table];
      if (key && key.includes(".")) {
        const [group, child] = key.split(".");
        if (Array.isArray(state.data[group]?.[child])) {
          state.data[group][child] = state.data[group][child].filter((item) => item.id !== id);
        }
      } else if (key && Array.isArray(state.data[key])) {
        state.data[key] = state.data[key].filter((item) => item.id !== id);
      }
      return;
    }

    await supabaseRestRequest(`${table}?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" }
    });
  }

  function activeBudgetBundle() {
    return state.data.budgets || emptyBudgetBundle();
  }

  function selectedBudget() {
    const bundle = activeBudgetBundle();
    return bundle.budgets.find((budget) => budget.id === state.selectedBudgetId) || bundle.budgets[0] || null;
  }

  function budgetLineBundle(budgetId) {
    const bundle = activeBudgetBundle();
    const belongsToBudget = (item) => (item.budgetId || item.budget_id || item.jobBudgetId || item.job_budget_id || "") === budgetId;
    return {
      labor: bundle.labor.filter((item) => item.budgetId === budgetId),
      materials: bundle.materials.filter((item) => item.budgetId === budgetId),
      equipment: bundle.equipment.filter((item) => item.budgetId === budgetId),
      costs: bundle.costs.filter((item) => item.budgetId === budgetId),
      changeOrders: bundle.changeOrders.filter((item) => item.budgetId === budgetId),
      documents: (bundle.documents || []).filter(belongsToBudget),
      history: (bundle.history || []).filter(belongsToBudget)
    };
  }

  function budgetSummary(budget) {
    const calculator = window.UrbanYardsBudgetCalculations;
    const bundle = budgetLineBundle(budget?.id || "");
    if (!calculator || !budget) return {};
    return calculator.summarizeBudget({
      budget,
      labor: bundle.labor,
      materials: bundle.materials,
      equipment: bundle.equipment,
      costs: bundle.costs,
      changeOrders: bundle.changeOrders,
      settings: activeBudgetBundle().settings
    });
  }

  function budgetPayloadFromForm(form) {
    const data = new FormData(form);
    const payload = {
      budget_name: String(data.get("budget_name") || "").trim(),
      job_id: String(data.get("job_id") || "") || null,
      quote_id: String(data.get("quote_id") || "") || null,
      invoice_id: String(data.get("invoice_id") || "") || null,
      client_id: String(data.get("client_id") || "") || null,
      property_name: String(data.get("property_name") || "").trim(),
      job_name: String(data.get("budget_name") || "").trim(),
      service_type: String(data.get("service_type") || "").trim(),
      job_description: String(data.get("job_description") || "").trim(),
      proposed_start_date: String(data.get("proposed_start_date") || "") || null,
      proposed_completion_date: String(data.get("proposed_completion_date") || "") || null,
      status: normalizeBudgetStatus(String(data.get("status") || "Draft")),
      job_status: normalizeBudgetJobStatus(String(data.get("job_status") || "Not Scheduled")),
      target_margin_percent: Number(data.get("target_margin_percent") || BUDGET_DEFAULT_SETTINGS.default_target_margin),
      base_quoted_price: Number(data.get("base_quoted_price") || 0),
      approved_addons: Number(data.get("approved_addons") || 0),
      discounts: Number(data.get("discounts") || 0),
      taxes: Number(data.get("taxes") || 0),
      other_revenue: Number(data.get("other_revenue") || 0),
      final_invoiced_revenue: Number(data.get("final_invoiced_revenue") || 0),
      amount_paid: Number(data.get("amount_paid") || 0),
      notes: String(data.get("notes") || "").trim()
    };
    const job = state.data.jobs.find((item) => item.id === payload.job_id);
    const quote = state.data.submissions.find((item) => item.id === payload.quote_id);
    const invoice = state.data.documents.find((item) => item.id === payload.invoice_id);
    const client = state.data.contacts.find((item) => item.id === payload.client_id);
    payload.client_name = client?.name || quote?.name || invoice?.clientName || "";
    payload.property_id = null;
    payload.property_name = payload.property_name || job?.site || client?.property || quote?.propertyType || "";
    payload.job_name = job?.site || payload.job_name || payload.budget_name;
    payload.service_type = payload.service_type || job?.service || quote?.service || invoice?.lineItems?.[0]?.description || "";
    if (!payload.budget_name) throw new Error("Budget name is required.");
    return payload;
  }

  async function insertBudget(payload) {
    if (!state.budgetsReady) throw new Error("Job budget tools are folded into Job Tickets and Money during this rebuild.");
    if (isDemoMode()) {
      const budget = normalizeBudget({ id: nextDemoId("budget"), ...payload, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      state.data.budgets.budgets.unshift(budget);
      return budget;
    }
    const rows = await supabaseRestRequest("job_budgets", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload)
    });
    return normalizeBudget(rows[0]);
  }

  async function updateBudget(id, payload) {
    if (isDemoMode()) {
      const index = state.data.budgets.budgets.findIndex((item) => item.id === id);
      if (index >= 0) {
        state.data.budgets.budgets[index] = normalizeBudget({
          ...state.data.budgets.budgets[index],
          ...payload,
          id,
          updated_at: new Date().toISOString()
        });
      }
      return state.data.budgets.budgets[index] || null;
    }
    const rows = await supabaseRestRequest(`job_budgets?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ ...payload, updated_at: new Date().toISOString() })
    });
    return rows?.[0] ? normalizeBudget(rows[0]) : null;
  }

  async function saveBudgetFromForm(form) {
    const payload = budgetPayloadFromForm(form);
    const id = String(new FormData(form).get("id") || "").trim();
    const saved = id ? await updateBudget(id, payload) : await insertBudget(payload);
    state.selectedBudgetId = saved?.id || id || state.selectedBudgetId;
    return saved;
  }

  function budgetLinePayloadFromForm(form) {
    const data = new FormData(form);
    const budgetId = String(data.get("budget_id") || "").trim();
    const lineType = String(data.get("line_type") || "labor");
    const title = String(data.get("title") || "").trim();
    const category = String(data.get("category") || "").trim();
    const estimatedQuantity = Number(data.get("estimated_quantity") || 0);
    const unitCost = Number(data.get("unit_cost") || 0);
    const explicitEstimated = Number(data.get("estimated_cost") || 0);
    const actualQuantity = Number(data.get("actual_quantity") || 0);
    const actualCost = Number(data.get("actual_cost") || 0);
    const notes = String(data.get("notes") || "").trim();
    if (!budgetId) throw new Error("Choose a budget first.");
    if (!title) throw new Error("Add a line item title.");
    const estimatedUnits = estimatedQuantity || (explicitEstimated ? 1 : 0);
    const estimatedRate = unitCost || (explicitEstimated && estimatedUnits ? explicitEstimated / estimatedUnits : 0);
    if (lineType === "labor") {
      const useDefaultBurden = Boolean(unitCost);
      return {
        table: "job_budget_labor",
        normalize: normalizeBudgetLabor,
        group: "labor",
        record: {
          budget_id: budgetId,
          role: category || "General labor",
          task: title,
          estimated_hours: estimatedUnits,
          hourly_wage: estimatedRate,
          payroll_burden_percent: useDefaultBurden ? activeBudgetBundle().settings.default_labor_burden_percent || 0 : 0,
          actual_hours: actualQuantity,
          actual_cost: actualCost,
          notes
        }
      };
    }
    if (lineType === "materials") {
      return {
        table: "job_budget_materials",
        normalize: normalizeBudgetMaterial,
        group: "materials",
        record: {
          budget_id: budgetId,
          material_name: title,
          category: category || "Other",
          quantity: estimatedUnits,
          unit_cost: estimatedRate,
          actual_quantity: actualQuantity,
          actual_cost: actualCost,
          notes
        }
      };
    }
    if (lineType === "equipment") {
      return {
        table: "job_budget_equipment",
        normalize: normalizeBudgetEquipment,
        group: "equipment",
        record: {
          budget_id: budgetId,
          equipment_name: title,
          usage_type: category || "Owned",
          estimated_hours: estimatedQuantity,
          internal_hourly_rate: unitCost,
          estimated_cost: explicitEstimated || estimatedQuantity * unitCost,
          actual_usage: actualQuantity,
          actual_cost: actualCost,
          notes
        }
      };
    }
    if (lineType === "change_order") {
      return {
        table: "job_budget_change_orders",
        normalize: normalizeBudgetChangeOrder,
        group: "changeOrders",
        record: {
          budget_id: budgetId,
          title,
          description: notes,
          requested_date: todayKey(),
          additional_revenue: explicitEstimated,
          additional_labor_cost: 0,
          additional_material_cost: 0,
          additional_other_cost: actualCost,
          approval_status: category || "Draft",
          internal_notes: notes
        }
      };
    }
    return {
      table: "job_budget_costs",
      normalize: normalizeBudgetCost,
      group: "costs",
      record: {
        budget_id: budgetId,
        category: normalizeBudgetCostCategory(category),
        description: title,
        estimated_cost: explicitEstimated || estimatedQuantity * unitCost,
        actual_cost: actualCost,
        notes
      }
    };
  }

  async function insertBudgetLineFromForm(form) {
    const payload = budgetLinePayloadFromForm(form);
    if (isDemoMode()) {
      const item = payload.normalize({ id: nextDemoId(payload.group), ...payload.record, created_at: new Date().toISOString() });
      state.data.budgets[payload.group].push(item);
      return item;
    }
    const rows = await supabaseRestRequest(payload.table, {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload.record)
    });
    return rows?.[0] ? payload.normalize(rows[0]) : null;
  }

  async function archiveBudget(id) {
    const budget = activeBudgetBundle().budgets.find((item) => item.id === id);
    if (!budget) return null;
    return updateBudget(id, { status: "Archived", archived_at: new Date().toISOString() });
  }

  async function duplicateBudget(id) {
    const budget = activeBudgetBundle().budgets.find((item) => item.id === id);
    if (!budget) throw new Error("Budget not found.");
    const payload = {
      budget_name: `${budget.budgetName} Copy`,
      job_id: budget.jobId || null,
      quote_id: budget.quoteId || null,
      invoice_id: budget.invoiceId || null,
      client_id: budget.clientId || null,
      property_id: budget.propertyId || null,
      client_name: budget.clientName,
      property_name: budget.propertyName,
      job_name: budget.jobName,
      service_type: budget.serviceType,
      job_description: budget.jobDescription,
      proposed_start_date: budget.proposedStartDateRaw || null,
      proposed_completion_date: budget.proposedCompletionDateRaw || null,
      status: "Draft",
      job_status: budget.jobStatus,
      target_margin_percent: budget.targetMarginPercent,
      base_quoted_price: budget.baseQuotedPrice,
      approved_addons: budget.approvedAddons,
      discounts: budget.discounts,
      taxes: budget.taxes,
      other_revenue: budget.otherRevenue,
      final_invoiced_revenue: budget.finalInvoicedRevenue,
      amount_paid: 0,
      notes: budget.notes
    };
    return insertBudget(payload);
  }

  function budgetJobStatusFromTicket(ticket = {}) {
    const stage = ticketStage(ticket);
    if (["scheduled"].includes(stage)) return "Scheduled";
    if (["in_progress", "paused", "scope_change_requested"].includes(stage)) return "In Progress";
    if (["field_work_complete", "completion_review", "invoice_review", "invoice_sent", "partially_paid", "paid", "closed"].includes(stage)) return "Completed";
    return "Not Scheduled";
  }

  function findBudgetForTicket(ticket = {}, bundle = activeBudgetBundle()) {
    if (!ticket) return null;
    const sourceType = ticket.sourceType || ticket.source;
    const sourceId = String(ticket.sourceId || (sourceType !== "ticket" ? ticket.id : "") || "");
    const sourcePairs = [
      ["jobId", sourceType === "job" ? sourceId : ""],
      ["quoteId", sourceType === "quote" ? sourceId : ""],
      ["invoiceId", sourceType === "document" ? sourceId : ""]
    ].filter(([, value]) => value);
    return (bundle.budgets || []).find((budget) => {
      return sourcePairs.some(([key, value]) => String(budget[key] || "") === String(value));
    }) || null;
  }

  function budgetPayloadFromTicket(ticket = {}) {
    const sourceType = ticket.sourceType || ticket.source;
    const sourceId = ticket.sourceId || (sourceType !== "ticket" ? ticket.id : "");
    const title = ticket.title || ticket.requestedService || ticket.serviceType || "Job Budget";
    const proposedPrice = budgetNumberOrNull(ticket.proposedPrice || ticket.expectedRevenue);
    return {
      budget_name: `${title} Budget`.trim(),
      job_id: sourceType === "job" ? sourceId : null,
      quote_id: sourceType === "quote" ? sourceId : null,
      invoice_id: sourceType === "document" ? sourceId : null,
      client_id: uuidOrNull(ticket.customerId),
      property_id: uuidOrNull(ticket.propertyId),
      client_name: ticket.customer || ticket.primaryContact || "",
      property_name: ticket.property || ticket.city || "",
      job_name: title,
      service_type: ticket.requestedService || title,
      job_description: ticket.scopeOfWork || ticket.detail || "",
      proposed_start_date: ticket.dateRaw && ticket.dateLabel !== "No date" ? ticket.dateRaw : null,
      status: "Draft",
      job_status: budgetJobStatusFromTicket(ticket),
      target_margin_percent: activeBudgetBundle().settings.default_target_margin || BUDGET_DEFAULT_SETTINGS.default_target_margin,
      base_quoted_price: proposedPrice || 0,
      notes: [
        `Created from ${ticket.number || "Job Ticket"}.`,
        ticket.internalNotes || ticket.detail || ""
      ].filter(Boolean).join("\n\n")
    };
  }

  async function ensureBudgetForTicket(ticket = {}) {
    if (!canManageMoneyWorkflow()) throw new Error("Your dashboard role cannot prepare job budgets.");
    const existing = findBudgetForTicket(ticket);
    if (existing) return { budget: existing, created: false };
    if (!state.budgetsReady && !isDemoMode()) {
      throw new Error(state.budgetsError || "Budget records are not connected yet. Money can still hold this ticket in cost review.");
    }
    const budget = await insertBudget(budgetPayloadFromTicket(ticket));
    if (ticket.source === "ticket" && ticket.id) {
      await insertJobTicketEvent(ticket.id, {
        event_type: "budget_prepared",
        title: "Budget prepared",
        notes: "Money created a draft budget for this ticket."
      });
    }
    return { budget, created: true };
  }

  async function syncBudgetToTicket(budget = {}) {
    if (!canManageMoneyWorkflow()) throw new Error("Your dashboard role cannot complete cost review.");
    const ticket = findTicketForBudget(budget);
    if (!ticket || ticket.source !== "ticket") throw new Error("Create or open the unified ticket before syncing budget review.");
    const summary = budgetSummary(budget);
    const expectedRevenue = Number(summary.expectedRevenue || budget.expectedRevenue || budget.baseQuotedPrice || 0);
    const estimatedCost = Number(summary.totalEstimatedCost || 0);
    const estimatedProfit = Number(summary.estimatedProfit || (expectedRevenue - estimatedCost));
    await updateJobTicket(ticket.id, {
      expected_revenue: expectedRevenue,
      estimated_total_cost: estimatedCost,
      estimated_profit: estimatedProfit,
      target_margin: budget.targetMarginPercent || activeBudgetBundle().settings.default_target_margin,
      cost_review_complete: true,
      budget_complete: true,
      next_action: "Owner approval"
    });
    await insertJobTicketEvent(ticket.id, {
      event_type: "budget_synced",
      title: "Budget synced to ticket",
      notes: `Expected revenue ${budgetCurrency(expectedRevenue)}, estimated cost ${budgetCurrency(estimatedCost)}, estimated profit ${budgetCurrency(estimatedProfit)}.`
    });
    if (["needs_budget", "budget_in_progress"].includes(ticketStage(ticket))) {
      return transitionJobTicketStage(ticket.id, "needs_owner_approval", {
        notes: "Cost review completed from the Money budget.",
        nextAction: ticketNextAction("needs_owner_approval")
      });
    }
    return ticket;
  }

  function findInvoiceForTicket(ticket = {}) {
    if (!ticket) return null;
    const explicitId = ticket.invoiceId || (ticket.sourceType === "document" ? ticket.sourceId : "");
    if (explicitId) {
      const invoice = state.data.documents.find((item) => item.id === explicitId && item.type === "invoice");
      if (invoice) return invoice;
    }
    const budget = findBudgetForTicket(ticket);
    if (budget?.invoiceId) {
      return state.data.documents.find((item) => item.id === budget.invoiceId && item.type === "invoice") || null;
    }
    return null;
  }

  function ticketInvoiceAmount(ticket = {}) {
    const budget = findBudgetForTicket(ticket);
    if (budget) {
      const summary = budgetSummary(budget);
      const budgetAmount = budget.finalInvoicedRevenue || summary.expectedRevenue || budget.expectedRevenue || budget.baseQuotedPrice;
      if (Number(budgetAmount || 0) > 0) return Number(budgetAmount);
    }
    return Number(ticket.expectedRevenue || ticket.proposedPrice || 0);
  }

  function ticketInvoiceDescription(ticket = {}) {
    return ticket.scopeOfWork || ticket.requestedService || ticket.title || "Urban Yards property care";
  }

  async function ensureInvoiceForTicket(ticket = {}) {
    if (!canManageMoneyWorkflow()) throw new Error("Your dashboard role cannot prepare invoices.");
    const existing = findInvoiceForTicket(ticket);
    if (existing) return { document: existing, created: false };
    if (!state.documentsReady && !isDemoMode()) {
      throw new Error("Sales documents are not connected yet. Run the dashboard SQL before creating invoices.");
    }
    const document = await insertSalesDocument({
      document_type: "invoice",
      client_name: ticket.customer || ticket.primaryContact || "Urban Yards client",
      client_email: "",
      description: ticketInvoiceDescription(ticket),
      amount: ticketInvoiceAmount(ticket),
      due_date: addDaysKey(todayKey(), 14),
      notes: `Prepared from ${ticket.number || "Job Ticket"}.\n\n${ticket.detail || ""}`
    });
    if (ticket.source === "ticket" && ticket.id) {
      await updateJobTicket(ticket.id, {
        invoice_id: document.id,
        draft_invoice_exists: true,
        owner_label: "Money",
        next_action: ticketNextAction(ticketStage(ticket) === "invoice_preparation" ? "invoice_preparation" : "invoice_review")
      });
      await insertJobTicketEvent(ticket.id, {
        event_type: "invoice_prepared",
        title: "Invoice prepared",
        notes: `Money created invoice ${document.number || document.id} from this ticket.`
      });
    }
    return { document, created: true };
  }

  function ticketInvoicePaymentStatus(ticket = {}, invoice = null) {
    const raw = statusText(ticket.paymentStatus || invoice?.status || invoice?.squareStatus || "");
    if (/paid/.test(raw) && !/partial/.test(raw)) return "paid";
    if (/partial/.test(raw)) return "partially_paid";
    if (/sent|open|unpaid|outstanding/.test(raw)) return "sent";
    return "";
  }

  function ticketInvoicePaymentOptions(selected = "") {
    return [
      ["", "Not recorded"],
      ["sent", "Invoice sent"],
      ["partially_paid", "Partially paid"],
      ["paid", "Paid"]
    ].map(([value, label]) => `<option value="${escapeHtml(value)}"${value === selected ? " selected" : ""}>${escapeHtml(label)}</option>`).join("");
  }

  function ticketInvoiceNextAction(paymentStatus, invoiceFinalized) {
    if (paymentStatus === "paid" && invoiceFinalized) return "Close ticket";
    if (paymentStatus === "paid") return "Finalize invoice";
    if (paymentStatus === "partially_paid") return "Collect remaining payment";
    if (paymentStatus === "sent") return "Collect payment";
    return "Finalize invoice";
  }

  async function saveTicketInvoiceStatus(form) {
    if (!canManageMoneyWorkflow()) throw new Error("Your dashboard role cannot update invoice status.");
    const ticketId = form.dataset.ticketId || "";
    const ticket = dashboardTickets().find((item) => item.source === "ticket" && item.id === ticketId);
    if (!ticket) throw new Error("Open a unified Job Ticket before saving invoice status.");
    const formData = new FormData(form);
    const invoiceId = String(formData.get("invoice_id") || ticket.invoiceId || "").trim();
    const paymentStatus = String(formData.get("payment_status") || "").trim();
    const invoiceFinalized = formData.get("invoice_finalized") === "on";
    const invoice = invoiceId ? state.data.documents.find((item) => item.id === invoiceId && item.type === "invoice") : null;
    if (invoice) {
      const documentStatus = paymentStatus === "paid" ? "paid" : paymentStatus ? "sent" : invoice.status || "draft";
      await updateSalesDocument(invoice.id, {
        document_type: "invoice",
        client_name: invoice.clientName,
        client_email: invoice.clientEmail,
        square_invoice_number: invoice.squareInvoiceNumber,
        description: invoice.lineItems?.[0]?.description || ticketInvoiceDescription(ticket),
        amount: invoice.total || ticketInvoiceAmount(ticket),
        due_date: invoice.dueDateRaw,
        status: documentStatus,
        notes: invoice.notes || ""
      });
    }
    await updateJobTicket(ticket.id, {
      invoice_id: invoiceId || null,
      draft_invoice_exists: Boolean(invoiceId),
      invoice_finalized: invoiceFinalized,
      payment_status: paymentStatus,
      owner_label: "Money",
      next_action: ticketInvoiceNextAction(paymentStatus, invoiceFinalized)
    });
    await insertJobTicketEvent(ticket.id, {
      event_type: "invoice_status_saved",
      title: "Invoice status saved",
      notes: `Invoice ${invoiceId ? "linked" : "not linked"} / ${paymentStatus || "payment not recorded"} / ${invoiceFinalized ? "finalized" : "not finalized"}.`
    });
    return { ticketId: ticket.id, invoiceId };
  }

  async function saveBudgetSettingsFromForm(form) {
    const data = new FormData(form);
    const uiPayload = {
      default_target_margin: Number(data.get("default_target_margin") || BUDGET_DEFAULT_SETTINGS.default_target_margin),
      warning_margin: Number(data.get("warning_margin") || BUDGET_DEFAULT_SETTINGS.warning_margin),
      minimum_margin: Number(data.get("minimum_margin") || BUDGET_DEFAULT_SETTINGS.minimum_margin),
      default_contingency_percent: Number(data.get("default_contingency_percent") || BUDGET_DEFAULT_SETTINGS.default_contingency_percent),
      default_labor_burden_percent: Number(data.get("default_labor_burden_percent") || BUDGET_DEFAULT_SETTINGS.default_labor_burden_percent),
      payment_processing_percent: Number(data.get("payment_processing_percent") || BUDGET_DEFAULT_SETTINGS.payment_processing_percent),
      owner_hourly_rate: Number(data.get("owner_hourly_rate") || BUDGET_DEFAULT_SETTINGS.owner_hourly_rate)
    };
    if (isDemoMode()) {
      state.data.budgets.settings = normalizeBudgetSettings(uiPayload);
      return state.data.budgets.settings;
    }
    const payload = {
      default_target_margin_percent: uiPayload.default_target_margin,
      warning_margin_percent: uiPayload.warning_margin,
      minimum_margin_percent: uiPayload.minimum_margin,
      default_contingency_percent: uiPayload.default_contingency_percent,
      default_labor_burden_percent: uiPayload.default_labor_burden_percent,
      default_payment_processing_percent: uiPayload.payment_processing_percent,
      default_owner_hourly_rate: uiPayload.owner_hourly_rate
    };
    const existingId = state.data.budgets.settings?.id;
    const path = existingId ? `budget_settings?id=eq.${encodeURIComponent(existingId)}` : "budget_settings";
    const method = existingId ? "PATCH" : "POST";
    const rows = await supabaseRestRequest(path, {
      method,
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload)
    });
    return normalizeBudgetSettings(rows?.[0] || payload);
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
      if (index >= 0) {
        state.data.jobs[index] = normalizeJob({ id, ...payload });
        return state.data.jobs[index];
      }
      return null;
    }

    const rows = await supabaseRestRequest(`scheduled_jobs?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload)
    });
    return rows?.[0] ? normalizeJob(rows[0]) : normalizeJob({ id, ...payload });
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

  function canManageDocumentationTemplates() {
    return ["owner", "admin"].includes(currentSessionRole());
  }

  function canReviewDocumentation() {
    return ["owner", "admin", "manager"].includes(currentSessionRole());
  }

  function documentationFileExtension(fileName = "") {
    const match = String(fileName || "").toLowerCase().match(/\.([a-z0-9]+)$/);
    return match ? match[1] : "";
  }

  function validateDocumentationFile(file, { optional = true } = {}) {
    if (!file) {
      if (optional) return;
      throw new Error("Choose a documentation file first.");
    }
    if (file.size > DOCUMENTATION_MAX_FILE_BYTES) throw new Error("Documentation files must be 15 MB or smaller.");
    const extension = documentationFileExtension(file.name);
    if (!DOCUMENTATION_ALLOWED_EXTENSIONS.has(extension)) {
      throw new Error("Documentation files must be PDF, DOCX, JPG, PNG, WebP, XLSX, or CSV.");
    }
    if (file.type && !DOCUMENTATION_ALLOWED_MIME_TYPES.has(file.type)) {
      throw new Error("That documentation file type is not allowed.");
    }
  }

  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        resolve(result.includes(",") ? result.split(",").pop() : result);
      };
      reader.onerror = () => reject(new Error("Unable to read the selected file."));
      reader.readAsDataURL(file);
    });
  }

  async function documentationStorageRequest(payload) {
    if (isDemoMode()) {
      return {
        bucket: payload.bucket || (payload.kind === "template" ? "documentation-templates" : "documentation-submissions"),
        path: `demo/${payload.kind || "documentation"}/${Date.now()}-${slug(payload.fileName || "file")}`,
        fileName: payload.fileName || "demo-file.pdf",
        mimeType: payload.mimeType || "application/pdf",
        size: payload.size || 0,
        signedUrl: ""
      };
    }
    const session = getSession();
    if (!session || !session.accessToken) throw new Error("Please sign in again.");
    const response = await fetch("/.netlify/functions/dashboard-documentation-storage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Documentation storage request failed.");
    return data;
  }

  async function uploadDocumentationFile(file, { kind, templateId = "", assignmentId = "" } = {}) {
    validateDocumentationFile(file, { optional: false });
    const contentBase64 = await readFileAsBase64(file);
    return documentationStorageRequest({
      action: "upload",
      kind,
      templateId,
      assignmentId,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      contentBase64
    });
  }

  async function openDocumentationSignedFile({ bucket, path, label = "documentation file" } = {}) {
    if (!bucket || !path) throw new Error(`No stored ${label} is attached yet.`);
    const result = await documentationStorageRequest({ action: "signed-url", bucket, path });
    if (!result.signedUrl) throw new Error("Unable to create a secure file link.");
    window.open(result.signedUrl, "_blank", "noopener,noreferrer");
    return result;
  }

  function chooseDocumentationFile() {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".pdf,.docx,.jpg,.jpeg,.png,.webp,.xlsx,.csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv";
      input.addEventListener("change", () => resolve(input.files?.[0] || null), { once: true });
      input.click();
    });
  }

  function documentationTemplatePayloadFromForm(form) {
    const data = new FormData(form);
    const file = form.querySelector("input[type='file']")?.files?.[0] || null;
    validateDocumentationFile(file);
    return {
      name: String(data.get("name") || "").trim(),
      category: String(data.get("category") || "Custom Forms"),
      instructions: String(data.get("instructions") || "").trim(),
      allowed_roles: String(data.get("allowed_roles") || "owner,admin,manager,staff,worker").split(",").map((item) => item.trim()).filter(Boolean),
      requires_signature: data.get("requires_signature") === "on",
      requires_photos: data.get("requires_photos") === "on",
      is_recurring: data.get("is_recurring") === "on",
      recurrence_rule: String(data.get("recurrence_rule") || "").trim(),
      required_by_default: data.get("required_by_default") === "on",
      status: "Active",
      current_version: Number(data.get("current_version") || 1) || 1,
      file_name: file?.name || String(data.get("file_name") || "").trim(),
      updated_at: new Date().toISOString()
    };
  }

  function documentationAssignmentPayloadFromForm(form) {
    const data = new FormData(form);
    const templateId = String(data.get("template_id") || "").trim();
    const template = state.data.documentation.templates.find((item) => item.id === templateId);
    return {
      template_id: templateId || null,
      template_name: template?.name || String(data.get("template_name") || "").trim(),
      category: template?.category || String(data.get("category") || "Custom Forms"),
      assigned_to_name: String(data.get("assigned_to_name") || "").trim(),
      assigned_to_email: String(data.get("assigned_to_email") || "").trim(),
      property_name: String(data.get("property_name") || "").trim(),
      job_name: String(data.get("job_name") || "").trim(),
      equipment_name: String(data.get("equipment_name") || "").trim(),
      due_date: String(data.get("due_date") || "") || null,
      priority: String(data.get("priority") || "Normal"),
      status: "Not Started",
      required: data.get("required") !== "off",
      recurring: Boolean(template?.isRecurring),
      instructions: String(data.get("instructions") || template?.instructions || "").trim(),
      created_at: new Date().toISOString()
    };
  }

  async function insertDocumentationTemplate(payload) {
    if (!canManageDocumentationTemplates()) throw new Error("Only Owner and Admin users can manage master templates.");
    if (!payload.name) throw new Error("Template name is required.");
    if (!state.documentationReady) throw new Error("Documentation is not available right now. Refresh the dashboard, then check Supabase/RLS if it stays down.");
    if (isDemoMode()) {
      const template = normalizeDocumentationTemplate({ id: nextDemoId("documentation-template"), ...payload });
      state.data.documentation.templates.unshift(template);
      state.data.documentation.audit.unshift(normalizeDocumentationAudit({
        id: nextDemoId("documentation-audit"),
        action: "template_uploaded",
        template_name: template.name,
        actor_name: getSession()?.email || "Demo User",
        detail: `${template.versionLabel} saved in demo mode.`,
        created_at: new Date().toISOString()
      }));
      return template;
    }
    const rows = await supabaseRestRequest("documentation_templates", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload)
    });
    return normalizeDocumentationTemplate(rows[0]);
  }

  async function insertDocumentationTemplateFromForm(form) {
    const payload = documentationTemplatePayloadFromForm(form);
    const file = form.querySelector("input[type='file']")?.files?.[0] || null;
    if (file && !isDemoMode()) {
      const upload = await uploadDocumentationFile(file, { kind: "template" });
      payload.file_bucket = upload.bucket;
      payload.file_path = upload.path;
      payload.file_name = upload.fileName || file.name;
      payload.mime_type = upload.mimeType || file.type || "";
      payload.file_size_bytes = upload.size || file.size || null;
    }
    return insertDocumentationTemplate(payload);
  }

  async function insertDocumentationAssignment(payload) {
    if (!payload.template_name && !payload.template_id) throw new Error("Choose a template or enter a form name.");
    if (!state.documentationReady) throw new Error("Documentation is not available right now. Refresh the dashboard, then check Supabase/RLS if it stays down.");
    if (isDemoMode()) {
      const assignment = normalizeDocumentationAssignment({ id: nextDemoId("documentation-assignment"), ...payload });
      state.data.documentation.assignments.unshift(assignment);
      state.data.documentation.audit.unshift(normalizeDocumentationAudit({
        id: nextDemoId("documentation-audit"),
        action: "form_assigned",
        template_name: assignment.templateName,
        actor_name: getSession()?.email || "Demo User",
        detail: `Assigned to ${assignment.assignedTo}.`,
        created_at: new Date().toISOString()
      }));
      return assignment;
    }
    const rows = await supabaseRestRequest("documentation_assignments", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload)
    });
    return normalizeDocumentationAssignment(rows[0]);
  }

  async function updateDocumentationSubmission(id, payload) {
    if (!state.documentationReady) throw new Error("Documentation is not available right now. Refresh the dashboard, then check Supabase/RLS if it stays down.");
    if (isDemoMode()) {
      const index = state.data.documentation.submissions.findIndex((item) => item.id === id);
      if (index >= 0) {
        state.data.documentation.submissions[index] = normalizeDocumentationSubmission({
          ...state.data.documentation.submissions[index],
          ...payload,
          reviewed_at: new Date().toISOString()
        });
      }
      return state.data.documentation.submissions[index] || null;
    }
    const rows = await supabaseRestRequest(`documentation_submissions?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ ...payload, reviewed_at: new Date().toISOString() })
    });
    return rows?.[0] ? normalizeDocumentationSubmission(rows[0]) : null;
  }

  async function uploadDocumentationSubmission(assignmentId) {
    if (!state.documentationReady) throw new Error("Documentation is not available right now. Refresh the dashboard, then check Supabase/RLS if it stays down.");
    const assignment = state.data.documentation.assignments.find((item) => item.id === assignmentId);
    if (!assignment) throw new Error("Assigned form was not found.");
    const file = await chooseDocumentationFile();
    if (!file) return null;
    const upload = await uploadDocumentationFile(file, { kind: "submission", assignmentId });
    const session = getSession() || {};
    const payload = {
      assignment_id: assignment.id,
      template_id: assignment.templateId || null,
      template_name: assignment.templateName,
      template_version: assignment.templateVersion || 1,
      category: assignment.category,
      completed_by_name: session.email || assignment.assignedTo || "Dashboard user",
      completed_by_email: session.email || assignment.assignedToEmail || "",
      property_name: assignment.propertyName || "",
      contact_name: assignment.contactName || "",
      job_name: assignment.jobName || "",
      equipment_name: assignment.equipmentName || "",
      status: "Submitted",
      file_bucket: upload.bucket,
      file_path: upload.path,
      file_name: upload.fileName || file.name,
      mime_type: upload.mimeType || file.type || "",
      file_size_bytes: upload.size || file.size || null,
      submitted_at: new Date().toISOString(),
      notes: assignment.instructions || "",
      signature_required: false,
      photos_required: false
    };
    if (isDemoMode()) {
      const submission = normalizeDocumentationSubmission({ id: nextDemoId("documentation-submission"), ...payload });
      state.data.documentation.submissions.unshift(submission);
      const assignmentIndex = state.data.documentation.assignments.findIndex((item) => item.id === assignment.id);
      if (assignmentIndex >= 0) {
        state.data.documentation.assignments[assignmentIndex] = normalizeDocumentationAssignment({
          ...state.data.documentation.assignments[assignmentIndex],
          status: "Submitted",
          submitted_at: payload.submitted_at,
          completed_submission_id: submission.id
        });
      }
      state.data.documentation.audit.unshift(normalizeDocumentationAudit({
        id: nextDemoId("documentation-audit"),
        action: "form_submitted",
        template_name: assignment.templateName,
        actor_name: payload.completed_by_name,
        detail: `${payload.file_name} uploaded in demo mode.`,
        created_at: new Date().toISOString()
      }));
      return submission;
    }
    const rows = await supabaseRestRequest("documentation_submissions", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload)
    });
    const submission = rows?.[0] ? normalizeDocumentationSubmission(rows[0]) : null;
    if (submission) {
      await supabaseRestRequest(`documentation_assignments?id=eq.${encodeURIComponent(assignment.id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          status: "Submitted",
          submitted_at: payload.submitted_at,
          completed_submission_id: submission.id
        })
      });
    }
    return submission;
  }

  function jobDocumentationTemplates() {
    return (state.data.documentation.templates || [])
      .filter((item) => item.status !== "Archived" && item.status !== "Inactive")
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  function documentationAssignmentsForJob(job = {}) {
    return (state.data.documentation.assignments || []).filter((item) => (
      item.targetId === job.id
      || item.metadata?.scheduledJobId === job.id
      || (item.targetType === "scheduled_visit" && item.jobName === job.site)
    ));
  }

  function documentationAttachmentsForJob(job = {}, photoStage = "") {
    return (state.data.documentation.attachments || []).filter((item) => {
      const metadata = item.metadata || {};
      const matchesJob = item.targetId === job.id || metadata.scheduledJobId === job.id || metadata.targetId === job.id;
      const matchesStage = !photoStage || metadata.photoStage === photoStage;
      return matchesJob && matchesStage;
    });
  }

  function validateJobSitePhoto(file) {
    validateDocumentationFile(file, { optional: false });
    const extension = documentationFileExtension(file.name);
    const isImageExtension = ["jpg", "jpeg", "png", "webp"].includes(extension);
    const isImageMime = !file.type || file.type.startsWith("image/");
    if (!isImageExtension || !isImageMime) {
      throw new Error("Job site photos must be JPG, PNG, or WebP images.");
    }
  }

  function validateJobSitePhotos(files = []) {
    const photoFiles = Array.from(files || []);
    if (!photoFiles.length) throw new Error("Choose at least one job site photo first.");
    if (photoFiles.length > JOB_SITE_PHOTO_MAX_FILES) {
      throw new Error(`Upload ${JOB_SITE_PHOTO_MAX_FILES} photos or fewer at a time.`);
    }
    photoFiles.forEach(validateJobSitePhoto);
    return photoFiles;
  }

  async function insertDocumentationAttachment(payload) {
    if (!state.documentationReady) throw new Error("Documentation is not available right now. Refresh the dashboard, then check Supabase/RLS if it stays down.");
    if (isDemoMode()) {
      const attachment = normalizeDocumentationAttachment({
        id: nextDemoId("documentation-attachment"),
        ...payload,
        created_at: new Date().toISOString()
      });
      state.data.documentation.attachments.unshift(attachment);
      state.data.documentation.audit.unshift(normalizeDocumentationAudit({
        id: nextDemoId("documentation-audit"),
        action: "attachment_uploaded",
        entity_type: "documentation_attachment",
        entity_id: attachment.id,
        actor_name: payload.uploaded_by_email || "Demo User",
        detail: `${attachment.fileName || "Photo"} uploaded in demo mode.`,
        created_at: new Date().toISOString()
      }));
      return attachment;
    }
    const rows = await supabaseRestRequest("documentation_attachments", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload)
    });
    return rows?.[0] ? normalizeDocumentationAttachment(rows[0]) : null;
  }

  async function assignDocumentationTemplateToJob(jobId, templateId) {
    const job = state.data.jobs.find((item) => item.id === jobId);
    const template = state.data.documentation.templates.find((item) => item.id === templateId);
    if (!job) throw new Error("Scheduled visit was not found.");
    if (!template) throw new Error("Choose a documentation template first.");
    const session = getSession() || {};
    return insertDocumentationAssignment({
      template_id: template.id,
      template_name: template.name,
      template_version: template.currentVersion || 1,
      category: template.category,
      assigned_to_name: session.email || "Dashboard user",
      assigned_to_email: session.email || "",
      assigned_by_email: session.email || "",
      target_type: "scheduled_visit",
      target_id: job.id,
      property_name: job.city === "Not provided" ? "" : job.city,
      job_name: job.site,
      scheduled_visit_name: job.service,
      due_date: job.dateRaw || null,
      priority: "Normal",
      status: "Not Started",
      required: true,
      recurring: false,
      instructions: template.instructions || "",
      metadata: {
        scheduledJobId: job.id,
        targetType: "scheduled_visit",
        targetId: job.id,
        jobName: job.site,
        scheduledVisitName: job.service,
        visitDate: job.dateRaw,
        visitWindow: job.window,
        category: template.category
      }
    });
  }

  async function uploadJobSitePhoto(jobId, file, photoStage) {
    const job = state.data.jobs.find((item) => item.id === jobId);
    if (!job) throw new Error("Scheduled visit was not found.");
    validateJobSitePhoto(file);
    const upload = await uploadDocumentationFile(file, { kind: "submission", assignmentId: job.id });
    const session = getSession() || {};
    return insertDocumentationAttachment({
      attachment_type: "supporting_photo",
      file_bucket: upload.bucket,
      file_path: upload.path,
      file_name: upload.fileName || file.name,
      mime_type: upload.mimeType || file.type || "",
      file_size_bytes: upload.size || file.size || null,
      uploaded_by: session.userId || null,
      uploaded_by_email: session.email || "",
      metadata: {
        scheduledJobId: job.id,
        targetType: "scheduled_visit",
        targetId: job.id,
        photoStage,
        status: "Submitted",
        category: "Job Completion",
        jobName: job.site,
        scheduledVisitName: job.service,
        propertyName: job.city === "Not provided" ? "" : job.city,
        visitDate: job.dateRaw,
        visitWindow: job.window
      }
    });
  }

  async function uploadJobSitePhotos(jobId, files, photoStage) {
    const photoFiles = validateJobSitePhotos(files);
    const uploads = [];
    for (const file of photoFiles) {
      uploads.push(await uploadJobSitePhoto(jobId, file, photoStage));
    }
    return uploads;
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
    if (!state.leadActivityReady) throw new Error("Call logging is unavailable right now. Refresh the dashboard or check Supabase access.");
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
    if (!state.leadActivityReady) throw new Error("Call logging is unavailable right now. Refresh the dashboard or check Supabase access.");
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
      if (!isDemoMode()) {
        const ticket = await insertJobTicket({
          title: payload.title || "Task",
          description: payload.description,
          notes: payload.notes,
          due_date: payload.due_date,
          requested_service: payload.record_type || "task",
          stage: String(payload.status || "") === "Done" ? "closed" : "sales_intake",
          owner_label: payload.record_type === "equipment" ? "Tools" : "Tickets",
          next_action: payload.title || "Review task",
          source_type: "ticket"
        });
        if (!ticket) {
          throw new Error("Job Tickets are not installed yet. Run supabase/migrations/20260714_job_ticket_foundation.sql.");
        }
        return normalizeOperation({
          id: ticket.id,
          record_type: payload.record_type || "task",
          title: ticket.title || payload.title || "Task",
          description: ticket.description || payload.description || null,
          due_date: payload.due_date || null,
          status: payload.status || "Open",
          priority: payload.priority || "Normal",
          notes: payload.notes || "",
          created_at: new Date().toISOString()
        });
      }
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

  function outreachPropertyPayloadFromForm(form, company = {}) {
    const formData = new FormData(form);
    const propertyName = String(formData.get("property_name") || "").trim();
    const address = String(formData.get("address") || "").trim();
    const city = String(formData.get("city") || "").trim();
    if (!propertyName && !address) throw new Error("Add a property name or address.");
    return {
      company_id: company.id || null,
      company: company.company || String(formData.get("company") || "").trim() || null,
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

  async function insertQuoteSubmission(payload) {
    const safePayload = {
      name: payload.name,
      email: payload.email || null,
      phone: payload.phone || null,
      property_type: payload.property_type || null,
      city: payload.city || null,
      service: payload.service || null,
      source: payload.source || "Dashboard Ticket",
      status: STATUSES.includes(payload.status) ? payload.status : "New",
      notes: payload.notes || ""
    };
    if (isDemoMode()) {
      const quote = normalizeSubmission({
        id: nextDemoId("quote"),
        ...safePayload,
        created_at: new Date().toISOString()
      });
      state.data.submissions.unshift(quote);
      return quote;
    }
    const rows = await supabaseRestRequest("quote_submissions", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(safePayload)
    });
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
      return item || null;
    }

    const rows = await supabaseRestRequest(`quote_submissions?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload)
    });
    const updated = normalizeSubmission(rows[0]);
    const index = state.data.submissions.findIndex((submission) => submission.id === id);
    if (index >= 0) state.data.submissions[index] = updated;
    else state.data.submissions.unshift(updated);
    return updated;
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
    if (!session || !session.accessToken) {
      clearSession();
      return;
    }
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
    if (!isSupabaseConfigured()) {
      setLoginStatus("Dashboard configuration is missing. Verify Netlify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then redeploy.", "error");
    }
  }

  async function showApp() {
    document.body.classList.remove("is-login-screen");
    els.loginView.hidden = true;
    els.appView.hidden = false;
    if (els.demoBadge) els.demoBadge.hidden = !isDemoMode();
    renderSidebarUserProfile();
    const profile = await loadCurrentUserProfile(getSession()).catch(() => null);
    if (profile) renderSidebarUserProfile(profile);
    syncDashboardNavAccess();
    syncDashboardSubviewVisibility();
    await refreshDashboard();
  }

  function normalizeDashboardSection(section) {
    const key = String(section || DEFAULT_DASHBOARD_SECTION).replace(/^#/, "").trim() || DEFAULT_DASHBOARD_SECTION;
    const mapped = sectionAliases[key] || key;
    return rebuildPrimarySections.has(mapped) ? mapped : DEFAULT_DASHBOARD_SECTION;
  }

  function canAccessDashboardSection(section, role = currentSessionRole()) {
    const normalizedSection = normalizeDashboardSection(section);
    const normalizedRole = normalizeDashboardRole(role);
    const allowedRoles = DASHBOARD_WORKSPACE_ACCESS[normalizedSection] || [];
    return allowedRoles.includes(normalizedRole);
  }

  function dashboardDefaultSectionForRole(role = currentSessionRole()) {
    const normalizedRole = normalizeDashboardRole(role);
    const preferredSection = DASHBOARD_ROLE_DEFAULT_SECTIONS[normalizedRole] || DEFAULT_DASHBOARD_SECTION;
    if (canAccessDashboardSection(preferredSection, normalizedRole)) return preferredSection;
    return [...rebuildPrimarySections].find((section) => canAccessDashboardSection(section, normalizedRole)) || "overview";
  }

  function dashboardSectionForRole(section, role = currentSessionRole()) {
    const requestedSection = normalizeDashboardSection(section);
    return canAccessDashboardSection(requestedSection, role) ? requestedSection : dashboardDefaultSectionForRole(role);
  }

  function isPrimaryDashboardNavLink(node) {
    return Boolean(node && (node.closest(".dashboard-nav") || node.closest(".mobile-tabbar")));
  }

  function syncDashboardNavAccess(role = currentSessionRole()) {
    qsa("[data-dashboard-link]").forEach((node) => {
      if (!isPrimaryDashboardNavLink(node)) return;
      const section = normalizeDashboardSection(node.dataset.dashboardLink);
      const allowed = canAccessDashboardSection(section, role);
      node.hidden = !allowed;
      node.classList.toggle("is-role-hidden", !allowed);
      if (allowed) {
        node.removeAttribute("aria-hidden");
        node.removeAttribute("tabindex");
      } else {
        node.setAttribute("aria-hidden", "true");
        node.setAttribute("tabindex", "-1");
      }
    });
  }

  function replaceDashboardHash(section) {
    history.replaceState(null, "", `#${dashboardSectionForRole(section)}`);
  }

  function setActiveSection(section) {
    const requestedSection = dashboardSectionForRole(section);
    const hasSection = Boolean(qs(`[data-section="${cssEscape(requestedSection)}"]`));
    state.activeSection = hasSection ? requestedSection : dashboardDefaultSectionForRole();
    syncDashboardNavAccess();
    qsa("[data-section]").forEach((node) => {
      node.classList.toggle("is-active", node.dataset.section === state.activeSection);
    });
    qsa("[data-dashboard-link]").forEach((node) => {
      const isActive = normalizeDashboardSection(node.dataset.dashboardLink) === state.activeSection;
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

  function dashboardSectionFromPath(pathname = window.location.pathname) {
    const path = String(pathname || "").replace(/\/+$/, "");
    return "";
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
          replaceDashboardHash("route-planner");
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
        action: "go-work",
        link: "View all jobs"
      },
      {
        label: "Active Properties",
        value: activeProperties,
        detail: "Clients and managed properties",
        icon: "properties-building.svg",
        action: "go-leads",
        link: "Review leads"
      },
      {
        label: "Waiting on Payment",
        value: unpaidInvoices.length,
        detail: unpaidInvoices[0] ? `${unpaidInvoices[0].clientName || "Client"} / ${unpaidInvoices[0].number || "Invoice"}` : "No open unpaid invoices",
        icon: "waiting-payment.svg",
        action: "go-money",
        link: "Open invoices"
      },
      {
        label: "Equipment Alerts",
        value: equipmentAlerts,
        detail: equipmentAlerts ? "Review mower, tools, or supply checks" : "No equipment reminders",
        icon: "equipment-alert.svg",
        action: "go-tools",
        link: "Open Tools"
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
            <button type="button" data-action="${escapeHtml(metric.action)}">${escapeHtml(metric.link)}</button>
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
      <button class="overview-task-link" type="button" data-action="quick-add-operation">View all tasks</button>
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
        action: "go-leads",
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
        action: "go-tools",
        actionLabel: "Open Tools",
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
        action: "go-work",
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
        action: "go-money",
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
        action: "go-leads",
        actionLabel: "Open Leads",
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

  const ticketStageMeta = {
    draft: { label: "Draft", lane: "sales", tone: "muted", owner: "Leads" },
    sales_intake: { label: "Lead Intake", lane: "sales", tone: "new", owner: "Leads" },
    scope_in_progress: { label: "Scope", lane: "sales", tone: "watch", owner: "Leads" },
    quote_pending: { label: "Quote Pending", lane: "sales", tone: "watch", owner: "Leads" },
    customer_approval_pending: { label: "Customer Approval", lane: "sales", tone: "watch", owner: "Leads" },
    needs_budget: { label: "Needs Cost Review", lane: "accounting", tone: "risk", owner: "Money" },
    budget_in_progress: { label: "Cost Review In Progress", lane: "accounting", tone: "watch", owner: "Money" },
    needs_owner_approval: { label: "Owner Approval", lane: "accounting", tone: "risk", owner: "Owner" },
    invoice_preparation: { label: "Draft Invoice", lane: "accounting", tone: "watch", owner: "Money" },
    ready_to_schedule: { label: "Ready to Schedule", lane: "ready", tone: "good", owner: "Work" },
    scheduled: { label: "Scheduled", lane: "field", tone: "good", owner: "Work" },
    in_progress: { label: "In Progress", lane: "field", tone: "active", owner: "Work" },
    paused: { label: "Paused", lane: "field", tone: "watch", owner: "Work" },
    scope_change_requested: { label: "Scope Change", lane: "sales", tone: "watch", owner: "Leads" },
    field_work_complete: { label: "Work Complete", lane: "review", tone: "good", owner: "Owner Review" },
    completion_review: { label: "Completion Review", lane: "review", tone: "watch", owner: "Owner Review" },
    invoice_review: { label: "Invoice Review", lane: "money", tone: "watch", owner: "Money" },
    invoice_sent: { label: "Invoice Sent", lane: "money", tone: "watch", owner: "Money" },
    partially_paid: { label: "Partially Paid", lane: "money", tone: "watch", owner: "Money" },
    paid: { label: "Paid", lane: "closed", tone: "good", owner: "Money" },
    closed: { label: "Closed", lane: "closed", tone: "muted", owner: "Closed" },
    cancelled: { label: "Cancelled", lane: "closed", tone: "muted", owner: "Closed" }
  };

  function ticketStage(ticket = {}) {
    return normalizeTicketStageForDashboard(ticket.stage || ticket.status);
  }

  function ticketLane(ticket = {}) {
    const stage = ticketStage(ticket);
    return ticketStageMeta[stage]?.lane || ticket.lane || "sales";
  }

  function ticketIsOpen(ticket = {}) {
    return !["closed", "cancelled"].includes(ticketStage(ticket));
  }

  function ticketInStage(ticket = {}, stages = []) {
    return stages.includes(ticketStage(ticket));
  }

  function ticketInLane(ticket = {}, lanes = []) {
    return lanes.includes(ticketLane(ticket));
  }

  function statusText(value) {
    return String(value || "").trim().toLowerCase();
  }

  function quoteStage(item) {
    const status = statusText(item.status);
    if (/lost|cancel|no fit|declined|rejected/.test(status)) return "cancelled";
    if (/paid|closed/.test(status)) return "closed";
    if (/partial/.test(status)) return "partially_paid";
    if (/invoice|invoiced/.test(status)) return "invoice_preparation";
    if (/ready.*schedule|schedule/.test(status)) return "ready_to_schedule";
    if (/owner.*approval|review/.test(status)) return "needs_owner_approval";
    if (/budget/.test(status)) return "budget_in_progress";
    if (/won|approved|accepted/.test(status)) return "needs_budget";
    if (/quote needed|estimate needed|quote requested/.test(status)) return "quote_pending";
    if (/quoted|quote sent|estimate sent|sent/.test(status)) return "customer_approval_pending";
    if (/interested|contact|follow/.test(status)) return "scope_in_progress";
    return "sales_intake";
  }

  function jobStage(item) {
    const status = statusText(item.status);
    if (/cancel/.test(status)) return "cancelled";
    if (/paid|closed/.test(status)) return "closed";
    if (/invoice sent/.test(status)) return "invoice_sent";
    if (/invoice|billing/.test(status)) return "invoice_review";
    if (/review/.test(status)) return "completion_review";
    if (/complete|done/.test(status)) return "field_work_complete";
    if (/pause|hold|blocked/.test(status)) return "paused";
    if (/progress|started|active/.test(status)) return "in_progress";
    return "scheduled";
  }

  function ticketNextAction(stage) {
    switch (stage) {
      case "draft":
      case "sales_intake":
        return "Review intake";
      case "scope_in_progress":
        return "Confirm scope";
      case "quote_pending":
        return "Prepare quote";
      case "customer_approval_pending":
        return "Follow up on approval";
      case "needs_budget":
        return "Review internal costs";
      case "budget_in_progress":
        return "Finish cost review";
      case "needs_owner_approval":
        return "Owner approval";
      case "invoice_preparation":
        return "Prepare draft invoice";
      case "ready_to_schedule":
        return "Schedule work";
      case "scheduled":
        return "Work the visit";
      case "in_progress":
        return "Add work update";
      case "paused":
        return "Resolve blocker";
      case "scope_change_requested":
        return "Review scope change";
      case "field_work_complete":
        return "Review completion";
      case "completion_review":
        return "Check actuals/photos";
      case "invoice_review":
        return "Finalize invoice";
      case "invoice_sent":
      case "partially_paid":
        return "Collect payment";
      case "paid":
        return "Close ticket";
      default:
        return "Open ticket";
    }
  }

  function ticketBlockers(stage) {
    switch (stage) {
      case "sales_intake":
        return ["Scope", "Contact", "Property"];
      case "scope_in_progress":
        return ["Scope", "Photos", "Quote"];
      case "quote_pending":
        return ["Quote"];
      case "customer_approval_pending":
        return ["Customer approval"];
      case "needs_budget":
        return ["Cost review", "Owner approval", "Draft invoice"];
      case "budget_in_progress":
        return ["Owner approval", "Draft invoice"];
      case "needs_owner_approval":
        return ["Owner approval"];
      case "invoice_preparation":
        return ["Draft invoice"];
      case "ready_to_schedule":
        return [];
      case "scheduled":
      case "in_progress":
        return ["Arrival photos", "Completion photos", "Forms"];
      case "field_work_complete":
      case "completion_review":
        return ["Actuals", "Photos", "Invoice review"];
      case "invoice_review":
        return ["Invoice approval"];
      case "invoice_sent":
      case "partially_paid":
        return ["Payment"];
      default:
        return [];
    }
  }

  function ticketNumber(prefix, id, index) {
    const safe = String(id || "").replace(/[^a-z0-9]/gi, "").slice(0, 5).toUpperCase();
    return `${prefix}-${safe || String(index + 1).padStart(3, "0")}`;
  }

  function normalizeTicketStageForDashboard(value, fallback = "sales_intake") {
    const compact = statusText(value).replace(/[\s-]+/g, "_");
    if (ticketStageMeta[compact]) return compact;
    if (/cost.*progress|review.*progress|budget.*progress/.test(compact)) return "budget_in_progress";
    if (/cost|budget/.test(compact)) return "needs_budget";
    if (/owner.*approval/.test(compact)) return "needs_owner_approval";
    if (/invoice.*sent/.test(compact)) return "invoice_sent";
    if (/invoice|billing/.test(compact)) return "invoice_review";
    if (/ready.*schedule/.test(compact)) return "ready_to_schedule";
    if (/complete|done/.test(compact)) return "field_work_complete";
    if (/progress|started|active/.test(compact)) return "in_progress";
    if (/cancel|declined|lost/.test(compact)) return "cancelled";
    return ticketStageMeta[fallback] ? fallback : "sales_intake";
  }

  function normalizeTicketSourceType(row = {}) {
    const value = statusText(row.source_type || row.source || row.related_record_type || row.related_type || "");
    if (/quote|submission|lead/.test(value)) return "quote";
    if (/job|visit|schedule/.test(value)) return "job";
    if (/invoice|estimate|document/.test(value)) return "document";
    return "ticket";
  }

  function normalizeTicketBlockers(value, stage) {
    if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean);
    const text = String(value || "").trim();
    if (text) return text.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
    return ticketBlockers(stage);
  }

  function ticketSourceKey(ticket = {}) {
    const source = ticket.sourceType || ticket.source || "ticket";
    const id = ticket.sourceId || ticket.id || "";
    return `${source}:${id}`;
  }

  function ticketActionTargetId(ticket = {}, action = "") {
    const sourceAction = ["open-submission", "edit-job", "open-document"].includes(action);
    return sourceAction ? ticket.sourceId || ticket.id : ticket.id;
  }

  function ticketSourceLabel(ticket = {}) {
    const source = ticket.sourceType || ticket.source;
    if (source === "quote") return "Quote request";
    if (source === "job") return "Scheduled visit";
    if (source === "document") return "Document";
    return "Job ticket";
  }

  function normalizeCanonicalTicket(row = {}, index = 0) {
    const stage = normalizeTicketStageForDashboard(row.stage || row.ticket_stage || row.workflow_stage || row.status);
    const meta = ticketStageMeta[stage] || ticketStageMeta.sales_intake;
    const sourceType = normalizeTicketSourceType(row);
    const sourceId = row.source_id || row.related_record_id || row.quote_id || row.submission_id || row.job_id || row.document_id || "";
    const title = row.title || row.ticket_title || row.service || row.requested_service || row.job_description || "Job ticket";
    const customer = row.customer_name || row.client_name || row.contact_name || row.site_name || row.company_name || "Customer not set";
    const property = row.property_name || row.property_address || row.address || row.city || "Property not set";
    const dateRaw = row.scheduled_date || row.visit_date || row.due_date || row.updated_at || row.created_at || "";
    return {
      id: row.id,
      source: "ticket",
      sourceType,
      sourceId,
      number: row.ticket_number || row.number || ticketNumber("TKT", row.id, index),
      title,
      customer,
      property,
      detail: row.description || row.scope_of_work || row.notes || row.internal_notes || "Open the ticket to review details.",
      stage,
      stageLabel: row.stage_label || meta.label,
      tone: row.tone || meta.tone,
      lane: row.lane || meta.lane,
      ownerLabel: row.owner_label || row.responsible_role || meta.owner,
      action: sourceType === "quote" ? "open-submission" : sourceType === "job" ? "edit-job" : sourceType === "document" ? "open-document" : "open-ticket",
      dateRaw,
      dateLabel: row.date_label || formatDate(dateRaw) || "No date",
      nextAction: row.next_action || ticketNextAction(stage),
      blockers: normalizeTicketBlockers(row.blockers || row.missing_requirements, stage),
      sourceLabel: ticketSourceLabel({ sourceType }),
      customerId: row.customer_id || row.customerId || "",
      propertyId: row.property_id || row.propertyId || "",
      quoteId: row.quote_id || row.quoteId || "",
      jobId: row.job_id || row.jobId || "",
      invoiceId: row.invoice_id || row.invoiceId || "",
      assignedUserId: row.assigned_user_id || row.assignedUserId || "",
      primaryContact: row.contact_name || row.primary_contact || row.primaryContact || row.customer_name || "",
      requestedService: row.requested_service || row.service || row.requestedService || "",
      scopeOfWork: row.scope_of_work || row.scopeOfWork || row.description || "",
      proposedPrice: row.proposed_price ?? row.proposedPrice ?? "",
      expectedRevenue: row.expected_revenue ?? row.expectedRevenue ?? "",
      estimatedTotalCost: row.estimated_total_cost ?? row.estimatedTotalCost ?? "",
      estimatedProfit: row.estimated_profit ?? row.estimatedProfit ?? "",
      targetMargin: row.target_margin ?? row.targetMargin ?? "",
      paymentStatus: row.payment_status || row.paymentStatus || "",
      internalNotes: row.internal_notes || row.internalNotes || "",
      customerApprovalRecorded: Boolean(row.customer_approval_recorded || row.customerApprovalRecorded),
      costReviewComplete: Boolean(row.cost_review_complete || row.costReviewComplete),
      budgetComplete: Boolean(row.budget_complete || row.budgetComplete),
      scopeComplete: Boolean(row.scope_complete || row.scopeComplete),
      ownerApprovalRecorded: Boolean(row.owner_approval_recorded || row.ownerApprovalRecorded),
      draftInvoiceExists: Boolean(row.draft_invoice_exists || row.draftInvoiceExists),
      depositRequired: Boolean(row.deposit_required || row.depositRequired),
      depositPaid: Boolean(row.deposit_paid || row.depositPaid),
      beforePhotosUploaded: Boolean(row.before_photos_uploaded || row.beforePhotosUploaded || row.arrival_photos_uploaded || row.arrivalPhotosUploaded),
      afterPhotosUploaded: Boolean(row.after_photos_uploaded || row.afterPhotosUploaded || row.completion_photos_uploaded || row.completionPhotosUploaded),
      fieldCompletionNotes: row.field_completion_notes || row.fieldCompletionNotes || "",
      invoiceFinalized: Boolean(row.invoice_finalized || row.invoiceFinalized)
    };
  }

  function ticketEventTitle(value) {
    const type = String(value || "").trim();
    if (type === "ticket_created") return "Ticket created";
    if (type === "ticket_stage_changed") return "Stage changed";
    if (type === "ticket_updated") return "Ticket updated";
    return type
      ? type.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
      : "Ticket update";
  }

  function normalizeJobTicketEvent(row = {}) {
    const rawFromStage = String(row.from_stage || row.fromStage || "").trim();
    const rawToStage = String(row.to_stage || row.toStage || "").trim();
    const fromStage = rawFromStage ? normalizeTicketStageForDashboard(rawFromStage) : "";
    const toStage = rawToStage ? normalizeTicketStageForDashboard(rawToStage) : "";
    return {
      id: row.id || "",
      ticketId: row.ticket_id || row.ticketId || "",
      eventType: row.event_type || row.eventType || "ticket_updated",
      title: ticketEventTitle(row.event_type || row.eventType),
      actorEmail: row.actor_email || row.actorEmail || "",
      actorUserId: row.actor_user_id || row.actorUserId || "",
      fromStage,
      fromStageLabel: fromStage ? ticketStageLabel(fromStage) : "",
      toStage,
      toStageLabel: toStage ? ticketStageLabel(toStage) : "",
      notes: row.notes || "",
      oldValue: row.old_value || row.oldValue || null,
      newValue: row.new_value || row.newValue || null,
      createdAtRaw: row.created_at || row.createdAt || "",
      createdAt: formatDateTime(row.created_at || row.createdAt)
    };
  }

  function buildTicketFromQuote(item, index) {
    const stage = quoteStage(item);
    const meta = ticketStageMeta[stage] || ticketStageMeta.sales_intake;
    return {
      id: item.id,
      source: "quote",
      sourceType: "quote",
      sourceId: item.id,
      number: ticketNumber("QT", item.id, index),
      title: item.service || "Quote request",
      customer: item.name || "Unnamed lead",
      property: item.city || item.propertyType || "Property not set",
      detail: item.notes || item.email || item.phone || "Needs intake review.",
      stage,
      stageLabel: meta.label,
      tone: meta.tone,
      lane: meta.lane,
      ownerLabel: meta.owner,
      action: "open-submission",
      dateRaw: item.createdAtRaw,
      dateLabel: item.receivedAt || "No date",
      nextAction: ticketNextAction(stage),
      blockers: ticketBlockers(stage),
      sourceLabel: "Quote request"
    };
  }

  function buildTicketFromJob(item, index) {
    const stage = jobStage(item);
    const meta = ticketStageMeta[stage] || ticketStageMeta.scheduled;
    return {
      id: item.id,
      source: "job",
      sourceType: "job",
      sourceId: item.id,
      number: ticketNumber("JOB", item.id, index),
      title: item.service || "Scheduled visit",
      customer: item.site || "Unnamed site",
      property: item.city || "Property not set",
      detail: [item.date, item.window].filter(Boolean).join(" / ") || "Schedule details needed.",
      stage,
      stageLabel: meta.label,
      tone: meta.tone,
      lane: meta.lane,
      ownerLabel: meta.owner,
      action: "edit-job",
      dateRaw: item.dateRaw,
      dateLabel: [item.date, item.window].filter(Boolean).join(" / "),
      nextAction: ticketNextAction(stage),
      blockers: ticketBlockers(stage),
      sourceLabel: "Scheduled visit"
    };
  }

  function dashboardTickets(data = state.data) {
    const jobs = (data.jobs || []).map(buildTicketFromJob);
    const quotes = (data.submissions || []).map(buildTicketFromQuote);
    const derived = [...jobs, ...quotes];
    const canonical = (data.tickets || []).filter((ticket) => ticket && ticket.id);
    if (!canonical.length) {
      return derived.sort((a, b) => String(a.dateRaw || "").localeCompare(String(b.dateRaw || "")));
    }
    const canonicalSourceKeys = new Set(canonical.map(ticketSourceKey).filter((key) => !key.endsWith(":")));
    const fallbackTickets = derived.filter((ticket) => !canonicalSourceKeys.has(ticketSourceKey(ticket)));
    return [...canonical, ...fallbackTickets].sort((a, b) => String(a.dateRaw || "").localeCompare(String(b.dateRaw || "")));
  }

  function ticketCountBy(tickets, predicate) {
    return tickets.filter(predicate).length;
  }

  function renderTicketMetric(value, label, detail) {
    return `<article class="ticket-metric">
      <strong>${escapeHtml(value)}</strong>
      <span>${escapeHtml(label)}</span>
      <small>${escapeHtml(detail)}</small>
    </article>`;
  }

  const ticketOwnerGroups = [
    {
      id: "sales",
      label: "Leads",
      title: "Leads owns intake, scope, and customer approval.",
      detail: "Confirm the request, collect the missing details, prepare the quote, and hand approved work to Money.",
      stages: ["draft", "sales_intake", "scope_in_progress", "quote_pending", "customer_approval_pending", "scope_change_requested"]
    },
    {
      id: "accounting",
      label: "Money",
      title: "Money owns cost review, approval, invoice prep, and payment.",
      detail: "Check costs, get owner approval, prepare draft invoices, reconcile actuals, and track Square payment status.",
      stages: ["needs_budget", "budget_in_progress", "needs_owner_approval", "invoice_preparation", "invoice_review", "invoice_sent", "partially_paid", "paid"]
    },
    {
      id: "field",
      label: "Work",
      title: "Work owns schedule, visits, photos, and completion notes.",
      detail: "Run the visit, add arrival and completion proof, attach forms, and send completed work into review.",
      stages: ["ready_to_schedule", "scheduled", "in_progress", "paused"]
    },
    {
      id: "review",
      label: "Review",
      title: "Owner review closes the loop before billing.",
      detail: "Check completion proof, actual costs, documents, and whether any scope changes or add-ons need invoice attention.",
      stages: ["field_work_complete", "completion_review"]
    }
  ];

  function ticketStageLabel(stage) {
    return (ticketStageMeta[stage] && ticketStageMeta[stage].label) || titleCase(String(stage || "").replace(/_/g, " "));
  }

  function ticketsInStages(tickets, stages) {
    return tickets.filter((ticket) => ticketInStage(ticket, stages || []));
  }

  function renderTicketOwnerStrip(tickets, activeId = "") {
    return `<section class="ticket-owner-strip" aria-label="Ticket ownership map">
      ${ticketOwnerGroups.map((group) => {
        const owned = ticketsInStages(tickets, group.stages);
        return `<article class="${group.id === activeId ? "is-active" : ""}">
          <span>${escapeHtml(owned.length)}</span>
          <div>
            <strong>${escapeHtml(group.label)}</strong>
            <small>${escapeHtml(group.detail)}</small>
          </div>
        </article>`;
      }).join("")}
    </section>`;
  }

  function renderTicketRoleBrief(roleId, tickets) {
    const group = ticketOwnerGroups.find((item) => item.id === roleId);
    if (!group) return "";
    const owned = ticketsInStages(tickets, group.stages);
    const nextTickets = owned.slice(0, 3);
    return `<section class="ticket-role-brief">
      <div>
        <p class="eyebrow">${escapeHtml(group.label)} workspace</p>
        <h3>${escapeHtml(group.title)}</h3>
        <p>${escapeHtml(group.detail)}</p>
        <div class="ticket-stage-pill-list">
          ${group.stages.map((stage) => `<span>${escapeHtml(ticketStageLabel(stage))}</span>`).join("")}
        </div>
      </div>
      <aside>
        <strong>${escapeHtml(owned.length)}</strong>
        <span>Ticket${owned.length === 1 ? "" : "s"} in this lane</span>
        <div class="ticket-role-mini-list">
          ${nextTickets.length ? nextTickets.map((ticket) => `<button type="button" data-action="open-ticket" data-ticket-source="${escapeHtml(ticket.source)}" data-id="${escapeHtml(ticket.id)}">
            <span>${escapeHtml(ticket.number)}</span>
            <strong>${escapeHtml(ticket.customer)}</strong>
            <small>${escapeHtml(ticket.nextAction)}</small>
          </button>`).join("") : `<p>No tickets are waiting in this workspace.</p>`}
        </div>
      </aside>
    </section>`;
  }

  function renderTicketCard(ticket, compact = false) {
    const blockers = ticket.blockers?.length ? `<div class="ticket-blockers">${ticket.blockers.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>` : "";
    const opensDocument = ticket.source === "document";
    const actionAttrs = opensDocument
      ? `data-action="open-document" data-id="${escapeHtml(ticket.id)}"`
      : `data-action="open-ticket" data-ticket-source="${escapeHtml(ticket.source)}" data-id="${escapeHtml(ticket.id)}"`;
    return `<article class="ticket-card ticket-card--${escapeHtml(ticket.tone || "new")}">
      <div class="ticket-card-main">
        <span class="ticket-number">${escapeHtml(ticket.number)}</span>
        <span class="ticket-stage">${escapeHtml(ticket.stageLabel)}</span>
        <h4>${escapeHtml(ticket.title)}</h4>
        <p>${escapeHtml(ticket.customer)}</p>
        <small>${escapeHtml([ticket.property, ticket.dateLabel].filter(Boolean).join(" / "))}</small>
        <small class="ticket-owner">Current owner: ${escapeHtml(ticket.ownerLabel || "Unassigned")}</small>
        ${compact ? "" : `<p class="ticket-detail">${escapeHtml(ticket.detail)}</p>`}
        ${blockers}
      </div>
      <div class="ticket-card-actions">
        <span>${escapeHtml(ticket.nextAction)}</span>
        <button type="button" ${actionAttrs}>${opensDocument ? "Open Document" : "Open Ticket"}</button>
      </div>
    </article>`;
  }

  function renderTicketColumn(title, detail, tickets, emptyMessage) {
    return `<section class="ticket-lane">
      <div class="ticket-lane-heading">
        <div>
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(detail)}</p>
        </div>
        <span>${escapeHtml(tickets.length)}</span>
      </div>
      <div class="ticket-lane-list">
        ${tickets.length ? tickets.slice(0, 6).map((ticket) => renderTicketCard(ticket)).join("") : emptyState(emptyMessage)}
      </div>
    </section>`;
  }

  const ticketWorkflowSteps = [
    { key: "sales", label: "Leads", detail: "Intake and scope", stages: ["draft", "sales_intake", "scope_in_progress", "quote_pending"] },
    { key: "approval", label: "Approval", detail: "Customer yes", stages: ["customer_approval_pending"] },
    { key: "cost-review", label: "Cost Review", detail: "Costs and owner", stages: ["needs_budget", "budget_in_progress", "needs_owner_approval"] },
    { key: "invoice-prep", label: "Invoice Prep", detail: "Draft ready", stages: ["invoice_preparation"] },
    { key: "field", label: "Work", detail: "Schedule and work", stages: ["ready_to_schedule", "scheduled", "in_progress", "paused", "scope_change_requested"] },
    { key: "review", label: "Review", detail: "Photos and actuals", stages: ["field_work_complete", "completion_review", "invoice_review"] },
    { key: "close", label: "Close", detail: "Invoice and payment", stages: ["invoice_sent", "partially_paid", "paid", "closed"] }
  ];

  const ticketEndToEndFlow = [
    { key: "lead", label: "Lead", detail: "Request captured", stages: ["draft", "sales_intake"] },
    { key: "ticket", label: "Job Ticket", detail: "Scope organized", stages: ["scope_in_progress"] },
    { key: "quote", label: "Quote", detail: "Approval tracked", stages: ["quote_pending", "customer_approval_pending"] },
    { key: "budget", label: "Budget", detail: "Cost review", stages: ["needs_budget", "budget_in_progress", "needs_owner_approval"] },
    { key: "assignment", label: "Work Assignment", detail: "Ready and scheduled", stages: ["invoice_preparation", "ready_to_schedule", "scheduled"] },
    { key: "completion", label: "Completion", detail: "Work proof and review", stages: ["in_progress", "paused", "scope_change_requested", "field_work_complete", "completion_review"] },
    { key: "invoice", label: "Invoice", detail: "Sent and collected", stages: ["invoice_review", "invoice_sent", "partially_paid", "paid"] },
    { key: "closed", label: "Closed", detail: "Final record", stages: ["closed"] }
  ];

  function ticketWorkflowIndex(stage) {
    return Math.max(0, ticketWorkflowSteps.findIndex((step) => step.stages.includes(stage)));
  }

  function renderTicketEndToEndFlow(tickets = [], activeStage = "", label = "End-to-end ticket workflow") {
    const normalizedActiveStage = activeStage ? ticketStage({ stage: activeStage }) : "";
    const openCount = tickets.filter(ticketIsOpen).length;
    const closedCount = tickets.filter((ticket) => ticketInStage(ticket, ["closed"])).length;
    return `<section class="ticket-flow-panel ticket-end-to-end-flow" data-ticket-lifecycle-map aria-label="${escapeHtml(label)}">
      <div class="ticket-flow-heading">
        <div>
          <p class="eyebrow">Workflow Map</p>
          <h3>${escapeHtml(label)}</h3>
          <p>One job trail from request to closeout, shared by Home, Tickets, Work, Leads, Money, and Tools.</p>
        </div>
        <dl>
          <div><dt>Open</dt><dd>${escapeHtml(String(openCount))}</dd></div>
          <div><dt>Closed</dt><dd>${escapeHtml(String(closedCount))}</dd></div>
        </dl>
      </div>
      <div class="ticket-flow-steps">
        ${ticketEndToEndFlow.map((step, index) => {
          const count = tickets.filter((ticket) => ticketInStage(ticket, step.stages)).length;
          const isActive = normalizedActiveStage && step.stages.includes(normalizedActiveStage);
          const isPopulated = !normalizedActiveStage && count > 0;
          return `<article class="ticket-flow-step ${isActive ? "is-active" : ""} ${isPopulated ? "is-populated" : ""}" data-flow-key="${escapeHtml(step.key)}">
            <span>${escapeHtml(index + 1)}</span>
            <strong>${escapeHtml(step.label)}</strong>
            <small>${escapeHtml(step.detail)}</small>
            <em>${escapeHtml(String(count))} tickets</em>
          </article>`;
        }).join("")}
      </div>
    </section>`;
  }

  function renderTicketWorkflowBoard(openTickets = [], filteredTickets = []) {
    return `<section class="ticket-workflow-board" aria-label="Ticket workflow board">
      <div class="ticket-workflow-board-heading">
        <div>
          <p class="eyebrow">Workflow Board</p>
          <h3>Request to closeout</h3>
          <p>See every open ticket by its next operating step, from lead intake through payment and closeout.</p>
        </div>
        <dl>
          <div><dt>Shown</dt><dd>${escapeHtml(String(filteredTickets.length))}</dd></div>
          <div><dt>Open</dt><dd>${escapeHtml(String(openTickets.length))}</dd></div>
        </dl>
      </div>
      <div class="ticket-workflow-board-grid">
        ${ticketWorkflowSteps.map((step) => {
          const totalTickets = openTickets.filter((ticket) => ticketInStage(ticket, step.stages));
          const shownTickets = filteredTickets.filter((ticket) => ticketInStage(ticket, step.stages));
          return `<article class="ticket-workflow-board-column ${shownTickets.length ? "is-populated" : ""}" data-workflow-step="${escapeHtml(step.key)}">
            <div class="ticket-workflow-board-column-head">
              <div>
                <strong>${escapeHtml(step.label)}</strong>
                <small>${escapeHtml(step.detail)}</small>
              </div>
              <span title="${escapeHtml(String(totalTickets.length))} open tickets">${escapeHtml(String(shownTickets.length))}</span>
            </div>
            <div class="ticket-workflow-board-list">
              ${shownTickets.length
                ? shownTickets.slice(0, 3).map((ticket) => renderTicketCard(ticket, true)).join("")
                : emptyState("No tickets in this step.")}
              ${shownTickets.length > 3 ? `<p class="ticket-workflow-more">${escapeHtml(String(shownTickets.length - 3))} more tickets match this step.</p>` : ""}
            </div>
          </article>`;
        }).join("")}
      </div>
    </section>`;
  }

  function renderTicketWorkflowTracker(stage) {
    const activeIndex = ticketWorkflowIndex(stage);
    return `<section class="ticket-drawer-tracker" aria-label="Job ticket workflow">
      ${ticketWorkflowSteps.map((step, index) => `<div class="ticket-drawer-step ${index < activeIndex ? "is-complete" : ""} ${index === activeIndex ? "is-active" : ""}">
        <span>${escapeHtml(index + 1)}</span>
        <strong>${escapeHtml(step.label)}</strong>
        <small>${escapeHtml(step.detail)}</small>
      </div>`).join("")}
    </section>`;
  }

  function renderTicketRequirements(ticket) {
    const blockers = ticket.blockers?.length ? ticket.blockers : [];
    return `<section class="ticket-drawer-card">
      <div class="ticket-drawer-card-heading">
        <h4>Next requirements</h4>
        <span>${escapeHtml(ticket.nextAction || "Open ticket")}</span>
      </div>
      ${blockers.length ? `<ul class="ticket-requirement-list">
        ${blockers.map((item) => `<li><span aria-hidden="true"></span>${escapeHtml(item)}</li>`).join("")}
      </ul>` : `<p class="ticket-drawer-note">No blockers are known for this stage. This ticket can move to the next owner when the working details are saved.</p>`}
    </section>`;
  }

  function ticketFieldText(value, fallback = "Not set") {
    const text = String(value ?? "").trim();
    return text || fallback;
  }

  function ticketMoneyText(value) {
    if (value === undefined || value === null || value === "") return "Not set";
    const number = Number(value);
    return Number.isFinite(number) ? `$${number.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : ticketFieldText(value);
  }

  function ticketPercentText(value) {
    if (value === undefined || value === null || value === "") return "Not set";
    const number = Number(value);
    return Number.isFinite(number) ? `${number.toLocaleString(undefined, { maximumFractionDigits: 1 })}%` : ticketFieldText(value);
  }

  function ticketWorkbenchItem(label, value, isComplete) {
    return `<li class="${isComplete ? "is-complete" : ""}">
      <span aria-hidden="true"></span>
      <div>
        <strong>${escapeHtml(label)}</strong>
        <small>${escapeHtml(value)}</small>
      </div>
    </li>`;
  }

  function ticketWorkbenchSection(section, activeStage) {
    const completed = section.items.filter((item) => item.complete).length;
    const stateClass = section.stages.includes(activeStage)
      ? "is-active"
      : completed === section.items.length
        ? "is-complete"
        : "";
    const stateLabel = section.stages.includes(activeStage)
      ? "Current"
      : completed === section.items.length
        ? "Complete"
        : `${completed}/${section.items.length}`;
    return `<article class="ticket-workbench-section ${stateClass}">
      <div class="ticket-workbench-section-heading">
        <div>
          <p class="eyebrow">${escapeHtml(section.owner)}</p>
          <h5>${escapeHtml(section.title)}</h5>
        </div>
        <span>${escapeHtml(stateLabel)}</span>
      </div>
      <p>${escapeHtml(section.detail)}</p>
      <ul>
        ${section.items.map((item) => ticketWorkbenchItem(item.label, item.value, item.complete)).join("")}
      </ul>
    </article>`;
  }

  function renderTicketWorkbench(ticket) {
    const stage = ticketStage(ticket);
    const sections = [
      {
        title: "Sales & Scope",
        owner: "Leads",
        detail: "Client, property, service request, and customer approval.",
        stages: ["draft", "sales_intake", "scope_in_progress", "quote_pending", "customer_approval_pending", "scope_change_requested"],
        items: [
          { label: "Client", value: ticketFieldText(ticket.customerId ? ticket.customer : ticket.customer, "Client not set"), complete: Boolean(ticket.customerId || ticket.customer) },
          { label: "Property", value: ticketFieldText(ticket.propertyId ? ticket.property : ticket.property, "Property not set"), complete: Boolean(ticket.propertyId || ticket.property) },
          { label: "Scope", value: ticketFieldText(ticket.scopeOfWork || ticket.detail, "Scope needed"), complete: Boolean(ticket.scopeOfWork || ticket.scopeComplete) },
          { label: "Customer approval", value: ticket.customerApprovalRecorded ? "Recorded" : "Needed before cost review", complete: Boolean(ticket.customerApprovalRecorded) }
        ]
      },
      {
        title: "Cost Review",
        owner: "Money",
        detail: "Internal revenue, cost, margin, and owner-ready notes.",
        stages: ["needs_budget", "budget_in_progress"],
        items: [
          { label: "Expected revenue", value: ticketMoneyText(ticket.expectedRevenue || ticket.proposedPrice), complete: Boolean(ticket.expectedRevenue || ticket.proposedPrice) },
          { label: "Estimated cost", value: ticketMoneyText(ticket.estimatedTotalCost), complete: Boolean(ticket.estimatedTotalCost) },
          { label: "Estimated profit", value: ticketMoneyText(ticket.estimatedProfit), complete: Boolean(ticket.estimatedProfit) },
          { label: "Target margin", value: ticketPercentText(ticket.targetMargin), complete: Boolean(ticket.targetMargin) }
        ]
      },
      {
        title: "Owner Approval",
        owner: "Owner",
        detail: "Final internal approval before invoice prep and scheduling.",
        stages: ["needs_owner_approval"],
        items: [
          { label: "Cost review", value: ticket.costReviewComplete || ticket.budgetComplete ? "Complete" : "Waiting on Money", complete: Boolean(ticket.costReviewComplete || ticket.budgetComplete) },
          { label: "Owner approval", value: ticket.ownerApprovalRecorded ? "Recorded" : "Needs approval", complete: Boolean(ticket.ownerApprovalRecorded) },
          { label: "Deposit rule", value: ticket.depositRequired ? (ticket.depositPaid ? "Deposit paid" : "Deposit required") : "No deposit required", complete: !ticket.depositRequired || Boolean(ticket.depositPaid) }
        ]
      },
      {
        title: "Draft Invoice",
        owner: "Money",
        detail: "Prepare the invoice/payment handoff before work is scheduled.",
        stages: ["invoice_preparation"],
        items: [
          { label: "Draft invoice", value: ticket.draftInvoiceExists ? "Ready" : "Not created yet", complete: Boolean(ticket.draftInvoiceExists) },
          { label: "Payment status", value: ticketFieldText(ticket.paymentStatus, "No payment recorded"), complete: ["paid", "partially_paid"].includes(statusText(ticket.paymentStatus)) }
        ]
      },
      {
        title: "Work & Site Proof",
        owner: "Work",
        detail: "Schedule, assign, capture arrival photos, and complete the visit.",
        stages: ["ready_to_schedule", "scheduled", "in_progress", "paused"],
        items: [
          { label: "Visit date", value: ticketFieldText(ticket.dateLabel, "Not scheduled"), complete: Boolean(ticket.dateRaw && ticket.dateLabel !== "No date") },
          { label: "Assigned team", value: ticket.assignedUserId ? "Assigned" : "Not assigned", complete: Boolean(ticket.assignedUserId) },
          { label: "Arrival photos", value: ticket.beforePhotosUploaded ? "Uploaded" : "Needed on arrival", complete: Boolean(ticket.beforePhotosUploaded) },
          { label: "Completion photos", value: ticket.afterPhotosUploaded ? "Uploaded" : "Needed at completion", complete: Boolean(ticket.afterPhotosUploaded) }
        ]
      },
      {
        title: "Closeout",
        owner: "Owner & Money",
        detail: "Completion review, final invoice, payment, and close.",
        stages: ["field_work_complete", "completion_review", "invoice_review", "invoice_sent", "partially_paid", "paid", "closed"],
        items: [
          { label: "Completion notes", value: ticketFieldText(ticket.fieldCompletionNotes, "Notes needed"), complete: Boolean(ticket.fieldCompletionNotes) },
          { label: "Final invoice", value: ticket.invoiceFinalized ? "Finalized" : "Needs final review", complete: Boolean(ticket.invoiceFinalized) },
          { label: "Payment", value: ticketFieldText(ticket.paymentStatus, "Not recorded"), complete: statusText(ticket.paymentStatus) === "paid" },
          { label: "Ticket close", value: stage === "closed" ? "Closed" : "Open", complete: stage === "closed" }
        ]
      }
    ];

    return `<section class="ticket-workbench" data-ticket-workbench>
      <div class="ticket-workbench-heading">
        <div>
          <p class="eyebrow">Ticket Workbench</p>
          <h4>Role workflow</h4>
        </div>
        <span>${escapeHtml(ticket.ownerLabel || "Unassigned")}</span>
      </div>
      <div class="ticket-workbench-grid">
        ${sections.map((section) => ticketWorkbenchSection(section, stage)).join("")}
      </div>
    </section>`;
  }

  const ticketLifecycleTransitions = {
    draft: [{ to: "sales_intake", label: "Start intake", detail: "Move this ticket into lead intake." }],
    sales_intake: [
      { to: "scope_in_progress", label: "Start scope", detail: "Begin confirming the service, site, and quote details." },
      { to: "cancelled", label: "Cancel ticket", detail: "Close this ticket as cancelled." }
    ],
    scope_in_progress: [
      { to: "quote_pending", label: "Quote pending", detail: "Scope is ready for quote preparation." },
      { to: "cancelled", label: "Cancel ticket", detail: "Close this ticket as cancelled." }
    ],
    quote_pending: [
      { to: "customer_approval_pending", label: "Send for approval", detail: "Quote has been prepared and needs customer approval." },
      { to: "scope_in_progress", label: "Return to scope", detail: "Send back to scope if details are missing." }
    ],
    customer_approval_pending: [
      { to: "needs_budget", label: "Customer approved", detail: "Send approved work into internal cost review." },
      { to: "scope_in_progress", label: "Return to scope", detail: "Revise the scope before approving." }
    ],
    needs_budget: [
      { to: "budget_in_progress", label: "Start cost review", detail: "Begin internal labor/material/equipment review." },
      { to: "scope_in_progress", label: "Return to Leads", detail: "Send back for scope clarification." }
    ],
    budget_in_progress: [
      { to: "needs_owner_approval", label: "Submit to owner", detail: "Cost review is ready for owner approval." },
      { to: "scope_in_progress", label: "Return to Leads", detail: "Send back for scope clarification." }
    ],
    needs_owner_approval: [
      { to: "invoice_preparation", label: "Approve", detail: "Owner approved. Prepare the invoice/draft money handoff." },
      { to: "budget_in_progress", label: "Return to cost review", detail: "Send back to Money for changes." },
      { to: "scope_in_progress", label: "Return to Leads", detail: "Send back to scope work." },
      { to: "cancelled", label: "Cancel ticket", detail: "Close this ticket as cancelled." }
    ],
    invoice_preparation: [
      { to: "ready_to_schedule", label: "Ready to schedule", detail: "Invoice prep is done. Hand off to Work." },
      { to: "needs_owner_approval", label: "Return to owner", detail: "Needs another owner review before scheduling." }
    ],
    ready_to_schedule: [{ to: "scheduled", label: "Mark scheduled", detail: "A work visit is on the calendar." }],
    scheduled: [
      { to: "in_progress", label: "Start work", detail: "Work has started." },
      { to: "scope_change_requested", label: "Request scope change", detail: "Work needs a scope or approval change." },
      { to: "cancelled", label: "Cancel ticket", detail: "Close this ticket as cancelled." }
    ],
    in_progress: [
      { to: "paused", label: "Pause work", detail: "Work is blocked or waiting." },
      { to: "scope_change_requested", label: "Request scope change", detail: "Work needs a scope or approval change." },
      { to: "field_work_complete", label: "Work complete", detail: "Send completed work to review." }
    ],
    paused: [
      { to: "in_progress", label: "Resume work", detail: "Blocker resolved and work can continue." },
      { to: "scope_change_requested", label: "Request scope change", detail: "Escalate the blocker into owner review." }
    ],
    scope_change_requested: [
      { to: "in_progress", label: "Approve change", detail: "Approve and return to work." },
      { to: "budget_in_progress", label: "Needs cost review", detail: "Send change to Money before work continues." },
      { to: "scope_in_progress", label: "Return to Leads", detail: "Send change back for scope clarification." }
    ],
    field_work_complete: [{ to: "completion_review", label: "Start completion review", detail: "Review photos, forms, and actuals." }],
    completion_review: [{ to: "invoice_review", label: "Send to invoice review", detail: "Completion review is ready for Money." }],
    invoice_review: [{ to: "invoice_sent", label: "Invoice sent", detail: "Final invoice has been sent." }],
    invoice_sent: [
      { to: "partially_paid", label: "Record partial payment", detail: "Payment has started but is not complete." },
      { to: "paid", label: "Record paid", detail: "Invoice is fully paid." }
    ],
    partially_paid: [{ to: "paid", label: "Record paid", detail: "Invoice is fully paid." }],
    paid: [{ to: "closed", label: "Close ticket", detail: "The job ticket is complete and paid." }],
    closed: [],
    cancelled: []
  };

  const ticketRequiredFieldsByStage = {
    needs_budget: ["customerId", "propertyId", "primaryContact", "requestedService", "scopeOfWork", "proposedPrice", "customerApprovalRecorded"],
    needs_owner_approval: ["costReviewComplete", "expectedRevenue", "estimatedTotalCost", "estimatedProfit", "targetMargin"],
    ready_to_schedule: ["scopeComplete", "customerApprovalRecorded", "costReviewComplete", "ownerApprovalRecorded", "draftInvoiceExists"],
    scheduled: ["dateRaw", "assignedUserId"],
    field_work_complete: ["beforePhotosUploaded", "afterPhotosUploaded", "fieldCompletionNotes"],
    closed: ["invoiceFinalized", "paymentStatus"]
  };

  function ticketRequirementLabel(field) {
    return ({
      customerId: "Client linked",
      propertyId: "Property linked",
      primaryContact: "Contact set",
      requestedService: "Service set",
      scopeOfWork: "Scope of work",
      proposedPrice: "Proposed price",
      customerApprovalRecorded: "Customer approval",
      costReviewComplete: "Cost review complete",
      expectedRevenue: "Expected revenue",
      estimatedTotalCost: "Estimated cost",
      estimatedProfit: "Estimated profit",
      targetMargin: "Target margin",
      scopeComplete: "Scope complete",
      ownerApprovalRecorded: "Owner approval",
      draftInvoiceExists: "Draft invoice",
      depositPaid: "Deposit paid",
      requiredDocumentsPresent: "Required documents",
      dateRaw: "Scheduled date",
      assignedUserId: "Assigned team member",
      beforePhotosUploaded: "Arrival photos",
      afterPhotosUploaded: "Completion photos",
      fieldCompletionNotes: "Completion notes",
      invoiceFinalized: "Final invoice",
      paymentStatus: "Paid status"
    })[field] || titleCase(String(field || "").replace(/_/g, " "));
  }

  function ticketHasRequirementValue(ticket, field) {
    if (field === "paymentStatus") return statusText(ticket.paymentStatus) === "paid";
    if (field === "costReviewComplete") return Boolean(ticket.costReviewComplete || ticket.budgetComplete);
    if (field === "dateRaw") return Boolean(ticket.dateRaw && ticket.dateLabel !== "No date");
    const value = ticket[field];
    return value !== undefined && value !== null && value !== "" && value !== false;
  }

  function ticketMissingRequirementsForStage(ticket, stage) {
    const normalized = normalizeTicketStageForDashboard(stage);
    const missing = (ticketRequiredFieldsByStage[normalized] || [])
      .filter((field) => !ticketHasRequirementValue(ticket, field));
    if (normalized === "ready_to_schedule") {
      if (ticket.depositRequired && !ticket.depositPaid) missing.push("depositPaid");
      if (ticket.requiredDocumentsPresent === false) missing.push("requiredDocumentsPresent");
    }
    return missing.map(ticketRequirementLabel);
  }

  function ticketTransitionOptions(ticket) {
    const stage = ticketStage(ticket);
    return (ticketLifecycleTransitions[stage] || []).map((item) => ({
      ...item,
      missing: ticketMissingRequirementsForStage(ticket, item.to),
      nextAction: ticketNextAction(item.to)
    }));
  }

  function renderTicketBudgetBridge(ticket = {}) {
    if (!["needs_budget", "budget_in_progress", "needs_owner_approval"].includes(ticketStage(ticket))) return "";
    if (!canManageMoneyWorkflow()) return "";
    const budget = findBudgetForTicket(ticket);
    const setupBlocked = !state.budgetsReady && !isDemoMode();
    return `<div class="ticket-budget-bridge">
      <div>
        <strong>${escapeHtml(budget ? "Money budget is linked" : "Money budget needed")}</strong>
        <span>${escapeHtml(budget ? `${budget.budgetName} / ${budget.status}` : "Create the internal cost review record for this ticket.")}</span>
      </div>
      <button type="button" data-action="${budget ? "open-budget" : "prepare-ticket-budget"}" data-id="${escapeHtml(budget ? budget.id : ticket.id)}"${setupBlocked ? " disabled aria-disabled=\"true\"" : ""}>
        ${buttonContent(budget ? "Open Budget" : "Prepare Budget", budget ? "open-budget" : "quick-add-quote")}
      </button>
    </div>`;
  }

  function assignmentProfileLabel(profile = {}) {
    return profile.name || profile.email || "Dashboard user";
  }

  function assignableWorkProfiles() {
    const profiles = (state.data.userProfiles || [])
      .filter((profile) => profile && !profile.disabledAt)
      .filter((profile) => profile.userId || profile.email);
    const current = currentUserProfile();
    const merged = [...profiles];
    if (current?.userId || current?.email) merged.unshift(current);
    const seen = new Set();
    return merged.filter((profile) => {
      const key = profile.userId || profile.email;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function assignmentProfileForId(id) {
    const value = String(id || "").trim();
    if (!value) return null;
    return assignableWorkProfiles().find((profile) => profile.userId === value || profile.email === value) || null;
  }

  function workAssignmentOptions(selectedId = "") {
    const profiles = assignableWorkProfiles();
    const selected = String(selectedId || "").trim();
    const options = profiles.map((profile) => {
      const value = profile.userId || profile.email;
      return `<option value="${escapeHtml(value)}"${value === selected ? " selected" : ""}>${escapeHtml(assignmentProfileLabel(profile))}</option>`;
    }).join("");
    return `<option value="">Choose team member...</option>${options}`;
  }

  function renderTicketWorkAssignmentBridge(ticket = {}, sourceItem = null) {
    const stage = ticketStage(ticket);
    if (!["ready_to_schedule", "scheduled", "in_progress", "paused"].includes(stage)) return "";
    if (!canManageWorkWorkflow()) return "";
    const linkedJob = ticket.sourceType === "job" ? sourceItem : null;
    const visitDate = toDateInputValue(linkedJob?.dateRaw || ticket.dateRaw || "");
    const visitWindow = linkedJob?.window && linkedJob.window !== "Window not set" ? linkedJob.window : "";
    const assignedUserId = ticket.assignedUserId || "";
    const buttonLabel = linkedJob?.id ? "Update Work Assignment" : "Create Work Assignment";
    return `<section class="ticket-drawer-card ticket-work-assignment-bridge">
      <div class="ticket-drawer-card-heading">
        <div>
          <h4>Work assignment</h4>
          <span>${escapeHtml(linkedJob?.id ? "Linked to a scheduled visit." : "Create the scheduled visit and assign the field owner.")}</span>
        </div>
      </div>
      <form class="ticket-work-assignment-form" data-ticket-assignment-form data-ticket-id="${escapeHtml(ticket.id || "")}" data-job-id="${escapeHtml(linkedJob?.id || "")}">
        <label>Visit date
          <input name="visit_date" type="date" value="${escapeHtml(visitDate)}" required>
        </label>
        <label>Visit window
          <input name="visit_window" value="${escapeHtml(visitWindow)}" placeholder="9 AM - 11 AM">
        </label>
        <label>Assigned team member
          <select name="assigned_user_id" required>${workAssignmentOptions(assignedUserId)}</select>
        </label>
        <div class="drawer-actions span-full">
          <button type="submit">${buttonContent(buttonLabel, "quick-add-job")}</button>
          ${linkedJob?.id ? `<button type="button" data-action="edit-job" data-id="${escapeHtml(linkedJob.id)}">${buttonContent("Open Work Visit", "edit-job")}</button>` : ""}
        </div>
      </form>
    </section>`;
  }

  function renderTicketInvoiceBridge(ticket = {}) {
    const stage = ticketStage(ticket);
    if (!["invoice_preparation", "field_work_complete", "completion_review", "invoice_review", "invoice_sent", "partially_paid", "paid", "closed"].includes(stage)) return "";
    if (!canManageMoneyWorkflow()) return "";
    const invoice = findInvoiceForTicket(ticket);
    const paymentStatus = ticketInvoicePaymentStatus(ticket, invoice);
    const amount = invoice ? `$${Number(invoice.total || 0).toFixed(2)}` : budgetCurrency(ticketInvoiceAmount(ticket));
    const helper = invoice
      ? `${invoice.number || "Invoice"} / ${invoice.status || "draft"} / ${amount}`
      : "Prepare or link the final invoice before closing this ticket.";
    return `<section class="ticket-drawer-card ticket-invoice-bridge">
      <div class="ticket-drawer-card-heading">
        <div>
          <h4>Invoice and payment</h4>
          <span>${escapeHtml(helper)}</span>
        </div>
        ${invoice ? documentStatusBadge(invoice) : ""}
      </div>
      ${invoice ? `<form class="ticket-invoice-form" data-ticket-invoice-form data-ticket-id="${escapeHtml(ticket.id || "")}">
        <input type="hidden" name="invoice_id" value="${escapeHtml(invoice.id)}">
        <label>Payment status
          <select name="payment_status">${ticketInvoicePaymentOptions(paymentStatus)}</select>
        </label>
        <label class="ticket-invoice-check">
          <input type="checkbox" name="invoice_finalized"${ticket.invoiceFinalized ? " checked" : ""}>
          <span>Final invoice reviewed</span>
        </label>
        <div class="drawer-actions span-full">
          <button type="submit">${buttonContent("Save Invoice Status", "save")}</button>
          <button type="button" data-action="open-document" data-id="${escapeHtml(invoice.id)}">${buttonContent("Open Invoice", "open-document")}</button>
          <button type="button" data-action="sync-square-document" data-id="${escapeHtml(invoice.id)}">${buttonContent("Sync Square", "sync-square-document")}</button>
        </div>
      </form>` : `<div class="ticket-invoice-empty">
        <p>${escapeHtml(state.documentsReady || isDemoMode() ? "No final invoice is linked yet." : "Sales documents are not connected yet.")}</p>
        <button type="button" data-action="create-ticket-invoice" data-id="${escapeHtml(ticket.id || "")}"${state.documentsReady || isDemoMode() ? "" : " disabled aria-disabled=\"true\""}>
          ${buttonContent("Prepare Final Invoice", "create-invoice")}
        </button>
      </div>`}
    </section>`;
  }

  function renderTicketCommandCenter(ticket) {
    const isCanonical = ticket?.source === "ticket";
    const transitions = ticketTransitionOptions(ticket || {});
    return `<section class="ticket-drawer-card ticket-command-card" data-ticket-command-panel data-ticket-id="${escapeHtml(ticket?.id || "")}">
      <div class="ticket-drawer-card-heading">
        <div>
          <h4>Ticket command center</h4>
          <span>${escapeHtml(isCanonical ? "Move this ticket through the workflow." : "Create or open the unified ticket before moving stages.")}</span>
        </div>
      </div>
      <label class="ticket-command-field">Next action
        <input data-ticket-next-action-input value="${escapeHtml(ticket?.nextAction || "")}" placeholder="What needs to happen next?">
      </label>
      <label class="ticket-command-field">Internal note
        <textarea data-ticket-transition-notes rows="3" placeholder="Optional note for the ticket history...">${escapeHtml(ticket?.internalNotes || "")}</textarea>
      </label>
      ${isCanonical ? `<div class="ticket-transition-grid">
        ${transitions.length ? transitions.map((item) => {
          const missing = item.missing || [];
          const disabled = missing.length ? " disabled aria-disabled=\"true\"" : "";
          return `<button type="button" data-action="transition-ticket-stage" data-id="${escapeHtml(ticket.id)}" data-stage="${escapeHtml(item.to)}" data-next-action="${escapeHtml(item.nextAction)}"${disabled}>
            <strong>${escapeHtml(item.label)}</strong>
            <small>${escapeHtml(missing.length ? `Missing: ${missing.join(", ")}` : item.detail)}</small>
          </button>`;
        }).join("") : `<p class="ticket-drawer-note">No more workflow moves are available from ${escapeHtml(ticket.stageLabel || "this stage")}.</p>`}
      </div>
      ${renderTicketBudgetBridge(ticket)}
      <div class="drawer-actions ticket-command-actions">
        <button type="button" data-action="save-ticket-command" data-id="${escapeHtml(ticket.id)}">${buttonContent("Save Ticket Note", "save")}</button>
      </div>` : `<p class="ticket-drawer-note">This is still a source record preview. Open or create the unified ticket to use lifecycle controls.</p>`}
    </section>`;
  }

  function ticketHandoffActions(ticket) {
    if (!ticket) return [];
    const sourceType = ticket.sourceType || ticket.source;
    if (sourceType === "quote") {
      if (ticket.stage === "sales_intake") {
        return [
          { label: "Mark Intake Reviewed", status: "Contacted", detail: "Moves this request into scope/quote work." },
          { label: "Open Quote Details", action: "open-submission", detail: "Review notes, contact info, and schedule form." }
        ];
      }
      if (ticket.stage === "scope_in_progress" || ticket.stage === "quote_pending") {
        return [
          { label: "Create Estimate", action: "create-estimate", detail: "Starts the customer-facing estimate record." },
          { label: "Draft Invoice", action: "create-invoice", detail: "Prepares the Money handoff." }
        ];
      }
      if (ticket.stage === "customer_approval_pending" || ticket.stage === "needs_budget" || ticket.stage === "budget_in_progress" || ticket.stage === "needs_owner_approval") {
        return [
          { label: "Draft Invoice", action: "create-invoice", detail: "Moves approved work into Money prep." },
          { label: "Open Quote Details", action: "open-submission", detail: "Use the schedule form once the work is ready." }
        ];
      }
      if (ticket.stage === "invoice_preparation" || ticket.stage === "ready_to_schedule") {
        return [
          { label: "Open Schedule Form", action: "open-submission", detail: "Create the work visit from this ticket." },
          { label: "Open Money", action: "go-money", detail: "Review estimates, invoices, and payment records." }
        ];
      }
      return [
        { label: "Open Quote Details", action: "open-submission", detail: "Review the source request." }
      ];
    }
    if (sourceType === "job") {
      if (ticket.stage === "scheduled" || ticket.stage === "in_progress" || ticket.stage === "paused") {
        return [
          { label: "Open Work Visit", action: "edit-job", detail: "Update visit timing, service, status, forms, and photos." },
          { label: "Mark Work Complete", status: "Completed", detail: "Sends the ticket to completion review." }
        ];
      }
      if (ticket.stage === "field_work_complete" || ticket.stage === "completion_review") {
        return [
          { label: "Send To Invoice Review", status: "Invoiced", detail: "Moves the completed visit to Money review." },
          { label: "Open Work Visit", action: "edit-job", detail: "Check photos, forms, and visit details." }
        ];
      }
      if (ticket.stage === "invoice_review" || ticket.stage === "invoice_sent" || ticket.stage === "partially_paid") {
        return [
          { label: "Open Money", action: "go-money", detail: "Review invoice and payment status." },
          { label: "Open Work Visit", action: "edit-job", detail: "Review the source visit." }
        ];
      }
      return [
        { label: "Open Work Visit", action: "edit-job", detail: "Review the source visit." }
      ];
    }
    return [];
  }

  function renderTicketHandoffActions(ticket) {
    const actions = ticketHandoffActions(ticket);
    if (!actions.length) return "";
    return `<section class="ticket-drawer-card ticket-handoff-card">
      <div class="ticket-drawer-card-heading">
        <h4>Workflow handoff</h4>
        <span>${escapeHtml(ticket.ownerLabel || "Unassigned")}</span>
      </div>
      <div class="ticket-handoff-actions">
        ${actions.map((item) => {
          const action = item.action || ticket.action || "open-ticket";
          const actionId = ticketActionTargetId(ticket, action);
          const statusSource = ticket.sourceType || ticket.source;
          const statusId = ticket.sourceId || ticket.id;
          const canonicalTicketAttr = ticket.source === "ticket" ? ` data-ticket-id="${escapeHtml(ticket.id)}"` : "";
          const attributes = item.status
            ? ["quote", "job"].includes(statusSource)
              ? `data-action="advance-ticket-status" data-ticket-source="${escapeHtml(statusSource)}"${canonicalTicketAttr} data-id="${escapeHtml(statusId)}" data-status="${escapeHtml(item.status)}"`
              : "disabled"
            : `data-action="${escapeHtml(action)}" data-id="${escapeHtml(actionId)}"`;
          return `<button type="button" ${attributes}>
            <strong>${escapeHtml(item.label)}</strong>
            <small>${escapeHtml(item.detail || "")}</small>
          </button>`;
        }).join("")}
      </div>
    </section>`;
  }

  function openTicketCreateDrawer(ticketType = "quote") {
    if (!els.detailDrawer || !els.detailContent) return;
    const safeType = ticketType === "field" ? "field" : "quote";
    if (!canCreateTicketType(safeType)) {
      setDashboardState("Your dashboard role cannot create that type of ticket.", "error");
      return;
    }
    openDetailDrawer();
    els.detailContent.innerHTML = `
      <div class="drawer-content ticket-detail-drawer">
        <p class="eyebrow">New Job Ticket</p>
        <div class="ticket-drawer-heading">
          <div>
            <h3>Create ticket</h3>
            <p>Start with a lead intake ticket, or create a scheduled work visit when the job is already ready.</p>
          </div>
        </div>
        <form class="drawer-form drawer-ticket-create-form ${safeType === "field" ? "is-field-ticket" : ""}" data-ticket-create-form>
          <label>Ticket type
            <select name="ticket_type" data-ticket-type-select>
              <option value="quote"${safeType === "quote" ? " selected" : ""}>Lead intake / quote request</option>
              <option value="field"${safeType === "field" ? " selected" : ""}>Scheduled work visit</option>
            </select>
          </label>
          <label>Customer or site
            <input name="customer_name" placeholder="Client, property, or site name" required>
          </label>
          <label>Email
            <input name="email" type="email" placeholder="team@example.com">
          </label>
          <label>Phone
            <input name="phone" inputmode="tel" placeholder="(971) 258-1109">
          </label>
          <label>Property / area
            <input name="city" placeholder="Property, city, or neighborhood" autocomplete="street-address" data-address-autocomplete>
          </label>
          <label>Property type
            <input name="property_type" placeholder="Home, apartment, HOA, property management...">
          </label>
          <label class="span-full">Service / request
            <input name="service" placeholder="Mowing, cleanup, mulch refresh, walkthrough..." required>
          </label>
          <div class="ticket-create-schedule span-full">
            <label>Visit date
              <input name="visit_date" type="date" value="${escapeHtml(todayKey())}"${safeType === "field" ? " required" : ""}>
            </label>
            <label>Visit window
              <input name="visit_window" placeholder="9 AM - 11 AM">
            </label>
          </div>
          <label class="span-full">Notes
            <textarea name="notes" rows="5" placeholder="Scope notes, access details, customer request, or internal context..."></textarea>
          </label>
          <div class="drawer-actions span-full">
            <button type="submit">${buttonContent("Create Ticket", "quick-add-job")}</button>
            <button type="button" data-action="close-drawer">${buttonContent("Cancel", "close")}</button>
          </div>
        </form>
      </div>
    `;
  }

  function renderTicketSourceActions(ticket) {
    const sourceType = ticket.sourceType || ticket.source;
    const sourceId = ticket.sourceId || ticket.id;
    if (sourceType === "quote") {
      return `<div class="drawer-actions ticket-source-actions">
        <button type="button" data-action="open-submission" data-id="${escapeHtml(sourceId)}">${buttonContent("Open Quote Details", "open-submission")}</button>
        <button type="button" data-action="sync-contact" data-id="${escapeHtml(sourceId)}">${buttonContent("Sync Contact", "sync-contact")}</button>
        <button type="button" data-action="create-estimate" data-id="${escapeHtml(sourceId)}">${buttonContent("Create Estimate", "create-estimate")}</button>
        <button type="button" data-action="create-invoice" data-id="${escapeHtml(sourceId)}">${buttonContent("Draft Invoice", "create-invoice")}</button>
      </div>`;
    }
    if (sourceType === "job") {
      return `<div class="drawer-actions ticket-source-actions">
        <button type="button" data-action="edit-job" data-id="${escapeHtml(sourceId)}">${buttonContent("Open Visit Details", "edit-job")}</button>
        <button type="button" data-action="go-route-planner">${buttonContent("Open Route", "go-route-planner")}</button>
        <button type="button" data-action="go-tools">${buttonContent("Open Tools", "go-tools")}</button>
        ${ticket.stage !== "field_work_complete" && ticket.stage !== "completion_review" && ticket.stage !== "closed" ? `<button type="button" data-action="complete-job" data-id="${escapeHtml(sourceId)}">${buttonContent("Mark Work Complete", "complete-reminder")}</button>` : ""}
      </div>`;
    }
    if (sourceType === "document") {
      return `<div class="drawer-actions ticket-source-actions">
        <button type="button" data-action="open-document" data-id="${escapeHtml(sourceId)}">${buttonContent("Open Document", "open-document")}</button>
      </div>`;
    }
    return `<div class="drawer-actions ticket-source-actions">
      <button type="button" disabled>${buttonContent("Source Record Pending", "open-document")}</button>
    </div>`;
  }

  function renderSourceTicketContext(ticket) {
    if (!ticket) return "";
    return `<section class="ticket-source-context">
      <div>
        <p class="eyebrow">Unified Ticket Context</p>
        <h4>${escapeHtml(ticket.number)} / ${escapeHtml(ticket.stageLabel)}</h4>
        <p>${escapeHtml(ticket.title)} for ${escapeHtml(ticket.customer)}${ticket.property ? ` / ${escapeHtml(ticket.property)}` : ""}</p>
      </div>
      <div class="ticket-source-context-meta">
        <span><strong>Owner</strong>${escapeHtml(ticket.ownerLabel || "Unassigned")}</span>
        <span><strong>Next</strong>${escapeHtml(ticket.nextAction || "Open ticket")}</span>
        <button type="button" data-action="open-ticket" data-ticket-source="${escapeHtml(ticket.source)}" data-id="${escapeHtml(ticket.id)}">Open Unified Ticket</button>
      </div>
    </section>`;
  }

  function ticketHistoryFor(ticket) {
    if (!ticket || ticket.source !== "ticket") return [];
    return (state.data.ticketEvents || [])
      .filter((event) => event.ticketId === ticket.id)
      .sort((a, b) => String(b.createdAtRaw || "").localeCompare(String(a.createdAtRaw || "")));
  }

  function renderTicketHistory(ticket) {
    if (!ticket || ticket.source !== "ticket") return "";
    const history = ticketHistoryFor(ticket).slice(0, 8);
    return `<section class="ticket-drawer-card ticket-history-card">
      <div class="ticket-drawer-card-heading">
        <h4>Ticket history</h4>
        <span>${history.length ? `${history.length} recent` : "No events yet"}</span>
      </div>
      ${history.length ? `<div class="ticket-history-list">
        ${history.map((event) => {
          const stageDetail = event.fromStageLabel || event.toStageLabel
            ? [event.fromStageLabel, event.toStageLabel].filter(Boolean).join(" to ")
            : "";
          return `<article class="ticket-history-row">
            <span aria-hidden="true"></span>
            <div>
              <strong>${escapeHtml(event.title)}</strong>
              <p>${escapeHtml(event.notes || stageDetail || "Ticket record updated.")}</p>
              <small>${escapeHtml([event.actorEmail || "Dashboard", event.createdAt].filter(Boolean).join(" / "))}</small>
            </div>
          </article>`;
        }).join("")}
      </div>` : `<p class="ticket-drawer-note">History will appear here after this ticket is created or moved through the workflow.</p>`}
    </section>`;
  }

  function renderTicketDocumentSource(document) {
    if (!document) return "";
    const amountDue = document.squareAmountDueCents !== null
      ? formatCurrency(document.squareAmountDueCents, document.squareCurrency)
      : `$${Number(document.total || 0).toFixed(2)}`;
    const documentType = document.type === "invoice" ? "Invoice" : "Estimate / Quote";
    const notes = document.notes || document.lineItems?.[0]?.description || "No document notes.";
    return `<section class="ticket-drawer-card ticket-document-source-card">
      <div class="ticket-drawer-card-heading">
        <div>
          <p class="eyebrow">Source Document</p>
          <h4>${escapeHtml(document.number || document.title || "Financial document")}</h4>
        </div>
        ${documentStatusBadge(document)}
      </div>
      <div class="drawer-grid ticket-drawer-grid">
        <div class="drawer-field"><span>Type</span>${escapeHtml(documentType)}</div>
        <div class="drawer-field"><span>Client</span>${escapeHtml(document.clientName || "No client")}</div>
        <div class="drawer-field"><span>Amount</span>${escapeHtml(amountDue)}</div>
        <div class="drawer-field"><span>Due</span>${escapeHtml(document.dueDate || "No due date")}</div>
        <div class="drawer-field span-full"><span>Notes</span>${escapeHtml(notes)}</div>
      </div>
    </section>`;
  }

  function openTicketDrawer(source, id) {
    if (!els.detailDrawer || !els.detailContent) return;
    const ticket = dashboardTickets().find((item) => item.id === id && item.source === source);
    if (!ticket) return;
    const sourceType = ticket.sourceType || ticket.source;
    const sourceId = ticket.sourceId || ticket.id;
    const sourceItem = sourceType === "quote"
      ? findSubmission(sourceId)
      : sourceType === "job"
        ? state.data.jobs.find((item) => item.id === sourceId)
        : sourceType === "document"
          ? state.data.documents.find((item) => item.id === sourceId)
          : null;
    openDetailDrawer();
    els.detailContent.innerHTML = `
      <div class="drawer-content ticket-detail-drawer">
        <p class="eyebrow">Unified Job Ticket</p>
        <div class="ticket-drawer-heading">
          <div>
            <h3>${escapeHtml(ticket.title)}</h3>
            <p>${escapeHtml(ticket.customer)}${ticket.property ? ` / ${escapeHtml(ticket.property)}` : ""}</p>
          </div>
          <div class="ticket-drawer-status">
            <span class="ticket-number">${escapeHtml(ticket.number)}</span>
            <span class="ticket-stage">${escapeHtml(ticket.stageLabel)}</span>
          </div>
        </div>
        ${renderTicketWorkflowTracker(ticket.stage)}
        ${renderTicketEndToEndFlow(dashboardTickets(), ticket.stage, "Current ticket lifecycle")}
        <div class="drawer-grid ticket-drawer-grid">
          <div class="drawer-field"><span>Current owner</span>${escapeHtml(ticket.ownerLabel || "Unassigned")}</div>
          <div class="drawer-field"><span>Next action</span>${escapeHtml(ticket.nextAction || "Open ticket")}</div>
          <div class="drawer-field"><span>Source</span>${escapeHtml(ticket.sourceLabel || ticketSourceLabel(ticket))}</div>
          <div class="drawer-field"><span>Date</span>${escapeHtml(ticket.dateLabel || "No date")}</div>
          <div class="drawer-field span-full"><span>Details</span>${escapeHtml(ticket.detail || "No details yet.")}</div>
        </div>
        ${renderTicketWorkbench(ticket)}
        ${renderTicketCommandCenter(ticket)}
        ${renderTicketWorkAssignmentBridge(ticket, sourceItem)}
        ${renderTicketInvoiceBridge(ticket)}
        ${renderTicketHandoffActions(ticket)}
        ${renderTicketRequirements(ticket)}
        ${renderTicketHistory(ticket)}
        ${renderTicketSourceActions(ticket)}
        ${sourceType === "document" && sourceItem ? renderTicketDocumentSource(sourceItem) : ""}
        ${sourceType === "quote" && sourceItem ? renderCallPanel(callPanelContext("quote_submission", sourceItem.id)) : ""}
        ${sourceType === "job" && sourceItem ? `<div class="job-support-sections">${renderJobDocumentationSection(sourceItem)}${renderJobPhotosSection(sourceItem)}</div>` : ""}
        ${sourceType === "quote" && sourceItem ? `<div data-call-outcome-slot></div>${renderActivityTimeline({
          leadId: sourceItem.id,
          leadType: "quote_submission",
          name: sourceItem.name,
          companyProperty: [sourceItem.propertyType, sourceItem.city, sourceItem.service].filter(Boolean).join(" / "),
          phone: sourceItem.phone,
          email: sourceItem.email
        })}` : ""}
      </div>
    `;
  }

  function openMoneyBudgetDrawer(id) {
    if (!els.detailDrawer || !els.detailContent) return;
    const budget = activeBudgetBundle().budgets.find((item) => item.id === id);
    if (!budget) {
      setDashboardState("Budget record not found.", "error");
      return;
    }
    const summary = budgetSummary(budget);
    const lines = budgetLineBundle(budget.id);
    const ticket = findTicketForBudget(budget);
    const canSyncToTicket = canManageMoneyWorkflow() && ticket?.source === "ticket";
    openDetailDrawer();
    els.detailContent.innerHTML = `
      <div class="drawer-content ticket-detail-drawer money-budget-drawer">
        <p class="eyebrow">Money / Budget</p>
        <div class="ticket-drawer-heading">
          <div>
            <h3>${escapeHtml(budget.budgetName)}</h3>
            <p>${escapeHtml([budget.clientName, budget.propertyName, budget.jobName].filter(Boolean).join(" / ") || "No linked record")}</p>
          </div>
          <div class="ticket-drawer-status">
            ${budgetBadge(budget.status)}
            ${budgetBadge(summary.health || "Healthy", "health")}
          </div>
        </div>
        <dl class="budget-summary-totals">
          <div><dt>Revenue</dt><dd>${budgetCurrency(summary.expectedRevenue)}</dd></div>
          <div><dt>Estimated Cost</dt><dd>${budgetCurrency(summary.totalEstimatedCost)}</dd></div>
          <div><dt>Estimated Profit</dt><dd>${budgetCurrency(summary.estimatedProfit)}</dd></div>
          <div><dt>Margin</dt><dd>${budgetPercent(summary.estimatedMargin)}</dd></div>
        </dl>
        ${ticket ? `<section class="ticket-source-context">
          <div>
            <p class="eyebrow">Linked Job Ticket</p>
            <h4>${escapeHtml(ticket.number)} / ${escapeHtml(ticket.stageLabel)}</h4>
            <p>${escapeHtml(ticket.title)} for ${escapeHtml(ticket.customer)}</p>
          </div>
          <div class="ticket-source-context-meta">
            <span><strong>Owner</strong>${escapeHtml(ticket.ownerLabel || "Unassigned")}</span>
            <button type="button" data-action="open-ticket" data-ticket-source="${escapeHtml(ticket.source)}" data-id="${escapeHtml(ticket.id)}">Open Ticket</button>
          </div>
        </section>` : `<p class="ticket-drawer-note">This budget is not linked to a unified Job Ticket yet.</p>`}
        <form class="drawer-form drawer-money-budget-form" data-money-budget-form>
          <input type="hidden" name="id" value="${escapeHtml(budget.id)}">
          <input type="hidden" name="job_id" value="${escapeHtml(budget.jobId || "")}">
          <input type="hidden" name="quote_id" value="${escapeHtml(budget.quoteId || "")}">
          <input type="hidden" name="invoice_id" value="${escapeHtml(budget.invoiceId || "")}">
          <input type="hidden" name="client_id" value="${escapeHtml(budget.clientId || "")}">
          <label class="span-full">Budget name
            <input name="budget_name" value="${escapeHtml(budget.budgetName)}" required>
          </label>
          <label>Service type
            <input name="service_type" value="${escapeHtml(budget.serviceType)}">
          </label>
          <label>Status
            <select name="status">${BUDGET_STATUSES.map((status) => `<option value="${escapeHtml(status)}"${budget.status === status ? " selected" : ""}>${escapeHtml(status)}</option>`).join("")}</select>
          </label>
          <label>Job status
            <select name="job_status">${BUDGET_JOB_STATUSES.map((status) => `<option value="${escapeHtml(status)}"${budget.jobStatus === status ? " selected" : ""}>${escapeHtml(status)}</option>`).join("")}</select>
          </label>
          <label>Target margin %
            <input name="target_margin_percent" type="number" min="0" max="100" step="0.1" value="${escapeHtml(String(budget.targetMarginPercent || ""))}">
          </label>
          <label>Base quoted price
            <input name="base_quoted_price" type="number" min="0" step="0.01" value="${escapeHtml(String(budget.baseQuotedPrice || ""))}">
          </label>
          <label>Approved add-ons
            <input name="approved_addons" type="number" min="0" step="0.01" value="${escapeHtml(String(budget.approvedAddons || ""))}">
          </label>
          <label>Discounts
            <input name="discounts" type="number" min="0" step="0.01" value="${escapeHtml(String(budget.discounts || ""))}">
          </label>
          <label>Taxes
            <input name="taxes" type="number" min="0" step="0.01" value="${escapeHtml(String(budget.taxes || ""))}">
          </label>
          <label>Other revenue
            <input name="other_revenue" type="number" min="0" step="0.01" value="${escapeHtml(String(budget.otherRevenue || ""))}">
          </label>
          <label>Final invoiced revenue
            <input name="final_invoiced_revenue" type="number" min="0" step="0.01" value="${escapeHtml(String(budget.finalInvoicedRevenue || ""))}">
          </label>
          <label>Amount paid
            <input name="amount_paid" type="number" min="0" step="0.01" value="${escapeHtml(String(budget.amountPaid || ""))}">
          </label>
          <label>Property / site
            <input name="property_name" value="${escapeHtml(budget.propertyName)}">
          </label>
          <label>Start date
            <input name="proposed_start_date" type="date" value="${escapeHtml(budget.proposedStartDateRaw || "")}">
          </label>
          <label>Completion date
            <input name="proposed_completion_date" type="date" value="${escapeHtml(budget.proposedCompletionDateRaw || "")}">
          </label>
          <label class="span-full">Description
            <textarea name="job_description" rows="3">${escapeHtml(budget.jobDescription || "")}</textarea>
          </label>
          <label class="span-full">Notes
            <textarea name="notes" rows="4">${escapeHtml(budget.notes || "")}</textarea>
          </label>
          <div class="drawer-actions span-full">
            <button type="submit">${buttonContent("Save Budget", "save")}</button>
            ${canSyncToTicket ? `<button type="button" class="secondary-action" data-action="sync-budget-to-ticket" data-id="${escapeHtml(budget.id)}">${buttonContent("Mark Cost Review Complete", "complete-reminder")}</button>` : ""}
          </div>
        </form>
        <div class="budget-detail-tab-panel">
          ${renderBudgetLineList("Labor", lines.labor, {
            title: (item) => item.task,
            meta: (item) => `${item.role || "Labor"} / ${item.estimatedHours} hr`,
            estimated: (item) => item.estimatedCost,
            actual: (item) => item.actualCost
          })}
          ${renderBudgetLineList("Materials", lines.materials, {
            title: (item) => item.materialName,
            meta: (item) => `${item.category} / ${item.quantity || 0} ${item.unit || ""}`.trim(),
            estimated: (item) => item.estimatedCost,
            actual: (item) => item.actualCost
          })}
          ${renderBudgetLineList("Equipment", lines.equipment, {
            title: (item) => item.equipmentName,
            meta: (item) => `${item.usageType} / ${item.estimatedQuantity || 0}`,
            estimated: (item) => item.estimatedCost,
            actual: (item) => item.actualCost
          })}
          ${renderBudgetLineList("Other Costs", lines.costs, {
            title: (item) => item.description,
            meta: (item) => item.category,
            estimated: (item) => item.estimatedCost,
            actual: (item) => item.actualCost
          })}
        </div>
      </div>
    `;
  }

  const dashboardWorkspaceLinks = [
    { id: "overview", label: "Home", href: "#overview" },
    { id: "tickets", label: "Tickets", href: "#tickets" },
    { id: "calendar", label: "Work", href: "#calendar" },
    { id: "outreach", label: "Leads", href: "#outreach" },
    { id: "documents", label: "Money", href: "#documents" },
    { id: "settings", label: "Tools", href: "#settings" }
  ];

  function visibleDashboardWorkspaceLinks(role = currentSessionRole()) {
    return dashboardWorkspaceLinks.filter((item) => canAccessDashboardSection(item.id, role));
  }

  function renderWorkspaceSwitcher(activeId) {
    const activeSection = dashboardSectionForRole(activeId);
    const links = visibleDashboardWorkspaceLinks();
    return `<nav class="ticket-workspace-switcher" aria-label="Job ticket workspaces">
      ${links.map((item) => `<a href="${escapeHtml(item.href)}" class="${item.id === activeSection ? "is-active" : ""}" data-dashboard-link="${escapeHtml(item.id)}">${escapeHtml(item.label)}</a>`).join("")}
    </nav>`;
  }

  function renderWorkspaceFocusStrip(items = [], label = "Workspace signals") {
    if (!items.length) return "";
    return `<section class="workspace-focus-strip" aria-label="${escapeHtml(label)}">
      ${items.map((item) => `
        <article class="workspace-focus-card">
          <span>${escapeHtml(item.kicker || "Focus")}</span>
          <div class="workspace-focus-card-main">
            ${item.value !== undefined && item.value !== null ? `<strong class="workspace-focus-value">${escapeHtml(item.value)}</strong>` : ""}
            <strong class="workspace-focus-title">${escapeHtml(item.title || "")}</strong>
          </div>
          <small>${escapeHtml(item.detail || "")}</small>
        </article>
      `).join("")}
    </section>`;
  }

  function ticketMatchesBoardFilters(ticket = {}) {
    const query = String(state.ticketBoardSearch || "").trim().toLowerCase();
    const stageFilter = state.ticketBoardStageFilter || "All";
    const ownerFilter = state.ticketBoardOwnerFilter || "All";
    const stage = ticketStage(ticket);
    const owner = ticketStageMeta[stage]?.lane || ticket.lane || "";
    const stageMatches = stageFilter === "All" || stage === stageFilter;
    const ownerMatches = ownerFilter === "All" || owner === ownerFilter;
    if (!stageMatches || !ownerMatches) return false;
    if (!query) return true;
    return [
      ticket.number,
      ticket.title,
      ticket.customer,
      ticket.property,
      ticket.detail,
      ticket.stageLabel,
      ticket.nextAction,
      ticket.ownerLabel
    ].some((value) => String(value || "").toLowerCase().includes(query));
  }

  function uniqueTicketStages(tickets = []) {
    return [...new Set(tickets.map((ticket) => ticketStage(ticket)).filter(Boolean))]
      .sort((a, b) => ticketStageLabel(a).localeCompare(ticketStageLabel(b)));
  }

  function renderTicketBoardControls(tickets = [], filteredTickets = []) {
    const stages = uniqueTicketStages(tickets);
    const owners = [
      ["sales", "Leads"],
      ["accounting", "Money"],
      ["ready", "Ready"],
      ["field", "Work"],
      ["review", "Review"]
    ].filter(([lane]) => tickets.some((ticket) => ticketInLane(ticket, [lane])));
    const stageValue = stages.includes(state.ticketBoardStageFilter) ? state.ticketBoardStageFilter : "All";
    const ownerValue = owners.some(([lane]) => lane === state.ticketBoardOwnerFilter) ? state.ticketBoardOwnerFilter : "All";

    return `<section class="ticket-board-controls" aria-label="Ticket board controls">
      <div class="ticket-board-search">
        <label for="ticket-board-search">Search tickets</label>
        <input id="ticket-board-search" type="search" placeholder="Search ticket, client, property, next action..." value="${escapeHtml(state.ticketBoardSearch || "")}" data-ticket-board-search>
      </div>
      <div class="ticket-board-filter-row">
        <label>Stage
          <select data-ticket-board-stage-filter>
            <option value="All">All stages</option>
            ${stages.map((stage) => `<option value="${escapeHtml(stage)}"${stage === stageValue ? " selected" : ""}>${escapeHtml(ticketStageLabel(stage))}</option>`).join("")}
          </select>
        </label>
        <label>Owner
          <select data-ticket-board-owner-filter>
            <option value="All">All owners</option>
            ${owners.map(([lane, label]) => `<option value="${escapeHtml(lane)}"${lane === ownerValue ? " selected" : ""}>${escapeHtml(label)}</option>`).join("")}
          </select>
        </label>
        <button type="button" data-action="reset-ticket-board-filters">Reset Filters</button>
      </div>
      <p>${escapeHtml(filteredTickets.length)} of ${escapeHtml(tickets.length)} open tickets shown</p>
    </section>`;
  }

  function renderHomeActionQueue(items) {
    return `<section class="ticket-lane home-ticket-action-lane">
      <div class="ticket-lane-heading">
        <div>
          <h3>Today&apos;s Action Queue</h3>
          <p>Website requests, missed visits, follow-ups, invoices, imports, and ticket blockers that need attention.</p>
        </div>
        <span>${escapeHtml(items.length)}</span>
      </div>
      <div class="ticket-lane-list">
        ${items.length ? items.map((item) => `
          <article class="today-action-item urgency-${escapeHtml(slug(item.status))}">
            <span class="today-action-status">${escapeHtml(item.status)}</span>
            <div>
              <strong>${escapeHtml(item.title)}</strong>
              <small>${escapeHtml(item.detail || "Review this item.")}</small>
            </div>
            ${renderTodayActionButton(item)}
          </article>
        `).join("") : emptyState("Nothing needs immediate attention today.")}
      </div>
    </section>`;
  }

  function renderHomeNextStepCard(item = {}) {
    return `<article class="home-next-step-card">
      <span class="home-next-step-kicker">${escapeHtml(item.kicker || "Next")}</span>
      <div class="home-next-step-main">
        <strong>${escapeHtml(item.value ?? 0)}</strong>
        <div>
          <h4>${escapeHtml(item.title || "")}</h4>
          <p>${escapeHtml(item.detail || "")}</p>
        </div>
      </div>
      ${item.action ? `<button type="button" data-action="${escapeHtml(item.action)}">${escapeHtml(item.actionLabel || "Open")}</button>` : ""}
    </article>`;
  }

  function renderHomeCommandCenter(details = {}) {
    const actions = details.actions || [];
    const todayTickets = details.todayTickets || [];
    const attentionTickets = details.attentionTickets || [];
    const workTickets = details.workTickets || [];
    const moneyTickets = details.moneyTickets || [];
    const alertCount = (details.workflowWarnings || []).length + (details.notifications || []).length;
    const nextSteps = [
      {
        kicker: "Today",
        value: todayTickets.length,
        title: "Scheduled work",
        detail: "Open Work for routes, visits, completion notes, photos, and Work updates.",
        action: "go-work",
        actionLabel: "Open Work"
      },
      {
        kicker: "Handoffs",
        value: attentionTickets.length,
        title: "Needs next action",
        detail: "Review requests, quotes, approvals, budget prep, closeout, and blockers.",
        action: "go-tickets",
        actionLabel: "Open Tickets"
      },
      {
        kicker: "Money",
        value: moneyTickets.length,
        title: "Financial review",
        detail: "Check budget status, quote follow-up, invoices, payments, and closeout items.",
        action: "go-money",
        actionLabel: "Open Money"
      },
      {
        kicker: "Signals",
        value: alertCount,
        title: "Warnings and setup",
        detail: "Review dashboard health, tools, documentation, equipment, imports, and AI support.",
        action: "go-tools",
        actionLabel: "Open Tools"
      }
    ];

    return `<section class="home-command-center" aria-label="Home workspace signals">
      ${renderHomeActionQueue(actions)}
      <aside class="home-next-step-stack" aria-label="Where to go next">
        <div class="home-next-step-heading">
          <span>Where to go next</span>
          <strong>${escapeHtml(workTickets.length)} work tickets active</strong>
        </div>
        ${nextSteps.map(renderHomeNextStepCard).join("")}
      </aside>
    </section>`;
  }

  function renderHomeWorkspace(data = state.data) {
    const target = qs("[data-home-workspace]");
    if (!target) return;
    const tickets = dashboardTickets(data);
    const today = todayKey();
    const activeTickets = tickets.filter(ticketIsOpen);
    const todayTickets = activeTickets.filter((ticket) => dateKey(ticket.dateRaw) === today);
    const attentionTickets = activeTickets.filter((ticket) => ticketInStage(ticket, [
      "sales_intake",
      "scope_in_progress",
      "quote_pending",
      "customer_approval_pending",
      "needs_budget",
      "budget_in_progress",
      "needs_owner_approval",
      "field_work_complete",
      "completion_review",
      "invoice_review",
      "invoice_sent",
      "partially_paid"
    ]));
    const workTickets = activeTickets.filter((ticket) => ticketInLane(ticket, ["ready", "field"]));
    const moneyTickets = activeTickets.filter((ticket) => ticketInLane(ticket, ["accounting", "money"]));
    const actions = todayActionItems(data);
    const notifications = buildNotifications(data);
    const workflowWarnings = dashboardHealthWarnings({ scope: "critical" });

    target.innerHTML = `
      <div class="ticket-workspace uy-page-prototype home-ticket-workspace" data-uy-page-contract="home" data-data-source="tickets,jobs,quotes,notifications">
        ${renderWorkspaceSwitcher("overview")}
        <header class="ticket-hero">
          <div>
            <p class="eyebrow">Home</p>
            <h3>Today&apos;s Job Ticket Dashboard</h3>
            <p>Start here to see what needs attention, which tickets are moving through the workflow, and where Leads, Work, Money, and Tools need a handoff.</p>
          </div>
          <div class="ticket-hero-actions">
            ${canCreateTicketType("quote") ? `<button type="button" data-action="open-ticket-create" data-ticket-type="quote">New Job Ticket</button>` : ""}
            <button type="button" data-action="go-work">Open Work</button>
          </div>
        </header>
        <section class="ticket-metrics" aria-label="Home ticket summary">
          ${renderTicketMetric(activeTickets.length, "Open Tickets", "Across all lanes")}
          ${renderTicketMetric(todayTickets.length, "Due Today", "Scheduled or dated today")}
          ${renderTicketMetric(actions.length, "Action Items", "Needs attention now")}
          ${renderTicketMetric(workflowWarnings.length + notifications.length, "Alerts", "Workflow and notification signals")}
        </section>
        ${renderHomeCommandCenter({ actions, attentionTickets, todayTickets, workTickets, moneyTickets, workflowWarnings, notifications })}
        ${renderTicketEndToEndFlow(activeTickets, "", "Urban Yards job flow")}
        ${renderTicketOwnerStrip(activeTickets)}
      </div>`;
  }

  function renderJobTicketWorkspace(data = state.data) {
    const target = qs("[data-job-ticket-workspace]");
    if (!target) return;
    const tickets = dashboardTickets(data);
    const openTickets = tickets.filter(ticketIsOpen);
    const filteredTickets = openTickets.filter(ticketMatchesBoardFilters);
    const workTickets = filteredTickets.filter((ticket) => ticketInLane(ticket, ["field"]));
    const officeTickets = filteredTickets.filter((ticket) => ticketInLane(ticket, ["sales", "accounting", "review", "money"]));
    const readyTickets = filteredTickets.filter((ticket) => ticketInLane(ticket, ["ready"]));
    const reviewTickets = openTickets.filter((ticket) => ticketInLane(ticket, ["review", "money"]));
    target.innerHTML = `
      <div class="ticket-workspace uy-page-prototype job-ticket-workspace" data-uy-page-contract="tickets" data-data-source="job_tickets,quotes,jobs,invoices">
        ${renderWorkspaceSwitcher("tickets")}
        <header class="ticket-hero">
          <div>
            <p class="eyebrow">Job Ticket System</p>
            <h3>Job Ticket Command Center</h3>
            <p>Every request, quote, scheduled visit, work update, invoice step, and closeout flows through one job ticket workflow.</p>
          </div>
          <div class="ticket-hero-actions">
            ${canCreateTicketType("quote") ? `<button type="button" data-action="open-ticket-create" data-ticket-type="quote">New Job Ticket</button>` : ""}
            ${canCreateTicketType("field") ? `<button type="button" data-action="open-ticket-create" data-ticket-type="field">Schedule Visit</button>` : ""}
          </div>
        </header>
        ${renderTicketBoardControls(openTickets, filteredTickets)}
        <section class="ticket-metrics" aria-label="Job ticket summary">
          ${renderTicketMetric(openTickets.length, "Open Tickets", "Quotes and work")}
          ${renderTicketMetric(ticketCountBy(openTickets, (ticket) => ticketInLane(ticket, ["field"])), "In Work", "Scheduled or active")}
          ${renderTicketMetric(ticketCountBy(openTickets, (ticket) => ticketInLane(ticket, ["sales", "accounting"])), "Needs Office", "Scope, quote, cost review")}
          ${renderTicketMetric(ticketCountBy(openTickets, (ticket) => ticketInLane(ticket, ["review", "money"])), "Closeout", "Review, invoice, payment")}
        </section>
        ${renderWorkspaceFocusStrip([
          { kicker: "Shown", value: filteredTickets.length, title: "Board results", detail: "Open tickets matching the current search and filters." },
          { kicker: "Ready", value: readyTickets.length, title: "Schedule handoff", detail: "Approved work ready to become scheduled visits." },
          { kicker: "Closeout", value: reviewTickets.length, title: "Review queue", detail: "Completed, invoiced, or paid tickets still needing review." }
        ], "Tickets workspace signals")}
        ${renderTicketEndToEndFlow(openTickets)}
        ${renderTicketOwnerStrip(openTickets)}
        ${renderTicketWorkflowBoard(openTickets, filteredTickets)}
        <div class="ticket-lane-grid">
          ${renderTicketColumn("Today and Work", "Scheduled, active, and work-owned tickets.", workTickets, "No work tickets are scheduled yet.")}
          ${renderTicketColumn("Office Review", "Scope, quote, cost review, approval, and closeout blockers.", officeTickets, "No office tickets need review.")}
          ${renderTicketColumn("Ready to Schedule", "Approved work that can move into the schedule.", readyTickets, "No approved tickets are waiting to schedule.")}
        </div>
        <section class="ticket-review-strip">
          <div>
            <p class="eyebrow">Closeout</p>
            <h3>Completion and invoice review</h3>
            <p>Finished jobs should collect actuals, arrival/completion photos, supporting forms, invoice review, and payment status before closing.</p>
          </div>
          <div class="ticket-review-list">
            ${reviewTickets.length ? reviewTickets.slice(0, 3).map((ticket) => renderTicketCard(ticket, true)).join("") : emptyState("No tickets are waiting for closeout.")}
          </div>
        </section>
      </div>`;
  }

  function renderWorkPlanTile({ label, value, detail, action, actionLabel }) {
    return `<article class="work-plan-tile">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
      <p>${escapeHtml(detail)}</p>
      ${action ? `<button type="button" data-action="${escapeHtml(action)}">${escapeHtml(actionLabel || "Open")}</button>` : ""}
    </article>`;
  }

  function renderWorkDayPlanPanel(stops = [], todayTickets = [], upcomingTickets = [], reviewTickets = []) {
    const openStops = stops.filter((stop) => stop.status !== "Complete");
    const nextStop = openStops[0] || stops[0];
    return `<section class="work-day-plan-panel" aria-label="Work day plan">
      <article class="work-day-map-card">
        <div class="ticket-lane-heading">
          <div>
            <p class="eyebrow">Route Plan</p>
            <h3>Today&apos;s route and first stop</h3>
            <p>${nextStop ? escapeHtml([nextStop.clientName, nextStop.address, nextStop.city].filter(Boolean).join(" / ")) : "No route stops planned for today."}</p>
          </div>
          <span>${escapeHtml(String(openStops.length))}</span>
        </div>
        ${routePreviewMapShell("work")}
        <div class="work-day-route-footer">
          <span>${escapeHtml(stops.length ? `${openStops.length} open / ${stops.length} total stops` : "Build the route when work is scheduled.")}</span>
          <button type="button" data-action="go-route-planner">Open Route</button>
        </div>
      </article>
      <div class="work-plan-tile-grid">
        ${renderWorkPlanTile({
          label: "Today",
          value: todayTickets.length,
          detail: "Tickets scheduled for today.",
          action: "go-calendar",
          actionLabel: "Add Visit"
        })}
        ${renderWorkPlanTile({
          label: "Proof",
          value: reviewTickets.length,
          detail: "Work waiting on photos, forms, actuals, or completion review.",
          action: "go-tickets",
          actionLabel: "Review Tickets"
        })}
        ${renderWorkPlanTile({
          label: "Forms",
          value: "Docs",
          detail: "Supporting templates and submitted records live in Tools.",
          action: "go-tools",
          actionLabel: "Open Tools"
        })}
        ${renderWorkPlanTile({
          label: "Upcoming",
          value: upcomingTickets.length,
          detail: "Future scheduled or ready work tickets.",
          action: "go-work",
          actionLabel: "Stay in Work"
        })}
      </div>
    </section>`;
  }

  function renderWorkWorkspace(data = state.data) {
    const target = qs("[data-work-workspace]");
    if (!target) return;
    const tickets = dashboardTickets(data);
    const workTickets = tickets.filter((ticket) => ticketIsOpen(ticket) && ticketInLane(ticket, ["ready", "field", "review"]));
    const today = todayKey();
    const todayTickets = workTickets.filter((ticket) => dateKey(ticket.dateRaw) === today);
    const upcomingTickets = workTickets.filter((ticket) => dateKey(ticket.dateRaw) >= today);
    const reviewTickets = workTickets.filter((ticket) => ticketInLane(ticket, ["review"]));
    const routeStopsToday = dashboardRouteStopsForDate(data, today);
    target.innerHTML = `
      <div class="ticket-workspace uy-page-prototype work-workspace" data-uy-page-contract="work" data-data-source="jobs,job_tickets,route_stops,documentation">
        ${renderWorkspaceSwitcher("calendar")}
        <header class="ticket-hero work-hero">
          <div>
            <p class="eyebrow">Work</p>
            <h3>Assigned Work Board</h3>
            <p>Open job tickets, route stops, photos, supporting documents, and completion review from one practical work queue.</p>
          </div>
          <div class="ticket-hero-actions">
            ${canCreateTicketType("field") ? `<button type="button" data-action="open-ticket-create" data-ticket-type="field">Add Visit</button>` : ""}
            <button type="button" data-action="go-route-planner">Open Route</button>
          </div>
        </header>
        <section class="ticket-metrics" aria-label="Work summary">
          ${renderTicketMetric(todayTickets.length, "Due Today", "Scheduled for today")}
          ${renderTicketMetric(ticketCountBy(workTickets, (ticket) => ticketInStage(ticket, ["scheduled", "in_progress", "paused"])), "Active Work", "Scheduled or started")}
          ${renderTicketMetric(ticketCountBy(workTickets, (ticket) => ticketInLane(ticket, ["review"])), "Needs Proof", "Photos, actuals, forms")}
          ${renderTicketMetric(upcomingTickets.length, "Upcoming", "Scheduled tickets")}
        </section>
        ${renderWorkDayPlanPanel(routeStopsToday, todayTickets, upcomingTickets, reviewTickets)}
        ${renderWorkspaceFocusStrip([
          { kicker: "Today", value: todayTickets.length, title: "What to do first", detail: "Start with dated tickets and route stops for the current day." },
          { kicker: "Next", value: upcomingTickets.length, title: "What is coming up", detail: "Future ready and scheduled tickets stay visible here." },
          { kicker: "Proof", value: reviewTickets.length, title: "What needs closeout", detail: "Capture photos, forms, actuals, and completion notes before review." }
        ], "Work workspace signals")}
        <div class="field-grid work-execution-grid">
          <section class="ticket-lane field-primary-lane">
            <div class="ticket-lane-heading">
              <div>
                <h3>Assigned Work Queue</h3>
                <p>Open each ticket for instructions, site notes, proof, forms, and completion steps.</p>
              </div>
              <span>${escapeHtml(workTickets.length)}</span>
            </div>
            <div class="ticket-lane-list">
                  ${workTickets.length ? workTickets.slice(0, 8).map((ticket) => renderTicketCard(ticket)).join("") : emptyState("No work visits are scheduled yet.")}
            </div>
          </section>
          <aside class="field-side-stack">
            <section class="ticket-lane">
              <div class="ticket-lane-heading">
                <div>
                  <h3>Quick Add Visit</h3>
                  <p>Create a scheduled visit without leaving Work.</p>
                </div>
              </div>
              <form class="schedule-create-form ticket-create-form" data-job-create-form>
                <input name="visit_date" type="date" required>
                <input name="visit_window" placeholder="Time window">
                <input name="site_name" placeholder="Client or site" required>
                <input name="city" placeholder="Property or area" autocomplete="street-address" data-address-autocomplete>
                <input name="service" placeholder="Job, task, or reminder" required>
                <label class="recurring-toggle">
                  <input name="is_recurring" type="checkbox" data-recurring-toggle>
                  <span>Recurring visit</span>
                </label>
                <button type="submit"><span class="button-icon" aria-hidden="true">+</span><span>Add Visit</span></button>
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
              </form>
            </section>
            <section class="ticket-lane">
              <div class="ticket-lane-heading">
                <div>
                  <h3>Support Tools</h3>
                  <p>Routes, arrival photos, completion photos, forms, and diagnostics stay close to the work queue.</p>
                </div>
              </div>
              <div class="field-proof-actions">
                <button type="button" data-action="go-route-planner">Open Route Planner</button>
                <button type="button" data-action="go-tools">Open Tools</button>
                <button type="button" data-action="go-tools">Dashboard Health</button>
              </div>
            </section>
          </aside>
        </div>
      </div>`;
    setRoutePreviewState("work", {
      section: "calendar",
      stops: routeStopsToday,
      emptyText: "No route stops planned for today."
    });
  }

  function renderLeadQueueItem(item, tone = "") {
    const status = item.status || "Prospect";
    const followUp = item.nextFollowUpAt || "No follow-up date";
    const detail = [item.serviceInterest, item.propertyType].filter(Boolean).join(" / ") || "Service details needed";
    const contact = [item.managementCompany, item.contactName, item.city].filter(Boolean).join(" / ") || "Contact details needed";
    return `<article class="lead-queue-item ${tone ? `lead-queue-item--${escapeHtml(tone)}` : ""}">
      <div class="lead-queue-copy">
        <span>${escapeHtml(status)}</span>
        <h4>${escapeHtml(outreachTitle(item))}</h4>
        <p>${escapeHtml(contact)}</p>
        <small>${escapeHtml(detail)} · ${escapeHtml(followUp)}</small>
      </div>
      <div class="lead-queue-actions">
        ${renderPhoneActions(item.phone, { leadId: item.id, leadType: "outreach_prospect", compact: true, helper: false })}
        <button type="button" class="inline-action" data-action="open-outreach-prospect" data-id="${escapeHtml(item.id)}">Open Lead</button>
      </div>
    </article>`;
  }

  function renderLeadNextStepCard({ kicker, value, title, detail, action, actionLabel, extraAttrs = "" }) {
    return `<article class="lead-next-step-card">
      <span class="home-next-step-kicker">${escapeHtml(kicker)}</span>
      <div class="home-next-step-main">
        <strong>${escapeHtml(String(value))}</strong>
        <div>
          <h4>${escapeHtml(title)}</h4>
          <p>${escapeHtml(detail)}</p>
        </div>
      </div>
      <button type="button" data-action="${escapeHtml(action)}"${extraAttrs}>${escapeHtml(actionLabel)}</button>
    </article>`;
  }

  function renderLeadsCommandCenter({ prospectQueue, due, hot, intakeTickets, approvalTickets, accountingTickets, companies, properties }) {
    return `<section class="leads-command-center" aria-label="Leads command center">
      <section class="ticket-lane leads-contact-queue">
        <div class="ticket-lane-heading">
          <div>
            <p class="eyebrow">Contact Queue</p>
            <h3>Prospects needing the next touch</h3>
            <p>Call, email, or open the lead record before it becomes a quote-ready Job Ticket.</p>
          </div>
          <span>${escapeHtml(String(prospectQueue.length))}</span>
        </div>
        <div class="lead-queue-list">
          ${prospectQueue.length ? prospectQueue.map((item) => renderLeadQueueItem(item, hot.some((hotItem) => hotItem.id === item.id) ? "hot" : "due")).join("") : emptyState("No prospect follow-ups are due right now.")}
        </div>
      </section>
      <aside class="lead-next-step-stack">
        <div class="home-next-step-heading">
          <span>Lead Handoffs</span>
          <strong>Keep work moving</strong>
        </div>
        ${renderLeadNextStepCard({
          kicker: "Ticket",
          value: intakeTickets.length + approvalTickets.length,
          title: "Create or update Job Tickets",
          detail: "Use this when a lead has enough scope detail to track as real work.",
          action: "open-ticket-create",
          actionLabel: "New Job Ticket",
          extraAttrs: ' data-ticket-type="quote"'
        })}
        ${renderLeadNextStepCard({
          kicker: "Quote",
          value: hot.length,
          title: "Quote-ready conversations",
          detail: "Interested prospects and approval follow-ups should get a clear quote action.",
          action: "go-tickets",
          actionLabel: "Open Tickets"
        })}
        ${renderLeadNextStepCard({
          kicker: "Money",
          value: accountingTickets.length,
          title: "Approved work needs cost review",
          detail: "Once the customer says yes, hand the ticket to Money before scheduling.",
          action: "go-money",
          actionLabel: "Open Money"
        })}
        ${renderLeadNextStepCard({
          kicker: "Data",
          value: `${companies.length}/${properties.length}`,
          title: "Companies and properties",
          detail: "Use CSV import for management companies, property locations, and prospect lists.",
          action: "import-outreach-csv",
          actionLabel: "Import CSV"
        })}
      </aside>
    </section>`;
  }

  function renderLeadsWorkspace(data = state.data) {
    const target = qs("[data-leads-workspace]");
    if (!target) return;
    const tickets = dashboardTickets(data).filter((ticket) => ticketIsOpen(ticket) && ticketInLane(ticket, ["sales"]));
    const intakeTickets = tickets.filter((ticket) => ticketInStage(ticket, ["draft", "sales_intake", "scope_in_progress"]));
    const approvalTickets = tickets.filter((ticket) => ticketInStage(ticket, ["quote_pending", "customer_approval_pending", "scope_change_requested"]));
    const accountingTickets = dashboardTickets(data).filter((ticket) => ticketIsOpen(ticket) && ticketInStage(ticket, ["needs_budget"]));
    const due = typeof outreachDueProspects === "function" ? outreachDueProspects() : [];
    const hot = typeof outreachHotProspects === "function" ? outreachHotProspects() : [];
    const prospectQueue = Array.from(new Map([...due, ...hot].map((item) => [String(item.id || outreachTitle(item)), item])).values()).slice(0, 5);
    const companies = data.outreachCompanies || [];
    const properties = data.outreachProperties || [];
    target.innerHTML = `
      <div class="ticket-workspace uy-page-prototype leads-workspace" data-uy-page-contract="leads" data-data-source="prospects,outreach_companies,outreach_properties,quotes">
        ${renderWorkspaceSwitcher("outreach")}
        <header class="ticket-hero">
          <div>
            <p class="eyebrow">Leads</p>
            <h3>Lead to Ticket Pipeline</h3>
            <p>Turn prospects, property contacts, and quote-ready conversations into organized Job Tickets without losing the next follow-up.</p>
          </div>
          <div class="ticket-hero-actions">
            ${canManageLeadWorkflow() ? `<button type="button" data-action="new-outreach-prospect">Add Lead</button>` : ""}
            ${hasDashboardPermission("import") ? `<button type="button" data-action="import-outreach-csv">Import CSV</button>` : ""}
          </div>
        </header>
        <section class="ticket-metrics" aria-label="Leads ticket summary">
          ${renderTicketMetric(companies.length, "Companies", "Owner groups and managers")}
          ${renderTicketMetric(properties.length, "Properties", "Managed locations")}
          ${renderTicketMetric(due.length, "Follow-Ups Due", "Calls or emails waiting")}
          ${renderTicketMetric(approvalTickets.length + hot.length, "Quote-Ready", "Interested or pending approval")}
          ${renderTicketMetric(accountingTickets.length, "Money Handoff", "Approved work needs cost review")}
        </section>
        ${renderWorkspaceFocusStrip([
          { kicker: "Contact", value: prospectQueue.length, title: "Call and email queue", detail: "Prospects waiting for a clear next touch." },
          { kicker: "Ticket", value: intakeTickets.length + approvalTickets.length, title: "Scope into tickets", detail: "Requests that need organized ticket detail." },
          { kicker: "Money", value: accountingTickets.length, title: "Cost-review handoff", detail: "Approved work ready for internal review." }
        ], "Leads workspace signals")}
        ${renderLeadsCommandCenter({ prospectQueue, due, hot, intakeTickets, approvalTickets, accountingTickets, companies, properties })}
        <div class="ticket-lane-grid">
          ${renderTicketColumn("New Intake", "New requests that need scope, property details, or a first response.", intakeTickets, "No new lead intake tickets.")}
          ${renderTicketColumn("Quote Action", "Warm leads, quote follow-ups, and customer approval items.", approvalTickets.concat(hot.map((item, index) => buildTicketFromQuote(item, index))), "No quote follow-ups are waiting.")}
          ${renderTicketColumn("Ready for Money", "Approved work ready for cost review, owner approval, and invoice preparation.", accountingTickets, "No approved tickets are ready for Money.")}
        </div>
        <section class="ticket-review-strip">
          <div>
            <p class="eyebrow">Leads handoff rule</p>
            <h3>Lead work ready for the next step</h3>
            <p>Follow-ups, quote approvals, and approved work that should move into Money for cost review.</p>
          </div>
          <div class="ticket-review-list">
            ${[
              ...approvalTickets,
              ...accountingTickets,
              ...due.slice(0, 3).map((item, index) => buildTicketFromQuote(item, index))
            ].slice(0, 4).map((ticket) => renderTicketCard(ticket, true)).join("") || emptyState("No urgent Leads handoffs.")}
          </div>
        </section>
      </div>`;
  }

  function findTicketForBudget(budget = {}, tickets = dashboardTickets()) {
    const pairs = [
      ["job", budget.jobId],
      ["quote", budget.quoteId],
      ["document", budget.invoiceId]
    ].filter(([, id]) => id);
    return tickets.find((ticket) => pairs.some(([type, id]) => {
      return ticket.sourceType === type && String(ticket.sourceId || ticket.id) === String(id);
    })) || null;
  }

  function budgetPanelSortValue(item) {
    const status = item.budget.status;
    const health = item.summary.health || "";
    if (health === "Over Budget" || status === "Over Budget") return 0;
    if (health === "At Risk" || status === "At Risk") return 1;
    if (health === "Watch") return 2;
    if (status === "Ready for Review") return 3;
    return 4;
  }

  function renderMoneyBudgetPanel(data = state.data, tickets = dashboardTickets(data)) {
    const bundle = data.budgets || emptyBudgetBundle();
    const budgets = (bundle.budgets || []).filter((budget) => budget.status !== "Archived");
    const summaries = budgets.map((budget) => ({ budget, summary: budgetSummary(budget) }));
    const active = budgets.filter((budget) => !["Completed", "Archived"].includes(budget.status)).length;
    const atRisk = summaries.filter((item) => ["Watch", "At Risk"].includes(item.summary.health) || item.budget.status === "At Risk").length;
    const overBudget = summaries.filter((item) => item.summary.health === "Over Budget" || item.budget.status === "Over Budget").length;
    const upcomingProfit = summaries
      .filter((item) => !["Completed", "Archived"].includes(item.budget.status))
      .reduce((sum, item) => sum + Number(item.summary.estimatedProfit || 0), 0);
    const reviewItems = summaries
      .sort((a, b) => budgetPanelSortValue(a) - budgetPanelSortValue(b) || String(b.budget.updatedAtRaw || "").localeCompare(String(a.budget.updatedAtRaw || "")))
      .slice(0, 4);
    const setupMessage = !state.budgetsReady && !isDemoMode()
      ? `<p class="money-budget-note">${escapeHtml(state.budgetsError || "Budget records are optional during this rebuild. Money still tracks cost-review tickets even when budget tables are not connected.")}</p>`
      : "";

    return `<section class="money-budget-panel" data-money-budget-panel>
      <div class="ticket-lane-heading">
        <div>
          <h3>Budget and Profitability</h3>
          <p>Budget records stay inside Money and support the same Job Ticket flow, rather than becoming a separate primary tab.</p>
        </div>
        <span>${escapeHtml(String(budgets.length))}</span>
      </div>
      ${setupMessage}
      <div class="money-budget-stats">
        ${budgetMetricCard("Active Budgets", String(active), "Jobs being estimated or tracked")}
        ${budgetMetricCard("At Risk", String(atRisk), "Below target margin", atRisk ? "warning" : "")}
        ${budgetMetricCard("Over Budget", String(overBudget), "Needs review", overBudget ? "danger" : "")}
        ${budgetMetricCard("Upcoming Profit", budgetCurrency(upcomingProfit), "Estimated")}
      </div>
      <div class="money-budget-list">
        ${reviewItems.length ? reviewItems.map(({ budget, summary }) => {
          const ticket = findTicketForBudget(budget, tickets);
          return `<article class="money-budget-item">
            <div>
              <p class="eyebrow">${escapeHtml(budget.serviceType || "Budget")}</p>
              <h4>${escapeHtml(budget.budgetName)}</h4>
              <p>${escapeHtml([budget.clientName, budget.propertyName, budget.jobName].filter(Boolean).join(" / ") || "No linked record")}</p>
            </div>
            <dl>
              <div><dt>Revenue</dt><dd>${budgetCurrency(summary.expectedRevenue)}</dd></div>
              <div><dt>Profit</dt><dd>${budgetCurrency(summary.estimatedProfit)}</dd></div>
              <div><dt>Margin</dt><dd>${budgetPercent(summary.estimatedMargin)}</dd></div>
            </dl>
            <div class="money-budget-actions">
              ${budgetBadge(summary.health || "Healthy", "health")}
              ${ticket ? `<button type="button" class="inline-action" data-action="open-ticket" data-ticket-source="${escapeHtml(ticket.source)}" data-id="${escapeHtml(ticket.id)}">Open Ticket</button>` : `<span>No linked ticket</span>`}
            </div>
          </article>`;
        }).join("") : emptyState("No budget records are connected yet. Approved tickets can still move through Money for cost review.")}
      </div>
    </section>`;
  }

  function renderMoneyNextStepCard({ kicker, value, title, detail, action, actionLabel }) {
    return `<article class="money-next-step-card">
      <span class="home-next-step-kicker">${escapeHtml(kicker)}</span>
      <div class="home-next-step-main">
        <strong>${escapeHtml(String(value))}</strong>
        <div>
          <h4>${escapeHtml(title)}</h4>
          <p>${escapeHtml(detail)}</p>
        </div>
      </div>
      <button type="button" data-action="${escapeHtml(action)}">${escapeHtml(actionLabel)}</button>
    </article>`;
  }

  function renderMoneyCommandCenter({ needsBudget, ownerApproval, fieldComplete, invoiceTickets, unpaidInvoices, overdueInvoices }) {
    const actionQueue = [
      ...invoiceTickets.filter((ticket) => ticket.tone === "watch"),
      ...needsBudget,
      ...ownerApproval,
      ...fieldComplete,
      ...invoiceTickets.filter((ticket) => ticket.tone !== "watch")
    ].slice(0, 5);
    return `<section class="money-command-center" aria-label="Money command center">
      <section class="ticket-lane money-action-queue">
        <div class="ticket-lane-heading">
          <div>
            <p class="eyebrow">Financial Queue</p>
            <h3>Budget, invoice, and payment items</h3>
            <p>Start with overdue invoices, cost-review tickets, owner approvals, and closeout work.</p>
          </div>
          <span>${escapeHtml(String(actionQueue.length))}</span>
        </div>
        <div class="ticket-lane-list">
          ${actionQueue.length ? actionQueue.map((ticket) => renderTicketCard(ticket, true)).join("") : emptyState("No financial review items require attention.")}
        </div>
      </section>
      <aside class="money-next-step-stack">
        <div class="home-next-step-heading">
          <span>Money Handoffs</span>
          <strong>Protect margin</strong>
        </div>
        ${renderMoneyNextStepCard({
          kicker: "Cost",
          value: needsBudget.length,
          title: "Review costs before scheduling",
          detail: "Approved work should have cost, budget, or margin review before it moves forward.",
          action: "go-tickets",
          actionLabel: "Open Tickets"
        })}
        ${renderMoneyNextStepCard({
          kicker: "Invoice",
          value: ownerApproval.length,
          title: "Prepare estimate or invoice",
          detail: "Owner approvals and invoice preparation stay visible before work is scheduled or closed.",
          action: "quick-add-quote",
          actionLabel: "Create Estimate"
        })}
        ${renderMoneyNextStepCard({
          kicker: "Collect",
          value: overdueInvoices.length,
          title: "Payment follow-up",
          detail: "Overdue invoices need a clear reminder, Square sync, or payment note.",
          action: "quick-add-invoice-reminder",
          actionLabel: "Payment Follow-Up"
        })}
        ${renderMoneyNextStepCard({
          kicker: "Close",
          value: fieldComplete.length + unpaidInvoices.length,
          title: "Close the financial record",
          detail: "Check actuals, documents, invoice status, and payment state before closing tickets.",
          action: "go-documents",
          actionLabel: "Open Records"
        })}
      </aside>
    </section>`;
  }

  function renderMoneyWorkspace(data = state.data) {
    const target = qs("[data-money-workspace]");
    if (!target) return;
    const tickets = dashboardTickets(data).filter(ticketIsOpen);
    const needsBudget = tickets.filter((ticket) => ticketInStage(ticket, ["needs_budget", "budget_in_progress"]));
    const ownerApproval = tickets.filter((ticket) => ticketInStage(ticket, ["needs_owner_approval", "invoice_preparation"]));
    const fieldComplete = tickets.filter((ticket) => ticketInStage(ticket, ["field_work_complete", "completion_review", "invoice_review"]));
    const documents = data.documents || [];
    const unpaidInvoices = documents.filter((doc) => doc.type === "invoice" && doc.status !== "paid");
    const overdueInvoices = unpaidInvoices.filter((doc) => doc.dueDateRaw && doc.dueDateRaw < todayKey());
    const invoiceTickets = unpaidInvoices.slice(0, 6).map((doc, index) => ({
      id: doc.id,
      source: "document",
      number: doc.number || ticketNumber("INV", doc.id, index),
      title: doc.type === "invoice" ? "Invoice review" : "Estimate review",
      customer: doc.clientName || "Client not set",
      property: doc.status || "Document status needed",
      detail: doc.squareAmountDueCents !== null ? `${formatCurrency(doc.squareAmountDueCents, doc.squareCurrency)} due` : `$${Number(doc.total || 0).toFixed(2)}`,
      stage: "invoice_review",
      stageLabel: doc.status || "Invoice",
      tone: overdueInvoices.some((item) => item.id === doc.id) ? "watch" : "active",
      lane: "money",
      action: "open-document",
      dateRaw: doc.dueDateRaw || doc.createdAtRaw,
      dateLabel: doc.dueDate || doc.createdAt || "",
      nextAction: doc.squareInvoiceNumber ? "Sync or collect" : "Connect Square invoice",
      ownerLabel: "Money",
      blockers: doc.squareInvoiceNumber ? [] : ["Square invoice #"]
    }));
    target.innerHTML = `
      <div class="ticket-workspace uy-page-prototype money-workspace" data-uy-page-contract="money" data-data-source="documents,invoices,quotes,job_tickets,budgets">
        ${renderWorkspaceSwitcher("documents")}
        <header class="ticket-hero">
          <div>
            <p class="eyebrow">Money</p>
            <h3>Cost review, invoice, collect, close.</h3>
            <p>Review ticket cost readiness, prepare draft invoices, track Square payment state, and close the financial record without splitting the job into a second system.</p>
          </div>
          <div class="ticket-hero-actions">
            ${canManageMoneyWorkflow() ? `<button type="button" data-action="quick-add-quote">Create Estimate</button>` : ""}
            ${canManageMoneyWorkflow() ? `<button type="button" data-action="quick-add-invoice-reminder">Payment Follow-Up</button>` : ""}
          </div>
        </header>
        <section class="ticket-metrics" aria-label="Money ticket summary">
          ${renderTicketMetric(needsBudget.length, "Cost Review", "Tickets needing cost review")}
          ${renderTicketMetric(ownerApproval.length, "Owner Approval", "Cost and invoice prep")}
          ${renderTicketMetric(unpaidInvoices.length, "Open Invoices", "Awaiting payment")}
          ${renderTicketMetric(overdueInvoices.length, "Overdue", "Payment action needed")}
        </section>
        ${renderWorkspaceFocusStrip([
          { kicker: "Budget", value: needsBudget.length, title: "Cost review", detail: "Approved tickets waiting on budget or margin checks." },
          { kicker: "Invoice", value: unpaidInvoices.length, title: "Open invoices", detail: "Quotes, invoices, and Square payment state needing review." },
          { kicker: "Overdue", value: overdueInvoices.length, title: "Payment risk", detail: "Invoices past due and ready for follow-up." }
        ], "Money workspace signals")}
        ${renderMoneyCommandCenter({ needsBudget, ownerApproval, fieldComplete, invoiceTickets, unpaidInvoices, overdueInvoices })}
        ${renderMoneyBudgetPanel(data, tickets)}
        <div class="ticket-lane-grid">
          ${renderTicketColumn("Cost Review Queue", "Approved work that needs internal cost review before scheduling.", needsBudget, "No tickets are waiting for cost review.")}
          ${renderTicketColumn("Owner and Invoice Prep", "Cost approvals and draft invoices required before scheduling.", ownerApproval, "No tickets are waiting on owner approval.")}
          ${renderTicketColumn("Completion Closeout", "Finished work that needs actuals, documents, invoice, and payment review.", fieldComplete, "No completed work is waiting for closeout.")}
        </div>
        <section class="ticket-review-strip">
          <div>
            <p class="eyebrow">Financial Closeout</p>
            <h3>Money items needing review</h3>
            <p>Cost review, invoice preparation, payment follow-up, and completed work waiting on actuals.</p>
          </div>
          <div class="ticket-review-list">
            ${[
              ...needsBudget,
              ...ownerApproval,
              ...fieldComplete,
              ...invoiceTickets
            ].slice(0, 4).map((ticket) => renderTicketCard(ticket, true)).join("") || emptyState("No Money review items require attention.")}
          </div>
        </section>
      </div>`;
  }

  function renderToolsWorkspace(data = state.data) {
    const target = qs("[data-tools-workspace]");
    if (!target) return;
    const rows = dashboardHealthRows();
    const criticalWarnings = dashboardHealthWarnings({ scope: "critical" });
    const supportWarnings = dashboardHealthWarnings({ scope: "support" });
    const documents = data.documents || [];
    const documentation = data.documentation || {};
    const ai = data.groundskeeperAi || {};
    const aiLiveVersion = ai.liveVersion?.publishedAt
      ? formatDateTime(ai.liveVersion.publishedAt)
      : "Not published";
    const documentationCount = Number(documentation.templates?.length || 0) + Number(documentation.submissions?.length || 0);
    const equipmentCount = Number(data.equipmentItems?.length || 0);
    const routeStopsToday = dashboardRouteStopsForDate(data, todayKey()).length;
    const usersCount = Number(data.userProfiles?.length || 0);
    target.innerHTML = `
      <div class="ticket-workspace uy-page-prototype tools-workspace" data-uy-page-contract="tools" data-data-source="equipment,documentation,route_tools,ai,imports,settings">
        ${renderWorkspaceSwitcher("settings")}
        <header class="ticket-hero">
          <div>
            <p class="eyebrow">Tools</p>
            <h3>Support systems stay behind the ticket workflow.</h3>
            <p>Use this room for route support, documents, AI, imports, backups, user access, and diagnostics while the main dashboard stays centered on Job Tickets.</p>
          </div>
          <div class="ticket-hero-actions">
            <button type="button" data-action="refresh-dashboard">Refresh Dashboard</button>
            <button type="button" data-action="copy-dashboard-diagnostics">Copy Diagnostics</button>
          </div>
        </header>
        <section class="ticket-metrics" aria-label="Tools summary">
          ${renderTicketMetric(criticalWarnings.length, "Active Workflow Warnings", "Issues affecting rebuilt workspaces")}
          ${renderTicketMetric(supportWarnings.length, "Support Warnings", "Setup items for hidden support modules")}
          ${renderTicketMetric(documents.length, "Financial Documents", "Quotes, invoices, and records")}
          ${renderTicketMetric(documentationCount, "Forms and Files", "Templates and submissions")}
        </section>
        ${renderWorkspaceFocusStrip([
          { kicker: "Health", value: criticalWarnings.length, title: "Critical warnings", detail: "Issues affecting rebuilt workflow pages." },
          { kicker: "Support", value: supportWarnings.length, title: "Setup warnings", detail: "Optional modules or integrations that need attention." },
          { kicker: "Files", value: documentationCount, title: "Forms and records", detail: "Documentation templates and submissions." }
        ], "Tools workspace signals")}
        <section class="tools-control-grid" aria-label="Dashboard support tools">
          ${renderToolsCard({
            label: "Route Planner",
            detail: "Build the day route, pin stops, and keep route support close to scheduled work.",
            meta: `${routeStopsToday} stops today`,
            primary: "Open Route Planner",
            primaryAction: "go-route-planner"
          })}
          ${renderToolsCard({
            label: "Equipment",
            detail: "Track owned equipment, maintenance, replacement priorities, and hardware recommendations.",
            meta: `${equipmentCount} equipment records`,
            primary: "Open Equipment",
            primaryAction: "go-equipment"
          })}
          ${renderToolsCard({
            label: "Documentation",
            detail: "Manage form templates, submitted paperwork, job photos, and reusable records.",
            meta: `${documentationCount} files or forms`,
            primary: "Open Documentation",
            primaryAction: "go-documentation",
            secondary: "Refresh Forms",
            secondaryAction: "refresh-documentation"
          })}
          ${renderToolsCard({
            label: "Groundskeeper AI",
            detail: "Train and review the public website helper with backend-protected knowledge and rules.",
            meta: `Live version: ${aiLiveVersion}`,
            primary: "Open AI Studio",
            primaryAction: "go-groundskeeper-ai",
            secondary: "Refresh AI",
            secondaryAction: "refresh-groundskeeper-ai"
          })}
          ${renderToolsCard({
            label: "Import, Export & Backups",
            detail: "Move records through CSV, Excel, Google Sheets, PDF reports, and full JSON backups.",
            meta: state.importExportReady ? "Data tools ready" : "Setup may be needed",
            primary: "Open Data Tools",
            primaryAction: "go-import-export",
            secondary: "Full Backup",
            secondaryAction: "export-full-backup"
          })}
          ${renderToolsCard({
            label: "Users & Access",
            detail: "Invite users, manage roles, disable access, and keep profile avatars clean.",
            meta: `${usersCount} dashboard users`,
            primary: "Manage Access",
            primaryAction: "go-settings"
          })}
          ${renderToolsCard({
            label: "Dashboard Health",
            detail: "Copy diagnostics, refresh dashboard data, and separate setup warnings from workflow issues.",
            meta: `${rows.length} diagnostics`,
            primary: "Copy Diagnostics",
            primaryAction: "copy-dashboard-diagnostics",
            secondary: "Refresh Dashboard",
            secondaryAction: "refresh-dashboard"
          })}
        </section>
        <section class="ticket-review-strip tools-health-strip">
          <div>
            <p class="eyebrow">Diagnostics</p>
            <h3>Dashboard health</h3>
            <p>Support warnings are separated from active workflow warnings, so optional modules do not make the whole dashboard look broken.</p>
          </div>
          <div class="tools-health-list">
            ${rows.map(([label, value]) => `
              <div class="tools-health-row">
                <span>${escapeHtml(label)}</span>
                <strong>${escapeHtml(value || "not set")}</strong>
              </div>
            `).join("")}
          </div>
        </section>
        ${supportWarnings.length ? `
          <section class="ticket-lane">
            <div class="ticket-lane-heading">
              <div>
                <h3>Support setup queue</h3>
                <p>These items are retained for admin repair without blocking the rebuilt ticket workflow.</p>
              </div>
              <span>${escapeHtml(String(supportWarnings.length))}</span>
            </div>
            <div class="tools-warning-list">
              ${supportWarnings.slice(0, 8).map((item) => `
                <div class="tools-warning-item">
                  <strong>${escapeHtml(item.name)}</strong>
                  <small>${escapeHtml(item.message || item.detail || "Needs review.")}</small>
                </div>
              `).join("")}
            </div>
          </section>
        ` : ""}
      </div>`;
  }

  function renderToolsCard({ label, detail, meta, primary, primaryAction, secondary, secondaryAction }) {
    return `
      <article class="tools-control-card">
        <div>
          <p class="eyebrow">${escapeHtml(meta || "Support")}</p>
          <h3>${escapeHtml(label)}</h3>
          <p>${escapeHtml(detail)}</p>
        </div>
        <div class="ticket-card-actions">
          <button type="button" data-action="${escapeHtml(primaryAction)}">${escapeHtml(primary)}</button>
          ${secondary && secondaryAction ? `<button type="button" data-action="${escapeHtml(secondaryAction)}">${escapeHtml(secondary)}</button>` : ""}
        </div>
      </article>`;
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
      ["Scheduled", scheduled, "Upcoming work", "pipeline-scheduled.svg"],
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
      const message = "Companies could not load right now. Refresh the dashboard or check Supabase access.";
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
      const message = "Managed properties could not load right now. Refresh the dashboard or check Supabase access.";
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
      const message = "Outreach could not load right now. Refresh the dashboard or check Supabase access.";
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
        ${item ? renderContactQuickActions({
          leadId: item.id,
          leadType: "outreach_prospect",
          name: item.contactName || item.propertyName || "Prospect",
          companyProperty: [item.managementCompany, item.propertyName, item.city].filter(Boolean).join(" / "),
          phone: item.phone,
          email: item.email
        }) : ""}
        <form class="drawer-form outreach-form" data-outreach-form data-id="${escapeHtml(item?.id || "")}" data-duplicate-scope="prospect">
          <div class="duplicate-warning span-full" data-duplicate-warning data-duplicate-scope="prospect" hidden></div>
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
        ${item ? `<div data-call-outcome-slot></div>${renderActivityTimeline({
          leadId: item.id,
          leadType: "outreach_prospect",
          name: item.contactName || item.propertyName || "Prospect",
          companyProperty: [item.managementCompany, item.propertyName, item.city].filter(Boolean).join(" / "),
          phone: item.phone,
          email: item.email
        })}` : ""}
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
        ${renderContactQuickActions({
          leadId: company.id,
          leadType: "outreach_company",
          name: company.contact || company.company,
          companyProperty: [company.company, company.serviceArea || company.city].filter(Boolean).join(" / "),
          phone: company.phone,
          email: company.email
        })}
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
        ${renderActivityTimeline({
          leadId: company.id,
          leadType: "outreach_company",
          name: company.company,
          companyProperty: [company.contact, company.serviceArea || company.city].filter(Boolean).join(" / "),
          phone: company.phone,
          email: company.email
        })}
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

  function openOutreachPropertyCreateDrawer() {
    if (!els.detailDrawer || !els.detailContent) return;
    openDetailDrawer();
    els.detailContent.innerHTML = `
      <div class="drawer-content outreach-drawer">
        <p class="eyebrow">Managed Property</p>
        <h3>Add Property</h3>
        <form class="drawer-form outreach-form" data-outreach-property-quick-form data-duplicate-scope="property">
          <div class="duplicate-warning span-full" data-duplicate-warning data-duplicate-scope="property" hidden></div>
          <label>Property name<input name="property_name" placeholder="Example: Cedar Court Apartments"></label>
          <label>Company<input name="company" placeholder="Management company or owner group"></label>
          <label>Address<input name="address" placeholder="Street address" autocomplete="street-address" data-address-autocomplete></label>
          <label>City<input name="city" placeholder="City or service area"></label>
          <label>Neighborhood<input name="neighborhood" placeholder="Neighborhood / location notes"></label>
          <label class="span-full">Notes<textarea name="notes" rows="4" placeholder="Visible needs, access notes, contact context..."></textarea></label>
          <div class="drawer-actions span-full">
            <button type="submit">${buttonContent("Add Property", "new-outreach-prospect")}</button>
            <button class="inline-action" type="button" data-action="new-outreach-prospect">${buttonContent("Add as Prospect Instead", "new-outreach-prospect")}</button>
          </div>
        </form>
      </div>
    `;
  }

  function openOutreachPropertyDrawer(id) {
    const property = state.data.outreachProperties.find((item) => item.id === id);
    if (!property || !els.detailDrawer || !els.detailContent) return;
    const company = state.data.outreachCompanies.find((item) => item.id === property.companyId || normalizeDedupeKey(item.company) === normalizeDedupeKey(property.company));
    const quickContext = {
      leadId: company?.id || property.id,
      leadType: company ? "outreach_company" : "lead",
      name: property.propertyName || property.address || "Managed property",
      companyProperty: [property.company, property.address, property.city].filter(Boolean).join(" / "),
      phone: company?.phone || "",
      email: company?.email || ""
    };
    openDetailDrawer();
    els.detailContent.innerHTML = `
      <div class="drawer-content outreach-drawer">
        <p class="eyebrow">Managed Property</p>
        <h3>${escapeHtml(property.propertyName)}</h3>
        ${renderContactQuickActions(quickContext)}
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
        ${renderActivityTimeline(quickContext)}
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
      els.documents.innerHTML = emptyState("Documents could not load right now. Refresh the dashboard or check Supabase access.");
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

  function documentationStatusBadge(status) {
    const safeStatus = normalizeDocumentationStatus(status);
    return `<span class="status status-${slug(safeStatus)}">${escapeHtml(safeStatus)}</span>`;
  }

  function documentationTargetLine(item = {}) {
    return [
      item.propertyName ? `Property: ${item.propertyName}` : "",
      item.jobName ? `Job: ${item.jobName}` : "",
      item.scheduledVisitName ? `Visit: ${item.scheduledVisitName}` : "",
      item.equipmentName ? `Equipment: ${item.equipmentName}` : "",
      item.contactName ? `Contact: ${item.contactName}` : ""
    ].filter(Boolean).join(" / ") || "General company record";
  }

  function documentationFileExtensionFromName(fileName = "", mimeType = "") {
    const extension = String(fileName || "").toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
    if (extension) return extension.toUpperCase();
    if (String(mimeType || "").includes("pdf")) return "PDF";
    if (String(mimeType || "").includes("wordprocessing")) return "DOCX";
    if (String(mimeType || "").includes("spreadsheet")) return "XLSX";
    if (String(mimeType || "").includes("csv")) return "CSV";
    if (String(mimeType || "").includes("image/")) return String(mimeType).split("/").pop().toUpperCase();
    return "File";
  }

  function documentationFileSizeLabel(bytes) {
    const size = Number(bytes || 0);
    if (!size) return "Size unknown";
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(size < 10240 ? 1 : 0)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  function buildDocumentationArchive(documentation = normalizeDocumentationBundle()) {
    const templateItems = (documentation.templates || [])
      .filter((item) => item.filePath)
      .map((item) => ({
        id: `template:${item.id}`,
        recordId: item.id,
        type: "Template",
        title: item.name,
        category: item.category,
        status: item.status || "Active",
        related: "Master form",
        dateRaw: item.updatedAtRaw,
        dateLabel: item.updatedAt || "No date",
        fileBucket: item.fileBucket || "documentation-templates",
        filePath: item.filePath,
        fileName: item.fileName,
        mimeType: item.mimeType,
        fileSizeBytes: item.fileSizeBytes,
        notes: item.instructions
      }));

    const submissionItems = (documentation.submissions || [])
      .filter((item) => item.filePath)
      .map((item) => ({
        id: `submission:${item.id}`,
        recordId: item.id,
        type: "Submission",
        title: item.templateName,
        category: item.category,
        status: item.status,
        related: documentationTargetLine(item),
        dateRaw: item.submittedAtRaw,
        dateLabel: item.submittedAt || "No date",
        fileBucket: item.fileBucket || "documentation-submissions",
        filePath: item.filePath,
        fileName: item.fileName,
        mimeType: item.mimeType,
        fileSizeBytes: item.fileSizeBytes,
        notes: item.notes,
        person: item.completedBy
      }));

    const attachmentItems = (documentation.attachments || [])
      .filter((item) => item.filePath)
      .map((item) => ({
        id: `attachment:${item.id}`,
        recordId: item.id,
        type: "Attachment",
        title: item.fileName || item.attachmentType.replace(/_/g, " "),
        category: item.category,
        status: item.status || "Submitted",
        related: documentationTargetLine(item),
        dateRaw: item.createdAtRaw,
        dateLabel: item.createdAt || "No date",
        fileBucket: item.fileBucket || "documentation-submissions",
        filePath: item.filePath,
        fileName: item.fileName,
        mimeType: item.mimeType,
        fileSizeBytes: item.fileSizeBytes,
        notes: item.attachmentType.replace(/_/g, " "),
        person: item.completedBy
      }));

    return [...templateItems, ...submissionItems, ...attachmentItems]
      .sort((a, b) => String(b.dateRaw || "").localeCompare(String(a.dateRaw || "")));
  }

  function documentationArchiveMatches(item = {}) {
    const search = String(state.documentationSearch || "").trim().toLowerCase();
    const type = state.documentationTypeFilter || "All";
    const status = state.documentationStatusFilter || "All";
    const category = state.documentationCategoryFilter || "All";
    if (type !== "All" && item.type !== type) return false;
    if (status !== "All" && String(item.status || "") !== status) return false;
    if (category !== "All" && normalizeDocumentationCategory(item.category) !== category) return false;
    if (!search) return true;
    return [
      item.title,
      item.type,
      item.category,
      item.status,
      item.related,
      item.person,
      item.fileName,
      item.notes
    ].some((value) => String(value || "").toLowerCase().includes(search));
  }

  function documentationMatches(item = {}) {
    const search = String(state.documentationSearch || "").trim().toLowerCase();
    const status = state.documentationStatusFilter || "All";
    const category = state.documentationCategoryFilter || "All";
    if (status !== "All" && String(item.status || "") !== status) return false;
    if (category !== "All" && normalizeDocumentationCategory(item.category) !== category) return false;
    if (!search) return true;
    return [
      item.templateName,
      item.name,
      item.category,
      item.status,
      item.assignedTo,
      item.propertyName,
      item.contactName,
      item.jobName,
      item.equipmentName,
      item.completedBy,
      item.fileName,
      item.notes,
      item.instructions,
      item.detail
    ].some((value) => String(value || "").toLowerCase().includes(search));
  }

  function documentationMetrics(documentation) {
    const assignments = documentation.assignments || [];
    const submissions = documentation.submissions || [];
    const templates = documentation.templates || [];
    const archiveItems = buildDocumentationArchive(documentation);
    return [
      ["Archive Files", archiveItems.length, "Downloadable records"],
      ["Assigned", assignments.filter((item) => !["Approved", "Archived"].includes(item.status)).length, "Open forms"],
      ["Due Soon", assignments.filter((item) => item.dueDateRaw && item.dueDateRaw <= addDaysKey(todayKey(), 7) && item.status !== "Approved").length, "Next 7 days"],
      ["Needs Review", submissions.filter((item) => item.status === "Submitted").length, "Owner action"],
      ["Templates", templates.filter((item) => item.status !== "Archived").length, "Active library"]
    ];
  }

  function renderDocumentationMetric([label, value, detail]) {
    return `<article class="documentation-metric"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span><small>${escapeHtml(detail)}</small></article>`;
  }

  function renderDocumentationAssignmentCard(item) {
    return `<article class="documentation-record">
      <div class="documentation-record-head">
        <div>
          <p class="eyebrow">${escapeHtml(item.category)}</p>
          <h4>${escapeHtml(item.templateName)}</h4>
          <p>${escapeHtml(documentationTargetLine(item))}</p>
        </div>
        ${documentationStatusBadge(item.status)}
      </div>
      <div class="documentation-record-meta">
        <span>Due ${escapeHtml(item.dueDate || "No due date")}</span>
        <span>${escapeHtml(item.priority)} priority</span>
        <span>Assigned to ${escapeHtml(item.assignedTo)}</span>
        <span>${item.required ? "Required" : "Optional"}${item.recurring ? " / Recurring" : ""}</span>
      </div>
      ${item.instructions ? `<p class="item-body">${escapeHtml(item.instructions)}</p>` : ""}
      <div class="documentation-record-actions">
        ${actionButton("Open Form", "open-documentation-form", item.id)}
        <button class="inline-action" type="button" data-action="download-documentation-template" data-id="${escapeHtml(item.templateId)}">${buttonContent("Download Template", "download-documentation-template")}</button>
        <button class="inline-action" type="button" data-action="upload-documentation-submission" data-id="${escapeHtml(item.id)}">${buttonContent("Upload Completed Form", "open-document")}</button>
      </div>
    </article>`;
  }

  function renderDocumentationSubmissionCard(item) {
    return `<article class="documentation-record">
      <div class="documentation-record-head">
        <div>
          <p class="eyebrow">${escapeHtml(item.category)} / Version ${escapeHtml(item.templateVersion)}</p>
          <h4>${escapeHtml(item.templateName)}</h4>
          <p>${escapeHtml(documentationTargetLine(item))}</p>
        </div>
        ${documentationStatusBadge(item.status)}
      </div>
      <div class="documentation-record-meta">
        <span>Completed by ${escapeHtml(item.completedBy)}</span>
        <span>Submitted ${escapeHtml(item.submittedAt || "Not submitted")}</span>
        <span>${escapeHtml(item.fileName || "No file attached")}</span>
        ${item.reviewer ? `<span>Reviewed by ${escapeHtml(item.reviewer)}</span>` : ""}
      </div>
      ${item.notes ? `<p class="item-body">${escapeHtml(item.notes)}</p>` : ""}
      ${item.correctionNotes ? `<p class="job-overdue-note">${escapeHtml(item.correctionNotes)}</p>` : ""}
      <div class="documentation-record-actions">
        <button class="inline-action" type="button" data-action="preview-documentation-submission" data-id="${escapeHtml(item.id)}">${buttonContent("Preview", "open-document")}</button>
        ${canReviewDocumentation() ? `<button class="inline-action" type="button" data-action="approve-documentation-submission" data-id="${escapeHtml(item.id)}">${buttonContent("Approve", "approve-documentation-submission")}</button>` : ""}
        ${canReviewDocumentation() ? `<button class="inline-action" type="button" data-action="request-documentation-corrections" data-id="${escapeHtml(item.id)}">${buttonContent("Request Corrections", "request-documentation-corrections")}</button>` : ""}
        ${canReviewDocumentation() ? `<button class="inline-action danger-action" type="button" data-action="reject-documentation-submission" data-id="${escapeHtml(item.id)}">${buttonContent("Reject", "reject-documentation-submission")}</button>` : ""}
      </div>
    </article>`;
  }

  function renderDocumentationTemplateCard(item) {
    return `<article class="documentation-record">
      <div class="documentation-record-head">
        <div>
          <p class="eyebrow">${escapeHtml(item.category)}</p>
          <h4>${escapeHtml(item.name)}</h4>
          <p>${escapeHtml(item.versionLabel)}${item.fileName ? ` / ${item.fileName}` : ""}</p>
        </div>
        <span class="status status-${slug(item.status)}">${escapeHtml(item.status)}</span>
      </div>
      <div class="documentation-record-meta">
        <span>${item.requiresPhotos ? "Photos required" : "Photos optional"}</span>
        <span>${item.requiresSignature ? "Signature required" : "No signature required"}</span>
        <span>${item.isRecurring ? `Recurring: ${item.recurrenceRule || "Yes"}` : "One-time template"}</span>
        <span>Roles: ${escapeHtml(item.allowedRoles.join(", "))}</span>
      </div>
      ${item.instructions ? `<p class="item-body">${escapeHtml(item.instructions)}</p>` : ""}
      <div class="documentation-record-actions">
        <button class="inline-action" type="button" data-action="duplicate-documentation-template" data-id="${escapeHtml(item.id)}">${buttonContent("Duplicate", "open-document")}</button>
        <button class="inline-action" type="button" data-action="assign-documentation-template" data-id="${escapeHtml(item.id)}">${buttonContent("Assign", "create-reminder")}</button>
        <button class="inline-action danger-action" type="button" data-action="delete-documentation-template" data-id="${escapeHtml(item.id)}">${buttonContent("Delete", "delete-document")}</button>
      </div>
    </article>`;
  }

  function renderDocumentationArchiveItem(item) {
    const hasFile = Boolean(item.fileBucket && item.filePath);
    const fileType = documentationFileExtensionFromName(item.fileName, item.mimeType);
    const sizeLabel = documentationFileSizeLabel(item.fileSizeBytes);
    return `<article class="documentation-record documentation-archive-row">
      <div class="documentation-record-head">
        <div>
          <p class="eyebrow">${escapeHtml(item.type)} / ${escapeHtml(item.category)}</p>
          <h4>${escapeHtml(item.title || item.fileName || "Untitled form")}</h4>
          <p>${escapeHtml(item.related || "General company record")}</p>
        </div>
        ${documentationStatusBadge(item.status)}
      </div>
      <div class="documentation-record-meta">
        <span>${escapeHtml(fileType)}</span>
        <span>${escapeHtml(sizeLabel)}</span>
        <span>${escapeHtml(item.dateLabel || "No date")}</span>
        ${item.person ? `<span>${escapeHtml(item.person)}</span>` : ""}
        ${item.fileName ? `<span>${escapeHtml(item.fileName)}</span>` : ""}
      </div>
      ${item.notes ? `<p class="item-body">${escapeHtml(item.notes)}</p>` : ""}
      <div class="documentation-record-actions">
        ${hasFile
          ? `<button class="inline-action" type="button" data-action="open-documentation-archive-file" data-archive-id="${escapeHtml(item.id)}">${buttonContent("Open / Download", "open-document")}</button>`
          : `<span class="status status-archived">No file attached</span>`}
      </div>
    </article>`;
  }

  function renderDocumentationAuditRow(item) {
    return `<article class="documentation-audit-row">
      <span>${escapeHtml(item.createdAt || "No date")}</span>
      <strong>${escapeHtml(item.action.replace(/_/g, " "))}</strong>
      <p>${escapeHtml(item.templateName || item.entityType)}${item.detail ? ` / ${escapeHtml(item.detail)}` : ""}</p>
      <small>${escapeHtml(item.actorName)}</small>
    </article>`;
  }

  function documentationTemplateOptions() {
    const templates = state.data.documentation.templates || [];
    const options = templates.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)} / ${escapeHtml(item.category)}</option>`).join("");
    return `<option value="">Choose template...</option>${options}`;
  }

  function renderDocumentationAssignmentForm() {
    return `<section class="documentation-card documentation-form-card">
      <div class="panel-heading"><h3>Assign a form</h3><p>Create a required or optional documentation task for a user, property, job, or equipment record.</p></div>
      <form class="documentation-form" data-documentation-assignment-form>
        <select name="template_id">${documentationTemplateOptions()}</select>
        <input name="template_name" placeholder="Or enter custom form name">
        <input name="assigned_to_name" placeholder="Assigned person">
        <input name="assigned_to_email" type="email" placeholder="Assigned email">
        <input name="property_name" placeholder="Property / location">
        <input name="job_name" placeholder="Job / scheduled visit">
        <input name="equipment_name" placeholder="Equipment record">
        <input name="due_date" type="date" aria-label="Due date">
        <select name="priority"><option>Normal</option><option>High</option><option>Low</option></select>
        <textarea name="instructions" placeholder="Instructions, photo requirements, correction notes..."></textarea>
        <label class="compact-check"><input type="checkbox" name="required" checked> Required form</label>
        <button type="submit"><span class="button-icon" aria-hidden="true">+</span><span>Assign Form</span></button>
      </form>
    </section>`;
  }

  function renderDocumentationTemplateForm() {
    if (!canManageDocumentationTemplates()) {
      return `<section class="documentation-card">${emptyState("Only Owner and Admin users can upload or change master templates.")}</section>`;
    }
    const categoryOptions = DOCUMENTATION_CATEGORIES.map((category) => `<option>${escapeHtml(category)}</option>`).join("");
    return `<section class="documentation-card documentation-template-manager" data-documentation-template-manager>
      <div class="panel-heading"><h3>Upload Form</h3><p>Add a reusable company form, checklist, inspection, or report to the Documentation library.</p></div>
      <form class="documentation-form" data-documentation-template-form>
        <input name="name" placeholder="Template name" required>
        <select name="category">${categoryOptions}</select>
        <input name="file_name" placeholder="Optional existing storage path or file name">
        <input name="template_file" type="file" accept=".pdf,.docx,.jpg,.jpeg,.png,.webp,.xlsx,.csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv">
        <textarea name="instructions" placeholder="Instructions for completing this form"></textarea>
        <details class="documentation-advanced">
          <summary>Advanced Options</summary>
          <div class="documentation-advanced-grid">
            <label>Allowed roles <input name="allowed_roles" value="owner,admin,manager,staff,worker"></label>
            <label>Version <input name="current_version" type="number" min="1" value="1"></label>
            <label>Recurrence <input name="recurrence_rule" placeholder="Weekly, Monthly, Every 30 days..."></label>
            <label class="compact-check"><input type="checkbox" name="requires_signature"> Signature required</label>
            <label class="compact-check"><input type="checkbox" name="requires_photos"> Photos required</label>
            <label class="compact-check"><input type="checkbox" name="is_recurring"> Recurring form</label>
            <label class="compact-check"><input type="checkbox" name="required_by_default"> Required by default</label>
          </div>
        </details>
        <button type="submit"><span class="button-icon" aria-hidden="true">+</span><span>Upload Form to Library</span></button>
      </form>
    </section>`;
  }

  function renderDocumentation(data = state.data) {
    if (!els.documentationMain) return;
    const documentation = data.documentation || normalizeDocumentationBundle();
    const view = DOCUMENTATION_VIEW_LABELS[state.documentationView] ? state.documentationView : DOCUMENTATION_DEFAULT_VIEW;
    state.documentationView = view;

    if (els.documentationStatus) {
      els.documentationStatus.innerHTML = state.documentationReady
        ? `<span>Private documentation tables connected. Use Supabase Storage buckets for templates and submissions.</span><span>${escapeHtml(documentation.assignments.length)} assigned / ${escapeHtml(documentation.submissions.length)} submitted / ${escapeHtml(documentation.templates.length)} templates</span>`
        : `<span>Documentation could not load right now. Refresh the dashboard, then check Supabase/RLS if it stays down.</span><span>${escapeHtml(state.documentationError || "Demo mode still shows the intended workflow.")}</span>`;
    }
    if (els.documentationSearch && els.documentationSearch.value !== state.documentationSearch) els.documentationSearch.value = state.documentationSearch;
    if (els.documentationTypeFilter && els.documentationTypeFilter.value !== state.documentationTypeFilter) els.documentationTypeFilter.value = state.documentationTypeFilter;
    if (els.documentationStatusFilter && els.documentationStatusFilter.value !== state.documentationStatusFilter) els.documentationStatusFilter.value = state.documentationStatusFilter;
    if (els.documentationCategoryFilter && els.documentationCategoryFilter.value !== state.documentationCategoryFilter) els.documentationCategoryFilter.value = state.documentationCategoryFilter;
    qsa("[data-documentation-view]").forEach((button) => {
      const isActive = button.dataset.documentationView === view;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    qsa("[data-documentation-template-admin]").forEach((node) => {
      node.hidden = !canManageDocumentationTemplates();
    });

    const metrics = `<div class="documentation-metrics">${documentationMetrics(documentation).map(renderDocumentationMetric).join("")}</div>`;
    if (view === "archive") {
      const archiveItems = buildDocumentationArchive(documentation).filter(documentationArchiveMatches);
      els.documentationMain.innerHTML = `${metrics}<section class="documentation-card documentation-archive-card"><div class="panel-heading"><h3>Forms Archive</h3><p>Downloadable templates, submitted forms, and supporting attachments in one searchable archive.</p></div><div class="documentation-list">${archiveItems.length ? archiveItems.map(renderDocumentationArchiveItem).join("") : emptyState("No archived form files match this view.")}</div></section>`;
      return;
    }
    if (view === "upload") {
      const recentTemplates = documentation.templates.slice(0, 5);
      els.documentationMain.innerHTML = `${metrics}<div class="documentation-grid">${renderDocumentationTemplateForm()}<section class="documentation-card"><div class="panel-heading"><h3>Recent Uploads</h3><p>The latest forms available in the template library.</p></div><div class="documentation-list">${recentTemplates.length ? recentTemplates.map(renderDocumentationTemplateCard).join("") : emptyState("No form templates have been uploaded yet.")}</div></section></div>`;
      return;
    }
    if (view === "assign" || view === "forms") {
      const assignments = documentation.assignments.filter(documentationMatches);
      els.documentationMain.innerHTML = `${metrics}<div class="documentation-grid">${renderDocumentationAssignmentForm()}<section class="documentation-card"><div class="panel-heading"><h3>Assigned Forms</h3><p>Assigned forms, due dates, priority, and next action.</p></div><div class="documentation-list">${assignments.length ? assignments.map(renderDocumentationAssignmentCard).join("") : emptyState("No assigned forms match this view.")}</div></section></div>`;
      return;
    }
    if (view === "submitted") {
      const submissions = documentation.submissions.filter(documentationMatches);
      els.documentationMain.innerHTML = `${metrics}<section class="documentation-card"><div class="panel-heading"><h3>Submitted Forms</h3><p>Review completed forms, preview files, approve, reject, or request corrections.</p></div><div class="documentation-list">${submissions.length ? submissions.map(renderDocumentationSubmissionCard).join("") : emptyState("No submitted forms match this view.")}</div></section>`;
      return;
    }
    if (view === "templates") {
      const templates = documentation.templates.filter(documentationMatches);
      els.documentationMain.innerHTML = `${metrics}<section class="documentation-card"><div class="panel-heading"><h3>Template Library</h3><p>Reusable company forms and checklists with version labels and role access.</p></div><div class="documentation-list">${templates.length ? templates.map(renderDocumentationTemplateCard).join("") : emptyState("No templates match this view.")}</div></section>`;
      return;
    }
    const audit = documentation.audit.filter(documentationMatches);
    els.documentationMain.innerHTML = `${metrics}<section class="documentation-card"><div class="panel-heading"><h3>Audit History</h3><p>Template uploads, assignments, draft saves, submissions, review decisions, corrections, and file replacement history.</p></div><div class="documentation-audit-list">${audit.length ? audit.map(renderDocumentationAuditRow).join("") : emptyState("No documentation audit records yet.")}</div></section>`;
  }

  function budgetCurrency(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: Math.abs(Number(value || 0)) >= 1000 ? 0 : 2
    }).format(Number(value || 0));
  }

  function budgetPercent(value) {
    const number = Number(value || 0);
    return `${Number.isFinite(number) ? number.toFixed(1) : "0.0"}%`;
  }

  function budgetBadge(value, type = "status") {
    const label = value || "Draft";
    return `<span class="budget-badge budget-badge-${escapeHtml(slug(type))} budget-badge-${escapeHtml(slug(label))}">${escapeHtml(label)}</span>`;
  }

  function budgetOption(value, label, selectedValue) {
    return `<option value="${escapeHtml(value)}"${String(value) === String(selectedValue || "") ? " selected" : ""}>${escapeHtml(label || value)}</option>`;
  }

  function budgetSelectOptions(values, selectedValue = "", firstLabel = "") {
    const first = firstLabel ? `<option value="All">${escapeHtml(firstLabel)}</option>` : "";
    return `${first}${values.map((value) => budgetOption(value, value, selectedValue)).join("")}`;
  }

  function budgetLinkedOptions(items, selectedValue = "", emptyLabel = "None") {
    return `<option value="">${escapeHtml(emptyLabel)}</option>${items.map((item) => budgetOption(item.id, item.label, selectedValue)).join("")}`;
  }

  function budgetClientLabel(client) {
    return [client.name, client.company, client.property].filter(Boolean).join(" / ") || client.email || "Unnamed client";
  }

  function budgetMetricCard(label, value, detail, tone = "") {
    return `<article class="budget-metric ${tone ? `budget-metric-${escapeHtml(slug(tone))}` : ""}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(detail || "")}</small>
    </article>`;
  }

  function filteredBudgets() {
    const budgets = activeBudgetBundle().budgets;
    return budgets.filter((budget) => {
      const summary = budgetSummary(budget);
      const date = budget.proposedStartDateRaw || budget.proposedCompletionDateRaw || "";
      const matchesStatus = state.budgetStatusFilter === "All" || budget.status === state.budgetStatusFilter;
      const matchesJobStatus = state.budgetJobStatusFilter === "All" || budget.jobStatus === state.budgetJobStatusFilter;
      const matchesClient = state.budgetClientFilter === "All" || budget.clientId === state.budgetClientFilter || budget.clientName === state.budgetClientFilter;
      const matchesService = state.budgetServiceFilter === "All" || budget.serviceType === state.budgetServiceFilter;
      const matchesStart = !state.budgetDateStart || !date || date >= state.budgetDateStart;
      const matchesEnd = !state.budgetDateEnd || !date || date <= state.budgetDateEnd;
      const matchesQuery = matchesSearchValues([
        budget.budgetName,
        budget.jobName,
        budget.clientName,
        budget.propertyName,
        budget.serviceType,
        budget.status,
        budget.jobStatus,
        budget.notes,
        summary.health
      ], state.budgetSearch);
      return matchesStatus && matchesJobStatus && matchesClient && matchesService && matchesStart && matchesEnd && matchesQuery;
    }).sort((a, b) => String(b.updatedAtRaw || "").localeCompare(String(a.updatedAtRaw || "")));
  }

  function populateBudgetControls(data = state.data) {
    const bundle = activeBudgetBundle();
    const clientItems = data.contacts.map((client) => ({ id: client.id, label: budgetClientLabel(client) }));
    const quoteItems = data.submissions.map((quote) => ({ id: quote.id, label: `${quote.name} / ${quote.service}` }));
    const jobItems = data.jobs.map((job) => ({ id: job.id, label: `${job.site} / ${job.service} / ${job.date}` }));
    const invoiceItems = data.documents.map((doc) => ({ id: doc.id, label: `${doc.number} / ${doc.clientName} / ${budgetCurrency(doc.total)}` }));
    const clientFilterValues = [...new Set(bundle.budgets.map((budget) => budget.clientId || budget.clientName).filter(Boolean))];
    const serviceValues = [...new Set(bundle.budgets.map((budget) => budget.serviceType).filter(Boolean))].sort();

    if (els.budgetStatusFilter) els.budgetStatusFilter.innerHTML = budgetSelectOptions(BUDGET_STATUSES, state.budgetStatusFilter, "All Budget Statuses");
    if (els.budgetJobStatusFilter) els.budgetJobStatusFilter.innerHTML = budgetSelectOptions(BUDGET_JOB_STATUSES, state.budgetJobStatusFilter, "All Job Statuses");
    if (els.budgetClientFilter) els.budgetClientFilter.innerHTML = budgetSelectOptions(clientFilterValues, state.budgetClientFilter, "All Clients");
    if (els.budgetServiceFilter) els.budgetServiceFilter.innerHTML = budgetSelectOptions(serviceValues, state.budgetServiceFilter, "All Services");
    if (els.budgetJobOptions) els.budgetJobOptions.innerHTML = budgetLinkedOptions(jobItems, "", "No job linked yet");
    if (els.budgetQuoteOptions) els.budgetQuoteOptions.innerHTML = budgetLinkedOptions(quoteItems, "", "No quote linked");
    if (els.budgetInvoiceOptions) els.budgetInvoiceOptions.innerHTML = budgetLinkedOptions(invoiceItems, "", "No invoice linked");
    if (els.budgetClientOptions) els.budgetClientOptions.innerHTML = budgetLinkedOptions(clientItems, "", "No client linked");
    if (els.budgetStatusOptions) els.budgetStatusOptions.innerHTML = BUDGET_STATUSES.map((status) => budgetOption(status, status, "Draft")).join("");
    if (els.budgetLineBudgetOptions) {
      els.budgetLineBudgetOptions.innerHTML = bundle.budgets.map((budget) => budgetOption(budget.id, budget.budgetName, state.selectedBudgetId || selectedBudget()?.id || "")).join("");
    }
  }

  function fillBudgetForm(budget = null) {
    if (!els.budgetForm) return;
    const form = els.budgetForm;
    form.elements.id.value = budget?.id || "";
    form.elements.budget_name.value = budget?.budgetName || "";
    form.elements.job_id.value = budget?.jobId || "";
    form.elements.quote_id.value = budget?.quoteId || "";
    form.elements.invoice_id.value = budget?.invoiceId || "";
    form.elements.client_id.value = budget?.clientId || "";
    form.elements.property_name.value = budget?.propertyName || "";
    form.elements.service_type.value = budget?.serviceType || "";
    form.elements.status.value = budget?.status || "Draft";
    form.elements.job_status.value = budget?.jobStatus || "Not Scheduled";
    form.elements.target_margin_percent.value = budget?.targetMarginPercent ?? activeBudgetBundle().settings.default_target_margin;
    form.elements.proposed_start_date.value = budget?.proposedStartDateRaw || "";
    form.elements.proposed_completion_date.value = budget?.proposedCompletionDateRaw || "";
    form.elements.job_description.value = budget?.jobDescription || "";
    form.elements.base_quoted_price.value = budget?.baseQuotedPrice || "";
    form.elements.approved_addons.value = budget?.approvedAddons || "";
    form.elements.discounts.value = budget?.discounts || "";
    form.elements.taxes.value = budget?.taxes || "";
    form.elements.other_revenue.value = budget?.otherRevenue || "";
    form.elements.final_invoiced_revenue.value = budget?.finalInvoicedRevenue || "";
    form.elements.amount_paid.value = budget?.amountPaid || "";
    form.elements.notes.value = budget?.notes || "";
  }

  function resetBudgetForm() {
    if (!els.budgetForm) return;
    els.budgetForm.reset();
    fillBudgetForm(null);
    if (els.budgetLineForm) {
      els.budgetLineForm.reset();
      if (els.budgetLineForm.elements.budget_id) {
        els.budgetLineForm.elements.budget_id.value = selectedBudget()?.id || "";
      }
    }
  }

  function fillBudgetSettingsForm() {
    if (!els.budgetSettingsForm) return;
    const settings = activeBudgetBundle().settings || normalizeBudgetSettings();
    Object.keys(BUDGET_DEFAULT_SETTINGS).forEach((key) => {
      if (els.budgetSettingsForm.elements[key]) {
        els.budgetSettingsForm.elements[key].value = settings[key] ?? BUDGET_DEFAULT_SETTINGS[key];
      }
    });
  }

  function renderBudgetMetrics() {
    if (!els.budgetMetrics) return;
    const budgets = activeBudgetBundle().budgets.filter((budget) => budget.status !== "Archived");
    const summaries = budgets.map((budget) => ({ budget, summary: budgetSummary(budget) }));
    const totalRevenue = summaries.reduce((total, item) => total + Number(item.summary.expectedRevenue || 0), 0);
    const totalProfit = summaries.reduce((total, item) => total + Number(item.summary.estimatedProfit || 0), 0);
    const activeMargins = summaries.filter((item) => item.summary.expectedRevenue).map((item) => Number(item.summary.estimatedMargin || 0));
    const averageMargin = activeMargins.length ? activeMargins.reduce((total, value) => total + value, 0) / activeMargins.length : 0;
    const atRisk = summaries.filter((item) => ["At Risk", "Watch"].includes(item.summary.health) || item.budget.status === "At Risk").length;
    const overBudget = summaries.filter((item) => item.summary.health === "Over Budget" || item.budget.status === "Over Budget").length;
    const missingActuals = summaries.filter((item) => item.budget.status === "Completed" && Number(item.summary.totalActualCost || 0) === 0).length;
    els.budgetMetrics.innerHTML = [
      budgetMetricCard("Estimated Revenue", budgetCurrency(totalRevenue), "Across active budgets"),
      budgetMetricCard("Estimated Profit", budgetCurrency(totalProfit), "Revenue minus estimated costs"),
      budgetMetricCard("Average Margin", budgetPercent(averageMargin), "Estimated margin"),
      budgetMetricCard("Jobs At Risk", String(atRisk), "Below target or warning", atRisk ? "warning" : ""),
      budgetMetricCard("Over Budget", String(overBudget), "Actuals exceed budget", overBudget ? "danger" : ""),
      budgetMetricCard("Missing Actuals", String(missingActuals), "Completed jobs needing costs", missingActuals ? "warning" : "")
    ].join("");
  }

  function renderBudgetRow(budget) {
    const summary = budgetSummary(budget);
    return `<article class="budget-record${budget.id === state.selectedBudgetId ? " is-selected" : ""}">
      <div class="budget-record-main">
        <div>
          <p class="eyebrow">${escapeHtml(budget.serviceType || "Job budget")}</p>
          <h3>${escapeHtml(budget.budgetName)}</h3>
          <p>${escapeHtml([budget.clientName, budget.propertyName, budget.jobName].filter(Boolean).join(" / ") || "No linked job yet")}</p>
        </div>
        <div class="budget-record-badges">
          ${budgetBadge(budget.status)}
          ${budgetBadge(summary.health || "Healthy", "health")}
        </div>
      </div>
      <dl class="budget-record-stats">
        <div><dt>Revenue</dt><dd>${budgetCurrency(summary.expectedRevenue)}</dd></div>
        <div><dt>Estimated Cost</dt><dd>${budgetCurrency(summary.totalEstimatedCost)}</dd></div>
        <div><dt>Estimated Profit</dt><dd>${budgetCurrency(summary.estimatedProfit)}</dd></div>
        <div><dt>Estimated Margin</dt><dd>${budgetPercent(summary.estimatedMargin)}</dd></div>
        <div><dt>Actual Cost</dt><dd>${budgetCurrency(summary.totalActualCost)}</dd></div>
        <div><dt>Actual Margin</dt><dd>${budgetPercent(summary.actualMargin)}</dd></div>
      </dl>
      <div class="budget-record-footer">
        <span>Scheduled: ${escapeHtml(budget.proposedStartDate || "Not scheduled")}</span>
        <span>Updated: ${escapeHtml(budget.updatedAt || "Not saved")}</span>
        <div class="budget-record-actions">
          <button type="button" class="inline-action" data-action="open-budget" data-id="${escapeHtml(budget.id)}">${buttonContent("Open", "open-budget")}</button>
          <button type="button" class="inline-action" data-action="edit-budget" data-id="${escapeHtml(budget.id)}">${buttonContent("Edit", "edit-budget")}</button>
          <button type="button" class="inline-action" data-action="duplicate-budget" data-id="${escapeHtml(budget.id)}">${buttonContent("Duplicate", "duplicate-budget")}</button>
          ${budget.jobId ? `<button type="button" class="inline-action" data-action="view-budget-job" data-id="${escapeHtml(budget.jobId)}">View Job</button>` : ""}
          ${budget.quoteId ? `<button type="button" class="inline-action" data-action="view-budget-quote" data-id="${escapeHtml(budget.quoteId)}">View Quote</button>` : ""}
          ${budget.invoiceId ? `<button type="button" class="inline-action" data-action="view-budget-invoice" data-id="${escapeHtml(budget.invoiceId)}">View Invoice</button>` : ""}
          <button type="button" class="inline-action" data-action="archive-budget" data-id="${escapeHtml(budget.id)}">${buttonContent("Archive", "archive-budget")}</button>
        </div>
      </div>
    </article>`;
  }

  function renderBudgetLineList(title, items, fields) {
    return `<section class="budget-detail-block">
      <h4>${escapeHtml(title)}</h4>
      ${items.length ? `<div class="budget-line-list">${items.map((item) => `<div class="budget-line-row">
        <strong>${escapeHtml(fields.title(item))}</strong>
        <span>${escapeHtml(fields.meta(item))}</span>
        <b>${budgetCurrency(fields.estimated(item))}</b>
        <small>Actual ${budgetCurrency(fields.actual(item))}</small>
      </div>`).join("")}</div>` : emptyState(`No ${title.toLowerCase()} items yet.`)}
    </section>`;
  }

  function renderBudgetWarnings(budget, summary) {
    const warnings = [];
    if (summary.health === "At Risk" || summary.health === "Watch") warnings.push(`${summary.health}: margin is ${budgetPercent(summary.actualMargin || summary.estimatedMargin)} against the target.`);
    if (summary.health === "Over Budget") warnings.push("Actual costs are over the approved estimated cost budget.");
    if (summary.remainingLaborAllowance <= 4 && summary.expectedRevenue) warnings.push(`Only ${summary.remainingLaborAllowance.toFixed(1)} labor hours remain before reaching the target margin.`);
    if (budget.status === "Completed" && !summary.totalActualCost) warnings.push("Completed job is missing actual costs.");
    const unbilled = budgetLineBundle(budget.id).changeOrders.filter((item) => item.approvalStatus === "Approved" && !item.invoicedAtRaw);
    if (unbilled.length) warnings.push(`${unbilled.length} approved change order${unbilled.length === 1 ? "" : "s"} not invoiced.`);
    return warnings.length ? `<div class="budget-warning-list">${warnings.map((warning) => `<p>${escapeHtml(warning)}</p>`).join("")}</div>` : "";
  }

  function renderBudgetVariance(summary) {
    const calculator = window.UrbanYardsBudgetCalculations;
    if (!calculator) return "";
    const rows = calculator.varianceRows(summary);
    return `<section class="budget-detail-block">
      <h4>Estimated vs Actual</h4>
      <div class="budget-variance-table" role="table" aria-label="Budget variance">
        <div role="row" class="budget-variance-head"><span>Category</span><span>Estimated</span><span>Actual</span><span>Difference</span><span>Status</span></div>
        ${rows.map((row) => `<div role="row" class="budget-variance-row ${row.favorable ? "is-favorable" : "is-unfavorable"}">
          <span>${escapeHtml(row.label)}</span>
          <span>${budgetCurrency(row.estimated)}</span>
          <span>${budgetCurrency(row.actual)}</span>
          <span>${budgetCurrency(row.difference)} / ${budgetPercent(row.percent)}</span>
          <span>${row.favorable ? "Favorable" : "Needs review"}</span>
        </div>`).join("")}
      </div>
    </section>`;
  }

  function budgetReportCard(label, value, detail = "") {
    return `<article class="budget-report-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      ${detail ? `<small>${escapeHtml(detail)}</small>` : ""}
    </article>`;
  }

  function renderBudgetDetailTabs(activeTab) {
    return `<div class="budget-detail-tabs" role="tablist" aria-label="Budget detail sections">
      ${BUDGET_DETAIL_TABS.map((tab) => `<button type="button" role="tab" class="budget-detail-tab${activeTab === tab.key ? " is-active" : ""}" aria-selected="${activeTab === tab.key ? "true" : "false"}" data-action="budget-detail-tab" data-tab="${escapeHtml(tab.key)}">${escapeHtml(tab.label)}</button>`).join("")}
    </div>`;
  }

  function renderBudgetOverviewTab(budget, summary) {
    const remainingBudget = Number(summary.expectedRevenue || 0) - Number(summary.totalActualCost || 0);
    return `${renderBudgetWarnings(budget, summary)}
      <section class="budget-detail-block">
        <h4>Budget Allowances</h4>
        <div class="budget-report-grid">
          ${budgetReportCard("Remaining Budget", budgetCurrency(remainingBudget), "Expected revenue minus actual cost")}
          ${budgetReportCard("Labor Hours Remaining", `${Number(summary.remainingLaborAllowance || 0).toFixed(1)} hr`, "Before target margin is reached")}
          ${budgetReportCard("Break-Even Price", budgetCurrency(summary.breakEvenPrice), "Estimated cost floor")}
          ${budgetReportCard("Recommended Price", budgetCurrency(summary.recommendedPrice), `${budgetPercent(budget.targetMarginPercent)} target margin`)}
        </div>
      </section>
      ${renderBudgetVariance(summary)}`;
  }

  function renderBudgetReportsTab(budget, summary, lines) {
    const approvedUnbilled = lines.changeOrders
      .filter((item) => item.approvalStatus === "Approved" && !item.invoicedAtRaw)
      .reduce((total, item) => total + Number(item.additionalRevenue || 0), 0);
    return `<section class="budget-detail-block">
      <h4>Reporting Snapshot</h4>
      <div class="budget-report-grid">
        ${budgetReportCard("Budget Health", summary.health || "Healthy", `${budget.status} / ${budget.jobStatus}`)}
        ${budgetReportCard("Cost Variance", budgetCurrency(summary.costVariance), "Actual cost minus estimated cost")}
        ${budgetReportCard("Profit Variance", budgetCurrency(summary.profitVariance), "Actual profit minus estimated profit")}
        ${budgetReportCard("Unbilled Add-Ons", budgetCurrency(approvedUnbilled), "Approved change orders not invoiced")}
      </div>
    </section>
    ${renderBudgetVariance(summary)}`;
  }

  function renderBudgetDocumentsTab(documents) {
    return `<section class="budget-detail-block">
      <h4>Documents & Receipts</h4>
      ${documents.length ? `<div class="budget-document-list">${documents.map((item) => {
        const title = item.title || item.name || item.file_name || item.fileName || "Budget document";
        const meta = item.document_type || item.documentType || item.category || item.storage_path || item.storagePath || "Attachment";
        const created = item.created_at || item.createdAt || item.uploaded_at || item.uploadedAt || "";
        const url = item.public_url || item.publicUrl || item.signed_url || item.signedUrl || item.file_url || item.fileUrl || "";
        return `<div class="budget-document-row">
          <div>
            <strong>${escapeHtml(title)}</strong>
            <span>${escapeHtml([meta, created].filter(Boolean).join(" / "))}</span>
          </div>
          ${url ? `<a class="inline-action" href="${escapeHtml(url)}" target="_blank" rel="noopener">Open</a>` : `<small>Stored securely</small>`}
        </div>`;
      }).join("")}</div>` : emptyState("No budget documents or receipts attached yet.")}
    </section>`;
  }

  function renderBudgetHistoryTab(history) {
    return `<section class="budget-detail-block">
      <h4>Audit History</h4>
      ${history.length ? `<div class="budget-history-list">${history.map((item) => {
        const action = item.action || item.event_type || item.eventType || "Budget update";
        const actor = item.actor_email || item.actorEmail || item.created_by || item.createdBy || "Dashboard user";
        const created = item.created_at || item.createdAt || "";
        const previousValue = item.previous_value || item.previousValue || "";
        const newValue = item.new_value || item.newValue || "";
        return `<div class="budget-history-row">
          <strong>${escapeHtml(action)}</strong>
          <span>${escapeHtml([actor, created].filter(Boolean).join(" / "))}</span>
          ${(previousValue || newValue) ? `<small>${escapeHtml([previousValue, newValue].filter(Boolean).join(" to "))}</small>` : ""}
        </div>`;
      }).join("")}</div>` : emptyState("No budget audit entries yet.")}
    </section>`;
  }

  function renderBudgetTabContent(activeTab, budget, summary, lines) {
    if (activeTab === "labor") {
      return renderBudgetLineList("Labor", lines.labor, {
        title: (item) => item.task,
        meta: (item) => `${item.role || "Labor"} / ${item.estimatedHours} hr`,
        estimated: (item) => item.estimatedCost,
        actual: (item) => item.actualCost
      });
    }
    if (activeTab === "materials") {
      return renderBudgetLineList("Materials", lines.materials, {
        title: (item) => item.materialName,
        meta: (item) => `${item.category} / ${item.quantity || 0} ${item.unit || ""}`.trim(),
        estimated: (item) => item.estimatedCost,
        actual: (item) => item.actualCost
      });
    }
    if (activeTab === "equipment") {
      return renderBudgetLineList("Equipment", lines.equipment, {
        title: (item) => item.equipmentName,
        meta: (item) => `${item.usageType} / ${item.estimatedQuantity || 0}`,
        estimated: (item) => item.estimatedCost,
        actual: (item) => item.actualCost
      });
    }
    if (activeTab === "costs") {
      return renderBudgetLineList("Other Costs", lines.costs, {
        title: (item) => item.description,
        meta: (item) => item.category,
        estimated: (item) => item.estimatedCost,
        actual: (item) => item.actualCost
      });
    }
    if (activeTab === "change_orders") {
      return renderBudgetLineList("Change Orders", lines.changeOrders, {
        title: (item) => item.title,
        meta: (item) => `${item.approvalStatus} / ${item.requestedDate || "No date"}`,
        estimated: (item) => item.additionalRevenue,
        actual: (item) => item.additionalCosts
      });
    }
    if (activeTab === "documents") return renderBudgetDocumentsTab(lines.documents);
    if (activeTab === "history") return renderBudgetHistoryTab(lines.history);
    if (activeTab === "reports") return renderBudgetReportsTab(budget, summary, lines);
    return renderBudgetOverviewTab(budget, summary);
  }

  function renderBudgetDetail() {
    if (!els.budgetDetail) return;
    const budget = selectedBudget();
    if (!budget) {
      els.budgetDetail.innerHTML = `<div class="panel-heading"><h3>Budget Summary</h3><p>Create a job budget to review revenue, cost, margin, and actuals.</p></div>${emptyState("No budget selected.")}`;
      return;
    }
    if (!state.selectedBudgetId) state.selectedBudgetId = budget.id;
    const summary = budgetSummary(budget);
    const lines = budgetLineBundle(budget.id);
    const activeTab = BUDGET_DETAIL_TABS.some((tab) => tab.key === state.budgetDetailTab) ? state.budgetDetailTab : "overview";
    els.budgetDetail.innerHTML = `<div class="budget-summary-sticky">
      <div class="panel-heading">
        <p class="eyebrow">${escapeHtml(budget.serviceType || "Budget detail")}</p>
        <h3>${escapeHtml(budget.budgetName)}</h3>
        <p>${escapeHtml([budget.clientName, budget.propertyName, budget.jobName].filter(Boolean).join(" / ") || "No linked record")}</p>
      </div>
      <div class="budget-summary-pills">${budgetBadge(budget.status)}${budgetBadge(summary.health || "Healthy", "health")}</div>
      <dl class="budget-summary-totals">
        <div><dt>Revenue</dt><dd>${budgetCurrency(summary.expectedRevenue)}</dd></div>
        <div><dt>Estimated Cost</dt><dd>${budgetCurrency(summary.totalEstimatedCost)}</dd></div>
        <div><dt>Estimated Profit</dt><dd>${budgetCurrency(summary.estimatedProfit)}</dd></div>
        <div><dt>Estimated Margin</dt><dd>${budgetPercent(summary.estimatedMargin)}</dd></div>
        <div><dt>Actual Profit</dt><dd>${budgetCurrency(summary.actualProfit)}</dd></div>
        <div><dt>Actual Margin</dt><dd>${budgetPercent(summary.actualMargin)}</dd></div>
      </dl>
      <div class="budget-summary-actions">
        <button type="button" data-action="edit-budget" data-id="${escapeHtml(budget.id)}">${buttonContent("Edit Budget", "edit-budget")}</button>
        <button type="button" class="secondary-action" data-action="duplicate-budget" data-id="${escapeHtml(budget.id)}">${buttonContent("Duplicate", "duplicate-budget")}</button>
      </div>
      ${renderBudgetDetailTabs(activeTab)}
      <div class="budget-detail-tab-panel">${renderBudgetTabContent(activeTab, budget, summary, lines)}</div>
    </div>`;
  }

  function renderBudgetList() {
    if (!els.budgetList) return;
    const budgets = filteredBudgets();
    if (!state.budgetsReady && !isDemoMode()) {
      els.budgetList.innerHTML = emptyState(state.budgetsError || "Job budgets could not load right now. Refresh the dashboard, then check Supabase/RLS if it stays down.");
      return;
    }
    els.budgetList.innerHTML = budgets.length ? budgets.map(renderBudgetRow).join("") : emptyState("No job budgets match this view.");
  }

  function renderHomeBudgets(data = state.data) {
    if (!els.homeBudgets) return;
    const budgets = (data.budgets?.budgets || []).filter((budget) => budget.status !== "Archived");
    const summaries = budgets.map((budget) => ({ budget, summary: budgetSummary(budget) }));
    const active = budgets.filter((budget) => !["Completed", "Archived"].includes(budget.status)).length;
    const atRisk = summaries.filter((item) => ["Watch", "At Risk"].includes(item.summary.health) || item.budget.status === "At Risk").length;
    const over = summaries.filter((item) => item.summary.health === "Over Budget" || item.budget.status === "Over Budget").length;
    const upcomingProfit = summaries
      .filter((item) => !["Completed", "Archived"].includes(item.budget.status))
      .reduce((total, item) => total + Number(item.summary.estimatedProfit || 0), 0);
    const missingActuals = summaries.filter((item) => item.budget.status === "Completed" && !Number(item.summary.totalActualCost || 0)).length;
    els.homeBudgets.innerHTML = `<div class="home-budget-stats">
      ${budgetMetricCard("Active Budgets", String(active), "Jobs being estimated or tracked")}
      ${budgetMetricCard("At Risk", String(atRisk), "Below target margin", atRisk ? "warning" : "")}
      ${budgetMetricCard("Over Budget", String(over), "Needs review", over ? "danger" : "")}
      ${budgetMetricCard("Upcoming Profit", budgetCurrency(upcomingProfit), "Estimated")}
      ${budgetMetricCard("Missing Actuals", String(missingActuals), "Completed jobs")}
    </div>`;
  }

  function renderBudgets(data = state.data) {
    if (!els.budgetList && !els.budgetMetrics && !els.budgetDetail) return;
    populateBudgetControls(data);
    fillBudgetSettingsForm();
    if (els.budgetSearch && els.budgetSearch.value !== state.budgetSearch) els.budgetSearch.value = state.budgetSearch;
    if (els.budgetDateStart && els.budgetDateStart.value !== state.budgetDateStart) els.budgetDateStart.value = state.budgetDateStart;
    if (els.budgetDateEnd && els.budgetDateEnd.value !== state.budgetDateEnd) els.budgetDateEnd.value = state.budgetDateEnd;
    if (els.budgetStatus) {
      els.budgetStatus.textContent = state.budgetsReady || isDemoMode()
        ? "Budget tools are folded into Job Tickets and Money during this rebuild."
        : (state.budgetsError || "Budget tools are folded into Job Tickets and Money during this rebuild.");
    }
    const selected = selectedBudget();
    if (selected && !state.selectedBudgetId) state.selectedBudgetId = selected.id;
    renderBudgetMetrics();
    renderBudgetList();
    renderBudgetDetail();
    if (els.budgetLineForm?.elements.budget_id && !els.budgetLineForm.elements.budget_id.value) {
      els.budgetLineForm.elements.budget_id.value = state.selectedBudgetId || "";
    }
  }

  function activeConnectedOpsBundle() {
    return normalizeConnectedOpsBundle(state.data.connectedOps || {});
  }

  function connectedOpsMetric(label, value, detail, tone = "") {
    return `<article class="connected-ops-metric ${tone ? `connected-ops-metric-${escapeHtml(slug(tone))}` : ""}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(detail || "")}</small>
    </article>`;
  }

  function connectedOpsBadge(label, tone = "") {
    return `<span class="connected-ops-badge ${tone ? `connected-ops-badge-${escapeHtml(slug(tone))}` : ""}">${escapeHtml(label || "Not set")}</span>`;
  }

  function connectedOpsRow(title, detail, meta, actions = "") {
    return `<article class="connected-ops-row">
      <div>
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(detail || "")}</span>
      </div>
      <em>${escapeHtml(meta || "")}</em>
      ${actions ? `<div class="connected-ops-row-actions">${actions}</div>` : ""}
    </article>`;
  }

  function renderConnectedOpsTabs() {
    qsa("[data-connected-ops-view]").forEach((button) => {
      const isActive = button.dataset.connectedOpsView === state.connectedOpsView;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });
  }

  function renderRecurringOperations(ops) {
    const services = ops.recurringServices.filter((item) => item.status !== "Archived");
    const upcomingVisits = ops.recurringVisits
      .filter((visit) => visit.visitDateRaw && visit.visitDateRaw >= todayKey())
      .sort((a, b) => a.visitDateRaw.localeCompare(b.visitDateRaw))
      .slice(0, 6);
    return `<div class="connected-ops-grid">
      <article class="panel connected-ops-form-card">
        <div class="panel-heading">
          <div>
            <h3>Recurring Service</h3>
            <p>Create reusable service plans that can feed calendar visits and work checklists.</p>
          </div>
        </div>
        <form class="connected-ops-form" data-connected-ops-form="recurring">
          <input name="service_name" placeholder="Service name" required>
          <input name="service_type" placeholder="Service type">
          <select name="frequency" aria-label="Frequency">
            <option>Weekly</option>
            <option>Biweekly</option>
            <option>Monthly</option>
            <option>Quarterly</option>
            <option>Custom</option>
          </select>
          <input name="next_visit_date" type="date" aria-label="Next visit date">
          <input name="visit_window" placeholder="Preferred visit window">
          <input name="price_per_visit" type="number" min="0" step="0.01" placeholder="Price per visit">
          <textarea name="notes" rows="3" placeholder="Service notes"></textarea>
          <button type="submit">${buttonContent("Save Service", "save")}</button>
        </form>
      </article>
      <article class="panel connected-ops-list-card">
        <div class="panel-heading">
          <div>
            <h3>Active Plans</h3>
            <p>${escapeHtml(String(services.length))} recurring plan${services.length === 1 ? "" : "s"} tracked.</p>
          </div>
        </div>
        <div class="connected-ops-list">
          ${services.length ? services.map((service) => connectedOpsRow(
            service.serviceName,
            [service.serviceType, service.frequency, service.visitWindow].filter(Boolean).join(" / "),
            service.nextVisitDate ? `Next ${service.nextVisitDate}` : "No next visit",
            connectedOpsBadge(service.status, service.status)
          )).join("") : emptyState("No recurring services yet.")}
        </div>
      </article>
      <article class="panel connected-ops-wide-card">
        <div class="panel-heading">
          <div>
            <h3>Upcoming Recurring Visits</h3>
            <p>Generated or planned recurring service occurrences.</p>
          </div>
        </div>
        <div class="connected-ops-list">
          ${upcomingVisits.length ? upcomingVisits.map((visit) => {
            const service = services.find((item) => item.id === visit.recurringServiceId);
            return connectedOpsRow(service?.serviceName || "Recurring visit", [visit.visitDate, visit.visitWindow].filter(Boolean).join(" / "), visit.status, connectedOpsBadge(`${visit.completionPercent}%`, "progress"));
          }).join("") : emptyState("No upcoming recurring visits yet.")}
        </div>
      </article>
    </div>`;
  }

  function renderFieldOperations(ops) {
    const activeJobs = state.data.jobs.filter((job) => job.dateRaw >= todayKey()).slice(0, 6);
    const activeChecklists = ops.checklists.filter((item) => !["Completed", "Archived"].includes(item.status));
    const arrivalPhotos = ops.sitePhotos.filter((item) => item.photo_type === "arrival" || item.photoType === "arrival").length;
    const completionPhotos = ops.sitePhotos.filter((item) => item.photo_type === "completion" || item.photoType === "completion").length;
    return `<div class="connected-ops-grid">
      <article class="panel connected-ops-wide-card">
        <div class="panel-heading">
          <div>
            <h3>Mobile Work Mode</h3>
            <p>Work-friendly job view with checklists, time capture, and camera/photo proof hooks.</p>
          </div>
        </div>
        <div class="connected-ops-field-summary">
          ${connectedOpsMetric("Open Checklists", String(activeChecklists.length), "Assigned job tasks")}
          ${connectedOpsMetric("Arrival Photos", String(arrivalPhotos), "Uploaded site proof")}
          ${connectedOpsMetric("Completion Photos", String(completionPhotos), "Uploaded closeout proof")}
        </div>
        <p class="form-note">Phone camera uploads should use the browser file picker with camera capture where supported. The database and private storage bucket now support job-site photos.</p>
      </article>
      <article class="panel connected-ops-list-card">
        <div class="panel-heading"><h3>Checklist Templates</h3></div>
        <div class="connected-ops-list">
          ${ops.checklistTemplates.length ? ops.checklistTemplates.map((template) => connectedOpsRow(template.title, [template.category, template.visibility].filter(Boolean).join(" / "), template.status)).join("") : emptyState("No work checklist templates yet.")}
        </div>
      </article>
      <article class="panel connected-ops-list-card">
        <div class="panel-heading"><h3>Upcoming Work Jobs</h3></div>
        <div class="connected-ops-list">
          ${activeJobs.length ? activeJobs.map((job) => connectedOpsRow(job.site, [job.date, job.window, job.service].filter(Boolean).join(" / "), job.status, `<button class="inline-action" type="button" data-action="edit-job" data-id="${escapeHtml(job.id)}">Open</button>`)).join("") : emptyState("No upcoming work jobs.")}
        </div>
      </article>
    </div>`;
  }

  function renderApprovalOperations(ops) {
    const approvals = ops.approvals.filter((item) => item.status !== "Archived");
    return `<div class="connected-ops-grid">
      <article class="panel connected-ops-form-card">
        <div class="panel-heading"><h3>New Approval</h3></div>
        <form class="connected-ops-form" data-connected-ops-form="approval">
          <input name="title" placeholder="Approval title" required>
          <select name="request_type" aria-label="Approval type">
            <option>Change Order</option>
            <option>Schedule Exception</option>
            <option>Budget Review</option>
            <option>Client Approval</option>
            <option>Equipment Maintenance</option>
          </select>
          <select name="priority" aria-label="Priority">
            <option>Normal</option>
            <option>High</option>
            <option>Urgent</option>
            <option>Low</option>
          </select>
          <input name="due_at" type="datetime-local" aria-label="Due date">
          <textarea name="description" rows="4" placeholder="What needs approval?"></textarea>
          <button type="submit">${buttonContent("Request Approval", "save")}</button>
        </form>
      </article>
      <article class="panel connected-ops-list-card connected-ops-span-2">
        <div class="panel-heading">
          <div>
            <h3>Approval Queue</h3>
            <p>Exceptions, change orders, missed visits, and decision points.</p>
          </div>
        </div>
        <div class="connected-ops-list">
          ${approvals.length ? approvals.map((approval) => connectedOpsRow(
            approval.title,
            [approval.requestType, approval.description].filter(Boolean).join(" / "),
            [approval.priority, approval.dueAt ? `Due ${approval.dueAt}` : ""].filter(Boolean).join(" / "),
            approval.status === "Pending" ? `
              <button class="inline-action" type="button" data-action="resolve-approval" data-id="${escapeHtml(approval.id)}" data-status="Approved">Approve</button>
              <button class="inline-action danger-action" type="button" data-action="resolve-approval" data-id="${escapeHtml(approval.id)}" data-status="Declined">Decline</button>
            ` : connectedOpsBadge(approval.status, approval.status)
          )).join("") : emptyState("No approvals are waiting.")}
        </div>
      </article>
    </div>`;
  }

  function renderCommunicationOperations(ops) {
    return `<div class="connected-ops-grid">
      <article class="panel connected-ops-form-card">
        <div class="panel-heading"><h3>Log Communication</h3></div>
        <form class="connected-ops-form" data-connected-ops-form="communication">
          <input name="contact_name" placeholder="Contact name">
          <input name="contact_email" type="email" placeholder="Email">
          <input name="contact_phone" placeholder="Phone">
          <select name="channel" aria-label="Channel">
            <option value="email">Email</option>
            <option value="phone">Phone</option>
            <option value="sms">SMS</option>
            <option value="voicemail">Voicemail</option>
            <option value="website">Website</option>
            <option value="note">Note</option>
          </select>
          <input name="subject" placeholder="Subject">
          <textarea name="body" rows="4" placeholder="Conversation notes"></textarea>
          <input name="follow_up_date" type="date" aria-label="Follow-up date">
          <button type="submit">${buttonContent("Save Communication", "save")}</button>
        </form>
      </article>
      <article class="panel connected-ops-list-card connected-ops-span-2">
        <div class="panel-heading">
          <div>
            <h3>Client Timeline</h3>
            <p>Calls, emails, website requests, voicemails, notes, and follow-up prompts.</p>
          </div>
        </div>
        <div class="connected-ops-list">
          ${ops.communications.length ? ops.communications.slice(0, 12).map((item) => connectedOpsRow(
            item.subject || item.contactName || "Communication",
            [item.contactName, item.channel, item.body].filter(Boolean).join(" / "),
            [item.sentAt || item.createdAt, item.followUpDate ? `Follow up ${item.followUpDate}` : ""].filter(Boolean).join(" / ")
          )).join("") : emptyState("No communication history yet.")}
        </div>
      </article>
    </div>`;
  }

  function renderShareOperations(ops) {
    return `<div class="connected-ops-grid">
      <article class="panel connected-ops-wide-card">
        <div class="panel-heading">
          <div>
            <h3>Secure Client Share Links</h3>
            <p>Share estimates, invoices, job status, photos, and documents without exposing private dashboard records.</p>
          </div>
        </div>
        <p class="form-note">Share link tokens are stored as hashes only. Public endpoints should look up links by token hash and return only the approved sections.</p>
      </article>
      <article class="panel connected-ops-list-card connected-ops-span-2">
        <div class="panel-heading"><h3>Active Links</h3></div>
        <div class="connected-ops-list">
          ${ops.shareLinks.length ? ops.shareLinks.map((link) => connectedOpsRow(
            link.title,
            [link.contactEmail, link.allowedSections.join(", ")].filter(Boolean).join(" / "),
            [link.status, `${link.viewCount} views`, link.expiresAt ? `Expires ${link.expiresAt}` : ""].filter(Boolean).join(" / ")
          )).join("") : emptyState("No secure share links yet.")}
        </div>
      </article>
    </div>`;
  }

  function renderAutomationOperations(ops) {
    const schedules = ops.maintenanceSchedules.filter((item) => item.status === "Active");
    return `<div class="connected-ops-grid">
      <article class="panel connected-ops-form-card">
        <div class="panel-heading"><h3>Automation Rule</h3></div>
        <form class="connected-ops-form" data-connected-ops-form="automation">
          <input name="title" placeholder="Automation title" required>
          <input name="trigger_key" placeholder="Trigger key, ex: visit_overdue" required>
          <input name="action_key" placeholder="Action key, ex: create_approval" required>
          <label class="recurring-toggle">
            <input name="enabled" type="checkbox">
            <span>Enabled</span>
          </label>
          <button type="submit">${buttonContent("Save Rule", "save")}</button>
        </form>
      </article>
      <article class="panel connected-ops-list-card">
        <div class="panel-heading"><h3>Automation Rules</h3></div>
        <div class="connected-ops-list">
          ${ops.automationRules.length ? ops.automationRules.map((rule) => connectedOpsRow(rule.title, [rule.triggerKey, rule.actionKey].filter(Boolean).join(" / "), rule.enabled ? "Enabled" : "Paused", connectedOpsBadge(rule.enabled ? "On" : "Off", rule.enabled ? "healthy" : "paused"))).join("") : emptyState("No automation rules yet.")}
        </div>
      </article>
      <article class="panel connected-ops-list-card">
        <div class="panel-heading"><h3>Maintenance Planning</h3></div>
        <div class="connected-ops-list">
          ${schedules.length ? schedules.map((schedule) => connectedOpsRow(schedule.equipmentName, [schedule.maintenanceType, schedule.frequency].filter(Boolean).join(" / "), schedule.nextDueDate ? `Due ${schedule.nextDueDate}` : "No due date")).join("") : emptyState("No maintenance schedules yet.")}
        </div>
      </article>
    </div>`;
  }

  function renderReportOperations(ops) {
    const openApprovals = ops.approvals.filter((item) => ["Pending", "Needs More Info"].includes(item.status)).length;
    const activeRecurring = ops.recurringServices.filter((item) => item.status === "Active").length;
    const overdueRecurring = ops.recurringVisits.filter((item) => item.visitDateRaw && item.visitDateRaw < todayKey() && !["Completed", "Skipped", "Canceled"].includes(item.status)).length;
    const dueMaintenance = ops.maintenanceSchedules.filter((item) => item.nextDueDateRaw && item.nextDueDateRaw <= daysFromToday(7) && item.status === "Active").length;
    return `<div class="connected-ops-grid">
      <article class="panel connected-ops-wide-card">
        <div class="panel-heading">
          <div>
            <h3>Operations Reports</h3>
            <p>Compact reporting hooks for recurring work, approvals, maintenance, communications, and field proof.</p>
          </div>
        </div>
        <div class="connected-ops-field-summary">
          ${connectedOpsMetric("Active Recurring", String(activeRecurring), "Live service plans")}
          ${connectedOpsMetric("Missed Recurring", String(overdueRecurring), "Needs reschedule", overdueRecurring ? "warning" : "")}
          ${connectedOpsMetric("Open Approvals", String(openApprovals), "Pending decisions", openApprovals ? "warning" : "")}
          ${connectedOpsMetric("Maintenance Due", String(dueMaintenance), "Next 7 days", dueMaintenance ? "warning" : "")}
        </div>
      </article>
      <article class="panel connected-ops-list-card connected-ops-span-2">
        <div class="panel-heading"><h3>Recent Communication</h3></div>
        <div class="connected-ops-list">
          ${ops.communications.slice(0, 8).map((item) => connectedOpsRow(item.subject || item.contactName || "Communication", [item.channel, item.contactName].filter(Boolean).join(" / "), item.createdAt)).join("") || emptyState("No communication records yet.")}
        </div>
      </article>
    </div>`;
  }

  function renderConnectedOperations(data = state.data) {
    if (!els.connectedOpsMain && !els.connectedOpsMetrics) return;
    const ops = activeConnectedOpsBundle();
    const activeRecurring = ops.recurringServices.filter((item) => item.status === "Active").length;
    const openApprovals = ops.approvals.filter((item) => ["Pending", "Needs More Info"].includes(item.status)).length;
    const dueChecklists = ops.checklists.filter((item) => !["Completed", "Archived"].includes(item.status)).length;
    const dueMaintenance = ops.maintenanceSchedules.filter((item) => item.nextDueDateRaw && item.nextDueDateRaw <= daysFromToday(7) && item.status === "Active").length;

    if (els.connectedOpsStatus) {
      els.connectedOpsStatus.textContent = state.connectedOpsReady || isDemoMode()
        ? "Connected operations uses the shared dashboard records and protected Supabase tables."
        : "Connected Operations has been folded into Job Tickets for this rebuild.";
    }
    if (els.connectedOpsMetrics) {
      els.connectedOpsMetrics.innerHTML = [
        connectedOpsMetric("Active Recurring", String(activeRecurring), "Recurring service plans"),
        connectedOpsMetric("Work Checklists", String(dueChecklists), "Open job checklists"),
        connectedOpsMetric("Approvals", String(openApprovals), "Need decisions", openApprovals ? "warning" : ""),
        connectedOpsMetric("Maintenance Due", String(dueMaintenance), "Next 7 days", dueMaintenance ? "warning" : ""),
        connectedOpsMetric("Communications", String(ops.communications.length), "Client timeline records")
      ].join("");
    }
    renderConnectedOpsTabs();
    if (!els.connectedOpsMain) return;
    if (!state.connectedOpsReady && !isDemoMode()) {
      els.connectedOpsMain.innerHTML = emptyState("Connected Operations has been folded into Job Tickets for this rebuild.");
      return;
    }
    const view = state.connectedOpsView;
    if (view === "field") els.connectedOpsMain.innerHTML = renderFieldOperations(ops);
    else if (view === "approvals") els.connectedOpsMain.innerHTML = renderApprovalOperations(ops);
    else if (view === "communications") els.connectedOpsMain.innerHTML = renderCommunicationOperations(ops);
    else if (view === "shares") els.connectedOpsMain.innerHTML = renderShareOperations(ops);
    else if (view === "automation") els.connectedOpsMain.innerHTML = renderAutomationOperations(ops);
    else if (view === "reports") els.connectedOpsMain.innerHTML = renderReportOperations(ops);
    else els.connectedOpsMain.innerHTML = renderRecurringOperations(ops);
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
    const ticket = findJobTicketForQuoteSubmission(id)
      || buildTicketFromQuote(item, state.data.submissions.findIndex((submission) => submission.id === id));
    openDetailDrawer();
    els.detailContent.innerHTML = `
      <div class="drawer-content">
        <p class="eyebrow">Quote Detail</p>
        <h3>${escapeHtml(item.name)}</h3>
        ${statusBadge(item.status)}
        ${renderSourceTicketContext(ticket)}
        ${renderContactQuickActions({
          leadId: item.id,
          leadType: "quote_submission",
          name: item.name,
          companyProperty: [item.propertyType, item.city, item.service].filter(Boolean).join(" / "),
          phone: item.phone,
          email: item.email
        })}
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
        ${renderActivityTimeline({
          leadId: item.id,
          leadType: "quote_submission",
          name: item.name,
          companyProperty: [item.propertyType, item.city, item.service].filter(Boolean).join(" / "),
          phone: item.phone,
          email: item.email
        })}

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
        ${renderContactQuickActions({
          leadId: contact.id,
          leadType: "contact",
          name: contact.name,
          companyProperty: [contact.type, contact.city].filter(Boolean).join(" / "),
          phone: contact.phone,
          email: contact.email
        })}
        <div class="profile-drawer-metrics">
          ${miniCount("jobs", profile.jobs.length)}
          ${miniCount("route stops", profile.routeStops.length)}
          ${miniCount("quotes", profile.quotes.length)}
          ${miniCount("docs", profile.documents.length)}
          ${miniCount("open follow-ups", profile.openFollowUps.length)}
          ${miniCount("Square owed", formatCurrency(profile.amountOwedCents, "USD"))}
        </div>
        <form class="drawer-form" data-contact-edit data-id="${escapeHtml(contact.id)}" data-duplicate-scope="contact">
          <div class="duplicate-warning span-full" data-duplicate-warning data-duplicate-scope="contact" hidden></div>
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
        ${renderActivityTimeline({
          leadId: contact.id,
          leadType: "contact",
          name: contact.name,
          companyProperty: [contact.type, contact.city].filter(Boolean).join(" / "),
          phone: contact.phone,
          email: contact.email
        })}
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

  function renderJobDocumentationSection(job) {
    const templates = jobDocumentationTemplates();
    const assignments = documentationAssignmentsForJob(job);
    const templateOptions = templates.map((template) => `<option value="${escapeHtml(template.id)}">${escapeHtml(template.name)} / ${escapeHtml(template.category)}</option>`).join("");
    return `<section class="job-support-card">
      <div class="job-support-heading">
        <div>
          <h4>Supporting Documentation</h4>
          <p>Pick a form from the Documentation template library for this visit.</p>
        </div>
        <button type="button" class="inline-action" data-action="set-documentation-view" data-documentation-view="templates">${buttonContent("Template Library", "documentation")}</button>
      </div>
      <form class="job-support-form" data-job-documentation-form data-id="${escapeHtml(job.id)}">
        <select name="template_id" required>
          <option value="">Choose documentation template...</option>
          ${templateOptions}
        </select>
        <button type="submit"${templates.length ? "" : " disabled"}>${buttonContent("Add to Visit", "create-reminder")}</button>
      </form>
      <div class="profile-mini-list">
        ${assignments.length ? assignments.map((item) => `<div class="profile-mini-item">
          <strong>${escapeHtml(item.templateName)}</strong>
          <span>${escapeHtml([item.category, item.status, item.dueDate ? `Due ${item.dueDate}` : ""].filter(Boolean).join(" / "))}</span>
          <div class="job-support-actions">
            <button class="inline-action" type="button" data-action="open-documentation-form" data-id="${escapeHtml(item.id)}">${buttonContent("Open", "open-document")}</button>
            ${item.templateId ? `<button class="inline-action" type="button" data-action="download-documentation-template" data-id="${escapeHtml(item.templateId)}">${buttonContent("Download", "download-documentation-template")}</button>` : ""}
            <button class="inline-action" type="button" data-action="upload-documentation-submission" data-id="${escapeHtml(item.id)}">${buttonContent("Upload Completed", "open-document")}</button>
          </div>
        </div>`).join("") : emptyState(templates.length ? "No documentation forms are attached to this visit yet." : "No templates are available yet. Upload forms in Documentation first.")}
      </div>
    </section>`;
  }

  function renderJobPhotoList(job, photoStage) {
    const photos = documentationAttachmentsForJob(job, photoStage);
    return `<div class="profile-mini-list">
      ${photos.length ? photos.map((photo) => `<div class="profile-mini-item">
        <strong>${escapeHtml(photoStage === "arrival" ? "Arrival photo" : "Completion photo")}</strong>
        <span>${escapeHtml([photo.fileName, photo.createdAt].filter(Boolean).join(" / "))}</span>
        <div class="job-support-actions">
          <button class="inline-action" type="button" data-action="open-documentation-archive-file" data-archive-id="attachment:${escapeHtml(photo.id)}">${buttonContent("Open Photo", "open-document")}</button>
        </div>
      </div>`).join("") : emptyState(`No ${photoStage === "arrival" ? "arrival" : "completion"} photos uploaded yet.`)}
    </div>`;
  }

  function renderJobPhotosSection(job) {
    return `<section class="job-support-card">
      <div class="job-support-heading">
        <div>
          <h4>Job Site Photos</h4>
          <p>Upload up to ${JOB_SITE_PHOTO_MAX_FILES} arrival photos and up to ${JOB_SITE_PHOTO_MAX_FILES} completion photos at a time. On supported phones, the picker can use the camera.</p>
        </div>
      </div>
      <div class="job-photo-grid">
        <div>
          <form class="job-support-form job-photo-form" data-job-photo-form data-id="${escapeHtml(job.id)}" data-photo-stage="arrival">
            <label>Arrival photos
              <input name="photo" type="file" accept="image/*" capture="environment" multiple required>
            </label>
            <button type="submit">${buttonContent("Upload Arrival Photos", "open-document")}</button>
          </form>
          ${renderJobPhotoList(job, "arrival")}
        </div>
        <div>
          <form class="job-support-form job-photo-form" data-job-photo-form data-id="${escapeHtml(job.id)}" data-photo-stage="completion">
            <label>Completion photos
              <input name="photo" type="file" accept="image/*" capture="environment" multiple required>
            </label>
            <button type="submit">${buttonContent("Upload Completion Photos", "open-document")}</button>
          </form>
          ${renderJobPhotoList(job, "completion")}
        </div>
      </div>
    </section>`;
  }

  function openJobDrawer(id, options = {}) {
    const job = state.data.jobs.find((item) => item.id === id);
    if (!job || !els.detailDrawer || !els.detailContent) return;
    state.selectedJobId = id;
    const isReschedule = Boolean(options.reschedule);
    const visitDateValue = isReschedule && isOverdueJob(job) ? todayKey() : toDateInputValue(job.dateRaw);
    const ticket = findJobTicketForScheduledJob(id)
      || buildTicketFromJob(job, state.data.jobs.findIndex((item) => item.id === id));
    openDetailDrawer();
    els.detailContent.innerHTML = `
      <div class="drawer-content">
        <p class="eyebrow">${isReschedule ? "Overdue Visit" : "Schedule Detail"}</p>
        <h3>${escapeHtml(isReschedule ? `Reschedule ${job.site}` : job.site)}</h3>
        ${isOverdueJob(job) ? `<p class="job-overdue-note">This visit was scheduled for ${escapeHtml(job.date)} and is not marked complete.</p>` : ""}
        ${renderSourceTicketContext(ticket)}
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
          <div class="drawer-actions job-drawer-actions">
            <button type="submit">${buttonContent(isReschedule ? "Save New Date" : "Save Visit", "complete-reminder")}</button>
            ${job.status !== "Completed" ? `<button type="button" data-action="complete-job" data-id="${escapeHtml(job.id)}">${buttonContent("Mark Complete", "complete-reminder")}</button>` : ""}
            <button type="button" class="danger-action" data-action="cancel-job" data-id="${escapeHtml(job.id)}">${buttonContent("Cancel Visit", "cancel-job")}</button>
          </div>
        </form>
        <div class="job-support-sections">
          ${renderJobDocumentationSection(job)}
          ${renderJobPhotosSection(job)}
        </div>
      </div>
    `;
  }

  function openDocumentDrawer(id) {
    const doc = state.data.documents.find((item) => item.id === id);
    if (!doc || !els.detailDrawer || !els.detailContent) return;
    const typeLabel = doc.type === "invoice" ? "Invoice" : "Estimate / Quote";
    const squareStatus = doc.squareStatus || "Not synced";
    const amountDue = doc.squareAmountDueCents !== null ? formatCurrency(doc.squareAmountDueCents, doc.squareCurrency) : "Not synced";
    const ticket = findJobTicketForSalesDocument(id);
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
        ${renderSourceTicketContext(ticket)}
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

  function openDocumentationDrawer(id) {
    const assignment = state.data.documentation.assignments.find((item) => item.id === id);
    const submission = state.data.documentation.submissions.find((item) => item.id === id);
    const item = assignment || submission;
    if (!item || !els.detailDrawer || !els.detailContent) return;
    const isSubmission = Boolean(submission);
    openDetailDrawer();
    els.detailContent.innerHTML = `
      <div class="drawer-content documentation-drawer">
        <p class="eyebrow">${escapeHtml(isSubmission ? "Submitted Documentation" : "Assigned Form")}</p>
        <h3>${escapeHtml(item.templateName)}</h3>
        <div class="drawer-grid">
          <div class="drawer-field"><span>Status</span>${escapeHtml(item.status)}</div>
          <div class="drawer-field"><span>Category</span>${escapeHtml(item.category)}</div>
          <div class="drawer-field"><span>Connected record</span>${escapeHtml(documentationTargetLine(item))}</div>
          <div class="drawer-field"><span>${isSubmission ? "Completed by" : "Assigned to"}</span>${escapeHtml(isSubmission ? item.completedBy : item.assignedTo)}</div>
          <div class="drawer-field"><span>${isSubmission ? "Submitted" : "Due date"}</span>${escapeHtml(isSubmission ? item.submittedAt : item.dueDate || "No date")}</div>
          <div class="drawer-field"><span>File</span>${escapeHtml(item.fileName || "No file attached")}</div>
        </div>
        ${item.instructions ? `<h4>Instructions</h4><p class="item-body">${escapeHtml(item.instructions)}</p>` : ""}
        ${item.notes ? `<h4>Notes</h4><p class="item-body">${escapeHtml(item.notes)}</p>` : ""}
        ${item.correctionNotes ? `<h4>Corrections Requested</h4><p class="job-overdue-note">${escapeHtml(item.correctionNotes)}</p>` : ""}
        <div class="drawer-actions">
          ${!isSubmission ? `<button type="button" data-action="download-documentation-template" data-id="${escapeHtml(item.templateId)}">${buttonContent("Download Template", "download-documentation-template")}</button>` : ""}
          ${!isSubmission ? `<button type="button" data-action="upload-documentation-submission" data-id="${escapeHtml(item.id)}">${buttonContent("Upload Completed Form", "open-document")}</button>` : ""}
          ${isSubmission ? `<button type="button" data-action="preview-documentation-submission" data-id="${escapeHtml(item.id)}">${buttonContent("Preview", "open-document")}</button>` : ""}
          ${isSubmission && canReviewDocumentation() ? `<button type="button" data-action="approve-documentation-submission" data-id="${escapeHtml(item.id)}">${buttonContent("Approve", "approve-documentation-submission")}</button>` : ""}
          ${isSubmission && canReviewDocumentation() ? `<button type="button" data-action="request-documentation-corrections" data-id="${escapeHtml(item.id)}">${buttonContent("Request Corrections", "request-documentation-corrections")}</button>` : ""}
        </div>
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
    restored.documentation = imported.documentation && typeof imported.documentation === "object"
      ? normalizeDocumentationBundle(imported.documentation)
      : fallback.documentation;
    restored.importExport = imported.importExport && typeof imported.importExport === "object"
      ? imported.importExport
      : fallback.importExport;
    restored.budgets = imported.budgets && typeof imported.budgets === "object"
      ? normalizeBudgetBundle(imported.budgets)
      : fallback.budgets;
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
    return [item.brand, item.model, item.storageLocation, item.supplier].filter(Boolean).join(" · ");
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
        <div class="equipment-card-head"><div><strong>${escapeHtml(item?.name || record.equipmentName)}</strong><small>${escapeHtml(record.maintenanceType)} · ${escapeHtml(record.maintenanceDate)}</small></div><span>${escapeHtml(formatDollars(record.cost))}</span></div>
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
      <div class="equipment-card-head"><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml([item.brand, item.model, item.supplier].filter(Boolean).join(" · ") || item.category)}</small></div>${equipmentStatusBadge(item.priority)}</div>
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
    const meta = [item.category, item.source_url].filter(Boolean).join(" · ");
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
      els.aiLogsList.innerHTML = emptyState(state.groundskeeperAiReady ? "No AI questions logged yet." : (state.groundskeeperAiError || "Groundskeeper AI logs could not load."));
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
        <small>${escapeHtml([log.page, log.created_at ? formatDate(log.created_at) : ""].filter(Boolean).join(" · "))}</small>
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
          <button type="submit"><span class="button-icon" aria-hidden="true">AI</span><span>Ask</span></button>
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
            <button type="submit"><span class="button-icon" aria-hidden="true">AI</span><span>Train</span></button>
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
        : `<span>${aiBadge("Needs Attention", "Needs Attention")} Groundskeeper AI could not load from the secure backend.</span><span>${escapeHtml(state.groundskeeperAiError || "Refresh the dashboard, then check Netlify function logs or Supabase/RLS if it stays down.")}</span>`;
    }
    if (els.aiSearch && els.aiSearch.value !== state.groundskeeperAiSearch) els.aiSearch.value = state.groundskeeperAiSearch;
    renderAiWorkspace(ai);
  }

  function importExportSnapshot(data = state.data) {
    return data.importExport || demoImportExportSnapshot();
  }

  function importExportModules(data = state.data) {
    return importExportSnapshot(data).modules || [];
  }

  function selectedImportExportModule(data = state.data) {
    const modules = importExportModules(data);
    return modules.find((module) => module.key === state.importExportModule) || modules[0] || null;
  }

  function importExportModuleOptions(selectedKey = state.importExportModule) {
    return importExportModules().map((module) => (
      `<option value="${escapeHtml(module.key)}"${module.key === selectedKey ? " selected" : ""}>${escapeHtml(module.label || module.key)}</option>`
    )).join("");
  }

  function importExportSummaryCard(label, value, detail = "") {
    return `<article class="import-export-metric"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span>${detail ? `<small>${escapeHtml(detail)}</small>` : ""}</article>`;
  }

  function importExportMappingsFromDom() {
    return qsa("[data-import-map-source]").map((select) => ({
      sourceColumn: select.dataset.importMapSource || "",
      field: select.value || "",
      suggestedField: select.dataset.suggestedField || "",
      confidence: Number(select.dataset.confidence || 0),
      status: select.value ? "Mapped" : "Ignored"
    })).filter((item) => item.sourceColumn);
  }

  function renderImportMappingTable(module, preview) {
    const fields = (module?.fields || []).filter((field) => field.import !== false && !field.readOnly);
    const fieldOptions = (selected = "") => [
      `<option value="">Ignore column</option>`,
      ...fields.map((field) => `<option value="${escapeHtml(field.key)}"${field.key === selected ? " selected" : ""}>${escapeHtml(field.label)}</option>`)
    ].join("");
    const mappings = preview?.mappings || [];
    if (!mappings.length) return "";
    return `<div class="import-export-map">
      <div class="import-export-table-head">
        <strong>Column mapping</strong>
        <span>Review before saving. Unmapped columns are ignored.</span>
      </div>
      <div class="import-export-table-wrap">
        <table>
          <thead><tr><th>Spreadsheet column</th><th>Maps to</th><th>Examples</th><th>Status</th></tr></thead>
          <tbody>
            ${mappings.map((mapping) => {
              const selected = mapping.field || mapping.suggestedField || "";
              return `<tr>
                <td><strong>${escapeHtml(mapping.sourceColumn)}</strong></td>
                <td>
                  <select data-import-map-source="${escapeHtml(mapping.sourceColumn)}" data-suggested-field="${escapeHtml(mapping.suggestedField || "")}" data-confidence="${escapeHtml(mapping.confidence || 0)}">
                    ${fieldOptions(selected)}
                  </select>
                </td>
                <td>${(mapping.examples || []).map((example) => `<code>${escapeHtml(String(example).slice(0, 42))}</code>`).join(" ") || "<span class=\"muted\">No samples</span>"}</td>
                <td><span class="status-pill">${escapeHtml(mapping.status || (selected ? "Matched" : "Ignored"))}</span></td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    </div>`;
  }

  function renderImportPreview(module) {
    const preview = state.importExportPreview;
    if (!preview?.preview) return "";
    const summary = preview.preview.summary || {};
    const rows = preview.preview.rows || [];
    const mappingTable = renderImportMappingTable(module, preview);
    return `<section class="import-export-preview">
      <div class="import-export-preview-head">
        <div>
          <p class="eyebrow">Preview</p>
          <h4>${escapeHtml(preview.filename || "Imported data")}</h4>
          <p>${escapeHtml(summary.totalRows || 0)} rows reviewed before anything is saved.</p>
        </div>
        <div class="import-export-preview-actions">
          <button class="inline-action" type="button" data-action="refresh-import-preview">${buttonContent("Recheck Mapping", "refresh-dashboard")}</button>
          <button type="button" data-action="confirm-import-file"${summary.rejected ? " disabled" : ""}>${buttonContent("Confirm Import", "import-outreach-csv")}</button>
        </div>
      </div>
      <div class="import-export-metrics">
        ${importExportSummaryCard("Total rows", summary.totalRows || 0)}
        ${importExportSummaryCard("New records", summary.newRecords || 0)}
        ${importExportSummaryCard("Updates", summary.updates || 0)}
        ${importExportSummaryCard("Possible duplicates", summary.duplicates || 0)}
        ${importExportSummaryCard("Rejected", summary.rejected || 0, summary.rejected ? "Fix these before import" : "")}
        ${summary.validPhones || summary.invalidPhones || summary.missingPhones ? importExportSummaryCard("Valid phones", summary.validPhones || 0, summary.invalidPhones ? `${summary.invalidPhones} invalid` : "") : ""}
      </div>
      ${mappingTable ? `
        <details class="import-export-advanced">
          <summary>Advanced Options <span>Column mapping</span></summary>
          ${mappingTable}
        </details>
      ` : ""}
      <div class="import-export-row-preview">
        <div class="import-export-table-head">
          <strong>Row review</strong>
          <span>Showing the first ${escapeHtml(Math.min(rows.length, 8))} rows.</span>
        </div>
        <div class="import-export-preview-list">
          ${rows.slice(0, 8).map((row) => `<article class="import-export-row is-${escapeHtml(row.action)}">
            <div><strong>Row ${escapeHtml(row.rowNumber)}</strong><span>${escapeHtml(row.action)}</span></div>
            <p>${escapeHtml((row.errors || [])[0]?.message || (row.warnings || [])[0]?.message || row.changedFields?.join(", ") || "Ready")}</p>
          </article>`).join("")}
        </div>
      </div>
    </section>`;
  }

  function renderImportView(data) {
    const module = selectedImportExportModule(data);
    const limits = importExportSnapshot(data).limits || {};
    if (!module) return emptyState("Import/export modules could not be loaded. Refresh after running the Supabase SQL.");
    return `<div class="import-export-grid">
      <section class="import-export-card import-export-guided-card">
        <div class="panel-heading">
          <div>
            <h3>Guided Spreadsheet Import</h3>
            <p>Download the workbook, fill it in, upload it back, then review changes before saving.</p>
          </div>
        </div>
        <div class="spreadsheet-workflow-steps">
          <article>
            <span>1</span>
            <div>
              <strong>Download Template</strong>
              <p>Current workbook: ${escapeHtml(module.label || "Dashboard records")}.</p>
            </div>
            <button class="inline-action" type="button" data-action="download-import-template" data-format="xlsx">${buttonContent("Download Template", "export-full-backup")}</button>
          </article>
          <article>
            <span>2</span>
            <div>
              <strong>Upload Completed Sheet</strong>
              <p>${escapeHtml(state.importExportPendingFile?.filename || `Excel .xlsx or CSV. Max ${Math.round((limits.maxImportBytes || 5242880) / 1024 / 1024)} MB / ${limits.maxImportRows || 2000} rows.`)}</p>
            </div>
            <button type="button" data-action="choose-import-spreadsheet">${buttonContent("Upload Sheet", "import-outreach-csv")}</button>
          </article>
          <article>
            <span>3</span>
            <div>
              <strong>Review Import</strong>
              <p>${state.importExportPreview?.preview ? "Preview is ready below. Confirm only after checking duplicates and rejected rows." : "A preview appears here before records are saved."}</p>
            </div>
            <button class="inline-action" type="button" data-action="refresh-import-preview"${state.importExportPendingFile ? "" : " disabled"}>${buttonContent("Review Import", "refresh-dashboard")}</button>
          </article>
        </div>
        <details class="import-export-advanced">
          <summary>Advanced Options <span>CSV paste, workbook type, and mapping tools</span></summary>
          <label>Workbook type
            <select data-import-export-module>
              ${importExportModuleOptions(module.key)}
            </select>
          </label>
          <label class="span-full">Paste CSV instead of uploading
            <textarea data-import-paste rows="7" placeholder="Paste a header row and CSV records here..."></textarea>
          </label>
          <div class="import-export-card-actions">
            <button type="button" data-action="preview-import-paste">${buttonContent("Preview Pasted CSV", "import-outreach-csv")}</button>
            <button class="inline-action" type="button" data-action="review-import-history">${buttonContent("View Import History", "review-import-history")}</button>
          </div>
        </details>
      </section>
      <aside class="import-export-card import-export-guidance">
        <p class="eyebrow">Import Safety</p>
        <h3>${escapeHtml(module.label)}</h3>
        <p>${escapeHtml(module.description || "Dashboard records")}</p>
        <ul>
          <li>Supabase stays the source of truth.</li>
          <li>Existing Record ID values update records.</li>
          <li>Blank Record ID values create new records.</li>
          <li>Duplicates are flagged before saving.</li>
          <li>Recent imports can be rolled back from History.</li>
          <li>Contact and Call List workbooks keep phone numbers as text and validate call outcomes before saving.</li>
        </ul>
      </aside>
      <div class="span-full">${renderImportPreview(module)}</div>
    </div>`;
  }

  function contactWorkbookButtons() {
    const options = [
      ["blank", "Blank Contact Template", "Start fresh with fillable contact rows"],
      ["current_contacts", "Current Contacts", "Round-trip existing contacts"],
      ["current_prospects", "Current Prospects", "Turn outreach prospects into contacts"],
      ["properties_without_contacts", "Properties Without Contacts", "Fill missing contact details"],
      ["follow_up_call_list", "Follow-Up Call List", "Log outcomes after calls"],
      ["all_outreach", "All Outreach Records", "Contacts, prospects, companies, and properties"]
    ];
    return options.map(([type, label, detail]) => (
      `<button type="button" data-action="download-contact-workbook" data-workbook-type="${escapeHtml(type)}">${buttonContent(label, "export-full-backup")}<small>${escapeHtml(detail)}</small></button>`
    )).join("");
  }

  function renderExportView(data) {
    const module = selectedImportExportModule(data);
    if (!module) return emptyState("Export modules could not be loaded.");
    return `<div class="import-export-grid is-export">
      <section class="import-export-card">
        <div class="panel-heading">
          <div>
            <h3>Export Records</h3>
            <p>Download clean files for reporting, offline review, Excel edits, or backup snapshots.</p>
          </div>
        </div>
        <label>Data type
          <select data-import-export-module>${importExportModuleOptions(module.key)}</select>
        </label>
        <div class="import-export-button-grid">
          ${IMPORT_EXPORT_FORMATS.map((format) => `<button type="button" data-action="export-import-module" data-format="${format}">${buttonContent(format.toUpperCase(), "export-full-backup")}<small>${escapeHtml(format === "xlsx" ? "Excel workbook" : format === "pdf" ? "Printable report" : format === "json" ? "Raw backup data" : "CSV file")}</small></button>`).join("")}
        </div>
      </section>
      <section class="import-export-card">
        <div class="panel-heading">
          <div>
            <h3>Templates</h3>
            <p>Start with the correct columns, allowed values, required fields, and import instructions.</p>
          </div>
        </div>
        <div class="import-export-button-grid">
          ${IMPORT_EXPORT_TEMPLATE_FORMATS.map((format) => `<button type="button" data-action="download-import-template" data-format="${format}">${buttonContent(`${format.toUpperCase()} Template`, "export-full-backup")}<small>${escapeHtml(format === "xlsx" ? "Recommended" : "Simple CSV")}</small></button>`).join("")}
        </div>
      </section>
      <section class="import-export-card span-full">
        <div class="panel-heading">
          <div>
            <h3>Round-Trip Contact Workbooks</h3>
            <p>Download a fillable Excel workbook, complete contacts or call outcomes, then upload it back through Import Data for preview and confirmation.</p>
          </div>
        </div>
        <div class="import-export-button-grid">
          ${contactWorkbookButtons()}
        </div>
      </section>
    </div>`;
  }

  function renderSheetsView(data) {
    const module = selectedImportExportModule(data);
    const google = importExportSnapshot(data).google || {};
    const connection = (google.connections || []).find((item) => item.status === "connected") || (google.connections || [])[0];
    return `<div class="import-export-grid">
      <section class="import-export-card">
        <div class="panel-heading">
          <div>
            <h3>Google Sheets Connection</h3>
            <p>Use Google Sheets for collaboration while Supabase remains the primary dashboard database.</p>
          </div>
        </div>
        <div class="google-sheets-status ${connection ? "is-connected" : ""}">
          <strong>${connection ? "Connected" : google.configured ? "Ready to connect" : "Setup needed"}</strong>
          <span>${escapeHtml(connection?.account_email || google.error || "Add Google OAuth environment variables in Netlify, then connect your Google account.")}</span>
        </div>
        <div class="import-export-card-actions">
          <button type="button" data-action="connect-google-sheets">${buttonContent(connection ? "Reconnect Google Sheets" : "Connect Google Sheets", "go-route-planner")}</button>
          <button class="inline-action" type="button" data-action="refresh-google-sheets-status">${buttonContent("Refresh Status", "refresh-dashboard")}</button>
        </div>
      </section>
      <section class="import-export-card">
        <div class="panel-heading">
          <div>
            <h3>Send Dashboard Data to Sheets</h3>
            <p>Create or update a Google Sheet using the selected module export.</p>
          </div>
        </div>
        <label>Data type
          <select data-import-export-module>${importExportModuleOptions(module?.key)}</select>
        </label>
        <label>Optional spreadsheet ID
          <input data-google-spreadsheet-id placeholder="Leave blank to create a new Google Sheet">
        </label>
        <button type="button" data-action="export-google-sheet"${connection ? "" : " disabled"}>${buttonContent("Export to Google Sheets", "export-full-backup")}</button>
      </section>
    </div>`;
  }

  function renderHistoryRows(rows, type) {
    if (!rows.length) return emptyState(`No ${type} history yet.`);
    return `<div class="import-export-history-list">
      ${rows.slice(0, 20).map((row) => `<article class="import-export-history-row">
        <div>
          <strong>${escapeHtml(row.source_name || row.module || row.action_type || row.backup_type || row.sync_type || "Dashboard action")}</strong>
          <span>${escapeHtml(row.status || row.rollback_status || "complete")} / ${escapeHtml(row.created_at ? formatDate(row.created_at) : "recent")}</span>
        </div>
        <small>${escapeHtml([row.total_rows && `${row.total_rows} rows`, row.created_count && `${row.created_count} new`, row.updated_count && `${row.updated_count} updated`, row.destination_type].filter(Boolean).join(" / ") || "Tracked dashboard data action")}</small>
        ${type === "imports" && !row.rollback_status ? `<button class="inline-action" type="button" data-action="undo-import-batch" data-id="${escapeHtml(row.id)}">${buttonContent("Undo Import", "delete-outreach-prospect")}</button>` : ""}
      </article>`).join("")}
    </div>`;
  }

  function renderHistoryView(data) {
    const history = importExportSnapshot(data).history || {};
    return `<div class="import-export-grid">
      <section class="import-export-card span-full">
        <div class="panel-heading">
          <div>
            <h3>Backups & History</h3>
            <p>Review imports, exports, Sheets syncs, and JSON backups. Recent imports can be rolled back.</p>
          </div>
          <div class="import-export-card-actions">
            <button type="button" data-action="refresh-import-export-history">${buttonContent("Refresh History", "refresh-dashboard")}</button>
            <button class="inline-action" type="button" data-action="download-json-backup">${buttonContent("Download Full Backup", "export-full-backup")}</button>
          </div>
        </div>
      </section>
      <section class="import-export-card"><h3>Imports</h3>${renderHistoryRows(history.imports || [], "imports")}</section>
      <section class="import-export-card"><h3>Exports</h3>${renderHistoryRows(history.exports || [], "exports")}</section>
      <section class="import-export-card"><h3>Google Sheets</h3>${renderHistoryRows(history.syncs || [], "syncs")}</section>
      <section class="import-export-card"><h3>Backups</h3>${renderHistoryRows(history.backups || [], "backups")}</section>
    </div>`;
  }

  function renderImportExport(data = state.data) {
    if (!els.importExportMain) return;
    const snapshot = importExportSnapshot(data);
    const modules = snapshot.modules || [];
    if (els.importExportStatus) {
      els.importExportStatus.innerHTML = snapshot.fallback
        ? `<span>${escapeHtml(snapshot.fallback)}</span>`
        : `<span>Protected backend: <code>/.netlify/functions/dashboard-import-export</code></span><span>${escapeHtml(modules.length)} modules / ${escapeHtml(snapshot.limits?.maxImportRows || 0)} row import limit</span>`;
    }
    qsa("[data-import-export-view]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.importExportView === state.importExportView);
    });
    if (!modules.length) {
      els.importExportMain.innerHTML = emptyState(snapshot.fallback || "Import & Export Center needs the Supabase SQL tables before it can load.");
      return;
    }
    if (state.importExportView === "export") {
      els.importExportMain.innerHTML = renderExportView(data);
    } else if (state.importExportView === "sheets") {
      els.importExportMain.innerHTML = renderSheetsView(data);
    } else if (state.importExportView === "history") {
      els.importExportMain.innerHTML = renderHistoryView(data);
    } else {
      els.importExportMain.innerHTML = renderImportView(data);
    }
  }

  function currentImportExportModuleKey() {
    return qs("[data-import-export-module]")?.value || state.importExportModule || IMPORT_EXPORT_DEFAULT_MODULE;
  }

  function importExportFileFormat(filename, fallback = "csv") {
    const match = String(filename || "").toLowerCase().match(/\.([a-z0-9]+)$/);
    return match ? match[1] : fallback;
  }

  async function refreshImportExportData(message = "") {
    if (message) setDashboardState(message);
    state.data.importExport = await loadImportExportCenter();
    renderImportExport(state.data);
  }

  async function previewImportPayload(payload) {
    const moduleKey = currentImportExportModuleKey();
    state.importExportModule = moduleKey;
    setDashboardState("Checking import file...");
    const result = await importExportRequest("preview-import", {
      module: moduleKey,
      ...payload
    });
    state.importExportPreview = result;
    state.importExportPendingFile = {
      filename: result.filename || payload.filename || payload.sourceName || "Imported data",
      format: payload.format || "csv",
      fileBase64: payload.fileBase64 || "",
      content: payload.content || ""
    };
    renderImportExport(state.data);
    const rejected = result.preview?.summary?.rejected || 0;
    const duplicates = result.preview?.summary?.duplicates || 0;
    setDashboardState(rejected ? `${rejected} row${rejected === 1 ? "" : "s"} need fixes before import.` : duplicates ? `${duplicates} possible duplicate${duplicates === 1 ? "" : "s"} found. Review before saving.` : "Import preview is ready.");
  }

  async function previewImportFile(file) {
    if (!file) return;
    const format = importExportFileFormat(file.name);
    if (!["csv", "xlsx"].includes(format)) throw new Error("Choose a .csv or .xlsx file.");
    const fileBase64 = await readFileAsBase64(file);
    await previewImportPayload({
      filename: file.name,
      format,
      fileBase64
    });
  }

  async function confirmImportPreview() {
    const pending = state.importExportPendingFile;
    if (!pending) throw new Error("Preview an import file before confirming.");
    const mappings = importExportMappingsFromDom();
    setDashboardState("Saving import through the secure backend...");
    const result = await importExportRequest("confirm-import", {
      module: state.importExportModule,
      filename: pending.filename,
      format: pending.format,
      fileBase64: pending.fileBase64,
      content: pending.content,
      mappings
    });
    state.importExportPreview = null;
    state.importExportPendingFile = null;
    await refreshDashboard();
    setActiveSection("import-export");
    replaceDashboardHash("import-export");
    const summary = result.summary || {};
    setDashboardState(`Import complete: ${summary.created || 0} created, ${summary.updated || 0} updated, ${summary.skipped || 0} skipped.`);
  }

  async function downloadImportExport(format, action = "export") {
    const moduleKey = currentImportExportModuleKey();
    state.importExportModule = moduleKey;
    setDashboardState(action === "template" ? "Preparing import template..." : "Preparing export...");
    await importExportDownload(action, { module: moduleKey, format }, `urban-yards-${moduleKey}.${format}`);
    await refreshImportExportData(action === "template" ? "Template downloaded." : "Export downloaded.");
  }

  async function downloadContactWorkbook(workbookType) {
    const type = workbookType || "blank";
    setDashboardState("Preparing contact workbook...");
    await importExportDownload("contact-workbook", { workbookType: type }, `urban-yards-${type}-${todayKey()}.xlsx`);
    await refreshImportExportData("Contact workbook downloaded.");
  }

  async function downloadDashboardBackup() {
    setDashboardState("Preparing full JSON backup...");
    await importExportDownload("backup", { limit: 10000 }, `urban-yards-dashboard-backup-${todayKey()}.json`);
    await refreshImportExportData("Full backup downloaded.");
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

  async function refreshConnectedOperationsData(message = "Connected operations refreshed.") {
    state.data.connectedOps = await loadConnectedOperations();
    await render();
    setActiveSection("connected-operations");
    setDashboardState(state.connectedOpsReady || isDemoMode() ? message : "Connected Operations has been folded into Job Tickets for this rebuild.");
  }

  function connectedOpsPayloadFromForm(form) {
    const data = new FormData(form);
    const formType = form.dataset.connectedOpsForm || "recurring";
    if (formType === "communication") {
      return {
        table: "communications",
        record: {
          direction: "outbound",
          channel: String(data.get("channel") || "note"),
          contact_name: String(data.get("contact_name") || "").trim(),
          contact_email: String(data.get("contact_email") || "").trim() || null,
          contact_phone: String(data.get("contact_phone") || "").trim() || null,
          subject: String(data.get("subject") || "").trim(),
          body: String(data.get("body") || "").trim(),
          follow_up_date: String(data.get("follow_up_date") || "") || null
        }
      };
    }
    if (formType === "approval") {
      return {
        table: "approval_requests",
        record: {
          request_type: String(data.get("request_type") || "General"),
          title: String(data.get("title") || "").trim(),
          description: String(data.get("description") || "").trim(),
          priority: String(data.get("priority") || "Normal"),
          due_at: String(data.get("due_at") || "") || null,
          status: "Pending"
        }
      };
    }
    if (formType === "automation") {
      return {
        table: "automation_rules",
        record: {
          title: String(data.get("title") || "").trim(),
          trigger_key: String(data.get("trigger_key") || "").trim(),
          action_key: String(data.get("action_key") || "").trim(),
          enabled: Boolean(data.get("enabled"))
        }
      };
    }
    return {
      table: "recurring_services",
      record: {
        service_name: String(data.get("service_name") || "").trim(),
        service_type: String(data.get("service_type") || "").trim(),
        frequency: String(data.get("frequency") || "Weekly"),
        next_visit_date: String(data.get("next_visit_date") || "") || null,
        visit_window: String(data.get("visit_window") || "").trim(),
        price_per_visit: Number(data.get("price_per_visit") || 0),
        notes: String(data.get("notes") || "").trim(),
        status: "Active"
      }
    };
  }

  async function saveConnectedOperationsForm(form) {
    const { table, record } = connectedOpsPayloadFromForm(form);
    if (!record.title && !record.service_name && !record.subject && !record.contact_name) throw new Error("Add a title, service name, subject, or contact first.");
    if (!state.connectedOpsReady && !isDemoMode()) throw new Error("Connected Operations has been folded into Job Tickets for this rebuild.");

    if (isDemoMode()) {
      const now = new Date().toISOString();
      const id = nextDemoId(table);
      if (table === "recurring_services") {
        state.data.connectedOps.recurringServices.unshift(normalizeRecurringService({ id, ...record, created_at: now, updated_at: now }));
      } else if (table === "approval_requests") {
        state.data.connectedOps.approvals.unshift(normalizeApprovalRequest({ id, ...record, created_at: now, updated_at: now }));
      } else if (table === "communications") {
        state.data.connectedOps.communications.unshift(normalizeCommunication({ id, ...record, created_at: now, updated_at: now }));
      } else if (table === "automation_rules") {
        state.data.connectedOps.automationRules.unshift(normalizeAutomationRule({ id, ...record, created_at: now, updated_at: now }));
      }
      form.reset();
      await render();
      return;
    }

    await supabaseRestRequest(table, {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(record)
    });
    form.reset();
    await refreshConnectedOperationsData("Connected operations record saved.");
  }

  async function resolveConnectedApproval(id, status) {
    if (!id) return;
    if (isDemoMode()) {
      const item = state.data.connectedOps.approvals.find((approval) => approval.id === id);
      if (item) {
        item.status = status;
        item.reviewedAtRaw = new Date().toISOString();
        item.reviewedAt = formatDate(item.reviewedAtRaw);
      }
      await render();
      return;
    }
    if (!state.connectedOpsReady) throw new Error("Connected Operations has been folded into Job Tickets for this rebuild.");
    await supabaseRestRequest(`approval_requests?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        status,
        reviewed_at: new Date().toISOString()
      })
    });
    await refreshConnectedOperationsData(`Approval marked ${status.toLowerCase()}.`);
  }

  async function render() {
    const data = state.data;
    safeRender("notifications", () => renderNotifications(data));
    safeRender("home ticket workspace", () => renderHomeWorkspace(data));
    safeRender("job ticket workspace", () => renderJobTicketWorkspace(data));
    safeRender("work workspace", () => renderWorkWorkspace(data));
    safeRender("leads workspace", () => renderLeadsWorkspace(data));
    safeRender("money workspace", () => renderMoneyWorkspace(data));
    safeRender("tools workspace", () => renderToolsWorkspace(data));
    safeRender("property filters", () => populatePropertyFilter(data));
    safeRender("metrics", () => renderMetrics(data));
    safeRender("dashboard alerts", () => renderDashboardAlerts(data));
    safeRender("overdue jobs", () => renderOverdueJobAlerts(data));
    safeRender("today actions", () => renderTodayActions(data));
    safeRender("submissions", () => renderSubmissions(data));
    safeRender("upcoming", () => renderUpcoming(data));
    safeRender("home reminders", () => renderHomeReminders(data));
    safeRender("home notes", () => renderHomeNotes(data));
    safeRender("route snapshot", () => renderTodayRouteSnapshot(data));
    safeRender("quote table", () => renderQuoteTable(data));
    safeRender("pipeline", () => renderPipeline(data));
    safeRender("documents", () => renderDocuments(data));
    safeRender("documentation", () => renderDocumentation(data));
    safeRender("contacts", () => renderContacts(data));
    safeRender("outreach", () => renderOutreach(data));
    safeRender("equipment", () => renderEquipment(data));
    safeRender("jobs", () => renderJobs(data));
    safeRender("notes", () => renderNotes());
    safeRender("reminders", () => renderReminders(data));
    safeRender("calendar", () => renderCalendar(data));
    safeRender("operations", () => renderOperations(data));
    safeRender("route planner", () => renderRoutePlanner(data));
    safeRender("Groundskeeper AI", () => renderGroundskeeperAi(data));
    safeRender("import/export", () => renderImportExport(data));
    safeRender("users access", () => renderUsersAccess(data));
    safeRender("activity log", () => renderActivityLog(data));
    safeRender("profile avatar", () => renderCurrentProfileAvatar(data));
    safeRender("environment indicator", () => renderEnvironmentIndicator());
    safeRender("dashboard health", () => renderDashboardHealth());
    safeRender("global add menu", () => renderGlobalAddMenu());
    safeRender("global search", () => renderGlobalSearchPanel());
    safeRender("avatar fallbacks", () => bindAvatarFallbacks());
    if (els.todayChip) els.todayChip.textContent = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
    setActiveSection(state.activeSection);
  }

  async function refreshDashboard() {
    state.loading = true;
    state.error = "";
    setDashboardState("Loading dashboard records...");
    if (els.metrics) els.metrics.innerHTML = [
      ["Today's Jobs", "..."],
      ["Active Properties", "..."],
      ["Upcoming", "..."]
    ].map(([label, value]) => `<article class="metric-card"><strong>${value}</strong><span>${label}</span></article>`).join("");
    if (els.submissions) els.submissions.innerHTML = loadingState("Loading submissions...");
    if (els.upcoming) els.upcoming.innerHTML = loadingState("Loading visits...");

    try {
      state.data = await loadDashboardData();
      state.loading = false;
      state.lastRefreshAt = new Date().toISOString();
      await render();
      const warnings = dashboardHealthWarnings({ scope: "critical" });
      if (isDemoMode()) {
        setDashboardState("Demo mode: sample records only. Changes stay in this browser session and do not touch Supabase, Square, or real client data.");
      } else if (warnings.length) {
        setDashboardState(`${warnings.length} active workflow module${warnings.length === 1 ? "" : "s"} loaded with warnings. Open Tools for diagnostics.`, "warning");
      } else {
        setDashboardState("");
      }
    } catch (error) {
      state.loading = false;
      state.error = error.message || "Unable to load dashboard records.";
      setDashboardState(state.error, "error");
      if (els.submissions) els.submissions.innerHTML = emptyState("Dashboard records could not be loaded.");
      if (els.upcoming) els.upcoming.innerHTML = emptyState("Scheduled visits could not be loaded.");
    }
  }

  function setSidebarOpen(isOpen) {
    if (!els.appView) return;
    const shouldOpen = Boolean(isOpen);
    const wasOpen = els.appView.classList.contains("is-sidebar-open");

    if (sidebarCloseTimer) {
      clearTimeout(sidebarCloseTimer);
      sidebarCloseTimer = null;
    }

    if (shouldOpen) {
      els.appView.classList.remove("is-sidebar-closing");
      els.appView.classList.add("is-sidebar-open");
    } else {
      els.appView.classList.remove("is-sidebar-open");
      if (wasOpen) {
        els.appView.classList.add("is-sidebar-closing");
        sidebarCloseTimer = setTimeout(() => {
          els.appView?.classList.remove("is-sidebar-closing");
          sidebarCloseTimer = null;
        }, SIDEBAR_CLOSE_SETTLE_MS);
      } else {
        els.appView.classList.remove("is-sidebar-closing");
      }
    }

    if (els.sidebarToggle) {
      els.sidebarToggle.setAttribute("aria-expanded", String(shouldOpen));
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

    document.addEventListener("click", (event) => {
      const link = event.target instanceof Element ? event.target.closest("[data-dashboard-link]") : null;
      if (!link) return;
      event.preventDefault();
      const nextSection = dashboardSectionForRole(link.dataset.dashboardLink);
      setActiveSection(nextSection);
      replaceDashboardHash(nextSection);
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
        setGlobalAddOpen(false);
        closeGlobalSearchPanel();
      }
    });

    document.addEventListener("click", (event) => {
      if (!isNotificationsOpen()) return;
      const target = event.target;
      if (els.notificationButton?.contains(target) || els.notificationPanel?.contains(target)) return;
      setNotificationsOpen(false);
    });

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (state.addMenuOpen && !target.closest("[data-global-add-menu]") && !target.closest("[data-global-add-button]")) {
        setGlobalAddOpen(false);
      }
      if (state.globalSearchOpen && !target.closest("[data-global-search-panel]") && !target.closest("[data-global-search]")) {
        closeGlobalSearchPanel();
      }
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
        state.globalSearchOpen = state.search.trim().length >= 2;
        state.globalSearchActiveIndex = -1;
        if (els.search && els.search.value !== state.search) els.search.value = state.search;
        if (els.clientSearch && els.clientSearch.value !== state.search) els.clientSearch.value = state.search;
        if (els.overviewSearch && els.overviewSearch.value !== state.search) els.overviewSearch.value = state.search;
        if (els.workSearch && els.workSearch.value !== state.search) els.workSearch.value = state.search;
        await render();
      });
      els.globalSearch.addEventListener("keydown", (event) => {
        const groups = groupedGlobalSearchResults(state.search);
        const flat = globalSearchFlatResults(groups).filter((row) => row.action);
        if (event.key === "ArrowDown") {
          event.preventDefault();
          state.globalSearchOpen = true;
          state.globalSearchActiveIndex = flat.length ? Math.min(flat.length - 1, state.globalSearchActiveIndex + 1) : -1;
          renderGlobalSearchPanel();
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          state.globalSearchOpen = true;
          state.globalSearchActiveIndex = flat.length ? Math.max(0, state.globalSearchActiveIndex - 1) : -1;
          renderGlobalSearchPanel();
        } else if (event.key === "Enter" && flat.length) {
          event.preventDefault();
          const selected = flat[Math.max(0, state.globalSearchActiveIndex)];
          openGlobalSearchResult(selected);
        } else if (event.key === "Escape") {
          closeGlobalSearchPanel();
        }
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

    if (els.documentationSearch) {
      els.documentationSearch.addEventListener("input", async () => {
        state.documentationSearch = els.documentationSearch.value;
        await render();
      });
    }

    [
      [els.documentationTypeFilter, "documentationTypeFilter"],
      [els.documentationStatusFilter, "documentationStatusFilter"],
      [els.documentationCategoryFilter, "documentationCategoryFilter"]
    ].forEach(([element, key]) => {
      if (!element) return;
      element.addEventListener("change", async () => {
        state[key] = element.value;
        await render();
      });
    });

    if (els.budgetSearch) {
      els.budgetSearch.addEventListener("input", async () => {
        state.budgetSearch = els.budgetSearch.value;
        await render();
      });
    }

    [
      [els.budgetStatusFilter, "budgetStatusFilter"],
      [els.budgetJobStatusFilter, "budgetJobStatusFilter"],
      [els.budgetClientFilter, "budgetClientFilter"],
      [els.budgetServiceFilter, "budgetServiceFilter"],
      [els.budgetDateStart, "budgetDateStart"],
      [els.budgetDateEnd, "budgetDateEnd"]
    ].forEach(([element, key]) => {
      if (!element) return;
      element.addEventListener("change", async () => {
        state[key] = element.value || (key.includes("Filter") ? "All" : "");
        await render();
      });
    });

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
          const result = await uploadUserAvatar(targetUserId, file);
          if (result?.profile) upsertUserProfileRecord(result.profile);
          state.avatarUploadTargetId = "";
          target.value = "";
          setActiveSection("settings");
          setDashboardState("Avatar updated.");
        } catch (error) {
          state.avatarUploadTargetId = "";
          target.value = "";
          setDashboardState(error.message || "Unable to upload avatar.", "error");
        }
        return;
      }

      if (target.matches("[data-import-export-file]")) {
        const file = target.files && target.files[0];
        try {
          await previewImportFile(file);
        } catch (error) {
          setDashboardState(error.message || "Unable to preview import file.", "error");
        } finally {
          target.value = "";
        }
        return;
      }

      if (target.matches("[data-import-export-module]")) {
        state.importExportModule = target.value || IMPORT_EXPORT_DEFAULT_MODULE;
        state.importExportPreview = null;
        state.importExportPendingFile = null;
        await render();
        return;
      }

      if (target.matches("[data-import-map-source]")) {
        if (state.importExportPreview) {
          state.importExportPreview.mappings = importExportMappingsFromDom();
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

      if (target.matches("[data-ticket-type-select]")) {
        const form = target.closest("[data-ticket-create-form]");
        const isFieldTicket = target.value === "field";
        form?.classList.toggle("is-field-ticket", isFieldTicket);
        const visitDate = form?.querySelector("input[name='visit_date']");
        if (visitDate) visitDate.required = isFieldTicket;
        return;
      }

      if (target.matches("[data-ticket-board-stage-filter]")) {
        state.ticketBoardStageFilter = target.value || "All";
        renderJobTicketWorkspace(state.data);
        return;
      }

      if (target.matches("[data-ticket-board-owner-filter]")) {
        state.ticketBoardOwnerFilter = target.value || "All";
        renderJobTicketWorkspace(state.data);
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

    els.appView.addEventListener("input", (event) => {
      if (event.target?.matches?.("[data-ticket-board-search]")) {
        state.ticketBoardSearch = event.target.value || "";
        window.clearTimeout(state._ticketBoardSearchTimer);
        state._ticketBoardSearchTimer = window.setTimeout(() => renderJobTicketWorkspace(state.data), 120);
        return;
      }

      const form = event.target?.closest?.("form");
      if (!form || !form.querySelector("[data-duplicate-warning]")) return;
      window.clearTimeout(form._duplicateTimer);
      form._duplicateTimer = window.setTimeout(() => renderDuplicateWarning(form), 250);
    });

    els.appView.addEventListener("click", async (event) => {
      const target = event.target.closest("[data-action], [data-export]");
      if (!target) return;

      const action = target.dataset.action;
      const id = target.dataset.id;
      if (action !== "toggle-global-add") setGlobalAddOpen(false);
      if (target.closest("[data-global-search-panel]")) closeGlobalSearchPanel();

      if (target.dataset.export) {
        exportData(target.dataset.export);
        return;
      }

      if (action === "copy-dashboard-diagnostics") {
        try {
          await navigator.clipboard.writeText(diagnosticSummaryText());
          setDashboardState("Dashboard diagnostic summary copied.");
        } catch (error) {
          setDashboardState("Unable to copy diagnostics automatically. Browser clipboard permission may be blocked.", "error");
        }
        return;
      }

      if (action === "reset-ticket-board-filters") {
        state.ticketBoardSearch = "";
        state.ticketBoardStageFilter = "All";
        state.ticketBoardOwnerFilter = "All";
        renderJobTicketWorkspace(state.data);
        setDashboardState("Ticket board filters reset.");
        return;
      }

      if (action === "close-drawer") {
        closeSubmissionDrawer();
        return;
      }

      if (action === "toggle-global-add") {
        setGlobalAddOpen(!state.addMenuOpen);
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

      if (action === "set-documentation-view") {
        state.documentationView = target.dataset.documentationView || DOCUMENTATION_DEFAULT_VIEW;
        if (!target.closest(".documentation-center")) {
          setActiveSection("documentation");
          replaceDashboardHash("documentation");
        }
        await render();
        return;
      }

      if (action === "refresh-documentation") {
        try {
          setDashboardState("Refreshing documentation...");
          state.data.documentation = await loadDocumentation();
          await render();
          setDashboardState(state.documentationReady ? "Documentation refreshed." : "Documentation could not load right now.");
        } catch (error) {
          setDashboardState(error.message || "Unable to refresh documentation.", "error");
        }
        return;
      }

      if (action === "manage-documentation-templates") {
        state.documentationView = "upload";
        setActiveSection("documentation");
        replaceDashboardHash("documentation");
        await render();
        qs("[data-documentation-template-manager]")?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      if (action === "open-documentation-form") {
        openDocumentationDrawer(id);
        return;
      }

      if (action === "download-documentation-template") {
        const template = state.data.documentation.templates.find((item) => item.id === id);
        try {
          await openDocumentationSignedFile({
            bucket: template?.fileBucket || "documentation-templates",
            path: template?.filePath,
            label: "template file"
          });
          setDashboardState("Secure template link opened.");
        } catch (error) {
          setDashboardState(error.message || "Unable to open the template file.", "error");
        }
        return;
      }

      if (action === "open-documentation-archive-file") {
        const archiveId = target.dataset.archiveId || "";
        const archiveItem = buildDocumentationArchive(state.data.documentation).find((item) => item.id === archiveId);
        if (!archiveItem) {
          setDashboardState("Archive file not found.", "error");
          return;
        }
        try {
          await openDocumentationSignedFile({
            bucket: archiveItem.fileBucket,
            path: archiveItem.filePath,
            label: archiveItem.fileName || archiveItem.title || "archive file"
          });
          setDashboardState("Secure archive file opened.");
        } catch (error) {
          setDashboardState(error.message || "Unable to open the archive file.", "error");
        }
        return;
      }

      if (action === "upload-documentation-submission") {
        try {
          setDashboardState("Uploading completed form...");
          const submission = await uploadDocumentationSubmission(id);
          if (!submission) {
            setDashboardState("Upload cancelled.");
            return;
          }
          state.documentationView = "submitted";
          await refreshDashboard();
          setActiveSection("documentation");
          openDocumentationDrawer(submission.id);
          setDashboardState("Completed form submitted for review.");
        } catch (error) {
          setDashboardState(error.message || "Unable to upload completed form.", "error");
        }
        return;
      }

      if (action === "preview-documentation-submission") {
        const submission = state.data.documentation.submissions.find((item) => item.id === id);
        try {
          await openDocumentationSignedFile({
            bucket: submission?.fileBucket || "documentation-submissions",
            path: submission?.filePath,
            label: "submission file"
          });
          openDocumentationDrawer(id);
          setDashboardState("Secure submission preview opened.");
        } catch (error) {
          openDocumentationDrawer(id);
          setDashboardState(error.message || "Unable to preview submission.", "error");
        }
        return;
      }

      if (action === "approve-documentation-submission" || action === "reject-documentation-submission" || action === "request-documentation-corrections") {
        const nextStatus = action === "approve-documentation-submission"
          ? "Approved"
          : action === "reject-documentation-submission"
            ? "Archived"
            : "Needs Correction";
        try {
          setDashboardState("Updating documentation review...");
          const correctionNotes = action === "request-documentation-corrections"
            ? window.prompt("What corrections are needed?", "") || ""
            : "";
          await updateDocumentationSubmission(id, {
            status: nextStatus,
            reviewer_name: getSession()?.email || "Dashboard user",
            correction_notes: correctionNotes
          });
          state.documentationView = "submitted";
          await refreshDashboard();
          setActiveSection("documentation");
          openDocumentationDrawer(id);
          setDashboardState(`Documentation marked ${nextStatus.toLowerCase()}.`);
        } catch (error) {
          setDashboardState(error.message || "Unable to update documentation review.", "error");
        }
        return;
      }

      if (action === "assign-documentation-template") {
        const template = state.data.documentation.templates.find((item) => item.id === id);
        state.documentationView = "assign";
        setActiveSection("documentation");
        replaceDashboardHash("documentation");
        await render();
        const select = qs("[data-documentation-assignment-form] select[name='template_id']");
        if (select && template) select.value = template.id;
        qs("[data-documentation-assignment-form]")?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      if (action === "duplicate-documentation-template") {
        const template = state.data.documentation.templates.find((item) => item.id === id);
        if (!template) return;
        state.documentationView = "upload";
        await render();
        const form = qs("[data-documentation-template-form]");
        if (form) {
          form.elements.name.value = `${template.name} Copy`;
          form.elements.category.value = template.category;
          form.elements.instructions.value = template.instructions;
          form.elements.allowed_roles.value = template.allowedRoles.join(",");
          form.elements.current_version.value = String(template.currentVersion + 1);
          form.elements.recurrence_rule.value = template.recurrenceRule;
          form.elements.requires_signature.checked = template.requiresSignature;
          form.elements.requires_photos.checked = template.requiresPhotos;
          form.elements.is_recurring.checked = template.isRecurring;
          form.elements.required_by_default.checked = template.requiredByDefault;
          form.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        return;
      }

      if (action === "delete-documentation-template") {
        const template = state.data.documentation.templates.find((item) => item.id === id);
        if (!template) return;
        if (!canManageDocumentationTemplates()) {
          setDashboardState("Only Owner and Admin users can delete form templates.", "error");
          return;
        }
        const confirmed = window.confirm(`Delete "${template.name}" from the Template Library? Submitted forms and audit history remain, but this template will no longer be available to assign.`);
        if (!confirmed) {
          setDashboardState("Template delete cancelled.");
          return;
        }
        try {
          setDashboardState("Deleting form template...");
          await deleteRow("documentation_templates", id);
          state.documentationView = "templates";
          state.data.documentation = await loadDocumentation();
          await render();
          setActiveSection("documentation");
          setDashboardState("Form template deleted from the library.");
        } catch (error) {
          setDashboardState(error.message || "Unable to delete form template.", "error");
        }
        return;
      }

      if (action === "go-budgets") {
        setActiveSection("documents");
        replaceDashboardHash("documents");
        await render();
        setDashboardState("Budgets now live inside Money.");
        return;
      }

      if (action === "prepare-ticket-budget") {
        const ticket = dashboardTickets().find((item) => item.source === "ticket" && item.id === id);
        if (!ticket) {
          setDashboardState("Open a unified Job Ticket before preparing a budget.", "error");
          return;
        }
        try {
          setDashboardState("Preparing Money budget...");
          const result = await ensureBudgetForTicket(ticket);
          if (ticketStage(ticket) === "needs_budget") {
            await transitionJobTicketStage(ticket.id, "budget_in_progress", {
              notes: result.created ? "Draft Money budget prepared." : "Existing Money budget opened.",
              nextAction: "Complete cost review"
            });
          }
          await refreshDashboard();
          const refreshedTicket = dashboardTickets().find((item) => item.source === "ticket" && item.id === ticket.id) || ticket;
          const budget = findBudgetForTicket(refreshedTicket) || result.budget;
          if (budget?.id) openMoneyBudgetDrawer(budget.id);
          setDashboardState(result.created ? "Draft Money budget prepared." : "Existing Money budget opened.");
        } catch (error) {
          setDashboardState(error.message || "Unable to prepare budget.", "error");
        }
        return;
      }

      if (action === "create-ticket-invoice") {
        const ticket = dashboardTickets().find((item) => item.source === "ticket" && item.id === id);
        if (!ticket) {
          setDashboardState("Open a unified Job Ticket before preparing an invoice.", "error");
          return;
        }
        try {
          setDashboardState("Preparing final invoice...");
          const result = await ensureInvoiceForTicket(ticket);
          await refreshDashboard();
          const refreshedTicket = dashboardTickets().find((item) => item.source === "ticket" && item.id === ticket.id) || ticket;
          openTicketDrawer("ticket", refreshedTicket.id);
          setDashboardState(result.created ? "Final invoice prepared." : "Existing invoice opened.");
        } catch (error) {
          setDashboardState(error.message || "Unable to prepare invoice.", "error");
        }
        return;
      }

      if (action === "budget-detail-tab") {
        state.budgetDetailTab = target.dataset.tab || "overview";
        renderBudgetDetail();
        return;
      }

      if (action === "open-budget" || action === "edit-budget") {
        openMoneyBudgetDrawer(id);
        return;
      }

      if (action === "duplicate-budget") {
        try {
          setDashboardState("Duplicating budget...");
          const copy = await duplicateBudget(id);
          await refreshDashboard();
          if (copy?.id) openMoneyBudgetDrawer(copy.id);
          setDashboardState("Budget duplicated.");
        } catch (error) {
          setDashboardState(error.message || "Unable to duplicate budget.", "error");
        }
        return;
      }

      if (action === "archive-budget") {
        if (!window.confirm("Archive this budget? It will stay out of active Money review lists.")) return;
        try {
          setDashboardState("Archiving budget...");
          await archiveBudget(id);
          await refreshDashboard();
          setDashboardState("Budget archived.");
        } catch (error) {
          setDashboardState(error.message || "Unable to archive budget.", "error");
        }
        return;
      }

      if (action === "sync-budget-to-ticket") {
        const budget = activeBudgetBundle().budgets.find((item) => item.id === id);
        if (!budget) {
          setDashboardState("Budget record not found.", "error");
          return;
        }
        try {
          setDashboardState("Syncing budget to ticket...");
          const ticket = await syncBudgetToTicket(budget);
          await refreshDashboard();
          if (ticket?.id) openTicketDrawer("ticket", ticket.id);
          setDashboardState("Cost review synced to the Job Ticket.");
        } catch (error) {
          setDashboardState(error.message || "Unable to sync budget to ticket.", "error");
        }
        return;
      }

      if (action === "view-budget-job") {
        openJobDrawer(id);
        return;
      }
      if (action === "view-budget-quote") {
        openSubmissionDrawer(id);
        return;
      }
      if (action === "view-budget-invoice") {
        openDocumentDrawer(id);
        return;
      }

      if (action === "set-import-export-view") {
        state.importExportView = target.dataset.importExportView || "import";
        await render();
        return;
      }

      if (action === "review-import-history") {
        state.importExportView = "history";
        setActiveSection("import-export");
        replaceDashboardHash("import-export");
        await render();
        return;
      }

      if (action === "refresh-import-export") {
        try {
          await refreshImportExportData("Refreshing Import & Export Center...");
          setDashboardState("Import & Export Center refreshed.");
        } catch (error) {
          setDashboardState(error.message || "Unable to refresh Import & Export Center.", "error");
        }
        return;
      }

      if (action === "choose-import-spreadsheet") {
        if (els.importExportFile) els.importExportFile.click();
        return;
      }

      if (action === "preview-import-paste") {
        const textarea = qs("[data-import-paste]");
        const content = String(textarea?.value || "").trim();
        if (!content) {
          setDashboardState("Paste CSV content first.", "error");
          return;
        }
        try {
          await previewImportPayload({
            filename: "pasted-import.csv",
            format: "csv",
            content
          });
        } catch (error) {
          setDashboardState(error.message || "Unable to preview pasted CSV.", "error");
        }
        return;
      }

      if (action === "refresh-import-preview") {
        const pending = state.importExportPendingFile;
        if (!pending) {
          setDashboardState("Preview a file before rechecking mappings.", "error");
          return;
        }
        try {
          await previewImportPayload({
            filename: pending.filename,
            format: pending.format,
            fileBase64: pending.fileBase64,
            content: pending.content,
            mappings: importExportMappingsFromDom()
          });
        } catch (error) {
          setDashboardState(error.message || "Unable to recheck mappings.", "error");
        }
        return;
      }

      if (action === "confirm-import-file") {
        if (!window.confirm("Import the valid rows into Supabase now?")) return;
        try {
          await confirmImportPreview();
        } catch (error) {
          setDashboardState(error.message || "Unable to confirm import.", "error");
        }
        return;
      }

      if (action === "download-import-template") {
        try {
          await downloadImportExport(target.dataset.format || "xlsx", "template");
        } catch (error) {
          setDashboardState(error.message || "Unable to download template.", "error");
        }
        return;
      }

      if (action === "export-import-module") {
        try {
          await downloadImportExport(target.dataset.format || state.importExportFormat || "xlsx", "export");
        } catch (error) {
          setDashboardState(error.message || "Unable to export records.", "error");
        }
        return;
      }

      if (action === "download-contact-workbook") {
        try {
          await downloadContactWorkbook(target.dataset.workbookType || "blank");
        } catch (error) {
          setDashboardState(error.message || "Unable to download contact workbook.", "error");
        }
        return;
      }

      if (action === "download-json-backup") {
        try {
          await downloadDashboardBackup();
        } catch (error) {
          setDashboardState(error.message || "Unable to download backup.", "error");
        }
        return;
      }

      if (action === "refresh-import-export-history") {
        try {
          await refreshImportExportData("Refreshing import/export history...");
          setDashboardState("History refreshed.");
        } catch (error) {
          setDashboardState(error.message || "Unable to refresh history.", "error");
        }
        return;
      }

      if (action === "undo-import-batch") {
        if (!id || !window.confirm("Undo this import batch? Created rows will be removed and updated rows will be restored when possible.")) return;
        try {
          setDashboardState("Rolling back import...");
          const result = await importExportRequest("undo-import", { batchId: id });
          await refreshDashboard();
          setActiveSection("import-export");
          replaceDashboardHash("import-export");
          const summary = result.summary || {};
          setDashboardState(`Import rollback complete: ${summary.deleted || 0} deleted, ${summary.restored || 0} restored, ${summary.conflicts || 0} conflicts.`);
        } catch (error) {
          setDashboardState(error.message || "Unable to undo import.", "error");
        }
        return;
      }

      if (action === "connect-google-sheets") {
        try {
          setDashboardState("Preparing Google Sheets connection...");
          const result = await importExportRequest("google-start", {});
          if (result.setupRequired) {
            setDashboardState(result.error || "Google Sheets is not configured yet.", "error");
            return;
          }
          if (result.authorizationUrl) {
            window.open(result.authorizationUrl, "UrbanYardsGoogleSheets", "width=920,height=760,resizable=yes,scrollbars=yes");
            setDashboardState("Google authorization opened. Return here after connecting.");
          }
        } catch (error) {
          setDashboardState(error.message || "Unable to connect Google Sheets.", "error");
        }
        return;
      }

      if (action === "refresh-google-sheets-status") {
        try {
          await refreshImportExportData("Refreshing Google Sheets status...");
          setDashboardState("Google Sheets status refreshed.");
        } catch (error) {
          setDashboardState(error.message || "Unable to refresh Google Sheets status.", "error");
        }
        return;
      }

      if (action === "export-google-sheet") {
        try {
          const spreadsheetId = String(qs("[data-google-spreadsheet-id]")?.value || "").trim();
          setDashboardState("Sending records to Google Sheets...");
          const result = await importExportRequest("google-export", {
            module: currentImportExportModuleKey(),
            spreadsheetId
          });
          if (result.spreadsheetUrl) window.open(result.spreadsheetUrl, "_blank", "noopener");
          await refreshImportExportData(`Google Sheet updated with ${result.rows || 0} rows.`);
        } catch (error) {
          setDashboardState(error.message || "Unable to export to Google Sheets.", "error");
        }
        return;
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

      if (action === "set-follow-up-suggestion") {
        const form = target.closest("form");
        applyFollowUpSuggestion(form, Number(target.dataset.days || 1));
        return;
      }

      if (action === "clear-follow-up-suggestion") {
        const form = target.closest("form");
        const input = form?.querySelector("input[name='follow_up_date'], input[name='next_follow_up_at'], input[name='follow_up'], input[name='due_date']");
        if (input) input.value = "";
        return;
      }

      if (action === "focus-drawer-edit") {
        const input = els.detailContent?.querySelector("form input:not([type='hidden']), form select, form textarea");
        if (input) input.focus();
        return;
      }

      if (action === "quick-add-note-from-detail") {
        setActiveSection("overview");
        replaceDashboardHash("overview");
        const tools = qs(".home-secondary-tools");
        if (tools) tools.open = true;
        const form = qs("[data-operations-form]");
        if (form) {
          form.record_type.value = "task";
          form.title.value = `Note: ${target.dataset.relatedTitle || "Contact"}`;
          form.description.value = target.dataset.relatedContext || "";
          form.status.value = "Open";
          form.title.focus();
        }
        return;
      }

      if (action === "schedule-follow-up-from-detail") {
        setActiveSection("overview");
        replaceDashboardHash("overview");
        const tools = qs(".home-secondary-tools");
        if (tools) tools.open = true;
        const form = qs("[data-operations-form]");
        if (form) {
          form.record_type.value = "client";
          form.title.value = `Follow up with ${target.dataset.relatedTitle || "contact"}`;
          form.description.value = target.dataset.relatedContext || "";
          form.due_date.value = daysFromToday(1);
          form.status.value = "Open";
          form.title.focus();
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
          const result = await removeUserAvatar(targetUserId);
          if (result?.profile) upsertUserProfileRecord(result.profile);
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

      if (action === "set-connected-ops-view") {
        setActiveSection("tickets");
        replaceDashboardHash("tickets");
        await render();
        setDashboardState("Connected Operations has been folded into Job Tickets for this rebuild.");
        return;
      }

      if (action === "refresh-connected-operations") {
        setActiveSection("tickets");
        replaceDashboardHash("tickets");
        await render();
        setDashboardState("Connected Operations has been folded into Job Tickets for this rebuild.");
        return;
      }

      if (action === "resolve-approval") {
        setActiveSection("tickets");
        replaceDashboardHash("tickets");
        await render();
        setDashboardState("Approvals now move through Job Tickets instead of the retired Connected Operations module.");
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

      if (action === "advance-ticket-status") {
        const source = target.dataset.ticketSource;
        const status = target.dataset.status;
        const ticketId = target.dataset.ticketId || "";
        const table = source === "quote" ? "quote_submissions" : source === "job" ? "scheduled_jobs" : "";
        if (!table || !status) return;
        try {
          setDashboardState("Moving ticket forward...");
          if (ticketId) {
            const nextStage = source === "quote" ? quoteStage({ status }) : jobStage({ status });
            await transitionJobTicketStage(ticketId, nextStage, {
              notes: `${source === "quote" ? "Quote" : "Job"} source status set to ${status}.`,
              nextAction: ticketNextAction(nextStage),
              sourceStatus: status
            });
          }
          await updateStatus(table, id, status);
          await refreshDashboard();
          openTicketDrawer(ticketId ? "ticket" : source, ticketId || id);
          setDashboardState("Ticket updated.");
        } catch (error) {
          setDashboardState(error.message || "Unable to move ticket forward.", "error");
        }
        return;
      } else if (action === "transition-ticket-stage") {
        const nextStage = target.dataset.stage;
        const panel = target.closest("[data-ticket-command-panel]");
        const noteInput = panel?.querySelector("[data-ticket-transition-notes]");
        const nextActionInput = panel?.querySelector("[data-ticket-next-action-input]");
        try {
          setDashboardState("Moving ticket...");
          const ticket = await transitionJobTicketStage(id, nextStage, {
            notes: noteInput?.value || "",
            nextAction: nextActionInput?.value || target.dataset.nextAction || ticketNextAction(nextStage)
          });
          await refreshDashboard();
          openTicketDrawer("ticket", ticket?.id || id);
          setDashboardState(`Ticket moved to ${ticketStageLabel(normalizeTicketStageForDashboard(nextStage))}.`);
        } catch (error) {
          setDashboardState(error.message || "Unable to move ticket.", "error");
        }
        return;
      } else if (action === "save-ticket-command") {
        const panel = target.closest("[data-ticket-command-panel]");
        const noteInput = panel?.querySelector("[data-ticket-transition-notes]");
        const nextActionInput = panel?.querySelector("[data-ticket-next-action-input]");
        try {
          setDashboardState("Saving ticket note...");
          const ticket = await updateJobTicket(id, {
            internal_notes: noteInput?.value || "",
            next_action: nextActionInput?.value || ""
          });
          await insertJobTicketEvent(id, {
            event_type: "ticket_note_saved",
            notes: noteInput?.value || "Ticket note updated."
          });
          await refreshDashboard();
          openTicketDrawer("ticket", ticket?.id || id);
          setDashboardState("Ticket note saved.");
        } catch (error) {
          setDashboardState(error.message || "Unable to save ticket note.", "error");
        }
        return;
      } else if (action === "open-ticket-create") {
        const ticketType = target.dataset.ticketType || "quote";
        if (!canCreateTicketType(ticketType)) {
          setDashboardState("Your dashboard role cannot create that type of ticket.", "error");
          return;
        }
        openTicketCreateDrawer(ticketType);
      } else if (action === "open-ticket") {
        openTicketDrawer(target.dataset.ticketSource, id);
      } else if (action === "open-submission") {
        openSubmissionDrawer(id);
      } else if (action === "open-contact") {
        openContactDrawer(id);
      } else if (action === "reschedule-job") {
        openJobDrawer(id, { reschedule: true });
      } else if (action === "quick-add-job") {
        if (!canCreateTicketType("field")) {
          setDashboardState("Your dashboard role cannot create work visits.", "error");
          return;
        }
        openTicketCreateDrawer("field");
      } else if (action === "quick-add-quote") {
        if (!canCreateTicketType("quote")) {
          setDashboardState("Your dashboard role cannot create job tickets.", "error");
          return;
        }
        openTicketCreateDrawer("quote");
      } else if (action === "quick-add-follow-up" || action === "quick-add-invoice-reminder") {
        setActiveSection("overview");
        replaceDashboardHash("overview");
        const tools = qs(".home-secondary-tools");
        if (tools) tools.open = true;
        const form = qs("[data-operations-form]");
        if (form) {
          form.record_type.value = action === "quick-add-invoice-reminder" ? "payment" : "client";
          form.title.value = action === "quick-add-invoice-reminder" ? "Invoice reminder" : "Follow-up";
          form.status.value = "Open";
          form.title.focus();
        }
      } else if (action === "quick-add-property") {
        openOutreachPropertyCreateDrawer();
      } else if (action === "quick-add-equipment") {
        state.equipmentView = "inventory";
        setActiveSection("equipment");
        replaceDashboardHash("equipment");
        await render();
        const input = qs("[data-equipment-form] input[name='name']");
        if (input) input.focus();
      } else if (action === "quick-add-client") {
        setActiveSection("contacts");
        replaceDashboardHash("contacts");
        const input = qs("[data-client-form] input[name='name']");
        if (input) input.focus();
      } else if (action === "new-outreach-prospect") {
        if (!canManageLeadWorkflow()) {
          setDashboardState("Your dashboard role cannot manage leads.", "error");
          return;
        }
        openOutreachDrawer();
      } else if (action === "import-outreach-csv") {
        if (!hasDashboardPermission("import")) {
          setDashboardState("Your dashboard role cannot import leads.", "error");
          return;
        }
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
          replaceDashboardHash("route-planner");
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
        replaceDashboardHash("calendar");
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
        replaceDashboardHash("route-planner");
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
        replaceDashboardHash("overview");
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
        replaceDashboardHash("documents");
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
        replaceDashboardHash("overview");
        const tools = qs(".home-secondary-tools");
        if (tools) tools.open = true;
        const input = qs("[data-operations-form] input[name='title']");
        if (input) input.focus();
      } else if (action === "go-tickets") {
        setActiveSection("tickets");
        replaceDashboardHash("tickets");
      } else if (action === "go-leads") {
        setActiveSection("outreach");
        replaceDashboardHash("outreach");
      } else if (action === "go-work") {
        setActiveSection("calendar");
        replaceDashboardHash("calendar");
      } else if (action === "go-money") {
        setActiveSection("documents");
        replaceDashboardHash("documents");
      } else if (action === "go-tools") {
        setActiveSection("settings");
        replaceDashboardHash("settings");
      } else if (action === "go-route-planner") {
        setActiveSection("route-planner");
        replaceDashboardHash("route-planner");
      } else if (action === "go-equipment") {
        setActiveSection("equipment");
        replaceDashboardHash("equipment");
      } else if (action === "go-documentation") {
        setActiveSection("documentation");
        replaceDashboardHash("documentation");
      } else if (action === "go-import-export") {
        setActiveSection("import-export");
        replaceDashboardHash("import-export");
      } else if (action === "go-groundskeeper-ai") {
        setActiveSection("groundskeeper-ai");
        replaceDashboardHash("groundskeeper-ai");
      } else if (action === "go-connected-operations") {
        setActiveSection("tickets");
        replaceDashboardHash("tickets");
        await render();
        setDashboardState("Connected Operations has been folded into Job Tickets for this rebuild.");
      } else if (action === "go-calendar") {
        setActiveSection("calendar");
        replaceDashboardHash("calendar");
        const input = qs("[data-job-create-form] input[name='site_name']");
        if (input) input.focus();
      } else if (action === "go-documents") {
        setActiveSection("documents");
        replaceDashboardHash("documents");
      } else if (action === "go-settings") {
        setActiveSection("settings");
        replaceDashboardHash("settings");
      } else if (action === "go-contacts") {
        setActiveSection("contacts");
        replaceDashboardHash("contacts");
      } else if (action === "set-operation-filter") {
        state.operationsFilter = target.dataset.filter || "All";
        if (els.operationsFilter) els.operationsFilter.value = state.operationsFilter;
        await render();
      } else if (action === "prefill-operation") {
        setActiveSection("overview");
        replaceDashboardHash("overview");
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
            replaceDashboardHash("documents");
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
          replaceDashboardHash("route-planner");
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
          const document = await insertSalesDocument({
            document_type: action === "create-invoice" ? "invoice" : "estimate",
            client_name: item.name,
            client_email: item.email === "No email" ? "" : item.email,
            square_invoice_number: "",
            description: item.service,
            amount: 0,
            notes: `Created from quote submission ${item.id}. ${item.notes}`
          });
          const updatedSubmission = action === "create-invoice"
            ? await updateSubmission(item.id, {
              status: "Invoiced",
              follow_up: item.followUp === "Not set" ? "" : item.followUp,
              notes: item.notes
            })
            : item;
          await ensureJobTicketForQuoteSubmission(updatedSubmission || item, {
            stage: action === "create-invoice" ? "invoice_preparation" : quoteStage(updatedSubmission || item),
            invoice_id: document?.id,
            next_action: action === "create-invoice" ? ticketNextAction("invoice_preparation") : ticketNextAction(quoteStage(updatedSubmission || item)),
            internal_notes: `${action === "create-invoice" ? "Invoice" : "Estimate"} document ${document?.number || document?.id || ""} created from quote submission.`
          });
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
          await completeScheduledJobWithTicket(id);
          await refreshDashboard();
          openJobDrawer(id);
          setDashboardState("");
        } catch (error) {
          const message = /missing required details/i.test(error.message || "")
            ? "Upload arrival and completion photos before marking this visit complete."
            : error.message || "Unable to complete visit.";
          setDashboardState(message, "error");
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
      } else if (event.target.matches("[data-money-budget-form]")) {
        event.preventDefault();
        try {
          setDashboardState("Saving Money budget...");
          const budget = await saveBudgetFromForm(event.target);
          await refreshDashboard();
          if (budget?.id) openMoneyBudgetDrawer(budget.id);
          setDashboardState("Money budget saved.");
        } catch (error) {
          setDashboardState(error.message || "Unable to save budget.", "error");
        }
      } else if (event.target.matches("[data-ticket-assignment-form]")) {
        event.preventDefault();
        try {
          setDashboardState("Saving work assignment...");
          const result = await saveTicketWorkAssignment(event.target);
          await refreshDashboard();
          if (result?.ticketId) openTicketDrawer("ticket", result.ticketId);
          setDashboardState("Work assignment saved.");
        } catch (error) {
          setDashboardState(error.message || "Unable to save work assignment.", "error");
        }
      } else if (event.target.matches("[data-ticket-invoice-form]")) {
        event.preventDefault();
        try {
          setDashboardState("Saving invoice status...");
          const result = await saveTicketInvoiceStatus(event.target);
          await refreshDashboard();
          if (result?.ticketId) openTicketDrawer("ticket", result.ticketId);
          setDashboardState("Invoice status saved.");
        } catch (error) {
          setDashboardState(error.message || "Unable to save invoice status.", "error");
        }
      } else if (event.target.matches("[data-ticket-create-form]")) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const ticketType = String(formData.get("ticket_type") || "quote");
        if (!canCreateTicketType(ticketType)) {
          setDashboardState("Your dashboard role cannot create that type of ticket.", "error");
          return;
        }
        const customerName = String(formData.get("customer_name") || "").trim();
        const service = String(formData.get("service") || "").trim();
        const city = String(formData.get("city") || "").trim();
        if (!customerName || !service) {
          setDashboardState("Add a customer/site and service before creating the ticket.", "error");
          return;
        }
        try {
          setDashboardState("Creating ticket...");
          if (ticketType === "field") {
            const visitDate = String(formData.get("visit_date") || "").trim();
            if (!visitDate) {
              setDashboardState("Choose a visit date before creating a work ticket.", "error");
              return;
            }
            const jobs = await insertScheduledJobs([{
              visit_date: visitDate,
              visit_window: String(formData.get("visit_window") || "").trim(),
              site_name: customerName,
              city,
              service,
              status: "Scheduled"
            }]);
            const canonicalTicket = jobs[0]?.id ? await insertJobTicket({
              title: service,
              stage: "scheduled",
              status: "active",
              source_type: "job",
              source_id: jobs[0].id,
              job_id: jobs[0].id,
              customer_name: customerName,
              property_name: customerName,
              city,
              service,
              requested_service: service,
              notes: String(formData.get("notes") || "").trim(),
              visit_date: visitDate,
              scheduled_date: visitDate,
              owner_label: "Work",
              next_action: "Work the visit"
            }) : null;
            await refreshDashboard();
            if (canonicalTicket?.id) openTicketDrawer("ticket", canonicalTicket.id);
            else if (jobs[0]?.id) openTicketDrawer("job", jobs[0].id);
            setDashboardState("Work ticket created.");
          } else {
            const quote = await insertQuoteSubmission({
              name: customerName,
              email: String(formData.get("email") || "").trim(),
              phone: String(formData.get("phone") || "").trim(),
              property_type: String(formData.get("property_type") || "").trim(),
              city,
              service,
              source: "Dashboard Ticket",
              status: "New",
              notes: String(formData.get("notes") || "").trim()
            });
            const canonicalTicket = quote?.id ? await insertJobTicket({
              title: service,
              stage: "sales_intake",
              status: "open",
              source_type: "quote",
              source_id: quote.id,
              quote_id: quote.id,
              customer_name: customerName,
              contact_name: customerName,
              property_name: String(formData.get("property_type") || "").trim() || city,
              city,
              service,
              requested_service: service,
              notes: String(formData.get("notes") || "").trim(),
              owner_label: "Leads",
              next_action: "Review intake"
            }) : null;
            await refreshDashboard();
            if (canonicalTicket?.id) openTicketDrawer("ticket", canonicalTicket.id);
            else if (quote?.id) openTicketDrawer("quote", quote.id);
            setDashboardState("Intake ticket created.");
          }
        } catch (error) {
          setDashboardState(error.message || "Unable to create ticket.", "error");
        }
      } else if (event.target.matches("[data-submission-edit]")) {
        event.preventDefault();
        const item = findSubmission(state.selectedSubmissionId);
        if (!item) return;
        const formData = new FormData(event.target);
        try {
          setDashboardState("Saving quote...");
          const updatedSubmission = await updateSubmission(item.id, {
            status: String(formData.get("status") || "New"),
            follow_up: String(formData.get("follow_up") || ""),
            notes: String(formData.get("notes") || "")
          });
          await ensureJobTicketForQuoteSubmission(updatedSubmission || item, {
            stage: quoteStage(updatedSubmission || item),
            next_action: ticketNextAction(quoteStage(updatedSubmission || item))
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
          const jobs = await insertScheduledJobs(payloads);
          for (const job of jobs) {
            await ensureJobTicketForScheduledJob(job, {
              stage: "scheduled",
              notes: `Created from quote submission ${item.id}.`,
              owner_label: "Work",
              next_action: ticketNextAction("scheduled")
            });
          }
          const updatedQuote = await updateSubmission(item.id, {
            status: "Scheduled",
            follow_up: item.followUp === "Not set" ? "" : item.followUp,
            notes: item.notes
          });
          await ensureJobTicketForQuoteSubmission(updatedQuote || item, {
            stage: "ready_to_schedule",
            next_action: "Work visit created",
            internal_notes: jobs.length > 1
              ? `${jobs.length} recurring visits created from this quote.`
              : "Scheduled visit created from this quote."
          });
          await refreshDashboard();
          openSubmissionDrawer(item.id);
          setDashboardState(jobs.length > 1 ? `${jobs.length} recurring visits created and linked to Job Tickets.` : "Visit created and linked to a Job Ticket.");
        } catch (error) {
          setDashboardState(error.message || "Unable to create job.", "error");
        }
      } else if (event.target.matches("[data-job-edit-form]")) {
        event.preventDefault();
        const formData = new FormData(event.target);
        try {
          setDashboardState("Saving visit...");
          const requestedStatus = String(formData.get("status") || "Scheduled");
          const shouldComplete = /complete|done/i.test(requestedStatus);
          const updatedJob = await updateScheduledJob(state.selectedJobId, {
            visit_date: String(formData.get("visit_date") || ""),
            visit_window: String(formData.get("visit_window") || ""),
            site_name: String(formData.get("site_name") || ""),
            city: String(formData.get("city") || ""),
            service: String(formData.get("service") || ""),
            status: shouldComplete ? "In Progress" : requestedStatus
          });
          if (shouldComplete && updatedJob?.id) {
            await ensureJobTicketForScheduledJob(updatedJob, {
              stage: "in_progress",
              status: ticketRecordStatusForStage("in_progress"),
              next_action: ticketNextAction("in_progress")
            });
            await completeScheduledJobWithTicket(updatedJob);
          } else if (updatedJob?.id) {
            await ensureJobTicketForScheduledJob(updatedJob, {
              stage: jobStage(updatedJob),
              status: ticketRecordStatusForStage(jobStage(updatedJob)),
              next_action: ticketNextAction(jobStage(updatedJob))
            });
          }
          closeSubmissionDrawer();
          await refreshDashboard();
          setDashboardState("");
        } catch (error) {
          const message = /missing required details/i.test(error.message || "")
            ? "Upload arrival and completion photos before marking this visit complete."
            : error.message || "Unable to save visit.";
          setDashboardState(message, "error");
        }
      } else if (event.target.matches("[data-job-documentation-form]")) {
        event.preventDefault();
        const jobId = event.target.dataset.id || "";
        const formData = new FormData(event.target);
        const templateId = String(formData.get("template_id") || "").trim();
        try {
          setDashboardState("Adding documentation to visit...");
          await assignDocumentationTemplateToJob(jobId, templateId);
          event.target.reset();
          await refreshDashboard();
          openJobDrawer(jobId);
          setDashboardState("Documentation added to this visit.");
        } catch (error) {
          setDashboardState(error.message || "Unable to add documentation to visit.", "error");
        }
      } else if (event.target.matches("[data-job-photo-form]")) {
        event.preventDefault();
        const jobId = event.target.dataset.id || "";
        const photoStage = event.target.dataset.photoStage || "arrival";
        const files = Array.from(event.target.querySelector("input[type='file']")?.files || []);
        const stageLabel = photoStage === "arrival" ? "Arrival" : "Completion";
        try {
          setDashboardState(`Uploading ${files.length || ""} ${stageLabel.toLowerCase()} photo${files.length === 1 ? "" : "s"}...`);
          const uploads = await uploadJobSitePhotos(jobId, files, photoStage);
          await syncJobTicketPhotoProof(jobId, photoStage);
          event.target.reset();
          await refreshDashboard();
          openJobDrawer(jobId);
          setDashboardState(`${stageLabel} photo${uploads.length === 1 ? "" : "s"} uploaded.`);
        } catch (error) {
          setDashboardState(error.message || "Unable to upload job site photo.", "error");
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
          await ensureJobTicketForSalesDocument(document);
          event.target.reset();
          await refreshDashboard();
          openDocumentDrawer(document.id);
          setDashboardState("");
        } catch (error) {
          setDashboardState(error.message || "Unable to create document.", "error");
        }
      } else if (event.target.matches("[data-documentation-template-form]")) {
        event.preventDefault();
        try {
          setDashboardState("Saving documentation template...");
          await insertDocumentationTemplateFromForm(event.target);
          event.target.reset();
          state.documentationView = "archive";
          await refreshDashboard();
          setActiveSection("documentation");
          setDashboardState("Documentation form saved to the archive.");
        } catch (error) {
          setDashboardState(error.message || "Unable to save documentation template.", "error");
        }
      } else if (event.target.matches("[data-documentation-assignment-form]")) {
        event.preventDefault();
        try {
          setDashboardState("Assigning documentation form...");
          await insertDocumentationAssignment(documentationAssignmentPayloadFromForm(event.target));
          event.target.reset();
          state.documentationView = "assign";
          await refreshDashboard();
          setActiveSection("documentation");
          setDashboardState("Documentation form assigned.");
        } catch (error) {
          setDashboardState(error.message || "Unable to assign documentation form.", "error");
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
      } else if (event.target.matches("[data-outreach-property-quick-form]")) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const companyName = String(formData.get("company") || "").trim();
        try {
          setDashboardState("Adding property...");
          let company = companyName
            ? state.data.outreachCompanies.find((item) => normalizeDedupeKey(item.company) === normalizeDedupeKey(companyName))
            : null;
          if (companyName && !company) {
            company = await insertOutreachCompany({
              company: companyName,
              status: "Prospect",
              priority: "Normal"
            });
          }
          const payload = outreachPropertyPayloadFromForm(event.target, company || {});
          const saved = await insertOutreachProperty(payload);
          if (saved?.address && (saved.lat === null || saved.lng === null)) {
            geocodeAndStoreOutreachProperty(saved).catch(() => {});
          }
          await refreshDashboard();
          openOutreachPropertyDrawer(saved?.id);
          setDashboardState("Property added.");
        } catch (error) {
          setDashboardState(error.message || "Unable to add property.", "error");
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
          await ensureJobTicketForSalesDocument(document);
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
        replaceDashboardHash("overview");
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
    els.globalSearchPanel = qs("[data-global-search-panel]");
    els.globalAddButton = qs("[data-global-add-button]");
    els.globalAddMenu = qs("[data-global-add-menu]");
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
    els.documentationStatus = qs("[data-documentation-status]");
    els.documentationMain = qs("[data-documentation-main]");
    els.documentationSearch = qs("[data-documentation-search]");
    els.documentationTypeFilter = qs("[data-documentation-type-filter]");
    els.documentationStatusFilter = qs("[data-documentation-status-filter]");
    els.documentationCategoryFilter = qs("[data-documentation-category-filter]");
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
    els.importExportStatus = qs("[data-import-export-status]");
    els.importExportMain = qs("[data-import-export-main]");
    els.importExportFile = qs("[data-import-export-file]");
    els.importBackup = qs("[data-import-backup]");
    els.userAvatarUpload = qs("[data-user-avatar-upload]");
    els.usersAccessStatus = qs("[data-users-access-status]");
    els.usersAccessList = qs("[data-users-access-list]");
    els.activityLogList = qs("[data-activity-log-list]");
    els.dashboardHealth = qs("[data-dashboard-health]");
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
    els.todayActions = qs("[data-today-actions]");
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
    const pathSection = dashboardSectionFromPath();
    if (hashSection) state.activeSection = normalizeDashboardSection(hashSection);
    else if (pathSection) state.activeSection = normalizeDashboardSection(pathSection);

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

