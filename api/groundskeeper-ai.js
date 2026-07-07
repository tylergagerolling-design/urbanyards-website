const { buildSiteContext, publicKnowledgeSnapshot } = require("./lib/site-knowledge");
const {
  allowedOrigin, clientIp, rateLimit, requestId, setApiHeaders, text
} = require("./lib/security");
const { supabaseAdminRequest, verifyOwner } = require("../netlify/functions/lib/dashboard-auth");

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
`;

const UNAVAILABLE_REPLY = "Sorry, the AI helper is not available right now. You can still request a free quote.";
const PUBLIC_TABLES = ["ai_settings", "ai_knowledge", "ai_faqs", "ai_rules", "ai_saved_answers"];
const ADMIN_TABLES = [...PUBLIC_TABLES, "ai_conversation_logs", "ai_feedback"];

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

async function tableRows(table, query = "select=*&order=updated_at.desc") {
  try {
    return await supabaseAdminRequest(`${table}?${query}`, { method: "GET" });
  } catch (error) {
    if (/does not exist|schema cache|relation/i.test(error.message)) return [];
    throw error;
  }
}

async function loadAiKnowledge(mode) {
  const [settings, knowledge, faqs, rules, savedAnswers] = await Promise.all([
    tableRows("ai_settings"),
    tableRows("ai_knowledge"),
    tableRows("ai_faqs"),
    tableRows("ai_rules"),
    tableRows("ai_saved_answers")
  ]);
  const filter = mode === "public" ? publicFilter : () => true;
  return {
    settings: asArray(settings).filter(filter),
    knowledge: asArray(knowledge).filter(filter),
    faqs: asArray(faqs).filter(filter),
    rules: asArray(rules).filter(filter),
    savedAnswers: asArray(savedAnswers).filter(filter)
  };
}

async function adminSnapshot() {
  const [settings, knowledge, faqs, rules, savedAnswers, logs, feedback] = await Promise.all([
    tableRows("ai_settings"),
    tableRows("ai_knowledge"),
    tableRows("ai_faqs"),
    tableRows("ai_rules"),
    tableRows("ai_saved_answers"),
    tableRows("ai_conversation_logs", "select=*&order=created_at.desc&limit=100"),
    tableRows("ai_feedback", "select=*&order=created_at.desc&limit=100")
  ]);
  return { settings, knowledge, faqs, rules, savedAnswers, logs, feedback, fallback: publicKnowledgeSnapshot() };
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
    ["Saved answers", ai.savedAnswers]
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

async function adminAction(req, res, id, action, payload) {
  if (!(await requireAdmin(req))) return res.status(401).json({ error: "Unauthorized", requestId: id });
  if (action === "admin-list") return res.status(200).json({ ...(await adminSnapshot()), requestId: id });
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

  if (String(action).startsWith("admin-") || action === "upsert" || action === "publish") {
    try {
      return await adminAction(req, res, id, action, payload);
    } catch (error) {
      console.error(JSON.stringify({ event: "groundskeeper_admin_error", requestId: id, message: error.message }));
      return res.status(500).json({ error: error.message || "Unable to manage Groundskeeper AI.", requestId: id });
    }
  }

  const limit = rateLimit(`groundskeeper:${mode}:${clientIp(req)}`, mode === "dashboard" ? 40 : 12, 10 * 60 * 1000);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfter));
    return res.status(429).json({ error: "Too many assistant requests. Please try again shortly.", requestId: id });
  }

  const userMessage = text(message, 1400);
  if (!userMessage) return res.status(400).json({ error: "Message is required", requestId: id });
  if (String(message || "").length > 1400) return res.status(400).json({ error: "Please keep messages under 1400 characters.", requestId: id });
  if (mode === "dashboard" && !(await requireAdmin(req))) return res.status(401).json({ error: "Unauthorized", requestId: id });
  if (!shouldUseExternalAi()) return res.status(503).json({ error: UNAVAILABLE_REPLY, requestId: id });

  let aiKnowledge = { settings: [], knowledge: [], faqs: [], rules: [], savedAnswers: [] };
  try {
    aiKnowledge = await loadAiKnowledge(mode);
  } catch (error) {
    console.warn(JSON.stringify({ event: "groundskeeper_knowledge_fallback", requestId: id, message: error.message }));
  }

  const siteContext = buildSiteContext(userMessage, page);
  const messages = [
    { role: "system", content: BUSINESS_CONTEXT },
    { role: "system", content: siteContext },
    { role: "system", content: buildDynamicContext(aiKnowledge, mode) },
    { role: "system", content: leadContextText(page, lead) },
    { role: "system", content: `Optional dashboard/page context: ${JSON.stringify(context || {}).slice(0, 2000)}` },
    ...cleanMessages(history),
    { role: "user", content: userMessage }
  ];

  try {
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
        max_tokens: mode === "dashboard" ? 520 : 360
      }),
      signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) throw new Error(`OpenAI request failed (${response.status})`);
    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() || "I can help with Urban Yards services, property care, and quote questions.";
    await logConversation({ mode, page, question: userMessage, answer: reply, lead, requestId: id });
    console.log(JSON.stringify({ event: "groundskeeper_reply", requestId: id, mode }));
    return res.status(200).json({ reply, requestId: id });
  } catch (error) {
    console.error(JSON.stringify({ event: "groundskeeper_error", requestId: id, message: error.message }));
    return res.status(502).json({ error: UNAVAILABLE_REPLY, requestId: id });
  }
}

module.exports = handler;
