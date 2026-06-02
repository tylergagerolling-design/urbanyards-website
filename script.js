const menuToggle = document.querySelector(".menu-toggle");
const primaryNav = document.querySelector(".primary-nav");
const quoteForm = document.querySelector("#quote-form");
const successMessage = document.querySelector("#form-success");

// Keep the compact navigation accessible on smaller screens.
menuToggle.addEventListener("click", () => {
  const isOpen = primaryNav.classList.toggle("is-open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

primaryNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    primaryNav.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
  });
});

// Replace missing future artwork with intentional illustrated placeholders.
document.querySelectorAll(".media-shell img").forEach((image) => {
  image.addEventListener("error", () => {
    image.closest(".media-shell").classList.add("is-missing");
  });
});

document.querySelectorAll(".brand img").forEach((image) => {
  image.addEventListener("error", () => {
    image.closest(".brand").classList.add("is-missing");
    image.remove();
  });
});

// Validate locally and show confirmation without sending customer data.
quoteForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!quoteForm.checkValidity()) {
    quoteForm.reportValidity();
    return;
  }

  successMessage.classList.add("is-visible");
  successMessage.focus();
  quoteForm.reset();
});

document.querySelector("#year").textContent = new Date().getFullYear();
