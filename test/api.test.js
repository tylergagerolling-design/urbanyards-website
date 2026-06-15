const test = require("node:test");
const assert = require("node:assert/strict");

const quoteHandler = require("../api/quote");
const assistantHandler = require("../api/assistant");
const healthHandler = require("../api/health");
const privacyHandler = require("../api/privacy-request");
const retentionHandler = require("../api/retention-cleanup");
const { sendWebhook } = require("../api/lib/integrations");
const { verifyImage } = require("../api/lib/images");

function mockResponse() {
  return {
    statusCode: 200,
    headers: {},
    payload: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
    send(payload) { this.payload = payload; return this; }
  };
}

function request(method, body = {}, ip = `test-${Math.random()}`) {
  return { method, body, headers: { "x-forwarded-for": ip, origin: "https://urbanyards.us" }, socket: {} };
}

test("quote endpoint rejects unsupported methods", async () => {
  const res = mockResponse();
  await quoteHandler(request("GET"), res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.Allow, "POST");
});

test("quote endpoint validates required lead fields", async () => {
  const res = mockResponse();
  await quoteHandler(request("POST", { name: "T", email: "bad", service: "" }), res);
  assert.equal(res.statusCode, 400);
  assert.match(res.payload.error, /name/i);
});

test("honeypot submissions are quietly discarded", async () => {
  const res = mockResponse();
  await quoteHandler(request("POST", { company: "Spam Incorporated" }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.ok, true);
});

test("valid quote fails honestly when no delivery integration is configured", async () => {
  const original = {
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    QUOTE_TO_EMAIL: process.env.QUOTE_TO_EMAIL,
    AIRTABLE_TOKEN: process.env.AIRTABLE_TOKEN,
    QUOTE_WEBHOOK_URL: process.env.QUOTE_WEBHOOK_URL
  };
  delete process.env.RESEND_API_KEY;
  delete process.env.QUOTE_TO_EMAIL;
  delete process.env.AIRTABLE_TOKEN;
  delete process.env.QUOTE_WEBHOOK_URL;
  const res = mockResponse();
  await quoteHandler(request("POST", { name: "Tyler Gage", email: "tyler@example.com", service: "Groundskeeping" }), res);
  assert.equal(res.statusCode, 503);
  assert.match(res.payload.error, /temporarily unavailable/i);
  Object.entries(original).forEach(([key, value]) => value === undefined ? delete process.env[key] : process.env[key] = value);
});

test("assistant reports unavailable without exposing configuration details", async () => {
  const key = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  const res = mockResponse();
  await assistantHandler(request("POST", { message: "Do you mow lawns?" }), res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.payload.error, "Assistant is temporarily unavailable");
  if (key !== undefined) process.env.OPENAI_API_KEY = key;
});

test("health endpoint reports service state without secrets", async () => {
  const res = mockResponse();
  await healthHandler(request("GET"), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.ok, true);
  assert.equal("OPENAI_API_KEY" in res.payload, false);
});

test("image verification rejects a forged MIME type", () => {
  const fakeJpeg = Buffer.from("This is not an image").toString("base64");
  assert.throws(() => verifyImage(fakeJpeg, "image/jpeg"), /contents do not match/i);
});

test("retention cleanup requires its secret", async () => {
  const res = mockResponse();
  await retentionHandler(request("POST"), res);
  assert.equal(res.statusCode, 401);
});

test("privacy request validates email before delivery", async () => {
  const res = mockResponse();
  await privacyHandler(request("POST", { email: "not-an-email" }), res);
  assert.equal(res.statusCode, 400);
});

test("quote webhooks include an HMAC signature", async () => {
  const originalFetch = global.fetch;
  const originalUrl = process.env.QUOTE_WEBHOOK_URL;
  const originalSecret = process.env.QUOTE_WEBHOOK_SECRET;
  let captured;
  process.env.QUOTE_WEBHOOK_URL = "https://example.test/quote";
  process.env.QUOTE_WEBHOOK_SECRET = "test-secret";
  global.fetch = async (url, options) => {
    captured = { url, options };
    return { ok: true };
  };
  try {
    assert.equal(await sendWebhook({ name: "Test" }, [], "request-123"), true);
    assert.match(captured.options.headers["X-Urban-Yards-Signature"], /^sha256=[a-f0-9]{64}$/);
    assert.match(captured.options.headers["X-Urban-Yards-Timestamp"], /^\d+$/);
  } finally {
    global.fetch = originalFetch;
    originalUrl === undefined ? delete process.env.QUOTE_WEBHOOK_URL : process.env.QUOTE_WEBHOOK_URL = originalUrl;
    originalSecret === undefined ? delete process.env.QUOTE_WEBHOOK_SECRET : process.env.QUOTE_WEBHOOK_SECRET = originalSecret;
  }
});
