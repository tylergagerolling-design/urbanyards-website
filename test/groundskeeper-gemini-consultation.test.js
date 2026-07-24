const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { consultationDecision } = require("../src/assistant/consultation/policy");
const { sanitizeConsultationContext } = require("../src/assistant/consultation/context-sanitizer");
const { createGeminiProvider, parseStructuredResponse } = require("../src/assistant/consultation/gemini-provider");
const { disagreementDetected, synthesisInstruction } = require("../src/assistant/consultation/synthesizer");

const structured = {
  summary: "Margin is acceptable but provisional.",
  findings: [{ finding: "Labor is the largest cost.", evidence: "The supplied estimate shows $700 labor.", confidence: 0.82 }],
  risks: ["Administrative hours are missing."],
  missingInformation: ["Administrative hours"],
  recommendation: "Add administrative time before final approval.",
  shouldEscalate: false
};

function geminiResponse(body = structured, extras = {}) {
  return {
    ok: true,
    status: 200,
    async json() {
      return {
        candidates: [{ content: { parts: [{ text: JSON.stringify(body) }] }, finishReason: "STOP" }],
        usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50, totalTokenCount: 150 },
        modelVersion: "gemini-2.5-flash",
        ...extras
      };
    }
  };
}

test("Gemini provider detects configured and missing credentials without exposing a key", async () => {
  assert.equal(createGeminiProvider({ apiKey: "" }).health().configured, false);
  await assert.rejects(() => createGeminiProvider({ apiKey: "" }).consult({ sanitizedContext: "{}" }), (error) => error.category === "not_configured" && !error.message.includes("secret"));
  assert.equal(createGeminiProvider({ apiKey: "test-secret" }).health().configured, true);
});

test("successful Gemini consultation is structured and returns bounded usage metadata", async () => {
  let request;
  const provider = createGeminiProvider({
    apiKey: "test-secret",
    fetchImpl: async (url, options) => {
      request = { url, options };
      return geminiResponse();
    }
  });
  const result = await provider.consult({ sanitizedContext: '{"question":"Review margin"}' });
  assert.equal(result.consultation.summary, structured.summary);
  assert.equal(result.usage.totalTokens, 150);
  assert.equal(request.options.headers["x-goog-api-key"], "test-secret");
  assert.equal(request.url.includes("test-secret"), false);
  assert.equal(JSON.parse(request.options.body).generationConfig.responseMimeType, "application/json");
});

test("Gemini performs at most one schema fallback retry", async () => {
  let calls = 0;
  const provider = createGeminiProvider({
    apiKey: "test-secret",
    fetchImpl: async () => {
      calls += 1;
      return calls === 1 ? { ok: false, status: 400 } : geminiResponse();
    }
  });
  const result = await provider.consult({ sanitizedContext: "{}" });
  assert.equal(result.consultation.summary, structured.summary);
  assert.equal(calls, 2);
});

test("Gemini invalid key, rate limit, empty result, and safety block are normalized", async () => {
  for (const [status, category] of [[401, "invalid_key"], [429, "rate_limited"]]) {
    const provider = createGeminiProvider({ apiKey: "x", fetchImpl: async () => ({ ok: false, status }) });
    await assert.rejects(() => provider.consult({ sanitizedContext: "{}" }), (error) => error.category === category);
  }
  await assert.rejects(() => createGeminiProvider({ apiKey: "x", fetchImpl: async () => geminiResponse(null) }).consult({ sanitizedContext: "{}" }), (error) => error.category === "empty_response");
  const blocked = createGeminiProvider({ apiKey: "x", fetchImpl: async () => geminiResponse(structured, { promptFeedback: { blockReason: "SAFETY" } }) });
  await assert.rejects(() => blocked.consult({ sanitizedContext: "{}" }), (error) => error.category === "safety_block");
});

test("malformed structured output gets one safe normalization pass then fails closed", () => {
  assert.equal(parseStructuredResponse(`prefix ${JSON.stringify(structured)} suffix`).summary, structured.summary);
  assert.throws(() => parseStructuredResponse("{not-json"), (error) => error.category === "malformed_response");
});

test("Gemini timeout and caller abort are normalized", async () => {
  const provider = createGeminiProvider({
    apiKey: "x",
    fetchImpl: async (_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }))))
  });
  await assert.rejects(() => provider.consult({ sanitizedContext: "{}", timeoutMs: 1 }), (error) => error.category === "timeout");
});

test("context sanitizer sends only the selected record and strips sensitive fields", () => {
  const sanitized = sanitizeConsultationContext({
    message: "Review this ticket",
    primaryConclusion: "Looks profitable.",
    context: {
      pageContext: { currentRoute: "#tickets", selectedRecordType: "ticket", selectedRecordId: "t1" },
      accessToken: "never-send",
      tickets: [
        { id: "t1", title: "Cleanup", stage: "budget_in_progress", expectedRevenue: 1200, password: "bad", apiKey: "bad", privateAttachment: "bad" },
        { id: "t2", title: "Unrelated customer", stage: "draft" }
      ]
    }
  });
  assert.match(sanitized.serialized, /Cleanup/);
  assert.doesNotMatch(sanitized.serialized, /never-send|Unrelated customer|password|apiKey|privateAttachment/);
});

test("context sanitizer enforces the configured maximum size", () => {
  const result = sanitizeConsultationContext({ message: "x".repeat(10000), primaryConclusion: "y".repeat(10000), maxChars: 2200 });
  assert.ok(result.serialized.length <= 2200);
});

test("automatic consultation triggers for material work and skips trivial actions", () => {
  assert.equal(consultationDecision({ message: "Review this job budget and profit margin", mode: "auto" }).consult, true);
  assert.equal(consultationDecision({ message: "Open the tickets page", mode: "auto" }).consult, false);
  assert.equal(consultationDecision({ message: "A substantial response that needs review because it compares several plans", mode: "always_review" }).consult, true);
});

test("manual consultation works in off mode but emergency stop prevents every consultation", () => {
  assert.equal(consultationDecision({ message: "Consult Gemini on this", mode: "off", manual: true }).consult, true);
  assert.equal(consultationDecision({ message: "Consult Gemini on this", mode: "always_review", manual: true, emergencyStop: true }).consult, false);
});

test("consultation is single depth and synthesis treats Gemini as advisory", () => {
  const prompt = synthesisInstruction({ userQuestion: "Review this", primaryAnswer: "Primary", consultation: structured });
  assert.match(prompt, /advisory review/i);
  assert.doesNotMatch(prompt, /consult Gemini again|another model/i);
  assert.equal(disagreementDetected("Primary", { ...structured, risks: ["The primary conclusion is unsupported."] }), true);
});

test("server route remains authenticated and frontend contains no Gemini secret", () => {
  const api = fs.readFileSync(path.join(__dirname, "..", "api", "groundskeeper-ai.js"), "utf8");
  const dashboard = fs.readFileSync(path.join(__dirname, "..", "dashboard.js"), "utf8");
  assert.match(api, /requirePermission\(req, "admin:manage"/);
  assert.match(api, /GEMINI_API_KEY/);
  assert.match(api, /rateLimit\(`gemini-user-daily/);
  assert.match(api, /consultationMeta/);
  assert.doesNotMatch(dashboard, /GEMINI_API_KEY|generativelanguage\.googleapis\.com|x-goog-api-key/);
  assert.doesNotMatch(dashboard, /data-action="copilot-consult-gemini"|data-action="copilot-double-check"|data-action="copilot-consultation-settings"/);
});

test("provider errors preserve the primary Groundskeeper fallback path", () => {
  const api = fs.readFileSync(path.join(__dirname, "..", "api", "groundskeeper-ai.js"), "utf8");
  assert.match(api, /reply = `\$\{primaryReply\}[\s\S]*second-opinion service was unavailable/);
  assert.match(api, /decision\.consult[\s\S]*createGeminiProvider/);
});
