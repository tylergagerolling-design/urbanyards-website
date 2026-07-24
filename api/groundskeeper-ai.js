const { buildSiteContext, publicKnowledgeSnapshot } = require("./lib/site-knowledge");
const {
  allowedOrigin, clientIp, rateLimit, requestId, setApiHeaders, text
} = require("./lib/security");
const {
  getFeatureFlag,
  hasPermission,
  requirePermission,
  supabaseAdminRequest,
  verifyOwner,
  writeAuditLog,
  writeSystemError
} = require("../netlify/functions/lib/dashboard-auth");
const { orchestrateDashboardRequest } = require("../src/assistant/orchestrator");
const { composeDeterministicReply } = require("../src/assistant/response-composer");
const { MEMORY_TYPES, normalizeMemory, sanitizeScope } = require("../src/assistant/memory-service");

const BUSINESS_CONTEXT = `
You are The Groundskeeper, the shared AI assistant for Urban Yards Groundskeeping.

You power both:
- The public Urban Yards website helper, where you answer visitor questions and guide people toward Request a Free Quote.
- The private Urban Yards dashboard helper, where you may help Tyler draft follow-ups, summarize notes, improve copy, review leads, and plan outreach.

Use the provided Urban Yards knowledge source first. Do not invent services, prices, guarantees, certifications, service areas, availability, portfolio projects, or policies that are not in the knowledge.

Tone: practical, local, owner-operated, professional, clear, plain-spoken, and not overly salesy.

Core Urban Yards facts:
- Business: Urban Yards Groundskeeping.
- Tagline: First Impressions Start Here.
- Service area: Portland, Vancouver & Beaverton. Full wording: Serving Portland, Vancouver, Beaverton, and nearby communities.
- Customers: homeowners, small multifamily properties, apartment communities, HOAs, property managers, and local property owners.
- Services: lawn mowing, edging, weed control, seasonal cleanup, mulch refreshes, landscape maintenance, pressure washing, apartment groundskeeping, HOA landscape maintenance, trash area care, property management support, apartment turnover support, and light property-care tasks.
- Quote process: direct visitors to Request a Free Quote when pricing, scheduling, scope, photos, or property review are needed.
- Payment process: Urban Yards uses Square invoices and Square payment links. The website can look up open invoices, but it does not collect card details.
- Contact: phone (971) 258-1109 and email team@urbanyards.us.

Rules:
- Never provide final pricing, guaranteed scheduling, or contractual promises.
- If asked about pricing, explain that pricing depends on property size, condition, access, frequency, and scope, then guide them to Request a Free Quote.
- If asked whether Urban Yards serves an area, answer based on Portland, Vancouver & Beaverton.
- If asked what service someone needs, ask practical questions about property type, approximate size, current issue, photos, timeline, and whether the work is one-time or recurring.
- If unsure, recommend using the quote form or contacting Urban Yards directly.
- Do not mention Tyler Gage unless asked whether Urban Yards is owner operated or who owns it.
- If asked for contact details, use the site contact details only.
- Public visitors must never be told about draft, internal-only, or dashboard-only knowledge.
- If a question is unrelated to Urban Yards services, landscaping, groundskeeping, property maintenance, or quote/contact details, say you specialize in Urban Yards website and service questions.
- In dashboard mode, analyze only the supplied dashboard snapshot. Clearly distinguish facts, possible issues, and recommendations.
- Dashboard recommendations are drafts for owner review. Never claim that you changed a record, sent a message, created or finalized pricing, moved a ticket, created an invoice, rescheduled work, or closed a ticket.
- Never invent weather or forecast conditions. If live forecast data is absent, say that it must be checked.
`;

const UNAVAILABLE_REPLY = "Sorry, the AI helper is not available right now. You can still request a free quote.";
const PUBLIC_TABLES = ["ai_settings", "ai_knowledge", "ai_faqs", "ai_rules", "ai_saved_answers"];
const ADMIN_TABLES = [...PUBLIC_TABLES, "ai_conversation_logs", "ai_feedback", "ai_training_rules", "ai_helper_versions"];
const TRAINING_CATEGORIES = new Set([
  "tone",
  "services",
  "service_area",
  "pricing",
  "faq",
  "lead_capture",
  "escalation",
  "do_dont",
  "website_reference",
  "other"
]);
const TRAINING_STATUSES = new Set(["draft", "approved", "live", "archived"]);

const TRAINING_ROOM_CONTEXT = `
You are helping Tyler train the Urban Yards public website AI helper.

Your job is to turn plain-language instructions into clean, usable assistant guidance.
Respond conversationally first, then propose structured training rules Tyler can save.

Return JSON only in this shape:
{
  "reply": "A short conversational response to Tyler.",
  "suggestions": [
    {
      "title": "Short title",
      "category": "tone | services | service_area | pricing | faq | lead_capture | escalation | do_dont | website_reference | other",
      "content": "The exact guidance the public helper should follow.",
      "visibility": "public",
      "priority": 50
    }
  ]
}

Keep training suggestions specific, business-safe, and ready for a public-facing website helper after approval.
Do not mark anything live. New suggestions are draft until Tyler approves and publishes them.
`;

function cleanMessages(history = []) {
  return history
    .filter((message) => ["user", "assistant"].includes(message?.role) && typeof message?.content === "string")
    .slice(-10)
    .map((message) => ({
      role: message.role,
      content: message.content.slice(0, 1200)
    }));
}

function shouldUseExternalAi() {
  return Boolean(process.env.OPENAI_API_KEY);
}

function sanitizeMode(value) {
  return value === "dashboard" ? "dashboard" : "public";
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function ownerEmail() {
  return (process.env.VITE_DASHBOARD_OWNER_EMAIL || "team@urbanyards.us").toLowerCase();
}

function itemText(item) {
  return item.content || item.value || item.answer || item.rule_text || item.summary || "";
}

function itemTitle(item) {
  return item.title || item.label || item.question || item.setting_key || item.category || "Knowledge";
}

function publicFilter(item) {
  return String(item.status || "published").toLowerCase() === "published"
    && String(item.visibility || "public").toLowerCase() === "public";
}

function liveTrainingFilter(item) {
  return String(item.status || "").toLowerCase() === "live"
    && String(item.visibility || "public").toLowerCase() === "public";
}

function trainingDraftFilter(item) {
  const status = String(item.status || "draft").toLowerCase();
  return ["draft", "approved", "live"].includes(status)
    && String(item.visibility || "public").toLowerCase() === "public";
}

async function tableRows(table, query = "select=*&order=updated_at.desc") {
  try {
    return await supabaseAdminRequest(`${table}?${query}`, { method: "GET" });
  } catch (error) {
    if (/does not exist|schema cache|relation/i.test(error.message)) return [];
    throw error;
  }
}

async function loadAiKnowledge(mode) {
  const [settings, knowledge, faqs, rules, savedAnswers, trainingRules] = await Promise.all([
    tableRows("ai_settings"),
    tableRows("ai_knowledge"),
    tableRows("ai_faqs"),
    tableRows("ai_rules"),
    tableRows("ai_saved_answers"),
    tableRows("ai_training_rules", "select=*&order=priority.asc,updated_at.desc")
  ]);
  const filter = mode === "public" ? publicFilter : () => true;
  return {
    settings: asArray(settings).filter(filter),
    knowledge: asArray(knowledge).filter(filter),
    faqs: asArray(faqs).filter(filter),
    rules: asArray(rules).filter(filter),
    savedAnswers: asArray(savedAnswers).filter(filter),
    trainingRules: asArray(trainingRules).filter(mode === "public" ? liveTrainingFilter : () => true)
  };
}

async function loadPreviewKnowledge(version) {
  const ai = await loadAiKnowledge("dashboard");
  const useDrafts = version === "draft";
  return {
    ...ai,
    settings: ai.settings.filter(publicFilter),
    knowledge: ai.knowledge.filter(publicFilter),
    faqs: ai.faqs.filter(publicFilter),
    rules: ai.rules.filter(publicFilter),
    savedAnswers: ai.savedAnswers.filter(publicFilter),
    trainingRules: ai.trainingRules.filter(useDrafts ? trainingDraftFilter : liveTrainingFilter)
  };
}

async function adminSnapshot() {
  const [settings, knowledge, faqs, rules, savedAnswers, logs, feedback, trainingRules, versions] = await Promise.all([
    tableRows("ai_settings"),
    tableRows("ai_knowledge"),
    tableRows("ai_faqs"),
    tableRows("ai_rules"),
    tableRows("ai_saved_answers"),
    tableRows("ai_conversation_logs", "select=*&order=created_at.desc&limit=100"),
    tableRows("ai_feedback", "select=*&order=created_at.desc&limit=100"),
    tableRows("ai_training_rules", "select=*&order=priority.asc,updated_at.desc"),
    tableRows("ai_helper_versions", "select=*&order=published_at.desc&limit=25")
  ]);
  return { settings, knowledge, faqs, rules, savedAnswers, logs, feedback, trainingRules, versions, fallback: publicKnowledgeSnapshot() };
}

function buildDynamicContext(ai, mode) {
  const lines = [
    `Groundskeeper mode: ${mode}.`,
    "Knowledge publication rules: public mode may use only Published + Public Website records; dashboard mode may use draft, internal-only, and public records."
  ];
  const groups = [
    ["Business facts and settings", ai.settings],
    ["Knowledge base", ai.knowledge],
    ["FAQs", ai.faqs],
    ["Approved rules", ai.rules],
    ["Saved answers", ai.savedAnswers],
    ["Training studio rules", ai.trainingRules || []]
  ];
  groups.forEach(([label, rows]) => {
    if (!rows.length) return;
    lines.push(`\n${label}:`);
    rows.slice(0, 24).forEach((item) => {
      const visibility = item.visibility ? ` [${item.visibility}]` : "";
      const status = item.status ? ` [${item.status}]` : "";
      lines.push(`- ${itemTitle(item)}${visibility}${status}: ${itemText(item)}`);
    });
  });
  return lines.join("\n");
}

function leadContextText(page, lead) {
  return [
    `Current page: ${String(page || "Unknown").slice(0, 120)}`,
    `Lead name: ${String(lead.name || "").slice(0, 120) || "Not provided"}`,
    `Lead email: ${String(lead.email || "").slice(0, 160) || "Not provided"}`,
    `Lead phone: ${String(lead.phone || "").slice(0, 80) || "Not provided"}`,
    `Property type: ${String(lead.propertyType || "").slice(0, 120) || "Not provided"}`,
    `Property location: ${String(lead.propertyLocation || "").slice(0, 180) || "Not provided"}`,
    `Service requested: ${String(lead.service || "").slice(0, 160) || "Not provided"}`
  ].join("\n");
}

async function logConversation({ mode, page, question, answer, lead, requestId }) {
  try {
    await supabaseAdminRequest("ai_conversation_logs", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        mode,
        page: String(page || "").slice(0, 180),
        question: String(question || "").slice(0, 2000),
        answer: String(answer || "").slice(0, 4000),
        lead_context: lead || {},
        request_id: requestId
      })
    });
  } catch (error) {
    if (!/does not exist|schema cache|relation/i.test(error.message)) {
      console.warn(JSON.stringify({ event: "groundskeeper_log_skipped", requestId, message: error.message }));
    }
  }
}

function requireAdmin(req) {
  return verifyOwner({ headers: req.headers || {} });
}

async function openAiChat(messages, { mode = "dashboard", json = false, maxTokens = 520, temperature = 0.45 } = {}) {
  if (!shouldUseExternalAi()) {
    const error = new Error(UNAVAILABLE_REPLY);
    error.statusCode = 503;
    throw error;
  }
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      messages,
      temperature,
      max_tokens: maxTokens,
      ...(json ? { response_format: { type: "json_object" } } : {})
    }),
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`OpenAI request failed (${response.status})`);
  const data = await response.json();
  const reply = data?.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error(`The Groundskeeper ${mode} response was empty.`);
  return reply;
}

function parseTrainingJson(value, fallbackTitle) {
  try {
    const parsed = JSON.parse(value);
    const suggestions = asArray(parsed.suggestions).slice(0, 4).map((item) => ({
      title: String(item.title || fallbackTitle || "Training note").slice(0, 120),
      category: TRAINING_CATEGORIES.has(String(item.category || "").toLowerCase()) ? String(item.category).toLowerCase() : "other",
      content: String(item.content || "").slice(0, 4000),
      visibility: item.visibility === "internal" ? "internal" : "public",
      priority: Number(item.priority || 50) || 50,
      status: "draft"
    })).filter((item) => item.content);
    return {
      reply: String(parsed.reply || "I turned that into training guidance you can review.").slice(0, 1600),
      suggestions
    };
  } catch (error) {
    return {
      reply: value.slice(0, 1600),
      suggestions: [{
        title: fallbackTitle || "Training note",
        category: "other",
        content: value.slice(0, 4000),
        visibility: "public",
        priority: 50,
        status: "draft"
      }]
    };
  }
}

function normalizeTrainingRule(record = {}) {
  const now = new Date().toISOString();
  const category = String(record.category || "other").toLowerCase();
  const status = String(record.status || "draft").toLowerCase();
  const body = {
    ...(record.id ? { id: record.id } : {}),
    title: String(record.title || "Training rule").slice(0, 160),
    category: TRAINING_CATEGORIES.has(category) ? category : "other",
    content: String(record.content || "").slice(0, 5000),
    visibility: record.visibility === "internal" ? "internal" : "public",
    status: TRAINING_STATUSES.has(status) ? status : "draft",
    priority: Number(record.priority || 50) || 50,
    updated_at: now,
    ...(status === "archived" ? { archived_at: now } : {}),
    ...(status === "live" ? { published_at: record.published_at || now } : {})
  };
  return body;
}

async function upsertTrainingRule(record) {
  const body = normalizeTrainingRule(record);
  if (!body.content.trim()) throw new Error("Training rule content is required.");
  const result = await supabaseAdminRequest("ai_training_rules?on_conflict=id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(body)
  });
  return Array.isArray(result) ? result[0] : result;
}

async function patchTrainingRule(id, values) {
  if (!id) throw new Error("Training rule id is required.");
  const result = await supabaseAdminRequest(`ai_training_rules?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      ...values,
      updated_at: new Date().toISOString()
    })
  });
  return Array.isArray(result) ? result[0] : result;
}

async function trainingChatAction(payload) {
  if (String(payload.message || "").length > 1800) {
    const error = new Error("Please keep training instructions under 1800 characters.");
    error.statusCode = 400;
    throw error;
  }
  const userMessage = text(payload.message, 1800);
  if (!userMessage) throw new Error("Training message is required.");
  const ai = await loadAiKnowledge("dashboard").catch(() => ({ settings: [], knowledge: [], faqs: [], rules: [], savedAnswers: [], trainingRules: [] }));
  const content = await openAiChat([
    { role: "system", content: BUSINESS_CONTEXT },
    { role: "system", content: TRAINING_ROOM_CONTEXT },
    { role: "system", content: buildDynamicContext(ai, "dashboard") },
    ...cleanMessages(payload.history),
    { role: "user", content: userMessage }
  ], { mode: "training", json: true, maxTokens: 720, temperature: 0.35 });
  return parseTrainingJson(content, userMessage.slice(0, 80));
}

async function previewHelperAction(payload) {
  if (String(payload.message || "").length > 1400) {
    const error = new Error("Please keep preview questions under 1400 characters.");
    error.statusCode = 400;
    throw error;
  }
  const userMessage = text(payload.message, 1400);
  if (!userMessage) throw new Error("Preview message is required.");
  const version = payload.version === "live" ? "live" : "draft";
  const aiKnowledge = await loadPreviewKnowledge(version).catch(() => ({ settings: [], knowledge: [], faqs: [], rules: [], savedAnswers: [], trainingRules: [] }));
  const siteContext = buildSiteContext(userMessage, payload.page || "Dashboard preview");
  const reply = await openAiChat([
    { role: "system", content: BUSINESS_CONTEXT },
    { role: "system", content: "You are previewing exactly how the public website helper should answer a visitor. Do not mention internal dashboard tools, drafts, or training workflow." },
    { role: "system", content: siteContext },
    { role: "system", content: buildDynamicContext(aiKnowledge, "public-preview") },
    ...cleanMessages(payload.history),
    { role: "user", content: userMessage }
  ], { mode: "preview", maxTokens: 420, temperature: 0.4 });
  return { reply, version };
}

async function publishTrainingRules() {
  const now = new Date().toISOString();
  const approved = asArray(await tableRows("ai_training_rules", "select=*&status=eq.approved&order=priority.asc,updated_at.desc"));
  for (const rule of approved) {
    await patchTrainingRule(rule.id, {
      status: "live",
      published_at: now,
      archived_at: null
    });
  }
  const liveRules = asArray(await tableRows("ai_training_rules", "select=*&status=eq.live&order=priority.asc,updated_at.desc"));
  const systemPromptSnapshot = [
    BUSINESS_CONTEXT,
    "Live AI Helper Training Rules:",
    ...liveRules.map((rule) => `- ${rule.title} [${rule.category}]: ${rule.content}`)
  ].join("\n");

  const versionResult = await supabaseAdminRequest("ai_helper_versions", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      version_name: `Live helper version ${new Date(now).toLocaleString("en-US", { timeZone: "America/Los_Angeles" })}`,
      published_at: now,
      published_by: ownerEmail(),
      rule_ids: liveRules.map((rule) => rule.id),
      system_prompt_snapshot: systemPromptSnapshot,
      notes: `${approved.length} approved training item${approved.length === 1 ? "" : "s"} pushed live.`
    })
  });

  await supabaseAdminRequest("ai_settings?on_conflict=setting_key", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ setting_key: "last_published_at", label: "Last Published", value: now, visibility: "internal", status: "published" })
  });

  return {
    publishedAt: now,
    publishedCount: approved.length,
    liveCount: liveRules.length,
    version: Array.isArray(versionResult) ? versionResult[0] : versionResult
  };
}

async function listAssistantMemories() {
  return asArray(await tableRows("assistant_memories", "select=*&order=is_active.desc,updated_at.desc&limit=500"));
}

async function upsertAssistantMemory(record, actor) {
  const body = normalizeMemory(record, actor);
  const path = body.id ? "assistant_memories?on_conflict=id" : "assistant_memories";
  const result = await supabaseAdminRequest(path, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(body)
  });
  return Array.isArray(result) ? result[0] : result;
}

async function patchAssistantMemory(id, values = {}) {
  if (!id) throw new Error("Memory id is required.");
  const allowed = {};
  if (typeof values.statement === "string") allowed.statement = text(values.statement, 2000);
  if (typeof values.isActive === "boolean") allowed.is_active = values.isActive;
  if (values.memoryType && MEMORY_TYPES.has(values.memoryType)) allowed.memory_type = String(values.memoryType);
  if (values.scope && typeof values.scope === "object") allowed.scope = sanitizeScope(values.scope);
  allowed.updated_at = new Date().toISOString();
  const result = await supabaseAdminRequest(`assistant_memories?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(allowed)
  });
  return Array.isArray(result) ? result[0] : result;
}

async function deleteAssistantMemory(id) {
  if (!id) throw new Error("Memory id is required.");
  await supabaseAdminRequest(`assistant_memories?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" }
  });
  return true;
}

async function recordAssistantOutcome(payload = {}, actor = {}) {
  const body = {
    recommendation_id: text(payload.recommendationId, 160),
    recommendation_type: text(payload.recommendationType, 120),
    accepted: Boolean(payload.accepted),
    completed: Boolean(payload.completed),
    result: text(payload.result, 2000) || null,
    financial_impact: Number.isFinite(Number(payload.financialImpact)) ? Number(payload.financialImpact) : null,
    time_saved_minutes: Number.isFinite(Number(payload.timeSavedMinutes)) ? Math.max(0, Number(payload.timeSavedMinutes)) : null,
    user_rating: Number.isFinite(Number(payload.userRating)) ? Math.min(5, Math.max(1, Number(payload.userRating))) : null,
    user_correction: text(payload.userCorrection, 2000) || null,
    created_by: text(actor.userId || actor.email, 160)
  };
  if (!body.recommendation_id || !body.recommendation_type) throw new Error("Recommendation id and type are required.");
  const result = await supabaseAdminRequest("assistant_outcomes", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(body)
  });
  return Array.isArray(result) ? result[0] : result;
}

async function adminAction(req, res, id, action, payload) {
  const adminPermission = await requirePermission(req, "admin:manage", { entityType: "assistant_memory", action });
  if (!adminPermission.ok) return res.status(adminPermission.statusCode || 401).json({ error: adminPermission.error || "Unauthorized", requestId: id });
  const adminActor = adminPermission.actor;
  if (action === "training-chat" || action === "preview-helper") {
    const limit = rateLimit(`groundskeeper-admin:${action}:${clientIp(req)}`, 30, 10 * 60 * 1000);
    if (!limit.allowed) {
      res.setHeader("Retry-After", String(limit.retryAfter));
      return res.status(429).json({ error: "Too many training requests. Please try again shortly.", requestId: id });
    }
  }
  if (action === "admin-list") return res.status(200).json({ ...(await adminSnapshot()), requestId: id });
  if (action === "training-chat") return res.status(200).json({ ...(await trainingChatAction(payload)), requestId: id });
  if (action === "preview-helper") return res.status(200).json({ ...(await previewHelperAction(payload)), requestId: id });
  if (action === "upsert-training-rule") return res.status(200).json({ record: await upsertTrainingRule(payload.record || {}), requestId: id });
  if (action === "approve-training-rule") return res.status(200).json({ record: await patchTrainingRule(payload.id, { status: "approved", archived_at: null }), requestId: id });
  if (action === "archive-training-rule") return res.status(200).json({ record: await patchTrainingRule(payload.id, { status: "archived", archived_at: new Date().toISOString() }), requestId: id });
  if (action === "publish-training") return res.status(200).json({ ...(await publishTrainingRules()), requestId: id });
  if (action === "memory-list") return res.status(200).json({ memories: await listAssistantMemories(), requestId: id });
  if (action === "memory-upsert") return res.status(200).json({ memory: await upsertAssistantMemory(payload.memory || {}, adminActor), requestId: id });
  if (action === "memory-update") return res.status(200).json({ memory: await patchAssistantMemory(payload.id, payload.values || {}), requestId: id });
  if (action === "memory-delete") return res.status(200).json({ deleted: await deleteAssistantMemory(payload.id), requestId: id });
  if (action === "outcome-record") return res.status(200).json({ outcome: await recordAssistantOutcome(payload.outcome || {}, adminActor), requestId: id });
  if (action === "publish") {
    const now = new Date().toISOString();
    await supabaseAdminRequest("ai_settings?on_conflict=setting_key", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ setting_key: "last_published_at", label: "Last Published", value: now, visibility: "internal", status: "published" })
    });
    return res.status(200).json({ ok: true, lastPublishedAt: now, requestId: id });
  }
  if (action === "upsert") {
    const table = String(payload.table || "");
    if (!ADMIN_TABLES.includes(table)) return res.status(400).json({ error: "Unsupported AI table.", requestId: id });
    const record = payload.record || {};
    const body = {
      ...record,
      visibility: record.visibility || "public",
      status: record.status || "draft",
      updated_at: new Date().toISOString()
    };
    const path = table === "ai_settings" ? `${table}?on_conflict=setting_key` : table;
    const result = await supabaseAdminRequest(path, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(body)
    });
    return res.status(200).json({ record: Array.isArray(result) ? result[0] : result, requestId: id });
  }
  return res.status(400).json({ error: "Unsupported admin action.", requestId: id });
}

function isAdminAction(action) {
  return String(action).startsWith("admin-")
    || [
      "upsert",
      "publish",
      "training-chat",
      "preview-helper",
      "upsert-training-rule",
      "approve-training-rule",
      "archive-training-rule",
      "publish-training",
      "memory-list",
      "memory-upsert",
      "memory-update",
      "memory-delete",
      "outcome-record"
    ].includes(action);
}

async function handler(req, res) {
  const id = requestId(req);
  setApiHeaders(res, id);
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed", requestId: id });
  }
  if (!allowedOrigin(req)) return res.status(403).json({ error: "Origin not allowed", requestId: id });

  const { action = "chat", mode: rawMode = "public", message = "", history = [], page = "", lead = {}, context = {}, payload = {} } = req.body || {};
  const mode = sanitizeMode(rawMode);

  const adminRequested = isAdminAction(action);
  if (!adminRequested && !(await getFeatureFlag("ai_helper_enabled", true))) {
    return res.status(503).json({ error: UNAVAILABLE_REPLY, requestId: id });
  }

  if (adminRequested) {
    try {
      return await adminAction(req, res, id, action, payload);
    } catch (error) {
      console.error(JSON.stringify({ event: "groundskeeper_admin_error", requestId: id, message: error.message }));
      return res.status(error.statusCode || 500).json({ error: error.message || "Unable to manage Groundskeeper AI.", requestId: id });
    }
  }

  const limit = rateLimit(`groundskeeper:${mode}:${clientIp(req)}`, mode === "dashboard" ? 40 : 12, 10 * 60 * 1000);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfter));
    return res.status(429).json({ error: "Too many assistant requests. Please try again shortly.", requestId: id });
  }
  const dailyLimit = rateLimit(`groundskeeper-daily:${mode}:${clientIp(req)}`, Number(process.env.AI_HELPER_DAILY_LIMIT || (mode === "dashboard" ? 240 : 80)), 24 * 60 * 60 * 1000);
  if (!dailyLimit.allowed) {
    res.setHeader("Retry-After", String(dailyLimit.retryAfter));
    return res.status(429).json({ error: "Too many assistant requests today. Please try again later.", requestId: id });
  }

  const userMessage = text(message, 1400);
  if (!userMessage) return res.status(400).json({ error: "Message is required", requestId: id });
  if (String(message || "").length > 1400) return res.status(400).json({ error: "Please keep messages under 1400 characters.", requestId: id });
  let dashboardActor = null;
  if (mode === "dashboard") {
    const permission = await requirePermission(req, "admin:manage", { entityType: "ai_session", action: "groundskeeper_orchestration" });
    if (!permission.ok) return res.status(permission.statusCode || 401).json({ error: permission.error || "Unauthorized", requestId: id });
    dashboardActor = permission.actor;
  }
  if (!shouldUseExternalAi()) return res.status(503).json({ error: UNAVAILABLE_REPLY, requestId: id });

  let aiKnowledge = { settings: [], knowledge: [], faqs: [], rules: [], savedAnswers: [] };
  try {
    aiKnowledge = await loadAiKnowledge(mode);
  } catch (error) {
    console.warn(JSON.stringify({ event: "groundskeeper_knowledge_fallback", requestId: id, message: error.message }));
  }

  const siteContext = buildSiteContext(userMessage, page);
  let orchestration = null;
  if (mode === "dashboard") {
    try {
      const availableMemories = await listAssistantMemories().catch(() => []);
      orchestration = await orchestrateDashboardRequest({
        message: userMessage,
        context,
        actor: dashboardActor,
        hasPermission,
        recentEntities: asArray(context?.recentEntities),
        memories: availableMemories
      });
      if (["invalid", "permission_denied"].includes(orchestration.transitionAttempt?.outcome)) {
        await writeAuditLog({
          actor: dashboardActor,
          action: orchestration.transitionAttempt.outcome === "permission_denied" ? "ai_ticket_transition_permission_denied" : "ai_ticket_transition_invalid",
          entityType: "job_tickets",
          entityId: orchestration.transitionAttempt.ticketId || null,
          oldValue: { stage: orchestration.transitionAttempt.currentStage || null },
          newValue: { stage: orchestration.transitionAttempt.requestedStage || null },
          metadata: {
            ai_initiated: true,
            owner_approved: false,
            outcome: orchestration.transitionAttempt.outcome,
            reason: orchestration.transitionAttempt.error,
            code: orchestration.transitionAttempt.code,
            request_id: id
          },
          module: "tickets"
        });
      }
    } catch (error) {
      console.warn(JSON.stringify({ event: "groundskeeper_orchestration_recovery", requestId: id, message: error.message }));
      orchestration = {
        routing: { primaryIntent: "ambiguous", intents: ["ambiguous"], entities: [], requiresWritePreview: false },
        citations: [],
        verification: {
          factualClaimsVerified: false,
          calculationsVerified: false,
          permissionsVerified: true,
          citationsComplete: true,
          partialResultsDetected: true,
          unresolvedIssues: [`The structured dashboard check could not finish: ${error.message}`],
          safeToReturn: true
        },
        diagnostics: { toolFailures: 1, totalOrchestrationMs: 0 },
        modelContext: "The structured dashboard check failed. Explain that the result is partial and offer a safe retry. Do not invent records."
      };
    }
  }
  const messages = [
    { role: "system", content: BUSINESS_CONTEXT },
    { role: "system", content: siteContext },
    { role: "system", content: buildDynamicContext(aiKnowledge, mode) },
    { role: "system", content: leadContextText(page, lead) },
    { role: "system", content: mode === "dashboard" ? orchestration.modelContext : `Optional page context: ${JSON.stringify(context || {}).slice(0, 2000)}` },
    ...cleanMessages(history),
    { role: "user", content: userMessage }
  ];

  try {
    const modelStartedAt = Date.now();
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        messages,
        temperature: mode === "dashboard" ? 0.55 : 0.45,
        max_tokens: mode === "dashboard" ? 900 : 360
      }),
      signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) throw new Error(`OpenAI request failed (${response.status})`);
    const data = await response.json();
    const modelReply = data?.choices?.[0]?.message?.content?.trim() || "I can help with Urban Yards services, property care, and quote questions.";
    const reply = composeDeterministicReply(orchestration?.toolResults) || modelReply;
    if (orchestration?.diagnostics) {
      orchestration.diagnostics.modelResponseMs = Date.now() - modelStartedAt;
      orchestration.diagnostics.totalMs = orchestration.diagnostics.totalOrchestrationMs + orchestration.diagnostics.modelResponseMs;
    }
    await logConversation({ mode, page, question: userMessage, answer: reply, lead, requestId: id });
    await writeAuditLog({
      action: "ai_helper_used",
      entityType: "ai_session",
      metadata: {
        mode,
        page: String(page || "").slice(0, 120),
        requestId: id,
        intent: orchestration?.routing?.primaryIntent || "",
        tools: orchestration?.toolResults?.map((result) => result.name) || [],
        diagnostics: orchestration?.diagnostics || {}
      }
    });
    console.log(JSON.stringify({ event: "groundskeeper_reply", requestId: id, mode }));
    return res.status(200).json({
      reply,
      requestId: id,
      ...(orchestration ? {
        intent: orchestration.routing,
        citations: orchestration.citations,
        verification: orchestration.verification,
        uiActions: orchestration.uiActions,
        memoryPreview: orchestration.memoryPreview,
        transitionPreview: orchestration.transitionPreview,
        diagnostics: process.env.NODE_ENV === "production" ? undefined : orchestration.diagnostics
      } : {})
    });
  } catch (error) {
    console.error(JSON.stringify({ event: "groundskeeper_error", requestId: id, message: error.message }));
    await writeSystemError({ route: "groundskeeper-ai", error, metadata: { mode, action, requestId: id } });
    return res.status(502).json({ error: UNAVAILABLE_REPLY, requestId: id });
  }
}

module.exports = handler;
