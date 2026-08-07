(() => {
  const storageKey = "urbanYardsGroundskeeperConversation.v1";
  const maxStoredMessages = 18;
  const maxMessageLength = 1400;
  const requestCooldownMs = 2500;
  const unavailableReply = "I can’t answer that from Urban Yards’ public materials right now. You can contact Urban Yards directly or request a free quote.";
  const quickActions = ["Request a Free Quote", "Homeowner Services", "Property Management Services", "Service Areas", "Contact Urban Yards"];
  const defaultMessages = [{
    role: "assistant",
    content: "I’m The Groundskeeper, Urban Yards’ website guide. I can help you learn about our services, service areas, and how to request a quote."
  }];

  const state = { open: false, busy: false, messages: loadMessages(), lastRequestAt: 0 };

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

  async function requestAssistantReply(message) {
    const payload = {
      message: message.slice(0, maxMessageLength),
      page: document.title,
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
    state.messages.push({ role: "user", content: message });
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
