# Equipment Dashboard Supabase SQL

Run this in Supabase SQL Editor to create the Urban Yards dashboard equipment tables.

```sql
create extension if not exists pgcrypto;

create table if not exists equipment_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  category text not null default 'Miscellaneous',
  brand text,
  model text,
  serial_number text,
  quantity integer not null default 1,
  condition text not null default 'Good',
  status text not null default 'Ready',
  storage_location text,
  purchase_date date,
  purchase_price numeric(12,2),
  supplier text,
  product_url text,
  image_url text,
  notes text,
  last_maintenance_date date,
  next_maintenance_date date,
  replacement_priority text not null default 'Normal',
  constraint equipment_items_quantity_check check (quantity >= 0),
  constraint equipment_items_condition_check check (condition in ('New', 'Good', 'Fair', 'Needs Repair', 'Replace Soon', 'Retired')),
  constraint equipment_items_status_check check (status in ('Ready', 'In Use', 'Needs Maintenance', 'Needs Repair', 'Missing', 'Retired')),
  constraint equipment_items_priority_check check (replacement_priority in ('High', 'Normal', 'Low'))
);

create table if not exists equipment_maintenance (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  equipment_id uuid references equipment_items(id) on delete cascade,
  maintenance_date date not null default current_date,
  maintenance_type text,
  notes text,
  cost numeric(12,2),
  performed_by text,
  next_maintenance_date date
);

create table if not exists hardware_guide (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  category text not null default 'Miscellaneous',
  recommended_use text,
  brand text,
  model text,
  estimated_price numeric(12,2),
  priority text not null default 'Normal',
  product_url text,
  supplier text,
  notes text,
  status text not null default 'Researching',
  good_for text,
  constraint hardware_guide_priority_check check (priority in ('High', 'Normal', 'Low')),
  constraint hardware_guide_status_check check (status in ('Researching', 'Recommended', 'Bought', 'Not Chosen'))
);

alter table equipment_items enable row level security;
alter table equipment_maintenance enable row level security;
alter table hardware_guide enable row level security;

drop policy if exists "owner manage equipment items" on equipment_items;
drop policy if exists "owner manage equipment maintenance" on equipment_maintenance;
drop policy if exists "owner manage hardware guide" on hardware_guide;

create policy "owner manage equipment items" on equipment_items for all
  using ((auth.jwt() ->> 'email') = 'team@urbanyards.us')
  with check ((auth.jwt() ->> 'email') = 'team@urbanyards.us');

create policy "owner manage equipment maintenance" on equipment_maintenance for all
  using ((auth.jwt() ->> 'email') = 'team@urbanyards.us')
  with check ((auth.jwt() ->> 'email') = 'team@urbanyards.us');

create policy "owner manage hardware guide" on hardware_guide for all
  using ((auth.jwt() ->> 'email') = 'team@urbanyards.us')
  with check ((auth.jwt() ->> 'email') = 'team@urbanyards.us');

create index if not exists equipment_items_category_idx on equipment_items(category);
create index if not exists equipment_items_status_idx on equipment_items(status);
create index if not exists equipment_items_condition_idx on equipment_items(condition);
create index if not exists equipment_items_next_maintenance_idx on equipment_items(next_maintenance_date);
create index if not exists equipment_maintenance_equipment_date_idx on equipment_maintenance(equipment_id, maintenance_date desc);
create index if not exists hardware_guide_category_idx on hardware_guide(category);
create index if not exists hardware_guide_priority_idx on hardware_guide(priority);
create index if not exists hardware_guide_status_idx on hardware_guide(status);

insert into hardware_guide (name, category, recommended_use, priority, status, good_for, notes)
values
  ('Commercial battery mower', 'Mowers', 'Quiet mowing for homeowner and small multifamily properties.', 'High', 'Researching', 'Mowing, homeowner jobs, apartments', 'Add preferred model, supplier, and manual estimated price.'),
  ('Compact pressure washer', 'Pressure washing', 'Walkways, bins, entries, and common areas.', 'Normal', 'Researching', 'Pressure washing, trash area care, apartments', 'Manual links and prices only for now.')
on conflict do nothing;
```
