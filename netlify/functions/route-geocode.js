const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";
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

  const params = new URLSearchParams({
    q: address,
    format: "jsonv2",
    limit: "1",
    addressdetails: "0"
  });

  try {
    const response = await fetch(`${NOMINATIM_ENDPOINT}?${params.toString()}`, {
      headers: {
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": APP_USER_AGENT
      }
    });

    if (!response.ok) {
      return json(502, { error: "Map lookup is temporarily unavailable." });
    }

    const results = await response.json();
    const match = Array.isArray(results) ? results[0] : null;
    const lat = Number(match?.lat);
    const lng = Number(match?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return json(404, { error: "No map pin found." });
    }

    return json(200, {
      address,
      lat,
      lng,
      displayName: match.display_name || address
    });
  } catch (error) {
    console.error(JSON.stringify({ event: "route_geocode_error", message: error.message }));
    return json(502, { error: "Map lookup failed." });
  }
};
