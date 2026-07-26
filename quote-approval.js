(() => {
  "use strict";

  const stateEl = document.querySelector("[data-quote-state]");
  const reviewEl = document.querySelector("[data-quote-review]");
  const token = new URLSearchParams(window.location.search).get("token") || "";

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[character]);
  }

  function money(value) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0));
  }

  function formatDate(value) {
    if (!value) return "Not set";
    const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  }

  async function request(action, payload = {}) {
    const response = await fetch("/api/client-quote-approval", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, token, ...payload })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "This quote could not be loaded.");
    return body;
  }

  function showState(title, detail, tone = "") {
    stateEl.hidden = false;
    reviewEl.hidden = true;
    stateEl.className = `quote-state ${tone ? `is-${tone}` : ""}`;
    stateEl.innerHTML = `<h1>${escapeHtml(title)}</h1><p>${escapeHtml(detail)}</p>${tone === "error" ? '<a href="mailto:team@urbanyards.us">Contact Urban Yards</a>' : ""}`;
  }

  function renderQuote(payload) {
    const quote = payload.quote;
    const items = quote.lineItems?.length ? quote.lineItems : [{ description: "Landscape service", quantity: 1, unit_price: quote.total, amount: quote.total }];
    stateEl.hidden = true;
    reviewEl.hidden = false;
    reviewEl.innerHTML = `
      <header class="quote-title">
        <div><p>Estimate / Quote</p><h1>${escapeHtml(quote.number)}</h1><span>Prepared for ${escapeHtml(quote.clientName)}</span></div>
        <strong>${money(quote.total)}</strong>
      </header>
      <section class="quote-meta">
        <div><span>Issued</span><strong>${escapeHtml(formatDate(quote.issueDate))}</strong></div>
        <div><span>Approval due</span><strong>${escapeHtml(formatDate(quote.dueDate))}</strong></div>
        <div><span>Secure link expires</span><strong>${escapeHtml(formatDate(payload.expiresAt))}</strong></div>
      </section>
      <section class="quote-scope">
        <h2>Scope and pricing</h2>
        <div class="quote-table" role="table" aria-label="Quote line items">
          ${items.map((item) => `<div class="quote-line" role="row"><div><strong>${escapeHtml(item.description || "Landscape service")}</strong><span>${escapeHtml(item.quantity || 1)} × ${money(item.unit_price)}</span></div><b>${money(item.amount)}</b></div>`).join("")}
        </div>
        <div class="quote-totals">
          <p><span>Subtotal</span><strong>${money(quote.subtotal)}</strong></p>
          ${quote.tax ? `<p><span>Tax</span><strong>${money(quote.tax)}</strong></p>` : ""}
          <p class="is-total"><span>Total</span><strong>${money(quote.total)}</strong></p>
        </div>
      </section>
      ${quote.notes ? `<section class="quote-terms"><h2>Message and terms</h2><p>${escapeHtml(quote.notes).replace(/\n/g, "<br>")}</p></section>` : ""}
      <section class="quote-decision">
        <div><p>Customer response</p><h2>Approve this quote or request a change</h2><span>Your response is time-stamped and connected to the Urban Yards job ticket.</span></div>
        <form data-quote-decision>
          <label>Your name<input name="customer_name" autocomplete="name" required></label>
          <label>Questions or requested changes<textarea name="notes" rows="4" placeholder="Optional for approval; required when requesting a change."></textarea></label>
          <div class="quote-actions">
            <button type="submit" name="decision" value="approved">Approve Quote</button>
            <button type="submit" class="secondary" name="decision" value="changes_requested">Request Changes</button>
          </div>
        </form>
      </section>
      <footer><strong>Urban Yards</strong><span>Questions? Email <a href="mailto:team@urbanyards.us">team@urbanyards.us</a>.</span></footer>`;
  }

  reviewEl.addEventListener("submit", async (event) => {
    const form = event.target.closest("[data-quote-decision]");
    if (!form) return;
    event.preventDefault();
    const submitter = event.submitter;
    const decision = submitter?.value || "";
    const data = new FormData(form);
    const notes = String(data.get("notes") || "").trim();
    if (decision === "changes_requested" && !notes) {
      form.querySelector("[name='notes']").setCustomValidity("Tell Urban Yards what should change.");
      form.querySelector("[name='notes']").reportValidity();
      return;
    }
    form.querySelector("[name='notes']").setCustomValidity("");
    form.querySelectorAll("button").forEach((button) => { button.disabled = true; });
    try {
      const response = await request("decide", {
        decision,
        customerName: data.get("customer_name"),
        notes
      });
      showState(decision === "approved" ? "Quote approved" : "Changes requested", response.message, "success");
    } catch (error) {
      form.querySelectorAll("button").forEach((button) => { button.disabled = false; });
      showState("Response not recorded", error.message, "error");
    }
  });

  if (!token) {
    showState("Approval link missing", "Open the complete private link sent by Urban Yards.", "error");
    return;
  }
  request("view").then(renderQuote).catch((error) => showState("Quote unavailable", error.message, "error"));
})();
