(() => {
  const storageKey = "urbanYardsAssistantConversation";
  const maxStoredMessages = 18;
  const leadSignals = ["quote", "estimate", "price", "cost", "hire", "schedule", "book", "service", "cleanup", "mowing", "mulch", "trim", "porter", "address", "property"];
  const quickActions = ["Request a Free Quote", "Homeowner Services", "Property Management Services", "Service Areas", "Contact Urban Yards"];
  const siteContact = "Phone: (971) 258-1109. Email: team@urbanyards.us.";
  const quotePrompt = "The best next step is to request a free quote through the website form with your property address or general area, service needed, timeline, details, and photos if useful.";
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
    content: "Hi, I am The Groundskeeper. I can help with service questions, seasonal property care, and preparing details for Urban Yards to review."
  }];

  const state = { open: false, busy: false, messages: loadMessages() };

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
      <button class="uy-assistant-toggle" type="button" aria-expanded="false" aria-controls="uy-assistant-panel">
        <span class="uy-assistant-toggle-icon" aria-hidden="true"></span>
        <span class="sr-only">Open The Groundskeeper assistant</span>
      </button>
      <div class="uy-assistant-panel" id="uy-assistant-panel" role="dialog" aria-modal="false" aria-labelledby="uy-assistant-title" hidden>
        <header class="uy-assistant-header">
          <div>
            <h2 id="uy-assistant-title">The Groundskeeper</h2>
          </div>
          <button class="uy-assistant-close" type="button" aria-label="Close assistant">Close</button>
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
          </div>
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
      service: String(data.get("service") || "").trim()
    };
  }

  function nextLeadPrompt(lead) {
    if (!lead.propertyType) return "What type of property is it: a home, apartment community, HOA, condominium, or another property type?";
    if (!lead.propertyLocation) return "What city or general area is the property in?";
    if (!lead.service) return "What service are you looking for: mowing, cleanup, landscape maintenance, pressure washing, property support, or something else listed on the site?";
    if (!lead.phone && !lead.email) return "What is the best phone number or email for Urban Yards to follow up?";
    return "";
  }

  async function requestAssistantReply(message) {
    const payload = {
      message,
      page: document.title,
      lead: getLeadDetails(),
      history: state.messages.slice(-10)
    };
    const endpoints = ["/api/assistant"];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(15000)
        });
        if (!response.ok) continue;
        const result = await response.json();
        if (result?.reply) return result.reply;
      } catch (error) {
        continue;
      }
    }

    return fallbackReply(message);
  }

  function fallbackReply(message) {
    const text = message.toLowerCase();
    const intent = detectIntent(message);
    const lead = getLeadDetails();
    const leadPrompt = shouldShowLeadCapture(message) ? nextLeadPrompt(lead) : "";
    const leadFollowUp = leadPrompt ? `\n\n${leadPrompt}` : "";
    if (intent.id === "casual") {
      return "Hi, I can help with Urban Yards services, service areas, property care questions, or getting ready for a quote. What are you looking at on your property?";
    }
    if (intent.id === "cleanup") {
      return "Sounds like it may be time for a cleanup. Urban Yards lists seasonal cleanup, weed management, property upkeep, and garden bed maintenance.\n\nIs it mostly overgrown grass, weeds, shrubs, or a little bit of everything?";
    }
    if (intent.id === "trimming") {
      return "Urban Yards lists shrub trimming and landscape refreshes for outdoor spaces that need steady care.\n\nAre the shrubs simply overgrown, or are you looking for more shaping and cleanup around the beds too?";
    }
    if (intent.id === "property_improvement") {
      return "I can help with that. Urban Yards lists landscape improvements like planting, mulch refreshes, better beds, privacy screens, and curb appeal updates.\n\nWhat kind of property is it, and what are you hoping to improve?";
    }
    if (text.includes("owner") || text.includes("who owns") || text.includes("owned by") || text.includes("owner operated")) {
      return `Yes. Urban Yards is owner-operated by Tyler Gage. The About page describes the business as practical, eco-conscious, reliable, and focused on healthier, more welcoming outdoor spaces.\n\n${quotePrompt}`;
    }
    if (intent.id === "quote") {
      const propertyNote = lead.propertyType ? ` for the ${lead.propertyType.toLowerCase()}` : "";
      return `You can request a free quote${propertyNote} through the website form. It asks for your name, email, phone, property address or general area, service needed, optional photos, and additional details. Final pricing and scheduling require property review.${leadFollowUp || `\n\n${siteContact}`}`;
    }
    if (intent.id === "service_area") {
      return `The site lists Beaverton, Portland, and Vancouver as the core service area. If you are near those areas, Urban Yards can confirm through a quote request.\n\n${siteContact}`;
    }
    if (intent.id === "property_management") {
      return `Urban Yards works with apartment communities, condominium associations, HOAs, property management companies, and multifamily properties. Services listed include common area upkeep, trash and recycling enclosure care, day porter services, pressure washing, seasonal cleanup, recurring groundskeeping, and property appearance audits.${leadFollowUp || "\n\nIs this an apartment community, HOA, condominium, or another type of property?"}`;
    }
    if (text.includes("pressure wash") || text.includes("pressure washing") || text.includes("wash")) {
      return `Yes. Pressure Washing is listed in the footer services and on the Property Management Services page. ${quotePrompt}`;
    }
    if (intent.id === "lawn_care") {
      return "Yes. Urban Yards lists lawn mowing, edging, weed management, garden bed maintenance, seasonal cleanup, and routine groundskeeping for homeowners and other property types.\n\nAre you looking for recurring maintenance or a one-time service?";
    }
    if (text.includes("mulch") || text.includes("bed") || text.includes("plant") || text.includes("native") || text.includes("pollinator") || text.includes("low-water") || text.includes("ecological")) {
      return `Yes. The site lists landscape improvements such as plant installations, mulch refreshes, privacy screens, and ecological enhancements like native plantings, pollinator habitat, low-water landscapes, and urban greening.\n\n${quotePrompt}`;
    }
    if (text.includes("season") || text.includes("spring") || text.includes("fall") || text.includes("winter") || text.includes("summer")) {
      return `The Services page includes a Portland Property Care Calendar for seasonal planning. The site points visitors toward routine care, seasonal cleanup, bed refreshes, mowing, edging, irrigation checks, leaf cleanup, storm cleanup, and similar property care depending on the season.\n\n${quotePrompt}`;
    }
    if (intent.id === "contact") {
      return `You can contact Urban Yards through the quote form, by phone, or by email. ${siteContact}`;
    }
    return `I don't see that listed on the site, but you can request a quote and Urban Yards can confirm. ${siteContact}${leadFollowUp}`;
  }

  async function submitMessage() {
    const message = input.value.trim();
    if (!message || state.busy) return;
    state.busy = true;
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
})();
