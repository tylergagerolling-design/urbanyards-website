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
SQUARE_ACCESS_TOKEN=
SQUARE_LOCATION_ID=
SQUARE_VERSION=2025-06-18
SQUARE_WEBHOOK_SIGNATURE_KEY=
SQUARE_WEBHOOK_URL=https://urbanyards.us/api/square-webhook
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

create table sales_documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  document_type text not null check (document_type in ('estimate', 'invoice')),
  document_number text not null unique,
  client_name text not null,
  client_email text,
  issue_date date not null default current_date,
  due_date date,
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'void')),
  square_invoice_id text,
  square_invoice_number text,
  square_status text,
  square_payment_url text,
  square_amount_due_cents integer,
  square_currency text default 'USD',
  square_synced_at timestamptz,
  line_items jsonb not null default '[]'::jsonb,
  subtotal numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  notes text
);

create table route_stops (
  id uuid primary key default gen_random_uuid(),
  route_date date not null,
  client_name text not null,
  address text not null,
  service_type text not null,
  estimated_minutes integer,
  notes text,
  status text not null default 'Planned' check (status in ('Planned', 'In Progress', 'Complete')),
  stop_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table quote_submissions enable row level security;
alter table contacts enable row level security;
alter table scheduled_jobs enable row level security;
alter table job_notes enable row level security;
alter table follow_up_reminders enable row level security;
alter table sales_documents enable row level security;
alter table route_stops enable row level security;

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

create policy "owner read sales documents"
  on sales_documents for select
  using ((auth.jwt() ->> 'email') = 'team@urbanyards.us');

create policy "owner write sales documents"
  on sales_documents for all
  using ((auth.jwt() ->> 'email') = 'team@urbanyards.us')
  with check ((auth.jwt() ->> 'email') = 'team@urbanyards.us');

create policy "owner read route stops"
  on route_stops for select
  using ((auth.jwt() ->> 'email') = 'team@urbanyards.us');

create policy "owner write route stops"
  on route_stops for all
  using ((auth.jwt() ->> 'email') = 'team@urbanyards.us')
  with check ((auth.jwt() ->> 'email') = 'team@urbanyards.us');

create index if not exists route_stops_route_date_order_idx
  on route_stops (route_date, stop_order);
```

If you already created `sales_documents`, run this upgrade SQL:

```sql
alter table sales_documents
  add column if not exists square_invoice_id text,
  add column if not exists square_invoice_number text,
  add column if not exists square_status text,
  add column if not exists square_payment_url text,
  add column if not exists square_amount_due_cents integer,
  add column if not exists square_currency text default 'USD',
  add column if not exists square_synced_at timestamptz;

create index if not exists sales_documents_square_invoice_id_idx
  on sales_documents (square_invoice_id);

create index if not exists sales_documents_square_invoice_number_idx
  on sales_documents (square_invoice_number);
```

If you already created the original dashboard tables, run this Route Planner SQL:

```sql
create table if not exists route_stops (
  id uuid primary key default gen_random_uuid(),
  route_date date not null,
  client_name text not null,
  address text not null,
  service_type text not null,
  estimated_minutes integer,
  notes text,
  status text not null default 'Planned' check (status in ('Planned', 'In Progress', 'Complete')),
  stop_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table route_stops enable row level security;

drop policy if exists "owner read route stops" on route_stops;
drop policy if exists "owner write route stops" on route_stops;

create policy "owner read route stops"
  on route_stops for select
  using ((auth.jwt() ->> 'email') = 'team@urbanyards.us');

create policy "owner write route stops"
  on route_stops for all
  using ((auth.jwt() ->> 'email') = 'team@urbanyards.us')
  with check ((auth.jwt() ->> 'email') = 'team@urbanyards.us');

create index if not exists route_stops_route_date_order_idx
  on route_stops (route_date, stop_order);
```

## Current Dashboard Sections

- Quote/contact submissions
- Contact list
- Scheduled jobs/visits
- Job notes
- Follow-up reminders
- Route Planner route stops
- Status fields: New, Contacted, Scheduled, Completed, Invoiced
