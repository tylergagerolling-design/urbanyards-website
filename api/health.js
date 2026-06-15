const { requestId, setApiHeaders } = require("./lib/security");

module.exports = async function handler(req, res) {
  const id = requestId(req);
  setApiHeaders(res, id);
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed", requestId: id });
  return res.status(200).json({
    ok: true,
    service: "urban-yards-website",
    timestamp: new Date().toISOString(),
    integrations: {
      assistant: Boolean(process.env.OPENAI_API_KEY),
      email: Boolean(process.env.RESEND_API_KEY && process.env.QUOTE_TO_EMAIL),
      leadArchive: Boolean(process.env.AIRTABLE_TOKEN && process.env.AIRTABLE_BASE_ID && process.env.AIRTABLE_TABLE_NAME),
      photoStorage: Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
      retention: Boolean(process.env.LEAD_RETENTION_DAYS),
      securityAlerts: Boolean(process.env.SECURITY_ALERT_WEBHOOK_URL),
      spamChallenge: Boolean(process.env.TURNSTILE_SECRET_KEY)
    }
  });
};
