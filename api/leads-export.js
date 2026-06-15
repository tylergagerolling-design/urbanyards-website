const { alertSecurityEvent } = require("./lib/monitoring");
const { requestId, safeEqual, setApiHeaders } = require("./lib/security");

function csvCell(value) {
  const text = Array.isArray(value)
    ? value.map((item) => item?.url || item).join(" | ")
    : String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

module.exports = async function handler(req, res) {
  const id = requestId(req);
  setApiHeaders(res, id);
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed", requestId: id });
  const supplied = String(req.headers?.authorization || "").replace(/^Bearer\s+/i, "");
  if (!safeEqual(supplied, process.env.ADMIN_EXPORT_TOKEN)) {
    void alertSecurityEvent("lead_export_unauthorized", { requestId: id });
    return res.status(401).json({ error: "Unauthorized", requestId: id });
  }

  const { AIRTABLE_TOKEN: token, AIRTABLE_BASE_ID: baseId, AIRTABLE_TABLE_NAME: table } = process.env;
  if (!token || !baseId || !table) return res.status(503).json({ error: "Lead archive is not configured", requestId: id });

  try {
    const records = [];
    let offset = "";
    do {
      const query = new URLSearchParams({ pageSize: "100", "sort[0][field]": "Received At", "sort[0][direction]": "desc" });
      if (offset) query.set("offset", offset);
      const response = await fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) throw new Error(`Airtable export failed (${response.status})`);
      const page = await response.json();
      records.push(...page.records);
      offset = page.offset || "";
    } while (offset && records.length < 5000);

    const columns = ["Request ID", "Received At", "Name", "Email", "Phone", "Location", "Service", "Timeline", "Message", "Source", "Photos"];
    const csv = [columns.map(csvCell).join(","), ...records.map((record) => columns.map((column) => csvCell(record.fields?.[column])).join(","))].join("\r\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="urban-yards-leads-${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.status(200).send(csv);
  } catch (error) {
    console.error(JSON.stringify({ event: "lead_export_error", requestId: id, message: error.message }));
    return res.status(502).json({ error: "Lead export failed", requestId: id });
  }
};
