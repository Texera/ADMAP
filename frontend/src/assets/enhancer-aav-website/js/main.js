// ── Entry Point ──
// Top-level module: loads data, initializes sub-systems, performs initial routing.

import { ASSETS_BASE_URL } from './config.js';
import { atlasBrainImage, pageSwapBtn } from './dom.js';
import { loadBrainRegionMapping } from './atlas.js';
import { loadManifest, byFolder, getChildFolders } from './data.js';
import { currentFolderFromHash, showFolder, showFolders, updateSwapButtonState, initGallery } from './gallery.js';
import { initChannels } from './channels.js';
import { initLightbox } from './lightbox.js';

// ── Helpers ──

function hasFolder(folder) {
  return byFolder.has(folder) || getChildFolders(folder).length > 0;
}

// ── Bootstrap ──

// Set atlas placeholder image
if (atlasBrainImage) {
  atlasBrainImage.src = ASSETS_BASE_URL + "ccf/allen_ccf_placeholder.webp";
}

// Fire-and-forget: start loading the brain region CSV
loadBrainRegionMapping();

// Load manifest, then init everything
await loadManifest();

initGallery();
initChannels();
initLightbox();

// Initial route
const startFolder = currentFolderFromHash();
if (startFolder && hasFolder(startFolder)) {
  showFolder(startFolder);
} else if (getChildFolders("data").length > 0) {
  showFolder("data");
} else {
  showFolders("");
}

// Hash-change navigation
window.addEventListener("hashchange", () => {
  const folder = currentFolderFromHash();
  if (folder && hasFolder(folder)) {
    showFolder(folder);
  } else if (getChildFolders("data").length > 0) {
    showFolder("data");
  } else {
    showFolders("");
  }
  updateSwapButtonState(pageSwapBtn);
});
