const crypto = require("node:crypto");

const buckets = new Map();

function requestId(req) {
  return String(req.headers?.["x-request-id"] || crypto.randomUUID()).slice(0, 80);
}

function clientIp(req) {
  const forwarded = req.headers?.["x-forwarded-for"];
  return String(forwarded || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
}

function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }
  current.count += 1;
  return {
    allowed: current.count <= limit,
    remaining: Math.max(0, limit - current.count),
    retryAfter: Math.ceil((current.resetAt - now) / 1000)
  };
}

function allowedOrigin(req) {
  const origin = req.headers?.origin;
  if (!origin) return true;
  const configured = String(process.env.ALLOWED_ORIGINS || process.env.SITE_URL || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const allowed = new Set([
    "https://urbanyards.us",
    "https://www.urbanyards.us",
    "http://localhost:8888",
    "http://localhost:3000",
    ...configured
  ]);
  return allowed.has(origin);
}

function setApiHeaders(res, id) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Request-Id", id);
}

function text(value, maxLength = 500) {
  return String(value || "").trim().replace(/\u0000/g, "").slice(0, maxLength);
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 160;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function verifyTurnstile(token, ip) {
  if (!process.env.TURNSTILE_SECRET_KEY) return true;
  if (!token) return false;
  const body = new URLSearchParams({
    secret: process.env.TURNSTILE_SECRET_KEY,
    response: token,
    remoteip: ip
  });
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
    signal: AbortSignal.timeout(6000)
  });
  if (!response.ok) return false;
  const result = await response.json();
  return result.success === true;
}

module.exports = {
  allowedOrigin,
  clientIp,
  escapeHtml,
  rateLimit,
  requestId,
  setApiHeaders,
  safeEqual,
  text,
  validEmail,
  verifyTurnstile
};
