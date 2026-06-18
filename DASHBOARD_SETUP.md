# Urban Yards Owner Dashboard Setup

The owner dashboard is available at `/dashboard`. It is intentionally not linked from public navigation or the footer, and the page is marked `noindex,nofollow`.

The dashboard now uses Supabase Auth for login/logout and reads/writes the Supabase dashboard tables after the SQL below has been run.

## Netlify Environment Variables

Add these in Netlify under Site configuration > Environment variables:

```text
VITE_SUPABASE_URL=https://gvdeqqrbonulwgmgpgis.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_vdgK4ap6lzVz379PcwN4cw_LZrHZRCS
SUPABASE_URL=https://gvdeqqrbonulwgmgpgis.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Optional:

```text
VITE_DASHBOARD_OWNER_EMAIL=team@urbanyards.us
```

Netlify runs `node scripts/build-dashboard-config.js` during deploy. That script generates `dashboard-config.js` from the environment variables.

`SUPABASE_SERVICE_ROLE_KEY` is server-only. It lets the Netlify quote function save public website quote requests into `quote_submissions`. Do not paste the service-role key into frontend code.

## Supabase Auth Settings

In Supabase:

1. Go to Authentication > Providers > Email.
2. Keep Email enabled.
3. Turn off public sign-ups / new user registration if that option is available in your project UI.
4. Do not add any public sign-up UI to the website.
5. Go to Authentication > URL Configuration.
6. Set Site URL to `https://urbanyards.us`.
7. Add redirect URL `https://urbanyards.us/dashboard` if Supabase asks for allowed redirects.

The dashboard also rejects any signed-in user whose email is not `team@urbanyards.us`.

## First Owner Account

Create the owner manually:

1. In Supabase, go to Authentication > Users.
2. Click Add user or Invite user.
3. Use email `team@urbanyards.us`.
4. If using Add user, set a strong password and mark the email confirmed if Supabase offers that option.
5. If using Invite user, open the invite email and set the password.
6. Go to `https://urbanyards.us/dashboard`.
7. Sign in with `team@urbanyards.us` and the password you created.

Do not create dashboard users for any other email unless the dashboard owner email is intentionally changed.

## SQL For Dashboard Tables

Run this SQL in Supabase SQL Editor to create the dashboard records.

```sql
create type dashboard_status as enum (
  'New',
  'Contacted',
  'Scheduled',
  'Completed',
  'Invoiced'
);

create table quote_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text,
  phone text,
  property_type text,
  city text,
  service text,
  source text default 'Quote form',
  status dashboard_status not null default 'New',
  follow_up text,
  notes text
);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text,
  phone text,
  contact_type text,
  city text,
  status dashboard_status not null default 'New'
);

create table scheduled_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  visit_date date not null,
  visit_window text,
  site_name text not null,
  city text,
  service text,
  status dashboard_status not null default 'Scheduled'
);

create table job_notes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  body text not null,
  related_job_id uuid references scheduled_jobs(id) on delete set null
);

create table follow_up_reminders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  due_date date,
  task text not null,
  status dashboard_status not null default 'New',
  related_submission_id uuid references quote_submissions(id) on delete set null,
  related_contact_id uuid references contacts(id) on delete set null
);

alter table quote_submissions enable row level security;
alter table contacts enable row level security;
alter table scheduled_jobs enable row level security;
alter table job_notes enable row level security;
alter table follow_up_reminders enable row level security;

create policy "owner read quote submissions"
  on quote_submissions for select
  using ((auth.jwt() ->> 'email') = 'team@urbanyards.us');

create policy "owner write quote submissions"
  on quote_submissions for all
  using ((auth.jwt() ->> 'email') = 'team@urbanyards.us')
  with check ((auth.jwt() ->> 'email') = 'team@urbanyards.us');

create policy "owner read contacts"
  on contacts for select
  using ((auth.jwt() ->> 'email') = 'team@urbanyards.us');

create policy "owner write contacts"
  on contacts for all
  using ((auth.jwt() ->> 'email') = 'team@urbanyards.us')
  with check ((auth.jwt() ->> 'email') = 'team@urbanyards.us');

create policy "owner read scheduled jobs"
  on scheduled_jobs for select
  using ((auth.jwt() ->> 'email') = 'team@urbanyards.us');

create policy "owner write scheduled jobs"
  on scheduled_jobs for all
  using ((auth.jwt() ->> 'email') = 'team@urbanyards.us')
  with check ((auth.jwt() ->> 'email') = 'team@urbanyards.us');

create policy "owner read job notes"
  on job_notes for select
  using ((auth.jwt() ->> 'email') = 'team@urbanyards.us');

create policy "owner write job notes"
  on job_notes for all
  using ((auth.jwt() ->> 'email') = 'team@urbanyards.us')
  with check ((auth.jwt() ->> 'email') = 'team@urbanyards.us');

create policy "owner read follow up reminders"
  on follow_up_reminders for select
  using ((auth.jwt() ->> 'email') = 'team@urbanyards.us');

create policy "owner write follow up reminders"
  on follow_up_reminders for all
  using ((auth.jwt() ->> 'email') = 'team@urbanyards.us')
  with check ((auth.jwt() ->> 'email') = 'team@urbanyards.us');
```

## Current Dashboard Sections

- Quote/contact submissions
- Contact list
- Scheduled jobs/visits
- Job notes
- Follow-up reminders
- Status fields: New, Contacted, Scheduled, Completed, Invoiced
