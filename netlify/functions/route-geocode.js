const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const GOOGLE_GEOCODE_ENDPOINT = "https://maps.googleapis.com/maps/api/geocode/json";
const APP_USER_AGENT = "UrbanYardsRoutePlanner/1.0 (team@urbanyards.us)";

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(body)
  };
}

function normalizeAddress(address) {
  const compact = String(address || "").replace(/\s+/g, " ").trim();
  if (!compact) return "";
  const hasCityOrState = /\b(portland|beaverton|vancouver)\b/i.test(compact) || /\b(or|oregon|wa|washington)\b/i.test(compact);
  return hasCityOrState ? compact : `${compact}, Portland, OR`;
}

function googleMapsApiKey() {
  return process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_GEOCODING_API_KEY || "";
}

async function geocodeWithGoogle(address) {
  const key = googleMapsApiKey();
  if (!key) return null;

  const params = new URLSearchParams({
    address,
    key,
    region: "us",
    components: "country:US"
  });
  const response = await fetch(`${GOOGLE_GEOCODE_ENDPOINT}?${params.toString()}`, {
    headers: {
      "Accept": "application/json"
    }
  });
  if (!response.ok) {
    throw new Error("Google Maps lookup is temporarily unavailable.");
  }

  const payload = await response.json();
  if (payload.status === "ZERO_RESULTS") return null;
  if (payload.status !== "OK") {
    throw new Error(payload.error_message || `Google Maps lookup failed: ${payload.status}`);
  }

  const match = Array.isArray(payload.results) ? payload.results[0] : null;
  const lat = Number(match?.geometry?.location?.lat);
  const lng = Number(match?.geometry?.location?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    address,
    lat,
    lng,
    displayName: match.formatted_address || address,
    provider: "google"
  };
}

async function geocodeWithNominatim(address) {
  const params = new URLSearchParams({
    q: address,
    format: "jsonv2",
    limit: "1",
    addressdetails: "0"
  });

  const response = await fetch(`${NOMINATIM_ENDPOINT}?${params.toString()}`, {
    headers: {
      "Accept": "application/json",
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent": APP_USER_AGENT
    }
  });

  if (!response.ok) {
    throw new Error("OpenStreetMap lookup is temporarily unavailable.");
  }

  const results = await response.json();
  const match = Array.isArray(results) ? results[0] : null;
  const lat = Number(match?.lat);
  const lng = Number(match?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    address,
    lat,
    lng,
    displayName: match.display_name || address,
    provider: "openstreetmap"
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method Not Allowed" });
  }

  let payload = {};
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch {
    return json(400, { error: "Invalid JSON." });
  }

  const address = normalizeAddress(payload.address);
  if (!address) {
    return json(400, { error: "Address is required." });
  }

  try {
    const googleResult = await geocodeWithGoogle(address);
    if (googleResult) return json(200, googleResult);

    const osmResult = await geocodeWithNominatim(address);
    if (!osmResult) {
      return json(404, { error: "No map pin found." });
    }
    return json(200, osmResult);
  } catch (error) {
    console.error(JSON.stringify({ event: "route_geocode_error", message: error.message }));
    return json(502, { error: error.message || "Map lookup failed." });
  }
};
