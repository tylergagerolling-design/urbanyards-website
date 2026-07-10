-- Urban Yards Import, Export, Backup, and Google Sheets foundation.
-- Safe to run after the dashboard security/operations migrations.

create extension if not exists pgcrypto;

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

create table if not exists public.feature_flags (
  flag_key text primary key,
  enabled boolean not null default true,
  label text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.import_batches
  add column if not exists imported_by uuid references auth.users(id) on delete set null,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists created_by_email text,
  add column if not exists file_name text,
  add column if not exists source_name text,
  add column if not exists import_type text,
  add column if not exists source_type text,
  add column if not exists module text,
  add column if not exists table_name text,
  add column if not exists row_count integer not null default 0,
  add column if not exists total_rows integer not null default 0,
  add column if not exists success_count integer not null default 0,
  add column if not exists created_count integer not null default 0,
  add column if not exists updated_count integer not null default 0,
  add column if not exists skipped_count integer not null default 0,
  add column if not exists error_count integer not null default 0,
  add column if not exists duplicate_count integer not null default 0,
  add column if not exists warning_count integer not null default 0,
  add column if not exists rejected_count integer not null default 0,
  add column if not exists status text not null default 'preview',
  add column if not exists mapping_config jsonb not null default '[]'::jsonb,
  add column if not exists notes text,
  add column if not exists error_message text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists completed_at timestamptz,
  add column if not exists rollback_status text,
  add column if not exists rolled_back_by uuid references auth.users(id) on delete set null,
  add column if not exists rolled_back_at timestamptz,
  add column if not exists archived_at timestamptz;

update public.import_batches
set
  module = coalesce(module, import_type),
  source_name = coalesce(source_name, file_name),
  source_type = coalesce(source_type, import_type),
  total_rows = greatest(total_rows, row_count),
  created_count = greatest(created_count, success_count)
where module is null
   or source_name is null
   or source_type is null
   or total_rows = 0
   or created_count = 0;

do $$
declare
  item record;
begin
  for item in
    select conname
    from pg_constraint
    where contype = 'c'
      and conrelid = 'public.import_batches'::regclass
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.import_batches drop constraint if exists %I', item.conname);
  end loop;
end $$;

alter table public.import_batches
  add constraint import_batches_status_allowed_check
  check (status in ('preview', 'importing', 'complete', 'completed_with_warnings', 'imported', 'failed', 'archived', 'reverted'));

alter table public.import_batches
  add constraint import_batches_rollback_status_allowed_check
  check (rollback_status is null or rollback_status in ('rolled_back', 'rolled_back_with_conflicts', 'rollback_failed'));

create table if not exists public.import_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.import_batches(id) on delete cascade,
  row_number integer,
  status text not null default 'preview',
  action_type text,
  source_data jsonb not null default '{}'::jsonb,
  normalized_data jsonb not null default '{}'::jsonb,
  errors jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  message text,
  created_at timestamptz not null default now()
);

create table if not exists public.import_changes (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.import_batches(id) on delete cascade,
  module text,
  table_name text not null,
  record_id text,
  change_type text not null check (change_type in ('create', 'update', 'delete')),
  old_value jsonb,
  new_value jsonb,
  changed_fields text[] not null default '{}'::text[],
  created_at timestamptz not null default now()
);

create table if not exists public.import_mappings (
  id uuid primary key default gen_random_uuid(),
  module text not null,
  name text not null default 'Default mapping',
  source_type text not null default 'csv',
  mapping_config jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.export_jobs (
  id uuid primary key default gen_random_uuid(),
  action_type text not null default 'export',
  module text,
  destination_type text not null default 'xlsx',
  status text not null default 'pending' check (status in ('pending', 'running', 'complete', 'failed')),
  requested_by uuid references auth.users(id) on delete set null,
  requested_by_email text,
  total_rows integer not null default 0,
  file_name text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.backup_history (
  id uuid primary key default gen_random_uuid(),
  backup_type text not null default 'json',
  status text not null default 'pending' check (status in ('pending', 'running', 'complete', 'failed')),
  created_by uuid references auth.users(id) on delete set null,
  created_by_email text,
  module_counts jsonb not null default '{}'::jsonb,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.google_connections (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete cascade,
  created_by_email text,
  account_email text,
  status text not null default 'pending' check (status in ('pending', 'connected', 'revoked', 'error')),
  oauth_state text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  connected_at timestamptz,
  last_sync_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sheet_connections (
  id uuid primary key default gen_random_uuid(),
  google_connection_id uuid references public.google_connections(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  created_by_email text,
  spreadsheet_id text,
  spreadsheet_url text,
  spreadsheet_name text,
  module text,
  worksheet_name text,
  direction text not null default 'dashboard_to_sheet' check (direction in ('dashboard_to_sheet', 'sheet_to_dashboard', 'two_way')),
  status text not null default 'active' check (status in ('active', 'paused', 'error', 'archived')),
  last_sync_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid,
  module text,
  sync_type text not null default 'export',
  direction text not null default 'dashboard_to_sheet',
  status text not null default 'running' check (status in ('running', 'complete', 'failed', 'completed_with_warnings')),
  rows_synced integer not null default 0,
  rows_created integer not null default 0,
  rows_updated integer not null default 0,
  rows_skipped integer not null default 0,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.sync_conflicts (
  id uuid primary key default gen_random_uuid(),
  sync_run_id uuid references public.sync_runs(id) on delete cascade,
  module text,
  table_name text,
  record_id text,
  conflict_type text,
  local_value jsonb,
  remote_value jsonb,
  resolution text not null default 'unresolved' check (resolution in ('unresolved', 'keep_dashboard', 'keep_sheet', 'merged', 'ignored')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null
);

create index if not exists import_batches_created_at_idx on public.import_batches (created_at desc);
create index if not exists import_batches_module_idx on public.import_batches (module);
create index if not exists import_batches_created_by_idx on public.import_batches (created_by);
create index if not exists import_rows_batch_id_idx on public.import_rows (batch_id);
create index if not exists import_changes_batch_id_idx on public.import_changes (batch_id);
create index if not exists import_changes_record_idx on public.import_changes (table_name, record_id);
create index if not exists import_mappings_module_idx on public.import_mappings (module);
create index if not exists export_jobs_created_at_idx on public.export_jobs (created_at desc);
create index if not exists export_jobs_module_idx on public.export_jobs (module);
create index if not exists backup_history_created_at_idx on public.backup_history (created_at desc);
create index if not exists google_connections_created_by_idx on public.google_connections (created_by);
create index if not exists google_connections_oauth_state_idx on public.google_connections (oauth_state);
create index if not exists sheet_connections_google_connection_idx on public.sheet_connections (google_connection_id);
create index if not exists sheet_connections_module_idx on public.sheet_connections (module);
create index if not exists sync_runs_created_at_idx on public.sync_runs (created_at desc);
create index if not exists sync_runs_connection_id_idx on public.sync_runs (connection_id);
create index if not exists sync_conflicts_sync_run_id_idx on public.sync_conflicts (sync_run_id);

alter table public.import_batches enable row level security;
alter table public.import_rows enable row level security;
alter table public.import_changes enable row level security;
alter table public.import_mappings enable row level security;
alter table public.export_jobs enable row level security;
alter table public.backup_history enable row level security;
alter table public.google_connections enable row level security;
alter table public.sheet_connections enable row level security;
alter table public.sync_runs enable row level security;
alter table public.sync_conflicts enable row level security;

do $$
declare
  table_name text;
  manager_tables text[] := array[
    'import_batches', 'import_rows', 'import_changes', 'import_mappings',
    'export_jobs', 'backup_history', 'sync_runs', 'sync_conflicts'
  ];
begin
  foreach table_name in array manager_tables loop
    execute format('drop policy if exists "owner admin full access" on public.%I', table_name);
    execute format('drop policy if exists "manager import export access" on public.%I', table_name);
    execute format('drop policy if exists "viewer read access" on public.%I', table_name);
    execute format('create policy "owner admin full access" on public.%I for all using (public.dashboard_role_at_least(''admin'')) with check (public.dashboard_role_at_least(''admin''))', table_name);
    execute format('create policy "manager import export access" on public.%I for all using (public.dashboard_role_at_least(''manager'')) with check (public.dashboard_role_at_least(''manager''))', table_name);
    execute format('create policy "viewer read access" on public.%I for select using (public.dashboard_role_at_least(''viewer''))', table_name);
  end loop;
end $$;

do $$
declare
  table_name text;
  admin_tables text[] := array['google_connections', 'sheet_connections'];
begin
  foreach table_name in array admin_tables loop
    execute format('drop policy if exists "owner admin full access" on public.%I', table_name);
    execute format('create policy "owner admin full access" on public.%I for all using (public.dashboard_role_at_least(''admin'')) with check (public.dashboard_role_at_least(''admin''))', table_name);
  end loop;
end $$;

grant select, insert, update, delete on
  public.import_batches,
  public.import_rows,
  public.import_changes,
  public.import_mappings,
  public.export_jobs,
  public.backup_history,
  public.google_connections,
  public.sheet_connections,
  public.sync_runs,
  public.sync_conflicts
to authenticated;

insert into public.feature_flags (flag_key, enabled, label, notes)
values
  ('import_export_enabled', true, 'Import & Export Center', 'Excel, CSV, PDF, JSON backup, import preview, rollback, and history.'),
  ('google_sheets_enabled', true, 'Google Sheets Sync', 'Google OAuth and Sheets export connection metadata.')
on conflict (flag_key) do update
set enabled = excluded.enabled,
    label = excluded.label,
    notes = excluded.notes,
    updated_at = now();

do $$
begin
  if to_regclass('public.contacts') is not null then
    alter table public.contacts
      add column if not exists first_name text,
      add column if not exists last_name text,
      add column if not exists job_title text,
      add column if not exists company text,
      add column if not exists property text,
      add column if not exists secondary_phone text,
      add column if not exists phone_extension text,
      add column if not exists phone_display text,
      add column if not exists phone_e164 text,
      add column if not exists phone_country_code text,
      add column if not exists address text,
      add column if not exists state text,
      add column if not exists zip text,
      add column if not exists service text,
      add column if not exists contact_type text,
      add column if not exists preferred_contact_method text,
      add column if not exists priority text not null default 'Normal',
      add column if not exists assigned_user text,
      add column if not exists last_contacted_at date,
      add column if not exists next_follow_up_at date,
      add column if not exists call_outcome text not null default 'Not Called',
      add column if not exists call_notes text,
      add column if not exists source text;

    update public.contacts
    set
      phone_display = coalesce(nullif(phone_display, ''), phone),
      priority = coalesce(nullif(priority, ''), 'Normal'),
      call_outcome = coalesce(nullif(call_outcome, ''), 'Not Called')
    where phone_display is null
       or priority is null
       or priority = ''
       or call_outcome is null
       or call_outcome = '';

    create index if not exists contacts_phone_e164_idx on public.contacts (phone_e164);
    create index if not exists contacts_email_idx on public.contacts (email);
    create index if not exists contacts_follow_up_idx on public.contacts (next_follow_up_at) where next_follow_up_at is not null;
    create index if not exists contacts_company_property_idx on public.contacts (company, property);
  end if;
end $$;

create table if not exists public.lead_activity (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.lead_activity
  add column if not exists lead_id uuid,
  add column if not exists lead_type text not null default 'lead',
  add column if not exists phone_number text,
  add column if not exists type text not null default 'call_attempt',
  add column if not exists outcome text not null default 'not_set',
  add column if not exists notes text not null default '',
  add column if not exists follow_up_date date,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

update public.lead_activity
set outcome = 'wrong_number'
where outcome = 'bad_number';

update public.lead_activity
set outcome = 'follow_up_needed'
where outcome = 'follow_up_later';

do $$
declare
  item record;
begin
  for item in
    select conname
    from pg_constraint
    where contype = 'c'
      and conrelid = 'public.lead_activity'::regclass
      and (
        conname in ('lead_activity_type_check', 'lead_activity_outcome_check', 'lead_activity_lead_type_check', 'lead_activity_phone_check')
        or pg_get_constraintdef(oid) ilike '%outcome%'
        or pg_get_constraintdef(oid) ilike '%lead_type%'
      )
  loop
    execute format('alter table public.lead_activity drop constraint if exists %I', item.conname);
  end loop;
end $$;

alter table public.lead_activity
  add constraint lead_activity_type_check check (type in ('call_attempt')),
  add constraint lead_activity_outcome_check check (outcome in (
    'not_set',
    'no_answer',
    'left_voicemail',
    'spoke_with_contact',
    'follow_up_needed',
    'not_interested',
    'wrong_number'
  )),
  add constraint lead_activity_lead_type_check check (lead_type in (
    'quote_submission',
    'contact',
    'outreach_prospect',
    'outreach_company',
    'outreach_property',
    'lead'
  )),
  add constraint lead_activity_phone_check check (phone_number is null or phone_number ~ '^\+[0-9]{7,15}$');

create index if not exists lead_activity_lead_idx on public.lead_activity (lead_type, lead_id, created_at desc);
create index if not exists lead_activity_created_at_idx on public.lead_activity (created_at desc);
create index if not exists lead_activity_follow_up_idx on public.lead_activity (follow_up_date) where follow_up_date is not null;

alter table public.lead_activity enable row level security;

drop policy if exists "owner admin full access" on public.lead_activity;
drop policy if exists "manager call activity access" on public.lead_activity;
drop policy if exists "viewer call activity read access" on public.lead_activity;
drop policy if exists "owner read lead activity" on public.lead_activity;
drop policy if exists "owner write lead activity" on public.lead_activity;

create policy "owner admin full access"
  on public.lead_activity for all
  using (public.dashboard_role_at_least('admin'))
  with check (public.dashboard_role_at_least('admin'));

create policy "manager call activity access"
  on public.lead_activity for all
  using (public.dashboard_role_at_least('manager'))
  with check (public.dashboard_role_at_least('manager'));

create policy "viewer call activity read access"
  on public.lead_activity for select
  using (public.dashboard_role_at_least('viewer'));

grant select, insert, update, delete on public.lead_activity to authenticated;
