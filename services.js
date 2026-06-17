document.documentElement.classList.add("js");

const menuToggle = document.querySelector(".menu-toggle");
const primaryNav = document.querySelector(".primary-nav");
const header = document.querySelector(".site-header");
const activeNavLink = primaryNav.querySelector(".nav-dropdown-toggle.is-current, .primary-nav > a[aria-current='page']");
const propertyButtons = [...document.querySelectorAll(".service-explorer-button")];
const goalButtons = [...document.querySelectorAll(".service-goal-button")];
const navDropdowns = [...document.querySelectorAll(".nav-dropdown")];

let selectedProperty = "homeowner";
let selectedGoal = "routine";

const serviceRecommendations = {
  homeowner: {
    routine: {
      label: "Homeowner Services",
      title: "Professional Landscape Care for Homeowners",
      copy: "Routine maintenance, seasonal services, and landscape health work together to keep a home looking cared for.",
      items: ["Lawn mowing", "Edging", "Weed management", "Garden bed maintenance"],
      href: "#groundskeeping",
      quote: "Lawn Mowing"
    },
    cleanup: {
      label: "Homeowner Services",
      title: "Seasonal reset",
      copy: "A good fit when the yard needs a practical reset before spring growth, summer use, or fall weather.",
      items: ["Seasonal cleanup", "Shrub trimming", "Garden bed maintenance", "Mulching"],
      href: "#groundskeeping",
      quote: "Seasonal Cleanup"
    },
    improvement: {
      label: "Homeowner Services",
      title: "Landscape refresh",
      copy: "Targeted upgrades for beds, entries, and privacy edges that make the property feel more finished.",
      items: ["Landscape refreshes", "Mulching", "Garden bed maintenance", "Planting updates"],
      href: "#landscape-improvements",
      quote: "Landscape Maintenance"
    },
    ecological: {
      label: "Homeowner Services",
      title: "Lower-water planting path",
      copy: "Native and pollinator-friendly plantings can make smaller landscapes feel intentional and resilient.",
      items: ["Native plants", "Pollinator habitat", "Low-water beds", "Soil improvement"],
      href: "#ecological-enhancements",
      quote: "Landscape Maintenance"
    }
  },
  propertyManagement: {
    routine: {
      label: "Property Management Services",
      title: "Dependable Groundskeeping for Multifamily and Community Properties",
      copy: "Reliable communication and consistent property appearance help support resident satisfaction and long-term presentation.",
      items: ["Apartment groundskeeping", "HOA landscape maintenance", "Common area care", "Property appearance audits"],
      href: "#groundskeeping",
      quote: "Apartment Groundskeeping"
    },
    cleanup: {
      label: "Property Management Services",
      title: "Common area reset",
      copy: "Useful for leaf buildup, trash and recycling areas, move-out exterior cleanup, and other high-use spaces.",
      items: ["Seasonal cleanup", "Trash and recycling area maintenance", "Move-out exterior cleanup", "Day porter services"],
      href: "#property-support",
      quote: "Property Management Landscaping"
    },
    improvement: {
      label: "Property Management Services",
      title: "First impression refresh",
      copy: "Focused landscape maintenance around entries, courtyards, and shared spaces can make the property feel more professional.",
      items: ["Common area care", "Shrub trimming", "Pressure washing", "Mulch refresh"],
      href: "#landscape-improvements",
      quote: "HOA Landscape Maintenance"
    },
    ecological: {
      label: "Property Management Services",
      title: "Resilient planting upgrade",
      copy: "Lower-water, native-informed planting can improve the look of underused exterior strips.",
      items: ["Low-water planting", "Native accents", "Soil improvement", "Pollinator pockets"],
      href: "#ecological-enhancements",
      quote: "Property Management Landscaping"
    }
  }
};

const calendarSection = document.querySelector("#calendar");
const calendarPropertyButtons = [...document.querySelectorAll(".calendar-property-button")];
const calendarMonthButtons = [...document.querySelectorAll(".calendar-month-button")];
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

const propertyTypes = {
  homeowner: {
    label: "Homeowner Services",
    note: "Focus on routine maintenance, seasonal services, property appearance, landscape health, and dependable service.",
    emphasis: ["lawn mowing", "edging", "weed management", "mulching", "garden bed maintenance"]
  },
  propertyManagement: {
    label: "Property Management Services",
    note: "Focus on reliable communication, consistent appearance, resident satisfaction, first impressions, and long-term property presentation.",
    emphasis: ["apartment groundskeeping", "HOA landscape maintenance", "common area care", "trash areas", "pressure washing"]
  }
};

const serviceCalendar = [
  {
    services: ["Storm debris cleanup", "Winter property inspections", "Drainage issue checks", "Trash/recycling area cleanup"],
    why: "Winter weather can reveal drainage, debris, and safety issues.",
    schedule: "Book early in the month after heavy weather, then check again before the next storm system."
  },
  {
    services: ["Winter pruning", "Bed cleanup", "Early weed prevention", "Mulch planning"],
    why: "Late winter is a good time to prepare beds before spring growth.",
    schedule: "Schedule pruning and bed prep before spring growth starts moving fast."
  },
  {
    services: ["Spring cleanup", "Mulch installation", "Weed removal", "Lawn edging", "Early planting prep"],
    why: "March is when properties start looking active again and first impressions matter.",
    schedule: "Get on the calendar early so cleanup, mulch, and edging land before peak spring demand."
  },
  {
    services: ["Lawn mowing begins", "Edging", "Weed control", "Irrigation inspection", "New plant installation"],
    why: "Spring growth accelerates and maintenance routines should be established.",
    schedule: "Use April to set recurring maintenance and inspect irrigation before warmer weather."
  },
  {
    services: ["Weekly mowing", "Shrub trimming", "Bed maintenance", "Pollinator-friendly planting", "Mulch touch-ups"],
    why: "May is peak curb appeal season and plants are actively growing.",
    schedule: "Weekly or biweekly service works best while turf, weeds, and shrubs are growing quickly."
  },
  {
    services: ["Mowing and edging", "Irrigation monitoring", "Weed suppression", "Light pruning", "Common area cleanup"],
    why: "Early summer maintenance keeps landscapes from getting overgrown.",
    schedule: "Schedule consistent visits before summer heat makes catch-up work harder."
  },
  {
    services: ["Drought stress monitoring", "Deep watering support", "Mulch touch-ups", "Weed control", "Dog waste station maintenance"],
    why: "Hot, dry weather can stress plants and make neglected areas stand out.",
    schedule: "Plan visits around heat waves and high-use common areas."
  },
  {
    services: ["Irrigation adjustments", "Heat stress checks", "Cleanup of dry plant material", "Late-summer weed control"],
    why: "August is about keeping properties clean, safe, and resilient through heat.",
    schedule: "Book heat checks and dry-material cleanup before late-summer landscapes look tired."
  },
  {
    services: ["Lawn repair", "Overseeding", "Fall planting prep", "Soil improvement", "Bed renovation"],
    why: "September is one of the best months to repair lawns and prepare for fall planting.",
    schedule: "Schedule lawn repair and soil work early enough to catch cooler weather and fall moisture."
  },
  {
    services: ["Native plant installation", "Shrub and tree planting", "Leaf cleanup", "Mulch installation", "Storm preparation"],
    why: "Fall is one of the best planting windows in Portland.",
    schedule: "Reserve planting and storm prep before leaf cleanup season fills the calendar."
  },
  {
    services: ["Leaf removal", "Winter preparation", "Drainage checks", "Mulch refresh", "Debris cleanup"],
    why: "Wet weather and leaf buildup can create messy and unsafe conditions.",
    schedule: "Set cleanup visits around major leaf drop and before persistent rain."
  },
  {
    services: ["Storm cleanup", "Winter inspections", "Trash area maintenance", "Entryway cleanup", "Snow/ice readiness if offered"],
    why: "Winter maintenance helps keep properties presentable and functional.",
    schedule: "Use December for storm response, entry cleanup, and winter-readiness checks."
  }
];

let selectedPropertyType = "homeowner";
let selectedMonth = new Date().getMonth();

const createList = (target, items) => {
  if (!target) return;
  target.innerHTML = items.map((item) => `<li>${item}</li>`).join("");
};

const getPropertyServices = (monthData, propertyData) => {
  const serviceSet = [...monthData.services];
  propertyData.emphasis.forEach((item) => {
    const alreadyCovered = serviceSet.some((service) => service.toLowerCase().includes(item.toLowerCase()));
    if (!alreadyCovered && serviceSet.length < 7) serviceSet.push(item.replace(/\b\w/g, (letter) => letter.toUpperCase()));
  });
  return serviceSet.slice(0, 7);
};

const updateCalendarDisplay = () => {
  if (!calendarSection) return;

  const monthData = serviceCalendar[selectedMonth];
  const propertyData = propertyTypes[selectedPropertyType];
  const serviceList = getPropertyServices(monthData, propertyData);
  const nextMonths = [1, 2].map((offset) => (selectedMonth + offset) % 12);

  calendarPropertyButtons.forEach((button) => {
    const active = button.dataset.propertyType === selectedPropertyType;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  calendarMonthButtons.forEach((button) => {
    const active = Number(button.dataset.month) === selectedMonth;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  document.querySelector("#calendar-property-label").textContent = propertyData.label;
  document.querySelector("#calendar-month-title").textContent = `${monthNames[selectedMonth]} Care Plan`;
  document.querySelector("#calendar-property-note").textContent = propertyData.note;
  document.querySelector("#calendar-why").textContent = monthData.why;
  document.querySelector("#calendar-schedule").textContent = monthData.schedule;
  document.querySelector("#calendar-best-title").textContent = `${monthNames[selectedMonth]} Priorities`;

  createList(document.querySelector("#calendar-service-list"), serviceList);
  createList(document.querySelector("#calendar-best-list"), serviceList.slice(0, 3));

  document.querySelector("#calendar-plan-ahead").innerHTML = nextMonths.map((monthIndex) => {
    const plan = serviceCalendar[monthIndex];
    return `<div class="plan-ahead-item"><strong>${monthNames[monthIndex]}</strong><span>${plan.services.slice(0, 3).join(", ")}</span></div>`;
  }).join("");
};

const positionNavIndicator = () => {
  if (!activeNavLink || window.innerWidth <= 760) return;
  const navRect = primaryNav.getBoundingClientRect();
  const activeRect = activeNavLink.getBoundingClientRect();
  primaryNav.style.setProperty("--nav-indicator-x", `${activeRect.left - navRect.left}px`);
  primaryNav.style.setProperty("--nav-indicator-width", `${activeRect.width}px`);
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
  if (!open) closeNavDropdowns();
});

const closeNavDropdowns = () => {
  navDropdowns.forEach((dropdown) => {
    dropdown.classList.remove("is-open");
    dropdown.querySelector(".nav-dropdown-toggle")?.setAttribute("aria-expanded", "false");
  });
};

navDropdowns.forEach((dropdown) => {
  const toggle = dropdown.querySelector(".nav-dropdown-toggle");
  toggle?.addEventListener("click", () => {
    const open = !dropdown.classList.contains("is-open");
    closeNavDropdowns();
    dropdown.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  });
});

primaryNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    closeNavDropdowns();
    primaryNav.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
  });
});

document.addEventListener("click", (event) => {
  if (!primaryNav.contains(event.target)) closeNavDropdowns();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeNavDropdowns();
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

calendarPropertyButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedPropertyType = button.dataset.propertyType;
    updateCalendarDisplay();
  });
});

calendarMonthButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedMonth = Number(button.dataset.month);
    updateCalendarDisplay();
  });
});

document.querySelectorAll(".service-detail-card, .calendar-controls, .calendar-main-card, .calendar-highlight-card").forEach((card, index) => {
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
document.querySelectorAll(".service-detail-card, .calendar-controls, .calendar-main-card, .calendar-highlight-card").forEach((card) => revealObserver.observe(card));

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
updateCalendarDisplay();
updateScrollEffects();
document.querySelector("#copyright-year").textContent = new Date().getFullYear();
