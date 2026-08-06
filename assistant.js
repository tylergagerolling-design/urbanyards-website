(() => {
  const storageKey = "urbanYardsGroundskeeperConversation.v1";
  const quoteDraftKey = "urbanYardsGroundskeeperQuoteDraft.v1";
  const maxStoredMessages = 18;
  const maxMessageLength = 1400;
  const requestCooldownMs = 2500;
  const unavailableReply = "I can’t answer that from Urban Yards’ public materials right now. You can contact Urban Yards directly or request a free quote.";
  const leadSignals = ["quote", "estimate", "price", "cost", "hire", "schedule", "book", "service", "cleanup", "mowing", "mulch", "trim", "porter", "address", "property"];
  const quickActions = ["Request a Free Quote", "Homeowner Services", "Property Management Services", "Service Areas", "Contact Urban Yards"];
  const cityPatterns = [
    { value: "Beaverton", pattern: /\bbeaverton\b/i },
    { value: "Portland", pattern: /\bportland\b/i },
    { value: "Vancouver", pattern: /\bvancouver\b/i },
    { value: "North Portland", pattern: /\bnorth portland\b/i }
  ];
  const intentRules = [
    { id: "quote", leadIntent: true, keywords: ["quote", "estimate", "price", "cost", "hire", "schedule", "book", "how much"] },
    { id: "property_management", leadIntent: true, keywords: ["apartment", "apartments", "multifamily", "hoa", "condo", "condominium", "property manager", "building", "complex"] },
    { id: "cleanup", leadIntent: true, keywords: ["rough", "messy", "cleanup", "clean up", "overgrown", "out of hand", "weeds are crazy", "getting crazy", "needs help"] },
    { id: "lawn_care", leadIntent: true, keywords: ["lawn", "mow", "mowing", "grass", "edging", "edge", "weed", "weeds", "yard care"] },
    { id: "trimming", leadIntent: true, keywords: ["trim", "trimming", "shrubs", "bushes", "prune", "pruning", "hedges"] },
    { id: "property_improvement", leadIntent: true, keywords: ["landscaping", "landscape", "improve", "refresh", "mulch", "planting", "plants", "beds", "curb appeal"] },
    { id: "service_area", keywords: ["area", "serve", "service area", "where", "location", "beaverton", "portland", "vancouver", "north portland"] },
    { id: "contact", keywords: ["contact", "phone", "email", "call", "reach", "number"] },
    { id: "casual", keywords: ["hello", "hi", "hey", "thanks", "thank you"] }
  ];
  const defaultMessages = [{
    role: "assistant",
    content: "I’m The Groundskeeper, Urban Yards’ website guide. I can help you learn about our services, service areas, and how to request a quote."
  }];

  const state = { open: false, busy: false, messages: loadMessages(), lastRequestAt: 0, pendingQuoteLead: null };

  function loadMessages() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey));
      if (Array.isArray(saved) && saved.length) return saved.slice(-maxStoredMessages);
    } catch (error) {
      sessionStorage.removeItem(storageKey);
    }
    return [...defaultMessages];
  }

  function saveMessages() {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(state.messages.slice(-maxStoredMessages)));
    } catch (error) {
      // The assistant remains usable when browser storage is unavailable.
    }
  }

  function createAssistant() {
    const root = document.createElement("section");
    root.className = "uy-assistant";
    root.setAttribute("aria-label", "The Groundskeeper website assistant");
    root.innerHTML = `
      <button class="uy-assistant-toggle" type="button" aria-label="Open The Groundskeeper" aria-expanded="false" aria-controls="uy-assistant-panel">
        <svg class="uy-assistant-toggle-icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
          <path class="uy-helper-hex-fill" d="M32 5.8 54.5 18.9v26.2L32 58.2 9.5 45.1V18.9L32 5.8Z"/>
          <path class="uy-helper-hex-outline" d="M32 5.8 54.5 18.9v26.2L32 58.2 9.5 45.1V18.9L32 5.8Z"/>
          <path class="uy-helper-hex-inner" d="M32 11.5 49.5 21.7v20.6L32 52.5 14.5 42.3V21.7L32 11.5Z"/>
          <path class="uy-helper-leaf" d="M22.6 38.8C24 27.2 33.4 19.3 43 17.8c1.2 10.5-3.6 19.3-13.5 23.2-2.5 1-5.2.1-6.9-2.2Z"/>
          <path class="uy-helper-leaf-line" d="M21.9 41.2c4.6-9 10.2-14.7 17.2-18.7M30.4 31.8l8.3-.9"/>
          <path class="uy-helper-bubble" d="M39.1 34.4h9.2c4.9 0 8.8 3.6 8.8 8.2s-3.9 8.2-8.8 8.2h-2.7l-6.6 4.4.8-5.1c-3.3-1.2-5.5-4-5.5-7.5 0-4.6 3.9-8.2 8.8-8.2Z"/>
          <circle class="uy-helper-dot" cx="42.7" cy="42.5" r="1.45"/>
          <circle class="uy-helper-dot" cx="47.2" cy="42.5" r="1.45"/>
          <circle class="uy-helper-dot" cx="51.7" cy="42.5" r="1.45"/>
        </svg>
        <span class="sr-only">Open The Groundskeeper</span>
      </button>
      <div class="uy-assistant-panel" id="uy-assistant-panel" role="dialog" aria-modal="false" aria-labelledby="uy-assistant-title" hidden>
        <header class="uy-assistant-header">
          <div>
            <h2 id="uy-assistant-title">The Groundskeeper</h2>
            <p>Urban Yards’ website guide.</p>
          </div>
          <button class="uy-assistant-close" type="button" aria-label="Close The Groundskeeper">Close</button>
        </header>
        <div class="uy-assistant-messages" role="log" aria-live="polite" aria-relevant="additions"></div>
        <div class="uy-assistant-actions" aria-label="Suggested questions"></div>
        <form class="uy-assistant-lead" hidden>
          <p class="eyebrow">Optional Lead Details</p>
          <div class="uy-assistant-lead-grid">
            <label>Name<input name="name" autocomplete="name" placeholder="Name"></label>
            <label>Email<input name="email" type="email" autocomplete="email" placeholder="Email"></label>
            <label>Phone<input name="phone" autocomplete="tel" placeholder="Phone"></label>
            <label>Property Type<input name="propertyType" placeholder="House, apartment, commercial..."></label>
            <label>Property Location<input name="propertyLocation" autocomplete="street-address" placeholder="Address or general area"></label>
            <label>Service<input name="service" placeholder="Cleanup, mowing, mulch..."></label>
            <label class="uy-assistant-lead-wide">Additional Details<textarea name="details" rows="3" placeholder="Property condition, timing, or anything Urban Yards should know"></textarea></label>
          </div>
          <div class="uy-assistant-lead-actions">
            <button class="uy-assistant-lead-review button button-small" type="button">Review Quote Details</button>
            <button class="uy-assistant-lead-confirm button button-small" type="button" hidden>Confirm and Open Quote Form</button>
          </div>
          <div class="uy-assistant-lead-summary" role="status" hidden></div>
        </form>
        <form class="uy-assistant-form">
          <label class="sr-only" for="uy-assistant-input">Ask The Groundskeeper a question</label>
          <textarea id="uy-assistant-input" rows="2" placeholder="Ask about services, timing, or quote details..."></textarea>
          <button class="button button-small" type="submit">Send</button>
        </form>
        <p class="uy-assistant-note">Conversation details are kept only for this browser tab. Final pricing and scheduling require property review.</p>
      </div>
    `;
    document.body.appendChild(root);
    return root;
  }

  const assistant = createAssistant();
  const toggle = assistant.querySelector(".uy-assistant-toggle");
  const panel = assistant.querySelector(".uy-assistant-panel");
  const closeButton = assistant.querySelector(".uy-assistant-close");
  const messagesList = assistant.querySelector(".uy-assistant-messages");
  const actionsList = assistant.querySelector(".uy-assistant-actions");
  const form = assistant.querySelector(".uy-assistant-form");
  const input = assistant.querySelector("#uy-assistant-input");
  const leadForm = assistant.querySelector(".uy-assistant-lead");
  const reviewLeadButton = assistant.querySelector(".uy-assistant-lead-review");
  const confirmLeadButton = assistant.querySelector(".uy-assistant-lead-confirm");
  const leadSummary = assistant.querySelector(".uy-assistant-lead-summary");

  function setOpen(open, options = {}) {
    const { focus = true } = options;
    state.open = open;
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    assistant.classList.toggle("is-open", open);
    if (open) {
      renderMessages();
      if (focus) requestAnimationFrame(() => input.focus());
    } else if (focus) {
      toggle.focus();
    }
  }

  function renderMessages() {
    messagesList.innerHTML = "";
    state.messages.forEach((message) => {
      const bubble = document.createElement("article");
      bubble.className = `uy-assistant-message is-${message.role}`;
      bubble.textContent = message.content;
      messagesList.appendChild(bubble);
    });
    messagesList.scrollTop = messagesList.scrollHeight;
    actionsList.hidden = state.messages.some((message) => message.role === "user");
  }

  function renderQuickActions() {
    actionsList.innerHTML = "";
    quickActions.forEach((action) => {
      const button = document.createElement("button");
      button.className = "uy-assistant-action";
      button.type = "button";
      button.textContent = action;
      button.addEventListener("click", () => {
        input.value = action;
        submitMessage();
      });
      actionsList.appendChild(button);
    });
  }

  function setTyping(active) {
    let typing = messagesList.querySelector(".uy-assistant-typing");
    if (!active && typing) typing.remove();
    if (!active || typing) return;
    typing = document.createElement("div");
    typing.className = "uy-assistant-typing";
    typing.setAttribute("role", "status");
    typing.setAttribute("aria-label", "The Groundskeeper is responding");
    typing.innerHTML = "<span></span><span></span><span></span>";
    messagesList.appendChild(typing);
    messagesList.scrollTop = messagesList.scrollHeight;
  }

  function shouldShowLeadCapture(message) {
    const normalized = message.toLowerCase();
    const intent = detectIntent(message);
    return Boolean(intent.leadIntent) || leadSignals.some((signal) => normalized.includes(signal));
  }

  function detectIntent(message) {
    const normalized = message.toLowerCase();
    const scored = intentRules.map((intent) => ({
      ...intent,
      score: intent.keywords.reduce((total, keyword) => {
        const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return total + (new RegExp(`\\b${escaped}\\b`, "i").test(normalized) ? 1 : 0);
      }, 0)
    })).sort((a, b) => b.score - a.score);
    return scored[0]?.score ? scored[0] : { id: "unknown", leadIntent: false };
  }

  function setInputValue(name, value) {
    const field = leadForm.elements[name];
    if (field && !field.value) field.value = value;
  }

  function rememberLeadDetails(message) {
    const city = cityPatterns.find((item) => item.pattern.test(message));
    if (city) setInputValue("propertyLocation", city.value);
    if (/\b(apartment|apartments|multifamily|building|complex)\b/i.test(message)) setInputValue("propertyType", "Apartment community");
    else if (/\bhoa\b/i.test(message)) setInputValue("propertyType", "HOA");
    else if (/\b(condo|condominium)\b/i.test(message)) setInputValue("propertyType", "Condominium");
    else if (/\b(home|house|yard)\b/i.test(message)) setInputValue("propertyType", "Home");

    if (/\b(mow|mowing|lawn|grass|edge|edging)\b/i.test(message)) setInputValue("service", "Lawn care");
    else if (/\b(cleanup|clean up|overgrown|rough|messy|weeds?)\b/i.test(message)) setInputValue("service", "Cleanup");
    else if (/\b(trim|trimming|shrubs?|bushes|prun(e|ing)|hedges?)\b/i.test(message)) setInputValue("service", "Shrub trimming");
    else if (/\bpressure wash|pressure washing\b/i.test(message)) setInputValue("service", "Pressure washing");
    else if (/\b(landscaping|landscape|mulch|planting|beds|refresh)\b/i.test(message)) setInputValue("service", "Landscape improvement");

    const nameMatch = message.match(/\b(?:my name is|i am|i'm)\s+([a-z][a-z\s'-]{1,40})/i);
    if (nameMatch) setInputValue("name", nameMatch[1].trim().replace(/\s+/g, " "));
  }

  function getLeadDetails() {
    const data = new FormData(leadForm);
    return {
      name: String(data.get("name") || "").trim(),
      email: String(data.get("email") || "").trim(),
      phone: String(data.get("phone") || "").trim(),
      propertyType: String(data.get("propertyType") || "").trim(),
      propertyLocation: String(data.get("propertyLocation") || "").trim(),
      service: String(data.get("service") || "").trim(),
      details: String(data.get("details") || "").trim()
    };
  }

  function quoteServiceValue(value) {
    const normalized = String(value || "").toLowerCase();
    if (/mow|lawn|grass|edge/.test(normalized)) return "Lawn Mowing";
    if (/cleanup|clean up|overgrown|weed/.test(normalized)) return "Seasonal Cleanup";
    if (/mulch|bed|plant|refresh/.test(normalized)) return "Mulch & Entry Bed Refresh";
    if (/pressure/.test(normalized)) return "Pressure Washing";
    if (/apartment.*turnover|turnover/.test(normalized)) return "Apartment Turnover Support";
    if (/apartment/.test(normalized)) return "Apartment Groundskeeping";
    if (/hoa/.test(normalized)) return "HOA Landscape Maintenance";
    if (/property management/.test(normalized)) return "Property Management Landscaping";
    if (/landscape/.test(normalized)) return "Landscape Maintenance";
    return value || "Other";
  }

  function setQuoteField(formElement, name, value) {
    const field = formElement?.elements?.[name];
    if (!field || !value) return;
    if (field.tagName === "SELECT") {
      const candidate = [...field.options].find((option) => option.value.toLowerCase() === String(value).toLowerCase());
      field.value = candidate ? candidate.value : "Other";
    } else {
      field.value = value;
    }
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function applyQuoteDraft(lead, { focus = false } = {}) {
    const quoteForm = document.querySelector("#quote-form");
    if (!quoteForm) return false;
    setQuoteField(quoteForm, "name", lead.name);
    setQuoteField(quoteForm, "email", lead.email);
    setQuoteField(quoteForm, "phone", lead.phone);
    setQuoteField(quoteForm, "location", lead.propertyLocation);
    setQuoteField(quoteForm, "service", quoteServiceValue(lead.service));
    setQuoteField(quoteForm, "message", lead.details);
    if (focus) {
      document.querySelector("#quote")?.scrollIntoView({ behavior: "smooth", block: "start" });
      quoteForm.elements.name?.focus({ preventScroll: true });
    }
    return true;
  }

  function restoreQuoteDraft() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(quoteDraftKey) || "null");
      if (!saved || !applyQuoteDraft(saved)) return;
      sessionStorage.removeItem(quoteDraftKey);
    } catch (_) {
      sessionStorage.removeItem(quoteDraftKey);
    }
  }

  function reviewQuoteDetails() {
    const lead = getLeadDetails();
    const missing = [!lead.name && "name", !lead.email && "email", !lead.service && "service"].filter(Boolean);
    if (missing.length) {
      leadSummary.hidden = false;
      leadSummary.textContent = `Add ${missing.join(", ")} before reviewing the quote details.`;
      confirmLeadButton.hidden = true;
      state.pendingQuoteLead = null;
      return;
    }
    state.pendingQuoteLead = lead;
    const lines = [lead.name, lead.email, lead.phone, lead.propertyLocation, quoteServiceValue(lead.service), lead.details].filter(Boolean);
    leadSummary.hidden = false;
    leadSummary.textContent = `Please confirm: ${lines.join(" · ")}. Nothing has been submitted.`;
    confirmLeadButton.hidden = false;
  }

  function confirmQuoteDetails() {
    if (!state.pendingQuoteLead) return;
    const lead = { ...state.pendingQuoteLead };
    state.pendingQuoteLead = null;
    confirmLeadButton.hidden = true;
    leadSummary.hidden = false;
    leadSummary.textContent = "Confirmed. Review the website quote form and submit it when you are ready.";
    if (applyQuoteDraft(lead, { focus: true })) return;
    try { sessionStorage.setItem(quoteDraftKey, JSON.stringify(lead)); } catch (_) { /* The visitor can still use the quote form manually. */ }
    window.location.href = "index.html#quote";
  }

  function nextLeadPrompt(lead) {
    if (!lead.propertyType) return "What type of property is it: a home, apartment community, HOA, condominium, or another property type?";
    if (!lead.propertyLocation) return "What city or general area is the property in?";
    if (!lead.service) return "What service are you looking for: mowing, cleanup, landscape maintenance, pressure washing, apartment turnover support, property management care, or something else listed on the site?";
    if (!lead.phone && !lead.email) return "What is the best phone number or email for Urban Yards to follow up?";
    return "";
  }

  async function requestAssistantReply(message) {
    const payload = {
      message: message.slice(0, maxMessageLength),
      page: document.title,
      lead: getLeadDetails(),
      history: state.messages.slice(-10)
    };
    try {
      const response = await fetch("/.netlify/functions/groundskeeper-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000)
      });
      const result = await response.json().catch(() => ({}));
      if (response.ok && result?.reply) return result.reply;
      return result?.error || unavailableReply;
    } catch (error) {
      return unavailableReply;
    }
  }

  async function submitMessage() {
    const message = input.value.trim();
    if (!message || state.busy) return;
    const now = Date.now();
    if (now - state.lastRequestAt < requestCooldownMs) {
      state.messages.push({ role: "assistant", content: "Please wait a moment before sending another message." });
      renderMessages();
      return;
    }
    if (message.length > maxMessageLength) {
      state.messages.push({ role: "assistant", content: `Please keep messages under ${maxMessageLength} characters.` });
      renderMessages();
      return;
    }
    state.busy = true;
    state.lastRequestAt = now;
    input.value = "";
    rememberLeadDetails(message);
    state.messages.push({ role: "user", content: message });
    leadForm.hidden = !shouldShowLeadCapture(message);
    saveMessages();
    renderMessages();
    setTyping(true);

    const reply = await requestAssistantReply(message);
    setTyping(false);
    state.messages.push({ role: "assistant", content: reply });
    state.busy = false;
    saveMessages();
    renderMessages();
  }

  toggle.addEventListener("click", () => setOpen(!state.open));
  closeButton.addEventListener("click", () => setOpen(false));
  document.addEventListener("pointerdown", (event) => {
    if (!state.open || assistant.contains(event.target)) return;
    setOpen(false, { focus: false });
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitMessage();
  });
  leadForm.addEventListener("submit", (event) => event.preventDefault());
  reviewLeadButton.addEventListener("click", reviewQuoteDetails);
  confirmLeadButton.addEventListener("click", confirmQuoteDetails);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitMessage();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.open) setOpen(false);
  });

  renderQuickActions();
  renderMessages();
  restoreQuoteDraft();
})();
