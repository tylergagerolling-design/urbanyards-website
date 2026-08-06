const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const alertsClient = require("../scripts/weather-alerts");
const alertsServer = require("../netlify/functions/lib/nws-alerts");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const NOW = Date.parse("2026-08-06T18:00:00Z");

function response(payload, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => payload };
}

function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
}

function feature(overrides = {}) {
  const id = overrides.id || "https://api.weather.gov/alerts/urn:oid:moderate-alert";
  return {
    id,
    properties: {
      id,
      event: "Heat Advisory",
      headline: "Heat Advisory issued for the Portland metro area",
      description: "Hot conditions are expected.\n\nDrink plenty of water.",
      instruction: "Limit strenuous outdoor activity.",
      severity: "Moderate",
      urgency: "Expected",
      certainty: "Likely",
      effective: "2026-08-06T10:00:00-07:00",
      onset: "2026-08-06T11:00:00-07:00",
      expires: "2026-08-06T23:00:00-07:00",
      senderName: "NWS Portland OR",
      areaDesc: "Greater Portland Metro Area",
      response: "Prepare",
      "@id": id,
      ...overrides
    }
  };
}

test("the server reuses the configured Portland point and identifies Urban Yards to NWS", async () => {
  assert.equal(alertsServer.WEATHER_LOCATION, require("../scripts/weather-forecast").WEATHER_LOCATION);
  assert.equal(alertsServer.alertsEndpoint(), "https://api.weather.gov/alerts/active?point=45.5152,-122.6784");
  const calls = [];
  const handler = alertsServer.createNwsAlertsHandler({
    now: () => NOW,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return response({ features: [] });
    }
  });
  const result = await handler({ httpMethod: "GET" });
  assert.equal(result.statusCode, 200);
  assert.equal(calls[0].options.headers.Accept, "application/geo+json");
  assert.match(calls[0].options.headers["User-Agent"], /UrbanYardsDashboard\/1\.0/);
});

test("no active alerts normalizes to a valid empty response", () => {
  assert.deepEqual(alertsServer.normalizeNwsAlerts({ features: [] }, { nowMs: NOW }), []);
  assert.deepEqual(alertsClient.normalizeAlerts([], { nowMs: NOW }), []);
});

test("one moderate alert includes the requested normalized fields", () => {
  const [alert] = alertsServer.normalizeNwsAlerts({ features: [feature()] }, { nowMs: NOW });
  assert.equal(alert.event, "Heat Advisory");
  assert.equal(alert.severity, "Moderate");
  assert.equal(alert.senderName, "NWS Portland OR");
  assert.equal(alertsClient.resolveAlertIcon(alert.event), "hot");
  assert.match(alertsClient.formatAlertExpiration(alert.expires, { now: new Date(NOW) }), /^Expires today at /);
  assert.match(alertsClient.formatAlertExpiration("2026-08-07T12:30:00-07:00", { now: new Date(NOW) }), /^Expires tomorrow at 12:30 PM$/);
});

test("multiple alerts sort by severity and retain distinct records", () => {
  const alerts = alertsServer.normalizeNwsAlerts({ features: [
    feature({ id: "https://api.weather.gov/alerts/minor", severity: "Minor", event: "Air Quality Alert" }),
    feature({ id: "https://api.weather.gov/alerts/extreme", severity: "Extreme", event: "Tornado Warning" }),
    feature({ id: "https://api.weather.gov/alerts/severe", severity: "Severe", event: "Severe Thunderstorm Warning" })
  ] }, { nowMs: NOW });
  assert.deepEqual(alerts.map((alert) => alert.severity), ["Extreme", "Severe", "Minor"]);
  assert.equal(alertsClient.resolveAlertIcon(alerts[0].event), "tornado");
  assert.equal(alertsClient.resolveAlertIcon(alerts[2].event), "air-quality");
});

test("an alert without instructions remains valid", () => {
  const [alert] = alertsServer.normalizeNwsAlerts({ features: [feature({ instruction: null })] }, { nowMs: NOW });
  assert.equal(alert.instruction, "");
  assert.equal(alert.event, "Heat Advisory");
});

test("long descriptions preserve paragraphs, remove markup, and are bounded", () => {
  const longDescription = `<strong>Important</strong>\n\n${"Weather detail ".repeat(2500)}`;
  const [alert] = alertsServer.normalizeNwsAlerts({ features: [feature({ description: longDescription })] }, { nowMs: NOW });
  assert.equal(alert.description.includes("<strong>"), false);
  assert.equal(alert.description.includes("\n\n"), true);
  assert.equal(alert.description.length <= 20000, true);
});

test("unknown severities use the neutral Unknown classification", () => {
  const [alert] = alertsServer.normalizeNwsAlerts({ features: [feature({ severity: "Unspecified" })] }, { nowMs: NOW });
  assert.equal(alert.severity, "Unknown");
  assert.equal(alertsClient.normalizeSeverity("Unexpected"), "Unknown");
});

test("expired and not-yet-effective alerts are never returned", () => {
  const alerts = alertsServer.normalizeNwsAlerts({ features: [
    feature({ id: "https://api.weather.gov/alerts/expired", expires: "2026-08-06T10:00:00-07:00" }),
    feature({ id: "https://api.weather.gov/alerts/future", onset: "2026-08-07T10:00:00-07:00" })
  ] }, { nowMs: NOW });
  assert.deepEqual(alerts, []);
});

test("NWS network failure returns a predictable 503 without claiming there are no alerts", async () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    const handler = alertsServer.createNwsAlertsHandler({ now: () => NOW, fetchImpl: async () => response({}, 503) });
    const result = await handler({ httpMethod: "GET" });
    assert.equal(result.statusCode, 503);
    assert.deepEqual(JSON.parse(result.body), { ok: false, error: "Weather alerts are temporarily unavailable." });
  } finally {
    console.error = originalError;
  }
});

test("the server preserves its most recent successful response when NWS later fails", async () => {
  const originalError = console.error;
  console.error = () => {};
  let nowMs = NOW;
  let shouldFail = false;
  const handler = alertsServer.createNwsAlertsHandler({
    now: () => nowMs,
    fetchImpl: async () => shouldFail ? response({}, 503) : response({ features: [feature()] })
  });
  try {
    const first = JSON.parse((await handler({ httpMethod: "GET" })).body);
    shouldFail = true;
    nowMs += alertsServer.NWS_ALERTS_CACHE_TTL_MS + 1;
    const stale = JSON.parse((await handler({ httpMethod: "GET" })).body);
    assert.equal(first.alerts.length, 1);
    assert.equal(stale.alerts.length, 1);
    assert.equal(stale.stale, true);
    assert.equal(stale.warning, "Weather alerts are temporarily unavailable.");
  } finally {
    console.error = originalError;
  }
});

test("invalid or incomplete NWS responses fail cleanly", () => {
  assert.throws(() => alertsServer.normalizeNwsAlerts({}, { nowMs: NOW }), /invalid response/i);
  assert.deepEqual(alertsServer.normalizeNwsAlerts({ features: [{ properties: { event: "Flood Warning" } }] }, { nowMs: NOW }), []);
});

test("manual refresh bypasses a fresh browser cache and de-duplicates data", async () => {
  const cache = storage();
  const cachedAlert = alertsServer.normalizeNwsAlerts({ features: [feature()] }, { nowMs: NOW });
  alertsClient.writeAlertsCache(cache, cachedAlert, { fetchedAt: NOW });
  let calls = 0;
  const result = await alertsClient.loadWeatherAlerts({
    storage: cache,
    nowMs: NOW + 1000,
    forceRefresh: true,
    fetchImpl: async () => {
      calls += 1;
      return response({ ok: true, alerts: [...cachedAlert, ...cachedAlert], fetchedAt: NOW + 1000, stale: false, sourceUrl: "https://www.weather.gov/" });
    }
  });
  assert.equal(calls, 1);
  assert.equal(result.data.length, 1);
  assert.equal(result.fromCache, false);
});

test("client network failure retains even an empty successful cache as stale", async () => {
  const cache = storage();
  alertsClient.writeAlertsCache(cache, [], { fetchedAt: NOW });
  const result = await alertsClient.loadWeatherAlerts({
    storage: cache,
    nowMs: NOW + alertsClient.ALERTS_CACHE_TTL_MS + 1,
    fetchImpl: async () => response({}, 503)
  });
  assert.deepEqual(result.data, []);
  assert.equal(result.stale, true);
  assert.equal(result.fromCache, true);
});

test("Home alert markup provides responsive, keyboard-native, and accessible states", () => {
  const html = read("dashboard.html");
  const js = read("dashboard.js");
  const css = read("dashboard-unified.css");
  const packageJson = read("package.json");
  assert.match(html, /scripts\/weather-alerts\.js\?v=20260806-weather-alerts-1/);
  assert.match(js, /Portland Weather Alerts/);
  assert.match(js, /No active NWS alerts for Portland/);
  assert.match(js, /Weather alerts are temporarily unavailable\./);
  assert.match(js, /data-action="toggle-weather-alert"[\s\S]*aria-expanded=/);
  assert.match(js, /View on the National Weather Service/);
  assert.match(js, /Alerts by the National Weather Service/);
  assert.match(js, /document\.addEventListener\("visibilitychange"/);
  assert.match(js, /setInterval\([\s\S]*ensureHomeWeatherAlerts/);
  assert.match(css, /\.home-weather-alert-card\.is-extreme/);
  assert.match(css, /@media\(max-width:760px\)[\s\S]*\.home-weather-alert-summary\{grid-template-columns:44px minmax\(0,1fr\)/);
  assert.match(css, /\.home-weather-alert-toggle\{[\s\S]*?min-height:36px/);
  assert.match(css, /@media\(max-width:760px\)[\s\S]*?\.home-weather-alert-toggle\{[\s\S]*?min-height:44px/);
  assert.match(packageJson, /node --check netlify\/functions\/nws-alerts\.js/);
});
