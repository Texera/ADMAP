// ── Regions Overlay ──
// Draws brain-region boundaries on top of the main lightbox image,
// with hover interaction and tooltip display.

import { ASSETS_BASE_URL, DEBUG, ZOOM_THRESHOLD } from './config.js';
import { hexToRgb } from './utils.js';
import {
  regionsOverlayCanvas, regionsOverlayToggle,
  regionTooltip, regionTooltipName, regionTooltipDetails,
  lbImg, lbImgWrapper, atlasCanvas
} from './dom.js';
import { atlasState, regionsOverlayState, zoomState } from './state.js';
import { parse16bitGrayscalePNG } from './pngParser.js';

// Circular: accessed only at runtime in event handlers
import {
  extractBoundaryAndDownsampleCombined, drawBoundaryImageData,
  redrawAtlas, updateRegionInfo
} from './atlas.js';

// ─── Toggle / Show / Hide ──────────────────────────────────────────

export async function toggleRegionsOverlay() {
  if (!regionsOverlayState.currentRegisteredData?.inverse_annotation) {
    DEBUG && console.log("No inverse annotation available for this image");
    return;
  }

  regionsOverlayState.isVisible = !regionsOverlayState.isVisible;
  regionsOverlayToggle.classList.toggle("active");

  if (regionsOverlayState.isVisible) {
    await showRegionsOverlay();
  } else {
    hideRegionsOverlay();
  }
}

export async function showRegionsOverlay() {
  const inversePath = regionsOverlayState.currentRegisteredData.inverse_annotation;

  // Load new annotation data if path changed
  if (regionsOverlayState.currentInversePath !== inversePath) {
    regionsOverlayState.isLoading = true;
    regionsOverlayToggle.classList.add("loading");
    regionsOverlayToggle.textContent = "Loading...";

    try {
      DEBUG && console.log("Loading inverse annotation:", inversePath);
      const fullPath = ASSETS_BASE_URL + inversePath;
      const { pixels, width, height } = await parse16bitGrayscalePNG(fullPath);

      regionsOverlayState.inverseAnnotation16bit = pixels;
      regionsOverlayState.inverseWidth  = width;
      regionsOverlayState.inverseHeight = height;
      regionsOverlayState.currentInversePath = inversePath;

      DEBUG && console.log("Inverse annotation loaded:", width, "x", height);
    } catch (error) {
      console.error("Failed to load inverse annotation:", error);
      regionsOverlayState.isVisible = false;
      regionsOverlayToggle.classList.remove("active", "loading");
      regionsOverlayToggle.textContent = "Show Regions";
      return;
    }

    regionsOverlayState.isLoading = false;
    regionsOverlayToggle.classList.remove("loading");
    regionsOverlayToggle.textContent = "Hide Regions";
  } else {
    regionsOverlayToggle.textContent = "Hide Regions";
  }

  // Position canvas to match displayed image
  positionRegionsOverlay();

  if (regionsOverlayCanvas) {
    const canvasWidth  = regionsOverlayCanvas.width;
    const canvasHeight = regionsOverlayCanvas.height;

    const needsRecompute = !regionsOverlayState.boundaryImageData ||
      regionsOverlayState.cachedCanvasWidth  !== canvasWidth ||
      regionsOverlayState.cachedCanvasHeight !== canvasHeight;

    if (needsRecompute) {
      const { pixels, width: annWidth, height: annHeight } = {
        pixels: regionsOverlayState.inverseAnnotation16bit,
        width:  regionsOverlayState.inverseWidth,
        height: regionsOverlayState.inverseHeight
      };

      regionsOverlayToggle.classList.add("loading");

      const { imageData, downsampled } = await extractBoundaryAndDownsampleCombined(
        pixels, annWidth, annHeight, canvasWidth, canvasHeight,
        (progress) => { regionsOverlayToggle.textContent = `Processing ${progress}%`; }
      );

      regionsOverlayToggle.classList.remove("loading");
      regionsOverlayToggle.textContent = "Hide Regions";

      regionsOverlayState.boundaryImageData      = imageData;
      regionsOverlayState.downsampledAnnotation   = downsampled;
      regionsOverlayState.downsampledWidth         = canvasWidth;
      regionsOverlayState.downsampledHeight        = canvasHeight;
      regionsOverlayState.cachedCanvasWidth        = canvasWidth;
      regionsOverlayState.cachedCanvasHeight       = canvasHeight;
    }

    const ctx = regionsOverlayCanvas.getContext("2d");
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    drawBoundaryImageData(ctx, regionsOverlayState.boundaryImageData);

    regionsOverlayCanvas.style.display = "block";
    setupRegionsOverlayHoverInteraction();
  }
}

export function hideRegionsOverlay() {
  if (regionsOverlayCanvas) {
    regionsOverlayCanvas.style.display      = "none";
    regionsOverlayCanvas.style.pointerEvents = "none";
  }
  if (regionTooltip) regionTooltip.style.display = "none";
  regionsOverlayToggle.textContent = "Show Regions";
}

export function positionRegionsOverlay() {
  if (!regionsOverlayCanvas || !lbImg) return;

  const imgWidth  = lbImg.offsetWidth;
  const imgHeight = lbImg.offsetHeight;
  if (imgWidth === 0 || imgHeight === 0) return;

  const maxDim = 1200;
  const aspect = imgWidth / imgHeight;
  if (imgWidth > imgHeight) {
    regionsOverlayCanvas.width  = Math.min(maxDim, imgWidth);
    regionsOverlayCanvas.height = regionsOverlayCanvas.width / aspect;
  } else {
    regionsOverlayCanvas.height = Math.min(maxDim, imgHeight);
    regionsOverlayCanvas.width  = regionsOverlayCanvas.height * aspect;
  }
}

// ─── Region Query ──────────────────────────────────────────────────

export function getRegionAtOverlayPosition(canvasX, canvasY) {
  if (regionsOverlayState.downsampledAnnotation) {
    const dsWidth  = regionsOverlayState.downsampledWidth;
    const dsHeight = regionsOverlayState.downsampledHeight;
    const cw = regionsOverlayCanvas.width;
    const ch = regionsOverlayCanvas.height;

    const dsX = Math.floor((canvasX / cw) * dsWidth);
    const dsY = Math.floor((canvasY / ch) * dsHeight);
    if (dsX < 0 || dsX >= dsWidth || dsY < 0 || dsY >= dsHeight) return null;

    const label = regionsOverlayState.downsampledAnnotation[dsY * dsWidth + dsX];
    return label === 0 ? null : label;
  }

  // Fallback to full resolution
  if (!regionsOverlayState.inverseAnnotation16bit) return null;
  const annWidth  = regionsOverlayState.inverseWidth;
  const annHeight = regionsOverlayState.inverseHeight;
  const cw = regionsOverlayCanvas.width;
  const ch = regionsOverlayCanvas.height;

  const scaleX = annWidth / cw;
  const scaleY = annHeight / ch;
  const annX = Math.floor(canvasX * scaleX);
  const annY = Math.floor(canvasY * scaleY);
  if (annX < 0 || annX >= annWidth || annY < 0 || annY >= annHeight) return null;

  const label = regionsOverlayState.inverseAnnotation16bit[annY * annWidth + annX];
  return label === 0 ? null : label;
}

// ─── Redraw with highlight ─────────────────────────────────────────

export function redrawRegionsOverlay(highlightRegionLabel = null) {
  if (!regionsOverlayCanvas || !regionsOverlayState.isVisible) return;

  const ctx = regionsOverlayCanvas.getContext("2d");
  const canvasWidth  = regionsOverlayCanvas.width;
  const canvasHeight = regionsOverlayCanvas.height;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  if (highlightRegionLabel !== null && regionsOverlayState.downsampledAnnotation) {
    const dsWidth     = regionsOverlayState.downsampledWidth;
    const dsHeight    = regionsOverlayState.downsampledHeight;
    const downsampled = regionsOverlayState.downsampledAnnotation;

    let r = 255, g = 200, b = 0, a = 100;
    const regionInfo = atlasState.brainRegionMap?.get(highlightRegionLabel);
    if (regionInfo?.color) { [r, g, b] = hexToRgb(regionInfo.color); a = 128; }

    const highlightData = ctx.createImageData(dsWidth, dsHeight);
    const data = highlightData.data;
    for (let i = 0; i < downsampled.length; i++) {
      if (downsampled[i] === highlightRegionLabel) {
        const idx = i * 4;
        data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = a;
      }
    }

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = dsWidth;
    tempCanvas.height = dsHeight;
    tempCanvas.getContext("2d").putImageData(highlightData, 0, 0);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tempCanvas, 0, 0, canvasWidth, canvasHeight);
  }

  // Composite boundaries on top
  if (regionsOverlayState.boundaryImageData) {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width  = canvasWidth;
    tempCanvas.height = canvasHeight;
    tempCanvas.getContext("2d").putImageData(regionsOverlayState.boundaryImageData, 0, 0);
    ctx.drawImage(tempCanvas, 0, 0);
  }
}

// ─── Tooltip ───────────────────────────────────────────────────────

export function showRegionTooltip(regionLabel, mouseX, mouseY) {
  if (!regionTooltip || !regionTooltipName || !regionTooltipDetails) return;

  if (regionLabel === null) { regionTooltip.style.display = "none"; return; }

  const regionInfo = atlasState.brainRegionMap?.get(regionLabel);

  if (regionInfo) {
    const parentInfo = atlasState.brainRegionIdMap?.get(regionInfo.parentId);
    const parentName = parentInfo ? parentInfo.name : '';

    regionTooltipName.innerHTML = `
      <span class="color-swatch" style="background: #${regionInfo.color};"></span>
      ${regionInfo.name}
    `;

    let details = `<div><strong>Acronym:</strong> ${regionInfo.acronym}</div>`;
    if (parentName) details += `<div><strong>Parent:</strong> ${parentName}</div>`;
    details += `<div><strong>ID:</strong> ${regionLabel}</div>`;
    regionTooltipDetails.innerHTML = details;
  } else {
    regionTooltipName.innerHTML   = `Region ID: ${regionLabel}`;
    regionTooltipDetails.innerHTML = '';
  }

  regionTooltip.style.left    = mouseX + "px";
  regionTooltip.style.top     = mouseY + "px";
  regionTooltip.style.display = "block";

  const tooltipRect = regionTooltip.getBoundingClientRect();
  if (tooltipRect.right  > window.innerWidth)  regionTooltip.style.left = (mouseX - tooltipRect.width  - 30) + "px";
  if (tooltipRect.bottom > window.innerHeight) regionTooltip.style.top  = (mouseY - tooltipRect.height - 30) + "px";
}

// ─── Hover Interaction ─────────────────────────────────────────────

export function setupRegionsOverlayHoverInteraction() {
  if (!regionsOverlayCanvas) return;

  regionsOverlayCanvas.style.pointerEvents = "auto";
  regionsOverlayCanvas.style.cursor        = "crosshair";

  // Remove old listeners
  regionsOverlayCanvas.onmousemove  = null;
  regionsOverlayCanvas.onmouseleave = null;

  regionsOverlayCanvas.onmousemove = (e) => {
    const rect = regionsOverlayCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const canvasX = (mouseX / rect.width)  * regionsOverlayCanvas.width;
    const canvasY = (mouseY / rect.height) * regionsOverlayCanvas.height;

    const regionLabel = getRegionAtOverlayPosition(canvasX, canvasY);

    if (regionLabel !== regionsOverlayState.currentHoverRegion) {
      regionsOverlayState.currentHoverRegion = regionLabel;
      redrawRegionsOverlay(regionLabel);

      // Sync to atlas panel if visible
      if (atlasCanvas && atlasCanvas.style.display !== "none" && atlasState.registeredImg) {
        atlasState.currentHoverRegion = regionLabel;
        redrawAtlas(regionLabel);

        if (regionLabel && atlasState.annotation16bit) {
          updateRegionInfo(regionLabel, atlasState.canvasWidth / 2, atlasState.canvasHeight / 2);
        } else {
          updateRegionInfo(null, 0, 0);
        }
      }
    }

    showRegionTooltip(regionLabel, e.clientX, e.clientY);
  };

  regionsOverlayCanvas.onmouseleave = () => {
    if (regionsOverlayState.currentHoverRegion !== null) {
      regionsOverlayState.currentHoverRegion = null;
      redrawRegionsOverlay(null);

      if (atlasCanvas && atlasCanvas.style.display !== "none" && atlasState.registeredImg) {
        atlasState.currentHoverRegion = null;
        redrawAtlas(null);
        updateRegionInfo(null, 0, 0);
      }
    }
    showRegionTooltip(null, 0, 0);
  };

  // Forward panning events
  regionsOverlayCanvas.onmousedown = (e) => {
    showRegionTooltip(null, 0, 0);
    if (zoomState.zoomLevel > ZOOM_THRESHOLD) {
      e.preventDefault(); e.stopPropagation();
      zoomState.isPanning  = true;
      zoomState.hasDragged = false;
      zoomState.panStartX  = e.clientX;
      zoomState.panStartY  = e.clientY;
      zoomState.lastPanX   = zoomState.panX;
      zoomState.lastPanY   = zoomState.panY;
      regionsOverlayCanvas.style.cursor = "grabbing";
      lbImg.style.cursor = "grabbing";
    }
  };

  regionsOverlayCanvas.addEventListener("mousemove", (e) => {
    if (zoomState.isPanning && zoomState.zoomLevel > ZOOM_THRESHOLD) {
      e.preventDefault(); e.stopPropagation();
      const deltaX = e.clientX - zoomState.panStartX;
      const deltaY = e.clientY - zoomState.panStartY;
      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) zoomState.hasDragged = true;
      zoomState.panX = zoomState.lastPanX + deltaX / zoomState.zoomLevel;
      zoomState.panY = zoomState.lastPanY + deltaY / zoomState.zoomLevel;

      // Inline transform update (avoids circular import of updateImageTransform)
      if (lbImgWrapper) {
        lbImgWrapper.style.transform = `scale(${zoomState.zoomLevel}) translate(${zoomState.panX}px, ${zoomState.panY}px)`;
      }
    }
  });

  regionsOverlayCanvas.onmouseup = () => {
    if (zoomState.isPanning) {
      zoomState.isPanning = false;
      regionsOverlayCanvas.style.cursor = "crosshair";
      lbImg.style.cursor = zoomState.zoomLevel > ZOOM_THRESHOLD ? "grab" : "default";
    }
  };

  // Forward wheel events for zooming
  regionsOverlayCanvas.addEventListener("wheel", (e) => {
    e.preventDefault(); e.stopPropagation();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(1, Math.min(5, zoomState.zoomLevel + delta));
    if (newZoom !== zoomState.zoomLevel) {
      zoomState.zoomLevel = newZoom;
      if (lbImgWrapper) {
        lbImgWrapper.style.transform = `scale(${zoomState.zoomLevel}) translate(${zoomState.panX}px, ${zoomState.panY}px)`;
      }
      if (zoomState.zoomLevel <= ZOOM_THRESHOLD) {
        zoomState.panX = 0; zoomState.panY = 0;
        if (lbImgWrapper) {
          lbImgWrapper.style.transform = `scale(${zoomState.zoomLevel}) translate(0px, 0px)`;
        }
      }
    }
  }, { passive: false });
}


