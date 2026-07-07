# Groundskeeper AI Supabase SQL

Run this in Supabase SQL Editor to create the shared Urban Yards AI knowledge tables.

```sql
create table if not exists ai_settings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  setting_key text not null unique,
  label text not null,
  value text not null default '',
  visibility text not null default 'public',
  status text not null default 'draft',
  notes text,
  constraint ai_settings_visibility_check check (visibility in ('public', 'internal')),
  constraint ai_settings_status_check check (status in ('draft', 'published', 'archived'))
);

create table if not exists ai_knowledge (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  category text not null default 'General',
  content text not null,
  source_url text,
  visibility text not null default 'public',
  status text not null default 'draft',
  notes text,
  constraint ai_knowledge_visibility_check check (visibility in ('public', 'internal')),
  constraint ai_knowledge_status_check check (status in ('draft', 'published', 'archived'))
);

create table if not exists ai_faqs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  question text not null,
  answer text not null,
  category text not null default 'Website FAQ',
  visibility text not null default 'public',
  status text not null default 'draft',
  constraint ai_faqs_visibility_check check (visibility in ('public', 'internal')),
  constraint ai_faqs_status_check check (status in ('draft', 'published', 'archived'))
);

create table if not exists ai_rules (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  content text not null,
  visibility text not null default 'public',
  status text not null default 'draft',
  constraint ai_rules_visibility_check check (visibility in ('public', 'internal')),
  constraint ai_rules_status_check check (status in ('draft', 'published', 'archived'))
);

create table if not exists ai_saved_answers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  question text not null,
  answer text not null,
  visibility text not null default 'public',
  status text not null default 'draft',
  constraint ai_saved_answers_visibility_check check (visibility in ('public', 'internal')),
  constraint ai_saved_answers_status_check check (status in ('draft', 'published', 'archived'))
);

create table if not exists ai_conversation_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  mode text not null default 'public',
  page text,
  question text not null,
  answer text,
  lead_context jsonb not null default '{}'::jsonb,
  request_id text,
  reviewed boolean not null default false
);

create table if not exists ai_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  conversation_id uuid references ai_conversation_logs(id) on delete set null,
  rating text,
  notes text,
  suggested_action text,
  status text not null default 'new',
  constraint ai_feedback_status_check check (status in ('new', 'reviewed', 'applied', 'archived'))
);

alter table ai_settings enable row level security;
alter table ai_knowledge enable row level security;
alter table ai_faqs enable row level security;
alter table ai_rules enable row level security;
alter table ai_saved_answers enable row level security;
alter table ai_conversation_logs enable row level security;
alter table ai_feedback enable row level security;

drop policy if exists "owner manage ai settings" on ai_settings;
drop policy if exists "owner manage ai knowledge" on ai_knowledge;
drop policy if exists "owner manage ai faqs" on ai_faqs;
drop policy if exists "owner manage ai rules" on ai_rules;
drop policy if exists "owner manage ai saved answers" on ai_saved_answers;
drop policy if exists "owner manage ai conversation logs" on ai_conversation_logs;
drop policy if exists "owner manage ai feedback" on ai_feedback;

create policy "owner manage ai settings" on ai_settings for all
  using ((auth.jwt() ->> 'email') = 'team@urbanyards.us')
  with check ((auth.jwt() ->> 'email') = 'team@urbanyards.us');

create policy "owner manage ai knowledge" on ai_knowledge for all
  using ((auth.jwt() ->> 'email') = 'team@urbanyards.us')
  with check ((auth.jwt() ->> 'email') = 'team@urbanyards.us');

create policy "owner manage ai faqs" on ai_faqs for all
  using ((auth.jwt() ->> 'email') = 'team@urbanyards.us')
  with check ((auth.jwt() ->> 'email') = 'team@urbanyards.us');

create policy "owner manage ai rules" on ai_rules for all
  using ((auth.jwt() ->> 'email') = 'team@urbanyards.us')
  with check ((auth.jwt() ->> 'email') = 'team@urbanyards.us');

create policy "owner manage ai saved answers" on ai_saved_answers for all
  using ((auth.jwt() ->> 'email') = 'team@urbanyards.us')
  with check ((auth.jwt() ->> 'email') = 'team@urbanyards.us');

create policy "owner manage ai conversation logs" on ai_conversation_logs for all
  using ((auth.jwt() ->> 'email') = 'team@urbanyards.us')
  with check ((auth.jwt() ->> 'email') = 'team@urbanyards.us');

create policy "owner manage ai feedback" on ai_feedback for all
  using ((auth.jwt() ->> 'email') = 'team@urbanyards.us')
  with check ((auth.jwt() ->> 'email') = 'team@urbanyards.us');

create index if not exists ai_knowledge_status_visibility_idx on ai_knowledge(status, visibility);
create index if not exists ai_faqs_status_visibility_idx on ai_faqs(status, visibility);
create index if not exists ai_rules_status_visibility_idx on ai_rules(status, visibility);
create index if not exists ai_saved_answers_status_visibility_idx on ai_saved_answers(status, visibility);
create index if not exists ai_conversation_logs_created_idx on ai_conversation_logs(created_at desc);

insert into ai_settings (setting_key, label, value, visibility, status) values
  ('business_name', 'Business name', 'Urban Yards Groundskeeping', 'public', 'published'),
  ('tagline', 'Tagline', 'First Impressions Start Here', 'public', 'published'),
  ('service_area', 'Service area', 'Portland, Vancouver & Beaverton', 'public', 'published'),
  ('phone', 'Phone', '(971) 258-1109', 'public', 'published'),
  ('email', 'Email', 'team@urbanyards.us', 'public', 'published'),
  ('brand_voice', 'Brand voice', 'Practical, local, owner-operated, professional, clear, and not overly salesy.', 'public', 'published'),
  ('last_published_at', 'Last Published', now()::text, 'internal', 'published')
on conflict (setting_key) do update set
  label = excluded.label,
  value = excluded.value,
  visibility = excluded.visibility,
  status = excluded.status,
  updated_at = now();

insert into ai_knowledge (title, category, content, visibility, status) values
  ('Main customers', 'Business Facts', 'Urban Yards serves homeowners, small multifamily properties, apartment communities, HOAs, property managers, and local property owners.', 'public', 'published'),
  ('Main services', 'Services', 'Lawn mowing, edging, weed control, seasonal cleanup, mulch refreshes, landscape maintenance, pressure washing, apartment groundskeeping, HOA landscape maintenance, trash area care, property management support, apartment turnover support, and light property-care tasks.', 'public', 'published'),
  ('Quote process', 'Quote Process', 'Visitors should use Request a Free Quote when pricing, scheduling, property review, photos, or scope details are needed.', 'public', 'published'),
  ('Payment process', 'Payments', 'Urban Yards uses Square invoices and Square payment links. The website can look up open invoices, but it does not collect card details.', 'public', 'published')
on conflict do nothing;

insert into ai_faqs (question, answer, category, visibility, status) values
  ('How much does service cost?', 'Pricing depends on property size, condition, access, frequency, and scope. Urban Yards does not list flat pricing on the site. The best next step is to request a free quote with property details and photos if available.', 'Pricing Guidance', 'public', 'published'),
  ('What areas do you serve?', 'The main service area is Portland, Vancouver & Beaverton. Serving Portland, Vancouver, Beaverton, and nearby communities. If a property is near those areas, Urban Yards can confirm through the quote form.', 'Service Area', 'public', 'published'),
  ('How do payments work?', 'Urban Yards handles invoices and payments through Square. The website can help look up open invoices and return Square payment links, but it does not collect card details.', 'Payments', 'public', 'published')
on conflict do nothing;

insert into ai_rules (title, content, visibility, status) values
  ('Do not invent prices', 'Never provide final pricing. Explain that pricing depends on property size, condition, access, frequency, and scope, then recommend Request a Free Quote.', 'public', 'published'),
  ('Service area boundary', 'When asked whether Urban Yards serves an area, answer based on Portland, Vancouver & Beaverton. If unsure, recommend the quote form or direct contact.', 'public', 'published'),
  ('Public knowledge safety', 'Public website visitors can only use published public knowledge. Never reveal internal-only or draft dashboard knowledge to public visitors.', 'public', 'published')
on conflict do nothing;
```
