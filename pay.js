(function () {
  "use strict";

  const form = document.querySelector("[data-pay-form]");
  const status = document.querySelector("[data-pay-status]");
  const results = document.querySelector("[data-pay-results]");

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function setStatus(message, tone) {
    if (!status) return;
    status.textContent = message || "";
    status.dataset.tone = tone || "";
  }

  function renderEmpty() {
    results.innerHTML = `
      <div class="pay-empty">
        <p>We couldn't find a matching open invoice. Please check your email/invoice number or request help.</p>
        <a class="text-link" href="mailto:team@urbanyards.us?subject=Invoice%20Help">Request Invoice Help <span aria-hidden="true">&rarr;</span></a>
      </div>
    `;
  }

  function renderInvoices(invoices) {
    if (!invoices.length) {
      renderEmpty();
      return;
    }

    results.innerHTML = invoices.map((invoice) => `
      <article class="pay-result-card">
        <div>
          <p class="eyebrow">Open Invoice</p>
          <h3>${escapeHtml(invoice.invoiceNumber || "Invoice")}</h3>
          <p>Due date: ${escapeHtml(invoice.dueDate || "Not listed")}</p>
          <p>Status: ${escapeHtml(invoice.status || "Open")}</p>
        </div>
        <div class="pay-result-action">
          <strong>${escapeHtml(invoice.amountDue || "Amount due")}</strong>
          <a class="button" href="${escapeHtml(invoice.paymentUrl)}" target="_blank" rel="noopener noreferrer">Pay Securely Through Square</a>
        </div>
      </article>
    `).join("");
  }

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const email = String(formData.get("email") || "").trim();
      const invoiceNumber = String(formData.get("invoiceNumber") || "").trim();

      results.innerHTML = "";
      if (!email) {
        setStatus("Please enter the email address connected to your invoice.", "error");
        return;
      }

      try {
        setStatus("Looking for open invoices...");
        const response = await fetch("/api/find-square-invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, invoiceNumber })
        });
        const data = await response.json();

        if (!response.ok) throw new Error(data.error || "Invoice lookup is unavailable.");

        setStatus("");
        renderInvoices(Array.isArray(data.invoices) ? data.invoices : []);
      } catch (error) {
        setStatus(error.message || "Invoice lookup is unavailable.", "error");
        renderEmpty();
      }
    });
  }
})();
