/* Standalone landing-page behavior. No packages or build step required. */
(() => {
  "use strict";

  const body = document.body;
  const header = document.querySelector(".ui");
  const menuButton = document.querySelector(".mobile-nav");
  const siteInfo = document.querySelector("#site-info");
  const video = document.querySelector(".bgvideo");
  const mobileViewport = window.matchMedia("(max-width: 767px)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function setMenuOpen(open, restoreFocus = false) {
    if (!menuButton || !siteInfo) return;

    const isOpen = Boolean(open && mobileViewport.matches);
    body.classList.toggle("mobileNavOpen", isOpen);
    body.classList.remove("uiHover");
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute("aria-label", isOpen ? "Close menu" : "Menu");
    // Keep hidden mobile links out of the keyboard tab order.
    siteInfo.inert = mobileViewport.matches && !isOpen;

    if (restoreFocus) menuButton.focus();
  }

  menuButton?.addEventListener("click", () => {
    setMenuOpen(menuButton.getAttribute("aria-expanded") !== "true");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && body.classList.contains("mobileNavOpen")) {
      setMenuOpen(false, true);
    }
  });

  header?.addEventListener("mouseenter", () => {
    if (!mobileViewport.matches) body.classList.add("uiHover");
  });

  header?.addEventListener("mouseleave", () => {
    body.classList.remove("uiHover");
  });

  // Anchors retain native navigation, modifier-clicks, and open-in-new-tab.
  siteInfo?.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a")) {
      setMenuOpen(false);
    }
  });

  function updateMotionPreference() {
    if (!video) return;
    if (reducedMotion.matches) {
      video.pause();
    } else {
      // Autoplay restrictions are expected; a rejected play request must not
      // prevent the page or its navigation from working.
      video.play()?.catch(() => {});
    }
  }

  mobileViewport.addEventListener("change", () => setMenuOpen(false));
  reducedMotion.addEventListener("change", updateMotionPreference);
  setMenuOpen(false);
  updateMotionPreference();
})();
