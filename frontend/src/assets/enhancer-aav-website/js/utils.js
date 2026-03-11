// ── Pure Utility Functions ──

/** Format a byte count as a human-readable string. */
export function formatFileSize(bytes) {
  if (bytes > 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  if (bytes > 1024) return (bytes / 1024).toFixed(1) + " KB";
  return bytes + " B";
}

/** Convert a 6-char hex string to [r, g, b]. */
export function hexToRgb(hex) {
  return [
    parseInt(hex.substring(0, 2), 16),
    parseInt(hex.substring(2, 4), 16),
    parseInt(hex.substring(4, 6), 16),
  ];
}

/** Yield to the browser via requestAnimationFrame (for chunked async work). */
export function yieldToBrowser() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

/** Encode a file path for use in URLs (also encodes #). */
export function encodeFilePath(path) {
  return encodeURI(path).replace(/#/g, "%23");
}

/** Parse a CSV line respecting quoted fields. */
export function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/** Strip file extension from a filename. */
export function removeExtension(filename) {
  if (!filename) return "";
  const lastDotIndex = filename.lastIndexOf(".");
  return lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
}

/** Derive the folder path from a full source path. */
export function getFolderPath(src) {
  const parts = src.split("/");
  parts.pop();
  return parts.join("/");
}
