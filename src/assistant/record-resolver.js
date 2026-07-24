"use strict";

function normalize(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function recordText(record = {}) {
  return normalize([
    record.id, record.number, record.title, record.name, record.client,
    record.customer, record.property, record.company, record.site,
    record.vendor, record.description
  ].filter(Boolean).join(" "));
}

function flattenSnapshot(snapshot = {}) {
  const groups = [
    ["ticket", snapshot.tickets],
    ["lead", snapshot.leads],
    ["job", snapshot.jobs],
    ["property", snapshot.properties],
    ["invoice", snapshot.invoices],
    ["expense", snapshot.expenses],
    ["document", snapshot.documents]
  ];
  return groups.flatMap(([recordType, rows]) => (Array.isArray(rows) ? rows : []).map((record) => ({ recordType, record })));
}

function resolveRecord({ message, snapshot, pageContext, recentEntities = [] }) {
  const all = flattenSnapshot(snapshot);
  const selectedId = String(pageContext?.selectedRecordId || "");
  if (selectedId && /\b(this|that|it|selected|current)\b/i.test(message)) {
    const selected = all.find((item) => String(item.record.id) === selectedId);
    if (selected) return resolved(selected, 1, "selected_record");
  }
  if (/\b(this|that|it|one we discussed)\b/i.test(message) && recentEntities[0]) {
    const recent = all.find((item) => String(item.record.id) === String(recentEntities[0].recordId));
    if (recent) return resolved(recent, .94, "conversation_context");
  }
  const query = normalize(message);
  const identifiers = query.match(/\b(?:job|inv|est|ticket)[ -]?[a-z0-9]+\b/g) || [];
  const exact = all.find((item) => identifiers.some((id) => recordText(item.record).includes(normalize(id))));
  if (exact) return resolved(exact, .99, "exact_identifier");
  const ignored = new Set(["find", "show", "open", "summarize", "this", "that", "ticket", "job", "lead", "invoice", "property", "client", "please"]);
  const tokens = query.split(" ").filter((word) => word.length > 2 && !ignored.has(word));
  const ranked = all.map((item) => ({
    item,
    score: tokens.filter((token) => recordText(item.record).includes(token)).length
  })).filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score);
  if (!ranked.length) return null;
  const top = ranked[0];
  const alternatives = ranked.filter((entry) => entry.score === top.score).slice(1, 4).map((entry) => reference(entry.item));
  return { ...resolved(top.item, Math.min(.55 + (top.score * .12), .9), "fuzzy_name"), alternatives };
}

function reference(item) {
  const record = item.record;
  return {
    recordType: item.recordType,
    recordId: String(record.id || ""),
    displayName: String(record.number || record.title || record.name || record.property || record.site || "Record")
  };
}

function resolved(item, confidence, matchedBy) {
  return { ...reference(item), confidence, matchedBy, record: item.record, alternatives: [] };
}

module.exports = { flattenSnapshot, normalize, resolveRecord };
