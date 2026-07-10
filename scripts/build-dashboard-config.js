const fs = require("node:fs");
const path = require("node:path");

const outputPath = path.join(__dirname, "..", "dashboard-config.js");
const existing = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";

function readExistingValue(key) {
  const pattern = new RegExp(`["']?${key}["']?\\s*:\\s*"([^"]*)"`);
  const match = existing.match(pattern);
  return match ? match[1] : "";
}

const config = {
  supabaseUrl: process.env.VITE_SUPABASE_URL || readExistingValue("supabaseUrl"),
  supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || readExistingValue("supabaseAnonKey"),
  siteUrl: process.env.SITE_URL || process.env.VITE_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || readExistingValue("siteUrl"),
  ownerEmail: process.env.VITE_DASHBOARD_OWNER_EMAIL || readExistingValue("ownerEmail") || "team@urbanyards.us",
  appEnv: process.env.APP_ENV || process.env.CONTEXT || readExistingValue("appEnv") || "production"
};

const file = `// Owner dashboard configuration.
// Generated at deploy time from Netlify environment variables.
window.URBAN_YARDS_DASHBOARD_CONFIG = ${JSON.stringify(config, null, 2)};
`;

fs.writeFileSync(outputPath, file);
console.log("dashboard-config.js generated");
