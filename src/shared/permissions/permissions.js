"use strict";

const ROLES = Object.freeze({
  OWNER: "owner",
  SALES_OUTREACH: "sales_outreach",
  FIELD_WORKER: "field_worker",
  ACCOUNTANT: "accountant"
});

const PERMISSIONS = Object.freeze({
  TICKETS_VIEW_ALL: "tickets.view_all",
  TICKETS_VIEW_ASSIGNED: "tickets.view_assigned",
  TICKETS_VIEW_CREATED: "tickets.view_created",
  TICKETS_CREATE: "tickets.create",
  TICKETS_EDIT_SALES: "tickets.edit_sales",
  TICKETS_EDIT_SCOPE: "tickets.edit_scope",
  TICKETS_EDIT_SCHEDULE: "tickets.edit_schedule",
  TICKETS_ASSIGN: "tickets.assign",
  TICKETS_START_FIELD_WORK: "tickets.start_field_work",
  TICKETS_PAUSE_FIELD_WORK: "tickets.pause_field_work",
  TICKETS_COMPLETE_FIELD_WORK: "tickets.complete_field_work",
  TICKETS_REQUEST_SCOPE_CHANGE: "tickets.request_scope_change",
  TICKETS_APPROVE_OWNER: "tickets.approve_owner",
  TICKETS_CANCEL: "tickets.cancel",
  JOBS_VIEW_ALL: "jobs.view_all",
  JOBS_VIEW_ASSIGNED: "jobs.view_assigned",
  JOBS_VIEW_CREATED: "jobs.view_created",
  JOBS_CREATE: "jobs.create",
  JOBS_EDIT_SCOPE: "jobs.edit_scope",
  JOBS_EDIT_SCHEDULE: "jobs.edit_schedule",
  JOBS_ASSIGN: "jobs.assign",
  JOBS_START: "jobs.start",
  JOBS_PAUSE: "jobs.pause",
  JOBS_COMPLETE: "jobs.complete",
  JOBS_CANCEL: "jobs.cancel",
  JOBS_REQUEST_SCOPE_CHANGE: "jobs.request_scope_change",
  BUDGETS_VIEW: "budgets.view",
  BUDGETS_CREATE: "budgets.create",
  BUDGETS_EDIT: "budgets.edit",
  BUDGETS_APPROVE: "budgets.approve",
  FINANCIALS_VIEW: "financials.view",
  PROFITABILITY_VIEW: "profitability.view",
  INVOICES_CREATE: "invoices.create",
  INVOICES_EDIT: "invoices.edit",
  PAYMENTS_RECORD: "payments.record",
  PROSPECTS_VIEW: "prospects.view",
  PROSPECTS_CREATE: "prospects.create",
  PROSPECTS_EDIT: "prospects.edit",
  QUOTES_CREATE: "quotes.create",
  QUOTES_EDIT: "quotes.edit",
  QUOTES_APPROVE: "quotes.approve",
  DOCUMENTATION_VIEW: "documentation.view",
  DOCUMENTATION_UPLOAD: "documentation.upload",
  DOCUMENTATION_MANAGE_TEMPLATES: "documentation.manage_templates",
  EQUIPMENT_VIEW: "equipment.view",
  EQUIPMENT_MANAGE: "equipment.manage",
  USERS_MANAGE: "users.manage",
  SETTINGS_MANAGE: "settings.manage",
  INTEGRATIONS_MANAGE: "integrations.manage",
  AUDIT_VIEW: "audit.view"
});

const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.OWNER]: Object.values(PERMISSIONS),
  [ROLES.SALES_OUTREACH]: [
    PERMISSIONS.TICKETS_VIEW_CREATED,
    PERMISSIONS.TICKETS_CREATE,
    PERMISSIONS.TICKETS_EDIT_SALES,
    PERMISSIONS.TICKETS_EDIT_SCOPE,
    PERMISSIONS.JOBS_VIEW_CREATED,
    PERMISSIONS.JOBS_CREATE,
    PERMISSIONS.PROSPECTS_VIEW,
    PERMISSIONS.PROSPECTS_CREATE,
    PERMISSIONS.PROSPECTS_EDIT,
    PERMISSIONS.QUOTES_CREATE,
    PERMISSIONS.QUOTES_EDIT,
    PERMISSIONS.QUOTES_APPROVE,
    PERMISSIONS.DOCUMENTATION_VIEW
  ],
  [ROLES.FIELD_WORKER]: [
    PERMISSIONS.TICKETS_VIEW_ASSIGNED,
    PERMISSIONS.TICKETS_START_FIELD_WORK,
    PERMISSIONS.TICKETS_PAUSE_FIELD_WORK,
    PERMISSIONS.TICKETS_COMPLETE_FIELD_WORK,
    PERMISSIONS.TICKETS_REQUEST_SCOPE_CHANGE,
    PERMISSIONS.JOBS_VIEW_ASSIGNED,
    PERMISSIONS.JOBS_START,
    PERMISSIONS.JOBS_PAUSE,
    PERMISSIONS.JOBS_COMPLETE,
    PERMISSIONS.JOBS_REQUEST_SCOPE_CHANGE,
    PERMISSIONS.DOCUMENTATION_VIEW,
    PERMISSIONS.DOCUMENTATION_UPLOAD,
    PERMISSIONS.EQUIPMENT_VIEW
  ],
  [ROLES.ACCOUNTANT]: [
    PERMISSIONS.TICKETS_VIEW_ALL,
    PERMISSIONS.JOBS_VIEW_ALL,
    PERMISSIONS.BUDGETS_VIEW,
    PERMISSIONS.BUDGETS_CREATE,
    PERMISSIONS.BUDGETS_EDIT,
    PERMISSIONS.FINANCIALS_VIEW,
    PERMISSIONS.PROFITABILITY_VIEW,
    PERMISSIONS.INVOICES_CREATE,
    PERMISSIONS.INVOICES_EDIT,
    PERMISSIONS.PAYMENTS_RECORD,
    PERMISSIONS.DOCUMENTATION_VIEW,
    PERMISSIONS.AUDIT_VIEW
  ]
});

function normalizeRole(role) {
  const value = String(role || "").trim().toLowerCase();
  if (value === "admin") return ROLES.OWNER;
  if (value === "sales") return ROLES.SALES_OUTREACH;
  if (value === "worker" || value === "employee") return ROLES.FIELD_WORKER;
  return Object.values(ROLES).includes(value) ? value : "";
}

function getRolePermissions(role) {
  return ROLE_PERMISSIONS[normalizeRole(role)] || [];
}

function hasPermission(user, permission) {
  const role = normalizeRole(user && user.role);
  const overrides = new Set((user && user.permissionOverrides) || []);
  const denied = new Set((user && user.deniedPermissions) || []);
  if (denied.has(permission)) return false;
  return getRolePermissions(role).includes(permission) || overrides.has(permission);
}

function canViewJob(user, job = {}) {
  if (hasPermission(user, PERMISSIONS.JOBS_VIEW_ALL)) return true;
  if (hasPermission(user, PERMISSIONS.JOBS_VIEW_ASSIGNED) && job.assignedUserId && job.assignedUserId === user.userId) return true;
  if (hasPermission(user, PERMISSIONS.JOBS_VIEW_CREATED) && job.createdBy && job.createdBy === user.userId) return true;
  return false;
}

function canViewTicket(user, ticket = {}) {
  if (hasPermission(user, PERMISSIONS.TICKETS_VIEW_ALL)) return true;
  if (hasPermission(user, PERMISSIONS.TICKETS_VIEW_ASSIGNED) && ticket.assignedUserId && ticket.assignedUserId === user.userId) return true;
  if (hasPermission(user, PERMISSIONS.TICKETS_VIEW_CREATED) && ticket.createdBy && ticket.createdBy === user.userId) return true;
  return false;
}

module.exports = {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  normalizeRole,
  getRolePermissions,
  hasPermission,
  canViewJob,
  canViewTicket
};
