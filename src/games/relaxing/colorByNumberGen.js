import { downsampleToImageData } from './animalImage';

function kMeansPalette(pixels, k, iterations = 8) {
  // Seed centroids from k evenly-spaced samples (not random) so results are
  // reproducible-ish and don't occasionally start from a degenerate cluster.
  const step = Math.max(1, Math.floor(pixels.length / k));
  let centroids = [];
  for (let i = 0; i < k; i++) centroids.push([...pixels[Math.min(i * step, pixels.length - 1)]]);

  let assignments = new Array(pixels.length).fill(0);
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < pixels.length; i++) {
      let best = 0, bestDist = Infinity;
      for (let c = 0; c < centroids.length; c++) {
        const d = colorDistSq(pixels[i], centroids[c]);
        if (d < bestDist) { bestDist = d; best = c; }
      }
      assignments[i] = best;
    }
    const sums = centroids.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < pixels.length; i++) {
      const s = sums[assignments[i]];
      s[0] += pixels[i][0]; s[1] += pixels[i][1]; s[2] += pixels[i][2]; s[3]++;
    }
    centroids = centroids.map((c, idx) => {
      const s = sums[idx];
      return s[3] > 0 ? [Math.round(s[0] / s[3]), Math.round(s[1] / s[3]), Math.round(s[2] / s[3])] : c;
    });
  }
  return { centroids, assignments };
}

function colorDistSq(a, b) {
  const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

/** Turns a real photo into a paint-by-number puzzle: a coarse grid of cells,
 * each assigned one of `numColors` palette entries via k-means clustering on
 * the downsampled pixels. Unlike a synthetic Voronoi pattern, the same color
 * can (and usually does) appear in several disconnected cells — exactly like
 * a real paint-by-number kit, where "sky blue" shows up in several unlinked
 * patches of the picture. */
export function generateColorByNumberFromBitmap(bitmap, { gridWidth = 26, numColors = 10 } = {}) {
  const { width, height, imageData } = downsampleToImageData(bitmap, gridWidth);
  const pixels = [];
  for (let i = 0; i < width * height; i++) {
    pixels.push([imageData.data[i * 4], imageData.data[i * 4 + 1], imageData.data[i * 4 + 2]]);
  }
  const { centroids, assignments } = kMeansPalette(pixels, numColors);

  // Merge any near-duplicate centroids (k-means can converge two clusters to
  // almost the same color on low-variety photos) so the legend doesn't show
  // two swatches that look identical.
  const merged = [];
  const remap = new Array(centroids.length).fill(-1);
  for (let i = 0; i < centroids.length; i++) {
    let foundIdx = -1;
    for (let j = 0; j < merged.length; j++) {
      if (colorDistSq(centroids[i], merged[j]) < 25 * 25) { foundIdx = j; break; }
    }
    if (foundIdx === -1) { merged.push(centroids[i]); remap[i] = merged.length - 1; }
    else remap[i] = foundIdx;
  }
  const cells = assignments.map((a) => remap[a]);

  return {
    gridWidth: width,
    gridHeight: height,
    cells, // length width*height, row-major, each a palette index
    palette: merged, // array of [r,g,b]
  };
}
