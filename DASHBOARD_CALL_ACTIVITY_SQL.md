# Dashboard Call Activity SQL

Run this in the Supabase SQL Editor to enable dashboard call attempt logging, call outcomes, notes, and follow-up dates.

```sql
create extension if not exists pgcrypto;

create table if not exists lead_activity (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lead_id uuid not null,
  lead_type text not null default 'lead',
  phone_number text not null,
  type text not null default 'call_attempt',
  outcome text not null default 'not_set',
  notes text not null default '',
  follow_up_date date,
  metadata jsonb not null default '{}'::jsonb,
  constraint lead_activity_type_check check (type in ('call_attempt')),
  constraint lead_activity_outcome_check check (outcome in (
    'not_set',
    'left_voicemail',
    'no_answer',
    'spoke_with_contact',
    'bad_number',
    'follow_up_later'
  )),
  constraint lead_activity_phone_check check (phone_number ~ '^\+1[0-9]{10}$'),
  constraint lead_activity_lead_type_check check (lead_type in (
    'quote_submission',
    'contact',
    'outreach_prospect',
    'outreach_company',
    'outreach_property',
    'lead'
  ))
);

alter table lead_activity enable row level security;

drop policy if exists "owner read lead activity" on lead_activity;
drop policy if exists "owner write lead activity" on lead_activity;

create policy "owner read lead activity"
  on lead_activity for select
  using ((auth.jwt() ->> 'email') = 'team@urbanyards.us');

create policy "owner write lead activity"
  on lead_activity for all
  using ((auth.jwt() ->> 'email') = 'team@urbanyards.us')
  with check ((auth.jwt() ->> 'email') = 'team@urbanyards.us');

create index if not exists lead_activity_lead_idx
  on lead_activity (lead_type, lead_id, created_at desc);

create index if not exists lead_activity_created_at_idx
  on lead_activity (created_at desc);

create index if not exists lead_activity_follow_up_idx
  on lead_activity (follow_up_date)
  where follow_up_date is not null;
```
