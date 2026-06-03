document.documentElement.classList.add("js");

const menuToggle = document.querySelector(".menu-toggle");
const primaryNav = document.querySelector(".primary-nav");
const header = document.querySelector(".site-header");
const form = document.querySelector("#quote-form");
const success = document.querySelector("#form-success");
const submitButton = document.querySelector(".submit-button");
const mobileQuoteBar = document.querySelector(".mobile-quote-bar");
const hero = document.querySelector("#home");
const heroPlaceholder = document.querySelector(".placeholder-hero");
const navIndicator = document.querySelector(".nav-indicator");
const serviceCards = [...document.querySelectorAll(".service-card")];
const serviceToggles = [...document.querySelectorAll(".service-toggle")];
const mapDialog = document.querySelector(".map-dialog");
const mapExpand = document.querySelector(".map-expand");
const mapClose = document.querySelector(".map-close");
const navLinks = [...primaryNav.querySelectorAll('a[href^="#"]:not(.button)')];
const sectionLinks = navLinks
  .map((link) => ({ link, section: document.querySelector(link.getAttribute("href")) }))
  .filter(({ section }) => section);
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let quoteInView = false;

const serviceAreaOutlines = [
  {
    name: "Beaverton",
    coords: [45.487, -122.803],
    color: "#617f52",
    fillColor: "#dce7d4",
    outline: [
      [45.541, -122.879],
      [45.536, -122.818],
      [45.523, -122.762],
      [45.494, -122.752],
      [45.462, -122.766],
      [45.444, -122.807],
      [45.451, -122.856],
      [45.479, -122.89],
      [45.514, -122.89],
    ],
  },
  {
    name: "Portland",
    coords: [45.5152, -122.6784],
    color: "#0f3f32",
    fillColor: "#cfdcc9",
    outline: [
      [45.653, -122.799],
      [45.635, -122.693],
      [45.647, -122.578],
      [45.604, -122.471],
      [45.533, -122.459],
      [45.474, -122.507],
      [45.432, -122.604],
      [45.447, -122.723],
      [45.501, -122.838],
      [45.586, -122.848],
      [45.632, -122.827],
    ],
  },
  {
    name: "Vancouver",
    coords: [45.638, -122.661],
    color: "#9b7220",
    fillColor: "#efe3ba",
    outline: [
      [45.737, -122.744],
      [45.731, -122.612],
      [45.695, -122.506],
      [45.634, -122.484],
      [45.59, -122.546],
      [45.584, -122.661],
      [45.618, -122.746],
      [45.677, -122.765],
    ],
  },
];

const buildServiceMap = (elementId, expanded = false) => {
  const map = L.map(elementId, {
    attributionControl: true,
    dragging: true,
    scrollWheelZoom: expanded,
    tap: true,
    zoomControl: true,
  });
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);
  const outlineLayers = serviceAreaOutlines.map(({ outline, color, fillColor }) => (
    L.polygon(outline, {
      color,
      fillColor,
      fillOpacity: 0.32,
      lineJoin: "round",
      opacity: 0.9,
      smoothFactor: 1.8,
      weight: expanded ? 3.5 : 2.25,
    }).addTo(map)
  ));
  const outlineGroup = L.featureGroup(outlineLayers);
  map.serviceBounds = outlineGroup.getBounds();
  map.fitBounds(map.serviceBounds, { padding: expanded ? [28, 28] : [12, 12] });
  return map;
};

const compactServiceMap = buildServiceMap("service-area-map");
const expandedServiceMap = buildServiceMap("expanded-service-area-map", true);

const positionNavIndicator = (link) => {
  if (!link || window.innerWidth <= 760) return;
  primaryNav.style.setProperty("--nav-indicator-x", `${link.offsetLeft}px`);
  primaryNav.style.setProperty("--nav-indicator-width", `${link.offsetWidth}px`);
  primaryNav.style.setProperty("--nav-indicator-opacity", "1");
};

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
revealTargets.forEach((target, index) => {
  target.classList.add("reveal");
  target.style.setProperty("--reveal-delay", `${Math.min(index % 4, 3) * 65}ms`);
});

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
    positionNavIndicator(active?.link);
  });
}, { rootMargin: "-30% 0px -62% 0px" });
sectionLinks.forEach(({ section }) => navObserver.observe(section));
navLinks[0].setAttribute("aria-current", "page");
positionNavIndicator(navLinks[0]);

const quoteObserver = new IntersectionObserver(([entry]) => {
  quoteInView = entry.isIntersecting;
  mobileQuoteBar.classList.toggle("is-hidden", quoteInView || window.scrollY < hero.offsetHeight * 0.6);
}, { threshold: 0.08 });
quoteObserver.observe(document.querySelector("#quote"));

const updateScrollEffects = () => {
  header.classList.toggle("is-compact", window.scrollY > 56);
  mobileQuoteBar.classList.toggle("is-hidden", quoteInView || window.scrollY < hero.offsetHeight * 0.6);
  const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
  const scrollProgress = scrollableHeight > 0 ? (window.scrollY / scrollableHeight) * 100 : 0;
  document.documentElement.style.setProperty("--scroll-progress", `${Math.min(scrollProgress, 100)}%`);
};
window.addEventListener("scroll", updateScrollEffects, { passive: true });
window.addEventListener("resize", () => {
  positionNavIndicator(navLinks.find((link) => link.hasAttribute("aria-current")));
  syncServiceAccordions();
});
updateScrollEffects();

if (!reduceMotion && window.matchMedia("(pointer: fine)").matches) {
  heroPlaceholder.addEventListener("pointermove", (event) => {
    const rect = heroPlaceholder.getBoundingClientRect();
    heroPlaceholder.style.setProperty("--glow-x", `${event.clientX - rect.left - 85}px`);
    heroPlaceholder.style.setProperty("--glow-y", `${event.clientY - rect.top - 85}px`);
  });
}

if (!reduceMotion && window.matchMedia("(pointer: fine)").matches) {
  serviceCards.forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 5;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * -5;
      card.style.setProperty("--tilt-x", `${y}deg`);
      card.style.setProperty("--tilt-y", `${x}deg`);
    });
    card.addEventListener("pointerleave", () => {
      card.style.removeProperty("--tilt-x");
      card.style.removeProperty("--tilt-y");
    });
  });
}

const syncServiceAccordions = () => {
  const compact = window.innerWidth <= 520;
  serviceToggles.forEach((toggle, index) => {
    const list = document.querySelector(`#${toggle.getAttribute("aria-controls")}`);
    const open = !compact || index === 0;
    toggle.setAttribute("aria-expanded", String(open));
    list.classList.toggle("is-open", open);
  });
};

serviceToggles.forEach((toggle) => {
  toggle.addEventListener("click", () => {
    if (window.innerWidth > 520) return;
    const list = document.querySelector(`#${toggle.getAttribute("aria-controls")}`);
    const open = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!open));
    list.classList.toggle("is-open", !open);
  });
});
syncServiceAccordions();

mapExpand.addEventListener("click", () => {
  mapDialog.showModal();
  window.setTimeout(() => {
    expandedServiceMap.invalidateSize();
    expandedServiceMap.fitBounds(expandedServiceMap.serviceBounds, { padding: [28, 28] });
  }, 0);
});
mapClose.addEventListener("click", () => mapDialog.close());
mapDialog.addEventListener("click", (event) => {
  if (event.target === mapDialog) mapDialog.close();
});

document.querySelector("#copyright-year").textContent = new Date().getFullYear();
