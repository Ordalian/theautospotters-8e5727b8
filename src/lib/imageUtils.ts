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
  blurPixels = 14,
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
      if (!ctx) {
        reject(new Error("Canvas 2d not available"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const x = Math.max(0, bbox.x - padding);
      const y = Math.max(0, bbox.y - padding);
      const bw = Math.min(1 - x, bbox.width + 2 * padding);
      const bh = Math.min(1 - y, bbox.height + 2 * padding);
      const px = Math.round(x * w);
      const py = Math.round(y * h);
      const pw = Math.round(bw * w);
      const ph = Math.round(bh * h);
      if (pw < 2 || ph < 2) {
        resolve(imageDataUrl);
        return;
      }
      const temp = document.createElement("canvas");
      temp.width = pw;
      temp.height = ph;
      const tctx = temp.getContext("2d");
      if (!tctx) {
        resolve(imageDataUrl);
        return;
      }
      tctx.filter = `blur(${blurPixels}px)`;
      tctx.drawImage(canvas, px, py, pw, ph, 0, 0, pw, ph);
      ctx.drawImage(temp, 0, 0, pw, ph, px, py, pw, ph);
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
