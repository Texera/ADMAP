// ── Configuration & Constants ──

const isLocalhost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "";

export const ASSETS_BASE_URL = isLocalhost
  ? "assets/"  // Use my localhost for testing 
  : "https://pub-67cbc24df1ab484a9243681ad431d103.r2.dev/"; // My Cloudflare R2 bucket URL 

export const FOLDER_ICON_SVG = ASSETS_BASE_URL + "icons/folder.svg";

export const DEBUG = false;
export const FOLDER_IN_VITRO = "In vitro primary culture tests";
export const FOLDER_IN_VIVO = "In vivo mouse tests";
export const ZOOM_THRESHOLD = 1.02;
export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 20;
export const GAIN_SLIDER_MAX = 500;
export const CHANNEL_DEFAULT = 100;
export const MOBILE_BREAKPOINT = 768;
export const SWIPE_MAX_MS = 300;
export const REGION_HOVER_PLACEHOLDER =
  '<div class="placeholder-text">Hover over a region to see details</div>';
// Tutorial video for Dr. Xu's CNCM website and AAV gallery
export const TUTORIAL_VIDEO_URL =
  "https://www.youtube.com/embed/xOLBdSpSe20?autoplay=1";
