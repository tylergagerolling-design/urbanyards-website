const crypto = require("node:crypto");

const OUTREACH_STATUSES = ["Prospect", "Researched", "Contacted", "Follow-Up Needed", "Interested", "Quote Needed", "Quoted", "Won", "Lost / No Fit"];
const OUTREACH_PROPERTY_TYPES = ["Apartment", "HOA", "Small Commercial", "Mixed-Use", "Residential", "Property Management", "Other"];
const OUTREACH_SERVICE_INTERESTS = ["Seasonal Cleanup", "Trash Area Care", "Day Porter / Groundskeeping", "Mulch / Bed Refresh", "Apartment Turnover Cleaning", "Repair / Touch-Up", "Lawn Care", "Shrub / Hedge Trimming", "General Property Care", "Other"];
const PRIORITIES = ["High", "Normal", "Low"];
const JOB_STATUSES = ["New", "Contacted", "Scheduled", "Completed", "Invoiced"];
const EQUIPMENT_STATUSES = ["Ready", "In Use", "Needs Maintenance", "Needs Repair", "Missing", "Retired"];
const EQUIPMENT_CONDITIONS = ["New", "Good", "Fair", "Needs Repair", "Replace Soon", "Retired"];
const DOCUMENT_STATUSES = ["Draft", "Sent", "Viewed", "Accepted", "Paid", "Canceled", "Overdue"];
const BUDGET_STATUSES = ["Draft", "Ready for Review", "Approved", "Active", "At Risk", "Over Budget", "Completed", "Archived"];
const BUDGET_JOB_STATUSES = ["Not Scheduled", "Scheduled", "In Progress", "Completed", "Invoiced"];
const BUDGET_COST_CATEGORIES = ["Disposal and dump fees", "Delivery fees", "Mileage", "Travel time", "Parking", "Permits", "Subcontractors", "Equipment rentals", "Payment processing fees", "Administrative costs", "Miscellaneous expenses", "Contingency"];
const BUDGET_MATERIAL_CATEGORIES = ["Plants", "Mulch", "Soil", "Gravel", "Fertilizer", "Cleaning supplies", "Hardware", "Replacement parts", "Consumables", "Other"];
const BUDGET_EQUIPMENT_USAGE_TYPES = ["Owned", "Rental", "Vehicle", "Fuel", "Wear Allowance", "Maintenance Allocation", "Other"];
const BUDGET_CHANGE_ORDER_STATUSES = ["Draft", "Sent", "Approved", "Declined", "Completed", "Invoiced"];
const CONTACT_TYPES = ["Property Manager", "Assistant Property Manager", "Community Manager", "Maintenance Manager", "Facilities Manager", "Building Manager", "Owner", "Vendor Contact", "Leasing Contact", "Homeowner", "HOA Contact", "Other"];
const CONTACT_METHODS = ["Phone", "Email", "Text", "No Preference"];
const CALL_OUTCOME_VALUES = ["Not Called", "No Answer", "Left Voicemail", "Spoke With Contact", "Wrong Number", "Call Back Requested", "Send Information", "Not Interested", "Interested", "Quote Requested", "Follow-Up Needed"];
const US_STATES = ["OR", "WA", "CA", "ID", "AK", "AL", "AR", "AZ", "CO", "CT", "DC", "DE", "FL", "GA", "HI", "IA", "IL", "IN", "KS", "KY", "LA", "MA", "MD", "ME", "MI", "MN", "MO", "MS", "MT", "NC", "ND", "NE", "NH", "NJ", "NM", "NV", "NY", "OH", "OK", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VA", "VT", "WI", "WV", "WY"];

function field(key, label, type = "text", options = {}) {
  return {
    key,
    label,
    type,
    aliases: options.aliases || [],
    required: Boolean(options.required),
    export: options.export !== false,
    import: options.import !== false,
    enum: options.enum || null,
    defaultValue: options.defaultValue,
    readOnly: Boolean(options.readOnly),
    allowFormulaText: Boolean(options.allowFormulaText),
    phoneParts: options.phoneParts || null,
    width: options.width || null
  };
}

const MODULES = {
  contacts: {
    key: "contacts",
    label: "Contacts",
    pluralLabel: "Contacts",
    table: "contacts",
    permissionArea: "clients",
    description: "Clients, property owners, and customer contact records.",
    uniqueBy: [["email"], ["phone"], ["phone_e164"], ["name", "company"], ["name", "property"], ["name", "address"]],
    fields: [
      field("id", "Record ID", "uuid", { import: true, export: true, readOnly: true, aliases: ["record id", "contact id", "id"] }),
      field("first_name", "First Name", "text", { aliases: ["first"] }),
      field("last_name", "Last Name", "text", { aliases: ["last", "surname"] }),
      field("name", "Contact Name", "text", { required: true, aliases: ["name", "client", "client name", "contact", "contact name", "full name"] }),
      field("job_title", "Job Title", "text", { aliases: ["title", "role"] }),
      field("company", "Company", "text", { aliases: ["management company", "owner group", "business"] }),
      field("property", "Property", "text", { aliases: ["property name", "site", "location"] }),
      field("email", "Email", "email", { aliases: ["email address"] }),
      field("phone", "Primary Phone", "phone", {
        aliases: ["phone", "phone number", "telephone", "mobile", "primary phone"],
        phoneParts: { display: "phone_display", e164: "phone_e164", extension: "phone_extension", countryCode: "phone_country_code" }
      }),
      field("secondary_phone", "Secondary Phone", "phone", { aliases: ["alternate phone", "alt phone", "second phone"] }),
      field("phone_extension", "Phone Extension", "text", { aliases: ["extension", "ext"] }),
      field("phone_display", "Phone Display", "text", { aliases: ["original phone", "display phone"] }),
      field("phone_e164", "Normalized Phone", "phone", { aliases: ["e164 phone", "normalized phone"], export: false }),
      field("phone_country_code", "Country Code", "text", { aliases: ["country"] }),
      field("address", "Address", "text", { aliases: ["property address", "street address"] }),
      field("city", "City", "text", { aliases: ["service area", "area"] }),
      field("state", "State", "enum", { enum: US_STATES }),
      field("zip", "ZIP Code", "text", { aliases: ["zip", "zipcode", "postal code"] }),
      field("service", "Service", "text", { aliases: ["service needed", "scope", "service interest"] }),
      field("contact_type", "Contact Type", "enum", { enum: CONTACT_TYPES, defaultValue: "Other", aliases: ["client type", "type"] }),
      field("preferred_contact_method", "Preferred Contact Method", "enum", { enum: CONTACT_METHODS, defaultValue: "No Preference", aliases: ["preferred method", "contact method"] }),
      field("status", "Status", "text", { aliases: ["stage"], defaultValue: "New" }),
      field("priority", "Priority", "enum", { enum: PRIORITIES, defaultValue: "Normal" }),
      field("assigned_user", "Assigned User", "text", { aliases: ["assigned to", "owner"] }),
      field("last_contacted_at", "Last Contacted", "date", { aliases: ["last contacted", "last contact"] }),
      field("next_follow_up_at", "Next Follow-Up", "date", { aliases: ["follow up", "follow-up", "next follow up"] }),
      field("call_outcome", "Call Outcome", "enum", { enum: CALL_OUTCOME_VALUES, defaultValue: "Not Called", aliases: ["last call outcome", "outcome"] }),
      field("notes", "Notes", "textarea", { aliases: ["details", "comments"] }),
      field("source", "Source", "text", { aliases: ["lead source", "where found"] }),
      field("created_at", "Created At", "datetime", { import: false }),
      field("updated_at", "Updated At", "datetime", { import: false })
    ],
    requireAny: [["name", "company"], ["email", "phone", "address", "city"]]
  },
  contact_call_list: {
    key: "contact_call_list",
    label: "Call List",
    pluralLabel: "Call List",
    table: "contacts",
    permissionArea: "clients",
    description: "Round-trip contact call list with outcome, notes, and follow-up updates.",
    uniqueBy: [["id"], ["phone"], ["phone_e164"], ["email"], ["name", "company"], ["phone", "company"]],
    fields: [
      field("id", "Record ID", "uuid", { import: true, export: true, readOnly: true, aliases: ["record id", "contact id", "id"] }),
      field("name", "Contact Name", "text", { required: true, aliases: ["name", "contact", "client"] }),
      field("company", "Company", "text", { aliases: ["management company", "business"] }),
      field("property", "Property", "text", { aliases: ["property name", "site"] }),
      field("phone", "Phone Number", "phone", {
        aliases: ["phone", "primary phone", "phone number"],
        phoneParts: { display: "phone_display", e164: "phone_e164", extension: "phone_extension", countryCode: "phone_country_code" }
      }),
      field("phone_extension", "Phone Extension", "text", { aliases: ["extension", "ext"] }),
      field("email", "Email", "email", { aliases: ["email address"] }),
      field("status", "Status", "text", { defaultValue: "New" }),
      field("priority", "Priority", "enum", { enum: PRIORITIES, defaultValue: "Normal" }),
      field("last_contacted_at", "Last Contacted", "date", { aliases: ["last contacted"] }),
      field("next_follow_up_at", "Next Follow-Up", "date", { aliases: ["next follow up", "follow up", "follow-up"] }),
      field("call_outcome", "Call Outcome", "enum", { enum: CALL_OUTCOME_VALUES, defaultValue: "Not Called", aliases: ["outcome"] }),
      field("call_notes", "Call Notes", "textarea", { aliases: ["call note", "notes from call"] }),
      field("assigned_user", "Assigned User", "text", { aliases: ["assigned to"] }),
      field("notes", "Notes", "textarea", { aliases: ["contact notes", "general notes"] }),
      field("source", "Source", "text", { defaultValue: "Call List Workbook" }),
      field("created_at", "Created At", "datetime", { import: false }),
      field("updated_at", "Updated At", "datetime", { import: false })
    ],
    requireAny: [["name"], ["phone", "email"]]
  },
  jobs: {
    key: "jobs",
    label: "Jobs",
    pluralLabel: "Jobs",
    table: "scheduled_jobs",
    permissionArea: "appointments",
    description: "Scheduled visits, jobs, tasks, and reminders.",
    uniqueBy: [["visit_date", "title", "property"]],
    fields: [
      field("id", "Record ID", "uuid", { readOnly: true, aliases: ["job id", "appointment id", "id"] }),
      field("visit_date", "Visit Date", "date", { required: true, aliases: ["date", "job date", "scheduled date"] }),
      field("time_window", "Time Window", "text", { aliases: ["time", "start time", "window"] }),
      field("title", "Client / Title", "text", { required: true, aliases: ["client", "client name", "job", "task", "reminder"] }),
      field("property", "Property / Area", "text", { aliases: ["property", "address", "area", "location"] }),
      field("type", "Type", "text", { aliases: ["job type", "service"] }),
      field("status", "Status", "enum", { enum: JOB_STATUSES, defaultValue: "Scheduled", aliases: ["stage"] }),
      field("notes", "Notes", "textarea"),
      field("created_at", "Created At", "datetime", { import: false }),
      field("updated_at", "Updated At", "datetime", { import: false })
    ]
  },
  followups: {
    key: "followups",
    label: "Follow-ups",
    pluralLabel: "Follow-ups",
    table: "follow_up_reminders",
    permissionArea: "appointments",
    description: "Follow-up reminders and next actions.",
    uniqueBy: [["due_date", "title", "contact_id"]],
    fields: [
      field("id", "Record ID", "uuid", { readOnly: true, aliases: ["follow up id", "follow-up id", "id"] }),
      field("title", "Title", "text", { required: true, aliases: ["task", "follow up", "follow-up"] }),
      field("due_date", "Due Date", "date", { required: true, aliases: ["date", "follow up date", "follow-up date"] }),
      field("contact_id", "Contact ID", "uuid", { aliases: ["client id"] }),
      field("status", "Status", "text", { aliases: ["stage"] }),
      field("notes", "Notes", "textarea"),
      field("created_at", "Created At", "datetime", { import: false }),
      field("updated_at", "Updated At", "datetime", { import: false })
    ]
  },
  outreach_prospects: {
    key: "outreach_prospects",
    label: "Prospects",
    pluralLabel: "Prospects",
    table: "outreach_prospects",
    permissionArea: "leads",
    description: "Lead/prospect records from outreach.",
    uniqueBy: [["email"], ["phone"], ["property_name", "address"], ["management_company", "contact_name"]],
    fields: [
      field("id", "Record ID", "uuid", { readOnly: true, aliases: ["prospect id", "lead id", "id"] }),
      field("property_name", "Property Name", "text", { aliases: ["property", "location name", "site"] }),
      field("management_company", "Company", "text", { aliases: ["management company", "company", "owner group"] }),
      field("contact_name", "Contact", "text", { aliases: ["contact name", "name", "person"] }),
      field("email", "Email", "email", { aliases: ["email address"] }),
      field("phone", "Phone", "phone", { aliases: ["phone number", "telephone"] }),
      field("address", "Address", "text", { aliases: ["property address", "street address", "location"] }),
      field("city", "City", "text", { aliases: ["area"] }),
      field("property_type", "Type", "enum", { enum: OUTREACH_PROPERTY_TYPES, defaultValue: "Other", aliases: ["property type", "type"] }),
      field("service_interest", "Service", "enum", { enum: OUTREACH_SERVICE_INTERESTS, defaultValue: "General Property Care", aliases: ["service", "service interest", "need", "scope"] }),
      field("source", "Source", "text", { aliases: ["lead source", "where found"] }),
      field("status", "Status", "enum", { enum: OUTREACH_STATUSES, defaultValue: "Prospect", aliases: ["pipeline status", "stage"] }),
      field("last_contacted_at", "Last Contacted", "date", { aliases: ["last contacted", "last contact"] }),
      field("next_follow_up_at", "Follow-Up Date", "date", { aliases: ["next follow up", "follow up", "follow-up", "followup"] }),
      field("notes", "Notes", "textarea", { aliases: ["details", "summary"] }),
      field("priority", "Priority", "enum", { enum: PRIORITIES, defaultValue: "Normal", aliases: ["importance"] }),
      field("created_at", "Created At", "datetime", { import: false }),
      field("updated_at", "Updated At", "datetime", { import: false })
    ],
    requireAny: [["property_name", "contact_name", "management_company"], ["email", "phone", "address", "city"]]
  },
  outreach_companies: {
    key: "outreach_companies",
    label: "Companies",
    pluralLabel: "Companies",
    table: "outreach_companies",
    permissionArea: "leads",
    description: "Property management companies and owner groups.",
    uniqueBy: [["company"], ["email"], ["phone"]],
    fields: [
      field("id", "Record ID", "uuid", { readOnly: true, aliases: ["company id", "id"] }),
      field("company", "Company", "text", { required: true, aliases: ["company name", "management company", "owner group"] }),
      field("contact", "Contact", "text", { aliases: ["contact name", "person"] }),
      field("email", "Email", "email", { aliases: ["email address"] }),
      field("phone", "Phone", "phone", { aliases: ["phone number", "telephone"] }),
      field("website", "Website", "url", { aliases: ["site", "url"] }),
      field("service_area", "Service Area", "text", { aliases: ["city", "area"] }),
      field("service", "Service", "enum", { enum: OUTREACH_SERVICE_INTERESTS, defaultValue: "General Property Care" }),
      field("source", "Source", "text"),
      field("source_url", "Source URL", "url", { aliases: ["source url"] }),
      field("status", "Status", "enum", { enum: OUTREACH_STATUSES, defaultValue: "Prospect" }),
      field("follow_up", "Follow-Up Date", "date", { aliases: ["follow up", "follow-up"] }),
      field("notes", "Notes", "textarea"),
      field("priority", "Priority", "enum", { enum: PRIORITIES, defaultValue: "Normal" }),
      field("created_at", "Created At", "datetime", { import: false }),
      field("updated_at", "Updated At", "datetime", { import: false })
    ]
  },
  outreach_properties: {
    key: "outreach_properties",
    label: "Properties",
    pluralLabel: "Properties",
    table: "outreach_properties",
    permissionArea: "leads",
    description: "Property-level outreach locations.",
    uniqueBy: [["address"], ["property_name", "company"]],
    fields: [
      field("id", "Record ID", "uuid", { readOnly: true, aliases: ["property id", "location id", "id"] }),
      field("property_name", "Property Name", "text", { aliases: ["property", "location name", "site"] }),
      field("company", "Company", "text", { aliases: ["management company", "owner group"] }),
      field("address", "Address", "text", { aliases: ["property address", "street address", "location"] }),
      field("city", "City", "text", { aliases: ["area"] }),
      field("state", "State", "text"),
      field("zip", "ZIP", "text", { aliases: ["zipcode", "postal code"] }),
      field("neighborhood", "Neighborhood", "text"),
      field("property_type", "Type", "enum", { enum: OUTREACH_PROPERTY_TYPES, defaultValue: "Other", aliases: ["type", "property type"] }),
      field("estimated_units", "Estimated Units", "integer", { aliases: ["units"] }),
      field("service_fit", "Service Fit", "text", { aliases: ["service fit"] }),
      field("service", "Service", "enum", { enum: OUTREACH_SERVICE_INTERESTS, defaultValue: "General Property Care" }),
      field("visible_needs", "Visible Needs", "textarea", { aliases: ["visible needs"] }),
      field("source", "Source", "text"),
      field("source_url", "Source URL", "url", { aliases: ["source url"] }),
      field("google_maps_url", "Google Maps URL", "url", { aliases: ["google maps url"] }),
      field("verified_at", "Verified At", "date", { aliases: ["verified at"] }),
      field("status", "Status", "enum", { enum: OUTREACH_STATUSES, defaultValue: "Prospect" }),
      field("follow_up", "Follow-Up Date", "date", { aliases: ["follow up", "follow-up"] }),
      field("notes", "Notes", "textarea"),
      field("priority", "Priority", "enum", { enum: PRIORITIES, defaultValue: "Normal" }),
      field("lat", "Latitude", "decimal", { import: false }),
      field("lng", "Longitude", "decimal", { import: false }),
      field("created_at", "Created At", "datetime", { import: false }),
      field("updated_at", "Updated At", "datetime", { import: false })
    ],
    requireAny: [["property_name", "company"], ["address", "city"]]
  },
  equipment: {
    key: "equipment",
    label: "Equipment",
    pluralLabel: "Equipment",
    table: "equipment_items",
    permissionArea: "equipment",
    description: "Equipment inventory and tool status.",
    uniqueBy: [["name", "category"], ["serial_number"]],
    fields: [
      field("id", "Record ID", "uuid", { readOnly: true, aliases: ["equipment id", "item id", "id"] }),
      field("name", "Name", "text", { required: true, aliases: ["item", "tool", "equipment"] }),
      field("category", "Category", "text"),
      field("status", "Status", "enum", { enum: EQUIPMENT_STATUSES, defaultValue: "Ready" }),
      field("condition", "Condition", "enum", { enum: EQUIPMENT_CONDITIONS, defaultValue: "Good" }),
      field("serial_number", "Serial Number", "text", { aliases: ["serial", "asset tag"] }),
      field("purchase_date", "Purchase Date", "date", { aliases: ["bought date"] }),
      field("purchase_price", "Purchase Price", "currency", { aliases: ["price", "cost"] }),
      field("next_maintenance_date", "Next Maintenance Date", "date", { aliases: ["maintenance date", "next service"] }),
      field("notes", "Notes", "textarea"),
      field("created_at", "Created At", "datetime", { import: false }),
      field("updated_at", "Updated At", "datetime", { import: false })
    ]
  },
  notes: {
    key: "notes",
    label: "Notes",
    pluralLabel: "Notes",
    table: "job_notes",
    permissionArea: "notes",
    description: "Job notes and internal notes.",
    uniqueBy: [["title", "created_at"]],
    fields: [
      field("id", "Record ID", "uuid", { readOnly: true, aliases: ["note id", "id"] }),
      field("title", "Title", "text", { required: true }),
      field("body", "Body", "textarea", { aliases: ["note", "notes", "details"] }),
      field("job_id", "Job ID", "uuid", { aliases: ["scheduled job id"] }),
      field("created_at", "Created At", "datetime", { import: false }),
      field("updated_at", "Updated At", "datetime", { import: false })
    ]
  },
  route_stops: {
    key: "route_stops",
    label: "Route Stops",
    pluralLabel: "Route Stops",
    table: "route_stops",
    permissionArea: "route",
    description: "Daily route stops and route planning records.",
    uniqueBy: [["route_date", "stop_order"], ["route_date", "address"]],
    fields: [
      field("id", "Record ID", "uuid", { readOnly: true, aliases: ["route stop id", "stop id", "id"] }),
      field("route_date", "Route Date", "date", { required: true, aliases: ["date"] }),
      field("stop_order", "Stop Order", "integer", { aliases: ["order", "sequence"] }),
      field("name", "Name", "text", { required: true, aliases: ["client", "property", "stop"] }),
      field("address", "Address", "text", { aliases: ["location"] }),
      field("status", "Status", "text"),
      field("notes", "Notes", "textarea"),
      field("created_at", "Created At", "datetime", { import: false }),
      field("updated_at", "Updated At", "datetime", { import: false })
    ]
  },
  sales_documents: {
    key: "sales_documents",
    label: "Sales / Invoices",
    pluralLabel: "Sales / Invoices",
    table: "sales_documents",
    permissionArea: "invoices",
    description: "Estimates, invoices, and payment tracking.",
    uniqueBy: [["square_invoice_id"], ["document_number"], ["client_name", "total_amount"]],
    fields: [
      field("id", "Record ID", "uuid", { readOnly: true, aliases: ["document id", "invoice id", "id"] }),
      field("document_type", "Document Type", "text", { aliases: ["type"] }),
      field("document_number", "Document Number", "text", { aliases: ["invoice number", "estimate number"] }),
      field("client_name", "Client Name", "text", { required: true, aliases: ["client", "customer"] }),
      field("client_email", "Client Email", "email", { aliases: ["email"] }),
      field("status", "Status", "enum", { enum: DOCUMENT_STATUSES, defaultValue: "Draft" }),
      field("total_amount", "Total Amount", "currency", { aliases: ["amount", "total"] }),
      field("due_date", "Due Date", "date"),
      field("payment_url", "Payment URL", "url", { import: false }),
      field("notes", "Notes", "textarea"),
      field("created_at", "Created At", "datetime", { import: false }),
      field("updated_at", "Updated At", "datetime", { import: false })
    ]
  },
  job_budgets: {
    key: "job_budgets",
    label: "Job Budgets",
    pluralLabel: "Job Budgets",
    table: "job_budgets",
    permissionArea: "budgets",
    description: "Internal job budgets, revenue, margin targets, and job links.",
    uniqueBy: [["id"], ["budget_name", "client_name", "property_name"]],
    fields: [
      field("id", "Budget ID", "uuid", { import: true, export: true, readOnly: true, aliases: ["id", "record id"] }),
      field("budget_name", "Budget Name", "text", { required: true, aliases: ["name", "job budget"] }),
      field("job_id", "Job ID", "uuid", { aliases: ["scheduled job id"] }),
      field("quote_id", "Quote ID", "uuid"),
      field("invoice_id", "Invoice ID", "uuid"),
      field("client_id", "Client ID", "uuid"),
      field("client_name", "Client", "text", { aliases: ["client name", "customer"] }),
      field("property_name", "Property", "text", { aliases: ["property", "site"] }),
      field("job_name", "Job", "text", { aliases: ["job title"] }),
      field("service_type", "Service Type", "text", { aliases: ["service"] }),
      field("job_description", "Job Description", "textarea", { aliases: ["description", "scope"] }),
      field("proposed_start_date", "Proposed Start", "date"),
      field("proposed_completion_date", "Proposed Completion", "date"),
      field("status", "Budget Status", "enum", { enum: BUDGET_STATUSES, defaultValue: "Draft", aliases: ["status"] }),
      field("job_status", "Job Status", "enum", { enum: BUDGET_JOB_STATUSES, defaultValue: "Not Scheduled" }),
      field("target_margin_percent", "Target Margin %", "decimal", { defaultValue: 35 }),
      field("base_quoted_price", "Base Quoted Price", "currency", { defaultValue: 0 }),
      field("approved_addons", "Approved Add-ons", "currency", { defaultValue: 0 }),
      field("discounts", "Discounts", "currency", { defaultValue: 0 }),
      field("taxes", "Taxes", "currency", { defaultValue: 0 }),
      field("other_revenue", "Other Revenue", "currency", { defaultValue: 0 }),
      field("expected_revenue", "Expected Revenue", "currency", { import: false }),
      field("final_invoiced_revenue", "Final Invoiced Revenue", "currency", { defaultValue: 0 }),
      field("amount_paid", "Amount Paid", "currency", { defaultValue: 0 }),
      field("outstanding_balance", "Outstanding Balance", "currency", { import: false }),
      field("notes", "Notes", "textarea"),
      field("created_at", "Created At", "datetime", { import: false }),
      field("updated_at", "Updated At", "datetime", { import: false })
    ]
  },
  job_budget_labor: {
    key: "job_budget_labor",
    label: "Budget Labor",
    pluralLabel: "Budget Labor",
    table: "job_budget_labor",
    permissionArea: "budgets",
    description: "Estimated and actual labor rows for job budgets.",
    uniqueBy: [["id"], ["budget_id", "task", "role"]],
    fields: [
      field("id", "Labor ID", "uuid", { import: true, export: true, readOnly: true }),
      field("budget_id", "Budget ID", "uuid", { required: true }),
      field("employee_name", "Employee", "text"),
      field("role", "Role", "text"),
      field("crew", "Crew", "text"),
      field("task", "Task", "text", { required: true }),
      field("estimated_hours", "Estimated Hours", "decimal", { defaultValue: 0 }),
      field("hourly_wage", "Hourly Wage", "currency", { defaultValue: 0 }),
      field("payroll_burden_percent", "Payroll Burden %", "decimal", { defaultValue: 0 }),
      field("workers_comp_percent", "Workers Comp %", "decimal", { defaultValue: 0 }),
      field("other_burden_amount", "Other Labor Burden", "currency", { defaultValue: 0 }),
      field("true_hourly_cost", "True Hourly Cost", "currency", { import: false }),
      field("estimated_cost", "Estimated Cost", "currency", { import: false }),
      field("actual_hours", "Actual Hours", "decimal", { defaultValue: 0 }),
      field("actual_cost", "Actual Cost", "currency", { defaultValue: 0 }),
      field("notes", "Notes", "textarea"),
      field("created_at", "Created At", "datetime", { import: false }),
      field("updated_at", "Updated At", "datetime", { import: false })
    ]
  },
  job_budget_materials: {
    key: "job_budget_materials",
    label: "Budget Materials",
    pluralLabel: "Budget Materials",
    table: "job_budget_materials",
    permissionArea: "budgets",
    description: "Material estimates, actuals, and receipt tracking.",
    uniqueBy: [["id"], ["budget_id", "material_name", "vendor"]],
    fields: [
      field("id", "Material ID", "uuid", { import: true, export: true, readOnly: true }),
      field("budget_id", "Budget ID", "uuid", { required: true }),
      field("material_name", "Material", "text", { required: true, aliases: ["name"] }),
      field("category", "Category", "enum", { enum: BUDGET_MATERIAL_CATEGORIES, defaultValue: "Other" }),
      field("vendor", "Vendor", "text"),
      field("quantity", "Quantity", "decimal", { defaultValue: 0 }),
      field("unit", "Unit", "text"),
      field("unit_cost", "Unit Cost", "currency", { defaultValue: 0 }),
      field("estimated_cost", "Estimated Cost", "currency", { import: false }),
      field("actual_quantity", "Actual Quantity", "decimal", { defaultValue: 0 }),
      field("actual_unit_cost", "Actual Unit Cost", "currency", { defaultValue: 0 }),
      field("actual_cost", "Actual Cost", "currency", { defaultValue: 0 }),
      field("tax", "Tax", "currency", { defaultValue: 0 }),
      field("delivery_fee", "Delivery Fee", "currency", { defaultValue: 0 }),
      field("notes", "Notes", "textarea"),
      field("created_at", "Created At", "datetime", { import: false }),
      field("updated_at", "Updated At", "datetime", { import: false })
    ]
  },
  budget_material_catalog: {
    key: "budget_material_catalog",
    label: "Material Catalog",
    pluralLabel: "Material Catalog",
    table: "budget_material_catalog",
    permissionArea: "budgets",
    description: "Reusable material names and default prices for budget templates.",
    uniqueBy: [["material_name", "vendor", "unit"]],
    fields: [
      field("id", "Catalog ID", "uuid", { readOnly: true }),
      field("material_name", "Material", "text", { required: true }),
      field("category", "Category", "enum", { enum: BUDGET_MATERIAL_CATEGORIES, defaultValue: "Other" }),
      field("vendor", "Vendor", "text"),
      field("unit", "Unit", "text"),
      field("default_unit_cost", "Default Unit Cost", "currency", { defaultValue: 0 }),
      field("notes", "Notes", "textarea"),
      field("archived_at", "Archived At", "datetime", { import: false }),
      field("created_at", "Created At", "datetime", { import: false }),
      field("updated_at", "Updated At", "datetime", { import: false })
    ]
  },
  job_budget_equipment: {
    key: "job_budget_equipment",
    label: "Budget Equipment",
    pluralLabel: "Budget Equipment",
    table: "job_budget_equipment",
    permissionArea: "budgets",
    description: "Owned equipment, rentals, vehicle use, fuel, and wear allowances.",
    uniqueBy: [["id"], ["budget_id", "equipment_name", "usage_type"]],
    fields: [
      field("id", "Equipment Cost ID", "uuid", { import: true, export: true, readOnly: true }),
      field("budget_id", "Budget ID", "uuid", { required: true }),
      field("equipment_id", "Equipment ID", "uuid"),
      field("equipment_name", "Equipment", "text", { required: true }),
      field("usage_type", "Usage Type", "enum", { enum: BUDGET_EQUIPMENT_USAGE_TYPES, defaultValue: "Owned" }),
      field("estimated_hours", "Estimated Hours", "decimal", { defaultValue: 0 }),
      field("estimated_days", "Estimated Days", "decimal", { defaultValue: 0 }),
      field("internal_hourly_rate", "Internal Hourly Rate", "currency", { defaultValue: 0 }),
      field("internal_daily_rate", "Internal Daily Rate", "currency", { defaultValue: 0 }),
      field("rental_rate", "Rental Rate", "currency", { defaultValue: 0 }),
      field("estimated_cost", "Estimated Cost", "currency", { defaultValue: 0 }),
      field("actual_usage", "Actual Usage", "decimal", { defaultValue: 0 }),
      field("actual_cost", "Actual Cost", "currency", { defaultValue: 0 }),
      field("notes", "Notes", "textarea"),
      field("created_at", "Created At", "datetime", { import: false }),
      field("updated_at", "Updated At", "datetime", { import: false })
    ]
  },
  job_budget_costs: {
    key: "job_budget_costs",
    label: "Budget Other Costs",
    pluralLabel: "Budget Other Costs",
    table: "job_budget_costs",
    permissionArea: "budgets",
    description: "Disposal, delivery, mileage, subcontractors, fees, contingency, and miscellaneous costs.",
    uniqueBy: [["id"], ["budget_id", "category", "description"]],
    fields: [
      field("id", "Cost ID", "uuid", { import: true, export: true, readOnly: true }),
      field("budget_id", "Budget ID", "uuid", { required: true }),
      field("category", "Category", "enum", { enum: BUDGET_COST_CATEGORIES, defaultValue: "Miscellaneous expenses" }),
      field("description", "Description", "text", { required: true }),
      field("estimated_cost", "Estimated Cost", "currency", { defaultValue: 0 }),
      field("actual_cost", "Actual Cost", "currency", { defaultValue: 0 }),
      field("contingency_type", "Contingency Type", "enum", { enum: ["Fixed", "Percent"] }),
      field("contingency_percent", "Contingency %", "decimal"),
      field("notes", "Notes", "textarea"),
      field("created_at", "Created At", "datetime", { import: false }),
      field("updated_at", "Updated At", "datetime", { import: false })
    ]
  },
  job_budget_change_orders: {
    key: "job_budget_change_orders",
    label: "Budget Change Orders",
    pluralLabel: "Budget Change Orders",
    table: "job_budget_change_orders",
    permissionArea: "budgets",
    description: "Budget add-ons, approvals, and unbilled change orders.",
    uniqueBy: [["id"], ["budget_id", "title", "requested_date"]],
    fields: [
      field("id", "Change Order ID", "uuid", { import: true, export: true, readOnly: true }),
      field("budget_id", "Budget ID", "uuid", { required: true }),
      field("title", "Title", "text", { required: true }),
      field("description", "Description", "textarea"),
      field("requested_date", "Requested Date", "date"),
      field("requested_by", "Requested By", "text"),
      field("additional_revenue", "Additional Revenue", "currency", { defaultValue: 0 }),
      field("additional_labor_cost", "Additional Labor Cost", "currency", { defaultValue: 0 }),
      field("additional_material_cost", "Additional Material Cost", "currency", { defaultValue: 0 }),
      field("additional_other_cost", "Additional Other Cost", "currency", { defaultValue: 0 }),
      field("approval_status", "Approval Status", "enum", { enum: BUDGET_CHANGE_ORDER_STATUSES, defaultValue: "Draft" }),
      field("approved_date", "Approved Date", "date"),
      field("client_approval_notes", "Client Approval Notes", "textarea"),
      field("internal_notes", "Internal Notes", "textarea"),
      field("invoiced_at", "Invoiced At", "datetime", { import: false }),
      field("created_at", "Created At", "datetime", { import: false }),
      field("updated_at", "Updated At", "datetime", { import: false })
    ]
  },
  job_budget_templates: {
    key: "job_budget_templates",
    label: "Budget Templates",
    pluralLabel: "Budget Templates",
    table: "job_budget_templates",
    permissionArea: "budgets",
    description: "Reusable budget templates for common Urban Yards job types.",
    uniqueBy: [["template_name"], ["service_type", "template_name"]],
    fields: [
      field("id", "Template ID", "uuid", { readOnly: true }),
      field("template_name", "Template Name", "text", { required: true, aliases: ["name"] }),
      field("service_type", "Service Type", "text", { aliases: ["service"] }),
      field("target_margin_percent", "Target Margin %", "decimal", { defaultValue: 35 }),
      field("default_contingency_percent", "Default Contingency %", "decimal", { defaultValue: 10 }),
      field("notes", "Notes", "textarea"),
      field("archived_at", "Archived At", "datetime", { import: false }),
      field("created_at", "Created At", "datetime", { import: false }),
      field("updated_at", "Updated At", "datetime", { import: false })
    ]
  }
};

function listModules() {
  return Object.values(MODULES).map((module) => ({
    key: module.key,
    label: module.label,
    pluralLabel: module.pluralLabel,
    table: module.table,
    description: module.description,
    fields: module.fields,
    defaultExportColumns: module.fields.filter((item) => item.export).map((item) => item.key),
    allowedImportFields: module.fields.filter((item) => item.import && !item.readOnly).map((item) => item.key),
    requiredFields: module.fields.filter((item) => item.required).map((item) => item.key),
    uniqueBy: module.uniqueBy || []
  }));
}

function getModule(moduleKey) {
  const normalized = normalizeColumnName(moduleKey);
  return MODULES[moduleKey] || Object.values(MODULES).find((item) => normalizeColumnName(item.key) === normalized || normalizeColumnName(item.label) === normalized || normalizeColumnName(item.table) === normalized) || null;
}

function normalizeColumnName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(names|records|locations|items|entries)\b/g, (match) => match.replace(/s$/, ""))
    .trim()
    .replace(/\s+/g, " ");
}

function allFieldAliases(fieldConfig) {
  return [fieldConfig.key, fieldConfig.label, ...(fieldConfig.aliases || [])].map(normalizeColumnName).filter(Boolean);
}

function aliasMap(module) {
  const map = new Map();
  module.fields.forEach((fieldConfig) => {
    allFieldAliases(fieldConfig).forEach((alias) => {
      if (!map.has(alias)) map.set(alias, fieldConfig.key);
    });
  });
  return map;
}

function matchColumn(module, sourceColumn) {
  const normalized = normalizeColumnName(sourceColumn);
  const aliases = aliasMap(module);
  if (aliases.has(normalized)) {
    return { field: aliases.get(normalized), confidence: 1, status: "Matched" };
  }
  const compact = normalized.replace(/\s+/g, "");
  for (const [alias, key] of aliases.entries()) {
    if (alias.replace(/\s+/g, "") === compact) return { field: key, confidence: 0.95, status: "Matched" };
  }
  for (const [alias, key] of aliases.entries()) {
    if (alias.includes(normalized) || normalized.includes(alias)) return { field: key, confidence: 0.72, status: "Needs Review" };
  }
  return { field: "", confidence: 0, status: "Ignored" };
}

function suggestMappings(module, headers, rows = []) {
  const used = new Set();
  return headers.map((header) => {
    const suggestion = matchColumn(module, header);
    const field = suggestion.field && !used.has(suggestion.field) ? suggestion.field : "";
    if (field) used.add(field);
    const examples = rows.slice(0, 3).map((row) => row[header]).filter((value) => value !== undefined && value !== null && String(value).trim() !== "").slice(0, 3);
    return {
      sourceColumn: header,
      examples,
      suggestedField: field,
      confidence: field ? suggestion.confidence : 0,
      status: field ? suggestion.status : (suggestion.field ? "Invalid Match" : "Ignored")
    };
  });
}

function mappingObject(mappings = []) {
  const result = {};
  mappings.forEach((item) => {
    if (item?.sourceColumn && item?.field) result[item.sourceColumn] = item.field;
    if (item?.sourceColumn && item?.suggestedField && !item.field) result[item.sourceColumn] = item.suggestedField;
  });
  return result;
}

function parseCsv(text) {
  const input = String(text || "").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];
    if (quoted) {
      if (char === "\"" && next === "\"") {
        value += "\"";
        index += 1;
      } else if (char === "\"") {
        quoted = false;
      } else {
        value += char;
      }
      continue;
    }
    if (char === "\"") {
      quoted = true;
    } else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else if (char !== "\r") {
      value += char;
    }
  }
  row.push(value);
  if (row.some((cell) => String(cell || "").trim() !== "") || rows.length) rows.push(row);

  const headers = (rows.shift() || []).map((cell) => String(cell || "").trim());
  const records = rows
    .filter((cells) => cells.some((cell) => String(cell || "").trim() !== ""))
    .map((cells, rowIndex) => {
      const record = { _rowNumber: rowIndex + 2 };
      headers.forEach((header, columnIndex) => {
        record[header] = cells[columnIndex] === undefined ? "" : cells[columnIndex];
      });
      return record;
    });
  return { headers, rows: records };
}

function escapeCsvCell(value) {
  if (value === null || value === undefined) return "";
  const raw = typeof value === "object" ? JSON.stringify(value) : String(value);
  const safe = /^[=+\-@]/.test(raw.trim()) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, "\"\"")}"`;
}

function rowsToCsv(rows, columns) {
  const headers = columns || Array.from(rows.reduce((set, row) => {
    Object.keys(row || {}).forEach((key) => set.add(key));
    return set;
  }, new Set()));
  return [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => headers.map((column) => escapeCsvCell(row?.[column])).join(","))
  ].join("\r\n");
}

function normalizeDate(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function normalizeBoolean(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return "";
  if (["true", "yes", "y", "1"].includes(text)) return true;
  if (["false", "no", "n", "0"].includes(text)) return false;
  return null;
}

function parsePhoneNumber(value) {
  const text = String(value || "").trim();
  if (!text) return { e164: "", display: "", extension: "", countryCode: "", error: "" };
  const extensionMatch = text.match(/(?:ext\.?|extension|x)\s*([0-9]{1,8})\s*$/i);
  const extension = extensionMatch ? extensionMatch[1] : "";
  const withoutExtension = extensionMatch ? text.slice(0, extensionMatch.index).trim() : text;
  const digits = withoutExtension.replace(/\D/g, "");
  let e164 = "";
  let countryCode = "";
  if (digits.length === 10) {
    countryCode = "1";
    e164 = `+1${digits}`;
  } else if (digits.length === 11 && digits.startsWith("1")) {
    countryCode = "1";
    e164 = `+${digits}`;
  } else if (/^\+\d{7,15}/.test(withoutExtension) && digits.length >= 7 && digits.length <= 15) {
    countryCode = digits.slice(0, Math.max(1, digits.length - 10));
    e164 = `+${digits}`;
  }
  if (!e164) return { e164: "", display: text, extension, countryCode: "", error: "Phone number must be a valid 10-digit US number or an explicit international number." };
  return { e164, display: text, extension, countryCode, error: "" };
}

function normalizePhone(value) {
  const parsed = parsePhoneNumber(value);
  if (!parsed.display && !parsed.e164) return "";
  return parsed.error ? null : parsed.e164;
}

function normalizeEmail(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) ? text : null;
}

function normalizeUrl(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeNumber(value, integer = false) {
  const text = String(value || "").trim();
  if (!text) return "";
  const cleaned = text.replace(/[$,%\s,]/g, "");
  if (!cleaned) return "";
  const number = Number(cleaned);
  if (!Number.isFinite(number)) return null;
  return integer ? Math.trunc(number) : number;
}

function normalizeEnum(value, allowed = []) {
  const text = String(value || "").trim();
  if (!text) return "";
  const match = allowed.find((option) => normalizeColumnName(option) === normalizeColumnName(text));
  return match || null;
}

function normalizeFieldValue(value, fieldConfig) {
  const raw = typeof value === "string" ? value.trim() : value;
  if (raw === "" || raw === null || raw === undefined) return { value: "", error: "" };
  if (fieldConfig.type === "date") {
    const normalized = normalizeDate(raw);
    return normalized === null ? { value: raw, error: `${fieldConfig.label} must be a valid date.` } : { value: normalized, error: "" };
  }
  if (fieldConfig.type === "datetime") {
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? { value: raw, error: `${fieldConfig.label} must be a valid date/time.` } : { value: parsed.toISOString(), error: "" };
  }
  if (fieldConfig.type === "email") {
    const normalized = normalizeEmail(raw);
    return normalized === null ? { value: raw, error: `${fieldConfig.label} must be a valid email address.` } : { value: normalized, error: "" };
  }
  if (fieldConfig.type === "phone") {
    const parsed = parsePhoneNumber(raw);
    return parsed.error ? { value: raw, error: `${fieldConfig.label} ${parsed.error}`, meta: parsed } : { value: parsed.e164, error: "", meta: parsed };
  }
  if (fieldConfig.type === "url") {
    const normalized = normalizeUrl(raw);
    return normalized === null ? { value: raw, error: `${fieldConfig.label} must be a valid URL.` } : { value: normalized, error: "" };
  }
  if (fieldConfig.type === "currency" || fieldConfig.type === "decimal") {
    const normalized = normalizeNumber(raw);
    return normalized === null ? { value: raw, error: `${fieldConfig.label} must be a valid number.` } : { value: normalized, error: "" };
  }
  if (fieldConfig.type === "integer") {
    const normalized = normalizeNumber(raw, true);
    return normalized === null ? { value: raw, error: `${fieldConfig.label} must be a whole number.` } : { value: normalized, error: "" };
  }
  if (fieldConfig.type === "boolean") {
    const normalized = normalizeBoolean(raw);
    return normalized === null ? { value: raw, error: `${fieldConfig.label} must be Yes or No.` } : { value: normalized, error: "" };
  }
  if (fieldConfig.type === "enum") {
    const normalized = normalizeEnum(raw, fieldConfig.enum || []);
    return normalized === null ? { value: raw, error: `${fieldConfig.label} must be ${fieldConfig.enum.join(", ")}.` } : { value: normalized, error: "" };
  }
  return { value: String(raw), error: "" };
}

function isBlank(value) {
  return value === "" || value === null || value === undefined;
}

function comparableValueForKey(key, value) {
  if (/phone/i.test(String(key || ""))) {
    const parsed = parsePhoneNumber(value);
    if (!parsed.error && parsed.e164) return parsed.e164;
  }
  return value;
}

function rowKeyFor(fields, row) {
  return fields.map((key) => normalizeColumnName(comparableValueForKey(key, row[key]))).join("|");
}

function existingIndexes(module, existingRows = []) {
  const byId = new Map();
  const uniqueMaps = (module.uniqueBy || []).map((fields) => ({ fields, map: new Map() }));
  existingRows.forEach((row) => {
    if (row?.id) byId.set(String(row.id), row);
    uniqueMaps.forEach((entry) => {
      const values = entry.fields.map((key) => row?.[key]);
      if (values.every((value) => !isBlank(value))) entry.map.set(rowKeyFor(entry.fields, row), row);
    });
  });
  return { byId, uniqueMaps };
}

function duplicateForRow(module, normalizedRow, existingRows = []) {
  const indexes = existingIndexes(module, existingRows);
  if (normalizedRow.id && indexes.byId.has(String(normalizedRow.id))) return { type: "id", row: indexes.byId.get(String(normalizedRow.id)) };
  for (const entry of indexes.uniqueMaps) {
    const values = entry.fields.map((key) => normalizedRow[key]);
    if (values.every((value) => !isBlank(value))) {
      const match = entry.map.get(rowKeyFor(entry.fields, normalizedRow));
      if (match) return { type: "duplicate", fields: entry.fields, row: match };
    }
  }
  return null;
}

function validateImportRows(module, sourceRows, mappings = [], existingRows = []) {
  const map = mappingObject(mappings);
  const fieldsByKey = new Map(module.fields.map((item) => [item.key, item]));
  const seenIds = new Map();
  const previewRows = sourceRows.map((sourceRow, index) => {
    const normalized = {};
    const errors = [];
    const warnings = [];
    Object.entries(map).forEach(([sourceColumn, fieldKey]) => {
      const fieldConfig = fieldsByKey.get(fieldKey);
      if (!fieldConfig || fieldConfig.import === false) return;
      const result = normalizeFieldValue(sourceRow[sourceColumn], fieldConfig);
      normalized[fieldKey] = result.value;
      if (result.error) errors.push({ field: fieldKey, message: result.error, sourceColumn });
      if (!result.error && result.meta && fieldConfig.phoneParts) {
        const parts = fieldConfig.phoneParts;
        if (parts.display && isBlank(normalized[parts.display])) normalized[parts.display] = result.meta.display;
        if (parts.e164 && isBlank(normalized[parts.e164])) normalized[parts.e164] = result.meta.e164;
        if (parts.extension && result.meta.extension && isBlank(normalized[parts.extension])) normalized[parts.extension] = result.meta.extension;
        if (parts.countryCode && result.meta.countryCode && isBlank(normalized[parts.countryCode])) normalized[parts.countryCode] = result.meta.countryCode;
      }
    });
    if (module.key === "contacts" && isBlank(normalized.name)) {
      const derivedName = [normalized.first_name, normalized.last_name].filter((value) => !isBlank(value)).join(" ").trim();
      if (derivedName) normalized.name = derivedName;
    }
    module.fields.forEach((fieldConfig) => {
      if (fieldConfig.import === false || fieldConfig.readOnly) return;
      if (isBlank(normalized[fieldConfig.key]) && fieldConfig.defaultValue !== undefined) {
        normalized[fieldConfig.key] = fieldConfig.defaultValue;
      }
      if (fieldConfig.required && isBlank(normalized[fieldConfig.key])) {
        errors.push({ field: fieldConfig.key, message: `${fieldConfig.label} is required.` });
      }
    });
    (module.requireAny || []).forEach((group) => {
      if (group.every((fieldKey) => isBlank(normalized[fieldKey]))) {
        const labels = group.map((fieldKey) => fieldsByKey.get(fieldKey)?.label || fieldKey).join(", ");
        errors.push({ field: group[0], message: `At least one of these fields is required: ${labels}.` });
      }
    });
    if (normalized.id) {
      const id = String(normalized.id);
      if (seenIds.has(id)) {
        errors.push({ field: "id", message: `Record ID is duplicated in rows ${seenIds.get(id)} and ${sourceRow._rowNumber || index + 2}.` });
      }
      seenIds.set(id, sourceRow._rowNumber || index + 2);
    }
    const duplicate = duplicateForRow(module, normalized, existingRows);
    let action = "create";
    if (duplicate?.type === "id") action = "update";
    else if (normalized.id && !duplicate) {
      action = "rejected";
      errors.push({ field: "id", message: "This record ID does not exist or you do not have access to it." });
    } else if (duplicate) {
      action = "duplicate";
      warnings.push({ field: duplicate.fields?.[0] || "id", message: `Possible duplicate matched by ${duplicate.fields?.join(", ") || "record ID"}.` });
    }
    const changedFields = duplicate?.row
      ? Object.keys(normalized).filter((key) => key !== "id" && !isBlank(normalized[key]) && String(normalized[key]) !== String(duplicate.row[key] ?? ""))
      : Object.keys(normalized).filter((key) => key !== "id" && !isBlank(normalized[key]));
    if (action === "update" && !changedFields.length && !errors.length) action = "unchanged";
    if (errors.length) action = "rejected";
    return {
      clientRowId: crypto.randomUUID(),
      rowNumber: sourceRow._rowNumber || index + 2,
      action,
      source: sourceRow,
      normalized,
      duplicateRecordId: duplicate?.row?.id || null,
      changedFields,
      errors,
      warnings
    };
  });

  const phoneFields = module.fields.filter((item) => item.type === "phone").map((item) => item.key);
  const hasPhoneValue = (row) => phoneFields.some((fieldKey) => !isBlank(row.normalized[fieldKey]));
  const hasPhoneError = (row) => row.errors.some((error) => phoneFields.includes(error.field));
  const summary = {
    totalRows: previewRows.length,
    newRecords: previewRows.filter((row) => row.action === "create").length,
    updates: previewRows.filter((row) => row.action === "update").length,
    duplicates: previewRows.filter((row) => row.action === "duplicate").length,
    warnings: previewRows.reduce((count, row) => count + row.warnings.length, 0),
    rejected: previewRows.filter((row) => row.action === "rejected").length,
    unchanged: previewRows.filter((row) => row.action === "unchanged").length,
    validPhones: phoneFields.length ? previewRows.filter((row) => hasPhoneValue(row) && !hasPhoneError(row)).length : 0,
    invalidPhones: phoneFields.length ? previewRows.filter(hasPhoneError).length : 0,
    missingPhones: phoneFields.length ? previewRows.filter((row) => !hasPhoneValue(row) && !hasPhoneError(row)).length : 0
  };
  return { rows: previewRows, summary };
}

function exportRowsForModule(module, records = []) {
  const fields = module.fields.filter((item) => item.export);
  return {
    columns: fields.map((item) => item.label),
    fieldKeys: fields.map((item) => item.key),
    rows: records.map((record) => {
      const row = {};
      fields.forEach((fieldConfig) => {
        row[fieldConfig.label] = record?.[fieldConfig.key] ?? "";
      });
      return row;
    })
  };
}

module.exports = {
  CALL_OUTCOME_VALUES,
  CONTACT_METHODS,
  CONTACT_TYPES,
  MODULES,
  PRIORITIES,
  US_STATES,
  duplicateForRow,
  escapeCsvCell,
  exportRowsForModule,
  getModule,
  listModules,
  mappingObject,
  matchColumn,
  normalizeColumnName,
  normalizeFieldValue,
  parsePhoneNumber,
  parseCsv,
  rowsToCsv,
  suggestMappings,
  validateImportRows
};
