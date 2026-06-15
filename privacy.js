(() => {
  const form = document.querySelector("#privacy-form");
  const status = document.querySelector("#privacy-status");
  const button = form.querySelector("button[type=submit]");
  const turnstileContainer = document.querySelector("#privacy-turnstile");

  const setStatus = (message, state) => {
    status.textContent = message;
    status.className = `form-status wide is-${state}`;
    status.focus();
  };

  const siteKey = window.URBAN_YARDS_CONFIG?.turnstileSiteKey;
  if (siteKey) {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = () => window.turnstile.render(turnstileContainer, {
      sitekey: siteKey,
      callback: (token) => { turnstileContainer.dataset.token = token; }
    });
    document.head.appendChild(script);
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.checkValidity()) return form.reportValidity();
    const data = new FormData(form);
    if (data.get("company")) return;
    button.disabled = true;
    try {
      const response = await fetch("/api/privacy-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.get("email"),
          quoteRequestId: data.get("quoteRequestId"),
          turnstileToken: turnstileContainer.dataset.token || ""
        }),
        signal: AbortSignal.timeout(15000)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "The request could not be sent.");
      setStatus(`Request received. Keep this reference: ${result.requestId}`, "success");
      form.reset();
      if (window.turnstile) window.turnstile.reset();
    } catch (error) {
      setStatus(`${error.message} Please email team@urbanyards.us for help.`, "error");
    } finally {
      button.disabled = false;
    }
  });
})();
