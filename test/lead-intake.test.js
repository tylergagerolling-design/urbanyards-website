const test = require("node:test");
const assert = require("node:assert/strict");
const {
  validateHeaders,
  normalizePhone,
  normalizeRecord,
  classifyRecords,
  summarize,
  canUndoLead
} = require("../netlify/functions/lib/lead-intake");

test("Lead Intake accepts the required four columns and optional source", () => {
  assert.equal(validateHeaders(["business", "type", "location", "phone_number"]).valid, true);
  assert.equal(validateHeaders(["Business", "Type", "Location", "Phone Number", "Source"]).valid, true);
});

test("Lead Intake explains missing and duplicate headers", () => {
  const missing = validateHeaders(["business", "type", "phone_number"]);
  assert.deepEqual(missing.missing, ["location"]);
  const duplicate = validateHeaders(["business", "type", "location", "phone_number", "Business"]);
  assert.deepEqual(duplicate.duplicates, ["business"]);
});

test("phone formatting variants normalize to one E.164 value", () => {
  ["(503) 555-0123", "503-555-0123", "503.555.0123", "5035550123", "+1 503 555 0123"].forEach((phone) => {
    assert.equal(normalizePhone(phone).normalized, "+15035550123");
  });
  assert.equal(normalizePhone("555").valid, false);
  assert.equal(normalizePhone("503-555-0123 ext 44").extension, "44");
});

test("invalid imported rows retain row-level reasons", () => {
  const row = normalizeRecord({ business: "", type: "Apartment", location: "Portland OR", phone_number: "bad" }, 7);
  assert.equal(row.duplicateStatus, "invalid");
  assert.equal(row.rowNumber, 7);
  assert.match(row.errors.join(" "), /Business is required/);
  assert.match(row.errors.join(" "), /cannot be normalized/);
});

test("duplicate detection covers same upload and existing records", () => {
  const first = normalizeRecord({ business: "Rose City Apts", type: "Apartment", location: "Portland, Oregon", phone_number: "503-555-0123" }, 2);
  const second = normalizeRecord({ business: "Rose City Apartments", type: "Apartment", location: "Portland OR", phone_number: "5035550123" }, 3);
  const classified = classifyRecords([first, second], []);
  assert.equal(classified[0].duplicateStatus, "new_unique");
  assert.equal(classified[1].duplicateStatus, "definite_duplicate");
  const againstLead = classifyRecords([first], [{ recordType: "lead", recordId: "lead-1", normalizedPhone: "+15035550123", normalizedBusiness: "rose city apartments", normalizedLocation: "portland or" }]);
  assert.equal(againstLead[0].duplicateStatus, "definite_duplicate");
  assert.match(againstLead[0].match.reason, /existing lead/);
});

test("similar business names in one location remain possible duplicates", () => {
  const row = normalizeRecord({ business: "Evergreen Property Mgmt", type: "Property Management", location: "Beaverton OR", phone_number: "503-555-0187" }, 2);
  const result = classifyRecords([row], [{ recordType: "contact", recordId: "c1", normalizedPhone: "+15035559999", normalizedBusiness: "evergreen property management services", normalizedLocation: "beaverton or" }]);
  assert.equal(result[0].duplicateStatus, "possible_duplicate");
  assert.equal(result[0].reviewAction, "unresolved");
});

test("import batch counts separate unique duplicate and invalid records", () => {
  const rows = [
    { duplicateStatus: "new_unique", reviewAction: "approve" },
    { duplicateStatus: "definite_duplicate", reviewAction: "keep_existing" },
    { duplicateStatus: "possible_duplicate", reviewAction: "keep_both" },
    { duplicateStatus: "invalid", reviewAction: "exclude" }
  ];
  assert.deepEqual(summarize(rows), { total: 4, unique: 1, definiteDuplicates: 1, possibleDuplicates: 1, invalid: 1, approved: 2 });
});

test("safe undo allows untouched leads and blocks downstream activity", () => {
  assert.equal(canUndoLead({ lead: {}, activity: [] }).allowed, true);
  const blocked = canUndoLead({ lead: { notes: "Called office", converted_to_quote: true }, activity: [{ id: "a1" }] });
  assert.equal(blocked.allowed, false);
  assert.deepEqual(blocked.blocked, ["call activity", "notes", "downstream workflow activity"]);
});
