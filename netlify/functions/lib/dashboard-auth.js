function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(body)
  };
}

function getSupabaseUrl() {
  return (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
}

function getSupabaseAnonKey() {
  return process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
}

function getSupabaseServiceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";
}

async function verifyOwner(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const supabaseUrl = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  const ownerEmail = (process.env.VITE_DASHBOARD_OWNER_EMAIL || "team@urbanyards.us").toLowerCase();

  if (!token || !supabaseUrl || !anonKey) return false;

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`
    },
    signal: AbortSignal.timeout(8000)
  });

  if (!response.ok) return false;
  const user = await response.json();
  return String(user.email || "").toLowerCase() === ownerEmail;
}

async function supabaseAdminRequest(path, options) {
  const supabaseUrl = getSupabaseUrl();
  const serviceKey = getSupabaseServiceKey();
  if (!supabaseUrl || !serviceKey) throw new Error("Supabase service role is not configured.");

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      ...(options && options.headers ? options.headers : {})
    },
    signal: AbortSignal.timeout(10000)
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(payload?.message || payload?.hint || `Supabase request failed (${response.status})`);
  }
  return payload;
}

module.exports = { json, supabaseAdminRequest, verifyOwner };
