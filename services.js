document.documentElement.classList.add("js");

const menuToggle = document.querySelector(".menu-toggle");
const primaryNav = document.querySelector(".primary-nav");
const header = document.querySelector(".site-header");
const activeNavLink = primaryNav.querySelector('[aria-current="page"]');
const propertyButtons = [...document.querySelectorAll(".service-explorer-button")];
const goalButtons = [...document.querySelectorAll(".service-goal-button")];

let selectedProperty = "residential";
let selectedGoal = "routine";

const serviceRecommendations = {
  residential: {
    routine: {
      label: "Residential Routine Care",
      title: "Weekly curb appeal plan",
      copy: "Mowing, edging, weed control, and seasonal touch-ups keep the property looking cared for without overbuilding the scope.",
      items: ["Mowing and edging", "Weed control", "Seasonal touch-ups", "Bed cleanup"],
      href: "#groundskeeping",
      quote: "Groundskeeping"
    },
    cleanup: {
      label: "Residential Cleanup",
      title: "Seasonal reset",
      copy: "A good fit when the yard needs a practical reset before spring growth, summer use, or fall weather.",
      items: ["Leaf and debris removal", "Bed cleanup", "Light pruning", "Mulch planning"],
      href: "#groundskeeping",
      quote: "One-Time Cleanup"
    },
    improvement: {
      label: "Residential Improvement",
      title: "Curb appeal refresh",
      copy: "Targeted upgrades for beds, entries, and privacy edges that make the property feel more finished.",
      items: ["Plant installation", "Mulch refresh", "Privacy screening", "Irrigation checks"],
      href: "#landscape-improvements",
      quote: "Landscape Improvements"
    },
    ecological: {
      label: "Residential Ecological",
      title: "Lower-water planting path",
      copy: "Native and pollinator-friendly plantings can make smaller landscapes feel intentional and resilient.",
      items: ["Native plants", "Pollinator habitat", "Low-water beds", "Soil improvement"],
      href: "#ecological-enhancements",
      quote: "Ecological Enhancements"
    }
  },
  apartments: {
    routine: {
      label: "Apartment Routine Care",
      title: "Resident-facing maintenance",
      copy: "A steady plan for common areas, entry edges, and shared spaces residents notice every day.",
      items: ["Mowing and edging", "Common area cleanup", "Weed suppression", "Entryway touch-ups"],
      href: "#groundskeeping",
      quote: "Monthly Maintenance"
    },
    cleanup: {
      label: "Apartment Cleanup",
      title: "Common area reset",
      copy: "Useful for leaf buildup, trash areas, dog waste stations, and other high-use spaces.",
      items: ["Trash area care", "Leaf removal", "Dog waste station checks", "Debris cleanup"],
      href: "#property-support",
      quote: "Property Support"
    },
    improvement: {
      label: "Apartment Improvement",
      title: "Shared-space upgrade",
      copy: "Focused landscape improvements can make entries, courtyards, and borders feel more cared for.",
      items: ["Mulch refresh", "Plant installation", "Low-maintenance beds", "Privacy screens"],
      href: "#landscape-improvements",
      quote: "Landscape Improvements"
    },
    ecological: {
      label: "Apartment Ecological",
      title: "Low-maintenance habitat edge",
      copy: "Pollinator-friendly plantings can add life and texture without adding complicated upkeep.",
      items: ["Native planting", "Pollinator strips", "Soil prep", "Low-water palettes"],
      href: "#ecological-enhancements",
      quote: "Ecological Enhancements"
    }
  },
  commercial: {
    routine: {
      label: "Commercial Routine Care",
      title: "Customer-facing upkeep",
      copy: "A clean, consistent maintenance plan for entrances, walkways, parking edges, and visible landscaping.",
      items: ["Entrance cleanup", "Mowing and edging", "Litter checks", "Weed control"],
      href: "#groundskeeping",
      quote: "Monthly Maintenance"
    },
    cleanup: {
      label: "Commercial Cleanup",
      title: "High-visibility cleanup",
      copy: "Good for storm debris, leaf buildup, parking lot edges, and neglected exterior areas.",
      items: ["Storm debris cleanup", "Sidewalk edges", "Parking lot edges", "Trash area care"],
      href: "#property-support",
      quote: "Property Support"
    },
    improvement: {
      label: "Commercial Improvement",
      title: "Entrance and frontage refresh",
      copy: "Small upgrades around entries and frontage can make the property feel more professional.",
      items: ["Entry planting", "Mulch refresh", "Shrub cleanup", "Irrigation review"],
      href: "#landscape-improvements",
      quote: "Landscape Improvements"
    },
    ecological: {
      label: "Commercial Ecological",
      title: "Resilient planting upgrade",
      copy: "Lower-water, native-informed planting can improve the look of underused exterior strips.",
      items: ["Low-water planting", "Native accents", "Soil improvement", "Pollinator pockets"],
      href: "#ecological-enhancements",
      quote: "Ecological Enhancements"
    }
  }
};

const positionNavIndicator = () => {
  if (!activeNavLink || window.innerWidth <= 760) return;
  primaryNav.style.setProperty("--nav-indicator-x", `${activeNavLink.offsetLeft}px`);
  primaryNav.style.setProperty("--nav-indicator-width", `${activeNavLink.offsetWidth}px`);
  primaryNav.style.setProperty("--nav-indicator-opacity", "1");
};

const updateExplorer = () => {
  const result = serviceRecommendations[selectedProperty][selectedGoal];
  document.querySelector("#service-result-label").textContent = result.label;
  document.querySelector("#service-result-title").textContent = result.title;
  document.querySelector("#service-result-copy").textContent = result.copy;
  document.querySelector("#service-result-list").innerHTML = result.items.map((item) => `<li>${item}</li>`).join("");
  document.querySelector("#service-result-link").setAttribute("href", result.href);
  document.querySelector("#service-result-quote").setAttribute("href", `index.html?service=${encodeURIComponent(result.quote)}#quote`);

  propertyButtons.forEach((button) => {
    const active = button.dataset.property === selectedProperty;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  goalButtons.forEach((button) => {
    const active = button.dataset.goal === selectedGoal;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
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

propertyButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedProperty = button.dataset.property;
    updateExplorer();
  });
});

goalButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedGoal = button.dataset.goal;
    updateExplorer();
  });
});

document.querySelectorAll(".service-detail-card").forEach((card, index) => {
  card.classList.add("reveal");
  card.style.setProperty("--reveal-delay", `${Math.min(index, 3) * 60}ms`);
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("is-visible");
    revealObserver.unobserve(entry.target);
  });
}, { threshold: 0.12 });
document.querySelectorAll(".service-detail-card").forEach((card) => revealObserver.observe(card));

const updateScrollEffects = () => {
  header.classList.toggle("is-compact", window.scrollY > 56);
  const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
  const scrollProgress = scrollableHeight > 0 ? (window.scrollY / scrollableHeight) * 100 : 0;
  document.documentElement.style.setProperty("--scroll-progress", `${Math.min(scrollProgress, 100)}%`);
};

window.addEventListener("scroll", updateScrollEffects, { passive: true });
window.addEventListener("resize", positionNavIndicator);
positionNavIndicator();
updateExplorer();
updateScrollEffects();
document.querySelector("#copyright-year").textContent = new Date().getFullYear();
