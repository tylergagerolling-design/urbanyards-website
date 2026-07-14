const fs = require("node:fs");
const path = require("node:path");

const outputPath = path.join(__dirname, "..", "dashboard-config.js");
const existing = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";

function readExistingValue(key) {
  const pattern = new RegExp(`["']?${key}["']?\\s*:\\s*"([^"]*)"`);
  const match = existing.match(pattern);
  return match ? match[1] : "";
}

function isTruthy(value) {
  return ["1", "true", "yes"].includes(String(value || "").trim().toLowerCase());
}

function isProductionDeploy(appEnv) {
  const context = String(process.env.CONTEXT || "").toLowerCase();
  return String(appEnv || "").toLowerCase() === "production"
    || (isTruthy(process.env.NETLIFY) && (!context || context === "production"));
}

function validHttpsUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function validatePublicConfig(config) {
  const errors = [];
  if (!config.supabaseUrl) errors.push("VITE_SUPABASE_URL is required.");
  else if (!validHttpsUrl(config.supabaseUrl)) errors.push("VITE_SUPABASE_URL must be a valid HTTPS URL.");
  if (!config.supabaseAnonKey) errors.push("VITE_SUPABASE_ANON_KEY is required.");
  if (!config.ownerEmail) errors.push("VITE_DASHBOARD_OWNER_EMAIL or the default owner email is required.");
  return errors;
}

function buildConfig() {
  const appEnv = process.env.APP_ENV
    || process.env.CONTEXT
    || readExistingValue("appEnv")
    || (isTruthy(process.env.NETLIFY) ? "production" : "local");
  const production = isProductionDeploy(appEnv);

  const config = {
    supabaseUrl: process.env.VITE_SUPABASE_URL || (production ? "" : readExistingValue("supabaseUrl")),
    supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || (production ? "" : readExistingValue("supabaseAnonKey")),
    siteUrl: process.env.SITE_URL || process.env.VITE_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || readExistingValue("siteUrl"),
    ownerEmail: process.env.VITE_DASHBOARD_OWNER_EMAIL || readExistingValue("ownerEmail") || "team@urbanyards.us",
    appEnv,
    buildVersion: process.env.DEPLOY_ID || process.env.COMMIT_REF || process.env.HEAD || process.env.BUILD_VERSION || new Date().toISOString()
  };

  if (production) {
    const errors = validatePublicConfig(config);
    if (errors.length) {
      throw new Error(`Dashboard config is incomplete for production deploy: ${errors.join(" ")}`);
    }
  }

  return config;
}

function writeConfig(config) {
  const publicConfig = {
    supabaseUrl: config.supabaseUrl || "",
    supabaseAnonKey: config.supabaseAnonKey || "",
    siteUrl: config.siteUrl || "",
    ownerEmail: config.ownerEmail || "team@urbanyards.us",
    appEnv: config.appEnv || "local",
    buildVersion: config.buildVersion || ""
  };

  const file = `// Owner dashboard configuration.
// Generated at deploy time from Netlify environment variables.
window.URBAN_YARDS_DASHBOARD_CONFIG = ${JSON.stringify(publicConfig, null, 2)};
`;

  fs.writeFileSync(outputPath, file);
  console.log(`dashboard-config.js generated for ${publicConfig.appEnv}`);
}

if (require.main === module) {
  writeConfig(buildConfig());
}

module.exports = {
  buildConfig,
  isProductionDeploy,
  validatePublicConfig,
  validHttpsUrl
};
