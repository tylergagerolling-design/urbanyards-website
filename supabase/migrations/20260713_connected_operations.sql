-- Urban Yards connected operations foundation.
-- Safe to run more than once. Builds shared tables for recurring service,
-- field work, checklists, approvals, communication history, share links,
-- equipment maintenance planning, automation, and command/search telemetry.

create extension if not exists pgcrypto;

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text unique,
  role text not null default 'viewer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  display_name text,
  role text not null default 'viewer',
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.profiles
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists disabled_at timestamptz;

create or replace function public.dashboard_role_rank(role_name text)
returns integer
language sql
immutable
as $$
  select case lower(coalesce(role_name, ''))
    when 'client' then 10
    when 'viewer' then 20
    when 'worker' then 30
    when 'staff' then 40
    when 'manager' then 40
    when 'admin' then 50
    when 'owner' then 60
    else 0
  end;
$$;

create or replace function public.dashboard_current_role()
returns text
language sql
stable
as $$
  select coalesce(
    (select p.role from public.profiles p where p.id = auth.uid() and p.disabled_at is null limit 1),
    (select p.role from public.profiles p where p.user_id = auth.uid() and p.disabled_at is null limit 1),
    (select p.role from public.profiles p where lower(p.email) = lower(auth.jwt() ->> 'email') and p.disabled_at is null limit 1),
    (select r.role from public.roles r where r.user_id = auth.uid() limit 1),
    (select r.role from public.roles r where lower(r.email) = lower(auth.jwt() ->> 'email') limit 1),
    case when lower(auth.jwt() ->> 'email') = 'team@urbanyards.us' then 'owner' end,
    'viewer'
  );
$$;

create or replace function public.dashboard_role_at_least(minimum_role text)
returns boolean
language sql
stable
as $$
  select public.dashboard_role_rank(public.dashboard_current_role()) >= public.dashboard_role_rank(minimum_role);
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.recurring_services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  client_id uuid,
  property_id uuid,
  quote_id uuid,
  budget_id uuid,
  service_name text not null,
  service_type text,
  description text,
  frequency text not null default 'Weekly',
  interval_count integer not null default 1,
  preferred_weekdays text[] not null default '{}'::text[],
  visit_window text,
  default_crew_size integer not null default 1,
  assigned_user_ids uuid[] not null default '{}'::uuid[],
  start_date date not null default current_date,
  end_date date,
  next_visit_date date,
  last_visit_date date,
  status text not null default 'Active',
  price_per_visit numeric(12,2) not null default 0,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recurring_services_status_check check (status in ('Draft','Active','Paused','Needs Review','Completed','Archived')),
  constraint recurring_services_frequency_check check (frequency in ('Daily','Weekly','Biweekly','Monthly','Quarterly','Custom')),
  constraint recurring_services_interval_check check (interval_count > 0)
);

do $$
begin
  if to_regclass('public.job_budgets') is not null then
    alter table public.recurring_services
      drop constraint if exists recurring_services_budget_id_fkey;
    alter table public.recurring_services
      add constraint recurring_services_budget_id_fkey
      foreign key (budget_id) references public.job_budgets(id) on delete set null;
  end if;
end $$;

create table if not exists public.recurring_service_visits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  recurring_service_id uuid not null references public.recurring_services(id) on delete cascade,
  scheduled_job_id uuid,
  visit_date date not null,
  visit_window text,
  status text not null default 'Scheduled',
  completion_percent numeric(7,3) not null default 0,
  actual_started_at timestamptz,
  actual_completed_at timestamptz,
  skipped_reason text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recurring_service_visits_status_check check (status in ('Scheduled','In Progress','Completed','Skipped','Needs Reschedule','Canceled')),
  constraint recurring_service_visits_completion_check check (completion_percent >= 0 and completion_percent <= 100)
);

create table if not exists public.job_checklist_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  title text not null,
  category text not null default 'General',
  service_type text,
  description text,
  status text not null default 'Active',
  visibility text not null default 'Internal',
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_checklist_templates_status_check check (status in ('Draft','Active','Archived')),
  constraint job_checklist_templates_visibility_check check (visibility in ('Internal','Field','Client Shared'))
);

create table if not exists public.job_checklist_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.job_checklist_templates(id) on delete cascade,
  label text not null,
  helper_text text,
  item_type text not null default 'checkbox',
  required boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_checklist_template_items_type_check check (item_type in ('checkbox','text','number','photo','signature','select'))
);

create table if not exists public.job_checklists (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  template_id uuid references public.job_checklist_templates(id) on delete set null,
  job_id uuid,
  scheduled_job_id uuid,
  recurring_service_visit_id uuid references public.recurring_service_visits(id) on delete set null,
  title text not null,
  status text not null default 'Not Started',
  assigned_to uuid references auth.users(id) on delete set null,
  due_date date,
  completed_at timestamptz,
  completed_by uuid references auth.users(id) on delete set null,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_checklists_status_check check (status in ('Not Started','In Progress','Needs Review','Completed','Archived'))
);

create table if not exists public.job_checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.job_checklists(id) on delete cascade,
  template_item_id uuid references public.job_checklist_template_items(id) on delete set null,
  label text not null,
  helper_text text,
  item_type text not null default 'checkbox',
  required boolean not null default false,
  sort_order integer not null default 0,
  checked boolean not null default false,
  value_text text,
  value_number numeric(12,3),
  completed_at timestamptz,
  completed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_checklist_items_type_check check (item_type in ('checkbox','text','number','photo','signature','select'))
);

create table if not exists public.job_time_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  job_id uuid,
  scheduled_job_id uuid,
  user_id uuid references auth.users(id) on delete set null,
  entry_date date not null default current_date,
  started_at timestamptz,
  ended_at timestamptz,
  hours numeric(10,2) not null default 0,
  labor_category text,
  notes text,
  status text not null default 'Draft',
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_time_entries_status_check check (status in ('Draft','Submitted','Approved','Rejected'))
);

create table if not exists public.job_site_photos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  job_id uuid,
  scheduled_job_id uuid,
  checklist_id uuid references public.job_checklists(id) on delete set null,
  photo_type text not null default 'progress',
  storage_bucket text not null default 'job-site-photos',
  storage_path text not null,
  public_url text,
  caption text,
  taken_at timestamptz,
  uploaded_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_site_photos_type_check check (photo_type in ('arrival','completion','progress','issue','receipt','other'))
);

create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  request_type text not null,
  related_table text,
  related_id uuid,
  title text not null,
  description text,
  priority text not null default 'Normal',
  status text not null default 'Pending',
  requested_by uuid references auth.users(id) on delete set null,
  assigned_to uuid references auth.users(id) on delete set null,
  due_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  decision_notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint approval_requests_priority_check check (priority in ('Low','Normal','High','Urgent')),
  constraint approval_requests_status_check check (status in ('Pending','Approved','Declined','Needs More Info','Canceled','Archived'))
);

create table if not exists public.communications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  direction text not null default 'outbound',
  channel text not null default 'note',
  related_table text,
  related_id uuid,
  client_id uuid,
  property_id uuid,
  job_id uuid,
  contact_name text,
  contact_email text,
  contact_phone text,
  subject text,
  body text,
  outcome text,
  follow_up_date date,
  sent_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint communications_direction_check check (direction in ('inbound','outbound','internal')),
  constraint communications_channel_check check (channel in ('email','phone','sms','voicemail','website','note','portal','other'))
);

create table if not exists public.communication_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  title text not null,
  category text not null default 'General',
  channel text not null default 'email',
  subject text,
  body text not null,
  status text not null default 'Active',
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint communication_templates_channel_check check (channel in ('email','phone','sms','voicemail','website','note','portal','other')),
  constraint communication_templates_status_check check (status in ('Draft','Active','Archived'))
);

create table if not exists public.client_share_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  related_table text,
  related_id uuid,
  client_id uuid,
  contact_email text,
  title text not null,
  token_hash text not null unique,
  token_hint text,
  status text not null default 'Active',
  expires_at timestamptz,
  last_viewed_at timestamptz,
  view_count integer not null default 0,
  allowed_sections text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_share_links_status_check check (status in ('Draft','Active','Expired','Revoked','Archived'))
);

create table if not exists public.client_share_link_permissions (
  id uuid primary key default gen_random_uuid(),
  share_link_id uuid not null references public.client_share_links(id) on delete cascade,
  permission_key text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (share_link_id, permission_key)
);

create table if not exists public.client_share_link_events (
  id uuid primary key default gen_random_uuid(),
  share_link_id uuid references public.client_share_links(id) on delete cascade,
  event_type text not null,
  ip_hash text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.equipment_maintenance_schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  equipment_id uuid,
  equipment_name text,
  maintenance_type text not null,
  frequency text not null default 'Monthly',
  interval_count integer not null default 1,
  next_due_date date,
  next_due_hours numeric(10,2),
  assigned_to uuid references auth.users(id) on delete set null,
  status text not null default 'Active',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint equipment_maintenance_schedules_status_check check (status in ('Active','Paused','Completed','Archived')),
  constraint equipment_maintenance_schedules_frequency_check check (frequency in ('Daily','Weekly','Monthly','Quarterly','Every Use','Hour Meter','Custom')),
  constraint equipment_maintenance_schedules_interval_check check (interval_count > 0)
);

create table if not exists public.equipment_maintenance_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  schedule_id uuid references public.equipment_maintenance_schedules(id) on delete set null,
  equipment_id uuid,
  equipment_name text,
  maintenance_type text not null,
  performed_at timestamptz not null default now(),
  performed_by uuid references auth.users(id) on delete set null,
  cost numeric(12,2) not null default 0,
  vendor text,
  notes text,
  document_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  title text not null,
  trigger_key text not null,
  action_key text not null,
  conditions jsonb not null default '{}'::jsonb,
  action_payload jsonb not null default '{}'::jsonb,
  enabled boolean not null default false,
  last_run_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  automation_rule_id uuid references public.automation_rules(id) on delete set null,
  status text not null default 'Queued',
  started_at timestamptz,
  finished_at timestamptz,
  result jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  constraint automation_runs_status_check check (status in ('Queued','Running','Succeeded','Failed','Skipped'))
);

create table if not exists public.command_usage_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  user_id uuid references auth.users(id) on delete set null,
  command_type text not null,
  command_label text,
  query text,
  target_section text,
  target_table text,
  target_id uuid,
  result_count integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.feature_flags (
  flag_key text primary key,
  enabled boolean not null default true,
  label text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'recurring_services',
    'recurring_service_visits',
    'job_checklist_templates',
    'job_checklist_template_items',
    'job_checklists',
    'job_checklist_items',
    'job_time_entries',
    'job_site_photos',
    'approval_requests',
    'communications',
    'communication_templates',
    'client_share_links',
    'equipment_maintenance_schedules',
    'equipment_maintenance_records',
    'automation_rules'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', target_table || '_set_updated_at', target_table);
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', target_table || '_set_updated_at', target_table);
  end loop;
end $$;

create index if not exists recurring_services_status_idx on public.recurring_services (status);
create index if not exists recurring_services_next_visit_idx on public.recurring_services (next_visit_date);
create index if not exists recurring_service_visits_date_idx on public.recurring_service_visits (visit_date, status);
create index if not exists job_checklists_job_idx on public.job_checklists (job_id, scheduled_job_id, status);
create index if not exists job_time_entries_job_idx on public.job_time_entries (job_id, scheduled_job_id, entry_date);
create index if not exists job_site_photos_job_idx on public.job_site_photos (job_id, scheduled_job_id, photo_type);
create index if not exists approval_requests_status_idx on public.approval_requests (status, priority, due_at);
create index if not exists communications_related_idx on public.communications (related_table, related_id, created_at desc);
create index if not exists client_share_links_token_hash_idx on public.client_share_links (token_hash);
create index if not exists equipment_maintenance_schedules_due_idx on public.equipment_maintenance_schedules (next_due_date, status);
create index if not exists automation_rules_enabled_idx on public.automation_rules (enabled, trigger_key);
create index if not exists command_usage_history_user_idx on public.command_usage_history (user_id, created_at desc);

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'recurring_services',
    'recurring_service_visits',
    'job_checklist_templates',
    'job_checklist_template_items',
    'job_checklists',
    'job_checklist_items',
    'job_time_entries',
    'job_site_photos',
    'approval_requests',
    'communications',
    'communication_templates',
    'client_share_links',
    'client_share_link_permissions',
    'client_share_link_events',
    'equipment_maintenance_schedules',
    'equipment_maintenance_records',
    'automation_rules',
    'automation_runs',
    'command_usage_history'
  ]
  loop
    execute format('alter table public.%I enable row level security', target_table);
    execute format('drop policy if exists "manager reads connected operations" on public.%I', target_table);
    execute format('drop policy if exists "staff writes connected operations" on public.%I', target_table);
    execute format('drop policy if exists "staff inserts connected operations" on public.%I', target_table);
    execute format('drop policy if exists "staff updates connected operations" on public.%I', target_table);
    execute format('drop policy if exists "admin deletes connected operations" on public.%I', target_table);
    execute format('create policy "manager reads connected operations" on public.%I for select using (public.dashboard_role_at_least(''worker''))', target_table);
    execute format('create policy "staff inserts connected operations" on public.%I for insert with check (public.dashboard_role_at_least(''staff''))', target_table);
    execute format('create policy "staff updates connected operations" on public.%I for update using (public.dashboard_role_at_least(''staff'')) with check (public.dashboard_role_at_least(''staff''))', target_table);
    execute format('create policy "admin deletes connected operations" on public.%I for delete using (public.dashboard_role_at_least(''admin''))', target_table);
  end loop;
end $$;

insert into public.feature_flags (flag_key, enabled, label, notes)
values (
  'connected_operations_enabled',
  true,
  'Connected Operations',
  'Recurring services, field checklists, approvals, communications, share links, maintenance planning, reports, and dashboard automation.'
)
on conflict (flag_key) do update
set enabled = excluded.enabled,
    label = excluded.label,
    notes = excluded.notes,
    updated_at = now();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'job-site-photos',
  'job-site-photos',
  false,
  10485760,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "field users read job site photos" on storage.objects;
create policy "field users read job site photos"
  on storage.objects for select
  using (
    bucket_id = 'job-site-photos'
    and auth.role() = 'authenticated'
    and public.dashboard_role_at_least('worker')
  );

drop policy if exists "field users upload job site photos" on storage.objects;
create policy "field users upload job site photos"
  on storage.objects for insert
  with check (
    bucket_id = 'job-site-photos'
    and auth.role() = 'authenticated'
    and public.dashboard_role_at_least('worker')
  );

drop policy if exists "field users update job site photos" on storage.objects;
create policy "field users update job site photos"
  on storage.objects for update
  using (
    bucket_id = 'job-site-photos'
    and auth.role() = 'authenticated'
    and public.dashboard_role_at_least('staff')
  )
  with check (
    bucket_id = 'job-site-photos'
    and auth.role() = 'authenticated'
    and public.dashboard_role_at_least('staff')
  );

drop policy if exists "admin deletes job site photos" on storage.objects;
create policy "admin deletes job site photos"
  on storage.objects for delete
  using (
    bucket_id = 'job-site-photos'
    and auth.role() = 'authenticated'
    and public.dashboard_role_at_least('admin')
  );

select
  'recurring_services' as recurring_services,
  'approval_requests' as approval_requests,
  'communications' as communications,
  'client_share_links' as client_share_links,
  'job_checklists' as job_checklists,
  'automation_rules' as automation_rules;
