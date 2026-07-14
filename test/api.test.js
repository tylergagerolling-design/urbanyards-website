const test = require("node:test");
const assert = require("node:assert/strict");

const quoteHandler = require("../api/quote");
const assistantHandler = require("../api/assistant");
const healthHandler = require("../api/health");
const retentionHandler = require("../api/retention-cleanup");
const { sendWebhook } = require("../api/lib/integrations");
const { verifyImage } = require("../api/lib/images");
const { buildAuthCallbackUrl } = require("../netlify/functions/lib/site-url");
const {
  ASSISTANT_KNOWLEDGE,
  answerFromSiteKnowledge,
  buildSiteContext,
  detectIntent,
  getRelevantFaqs,
  getRelevantKnowledge,
  inferConversationContext
} = require("../api/lib/site-knowledge");

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

function isFeatureFlagRequest(url) {
  return String(url).includes("/feature_flags");
}

function featureFlagResponse(enabled = true) {
  const body = JSON.stringify([{ enabled }]);
  return {
    ok: true,
    status: 200,
    async json() {
      return JSON.parse(body);
    },
    async text() {
      return body;
    }
  };
}

function withEnv(patch, callback) {
  const original = {};
  const restore = () => {
    Object.keys(patch).forEach((key) => {
      original[key] === undefined ? delete process.env[key] : process.env[key] = original[key];
    });
  };
  Object.keys(patch).forEach((key) => {
    original[key] = process.env[key];
    patch[key] === undefined ? delete process.env[key] : process.env[key] = patch[key];
  });
  try {
    const result = callback();
    if (result && typeof result.then === "function") {
      return result.finally(restore);
    }
    restore();
    return result;
  } catch (error) {
    restore();
    throw error;
  }
}

test("quote endpoint rejects unsupported methods", async () => {
  const res = mockResponse();
  await quoteHandler(request("GET"), res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.Allow, "POST");
});

test("dashboard invite callback URL uses configured production site URL", () => {
  withEnv({ SITE_URL: "https://dashboard.example.com/", VITE_SITE_URL: undefined, NEXT_PUBLIC_SITE_URL: undefined, URL: undefined }, () => {
    assert.equal(buildAuthCallbackUrl({ headers: { host: "localhost:3000" } }), "https://dashboard.example.com/auth/callback");
  });
});

test("dashboard invite callback URL does not infer localhost without explicit config", () => {
  withEnv({ SITE_URL: undefined, VITE_SITE_URL: undefined, NEXT_PUBLIC_SITE_URL: undefined, URL: "http://localhost:3000" }, () => {
    assert.equal(buildAuthCallbackUrl({ headers: { host: "localhost:3000" } }), "https://urbanyards.us/auth/callback");
  });
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
  await withEnv({
    AIRTABLE_BASE_ID: undefined,
    AIRTABLE_TABLE_NAME: undefined,
    AIRTABLE_TOKEN: undefined,
    CLOUDINARY_API_KEY: undefined,
    CLOUDINARY_API_SECRET: undefined,
    CLOUDINARY_CLOUD_NAME: undefined,
    MALWARE_SCAN_TOKEN: undefined,
    MALWARE_SCAN_URL: undefined,
    QUOTE_FROM_EMAIL: undefined,
    QUOTE_TO_EMAIL: undefined,
    QUOTE_WEBHOOK_SECRET: undefined,
    QUOTE_WEBHOOK_URL: undefined,
    RESEND_API_KEY: undefined,
    SECURITY_ALERT_WEBHOOK_SECRET: undefined,
    SECURITY_ALERT_WEBHOOK_URL: undefined,
    SUPABASE_SERVICE_KEY: undefined,
    SUPABASE_SERVICE_ROLE_KEY: undefined,
    SUPABASE_URL: undefined,
    TURNSTILE_SECRET_KEY: undefined,
    VITE_SUPABASE_URL: undefined
  }, async () => {
    const res = mockResponse();
    await quoteHandler(request("POST", { name: "Tyler Gage", email: "tyler@example.com", service: "Groundskeeping" }), res);
    assert.equal(res.statusCode, 503);
    assert.match(res.payload.error, /temporarily unavailable/i);
  });
});

test("assistant requires a server-side OpenAI key", async () => {
  const original = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
  };
  delete process.env.OPENAI_API_KEY;
  delete process.env.SUPABASE_SERVICE_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    const res = mockResponse();
    await assistantHandler(request("POST", { message: "Do you mow lawns?" }), res);
    assert.equal(res.statusCode, 503);
    assert.match(res.payload.error, /AI helper is not available/i);
    assert.equal("OPENAI_API_KEY" in res.payload, false);
  } finally {
    Object.entries(original).forEach(([key, value]) => {
      value === undefined ? delete process.env[key] : process.env[key] = value;
    });
  }
});

test("site knowledge retrieves relevant website sections", () => {
  assert.equal(ASSISTANT_KNOWLEDGE.businessName, "Urban Yards Groundskeeping");
  assert.equal(ASSISTANT_KNOWLEDGE.tagline, "First Impressions Start Here");
  assert.equal(getRelevantKnowledge("Do you mow lawns?")[0].id, "homeowner-services");
  assert.equal(getRelevantKnowledge("Do you work with apartments?")[0].id, "property-management-services");
  assert.match(buildSiteContext("Do you do pressure washing?"), /Pressure Washing/i);
  assert.match(buildSiteContext("What areas do you serve?"), /Portland, Vancouver & Beaverton/i);
  assert.match(buildSiteContext("How do I get a quote?"), /name, email, phone, property address/i);
  assert.match(buildSiteContext("How do payments work?"), /Square payment links/i);
  assert.match(buildSiteContext("How do payments work?"), /does not collect card details/i);
  assert.match(buildSiteContext("Are you owner operated?"), /owner-operated by Tyler Gage/i);
});

test("site knowledge fallback answers common visitor questions", () => {
  assert.match(answerFromSiteKnowledge("Do you work with apartments?"), /apartment communities/i);
  assert.match(answerFromSiteKnowledge("Do you do pressure washing?"), /Pressure Washing/i);
  assert.match(answerFromSiteKnowledge("What areas do you serve?"), /Portland/i);
  assert.match(answerFromSiteKnowledge("How much does mowing cost?"), /property size, scope, condition, access, and service frequency/i);
  assert.match(answerFromSiteKnowledge("How do payments work?"), /Square/i);
  assert.match(answerFromSiteKnowledge("Are you owner operated?"), /Tyler Gage/i);
  assert.match(answerFromSiteKnowledge("Do you install fountains?"), /I don't see that listed on the site/i);
});

test("assistant recognizes conversational visitor intent", () => {
  assert.equal(detectIntent("My yard is getting pretty rough.").id, "cleanup");
  assert.equal(detectIntent("My HOA needs somebody.").id, "property_management");
  assert.equal(detectIntent("Do you work in Vancouver?").id, "service_area");
  assert.equal(detectIntent("How much would something like that cost?").id, "quote");
  assert.equal(detectIntent("What service do I need?").id, "service_recommendation");
  assert.equal(detectIntent("My weeds are getting crazy.").id, "cleanup");
});

test("assistant remembers conversation context for quote follow-up", () => {
  const history = [{ role: "user", content: "I manage an apartment building in Vancouver." }];
  const context = inferConversationContext("How do I get a quote?", history, {});
  assert.equal(context.lead.propertyType, "Apartment community");
  assert.equal(context.lead.city, "Vancouver");
  const reply = answerFromSiteKnowledge("How do I get a quote?", {}, history);
  assert.match(reply, /apartment community/i);
  assert.doesNotMatch(reply, /What type of property/i);
  assert.match(reply, /What service/i);
});

test("assistant asks natural follow-up questions for broad requests", () => {
  assert.match(answerFromSiteKnowledge("My yard is getting pretty rough."), /overgrown grass, weeds, shrubs/i);
  assert.match(answerFromSiteKnowledge("I need landscaping."), /what are you hoping to improve/i);
  assert.match(answerFromSiteKnowledge("My shrubs need work."), /overgrown/i);
  assert.match(answerFromSiteKnowledge("I need lawn care."), /recurring maintenance or a one-time service/i);
  assert.match(answerFromSiteKnowledge("What service do I need?"), /property type, approximate size, current issue/i);
  assert.match(answerFromSiteKnowledge("What service do I need?"), /one-time visit or recurring care/i);
});

test("site knowledge retrieves FAQ answers and asks one lead question", () => {
  assert.equal(getRelevantFaqs("How can I contact Urban Yards?")[0].id, "contact");
  const reply = answerFromSiteKnowledge("Can I get a quote?", { propertyType: "Home" });
  assert.match(reply, /free quote/i);
  assert.match(reply, /What city or general area/i);
  assert.doesNotMatch(reply, /What service are you looking for.*best phone number/s);
});

test("assistant returns a graceful error if the model request fails", async () => {
  const originalKey = process.env.OPENAI_API_KEY;
  const originalFetch = global.fetch;
  process.env.OPENAI_API_KEY = "test-key";
  global.fetch = async (url) => {
    if (isFeatureFlagRequest(url)) return featureFlagResponse(true);
    return {
      ok: false,
      status: 500,
      async json() {
        return { error: { message: "Model unavailable" } };
      },
      async text() {
        return "Model unavailable";
      }
    };
  };
  try {
    const res = mockResponse();
    await assistantHandler(request("POST", { message: "How do I get a quote?" }), res);
    assert.equal(res.statusCode, 502);
    assert.match(res.payload.error, /AI helper is not available/i);
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
    if (isFeatureFlagRequest(url)) return featureFlagResponse(true);
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
    const businessMessage = capturedBody.messages.find((message) => message.content.includes("Core Urban Yards facts"));
    assert.ok(siteMessage);
    assert.ok(businessMessage);
    assert.match(siteMessage.content, /Pressure Washing/i);
    assert.match(siteMessage.content, /request a quote/i);
    assert.match(businessMessage.content, /Portland, Vancouver & Beaverton/i);
    assert.match(businessMessage.content, /Square invoices/i);
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
