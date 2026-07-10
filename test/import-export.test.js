const test = require("node:test");
const assert = require("node:assert/strict");

const {
  exportRowsForModule,
  getModule,
  normalizeFieldValue,
  parsePhoneNumber,
  parseCsv,
  rowsToCsv,
  suggestMappings,
  validateImportRows
} = require("../netlify/functions/lib/import-export-registry");

test("CSV parser handles quoted commas and multiline cells", () => {
  const parsed = parseCsv('Name,Notes\n"Urban Yards, LLC","Line one\nLine two"\n');

  assert.deepEqual(parsed.headers, ["Name", "Notes"]);
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].Name, "Urban Yards, LLC");
  assert.equal(parsed.rows[0].Notes, "Line one\nLine two");
});

test("property outreach headers map to the property module", () => {
  const module = getModule("outreach_properties");
  const headers = [
    "property name",
    "company",
    "address",
    "city",
    "state",
    "zip",
    "service fit",
    "visible needs",
    "source url",
    "google maps url",
    "verified at"
  ];
  const mapped = Object.fromEntries(
    suggestMappings(module, headers).map((item) => [item.sourceColumn, item.suggestedField])
  );

  assert.equal(mapped["property name"], "property_name");
  assert.equal(mapped.company, "company");
  assert.equal(mapped["service fit"], "service_fit");
  assert.equal(mapped["visible needs"], "visible_needs");
  assert.equal(mapped["source url"], "source_url");
  assert.equal(mapped["google maps url"], "google_maps_url");
  assert.equal(mapped["verified at"], "verified_at");
});

test("contact workbook headers map to rich contact fields", () => {
  const module = getModule("contacts");
  const headers = [
    "Record ID",
    "First Name",
    "Last Name",
    "Contact Name",
    "Job Title",
    "Company",
    "Property",
    "Primary Phone",
    "Phone Extension",
    "Preferred Contact Method",
    "Call Outcome"
  ];
  const mapped = Object.fromEntries(
    suggestMappings(module, headers).map((item) => [item.sourceColumn, item.suggestedField])
  );

  assert.equal(mapped["Record ID"], "id");
  assert.equal(mapped["First Name"], "first_name");
  assert.equal(mapped["Last Name"], "last_name");
  assert.equal(mapped["Contact Name"], "name");
  assert.equal(mapped["Job Title"], "job_title");
  assert.equal(mapped.Company, "company");
  assert.equal(mapped.Property, "property");
  assert.equal(mapped["Primary Phone"], "phone");
  assert.equal(mapped["Phone Extension"], "phone_extension");
  assert.equal(mapped["Preferred Contact Method"], "preferred_contact_method");
  assert.equal(mapped["Call Outcome"], "call_outcome");
});

test("phone parser preserves extension and normalizes US call numbers", () => {
  const parsed = parsePhoneNumber("(971) 258-1109 ext. 204");

  assert.equal(parsed.e164, "+19712581109");
  assert.equal(parsed.extension, "204");
  assert.equal(parsed.countryCode, "1");
  assert.equal(parsed.error, "");
});

test("contact import derives contact name from first and last name", () => {
  const module = getModule("contacts");
  const preview = validateImportRows(
    module,
    [{ _rowNumber: 2, "First Name": "Jordan", "Last Name": "Fields", Email: "jordan@example.com" }],
    [
      { sourceColumn: "First Name", field: "first_name" },
      { sourceColumn: "Last Name", field: "last_name" },
      { sourceColumn: "Email", field: "email" }
    ],
    []
  );

  assert.equal(preview.rows[0].action, "create");
  assert.equal(preview.rows[0].normalized.name, "Jordan Fields");
});

test("call list import validates phones and creates contact updates", () => {
  const module = getModule("contact_call_list");
  const mappings = [
    { sourceColumn: "Record ID", field: "id" },
    { sourceColumn: "Contact Name", field: "name" },
    { sourceColumn: "Phone Number", field: "phone" },
    { sourceColumn: "Call Outcome", field: "call_outcome" },
    { sourceColumn: "Call Notes", field: "call_notes" },
    { sourceColumn: "Next Follow-Up", field: "next_follow_up_at" }
  ];
  const existing = [
    { id: "9b9f2d44-8b31-4a4f-8f23-d4ef530a22e5", name: "Tyler Rolling", phone: "+19712581109", phone_e164: "+19712581109" }
  ];
  const rows = [
    {
      _rowNumber: 2,
      "Record ID": "9b9f2d44-8b31-4a4f-8f23-d4ef530a22e5",
      "Contact Name": "Tyler Rolling",
      "Phone Number": "(971) 258-1109 ext 3",
      "Call Outcome": "Left Voicemail",
      "Call Notes": "Asked for a walkthrough time.",
      "Next Follow-Up": "2026-07-15"
    },
    {
      _rowNumber: 3,
      "Contact Name": "Invalid Phone",
      "Phone Number": "123",
      "Call Outcome": "No Answer"
    }
  ];

  const preview = validateImportRows(module, rows, mappings, existing);

  assert.equal(preview.summary.totalRows, 2);
  assert.equal(preview.summary.updates, 1);
  assert.equal(preview.summary.validPhones, 1);
  assert.equal(preview.summary.invalidPhones, 1);
  assert.equal(preview.rows[0].normalized.phone_e164, "+19712581109");
  assert.equal(preview.rows[0].normalized.phone_extension, "3");
  assert.equal(preview.rows[0].normalized.call_outcome, "Left Voicemail");
  assert.equal(preview.rows[1].action, "rejected");
});

test("import validation catches invalid values and possible duplicates", () => {
  const module = getModule("outreach_prospects");
  const mappings = [
    { sourceColumn: "Property", field: "property_name" },
    { sourceColumn: "Email", field: "email" },
    { sourceColumn: "Status", field: "status" },
    { sourceColumn: "Priority", field: "priority" },
    { sourceColumn: "Phone", field: "phone" }
  ];
  const existing = [
    { id: "existing-1", property_name: "Kennedy Apartments", email: "manager@example.com", phone: "(971) 258-1109" }
  ];
  const rows = [
    { _rowNumber: 2, Property: "Kennedy Apartments", Email: "manager@example.com", Status: "Prospect", Priority: "High", Phone: "971.258.1109" },
    { _rowNumber: 3, Property: "", Email: "not-an-email", Status: "Maybe", Priority: "Urgent", Phone: "" }
  ];

  const preview = validateImportRows(module, rows, mappings, existing);

  assert.equal(preview.summary.totalRows, 2);
  assert.equal(preview.summary.duplicates, 1);
  assert.equal(preview.rows[0].action, "duplicate");
  assert.equal(preview.rows[1].action, "rejected");
  assert.match(preview.rows[1].errors.map((item) => item.message).join(" "), /valid email/i);
  assert.match(preview.rows[1].errors.map((item) => item.message).join(" "), /Status must be/i);
});

test("CSV export protects spreadsheet formulas", () => {
  const csv = rowsToCsv([{ Name: "=cmd|' /C calc'!A0", Notes: "+starts with formula" }]);

  assert.match(csv, /"'=cmd/);
  assert.match(csv, /"'\+starts with formula"/);
});

test("value normalization handles phone, email, booleans, dates, and money", () => {
  assert.equal(normalizeFieldValue("(971) 258-1109", { type: "phone", label: "Phone" }).value, "+19712581109");
  assert.equal(normalizeFieldValue(" TEAM@UrbanYards.US ", { type: "email", label: "Email" }).value, "team@urbanyards.us");
  assert.equal(normalizeFieldValue("yes", { type: "boolean", label: "Active" }).value, true);
  assert.equal(normalizeFieldValue("2026-07-10", { type: "date", label: "Date" }).value, "2026-07-10");
  assert.equal(normalizeFieldValue("$1,250.50", { type: "currency", label: "Amount" }).value, 1250.5);
});

test("module export returns clean labeled rows", () => {
  const module = getModule("equipment");
  const exported = exportRowsForModule(module, [{ name: "Mower", category: "Mower", status: "Ready", purchase_price: 1200 }]);

  assert.equal(exported.rows.length, 1);
  assert.equal(exported.rows[0].Name, "Mower");
  assert.equal(exported.rows[0].Category, "Mower");
  assert.equal(exported.rows[0].Status, "Ready");
  assert.equal(exported.rows[0]["Purchase Price"], 1200);
});
