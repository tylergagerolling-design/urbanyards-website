function responseShim() {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: "",
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = JSON.stringify(payload); return this; },
    send(payload) { this.body = String(payload); return this; }
  };
}

function adapt(handler) {
  return async (event) => {
    let body = {};
    if (event.body) {
      try { body = JSON.parse(event.body); }
      catch (error) {
        return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Invalid JSON" }) };
      }
    }
    const req = {
      method: event.httpMethod,
      body,
      headers: Object.fromEntries(Object.entries(event.headers || {}).map(([key, value]) => [key.toLowerCase(), value])),
      socket: { remoteAddress: event.headers?.["x-nf-client-connection-ip"] }
    };
    const res = responseShim();
    try {
      await handler(req, res);
    } catch (error) {
      console.error(JSON.stringify({ event: "unhandled_function_error", message: error.message }));
      res.status(500).json({ error: "Unexpected server error" });
    }
    return { statusCode: res.statusCode, headers: res.headers, body: res.body };
  };
}

module.exports = { adapt };
