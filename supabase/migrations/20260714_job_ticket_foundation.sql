-- Urban Yards canonical Job Ticket foundation.
-- Additive/staged migration only: no existing dashboard tables or records are dropped.
-- This gives the rebuilt dashboard one durable ticket table while legacy quote/job
-- records remain in place as fallback source data.

create extension if not exists pgcrypto;

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

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
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

create table if not exists public.job_tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  ticket_number text,
  title text not null default 'Job ticket',
  stage text not null default 'sales_intake',
  status text not null default 'open',
  source_type text,
  source_id uuid,
  quote_id uuid,
  job_id uuid,
  invoice_id uuid,
  customer_id uuid,
  property_id uuid,
  customer_name text,
  client_name text,
  contact_name text,
  company_name text,
  property_name text,
  property_address text,
  city text,
  requested_service text,
  service text,
  scope_of_work text,
  description text,
  notes text,
  internal_notes text,
  proposed_price numeric(12,2),
  expected_revenue numeric(12,2),
  estimated_total_cost numeric(12,2),
  estimated_profit numeric(12,2),
  target_margin numeric(5,2),
  cost_review_complete boolean not null default false,
  budget_complete boolean not null default false,
  scope_complete boolean not null default false,
  customer_approval_recorded boolean not null default false,
  owner_approval_recorded boolean not null default false,
  draft_invoice_exists boolean not null default false,
  deposit_required boolean not null default false,
  deposit_paid boolean not null default false,
  required_documents_present boolean,
  scheduled_date date,
  visit_date date,
  due_date date,
  assigned_user_id uuid,
  responsible_role text,
  owner_label text,
  next_action text,
  blockers text[] not null default '{}'::text[],
  before_photos_uploaded boolean not null default false,
  after_photos_uploaded boolean not null default false,
  arrival_photos_uploaded boolean not null default false,
  completion_photos_uploaded boolean not null default false,
  field_completion_notes text,
  invoice_finalized boolean not null default false,
  payment_status text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_tickets_stage_check check (stage in (
    'draft',
    'sales_intake',
    'scope_in_progress',
    'quote_pending',
    'customer_approval_pending',
    'needs_budget',
    'budget_in_progress',
    'needs_owner_approval',
    'invoice_preparation',
    'ready_to_schedule',
    'scheduled',
    'in_progress',
    'paused',
    'scope_change_requested',
    'field_work_complete',
    'completion_review',
    'invoice_review',
    'invoice_sent',
    'partially_paid',
    'paid',
    'closed',
    'cancelled'
  )),
  constraint job_tickets_status_check check (status in (
    'open',
    'active',
    'on_hold',
    'blocked',
    'completed',
    'cancelled',
    'archived'
  )),
  constraint job_tickets_source_type_check check (
    source_type is null or source_type in (
      'ticket',
      'quote',
      'job',
      'document',
      'outreach',
      'contact',
      'property',
      'client',
      'manual'
    )
  ),
  constraint job_tickets_title_not_blank check (nullif(btrim(title), '') is not null)
);

create table if not exists public.job_ticket_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.job_tickets(id) on delete cascade,
  event_type text not null,
  actor_user_id uuid,
  actor_email text,
  from_stage text,
  to_stage text,
  notes text,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now(),
  constraint job_ticket_events_event_type_not_blank check (nullif(btrim(event_type), '') is not null)
);

create table if not exists public.job_ticket_links (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.job_tickets(id) on delete cascade,
  linked_type text not null,
  linked_id uuid,
  label text,
  url text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_ticket_links_linked_type_not_blank check (nullif(btrim(linked_type), '') is not null)
);

drop trigger if exists job_tickets_set_updated_at on public.job_tickets;
create trigger job_tickets_set_updated_at
before update on public.job_tickets
for each row execute function public.set_updated_at();

drop trigger if exists job_ticket_links_set_updated_at on public.job_ticket_links;
create trigger job_ticket_links_set_updated_at
before update on public.job_ticket_links
for each row execute function public.set_updated_at();

create unique index if not exists job_tickets_ticket_number_key
  on public.job_tickets (ticket_number)
  where ticket_number is not null;

create unique index if not exists job_tickets_source_unique_idx
  on public.job_tickets (source_type, source_id)
  where source_type is not null and source_id is not null;

create index if not exists job_tickets_stage_idx on public.job_tickets (stage);
create index if not exists job_tickets_status_idx on public.job_tickets (status);
create index if not exists job_tickets_updated_at_idx on public.job_tickets (updated_at desc);
create index if not exists job_tickets_scheduled_date_idx on public.job_tickets (scheduled_date);
create index if not exists job_tickets_assigned_user_idx on public.job_tickets (assigned_user_id);
create index if not exists job_tickets_created_by_idx on public.job_tickets (created_by);
create index if not exists job_ticket_events_ticket_idx on public.job_ticket_events (ticket_id, created_at desc);
create index if not exists job_ticket_links_ticket_idx on public.job_ticket_links (ticket_id);
create unique index if not exists job_ticket_links_unique_idx
  on public.job_ticket_links (ticket_id, linked_type, linked_id)
  where linked_id is not null;

alter table public.job_tickets enable row level security;
alter table public.job_ticket_events enable row level security;
alter table public.job_ticket_links enable row level security;

drop policy if exists "owner admin full access" on public.job_tickets;
drop policy if exists "staff operational access" on public.job_tickets;
drop policy if exists "viewer read access" on public.job_tickets;
create policy "owner admin full access"
  on public.job_tickets for all
  using (public.dashboard_role_at_least('admin'))
  with check (public.dashboard_role_at_least('admin'));
create policy "staff operational access"
  on public.job_tickets for all
  using (public.dashboard_role_at_least('staff'))
  with check (public.dashboard_role_at_least('staff'));
create policy "viewer read access"
  on public.job_tickets for select
  using (public.dashboard_role_at_least('viewer'));

drop policy if exists "owner admin full access" on public.job_ticket_events;
drop policy if exists "staff event append access" on public.job_ticket_events;
drop policy if exists "staff event read access" on public.job_ticket_events;
drop policy if exists "viewer read access" on public.job_ticket_events;
create policy "owner admin full access"
  on public.job_ticket_events for all
  using (public.dashboard_role_at_least('admin'))
  with check (public.dashboard_role_at_least('admin'));
create policy "staff event append access"
  on public.job_ticket_events for insert
  with check (public.dashboard_role_at_least('staff'));
create policy "staff event read access"
  on public.job_ticket_events for select
  using (public.dashboard_role_at_least('staff'));
create policy "viewer read access"
  on public.job_ticket_events for select
  using (public.dashboard_role_at_least('viewer'));

drop policy if exists "owner admin full access" on public.job_ticket_links;
drop policy if exists "staff operational access" on public.job_ticket_links;
drop policy if exists "viewer read access" on public.job_ticket_links;
create policy "owner admin full access"
  on public.job_ticket_links for all
  using (public.dashboard_role_at_least('admin'))
  with check (public.dashboard_role_at_least('admin'));
create policy "staff operational access"
  on public.job_ticket_links for all
  using (public.dashboard_role_at_least('staff'))
  with check (public.dashboard_role_at_least('staff'));
create policy "viewer read access"
  on public.job_ticket_links for select
  using (public.dashboard_role_at_least('viewer'));

insert into public.feature_flags (flag_key, enabled, label, notes)
values (
  'job_tickets_enabled',
  true,
  'Canonical Job Tickets',
  'Unified staged Job Ticket foundation for the rebuilt dashboard.'
)
on conflict (flag_key) do update set
  enabled = excluded.enabled,
  label = excluded.label,
  notes = excluded.notes,
  updated_at = now();

comment on table public.job_tickets is
  'Canonical staged Job Ticket records for the rebuilt Urban Yards dashboard. Existing quote/job source tables are retained and may still be used as fallback data.';
comment on table public.job_ticket_events is
  'Append-oriented audit and workflow events for canonical Job Tickets.';
comment on table public.job_ticket_links is
  'Non-destructive links from Job Tickets to existing quote, job, document, invoice, client, property, or outreach records.';
