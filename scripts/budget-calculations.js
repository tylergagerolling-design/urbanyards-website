(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.UrbanYardsBudgetCalculations = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const MONEY_DECIMALS = 2;

  function toNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function roundMoney(value) {
    const number = toNumber(value);
    return Math.round((number + Number.EPSILON) * 100) / 100;
  }

  function sum(values) {
    return roundMoney((values || []).reduce((total, value) => total + toNumber(value), 0));
  }

  function percentToRatio(value) {
    const number = toNumber(value);
    return number > 1 ? number / 100 : number;
  }

  function marginPercent(profit, revenue) {
    const safeRevenue = toNumber(revenue);
    if (!safeRevenue) return 0;
    return roundMoney((toNumber(profit) / safeRevenue) * 100);
  }

  function trueHourlyCost(row = {}) {
    const wage = toNumber(row.hourlyWage ?? row.hourly_wage);
    const payroll = percentToRatio(row.payrollBurdenPercent ?? row.payroll_burden_percent);
    const workersComp = percentToRatio(row.workersCompPercent ?? row.workers_comp_percent);
    const otherBurden = toNumber(row.otherLaborBurden ?? row.other_labor_burden);
    return roundMoney(wage + wage * payroll + wage * workersComp + otherBurden);
  }

  function laborEstimatedCost(row = {}) {
    const explicit = row.estimatedCost ?? row.estimated_cost;
    if (explicit !== undefined && explicit !== null && explicit !== "") return roundMoney(explicit);
    return roundMoney(toNumber(row.estimatedHours ?? row.estimated_hours) * trueHourlyCost(row));
  }

  function laborActualCost(row = {}) {
    const explicit = row.actualCost ?? row.actual_cost;
    const actualHours = toNumber(row.actualHours ?? row.actual_hours);
    if (explicit !== undefined && explicit !== null && explicit !== "" && toNumber(explicit) > 0) return roundMoney(explicit);
    if (!actualHours && explicit !== undefined && explicit !== null && explicit !== "") return roundMoney(explicit);
    return roundMoney(actualHours * trueHourlyCost(row));
  }

  function materialEstimatedCost(row = {}) {
    const explicit = row.estimatedCost ?? row.estimated_cost;
    const extras = toNumber(row.tax) + toNumber(row.deliveryFee ?? row.delivery_fee);
    if (explicit !== undefined && explicit !== null && explicit !== "") return roundMoney(toNumber(explicit) + extras);
    const base = toNumber(row.quantity) * toNumber(row.unitCost ?? row.unit_cost);
    return roundMoney(base + extras);
  }

  function materialActualCost(row = {}) {
    const explicit = row.actualCost ?? row.actual_cost;
    if (explicit !== undefined && explicit !== null && explicit !== "" && toNumber(explicit) > 0) return roundMoney(explicit);
    const base = toNumber(row.actualQuantity ?? row.actual_quantity) * toNumber(row.actualUnitCost ?? row.actual_unit_cost);
    const extras = toNumber(row.tax) + toNumber(row.deliveryFee ?? row.delivery_fee);
    if (base) return roundMoney(base + extras);
    if (explicit !== undefined && explicit !== null && explicit !== "") return roundMoney(explicit);
    return 0;
  }

  function expectedRevenue(budget = {}, changeOrders = []) {
    const base = toNumber(budget.baseQuotedPrice ?? budget.base_quoted_price);
    const addOns = toNumber(budget.approvedAddons ?? budget.approved_addons);
    const discounts = toNumber(budget.discounts);
    const taxes = toNumber(budget.taxes);
    const other = toNumber(budget.otherRevenue ?? budget.other_revenue);
    const approvedChangeRevenue = sum((changeOrders || [])
      .filter((item) => String((item.approvalStatus ?? item.approval_status) || "").toLowerCase() === "approved")
      .map((item) => item.additionalRevenue ?? item.additional_revenue));
    return roundMoney(base + addOns + other + approvedChangeRevenue - discounts + taxes);
  }

  function summarizedCosts(bundle = {}) {
    const labor = bundle.labor || [];
    const materials = bundle.materials || [];
    const equipment = bundle.equipment || [];
    const costs = bundle.costs || [];
    const changeOrders = bundle.changeOrders || [];
    const estimatedLabor = sum(labor.map(laborEstimatedCost));
    const actualLabor = sum(labor.map(laborActualCost));
    const estimatedMaterials = sum(materials.map(materialEstimatedCost));
    const actualMaterials = sum(materials.map(materialActualCost));
    const estimatedEquipment = sum(equipment.map((item) => item.estimatedCost ?? item.estimated_cost));
    const actualEquipment = sum(equipment.map((item) => item.actualCost ?? item.actual_cost));
    const estimatedOther = sum(costs.map((item) => item.estimatedCost ?? item.estimated_cost));
    const actualOther = sum(costs.map((item) => item.actualCost ?? item.actual_cost));
    const estimatedChangeCosts = sum(changeOrders
      .filter((item) => String((item.approvalStatus ?? item.approval_status) || "").toLowerCase() === "approved")
      .map((item) => sum([item.additionalLabor ?? item.additional_labor, item.additionalMaterials ?? item.additional_materials, item.additionalCosts ?? item.additional_costs])));
    return {
      estimatedLabor,
      actualLabor,
      estimatedMaterials,
      actualMaterials,
      estimatedEquipment,
      actualEquipment,
      estimatedOther,
      actualOther,
      estimatedChangeCosts,
      totalEstimatedCost: roundMoney(estimatedLabor + estimatedMaterials + estimatedEquipment + estimatedOther + estimatedChangeCosts),
      totalActualCost: roundMoney(actualLabor + actualMaterials + actualEquipment + actualOther)
    };
  }

  function maximumLaborHoursRemaining({ expectedRevenue: revenue, targetMarginPercent, nonLaborCosts, trueHourlyCost: hourlyCost } = {}) {
    const hourly = toNumber(hourlyCost);
    if (!hourly) return 0;
    const targetCostAllowance = toNumber(revenue) * (1 - percentToRatio(targetMarginPercent));
    return Math.max(0, roundMoney((targetCostAllowance - toNumber(nonLaborCosts)) / hourly));
  }

  function recommendedPrice(totalEstimatedCost, targetMarginPercent) {
    const margin = percentToRatio(targetMarginPercent);
    if (margin >= 1) return roundMoney(totalEstimatedCost);
    return roundMoney(toNumber(totalEstimatedCost) / (1 - margin));
  }

  function budgetHealth({ estimatedMargin, actualMargin, targetMargin, warningMargin, minimumMargin, actualCost, approvedCost, completed } = {}) {
    const margin = actualMargin || estimatedMargin || 0;
    if (completed) return "Completed";
    if (toNumber(actualCost) > 0 && toNumber(approvedCost) > 0 && toNumber(actualCost) > toNumber(approvedCost)) return "Over Budget";
    if (margin < toNumber(minimumMargin)) return "Over Budget";
    if (margin < toNumber(warningMargin)) return "At Risk";
    if (margin < toNumber(targetMargin)) return "Watch";
    return "Healthy";
  }

  function summarizeBudget({ budget = {}, labor = [], materials = [], equipment = [], costs = [], changeOrders = [], settings = {} } = {}) {
    const costSummary = summarizedCosts({ labor, materials, equipment, costs, changeOrders });
    const revenue = expectedRevenue(budget, changeOrders);
    const finalRevenue = roundMoney(toNumber(budget.finalInvoicedRevenue ?? budget.final_invoiced_revenue) || revenue);
    const estimatedProfit = roundMoney(revenue - costSummary.totalEstimatedCost);
    const actualProfit = roundMoney(finalRevenue - costSummary.totalActualCost);
    const targetMargin = toNumber(budget.targetMarginPercent ?? budget.target_margin_percent ?? settings.defaultTargetMargin ?? settings.default_target_margin ?? 35);
    const warningMargin = toNumber(settings.warningMargin ?? settings.warning_margin ?? 25);
    const minimumMargin = toNumber(settings.minimumMargin ?? settings.minimum_margin ?? 15);
    const nonLaborCosts = roundMoney(costSummary.totalEstimatedCost - costSummary.estimatedLabor);
    const averageTrueHourly = labor.length ? roundMoney(sum(labor.map(trueHourlyCost)) / labor.length) : toNumber(settings.ownerHourlyRate ?? settings.owner_hourly_rate ?? 55);
    const estimatedMargin = marginPercent(estimatedProfit, revenue);
    const actualMargin = marginPercent(actualProfit, finalRevenue);
    return {
      ...costSummary,
      expectedRevenue: revenue,
      finalRevenue,
      amountPaid: roundMoney(budget.amountPaid ?? budget.amount_paid),
      outstandingBalance: roundMoney(finalRevenue - toNumber(budget.amountPaid ?? budget.amount_paid)),
      estimatedProfit,
      estimatedMargin,
      actualProfit,
      actualMargin,
      breakEvenPrice: costSummary.totalEstimatedCost,
      recommendedPrice: recommendedPrice(costSummary.totalEstimatedCost, targetMargin),
      targetSellingPrice: recommendedPrice(costSummary.totalEstimatedCost, targetMargin),
      remainingBudget: roundMoney(costSummary.totalEstimatedCost - costSummary.totalActualCost),
      remainingLaborAllowance: maximumLaborHoursRemaining({
        expectedRevenue: revenue,
        targetMarginPercent: targetMargin,
        nonLaborCosts,
        trueHourlyCost: averageTrueHourly
      }),
      costVariance: roundMoney(costSummary.totalActualCost - costSummary.totalEstimatedCost),
      revenueVariance: roundMoney(finalRevenue - revenue),
      profitVariance: roundMoney(actualProfit - estimatedProfit),
      health: budgetHealth({
        estimatedMargin,
        actualMargin,
        targetMargin,
        warningMargin,
        minimumMargin,
        actualCost: costSummary.totalActualCost,
        approvedCost: costSummary.totalEstimatedCost,
        completed: String(budget.status || "").toLowerCase() === "completed"
      })
    };
  }

  function varianceRows(summary = {}) {
    const rows = [
      ["Labor", summary.estimatedLabor, summary.actualLabor, "cost"],
      ["Materials", summary.estimatedMaterials, summary.actualMaterials, "cost"],
      ["Equipment", summary.estimatedEquipment, summary.actualEquipment, "cost"],
      ["Other Costs", summary.estimatedOther, summary.actualOther, "cost"],
      ["Total Cost", summary.totalEstimatedCost, summary.totalActualCost, "cost"],
      ["Revenue", summary.expectedRevenue, summary.finalRevenue, "revenue"],
      ["Profit", summary.estimatedProfit, summary.actualProfit, "revenue"]
    ];
    return rows.map(([label, estimated, actual, mode]) => {
      const difference = roundMoney(toNumber(actual) - toNumber(estimated));
      const percent = toNumber(estimated) ? roundMoney((difference / toNumber(estimated)) * 100) : 0;
      const favorable = mode === "cost" ? difference <= 0 : difference >= 0;
      return { label, estimated: roundMoney(estimated), actual: roundMoney(actual), difference, percent, favorable };
    });
  }

  return {
    MONEY_DECIMALS,
    toNumber,
    roundMoney,
    sum,
    percentToRatio,
    marginPercent,
    trueHourlyCost,
    laborEstimatedCost,
    laborActualCost,
    materialEstimatedCost,
    materialActualCost,
    expectedRevenue,
    summarizedCosts,
    maximumLaborHoursRemaining,
    recommendedPrice,
    budgetHealth,
    summarizeBudget,
    varianceRows
  };
});
