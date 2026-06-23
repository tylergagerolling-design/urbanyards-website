const GOOGLE_DIRECTIONS_ENDPOINT = "https://maps.googleapis.com/maps/api/directions/json";

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

function googleMapsApiKey() {
  return process.env.GOOGLE_MAPS_API_KEY || "";
}

function normalizeStop(stop) {
  const lat = Number(stop?.lat ?? stop?.latitude);
  const lng = Number(stop?.lng ?? stop?.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return `${lat},${lng}`;
  }
  const address = String(stop?.address || "").replace(/\s+/g, " ").trim();
  return address || "";
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method Not Allowed" });
  }

  const key = googleMapsApiKey();
  if (!key) {
    return json(500, { error: "Google Maps API key is not configured." });
  }

  let payload = {};
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch {
    return json(400, { error: "Invalid JSON." });
  }

  const stops = Array.isArray(payload.stops) ? payload.stops.map(normalizeStop).filter(Boolean) : [];
  if (stops.length < 2) {
    return json(400, { error: "At least two mapped stops are required for driving directions." });
  }
  if (stops.length > 25) {
    return json(400, { error: "Google Directions supports up to 25 stops per route request." });
  }

  const params = new URLSearchParams({
    origin: stops[0],
    destination: stops[stops.length - 1],
    mode: "driving",
    key
  });
  const waypoints = stops.slice(1, -1);
  if (waypoints.length) {
    params.set("waypoints", waypoints.join("|"));
  }

  try {
    const response = await fetch(`${GOOGLE_DIRECTIONS_ENDPOINT}?${params.toString()}`, {
      headers: { "Accept": "application/json" }
    });
    if (!response.ok) {
      return json(502, { error: "Google Directions is temporarily unavailable." });
    }

    const data = await response.json();
    if (data.status !== "OK") {
      return json(502, { error: data.error_message || `Google Directions failed: ${data.status}` });
    }

    const route = Array.isArray(data.routes) ? data.routes[0] : null;
    const legs = Array.isArray(route?.legs) ? route.legs : [];
    const distanceMeters = legs.reduce((sum, leg) => sum + Number(leg.distance?.value || 0), 0);
    const durationSeconds = legs.reduce((sum, leg) => sum + Number(leg.duration?.value || 0), 0);
    const encodedPolyline = route?.overview_polyline?.points || "";
    if (!encodedPolyline) {
      return json(502, { error: "Google Directions did not return a route line." });
    }

    return json(200, {
      encodedPolyline,
      distanceMeters,
      durationSeconds,
      provider: "google-directions"
    });
  } catch (error) {
    console.error(JSON.stringify({ event: "route_directions_error", message: error.message }));
    return json(502, { error: error.message || "Unable to build driving route." });
  }
};
