/**
 * Resize an image file to a max dimension, returning a smaller base64 data URL.
 * This dramatically reduces payload size on slow connections.
 */
export function resizeImage(
  file: File,
  maxDim = 800,
  quality = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

/**
 * Bounding box for a detected region, normalized 0-1 coordinates.
 */
export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Apply a pixelated blur to a region of a base64 image (e.g. license plate).
 * Returns a new base64 data URL with the region blurred.
 */
export function blurRegion(
  base64: string,
  bbox: BBox,
  pixelSize = 12
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      // Convert normalized bbox to pixel coords with some margin
      const margin = 0.01;
      const rx = Math.max(0, Math.floor((bbox.x - margin) * img.width));
      const ry = Math.max(0, Math.floor((bbox.y - margin) * img.height));
      const rw = Math.min(img.width - rx, Math.ceil((bbox.width + margin * 2) * img.width));
      const rh = Math.min(img.height - ry, Math.ceil((bbox.height + margin * 2) * img.height));

      if (rw <= 0 || rh <= 0) {
        resolve(base64);
        return;
      }

      // Pixelate the region
      const imageData = ctx.getImageData(rx, ry, rw, rh);
      const data = imageData.data;

      for (let y = 0; y < rh; y += pixelSize) {
        for (let x = 0; x < rw; x += pixelSize) {
          // Sample the center of each block
          const sx = Math.min(x + Math.floor(pixelSize / 2), rw - 1);
          const sy = Math.min(y + Math.floor(pixelSize / 2), rh - 1);
          const si = (sy * rw + sx) * 4;
          const r = data[si], g = data[si + 1], b = data[si + 2], a = data[si + 3];

          // Fill the entire block with sampled color
          for (let dy = 0; dy < pixelSize && y + dy < rh; dy++) {
            for (let dx = 0; dx < pixelSize && x + dx < rw; dx++) {
              const di = ((y + dy) * rw + (x + dx)) * 4;
              data[di] = r;
              data[di + 1] = g;
              data[di + 2] = b;
              data[di + 3] = a;
            }
          }
        }
      }

      ctx.putImageData(imageData, rx, ry);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => reject(new Error("Failed to blur image"));
    img.src = base64;
  });
}

/**
 * Convert a File to a base64 data URL (for blurring before upload).
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Convert a base64 data URL to a File object.
 */
export function base64ToFile(base64: string, filename: string): File {
  const arr = base64.split(",");
  const mime = arr[0]?.match(/:(.*?);/)?.[1] || "image/jpeg";
  const bstr = atob(arr[1]);
  const u8arr = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i);
  return new File([u8arr], filename, { type: mime });
}

/** Normalized bbox: x, y, width, height in 0–1 range (top-left origin). */
export interface PlateBbox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Blur the license plate region in an image (data URL). Returns a new data URL.
 * bbox: normalized coordinates 0–1 (x, y = top-left; width, height = size).
 * Adds a small padding around the region for a smoother blur.
 */
export function blurPlateInImage(
  imageDataUrl: string,
  bbox: PlateBbox,
  pixelSize = 10,
  padding = 0.03
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(imageDataUrl); return; }
      ctx.drawImage(img, 0, 0);

      const x = Math.max(0, bbox.x - padding);
      const y = Math.max(0, bbox.y - padding);
      const bw = Math.min(1 - x, bbox.width + 2 * padding);
      const bh = Math.min(1 - y, bbox.height + 2 * padding);
      const px = Math.round(x * w);
      const py = Math.round(y * h);
      const pw = Math.round(bw * w);
      const ph = Math.round(bh * h);
      if (pw < 2 || ph < 2) { resolve(imageDataUrl); return; }

      // Pixelation approach (works on all browsers including Safari)
      const imageData = ctx.getImageData(px, py, pw, ph);
      const data = imageData.data;
      for (let row = 0; row < ph; row += pixelSize) {
        for (let col = 0; col < pw; col += pixelSize) {
          const sx = Math.min(col + Math.floor(pixelSize / 2), pw - 1);
          const sy = Math.min(row + Math.floor(pixelSize / 2), ph - 1);
          const si = (sy * pw + sx) * 4;
          const r = data[si], g = data[si + 1], b = data[si + 2], a = data[si + 3];
          for (let dy = 0; dy < pixelSize && row + dy < ph; dy++) {
            for (let dx = 0; dx < pixelSize && col + dx < pw; dx++) {
              const di = ((row + dy) * pw + (col + dx)) * 4;
              data[di] = r; data[di + 1] = g; data[di + 2] = b; data[di + 3] = a;
            }
          }
        }
      }
      ctx.putImageData(imageData, px, py);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = () => reject(new Error("Failed to load image for blur"));
    img.src = imageDataUrl;
  });
}

/**
 * Convert a data URL (e.g. from blurPlateInImage) to a File for upload.
 */
export function dataUrlToFile(dataUrl: string, filename = "photo.jpg"): File {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const bstr = atob(arr[1] ?? "");
  let n = bstr.length;
  const u8 = new Uint8Array(n);
  while (n--) u8[n] = bstr.charCodeAt(n);
  return new File([u8], filename, { type: mime });
}
