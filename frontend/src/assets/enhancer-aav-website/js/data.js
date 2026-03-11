// ── Data Loading & Folder Metadata ──
// Fetches the manifest, builds folder/image indices, and provides
// metadata lookup and folder-level metadata panel rendering.

import { ASSETS_BASE_URL } from './config.js';
import { getFolderPath } from './utils.js';
import { foldersView } from './dom.js';
import { dataState } from './state.js';

// ─── Data Structures (populated by loadManifest) ───────────────────

export const byFolder    = new Map();   // folderPath to image[]
export const allFolders  = new Set();
export const folderPaths = [];          // sorted unique folder paths

// ─── Manifest Loading ──────────────────────────────────────────────

export async function loadManifest() {
  let data;
  try {
    const res = await fetch(ASSETS_BASE_URL + "images.json", { cache: "no-store" });
    if (!res.ok) throw new Error(res.status + " " + res.statusText);
    data = await res.json();
  } catch (e) {
    foldersView.innerHTML =
      `<p style="color:#ffb3b3">Couldn't load <code>images.json</code>: ${e.message}</p>`;
    return;
  }

  const records = [];
  dataState.folderMetadata = new Map();

  if (data.folders) {
    for (const [folderPath, folderData] of Object.entries(data.folders)) {
      // Store folder metadata
      if (folderData.metadata && Object.keys(folderData.metadata).length > 0) {
        dataState.folderMetadata.set(folderPath, folderData.metadata);
      }

      // Convert images to record objects
      if (folderData.images) {
        for (const img of folderData.images) {
          const record = {
            src: img.path,
            name: img.name,
            thumb: img.thumbnail,
            size: img.size,
            size_bytes: img.size,
            mtime: img.mtime,
            width: img.width || 0,
            height: img.height || 0
          };

          if (img.metadata && Object.keys(img.metadata).length > 0) record.metadata = img.metadata;
          if (img.ccf_index !== undefined) record.ccf_index = img.ccf_index;
          if (img.registered) record.registered = img.registered;

          records.push(record);
        }
      }
    }
  }

  // Debug overlay
  if (window.location.search.includes("debug=true")) {
    const debugDiv = document.createElement("div");
    debugDiv.style.cssText =
      "position: fixed; top: 10px; right: 10px; background: rgba(0,0,0,0.9); " +
      "color: white; padding: 15px; z-index: 10000; max-width: 400px; font-size: 11px; border-radius: 5px;";
    debugDiv.innerHTML = `
      <h4 style="margin-top:0;">🐛 Debug Info</h4>
      <p><strong>Total folders:</strong> ${Object.keys(data.folders).length}</p>
      <p><strong>Folders with metadata:</strong> ${dataState.folderMetadata.size}</p>
      <p><strong>Sample folder paths:</strong><br>${Object.keys(data.folders).slice(0, 3).join("<br>")}</p>
      ${dataState.folderMetadata.size > 0
        ? `<p><strong>Sample metadata keys:</strong><br>${Object.keys([...dataState.folderMetadata.values()][0]).slice(0, 8).join(", ")}</p>`
        : "<p>No metadata found!</p>"}`;
    document.body.appendChild(debugDiv);
  }

  // Build indices
  byFolder.clear();
  allFolders.clear();
  folderPaths.length = 0;

  for (const img of records) {
    const fp = getFolderPath(img.src);
    if (!byFolder.has(fp)) byFolder.set(fp, []);
    byFolder.get(fp).push(img);

    allFolders.add(fp);
    const parts = fp.split("/").filter(p => p);
    for (let i = 0; i < parts.length; i++) {
      allFolders.add(parts.slice(0, i).join("/"));
    }
  }

  for (const arr of byFolder.values()) {
    arr.sort((a, b) => a.src.localeCompare(b.src));
  }

  folderPaths.push(
    ...Array.from(allFolders).sort((a, b) => a.localeCompare(b))
  );
}

// ─── Folder Helpers ────────────────────────────────────────────────

export function getChildFolders(parentPath) {
  const children = new Set();

  for (const fp of folderPaths) {
    if (fp === parentPath) continue;

    if (parentPath === "") {
      const parts = fp.split("/").filter(p => p);
      if (parts.length > 0) children.add(parts[0]);
    } else if (fp.startsWith(parentPath + "/")) {
      const relativePath = fp.slice(parentPath.length + 1);
      const nextLevel = relativePath.split("/");
      if (nextLevel.length > 0 && nextLevel[0]) {
        children.add(parentPath + "/" + nextLevel[0]);
      }
    }
  }

  return Array.from(children).sort();
}

// ─── Metadata Lookup ───────────────────────────────────────────────

export function getFolderMetadata(folderPath) {
  let metadata = dataState.folderMetadata.get(folderPath);
  if (!metadata && folderPath.startsWith("data/")) {
    metadata = dataState.folderMetadata.get(folderPath.substring(5));
  }
  return metadata || null;
}

// ─── Folder Metadata Panel ─────────────────────────────────────────

export function addFolderMetadataPanel(folderPath) {
  // Remove any existing panel
  const existingPanel = document.querySelector(".folder-metadata-panel");
  if (existingPanel) existingPanel.remove();

  const metadata = getFolderMetadata(folderPath);
  if (!metadata) return;

  const panel = document.createElement("div");
  panel.className = "folder-metadata-panel";

  const header = document.createElement("div");
  header.className = "metadata-header";
  header.textContent = "Experiment Metadata";
  panel.appendChild(header);

  const grid = document.createElement("div");
  grid.className = "metadata-grid";

  // Helper utilities (local)
  function getValueType(key, value) {
    if (key.toLowerCase().includes("virus")) return "virus-name";
    if (key.toLowerCase().includes("date") || /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(value)) return "date";
    if (key.toLowerCase().includes("dose") || /^[\d.]+e[\+\-]?\d+$/i.test(value) ||
        (!isNaN(value) && !isNaN(parseFloat(value)))) return "numeric";
    if (typeof value === "boolean" || /^(TRUE|FALSE|True|False)$/.test(value)) return "boolean";
    return "default";
  }

  function containsURL(str) {
    if (!str || typeof str !== 'string') return false;
    return /(https?:\/\/[^\s]+)/gi.test(str);
  }

  function linkifyURLs(text) {
    if (!text || typeof text !== 'string') return text;
    return text.replace(/(https?:\/\/[^\s<]+[^<.,:;"'\)\]\s])/gi,
      (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
  }

  function formatValue(key, value) {
    if (value === null || value === undefined) return "";
    const str = String(value).trim();
    if (str === "" || str === "NaN" || str === "null") return "";
    if (str === "TRUE" || str === "True") return "Yes";
    if (str === "FALSE" || str === "False") return "No";
    if (/^[\d.]+e[\+\-]?\d+$/i.test(str)) return parseFloat(str).toExponential(2);
    return str;
  }

  function cleanFieldName(fieldName) {
    return fieldName
      .replace(/\n/g, " ")
      .replace(/\s+/g, " ")
      .replace(/^\s+|\s+$/g, "")
      .replace(/\.\d+$/, "")
      .replace(/^Method$/, "Injection Method")
      .replace(/^Date$/, "Imaging Date")
      .replace(/Brain slicesPrimary antibody stain date/, "Primary Ab Stain Date")
      .replace(/Secondary antibody stain date/, "Secondary Ab Stain Date");
  }

  Object.entries(metadata).forEach(([key, value]) => {
    const formattedValue = formatValue(key, value);
    if (formattedValue !== "") {
      const row = document.createElement("div");
      row.className = "metadata-row";

      const label = document.createElement("div");
      label.className = "metadata-label";
      label.textContent = cleanFieldName(key);

      const valueEl = document.createElement("div");
      valueEl.className = `metadata-value ${getValueType(key, formattedValue)}`;

      if (containsURL(formattedValue)) {
        valueEl.innerHTML = linkifyURLs(formattedValue);
      } else {
        valueEl.textContent = formattedValue;
      }

      row.appendChild(label);
      row.appendChild(valueEl);
      grid.appendChild(row);
    }
  });

  panel.appendChild(grid);

  const wrap = document.querySelector(".wrap");
  const imagesEl = document.getElementById("images");
  wrap.insertBefore(panel, imagesEl);
}

// ─── Card Metadata Display ─────────────────────────────────────────

export function createMetadataDisplay(metadata, isCompact = false) {
  if (!metadata || Object.keys(metadata).length === 0) return null;

  const metaDiv = document.createElement("div");
  metaDiv.className = "metadata-info";

  const fields = [
    { key: "Genotype", label: "Genotype" },
    { key: "Ear tag", label: "Ear Tag" },
    { key: "Sex", label: "Sex" },
    { key: "Age\n (Weeks)", label: "Age (Weeks)" },
    { key: "DOB", label: "DOB" },
    { key: "Enhancer", label: "Enhancer" },
    { key: "Virus", label: "Virus" },
    { key: "Dose", label: "Dose" },
    { key: "Date", label: "Injection Date" },
    { key: "Method", label: "Method" },
    { key: "Other notes", label: "Notes" },
    { key: "Collection date", label: "Collection Date" },
    { key: "Collection method", label: "Collection Method" },
    { key: "Cut date", label: "Cut Date" },
    { key: "Cut by", label: "Cut By" },
    { key: "In cryo?", label: "In Cryo?" },
    { key: "AB staining?", label: "AB Staining?" },
    { key: "Brain slicesPrimary antibody \nstain date", label: "Primary Ab Date" },
    { key: "Primary antibody", label: "Primary Antibody" },
    { key: "Secondary antibody \nstain date", label: "Secondary Ab Date" },
    { key: "Secondary Antibody", label: "Secondary Antibody" },
    { key: "DAPI?", label: "DAPI?" },
    { key: "Image details", label: "Image Details" }
  ];

  let addedCount = 0;
  const maxRows = isCompact ? 4 : 12;

  for (const field of fields) {
    if (addedCount >= maxRows) break;

    const value = metadata[field.key];
    if (value && value !== "NaN" && value.toString().trim()) {
      const row = document.createElement("div");
      row.className = "metadata-row";

      const label = document.createElement("span");
      label.className = "metadata-label";
      label.textContent = field.label + ":";

      const valueSpan = document.createElement("span");
      valueSpan.className = "metadata-value";

      let displayValue = value.toString().trim();
      if (field.key === "Dose" && !isNaN(value))       displayValue = Number(value).toExponential(1) + " vg";
      else if (field.key === "Age\n (Weeks)" && !isNaN(value)) displayValue = value + " wks";
      else if (field.key.includes("?")) {
        if (displayValue === "TRUE" || displayValue === "True") displayValue = "Yes";
        else if (displayValue === "FALSE" || displayValue === "False") displayValue = "No";
      } else if (field.key.toLowerCase().includes("virus") && displayValue.length > 50) {
        displayValue = displayValue.substring(0, 47) + "...";
      }

      valueSpan.textContent = displayValue;
      row.appendChild(label);
      row.appendChild(valueSpan);
      metaDiv.appendChild(row);
      addedCount++;
    }
  }

  return addedCount > 0 ? metaDiv : null;
}
