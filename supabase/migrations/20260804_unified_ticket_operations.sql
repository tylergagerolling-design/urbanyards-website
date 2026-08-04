-- Additive unified-ticket operations links. This migration does not delete or rewrite existing records.

alter table if exists public.scheduled_jobs
  add column if not exists ticket_id uuid references public.job_tickets(id) on delete set null,
  add column if not exists estimated_duration_minutes integer,
  add column if not exists arrived_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists cancelled_at timestamptz;

alter table if exists public.job_checklists
  add column if not exists ticket_id uuid references public.job_tickets(id) on delete cascade;

alter table if exists public.job_site_photos
  add column if not exists ticket_id uuid references public.job_tickets(id) on delete cascade,
  add column if not exists removed_at timestamptz,
  add column if not exists removed_by uuid references auth.users(id) on delete set null;

alter table if exists public.job_notes
  add column if not exists ticket_id uuid references public.job_tickets(id) on delete cascade,
  add column if not exists author_user_id uuid references auth.users(id) on delete set null,
  add column if not exists edited_at timestamptz,
  add column if not exists deleted_at timestamptz;

create table if not exists public.job_ticket_crew_assignments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.job_tickets(id) on delete cascade,
  scheduled_job_id uuid,
  user_id uuid references auth.users(id) on delete set null,
  employee_name text,
  is_lead boolean not null default false,
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  removed_at timestamptz,
  constraint job_ticket_crew_identity_check check (user_id is not null or nullif(btrim(employee_name), '') is not null)
);

create unique index if not exists job_ticket_crew_active_user_key
  on public.job_ticket_crew_assignments(ticket_id, coalesce(scheduled_job_id, '00000000-0000-0000-0000-000000000000'::uuid), user_id)
  where removed_at is null and user_id is not null;

create table if not exists public.job_ticket_equipment_assignments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.job_tickets(id) on delete cascade,
  scheduled_job_id uuid,
  equipment_id uuid,
  equipment_name text,
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  removed_at timestamptz,
  constraint job_ticket_equipment_identity_check check (equipment_id is not null or nullif(btrim(equipment_name), '') is not null)
);

create unique index if not exists job_ticket_equipment_active_key
  on public.job_ticket_equipment_assignments(ticket_id, coalesce(scheduled_job_id, '00000000-0000-0000-0000-000000000000'::uuid), equipment_id)
  where removed_at is null and equipment_id is not null;

create index if not exists scheduled_jobs_ticket_idx on public.scheduled_jobs(ticket_id, visit_date);
create index if not exists job_checklists_ticket_idx on public.job_checklists(ticket_id, due_date);
create index if not exists job_site_photos_ticket_idx on public.job_site_photos(ticket_id, photo_type, created_at desc);
create index if not exists job_notes_ticket_idx on public.job_notes(ticket_id, created_at desc);
create index if not exists job_ticket_crew_ticket_idx on public.job_ticket_crew_assignments(ticket_id, removed_at);
create index if not exists job_ticket_equipment_ticket_idx on public.job_ticket_equipment_assignments(ticket_id, removed_at);

alter table public.job_ticket_crew_assignments enable row level security;
alter table public.job_ticket_equipment_assignments enable row level security;

drop policy if exists "staff crew assignment access" on public.job_ticket_crew_assignments;
create policy "staff crew assignment access" on public.job_ticket_crew_assignments for all
  using (public.dashboard_role_at_least('worker'))
  with check (public.dashboard_role_at_least('worker'));

drop policy if exists "viewer crew assignment read" on public.job_ticket_crew_assignments;
create policy "viewer crew assignment read" on public.job_ticket_crew_assignments for select
  using (public.dashboard_role_at_least('viewer'));

drop policy if exists "staff equipment assignment access" on public.job_ticket_equipment_assignments;
create policy "staff equipment assignment access" on public.job_ticket_equipment_assignments for all
  using (public.dashboard_role_at_least('worker'))
  with check (public.dashboard_role_at_least('worker'));

drop policy if exists "viewer equipment assignment read" on public.job_ticket_equipment_assignments;
create policy "viewer equipment assignment read" on public.job_ticket_equipment_assignments for select
  using (public.dashboard_role_at_least('viewer'));

comment on table public.job_ticket_crew_assignments is 'Non-destructive crew assignment history for unified tickets and optional visits.';
comment on table public.job_ticket_equipment_assignments is 'Non-destructive equipment assignment history for unified tickets and optional visits.';
