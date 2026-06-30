# Urban Yards Dashboard Outreach SQL

Paste this into the Supabase SQL Editor to enable saved Outreach / Property Leads records.

```sql
create table if not exists outreach_companies (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  contact text,
  email text,
  phone text,
  website text,
  city text,
  service_area text,
  type text,
  service text,
  source text,
  source_url text,
  status text not null default 'Prospect',
  follow_up date,
  notes text,
  priority text not null default 'Normal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint outreach_companies_status_check check (status in (
    'Prospect',
    'Researched',
    'Contacted',
    'Follow-Up Needed',
    'Interested',
    'Quote Needed',
    'Quoted',
    'Won',
    'Lost / No Fit'
  )),
  constraint outreach_companies_priority_check check (priority in ('High', 'Normal', 'Low'))
);

create table if not exists outreach_properties (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references outreach_companies(id) on delete set null,
  company text,
  property_name text,
  address text,
  city text,
  state text,
  zip text,
  neighborhood text,
  property_type text,
  estimated_units integer,
  service_fit text,
  service text,
  visible_needs text,
  notes text,
  source text,
  source_url text,
  google_maps_url text,
  verified_at date,
  status text not null default 'Prospect',
  follow_up date,
  priority text not null default 'Normal',
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint outreach_properties_status_check check (status in (
    'Prospect',
    'Researched',
    'Contacted',
    'Follow-Up Needed',
    'Interested',
    'Quote Needed',
    'Quoted',
    'Won',
    'Lost / No Fit'
  )),
  constraint outreach_properties_priority_check check (priority in ('High', 'Normal', 'Low'))
);

alter table outreach_properties alter column property_name drop not null;

create table if not exists outreach_prospects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  property_name text,
  management_company text,
  contact_name text,
  email text,
  phone text,
  address text,
  city text,
  property_type text,
  service_interest text,
  source text,
  status text not null default 'Prospect',
  last_contacted_at date,
  next_follow_up_at date,
  notes text,
  priority text not null default 'Normal',
  route_added boolean not null default false,
  converted_to_quote boolean not null default false,
  constraint outreach_prospects_status_check check (status in (
    'Prospect',
    'Researched',
    'Contacted',
    'Follow-Up Needed',
    'Interested',
    'Quote Needed',
    'Quoted',
    'Won',
    'Lost / No Fit'
  )),
  constraint outreach_prospects_priority_check check (priority in ('High', 'Normal', 'Low')),
  constraint outreach_prospects_identity_check check (
    nullif(btrim(coalesce(property_name, '')), '') is not null
    or nullif(btrim(coalesce(contact_name, '')), '') is not null
  ),
  constraint outreach_prospects_reach_check check (
    nullif(btrim(coalesce(email, '')), '') is not null
    or nullif(btrim(coalesce(phone, '')), '') is not null
    or nullif(btrim(coalesce(address, '')), '') is not null
    or nullif(btrim(coalesce(city, '')), '') is not null
  )
);

alter table outreach_companies enable row level security;
alter table outreach_properties enable row level security;
alter table outreach_prospects enable row level security;

drop policy if exists "owner read outreach companies" on outreach_companies;
drop policy if exists "owner write outreach companies" on outreach_companies;
drop policy if exists "owner read outreach properties" on outreach_properties;
drop policy if exists "owner write outreach properties" on outreach_properties;
drop policy if exists "owner read outreach prospects" on outreach_prospects;
drop policy if exists "owner write outreach prospects" on outreach_prospects;

create policy "owner read outreach companies"
  on outreach_companies for select
  using ((auth.jwt() ->> 'email') = 'team@urbanyards.us');

create policy "owner write outreach companies"
  on outreach_companies for all
  using ((auth.jwt() ->> 'email') = 'team@urbanyards.us')
  with check ((auth.jwt() ->> 'email') = 'team@urbanyards.us');

create policy "owner read outreach properties"
  on outreach_properties for select
  using ((auth.jwt() ->> 'email') = 'team@urbanyards.us');

create policy "owner write outreach properties"
  on outreach_properties for all
  using ((auth.jwt() ->> 'email') = 'team@urbanyards.us')
  with check ((auth.jwt() ->> 'email') = 'team@urbanyards.us');

create policy "owner read outreach prospects"
  on outreach_prospects for select
  using ((auth.jwt() ->> 'email') = 'team@urbanyards.us');

create policy "owner write outreach prospects"
  on outreach_prospects for all
  using ((auth.jwt() ->> 'email') = 'team@urbanyards.us')
  with check ((auth.jwt() ->> 'email') = 'team@urbanyards.us');

create index if not exists outreach_prospects_status_idx
  on outreach_prospects (status);

create index if not exists outreach_prospects_follow_up_idx
  on outreach_prospects (next_follow_up_at);

create index if not exists outreach_prospects_priority_idx
  on outreach_prospects (priority);

create index if not exists outreach_companies_company_idx
  on outreach_companies (company);

create index if not exists outreach_companies_status_idx
  on outreach_companies (status);

create index if not exists outreach_properties_company_id_idx
  on outreach_properties (company_id);

create index if not exists outreach_properties_company_idx
  on outreach_properties (company);

create index if not exists outreach_properties_address_idx
  on outreach_properties (address);

create index if not exists outreach_properties_city_idx
  on outreach_properties (city);

create index if not exists outreach_properties_neighborhood_idx
  on outreach_properties (neighborhood);

create index if not exists outreach_properties_status_idx
  on outreach_properties (status);

create index if not exists outreach_properties_follow_up_idx
  on outreach_properties (follow_up);
```
