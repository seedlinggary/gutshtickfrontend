const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

/** Fetches a random real animal photo via our own backend proxy (never the
 * upstream CDN directly) and returns it as an ImageBitmap. Routing through
 * our backend matters, not just convenience: none of the free animal-photo
 * APIs send Access-Control-Allow-Origin, so a browser reading pixel data
 * from them directly would taint the canvas. Blob URLs from our own proxy
 * response never taint the canvas regardless of the upstream's headers. */
export async function fetchRandomAnimalBitmap() {
  const res = await fetch(`${API}/media/random-animal`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch animal image');
  const blob = await res.blob();
  return createImageBitmap(blob);
}

/** Draws a bitmap into a small canvas at the given target width (aspect
 * preserved) and returns { canvas, ctx, width, height, imageData }. The
 * heavy downsample itself acts as a blur — real photos are "busy" (texture,
 * ripples, background clutter), and averaging that away into a coarse grid
 * is what turns them into clean, blocky regions instead of noisy ones. */
export function downsampleToImageData(bitmap, targetWidth) {
  const aspect = bitmap.height / bitmap.width;
  const width = targetWidth;
  const height = Math.max(1, Math.round(targetWidth * aspect));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  return { width, height, imageData };
}
