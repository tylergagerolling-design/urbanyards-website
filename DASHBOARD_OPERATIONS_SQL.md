# Urban Yards Dashboard Operations SQL

Paste this into the Supabase SQL Editor to enable saved Operations records.

```sql
create table if not exists operations_records (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  record_type text not null,
  title text not null,
  client_name text,
  property_address text,
  due_date date,
  status text not null default 'Active',
  notes text,
  payload jsonb not null default '{}'::jsonb
);

alter table operations_records enable row level security;

drop policy if exists "owner read operations records" on operations_records;
drop policy if exists "owner write operations records" on operations_records;

create policy "owner read operations records"
  on operations_records for select
  using ((auth.jwt() ->> 'email') = 'team@urbanyards.us');

create policy "owner write operations records"
  on operations_records for all
  using ((auth.jwt() ->> 'email') = 'team@urbanyards.us')
  with check ((auth.jwt() ->> 'email') = 'team@urbanyards.us');

create index if not exists operations_records_type_idx
  on operations_records (record_type);

create index if not exists operations_records_due_date_idx
  on operations_records (due_date);
```
