-- Urban Yards Job Budgeter foundation.
-- Safe to run more than once. Designed for the existing dashboard/auth role model.

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

create table if not exists public.feature_flags (
  flag_key text primary key,
  enabled boolean not null default true,
  label text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.budget_settings (
  id text primary key default 'default',
  organization_id uuid,
  default_target_margin_percent numeric(7,3) not null default 35,
  warning_margin_percent numeric(7,3) not null default 25,
  minimum_margin_percent numeric(7,3) not null default 15,
  default_contingency_percent numeric(7,3) not null default 10,
  default_labor_burden_percent numeric(7,3) not null default 18,
  default_workers_comp_percent numeric(7,3) not null default 4,
  default_payment_processing_percent numeric(7,3) not null default 3,
  default_owner_hourly_rate numeric(12,2) not null default 45,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budget_settings_singleton_check check (id = 'default')
);

create table if not exists public.job_budgets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  budget_name text not null,
  job_id uuid,
  quote_id uuid,
  invoice_id uuid,
  client_id uuid,
  property_id uuid,
  client_name text,
  property_name text,
  job_name text,
  service_type text,
  job_description text,
  proposed_start_date date,
  proposed_completion_date date,
  scheduled_visit_ids uuid[] not null default '{}'::uuid[],
  assigned_user_ids uuid[] not null default '{}'::uuid[],
  budget_owner_id uuid references auth.users(id) on delete set null,
  status text not null default 'Draft',
  job_status text,
  health_status text not null default 'Healthy',
  target_margin_percent numeric(7,3) not null default 35,
  approved_total_cost numeric(12,2),
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  base_quoted_price numeric(12,2) not null default 0,
  approved_addons numeric(12,2) not null default 0,
  discounts numeric(12,2) not null default 0,
  taxes numeric(12,2) not null default 0,
  other_revenue numeric(12,2) not null default 0,
  expected_revenue numeric(12,2) generated always as (coalesce(base_quoted_price,0) + coalesce(approved_addons,0) + coalesce(other_revenue,0) - coalesce(discounts,0) + coalesce(taxes,0)) stored,
  final_invoiced_revenue numeric(12,2) not null default 0,
  amount_paid numeric(12,2) not null default 0,
  outstanding_balance numeric(12,2) generated always as (greatest(coalesce(final_invoiced_revenue,0) - coalesce(amount_paid,0), 0)) stored,
  original_budget_snapshot jsonb not null default '{}'::jsonb,
  latest_summary jsonb not null default '{}'::jsonb,
  notes text,
  archived_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_budgets_status_check check (status in ('Draft','Ready for Review','Approved','Active','At Risk','Over Budget','Completed','Archived')),
  constraint job_budgets_health_status_check check (health_status in ('Healthy','Watch','At Risk','Over Budget','Completed'))
);

create table if not exists public.job_budget_labor (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  budget_id uuid not null references public.job_budgets(id) on delete cascade,
  employee_id uuid,
  employee_name text,
  role text,
  crew text,
  scheduled_visit_id uuid,
  task text,
  description text,
  estimated_hours numeric(10,2) not null default 0,
  hourly_wage numeric(12,2) not null default 0,
  payroll_burden_percent numeric(7,3) not null default 0,
  workers_comp_percent numeric(7,3) not null default 0,
  other_burden_amount numeric(12,2) not null default 0,
  true_hourly_cost numeric(12,2) generated always as (
    coalesce(hourly_wage,0)
    + (coalesce(hourly_wage,0) * coalesce(payroll_burden_percent,0) / 100)
    + (coalesce(hourly_wage,0) * coalesce(workers_comp_percent,0) / 100)
    + coalesce(other_burden_amount,0)
  ) stored,
  estimated_cost numeric(12,2) generated always as (
    coalesce(estimated_hours,0) * (
      coalesce(hourly_wage,0)
      + (coalesce(hourly_wage,0) * coalesce(payroll_burden_percent,0) / 100)
      + (coalesce(hourly_wage,0) * coalesce(workers_comp_percent,0) / 100)
      + coalesce(other_burden_amount,0)
    )
  ) stored,
  actual_hours numeric(10,2) not null default 0,
  actual_cost numeric(12,2) not null default 0,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.job_budget_materials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  budget_id uuid not null references public.job_budgets(id) on delete cascade,
  material_name text not null,
  category text not null default 'Other',
  vendor text,
  quantity numeric(12,3) not null default 0,
  unit text,
  unit_cost numeric(12,2) not null default 0,
  estimated_cost numeric(12,2) generated always as (coalesce(quantity,0) * coalesce(unit_cost,0)) stored,
  actual_quantity numeric(12,3) not null default 0,
  actual_unit_cost numeric(12,2) not null default 0,
  actual_cost numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  delivery_fee numeric(12,2) not null default 0,
  receipt_document_id uuid,
  save_to_catalog boolean not null default false,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_budget_materials_category_check check (category in ('Plants','Mulch','Soil','Gravel','Fertilizer','Cleaning supplies','Hardware','Replacement parts','Consumables','Other'))
);

create table if not exists public.budget_material_catalog (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  material_name text not null,
  category text not null default 'Other',
  vendor text,
  unit text,
  default_unit_cost numeric(12,2) not null default 0,
  notes text,
  archived_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.job_budget_equipment (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  budget_id uuid not null references public.job_budgets(id) on delete cascade,
  equipment_id uuid,
  equipment_name text,
  usage_type text not null default 'Owned',
  estimated_hours numeric(10,2) not null default 0,
  estimated_days numeric(10,2) not null default 0,
  internal_hourly_rate numeric(12,2) not null default 0,
  internal_daily_rate numeric(12,2) not null default 0,
  rental_rate numeric(12,2) not null default 0,
  mileage_rate numeric(12,2) not null default 0,
  estimated_miles numeric(10,2) not null default 0,
  fuel_estimate numeric(12,2) not null default 0,
  estimated_cost numeric(12,2) not null default 0,
  actual_usage numeric(10,2) not null default 0,
  actual_cost numeric(12,2) not null default 0,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_budget_equipment_usage_check check (usage_type in ('Owned','Rental','Vehicle','Fuel','Wear Allowance','Maintenance Allocation','Other'))
);

create table if not exists public.job_budget_costs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  budget_id uuid not null references public.job_budgets(id) on delete cascade,
  category text not null,
  description text,
  estimated_cost numeric(12,2) not null default 0,
  actual_cost numeric(12,2) not null default 0,
  contingency_type text,
  contingency_percent numeric(7,3),
  receipt_document_id uuid,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_budget_costs_category_check check (category in ('Disposal and dump fees','Delivery fees','Mileage','Travel time','Parking','Permits','Subcontractors','Equipment rentals','Payment processing fees','Administrative costs','Miscellaneous expenses','Contingency')),
  constraint job_budget_costs_contingency_type_check check (contingency_type is null or contingency_type in ('Fixed','Percent'))
);

create table if not exists public.job_budget_change_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  budget_id uuid not null references public.job_budgets(id) on delete cascade,
  title text not null,
  description text,
  requested_date date,
  requested_by text,
  additional_revenue numeric(12,2) not null default 0,
  additional_labor_cost numeric(12,2) not null default 0,
  additional_material_cost numeric(12,2) not null default 0,
  additional_other_cost numeric(12,2) not null default 0,
  approval_status text not null default 'Draft',
  approved_date date,
  client_approval_notes text,
  internal_notes text,
  invoiced_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_budget_change_orders_status_check check (approval_status in ('Draft','Sent','Approved','Declined','Completed','Invoiced'))
);

create table if not exists public.job_budget_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  budget_id uuid not null references public.job_budgets(id) on delete cascade,
  document_type text not null default 'Other',
  title text,
  file_bucket text not null default 'budget-documents',
  file_path text,
  file_name text,
  mime_type text,
  file_size integer,
  related_table text,
  related_id uuid,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.job_budget_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  template_name text not null,
  service_type text,
  description text,
  target_margin_percent numeric(7,3),
  contingency_percent numeric(7,3),
  status text not null default 'Active',
  template_payload jsonb not null default '{}'::jsonb,
  notes text,
  archived_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_budget_templates_status_check check (status in ('Active','Draft','Archived'))
);

create table if not exists public.job_budget_template_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  template_id uuid not null references public.job_budget_templates(id) on delete cascade,
  item_type text not null,
  title text not null,
  category text,
  estimated_quantity numeric(12,3) not null default 0,
  unit text,
  unit_cost numeric(12,2) not null default 0,
  payload jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_budget_template_items_type_check check (item_type in ('labor','material','equipment','cost','change_order','note'))
);

create table if not exists public.job_budget_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  budget_id uuid references public.job_budgets(id) on delete cascade,
  action text not null,
  field_name text,
  previous_value jsonb,
  new_value jsonb,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text,
  notes text,
  created_at timestamptz not null default now()
);

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'budget_settings',
    'job_budgets',
    'job_budget_labor',
    'job_budget_materials',
    'budget_material_catalog',
    'job_budget_equipment',
    'job_budget_costs',
    'job_budget_change_orders',
    'job_budget_documents',
    'job_budget_templates',
    'job_budget_template_items'
  ]
  loop
    if to_regclass('public.' || quote_ident(target_table)) is not null then
      execute format('drop trigger if exists %I on public.%I', target_table || '_set_updated_at', target_table);
      execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', target_table || '_set_updated_at', target_table);
    end if;
  end loop;
end $$;

create index if not exists job_budgets_status_idx on public.job_budgets (status);
create index if not exists job_budgets_health_status_idx on public.job_budgets (health_status);
create index if not exists job_budgets_job_id_idx on public.job_budgets (job_id);
create index if not exists job_budgets_client_id_idx on public.job_budgets (client_id);
create index if not exists job_budgets_service_type_idx on public.job_budgets (service_type);
create index if not exists job_budgets_start_date_idx on public.job_budgets (proposed_start_date);
create index if not exists job_budget_labor_budget_id_idx on public.job_budget_labor (budget_id);
create index if not exists job_budget_materials_budget_id_idx on public.job_budget_materials (budget_id);
create index if not exists job_budget_equipment_budget_id_idx on public.job_budget_equipment (budget_id);
create index if not exists job_budget_costs_budget_id_idx on public.job_budget_costs (budget_id);
create index if not exists job_budget_change_orders_budget_id_idx on public.job_budget_change_orders (budget_id);
create index if not exists job_budget_documents_budget_id_idx on public.job_budget_documents (budget_id);
create index if not exists job_budget_history_budget_id_idx on public.job_budget_history (budget_id);
create index if not exists job_budget_history_created_at_idx on public.job_budget_history (created_at desc);
create index if not exists job_budget_templates_status_idx on public.job_budget_templates (status);

insert into public.budget_settings (id)
values ('default')
on conflict (id) do nothing;

insert into public.feature_flags (flag_key, enabled, label, notes)
values (
  'job_budgeter_enabled',
  true,
  'Job Budgeter',
  'Estimate, track, and review job revenue, costs, margins, change orders, and budget health.'
)
on conflict (flag_key) do update
set enabled = excluded.enabled,
    label = excluded.label,
    notes = excluded.notes,
    updated_at = now();

insert into public.roles (email, role)
values ('team@urbanyards.us', 'owner')
on conflict (email) do update set role = excluded.role, updated_at = now();

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'budget_settings',
    'job_budgets',
    'job_budget_labor',
    'job_budget_materials',
    'budget_material_catalog',
    'job_budget_equipment',
    'job_budget_costs',
    'job_budget_change_orders',
    'job_budget_documents',
    'job_budget_templates',
    'job_budget_template_items',
    'job_budget_history'
  ]
  loop
    execute format('alter table public.%I enable row level security', target_table);
    execute format('drop policy if exists "owner admin full access" on public.%I', target_table);
    execute format('drop policy if exists "manager budget access" on public.%I', target_table);
    execute format('drop policy if exists "worker budget read access" on public.%I', target_table);
    execute format('drop policy if exists "viewer budget read access" on public.%I', target_table);
  end loop;
end $$;

create policy "owner admin full access" on public.budget_settings
  for all using (public.dashboard_role_at_least('admin'))
  with check (public.dashboard_role_at_least('admin'));

create policy "manager budget access" on public.job_budgets
  for all using (public.dashboard_role_at_least('manager'))
  with check (public.dashboard_role_at_least('manager'));

create policy "manager budget access" on public.job_budget_labor
  for all using (public.dashboard_role_at_least('manager'))
  with check (public.dashboard_role_at_least('manager'));

create policy "manager budget access" on public.job_budget_materials
  for all using (public.dashboard_role_at_least('manager'))
  with check (public.dashboard_role_at_least('manager'));

create policy "manager budget access" on public.budget_material_catalog
  for all using (public.dashboard_role_at_least('manager'))
  with check (public.dashboard_role_at_least('manager'));

create policy "manager budget access" on public.job_budget_equipment
  for all using (public.dashboard_role_at_least('manager'))
  with check (public.dashboard_role_at_least('manager'));

create policy "manager budget access" on public.job_budget_costs
  for all using (public.dashboard_role_at_least('manager'))
  with check (public.dashboard_role_at_least('manager'));

create policy "manager budget access" on public.job_budget_change_orders
  for all using (public.dashboard_role_at_least('manager'))
  with check (public.dashboard_role_at_least('manager'));

create policy "manager budget access" on public.job_budget_documents
  for all using (public.dashboard_role_at_least('manager'))
  with check (public.dashboard_role_at_least('manager'));

create policy "manager budget access" on public.job_budget_templates
  for all using (public.dashboard_role_at_least('manager'))
  with check (public.dashboard_role_at_least('manager'));

create policy "manager budget access" on public.job_budget_template_items
  for all using (public.dashboard_role_at_least('manager'))
  with check (public.dashboard_role_at_least('manager'));

create policy "manager budget access" on public.job_budget_history
  for select using (public.dashboard_role_at_least('manager'));

create policy "manager inserts budget history" on public.job_budget_history
  for insert with check (public.dashboard_role_at_least('manager'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'budget-documents',
  'budget-documents',
  false,
  15728640,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/csv',
    'application/csv'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "manager reads budget documents" on storage.objects;
create policy "manager reads budget documents"
  on storage.objects for select
  using (
    bucket_id = 'budget-documents'
    and auth.role() = 'authenticated'
    and public.dashboard_role_at_least('manager')
  );

drop policy if exists "manager uploads budget documents" on storage.objects;
create policy "manager uploads budget documents"
  on storage.objects for insert
  with check (
    bucket_id = 'budget-documents'
    and auth.role() = 'authenticated'
    and public.dashboard_role_at_least('manager')
  );

drop policy if exists "manager updates budget documents" on storage.objects;
create policy "manager updates budget documents"
  on storage.objects for update
  using (
    bucket_id = 'budget-documents'
    and auth.role() = 'authenticated'
    and public.dashboard_role_at_least('manager')
  )
  with check (
    bucket_id = 'budget-documents'
    and auth.role() = 'authenticated'
    and public.dashboard_role_at_least('manager')
  );

drop policy if exists "admin deletes budget documents" on storage.objects;
create policy "admin deletes budget documents"
  on storage.objects for delete
  using (
    bucket_id = 'budget-documents'
    and auth.role() = 'authenticated'
    and public.dashboard_role_at_least('admin')
  );

select
  'job_budgets' as job_budgets,
  'job_budget_labor' as job_budget_labor,
  'job_budget_materials' as job_budget_materials,
  'job_budget_equipment' as job_budget_equipment,
  'job_budget_costs' as job_budget_costs,
  'job_budget_change_orders' as job_budget_change_orders,
  'budget_settings' as budget_settings;
