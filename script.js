const menuToggle = document.querySelector(".menu-toggle");
const primaryNav = document.querySelector(".primary-nav");
const form = document.querySelector("#quote-form");
const success = document.querySelector("#form-success");

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
