const crypto = require("node:crypto");
const {
  json,
  rateLimit,
  ipFromEvent,
  requestIdFromEvent,
  requirePermission,
  supabaseAdminRequest,
  writeAuditLog,
  writeSystemError
} = require("./lib/dashboard-auth");
const { getSiteUrl } = require("./lib/site-url");
const {
  CALL_OUTCOME_VALUES,
  CONTACT_METHODS,
  CONTACT_TYPES,
  exportRowsForModule,
  getModule,
  listModules,
  parsePhoneNumber,
  parseCsv,
  PRIORITIES,
  rowsToCsv,
  suggestMappings,
  US_STATES,
  validateImportRows
} = require("./lib/import-export-registry");
const {
  canonicalHeader,
  normalizeBusiness,
  normalizeLocation,
  normalizePhone: normalizeLeadPhone,
  validateHeaders: validateLeadHeaders,
  normalizeRecord: normalizeLeadRecord,
  classifyRecords: classifyLeadRecords,
  summarize: summarizeLeadRecords,
  canUndoLead
} = require("./lib/lead-intake");

const MAX_IMPORT_BYTES = Number(process.env.DASHBOARD_IMPORT_MAX_BYTES || 5 * 1024 * 1024);
const MAX_IMPORT_ROWS = Number(process.env.DASHBOARD_IMPORT_MAX_ROWS || 2000);
const ROLLBACK_RETENTION_DAYS = Number(process.env.DASHBOARD_IMPORT_ROLLBACK_DAYS || 30);
const GOOGLE_SHEETS_SCOPE = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/userinfo.email"
].join(" ");

function safeError(message) {
  return String(message || "The import/export request could not be completed.").slice(0, 300);
}

function parseJsonBody(event) {
  if (!event.body) return {};
  const text = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function queryValue(event, name) {
  return String(event.queryStringParameters?.[name] || "").trim();
}

function modulePermission(module, verb) {
  const area = module.permissionArea || "dashboard";
  if (verb === "read") return `${area}:read`;
  if (verb === "write") return `${area}:write`;
  return "admin:manage";
}

async function authForModule(event, module, verb) {
  const auth = await requirePermission(event, modulePermission(module, verb), { route: "dashboard-import-export", module: module.key, verb });
  if (auth.ok) return auth;
  if (verb === "read") {
    const fallback = await requirePermission(event, "exports:read", { route: "dashboard-import-export", module: module.key, verb });
    if (fallback.ok) return fallback;
  }
  return auth;
}

async function safeRows(path) {
  try {
    const rows = await supabaseAdminRequest(path, { method: "GET" });
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    if (/does not exist|schema cache|relation/i.test(error.message || "")) return [];
    throw error;
  }
}

async function fetchModuleRows(module, limit = 10000) {
  return safeRows(`${module.table}?select=*&limit=${encodeURIComponent(String(limit))}`);
}

function sourceBuffer(payload) {
  const content = payload.fileBase64 || payload.contentBase64 || "";
  if (content) return Buffer.from(String(content).replace(/^data:[^,]+,/, ""), "base64");
  return Buffer.from(String(payload.content || ""), "utf8");
}

async function parseWorkbook(buffer, worksheetName = "") {
  let ExcelJS;
  try {
    ExcelJS = require("exceljs");
  } catch {
    const error = new Error("Excel support is not installed. Run npm install so ExcelJS is available in Netlify.");
    error.statusCode = 503;
    throw error;
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheets = workbook.worksheets.map((sheet) => sheet.name);
  const preferredNames = [worksheetName, "Contacts", "Call List", "Companies", "Properties"].filter(Boolean).map((name) => String(name).toLowerCase());
  const worksheet = workbook.worksheets.find((sheet) => preferredNames.includes(sheet.name.toLowerCase()))
    || workbook.worksheets.find((sheet) => !["instructions", "allowed values", "uy_metadata"].includes(sheet.name.toLowerCase()))
    || workbook.worksheets[0];
  if (!worksheet) return { headers: [], rows: [] };
  const headers = [];
  worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, columnNumber) => {
    headers[columnNumber - 1] = String(cell.value || "").trim();
  });
  const rows = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const record = { _rowNumber: rowNumber };
    headers.forEach((header, index) => {
      const cell = row.getCell(index + 1);
      const value = cell?.text || cell?.value || "";
      record[header] = typeof value === "object" ? JSON.stringify(value) : String(value || "");
    });
    if (Object.values(record).some((value) => String(value || "").trim() !== "")) rows.push(record);
  });
  return { headers: headers.filter(Boolean), rows, worksheets, worksheetName: worksheet.name };
}

async function parseImportSource(payload) {
  const format = String(payload.format || payload.sourceType || "").toLowerCase();
  const buffer = sourceBuffer(payload);
  if (buffer.length > MAX_IMPORT_BYTES) {
    const error = new Error(`File is too large. Maximum import size is ${Math.round(MAX_IMPORT_BYTES / 1024 / 1024)} MB.`);
    error.statusCode = 400;
    throw error;
  }
  if (format === "xlsx" || /\.xlsx$/i.test(payload.filename || "")) {
    const parsed = await parseWorkbook(buffer, payload.worksheetName || payload.sheetName || "");
    if (parsed.rows.length > MAX_IMPORT_ROWS) {
      const error = new Error(`This file has too many rows. Maximum import rows: ${MAX_IMPORT_ROWS}.`);
      error.statusCode = 400;
      throw error;
    }
    return parsed;
  }
  const parsed = parseCsv(buffer.toString("utf8"));
  if (parsed.rows.length > MAX_IMPORT_ROWS) {
    const error = new Error(`This file has too many rows. Maximum import rows: ${MAX_IMPORT_ROWS}.`);
    error.statusCode = 400;
    throw error;
  }
  return parsed;
}

function defaultWorksheetForModule(module) {
  if (module?.key === "contact_call_list") return "Call List";
  if (module?.key === "contacts") return "Contacts";
  if (module?.key === "outreach_companies") return "Companies";
  if (module?.key === "outreach_properties") return "Properties";
  return module?.pluralLabel || module?.label || "";
}

function responseFile({ filename, contentType, body, base64 = false }) {
  return {
    statusCode: 200,
    isBase64Encoded: Boolean(base64),
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${filename}"`
    },
    body
  };
}

function responseHtml(body, statusCode = 200) {
  return {
    statusCode,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    },
    body
  };
}

async function createExcelWorkbook(module, records, template = false) {
  let ExcelJS;
  try {
    ExcelJS = require("exceljs");
  } catch {
    const error = new Error("Excel export support is not installed. Run npm install so ExcelJS is available in Netlify.");
    error.statusCode = 503;
    throw error;
  }
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Urban Yards Dashboard";
  workbook.created = new Date();
  const worksheet = workbook.addWorksheet(module.pluralLabel || module.label);
  const fields = module.fields.filter((item) => item.export && (template ? item.import !== false : true));
  worksheet.columns = fields.map((item) => ({
    header: item.label + (item.required ? " *" : ""),
    key: item.key,
    width: Math.max(14, Math.min(34, item.label.length + 8))
  }));
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.autoFilter = { from: "A1", to: `${String.fromCharCode(64 + Math.min(fields.length, 26))}1` };
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF123F31" } };
  worksheet.getRow(1).alignment = { vertical: "middle" };
  if (template) {
    const example = {};
    fields.forEach((item) => {
      example[item.key] = item.readOnly ? "" : item.defaultValue || (item.enum ? item.enum[0] : item.type === "date" ? "2026-07-10" : item.required ? `Example ${item.label}` : "");
    });
    worksheet.addRow(example);
  } else {
    records.forEach((record) => {
      const row = {};
      fields.forEach((item) => { row[item.key] = record?.[item.key] ?? ""; });
      worksheet.addRow(row);
    });
  }
  fields.forEach((item, index) => {
    if (item.enum) {
      worksheet.getColumn(index + 1).eachCell({ includeEmpty: true }, (cell, rowNumber) => {
        if (rowNumber === 1) return;
        cell.dataValidation = {
          type: "list",
          allowBlank: !item.required,
          formulae: [`"${item.enum.join(",")}"`],
          showErrorMessage: true,
          error: `${item.label} must use one of the allowed values.`
        };
      });
    }
    if (item.type === "date" || item.type === "datetime") worksheet.getColumn(index + 1).numFmt = "yyyy-mm-dd";
    if (item.type === "currency") worksheet.getColumn(index + 1).numFmt = "$#,##0.00";
  });

  const instructions = workbook.addWorksheet("Instructions");
  instructions.columns = [{ key: "topic", width: 28 }, { key: "detail", width: 95 }];
  instructions.addRows([
    { topic: "Source of truth", detail: "Supabase remains the source of truth. This workbook is for controlled editing and re-import." },
    { topic: "Record ID", detail: "Do not change Record ID values. A blank Record ID creates a new record; an existing valid ID updates that record." },
    { topic: "Required fields", detail: module.fields.filter((item) => item.required).map((item) => item.label).join(", ") || "No required fields." },
    { topic: "Allowed values", detail: module.fields.filter((item) => item.enum).map((item) => `${item.label}: ${item.enum.join(", ")}`).join(" / ") || "No dropdown fields." },
    { topic: "Import review", detail: "Upload this workbook back to Import & Export. You will review mappings, warnings, duplicates, and rejected rows before anything is saved." }
  ]);
  instructions.getRow(1).font = { bold: true };
  return workbook.xlsx.writeBuffer();
}

function valueListSheetData() {
  return {
    "Contact Type": CONTACT_TYPES,
    "Preferred Contact Method": CONTACT_METHODS,
    "Call Outcome": CALL_OUTCOME_VALUES,
    "Priority": PRIORITIES,
    "State": US_STATES,
    "Source": ["Dashboard", "Website Quote", "Outreach", "Google Maps", "Referral", "Call List Workbook", "Other"]
  };
}

function safeSheetName(name) {
  return String(name || "Sheet").replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Sheet";
}

function addAllowedValuesSheet(workbook) {
  const values = valueListSheetData();
  const sheet = workbook.addWorksheet("Allowed Values");
  const headings = Object.keys(values);
  sheet.columns = headings.map((heading) => ({ header: heading, key: heading, width: Math.max(18, heading.length + 4) }));
  const maxRows = Math.max(...Object.values(values).map((items) => items.length));
  for (let index = 0; index < maxRows; index += 1) {
    const row = {};
    headings.forEach((heading) => { row[heading] = values[heading][index] || ""; });
    sheet.addRow(row);
  }
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF123F31" } };
  return { sheet, headings, values };
}

function validationRangeFor(allowedValues, label) {
  const index = allowedValues.headings.indexOf(label);
  const count = allowedValues.values[label]?.length || 0;
  if (index < 0 || !count) return "";
  const column = String.fromCharCode(65 + index);
  return `'Allowed Values'!$${column}$2:$${column}$${count + 1}`;
}

function addRowsForModuleSheet(workbook, sheetName, module, records = [], options = {}) {
  const sheet = workbook.addWorksheet(safeSheetName(sheetName));
  const fields = module.fields.filter((item) => item.export && (options.template ? item.import !== false : true));
  const preparedBlankRows = options.blankRows || 0;
  sheet.columns = fields.map((item) => ({
    header: item.label,
    key: item.key,
    width: item.width || Math.max(14, Math.min(34, item.label.length + 8)),
    style: item.type === "phone" || item.key.includes("phone") || item.key === "zip" ? { numFmt: "@" } : {}
  }));
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: "A1", to: `${String.fromCharCode(64 + Math.min(fields.length, 26))}1` };
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF123F31" } };
  sheet.getRow(1).alignment = { vertical: "middle", wrapText: true };
  fields.forEach((item, index) => {
    const column = sheet.getColumn(index + 1);
    if (item.required) column.eachCell((cell, rowNumber) => {
      if (rowNumber === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4E7A3E" } };
    });
    if (item.type === "phone" || item.key.includes("phone") || item.key === "zip") column.numFmt = "@";
    if (item.type === "date" || item.type === "datetime") column.numFmt = "yyyy-mm-dd";
    if (item.type === "currency") column.numFmt = "$#,##0.00";
    if (item.type === "textarea" || item.key.includes("notes")) column.alignment = { wrapText: true, vertical: "top" };
  });

  records.forEach((record) => {
    const row = {};
    fields.forEach((item) => { row[item.key] = record?.[item.key] ?? ""; });
    sheet.addRow(row);
  });
  for (let index = 0; index < preparedBlankRows; index += 1) sheet.addRow({});

  const allowedValues = options.allowedValues;
  fields.forEach((item, index) => {
    const range = item.enum ? null : validationRangeFor(allowedValues, item.label);
    const formula = item.enum ? `"${item.enum.join(",")}"` : range;
    if (!formula) return;
    for (let rowNumber = 2; rowNumber <= Math.max(sheet.rowCount, 501); rowNumber += 1) {
      sheet.getCell(rowNumber, index + 1).dataValidation = {
        type: "list",
        allowBlank: !item.required,
        formulae: [formula],
        showErrorMessage: true,
        error: `${item.label} must use one of the allowed values.`
      };
    }
  });
  return sheet;
}

function addInstructionsSheet(workbook) {
  const sheet = workbook.addWorksheet("Instructions", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = [{ header: "Topic", key: "topic", width: 30 }, { header: "Details", key: "detail", width: 105 }];
  sheet.addRows([
    { topic: "How this workbook works", detail: "Fill out Contacts or Call List rows, save the .xlsx file, then upload it back into the dashboard Import & Export Center." },
    { topic: "Supabase is source of truth", detail: "Excel is an editable intake and round-trip update format. It is not the database." },
    { topic: "Record ID", detail: "Do not edit existing Record ID values. Existing valid IDs update records. Blank IDs create new records after review." },
    { topic: "Phone numbers", detail: "Enter phone numbers as text, including formats like (971) 258-1109 or (971) 258-1109 ext. 204. Invalid or incomplete numbers are flagged before import." },
    { topic: "Dropdowns", detail: "Use dropdown values where available. The importer validates status, priority, state, contact type, preferred method, and call outcome." },
    { topic: "Duplicates", detail: "The importer checks Record ID, normalized phone, email, contact name + company, contact name + property, and phone + company." },
    { topic: "Calling", detail: "After import, valid phone numbers appear as Call buttons. Calls use browser click-to-call / Google Voice workflow and call results can be logged in the dashboard." },
    { topic: "Rollback", detail: "Confirmed imports create a batch history record and can be undone from Backups & History while rollback is still available." }
  ]);
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF123F31" } };
  sheet.getColumn(2).alignment = { wrapText: true, vertical: "top" };
  return sheet;
}

function addMetadataSheet(workbook, metadata) {
  const sheet = workbook.addWorksheet("UY_Metadata");
  sheet.state = "veryHidden";
  sheet.columns = [{ header: "Key", key: "key", width: 28 }, { header: "Value", key: "value", width: 72 }];
  Object.entries(metadata).forEach(([key, value]) => sheet.addRow({ key, value: typeof value === "object" ? JSON.stringify(value) : String(value || "") }));
}

function prospectToContactRow(row = {}) {
  return {
    id: "",
    name: row.contact_name || row.property_name || "",
    company: row.management_company || "",
    property: row.property_name || "",
    email: row.email || "",
    phone: row.phone || "",
    address: row.address || "",
    city: row.city || "",
    contact_type: "Property Manager",
    status: row.status || "Prospect",
    priority: row.priority || "Normal",
    last_contacted_at: row.last_contacted_at || "",
    next_follow_up_at: row.next_follow_up_at || "",
    notes: row.notes || "",
    source: "Outreach Prospect"
  };
}

function propertyToContactRow(row = {}) {
  return {
    id: "",
    name: row.contact_name || row.company || row.property_name || "",
    company: row.company || row.management_company || "",
    property: row.property_name || "",
    email: row.email || "",
    phone: row.phone || "",
    address: row.address || "",
    city: row.city || "",
    state: row.state || "",
    zip: row.zip || "",
    contact_type: "Property Manager",
    preferred_contact_method: "No Preference",
    status: "New",
    priority: row.priority || "Normal",
    notes: [row.notes, row.visible_needs, row.location_notes].filter(Boolean).join("\n\n"),
    source: "Outreach Property"
  };
}

function contactToCallListRow(row = {}) {
  return {
    id: row.id || "",
    name: row.name || "",
    company: row.company || "",
    property: row.property || "",
    phone: row.phone || row.phone_e164 || row.phone_display || "",
    phone_extension: row.phone_extension || "",
    email: row.email || "",
    status: row.status || "",
    priority: row.priority || "Normal",
    last_contacted_at: row.last_contacted_at || "",
    next_follow_up_at: row.next_follow_up_at || "",
    call_outcome: row.call_outcome || "Not Called",
    call_notes: row.call_notes || "",
    assigned_user: row.assigned_user || "",
    notes: row.notes || "",
    source: row.source || ""
  };
}

async function createContactWorkbook({ workbookType = "blank", contacts = [], prospects = [], companies = [], properties = [], selectedIds = [], actor = null }) {
  let ExcelJS;
  try {
    ExcelJS = require("exceljs");
  } catch {
    const error = new Error("Excel export support is not installed. Run npm install so ExcelJS is available in Netlify.");
    error.statusCode = 503;
    throw error;
  }
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Urban Yards Dashboard";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.subject = "Urban Yards round-trip contact workbook";
  workbook.title = "Urban Yards Contact Workbook";

  const contactModule = getModule("contacts");
  const callListModule = getModule("contact_call_list");
  const companyModule = getModule("outreach_companies");
  const propertyModule = getModule("outreach_properties");
  addInstructionsSheet(workbook);
  const allowedValues = addAllowedValuesSheet(workbook);

  const selectedSet = new Set((selectedIds || []).map(String));
  const selectedContacts = selectedSet.size ? contacts.filter((row) => selectedSet.has(String(row.id))) : contacts;
  const selectedProspects = selectedSet.size ? prospects.filter((row) => selectedSet.has(String(row.id))) : prospects;
  const selectedProperties = selectedSet.size ? properties.filter((row) => selectedSet.has(String(row.id))) : properties;
  let contactRows = selectedContacts;
  if (workbookType === "blank") {
    contactRows = [];
  } else if (workbookType.includes("prospect")) {
    contactRows = selectedProspects.map(prospectToContactRow);
  } else if (workbookType === "properties_without_contacts") {
    contactRows = selectedProperties.map(propertyToContactRow);
  } else if (workbookType === "all_outreach") {
    contactRows = [
      ...selectedContacts,
      ...selectedProspects.map(prospectToContactRow),
      ...selectedProperties.map(propertyToContactRow)
    ];
  }
  const callRows = workbookType === "blank" ? [] : (workbookType.includes("call") ? selectedContacts.map(contactToCallListRow) : contactRows.map(contactToCallListRow));
  const blankRows = workbookType === "blank" ? 500 : Math.max(25, Math.min(500, 500 - contactRows.length));

  addRowsForModuleSheet(workbook, "Contacts", contactModule, contactRows, { blankRows, allowedValues, template: true });
  if (["all_outreach", "current_prospects", "filtered_prospects", "properties_without_contacts"].includes(workbookType)) {
    addRowsForModuleSheet(workbook, "Companies", companyModule, companies, { blankRows: 25, allowedValues, template: true });
    addRowsForModuleSheet(workbook, "Properties", propertyModule, properties, { blankRows: 25, allowedValues, template: true });
  }
  if (workbookType !== "blank") {
    addRowsForModuleSheet(workbook, "Call List", callListModule, callRows, { blankRows: Math.max(25, Math.min(250, 250 - callRows.length)), allowedValues, template: true });
  }
  addMetadataSheet(workbook, {
    templateVersion: "urban-yards-contact-workbook-v1",
    schemaVersion: "2026-07-10",
    workbookType,
    exportedAt: new Date().toISOString(),
    exportedBy: actor?.email || "",
    modules: ["contacts", "contact_call_list", "outreach_companies", "outreach_properties"]
  });
  return workbook.xlsx.writeBuffer();
}

async function createPdfReport(module, records, actor) {
  let PDFDocument;
  try {
    PDFDocument = require("pdfkit");
  } catch {
    const error = new Error("PDF support is not installed. Run npm install so PDFKit is available in Netlify.");
    error.statusCode = 503;
    throw error;
  }
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 42 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.fillColor("#123f31").fontSize(20).text(`Urban Yards ${module.label} Report`);
    doc.fillColor("#65756c").fontSize(9).text(`Generated ${new Date().toLocaleString()} by ${actor?.email || "dashboard user"}`);
    doc.moveDown();
    doc.fillColor("#13241c").fontSize(11).text(`Records: ${records.length}`);
    doc.moveDown();
    const fields = module.fields.filter((item) => item.export && !["id", "created_at", "updated_at"].includes(item.key)).slice(0, 6);
    records.slice(0, 80).forEach((record, index) => {
      doc.fillColor("#123f31").fontSize(11).text(`${index + 1}. ${record.name || record.property_name || record.company || record.title || record.client_name || record.id || "Record"}`);
      fields.forEach((item) => {
        const value = record[item.key];
        if (value !== null && value !== undefined && String(value).trim() !== "") {
          doc.fillColor("#13241c").fontSize(9).text(`${item.label}: ${String(value).slice(0, 140)}`);
        }
      });
      doc.moveDown(0.6);
    });
    doc.end();
  });
}

async function handleRegistry(event) {
  const auth = await requirePermission(event, "dashboard:read", { route: "dashboard-import-export", action: "registry" });
  if (!auth.ok) return json(auth.statusCode, { error: auth.error });
  return json(200, { ok: true, modules: listModules(), limits: { maxImportBytes: MAX_IMPORT_BYTES, maxImportRows: MAX_IMPORT_ROWS, rollbackRetentionDays: ROLLBACK_RETENTION_DAYS } });
}

async function handleExport(event, payload, actor) {
  const module = getModule(payload.module || queryValue(event, "module"));
  if (!module) return json(400, { error: "Choose a supported dashboard module." });
  const auth = await authForModule(event, module, "read");
  if (!auth.ok) return json(auth.statusCode, { error: auth.error });
  const format = String(payload.format || queryValue(event, "format") || "xlsx").toLowerCase();
  const records = await fetchModuleRows(module, Number(payload.limit || 10000));
  await writeAuditLog({ actor: auth.actor || actor, action: "export_generated", entityType: module.table, metadata: { module: module.key, format, rows: records.length }, event });
  await supabaseAdminRequest("export_jobs", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      action_type: `${format}_export`,
      module: module.key,
      destination_type: format,
      status: "complete",
      requested_by: auth.actor?.userId || null,
      requested_by_email: auth.actor?.email || null,
      total_rows: records.length,
      completed_at: new Date().toISOString(),
      metadata: { table: module.table }
    })
  }).catch(() => null);

  if (format === "json") return responseFile({ filename: `urban-yards-${module.key}-${new Date().toISOString().slice(0, 10)}.json`, contentType: "application/json; charset=utf-8", body: JSON.stringify({ exportedAt: new Date().toISOString(), module: module.key, records }, null, 2) });
  if (format === "csv") {
    const exported = exportRowsForModule(module, records);
    return responseFile({ filename: `urban-yards-${module.key}-${new Date().toISOString().slice(0, 10)}.csv`, contentType: "text/csv; charset=utf-8", body: rowsToCsv(exported.rows, exported.columns) });
  }
  if (format === "pdf") {
    const buffer = await createPdfReport(module, records, auth.actor || actor);
    return responseFile({ filename: `urban-yards-${module.key}-${new Date().toISOString().slice(0, 10)}.pdf`, contentType: "application/pdf", body: buffer.toString("base64"), base64: true });
  }
  const buffer = await createExcelWorkbook(module, records, false);
  return responseFile({ filename: `urban-yards-${module.key}-${new Date().toISOString().slice(0, 10)}.xlsx`, contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", body: Buffer.from(buffer).toString("base64"), base64: true });
}

async function handleTemplate(event, payload) {
  const module = getModule(payload.module || queryValue(event, "module"));
  if (!module) return json(400, { error: "Choose a supported dashboard module." });
  const auth = await authForModule(event, module, "read");
  if (!auth.ok) return json(auth.statusCode, { error: auth.error });
  const format = String(payload.format || queryValue(event, "format") || "xlsx").toLowerCase();
  if (format === "csv") {
    const labels = module.fields.filter((item) => item.import !== false).map((item) => item.label + (item.required ? " *" : ""));
    return responseFile({ filename: `urban-yards-${module.key}-template.csv`, contentType: "text/csv; charset=utf-8", body: `${labels.map((item) => `"${item}"`).join(",")}\r\n` });
  }
  const buffer = await createExcelWorkbook(module, [], true);
  return responseFile({ filename: `urban-yards-${module.key}-template.xlsx`, contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", body: Buffer.from(buffer).toString("base64"), base64: true });
}

function workbookFilename(workbookType) {
  const safeType = String(workbookType || "contacts").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  return `urban-yards-${safeType || "contacts"}-${new Date().toISOString().slice(0, 10)}.xlsx`;
}

function hasUsablePhone(row) {
  return !parsePhoneNumber(row?.phone || row?.phone_e164 || row?.phone_display || "").error && Boolean(parsePhoneNumber(row?.phone || row?.phone_e164 || row?.phone_display || "").e164);
}

function isFollowUpDue(row) {
  const due = String(row?.next_follow_up_at || "").slice(0, 10);
  if (!due) return false;
  return due <= new Date().toISOString().slice(0, 10);
}

async function handleContactWorkbook(event, payload) {
  const contactModule = getModule("contacts");
  const auth = await authForModule(event, contactModule, "read");
  if (!auth.ok) return json(auth.statusCode, { error: auth.error });
  const workbookType = String(payload.workbookType || payload.type || "blank").trim() || "blank";
  const selectedIds = Array.isArray(payload.selectedIds) ? payload.selectedIds : [];
  let [contacts, prospects, companies, properties] = await Promise.all([
    safeRows("contacts?select=*&order=created_at.desc&limit=10000"),
    safeRows("outreach_prospects?select=*&order=created_at.desc&limit=10000"),
    safeRows("outreach_companies?select=*&order=created_at.desc&limit=10000"),
    safeRows("outreach_properties?select=*&order=created_at.desc&limit=10000")
  ]);

  if (workbookType === "blank") {
    contacts = [];
    prospects = [];
    companies = [];
    properties = [];
  } else if (workbookType === "follow_up_call_list") {
    contacts = contacts.filter((row) => hasUsablePhone(row) && (isFollowUpDue(row) || /follow/i.test(row.status || "")));
  } else if (workbookType === "current_prospects" || workbookType === "filtered_prospects" || workbookType === "selected_prospects") {
    contacts = [];
    properties = [];
  } else if (workbookType === "properties_without_contacts") {
    contacts = [];
    prospects = [];
    properties = properties.filter((row) => !row.email && !row.phone && !row.contact_name);
  }

  const buffer = await createContactWorkbook({
    workbookType,
    contacts,
    prospects,
    companies,
    properties,
    selectedIds,
    actor: auth.actor
  });

  await supabaseAdminRequest("export_jobs", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      action_type: "contact_workbook",
      module: "contacts",
      destination_type: "xlsx",
      status: "complete",
      requested_by: auth.actor?.userId || null,
      requested_by_email: auth.actor?.email || null,
      total_rows: contacts.length + prospects.length + properties.length,
      completed_at: new Date().toISOString(),
      metadata: { workbookType, selectedIds: selectedIds.length }
    })
  }).catch(() => null);
  await writeAuditLog({ actor: auth.actor, action: "contact_workbook_exported", entityType: "contacts", metadata: { workbookType, contacts: contacts.length, prospects: prospects.length, properties: properties.length }, event });
  return responseFile({
    filename: workbookFilename(workbookType),
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    body: Buffer.from(buffer).toString("base64"),
    base64: true
  });
}

async function handlePreview(event, payload) {
  const module = getModule(payload.module);
  if (!module) return json(400, { error: "Choose a supported dashboard module." });
  const auth = await authForModule(event, module, "write");
  if (!auth.ok) return json(auth.statusCode, { error: auth.error });
  const parsed = await parseImportSource({ ...payload, worksheetName: payload.worksheetName || payload.sheetName || defaultWorksheetForModule(module) });
  if (!parsed.headers.length) return json(400, { error: "The spreadsheet needs a header row." });
  const mappings = payload.mappings?.length ? payload.mappings : suggestMappings(module, parsed.headers, parsed.rows);
  const existingRows = await fetchModuleRows(module, 10000);
  const preview = validateImportRows(module, parsed.rows, mappings, existingRows);
  return json(200, {
    ok: true,
    module: module.key,
    filename: payload.filename || "",
    fileSize: sourceBuffer(payload).length,
    headers: parsed.headers,
    worksheets: parsed.worksheets || [],
    worksheetName: parsed.worksheetName || "",
    mappings,
    preview
  });
}

async function createImportBatch(module, payload, actor, preview) {
  const rows = await supabaseAdminRequest("import_batches", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      module: module.key,
      table_name: module.table,
      source_type: String(payload.format || payload.sourceType || "csv").slice(0, 40),
      source_name: String(payload.filename || payload.sourceName || "Imported file").slice(0, 240),
      status: "importing",
      created_by: actor?.userId || null,
      created_by_email: actor?.email || null,
      mapping_config: payload.mappings || [],
      total_rows: preview.summary.totalRows,
      created_count: preview.summary.newRecords,
      updated_count: preview.summary.updates,
      duplicate_count: preview.summary.duplicates,
      warning_count: preview.summary.warnings,
      rejected_count: preview.summary.rejected
    })
  });
  return Array.isArray(rows) ? rows[0] : rows;
}

async function writeImportRow(batchId, row, status, message = "") {
  return supabaseAdminRequest("import_rows", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      batch_id: batchId,
      row_number: row.rowNumber,
      status,
      action_type: row.action,
      source_data: row.source,
      normalized_data: row.normalized,
      errors: row.errors,
      warnings: row.warnings,
      message
    })
  }).catch(() => null);
}

function callOutcomeToActivityOutcome(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized || normalized === "not called") return "";
  if (normalized === "no answer") return "no_answer";
  if (normalized === "left voicemail") return "left_voicemail";
  if (["spoke with contact", "interested", "quote requested", "send information"].includes(normalized)) return "spoke_with_contact";
  if (normalized === "wrong number") return "wrong_number";
  if (["follow-up needed", "call back requested"].includes(normalized)) return "follow_up_needed";
  if (normalized === "not interested") return "not_interested";
  return "";
}

async function writeCallActivityFromImport(module, row, recordId, actor, batch) {
  if (module.key !== "contact_call_list" || !recordId) return;
  const normalized = row.normalized || {};
  const activityOutcome = callOutcomeToActivityOutcome(normalized.call_outcome);
  const notes = String(normalized.call_notes || "").trim();
  const followUpDate = normalized.next_follow_up_at || null;
  if (!activityOutcome && !notes && !followUpDate) return;
  const parsed = parsePhoneNumber(normalized.phone_e164 || normalized.phone || normalized.phone_display || "");
  if (parsed.error || !parsed.e164) return;
  await supabaseAdminRequest("lead_activity", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      lead_id: recordId,
      lead_type: "contact",
      phone_number: parsed.e164,
      type: "call_attempt",
      outcome: activityOutcome || "not_set",
      notes,
      follow_up_date: followUpDate || null,
      metadata: {
        source: "contact_call_list_import",
        batch_id: batch?.id || null,
        imported_by: actor?.email || "",
        row_number: row.rowNumber || null
      }
    })
  }).catch((error) => {
    if (/does not exist|schema cache|relation/i.test(error.message || "")) return null;
    throw error;
  });
}

async function applyImportRows(module, batch, preview, actor) {
  const results = { created: 0, updated: 0, skipped: 0, rejected: preview.summary.rejected, warnings: preview.summary.warnings };
  for (const row of preview.rows) {
    if (row.action === "rejected" || row.action === "duplicate" || row.action === "unchanged") {
      results.skipped += 1;
      await writeImportRow(batch.id, row, row.action, row.errors[0]?.message || row.warnings[0]?.message || "Skipped during import review.");
      continue;
    }
    if (row.action === "update") {
      const oldRows = await safeRows(`${module.table}?id=eq.${encodeURIComponent(row.normalized.id)}&select=*&limit=1`);
      const oldValue = oldRows[0] || {};
      const patch = { ...row.normalized, updated_at: new Date().toISOString() };
      delete patch.id;
      const updated = await supabaseAdminRequest(`${module.table}?id=eq.${encodeURIComponent(row.normalized.id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(patch)
      });
      const newValue = Array.isArray(updated) ? updated[0] : updated;
      results.updated += 1;
      await supabaseAdminRequest("import_changes", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ batch_id: batch.id, module: module.key, table_name: module.table, record_id: row.normalized.id, change_type: "update", old_value: oldValue, new_value: newValue, changed_fields: row.changedFields })
      }).catch(() => null);
      await writeCallActivityFromImport(module, row, row.normalized.id, actor, batch);
      await writeImportRow(batch.id, row, "updated");
    } else {
      const insert = { ...row.normalized };
      delete insert.id;
      const inserted = await supabaseAdminRequest(module.table, {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(insert)
      });
      const newValue = Array.isArray(inserted) ? inserted[0] : inserted;
      results.created += 1;
      await supabaseAdminRequest("import_changes", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ batch_id: batch.id, module: module.key, table_name: module.table, record_id: newValue?.id || null, change_type: "create", old_value: null, new_value: newValue, changed_fields: Object.keys(insert) })
      }).catch(() => null);
      await writeCallActivityFromImport(module, row, newValue?.id || null, actor, batch);
      await writeImportRow(batch.id, row, "created");
    }
  }
  await supabaseAdminRequest(`import_batches?id=eq.${encodeURIComponent(batch.id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      status: results.rejected || results.warnings ? "completed_with_warnings" : "complete",
      created_count: results.created,
      updated_count: results.updated,
      skipped_count: results.skipped,
      rejected_count: results.rejected,
      warning_count: results.warnings,
      completed_at: new Date().toISOString()
    })
  });
  await writeAuditLog({ actor, action: "import_completed", entityType: module.table, entityId: batch.id, metadata: { module: module.key, ...results } });
  return results;
}

async function handleConfirmImport(event, payload) {
  const module = getModule(payload.module);
  if (!module) return json(400, { error: "Choose a supported dashboard module." });
  const auth = await authForModule(event, module, "write");
  if (!auth.ok) return json(auth.statusCode, { error: auth.error });
  const parsed = await parseImportSource({ ...payload, worksheetName: payload.worksheetName || payload.sheetName || defaultWorksheetForModule(module) });
  const mappings = payload.mappings?.length ? payload.mappings : suggestMappings(module, parsed.headers, parsed.rows);
  const existingRows = await fetchModuleRows(module, 10000);
  const preview = validateImportRows(module, parsed.rows, mappings, existingRows);
  const batch = await createImportBatch(module, payload, auth.actor, preview);
  await writeAuditLog({ actor: auth.actor, action: "import_confirmed", entityType: module.table, entityId: batch.id, metadata: { module: module.key, rows: preview.summary.totalRows }, event });
  try {
    const result = await applyImportRows(module, batch, preview, auth.actor);
    return json(200, { ok: true, batchId: batch.id, module: module.key, summary: result });
  } catch (error) {
    await supabaseAdminRequest(`import_batches?id=eq.${encodeURIComponent(batch.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status: "failed", error_message: safeError(error.message), completed_at: new Date().toISOString() })
    }).catch(() => null);
    throw error;
  }
}

async function handleHistory(event) {
  const auth = await requirePermission(event, "imports:read", { route: "dashboard-import-export", action: "history" });
  if (!auth.ok) return json(auth.statusCode, { error: auth.error });
  const [imports, exports, syncs, backups] = await Promise.all([
    safeRows("import_batches?select=*&order=created_at.desc&limit=100"),
    safeRows("export_jobs?select=*&order=created_at.desc&limit=100"),
    safeRows("sync_runs?select=*&order=created_at.desc&limit=100"),
    safeRows("backup_history?select=*&order=created_at.desc&limit=100")
  ]);
  return json(200, { ok: true, imports, exports, syncs, backups });
}

async function handleUndoImport(event, payload) {
  const batchId = String(payload.batchId || "").trim();
  if (!batchId) return json(400, { error: "Choose an import batch to undo." });
  const auth = await requirePermission(event, "imports:rollback", { route: "dashboard-import-export", action: "undo-import", batchId });
  if (!auth.ok) return json(auth.statusCode, { error: auth.error });
  const batches = await safeRows(`import_batches?id=eq.${encodeURIComponent(batchId)}&select=*&limit=1`);
  const batch = batches[0];
  if (!batch) return json(404, { error: "Import batch was not found." });
  const createdAt = new Date(batch.created_at || Date.now()).getTime();
  if (Date.now() - createdAt > ROLLBACK_RETENTION_DAYS * 24 * 60 * 60 * 1000) {
    return json(409, { error: `Undo is only available for ${ROLLBACK_RETENTION_DAYS} days after import.` });
  }
  const changes = await safeRows(`import_changes?batch_id=eq.${encodeURIComponent(batchId)}&select=*&order=created_at.desc&limit=5000`);
  const result = { deleted: 0, restored: 0, conflicts: 0, skipped: 0 };
  for (const change of changes) {
    if (!change.table_name || !change.record_id) {
      result.skipped += 1;
      continue;
    }
    const currentRows = await safeRows(`${change.table_name}?id=eq.${encodeURIComponent(change.record_id)}&select=*&limit=1`);
    const current = currentRows[0];
    if (change.change_type === "create") {
      if (!current) {
        result.skipped += 1;
      } else {
        await supabaseAdminRequest(`${change.table_name}?id=eq.${encodeURIComponent(change.record_id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
        result.deleted += 1;
      }
    } else if (change.change_type === "update") {
      if (!current) {
        result.conflicts += 1;
      } else {
        const restored = { ...(change.old_value || {}), updated_at: new Date().toISOString() };
        delete restored.id;
        await supabaseAdminRequest(`${change.table_name}?id=eq.${encodeURIComponent(change.record_id)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(restored) });
        result.restored += 1;
      }
    }
  }
  await supabaseAdminRequest(`import_batches?id=eq.${encodeURIComponent(batchId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ rollback_status: result.conflicts ? "rolled_back_with_conflicts" : "rolled_back", rolled_back_by: auth.actor.userId || null, rolled_back_at: new Date().toISOString() })
  }).catch(() => null);
  await writeAuditLog({ actor: auth.actor, action: "import_rolled_back", entityType: "import_batches", entityId: batchId, metadata: result, event });
  return json(200, { ok: true, batchId, summary: result });
}

async function handleBackup(event, payload) {
  const auth = await requirePermission(event, "backups:download", { route: "dashboard-import-export", action: "backup" });
  if (!auth.ok) return json(auth.statusCode, { error: auth.error });
  const modules = listModules();
  const tables = {};
  for (const moduleInfo of modules) {
    const module = getModule(moduleInfo.key);
    tables[module.key] = await fetchModuleRows(module, Number(payload.limit || 10000));
  }
  const body = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    source: "Urban Yards Dashboard",
    modules: modules.map((item) => ({ key: item.key, table: item.table, fields: item.defaultExportColumns })),
    tables,
    checksums: Object.fromEntries(Object.entries(tables).map(([key, rows]) => [key, crypto.createHash("sha256").update(JSON.stringify(rows)).digest("hex")]))
  };
  await supabaseAdminRequest("backup_history", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ backup_type: "json", status: "complete", created_by: auth.actor.userId || null, created_by_email: auth.actor.email || null, module_counts: Object.fromEntries(Object.entries(tables).map(([key, rows]) => [key, rows.length])), completed_at: new Date().toISOString() })
  }).catch(() => null);
  await writeAuditLog({ actor: auth.actor, action: "backup_created", entityType: "backup_history", metadata: { modules: Object.keys(tables) }, event });
  return responseFile({ filename: `urban-yards-dashboard-backup-${new Date().toISOString().slice(0, 10)}.json`, contentType: "application/json; charset=utf-8", body: JSON.stringify(body, null, 2) });
}

function googleConfig(event) {
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URL || `${getSiteUrl(event)}/.netlify/functions/dashboard-import-export?action=google-callback`;
  return {
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || "",
    encryptionKey: process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || "",
    redirectUri
  };
}

function encryptToken(value, keyMaterial) {
  if (!value) return null;
  if (!keyMaterial) throw new Error("Google token encryption key is not configured.");
  const key = crypto.createHash("sha256").update(String(keyMaterial)).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

function decryptToken(value, keyMaterial) {
  if (!value) return "";
  const [ivText, tagText, encryptedText] = String(value).split(".");
  const key = crypto.createHash("sha256").update(String(keyMaterial)).digest();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivText, "base64"));
  decipher.setAuthTag(Buffer.from(tagText, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedText, "base64")), decipher.final()]).toString("utf8");
}

async function handleGoogleStart(event, payload) {
  const auth = await requirePermission(event, "sheets:manage", { route: "dashboard-import-export", action: "google-start" });
  if (!auth.ok) return json(auth.statusCode, { error: auth.error });
  const cfg = googleConfig(event);
  if (!cfg.clientId || !cfg.clientSecret || !cfg.encryptionKey) {
    return json(200, { ok: false, setupRequired: true, error: "Google Sheets is not configured yet. Add GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_TOKEN_ENCRYPTION_KEY, and GOOGLE_OAUTH_REDIRECT_URL in Netlify." });
  }
  const stateValue = crypto.randomUUID();
  await supabaseAdminRequest("google_connections", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ created_by: auth.actor.userId || null, created_by_email: auth.actor.email || null, status: "pending", oauth_state: stateValue })
  });
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: "code",
    scope: GOOGLE_SHEETS_SCOPE,
    access_type: "offline",
    prompt: payload.prompt || "consent",
    state: stateValue
  });
  return json(200, { ok: true, authorizationUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
}

async function handleGoogleCallback(event) {
  const cfg = googleConfig(event);
  const code = queryValue(event, "code");
  const stateValue = queryValue(event, "state");
  if (!code || !stateValue) return responseHtml("<p>Google Sheets connection was canceled or expired.</p>");
  if (!cfg.clientId || !cfg.clientSecret || !cfg.encryptionKey) return responseHtml("<p>Google Sheets is not configured. Close this window and update Netlify environment variables.</p>");
  const pendingRows = await safeRows(`google_connections?oauth_state=eq.${encodeURIComponent(stateValue)}&status=eq.pending&select=*&limit=1`);
  const pending = pendingRows[0];
  if (!pending) return responseHtml("<p>This Google Sheets connection link is expired or invalid.</p>");
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: cfg.clientId, client_secret: cfg.clientSecret, redirect_uri: cfg.redirectUri, grant_type: "authorization_code" }),
    signal: AbortSignal.timeout(10000)
  });
  const tokenPayload = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok) return responseHtml("<p>Google Sheets authorization failed. Please try connecting again.</p>");
  let accountEmail = "";
  if (tokenPayload.access_token) {
    const userInfo = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", { headers: { Authorization: `Bearer ${tokenPayload.access_token}` } }).then((r) => r.json()).catch(() => ({}));
    accountEmail = userInfo.email || "";
  }
  await supabaseAdminRequest(`google_connections?id=eq.${encodeURIComponent(pending.id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      status: "connected",
      account_email: accountEmail,
      access_token_encrypted: encryptToken(tokenPayload.access_token, cfg.encryptionKey),
      refresh_token_encrypted: encryptToken(tokenPayload.refresh_token, cfg.encryptionKey) || pending.refresh_token_encrypted,
      token_expires_at: tokenPayload.expires_in ? new Date(Date.now() + Number(tokenPayload.expires_in) * 1000).toISOString() : null,
      oauth_state: null,
      connected_at: new Date().toISOString()
    })
  });
  return responseHtml("<p>Google Sheets connected. You can close this window and return to Urban Yards.</p><script>setTimeout(()=>window.close(),1500)</script>");
}

async function handleGoogleStatus(event) {
  const auth = await requirePermission(event, "sheets:manage", { route: "dashboard-import-export", action: "google-status" });
  if (!auth.ok) return json(auth.statusCode, { error: auth.error });
  const rows = await safeRows(`google_connections?created_by=eq.${encodeURIComponent(auth.actor.userId || "none")}&select=id,account_email,status,connected_at,last_sync_at,created_at&order=created_at.desc&limit=5`);
  return json(200, { ok: true, connections: rows, configured: Boolean(googleConfig(event).clientId && googleConfig(event).clientSecret && googleConfig(event).encryptionKey) });
}

async function refreshGoogleToken(connection, cfg) {
  if (connection.token_expires_at && new Date(connection.token_expires_at).getTime() > Date.now() + 60000) {
    return decryptToken(connection.access_token_encrypted, cfg.encryptionKey);
  }
  const refreshToken = decryptToken(connection.refresh_token_encrypted, cfg.encryptionKey);
  if (!refreshToken) throw new Error("Google refresh token is missing. Reconnect Google Sheets.");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: cfg.clientId, client_secret: cfg.clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
    signal: AbortSignal.timeout(10000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("Google authorization expired. Reconnect Google Sheets.");
  await supabaseAdminRequest(`google_connections?id=eq.${encodeURIComponent(connection.id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ access_token_encrypted: encryptToken(payload.access_token, cfg.encryptionKey), token_expires_at: payload.expires_in ? new Date(Date.now() + Number(payload.expires_in) * 1000).toISOString() : null })
  }).catch(() => null);
  return payload.access_token;
}

async function handleGoogleExport(event, payload) {
  const module = getModule(payload.module);
  if (!module) return json(400, { error: "Choose a supported dashboard module." });
  const auth = await authForModule(event, module, "read");
  if (!auth.ok) return json(auth.statusCode, { error: auth.error });
  const cfg = googleConfig(event);
  if (!cfg.clientId || !cfg.clientSecret || !cfg.encryptionKey) return json(200, { ok: false, setupRequired: true, error: "Google Sheets is not configured yet." });
  const connectionRows = await safeRows(`google_connections?created_by=eq.${encodeURIComponent(auth.actor.userId || "none")}&status=eq.connected&select=*&order=connected_at.desc&limit=1`);
  const connection = connectionRows[0];
  if (!connection) return json(409, { error: "Connect Google Sheets first." });
  const accessToken = await refreshGoogleToken(connection, cfg);
  const records = await fetchModuleRows(module, 10000);
  const exported = exportRowsForModule(module, records);
  const sheetTitle = payload.worksheetName || module.pluralLabel || module.label;
  let spreadsheetId = payload.spreadsheetId || "";
  let spreadsheetUrl = "";
  if (!spreadsheetId) {
    const createResponse = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ properties: { title: payload.spreadsheetName || `Urban Yards ${module.label}` }, sheets: [{ properties: { title: sheetTitle } }] }),
      signal: AbortSignal.timeout(12000)
    });
    const created = await createResponse.json().catch(() => ({}));
    if (!createResponse.ok) throw new Error("Google Sheet could not be created.");
    spreadsheetId = created.spreadsheetId;
    spreadsheetUrl = created.spreadsheetUrl;
  }
  const values = [exported.columns, ...exported.rows.map((row) => exported.columns.map((column) => row[column] ?? ""))];
  const range = `${sheetTitle}!A1`;
  const updateResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?valueInputOption=RAW`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values }),
    signal: AbortSignal.timeout(15000)
  });
  if (!updateResponse.ok) throw new Error("Google Sheet could not be updated.");
  await supabaseAdminRequest("sync_runs", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ connection_id: connection.id, module: module.key, sync_type: "google_export", direction: "dashboard_to_sheet", status: "complete", rows_synced: records.length, started_at: new Date().toISOString(), completed_at: new Date().toISOString(), metadata: { spreadsheetId, sheetTitle } })
  }).catch(() => null);
  await writeAuditLog({ actor: auth.actor, action: "google_sheet_exported", entityType: module.table, metadata: { module: module.key, rows: records.length, spreadsheetId }, event });
  return json(200, { ok: true, spreadsheetId, spreadsheetUrl: spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`, rows: records.length });
}

function leadIntakeRowSource(row, headers) {
  const source = {};
  headers.forEach((header) => { source[canonicalHeader(header)] = row[header] ?? ""; });
  return source;
}

function leadIntakeCandidate(record, recordType) {
  const business = record.property_name || record.management_company || record.company || record.name || record.contact_name || "";
  const location = record.city || record.location || record.address || record.property || "";
  const phone = normalizeLeadPhone(record.phone_e164 || record.phone || record.phone_display || record.phone_number || "");
  return {
    recordType,
    recordId: record.id || "",
    business,
    location,
    phone: phone.display || record.phone || "",
    normalizedPhone: phone.normalized,
    normalizedBusiness: normalizeBusiness(business),
    normalizedLocation: normalizeLocation(location)
  };
}

async function leadIntakeExistingCandidates() {
  const [prospects, contacts, clients, staged] = await Promise.all([
    safeRows("outreach_prospects?select=id,property_name,management_company,city,address,phone&order=updated_at.desc&limit=500"),
    safeRows("contacts?select=id,name,company,city,address,phone,phone_e164,phone_display&order=updated_at.desc&limit=500"),
    safeRows("clients?select=id,name,company,city,address,phone&order=updated_at.desc&limit=250"),
    safeRows("import_rows?select=id,batch_id,normalized_data,status&status=in.(new_unique,possible_duplicate,definite_duplicate)&order=created_at.desc&limit=500")
  ]);
  return [
    ...prospects.map((row) => leadIntakeCandidate(row, "lead")),
    ...contacts.map((row) => leadIntakeCandidate(row, "contact")),
    ...clients.map((row) => leadIntakeCandidate(row, "client")),
    ...staged.map((row) => ({
      recordType: "staged import",
      recordId: row.id,
      batchId: row.batch_id,
      business: row.normalized_data?.original?.business || "",
      location: row.normalized_data?.original?.location || "",
      phone: row.normalized_data?.normalized?.phone_display || "",
      normalizedPhone: row.normalized_data?.normalized?.phone_number || "",
      normalizedBusiness: row.normalized_data?.normalized?.business || "",
      normalizedLocation: row.normalized_data?.normalized?.location || ""
    }))
  ].filter((row) => row.normalizedPhone || row.normalizedBusiness);
}

async function handleLeadIntakeTemplate(event) {
  const auth = await requirePermission(event, "imports:read", { route: "dashboard-import-export", action: "lead-intake-template" });
  if (!auth.ok) return json(auth.statusCode, { error: auth.error });
  const body = rowsToCsv([
    { business: "Rose City Apartments", type: "Apartment Community", location: "Portland OR", phone_number: "503-555-0123", source: "ChatGPT" },
    { business: "Evergreen Property Management", type: "Property Management", location: "Beaverton OR", phone_number: "503-555-0187", source: "Claude" },
    { business: "Columbia Office Center", type: "Commercial Property", location: "Vancouver WA", phone_number: "360-555-0144", source: "Research" }
  ], ["business", "type", "location", "phone_number", "source"]);
  return responseFile({ filename: "urban-yards-lead-intake-template.csv", contentType: "text/csv; charset=utf-8", body });
}

async function handleLeadIntakePreview(event, payload) {
  const auth = await requirePermission(event, "imports:write", { route: "dashboard-import-export", action: "lead-intake-preview" });
  if (!auth.ok) return json(auth.statusCode, { error: auth.error });
  if (!/\.csv$/i.test(String(payload.filename || ""))) return json(400, { error: "Lead Intake accepts .csv files only." });
  const parsed = await parseImportSource({ ...payload, format: "csv" });
  const headerCheck = validateLeadHeaders(parsed.headers);
  if (!headerCheck.valid) {
    const details = [headerCheck.missing.length ? `Missing required headers: ${headerCheck.missing.join(", ")}.` : "", headerCheck.duplicates.length ? `Duplicate headers: ${headerCheck.duplicates.join(", ")}.` : ""].filter(Boolean).join(" ");
    return json(400, { error: `${details} Use: business,type,location,phone_number with optional source.` });
  }
  if (!parsed.rows.length) return json(400, { error: "The CSV has columns but no actual records." });
  const normalized = parsed.rows.map((row) => normalizeLeadRecord(leadIntakeRowSource(row, parsed.headers), row._rowNumber));
  const candidates = await leadIntakeExistingCandidates();
  const reviewed = classifyLeadRecords(normalized, candidates);
  const summary = summarizeLeadRecords(reviewed);
  const sources = [...new Set(reviewed.map((row) => row.original.source).filter(Boolean))];
  const defaultName = `${sources[0] || String(payload.filename || "Lead list").replace(/\.csv$/i, "")} — ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
  const batches = await supabaseAdminRequest("import_batches", {
    method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({
      module: "lead_intake", table_name: "outreach_prospects", source_type: "csv", source_name: String(payload.filename || "lead-list.csv").slice(0, 240), file_name: String(payload.filename || "lead-list.csv").slice(0, 240), status: "preview",
      created_by: auth.actor.userId || null, created_by_email: auth.actor.email || null, total_rows: summary.total,
      duplicate_count: summary.definiteDuplicates + summary.possibleDuplicates, rejected_count: summary.invalid,
      metadata: { name: String(payload.batchName || defaultName).slice(0, 240), sources, summary, stage: "awaiting_review" }
    })
  });
  const batch = Array.isArray(batches) ? batches[0] : batches;
  for (let index = 0; index < reviewed.length; index += 200) {
    const chunk = reviewed.slice(index, index + 200).map((row) => ({
      batch_id: batch.id, row_number: row.rowNumber, status: row.duplicateStatus, action_type: row.reviewAction,
      source_data: row.original, normalized_data: row, errors: row.errors, warnings: row.match ? [row.match.reason] : [], message: row.match?.reason || ""
    }));
    await supabaseAdminRequest("import_rows", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(chunk) });
  }
  await writeAuditLog({ actor: auth.actor, action: "lead_intake_uploaded", entityType: "import_batches", entityId: batch.id, metadata: summary, event });
  return json(200, { ok: true, batch: { ...batch, metadata: { ...(batch.metadata || {}), summary } }, summary });
}

async function handleLeadIntakeBatches(event, payload) {
  const auth = await requirePermission(event, "imports:read", { route: "dashboard-import-export", action: "lead-intake-batches" });
  if (!auth.ok) return json(auth.statusCode, { error: auth.error });
  const batchId = String(payload.batchId || "").trim();
  const batches = await safeRows(batchId
    ? `import_batches?id=eq.${encodeURIComponent(batchId)}&module=eq.lead_intake&select=*&limit=1`
    : "import_batches?module=eq.lead_intake&select=*&order=created_at.desc&limit=20");
  let rows = [];
  if (batchId && batches[0]) rows = await safeRows(`import_rows?batch_id=eq.${encodeURIComponent(batchId)}&select=*&order=row_number.asc&limit=2000`);
  return json(200, { ok: true, batches, batch: batches[0] || null, rows });
}

async function handleLeadIntakeReview(event, payload) {
  const auth = await requirePermission(event, "imports:write", { route: "dashboard-import-export", action: "lead-intake-review" });
  if (!auth.ok) return json(auth.statusCode, { error: auth.error });
  const rowId = String(payload.rowId || "").trim();
  const rowIds = Array.isArray(payload.rowIds) ? payload.rowIds.map((id) => String(id || "").trim()).filter(Boolean).slice(0, 2000) : [];
  const action = String(payload.reviewAction || "").trim();
  const allowed = new Set(["approve", "keep_existing", "use_imported", "merge_missing", "keep_both", "skip", "exclude", "unresolved"]);
  if ((!rowId && !rowIds.length) || !allowed.has(action)) return json(400, { error: "Choose a valid review action." });
  const ids = rowIds.length ? rowIds : [rowId];
  for (let index = 0; index < ids.length; index += 100) {
    const chunk = ids.slice(index, index + 100);
    await supabaseAdminRequest(`import_rows?id=in.(${chunk.map((id) => encodeURIComponent(id)).join(",")})`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ action_type: action }) });
  }
  await writeAuditLog({ actor: auth.actor, action: "lead_intake_row_reviewed", entityType: "import_rows", entityId: rowId || null, metadata: { reviewAction: action, rowCount: ids.length }, event });
  return json(200, { ok: true });
}

function leadInsertFromImport(row, batch, actor) {
  const original = row.normalized_data?.original || row.source_data || {};
  const normalized = row.normalized_data?.normalized || {};
  return {
    property_name: original.business || null, management_company: original.business || null, property_type: original.type || "Other",
    city: original.location || null, phone: normalized.phone_display || original.phone_number || null,
    source: original.source || "Lead Intake", status: "Prospect", priority: "Normal", service_interest: "General Property Care",
    notes: null, last_contacted_at: null, next_follow_up_at: null
  };
}

async function handleLeadIntakeApprove(event, payload) {
  const auth = await requirePermission(event, "imports:write", { route: "dashboard-import-export", action: "lead-intake-approve" });
  if (!auth.ok) return json(auth.statusCode, { error: auth.error });
  const batchId = String(payload.batchId || "").trim();
  const batches = await safeRows(`import_batches?id=eq.${encodeURIComponent(batchId)}&module=eq.lead_intake&select=*&limit=1`);
  const batch = batches[0];
  if (!batch) return json(404, { error: "Import batch was not found." });
  if (!["preview", "completed_with_warnings"].includes(batch.status)) return json(409, { error: "This import batch has already been completed or cancelled." });
  const rows = await safeRows(`import_rows?batch_id=eq.${encodeURIComponent(batchId)}&select=*&order=row_number.asc&limit=2000`);
  const creatable = rows.filter((row) => ["approve", "keep_both"].includes(row.action_type) && row.status !== "invalid");
  const mergeable = rows.filter((row) => ["use_imported", "merge_missing"].includes(row.action_type) && row.normalized_data?.match?.recordType === "lead" && row.normalized_data?.match?.recordId);
  if (!creatable.length && !mergeable.length) return json(409, { error: "No reviewed prospects are approved for the Call Queue." });
  let updatedCount = 0;
  for (const row of mergeable) {
    const matchId = row.normalized_data.match.recordId;
    const existingRows = await safeRows(`outreach_prospects?id=eq.${encodeURIComponent(matchId)}&select=*&limit=1`);
    const existing = existingRows[0];
    if (!existing) continue;
    const imported = leadInsertFromImport(row, batch, auth.actor);
    const patch = {};
    Object.entries(imported).forEach(([key, value]) => {
      if (value === null || value === "") return;
      if (row.action_type === "use_imported" || existing[key] === null || existing[key] === "" || existing[key] === undefined) patch[key] = value;
    });
    if (!Object.keys(patch).length) continue;
    const updatedRows = await supabaseAdminRequest(`outreach_prospects?id=eq.${encodeURIComponent(matchId)}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch) });
    const updated = Array.isArray(updatedRows) ? updatedRows[0] : updatedRows;
    await supabaseAdminRequest("import_changes", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ batch_id: batch.id, module: "lead_intake", table_name: "outreach_prospects", record_id: matchId, change_type: "update", old_value: existing, new_value: updated, changed_fields: Object.keys(patch) }) }).catch(() => null);
    await supabaseAdminRequest(`import_rows?id=eq.${encodeURIComponent(row.id)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "updated", message: `${row.action_type === "merge_missing" ? "Filled missing information on" : "Updated"} existing lead ${matchId}.` }) });
    updatedCount += 1;
  }
  const inserts = creatable.map((row) => leadInsertFromImport(row, batch, auth.actor));
  const created = inserts.length ? await supabaseAdminRequest("outreach_prospects", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(inserts) }) : [];
  const createdRows = Array.isArray(created) ? created : created ? [created] : [];
  for (let index = 0; index < createdRows.length; index += 1) {
    const lead = createdRows[index];
    const sourceRow = creatable[index];
    await supabaseAdminRequest("import_changes", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ batch_id: batch.id, module: "lead_intake", table_name: "outreach_prospects", record_id: lead.id, change_type: "create", old_value: null, new_value: lead, changed_fields: Object.keys(inserts[index]) }) }).catch(() => null);
    await supabaseAdminRequest(`import_rows?id=eq.${encodeURIComponent(sourceRow.id)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "created", message: `Approved as lead ${lead.id}.` }) });
  }
  const skipped = rows.length - createdRows.length - updatedCount;
  const batchName = String(payload.batchName || batch.metadata?.name || batch.source_name || "Lead Intake batch").trim().slice(0, 240);
  await supabaseAdminRequest(`import_batches?id=eq.${encodeURIComponent(batch.id)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: skipped ? "completed_with_warnings" : "complete", created_count: createdRows.length, updated_count: updatedCount, success_count: createdRows.length + updatedCount, skipped_count: skipped, completed_at: new Date().toISOString(), metadata: { ...(batch.metadata || {}), name: batchName, stage: "approved", approvedAt: new Date().toISOString(), approvedBy: auth.actor.email || "", approvedCount: createdRows.length, updatedCount } }) });
  await writeAuditLog({ actor: auth.actor, action: "lead_intake_approved", entityType: "import_batches", entityId: batch.id, metadata: { approved: createdRows.length, updated: updatedCount, skipped }, event });
  return json(200, { ok: true, approved: createdRows.length, updated: updatedCount, skipped });
}

async function handleLeadIntakeCancel(event, payload) {
  const auth = await requirePermission(event, "imports:write", { route: "dashboard-import-export", action: "lead-intake-cancel" });
  if (!auth.ok) return json(auth.statusCode, { error: auth.error });
  const batchId = String(payload.batchId || "").trim();
  await supabaseAdminRequest(`import_batches?id=eq.${encodeURIComponent(batchId)}&module=eq.lead_intake&status=eq.preview`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "archived", archived_at: new Date().toISOString(), metadata: { stage: "cancelled" } }) });
  await writeAuditLog({ actor: auth.actor, action: "lead_intake_cancelled", entityType: "import_batches", entityId: batchId, event });
  return json(200, { ok: true });
}

async function handleLeadIntakeUndo(event, payload) {
  const auth = await requirePermission(event, "imports:rollback", { route: "dashboard-import-export", action: "lead-intake-undo" });
  if (!auth.ok) return json(auth.statusCode, { error: auth.error });
  const batchId = String(payload.batchId || "").trim();
  const changes = await safeRows(`import_changes?batch_id=eq.${encodeURIComponent(batchId)}&module=eq.lead_intake&change_type=eq.create&select=*&limit=2000`);
  const result = { removed: 0, blocked: [] };
  for (const change of changes) {
    const leads = await safeRows(`outreach_prospects?id=eq.${encodeURIComponent(change.record_id)}&select=*&limit=1`);
    const lead = leads[0];
    if (!lead) continue;
    const activity = await safeRows(`lead_activity?lead_type=eq.outreach_prospect&lead_id=eq.${encodeURIComponent(lead.id)}&select=id&limit=1`);
    const check = canUndoLead({ lead, activity });
    if (!check.allowed) { result.blocked.push({ id: lead.id, business: lead.property_name || lead.management_company || "Lead", reasons: check.blocked }); continue; }
    await supabaseAdminRequest(`outreach_prospects?id=eq.${encodeURIComponent(lead.id)}`, { method: "DELETE" });
    result.removed += 1;
  }
  await supabaseAdminRequest(`import_batches?id=eq.${encodeURIComponent(batchId)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ rollback_status: result.blocked.length ? "rolled_back_with_conflicts" : "rolled_back", rolled_back_by: auth.actor.userId || null, rolled_back_at: new Date().toISOString() }) }).catch(() => null);
  await writeAuditLog({ actor: auth.actor, action: "lead_intake_undone", entityType: "import_batches", entityId: batchId, metadata: result, event });
  return json(200, { ok: true, ...result });
}

exports.handler = async (event) => {
  const requestId = requestIdFromEvent(event);
  const action = queryValue(event, "action") || parseJsonBody(event).action || (event.httpMethod === "GET" ? "registry" : "");
  const limit = rateLimit(`dashboard-import-export:${ipFromEvent(event)}`, 80, 10 * 60 * 1000);
  if (!limit.allowed) return json(429, { error: "Too many import/export requests. Please try again later.", requestId }, { "Retry-After": String(limit.retryAfter) });

  let actor = null;
  try {
    if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: { Allow: "GET,POST,OPTIONS" }, body: "" };
    if (action === "google-callback") return handleGoogleCallback(event);
    const payload = parseJsonBody(event);
    if (action === "registry") return handleRegistry(event);
    if (action === "export") return handleExport(event, payload, actor);
    if (action === "template") return handleTemplate(event, payload);
    if (action === "contact-workbook") return handleContactWorkbook(event, payload);
    if (action === "preview-import") return handlePreview(event, payload);
    if (action === "confirm-import") return handleConfirmImport(event, payload);
    if (action === "history") return handleHistory(event);
    if (action === "undo-import") return handleUndoImport(event, payload);
    if (action === "backup") return handleBackup(event, payload);
    if (action === "google-start") return handleGoogleStart(event, payload);
    if (action === "google-status") return handleGoogleStatus(event);
    if (action === "google-export") return handleGoogleExport(event, payload);
    if (action === "lead-intake-template") return handleLeadIntakeTemplate(event);
    if (action === "lead-intake-preview") return handleLeadIntakePreview(event, payload);
    if (action === "lead-intake-batches") return handleLeadIntakeBatches(event, payload);
    if (action === "lead-intake-review") return handleLeadIntakeReview(event, payload);
    if (action === "lead-intake-approve") return handleLeadIntakeApprove(event, payload);
    if (action === "lead-intake-cancel") return handleLeadIntakeCancel(event, payload);
    if (action === "lead-intake-undo") return handleLeadIntakeUndo(event, payload);
    return json(400, { error: "Unsupported import/export action.", requestId });
  } catch (error) {
    await writeSystemError({ route: "dashboard-import-export", error, actor, metadata: { action } });
    const statusCode = error.statusCode || 500;
    return json(statusCode, { error: safeError(statusCode < 500 ? error.message : "Import/export request failed."), requestId });
  }
};
