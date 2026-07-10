const DEFAULT_PUBLIC_SITE_URL = "https://urbanyards.us";

function normalizeSiteUrl(value) {
  const url = String(value || "").trim().replace(/\/+$/, "");
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) return "";
  return url;
}

function hostLooksLocal(host = "") {
  return /(^|\.)localhost(?::|$)|^127\.0\.0\.1(?::|$)|^\[?::1\]?(?::|$)/i.test(String(host || ""));
}

function siteUrlFromEvent(event = {}) {
  const headers = event.headers || {};
  const host = headers.host || headers.Host || "";
  if (!host || hostLooksLocal(host)) return "";
  const proto = headers["x-forwarded-proto"] || headers["X-Forwarded-Proto"] || "https";
  return normalizeSiteUrl(`${proto}://${host}`);
}

function getSiteUrl(event = {}) {
  const explicit = normalizeSiteUrl(
    process.env.SITE_URL ||
    process.env.VITE_SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL
  );
  if (explicit) return explicit;

  const netlifyUrl = normalizeSiteUrl(process.env.URL);
  if (netlifyUrl) {
    try {
      if (!hostLooksLocal(new URL(netlifyUrl).host)) return netlifyUrl;
    } catch {
      // Ignore malformed URL values and fall back below.
    }
  }

  return siteUrlFromEvent(event) || DEFAULT_PUBLIC_SITE_URL;
}

function buildAuthCallbackUrl(event = {}) {
  return `${getSiteUrl(event)}/auth/callback`;
}

module.exports = {
  buildAuthCallbackUrl,
  getSiteUrl,
  normalizeSiteUrl
};
