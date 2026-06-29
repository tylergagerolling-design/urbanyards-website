# Urban Yards Dashboard Outreach SQL

Paste this into the Supabase SQL Editor to enable saved Outreach / Property Leads records.

```sql
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

alter table outreach_prospects enable row level security;

drop policy if exists "owner read outreach prospects" on outreach_prospects;
drop policy if exists "owner write outreach prospects" on outreach_prospects;

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
```
