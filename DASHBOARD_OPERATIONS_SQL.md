# Urban Yards Dashboard Operations SQL

Paste this into the Supabase SQL Editor to enable saved Operations records.

```sql
create table if not exists operations_records (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  record_type text not null,
  title text not null,
  description text,
  status text not null default 'Active',
  priority text default 'Normal',
  due_date date,
  completed_at timestamptz,
  notes text,
  constraint operations_records_status_check check (status in ('Active', 'Completed', 'Follow-up needed', 'Archived')),
  constraint operations_records_priority_check check (priority in ('Low', 'Normal', 'High'))
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
