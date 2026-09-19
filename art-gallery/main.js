const gallery = document.querySelector("#gallery");
const lightbox = document.querySelector("#lightbox");
const lightboxImage = document.querySelector("#lightboxImage");
const lightboxStage = document.querySelector(".lightbox-stage");
const lightboxTitle = document.querySelector("#lightboxTitle");
const lightboxLink = document.querySelector("#lightboxLink");
const lightboxClose = document.querySelector(".lightbox-close");
const scrollHint = document.querySelector(".scroll-hint");
const backToTop = document.querySelector("#backToTop");
const workCount = document.querySelector("#workCount");

let currentLightboxIndex = -1;
let swipeStartX = 0;
let swipeStartY = 0;
let swipePointerId = null;
let swipeActive = false;

workCount.textContent = `${artworks.length} WORKS`;

/**
 * DeviantArt documents JSONP for client-side oEmbed use.
 * This keeps the gallery independent of local image files and avoids requiring
 * API credentials or a server-side proxy.
 */
function deviantArtOEmbed(url, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const callbackName =
      "__da_oembed_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).slice(2);

    const script = document.createElement("script");
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("DeviantArt oEmbed request timed out."));
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timeout);
      script.remove();
      try {
        delete window[callbackName];
      } catch {
        window[callbackName] = undefined;
      }
    }

    window[callbackName] = data => {
      cleanup();
      if (!data || (!data.url && !data.thumbnail_url && !data.fullsize_url)) {
        reject(new Error("DeviantArt returned no usable image URL."));
        return;
      }
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Unable to reach DeviantArt oEmbed."));
    };

    const endpoint = new URL("https://backend.deviantart.com/oembed");
    endpoint.searchParams.set("url", url);
    endpoint.searchParams.set("format", "jsonp");
    endpoint.searchParams.set("callback", callbackName);
    endpoint.searchParams.set("maxwidth", "1400");
    endpoint.searchParams.set("maxheight", "1800");

    script.src = endpoint.toString();
    script.async = true;
    document.head.appendChild(script);
  });
}

function getTileJitter(index) {
  // Deterministic pseudo-random offset: stable on every load, but does not
  // repeat at each 3-row section.
  const xSeed = ((index * 37 + 11) % 23) - 11;
  const ySeed = ((index * 53 + 7) % 19) - 9;

  return {
    x: xSeed * 0.75,
    y: ySeed * 0.65
  };
}

function createTile(art, index) {
  const button = document.createElement("button");
  button.className = "tile";
  button.type = "button";
  button.setAttribute("aria-label", `Open ${art.title}`);

  const jitter = getTileJitter(index);
  button.style.setProperty("--jitter-x", `${jitter.x.toFixed(2)}px`);
  button.style.setProperty("--jitter-y", `${jitter.y.toFixed(2)}px`);

  // Stable per-tile parallax rate. Alternating signs keeps the mobile wall
  // feeling layered rather than moving as one rigid sheet.
  const parallaxSteps = [-0.050, 0.032, -0.026, 0.044, -0.038, 0.024, -0.046, 0.036];
  button.dataset.parallaxSpeed = parallaxSteps[index % parallaxSteps.length];

  button.style.transitionDelay = `${Math.min((index % 8) * 28, 196)}ms`;


  const img = document.createElement("img");
  img.alt = art.title;
  img.loading = index < 6 ? "eager" : "lazy";
  img.decoding = "async";
  img.referrerPolicy = "no-referrer";
  img.hidden = true;

  const caption = document.createElement("div");
  caption.className = "tile-caption";
  caption.innerHTML = `
    <p class="tile-title">${escapeHtml(art.title)}</p>
    <span class="tile-arrow" aria-hidden="true">↗</span>
  `;

  button.append(img, caption);

  button.addEventListener("click", () => {
    if (art.image) {
      openLightbox(art);
    } else {
      window.open(art.page, "_blank", "noopener,noreferrer");
    }
  });

  deviantArtOEmbed(art.page)
    .then(data => {
      art.title = data.title || art.title;
      art.image = data.fullsize_url || data.url || data.thumbnail_url;

      img.alt = art.title;
      img.src = art.image;
      img.onload = () => {
        img.hidden = false;
        button.classList.add("is-loaded");
      };
      img.onerror = () => setTileError(button, art);

      button.setAttribute("aria-label", `Open ${art.title}`);
      caption.querySelector(".tile-title").textContent = art.title;
    })
    .catch(() => setTileError(button, art));

  return button;
}

function setTileError(tile, art) {
  tile.classList.add("is-error");
  tile.title = `Open ${art.title} on DeviantArt`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function ensureArtworkImage(art) {
  if (art.image) return Promise.resolve(art);

  if (!art.imagePromise) {
    art.imagePromise = deviantArtOEmbed(art.page)
      .then(data => {
        art.title = data.title || art.title;
        art.image = data.fullsize_url || data.url || data.thumbnail_url;
        return art;
      })
      .finally(() => {
        delete art.imagePromise;
      });
  }

  return art.imagePromise;
}

function normalizeArtworkIndex(index) {
  const length = artworks.length;
  return ((index % length) + length) % length;
}

async function showArtworkAt(index) {
  const normalizedIndex = normalizeArtworkIndex(index);
  const art = artworks[normalizedIndex];
  currentLightboxIndex = normalizedIndex;

  lightboxStage.classList.add("is-loading");

  try {
    await ensureArtworkImage(art);

    // Ignore a late async result if the user has already swiped again.
    if (currentLightboxIndex !== normalizedIndex) return;

    lightboxImage.src = art.image;
    lightboxImage.alt = art.title;
    lightboxTitle.textContent = art.title;
    lightboxLink.href = art.page;
  } catch {
    if (currentLightboxIndex !== normalizedIndex) return;

    lightboxImage.removeAttribute("src");
    lightboxImage.alt = "";
    lightboxTitle.textContent = art.title;
    lightboxLink.href = art.page;
  } finally {
    if (currentLightboxIndex === normalizedIndex) {
      lightboxStage.classList.remove("is-loading");
    }
  }
}

function resetSwipeVisual() {
  lightboxStage.style.setProperty("--swipe-x", "0px");
  lightboxStage.style.setProperty("--swipe-opacity", "1");
  lightboxStage.classList.remove("is-dragging");
}

function navigateLightbox(direction) {
  if (currentLightboxIndex < 0) return;
  showArtworkAt(currentLightboxIndex + direction);
}

function openLightbox(art) {
  currentLightboxIndex = artworks.indexOf(art);
  showArtworkAt(currentLightboxIndex);

  if (typeof lightbox.showModal === "function") {
    lightbox.showModal();
    document.documentElement.style.overflow = "hidden";
  } else {
    window.open(art.page, "_blank", "noopener,noreferrer");
  }
}

function closeLightbox() {
  if (lightbox.open) {
    lightbox.close();
    document.documentElement.style.overflow = "";
    lightboxImage.removeAttribute("src");
    currentLightboxIndex = -1;
    resetSwipeVisual();
  }
}

const BLOCK_SIZE = 8;

for (let start = 0; start < artworks.length; start += BLOCK_SIZE) {
  const panel = document.createElement("section");
  panel.className = "gallery-panel";
  panel.setAttribute("aria-label", `Artwork group ${Math.floor(start / BLOCK_SIZE) + 1}`);

  const stage = document.createElement("div");
  stage.className = "gallery-panel-stage";

  const plane = document.createElement("div");
  plane.className = "gallery-panel-plane";

  const block = document.createElement("div");
  block.className = "gallery-block";

  artworks.slice(start, start + BLOCK_SIZE).forEach((art, index) => {
    block.appendChild(createTile(art, start + index));
  });

  plane.appendChild(block);
  stage.appendChild(plane);
  panel.appendChild(stage);
  gallery.appendChild(panel);
}

const revealObserver = new IntersectionObserver(
  (entries, observer) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  },
  { rootMargin: "120px 0px -35px", threshold: 0.01 }
);

document.querySelectorAll(".tile").forEach(tile => revealObserver.observe(tile));

lightboxImage.draggable = false;

lightboxStage.addEventListener("pointerdown", event => {
  if (!lightbox.open || event.button > 0) return;

  swipePointerId = event.pointerId;
  swipeStartX = event.clientX;
  swipeStartY = event.clientY;
  swipeActive = true;

  lightboxStage.setPointerCapture?.(event.pointerId);
  lightboxStage.classList.add("is-dragging");
});

lightboxStage.addEventListener("pointermove", event => {
  if (!swipeActive || event.pointerId !== swipePointerId) return;

  const dx = event.clientX - swipeStartX;
  const dy = event.clientY - swipeStartY;

  // Only visually track a gesture once it is clearly horizontal.
  if (Math.abs(dx) <= Math.abs(dy) || Math.abs(dx) < 6) return;

  const limitedX = Math.max(-140, Math.min(140, dx));
  const opacity = Math.max(0.58, 1 - Math.abs(limitedX) / 320);

  lightboxStage.style.setProperty("--swipe-x", `${limitedX}px`);
  lightboxStage.style.setProperty("--swipe-opacity", opacity.toFixed(3));
});

function finishSwipe(event) {
  if (!swipeActive || event.pointerId !== swipePointerId) return;

  const dx = event.clientX - swipeStartX;
  const dy = event.clientY - swipeStartY;
  const horizontalSwipe =
    Math.abs(dx) >= 55 &&
    Math.abs(dx) > Math.abs(dy) * 1.15;

  swipeActive = false;

  try {
    lightboxStage.releasePointerCapture?.(event.pointerId);
  } catch {}

  resetSwipeVisual();

  if (!horizontalSwipe) return;

  // Swipe left -> next artwork. Swipe right -> previous artwork.
  navigateLightbox(dx < 0 ? 1 : -1);
}

lightboxStage.addEventListener("pointerup", finishSwipe);
lightboxStage.addEventListener("pointercancel", event => {
  if (event.pointerId !== swipePointerId) return;
  swipeActive = false;
  resetSwipeVisual();
});

lightboxClose.addEventListener("click", closeLightbox);

lightbox.addEventListener("click", event => {
  const rect = lightbox.getBoundingClientRect();
  const clickedDialogBackdrop =
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom;

  if (event.target === lightbox || clickedDialogBackdrop) closeLightbox();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeLightbox();
    return;
  }

  if (!lightbox.open) return;

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    navigateLightbox(-1);
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    navigateLightbox(1);
  }
});

const mobileGalleryQuery = window.matchMedia("(max-width: 760px)");
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
let parallaxFrame = 0;

function updateMobileParallax() {
  parallaxFrame = 0;

  if (!mobileGalleryQuery.matches || reducedMotionQuery.matches) {
    document.querySelectorAll(".tile").forEach(tile => {
      tile.style.setProperty("--parallax-y", "0px");
    });
    return;
  }

  const viewportCenter = window.innerHeight * 0.5;

  document.querySelectorAll(".tile.is-visible").forEach(tile => {
    const rect = tile.getBoundingClientRect();

    // Ignore tiles well outside the viewport.
    if (rect.bottom < -120 || rect.top > window.innerHeight + 120) return;

    const tileCenter = rect.top + rect.height * 0.5;
    const distance = viewportCenter - tileCenter;
    const speed = Number(tile.dataset.parallaxSpeed || 0);
    const offset = Math.max(-18, Math.min(18, distance * speed));

    tile.style.setProperty("--parallax-y", `${offset.toFixed(2)}px`);
  });
}

function requestMobileParallax() {
  if (parallaxFrame) return;
  parallaxFrame = requestAnimationFrame(updateMobileParallax);
}

mobileGalleryQuery.addEventListener?.("change", requestMobileParallax);
reducedMotionQuery.addEventListener?.("change", requestMobileParallax);
window.addEventListener("resize", requestMobileParallax, { passive: true });

backToTop.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

window.addEventListener(
  "scroll",
  () => {
    const scrolled = window.scrollY > 90;
    scrollHint.style.opacity = scrolled ? "0" : "1";
    backToTop.classList.toggle("is-visible", window.scrollY > window.innerHeight * 0.8);
    requestMobileParallax();
  },
  { passive: true }
);

requestMobileParallax();
