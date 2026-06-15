const { alertSecurityEvent } = require("./lib/monitoring");
const { requestId, safeEqual, setApiHeaders } = require("./lib/security");

async function deleteExpiredAirtableRecords(cutoff) {
  const { AIRTABLE_TOKEN: token, AIRTABLE_BASE_ID: baseId, AIRTABLE_TABLE_NAME: table } = process.env;
  if (!token || !baseId || !table) return 0;
  const formula = `IS_BEFORE({Received At}, '${cutoff.toISOString()}')`;
  const query = new URLSearchParams({ pageSize: "100", filterByFormula: formula });
  const response = await fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`Airtable retention lookup failed (${response.status})`);
  const data = await response.json();
  const ids = data.records.map((record) => record.id);
  for (let index = 0; index < ids.length; index += 10) {
    const deleteQuery = new URLSearchParams();
    ids.slice(index, index + 10).forEach((id) => deleteQuery.append("records[]", id));
    const deletion = await fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?${deleteQuery}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(12000)
    });
    if (!deletion.ok) throw new Error(`Airtable retention deletion failed (${deletion.status})`);
  }
  return ids.length;
}

async function deleteExpiredCloudinaryPhotos(cutoff) {
  const { CLOUDINARY_CLOUD_NAME: cloud, CLOUDINARY_API_KEY: key, CLOUDINARY_API_SECRET: secret } = process.env;
  if (!cloud || !key || !secret) return 0;
  const type = process.env.CLOUDINARY_DELIVERY_TYPE === "authenticated" ? "authenticated" : "upload";
  const prefix = process.env.CLOUDINARY_FOLDER || "urban-yards/quote-requests";
  const auth = Buffer.from(`${key}:${secret}`).toString("base64");
  let cursor = "";
  const expired = [];
  do {
    const query = new URLSearchParams({ type, prefix, max_results: "100" });
    if (cursor) query.set("next_cursor", cursor);
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/resources/image/${type}?${query}`, {
      headers: { Authorization: `Basic ${auth}` },
      signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) throw new Error(`Cloudinary retention lookup failed (${response.status})`);
    const page = await response.json();
    expired.push(...page.resources.filter((resource) => new Date(resource.created_at) < cutoff).map((resource) => resource.public_id));
    cursor = page.next_cursor || "";
  } while (cursor && expired.length < 1000);

  for (let index = 0; index < expired.length; index += 100) {
    const form = new URLSearchParams({ type, resource_type: "image", invalidate: "true" });
    expired.slice(index, index + 100).forEach((id) => form.append("public_ids[]", id));
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/resources/image/${type}`, {
      method: "DELETE",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) throw new Error(`Cloudinary retention deletion failed (${response.status})`);
  }
  return expired.length;
}

async function runRetentionCleanup() {
  const days = Math.min(730, Math.max(7, Number(process.env.LEAD_RETENTION_DAYS || 180)));
  const cutoff = new Date(Date.now() - days * 86400000);
  const [airtableDeleted, cloudinaryDeleted] = await Promise.all([
    deleteExpiredAirtableRecords(cutoff),
    deleteExpiredCloudinaryPhotos(cutoff)
  ]);
  console.log(JSON.stringify({ event: "retention_cleanup", cutoff: cutoff.toISOString(), airtableDeleted, cloudinaryDeleted }));
  return { cutoff: cutoff.toISOString(), airtableDeleted, cloudinaryDeleted };
}

async function handler(req, res) {
  const id = requestId(req);
  setApiHeaders(res, id);
  const supplied = String(req.headers?.authorization || "").replace(/^Bearer\s+/i, "");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed", requestId: id });
  if (!safeEqual(supplied, process.env.RETENTION_JOB_SECRET)) {
    void alertSecurityEvent("retention_job_unauthorized", { requestId: id });
    return res.status(401).json({ error: "Unauthorized", requestId: id });
  }
  try {
    return res.status(200).json({ ok: true, ...(await runRetentionCleanup()), requestId: id });
  } catch (error) {
    void alertSecurityEvent("retention_job_failed", { requestId: id, errorType: error.name });
    return res.status(502).json({ error: "Retention cleanup failed", requestId: id });
  }
}

module.exports = handler;
module.exports.runRetentionCleanup = runRetentionCleanup;
