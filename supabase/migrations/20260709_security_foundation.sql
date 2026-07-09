-- Urban Yards dashboard security foundation.
-- Run in Supabase SQL editor after reviewing the owner email below.
-- This migration is intentionally defensive: existing tables are not dropped.

create extension if not exists pgcrypto;

create or replace function public.dashboard_role_rank(role_name text)
returns integer
language sql
immutable
as $$
  select case lower(coalesce(role_name, ''))
    when 'client' then 10
    when 'viewer' then 20
    when 'staff' then 30
    when 'admin' then 40
    when 'owner' then 50
    else 0
  end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  display_name text,
  role text not null default 'viewer' check (role in ('owner', 'admin', 'staff', 'viewer', 'client')),
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text,
  role text not null check (role in ('owner', 'admin', 'staff', 'viewer', 'client')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id),
  unique (email)
);

create or replace function public.dashboard_current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.role from public.profiles p where p.id = auth.uid() limit 1),
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

create table if not exists public.feature_flags (
  flag_key text primary key,
  enabled boolean not null default true,
  label text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.settings (
  setting_key text primary key,
  value jsonb not null default '{}'::jsonb,
  visibility text not null default 'internal' check (visibility in ('internal', 'public')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_user_id uuid,
  actor_role text,
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text
);

create table if not exists public.system_errors (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  route text,
  user_id uuid,
  severity text not null default 'error',
  message text not null,
  stack_trace text,
  metadata jsonb not null default '{}'::jsonb,
  resolved boolean not null default false,
  resolved_at timestamptz
);

-- Future/client-portal canonical tables. Existing dashboard-specific tables are handled below too.
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_user_id uuid references auth.users(id) on delete set null,
  name text,
  email text,
  phone text,
  notes text,
  status text default 'active'
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_id uuid references public.clients(id) on delete set null,
  client_user_id uuid references auth.users(id) on delete set null,
  name text,
  address text,
  city text,
  state text,
  zip text,
  notes text
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text,
  company text,
  email text,
  phone text,
  address text,
  city text,
  service text,
  status text default 'Prospect',
  priority text default 'Normal',
  notes text
);

create table if not exists public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  lead_id uuid,
  body text not null,
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_id uuid,
  property_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  title text,
  status text default 'scheduled',
  notes text
);

create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  category text,
  status text,
  condition text,
  notes text
);

create table if not exists public.equipment_maintenance (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  equipment_id uuid,
  maintenance_date date,
  summary text,
  notes text
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_id uuid,
  client_user_id uuid references auth.users(id) on delete set null,
  invoice_number text,
  status text,
  amount_due_cents integer,
  payment_url text
);

create table if not exists public.call_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lead_id text,
  phone_number text not null,
  type text not null default 'call_attempt',
  outcome text not null default 'not_set',
  notes text not null default '',
  follow_up_date date,
  actor_user_id uuid references auth.users(id) on delete set null
);

create table if not exists public.ai_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  mode text not null default 'public',
  metadata jsonb not null default '{}'::jsonb
);

insert into public.feature_flags (flag_key, enabled, label)
values
  ('ai_helper_enabled', true, 'AI helper'),
  ('client_portal_enabled', false, 'Client portal'),
  ('outreach_enabled', true, 'Outreach'),
  ('equipment_enabled', true, 'Equipment'),
  ('scheduler_enabled', true, 'Scheduler'),
  ('square_invoices_enabled', true, 'Square invoices'),
  ('google_voice_calling_enabled', true, 'Google Voice calling'),
  ('maintenance_mode', false, 'Maintenance mode'),
  ('csv_import_enabled', true, 'CSV import'),
  ('beta_features_enabled', false, 'Beta features')
on conflict (flag_key) do nothing;

insert into public.roles (email, role)
values ('team@urbanyards.us', 'owner')
on conflict (email) do update set role = excluded.role, updated_at = now();

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists roles_role_idx on public.roles (role);
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_action_idx on public.audit_logs (action);
create index if not exists system_errors_created_at_idx on public.system_errors (created_at desc);
create index if not exists system_errors_resolved_idx on public.system_errors (resolved);
create index if not exists feature_flags_enabled_idx on public.feature_flags (enabled);

do $$
declare
  table_name text;
  operational_tables text[] := array[
    'clients', 'properties', 'leads', 'lead_notes', 'appointments',
    'equipment', 'equipment_maintenance', 'call_logs',
    'contacts', 'quote_submissions', 'scheduled_jobs', 'job_notes',
    'follow_up_reminders', 'operations_records', 'route_stops',
    'equipment_items', 'hardware_guide', 'lead_activity',
    'outreach_prospects', 'outreach_companies', 'outreach_properties'
  ];
begin
  foreach table_name in array operational_tables loop
    if to_regclass('public.' || quote_ident(table_name)) is not null then
      execute format('alter table public.%I enable row level security', table_name);
      execute format('drop policy if exists "owner admin full access" on public.%I', table_name);
      execute format('drop policy if exists "staff operational access" on public.%I', table_name);
      execute format('drop policy if exists "viewer read access" on public.%I', table_name);
      execute format('create policy "owner admin full access" on public.%I for all using (public.dashboard_role_at_least(''admin'')) with check (public.dashboard_role_at_least(''admin''))', table_name);
      execute format('create policy "staff operational access" on public.%I for all using (public.dashboard_role_at_least(''staff'')) with check (public.dashboard_role_at_least(''staff''))', table_name);
      execute format('create policy "viewer read access" on public.%I for select using (public.dashboard_role_at_least(''viewer''))', table_name);
    end if;
  end loop;
end $$;

do $$
declare
  table_name text;
  sensitive_tables text[] := array[
    'roles', 'settings', 'feature_flags', 'audit_logs', 'system_errors',
    'sales_documents', 'invoices',
    'ai_sessions', 'ai_settings', 'ai_knowledge', 'ai_faqs', 'ai_rules',
    'ai_saved_answers', 'ai_conversation_logs', 'ai_feedback',
    'ai_training_rules', 'ai_helper_versions'
  ];
begin
  foreach table_name in array sensitive_tables loop
    if to_regclass('public.' || quote_ident(table_name)) is not null then
      execute format('alter table public.%I enable row level security', table_name);
      execute format('drop policy if exists "owner admin full access" on public.%I', table_name);
      execute format('create policy "owner admin full access" on public.%I for all using (public.dashboard_role_at_least(''admin'')) with check (public.dashboard_role_at_least(''admin''))', table_name);
    end if;
  end loop;
end $$;

alter table public.profiles enable row level security;
drop policy if exists "owner admin full access" on public.profiles;
drop policy if exists "users read own profile" on public.profiles;
drop policy if exists "users update own profile basics" on public.profiles;
create policy "owner admin full access" on public.profiles
  for all using (public.dashboard_role_at_least('admin'))
  with check (public.dashboard_role_at_least('admin'));
create policy "users read own profile" on public.profiles
  for select using (id = auth.uid());
create policy "users update own profile basics" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

-- Add client self-read policies for tables that include client_user_id.
do $$
declare
  target_table text;
begin
  foreach target_table in array array['clients', 'properties', 'invoices'] loop
    if to_regclass('public.' || quote_ident(target_table)) is not null
      and exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = target_table
          and column_name = 'client_user_id'
      ) then
      execute format('drop policy if exists "client own read access" on public.%I', target_table);
      execute format('create policy "client own read access" on public.%I for select using (client_user_id = auth.uid())', target_table);
    end if;
  end loop;
end $$;
