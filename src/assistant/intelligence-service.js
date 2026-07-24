"use strict";

const { normalize } = require("./record-resolver");

const VALUE_FIELDS = ["clientId", "customerId", "propertyId", "ticketId", "jobId", "invoiceId", "leadId"];

function clean(value) {
  return String(value ?? "").trim();
}

function dateValue(value) {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : null;
}

function recordLabel(record = {}) {
  return clean(record.number || record.title || record.name || record.property || record.site || record.vendor || record.id || "Record");
}

function sameReference(left = {}, right = {}) {
  if (left === right) return true;
  const ids = new Set(VALUE_FIELDS.flatMap((field) => [clean(left[field]), clean(right[field])]).filter(Boolean));
  if (ids.size && [...ids].some((id) => clean(left.id) === id || clean(right.id) === id)) return true;
  const leftNames = [left.client, left.customer, left.property, left.company, left.name].map(normalize).filter(Boolean);
  const rightNames = [right.client, right.customer, right.property, right.company, right.name].map(normalize).filter(Boolean);
  return leftNames.some((name) => name.length > 3 && rightNames.includes(name));
}

function relatedRecords({ snapshot, recordType, record, limit = 20 }) {
  const families = {
    tickets: "ticket", clients: "client", leads: "lead", jobs: "job", properties: "property",
    invoices: "invoice", expenses: "expense", documents: "document"
  };
  return Object.entries(families).flatMap(([family, type]) =>
    (snapshot[family] || [])
      .filter((candidate) => !(type === recordType && clean(candidate.id) === clean(record.id)))
      .filter((candidate) => sameReference(record, candidate))
      .map((candidate) => ({
        recordType: type,
        recordId: clean(candidate.id),
        displayId: clean(candidate.number),
        title: recordLabel(candidate),
        relationship: candidate.ticketId && clean(candidate.ticketId) === clean(record.id) ? "linked_ticket" : "shared_client_or_property"
      }))
  ).slice(0, limit);
}

function relationshipMap({ snapshot, recordType, record }) {
  if (!record) return { summary: "No record was selected for relationship mapping.", records: [], citations: [], partial: true };
  const related = relatedRecords({ snapshot, recordType, record });
  return {
    summary: `${recordLabel(record)} has ${related.length} related record${related.length === 1 ? "" : "s"} in the permitted dashboard context.`,
    records: related,
    citations: related,
    calculation: {
      relationshipCount: related.length,
      recordTypes: [...new Set(related.map((item) => item.recordType))]
    },
    partial: false
  };
}

function ticketRequirements(ticket = {}) {
  const requirements = [
    ["property", ticket.propertyId || ticket.property, "Property"],
    ["scope", ticket.scopeOfWork || ticket.description || ticket.service, "Scope of work"],
    ["schedule", ticket.scheduledDate || ticket.date, "Scheduled date"],
    ["assignment", ticket.assignedUserId || ticket.assignee || ticket.assignedTo, "Assigned worker"],
    ["arrival_proof", ticket.arrivalPhotosComplete || ticket.arrivalPhotosNa || ticket.arrivalPhotos?.length || ticket.beforePhotosUploaded, "Arrival photos or N/A"],
    ["completion_proof", ticket.completionPhotosComplete || ticket.completionPhotosNa || ticket.completionPhotos?.length || ticket.afterPhotosUploaded, "Completion photos or N/A"],
    ["forms", ticket.formsComplete || ticket.formsNa || ticket.requiredFormsComplete, "Required forms or N/A"],
    ["actual_costs", ticket.actualCostsComplete || ticket.actualCostsNa || Number(ticket.actualTotalCost) > 0, "Actual costs or N/A"],
    ["invoice", ticket.invoiceFinalized || ticket.invoiceNa || ticket.rentDeduction, "Final invoice or N/A"],
    ["payment", ticket.paymentComplete || ticket.paymentNa || ticket.rentDeduction || normalize(ticket.paymentStatus) === "paid", "Payment or N/A"]
  ];
  return requirements.map(([key, complete, label]) => ({ key, label, complete: Boolean(complete) }));
}

function assessTicketReadiness({ ticket }) {
  if (!ticket) return { summary: "No ticket was selected for a readiness review.", records: [], citations: [], partial: true };
  const requirements = ticketRequirements(ticket);
  const missing = requirements.filter((item) => !item.complete).map((item) => item.label);
  const blockers = [...new Set([...(Array.isArray(ticket.blockers) ? ticket.blockers : []), ...missing])];
  const confidence = requirements.length ? (requirements.length - missing.length) / requirements.length : 0;
  return {
    summary: missing.length
      ? `${recordLabel(ticket)} is ${Math.round(confidence * 100)}% ready and has ${missing.length} missing requirement${missing.length === 1 ? "" : "s"}.`
      : `${recordLabel(ticket)} has every tracked completion requirement satisfied.`,
    records: [{ id: ticket.id, number: ticket.number, title: ticket.title, stage: ticket.stage, missingRequirements: missing, blockers }],
    citations: [{ recordType: "ticket", recordId: ticket.id, displayId: ticket.number, title: recordLabel(ticket), route: "#tickets" }],
    calculation: { completionPercent: Math.round(confidence * 100), completedRequirements: requirements.length - missing.length, totalRequirements: requirements.length },
    evidence: requirements,
    missingInformation: missing,
    confidence,
    partial: missing.length > 0
  };
}

function scheduleInsights({ snapshot, limit = 20 }) {
  const scheduled = [...(snapshot.jobs || []), ...(snapshot.tickets || [])]
    .map((item) => ({ ...item, startsAt: dateValue(item.startAt || item.scheduledDate || item.date), endsAt: dateValue(item.endAt) }))
    .filter((item) => item.startsAt)
    .sort((a, b) => a.startsAt - b.startsAt);
  const conflicts = [];
  for (let index = 0; index < scheduled.length - 1; index += 1) {
    const current = scheduled[index];
    const next = scheduled[index + 1];
    const sameWorker = clean(current.assignedUserId || current.assignee) && clean(current.assignedUserId || current.assignee) === clean(next.assignedUserId || next.assignee);
    const currentEnd = current.endsAt || current.startsAt + Number(current.durationMinutes || 120) * 60000;
    if (sameWorker && next.startsAt < currentEnd) conflicts.push({ first: recordLabel(current), second: recordLabel(next), reason: "Assigned worker time overlap" });
  }
  const missing = scheduled.filter((item) => !item.assignedUserId && !item.assignee).map(recordLabel);
  return {
    summary: `${scheduled.length} scheduled item${scheduled.length === 1 ? "" : "s"}, ${conflicts.length} time conflict${conflicts.length === 1 ? "" : "s"}, and ${missing.length} missing assignment${missing.length === 1 ? "" : "s"}.`,
    records: scheduled.slice(0, limit).map((item) => ({ id: item.id, number: item.number, title: recordLabel(item), date: item.startAt || item.scheduledDate || item.date, assignedTo: item.assignee || item.assignedUserId || "", property: item.property || item.site || "" })),
    citations: scheduled.slice(0, limit).map((item) => ({ recordType: "job", recordId: item.id, displayId: item.number, title: recordLabel(item), route: "#calendar" })),
    calculation: { scheduledCount: scheduled.length, conflictCount: conflicts.length, missingAssignmentCount: missing.length },
    conflicts,
    missingInformation: missing.map((label) => `${label}: assigned worker`),
    safetyNotice: "Travel-time and weather conclusions require live route and forecast data; neither is inferred here.",
    partial: missing.length > 0
  };
}

function documentInsights({ snapshot, record }) {
  const documents = (snapshot.documents || []).filter((item) => !record || sameReference(record, item));
  const incomplete = documents.filter((item) => {
    const status = normalize(item.status);
    return !["complete", "completed", "approved", "signed", "final"].includes(status) || !item.fileName && !item.url && !item.storagePath;
  });
  return {
    summary: `${documents.length} related document${documents.length === 1 ? "" : "s"}; ${incomplete.length} need review or a file.`,
    records: documents.slice(0, 20).map((item) => ({ id: item.id, title: recordLabel(item), status: item.status, type: item.type || item.category, date: item.date || item.createdAt })),
    citations: documents.slice(0, 20).map((item) => ({ recordType: "document", recordId: item.id, title: recordLabel(item), route: "#documentation" })),
    missingInformation: incomplete.map((item) => `${recordLabel(item)}: final status or attached file`),
    extractionCapability: "Groundskeeper can reason over stored document metadata and extracted text supplied by the dashboard; it does not invent unread file contents.",
    partial: incomplete.length > 0
  };
}

function completedWorkLearning({ snapshot }) {
  const completed = (snapshot.tickets || []).filter((ticket) => ["closed", "completed"].includes(normalize(ticket.stage || ticket.status)));
  const comparable = completed.filter((ticket) => Number(ticket.estimatedTotalCost) > 0 && Number(ticket.actualTotalCost) > 0);
  const rows = comparable.map((ticket) => {
    const estimate = Number(ticket.estimatedTotalCost);
    const actual = Number(ticket.actualTotalCost);
    return { id: ticket.id, number: ticket.number, title: recordLabel(ticket), estimatedTotalCost: estimate, actualTotalCost: actual, variance: actual - estimate, variancePercent: Math.round(((actual - estimate) / estimate) * 1000) / 10 };
  });
  const estimated = rows.reduce((sum, row) => sum + row.estimatedTotalCost, 0);
  const actual = rows.reduce((sum, row) => sum + row.actualTotalCost, 0);
  return {
    summary: rows.length ? `${rows.length} completed jobs have comparable estimates and actuals; aggregate cost variance is ${(actual - estimated).toFixed(2)}.` : "No completed jobs currently have both estimated and actual costs.",
    records: rows.slice(0, 20),
    citations: rows.slice(0, 20).map((row) => ({ recordType: "ticket", recordId: row.id, displayId: row.number, title: row.title, route: "#tickets" })),
    calculation: { comparableJobs: rows.length, estimatedTotal: estimated, actualTotal: actual, variance: actual - estimated },
    recommendation: rows.length ? "Use the observed variance as evidence when reviewing similar future estimates; do not alter pricing automatically." : "Record actual labor and material costs at closeout to improve future estimates.",
    partial: completed.length !== comparable.length
  };
}

function leadInsights({ snapshot, limit = 20 }) {
  const now = Date.now();
  const leads = (snapshot.leads || []).filter((lead) => !["won", "lost", "archived", "deleted"].includes(normalize(lead.status)));
  const ranked = leads.map((lead) => {
    const lastTouch = dateValue(lead.lastContactAt || lead.lastContact || lead.updatedAt);
    const nextTouch = dateValue(lead.nextFollowUpAt || lead.followUpDate || lead.followUp);
    const daysSilent = lastTouch ? Math.max(0, Math.floor((now - lastTouch) / 86400000)) : null;
    const overdue = nextTouch ? nextTouch < now : false;
    const score = (overdue ? 50 : 0) + (daysSilent == null ? 25 : Math.min(daysSilent, 30)) + (lead.phone || lead.email ? 0 : 20);
    const nextAction = !lead.phone && !lead.email ? "Add a phone number or email" : overdue ? "Complete the overdue follow-up" : daysSilent == null ? "Record the first outreach" : "Continue the next scheduled touch";
    return { id: lead.id, title: recordLabel(lead), status: lead.status, daysSilent, overdue, score, nextAction };
  }).sort((a, b) => b.score - a.score).slice(0, limit);
  return {
    summary: `${leads.length} active lead${leads.length === 1 ? "" : "s"}; ${ranked.filter((lead) => lead.overdue).length} overdue follow-up${ranked.filter((lead) => lead.overdue).length === 1 ? "" : "s"}.`,
    records: ranked,
    citations: ranked.map((lead) => ({ recordType: "lead", recordId: lead.id, title: lead.title, route: "#call-queue" })),
    recommendation: ranked[0] ? `Start with ${ranked[0].title}: ${ranked[0].nextAction}.` : "No active leads need a recommended next action.",
    confidence: ranked.length ? 0.85 : 1,
    partial: false
  };
}

function proactiveRisks({ snapshot }) {
  const ticketRisks = (snapshot.tickets || []).filter((ticket) => (ticket.blockers || []).length || ["paused", "needs owner approval"].includes(normalize(ticket.stage)));
  const unpaid = (snapshot.invoices || []).filter((invoice) => !["paid", "void"].includes(normalize(invoice.status)) && Number(invoice.balance ?? invoice.total ?? 0) > 0);
  const incompleteDocuments = (snapshot.documents || []).filter((document) => !["complete", "approved", "signed", "final"].includes(normalize(document.status)));
  return {
    summary: `${ticketRisks.length} blocked ticket${ticketRisks.length === 1 ? "" : "s"}, ${unpaid.length} unpaid invoice${unpaid.length === 1 ? "" : "s"}, and ${incompleteDocuments.length} document${incompleteDocuments.length === 1 ? "" : "s"} needing review.`,
    records: [
      ...ticketRisks.slice(0, 8).map((item) => ({ id: item.id, title: recordLabel(item), type: "ticket", nextAction: item.nextAction || (item.blockers || []).join(", ") })),
      ...unpaid.slice(0, 8).map((item) => ({ id: item.id, title: recordLabel(item), type: "invoice", nextAction: "Review payment status" })),
      ...incompleteDocuments.slice(0, 8).map((item) => ({ id: item.id, title: recordLabel(item), type: "document", nextAction: "Review completeness" }))
    ],
    calculation: { blockedTickets: ticketRisks.length, unpaidInvoices: unpaid.length, documentsNeedingReview: incompleteDocuments.length },
    partial: false
  };
}

module.exports = {
  assessTicketReadiness,
  completedWorkLearning,
  documentInsights,
  leadInsights,
  proactiveRisks,
  relationshipMap,
  relatedRecords,
  scheduleInsights,
  ticketRequirements
};
