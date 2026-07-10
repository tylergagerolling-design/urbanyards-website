(function () {
  "use strict";

  const SESSION_KEY = "urbanYardsDashboardSession";
  const DASHBOARD_ROLES = new Set(["owner", "admin", "manager", "worker", "viewer"]);
  const FRIENDLY_EXPIRED_MESSAGE = "This invite link is expired or invalid. Please ask an admin to send a new invite.";

  const config = window.URBAN_YARDS_DASHBOARD_CONFIG || {};
  const title = document.querySelector("#auth-callback-title");
  const message = document.querySelector("[data-auth-callback-message]");
  const loginLink = document.querySelector("[data-auth-callback-login]");
  const card = document.querySelector(".auth-callback-card");

  function text(value) {
    return String(value || "").trim();
  }

  function setStatus(heading, body, isError = false) {
    if (title) title.textContent = heading;
    if (message) message.textContent = body;
    if (card) card.classList.toggle("is-error", isError);
    if (loginLink) loginLink.hidden = !isError;
  }

  function normalizeRole(value) {
    const role = text(value).toLowerCase().replace(/[^a-z_ -]/g, "").replace(/\s+/g, "_");
    if (role === "staff") return "manager";
    return DASHBOARD_ROLES.has(role) ? role : "viewer";
  }

  function firstText(...values) {
    return values.map(text).find(Boolean) || "";
  }

  function profileName(source = {}) {
    return firstText(source.full_name, source.display_name, source.name, source.user_name, source.email);
  }

  function normalizeSupabaseUrl() {
    return text(config.supabaseUrl).replace(/\/+$/, "");
  }

  function parseCallbackParams() {
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    hashParams.forEach((value, key) => {
      if (!params.has(key)) params.set(key, value);
    });
    if (window.location.hash || window.location.search) {
      window.history.replaceState(null, document.title, "/auth/callback");
    }
    return params;
  }

  async function getUser(accessToken) {
    const supabaseUrl = normalizeSupabaseUrl();
    if (!supabaseUrl || !config.supabaseAnonKey) {
      throw new Error("Dashboard auth is missing configuration. Add the Netlify Supabase environment variables and redeploy.");
    }

    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error_description || payload.msg || payload.message || "Unable to verify this invite session.");
    }
    return payload;
  }

  function saveDashboardSession({ accessToken, refreshToken, expiresIn, user }) {
    const email = text(user.email).toLowerCase();
    const userMetadata = user.user_metadata || {};
    const appMetadata = user.app_metadata || {};
    const role = normalizeRole(firstText(userMetadata.role, user.role, appMetadata.role));
    const name = firstText(profileName(userMetadata), profileName(appMetadata), profileName(user), email);
    const session = {
      accessToken,
      refreshToken,
      expiresAt: Date.now() + Number(expiresIn || 3600) * 1000,
      email,
      userId: text(user.id),
      role,
      profile: {
        name,
        role,
        avatar_url: firstText(userMetadata.avatar_url, userMetadata.avatarUrl)
      }
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  async function init() {
    const params = parseCallbackParams();
    const error = firstText(params.get("error_code"), params.get("error"));
    if (error) {
      setStatus("Invite Link Expired", FRIENDLY_EXPIRED_MESSAGE, true);
      return;
    }

    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (!accessToken || !refreshToken) {
      setStatus("Invite Link Invalid", FRIENDLY_EXPIRED_MESSAGE, true);
      return;
    }

    try {
      setStatus("Finishing Sign In", "One moment while we finish opening your dashboard.");
      const user = await getUser(accessToken);
      saveDashboardSession({
        accessToken,
        refreshToken,
        expiresIn: params.get("expires_in"),
        user
      });
      window.location.replace("/dashboard");
    } catch (error) {
      setStatus("Invite Link Error", error.message || FRIENDLY_EXPIRED_MESSAGE, true);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
