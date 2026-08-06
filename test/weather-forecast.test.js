const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const weather = require("../scripts/weather-forecast");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

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

function period(date, isDaytime, overrides = {}) {
  return {
    startTime: `${date}T${isDaytime ? "06:00:00" : "18:00:00"}-07:00`,
    isDaytime,
    temperature: isDaytime ? 76 : 54,
    temperatureUnit: "F",
    shortForecast: isDaytime ? "Mostly Sunny" : "Partly Cloudy",
    detailedForecast: "A representative Portland forecast.",
    probabilityOfPrecipitation: { value: isDaytime ? 12 : 20 },
    windSpeed: "5 to 10 mph",
    windDirection: "NW",
    icon: "https://api.weather.gov/icons/land/day/few?size=medium",
    ...overrides
  };
}

function forecastFetch(calls, periods = [period("2026-08-06", true), period("2026-08-06", false)]) {
  return async (url, options) => {
    calls.push({ url, options });
    if (String(url).includes("/points/")) {
      return response({ properties: {
        forecast: "https://api.weather.gov/gridpoints/PQR/112,103/forecast",
        forecastHourly: "https://api.weather.gov/gridpoints/PQR/112,103/forecast/hourly",
        observationStations: "https://api.weather.gov/gridpoints/PQR/112,103/stations"
      } });
    }
    return response({ properties: { periods } });
  };
}

test("Portland weather uses the required NWS points endpoint", () => {
  assert.equal(weather.pointsEndpoint(), "https://api.weather.gov/points/45.5152,-122.6784");
});

test("Urban Yards weather icons resolve common NWS conditions with day and night variants", () => {
  assert.equal(weather.resolveWeatherIcon("Sunny", { isDaytime: true }), "clear-day");
  assert.equal(weather.resolveWeatherIcon("Clear", { isDaytime: false }), "clear-night");
  assert.equal(weather.resolveWeatherIcon("Mostly Sunny", { isDaytime: true }), "mostly-clear-day");
  assert.equal(weather.resolveWeatherIcon("Partly Cloudy", { isDaytime: false }), "partly-cloudy-night");
  assert.equal(weather.resolveWeatherIcon("Chance Rain Showers", { isDaytime: true }), "showers-day");
  assert.equal(weather.resolveWeatherIcon("Patchy Smoke"), "smoke");
  assert.equal(weather.resolveWeatherIcon("Showers And Thunderstorms"), "thunderstorm-rain");
  assert.equal(weather.resolveWeatherIcon("Unknown weather state"), "cloudy");
});

test("the supplied weather icon pack contains every manifest-listed 128px asset", () => {
  const manifest = JSON.parse(read("images/weather-icon-pack/manifest.json"));
  assert.equal(manifest.iconCount, 65);
  assert.equal(manifest.icons.length, 65);
  manifest.icons.forEach((icon) => {
    assert.equal(fs.existsSync(path.join(root, "images", "weather-icon-pack", icon.png128)), true, `${icon.id} PNG is missing`);
  });
});

test("forecast endpoint is discovered from points metadata and both requests use GeoJSON", async () => {
  const calls = [];
  const result = await weather.fetchWeatherForecast({
    fetchImpl: forecastFetch(calls),
    now: new Date("2026-08-06T18:00:00Z")
  });
  assert.deepEqual(calls.map((call) => call.url), [
    "https://api.weather.gov/points/45.5152,-122.6784",
    "https://api.weather.gov/gridpoints/PQR/112,103/forecast"
  ]);
  assert.equal(calls.every((call) => call.options.headers.Accept === "application/geo+json"), true);
  assert.equal(result.forecastHourlyUrl, "https://api.weather.gov/gridpoints/PQR/112,103/forecast/hourly");
  assert.equal(result.observationStationsUrl, "https://api.weather.gov/gridpoints/PQR/112,103/stations");
});

test("12-hour periods group into calendar days even when the first period is nighttime", () => {
  const normalized = weather.normalizeWeatherForecast([
    period("2026-08-06", false),
    period("2026-08-07", true),
    period("2026-08-07", false)
  ], { now: new Date("2026-08-06T20:00:00-07:00") });
  assert.equal(normalized.length, 2);
  assert.equal(normalized[0].daytimeTemperature, null);
  assert.equal(normalized[0].nighttimeTemperature, 54);
  assert.equal(normalized[1].daytimeTemperature, 76);
  assert.equal(normalized[1].nighttimeTemperature, 54);
});

test("normalized weather never exceeds seven calendar-day records", () => {
  const periods = [];
  for (let day = 1; day <= 9; day += 1) {
    const date = `2026-08-${String(day).padStart(2, "0")}`;
    periods.push(period(date, true), period(date, false));
  }
  assert.equal(weather.normalizeWeatherForecast(periods).length, 7);
});

test("today is calculated in the Portland Pacific time zone", () => {
  const normalized = weather.normalizeWeatherForecast([period("2026-08-06", true)], {
    now: new Date("2026-08-07T01:00:00Z")
  });
  assert.equal(normalized[0].date, "2026-08-06");
  assert.equal(normalized[0].isToday, true);
  assert.equal(normalized[0].isDaytime, true);
});

test("missing temperatures, precipitation, wind, and unsafe icons remain safe null values", () => {
  const normalized = weather.normalizeWeatherForecast([period("2026-08-06", true, {
    temperature: null,
    probabilityOfPrecipitation: null,
    windSpeed: "",
    windDirection: "",
    icon: "http://example.com/insecure.png"
  })]);
  assert.equal(normalized[0].daytimeTemperature, null);
  assert.equal(normalized[0].nighttimeTemperature, null);
  assert.equal(normalized[0].probabilityOfPrecipitation, null);
  assert.equal(normalized[0].windSpeed, "");
  assert.equal(normalized[0].iconUrl, null);
});

test("fresh cache renders without a network request", async () => {
  const cache = storage();
  weather.writeWeatherCache(cache, [{ date: "2026-08-06" }], { fetchedAt: 1_000 });
  let requests = 0;
  const result = await weather.loadWeatherForecast({ storage: cache, nowMs: 2_000, fetchImpl: async () => { requests += 1; } });
  assert.equal(requests, 0);
  assert.equal(result.fromCache, true);
  assert.equal(result.stale, false);
});

test("expired cache refreshes from the network", async () => {
  const cache = storage();
  weather.writeWeatherCache(cache, [{ date: "2026-08-05" }], { fetchedAt: 1_000 });
  const calls = [];
  const result = await weather.loadWeatherForecast({
    storage: cache,
    nowMs: 1_000 + weather.WEATHER_CACHE_TTL_MS + 1,
    fetchImpl: forecastFetch(calls),
    now: new Date("2026-08-06T18:00:00Z")
  });
  assert.equal(calls.length, 2);
  assert.equal(result.fromCache, false);
  assert.equal(result.data[0].date, "2026-08-06");
});

test("manual refresh bypasses an otherwise fresh cache", async () => {
  const cache = storage();
  weather.writeWeatherCache(cache, [{ date: "2026-08-05" }], { fetchedAt: 1_000 });
  const calls = [];
  const result = await weather.loadWeatherForecast({
    storage: cache,
    nowMs: 2_000,
    forceRefresh: true,
    fetchImpl: forecastFetch(calls),
    now: new Date("2026-08-06T18:00:00Z")
  });
  assert.equal(calls.length, 2);
  assert.equal(result.fromCache, false);
});

test("API failure rejects without cache and returns stale data with expired cache", async () => {
  const failingFetch = async () => response({}, 503);
  await assert.rejects(() => weather.loadWeatherForecast({ storage: storage(), fetchImpl: failingFetch, cacheKey: "weather-empty" }), /request failed/);

  const cache = storage();
  weather.writeWeatherCache(cache, [{ date: "2026-08-05" }], { fetchedAt: 1_000, cacheKey: "weather-stale" });
  const result = await weather.loadWeatherForecast({
    storage: cache,
    nowMs: 1_000 + weather.WEATHER_CACHE_TTL_MS + 1,
    fetchImpl: failingFetch,
    cacheKey: "weather-stale"
  });
  assert.equal(result.stale, true);
  assert.equal(result.data[0].date, "2026-08-05");
});

test("Home weather markup exposes accessible controls, disabled-end logic, and contained responsive scrolling", () => {
  const html = read("dashboard.html");
  const js = read("dashboard.js");
  const css = read("dashboard-unified.css");
  const netlify = read("netlify.toml");
  assert.match(html, /scripts\/weather-forecast\.js\?v=20260806-weather-icons-1/);
  assert.match(js, /aria-label="Previous forecast days"/);
  assert.match(js, /aria-label="Next forecast days"/);
  assert.match(js, /aria-label="Refresh weather"/);
  assert.match(js, /Weather is temporarily unavailable\./);
  assert.match(js, />Try again<\/button>/);
  assert.match(js, /Today&rsquo;s Schedule/);
  assert.match(js, /Needs Attention/);
  assert.match(js, /images\/weather-icon-pack\/png-128\/\$\{iconId\}\.png/);
  assert.match(js, /data-weather-fallback-src="\$\{fallbackUrl\}"/);
  assert.match(js, /previous\.disabled = maxScroll <= 2 \|\| rail\.scrollLeft <= 16/);
  assert.match(js, /next\.disabled = maxScroll <= 2 \|\| rail\.scrollLeft >= maxScroll - 16/);
  assert.match(css, /\.home-weather-icon img\{[\s\S]*?object-fit:contain/);
  assert.match(css, /@media\(max-width:760px\)[\s\S]*?\.home-weather-icon\{width:44px;height:44px\}/);
  assert.match(css, /\.home-weather-rail\{[\s\S]*?max-width:100%;[\s\S]*?overflow-x:auto/);
  assert.match(css, /@media\(max-width:760px\)[\s\S]*?\.home-weather-rail\{grid-auto-columns:minmax\(205px,78vw\)/);
  assert.match(netlify, /img-src[^;]*https:\/\/api\.weather\.gov/);
  assert.match(netlify, /connect-src[^;]*https:\/\/api\.weather\.gov/);
});
