(() => {
  const storageKey = "urbanYardsAssistantConversation";
  const maxStoredMessages = 18;
  const quickPrompts = [
    "What services do you offer?",
    "Do you work with apartments?",
    "I need a quote",
    "What should I schedule this season?"
  ];
  const leadSignals = ["quote", "estimate", "price", "cost", "hire", "schedule", "book", "service", "cleanup", "mowing", "mulch", "trim", "porter"];
  const defaultMessages = [{
    role: "assistant",
    content: "Hi, I am the Urban Yards assistant. I can help with services, seasonal property care, and preparing details for the team to review."
  }];

  const state = { open: false, busy: false, messages: loadMessages() };

  function loadMessages() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (Array.isArray(saved) && saved.length) return saved.slice(-maxStoredMessages);
    } catch (error) {
      localStorage.removeItem(storageKey);
    }
    return [...defaultMessages];
  }

  function saveMessages() {
    localStorage.setItem(storageKey, JSON.stringify(state.messages.slice(-maxStoredMessages)));
  }

  function createAssistant() {
    const root = document.createElement("section");
    root.className = "uy-assistant";
    root.setAttribute("aria-label", "Urban Yards website assistant");
    root.innerHTML = `
      <button class="uy-assistant-toggle" type="button" aria-expanded="false" aria-controls="uy-assistant-panel">
        <span class="uy-assistant-toggle-icon" aria-hidden="true"></span>
        <span class="sr-only">Open Urban Yards assistant</span>
      </button>
      <div class="uy-assistant-panel" id="uy-assistant-panel" role="dialog" aria-modal="false" aria-labelledby="uy-assistant-title" hidden>
        <header class="uy-assistant-header">
          <div>
            <p class="eyebrow">First Impressions Start Here</p>
            <h2 id="uy-assistant-title">Urban Yards Assistant</h2>
          </div>
          <button class="uy-assistant-close" type="button" aria-label="Close assistant">Close</button>
        </header>
        <div class="uy-assistant-messages" role="log" aria-live="polite" aria-relevant="additions"></div>
        <div class="uy-assistant-prompts" aria-label="Suggested questions"></div>
        <form class="uy-assistant-lead" hidden>
          <p class="eyebrow">Optional Lead Details</p>
          <div class="uy-assistant-lead-grid">
            <label>Name<input name="name" autocomplete="name" placeholder="Name"></label>
            <label>Email<input name="email" type="email" autocomplete="email" placeholder="Email"></label>
            <label>Property Type<input name="propertyType" placeholder="House, apartment, commercial..."></label>
            <label>Service<input name="service" placeholder="Cleanup, mowing, mulch..."></label>
          </div>
        </form>
        <form class="uy-assistant-form">
          <label class="sr-only" for="uy-assistant-input">Ask Urban Yards a question</label>
          <textarea id="uy-assistant-input" rows="2" placeholder="Ask about services, timing, or quote details..."></textarea>
          <button class="button button-small" type="submit">Send</button>
        </form>
        <p class="uy-assistant-note">Final pricing and scheduling require review of the property and project details.</p>
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
  const prompts = assistant.querySelector(".uy-assistant-prompts");
  const form = assistant.querySelector(".uy-assistant-form");
  const input = assistant.querySelector("#uy-assistant-input");
  const leadForm = assistant.querySelector(".uy-assistant-lead");

  quickPrompts.forEach((prompt) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = prompt;
    button.addEventListener("click", () => {
      input.value = prompt;
      submitMessage();
    });
    prompts.appendChild(button);
  });

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
      propertyType: String(data.get("propertyType") || "").trim(),
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
    const endpoints = ["/api/assistant", "/.netlify/functions/assistant"];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
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
    if (text.includes("owner") || text.includes("who owns") || text.includes("owned by")) {
      return "Tyler Gage.";
    }
    if (text.includes("quote") || text.includes("estimate") || text.includes("price") || text.includes("cost")) {
      return "I can help prepare quote details. Please include property type, general location, service needed, approximate size, desired timeline, and photos if available. Final pricing and scheduling require Urban Yards to review the property and project details through the website contact form.";
    }
    if (text.includes("apartment") || text.includes("hoa") || text.includes("commercial") || text.includes("porter")) {
      return "Urban Yards works with multifamily, apartment communities, HOAs, and commercial properties. Common fits include routine groundskeeping, day porter style cleanup, trash and recycling enclosure cleanup, seasonal cleanup, and landscape bed maintenance.";
    }
    if (text.includes("mulch") || text.includes("bed")) {
      return "For Portland-area properties, mulch and bed refreshes are often useful in spring or early fall. They help beds look clean, reduce weeds, and protect soil moisture. Urban Yards can review the site before confirming scope or timing.";
    }
    if (text.includes("lawn") || text.includes("mow") || text.includes("edge")) {
      return "Urban Yards offers lawn mowing, edging, weed trimming, and routine groundskeeping. In active growing season, consistent service usually keeps curb appeal stronger than catch-up visits.";
    }
    if (text.includes("shrub") || text.includes("tree") || text.includes("prune") || text.includes("trim")) {
      return "Urban Yards can help with shrub trimming and small tree pruning. Timing depends on the plant and the goal, so final recommendations should be reviewed against the property details.";
    }
    if (text.includes("water") || text.includes("season") || text.includes("spring") || text.includes("fall") || text.includes("winter") || text.includes("summer")) {
      return "Seasonal care in the Portland Metro area usually centers on spring cleanup and bed refreshes, summer mowing and irrigation checks, fall leaf cleanup, and winter storm debris prep.";
    }
    if (text.includes("phone") || text.includes("email") || text.includes("contact")) {
      return "For direct contact, please use the website contact form so Urban Yards can review the details in one place.";
    }
    return "I specialize in Urban Yards services, landscaping, and property maintenance. Urban Yards helps with mowing, edging, weed trimming, seasonal cleanup, shrub trimming, mulch, property cleanup, apartment community maintenance, and day porter style groundskeeping.";
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
  window.setTimeout(() => {
    if (state.open) return;
    setOpen(true, { focus: false });
  }, 1600);
})();
