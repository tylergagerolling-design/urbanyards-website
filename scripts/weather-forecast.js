(function attachUrbanYardsWeather(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.UrbanYardsWeather = api;
})(typeof window !== "undefined" ? window : globalThis, function createUrbanYardsWeather() {
  "use strict";

  const WEATHER_LOCATION = Object.freeze({
    name: "Portland, OR",
    latitude: 45.5152,
    longitude: -122.6784,
    timeZone: "America/Los_Angeles"
  });
  const WEATHER_CACHE_KEY = "urban-yards-weather-forecast-v1";
  const WEATHER_CACHE_VERSION = 1;
  const WEATHER_CACHE_TTL_MS = 15 * 60 * 1000;
  const WEATHER_HEADERS = Object.freeze({ Accept: "application/geo+json" });
  const activeRequests = new Map();

  function locationKey(location = WEATHER_LOCATION) {
    return `${location.latitude},${location.longitude}`;
  }

  function pointsEndpoint(location = WEATHER_LOCATION) {
    return `https://api.weather.gov/points/${location.latitude},${location.longitude}`;
  }

  function dateKeyInTimeZone(value, timeZone = WEATHER_LOCATION.timeZone) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(date);
    const part = (type) => parts.find((entry) => entry.type === type)?.value || "";
    const year = part("year");
    const month = part("month");
    const day = part("day");
    return year && month && day ? `${year}-${month}-${day}` : "";
  }

  function dateLabels(dateKey) {
    const anchor = new Date(`${dateKey}T12:00:00Z`);
    if (Number.isNaN(anchor.getTime())) return { weekday: "", shortDate: "" };
    return {
      weekday: new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long" }).format(anchor),
      shortDate: new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" }).format(anchor)
    };
  }

  function finiteNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function safeIconUrl(value) {
    try {
      const url = new URL(String(value || ""));
      return url.protocol === "https:" ? url.href : null;
    } catch (error) {
      return null;
    }
  }

  function resolveWeatherIcon(condition, options = {}) {
    const label = String(condition || "").trim().toLowerCase().replace(/\s+/g, " ");
    const isNight = options.isDaytime === false;
    const dayNight = (dayIcon, nightIcon) => isNight ? nightIcon : dayIcon;

    if (/tornado/.test(label)) return "tornado";
    if (/hurricane/.test(label)) return "hurricane";
    if (/tropical (storm|cyclone)/.test(label)) return "tropical-storm";
    if (/severe.*(thunder|t-storm)|(?:thunder|t-storm).*severe/.test(label)) return "severe-thunderstorm";
    if (/(thunder|t-storm).*(rain|shower)|(?:rain|shower).*(thunder|t-storm)/.test(label)) return "thunderstorm-rain";
    if (/thunder|t-storm|lightning/.test(label)) return "thunderstorm";
    if (/hail/.test(label)) return "hail";
    if (/blizzard|snowstorm/.test(label)) return "blizzard";
    if (/freezing (rain|drizzle)|ice rain/.test(label)) return "freezing-rain";
    if (/ice pellets?/.test(label)) return "ice-pellets";
    if (/sleet|rain and snow|wintry mix/.test(label)) return "sleet";
    if (/heavy snow/.test(label)) return "heavy-snow";
    if (/snow shower/.test(label)) return dayNight("snow-showers-day", "snow-showers-night");
    if (/light snow/.test(label)) return "light-snow";
    if (/flurr/.test(label)) return "flurries";
    if (/snow/.test(label)) return "snow";
    if (/heavy.*rain|torrential rain/.test(label)) return "heavy-rain";
    if (/rain shower|showers?/.test(label)) return dayNight("showers-day", "showers-night");
    if (/light.*drizzle/.test(label)) return "light-drizzle";
    if (/drizzle/.test(label)) return "drizzle";
    if (/light.*rain/.test(label)) return "light-rain";
    if (/rain/.test(label)) return "rain";
    if (/smoke/.test(label)) return "smoke";
    if (/haze/.test(label)) return "haze";
    if (/dense fog|fog/.test(label)) return "fog";
    if (/mist/.test(label)) return "mist";
    if (/dust|sand/.test(label)) return "dust";
    if (/strong wind|high wind|gusty/.test(label)) return "strong-wind";
    if (/windy|breezy|\bwind\b/.test(label)) return "windy";
    if (/mostly sunny|fair/.test(label)) return dayNight("mostly-clear-day", "mostly-clear-night");
    if (/mostly clear/.test(label)) return dayNight("mostly-clear-day", "mostly-clear-night");
    if (/partly sunny|partly cloudy|few clouds/.test(label)) return dayNight("partly-cloudy-day", "partly-cloudy-night");
    if (/mostly cloudy|broken clouds/.test(label)) return dayNight("mostly-cloudy-day", "mostly-cloudy-night");
    if (/overcast/.test(label)) return "overcast";
    if (/sunny|clear sky|\bclear\b/.test(label)) return dayNight("clear-day", "clear-night");
    if (/cloud/.test(label)) return "cloudy";
    return "cloudy";
  }

  function normalizeWeatherForecast(periods, options = {}) {
    if (!Array.isArray(periods)) return [];
    const timeZone = options.timeZone || WEATHER_LOCATION.timeZone;
    const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
    const today = dateKeyInTimeZone(now, timeZone);
    const grouped = new Map();

    periods.forEach((period) => {
      if (!period || typeof period !== "object") return;
      const date = dateKeyInTimeZone(period.startTime, timeZone);
      if (!date) return;
      if (!grouped.has(date)) grouped.set(date, []);
      grouped.get(date).push(period);
    });

    return [...grouped.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(0, 7)
      .map(([date, dayPeriods]) => {
        const daytime = dayPeriods.find((period) => period.isDaytime === true) || null;
        const nighttime = dayPeriods.find((period) => period.isDaytime === false) || null;
        const primary = daytime || nighttime || dayPeriods[0] || {};
        const labels = dateLabels(date);
        return {
          date,
          weekday: labels.weekday,
          shortDate: labels.shortDate,
          daytimeTemperature: finiteNumber(daytime?.temperature),
          nighttimeTemperature: finiteNumber(nighttime?.temperature),
          temperatureUnit: String(daytime?.temperatureUnit || nighttime?.temperatureUnit || primary.temperatureUnit || ""),
          shortForecast: String(primary.shortForecast || "Forecast unavailable"),
          detailedForecast: String(primary.detailedForecast || ""),
          probabilityOfPrecipitation: finiteNumber(primary.probabilityOfPrecipitation?.value),
          windSpeed: String(primary.windSpeed || ""),
          windDirection: String(primary.windDirection || ""),
          iconUrl: safeIconUrl(primary.icon),
          isDaytime: primary.isDaytime !== false,
          isToday: date === today
        };
      });
  }

  async function readJson(response, label) {
    if (!response?.ok) throw new Error(`${label} request failed (${response?.status || "network"}).`);
    const payload = await response.json();
    if (!payload || typeof payload !== "object") throw new Error(`${label} returned an unexpected response.`);
    return payload;
  }

  async function fetchWeatherForecast(options = {}) {
    const location = options.location || WEATHER_LOCATION;
    const fetchImpl = options.fetchImpl || (typeof fetch === "function" ? fetch.bind(globalThis) : null);
    if (!fetchImpl) throw new Error("Weather requests are unavailable in this browser.");

    const pointsUrl = pointsEndpoint(location);
    const pointsResponse = await fetchImpl(pointsUrl, { headers: WEATHER_HEADERS });
    const points = await readJson(pointsResponse, "Weather location");
    const forecastUrl = points.properties?.forecast;
    const forecastHourlyUrl = points.properties?.forecastHourly || null;
    const observationStationsUrl = points.properties?.observationStations || null;
    if (typeof forecastUrl !== "string" || !forecastUrl.startsWith("https://api.weather.gov/")) {
      throw new Error("Weather location did not provide a valid forecast endpoint.");
    }

    const forecastResponse = await fetchImpl(forecastUrl, { headers: WEATHER_HEADERS });
    const forecast = await readJson(forecastResponse, "Weather forecast");
    const periods = forecast.properties?.periods;
    if (!Array.isArray(periods) || !periods.length) throw new Error("Weather forecast did not include forecast periods.");
    const data = normalizeWeatherForecast(periods, { timeZone: location.timeZone, now: options.now });
    if (!data.length) throw new Error("Weather forecast did not include calendar-day data.");

    return {
      data,
      pointsUrl,
      forecastUrl,
      forecastHourlyUrl,
      observationStationsUrl
    };
  }

  function readWeatherCache(storage, options = {}) {
    if (!storage?.getItem) return null;
    try {
      const parsed = JSON.parse(storage.getItem(options.cacheKey || WEATHER_CACHE_KEY) || "null");
      const expectedLocation = locationKey(options.location || WEATHER_LOCATION);
      if (!parsed || parsed.version !== WEATHER_CACHE_VERSION || parsed.locationKey !== expectedLocation || !Array.isArray(parsed.data) || !parsed.data.length) return null;
      const nowMs = options.nowMs ?? Date.now();
      return {
        data: parsed.data.slice(0, 7),
        fetchedAt: Number(parsed.fetchedAt || 0),
        expiresAt: Number(parsed.expiresAt || 0),
        isFresh: Number(parsed.expiresAt || 0) > nowMs
      };
    } catch (error) {
      return null;
    }
  }

  function writeWeatherCache(storage, data, options = {}) {
    if (!storage?.setItem || !Array.isArray(data) || !data.length) return null;
    const fetchedAt = options.fetchedAt ?? Date.now();
    const record = {
      version: WEATHER_CACHE_VERSION,
      locationKey: locationKey(options.location || WEATHER_LOCATION),
      fetchedAt,
      expiresAt: fetchedAt + WEATHER_CACHE_TTL_MS,
      data: data.slice(0, 7)
    };
    try {
      storage.setItem(options.cacheKey || WEATHER_CACHE_KEY, JSON.stringify(record));
      return record;
    } catch (error) {
      return null;
    }
  }

  function loadWeatherForecast(options = {}) {
    const location = options.location || WEATHER_LOCATION;
    const storage = options.storage || (typeof localStorage !== "undefined" ? localStorage : null);
    const nowMs = options.nowMs ?? Date.now();
    const cached = readWeatherCache(storage, { location, nowMs, cacheKey: options.cacheKey });
    if (!options.forceRefresh && cached?.isFresh) {
      return Promise.resolve({ ...cached, fromCache: true, stale: false, error: null });
    }

    const requestKey = locationKey(location);
    if (activeRequests.has(requestKey)) return activeRequests.get(requestKey);
    const request = fetchWeatherForecast({ ...options, location })
      .then((result) => {
        const saved = writeWeatherCache(storage, result.data, { location, fetchedAt: nowMs, cacheKey: options.cacheKey });
        return {
          ...result,
          fetchedAt: saved?.fetchedAt || nowMs,
          expiresAt: saved?.expiresAt || (nowMs + WEATHER_CACHE_TTL_MS),
          fromCache: false,
          stale: false,
          error: null
        };
      })
      .catch((error) => {
        if (cached?.data?.length) return { ...cached, fromCache: true, stale: true, error };
        throw error;
      })
      .finally(() => activeRequests.delete(requestKey));
    activeRequests.set(requestKey, request);
    return request;
  }

  return Object.freeze({
    WEATHER_LOCATION,
    WEATHER_CACHE_KEY,
    WEATHER_CACHE_VERSION,
    WEATHER_CACHE_TTL_MS,
    WEATHER_HEADERS,
    locationKey,
    pointsEndpoint,
    dateKeyInTimeZone,
    resolveWeatherIcon,
    normalizeWeatherForecast,
    fetchWeatherForecast,
    readWeatherCache,
    writeWeatherCache,
    loadWeatherForecast
  });
});
