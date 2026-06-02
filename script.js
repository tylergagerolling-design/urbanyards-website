const menuToggle = document.querySelector(".menu-toggle");
const primaryNav = document.querySelector(".primary-nav");
const form = document.querySelector("#quote-form");
const success = document.querySelector("#form-success");
const mobileQuoteBar = document.querySelector(".mobile-quote-bar");

menuToggle.addEventListener("click", () => {
  const open = primaryNav.classList.toggle("is-open");
  menuToggle.setAttribute("aria-expanded", String(open));
});

primaryNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    primaryNav.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
  });
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  success.classList.add("is-visible");
  success.focus();
  form.reset();
});

// Reveal major sections and cards as they enter the viewport.
const revealTargets = document.querySelectorAll(".section-heading, .service-card, .trust-card, .quote-copy, .quote-form, .lower-card");
revealTargets.forEach((target) => target.classList.add("reveal"));

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("is-visible");
    revealObserver.unobserve(entry.target);
  });
}, { threshold: 0.12 });

revealTargets.forEach((target) => revealObserver.observe(target));

// Hide the mobile shortcut while the quote form is already visible.
const quoteObserver = new IntersectionObserver(([entry]) => {
  mobileQuoteBar.classList.toggle("is-hidden", entry.isIntersecting);
}, { threshold: 0.08 });

quoteObserver.observe(document.querySelector("#quote"));
