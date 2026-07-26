-- Separate quote approval from final pre-work authorization.
alter table public.job_tickets
  add column if not exists invoice_sent_to_customer boolean not null default false,
  add column if not exists final_customer_approval_recorded boolean not null default false;

comment on column public.job_tickets.customer_approval_recorded is
  'Customer approved the quote.';
comment on column public.job_tickets.invoice_sent_to_customer is
  'The connected invoice was submitted to the customer for deposit and final authorization.';
comment on column public.job_tickets.final_customer_approval_recorded is
  'Customer gave final authorization after receiving the invoice and before work starts.';
comment on column public.job_tickets.owner_approval_recorded is
  'Owner agreement was recorded after customer authorization and before work starts.';
