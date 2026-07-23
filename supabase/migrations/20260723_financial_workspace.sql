-- Urban Yards controlled financial workspace.
-- Additive migration: preserves sales_documents, job budgets, tickets, auth, and navigation.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in (
  'owner','admin','manager','accountant','sales_outreach','field_worker','worker','staff','viewer','client'
));
alter table public.roles drop constraint if exists roles_role_check;
alter table public.roles add constraint roles_role_check check (role in (
  'owner','admin','manager','accountant','sales_outreach','field_worker','worker','staff','viewer','client'
));

create or replace function public.financial_money_role()
returns boolean
language sql
stable
as $$
  select public.dashboard_current_role() in ('owner', 'admin', 'manager', 'accountant');
$$;

create or replace function public.financial_sales_role()
returns boolean
language sql
stable
as $$
  select public.dashboard_current_role() in ('owner', 'admin', 'manager', 'accountant', 'sales', 'sales_outreach');
$$;

create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  business_id uuid,
  vendor_name text not null,
  contact_name text,
  email text,
  phone text,
  address text,
  website text,
  default_expense_category text,
  account_number text,
  tax_id text,
  notes text,
  status text not null default 'Active',
  archived_at timestamptz,
  version integer not null default 1,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendors_status_check check (status in ('Active', 'Inactive'))
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid,
  expense_date date not null default current_date,
  vendor_id uuid references public.vendors(id) on delete set null,
  vendor_name text,
  category text not null default 'Other',
  description text,
  client_id uuid references public.clients(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  job_id uuid,
  ticket_id uuid,
  payment_method text,
  subtotal numeric(14,2),
  tax numeric(14,2),
  total numeric(14,2) not null default 0,
  currency text not null default 'USD',
  reimbursable boolean not null default false,
  refund_or_credit boolean not null default false,
  status text not null default 'Draft',
  notes text,
  external_reference text,
  archived_at timestamptz,
  version integer not null default 1,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expenses_category_check check (category in (
    'Materials','Equipment','Fuel','Vehicle','Insurance','Software','Advertising',
    'Office','Subcontractor','Labor','Permits and Fees','Professional Services',
    'Rent','Utilities','Taxes','Meals','Other'
  )),
  constraint expenses_payment_method_check check (
    payment_method is null or payment_method in (
      'Square Checking','Business Debit','Personal Card','Cash','ACH','Check','Credit Card','Other'
    )
  ),
  constraint expenses_status_check check (status in (
    'Draft','Recorded','Pending Receipt','Reimbursable','Reimbursed','Voided'
  )),
  constraint expenses_amounts_check check (
    refund_or_credit
    or (coalesce(subtotal, 0) >= 0 and coalesce(tax, 0) >= 0 and total >= 0)
  ),
  constraint expenses_total_check check (
    subtotal is null or tax is null or total = round(subtotal + tax, 2)
  )
);

create table if not exists public.expense_attachments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid,
  expense_id uuid not null references public.expenses(id) on delete cascade,
  file_bucket text not null default 'financial-documents',
  file_path text not null,
  file_name text not null,
  mime_type text,
  file_size bigint,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint expense_attachments_bucket_check check (file_bucket = 'financial-documents')
);

-- Extend the existing legacy/client-facing invoice table instead of creating a
-- second competing invoice source. sales_documents can link through sales_document_id.
alter table public.invoices
  add column if not exists business_id uuid,
  add column if not exists sales_document_id uuid,
  add column if not exists property_id uuid references public.properties(id) on delete set null,
  add column if not exists job_id uuid,
  add column if not exists ticket_id uuid,
  add column if not exists issue_date date,
  add column if not exists due_date date,
  add column if not exists subtotal numeric(14,2) not null default 0,
  add column if not exists tax numeric(14,2) not null default 0,
  add column if not exists discount numeric(14,2) not null default 0,
  add column if not exists deposit numeric(14,2) not null default 0,
  add column if not exists amount_paid numeric(14,2) not null default 0,
  add column if not exists payment_method text,
  add column if not exists square_invoice_url text,
  add column if not exists square_payment_reference text,
  add column if not exists last_sent_at timestamptz,
  add column if not exists internal_notes text,
  add column if not exists client_notes text,
  add column if not exists archived_at timestamptz,
  add column if not exists version integer not null default 1,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

alter table public.invoices drop constraint if exists invoices_status_check;
alter table public.invoices add constraint invoices_status_check check (status is null or status in (
  'Draft','Ready','Sent','Viewed','Partially Paid','Paid','Overdue','Voided','Uncollectible'
));
alter table public.invoices drop constraint if exists invoices_amounts_check;
alter table public.invoices add constraint invoices_amounts_check check (
  subtotal >= 0 and tax >= 0 and discount >= 0 and deposit >= 0 and amount_paid >= 0
);

create table if not exists public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  position integer not null default 0,
  item_type text not null default 'Service',
  description text not null,
  quantity numeric(14,3) not null default 1,
  unit text not null default 'Each',
  unit_price numeric(14,2) not null default 0,
  taxable boolean not null default false,
  linked_expense_id uuid references public.expenses(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoice_line_items_type_check check (item_type in (
    'Service','Labor','Materials','Equipment','Fee','Discount','Other'
  )),
  constraint invoice_line_items_unit_check check (unit in (
    'Each','Hour','Day','Visit','Square Foot','Linear Foot','Bag','Yard','Flat Rate'
  )),
  constraint invoice_line_items_values_check check (quantity >= 0 and unit_price >= 0)
);

create table if not exists public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  payment_date date not null default current_date,
  amount numeric(14,2) not null,
  payment_method text,
  external_reference text,
  notes text,
  voided_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint invoice_payments_amount_check check (amount > 0)
);

create table if not exists public.invoice_attachments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  file_bucket text not null default 'financial-documents',
  file_path text not null,
  file_name text not null,
  mime_type text,
  file_size bigint,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint invoice_attachments_bucket_check check (file_bucket = 'financial-documents')
);

create table if not exists public.financial_documents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid,
  document_type text not null default 'Other',
  title text not null,
  file_bucket text not null default 'financial-documents',
  file_path text not null,
  file_name text not null,
  mime_type text,
  file_size bigint,
  expense_id uuid references public.expenses(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  vendor_id uuid references public.vendors(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  job_id uuid,
  ticket_id uuid,
  document_date date,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint financial_documents_type_check check (document_type in (
    'Receipt','Vendor Invoice','Client Invoice','Insurance','License','Permit',
    'Tax Document','Contract','W-9','Estimate','Other'
  )),
  constraint financial_documents_bucket_check check (file_bucket = 'financial-documents')
);

create table if not exists public.financial_activity (
  id uuid primary key default gen_random_uuid(),
  business_id uuid,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.financial_import_batches (
  id uuid primary key default gen_random_uuid(),
  business_id uuid,
  import_type text not null,
  file_name text,
  status text not null default 'Preview',
  totals jsonb not null default '{}'::jsonb,
  rollback_available boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  rolled_back_at timestamptz,
  constraint financial_import_batches_type_check check (import_type in ('Expenses','Invoices','Vendors')),
  constraint financial_import_batches_status_check check (status in ('Preview','Completed','Partial','Failed','Rolled Back'))
);

create table if not exists public.financial_import_batch_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.financial_import_batches(id) on delete cascade,
  row_number integer not null,
  disposition text not null,
  source_data jsonb not null default '{}'::jsonb,
  normalized_data jsonb not null default '{}'::jsonb,
  validation_errors jsonb not null default '[]'::jsonb,
  imported_entity_id uuid,
  created_at timestamptz not null default now(),
  constraint financial_import_row_disposition_check check (disposition in ('New','Changed','Duplicate','Invalid','Imported','Skipped'))
);

create table if not exists public.invoice_number_sequences (
  business_id uuid primary key,
  next_number bigint not null default 1,
  updated_at timestamptz not null default now()
);

create or replace function public.next_financial_invoice_number(target_business_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  issued bigint;
  sequence_business_id uuid := coalesce(target_business_id, '00000000-0000-0000-0000-000000000000'::uuid);
begin
  if not public.financial_money_role() and not public.financial_sales_role() then
    raise exception 'Permission denied';
  end if;
  insert into public.invoice_number_sequences (business_id, next_number)
  values (sequence_business_id, 2)
  on conflict (business_id) do update
    set next_number = public.invoice_number_sequences.next_number + 1,
        updated_at = now()
  returning next_number - 1 into issued;
  return 'INV-' || lpad(issued::text, 6, '0');
end;
$$;

create or replace function public.financial_overview(
  range_start date,
  range_end date,
  target_business_id uuid default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not public.financial_money_role() then jsonb_build_object('error', 'Permission denied')
    else jsonb_build_object(
      'revenue', coalesce((select sum(subtotal + tax - discount) from public.invoices
        where archived_at is null and issue_date between range_start and range_end
          and (target_business_id is null or business_id = target_business_id)
          and status not in ('Voided','Uncollectible')), 0),
      'expenses', coalesce((select sum(total) from public.expenses
        where archived_at is null and expense_date between range_start and range_end
          and (target_business_id is null or business_id = target_business_id)
          and status <> 'Voided'), 0),
      'outstanding', coalesce((select sum(greatest((subtotal + tax - discount) - deposit - amount_paid, 0))
        from public.invoices where archived_at is null
          and (target_business_id is null or business_id = target_business_id)
          and status not in ('Paid','Voided','Uncollectible')), 0),
      'overdue', coalesce((select sum(greatest((subtotal + tax - discount) - deposit - amount_paid, 0))
        from public.invoices where archived_at is null and due_date < current_date
          and (target_business_id is null or business_id = target_business_id)
          and status not in ('Paid','Voided','Uncollectible')), 0),
      'missing_receipts', (select count(*) from public.expenses e
        where e.archived_at is null and e.status <> 'Voided'
          and (target_business_id is null or e.business_id = target_business_id)
          and not exists (select 1 from public.expense_attachments a where a.expense_id = e.id and a.archived_at is null))
    )
  end;
$$;

create unique index if not exists vendors_business_name_uidx
  on public.vendors (coalesce(business_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(vendor_name))
  where archived_at is null;
create index if not exists expenses_business_date_idx on public.expenses (business_id, expense_date desc);
create index if not exists expenses_vendor_idx on public.expenses (vendor_id, expense_date desc);
create index if not exists expenses_ticket_idx on public.expenses (ticket_id);
create index if not exists expenses_client_property_idx on public.expenses (client_id, property_id);
create index if not exists expenses_status_idx on public.expenses (business_id, status);
create unique index if not exists invoices_business_number_uidx
  on public.invoices (coalesce(business_id, '00000000-0000-0000-0000-000000000000'::uuid), invoice_number)
  where invoice_number is not null and archived_at is null;
create index if not exists invoices_business_issue_idx on public.invoices (business_id, issue_date desc);
create index if not exists invoices_due_status_idx on public.invoices (business_id, due_date, status);
create index if not exists invoices_ticket_idx on public.invoices (ticket_id);
create index if not exists invoice_line_items_invoice_idx on public.invoice_line_items (invoice_id, position);
create index if not exists invoice_payments_invoice_date_idx on public.invoice_payments (invoice_id, payment_date desc);
create index if not exists financial_documents_links_idx on public.financial_documents (expense_id, invoice_id, vendor_id, ticket_id);
create index if not exists financial_documents_type_date_idx on public.financial_documents (business_id, document_type, document_date desc);
create index if not exists financial_activity_entity_idx on public.financial_activity (entity_type, entity_id, created_at desc);
create index if not exists financial_import_rows_batch_idx on public.financial_import_batch_rows (batch_id, row_number);

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'vendors','expenses','expense_attachments','invoices','invoice_line_items',
    'invoice_payments','invoice_attachments','financial_documents',
    'financial_activity','financial_import_batches','financial_import_batch_rows',
    'invoice_number_sequences'
  ] loop
    execute format('alter table public.%I enable row level security', target_table);
    execute format('drop policy if exists "money full access" on public.%I', target_table);
    execute format(
      'create policy "money full access" on public.%I for all using (public.financial_money_role()) with check (public.financial_money_role())',
      target_table
    );
  end loop;
end $$;

drop policy if exists "sales reads invoices" on public.invoices;
create policy "sales reads invoices" on public.invoices
  for select using (public.financial_sales_role());

drop policy if exists "sales manages draft invoices" on public.invoices;
create policy "sales manages draft invoices" on public.invoices
  for insert with check (
    public.dashboard_current_role() in ('sales', 'sales_outreach')
    and coalesce(status, 'Draft') = 'Draft'
    and created_by = auth.uid()
  );

drop policy if exists "workers submit expenses" on public.expenses;
create policy "workers submit expenses" on public.expenses
  for insert with check (
    public.dashboard_current_role() in ('worker', 'field_worker', 'staff')
    and created_by = auth.uid()
  );

drop policy if exists "workers read own assigned expenses" on public.expenses;
do $$
begin
  if to_regclass('public.job_tickets') is not null then
    execute $policy$
      create policy "workers read own assigned expenses" on public.expenses
      for select using (
        public.dashboard_current_role() in ('worker', 'field_worker', 'staff')
        and (
          created_by = auth.uid()
          or exists (
            select 1 from public.job_tickets jt
            where jt.id = expenses.ticket_id and jt.assigned_user_id = auth.uid()
          )
        )
      )
    $policy$;
  else
    create policy "workers read own assigned expenses" on public.expenses
      for select using (
        public.dashboard_current_role() in ('worker', 'field_worker', 'staff')
        and created_by = auth.uid()
      );
  end if;
end $$;

do $$
begin
  if to_regclass('public.job_tickets') is not null then
    alter table public.expenses
      drop constraint if exists expenses_ticket_id_fkey;
    alter table public.expenses
      add constraint expenses_ticket_id_fkey foreign key (ticket_id)
      references public.job_tickets(id) on delete set null;
    alter table public.invoices
      drop constraint if exists invoices_ticket_id_fkey;
    alter table public.invoices
      add constraint invoices_ticket_id_fkey foreign key (ticket_id)
      references public.job_tickets(id) on delete set null;
    alter table public.financial_documents
      drop constraint if exists financial_documents_ticket_id_fkey;
    alter table public.financial_documents
      add constraint financial_documents_ticket_id_fkey foreign key (ticket_id)
      references public.job_tickets(id) on delete set null;
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'financial-documents',
  'financial-documents',
  false,
  26214400,
  array[
    'application/pdf','image/jpeg','image/png','image/heic','image/heif',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/csv'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "money reads financial documents" on storage.objects;
create policy "money reads financial documents"
  on storage.objects for select
  using (bucket_id = 'financial-documents' and public.financial_money_role());

drop policy if exists "money uploads financial documents" on storage.objects;
create policy "money uploads financial documents"
  on storage.objects for insert
  with check (bucket_id = 'financial-documents' and public.financial_money_role());

drop policy if exists "money updates financial documents" on storage.objects;
create policy "money updates financial documents"
  on storage.objects for update
  using (bucket_id = 'financial-documents' and public.financial_money_role())
  with check (bucket_id = 'financial-documents' and public.financial_money_role());

drop policy if exists "admin removes financial documents" on storage.objects;
create policy "admin removes financial documents"
  on storage.objects for delete
  using (
    bucket_id = 'financial-documents'
    and public.dashboard_current_role() in ('owner', 'admin')
  );

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'vendors','expenses','invoices','invoice_line_items'
  ] loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', target_table, target_table);
    execute format(
      'create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      target_table,
      target_table
    );
  end loop;
end $$;
