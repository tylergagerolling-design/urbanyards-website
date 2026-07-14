"use strict";

const { PERMISSIONS } = require("../../shared/permissions/permissions");

const WORKSPACES = Object.freeze([
  {
    key: "overview",
    label: "Overview",
    defaultRoute: "command-center",
    nav: [
      { key: "command-center", label: "Command Center", permission: PERMISSIONS.TICKETS_VIEW_ALL },
      { key: "my-day", label: "My Day", permission: PERMISSIONS.TICKETS_VIEW_ASSIGNED },
      { key: "notifications", label: "Notifications", permission: PERMISSIONS.DOCUMENTATION_VIEW }
    ]
  },
  {
    key: "field-worker",
    label: "Field Worker",
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
    key: "sales-outreach",
    label: "Sales Outreach",
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
    key: "accountant",
    label: "The Accountant",
    defaultRoute: "financial-overview",
    nav: [
      { key: "financial-overview", label: "Financial Overview", permission: PERMISSIONS.FINANCIALS_VIEW },
      { key: "budgeting-queue", label: "Budgeting Queue", permission: PERMISSIONS.BUDGETS_VIEW },
      { key: "job-budgets", label: "Job Budgets", permission: PERMISSIONS.BUDGETS_VIEW },
      { key: "invoices", label: "Invoices", permission: PERMISSIONS.INVOICES_CREATE },
      { key: "payments", label: "Payments", permission: PERMISSIONS.PAYMENTS_RECORD },
      { key: "reports", label: "Reports & Exports", permission: PERMISSIONS.PROFITABILITY_VIEW }
    ]
  }
]);

function getWorkspace(key) {
  return WORKSPACES.find((workspace) => workspace.key === key) || WORKSPACES[0];
}

function getVisibleWorkspaces(user, permissionService) {
  return WORKSPACES.filter((workspace) => workspace.nav.some((item) => permissionService.hasPermission(user, item.permission)));
}

function getVisibleWorkspaceNav(workspaceKey, user, permissionService) {
  return getWorkspace(workspaceKey).nav.filter((item) => permissionService.hasPermission(user, item.permission));
}

module.exports = {
  WORKSPACES,
  getWorkspace,
  getVisibleWorkspaces,
  getVisibleWorkspaceNav
};
