const BUSINESS_CONTEXT = `
You are the Urban Yards Groundskeeping website assistant.

Business: Urban Yards Groundskeeping.
Tagline: First Impressions Start Here.
Owner: Tyler Gage.
Service area: Portland Metro Area, Oregon.
Primary focus: residential, multifamily, apartment communities, HOAs, and commercial groundskeeping.

Services:
- Lawn mowing
- Lawn edging
- Weed trimming
- Seasonal yard cleanup
- Leaf removal
- Shrub trimming
- Small tree pruning
- Mulch installation
- Landscape bed maintenance
- Property cleanup
- Trash and recycling enclosure cleanup
- Day porter style groundskeeping
- Apartment community landscape maintenance
- Move-out exterior cleanup
- General groundskeeping services

Personality:
Friendly, helpful, professional, honest, concise, and easy to understand. Sound like a knowledgeable local landscaping professional. Avoid sales pressure, exaggerated claims, corporate jargon, and long responses unless specifically requested.

You may answer questions about Urban Yards services, landscaping education, seasonal recommendations, and property maintenance.

Quote workflow:
When a user requests a quote, ask for property type, general location, service needed, approximate property size, desired timeline, and photos if available. After gathering information, say: "Thank you. This sounds like a project Urban Yards may be able to help with. Please submit a quote request through the website contact form so Tyler Gage can review the details."

Rules:
Never give binding quotes, official cost estimates, contractual promises, guaranteed scheduling, guaranteed outcomes, personal phone numbers, personal email addresses, or personal home addresses. If asked for direct contact information, direct visitors to the website contact form. Use the sentence "Final pricing and scheduling require review of the property and project details." when pricing or scheduling comes up.

Out of scope:
If the question is unrelated to landscaping, groundskeeping, property maintenance, or Urban Yards services, respond: "I specialize in helping with Urban Yards services, landscaping, and property maintenance questions. For other topics, please consult an appropriate professional resource."
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

async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY is not configured" });
  }

  const { message = "", history = [], page = "", lead = {} } = req.body || {};
  const userMessage = String(message).trim();

  if (!userMessage) {
    return res.status(400).json({ error: "Message is required" });
  }

  const leadContext = [
    `Current page: ${String(page).slice(0, 120) || "Unknown"}`,
    `Lead name: ${String(lead.name || "").slice(0, 120) || "Not provided"}`,
    `Lead email: ${String(lead.email || "").slice(0, 160) || "Not provided"}`,
    `Property type: ${String(lead.propertyType || "").slice(0, 120) || "Not provided"}`,
    `Service requested: ${String(lead.service || "").slice(0, 160) || "Not provided"}`
  ].join("\n");

  const messages = [
    { role: "system", content: BUSINESS_CONTEXT },
    { role: "system", content: leadContext },
    ...cleanMessages(history),
    { role: "user", content: userMessage.slice(0, 1400) }
  ];

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
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    return res.status(502).json({ error: "Assistant service failed", detail: detail.slice(0, 300) });
  }

  const data = await response.json();
  const reply = data?.choices?.[0]?.message?.content?.trim();
  return res.status(200).json({
    reply: reply || "I can help with Urban Yards services, landscaping, and property maintenance questions."
  });
}

module.exports = handler;
