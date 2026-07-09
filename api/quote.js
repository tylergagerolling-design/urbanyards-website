const { saveToAirtable, saveToSupabase, sendEmail, sendWebhook, uploadPhoto } = require("./lib/integrations");
const {
  allowedOrigin, clientIp, rateLimit, requestId, setApiHeaders, text, validEmail, verifyTurnstile
} = require("./lib/security");
const { scanImage, verifyImage } = require("./lib/images");
const { alertSecurityEvent } = require("./lib/monitoring");
const { writeAuditLog, writeSystemError } = require("../netlify/functions/lib/dashboard-auth");

const allowedImageTypes = new Set(["image/jpeg", "image/png"]);

function parsePhotos(input) {
  if (!Array.isArray(input)) return [];
  if (input.length > 3) throw new Error("Please attach no more than 3 photos.");
  return input.map((photo, index) => {
    const type = text(photo?.type, 40).toLowerCase();
    const data = String(photo?.data || "").replace(/^data:[^;]+;base64,/, "");
    if (!allowedImageTypes.has(type)) throw new Error("Photos must be JPG or PNG images.");
    if (!/^[A-Za-z0-9+/=]+$/.test(data) || data.length > 2200000) {
      throw new Error("Each compressed photo must be smaller than 1.6 MB.");
    }
    const sanitized = verifyImage(data, type);
    return { name: text(photo?.name, 100) || `property-photo-${index + 1}.jpg`, type, data: sanitized.toString("base64") };
  });
}

async function handler(req, res) {
  const id = requestId(req);
  setApiHeaders(res, id);
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed", requestId: id });
  }
  if (!allowedOrigin(req)) return res.status(403).json({ error: "Origin not allowed", requestId: id });

  const ip = clientIp(req);
  const limit = rateLimit(`quote:${ip}`, 5, 15 * 60 * 1000);
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfter));
    void alertSecurityEvent("quote_rate_limit", { requestId: id, ip });
    return res.status(429).json({ error: "Too many requests. Please try again later.", requestId: id });
  }

  const body = req.body || {};
  if (text(body.company, 120)) return res.status(200).json({ ok: true, requestId: id });

  const lead = {
    name: text(body.name, 120),
    email: text(body.email, 160).toLowerCase(),
    phone: text(body.phone, 80),
    location: text(body.location, 220),
    service: text(body.service, 160),
    timeline: text(body.timeline, 120),
    message: text(body.message, 3000),
    source: text(body.source, 120) || "Website quote form"
  };
  if (lead.name.length < 2) return res.status(400).json({ error: "Please enter your name.", requestId: id });
  if (!validEmail(lead.email)) return res.status(400).json({ error: "Please enter a valid email.", requestId: id });
  if (!lead.service) return res.status(400).json({ error: "Please select a service.", requestId: id });

  let photos;
  try {
    photos = parsePhotos(body.photos);
  } catch (error) {
    return res.status(400).json({ error: error.message, requestId: id });
  }

  try {
    const human = await verifyTurnstile(text(body.turnstileToken, 2200), ip);
    if (!human) return res.status(400).json({ error: "Please complete the security check.", requestId: id });

    for (const photo of photos) await scanImage(photo);

    let photoUrls = [];
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      try {
        for (const photo of photos) {
          const url = await uploadPhoto(photo, id);
          if (url) photoUrls.push(url);
        }
      } catch (error) {
        photoUrls = [];
        console.error(JSON.stringify({ event: "quote_photo_storage_error", requestId: id, message: error.message }));
      }
    }

    const results = await Promise.allSettled([
      sendEmail(lead, photos, photoUrls, id),
      saveToSupabase(lead, photoUrls, id),
      saveToAirtable(lead, photoUrls, id),
      sendWebhook(lead, photoUrls, id)
    ]);
    const delivered = results.some((result) => result.status === "fulfilled" && result.value === true);
    results.filter((result) => result.status === "rejected").forEach((result) => {
      console.error(JSON.stringify({ event: "quote_delivery_error", requestId: id, message: result.reason?.message }));
    });
    if (!delivered) {
      console.error(JSON.stringify({ event: "quote_not_delivered", requestId: id }));
      void alertSecurityEvent("quote_delivery_outage", { requestId: id });
      return res.status(503).json({ error: "Quote delivery is temporarily unavailable. Please call or email Urban Yards directly.", requestId: id });
    }

    console.log(JSON.stringify({ event: "quote_received", requestId: id, service: lead.service, hasPhotos: photos.length > 0 }));
    await writeAuditLog({
      action: "lead_created",
      entityType: "quote_submissions",
      entityId: id,
      metadata: { source: lead.source, service: lead.service, hasPhotos: photos.length > 0 }
    });
    return res.status(200).json({ ok: true, requestId: id });
  } catch (error) {
    console.error(JSON.stringify({ event: "quote_error", requestId: id, message: error.message }));
    await writeSystemError({ route: "quote", error, metadata: { requestId: id } });
    void alertSecurityEvent("quote_processing_error", { requestId: id, errorType: error.name });
    return res.status(502).json({ error: "We could not send your request. Please try again or contact Urban Yards directly.", requestId: id });
  }
}

module.exports = handler;
