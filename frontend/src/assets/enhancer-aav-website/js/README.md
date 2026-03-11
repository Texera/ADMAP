# JavaScript Modules

The frontend is built as vanilla ES modules loaded via `<script type="module" src="js/main.js">`. There is no bundler or build step -- the browser loads modules directly.

## Module Overview

| File | Purpose |
|------|---------|
| main.js | Entry point. Loads data, initializes sub-systems, handles hash-based routing. |
| config.js | Application-wide constants: asset URLs, zoom limits, slider defaults, breakpoints. |
| state.js | Centralized mutable state objects for atlas, channels, view mode, lightbox, zoom, touch, and data. |
| dom.js | All `getElementById` / `querySelector` calls gathered into named exports so other modules never query the DOM directly. |
| utils.js | Pure utility functions: file-size formatting, hex-to-RGB, CSV parsing, path encoding. |
| data.js | Fetches `images.json`, builds folder-to-image indices, provides metadata lookup and panel rendering. |
| gallery.js | Renders folder cards, image grid/list views, breadcrumbs, view switching, and folder navigation. |
| lightbox.js | Full-screen image viewer with zoom/pan, keyboard and touch navigation, metadata display, channel controls, and modal dialogs. |
| channels.js | RGB channel sliders, gain control, grayscale toggle, SVG `feColorMatrix` filter construction, and channel legend. |
| atlas.js | CCF brain atlas system: loads region CSV mapping, draws annotation boundaries, handles region hover, manages atlas panel. |
| pngParser.js | Custom decoder for 16-bit grayscale PNGs (not natively supported by Canvas API), returning a `Uint16Array`. |
| regionsOverlay.js | Draws brain-region boundaries on the lightbox image with hover tooltips and toggle visibility. |

## Dependency Graph

```
config, utils, dom         (leaf modules, no sibling imports)
        |
      state                (imports config)
        |
      data                 (imports config, utils, dom, state)
    pngParser              (imports config, utils)
        |
  atlas <-> regionsOverlay (circular, runtime-safe)
        |
    channels               (imports config, utils, dom, state, data, gallery)
        |
  gallery <-> lightbox     (circular, runtime-safe)
        |
     main.js               (orchestrates everything)
```

Circular imports between `atlas`/`regionsOverlay` and `gallery`/`lightbox` are resolved at runtime (lazy access) and do not cause initialization issues.

## Module Details

### main.js

Entry point executed on page load. Calls `loadManifest()` to fetch image data, then initializes the gallery, channel controls, and lightbox. Listens for `hashchange` events to drive SPA routing.

### config.js

Exports named constants consumed across the application:
- `ASSETS_BASE_URL` -- CDN root for images and thumbnails
- `ZOOM_MIN`, `ZOOM_MAX`, `ZOOM_THRESHOLD` -- lightbox zoom bounds
- `GAIN_SLIDER_MAX`, `CHANNEL_DEFAULT` -- channel slider defaults
- `MOBILE_BREAKPOINT`, `SWIPE_MAX_MS` -- responsive/touch thresholds
- `TUTORIAL_VIDEO_URL` -- onboarding video link
- `DEBUG` -- flag for console logging

### state.js

Mutable state is isolated here rather than scattered across modules. Exports separate state objects: `atlasState`, `regionsOverlayState`, `channelState`, `viewState`, `lightboxState`, `zoomState`, `touchState`, `dataState`.

### dom.js

Centralizes every DOM query into a single module so element references are created once and reused. Exports approximately 60 named references (`foldersView`, `imagesView`, `lb`, `lbImg`, `lbImgWrapper`, `atlasCanvas`, `regionsOverlayCanvas`, sliders, panels, buttons, etc.).

### utils.js

Pure functions with no side effects:
- `formatFileSize(bytes)` -- human-readable file sizes
- `hexToRgb(hex)` -- hex color string to `{r, g, b}`
- `yieldToBrowser()` -- microtask yield for responsive UI
- `encodeFilePath(path)` -- URL-safe encoding for asset paths
- `parseCSVLine(line)` -- CSV row parser
- `removeExtension(filename)` -- strip file extension
- `getFolderPath(path)` -- extract parent folder from path

### data.js

Fetches `images.json` at startup and builds lookup structures (`byFolder`, `allFolders`, `folderPaths`). Provides `getFolderMetadata()` for metadata lookup, `addFolderMetadataPanel()` for rendering metadata panels on folder cards, and `createMetadataDisplay()` for inline metadata badges.

### gallery.js

Handles all gallery rendering:
- `renderFolders()` / `renderImages()` -- build the folder grid or image grid
- `renderCrumbs()` -- breadcrumb navigation
- `showFolders()` / `showFolder()` -- switch between folder and image views
- `initGallery()` -- sets up event listeners, view switcher, hash routing
- `attemptFolderSwap()` / `updateSwapButtonState()` -- in-vivo / in-vitro folder toggling

### lightbox.js

The largest module. Manages the full-screen image viewer:
- `openAt(index)` / `close()` -- open/close lightbox at a given image index
- `updateImageTransform()` -- apply zoom and pan CSS transforms
- `resetZoom()` -- reset zoom state to defaults
- `updateMetadata()` -- populate the metadata side-panel
- `initLightbox()` -- keyboard shortcuts, touch gestures, toolbar toggle, modal dialogs

### channels.js

Controls RGB channel manipulation via SVG filters:
- `createChannelFilter()` -- builds an `feColorMatrix` SVG filter from slider values
- `updateChannelDisplay()` -- refreshes the filter and value readouts
- `resetChannelState()` -- restore default slider positions
- `makeChannelValueEditable()` -- click-to-edit numeric input on slider values
- `isMultiChannelImage()` -- detects whether the current image has multiple channels
- `updateChannelLegend()` -- renders per-channel legend with keyboard shortcut hints

### atlas.js

Brain atlas integration for CCF (Common Coordinate Framework) slice annotations:
- `loadBrainRegionMapping()` -- parses the region CSV into a lookup table
- `extractBoundaryPixels16bit()` / `drawBoundaries()` -- boundary detection from 16-bit annotation PNGs
- `renderAtlasWithBoundaries()` -- composites atlas image with region outlines
- `showInteractiveAtlas()` / `showCcfSliceView()` -- atlas panel UI modes
- `setupAtlasHoverInteraction()` -- mouse-over region identification

### pngParser.js

Implements a from-scratch PNG decoder for 16-bit grayscale images. The browser Canvas API only supports 8-bit channels, so this module manually decompresses IDAT chunks and reconstructs scanlines with PNG filter reversal to produce a `Uint16Array` of raw pixel values used by the atlas system.

### regionsOverlay.js

Draws brain-region annotation boundaries directly on the lightbox image canvas:
- `toggleRegionsOverlay()` / `showRegionsOverlay()` / `hideRegionsOverlay()` -- visibility control
- `positionRegionsOverlay()` -- keeps the overlay aligned with zoom/pan transforms
- `redrawRegionsOverlay()` -- re-renders boundaries at current viewport
- `showRegionTooltip()` -- displays region name on hover
- `setupRegionsOverlayHoverInteraction()` -- mouse event wiring
