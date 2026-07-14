"use strict";

const { PERMISSIONS } = require("../../shared/permissions/permissions");

const WORKSPACES = Object.freeze([
  {
    key: "overview",
    label: "Overview",
    aliases: ["home", "command-center", "operations", "connected-operations"],
    defaultRoute: "command-center",
    nav: [
      { key: "command-center", label: "Command Center", permission: PERMISSIONS.TICKETS_VIEW_ALL },
      { key: "my-day", label: "My Day", permission: PERMISSIONS.TICKETS_VIEW_ASSIGNED },
      { key: "created-tickets", label: "Created Tickets", permission: PERMISSIONS.TICKETS_VIEW_CREATED },
      { key: "notifications", label: "Notifications", permission: PERMISSIONS.DOCUMENTATION_VIEW }
    ]
  },
  {
    key: "calendar",
    label: "Field Worker",
    aliases: ["work", "field-worker", "route-planner", "route", "schedule"],
    defaultRoute: "todays-work",
    nav: [
      { key: "todays-work", label: "Today's Work", permission: PERMISSIONS.TICKETS_VIEW_ASSIGNED },
      { key: "schedule", label: "Schedule", permission: PERMISSIONS.TICKETS_VIEW_ASSIGNED },
      { key: "route", label: "Route", permission: PERMISSIONS.TICKETS_VIEW_ASSIGNED },
      { key: "documentation", label: "Documentation", permission: PERMISSIONS.DOCUMENTATION_UPLOAD },
      { key: "time-mileage", label: "Time & Mileage", permission: PERMISSIONS.TICKETS_COMPLETE_FIELD_WORK }
    ]
  },
  {
    key: "outreach",
    label: "Sales Outreach",
    aliases: ["leads", "sales", "clients", "contacts", "properties", "sales-outreach"],
    defaultRoute: "sales-dashboard",
    nav: [
      { key: "sales-dashboard", label: "Sales Dashboard", permission: PERMISSIONS.PROSPECTS_VIEW },
      { key: "prospects", label: "Prospects", permission: PERMISSIONS.PROSPECTS_VIEW },
      { key: "follow-ups", label: "Follow-Ups", permission: PERMISSIONS.PROSPECTS_EDIT },
      { key: "quotes", label: "Quotes", permission: PERMISSIONS.QUOTES_CREATE },
      { key: "created-tickets", label: "Created Tickets", permission: PERMISSIONS.TICKETS_VIEW_CREATED }
    ]
  },
  {
    key: "documents",
    label: "The Accountant",
    aliases: ["money", "quotes", "pipeline", "accountant", "budgets", "budget", "job-budgeter"],
    defaultRoute: "financial-overview",
    nav: [
      { key: "financial-overview", label: "Financial Overview", permission: PERMISSIONS.FINANCIALS_VIEW },
      { key: "cost-review-queue", label: "Cost Review Queue", permission: PERMISSIONS.COST_REVIEW_VIEW },
      { key: "ticket-costs", label: "Ticket Costs", permission: PERMISSIONS.COST_REVIEW_VIEW },
      { key: "invoices", label: "Invoices", permission: PERMISSIONS.INVOICES_CREATE },
      { key: "payments", label: "Payments", permission: PERMISSIONS.PAYMENTS_RECORD },
      { key: "reports", label: "Reports & Exports", permission: PERMISSIONS.PROFITABILITY_VIEW }
    ]
  },
  {
    key: "settings",
    label: "Tools",
    aliases: ["tools", "more", "data", "forms", "documentation", "import-export", "equipment", "groundskeeper-ai", "ai"],
    defaultRoute: "dashboard-health",
    nav: [
      { key: "dashboard-health", label: "Dashboard Health", permission: PERMISSIONS.SETTINGS_MANAGE },
      { key: "users-access", label: "Users & Access", permission: PERMISSIONS.USERS_MANAGE },
      { key: "documentation", label: "Documentation", permission: PERMISSIONS.DOCUMENTATION_MANAGE_TEMPLATES },
      { key: "import-export", label: "Import & Export", permission: PERMISSIONS.INTEGRATIONS_MANAGE },
      { key: "equipment", label: "Equipment", permission: PERMISSIONS.EQUIPMENT_MANAGE },
      { key: "groundskeeper-ai", label: "Groundskeeper AI", permission: PERMISSIONS.SETTINGS_MANAGE }
    ]
  }
]);

function normalizeWorkspaceKey(key) {
  const value = String(key || "").trim().toLowerCase();
  if (!value) return WORKSPACES[0].key;
  const workspace = WORKSPACES.find((item) => item.key === value || (item.aliases || []).includes(value));
  return workspace ? workspace.key : WORKSPACES[0].key;
}

function getWorkspace(key) {
  const normalizedKey = normalizeWorkspaceKey(key);
  return WORKSPACES.find((workspace) => workspace.key === normalizedKey) || WORKSPACES[0];
}

function getVisibleWorkspaces(user, permissionService) {
  return WORKSPACES.filter((workspace) => workspace.nav.some((item) => permissionService.hasPermission(user, item.permission)));
}

function getVisibleWorkspaceNav(workspaceKey, user, permissionService) {
  return getWorkspace(workspaceKey).nav.filter((item) => permissionService.hasPermission(user, item.permission));
}

module.exports = {
  WORKSPACES,
  normalizeWorkspaceKey,
  getWorkspace,
  getVisibleWorkspaces,
  getVisibleWorkspaceNav
};
