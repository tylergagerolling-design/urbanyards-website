const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const migration = fs.readFileSync(
  path.join(root, "supabase", "migrations", "20260723_financial_workspace.sql"),
  "utf8"
);
const dashboardJs = fs.readFileSync(path.join(root, "dashboard.js"), "utf8");
const dashboardCss = fs.readFileSync(path.join(root, "dashboard.css"), "utf8");
const authJs = fs.readFileSync(path.join(root, "netlify", "functions", "lib", "dashboard-auth.js"), "utf8");
const financialApiJs = fs.readFileSync(path.join(root, "netlify", "functions", "dashboard-financial.js"), "utf8");
const financialStorageJs = fs.readFileSync(path.join(root, "netlify", "functions", "dashboard-financial-storage.js"), "utf8");
const { expensePath } = require("../netlify/functions/dashboard-financial")._internals;
const storage = require("../netlify/functions/dashboard-financial-storage")._internals;

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

test("Money exposes lazy submodules and a controlled editable expense grid", () => {
  for (const label of ["Overview", "Expenses", "Invoicing", "Vendors", "Documents", "Reports"]) {
    assert.match(dashboardJs, new RegExp(`label: "${label}"`));
  }
  assert.match(dashboardJs, /data-expense-grid/);
  assert.match(dashboardJs, /data-expense-field/);
  assert.match(dashboardJs, /pasteExpenseRows/);
  assert.match(dashboardJs, /moneyExpensePageSize: 50/);
  assert.match(dashboardCss, /\.money-grid th[\s\S]*position: sticky/);
  assert.match(dashboardCss, /\.money-grid-shell[\s\S]*overflow: auto/);
});

test("financial list endpoint enforces pagination, safe sorting, status, and search", () => {
  const pathValue = expensePath({
    page: 3,
    pageSize: 999,
    sort: "total.desc",
    status: "Recorded",
    search: "fuel,test"
  });
  assert.match(pathValue, /^expenses\?/);
  assert.match(pathValue, /limit=100/);
  assert.match(pathValue, /offset=200/);
  assert.match(pathValue, /order=total.desc/);
  assert.match(pathValue, /status=eq.Recorded/);
  assert.doesNotMatch(pathValue, /fuel%2Ctest/);
});

test("Money permissions and private receipt upload are server enforced", () => {
  assert.match(authJs, /money:read/);
  assert.match(authJs, /money:write/);
  assert.match(authJs, /expense_attachments/);
  const upload = storage.validateUpload({
    fileName: "receipt.pdf",
    mimeType: "application/pdf",
    contentBase64: Buffer.from("%PDF sample").toString("base64")
  });
  assert.equal(upload.ext, "pdf");
  assert.equal(storage.safePath("financial-documents/default/expenses/abc/file.pdf"), "financial-documents/default/expenses/abc/file.pdf");
  assert.throws(() => storage.safePath("../secret.txt"), /Invalid financial document path/);
});

test("field expense submission and receipt upload are scoped by server-side ownership", () => {
  assert.match(financialApiJs, /requestedAction === "submit-expense"[\s\S]*operations:write/);
  assert.match(financialApiJs, /assigned_user_id !== actor\.userId/);
  assert.match(financialStorageJs, /expense\.created_by !== actor\.userId && !assigned/);
  assert.match(dashboardJs, /data-action="submit-field-expense"/);
  assert.match(dashboardJs, /data-field-expense-receipt-input/);
});
