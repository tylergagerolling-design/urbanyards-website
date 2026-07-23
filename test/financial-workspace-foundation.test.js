const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const migration = fs.readFileSync(
  path.join(root, "supabase", "migrations", "20260723_financial_workspace.sql"),
  "utf8"
);

test("financial workspace migration is additive and preserves canonical links", () => {
  assert.match(migration, /create table if not exists public\.expenses/i);
  assert.match(migration, /create table if not exists public\.vendors/i);
  assert.match(migration, /alter table public\.invoices/i);
  assert.match(migration, /ticket_id uuid references public\.job_tickets/i);
  assert.match(migration, /client_id uuid references public\.clients/i);
  assert.match(migration, /property_id uuid references public\.properties/i);
  assert.doesNotMatch(migration, /drop table/i);
});

test("financial values use decimals, constraints, unique invoice numbers, and indexes", () => {
  assert.match(migration, /numeric\(14,2\)/i);
  assert.match(migration, /expenses_total_check/i);
  assert.match(migration, /invoices_business_number_uidx/i);
  assert.match(migration, /next_financial_invoice_number/i);
  assert.match(migration, /expenses_business_date_idx/i);
  assert.match(migration, /invoices_due_status_idx/i);
});

test("financial security includes Money roles, restricted field expense access, and private files", () => {
  assert.match(migration, /financial_money_role/i);
  assert.match(migration, /workers submit expenses/i);
  assert.match(migration, /created_by = auth\.uid\(\)/i);
  assert.match(migration, /jt\.assigned_user_id = auth\.uid\(\)/i);
  assert.match(migration, /'financial-documents',[\s\S]*false,/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /admin removes financial documents/i);
});

test("financial overview aggregates without loading complete spreadsheets", () => {
  assert.match(migration, /create or replace function public\.financial_overview/i);
  assert.match(migration, /'revenue'/i);
  assert.match(migration, /'expenses'/i);
  assert.match(migration, /'outstanding'/i);
  assert.match(migration, /'overdue'/i);
  assert.match(migration, /'missing_receipts'/i);
});
