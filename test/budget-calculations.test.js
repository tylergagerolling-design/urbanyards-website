const assert = require("node:assert/strict");
const test = require("node:test");
const budget = require("../scripts/budget-calculations.js");

test("calculates expected revenue with discounts, taxes, add-ons, and approved change orders", () => {
  const revenue = budget.expectedRevenue({
    base_quoted_price: 1200,
    approved_addons: 150,
    discounts: 50,
    taxes: 25,
    other_revenue: 75
  }, [
    { approval_status: "Approved", additional_revenue: 200 },
    { approval_status: "Draft", additional_revenue: 900 }
  ]);

  assert.equal(revenue, 1600);
});

test("calculates true labor burden and estimated labor cost", () => {
  const row = {
    estimated_hours: 4,
    hourly_wage: 30,
    payroll_burden_percent: 10,
    workers_comp_percent: 5,
    other_labor_burden: 3
  };

  assert.equal(budget.trueHourlyCost(row), 37.5);
  assert.equal(budget.laborEstimatedCost(row), 150);
});

test("summarizes profit, margin, recommended price, and remaining labor allowance", () => {
  const summary = budget.summarizeBudget({
    budget: {
      base_quoted_price: 2000,
      target_margin_percent: 35,
      final_invoiced_revenue: 2100,
      amount_paid: 500
    },
    labor: [
      { estimated_hours: 8, hourly_wage: 35, payroll_burden_percent: 12, workers_comp_percent: 4, other_labor_burden: 2, actual_hours: 7 }
    ],
    materials: [
      { quantity: 10, unit_cost: 12, tax: 8, delivery_fee: 20, actual_quantity: 10, actual_unit_cost: 13 }
    ],
    equipment: [
      { estimated_cost: 90, actual_cost: 75 }
    ],
    costs: [
      { estimated_cost: 55, actual_cost: 65 }
    ],
    settings: {
      default_target_margin: 35,
      warning_margin: 25,
      minimum_margin: 15
    }
  });

  assert.equal(summary.expectedRevenue, 2000);
  assert.equal(summary.finalRevenue, 2100);
  assert.equal(summary.totalEstimatedCost, 633.8);
  assert.equal(summary.estimatedProfit, 1366.2);
  assert.equal(summary.estimatedMargin, 68.31);
  assert.equal(summary.actualProfit, 1503.8);
  assert.equal(summary.actualMargin, 71.61);
  assert.equal(summary.outstandingBalance, 1600);
  assert.equal(summary.breakEvenPrice, 633.8);
  assert.equal(summary.recommendedPrice, 975.08);
  assert.equal(summary.health, "Healthy");
  assert.ok(summary.remainingLaborAllowance > 0);
});

test("handles zero revenue without invalid margin values", () => {
  const summary = budget.summarizeBudget({
    budget: {},
    labor: [{ estimated_hours: 2, hourly_wage: 20 }]
  });

  assert.equal(summary.expectedRevenue, 0);
  assert.equal(summary.estimatedMargin, 0);
  assert.equal(summary.actualMargin, 0);
  assert.equal(Number.isFinite(summary.estimatedProfit), true);
});

test("marks unfavorable and favorable variance correctly", () => {
  const rows = budget.varianceRows({
    estimatedLabor: 100,
    actualLabor: 80,
    totalEstimatedCost: 100,
    totalActualCost: 140,
    expectedRevenue: 500,
    finalRevenue: 450,
    estimatedProfit: 400,
    actualProfit: 310
  });

  const labor = rows.find((row) => row.label === "Labor");
  const cost = rows.find((row) => row.label === "Total Cost");
  const revenue = rows.find((row) => row.label === "Revenue");

  assert.equal(labor.favorable, true);
  assert.equal(cost.favorable, false);
  assert.equal(revenue.favorable, false);
});
