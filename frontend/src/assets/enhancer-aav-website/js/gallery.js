// ── Gallery ──
// Folder cards, image grid/list rendering, breadcrumbs, navigation,
// view switching, and in-vivo/in-vitro folder swapping.

import { ASSETS_BASE_URL, FOLDER_ICON_SVG, FOLDER_IN_VITRO, FOLDER_IN_VIVO } from './config.js';
import { encodeFilePath, removeExtension, formatFileSize } from './utils.js';
import {
  foldersView, imagesView, titleEl, subtitleEl, crumbsEl,
  backBtn, viewSwitcher, viewText, pageSwapBtn
} from './dom.js';
import { viewState, lightboxState } from './state.js';
import {
  byFolder, getChildFolders,
  getFolderMetadata, addFolderMetadataPanel, createMetadataDisplay
} from './data.js';

// Circular: only accessed at runtime (click handlers)
import { openAt, close as closeLightbox } from './lightbox.js';

// ─── Hash Helpers ──────────────────────────────────────────────────

export function currentFolderFromHash() {
  if (!location.hash.startsWith("#folder=")) return "";
  const val = location.hash.slice("#folder=".length);
  try { return decodeURIComponent(val); } catch { return val; }
}

// ─── Breadcrumbs ───────────────────────────────────────────────────

export function renderCrumbs(folderPath) {
  crumbsEl.innerHTML = "";
  const frag = document.createDocumentFragment();

  const sep = () => frag.appendChild(
    Object.assign(document.createElement("span"), { className: "sep", textContent: "›" })
  );

  const home = Object.assign(document.createElement("a"), {
    href: "#", className: "crumb", textContent: "Home"
  });
  home.addEventListener("click", (e) => { e.preventDefault(); showFolders(""); });
  frag.appendChild(home);

  if (folderPath) {
    sep();
    const parts = folderPath.split("/").filter(p => p);
    let accum = "";
    parts.forEach((part, i) => {
      accum = i === 0 ? part : accum + "/" + part;
      const currentPath = accum;
      const link = Object.assign(document.createElement("a"), {
        href: "#folder=" + encodeURIComponent(currentPath),
        className: "crumb", textContent: part
      });
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const imgs = byFolder.get(currentPath) || [];
        const childFolders = getChildFolders(currentPath);
        if (imgs.length > 0 && childFolders.length === 0) showFolder(currentPath);
        else showFolders(currentPath);
      });
      frag.appendChild(link);
      if (i < parts.length - 1) sep();
    });
  }

  crumbsEl.appendChild(frag);
}

// ─── Folder Card ───────────────────────────────────────────────────

export function folderCard(folderPath, count, isContainer = false) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = viewState.isRowView ? "folder row-view" : "folder";
  card.addEventListener("click", (e) => { e.preventDefault(); showFolder(folderPath); });

  const thumb = document.createElement("div");
  thumb.className = "thumb";

  const folderImages = byFolder.get(folderPath) || [];
  const icon = document.createElement("img");

  if (!isContainer && folderImages.length > 0) {
    icon.src = encodeFilePath(ASSETS_BASE_URL + "thumbs/" + (folderImages[0].thumb || folderImages[0].src));
    icon.alt = "Folder preview";
    icon.style.objectFit = "cover";
    icon.style.width = "100%";
    icon.style.height = "100%";
    icon.style.borderRadius = "8px";
  } else {
    icon.src = FOLDER_ICON_SVG;
    icon.alt = "Folder icon";
  }
  thumb.appendChild(icon);

  const meta = document.createElement("div");
  meta.className = "meta";

  const displayName = folderPath ? folderPath.split("/").pop() : "(root)";
  meta.appendChild(Object.assign(document.createElement("div"), {
    className: "name", textContent: displayName
  }));

  const countText = isContainer
    ? `${count} subfolder${count === 1 ? "" : "s"}`
    : `${count} image${count === 1 ? "" : "s"}`;
  meta.appendChild(Object.assign(document.createElement("div"), {
    className: "count", textContent: countText
  }));

  const metadata = getFolderMetadata(folderPath);
  if (metadata) {
    const metadataDisplay = createMetadataDisplay(metadata, viewState.isRowView);
    if (metadataDisplay) meta.appendChild(metadataDisplay);
  }

  card.appendChild(thumb);
  card.appendChild(meta);
  return card;
}

// ─── Rendering ─────────────────────────────────────────────────────

export function renderFolders(currentPath = "") {
  foldersView.innerHTML = "";
  foldersView.className = viewState.isRowView ? "folders row-view" : "folders";
  const frag = document.createDocumentFragment();

  const childFolders = getChildFolders(currentPath);

  childFolders.forEach((childPath) => {
    const imgs = byFolder.get(childPath) || [];
    if (imgs.length > 0) {
      frag.appendChild(folderCard(childPath, imgs.length, false));
    } else {
      const subfolders = getChildFolders(childPath);
      const subfolderCount = subfolders.filter(sp => {
        const subImgs = byFolder.get(sp) || [];
        return subImgs.length > 0 || getChildFolders(sp).length > 0;
      }).length;
      if (subfolderCount > 0) {
        frag.appendChild(folderCard(childPath, subfolderCount, true));
      }
    }
  });

  foldersView.appendChild(frag);
}

export function renderImages(imgs) {
  imagesView.innerHTML = "";
  imagesView.className = viewState.isRowView ? "gallery row-view" : "gallery";
  const frag = document.createDocumentFragment();

  imgs.forEach((img) => {
    const fig = document.createElement("figure");
    fig.className = viewState.isRowView ? "card row-view" : "card";

    const btn = document.createElement("button");
    btn.type = "button";
    const fullImageUrl = encodeFilePath(ASSETS_BASE_URL + "images/" + img.src);
    btn.setAttribute("data-full", fullImageUrl);
    btn.setAttribute("data-title", img.name || "");

    const im = document.createElement("img");
    im.loading = "lazy";
    im.decoding = "async";
    if (img.t_width && img.t_height) { im.width = img.t_width; im.height = img.t_height; }
    const thumbPath = img.thumb || img.src;
    im.src = encodeFilePath(ASSETS_BASE_URL + "thumbs/" + thumbPath);
    im.alt = img.name || "image";
    btn.appendChild(im);

    if (viewState.isRowView) {
      const details = document.createElement("div");
      details.className = "row-details";

      const filename = document.createElement("div");
      filename.className = "filename";
      filename.textContent = removeExtension(img.name) || "";
      filename.title = img.name || "";

      const dimensions = document.createElement("div");
      dimensions.className = "dimensions";
      dimensions.textContent = `${img.width || 0} × ${img.height || 0}`;

      const fileSize = document.createElement("div");
      fileSize.className = "file-size";
      fileSize.textContent = img.size_bytes ? formatFileSize(img.size_bytes) : "—";

      const lastModified = document.createElement("div");
      lastModified.className = "last-modified";
      lastModified.textContent = img.mtime
        ? new Date(img.mtime * 1000).toLocaleDateString()
        : "—";

      details.appendChild(filename);
      details.appendChild(dimensions);
      details.appendChild(fileSize);
      details.appendChild(lastModified);
      fig.appendChild(btn);
      fig.appendChild(details);
    } else {
      const captionContainer = document.createElement("figcaption");
      captionContainer.className = "caption";
      captionContainer.appendChild(document.createTextNode(removeExtension(img.name) || ""));
      captionContainer.title = img.name || "";
      fig.appendChild(btn);
      fig.appendChild(captionContainer);
    }

    frag.appendChild(fig);
  });

  imagesView.appendChild(frag);

  if (viewState.isRowView) {
    lightboxState.items = Array.from(imagesView.querySelectorAll(".card"));
    lightboxState.items.forEach((card, i) => card.addEventListener("click", () => openAt(i)));
  } else {
    lightboxState.items = Array.from(imagesView.querySelectorAll(".card button"));
    lightboxState.items.forEach((btn, i) => btn.addEventListener("click", () => openAt(i)));
  }
}

// ─── Show Folders / Images ─────────────────────────────────────────

export function showFolders(folderPath = "") {
  const displayPath = folderPath || "";
  const displayName = displayPath ? displayPath.split("/").pop() : "AAV Gallery";
  titleEl.textContent = displayName;

  // Remove any existing folder metadata panel
  const existingPanel = document.querySelector(".folder-metadata-panel");
  if (existingPanel) existingPanel.remove();

  const childFolders = getChildFolders(displayPath);
  const validChildren = childFolders.filter((childPath) => {
    const imgs = byFolder.get(childPath) || [];
    if (imgs.length > 0) return true;
    const subfolders = getChildFolders(childPath);
    return subfolders.some(sp => {
      const subImgs = byFolder.get(sp) || [];
      return subImgs.length > 0 || getChildFolders(sp).length > 0;
    });
  });

  const itemCount = validChildren.length;
  subtitleEl.textContent = displayPath
    ? `${itemCount} folder${itemCount === 1 ? "" : "s"}`
    : "Choose a folder to view its contents.";

  renderCrumbs(displayPath);

  const navButtonsWrapper = document.getElementById("navButtonsWrapper");
  const catalogButtonMain = document.getElementById("catalogButtonMain");
  navButtonsWrapper.style.display = displayPath ? "flex" : "none";
  catalogButtonMain.style.display = displayPath ? "none" : "flex";

  updateSwapButtonState(pageSwapBtn, displayPath);

  viewSwitcher.style.display = "flex";
  foldersView.style.display = "";
  imagesView.style.display = "none";
  renderFolders(displayPath);

  const hashPath = displayPath ? "#folder=" + encodeURIComponent(displayPath) : "#";
  history.replaceState(null, "", hashPath);
}

export function showFolder(folderPath) {
  const imgs = byFolder.get(folderPath) || [];

  if (imgs.length > 0) {
    const displayName = folderPath ? folderPath.split("/").pop() : "(root)";
    titleEl.textContent = displayName;
    subtitleEl.textContent = `${imgs.length} image${imgs.length === 1 ? "" : "s"}`;
    renderCrumbs(folderPath);

    const navButtonsWrapper = document.getElementById("navButtonsWrapper");
    const catalogButtonMain = document.getElementById("catalogButtonMain");
    navButtonsWrapper.style.display = "flex";
    catalogButtonMain.style.display = "none";
    viewSwitcher.style.display = "flex";
    viewSwitcher.classList.add("active");
    foldersView.style.display = "none";
    imagesView.style.display = "";

    updateSwapButtonState(pageSwapBtn, folderPath);
    addFolderMetadataPanel(folderPath);
    renderImages(imgs);
    location.hash = "#folder=" + encodeURIComponent(folderPath);
  } else {
    showFolders(folderPath);
  }
}

// ─── Swap Folder (In Vivo to In Vitro) ─────────────────────────────

export function updateSwapButtonState(button, folderPath = null) {
  if (!button) return;

  const currentFolderPath = folderPath || currentFolderFromHash();
  button.disabled = false;
  button.innerHTML = "⇄ Swap";
  button.title = "Swap to corresponding folder";

  if (currentFolderPath) {
    let hasCorrespondingFolder = false;
    let isInVitro = false;
    let isInVivo = false;

    if (currentFolderPath.startsWith(FOLDER_IN_VITRO) ||
        currentFolderPath.includes("/" + FOLDER_IN_VITRO)) {
      isInVitro = true;
      const parts = currentFolderPath.split("/");
      const vitroIndex = parts.indexOf(FOLDER_IN_VITRO);
      if (vitroIndex > 0) {
        const aavFolder = parts[0];
        const targetFolder = aavFolder + "/" + FOLDER_IN_VIVO;
        if (byFolder.has(targetFolder) || getChildFolders(targetFolder).length > 0) {
          hasCorrespondingFolder = true;
        }
      }
    } else if (currentFolderPath.startsWith(FOLDER_IN_VIVO) ||
               currentFolderPath.includes("/" + FOLDER_IN_VIVO)) {
      isInVivo = true;
      const parts = currentFolderPath.split("/");
      const vivoIndex = parts.indexOf(FOLDER_IN_VIVO);
      if (vivoIndex > 0) {
        const aavFolder = parts[0];
        const targetFolder = aavFolder + "/" + FOLDER_IN_VITRO;
        if (byFolder.has(targetFolder) || getChildFolders(targetFolder).length > 0) {
          hasCorrespondingFolder = true;
        }
      }
    }

    if (isInVitro) {
      button.innerHTML = "⇄ Swap to In Vivo";
      button.title = "Swap to in vivo mouse tests";
    } else if (isInVivo) {
      button.innerHTML = "⇄ Swap to In Vitro";
      button.title = "Swap to in vitro primary culture tests";
    } else {
      button.style.display = "none";
      return;
    }

    if (!hasCorrespondingFolder) {
      button.disabled = true;
      button.title = "No corresponding folder found";
    }

    button.style.display = "inline-flex";
  } else {
    button.style.display = "none";
    button.disabled = true;
    button.title = "Swap not available in this folder";
  }
}

export function attemptFolderSwap(shouldCloseAfter = false) {
  const currentFolder = currentFolderFromHash();
  if (!currentFolder) return false;

  let newFolder = null;

  if (currentFolder.includes(FOLDER_IN_VITRO)) {
    newFolder = currentFolder.split("/")[0] + "/" + FOLDER_IN_VIVO;
  } else if (currentFolder.includes(FOLDER_IN_VIVO)) {
    newFolder = currentFolder.split("/")[0] + "/" + FOLDER_IN_VITRO;
  }

  if (newFolder && (byFolder.has(newFolder) || getChildFolders(newFolder).length > 0)) {
    location.hash = "#folder=" + encodeURIComponent(newFolder);
    if (shouldCloseAfter) closeLightbox();
    return true;
  }
  return false;
}

// ─── View Switcher ─────────────────────────────────────────────────

export function initGallery() {
  viewSwitcher.addEventListener("click", () => {
    viewState.isRowView = !viewState.isRowView;
    viewText.textContent = viewState.isRowView ? "Grid View" : "Detail View";
    viewSwitcher.classList.toggle("active", viewState.isRowView);

    const currentFolder = currentFolderFromHash();
    if (currentFolder) {
      const imgs = byFolder.get(currentFolder) || [];
      if (imgs.length > 0) renderImages(imgs);
      else renderFolders(currentFolder);
    } else {
      renderFolders("");
    }
  });

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      const currentFolder = currentFolderFromHash();
      if (currentFolder) {
        const parts = currentFolder.split("/").filter(p => p);
        if (parts.length > 1) {
          parts.pop();
          showFolders(parts.join("/"));
        } else {
          showFolders("");
        }
      } else {
        showFolders("");
      }
    });
  }
}
