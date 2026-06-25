// main.js - Execute when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {

  // 1. Highlight the active navigation link
  const currentLocation = window.location.pathname;
  const navLinks = document.querySelectorAll("nav a");

  navLinks.forEach(link => {
    // Check if the link's href matches the current path
    if (link.getAttribute("href") === currentLocation.split("/").pop() ||
      (currentLocation.endsWith("/") && link.getAttribute("href") === "index.html")) {
      link.classList.add("active");
    }
  });

  // 2. Add a simple console greeting for recruiters inspecting your site
  console.log("%cSYSTEM ONLINE: Welcome to the metacoder87 network.", "color: #00f3ff; font-size: 14px; font-weight: bold;");
});