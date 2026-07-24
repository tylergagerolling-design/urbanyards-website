"use strict";

function createPermissionGuard({ hasPermission }) {
  if (typeof hasPermission !== "function") throw new Error("Assistant permission guard requires a permission checker.");
  return {
    assert(actor, permission) {
      if (!actor) {
        const error = new Error("Sign in again before Groundskeeper accesses dashboard records.");
        error.statusCode = 401;
        throw error;
      }
      if (!hasPermission(actor.role, permission)) {
        const error = new Error("You do not have permission to use this Groundskeeper tool.");
        error.statusCode = 403;
        throw error;
      }
      return true;
    }
  };
}

module.exports = { createPermissionGuard };
