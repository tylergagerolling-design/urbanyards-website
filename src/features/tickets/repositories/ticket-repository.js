"use strict";

const { AppError, ERROR_CATEGORIES, normalizeError } = require("../../../shared/errors/app-error");
const { ok, fail } = require("../../../shared/result");

function createTicketRepository({ supabase, tableName = "job_tickets" }) {
  if (!supabase) {
    throw new AppError({
      code: "TICKET_REPOSITORY_MISSING_CLIENT",
      category: ERROR_CATEGORIES.INTEGRATION,
      userMessage: "The ticket data service is not configured.",
      technicalMessage: "createTicketRepository requires a Supabase client.",
      operation: "tickets.repository.init"
    });
  }

  async function listTickets(filters = {}) {
    try {
      let query = supabase.from(tableName).select("*").order("updated_at", { ascending: false });
      if (filters.stage) query = query.eq("stage", filters.stage);
      if (filters.createdBy) query = query.eq("created_by", filters.createdBy);
      if (filters.assignedUserId) query = query.eq("assigned_user_id", filters.assignedUserId);
      const { data, error } = await query;
      if (error) throw error;
      return ok(data || []);
    } catch (error) {
      return fail(normalizeError(error, {
        code: "TICKET_LIST_FAILED",
        category: ERROR_CATEGORIES.DATABASE,
        operation: "tickets.list"
      }));
    }
  }

  async function updateTicketStage(id, stage, patch = {}) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .update({ ...patch, stage, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return ok(data);
    } catch (error) {
      return fail(normalizeError(error, {
        code: "TICKET_STAGE_UPDATE_FAILED",
        category: ERROR_CATEGORIES.DATABASE,
        operation: "tickets.update_stage",
        entityType: "job_ticket",
        entityId: id
      }));
    }
  }

  return {
    listTickets,
    updateTicketStage
  };
}

module.exports = {
  createTicketRepository
};
