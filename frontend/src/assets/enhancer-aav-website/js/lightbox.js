// ── Lightbox ──
// Full-screen image viewer with zoom/pan, keyboard navigation, touch
// gestures, metadata display, swap buttons, modals, and atlas integration.

import {
  MOBILE_BREAKPOINT, ZOOM_THRESHOLD, ZOOM_MIN, ZOOM_MAX,
  SWIPE_MAX_MS, FOLDER_IN_VITRO, TUTORIAL_VIDEO_URL
} from './config.js';
import { formatFileSize, removeExtension } from './utils.js';
import {
  lb, lbImg, lbImgWrapper, lbTitle, lbClose, lbHideToolbar,
  toolbarRestoreIndicator, toolbarGapOverlay, lbTop, lbStage,
  lbPrev, lbNext, lbCounter, zoomDisplay, metadataToggle, gestureHint,
  swapFolderBtn, pageSwapBtn,
  brainTemplatePanel, brainTemplateToggle, atlasCloseBtn,
  ccfSliceImage, atlasBrainImage,
  regionsOverlayCanvas, regionsOverlayToggle,
  channelControls, channelLegend, channelLegendToggle,
  metadataPanel, metadataCloseBtn,
  metaDimensions, metaFileSize, metaFormat, metaModified, metaZoom,
  biologicalMetadata, biologicalMetadataTitle,
  metaMouseId, metaGenotype, metaEnhancer, metaVirus, metaVirusLabel,
  metaValidationMethod, metaInfection, metaMOI, metaIncubation,
  metaMouseIdRow, metaGenotypeRow, metaEnhancerRow, metaVirusRow,
  metaTargetedCellsRow, metaValidationMethodRow, metaInfectionRow,
  metaMOIRow, metaIncubationRow,
  redSlider, greenSlider, blueSlider, grayscaleToggle,
  readmeBtn, readmeModal, readmeModalClose,
  videoBtn, videoModal, videoModalClose, tutorialVideo
} from './dom.js';
import {
  channelState, viewState, lightboxState, zoomState, touchState,
  regionsOverlayState
} from './state.js';
import { byFolder } from './data.js';
import { updateChannelDisplay, resetChannelState, isMultiChannelImage, updateChannelLegend } from './channels.js';
import { updateAtlasPanel, showInteractiveAtlas, showCcfSliceView } from './atlas.js';
import { toggleRegionsOverlay } from './regionsOverlay.js';
// Circular: gallery imports openAt & close from us; we import from gallery.
// Safe because all calls happen at runtime (event handlers), not during evaluation.
import { currentFolderFromHash, updateSwapButtonState, attemptFolderSwap } from './gallery.js';

// ─── Scroll Lock ───────────────────────────────────────────────────

function scrollbarWidth() {
  return window.innerWidth - document.documentElement.clientWidth;
}
function lockScroll() {
  const w = scrollbarWidth();
  document.body.style.overflow = "hidden";
  document.body.style.paddingRight = w ? w + "px" : "";
}
function unlockScroll() {
  document.body.style.overflow = "";
  document.body.style.paddingRight = "";
}

// ─── Zoom / Pan Helpers ────────────────────────────────────────────

export function updateImageTransform() {
  if (lbImgWrapper) {
    lbImgWrapper.style.transform =
      `scale(${zoomState.zoomLevel}) translate(${zoomState.panX}px, ${zoomState.panY}px)`;
  }
  if (zoomDisplay) {
    zoomDisplay.textContent = Math.round(zoomState.zoomLevel * 100) + "%";
  }
  metaZoom.textContent = Math.round(zoomState.zoomLevel * 100) + "%";
  const hasPan = Math.abs(zoomState.panX) > 0.5 || Math.abs(zoomState.panY) > 0.5;
  lbImg.style.cursor = (zoomState.zoomLevel > ZOOM_THRESHOLD || hasPan) ? "grab" : "default";
}

export function resetZoom() {
  zoomState.zoomLevel = 1;
  zoomState.panX = 0;
  zoomState.panY = 0;
  if (lbImgWrapper) lbImgWrapper.classList.remove("zoomed");
  updateImageTransform();
}

// ─── Metadata ──────────────────────────────────────────────────────

export function updateMetadata(imageData) {
  metaDimensions.textContent =
    imageData.width && imageData.height
      ? `${imageData.width} × ${imageData.height}` : "—";

  metaFileSize.textContent = imageData.size ? formatFileSize(imageData.size) : "—";

  if (imageData.name) {
    metaFormat.textContent = imageData.name.split(".").pop().toUpperCase();
  } else {
    metaFormat.textContent = "—";
  }

  if (imageData.mtime) {
    metaModified.textContent = new Date(imageData.mtime * 1000).toLocaleDateString();
  } else {
    metaModified.textContent = "—";
  }

  metaZoom.textContent = Math.round(zoomState.zoomLevel * 100) + "%";

  // Biological / experimental metadata
  if (imageData.metadata && Object.keys(imageData.metadata).length > 0) {
    const metadata = imageData.metadata;
    const isInVitro = metadata["Validation Method"] &&
      metadata["Validation Method"].toLowerCase().includes("in vitro");

    biologicalMetadata.style.display = "block";

    // Helper: show a row only if metadata value is present and non-empty
    const showIf = (row, el, value, label) => {
      const v = value ? value.toString().trim() : "";
      if (v) {
        row.style.display = "";
        row.classList.remove("hidden");
        el.textContent = v;
        if (label) label.textContent = label.textContent; // no-op, keeps label
      } else {
        row.style.display = "none";
      }
    };

    if (isInVitro) {
      biologicalMetadataTitle.textContent = "In Vitro Data";
      metaMouseIdRow.style.display = "none";
      metaGenotypeRow.style.display = "none";
      metaEnhancerRow.style.display = "none";
      metaTargetedCellsRow.style.display = "none";
      metaVirusRow.style.display = "none";

      showIf(metaValidationMethodRow, metaValidationMethod, metadata["Validation Method"]);
      showIf(metaInfectionRow, metaInfection, metadata["Infection"]);
      showIf(metaMOIRow, metaMOI, metadata["MOI"]);
      showIf(metaIncubationRow, metaIncubation, metadata["Incubation"]);
    } else {
      biologicalMetadataTitle.textContent = "Experimental Data";

      showIf(metaMouseIdRow, metaMouseId, metadata["Experimental/Donor ID"]);
      showIf(metaGenotypeRow, metaGenotype, metadata["Donor Genotype"]);
      showIf(metaEnhancerRow, metaEnhancer, metadata["Enhancer ID"]);

      metaVirusLabel.textContent = "Vector:";
      showIf(metaVirusRow, metaVirus, metadata["Vector Full Name"]);

      const metaTargetedCells = document.getElementById("metaTargetedCells");
      if (metaTargetedCells) {
        showIf(metaTargetedCellsRow, metaTargetedCells, metadata["Targeted Cell Population"]);
      } else {
        metaTargetedCellsRow.style.display = "none";
      }

      metaValidationMethodRow.style.display = "none";
      metaInfectionRow.style.display = "none";
      metaMOIRow.style.display = "none";
      metaIncubationRow.style.display = "none";
    }

    // Hide the entire section if no rows ended up visible
    const allRows = [metaMouseIdRow, metaGenotypeRow, metaEnhancerRow, metaVirusRow,
      metaTargetedCellsRow, metaValidationMethodRow, metaInfectionRow, metaMOIRow, metaIncubationRow];
    const anyVisible = allRows.some(r => r && r.style.display !== "none" && !r.classList.contains("hidden"));
    biologicalMetadata.style.display = anyVisible ? "block" : "none";
  } else {
    biologicalMetadata.style.display = "none";
  }
}

// ─── Open / Close / Navigate ───────────────────────────────────────

export function openAt(i) {
  lightboxState.idx = i;
  resetZoom();

  const item = lightboxState.items[lightboxState.idx];
  const btn = item.tagName === "FIGURE" ? item.querySelector("button") : item;
  const full = btn.getAttribute("data-full");
  const title = btn.getAttribute("data-title") || "";

  const currentFolder = currentFolderFromHash();
  const imgs = byFolder.get(currentFolder) || [];
  const imageData = imgs[lightboxState.idx] || {};

  // Gesture hint on mobile (first time only)
  if (window.innerWidth <= MOBILE_BREAKPOINT && gestureHint) {
    if (!sessionStorage.getItem("hasSeenGestureHint")) {
      gestureHint.classList.add("visible");
      setTimeout(() => gestureHint.classList.remove("visible"), 4000);
      sessionStorage.setItem("hasSeenGestureHint", "true");
    }
  }

  // Loading state
  lbImg.style.opacity = "0.3";
  lbImg.style.filter = "blur(2px)";
  lbImg.removeAttribute("width");
  lbImg.removeAttribute("height");
  lbImg.style.width = "";
  lbImg.style.height = "";
  lbImg.src = "";
  lbImg.alt = title;
  lbTitle.textContent = removeExtension(title) || "";
  lbTitle.title = title;
  lbCounter.textContent = `${lightboxState.idx + 1} / ${lightboxState.items.length}`;
  lb.setAttribute("aria-hidden", "false");
  lb.style.display = "flex";
  lockScroll();

  // Channel controls
  resetChannelState();
  const showChannels = isMultiChannelImage(title);
  channelControls.style.display = showChannels ? "flex" : "none";
  updateChannelLegend(imageData);

  // Metadata panel
  updateMetadata(imageData);
  if (window.innerWidth > MOBILE_BREAKPOINT) {
    metadataPanel.classList.add("visible");
    metadataToggle.classList.add("active");
  } else {
    metadataPanel.classList.remove("visible");
    metadataToggle.classList.remove("active");
  }

  // Brain template / atlas panel
  const lbIsInVitro = currentFolder && currentFolder.includes(FOLDER_IN_VITRO);

  if (!lbIsInVitro && window.innerWidth > MOBILE_BREAKPOINT) {
    brainTemplatePanel.classList.add("visible");
    brainTemplateToggle.classList.add("active");
    brainTemplateToggle.style.display = "";
    updateAtlasPanel(
      imageData.ccf_index !== undefined ? imageData.ccf_index : null,
      imageData.registered || null
    );
  } else {
    brainTemplatePanel.classList.remove("visible");
    brainTemplateToggle.classList.remove("active");
    if (lbIsInVitro) brainTemplateToggle.style.display = "none";
  }

  // Channel legend visibility
  if (lbIsInVitro) {
    channelLegendToggle.style.display = "none";
    channelLegend.classList.remove("visible");
    channelLegendToggle.classList.remove("active");
  } else {
    channelLegendToggle.style.display = "";
    channelLegend.classList.add("visible");
    channelLegendToggle.classList.add("active");
  }

  // Regions overlay reset
  if (regionsOverlayToggle) {
    if (regionsOverlayCanvas) regionsOverlayCanvas.style.display = "none";
    regionsOverlayState.isVisible = false;
    regionsOverlayState.currentRegisteredData = imageData.registered || null;
    regionsOverlayToggle.classList.remove("active");
    regionsOverlayToggle.textContent = "Show Regions";

    const hasInverseAnnotation = imageData.registered && imageData.registered.inverse_annotation;
    regionsOverlayToggle.style.display =
      hasInverseAnnotation && !lbIsInVitro ? "inline-block" : "none";
  }

  // Swap button
  updateSwapButtonState(swapFolderBtn);

  // Progressive image loading
  const img = new Image();
  img.onload = () => {
    lbImg.src = full;
    lbImg.style.opacity = "1";
    lbImg.style.filter = "";
    if (img.decode) {
      img.decode()
        .then(() => lbImg.classList.add("loaded"))
        .catch(() => lbImg.classList.add("loaded"));
    } else {
      lbImg.classList.add("loaded");
    }
  };
  img.onerror = () => {
    lbImg.style.opacity = "1";
    lbImg.style.filter = "";
    lbImg.src = full;
  };
  img.src = full;

  // Preload adjacent images
  const preload = (src, priority = "low") => {
    const p = new Image();
    p.decoding = "async";
    if (p.loading) p.loading = priority === "high" ? "eager" : "lazy";
    p.src = src;
    return p;
  };
  const prevIdx = (lightboxState.idx - 1 + lightboxState.items.length) % lightboxState.items.length;
  const nextIdx = (lightboxState.idx + 1) % lightboxState.items.length;
  const preloadAdjacentFn = () => {
    for (const adjIdx of [prevIdx, nextIdx]) {
      if (lightboxState.items[adjIdx]) {
        const adjBtn = lightboxState.items[adjIdx].tagName === "FIGURE"
          ? lightboxState.items[adjIdx].querySelector("button")
          : lightboxState.items[adjIdx];
        preload(adjBtn.getAttribute("data-full"), "low");
      }
    }
  };
  if (window.requestIdleCallback) {
    window.requestIdleCallback(preloadAdjacentFn);
  } else {
    setTimeout(preloadAdjacentFn, 100);
  }

  lightboxState.lastActive = document.activeElement;
  lbClose.focus({ preventScroll: true });
}

export function close() {
  lb.setAttribute("aria-hidden", "true");
  lb.style.display = "none";
  lbImg.src = "";
  metadataPanel.classList.remove("visible");
  brainTemplatePanel.classList.remove("visible");
  channelLegend.style.display = "none";

  if (regionsOverlayCanvas) regionsOverlayCanvas.style.display = "none";
  regionsOverlayState.isVisible = false;
  if (regionsOverlayToggle) {
    regionsOverlayToggle.classList.remove("active");
    regionsOverlayToggle.textContent = "Show Regions";
  }

  unlockScroll();
  if (lightboxState.lastActive) lightboxState.lastActive.focus({ preventScroll: true });
}

function next() {
  if (lightboxState.items.length) openAt((lightboxState.idx + 1) % lightboxState.items.length);
}
function prev() {
  if (lightboxState.items.length)
    openAt((lightboxState.idx - 1 + lightboxState.items.length) % lightboxState.items.length);
}

// ─── Touch Helpers ─────────────────────────────────────────────────

function getTouchDistance(t1, t2) {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}
function getTouchCenter(t1, t2) {
  return { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
}

// ─── Init (register all event listeners) ───────────────────────────

export function initLightbox() {
  // Close
  lbClose.addEventListener("click", (e) => { e.stopPropagation(); close(); });

  // Hide / show toolbar
  lbHideToolbar.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!lbTop) return;
    lbTop.classList.toggle("hidden");
    if (lbTop.classList.contains("hidden")) {
      toolbarRestoreIndicator.classList.add("visible");
    } else {
      toolbarRestoreIndicator.classList.remove("visible");
    }
    lbHideToolbar.innerHTML = lbTop.classList.contains("hidden") ? "▼" : "▲";
    lbHideToolbar.title = lbTop.classList.contains("hidden") ? "Show Toolbar (H)" : "Hide Toolbar (H)";
  });

  toolbarRestoreIndicator.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!lbTop) return;
    lbTop.classList.remove("hidden");
    toolbarRestoreIndicator.classList.remove("visible");
    lbHideToolbar.innerHTML = "▲";
    lbHideToolbar.title = "Hide Toolbar (H)";
  });

  // Prev / Next
  lbNext.addEventListener("click", (e) => { e.stopPropagation(); next(); });
  lbPrev.addEventListener("click", (e) => { e.stopPropagation(); prev(); });

  // Prevent toolbar clicks from closing lightbox
  if (lbTop) lbTop.addEventListener("click", (e) => e.stopPropagation());
  if (toolbarGapOverlay) toolbarGapOverlay.addEventListener("click", (e) => e.stopPropagation());

  // Metadata toggle
  metadataToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const isActive = metadataToggle.classList.contains("active");
    metadataToggle.classList.toggle("active", !isActive);
    metadataPanel.classList.toggle("visible", !isActive);
  });
  metadataCloseBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    metadataToggle.classList.remove("active");
    metadataPanel.classList.remove("visible");
  });

  // Atlas panel close
  atlasCloseBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    brainTemplateToggle.classList.remove("active");
    brainTemplatePanel.classList.remove("visible");
  });

  // CCF slice & placeholder → interactive atlas
  if (ccfSliceImage) {
    ccfSliceImage.addEventListener("click", (e) => { e.stopPropagation(); showInteractiveAtlas(); });
  }
  if (atlasBrainImage) {
    atlasBrainImage.style.cursor = "pointer";
    atlasBrainImage.addEventListener("click", (e) => { e.stopPropagation(); showInteractiveAtlas(); });
  }
  const atlasBackBtnEl = document.getElementById("atlasBackBtn");
  if (atlasBackBtnEl) {
    atlasBackBtnEl.addEventListener("click", (e) => { e.stopPropagation(); showCcfSliceView(); });
  }

  // Swap folder buttons
  swapFolderBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!attemptFolderSwap(true)) {
      swapFolderBtn.disabled = true;
      swapFolderBtn.title = "No corresponding folder found";
      setTimeout(() => {
        swapFolderBtn.disabled = false;
        swapFolderBtn.title = "Swap to corresponding in vivo/in vitro folder";
      }, 2000);
    }
  });

  if (pageSwapBtn) {
    pageSwapBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!attemptFolderSwap(false)) {
        pageSwapBtn.disabled = true;
        pageSwapBtn.title = "No corresponding folder found";
        setTimeout(() => {
          pageSwapBtn.disabled = false;
          pageSwapBtn.title = "Swap to corresponding in vivo/in vitro folder";
        }, 2000);
      }
    });
  }

  // Brain template toggle
  if (brainTemplateToggle) {
    brainTemplateToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      brainTemplatePanel.classList.toggle("visible");
      brainTemplateToggle.classList.toggle("active");
    });
  }

  // Regions overlay toggle
  if (regionsOverlayToggle) {
    regionsOverlayToggle.addEventListener("click", async (e) => {
      e.stopPropagation();
      await toggleRegionsOverlay();
    });
  }

  // Zoom display click → reset
  zoomDisplay.addEventListener("click", (e) => { e.stopPropagation(); resetZoom(); });

  // Prevent stage clicks from closing lightbox
  lbStage.addEventListener("click", (e) => e.stopPropagation());

  // ── Click-to-zoom on image ──
  lbImg.addEventListener("click", (e) => {
    if (zoomState.hasDragged) { zoomState.hasDragged = false; return; }
    e.preventDefault();
    e.stopPropagation();
    const zoomFactor = 1.5;
    const newZoom = Math.min(zoomState.zoomLevel * zoomFactor, ZOOM_MAX);
    if (newZoom === zoomState.zoomLevel) return;

    const stageRect = document.querySelector(".lb-stage").getBoundingClientRect();
    const cx = stageRect.width / 2;
    const cy = stageRect.height / 2;
    const mx = e.clientX - stageRect.left - cx;
    const my = e.clientY - stageRect.top - cy;
    const ix = mx / zoomState.zoomLevel - zoomState.panX;
    const iy = my / zoomState.zoomLevel - zoomState.panY;

    zoomState.zoomLevel = newZoom;
    zoomState.panX = mx / zoomState.zoomLevel - ix;
    zoomState.panY = my / zoomState.zoomLevel - iy;
    if (zoomState.zoomLevel > ZOOM_THRESHOLD && lbImgWrapper) lbImgWrapper.classList.add("zoomed");
    updateImageTransform();
  });

  // ── Mouse panning (allowed at any zoom level) ──
  lbImg.addEventListener("mousedown", (e) => {
    e.preventDefault(); e.stopPropagation();
    zoomState.isPanning = true;
    zoomState.hasDragged = false;
    zoomState.panStartX = e.clientX;
    zoomState.panStartY = e.clientY;
    zoomState.lastPanX = zoomState.panX;
    zoomState.lastPanY = zoomState.panY;
    lbImg.style.cursor = "grabbing";
  });
  lbImg.addEventListener("mousemove", (e) => {
    if (zoomState.isPanning) {
      e.preventDefault(); e.stopPropagation();
      const dx = e.clientX - zoomState.panStartX;
      const dy = e.clientY - zoomState.panStartY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) zoomState.hasDragged = true;
      zoomState.panX = zoomState.lastPanX + dx / zoomState.zoomLevel;
      zoomState.panY = zoomState.lastPanY + dy / zoomState.zoomLevel;
      updateImageTransform();
    }
  });
  lbImg.addEventListener("mouseup", (e) => {
    if (zoomState.isPanning) {
      e.stopPropagation();
      zoomState.isPanning = false;
      lbImg.style.cursor = "grab";
    }
  });
  lbImg.addEventListener("mouseleave", () => {
    if (zoomState.isPanning) {
      zoomState.isPanning = false;
      lbImg.style.cursor = "grab";
    }
  });
  lbImg.addEventListener("dragstart", (e) => { e.preventDefault(); return false; });

  // ── Mouse wheel zoom ──
  lbStage.addEventListener("wheel", (e) => {
    e.preventDefault(); e.stopPropagation();
    const factor = 1.15;
    const delta = e.deltaY > 0 ? 1 / factor : factor;
    const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoomState.zoomLevel * delta));
    if (Math.abs(newZoom - zoomState.zoomLevel) < 0.01) return;

    const stageRect = document.querySelector(".lb-stage").getBoundingClientRect();
    const cx = stageRect.width / 2;
    const cy = stageRect.height / 2;
    const mx = e.clientX - stageRect.left - cx;
    const my = e.clientY - stageRect.top - cy;
    const ix = mx / zoomState.zoomLevel - zoomState.panX;
    const iy = my / zoomState.zoomLevel - zoomState.panY;

    zoomState.zoomLevel = newZoom;
    zoomState.panX = mx / zoomState.zoomLevel - ix;
    zoomState.panY = my / zoomState.zoomLevel - iy;

    if (zoomState.zoomLevel > ZOOM_THRESHOLD) {
      if (lbImgWrapper) lbImgWrapper.classList.add("zoomed");
    } else {
      if (lbImgWrapper) lbImgWrapper.classList.remove("zoomed");
      if (zoomState.zoomLevel <= 1) {
        zoomState.zoomLevel = 1;
      }
    }
    updateImageTransform();
  }, { passive: false });

  // ── Lightbox overlay click to close ──
  lb.addEventListener("click", (e) => { if (e.target === lb) close(); });

  // ── Keyboard shortcuts ──
  window.addEventListener("keydown", (e) => {
    // Modals first
    if (e.key === "Escape" && videoModal && videoModal.classList.contains("visible")) {
      e.preventDefault();
      videoModal.classList.remove("visible");
      if (tutorialVideo) tutorialVideo.src = "";
      return;
    }
    if (e.key === "Escape" && readmeModal && readmeModal.classList.contains("visible")) {
      e.preventDefault();
      readmeModal.classList.remove("visible");
      return;
    }
    if (lb.getAttribute("aria-hidden") === "true") return;

    if (e.key === "Escape") { e.preventDefault(); close(); }
    if (e.key === "ArrowRight") { e.preventDefault(); next(); }
    if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }

    // Toggle toolbar
    if (e.key === "h" || e.key === "H") {
      e.preventDefault();
      if (lbTop) {
        lbTop.classList.toggle("hidden");
        lbHideToolbar.innerHTML = lbTop.classList.contains("hidden") ? "▼" : "▲";
        lbHideToolbar.title = lbTop.classList.contains("hidden") ? "Show Toolbar (H)" : "Hide Toolbar (H)";
      }
    }

    // Channel shortcuts
    if (channelControls.style.display === "flex") {
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        channelState.red = channelState.red > 0 ? 0 : 100;
        redSlider.value = channelState.red;
        updateChannelDisplay();
      }
      if (e.key === "g" || e.key === "G") {
        e.preventDefault();
        channelState.green = channelState.green > 0 ? 0 : 100;
        greenSlider.value = channelState.green;
        updateChannelDisplay();
      }
      if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        channelState.blue = channelState.blue > 0 ? 0 : 100;
        blueSlider.value = channelState.blue;
        updateChannelDisplay();
      }
      if (e.key === "0" || e.key === "Enter") {
        e.preventDefault();
        resetChannelState();
      }
      if (e.key === "w" || e.key === "W") {
        e.preventDefault();
        viewState.isGrayscale = !viewState.isGrayscale;
        grayscaleToggle.classList.toggle("active", viewState.isGrayscale);
        updateChannelDisplay();
      }
    }
  });

  // ── Touch gestures ──
  lbStage.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
      touchState.touchStartX = e.touches[0].clientX;
      touchState.touchStartY = e.touches[0].clientY;
      touchState.touchStartTime = Date.now();
      if (zoomState.zoomLevel > ZOOM_THRESHOLD) {
        touchState.isTouchPanning = true;
        touchState.touchPanStartX = e.touches[0].clientX;
        touchState.touchPanStartY = e.touches[0].clientY;
        touchState.lastTouchPanX = zoomState.panX;
        touchState.lastTouchPanY = zoomState.panY;
      }
    } else if (e.touches.length === 2) {
      e.preventDefault();
      touchState.isTouchPanning = false;
      touchState.lastTouchDistance = getTouchDistance(e.touches[0], e.touches[1]);
      touchState.lastTouchZoom = zoomState.zoomLevel;
    }
  }, { passive: false });

  lbStage.addEventListener("touchmove", (e) => {
    if (e.touches.length === 1 && touchState.isTouchPanning && zoomState.zoomLevel > ZOOM_THRESHOLD) {
      e.preventDefault();
      const dx = e.touches[0].clientX - touchState.touchPanStartX;
      const dy = e.touches[0].clientY - touchState.touchPanStartY;
      zoomState.panX = touchState.lastTouchPanX + dx / zoomState.zoomLevel;
      zoomState.panY = touchState.lastTouchPanY + dy / zoomState.zoomLevel;
      updateImageTransform();
    } else if (e.touches.length === 2) {
      e.preventDefault();
      const dist = getTouchDistance(e.touches[0], e.touches[1]);
      const center = getTouchCenter(e.touches[0], e.touches[1]);
      if (touchState.lastTouchDistance) {
        const scale = dist / touchState.lastTouchDistance;
        const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, touchState.lastTouchZoom * scale));

        const stageRect = lbStage.getBoundingClientRect();
        const cx = stageRect.width / 2;
        const cy = stageRect.height / 2;
        const px = center.x - stageRect.left - cx;
        const py = center.y - stageRect.top - cy;
        const ix = px / zoomState.zoomLevel - zoomState.panX;
        const iy = py / zoomState.zoomLevel - zoomState.panY;

        zoomState.zoomLevel = newZoom;
        zoomState.panX = px / zoomState.zoomLevel - ix;
        zoomState.panY = py / zoomState.zoomLevel - iy;

        if (zoomState.zoomLevel > ZOOM_THRESHOLD) {
          if (lbImgWrapper) lbImgWrapper.classList.add("zoomed");
        } else {
          if (lbImgWrapper) lbImgWrapper.classList.remove("zoomed");
          if (zoomState.zoomLevel <= 1) {
            zoomState.zoomLevel = 1;
          }
        }
        updateImageTransform();
      }
    }
  }, { passive: false });

  lbStage.addEventListener("touchend", (e) => {
    if (e.changedTouches.length === 1 && touchState.touchStartX !== null && !touchState.isTouchPanning) {
      const ex = e.changedTouches[0].clientX;
      const ey = e.changedTouches[0].clientY;
      const dt = Date.now() - touchState.touchStartTime;
      const dx = ex - touchState.touchStartX;
      const dy = ey - touchState.touchStartY;

      if (zoomState.zoomLevel <= ZOOM_THRESHOLD && dt < SWIPE_MAX_MS && dy > 100 && Math.abs(dy) > Math.abs(dx) * 2) {
        close();
      } else if (dt < SWIPE_MAX_MS && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 2) {
        dx > 0 ? prev() : next();
      } else if (dt < SWIPE_MAX_MS && Math.abs(dx) < 10 && Math.abs(dy) < 10) {
        // Quick tap → toggle zoom
        const stageRect = lbStage.getBoundingClientRect();
        const cx = stageRect.width / 2;
        const cy = stageRect.height / 2;
        const tx = ex - stageRect.left - cx;
        const ty = ey - stageRect.top - cy;
        if (zoomState.zoomLevel > ZOOM_THRESHOLD) {
          resetZoom();
        } else {
          const newZoom = 2.5;
          const ix = tx / zoomState.zoomLevel - zoomState.panX;
          const iy = ty / zoomState.zoomLevel - zoomState.panY;
          zoomState.zoomLevel = newZoom;
          zoomState.panX = tx / zoomState.zoomLevel - ix;
          zoomState.panY = ty / zoomState.zoomLevel - iy;
          if (lbImgWrapper) lbImgWrapper.classList.add("zoomed");
          updateImageTransform();
        }
      }
    }
    touchState.touchStartX = null;
    touchState.touchStartY = null;
    touchState.touchStartTime = null;
    touchState.isTouchPanning = false;
    if (e.touches.length === 0) {
      touchState.lastTouchDistance = null;
      touchState.lastTouchZoom = 1;
    }
  }, { passive: true });

  lbStage.addEventListener("touchcancel", () => {
    touchState.touchStartX = null;
    touchState.touchStartY = null;
    touchState.touchStartTime = null;
    touchState.isTouchPanning = false;
    touchState.lastTouchDistance = null;
    touchState.lastTouchZoom = 1;
  }, { passive: true });

  // ── README modal ──
  if (readmeBtn) {
    readmeBtn.addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      readmeModal.classList.add("visible");
    });
  }
  if (readmeModalClose) {
    readmeModalClose.addEventListener("click", (e) => {
      e.stopPropagation();
      readmeModal.classList.remove("visible");
    });
  }
  if (readmeModal) {
    readmeModal.addEventListener("click", (e) => {
      if (e.target === readmeModal) readmeModal.classList.remove("visible");
    });
  }

  // ── Video modal ──
  if (videoBtn) {
    videoBtn.addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      if (tutorialVideo) tutorialVideo.src = TUTORIAL_VIDEO_URL;
      videoModal.classList.add("visible");
    });
  }
  if (videoModalClose) {
    videoModalClose.addEventListener("click", (e) => {
      e.stopPropagation();
      videoModal.classList.remove("visible");
      if (tutorialVideo) tutorialVideo.src = "";
    });
  }
  if (videoModal) {
    videoModal.addEventListener("click", (e) => {
      if (e.target === videoModal) {
        videoModal.classList.remove("visible");
        if (tutorialVideo) tutorialVideo.src = "";
      }
    });
  }

  // ── Metadata drawer swipe-down on mobile ──
  if (metadataPanel) {
    let drawerStartY = null;

    metadataPanel.addEventListener("touchstart", (e) => {
      drawerStartY = e.touches[0].clientY;
    }, { passive: true });

    metadataPanel.addEventListener("touchmove", (e) => {
      if (drawerStartY === null) return;
      const dy = e.touches[0].clientY - drawerStartY;
      if (metadataPanel.scrollTop === 0 && dy > 0) {
        e.preventDefault();
        metadataPanel.style.transform = `translateY(${Math.min(dy, metadataPanel.offsetHeight)}px)`;
      }
    }, { passive: false });

    metadataPanel.addEventListener("touchend", (e) => {
      if (drawerStartY === null) return;
      const dy = e.changedTouches[0].clientY - drawerStartY;
      if (metadataPanel.scrollTop === 0 && dy > 100) {
        metadataToggle.classList.remove("active");
        metadataPanel.classList.remove("visible");
      }
      metadataPanel.style.transform = "";
      drawerStartY = null;
    }, { passive: true });
  }
}
