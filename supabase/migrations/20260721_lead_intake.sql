-- Lead Intake extends the existing outreach prospect and shared import staging
-- system. It does not create a second lead table.

alter table public.outreach_prospects
  add column if not exists import_batch_id uuid references public.import_batches(id) on delete set null,
  add column if not exists imported_by text,
  add column if not exists phone_e164 text,
  add column if not exists phone_extension text,
  add column if not exists queue_status text not null default 'Ready to Call',
  add column if not exists call_attempt_count integer not null default 0;

create index if not exists outreach_prospects_import_batch_idx
  on public.outreach_prospects (import_batch_id)
  where import_batch_id is not null;

create index if not exists outreach_prospects_phone_e164_idx
  on public.outreach_prospects (phone_e164)
  where phone_e164 is not null;

create index if not exists import_batches_lead_intake_idx
  on public.import_batches (module, created_at desc)
  where module = 'lead_intake';

create index if not exists import_rows_batch_review_idx
  on public.import_rows (batch_id, status, action_type, row_number);

comment on column public.outreach_prospects.import_batch_id is
  'Lead Intake provenance. Removing a batch must not cascade into live prospects.';
