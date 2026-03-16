// ── 16-bit Grayscale PNG Parser ──
// NOTE: This is for the registered boundary labels I register to the CCF.
// This is NOT for the main lightbox images, which are 8-bit and can be loaded directly into Image objects.
// Hand-rolled decoder for 16-bit PNGs (not natively supported by Canvas API).

import { DEBUG } from "./config.js";
import { yieldToBrowser } from "./utils.js";

// Paeth predictor for PNG filtering
export function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

// Parse a 16-bit grayscale PNG and return { pixels: Uint16Array, width, height }
export async function parse16bitGrayscalePNG(url) {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const data = new Uint8Array(buffer);

  // Verify PNG signature
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) {
    if (data[i] !== signature[i]) {
      throw new Error("Not a valid PNG file");
    }
  }

  let offset = 8;
  let width = 0,
    height = 0,
    bitDepth = 0,
    colorType = 0;
  const idatChunks = [];

  // Parse chunks
  while (offset < data.length) {
    const length = (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];
    offset += 4;

    const type = String.fromCharCode(data[offset], data[offset + 1], data[offset + 2], data[offset + 3]);
    offset += 4;

    if (type === "IHDR") {
      width = (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];
      height = (data[offset + 4] << 24) | (data[offset + 5] << 16) | (data[offset + 6] << 8) | data[offset + 7];
      bitDepth = data[offset + 8];
      colorType = data[offset + 9];
      DEBUG && console.log(`PNG: ${width}x${height}, ${bitDepth}-bit, colorType=${colorType}`);
    } else if (type === "IDAT") {
      idatChunks.push(data.slice(offset, offset + length));
    } else if (type === "IEND") {
      break;
    }

    offset += length + 4; // Skip data and CRC
  }

  if (bitDepth !== 16 || colorType !== 0) {
    console.warn(
      `Expected 16-bit grayscale (bitDepth=16, colorType=0), got bitDepth=${bitDepth}, colorType=${colorType}`
    );
  }

  // Concatenate IDAT chunks
  const totalLength = idatChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const compressedData = new Uint8Array(totalLength);
  let pos = 0;
  for (const chunk of idatChunks) {
    compressedData.set(chunk, pos);
    pos += chunk.length;
  }

  // Decompress (DecompressionStream to pako fallback)
  let decompressedData;
  try {
    const ds = new DecompressionStream("deflate");
    const writer = ds.writable.getWriter();
    const reader = ds.readable.getReader();

    writer.write(compressedData);
    writer.close();

    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const totalLen = chunks.reduce((sum, c) => sum + c.length, 0);
    decompressedData = new Uint8Array(totalLen);
    let off = 0;
    for (const chunk of chunks) {
      decompressedData.set(chunk, off);
      off += chunk.length;
    }
  } catch (e) {
    console.error("DecompressionStream failed, trying pako fallback:", e);
    if (typeof pako !== "undefined") {
      decompressedData = pako.inflate(compressedData);
    } else {
      throw new Error("Could not decompress PNG data");
    }
  }

  // Unfilter PNG rows (each row has a filter-type prefix byte)
  const bytesPerPixel = 2; // 16-bit grayscale
  const rowBytes = width * bytesPerPixel;
  const pixels = new Uint16Array(width * height);

  const ROWS_PER_CHUNK = 500;
  let srcOffset = 0;

  for (let startY = 0; startY < height; startY += ROWS_PER_CHUNK) {
    const endY = Math.min(startY + ROWS_PER_CHUNK, height);

    for (let y = startY; y < endY; y++) {
      const filterType = decompressedData[srcOffset++];
      const row = decompressedData.slice(srcOffset, srcOffset + rowBytes);
      srcOffset += rowBytes;

      const unfilteredRow = new Uint8Array(rowBytes);
      for (let i = 0; i < rowBytes; i++) {
        let a = i >= bytesPerPixel ? unfilteredRow[i - bytesPerPixel] : 0;
        let bByte = 0;
        if (y > 0) {
          const prevPixel = pixels[(y - 1) * width + Math.floor(i / bytesPerPixel)];
          bByte = i % 2 === 0 ? prevPixel >> 8 : prevPixel & 0xff;
        }
        let c = 0;
        if (y > 0 && i >= bytesPerPixel) {
          const prevPixel = pixels[(y - 1) * width + Math.floor((i - bytesPerPixel) / bytesPerPixel)];
          c = i % 2 === 0 ? prevPixel >> 8 : prevPixel & 0xff;
        }

        const val = row[i];
        switch (filterType) {
          case 0:
            unfilteredRow[i] = val;
            break;
          case 1:
            unfilteredRow[i] = (val + a) & 0xff;
            break;
          case 2:
            unfilteredRow[i] = (val + bByte) & 0xff;
            break;
          case 3:
            unfilteredRow[i] = (val + Math.floor((a + bByte) / 2)) & 0xff;
            break;
          case 4:
            unfilteredRow[i] = (val + paethPredictor(a, bByte, c)) & 0xff;
            break;
        }
      }

      // Convert bytes to 16-bit values (big-endian)
      for (let x = 0; x < width; x++) {
        pixels[y * width + x] = (unfilteredRow[x * 2] << 8) | unfilteredRow[x * 2 + 1];
      }
    }

    // Yield to browser after each chunk
    if (endY < height) {
      await yieldToBrowser();
    }
  }

  return { pixels, width, height };
}
