// ── Channel Controls ──
// RGB channel sliders, gain, grayscale toggle, SVG color-matrix filter,
// channel legend, and click-to-edit on value displays.

import { CHANNEL_DEFAULT, GAIN_SLIDER_MAX, FOLDER_IN_VITRO } from './config.js';
import { getFolderPath } from './utils.js';
import {
  lbImg,
  redSlider, greenSlider, blueSlider, gainSlider,
  redValue, greenValue, blueValue, gainValue,
  resetChannels, grayscaleToggle,
  channelControls, channelLegend, channelLegendToggle
} from './dom.js';
import { channelState, viewState } from './state.js';
import { getFolderMetadata } from './data.js';
import { currentFolderFromHash } from './gallery.js';

// ─── Filter Construction ───────────────────────────────────────────

export function createChannelFilter(r, g, b, gain = 1.0) {
  const existingFilter = document.getElementById("channelFilterSVG");
  if (existingFilter) existingFilter.remove();

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.id = "channelFilterSVG";
  svg.style.position = "absolute";
  svg.style.width = "0";
  svg.style.height = "0";

  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
  filter.id = "channelFilter";

  const colorMatrix = document.createElementNS("http://www.w3.org/2000/svg", "feColorMatrix");
  colorMatrix.setAttribute("type", "matrix");

  if (viewState.isGrayscale) {
    const rW = 0.299 * r * gain;
    const gW = 0.587 * g * gain;
    const bW = 0.114 * b * gain;
    colorMatrix.setAttribute("values",
      `${rW} ${gW} ${bW} 0 0 ${rW} ${gW} ${bW} 0 0 ${rW} ${gW} ${bW} 0 0 0 0 0 1 0`);
  } else {
    colorMatrix.setAttribute("values",
      `${r * gain} 0 0 0 0 0 ${g * gain} 0 0 0 0 0 ${b * gain} 0 0 0 0 0 1 0`);
  }

  filter.appendChild(colorMatrix);
  defs.appendChild(filter);
  svg.appendChild(defs);
  document.body.appendChild(svg);
  return svg;
}

// ─── Display Update ────────────────────────────────────────────────

export function updateChannelDisplay() {
  redValue.textContent   = channelState.red   + "%";
  greenValue.textContent = channelState.green + "%";
  blueValue.textContent  = channelState.blue  + "%";
  gainValue.textContent  = channelState.gain  + "%";

  const r = channelState.red   / 100;
  const g = channelState.green / 100;
  const b = channelState.blue  / 100;
  const gain = channelState.gain / 100;

  createChannelFilter(r, g, b, gain);
  lbImg.style.filter = `url(#channelFilter)`;

  // Update legend dot disabled state
  const colors = [
    { cls: ".legend-item.red-legend .legend-color",   val: channelState.red },
    { cls: ".legend-item.green-legend .legend-color", val: channelState.green },
    { cls: ".legend-item.blue-legend .legend-color",  val: channelState.blue }
  ];
  for (const { cls, val } of colors) {
    const el = document.querySelector(cls);
    if (el) el.classList.toggle("disabled", val === 0);
  }
}

// ─── Reset ─────────────────────────────────────────────────────────

export function resetChannelState() {
  channelState.red   = CHANNEL_DEFAULT;
  channelState.green = CHANNEL_DEFAULT;
  channelState.blue  = CHANNEL_DEFAULT;
  channelState.gain  = CHANNEL_DEFAULT;

  redSlider.value   = 100;
  greenSlider.value = 100;
  blueSlider.value  = 100;
  gainSlider.value  = 100;

  viewState.isGrayscale = false;
  grayscaleToggle.classList.remove("active");
  updateChannelDisplay();
}

// ─── Click-to-edit on value spans ──────────────────────────────────

export function makeChannelValueEditable(element, channel) {
  const currentValue = channelState[channel];
  const minValue = 0;
  const maxValue = channel === "gain" ? GAIN_SLIDER_MAX : CHANNEL_DEFAULT;

  const input = document.createElement("input");
  input.type = "number";
  input.min = minValue.toString();
  input.max = maxValue.toString();
  input.value = currentValue;
  input.className = "channel-value-input";

  element.style.display = "none";
  element.parentNode.insertBefore(input, element.nextSibling);
  input.focus();
  input.select();

  function finishEdit() {
    const newValue = Math.max(minValue, Math.min(maxValue, parseInt(input.value) || 0));
    channelState[channel] = newValue;

    if (channel === "red")   redSlider.value   = newValue;
    if (channel === "green") greenSlider.value = newValue;
    if (channel === "blue")  blueSlider.value  = newValue;
    if (channel === "gain")  gainSlider.value  = newValue;

    updateChannelDisplay();
    input.remove();
    element.style.display = "";
  }

  input.addEventListener("blur", finishEdit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); finishEdit(); }
    else if (e.key === "Escape") { e.preventDefault(); input.remove(); element.style.display = ""; }
  });
}

// ─── Multi-channel Detection ───────────────────────────────────────

export function isMultiChannelImage(filename) {
  const currentFolder = currentFolderFromHash();
  if (currentFolder && currentFolder.includes(FOLDER_IN_VITRO)) return false;
  if (currentFolder && currentFolder.includes("BEC enhancer")) return true;

  const patterns = [
    /_ch\d{2}\./,
    /_(red|green|blue|dapi|fitc|cy\d)_?/i,
    /merged/i,
    /Layer\d+\./i, /slice\d+\./i, /z\d+\./i,
    /frame\d+\./i, /section\d+\./i,
    /\.tif$/i, /\.tiff$/i
  ];
  return patterns.some(p => p.test(filename));
}

// ─── Channel Legend ────────────────────────────────────────────────

export function updateChannelLegend(imageData) {
  const redLabel   = document.getElementById("redLegendLabel");
  const greenLabel = document.getElementById("greenLegendLabel");
  const blueLabel  = document.getElementById("blueLegendLabel");

  let metadata = imageData.metadata || null;

  if (!metadata || (!metadata["Red Channel (exposure)"] &&
      !metadata["Green Channel (exposure)"] && !metadata["Blue Channel (exposure)"])) {
    const imagePath = imageData.src || "";
    const folderPath = getFolderPath(imagePath);
    metadata = getFolderMetadata(folderPath);
  }

  const redChannel   = metadata ? metadata["Red Channel (exposure)"]   : null;
  const greenChannel = metadata ? metadata["Green Channel (exposure)"] : null;
  const blueChannel  = metadata ? metadata["Blue Channel (exposure)"]  : null;

  if (redChannel || greenChannel || blueChannel) {
    redLabel.textContent   = redChannel   || "Red Channel";
    greenLabel.textContent = greenChannel || "Green Channel";
    blueLabel.textContent  = blueChannel  || "Blue Channel";
    channelLegend.style.display = "block";
  } else {
    channelLegend.style.display = "none";
  }
}

// ─── Init (register event listeners) ───────────────────────────────

export function initChannels() {
  redSlider.addEventListener("input",   (e) => { e.stopPropagation(); channelState.red   = parseInt(e.target.value); updateChannelDisplay(); });
  greenSlider.addEventListener("input", (e) => { e.stopPropagation(); channelState.green = parseInt(e.target.value); updateChannelDisplay(); });
  blueSlider.addEventListener("input",  (e) => { e.stopPropagation(); channelState.blue  = parseInt(e.target.value); updateChannelDisplay(); });
  gainSlider.addEventListener("input",  (e) => { e.stopPropagation(); channelState.gain  = parseInt(e.target.value); updateChannelDisplay(); });

  // RGB toggle buttons (mobile)
  const rgbToggleButtons = document.querySelectorAll(".channel-btn[data-channel]");
  rgbToggleButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      const channel = button.getAttribute("data-channel");

      if (channelState[channel] === 100) { channelState[channel] = 0; button.classList.add("disabled"); }
      else { channelState[channel] = 100; button.classList.remove("disabled"); }

      const sliderMap = { red: redSlider, green: greenSlider, blue: blueSlider };
      if (sliderMap[channel]) sliderMap[channel].value = channelState[channel];
      updateChannelDisplay();
    });
  });

  resetChannels.addEventListener("click", (e) => {
    e.stopPropagation();
    resetChannelState();
    rgbToggleButtons.forEach(b => b.classList.remove("disabled"));
  });

  grayscaleToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    viewState.isGrayscale = !viewState.isGrayscale;
    grayscaleToggle.classList.toggle("active", viewState.isGrayscale);
    updateChannelDisplay();
  });

  // Click-to-edit on value displays
  redValue.addEventListener("click",   (e) => { e.stopPropagation(); makeChannelValueEditable(redValue,   "red"); });
  greenValue.addEventListener("click", (e) => { e.stopPropagation(); makeChannelValueEditable(greenValue, "green"); });
  blueValue.addEventListener("click",  (e) => { e.stopPropagation(); makeChannelValueEditable(blueValue,  "blue"); });
  gainValue.addEventListener("click",  (e) => { e.stopPropagation(); makeChannelValueEditable(gainValue,  "gain"); });

  // Channel legend toggle
  if (channelLegendToggle) {
    channelLegendToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      channelLegend.classList.toggle("visible");
      channelLegendToggle.classList.toggle("active");
    });
  }

  // Legend close button
  const legendCloseBtn = document.getElementById("legendCloseBtn");
  if (legendCloseBtn) {
    legendCloseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      channelLegendToggle.classList.remove("active");
      channelLegend.classList.remove("visible");
    });
  }
}
