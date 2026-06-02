const menuToggle = document.querySelector(".menu-toggle");
const primaryNav = document.querySelector(".primary-nav");
const form = document.querySelector("#quote-form");
const success = document.querySelector("#form-success");
const comparison = document.querySelector("[data-comparison]");
const comparisonAfter = document.querySelector("[data-comparison-after]");
const comparisonHandle = document.querySelector("[data-comparison-handle]");
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
const revealTargets = document.querySelectorAll(".section-heading, .service-card, .project-copy, .comparison, .trust-card, .quote-copy, .quote-form, .lower-card");
revealTargets.forEach((target) => target.classList.add("reveal"));

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("is-visible");
    revealObserver.unobserve(entry.target);
  });
}, { threshold: 0.12 });

revealTargets.forEach((target) => revealObserver.observe(target));

// Keep the before-and-after comparison usable with pointer and keyboard input.
let comparisonValue = 50;

const updateComparison = (value) => {
  comparisonValue = Math.max(4, Math.min(96, value));
  comparisonAfter.style.width = `${100 - comparisonValue}%`;
  comparisonHandle.style.left = `${comparisonValue}%`;
  comparisonHandle.setAttribute("aria-valuenow", String(Math.round(comparisonValue)));
};

const setComparisonFromPointer = (event) => {
  const bounds = comparison.getBoundingClientRect();
  updateComparison(((event.clientX - bounds.left) / bounds.width) * 100);
};

comparisonHandle.setAttribute("role", "slider");
comparisonHandle.setAttribute("aria-valuemin", "4");
comparisonHandle.setAttribute("aria-valuemax", "96");
comparisonHandle.setAttribute("aria-valuenow", "50");

comparison.addEventListener("pointerdown", (event) => {
  comparison.setPointerCapture(event.pointerId);
  setComparisonFromPointer(event);
});

comparison.addEventListener("pointermove", (event) => {
  if (!comparison.hasPointerCapture(event.pointerId)) return;
  setComparisonFromPointer(event);
});

comparisonHandle.addEventListener("keydown", (event) => {
  if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
  event.preventDefault();
  updateComparison(comparisonValue + (event.key === "ArrowRight" ? 4 : -4));
});

// Hide the mobile shortcut while the quote form is already visible.
const quoteObserver = new IntersectionObserver(([entry]) => {
  mobileQuoteBar.classList.toggle("is-hidden", entry.isIntersecting);
}, { threshold: 0.08 });

quoteObserver.observe(document.querySelector("#quote"));
