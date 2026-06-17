document.documentElement.classList.add("js");

const menuToggle = document.querySelector(".menu-toggle");
const primaryNav = document.querySelector(".primary-nav");
const header = document.querySelector(".site-header");
const portfolioCards = [...document.querySelectorAll(".portfolio-card")];
const filterButtons = [...document.querySelectorAll(".filter-button")];
const emptyMessage = document.querySelector(".portfolio-empty");
const navDropdowns = [...document.querySelectorAll(".nav-dropdown")];
const activeNavLink = primaryNav.querySelector(".nav-dropdown-toggle.is-current, .primary-nav > a[aria-current='page']");

const positionNavIndicator = () => {
  if (!activeNavLink || window.innerWidth <= 760) return;
  primaryNav.style.setProperty("--nav-indicator-x", `${activeNavLink.offsetLeft}px`);
  primaryNav.style.setProperty("--nav-indicator-width", `${activeNavLink.offsetWidth}px`);
  primaryNav.style.setProperty("--nav-indicator-opacity", "1");
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

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;
    filterButtons.forEach((item) => {
      const active = item === button;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-pressed", String(active));
    });

    let visibleCount = 0;
    portfolioCards.forEach((card) => {
      const visible = filter === "all" || card.dataset.category === filter;
      card.classList.toggle("is-filtered-out", !visible);
      if (visible) visibleCount += 1;
    });
    emptyMessage.classList.toggle("is-visible", visibleCount === 0);
  });
});

portfolioCards.forEach((card, index) => {
  card.classList.add("reveal");
  card.style.setProperty("--reveal-delay", `${Math.min(index, 5) * 55}ms`);
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("is-visible");
    revealObserver.unobserve(entry.target);
  });
}, { threshold: 0.12 });
portfolioCards.forEach((card) => revealObserver.observe(card));

const updateScrollEffects = () => {
  header.classList.toggle("is-compact", window.scrollY > 56);
  const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
  const scrollProgress = scrollableHeight > 0 ? (window.scrollY / scrollableHeight) * 100 : 0;
  document.documentElement.style.setProperty("--scroll-progress", `${Math.min(scrollProgress, 100)}%`);
};

window.addEventListener("scroll", updateScrollEffects, { passive: true });
window.addEventListener("resize", positionNavIndicator);
positionNavIndicator();
updateScrollEffects();
document.querySelector("#copyright-year").textContent = new Date().getFullYear();
