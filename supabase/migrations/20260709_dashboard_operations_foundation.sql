-- Urban Yards dashboard operations foundation upgrade.
-- Run after 20260709_security_foundation.sql and 20260709_user_avatars.sql.
-- Defensive migration: it adds missing fields/policies without dropping business data.

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

do $$
declare
  item record;
begin
  for item in
    select conrelid::regclass as table_name, conname
    from pg_constraint
    where contype = 'c'
      and conrelid in ('public.profiles'::regclass, 'public.roles'::regclass)
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table %s drop constraint if exists %I', item.table_name, item.conname);
  end loop;
exception
  when undefined_table then null;
end $$;

alter table if exists public.profiles
  add column if not exists user_id uuid,
  add column if not exists phone text,
  add column if not exists disabled_at timestamptz,
  add column if not exists disabled_by uuid,
  add column if not exists last_login_at timestamptz,
  add column if not exists last_seen_at timestamptz,
  add column if not exists invited_at timestamptz,
  add column if not exists avatar_url text,
  add column if not exists avatar_path text,
  add column if not exists avatar_updated_at timestamptz;

do $$
begin
  if to_regclass('public.profiles') is not null
    and not exists (select 1 from pg_constraint where conrelid = 'public.profiles'::regclass and conname = 'profiles_role_allowed_check') then
    alter table public.profiles
      add constraint profiles_role_allowed_check
      check (role in ('owner', 'admin', 'manager', 'worker', 'viewer', 'client', 'staff'));
  end if;
  if to_regclass('public.roles') is not null
    and not exists (select 1 from pg_constraint where conrelid = 'public.roles'::regclass and conname = 'roles_role_allowed_check') then
    alter table public.roles
      add constraint roles_role_allowed_check
      check (role in ('owner', 'admin', 'manager', 'worker', 'viewer', 'client', 'staff'));
  end if;
end $$;

update public.profiles set role = 'manager' where role = 'staff';
update public.roles set role = 'manager' where role = 'staff';

create or replace function public.dashboard_current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.role from public.profiles p where p.id = auth.uid() and p.disabled_at is null limit 1),
    (select p.role from public.profiles p where p.user_id = auth.uid() and p.disabled_at is null limit 1),
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

alter table if exists public.audit_logs
  add column if not exists actor_email text,
  add column if not exists old_value jsonb,
  add column if not exists new_value jsonb,
  add column if not exists module text;

create index if not exists audit_logs_actor_email_idx on public.audit_logs (actor_email);
create index if not exists audit_logs_entity_type_idx on public.audit_logs (entity_type);
create index if not exists audit_logs_module_idx on public.audit_logs (module);

create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  imported_by uuid references auth.users(id) on delete set null,
  file_name text,
  import_type text,
  row_count integer not null default 0,
  success_count integer not null default 0,
  error_count integer not null default 0,
  duplicate_count integer not null default 0,
  status text not null default 'preview' check (status in ('preview', 'imported', 'failed', 'archived', 'reverted')),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.import_errors (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.import_batches(id) on delete cascade,
  row_number integer,
  error_message text not null,
  raw_row jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists import_batches_created_at_idx on public.import_batches (created_at desc);
create index if not exists import_batches_imported_by_idx on public.import_batches (imported_by);
create index if not exists import_errors_batch_id_idx on public.import_errors (batch_id);

do $$
declare
  target_table text;
  business_tables text[] := array[
    'clients', 'properties', 'leads', 'lead_notes', 'appointments',
    'contacts', 'quote_submissions', 'scheduled_jobs', 'job_notes',
    'follow_up_reminders', 'operations_records', 'route_stops',
    'outreach_prospects', 'outreach_companies', 'outreach_properties',
    'equipment', 'equipment_items', 'equipment_maintenance', 'hardware_guide',
    'lead_activity', 'call_logs', 'sales_documents', 'invoices'
  ];
begin
  foreach target_table in array business_tables loop
    if to_regclass('public.' || quote_ident(target_table)) is not null then
      if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = target_table and column_name = 'archived_at'
      ) then
        execute format('alter table public.%I add column archived_at timestamptz', target_table);
      end if;
      if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = target_table and column_name = 'archived_by'
      ) then
        execute format('alter table public.%I add column archived_by uuid', target_table);
      end if;
      if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = target_table and column_name = 'created_by'
      ) then
        execute format('alter table public.%I add column created_by uuid', target_table);
      end if;
      if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = target_table and column_name = 'updated_by'
      ) then
        execute format('alter table public.%I add column updated_by uuid', target_table);
      end if;
    end if;
  end loop;
end $$;

do $$
declare
  target_table text;
  assigned_condition text;
  operational_tables text[] := array[
    'clients', 'properties', 'leads', 'lead_notes', 'appointments',
    'contacts', 'quote_submissions', 'scheduled_jobs', 'job_notes',
    'follow_up_reminders', 'operations_records', 'route_stops',
    'outreach_prospects', 'outreach_companies', 'outreach_properties',
    'equipment', 'equipment_items', 'equipment_maintenance', 'hardware_guide',
    'lead_activity', 'call_logs'
  ];
begin
  foreach target_table in array operational_tables loop
    if to_regclass('public.' || quote_ident(target_table)) is not null then
      execute format('alter table public.%I enable row level security', target_table);
      execute format('drop policy if exists "owner admin full access" on public.%I', target_table);
      execute format('drop policy if exists "manager operational access" on public.%I', target_table);
      execute format('drop policy if exists "staff operational access" on public.%I', target_table);
      execute format('drop policy if exists "worker read access" on public.%I', target_table);
      execute format('drop policy if exists "worker assigned access" on public.%I', target_table);
      execute format('drop policy if exists "viewer read access" on public.%I', target_table);

      execute format('create policy "owner admin full access" on public.%I for all using (public.dashboard_role_at_least(''admin'')) with check (public.dashboard_role_at_least(''admin''))', target_table);
      execute format('create policy "manager operational access" on public.%I for all using (public.dashboard_role_at_least(''manager'')) with check (public.dashboard_role_at_least(''manager''))', target_table);
      execute format('create policy "worker read access" on public.%I for select using (public.dashboard_role_at_least(''worker''))', target_table);
      execute format('create policy "viewer read access" on public.%I for select using (public.dashboard_role_at_least(''viewer''))', target_table);

      assigned_condition := null;
      if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = target_table and column_name = 'assigned_user_id') then
        assigned_condition := 'assigned_user_id = auth.uid()';
      elsif exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = target_table and column_name = 'assigned_to') then
        assigned_condition := 'assigned_to = auth.uid()';
      end if;

      if assigned_condition is not null then
        execute format('create policy "worker assigned access" on public.%I for all using (public.dashboard_role_at_least(''worker'') and %s) with check (public.dashboard_role_at_least(''worker'') and %s)', target_table, assigned_condition, assigned_condition);
      end if;
    end if;
  end loop;
end $$;

do $$
declare
  target_table text;
  sensitive_tables text[] := array[
    'roles', 'settings', 'feature_flags', 'audit_logs', 'system_errors',
    'import_batches', 'import_errors',
    'sales_documents', 'invoices',
    'ai_sessions', 'ai_settings', 'ai_knowledge', 'ai_faqs', 'ai_rules',
    'ai_saved_answers', 'ai_conversation_logs', 'ai_feedback',
    'ai_training_rules', 'ai_helper_versions'
  ];
begin
  foreach target_table in array sensitive_tables loop
    if to_regclass('public.' || quote_ident(target_table)) is not null then
      execute format('alter table public.%I enable row level security', target_table);
      execute format('drop policy if exists "owner admin full access" on public.%I', target_table);
      execute format('create policy "owner admin full access" on public.%I for all using (public.dashboard_role_at_least(''admin'')) with check (public.dashboard_role_at_least(''admin''))', target_table);
    end if;
  end loop;
end $$;

alter table if exists public.profiles enable row level security;
drop policy if exists "owner admin full access" on public.profiles;
drop policy if exists "users read own profile" on public.profiles;
drop policy if exists "users update own profile basics" on public.profiles;
create policy "owner admin full access" on public.profiles
  for all using (public.dashboard_role_at_least('admin'))
  with check (public.dashboard_role_at_least('admin'));
create policy "users read own profile" on public.profiles
  for select using (id = auth.uid() or user_id = auth.uid());
create policy "users update own profile basics" on public.profiles
  for update using (id = auth.uid() or user_id = auth.uid())
  with check (
    (id = auth.uid() or user_id = auth.uid())
    and role = (select role from public.profiles where id = auth.uid() or user_id = auth.uid() limit 1)
  );

insert into public.roles (email, role)
values ('team@urbanyards.us', 'owner')
on conflict (email) do update set role = excluded.role, updated_at = now();

create index if not exists profiles_disabled_at_idx on public.profiles (disabled_at);
create index if not exists profiles_last_login_at_idx on public.profiles (last_login_at desc);
create index if not exists profiles_avatar_updated_at_idx on public.profiles (avatar_updated_at desc);

-- Optional public avatar bucket policies. Keep user profile rows protected by RLS.
insert into storage.buckets (id, name, public)
values ('user-avatars', 'user-avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "public read user avatars" on storage.objects;
create policy "public read user avatars"
  on storage.objects for select
  using (bucket_id = 'user-avatars');

drop policy if exists "service role manages user avatars" on storage.objects;
create policy "service role manages user avatars"
  on storage.objects for all
  using (bucket_id = 'user-avatars' and auth.role() = 'service_role')
  with check (bucket_id = 'user-avatars' and auth.role() = 'service_role');
