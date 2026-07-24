(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.UrbanYardsFinancial = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  "use strict";

  function amount(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.round(number * 100) / 100 : 0;
  }

  function expenseTotal({ subtotal, tax, total } = {}) {
    if ((subtotal === null || subtotal === undefined || subtotal === "") && total !== null && total !== undefined && total !== "") {
      return amount(total);
    }
    return amount(amount(subtotal) + amount(tax));
  }

  function lineTotal(line = {}) {
    const base = amount(line.quantity) * amount(line.unitPrice ?? line.unit_price);
    return amount(line.type === "Discount" || line.itemType === "Discount" || line.item_type === "Discount" ? -Math.abs(base) : base);
  }

  function invoiceSummary(invoice = {}, lines = []) {
    const lineSubtotal = lines.length ? lines.reduce((sum, line) => sum + lineTotal(line), 0) : amount(invoice.subtotal);
    const subtotal = amount(lineSubtotal);
    const tax = amount(invoice.tax);
    const discount = amount(invoice.discount);
    const deposit = amount(invoice.deposit);
    const amountPaid = amount(invoice.amountPaid ?? invoice.amount_paid);
    const total = amount(subtotal + tax - discount);
    const balance = Math.max(0, amount(total - deposit - amountPaid));
    return { subtotal, tax, discount, deposit, amountPaid, total, balance };
  }

  function effectiveInvoiceStatus(invoice = {}, today = new Date()) {
    const status = String(invoice.status || "Draft");
    if (["Paid", "Voided", "Uncollectible"].includes(status)) return status;
    const summary = invoiceSummary(invoice);
    const dueDate = invoice.dueDate ?? invoice.due_date;
    if (dueDate && String(dueDate).slice(0, 10) < today.toISOString().slice(0, 10) && summary.balance > 0) return "Overdue";
    if (summary.total > 0 && summary.balance <= 0) return "Paid";
    if (summary.amountPaid > 0 || summary.deposit > 0) return "Partially Paid";
    return status;
  }

  function jobProfitability({ quotedRevenue, approvedBudget, laborCost, materialCost, equipmentCost, otherExpenses, invoiceTotal, paymentsReceived } = {}) {
    const totalActualCost = amount(amount(laborCost) + amount(materialCost) + amount(equipmentCost) + amount(otherExpenses));
    const revenue = amount(invoiceTotal || quotedRevenue);
    const grossProfit = amount(revenue - totalActualCost);
    const grossMarginPercent = revenue ? amount((grossProfit / revenue) * 100) : 0;
    return {
      quotedRevenue: amount(quotedRevenue),
      approvedBudget: amount(approvedBudget),
      totalActualCost,
      invoiceTotal: amount(invoiceTotal),
      paymentsReceived: amount(paymentsReceived),
      grossProfit,
      grossMarginPercent,
      remainingBudget: amount(amount(approvedBudget) - totalActualCost)
    };
  }

  return { amount, expenseTotal, lineTotal, invoiceSummary, effectiveInvoiceStatus, jobProfitability };
});
