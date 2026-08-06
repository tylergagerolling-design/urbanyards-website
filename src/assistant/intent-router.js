"use strict";

function matches(value, pattern) {
  return pattern.test(String(value || "").toLowerCase());
}

function detectEntities(message) {
  const value = String(message || "").toLowerCase();
  const map = {
    ticket: /\b(ticket|job-\w+)\b/,
    job: /\bjob(s)?\b/,
    visit: /\bvisit(s)?\b/,
    client: /\bclient(s)?\b/,
    contact: /\bcontact(s)?\b/,
    property: /\b(property|properties|apartment|address)\b/,
    lead: /\b(lead|prospect)s?\b/,
    quote: /\b(quote|estimate)s?\b/,
    invoice: /\b(invoice|unpaid|receivable)s?\b/,
    expense: /\b(expense|cost|receipt)s?\b/,
    worker: /\b(worker|assigned|crew|tyler)\b/,
    document: /\b(document|form|photo|proof)s?\b/,
    equipment: /\b(equipment|tool|material)s?\b/,
    schedule: /\b(schedule|calendar|friday|tomorrow|week)\b/,
    report: /\b(report|briefing|summary)\b/
  };
  return Object.entries(map).filter(([, pattern]) => pattern.test(value)).map(([entity]) => entity);
}

function dashboardActionIntents(message, legacyIntents = []) {
  const value = String(message || "").trim();
  const categories = [];
  const add = (category) => { if (!categories.includes(category)) categories.push(category); };
  if (/\b(find|search|show|locate|pull up|which|who|how much)\b/i.test(value)) add("search_records");
  if (/\b(status|details?|what is happening|what happened|attached|connected|assigned)\b/i.test(value)) add("retrieve_record_details");
  if (/\b(summarize|summary|total|how much|what is happening)\b/i.test(value)) add("summarize_information");
  if (/\b(open|take me|go to|navigate|pull up)\b/i.test(value)) add("navigate");
  if (/\b(take me|go to|navigate)\b/i.test(value) && /\b(unpaid|overdue|tomorrow|today|this week|assigned|missing)\b/i.test(value)) add("filter_and_navigate");
  if (legacyIntents.some((intent) => ["question", "analysis", "comparison", "recommendation", "report", "planning"].includes(intent))) add("dashboard_question");
  const external = /\b(the web|web|internet|online|official website|current weather|weather forecast|regulations?|ordinances?|manufacturer|product documentation|public (?:phone|address|information)|recent information|still operating)\b/i.test(value);
  const internal = /\b(our (?:dashboard|database|records?|leads?|clients?|tickets?|properties)|urban yards record|saved (?:lead|client|record)|already exists?)\b/i.test(value);
  const comparison = /\b(compare|verify|match|see whether|check whether|against our records?|with our records?)\b/i.test(value);
  if (external) add("search_external");
  if (external && (internal || comparison)) add("search_internal_and_external");
  else if (internal) add("search_internal");
  if (external && /\b(company|business|vendor|client|property management|apartment|address|official website)\b/i.test(value)) add("research_entity");
  if (external && comparison) add("compare_sources");
  if (/\b(summarize|summary|research report|findings)\b/i.test(value) && external) add("summarize_research");
  if (external) add("general_question");
  if (!value) add("clarification_needed");
  if (!categories.length) add("dashboard_question");
  return categories;
}

function routeIntent(message) {
  const value = String(message || "").trim();
  const intents = [];
  if (matches(value, /\b(find|search|show|locate|pull up|open)\b/)) intents.push("record_search");
  if (matches(value, /\b(summarize|summary|briefing|what happened)\b/)) intents.push("summary");
  if (matches(value, /\b(analy[sz]e|why|which .*most|profitable|margin|total value|attention|blocked|overdue)\b/)) intents.push("analysis");
  if (matches(value, /\b(compare|versus|vs\.?|better option)\b/)) intents.push("comparison");
  if (matches(value, /\b(recommend|should i|best next|priority)\b/)) intents.push("recommendation");
  if (matches(value, /\b(report|weekly|morning|end.of.day)\b/)) intents.push("report");
  if (matches(value, /\b(go to|navigate|open page)\b/)) intents.push("navigation");
  if (matches(value, /\b(plan|prepare|ready for|nothing falls through|collect overdue)\b/)) intents.push("planning");
  if (matches(value, /\b(what happens if|simulate|scenario|if .* move|increase .* cost)\b/)) intents.push("simulation");
  if (matches(value, /\b(create|add|new)\b/) && !matches(value, /\bvisit|schedule\b/)) intents.push("create_action");
  if (matches(value, /\b(update|edit|change|assign|move it)\b/)) intents.push("update_action");
  if (matches(value, /\b(schedule|reschedule|move .* friday|add .* visit)\b/)) intents.push("schedule_action");
  if (matches(value, /\b(invoices?|expenses?|payments?|profit|margin|revenue|money|receivables?)\b/)) intents.push("financial_action");
  if (matches(value, /\b(documents?|forms?|photos?|proof)\b/)) intents.push("document_action");
  if (matches(value, /\b(automate|automation|every time|recurring rule)\b/)) intents.push("automation_request");
  if (matches(value, /\b(lawn|turf|plant|shrub|tree|soil|mulch|weed|pest|disease|mow|prun|irrigation|drainage|landscap)\b/)) intents.push("landscaping_question");
  if (matches(value, /\b(identify|what plant|which plant|species)\b/)) intents.push("plant_identification");
  if (matches(value, /\b(brown|yellow|bare|moss|wilt|spot|scorch|rot|damage|dying|declin|diagnos)\b/)) intents.push("diagnostic_request");
  if (matches(value, /\b(irrigation|sprinkler|zone|low pressure|coverage)\b/)) intents.push("irrigation_troubleshooting");
  if (matches(value, /\b(drainage|standing water|ponding|runoff|erosion)\b/)) intents.push("drainage_troubleshooting");
  if (matches(value, /\b(property inspection|inspect (?:the )?(?:property|site)|property review)\b/)) intents.push("property_inspection");
  if (matches(value, /\b(estimate|quote|pricing|price this)\b/)) intents.push("estimate_request");
  if (matches(value, /\b(calculate|how much|quantity)\b/) && matches(value, /\b(mulch|soil|gravel|plant|material|square feet|linear feet)\b/)) intents.push("material_calculation");
  if (matches(value, /\b(labor hours|crew hours|how long|crew size)\b/)) intents.push("labor_calculation");
  if (matches(value, /\b(field worker|work sequence|what .* bring|required tools|ppe|job instructions)\b/)) intents.push("field_guidance");
  if (matches(value, /\b(safety|hazard|danger|stop work|power line|chemical)\b/)) intents.push("safety_question");
  if (matches(value, /\b(license|licensing|permit|regulated|backflow)\b/)) intents.push("licensing_question");
  if (matches(value, /\b(photos?|image|picture)\b/) && matches(value, /\b(review|inspect|look at|analy[sz]e|identify)\b/)) intents.push("photo_review");
  if (matches(value, /\b(remember|memory|forget|save this)\b/)) intents.push("memory_request");
  if (!intents.length) intents.push(value ? "question" : "ambiguous");
  const explicitWrite = /\b(create|add|update|edit|change|assign|move|schedule|reschedule|send|record|delete|archive|enable|disable|automate)\b/i.test(value);
  return {
    primaryIntent: intents[0],
    intents: [...new Set(intents)],
    actionIntents: dashboardActionIntents(value, intents),
    entities: detectEntities(value),
    requiresWritePreview: explicitWrite && intents.some((intent) => ["create_action", "update_action", "schedule_action", "financial_action", "automation_request"].includes(intent))
  };
}

module.exports = { dashboardActionIntents, detectEntities, routeIntent };
