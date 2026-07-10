-- Urban Yards Documentation and Forms module.
-- Run after the dashboard security/operations migrations.
-- Creates private storage buckets, template/version/assignment/submission tables,
-- audit history, feature flag, grants, and defensive RLS policies.

create extension if not exists pgcrypto;

create or replace function public.dashboard_role_rank(role_name text)
returns integer
language sql
immutable
as $$
  select case lower(coalesce(role_name, ''))
    when 'client' then 10
    when 'viewer' then 20
    when 'worker' then 30
    when 'staff' then 40
    when 'manager' then 40
    when 'admin' then 50
    when 'owner' then 60
    else 0
  end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  display_name text,
  role text not null default 'viewer',
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text,
  role text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists user_id uuid,
  add column if not exists disabled_at timestamptz;

create or replace function public.dashboard_current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.role from public.profiles p where p.id = auth.uid() and coalesce(p.disabled_at is null, true) limit 1),
    (select p.role from public.profiles p where p.user_id = auth.uid() and coalesce(p.disabled_at is null, true) limit 1),
    (select r.role from public.roles r where r.user_id = auth.uid() limit 1),
    (select r.role from public.roles r where lower(r.email) = lower(auth.jwt() ->> 'email') limit 1),
    case when lower(auth.jwt() ->> 'email') = 'team@urbanyards.us' then 'owner' end,
    'viewer'
  );
$$;

create or replace function public.dashboard_role_at_least(minimum_role text)
returns boolean
language sql
stable
as $$
  select public.dashboard_role_rank(public.dashboard_current_role()) >= public.dashboard_role_rank(minimum_role);
$$;

create or replace function public.documentation_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.feature_flags (
  flag_key text primary key,
  enabled boolean not null default true,
  label text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'documentation-templates',
    'documentation-templates',
    false,
    15728640,
    array[
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/webp',
      'text/csv'
    ]
  ),
  (
    'documentation-submissions',
    'documentation-submissions',
    false,
    15728640,
    array[
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/webp',
      'text/csv'
    ]
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.documentation_templates (
  id uuid primary key default gen_random_uuid(),
  organization_key text not null default 'urban-yards',
  name text not null,
  category text not null default 'Custom Forms',
  description text,
  instructions text,
  status text not null default 'Active',
  allowed_roles text[] not null default array['owner', 'admin', 'manager', 'staff', 'worker'],
  current_version integer not null default 1,
  file_bucket text not null default 'documentation-templates',
  file_path text,
  file_name text,
  mime_type text,
  file_size_bytes integer,
  requires_signature boolean not null default false,
  requires_photos boolean not null default false,
  is_recurring boolean not null default false,
  recurrence_rule text,
  required_by_default boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_by_email text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  constraint documentation_templates_status_check check (status in ('Active', 'Inactive', 'Archived')),
  constraint documentation_templates_version_check check (current_version >= 1),
  constraint documentation_templates_bucket_check check (file_bucket = 'documentation-templates')
);

create table if not exists public.documentation_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.documentation_templates(id) on delete cascade,
  version_number integer not null,
  version_label text,
  file_bucket text not null default 'documentation-templates',
  file_path text,
  file_name text,
  mime_type text,
  file_size_bytes integer,
  change_notes text,
  uploaded_by uuid references auth.users(id) on delete set null,
  uploaded_by_email text,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint documentation_template_versions_number_check check (version_number >= 1),
  constraint documentation_template_versions_bucket_check check (file_bucket = 'documentation-templates'),
  unique (template_id, version_number)
);

create table if not exists public.documentation_assignments (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.documentation_templates(id) on delete set null,
  template_version_id uuid references public.documentation_template_versions(id) on delete set null,
  template_name text not null,
  template_version integer not null default 1,
  category text not null default 'Custom Forms',
  assigned_to_user_id uuid references auth.users(id) on delete set null,
  assigned_to_name text,
  assigned_to_email text,
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_by_email text,
  target_type text not null default 'general',
  target_id text,
  property_name text,
  contact_name text,
  job_name text,
  scheduled_visit_name text,
  equipment_name text,
  employee_name text,
  due_date date,
  priority text not null default 'Normal',
  status text not null default 'Not Started',
  required boolean not null default true,
  recurring boolean not null default false,
  recurrence_rule text,
  recurrence_next_due_date date,
  instructions text,
  opened_at timestamptz,
  draft_saved_at timestamptz,
  submitted_at timestamptz,
  completed_submission_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  constraint documentation_assignments_status_check check (status in ('Not Started', 'In Progress', 'Submitted', 'Needs Correction', 'Approved', 'Overdue', 'Archived')),
  constraint documentation_assignments_priority_check check (priority in ('High', 'Normal', 'Low')),
  constraint documentation_assignments_target_type_check check (target_type in ('property', 'contact', 'job', 'scheduled_visit', 'equipment', 'employee', 'company', 'general'))
);

create table if not exists public.documentation_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references public.documentation_assignments(id) on delete set null,
  template_id uuid references public.documentation_templates(id) on delete set null,
  template_version_id uuid references public.documentation_template_versions(id) on delete set null,
  template_name text not null,
  template_version integer not null default 1,
  category text not null default 'Custom Forms',
  completed_by_user_id uuid references auth.users(id) on delete set null,
  completed_by_name text,
  completed_by_email text,
  property_name text,
  contact_name text,
  job_name text,
  scheduled_visit_name text,
  equipment_name text,
  status text not null default 'Submitted',
  file_bucket text not null default 'documentation-submissions',
  file_path text,
  file_name text,
  mime_type text,
  file_size_bytes integer,
  draft_payload jsonb not null default '{}'::jsonb,
  notes text,
  comments text,
  signature_name text,
  signature_required boolean not null default false,
  photos_required boolean not null default false,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewer_user_id uuid references auth.users(id) on delete set null,
  reviewer_name text,
  reviewer_email text,
  correction_notes text,
  replacement_of_submission_id uuid references public.documentation_submissions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  constraint documentation_submissions_status_check check (status in ('Not Started', 'In Progress', 'Submitted', 'Needs Correction', 'Approved', 'Overdue', 'Archived')),
  constraint documentation_submissions_bucket_check check (file_bucket = 'documentation-submissions')
);

alter table public.documentation_assignments
  drop constraint if exists documentation_assignments_completed_submission_fk;

alter table public.documentation_assignments
  add constraint documentation_assignments_completed_submission_fk
  foreign key (completed_submission_id)
  references public.documentation_submissions(id)
  on delete set null;

create table if not exists public.documentation_attachments (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references public.documentation_assignments(id) on delete cascade,
  submission_id uuid references public.documentation_submissions(id) on delete cascade,
  attachment_type text not null default 'supporting_photo',
  file_bucket text not null default 'documentation-submissions',
  file_path text not null,
  file_name text,
  mime_type text,
  file_size_bytes integer,
  uploaded_by uuid references auth.users(id) on delete set null,
  uploaded_by_email text,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint documentation_attachments_type_check check (attachment_type in ('supporting_photo', 'completed_form', 'signature', 'correction_file', 'other')),
  constraint documentation_attachments_bucket_check check (file_bucket in ('documentation-templates', 'documentation-submissions'))
);

create table if not exists public.documentation_audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  entity_type text not null default 'documentation',
  entity_id text,
  template_id uuid references public.documentation_templates(id) on delete set null,
  template_version_id uuid references public.documentation_template_versions(id) on delete set null,
  assignment_id uuid references public.documentation_assignments(id) on delete set null,
  submission_id uuid references public.documentation_submissions(id) on delete set null,
  template_name text,
  template_version integer,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_name text,
  actor_email text,
  target_user_id uuid references auth.users(id) on delete set null,
  target_name text,
  target_email text,
  detail text,
  old_value jsonb,
  new_value jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists documentation_templates_category_idx on public.documentation_templates (category);
create index if not exists documentation_templates_status_idx on public.documentation_templates (status);
create index if not exists documentation_template_versions_template_idx on public.documentation_template_versions (template_id, version_number desc);
create index if not exists documentation_assignments_assignee_idx on public.documentation_assignments (assigned_to_user_id, assigned_to_email);
create index if not exists documentation_assignments_due_idx on public.documentation_assignments (due_date) where archived_at is null;
create index if not exists documentation_assignments_status_idx on public.documentation_assignments (status);
create index if not exists documentation_assignments_target_idx on public.documentation_assignments (target_type, target_id);
create index if not exists documentation_submissions_assignment_idx on public.documentation_submissions (assignment_id);
create index if not exists documentation_submissions_status_idx on public.documentation_submissions (status);
create index if not exists documentation_submissions_submitted_idx on public.documentation_submissions (submitted_at desc);
create index if not exists documentation_attachments_submission_idx on public.documentation_attachments (submission_id);
create index if not exists documentation_audit_logs_created_idx on public.documentation_audit_logs (created_at desc);
create index if not exists documentation_audit_logs_entity_idx on public.documentation_audit_logs (entity_type, entity_id);
create index if not exists documentation_audit_logs_template_idx on public.documentation_audit_logs (template_id);

drop trigger if exists documentation_templates_updated_at on public.documentation_templates;
create trigger documentation_templates_updated_at
before update on public.documentation_templates
for each row execute function public.documentation_updated_at();

drop trigger if exists documentation_assignments_updated_at on public.documentation_assignments;
create trigger documentation_assignments_updated_at
before update on public.documentation_assignments
for each row execute function public.documentation_updated_at();

drop trigger if exists documentation_submissions_updated_at on public.documentation_submissions;
create trigger documentation_submissions_updated_at
before update on public.documentation_submissions
for each row execute function public.documentation_updated_at();

alter table public.documentation_templates enable row level security;
alter table public.documentation_template_versions enable row level security;
alter table public.documentation_assignments enable row level security;
alter table public.documentation_submissions enable row level security;
alter table public.documentation_attachments enable row level security;
alter table public.documentation_audit_logs enable row level security;

do $$
declare
  table_name text;
  documentation_tables text[] := array[
    'documentation_templates',
    'documentation_template_versions',
    'documentation_assignments',
    'documentation_submissions',
    'documentation_attachments',
    'documentation_audit_logs'
  ];
begin
  foreach table_name in array documentation_tables loop
    execute format('drop policy if exists "owner full documentation access" on public.%I', table_name);
    execute format('drop policy if exists "admin documentation access" on public.%I', table_name);
    execute format('drop policy if exists "manager documentation access" on public.%I', table_name);
    execute format('drop policy if exists "worker documentation read own" on public.%I', table_name);
    execute format('drop policy if exists "viewer documentation read" on public.%I', table_name);

    execute format('create policy "owner full documentation access" on public.%I for all using (public.dashboard_current_role() = ''owner'') with check (public.dashboard_current_role() = ''owner'')', table_name);
  end loop;
end $$;

drop policy if exists "admin manager read templates" on public.documentation_templates;
create policy "admin manager read templates"
  on public.documentation_templates for select
  using (public.dashboard_role_at_least('viewer'));

drop policy if exists "admin manager read template versions" on public.documentation_template_versions;
create policy "admin manager read template versions"
  on public.documentation_template_versions for select
  using (public.dashboard_role_at_least('viewer'));

drop policy if exists "admin manager assignment access" on public.documentation_assignments;
create policy "admin manager assignment access"
  on public.documentation_assignments for all
  using (public.dashboard_role_at_least('manager'))
  with check (public.dashboard_role_at_least('manager'));

drop policy if exists "worker assignment access" on public.documentation_assignments;
create policy "worker assignment access"
  on public.documentation_assignments for all
  using (
    public.dashboard_role_at_least('worker')
    and (
      assigned_to_user_id = auth.uid()
      or lower(coalesce(assigned_to_email, '')) = lower(auth.jwt() ->> 'email')
    )
  )
  with check (
    public.dashboard_role_at_least('worker')
    and (
      assigned_to_user_id = auth.uid()
      or lower(coalesce(assigned_to_email, '')) = lower(auth.jwt() ->> 'email')
    )
  );

drop policy if exists "viewer assignment read" on public.documentation_assignments;
create policy "viewer assignment read"
  on public.documentation_assignments for select
  using (public.dashboard_role_at_least('viewer'));

drop policy if exists "admin manager submission review" on public.documentation_submissions;
create policy "admin manager submission review"
  on public.documentation_submissions for all
  using (public.dashboard_role_at_least('manager'))
  with check (public.dashboard_role_at_least('manager'));

drop policy if exists "worker submission own access" on public.documentation_submissions;
create policy "worker submission own access"
  on public.documentation_submissions for all
  using (
    public.dashboard_role_at_least('worker')
    and (
      completed_by_user_id = auth.uid()
      or lower(coalesce(completed_by_email, '')) = lower(auth.jwt() ->> 'email')
    )
  )
  with check (
    public.dashboard_role_at_least('worker')
    and (
      completed_by_user_id = auth.uid()
      or lower(coalesce(completed_by_email, '')) = lower(auth.jwt() ->> 'email')
    )
  );

drop policy if exists "viewer submission read" on public.documentation_submissions;
create policy "viewer submission read"
  on public.documentation_submissions for select
  using (public.dashboard_role_at_least('viewer'));

drop policy if exists "admin manager attachment access" on public.documentation_attachments;
create policy "admin manager attachment access"
  on public.documentation_attachments for all
  using (public.dashboard_role_at_least('manager'))
  with check (public.dashboard_role_at_least('manager'));

drop policy if exists "worker attachment own access" on public.documentation_attachments;
create policy "worker attachment own access"
  on public.documentation_attachments for all
  using (
    public.dashboard_role_at_least('worker')
    and (
      uploaded_by = auth.uid()
      or lower(coalesce(uploaded_by_email, '')) = lower(auth.jwt() ->> 'email')
    )
  )
  with check (
    public.dashboard_role_at_least('worker')
    and (
      uploaded_by = auth.uid()
      or lower(coalesce(uploaded_by_email, '')) = lower(auth.jwt() ->> 'email')
    )
  );

drop policy if exists "viewer attachment read" on public.documentation_attachments;
create policy "viewer attachment read"
  on public.documentation_attachments for select
  using (public.dashboard_role_at_least('viewer'));

drop policy if exists "manager audit write" on public.documentation_audit_logs;
create policy "manager audit write"
  on public.documentation_audit_logs for insert
  with check (public.dashboard_role_at_least('manager'));

drop policy if exists "viewer audit read" on public.documentation_audit_logs;
create policy "viewer audit read"
  on public.documentation_audit_logs for select
  using (public.dashboard_role_at_least('viewer'));

grant select, insert, update, delete on
  public.documentation_templates,
  public.documentation_template_versions,
  public.documentation_assignments,
  public.documentation_submissions,
  public.documentation_attachments,
  public.documentation_audit_logs
to authenticated;

drop policy if exists "documentation users read private files" on storage.objects;
create policy "documentation users read private files"
  on storage.objects for select
  using (
    bucket_id in ('documentation-templates', 'documentation-submissions')
    and auth.role() = 'authenticated'
    and public.dashboard_role_at_least('viewer')
  );

drop policy if exists "owner manages documentation templates" on storage.objects;
create policy "owner manages documentation templates"
  on storage.objects for all
  using (
    bucket_id = 'documentation-templates'
    and auth.role() = 'authenticated'
    and public.dashboard_current_role() = 'owner'
  )
  with check (
    bucket_id = 'documentation-templates'
    and auth.role() = 'authenticated'
    and public.dashboard_current_role() = 'owner'
  );

drop policy if exists "documentation users upload submissions" on storage.objects;
create policy "documentation users upload submissions"
  on storage.objects for insert
  with check (
    bucket_id = 'documentation-submissions'
    and auth.role() = 'authenticated'
    and public.dashboard_role_at_least('worker')
  );

drop policy if exists "manager updates documentation submissions" on storage.objects;
create policy "manager updates documentation submissions"
  on storage.objects for update
  using (
    bucket_id = 'documentation-submissions'
    and auth.role() = 'authenticated'
    and public.dashboard_role_at_least('manager')
  )
  with check (
    bucket_id = 'documentation-submissions'
    and auth.role() = 'authenticated'
    and public.dashboard_role_at_least('manager')
  );

drop policy if exists "admin deletes documentation submissions" on storage.objects;
create policy "admin deletes documentation submissions"
  on storage.objects for delete
  using (
    bucket_id = 'documentation-submissions'
    and auth.role() = 'authenticated'
    and public.dashboard_role_at_least('admin')
  );

insert into public.feature_flags (flag_key, enabled, label, notes)
values (
  'documentation_enabled',
  true,
  'Documentation and Forms',
  'Private forms, checklists, inspections, template versions, submissions, attachments, and audit history.'
)
on conflict (flag_key) do update
set enabled = excluded.enabled,
    label = excluded.label,
    notes = excluded.notes,
    updated_at = now();
