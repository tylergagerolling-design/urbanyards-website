(() => {
  document.documentElement.classList.add("js");
  const menuToggle = document.querySelector(".menu-toggle");
  const primaryNav = document.querySelector(".primary-nav");
  const header = document.querySelector(".site-header");
  const navDropdowns = [...document.querySelectorAll(".nav-dropdown")];
  const form = document.querySelector("#privacy-form");
  const status = document.querySelector("#privacy-status");
  const button = form.querySelector("button[type=submit]");
  const turnstileContainer = document.querySelector("#privacy-turnstile");

  if (menuToggle && primaryNav) {
    const closeNavDropdowns = () => {
      navDropdowns.forEach((dropdown) => {
        dropdown.classList.remove("is-open");
        dropdown.querySelector(".nav-dropdown-toggle")?.setAttribute("aria-expanded", "false");
      });
    };

    menuToggle.addEventListener("click", () => {
      const open = primaryNav.classList.toggle("is-open");
      menuToggle.setAttribute("aria-expanded", String(open));
      if (!open) closeNavDropdowns();
    });

    navDropdowns.forEach((dropdown) => {
      const toggle = dropdown.querySelector(".nav-dropdown-toggle");
      toggle?.addEventListener("click", () => {
        const open = !dropdown.classList.contains("is-open");
        closeNavDropdowns();
        dropdown.classList.toggle("is-open", open);
        toggle.setAttribute("aria-expanded", String(open));
      });
    });

    primaryNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        closeNavDropdowns();
        primaryNav.classList.remove("is-open");
        menuToggle.setAttribute("aria-expanded", "false");
      });
    });

    document.addEventListener("click", (event) => {
      if (!primaryNav.contains(event.target)) closeNavDropdowns();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeNavDropdowns();
    });
  }

  const updateScrollEffects = () => {
    header?.classList.toggle("is-compact", window.scrollY > 56);
    const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollProgress = scrollableHeight > 0 ? (window.scrollY / scrollableHeight) * 100 : 0;
    document.documentElement.style.setProperty("--scroll-progress", `${Math.min(scrollProgress, 100)}%`);
  };

  window.addEventListener("scroll", updateScrollEffects, { passive: true });
  updateScrollEffects();
  const copyrightYear = document.querySelector("#copyright-year");
  if (copyrightYear) copyrightYear.textContent = new Date().getFullYear();

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
