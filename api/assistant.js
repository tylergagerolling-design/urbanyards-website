const BUSINESS_CONTEXT = `
You are The Groundskeeper, the website assistant for Urban Yards Groundskeeping.

Act like a helpful Urban Yards website guide. Answer from the provided Urban Yards website knowledge source first. Do not invent services, prices, guarantees, certifications, service areas, availability, portfolio projects, or policies that are not in the site knowledge.

Tone: helpful, professional, local, plain-spoken, and not overly salesy.

Priorities:
1. Answer the user's question with site-specific facts.
2. When relevant, guide the visitor toward the free quote form.
3. Keep answers short and useful.
4. If the site does not cover the answer, say: "I don't see that listed on the site, but you can request a quote and Urban Yards can confirm."

Rules:
- Never provide final pricing, guaranteed scheduling, or contractual promises.
- Do not mention Tyler Gage unless asked whether Urban Yards is owner operated or who owns it.
- If asked for contact details, use the site contact details only.
- If a question is unrelated to Urban Yards services, landscaping, groundskeeping, property maintenance, or quote/contact details, say you specialize in Urban Yards website and service questions.
`;

const { buildSiteContext } = require("./lib/site-knowledge");

const {
  allowedOrigin, clientIp, rateLimit, requestId, setApiHeaders, text
} = require("./lib/security");

function cleanMessages(history = []) {
  return history
    .filter((message) => ["user", "assistant"].includes(message?.role) && typeof message?.content === "string")
    .slice(-10)
    .map((message) => ({
      role: message.role,
      content: message.content.slice(0, 1200)
    }));
}

async function handler(req, res) {
  const id = requestId(req);
  setApiHeaders(res, id);
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed", requestId: id });
  }

  if (!allowedOrigin(req)) return res.status(403).json({ error: "Origin not allowed", requestId: id });
  const limit = rateLimit(`assistant:${clientIp(req)}`, 20, 10 * 60 * 1000);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfter));
    return res.status(429).json({ error: "Too many assistant requests. Please try again shortly.", requestId: id });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: "Assistant is temporarily unavailable", requestId: id });
  }

  const { message = "", history = [], page = "", lead = {} } = req.body || {};
  const userMessage = text(message, 1400);

  if (!userMessage) {
    return res.status(400).json({ error: "Message is required", requestId: id });
  }

  const leadContext = [
    `Current page: ${String(page).slice(0, 120) || "Unknown"}`,
    `Lead name: ${String(lead.name || "").slice(0, 120) || "Not provided"}`,
    `Lead email: ${String(lead.email || "").slice(0, 160) || "Not provided"}`,
    `Lead phone: ${String(lead.phone || "").slice(0, 80) || "Not provided"}`,
    `Property type: ${String(lead.propertyType || "").slice(0, 120) || "Not provided"}`,
    `Property location: ${String(lead.propertyLocation || "").slice(0, 180) || "Not provided"}`,
    `Service requested: ${String(lead.service || "").slice(0, 160) || "Not provided"}`
  ].join("\n");
  const siteContext = buildSiteContext(userMessage, page);

  const messages = [
    { role: "system", content: BUSINESS_CONTEXT },
    { role: "system", content: siteContext },
    { role: "system", content: leadContext },
    ...cleanMessages(history),
    { role: "user", content: userMessage.slice(0, 1400) }
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
        temperature: 0.45,
        max_tokens: 360
      }),
      signal: AbortSignal.timeout(12000)
    });

    if (!response.ok) throw new Error(`OpenAI request failed (${response.status})`);
    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();
    console.log(JSON.stringify({ event: "assistant_reply", requestId: id }));
    return res.status(200).json({
      reply: reply || "I can help with Urban Yards services, landscaping, and property maintenance questions.",
      requestId: id
    });
  } catch (error) {
    console.error(JSON.stringify({ event: "assistant_error", requestId: id, message: error.message }));
    return res.status(502).json({ error: "Assistant is temporarily unavailable", requestId: id });
  }
}

module.exports = handler;
