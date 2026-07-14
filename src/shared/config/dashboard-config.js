"use strict";

const PUBLIC_KEYS = Object.freeze([
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "VITE_SITE_URL",
  "SITE_URL",
  "VITE_GOOGLE_MAPS_BROWSER_KEY"
]);

const PRIVATE_KEYS = Object.freeze([
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
  "GOOGLE_MAPS_API_KEY",
  "SQUARE_ACCESS_TOKEN",
  "RESEND_API_KEY"
]);

function readDashboardConfig(env = process.env) {
  const siteUrl = env.SITE_URL || env.VITE_SITE_URL || "";
  return {
    appEnv: env.APP_ENV || env.CONTEXT || env.NODE_ENV || "development",
    siteUrl,
    public: {
      supabaseUrl: env.VITE_SUPABASE_URL || "",
      supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY || "",
      googleMapsBrowserKey: env.VITE_GOOGLE_MAPS_BROWSER_KEY || ""
    },
    private: {
      supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY || "",
      openAiApiKey: env.OPENAI_API_KEY || "",
      googleMapsApiKey: env.GOOGLE_MAPS_API_KEY || "",
      squareAccessToken: env.SQUARE_ACCESS_TOKEN || "",
      resendApiKey: env.RESEND_API_KEY || ""
    }
  };
}

function validateDashboardConfig(config, { requirePrivate = false } = {}) {
  const missing = [];
  if (!config.siteUrl) missing.push("SITE_URL or VITE_SITE_URL");
  if (!config.public.supabaseUrl) missing.push("VITE_SUPABASE_URL");
  if (!config.public.supabaseAnonKey) missing.push("VITE_SUPABASE_ANON_KEY");
  if (requirePrivate && !config.private.supabaseServiceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  return {
    valid: missing.length === 0,
    missing
  };
}

module.exports = {
  PUBLIC_KEYS,
  PRIVATE_KEYS,
  readDashboardConfig,
  validateDashboardConfig
};
