const { escapeHtml } = require("./security");
const crypto = require("node:crypto");

async function uploadPhoto(photo, requestId) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = process.env.CLOUDINARY_FOLDER || "urban-yards/quote-requests";
  const publicId = `${requestId}-${crypto.randomUUID()}`;
  const context = `request_id=${requestId}`;
  const signatureBase = `context=${context}&folder=${folder}&public_id=${publicId}&timestamp=${timestamp}`;
  const signature = crypto.createHash("sha1").update(signatureBase + apiSecret).digest("hex");
  const form = new FormData();
  form.append("file", `data:${photo.type};base64,${photo.data}`);
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);
  form.append("folder", folder);
  form.append("public_id", publicId);
  form.append("context", context);
  const deliveryType = process.env.CLOUDINARY_DELIVERY_TYPE === "authenticated" ? "authenticated" : "upload";
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/${deliveryType}`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`Cloudinary upload failed (${response.status})`);
  const data = await response.json();
  return deliveryType === "authenticated" ? null : data.secure_url;
}

function quoteHtml(lead, photoUrls, requestId) {
  const rows = [
    ["Name", lead.name],
    ["Email", lead.email],
    ["Phone", lead.phone || "Not provided"],
    ["Property", lead.location || "Not provided"],
    ["Service", lead.service],
    ["Timeline", lead.timeline || "Not provided"],
    ["Message", lead.message || "Not provided"],
    ["Request ID", requestId]
  ];
  const details = rows.map(([label, value]) => `<tr><th align="left" style="padding:6px 12px 6px 0">${label}</th><td style="padding:6px 0">${escapeHtml(value)}</td></tr>`).join("");
  const photos = photoUrls.length
    ? `<h3>Photos</h3><ul>${photoUrls.map((url) => `<li><a href="${escapeHtml(url)}">View uploaded photo</a></li>`).join("")}</ul>`
    : "";
  return `<h2>New Urban Yards quote request</h2><table>${details}</table>${photos}`;
}

async function sendEmail(lead, photos, photoUrls, requestId) {
  if (!process.env.RESEND_API_KEY) return false;
  const toEmail = process.env.QUOTE_TO_EMAIL || "team@urbanyards.us";
  const attachments = photoUrls.length ? [] : photos.map((photo) => ({
    filename: photo.name,
    content: photo.data
  }));
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: process.env.QUOTE_FROM_EMAIL || "Urban Yards Website <quotes@urbanyards.us>",
      to: [toEmail],
      reply_to: lead.email,
      subject: `Quote request: ${lead.service} - ${lead.name}`,
      html: quoteHtml(lead, photoUrls, requestId),
      attachments
    }),
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`Resend delivery failed (${response.status})`);
  return true;
}

async function saveToAirtable(lead, photoUrls, requestId) {
  const token = process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const table = process.env.AIRTABLE_TABLE_NAME;
  if (!token || !baseId || !table) return false;
  const fields = {
    "Request ID": requestId,
    "Received At": new Date().toISOString(),
    Name: lead.name,
    Email: lead.email,
    Phone: lead.phone,
    Location: lead.location,
    Service: lead.service,
    Timeline: lead.timeline,
    Message: lead.message,
    Source: lead.source || "Website",
    Photos: photoUrls.map((url) => ({ url }))
  };
  const response = await fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ records: [{ fields }], typecast: true }),
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`Airtable delivery failed (${response.status})`);
  return true;
}

async function sendWebhook(lead, photoUrls, requestId) {
  if (!process.env.QUOTE_WEBHOOK_URL) return false;
  const payload = JSON.stringify({ requestId, receivedAt: new Date().toISOString(), lead, photoUrls });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const secret = process.env.QUOTE_WEBHOOK_SECRET || "";
  const signature = secret
    ? crypto.createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex")
    : "";
  const response = await fetch(process.env.QUOTE_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Urban-Yards-Timestamp": timestamp,
      ...(signature ? { "X-Urban-Yards-Signature": `sha256=${signature}` } : {})
    },
    body: payload,
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`Quote webhook failed (${response.status})`);
  return true;
}

module.exports = { saveToAirtable, sendEmail, sendWebhook, uploadPhoto };
