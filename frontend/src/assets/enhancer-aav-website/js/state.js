// ── Shared Mutable Application State ──
// All state is exported as objects so importers can read and mutate properties.

import { CHANNEL_DEFAULT } from "./config.js";

// Atlas panel state (hover interaction, annotation data)
export const atlasState = {
  registeredImg: null,
  annotation16bit: null, // Uint16Array of 16-bit label values
  annotationWidth: 0,
  annotationHeight: 0,
  canvasWidth: 0,
  canvasHeight: 0,
  boundaryPixels: [],
  currentHoverRegion: null,
  currentCcfIndex: null, // Current CCF slice index
  currentRegisteredData: null, // { forward_image, forward_annotation, inverse_annotation }
  interactiveMode: false, // Showing interactive canvas vs static CCF image
  brainRegionMap: null, // Map: parcellation_index → region info
  brainRegionIdMap: null, // Map: id to region info (for parent lookups)
};

// Regions overlay state (boundaries on the main lightbox image)
export const regionsOverlayState = {
  isVisible: false,
  isLoading: false,
  inverseAnnotation16bit: null,
  inverseWidth: 0,
  inverseHeight: 0,
  currentInversePath: null,
  currentRegisteredData: null,
  currentHoverRegion: null,
  // Pre-rendered boundary ImageData for fast compositing
  boundaryImageData: null,
  // Downsampled annotation at canvas resolution for fast hover
  downsampledAnnotation: null,
  downsampledWidth: 0,
  downsampledHeight: 0,
  // Cache dims to avoid recompute on toggle
  cachedCanvasWidth: 0,
  cachedCanvasHeight: 0,
};

// Channel slider state (intensity 0-100, gain 0-500)
export const channelState = {
  red: CHANNEL_DEFAULT,
  green: CHANNEL_DEFAULT,
  blue: CHANNEL_DEFAULT,
  gain: CHANNEL_DEFAULT,
};

// View / UI state
export const viewState = {
  isRowView: true, // default to detail view
  isGrayscale: false,
};

// Lightbox navigation state
export const lightboxState = {
  items: [], // card or button elements in current images view
  idx: -1,
  lastActive: null, // element that had focus before lightbox opened
};

// Zoom & pan state
export const zoomState = {
  zoomLevel: 1,
  panX: 0,
  panY: 0,
  isPanning: false,
  panStartX: 0,
  panStartY: 0,
  lastPanX: 0,
  lastPanY: 0,
  hasDragged: false,
};

// Touch gesture state
export const touchState = {
  touchStartX: null,
  touchStartY: null,
  touchStartTime: null,
  isTouchPanning: false,
  touchPanStartX: 0,
  touchPanStartY: 0,
  lastTouchPanX: 0,
  lastTouchPanY: 0,
  lastTouchDistance: null,
  lastTouchZoom: 1,
};

// Data (populated by loadManifest in data.js)
export const dataState = {
  folderMetadata: new Map(),
};
