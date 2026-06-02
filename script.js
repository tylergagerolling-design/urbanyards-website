const menuToggle = document.querySelector(".menu-toggle");
const primaryNav = document.querySelector(".primary-nav");
const header = document.querySelector(".site-header");
const form = document.querySelector("#quote-form");
const success = document.querySelector("#form-success");
const submitButton = document.querySelector(".submit-button");
const mobileQuoteBar = document.querySelector(".mobile-quote-bar");
const hero = document.querySelector("#home");
const heroPlaceholder = document.querySelector(".placeholder-hero");
const navLinks = [...primaryNav.querySelectorAll('a[href^="#"]:not(.button)')];
const sectionLinks = navLinks
  .map((link) => ({ link, section: document.querySelector(link.getAttribute("href")) }))
  .filter(({ section }) => section);
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let quoteInView = false;

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
  submitButton.classList.add("is-success");
  submitButton.querySelector("span").textContent = "Request Received";
  success.focus();
  form.reset();

  window.setTimeout(() => {
    submitButton.classList.remove("is-success");
    submitButton.querySelector("span").textContent = "Request a Quote";
  }, 2600);
});

const revealTargets = document.querySelectorAll(".section-heading, .service-card, .trust-strip article, .quote-copy, .quote-form, .lower-card");
revealTargets.forEach((target) => target.classList.add("reveal"));

if (reduceMotion) {
  revealTargets.forEach((target) => target.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12 });
  revealTargets.forEach((target) => revealObserver.observe(target));
}

const navObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navLinks.forEach((link) => link.removeAttribute("aria-current"));
    const active = sectionLinks.find(({ section }) => section === entry.target);
    active?.link.setAttribute("aria-current", "page");
  });
}, { rootMargin: "-30% 0px -62% 0px" });
sectionLinks.forEach(({ section }) => navObserver.observe(section));

const quoteObserver = new IntersectionObserver(([entry]) => {
  quoteInView = entry.isIntersecting;
  mobileQuoteBar.classList.toggle("is-hidden", quoteInView || window.scrollY < hero.offsetHeight * 0.6);
}, { threshold: 0.08 });
quoteObserver.observe(document.querySelector("#quote"));

const updateScrollEffects = () => {
  header.classList.toggle("is-compact", window.scrollY > 56);
  mobileQuoteBar.classList.toggle("is-hidden", quoteInView || window.scrollY < hero.offsetHeight * 0.6);
  if (!reduceMotion) {
    const hillShift = Math.min(window.scrollY * 0.045, 22);
    document.documentElement.style.setProperty("--hill-shift", `${hillShift}px`);
    document.documentElement.style.setProperty("--hill-shift-back", `${hillShift * -0.7}px`);
    document.documentElement.style.setProperty("--hill-shift-front", `${hillShift * 0.45}px`);
  }
};
window.addEventListener("scroll", updateScrollEffects, { passive: true });
updateScrollEffects();

if (!reduceMotion && window.matchMedia("(pointer: fine)").matches) {
  heroPlaceholder.addEventListener("pointermove", (event) => {
    const rect = heroPlaceholder.getBoundingClientRect();
    heroPlaceholder.style.setProperty("--glow-x", `${event.clientX - rect.left - 85}px`);
    heroPlaceholder.style.setProperty("--glow-y", `${event.clientY - rect.top - 85}px`);
  });
}

document.querySelector("#copyright-year").textContent = new Date().getFullYear();
