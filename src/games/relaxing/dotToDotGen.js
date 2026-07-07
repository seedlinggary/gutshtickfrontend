import { downsampleToImageData } from './animalImage';

function toGrayscale(imageData, width, height) {
  const gray = new Uint8ClampedArray(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = imageData.data[i * 4], g = imageData.data[i * 4 + 1], b = imageData.data[i * 4 + 2];
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }
  return gray;
}

// A light box blur before thresholding merges small lighting/texture
// variation WITHIN the actual subject (fur, feathers) into one contiguous
// blob instead of it fragmenting into several smaller components — without
// this, largestComponent() can end up picking a smoother patch of background
// over a "broken up" animal.
function boxBlur(gray, width, height, radius = 1) {
  const out = new Uint8ClampedArray(gray.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0, count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          sum += gray[ny * width + nx];
          count++;
        }
      }
      out[y * width + x] = sum / count;
    }
  }
  return out;
}

function otsuThreshold(gray) {
  const hist = new Array(256).fill(0);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
  const total = gray.length;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0, wB = 0, maximum = -1, level = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > maximum) { maximum = between; level = t; }
  }
  return level;
}

function buildMask(gray, threshold, below) {
  const mask = new Uint8Array(gray.length);
  for (let i = 0; i < gray.length; i++) mask[i] = (below ? gray[i] < threshold : gray[i] >= threshold) ? 1 : 0;
  return mask;
}

function largestComponent(mask, width, height) {
  const visited = new Uint8Array(width * height);
  let best = null, bestSize = 0;
  for (let start = 0; start < mask.length; start++) {
    if (mask[start] !== 1 || visited[start]) continue;
    const stack = [start];
    visited[start] = 1;
    const comp = [];
    let minX = width, maxX = 0, minY = height, maxY = 0;
    while (stack.length) {
      const cur = stack.pop();
      comp.push(cur);
      const cx = cur % width, cy = (cur - cx) / width;
      if (cx < minX) minX = cx;
      if (cx > maxX) maxX = cx;
      if (cy < minY) minY = cy;
      if (cy > maxY) maxY = cy;
      const neighbors = [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]];
      for (const [nx, ny] of neighbors) {
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const nidx = ny * width + nx;
        if (mask[nidx] === 1 && !visited[nidx]) { visited[nidx] = 1; stack.push(nidx); }
      }
    }
    if (comp.length > bestSize) { bestSize = comp.length; best = { comp, minX, maxX, minY, maxY }; }
  }
  return best;
}

// Clockwise starting from "north" — index i and i+4 (mod 8) are opposites.
const MOORE_NEIGHBORS = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];

/** Moore-neighbor boundary tracing: walks around the actual perimeter of the
 * blob in order, unlike radial sampling from the centroid (which was tried
 * first and produces badly clustered points on any non-convex/elongated
 * shape — i.e. almost any real animal silhouette, since legs/necks/heads
 * stick out unevenly from the centroid). */
function traceBoundaryMoore(mask, width, height, comp) {
  let start = null;
  for (const idx of comp.comp) {
    const x = idx % width, y = (idx - x) / width;
    if (!start || y < start[1] || (y === start[1] && x < start[0])) start = [x, y];
  }
  if (comp.comp.length <= 2) return [start];

  const inMask = (x, y) => x >= 0 && x < width && y >= 0 && y < height && mask[y * width + x] === 1;
  const boundary = [start];
  let current = start;
  let backtrackDir = 6; // west — guaranteed empty since start is topmost-then-leftmost
  const maxSteps = comp.comp.length * 8 + 100;

  for (let steps = 0; steps < maxSteps; steps++) {
    let moved = false;
    for (let i = 0; i < 8; i++) {
      const dirIdx = (backtrackDir + 1 + i) % 8;
      const [dx, dy] = MOORE_NEIGHBORS[dirIdx];
      const nx = current[0] + dx, ny = current[1] + dy;
      if (inMask(nx, ny)) {
        backtrackDir = (dirIdx + 4) % 8;
        current = [nx, ny];
        moved = true;
        break;
      }
    }
    if (!moved) break;
    if (current[0] === start[0] && current[1] === start[1]) break;
    boundary.push(current);
  }
  return boundary;
}

/** Resamples an ordered boundary path at N points evenly spaced by distance
 * traveled along the path (not by index, and not by angle from a center) —
 * this is what actually guarantees no clustering, regardless of how
 * lopsided or concave the shape is. */
function resampleByArcLength(boundary, numPoints) {
  if (boundary.length < 3) return boundary.slice(0, numPoints);

  const dists = [0];
  for (let i = 1; i < boundary.length; i++) {
    const [x0, y0] = boundary[i - 1], [x1, y1] = boundary[i];
    dists.push(dists[i - 1] + Math.hypot(x1 - x0, y1 - y0));
  }
  const [x0, y0] = boundary[0], [xl, yl] = boundary[boundary.length - 1];
  const totalLength = dists[dists.length - 1] + Math.hypot(x0 - xl, y0 - yl);
  if (totalLength < 1e-6) return boundary.slice(0, numPoints);

  const closedBoundary = [...boundary, boundary[0]];
  const closedDists = [...dists, totalLength];

  const result = [];
  for (let i = 0; i < numPoints; i++) {
    const targetDist = (i / numPoints) * totalLength;
    let segIdx = closedDists.length - 1;
    for (let j = 1; j < closedDists.length; j++) {
      if (closedDists[j] >= targetDist) { segIdx = j; break; }
    }
    const d0 = closedDists[segIdx - 1], d1 = closedDists[segIdx];
    const t = d1 > d0 ? (targetDist - d0) / (d1 - d0) : 0;
    const [px0, py0] = closedBoundary[segIdx - 1];
    const [px1, py1] = closedBoundary[segIdx];
    result.push([px0 + (px1 - px0) * t, py0 + (py1 - py0) * t]);
  }
  return result;
}

/** Scores how much a connected blob looks like "a photographed subject"
 * rather than background clutter (a doorframe, an umbrella, a wall edge),
 * combining several independent signals since any one alone is easy to
 * fool:
 *  - solidity: area / bounding-box-area. A real animal silhouette is a
 *    reasonably "filled-in" blob; a thin architectural line or a diagonal
 *    strip of shadow has a large bounding box but little actual area.
 *  - areaFrac: prefers a blob covering a moderate share of the frame — big
 *    enough to be the subject, not so big it's obviously the background.
 *  - centrality: photographed subjects (especially from pet-photo APIs)
 *    tend to be composed somewhere near the middle of the frame.
 *  - a penalty for touching multiple image borders, which background
 *    regions do far more often than a centered subject.
 */
function scoreComponent(comp, width, height) {
  const area = comp.comp.length;
  const bboxW = comp.maxX - comp.minX + 1, bboxH = comp.maxY - comp.minY + 1;
  const solidity = area / (bboxW * bboxH);
  const areaFrac = area / (width * height);
  const areaScore = areaFrac < 0.05 ? 0 : Math.max(0, 1 - Math.abs(areaFrac - 0.3) / 0.35);

  let sx = 0, sy = 0;
  for (const idx of comp.comp) { sx += idx % width; sy += Math.floor(idx / width); }
  const cx = sx / area, cy = sy / area;
  const distFromCenter = Math.hypot(cx - width / 2, cy - height / 2) / (Math.hypot(width, height) / 2);
  const centralityScore = Math.max(0, 1 - distFromCenter);

  const touchesBorder =
    (comp.minX === 0 ? 1 : 0) + (comp.maxX === width - 1 ? 1 : 0) +
    (comp.minY === 0 ? 1 : 0) + (comp.maxY === height - 1 ? 1 : 0);

  return solidity * 1.5 + areaScore * 1.0 + centralityScore * 1.1 - touchesBorder * 0.22;
}

/** Searches several threshold levels and both polarities (dark-as-subject,
 * light-as-subject) rather than trusting a single Otsu split — real photos
 * often don't have a clean bimodal brightness histogram, so the "textbook"
 * threshold is frequently not the one that isolates the actual animal.
 * Picks whichever candidate across the whole search scores best. */
function findBestSubjectComponent(gray, width, height) {
  const otsu = otsuThreshold(gray);
  const thresholds = [...new Set([otsu, otsu - 40, otsu + 40, 80, 130, 180].map((t) => Math.max(15, Math.min(240, t))))];

  let best = null, bestScore = -Infinity;
  for (const t of thresholds) {
    for (const below of [true, false]) {
      const mask = buildMask(gray, t, below);
      const comp = largestComponent(mask, width, height);
      if (!comp || comp.comp.length < width * height * 0.05) continue;
      const score = scoreComponent(comp, width, height);
      if (score > bestScore) { bestScore = score; best = { mask, comp }; }
    }
  }
  return { best, bestScore };
}

// Below this, even the "best of the search" candidate doesn't look enough
// like a real subject to bother tracing — the caller should fetch a
// different photo instead of showing a confidently-wrong outline.
const MIN_QUALITY_SCORE = 1.85;

/** Turns a real photo into a dot-to-dot puzzle: downsample + blur + search
 * several thresholds/polarities for whichever connected blob best matches
 * "a photographed subject" (see scoreComponent), trace its actual perimeter,
 * and resample that perimeter at `numPoints` evenly-spaced (by distance, not
 * angle) points. Quality still genuinely varies with the source photo's
 * composition, but low-confidence results are rejected (return null) rather
 * than shown, so the caller retries with a different photo instead of
 * displaying a confidently-wrong trace (e.g. an umbrella instead of the cat
 * under it). */
export function generateDotToDotFromBitmap(bitmap, { numPoints = 16, gridWidth = 80 } = {}) {
  const { width, height, imageData } = downsampleToImageData(bitmap, gridWidth);
  const gray = boxBlur(toGrayscale(imageData, width, height), width, height, 1);

  const { best, bestScore } = findBestSubjectComponent(gray, width, height);
  if (!best || bestScore < MIN_QUALITY_SCORE) return null;

  const boundary = traceBoundaryMoore(best.mask, width, height, best.comp);
  if (boundary.length < numPoints) return null;
  const rawPoints = resampleByArcLength(boundary, numPoints);

  const xs = rawPoints.map((p) => p[0]), ys = rawPoints.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = Math.max(1, maxX - minX), spanY = Math.max(1, maxY - minY);
  const scale = 80 / Math.max(spanX, spanY);
  const offsetX = 50 - ((minX + maxX) / 2) * scale;
  const offsetY = 50 - ((minY + maxY) / 2) * scale;

  const points = rawPoints.map(([x, y]) => [
    Math.round((x * scale + offsetX) * 10) / 10,
    Math.round((y * scale + offsetY) * 10) / 10,
  ]);

  const uniqueish = new Set(points.map((p) => `${Math.round(p[0] / 2)}_${Math.round(p[1] / 2)}`));
  if (uniqueish.size < numPoints * 0.5) return null;

  return { points };
}
