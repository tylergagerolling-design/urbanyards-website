# Unified ticket integration map

## Reused production structures

- `job_tickets`: canonical lifecycle, customer/property snapshots, service/scope, status, priority, due/scheduled dates, quote/invoice links, assignment owner, completion requirements, and financial state.
- `job_ticket_events`: append-only activity history with actor, event type, stage change, before/after values, and timestamp.
- `clients`, `properties`, `leads`: customer, site, and originating lead records. Lead conversion retains the source and links the resulting ticket.
- `scheduled_jobs`: existing visit records. The additive integration adds a canonical `ticket_id`, duration, arrival/completion, and cancellation timestamps.
- `job_checklists`, `job_checklist_items`: normalized checklist and derived progress; no stored percentage.
- `job_site_photos` and private documentation storage: categorized job photo metadata and protected file objects.
- `documentation_attachments`, `sales_documents`: ticket documents and existing private storage/download behavior.
- `job_notes`: operational notes; additive ticket/author/edit/delete fields preserve every prior note.
- `profiles`: assignable users and existing role/access infrastructure.
- `equipment_items` / `equipment`: existing equipment inventory.
- `sales_documents`, `invoices`, `expenses`, `invoice_payments`: existing financial links; unchanged in this phase.

## Additive relationships

- `scheduled_jobs.ticket_id -> job_tickets.id`
- `job_checklists.ticket_id -> job_tickets.id`
- `job_site_photos.ticket_id -> job_tickets.id`
- `job_notes.ticket_id -> job_tickets.id`
- `job_ticket_crew_assignments`: ticket/optional-visit crew, lead flag, assignment/removal history, duplicate prevention.
- `job_ticket_equipment_assignments`: ticket/optional-visit equipment, assignment/removal history, duplicate prevention.

## Shared active data flow

The approved Home, Tickets timeline, Work List, Work Detail, and unified-ticket overview now use one adapter over `state.data.tickets`. It joins scheduled jobs, profiles, checklists/items, categorized photos, documents, assignments, and ticket events. Mutations update the existing shared state and append a ticket event, so every active view observes the same record after refresh/render.

## Existing services reused

- Authenticated `dashboard-tickets` endpoint for canonical ticket mutations and append-only events.
- Authenticated `dashboard-records` endpoint for normalized operational records.
- Existing private documentation upload service for job photos and ticket documents.
- Existing ticket workflow/status definitions and permission checks.
- Existing lead conversion, ticket creation, schedule creation, document, profile, equipment, Supabase auth, and RLS infrastructure.

## Missing fields addressed

The additive `20260804_unified_ticket_operations.sql` migration supplies visit lifecycle timestamps, canonical ticket foreign keys on legacy operational tables, normalized crew/equipment assignment history, indexes, and RLS policies.

## Explicitly non-destructive / not performed

- No tables or columns are dropped or renamed.
- No production IDs or records are replaced.
- Existing status values are mapped in the shared presentation adapter rather than rewritten.
- No storage bucket is made public and no RLS policy is disabled.
- Historical notes, visits, photos, documents, and lead records are preserved.
