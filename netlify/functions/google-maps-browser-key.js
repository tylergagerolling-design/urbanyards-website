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

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return json(405, { error: "Method Not Allowed" });
  }

  const key = process.env.VITE_GOOGLE_MAPS_BROWSER_KEY || "";
  if (!key) {
    return json(404, { error: "Google Maps browser key is not configured." });
  }

  return json(200, { key });
};
