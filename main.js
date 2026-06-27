// main.js - Execute when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  
  // --- 1. Theme Toggling Logic ---
  const themeToggleBtn = document.getElementById("theme-toggle");
  
  // Check localStorage for saved theme preference
  const savedTheme = localStorage.getItem("site-theme");
  if (savedTheme === "corporate") {
    document.body.classList.add("corporate-theme");
  }

  // Toggle theme on button click
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      document.body.classList.toggle("corporate-theme");
      
      // Save preference to localStorage
      if (document.body.classList.contains("corporate-theme")) {
        localStorage.setItem("site-theme", "corporate");
      } else {
        localStorage.setItem("site-theme", "cyberpunk");
      }
    });
  }

  // --- 2. Highlight the active navigation link ---
  const currentLocation = window.location.pathname;
  const navLinks = document.querySelectorAll("nav a");

  navLinks.forEach(link => {
    // Check if the link's href matches the current path
    if (link.getAttribute("href") === currentLocation.split("/").pop() ||
      (currentLocation.endsWith("/") && link.getAttribute("href") === "index.html")) {
      link.classList.add("active");
    }
  });

  // --- 3. Typewriter Effect for Section Titles (with auto-stop) ---
  const sectionTitles = document.querySelectorAll(".section-title");

  sectionTitles.forEach(title => {
    const text = title.textContent;
    title.textContent = ""; // Clear text on load
    title.classList.add("typing-cursor"); // Add blinking cursor

    let i = 0;
    const typeWriter = () => {
      if (i < text.length) {
        title.textContent += text.charAt(i);
        i++;
        // Randomize typing speed for terminal realism (between 30ms and 100ms)
        setTimeout(typeWriter, Math.random() * 70 + 30);
      } else {
        // Typing is complete. Let it blink 3 times (~2400ms), then remove the cursor.
        setTimeout(() => {
          title.classList.remove("typing-cursor");
        }, 2400);
      }
    };

    // Delay the start slightly so it happens right after the user sees the page
    setTimeout(typeWriter, 400);
  });

  // --- 4. Add a simple console greeting for recruiters inspecting your site ---
  console.log("%cSYSTEM ONLINE: Welcome to the metacoder87 network.", "color: #39ff14; font-size: 14px; font-weight: bold;");
});