# Urban Yards Dashboard Rebuild V2 Foundation

This document records the first controlled rebuild slice for the Urban Yards dashboard.

## Current Architecture Discovered

- The public website and dashboard are a static HTML/CSS/JavaScript app deployed by Netlify.
- The dashboard currently lives mostly in `dashboard.html`, `dashboard.css`, and a large `dashboard.js` IIFE.
- Supabase access is performed from the dashboard through REST helpers and from Netlify Functions using server-side keys where required.
- Netlify Functions are already present for AI, dashboard records, users, avatars, import/export, documentation storage, maps, Square, and activity logging.
- The current local workspace is not recognized by Git even though a `.git` folder exists, so branch creation must use the fresh-clone route until the local checkout is repaired.

## Systems To Preserve

- Login, sign-in, sign-out, invite callback, and Supabase auth.
- Supabase configuration and existing RLS assumptions.
- Netlify functions and private server-side environment variables.
- Google Maps, Google Voice launcher, Square, file uploads, notifications, avatars, and Groundskeeper AI infrastructure.
- Existing data and migrations.

## Canonical Workflow Decision

The rebuild is centered on one unified `Job Ticket` system.

The Job Ticket is the source of truth across sales intake, scope, quote, customer approval, budget, owner approval, draft invoice, scheduling, field work, final invoice, payment, and closure.

Do not create separate disconnected systems for leads, quotes, jobs, budgets, assignments, field work, invoices, and payments. Existing tables and code should be inventoried as migration inputs and compatibility surfaces, not treated as competing canonical systems.

## First Rebuild Boundary

The first code slice adds a clean foundation without replacing the active dashboard UI yet. The intent is to stop adding more logic to `dashboard.js` and move new workflow behavior into tested modules.

No production database schema changes are included in this slice.

Database rebuild protection is documented in `docs/DATABASE_REBUILD_SAFETY_PLAN.md`, and the read-only inventory script lives at `supabase/DATABASE_INVENTORY_READONLY.sql`.

Created foundation modules:

- `src/shared/result.js`
- `src/shared/errors/app-error.js`
- `src/shared/logging/logger.js`
- `src/shared/config/dashboard-config.js`
- `src/shared/permissions/permissions.js`
- `src/shared/validation/ticket-validation.js`
- `src/app/routing/workspace-registry.js`
- `src/features/tickets/types/ticket-stage.js`
- `src/features/tickets/workflow/ticket-workflow.js`
- `src/features/tickets/services/ticket-workflow-service.js`
- `src/features/tickets/services/ticket-number.js`
- `src/features/tickets/repositories/ticket-repository.js`

Canonical dashboard workspaces:

- `overview`
- `calendar`
- `outreach`
- `documents`
- `settings`

Legacy dashboard routes such as `route-planner`, `groundskeeper-ai`, `sales-outreach`, and `job-budgeter` are treated as aliases into those five workspaces instead of new primary tabs.

## Initial Role Model

Roles:

- `owner`
- `sales_outreach`
- `field_worker`
- `accountant`

Permission checks are centralized in `src/shared/permissions/permissions.js`.

## Initial Ticket Workflow

Stages:

- `draft`
- `sales_intake`
- `scope_in_progress`
- `quote_pending`
- `customer_approval_pending`
- `needs_budget`
- `budget_in_progress`
- `needs_owner_approval`
- `invoice_preparation`
- `ready_to_schedule`
- `scheduled`
- `in_progress`
- `paused`
- `scope_change_requested`
- `field_work_complete`
- `completion_review`
- `invoice_review`
- `invoice_sent`
- `partially_paid`
- `paid`
- `closed`
- `cancelled`

Transitions are centralized in `src/features/tickets/workflow/ticket-workflow.js`.

Scheduling is blocked until required ticket conditions are satisfied, including scope, customer approval, budget completion, owner approval, draft invoice, applicable deposit, and required documentation.

## Deferred From This Slice

- Replacing the active dashboard shell.
- Archiving legacy dashboard UI files.
- Adding new production schema migrations.
- Rebuilding every workspace page.
- Reworking existing Netlify Functions into services/repositories.

Those should happen in the next staged pass after this foundation is verified.
