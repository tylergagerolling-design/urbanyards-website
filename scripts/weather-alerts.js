(function attachUrbanYardsWeatherAlerts(root, factory) {
  const weather = typeof module === "object" && module.exports
    ? require("./weather-forecast")
    : root?.UrbanYardsWeather;
  const api = factory(weather);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.UrbanYardsWeatherAlerts = api;
})(typeof window !== "undefined" ? window : globalThis, function createUrbanYardsWeatherAlerts(weather) {
  "use strict";

  const WEATHER_LOCATION = weather?.WEATHER_LOCATION || Object.freeze({ timeZone: "America/Los_Angeles" });
  const ALERTS_ENDPOINT = "/.netlify/functions/nws-alerts";
  const ALERTS_CACHE_KEY = "urban-yards-weather-alerts-v1";
  const ALERTS_CACHE_VERSION = 1;
  const ALERTS_CACHE_TTL_MS = 10 * 60 * 1000;
  const activeRequests = new Map();
  const VALID_SEVERITIES = new Set(["Extreme", "Severe", "Moderate", "Minor", "Unknown"]);

  function safeText(value, fallback = "") {
    const text = typeof value === "string" ? value.trim() : "";
    return text || fallback;
  }

  function safeNwsUrl(value) {
    try {
      const url = new URL(String(value || ""));
      return url.protocol === "https:" && /(^|\.)weather\.gov$/i.test(url.hostname) ? url.href : "";
    } catch (error) {
      return "";
    }
  }

  function normalizeSeverity(value) {
    const severity = safeText(value);
    return VALID_SEVERITIES.has(severity) ? severity : "Unknown";
  }

  function normalizeAlert(alert = {}) {
    if (!alert || typeof alert !== "object") return null;
    const id = safeText(alert.id);
    const event = safeText(alert.event);
    const expires = safeText(alert.expires);
    if (!id || !event || !expires || Number.isNaN(Date.parse(expires))) return null;
    return {
      id,
      event,
      headline: safeText(alert.headline, event),
      description: safeText(alert.description),
      instruction: safeText(alert.instruction),
      severity: normalizeSeverity(alert.severity),
      urgency: safeText(alert.urgency, "Unknown"),
      certainty: safeText(alert.certainty, "Unknown"),
      effective: safeText(alert.effective),
      onset: safeText(alert.onset),
      expires,
      senderName: safeText(alert.senderName, "National Weather Service"),
      areaDescription: safeText(alert.areaDescription),
      response: safeText(alert.response, "None"),
      webUrl: safeNwsUrl(alert.webUrl)
    };
  }

  function isAlertActive(alert, nowMs = Date.now()) {
    const expiresAt = Date.parse(alert?.expires || "");
    if (!Number.isFinite(expiresAt) || expiresAt <= nowMs) return false;
    const beginsAt = Date.parse(alert?.onset || alert?.effective || "");
    return !Number.isFinite(beginsAt) || beginsAt <= nowMs;
  }

  function normalizeAlerts(alerts, options = {}) {
    if (!Array.isArray(alerts)) return [];
    const nowMs = options.nowMs ?? Date.now();
    const seen = new Set();
    return alerts
      .map(normalizeAlert)
      .filter((alert) => {
        if (!alert || seen.has(alert.id) || !isAlertActive(alert, nowMs)) return false;
        seen.add(alert.id);
        return true;
      })
      .sort((left, right) => {
        const order = { Extreme: 0, Severe: 1, Moderate: 2, Minor: 3, Unknown: 4 };
        return (order[left.severity] - order[right.severity]) || Date.parse(left.expires) - Date.parse(right.expires);
      });
  }

  function resolveAlertIcon(eventName) {
    const label = safeText(eventName).toLowerCase();
    if (/tornado/.test(label)) return "tornado";
    if (/hurricane/.test(label)) return "hurricane";
    if (/tropical/.test(label)) return "tropical-storm";
    if (/thunder|lightning/.test(label)) return "severe-thunderstorm";
    if (/air quality/.test(label)) return "air-quality";
    if (/smoke/.test(label)) return "smoke";
    if (/haze/.test(label)) return "haze";
    if (/heat|excessive temperature/.test(label)) return "hot";
    if (/flood|flash flood/.test(label)) return "heavy-rain";
    if (/high wind|wind warning|wind advisory|gust/.test(label)) return "strong-wind";
    if (/wind/.test(label)) return "windy";
    if (/blizzard/.test(label)) return "blizzard";
    if (/freezing rain|ice storm/.test(label)) return "freezing-rain";
    if (/sleet|winter weather/.test(label)) return "sleet";
    if (/snow|winter storm/.test(label)) return "snow";
    if (/fog/.test(label)) return "fog";
    if (/rain|coastal storm/.test(label)) return "heavy-rain";
    return "";
  }

  function dateKey(value, timeZone = WEATHER_LOCATION.timeZone) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(date);
    const part = (type) => parts.find((entry) => entry.type === type)?.value || "";
    return `${part("year")}-${part("month")}-${part("day")}`;
  }

  function formatAlertExpiration(value, options = {}) {
    const target = new Date(value);
    if (Number.isNaN(target.getTime())) return "Expiration time unavailable";
    const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
    const timeZone = options.timeZone || WEATHER_LOCATION.timeZone;
    const today = dateKey(now, timeZone);
    let tomorrow = "";
    for (let hours = 1; hours <= 36 && !tomorrow; hours += 1) {
      const candidate = dateKey(new Date(now.getTime() + hours * 60 * 60 * 1000), timeZone);
      if (candidate && candidate !== today) tomorrow = candidate;
    }
    const targetDay = dateKey(target, timeZone);
    const time = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(target);
    if (targetDay === today) return `Expires today at ${time}`;
    if (targetDay === tomorrow) return `Expires tomorrow at ${time}`;
    const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long" }).format(target);
    return `Expires ${weekday} at ${time}`;
  }

  function formatAlertTimestamp(value, options = {}) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not provided";
    return new Intl.DateTimeFormat("en-US", {
      timeZone: options.timeZone || WEATHER_LOCATION.timeZone,
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }).format(date);
  }

  function readAlertsCache(storage, options = {}) {
    if (!storage?.getItem) return null;
    try {
      const record = JSON.parse(storage.getItem(options.cacheKey || ALERTS_CACHE_KEY) || "null");
      if (!record || record.version !== ALERTS_CACHE_VERSION || !Array.isArray(record.data)) return null;
      const nowMs = options.nowMs ?? Date.now();
      return {
        data: normalizeAlerts(record.data, { nowMs }),
        fetchedAt: Number(record.fetchedAt || 0),
        expiresAt: Number(record.expiresAt || 0),
        isFresh: Number(record.expiresAt || 0) > nowMs,
        hasCache: true
      };
    } catch (error) {
      return null;
    }
  }

  function writeAlertsCache(storage, data, options = {}) {
    if (!storage?.setItem || !Array.isArray(data)) return null;
    const fetchedAt = Number(options.fetchedAt || Date.now());
    const record = {
      version: ALERTS_CACHE_VERSION,
      fetchedAt,
      expiresAt: fetchedAt + ALERTS_CACHE_TTL_MS,
      data
    };
    try {
      storage.setItem(options.cacheKey || ALERTS_CACHE_KEY, JSON.stringify(record));
      return record;
    } catch (error) {
      return null;
    }
  }

  async function readJson(response) {
    let payload = null;
    try {
      payload = await response?.json();
    } catch (error) {
      throw new Error("Weather alerts returned an invalid response.");
    }
    if (!response?.ok || payload?.ok !== true || !Array.isArray(payload.alerts)) {
      throw new Error(payload?.error || `Weather alerts request failed (${response?.status || "network"}).`);
    }
    return payload;
  }

  async function fetchWeatherAlerts(options = {}) {
    const fetchImpl = options.fetchImpl || (typeof fetch === "function" ? fetch.bind(globalThis) : null);
    if (!fetchImpl) throw new Error("Weather alert requests are unavailable in this browser.");
    const requestUrl = options.forceRefresh ? `${ALERTS_ENDPOINT}?refresh=${options.nowMs || Date.now()}` : ALERTS_ENDPOINT;
    const response = await fetchImpl(requestUrl, { headers: { Accept: "application/json" }, cache: "no-store" });
    const payload = await readJson(response);
    const nowMs = options.nowMs ?? Date.now();
    return {
      data: normalizeAlerts(payload.alerts, { nowMs }),
      fetchedAt: Number(payload.fetchedAt || nowMs),
      stale: Boolean(payload.stale),
      warning: safeText(payload.warning),
      sourceUrl: safeNwsUrl(payload.sourceUrl) || "https://www.weather.gov/"
    };
  }

  function loadWeatherAlerts(options = {}) {
    const storage = options.storage || (typeof localStorage !== "undefined" ? localStorage : null);
    const nowMs = options.nowMs ?? Date.now();
    const cached = readAlertsCache(storage, { nowMs, cacheKey: options.cacheKey });
    if (!options.forceRefresh && cached?.isFresh) {
      return Promise.resolve({ ...cached, fromCache: true, stale: false, error: null });
    }

    if (activeRequests.has(ALERTS_ENDPOINT)) return activeRequests.get(ALERTS_ENDPOINT);
    const request = fetchWeatherAlerts({ ...options, nowMs })
      .then((result) => {
        const saved = writeAlertsCache(storage, result.data, {
          fetchedAt: result.fetchedAt,
          cacheKey: options.cacheKey
        });
        return {
          ...result,
          fetchedAt: saved?.fetchedAt || result.fetchedAt || nowMs,
          expiresAt: saved?.expiresAt || (nowMs + ALERTS_CACHE_TTL_MS),
          fromCache: false,
          error: result.stale ? new Error(result.warning || "Weather alerts are temporarily unavailable.") : null
        };
      })
      .catch((error) => {
        if (cached?.hasCache) return { ...cached, fromCache: true, stale: true, error };
        throw error;
      })
      .finally(() => activeRequests.delete(ALERTS_ENDPOINT));
    activeRequests.set(ALERTS_ENDPOINT, request);
    return request;
  }

  return Object.freeze({
    WEATHER_LOCATION,
    ALERTS_ENDPOINT,
    ALERTS_CACHE_KEY,
    ALERTS_CACHE_VERSION,
    ALERTS_CACHE_TTL_MS,
    normalizeSeverity,
    normalizeAlert,
    normalizeAlerts,
    isAlertActive,
    resolveAlertIcon,
    formatAlertExpiration,
    formatAlertTimestamp,
    readAlertsCache,
    writeAlertsCache,
    fetchWeatherAlerts,
    loadWeatherAlerts
  });
});
