(() => {
  const storageKey = "urbanYardsAssistantConversation";
  const maxStoredMessages = 18;
  const leadSignals = ["quote", "estimate", "price", "cost", "hire", "schedule", "book", "service", "cleanup", "mowing", "mulch", "trim", "porter", "address", "property"];
  const siteContact = "Phone: (971) 258-1109. Email: team@urbanyards.us.";
  const quotePrompt = "The best next step is to request a free quote through the website form with your property address or general area, service needed, timeline, details, and photos if useful.";
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
    return leadSignals.some((signal) => normalized.includes(signal));
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
    if (text.includes("owner") || text.includes("who owns") || text.includes("owned by") || text.includes("owner operated")) {
      return `Yes. Urban Yards is owner-operated by Tyler Gage. The About page describes the business as practical, eco-conscious, reliable, and focused on healthier, more welcoming outdoor spaces.\n\n${quotePrompt}`;
    }
    if (text.includes("quote") || text.includes("estimate") || text.includes("price") || text.includes("cost")) {
      return `You can request a free quote through the website form. It asks for your name, email, phone, property address or general area, service needed, optional photos, and additional details.\n\nFinal pricing and scheduling require review of the property and project details. ${siteContact}`;
    }
    if (text.includes("area") || text.includes("serve") || text.includes("where") || text.includes("location")) {
      return `The site lists Beaverton, Portland, Vancouver, North Portland, and nearby communities as the core service area. If you are near those areas, Urban Yards can confirm through a quote request.\n\n${siteContact}`;
    }
    if (text.includes("apartment") || text.includes("hoa") || text.includes("condo") || text.includes("multifamily") || text.includes("property manager") || text.includes("porter")) {
      return `Yes. The site lists property management services for apartment communities, condominium associations, HOAs, property management companies, and multifamily properties.\n\nRelevant services include common area upkeep, trash and recycling enclosure care, day porter services, pressure washing, seasonal cleanup, recurring groundskeeping, and property appearance audits. ${quotePrompt}`;
    }
    if (text.includes("pressure wash") || text.includes("pressure washing") || text.includes("wash")) {
      return `Yes. Pressure Washing is listed in the footer services and on the Property Management Services page. ${quotePrompt}`;
    }
    if (text.includes("lawn") || text.includes("mow") || text.includes("mowing") || text.includes("edge")) {
      return `Yes. Urban Yards lists lawn mowing, edging, weed management, garden bed maintenance, seasonal cleanup, and routine groundskeeping for homeowners and other property types.\n\n${quotePrompt}`;
    }
    if (text.includes("mulch") || text.includes("bed") || text.includes("plant") || text.includes("native") || text.includes("pollinator") || text.includes("low-water") || text.includes("ecological")) {
      return `Yes. The site lists landscape improvements such as plant installations, mulch refreshes, privacy screens, and ecological enhancements like native plantings, pollinator habitat, low-water landscapes, and urban greening.\n\n${quotePrompt}`;
    }
    if (text.includes("season") || text.includes("spring") || text.includes("fall") || text.includes("winter") || text.includes("summer")) {
      return `The Services page includes a Portland Property Care Calendar for seasonal planning. The site points visitors toward routine care, seasonal cleanup, bed refreshes, mowing, edging, irrigation checks, leaf cleanup, storm cleanup, and similar property care depending on the season.\n\n${quotePrompt}`;
    }
    if (text.includes("phone") || text.includes("email") || text.includes("contact")) {
      return `You can contact Urban Yards through the quote form, by phone, or by email. ${siteContact}`;
    }
    return `I don't see that listed on the site, but you can request a quote and Urban Yards can confirm. ${siteContact}`;
  }

  async function submitMessage() {
    const message = input.value.trim();
    if (!message || state.busy) return;
    state.busy = true;
    input.value = "";
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

  renderMessages();
})();
