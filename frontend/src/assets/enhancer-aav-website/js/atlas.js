// ── Brain Atlas System ──
// CCF atlas rendering, brain-region CSV loading, boundary extraction,
// region hover interaction, and atlas panel management.

import { ASSETS_BASE_URL, DEBUG, REGION_HOVER_PLACEHOLDER } from "./config.js";
import { parseCSVLine, hexToRgb, yieldToBrowser } from "./utils.js";
import {
  atlasCanvas,
  atlasBrainImage,
  ccfSliceImage,
  atlasRegionInfo,
  atlasPanelTitle,
  brainPositionDisplay,
  regionsOverlayCanvas,
  atlasBackBtn,
} from "./dom.js";
import { atlasState, regionsOverlayState } from "./state.js";
import { parse16bitGrayscalePNG } from "./pngParser.js";

// Circular: imported lazily at runtime
import { redrawRegionsOverlay } from "./regionsOverlay.js";

// ─── CSV Region Mapping ────────────────────────────────────────────

export async function loadBrainRegionMapping() {
  try {
    const response = await fetch(ASSETS_BASE_URL + "1_adult_mouse_brain_graph_mapping.csv");
    const csvText = await response.text();
    const lines = csvText.trim().split("\n");
    const headers = parseCSVLine(lines[0]);

    const idIdx = headers.indexOf("id");
    const acronymIdx = headers.indexOf("acronym");
    const colorIdx = headers.indexOf("color_hex_triplet");
    const nameIdx = headers.indexOf("name");
    const parentIdx = headers.indexOf("parent_structure_id");
    const parcellationIdx = headers.indexOf("parcellation_index");

    const regionMap = new Map();
    const idToInfoMap = new Map();

    for (let i = 1; i < lines.length; i++) {
      const row = parseCSVLine(lines[i]);
      if (row.length >= 8) {
        const id = parseInt(row[idIdx]);
        const parcellationIndex = parseInt(row[parcellationIdx]);
        const parentId = parseInt(row[parentIdx]) || -1;

        const info = {
          id,
          acronym: row[acronymIdx],
          color: row[colorIdx],
          name: row[nameIdx],
          parentId,
          parcellationIndex,
        };

        if (!isNaN(parcellationIndex)) regionMap.set(parcellationIndex, info);
        if (!isNaN(id)) idToInfoMap.set(id, info);
      }
    }

    atlasState.brainRegionMap = regionMap;
    atlasState.brainRegionIdMap = idToInfoMap;
  } catch (error) {
    console.error("Failed to load brain region mapping:", error);
  }
}

// ─── Boundary Extraction (legacy – atlas panel) ────────────────────

export function extractBoundaryPixels16bit(pixels, annWidth, annHeight, canvasWidth, canvasHeight) {
  const scaleX = canvasWidth / annWidth;
  const scaleY = canvasHeight / annHeight;
  const boundaryPixels = [];

  for (let y = 0; y < annHeight; y++) {
    for (let x = 0; x < annWidth; x++) {
      const currentLabel = pixels[y * annWidth + x];
      if (currentLabel === 0) continue;

      let isBoundary = false;
      const neighbors = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ];
      for (const [dx, dy] of neighbors) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < annWidth && ny >= 0 && ny < annHeight) {
          if (pixels[ny * annWidth + nx] !== currentLabel) {
            isBoundary = true;
            break;
          }
        } else {
          isBoundary = true;
          break;
        }
      }

      if (isBoundary) {
        boundaryPixels.push({ x: Math.round(x * scaleX), y: Math.round(y * scaleY) });
      }
    }
  }
  return boundaryPixels;
}

export function drawBoundaries(ctx, boundaryPixels, color = "rgba(0, 255, 255, 0.9)") {
  ctx.fillStyle = color;
  for (const pixel of boundaryPixels) {
    ctx.fillRect(pixel.x, pixel.y, 1, 1);
  }
}

// ─── Boundary Extraction (optimised single-pass for overlay) ───────

export async function extractBoundaryAndDownsampleCombined(
  pixels,
  annWidth,
  annHeight,
  canvasWidth,
  canvasHeight,
  onProgress
) {
  const scaleX = annWidth / canvasWidth;
  const scaleY = annHeight / canvasHeight;

  const imageData = new ImageData(canvasWidth, canvasHeight);
  const data = imageData.data;
  const downsampled = new Uint16Array(canvasWidth * canvasHeight);

  const r = 0,
    g = 255,
    b = 255,
    a = 180;
  const CHUNK_SIZE = 50;

  for (let startRow = 0; startRow < canvasHeight; startRow += CHUNK_SIZE) {
    const endRow = Math.min(startRow + CHUNK_SIZE, canvasHeight);

    for (let cy = startRow; cy < endRow; cy++) {
      const annY = Math.floor(cy * scaleY);
      const rowOffset = cy * canvasWidth;

      for (let cx = 0; cx < canvasWidth; cx++) {
        const annX = Math.floor(cx * scaleX);
        const currentLabel = pixels[annY * annWidth + annX];
        downsampled[rowOffset + cx] = currentLabel;
        if (currentLabel === 0) continue;

        let isBoundary = false;

        const nx1 = annX + Math.max(1, Math.floor(scaleX));
        if (nx1 < annWidth) {
          if (pixels[annY * annWidth + nx1] !== currentLabel) isBoundary = true;
        } else isBoundary = true;

        if (!isBoundary) {
          const ny1 = annY + Math.max(1, Math.floor(scaleY));
          if (ny1 < annHeight) {
            if (pixels[ny1 * annWidth + annX] !== currentLabel) isBoundary = true;
          } else isBoundary = true;
        }
        if (!isBoundary) {
          const nx2 = annX - Math.max(1, Math.floor(scaleX));
          if (nx2 >= 0) {
            if (pixels[annY * annWidth + nx2] !== currentLabel) isBoundary = true;
          } else isBoundary = true;
        }
        if (!isBoundary) {
          const ny2 = annY - Math.max(1, Math.floor(scaleY));
          if (ny2 >= 0) {
            if (pixels[ny2 * annWidth + annX] !== currentLabel) isBoundary = true;
          } else isBoundary = true;
        }

        if (isBoundary) {
          const idx = (rowOffset + cx) * 4;
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = a;
        }
      }
    }

    if (endRow < canvasHeight) {
      if (onProgress) onProgress(Math.round((endRow / canvasHeight) * 100));
      await yieldToBrowser();
    }
  }

  return { imageData, downsampled };
}

export function drawBoundaryImageData(ctx, boundaryImageData) {
  if (boundaryImageData) ctx.putImageData(boundaryImageData, 0, 0);
}

// ─── Region Queries ────────────────────────────────────────────────

export function getRegionAtPosition(canvasX, canvasY) {
  if (!atlasState.annotation16bit) return null;

  const scaleX = atlasState.annotationWidth / atlasState.canvasWidth;
  const scaleY = atlasState.annotationHeight / atlasState.canvasHeight;

  const annX = Math.floor(canvasX * scaleX);
  const annY = Math.floor(canvasY * scaleY);

  if (annX < 0 || annX >= atlasState.annotationWidth || annY < 0 || annY >= atlasState.annotationHeight) return null;

  const label = atlasState.annotation16bit[annY * atlasState.annotationWidth + annX];
  return label === 0 ? null : label;
}

export function getRegionPixels(regionLabel) {
  if (!atlasState.annotation16bit) return [];

  const annWidth = atlasState.annotationWidth;
  const annHeight = atlasState.annotationHeight;
  const scaleX = atlasState.canvasWidth / annWidth;
  const scaleY = atlasState.canvasHeight / annHeight;

  const pixels = [];
  for (let y = 0; y < annHeight; y++) {
    for (let x = 0; x < annWidth; x++) {
      if (atlasState.annotation16bit[y * annWidth + x] === regionLabel) {
        pixels.push({ x: Math.round(x * scaleX), y: Math.round(y * scaleY) });
      }
    }
  }
  return pixels;
}

// ─── Atlas Rendering ───────────────────────────────────────────────

export function redrawAtlas(highlightRegionLabel = null) {
  if (!atlasCanvas || !atlasState.registeredImg) return;

  const ctx = atlasCanvas.getContext("2d");
  ctx.drawImage(atlasState.registeredImg, 0, 0);

  if (highlightRegionLabel !== null) {
    const regionPixels = getRegionPixels(highlightRegionLabel);
    let fillColor = "rgba(255, 200, 0, 0.4)";
    const regionInfo = atlasState.brainRegionMap?.get(highlightRegionLabel);
    if (regionInfo?.color) {
      const [r, g, b] = hexToRgb(regionInfo.color);
      fillColor = `rgba(${r}, ${g}, ${b}, 0.5)`;
    }
    ctx.fillStyle = fillColor;
    for (const pixel of regionPixels) ctx.fillRect(pixel.x, pixel.y, 1, 1);
  }

  drawBoundaries(ctx, atlasState.boundaryPixels);
}

export function updateRegionInfo(regionLabel, canvasX, canvasY) {
  if (!atlasRegionInfo) return;

  if (regionLabel === null) {
    atlasRegionInfo.innerHTML = REGION_HOVER_PLACEHOLDER;
    return;
  }

  const regionPixels = getRegionPixels(regionLabel);
  const pixelCount = regionPixels.length;
  const CCF_PIXEL_SIZE_UM = 25;
  const areaUm2 = pixelCount * CCF_PIXEL_SIZE_UM * CCF_PIXEL_SIZE_UM;
  const areaMm2 = areaUm2 / 1_000_000;
  const areaStr = areaMm2 >= 0.01 ? areaMm2.toFixed(3) + " mm²" : areaUm2.toLocaleString() + " µm²";

  const scaleX = atlasState.annotationWidth / atlasState.canvasWidth;
  const scaleY = atlasState.annotationHeight / atlasState.canvasHeight;
  const annX = Math.floor(canvasX * scaleX);
  const annY = Math.floor(canvasY * scaleY);

  const regionInfo = atlasState.brainRegionMap?.get(regionLabel);

  if (regionInfo) {
    const parentInfo = atlasState.brainRegionIdMap?.get(regionInfo.parentId);
    const parentName = parentInfo ? parentInfo.name : "";
    atlasRegionInfo.innerHTML = `
      <div style="color: #4dabf7; font-weight: 600; margin-bottom: 4px;">${regionInfo.name}</div>
      <div style="color: #ccc; font-size: 10px;">
        <div><strong>Acronym:</strong> ${regionInfo.acronym}</div>
        ${parentName ? `<div><strong>Parent:</strong> ${parentName}</div>` : ""}
        <div style="display: flex; align-items: center; gap: 6px;">
          <strong>Color:</strong>
          <span style="display: inline-block; width: 12px; height: 12px; background: #${regionInfo.color}; border: 1px solid #666; border-radius: 2px;"></span>
          <span>#${regionInfo.color}</span>
        </div>
        <div><strong>ID:</strong> ${regionLabel} | <strong>Area:</strong> ${areaStr}</div>
      </div>
    `;
  } else {
    atlasRegionInfo.innerHTML = `
      <div style="color: #4dabf7; font-weight: 600; margin-bottom: 4px;">Region Info</div>
      <div style="color: #ccc;">
        <div><strong>Label ID:</strong> ${regionLabel}</div>
        <div><strong>Area:</strong> ${areaStr}</div>
        <div><strong>Position:</strong> (${annX}, ${annY})</div>
      </div>
    `;
  }
}

// ─── Atlas Panel Management ────────────────────────────────────────

export async function renderAtlasWithBoundaries() {
  if (!atlasCanvas) {
    DEBUG && console.log("Atlas canvas not found");
    return;
  }

  const regData = atlasState.currentRegisteredData;
  if (!regData?.forward_image || !regData?.forward_annotation) {
    DEBUG && console.log("No registered data available for this image");
    if (atlasBrainImage) {
      atlasCanvas.style.display = "none";
      atlasBrainImage.style.display = "block";
    }
    return;
  }

  const registeredPath = ASSETS_BASE_URL + regData.forward_image;
  const annotationPath = ASSETS_BASE_URL + regData.forward_annotation;

  DEBUG && console.log("Rendering atlas with boundaries...");
  DEBUG && console.log("Registered image:", registeredPath);
  DEBUG && console.log("Annotation:", annotationPath);
  const ctx = atlasCanvas.getContext("2d");

  try {
    const registeredImg = new Image();
    const registeredLoaded = new Promise((resolve, reject) => {
      registeredImg.onload = () => resolve();
      registeredImg.onerror = reject;
    });
    registeredImg.src = registeredPath;

    const annotation16bitPromise = parse16bitGrayscalePNG(annotationPath);

    await registeredLoaded;
    const { pixels: annotation16bit, width: annWidth, height: annHeight } = await annotation16bitPromise;

    DEBUG && console.log("Both images loaded. Annotation dimensions:", annWidth, "x", annHeight);

    atlasCanvas.width = registeredImg.width;
    atlasCanvas.height = registeredImg.height;
    DEBUG && console.log("Canvas dimensions set to:", atlasCanvas.width, "x", atlasCanvas.height);

    atlasState.registeredImg = registeredImg;
    atlasState.canvasWidth = atlasCanvas.width;
    atlasState.canvasHeight = atlasCanvas.height;
    atlasState.annotation16bit = annotation16bit;
    atlasState.annotationWidth = annWidth;
    atlasState.annotationHeight = annHeight;

    ctx.drawImage(registeredImg, 0, 0);

    atlasState.boundaryPixels = extractBoundaryPixels16bit(
      annotation16bit,
      annWidth,
      annHeight,
      atlasCanvas.width,
      atlasCanvas.height
    );
    drawBoundaries(ctx, atlasState.boundaryPixels);

    setupAtlasHoverInteraction();

    DEBUG && console.log("Atlas rendering complete");
    atlasState.interactiveMode = true;
  } catch (error) {
    console.error("Failed to load atlas images:", error);
    if (atlasBrainImage) {
      atlasCanvas.style.display = "none";
      atlasBrainImage.style.display = "block";
    }
  }
}

export function updateAtlasPanel(ccfIndex, registeredData = null) {
  DEBUG &&
    console.log(
      "Updating atlas panel with CCF index:",
      ccfIndex,
      "registered data:",
      registeredData ? "available" : "none"
    );
  atlasState.currentCcfIndex = ccfIndex;
  atlasState.currentRegisteredData = registeredData;
  atlasState.interactiveMode = false;

  if (atlasPanelTitle) atlasPanelTitle.textContent = "Location in Atlas";
  if (atlasBackBtn) atlasBackBtn.style.display = "none";

  if (atlasCanvas) atlasCanvas.style.display = "none";
  if (atlasBrainImage) atlasBrainImage.style.display = "none";
  if (ccfSliceImage) ccfSliceImage.style.display = "none";

  if (ccfIndex !== null && ccfIndex !== undefined) {
    const paddedIndex = String(ccfIndex).padStart(3, "0");
    const ccfImageUrl = ASSETS_BASE_URL + "ccf/" + paddedIndex + ".webp";
    DEBUG && console.log("Loading CCF slice:", ccfImageUrl);

    if (ccfSliceImage) {
      ccfSliceImage.src = ccfImageUrl;
      ccfSliceImage.style.display = "block";

      const hasRegistered = registeredData?.forward_image && registeredData?.forward_annotation;
      ccfSliceImage.title = hasRegistered
        ? "Click to view interactive registered brain with region boundaries (CCF slice " + ccfIndex + ")"
        : "CCF slice " + ccfIndex + " (no registered data available for interactive view)";

      if (atlasRegionInfo) {
        atlasRegionInfo.innerHTML = hasRegistered
          ? `<div style="color: #aaa;">
               <strong>CCF Slice:</strong> ${ccfIndex}<br>
               <span style="font-size: 10px; color: #4dabf7;"><strong>Click the image</strong> for an interactive atlas with region boundaries.</span>
             </div>`
          : `<div style="color: #aaa;">
               <strong>CCF Slice:</strong> ${ccfIndex}<br>
               <span style="font-size: 10px; color: #666;">No registered boundaries available for this image.</span>
             </div>`;
      }
    }
  } else {
    if (atlasBrainImage) {
      atlasBrainImage.style.display = "block";
      atlasBrainImage.title = "No atlas data available for this image";
    }
    if (atlasRegionInfo) {
      atlasRegionInfo.innerHTML = `<div style="color: #888;">No CCF mapping available for this image</div>`;
    }
  }
}

export async function showInteractiveAtlas() {
  DEBUG && console.log("Showing interactive atlas...");
  const regData = atlasState.currentRegisteredData;
  if (!regData?.forward_image || !regData?.forward_annotation) {
    DEBUG && console.log("No registered data available, cannot show interactive atlas");
    return;
  }

  atlasState.interactiveMode = true;

  if (ccfSliceImage) ccfSliceImage.style.display = "none";
  if (atlasBrainImage) atlasBrainImage.style.display = "none";
  if (atlasPanelTitle) atlasPanelTitle.textContent = "Registered Boundaries";
  if (atlasBackBtn) atlasBackBtn.style.display = "flex";

  if (atlasCanvas) {
    atlasCanvas.style.display = "block";
    await renderAtlasWithBoundaries();
  }

  if (brainPositionDisplay) {
    brainPositionDisplay.innerHTML =
      '<p style="color: #999; font-size: 0.9em;">Current section registered to the Allen Common Coordinate Framework Brain Atlas</p>';
  }
  if (atlasRegionInfo) {
    atlasRegionInfo.innerHTML = `<div style="color: #888;">Hover over a region to see details</div>`;
  }
}

export function showCcfSliceView() {
  DEBUG && console.log("Going back to CCF slice view...");
  if (brainPositionDisplay) brainPositionDisplay.innerHTML = "";
  updateAtlasPanel(atlasState.currentCcfIndex, atlasState.currentRegisteredData);
}

// ─── Atlas Hover Interaction ───────────────────────────────────────

export function setupAtlasHoverInteraction() {
  if (!atlasCanvas) return;
  atlasCanvas.style.cursor = "crosshair";

  atlasCanvas.addEventListener("mousemove", e => {
    const rect = atlasCanvas.getBoundingClientRect();
    const scaleX = atlasCanvas.width / rect.width;
    const scaleY = atlasCanvas.height / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    const regionLabel = getRegionAtPosition(canvasX, canvasY);

    if (regionLabel !== atlasState.currentHoverRegion) {
      atlasState.currentHoverRegion = regionLabel;
      redrawAtlas(regionLabel);
      updateRegionInfo(regionLabel, canvasX, canvasY);

      // Sync to regions overlay if visible
      if (regionsOverlayState.isVisible && regionsOverlayCanvas) {
        regionsOverlayState.currentHoverRegion = regionLabel;
        redrawRegionsOverlay(regionLabel);
      }
    }
  });

  atlasCanvas.addEventListener("mouseleave", () => {
    if (atlasState.currentHoverRegion !== null) {
      atlasState.currentHoverRegion = null;
      redrawAtlas(null);
      if (atlasRegionInfo) atlasRegionInfo.innerHTML = REGION_HOVER_PLACEHOLDER;

      if (regionsOverlayState.isVisible && regionsOverlayCanvas) {
        regionsOverlayState.currentHoverRegion = null;
        redrawRegionsOverlay(null);
      }
    }
  });
}
