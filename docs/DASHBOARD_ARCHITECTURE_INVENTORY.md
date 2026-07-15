# Urban Yards Dashboard Architecture Inventory

This inventory supports Rebuild V2 and must be kept current before any database-affecting work.

## Inventory Status

- Source reviewed: repository migrations, dashboard client queries, Netlify Functions, routing registry, rebuild design docs.
- Production database row counts: not captured in this repo-only checkpoint.
- Required production inventory script: `supabase/DATABASE_INVENTORY_READONLY.sql`.
- Current checkpoint database action: none. No tables, records, policies, triggers, storage buckets, or auth records were changed.

## Current App Shape

The dashboard is a static Netlify-deployed app with a Supabase-backed owner dashboard.

Primary public files:

- `dashboard.html`
- `dashboard.css`
- `dashboard.js`
- `dashboard-config.js`

New rebuild foundation modules:

- `src/app/routing/workspace-registry.js`
- `src/shared/config/dashboard-config.js`
- `src/shared/permissions/permissions.js`
- `src/shared/validation/ticket-validation.js`
- `src/features/tickets/types/ticket-stage.js`
- `src/features/tickets/workflow/ticket-workflow.js`
- `src/features/tickets/services/ticket-workflow-service.js`
- `src/features/tickets/services/ticket-number.js`
- `src/features/tickets/repositories/ticket-repository.js`
- `src/features/tickets/view-model/ticket-dashboard-view-model.js`

## Primary Workspaces

The approved dashboard navigation is:

- Home: `#overview`
- Tickets: `#tickets`
- Work: `#calendar`
- Leads: `#outreach`
- Money: `#documents`
- Tools: `#settings`

Legacy/support sections are aliases into those six workspaces and are not primary navigation:

- Route Planner -> Work
- Groundskeeper AI -> Tools
- Equipment -> Tools
- Documentation -> Tools
- Import & Export -> Tools
- Job Budgeter -> Money

## Canonical Workflow

The rebuild centers on one Job Ticket workflow:

`Lead or client request -> Job Ticket -> Quote and approval -> Budget preparation -> Work assignment and scheduling -> Field completion and documentation -> Final invoice -> Closed ticket`

The Job Ticket is the compatibility surface between legacy records and the new workflow.

## Active Client-Side Supabase Tables

The current dashboard client reads or writes these tables through REST helpers when available:

- `quote_submissions`
- `contacts`
- `scheduled_jobs`
- `job_notes`
- `follow_up_reminders`
- `lead_activity`
- `documentation_templates`
- `documentation_assignments`
- `documentation_submissions`
- `documentation_attachments`
- `documentation_audit_logs`
- `budget_settings`
- `job_budgets`
- `job_budget_labor`
- `job_budget_materials`
- `budget_material_catalog`
- `job_budget_equipment`
- `job_budget_costs`
- `job_budget_change_orders`
- `job_budget_documents`
- `job_budget_templates`
- `job_budget_template_items`
- `job_budget_history`
- `recurring_services`
- `recurring_service_visits`
- `job_checklist_templates`
- `job_checklists`
- `job_checklist_items`
- `job_time_entries`
- `job_site_photos`
- `approval_requests`
- `communications`
- `communication_templates`
- `client_share_links`
- `client_share_link_events`
- `equipment_maintenance_schedules`
- `equipment_maintenance_records`
- `automation_rules`
- `automation_runs`
- `command_usage_history`
- `sales_documents`
- `operations_records`
- `route_stops`
- `equipment_items`
- `equipment_maintenance`
- `hardware_guide`
- `outreach_prospects`
- `outreach_companies`
- `outreach_properties`
- `job_tickets`
- `job_ticket_events`
- `job_ticket_links`

Missing optional tables are handled as setup states and must not make the whole dashboard unusable.

## Server-Side Function Areas

Netlify Functions provide protected or server-only behavior for:

- AI helper and Groundskeeper AI
- Dashboard records
- Job tickets
- Dashboard activity/audit log access
- Users and avatar upload/delete
- Import/export and backup workflow
- Documentation storage
- Google Maps browser key, geocode, and route directions
- Square invoice sync and webhooks

Server-only keys must stay in Netlify environment variables and must not be exposed in browser bundles.

## Migration Files Present

- `supabase/migrations/20260709_security_foundation.sql`
- `supabase/migrations/20260709_dashboard_operations_foundation.sql`
- `supabase/migrations/20260709_user_avatars.sql`
- `supabase/migrations/20260710_documentation_forms.sql`
- `supabase/migrations/20260710_import_export_google_sheets.sql`
- `supabase/migrations/20260713_connected_operations.sql`
- `supabase/migrations/20260713_job_budgeter.sql`
- `supabase/migrations/20260714_job_ticket_foundation.sql`

Do not rerun large combined SQL blindly against production. Prefer smaller staged migrations or verified idempotent scripts.

## Core Preserved Structures

These structures are treated as production or business-data surfaces unless an inventory proves otherwise:

- Supabase Auth users
- `profiles` and `roles`
- quote/contact/job/note/reminder tables
- outreach companies, properties, and prospects
- route stops and scheduled jobs
- sales documents, invoices, and Square-linked records
- documentation templates, assignments, submissions, attachments, and audit logs
- equipment records and maintenance records
- import/export, backup, and Google connection tables
- AI settings, rules, knowledge, versions, logs, and feedback
- job ticket tables and events

## Storage Buckets Referenced By Migrations

- `user-avatars`
- `documentation-templates`
- `documentation-submissions`
- `job-site-photos`
- `budget-documents`

Bucket policies and file type limits must remain restrictive. Do not add unrestricted public upload paths.

## RLS and Role Model

The migration set uses `dashboard_role_at_least(...)` and role-based policies across operational tables.

Primary roles in the rebuild:

- `owner`
- `admin`
- `manager`
- `sales_outreach`
- `accountant`
- `field_worker`
- `worker`
- `viewer`

Rules:

- Do not globally disable RLS.
- Do not weaken policies to fix UI issues.
- Owner/admin can manage protected modules.
- Field/worker roles should only get assigned or role-appropriate records.
- Client-facing access must never expose internal costs, margins, private notes, or service-role access.

## Data Classification Guidance

Before migration or cleanup, classify records as:

- Production business data: real clients, prospects, jobs, invoices, documents, routes, photos, users, and logs.
- Imported business data: CSV/Excel/Google Sheets imports and import batches.
- Development/demo data: local or obvious sample rows only after row review.
- Disposable test data: only rows proven to be test records and approved for removal.

No current checkpoint removes data.

## Current Rebuild Compatibility Plan

1. Keep existing tables readable.
2. Use `job_tickets` as the central workflow when installed.
3. Continue deriving fallback tickets from `quote_submissions` and `scheduled_jobs` when canonical tickets are missing.
4. Connect each page incrementally through shared ticket view models.
5. Avoid duplicate client, property, lead, job, quote, invoice, equipment, or user tables.
6. Keep optional modules behind setup/health warnings instead of hard failures.

## Required Before Any Future Destructive Change

1. Run `supabase/DATABASE_INVENTORY_READONLY.sql` in Supabase SQL Editor.
2. Export every result set.
3. Save the export with the rebuild notes.
4. Create a Supabase backup, branch, or verified recovery point.
5. Compare expected and actual table counts.
6. Write a staged migration and rollback plan.
7. Apply only additive or compatibility-preserving changes first.

## Current Checkpoint Conclusion

Checkpoint 4 is a repository architecture inventory only. It documents active modules, data surfaces, migrations, storage, and preservation rules. It does not modify Supabase.
