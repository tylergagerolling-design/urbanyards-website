const crypto = require("node:crypto");

function redact(value) {
  const blocked = new Set(["email", "phone", "name", "location", "message", "photos", "lead"]);
  return Object.fromEntries(Object.entries(value || {}).filter(([key]) => !blocked.has(key.toLowerCase())));
}

async function alertSecurityEvent(event, details = {}) {
  const url = process.env.SECURITY_ALERT_WEBHOOK_URL;
  const payload = JSON.stringify({
    event,
    service: "urban-yards-website",
    occurredAt: new Date().toISOString(),
    details: redact(details)
  });
  console.warn(payload);
  if (!url) return false;

  const timestamp = String(Math.floor(Date.now() / 1000));
  const secret = process.env.SECURITY_ALERT_WEBHOOK_SECRET || "";
  const signature = secret
    ? crypto.createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex")
    : "";
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Urban-Yards-Timestamp": timestamp,
        ...(signature ? { "X-Urban-Yards-Signature": `sha256=${signature}` } : {})
      },
      body: payload,
      signal: AbortSignal.timeout(6000)
    });
    return response.ok;
  } catch (error) {
    console.error(JSON.stringify({ event: "security_alert_delivery_failed", message: error.message }));
    return false;
  }
}

module.exports = { alertSecurityEvent };
