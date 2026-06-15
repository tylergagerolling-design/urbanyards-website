const { runRetentionCleanup } = require("../../api/retention-cleanup");
const { alertSecurityEvent } = require("../../api/lib/monitoring");

exports.handler = async () => {
  try {
    const result = await runRetentionCleanup();
    return { statusCode: 200, body: JSON.stringify({ ok: true, ...result }) };
  } catch (error) {
    await alertSecurityEvent("scheduled_retention_failed", { errorType: error.name });
    return { statusCode: 500, body: JSON.stringify({ error: "Retention cleanup failed" }) };
  }
};

exports.config = { schedule: "@daily" };
