const test = require("node:test");
const assert = require("node:assert/strict");
const financial = require("../scripts/financial-calculations");

test("expense totals support calculated and total-only entries", () => {
  assert.equal(financial.expenseTotal({ subtotal: 100, tax: 8.5 }), 108.5);
  assert.equal(financial.expenseTotal({ subtotal: null, tax: null, total: 42.25 }), 42.25);
});

test("invoice totals include tax, discounts, deposits, and partial payments", () => {
  assert.deepEqual(financial.invoiceSummary({
    subtotal: 1000,
    tax: 80,
    discount: 50,
    deposit: 200,
    amount_paid: 300
  }), {
    subtotal: 1000,
    tax: 80,
    discount: 50,
    deposit: 200,
    amountPaid: 300,
    total: 1030,
    balance: 530
  });
});

test("overdue logic does not overwrite paid or voided invoices", () => {
  const today = new Date("2026-07-23T12:00:00Z");
  assert.equal(financial.effectiveInvoiceStatus({ status: "Sent", due_date: "2026-07-01", subtotal: 100 }, today), "Overdue");
  assert.equal(financial.effectiveInvoiceStatus({ status: "Paid", due_date: "2026-07-01", subtotal: 100 }, today), "Paid");
  assert.equal(financial.effectiveInvoiceStatus({ status: "Voided", due_date: "2026-07-01", subtotal: 100 }, today), "Voided");
});

test("job profitability uses linked actual cost categories", () => {
  assert.deepEqual(financial.jobProfitability({
    quotedRevenue: 2000,
    approvedBudget: 1200,
    laborCost: 400,
    materialCost: 250,
    equipmentCost: 100,
    otherExpenses: 50,
    invoiceTotal: 2100,
    paymentsReceived: 1500
  }), {
    quotedRevenue: 2000,
    approvedBudget: 1200,
    totalActualCost: 800,
    invoiceTotal: 2100,
    paymentsReceived: 1500,
    grossProfit: 1300,
    grossMarginPercent: 61.9,
    remainingBudget: 400
  });
});
