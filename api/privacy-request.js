const crypto = require("node:crypto");
const { alertSecurityEvent } = require("./lib/monitoring");
const { allowedOrigin, clientIp, rateLimit, requestId, setApiHeaders, text, validEmail, verifyTurnstile } = require("./lib/security");

async function deliverRequest(payload) {
  if (process.env.PRIVACY_REQUEST_WEBHOOK_URL) {
    const body = JSON.stringify(payload);
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = process.env.PRIVACY_REQUEST_WEBHOOK_SECRET
      ? crypto.createHmac("sha256", process.env.PRIVACY_REQUEST_WEBHOOK_SECRET).update(`${timestamp}.${body}`).digest("hex")
      : "";
    const response = await fetch(process.env.PRIVACY_REQUEST_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Urban-Yards-Timestamp": timestamp, ...(signature ? { "X-Urban-Yards-Signature": `sha256=${signature}` } : {}) },
      body,
      signal: AbortSignal.timeout(10000)
    });
    if (response.ok) return true;
  }
  if (!process.env.RESEND_API_KEY || !process.env.QUOTE_TO_EMAIL) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.QUOTE_FROM_EMAIL || "Urban Yards Website <quotes@urbanyards.us>",
      to: [process.env.QUOTE_TO_EMAIL],
      reply_to: payload.email,
      subject: `Privacy deletion request - ${payload.requestId}`,
      text: `A customer requested deletion of website data.\n\nEmail: ${payload.email}\nOriginal quote request ID: ${payload.quoteRequestId || "Not provided"}\nPrivacy request ID: ${payload.requestId}`
    }),
    signal: AbortSignal.timeout(10000)
  });
  return response.ok;
}

module.exports = async function handler(req, res) {
  const id = requestId(req);
  setApiHeaders(res, id);
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed", requestId: id });
  if (!allowedOrigin(req)) return res.status(403).json({ error: "Origin not allowed", requestId: id });
  const ip = clientIp(req);
  const limit = rateLimit(`privacy:${ip}`, 3, 60 * 60 * 1000);
  if (!limit.allowed) return res.status(429).json({ error: "Too many requests", requestId: id });
  const email = text(req.body?.email, 160).toLowerCase();
  if (!validEmail(email)) return res.status(400).json({ error: "A valid email is required", requestId: id });
  try {
    if (!await verifyTurnstile(text(req.body?.turnstileToken, 2200), ip)) return res.status(400).json({ error: "Please complete the security check", requestId: id });
    const delivered = await deliverRequest({ requestId: id, email, quoteRequestId: text(req.body?.quoteRequestId, 80) });
    if (!delivered) throw new Error("No privacy request delivery channel configured");
    return res.status(202).json({ ok: true, requestId: id });
  } catch (error) {
    void alertSecurityEvent("privacy_request_delivery_failed", { requestId: id, errorType: error.name });
    return res.status(503).json({ error: "Privacy request delivery is temporarily unavailable", requestId: id });
  }
};
