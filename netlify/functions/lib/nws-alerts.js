const { WEATHER_LOCATION } = require("../../../scripts/weather-forecast");

const NWS_ALERTS_CACHE_TTL_MS = 5 * 60 * 1000;
const NWS_REQUEST_TIMEOUT_MS = 8 * 1000;
const NWS_USER_AGENT = "UrbanYardsDashboard/1.0 (tyler@urbanyards.us)";
const VALID_SEVERITIES = new Set(["Extreme", "Severe", "Moderate", "Minor", "Unknown"]);

function cleanText(value, options = {}) {
  if (typeof value !== "string") return "";
  const maxLength = options.maxLength || 20000;
  return value
    .replace(/\0/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim().replace(/[\t ]+/g, " "))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}

function cleanNwsUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" && /(^|\.)weather\.gov$/i.test(url.hostname) ? url.href : "";
  } catch (error) {
    return "";
  }
}

function normalizeSeverity(value) {
  const severity = cleanText(value, { maxLength: 20 });
  return VALID_SEVERITIES.has(severity) ? severity : "Unknown";
}

function normalizeNwsAlert(feature, options = {}) {
  if (!feature || typeof feature !== "object") return null;
  const properties = feature.properties;
  if (!properties || typeof properties !== "object") return null;
  const event = cleanText(properties.event, { maxLength: 160 });
  const expires = cleanText(properties.expires || properties.ends, { maxLength: 80 });
  const id = cleanText(properties.id || feature.id, { maxLength: 500 });
  if (!id || !event || !expires || Number.isNaN(Date.parse(expires))) return null;

  const nowMs = options.nowMs ?? Date.now();
  const expiresAt = Date.parse(expires);
  const effective = cleanText(properties.effective, { maxLength: 80 });
  const onset = cleanText(properties.onset, { maxLength: 80 });
  const beginsAt = Date.parse(onset || effective);
  if (expiresAt <= nowMs || (Number.isFinite(beginsAt) && beginsAt > nowMs)) return null;

  return {
    id,
    event,
    headline: cleanText(properties.headline, { maxLength: 1000 }) || event,
    description: cleanText(properties.description),
    instruction: cleanText(properties.instruction),
    severity: normalizeSeverity(properties.severity),
    urgency: cleanText(properties.urgency, { maxLength: 40 }) || "Unknown",
    certainty: cleanText(properties.certainty, { maxLength: 40 }) || "Unknown",
    effective,
    onset,
    expires,
    senderName: cleanText(properties.senderName, { maxLength: 240 }) || "National Weather Service",
    areaDescription: cleanText(properties.areaDesc, { maxLength: 4000 }),
    response: cleanText(properties.response, { maxLength: 80 }) || "None",
    webUrl: cleanNwsUrl(properties["@id"] || feature.id) || "https://www.weather.gov/"
  };
}

function normalizeNwsAlerts(payload, options = {}) {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.features)) {
    throw new Error("National Weather Service alerts returned an invalid response.");
  }
  const seen = new Set();
  const severityOrder = { Extreme: 0, Severe: 1, Moderate: 2, Minor: 3, Unknown: 4 };
  return payload.features
    .map((feature) => normalizeNwsAlert(feature, options))
    .filter((alert) => {
      if (!alert || seen.has(alert.id)) return false;
      seen.add(alert.id);
      return true;
    })
    .sort((left, right) => {
      return (severityOrder[left.severity] - severityOrder[right.severity]) || Date.parse(left.expires) - Date.parse(right.expires);
    });
}

function alertsEndpoint(location = WEATHER_LOCATION) {
  return `https://api.weather.gov/alerts/active?point=${location.latitude},${location.longitude}`;
}

function json(statusCode, body, cacheControl = "no-store") {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cacheControl,
      Vary: "Accept-Encoding"
    },
    body: JSON.stringify(body)
  };
}

function createNwsAlertsHandler(options = {}) {
  const location = options.location || WEATHER_LOCATION;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const now = options.now || Date.now;
  let successfulCache = null;
  let activeRequest = null;

  return async function handler(event = {}) {
    if ((event.httpMethod || "GET") !== "GET") {
      return json(405, { ok: false, error: "Method Not Allowed" });
    }

    const nowMs = Number(now());
    if (successfulCache?.expiresAt > nowMs) {
      return json(200, { ...successfulCache.payload, cache: "fresh" }, "public, max-age=300, stale-if-error=600");
    }
    if (activeRequest) return activeRequest;
    if (typeof fetchImpl !== "function") {
      return json(503, { ok: false, error: "Weather alerts are temporarily unavailable." });
    }

    activeRequest = (async () => {
      const sourceUrl = alertsEndpoint(location);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), NWS_REQUEST_TIMEOUT_MS);
      try {
        const response = await fetchImpl(sourceUrl, {
          headers: {
            Accept: "application/geo+json",
            "User-Agent": NWS_USER_AGENT
          },
          signal: controller.signal
        });
        if (!response?.ok) throw new Error(`NWS alerts request failed (${response?.status || "network"}).`);
        const payload = await response.json();
        const alerts = normalizeNwsAlerts(payload, { nowMs });
        const normalized = {
          ok: true,
          alerts,
          fetchedAt: nowMs,
          expiresAt: nowMs + NWS_ALERTS_CACHE_TTL_MS,
          stale: false,
          location: {
            name: location.name,
            latitude: location.latitude,
            longitude: location.longitude,
            timeZone: location.timeZone
          },
          sourceUrl
        };
        successfulCache = { payload: normalized, expiresAt: normalized.expiresAt };
        return json(200, { ...normalized, cache: "miss" }, "public, max-age=300, stale-if-error=600");
      } catch (error) {
        console.error("NWS alerts request failed.", {
          message: error?.message || String(error),
          endpoint: alertsEndpoint(location)
        });
        if (successfulCache?.payload) {
          return json(200, {
            ...successfulCache.payload,
            alerts: successfulCache.payload.alerts.filter((alert) => Date.parse(alert.expires) > nowMs),
            stale: true,
            warning: "Weather alerts are temporarily unavailable.",
            cache: "stale"
          });
        }
        return json(503, { ok: false, error: "Weather alerts are temporarily unavailable." });
      } finally {
        clearTimeout(timeout);
      }
    })().finally(() => {
      activeRequest = null;
    });

    return activeRequest;
  };
}

module.exports = {
  WEATHER_LOCATION,
  NWS_ALERTS_CACHE_TTL_MS,
  NWS_REQUEST_TIMEOUT_MS,
  NWS_USER_AGENT,
  cleanText,
  cleanNwsUrl,
  normalizeNwsAlert,
  normalizeNwsAlerts,
  alertsEndpoint,
  createNwsAlertsHandler
};
