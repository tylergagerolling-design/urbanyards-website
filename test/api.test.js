const test = require("node:test");
const assert = require("node:assert/strict");

const quoteHandler = require("../api/quote");
const assistantHandler = require("../api/assistant");
const healthHandler = require("../api/health");
const privacyHandler = require("../api/privacy-request");
const retentionHandler = require("../api/retention-cleanup");
const { sendWebhook } = require("../api/lib/integrations");
const { verifyImage } = require("../api/lib/images");
const { answerFromSiteKnowledge, buildSiteContext, getRelevantKnowledge } = require("../api/lib/site-knowledge");

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

test("assistant answers from site knowledge without an OpenAI key", async () => {
  const key = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  const res = mockResponse();
  await assistantHandler(request("POST", { message: "Do you mow lawns?" }), res);
  assert.equal(res.statusCode, 200);
  assert.match(res.payload.reply, /lawn mowing/i);
  assert.equal(res.payload.source, "site-knowledge");
  assert.equal("OPENAI_API_KEY" in res.payload, false);
  if (key !== undefined) process.env.OPENAI_API_KEY = key;
});

test("site knowledge retrieves relevant website sections", () => {
  assert.equal(getRelevantKnowledge("Do you mow lawns?")[0].id, "homeowner-services");
  assert.equal(getRelevantKnowledge("Do you work with apartments?")[0].id, "property-management-services");
  assert.match(buildSiteContext("Do you do pressure washing?"), /Pressure Washing/i);
  assert.match(buildSiteContext("What areas do you serve?"), /Portland, Vancouver, North Portland/i);
  assert.match(buildSiteContext("How do I get a quote?"), /name, email, phone, property address/i);
  assert.match(buildSiteContext("Are you owner operated?"), /owner-operated by Tyler Gage/i);
});

test("site knowledge fallback answers common visitor questions", () => {
  assert.match(answerFromSiteKnowledge("Do you work with apartments?"), /apartment communities/i);
  assert.match(answerFromSiteKnowledge("Do you do pressure washing?"), /Pressure Washing/i);
  assert.match(answerFromSiteKnowledge("What areas do you serve?"), /Portland/i);
  assert.match(answerFromSiteKnowledge("Are you owner operated?"), /Tyler Gage/i);
  assert.match(answerFromSiteKnowledge("Do you install fountains?"), /I don't see that listed on the site/i);
});

test("assistant falls back to site knowledge if the model request fails", async () => {
  const originalKey = process.env.OPENAI_API_KEY;
  const originalFetch = global.fetch;
  process.env.OPENAI_API_KEY = "test-key";
  global.fetch = async () => ({ ok: false, status: 500 });
  try {
    const res = mockResponse();
    await assistantHandler(request("POST", { message: "How do I get a quote?" }), res);
    assert.equal(res.statusCode, 200);
    assert.match(res.payload.reply, /free quote/i);
    assert.equal(res.payload.source, "site-knowledge-fallback");
  } finally {
    global.fetch = originalFetch;
    originalKey === undefined ? delete process.env.OPENAI_API_KEY : process.env.OPENAI_API_KEY = originalKey;
  }
});

test("assistant sends relevant site knowledge to the model", async () => {
  const originalKey = process.env.OPENAI_API_KEY;
  const originalFetch = global.fetch;
  let capturedBody;
  process.env.OPENAI_API_KEY = "test-key";
  global.fetch = async (url, options) => {
    assert.equal(url, "https://api.openai.com/v1/chat/completions");
    capturedBody = JSON.parse(options.body);
    return {
      ok: true,
      async json() {
        return { choices: [{ message: { content: "Yes. Pressure Washing is listed on the site." } }] };
      }
    };
  };
  try {
    const res = mockResponse();
    await assistantHandler(request("POST", { message: "Do you do pressure washing?", page: "Home" }), res);
    assert.equal(res.statusCode, 200);
    assert.match(res.payload.reply, /Pressure Washing/i);
    const siteMessage = capturedBody.messages.find((message) => message.content.startsWith("Urban Yards website knowledge source"));
    assert.ok(siteMessage);
    assert.match(siteMessage.content, /Pressure Washing/i);
    assert.match(siteMessage.content, /request a quote/i);
  } finally {
    global.fetch = originalFetch;
    originalKey === undefined ? delete process.env.OPENAI_API_KEY : process.env.OPENAI_API_KEY = originalKey;
  }
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
