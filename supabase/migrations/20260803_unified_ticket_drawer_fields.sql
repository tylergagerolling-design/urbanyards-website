-- Additive fields used by the unified ticket drawer.
-- Existing records and relationships are preserved; no rows are deleted or rewritten.

alter table if exists public.job_tickets
  add column if not exists priority text default 'Normal',
  add column if not exists work_window text,
  add column if not exists schedule_status text default 'Tentative',
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists included_work text,
  add column if not exists excluded_work text,
  add column if not exists requested_timing text,
  add column if not exists access_instructions text,
  add column if not exists customer_notes text;

comment on column public.job_tickets.priority is 'Operational priority snapshot for the job ticket.';
comment on column public.job_tickets.work_window is 'Human-readable scheduled work window.';
comment on column public.job_tickets.schedule_status is 'Tentative or confirmed scheduling state.';
comment on column public.job_tickets.customer_notes is 'Customer-visible notes kept separate from internal_notes.';
