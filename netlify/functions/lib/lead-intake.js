const REQUIRED_HEADERS = ["business", "type", "location", "phone_number"];
const OPTIONAL_HEADERS = ["source"];
const MAX_FIELD_LENGTH = 300;

function canonicalHeader(value) {
  return String(value || "").replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function normalizePhone(value) {
  const text = String(value || "").trim();
  const extensionMatch = text.match(/(?:ext\.?|extension|x)\s*([0-9]{1,8})\s*$/i);
  const extension = extensionMatch ? extensionMatch[1] : "";
  const base = extensionMatch ? text.slice(0, extensionMatch.index) : text;
  const digits = base.replace(/\D/g, "");
  const national = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (national.length !== 10) return { valid: false, normalized: "", display: text, extension };
  return {
    valid: true,
    normalized: `+1${national}`,
    display: `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}${extension ? ` ext. ${extension}` : ""}`,
    extension
  };
}

function normalizeBusiness(value) {
  return String(value || "").toLowerCase().trim()
    .replace(/&/g, " and ")
    .replace(/\bproperty\s+mgmt\b/g, "property management")
    .replace(/\bapts?\b/g, "apartments")
    .replace(/\bcompany\b|\bco\.?\b/g, "co")
    .replace(/\bincorporated\b|\binc\.?\b/g, "inc")
    .replace(/\blimited liability company\b/g, "llc")
    .replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeLocation(value) {
  return String(value || "").toLowerCase().trim()
    .replace(/\boregon\b/g, "or").replace(/\bwashington\b/g, "wa")
    .replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function similarity(left, right) {
  if (!left || !right) return 0;
  if (left === right) return 1;
  const a = new Set(left.split(" "));
  const b = new Set(right.split(" "));
  const intersection = [...a].filter((token) => b.has(token)).length;
  return intersection / Math.max(a.size, b.size);
}

function validateHeaders(headers = []) {
  const canonical = headers.map(canonicalHeader);
  const duplicates = canonical.filter((header, index) => header && canonical.indexOf(header) !== index);
  const missing = REQUIRED_HEADERS.filter((header) => !canonical.includes(header));
  const unexpected = canonical.filter((header) => header && ![...REQUIRED_HEADERS, ...OPTIONAL_HEADERS].includes(header));
  return { canonical, missing, duplicates: [...new Set(duplicates)], unexpected, valid: !missing.length && !duplicates.length };
}

function normalizeRecord(source = {}, rowNumber = 0) {
  const business = String(source.business || "").trim().slice(0, MAX_FIELD_LENGTH);
  const type = String(source.type || "").trim().slice(0, MAX_FIELD_LENGTH);
  const location = String(source.location || "").trim().slice(0, MAX_FIELD_LENGTH);
  const phoneNumber = String(source.phone_number || "").trim().slice(0, MAX_FIELD_LENGTH);
  const sourceName = String(source.source || "").trim().slice(0, 120);
  const phone = normalizePhone(phoneNumber);
  const errors = [];
  if (!business) errors.push("Business is required.");
  if (!type) errors.push("Type is required.");
  if (!location) errors.push("Location is required.");
  if (!phoneNumber) errors.push("Phone number is required.");
  else if (!phone.valid) errors.push("Phone number cannot be normalized to a usable US number.");
  return {
    rowNumber,
    original: { business, type, location, phone_number: phoneNumber, source: sourceName },
    normalized: {
      business: normalizeBusiness(business),
      location: normalizeLocation(location),
      phone_number: phone.normalized,
      phone_display: phone.display,
      phone_extension: phone.extension
    },
    errors,
    duplicateStatus: errors.length ? "invalid" : "new_unique",
    match: null,
    reviewAction: errors.length ? "exclude" : "approve"
  };
}

function classifyRecords(records = [], existing = []) {
  const seenPhones = new Map();
  const seenNames = new Map();
  const candidates = [...existing];
  return records.map((record) => {
    if (record.errors.length) return record;
    const phone = record.normalized.phone_number;
    const nameLocation = `${record.normalized.business}|${record.normalized.location}`;
    let match = candidates.find((item) => item.normalizedPhone && item.normalizedPhone === phone);
    let reason = match ? `Exact phone number matches existing ${match.recordType || "record"}.` : "";
    if (!match && seenPhones.has(phone)) {
      match = seenPhones.get(phone);
      reason = "Duplicate phone number within this uploaded file.";
    }
    if (!match && seenNames.has(nameLocation)) {
      match = seenNames.get(nameLocation);
      reason = "Exact business and location within this uploaded file.";
    }
    if (!match) {
      match = candidates.find((item) => item.normalizedBusiness === record.normalized.business && item.normalizedLocation === record.normalized.location);
      if (match) reason = `Exact business and location match existing ${match.recordType || "record"}.`;
    }
    if (match) {
      seenPhones.set(phone, record);
      seenNames.set(nameLocation, record);
      return { ...record, duplicateStatus: "definite_duplicate", reviewAction: "keep_existing", match: { ...match, reason, confidence: "Definite" } };
    }
    const possible = candidates.find((item) => item.normalizedLocation === record.normalized.location && similarity(item.normalizedBusiness, record.normalized.business) >= 0.66);
    seenPhones.set(phone, record);
    seenNames.set(nameLocation, record);
    if (possible) return { ...record, duplicateStatus: "possible_duplicate", reviewAction: "unresolved", match: { ...possible, reason: "Similar business name in the same location.", confidence: "Possible" } };
    return record;
  });
}

function summarize(records = []) {
  const count = (status) => records.filter((row) => row.duplicateStatus === status).length;
  return {
    total: records.length,
    unique: count("new_unique"),
    definiteDuplicates: count("definite_duplicate"),
    possibleDuplicates: count("possible_duplicate"),
    invalid: count("invalid"),
    approved: records.filter((row) => ["approve", "keep_both"].includes(row.reviewAction)).length
  };
}

function canUndoLead({ lead = {}, activity = [] } = {}) {
  const blocked = [];
  if (activity.length) blocked.push("call activity");
  if (String(lead.notes || "").trim()) blocked.push("notes");
  if (lead.last_contacted_at) blocked.push("last-contact date");
  if (lead.next_follow_up_at) blocked.push("follow-up");
  if (lead.converted_to_quote || lead.route_added) blocked.push("downstream workflow activity");
  return { allowed: !blocked.length, blocked };
}

module.exports = { REQUIRED_HEADERS, canonicalHeader, normalizePhone, normalizeBusiness, normalizeLocation, validateHeaders, normalizeRecord, classifyRecords, summarize, canUndoLead };
