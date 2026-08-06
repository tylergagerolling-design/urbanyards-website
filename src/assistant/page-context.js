"use strict";

function cleanString(value, max = 160) {
  return String(value || "").slice(0, max);
}

function actorFirstName(actor = {}) {
  const profile = actor.profile || {};
  const metadata = actor.user?.user_metadata || {};
  const candidate = profile.first_name || profile.firstName || profile.display_name || profile.displayName
    || profile.full_name || profile.fullName || metadata.first_name || metadata.full_name
    || actor.user?.email || actor.email || "";
  const first = String(candidate).trim().split(/[\s@]+/)[0].replace(/[^a-zA-Z'’-]/g, "");
  return first ? first.slice(0, 60) : "";
}

function sanitizePageContext(input = {}, actor = {}) {
  const filters = input.visibleFilters && typeof input.visibleFilters === "object"
    ? Object.fromEntries(Object.entries(input.visibleFilters).slice(0, 12).map(([key, value]) => [cleanString(key, 60), cleanString(value, 120)]))
    : {};
  return {
    currentRoute: cleanString(input.currentRoute || input.activeSection || "overview"),
    activeTab: cleanString(input.activeTab || input.activeSection || ""),
    selectedRecordType: cleanString(input.selectedRecordType || ""),
    selectedRecordId: cleanString(input.selectedRecordId || ""),
    visibleRecordIds: Array.isArray(input.visibleRecordIds) ? input.visibleRecordIds.slice(0, 30).map((id) => cleanString(id, 100)) : [],
    visibleFilters: filters,
    currentUserId: cleanString(actor.userId || actor.user?.id || ""),
    currentUserRole: cleanString(actor.role || "viewer", 40),
    currentUserFirstName: actorFirstName(actor),
    timezone: cleanString(input.timezone || "America/Los_Angeles", 80),
    currentDate: cleanString(input.currentDate || new Date().toISOString().slice(0, 10), 20)
  };
}

module.exports = { actorFirstName, sanitizePageContext };
