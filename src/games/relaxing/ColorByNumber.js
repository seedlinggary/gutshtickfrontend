import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import HowToPlay from '../HowToPlay';
import { fetchRandomAnimalBitmap } from './animalImage';
import { generateColorByNumberFromBitmap } from './colorByNumberGen';

function rgbString([r, g, b]) {
  return `rgb(${r}, ${g}, ${b})`;
}

// Downsizes the source bitmap to a small JPEG data URL for the "here's the
// real photo" reveal on completion. A data URL (rather than an object URL)
// needs no manual revoke bookkeeping, fine here since only one is ever held.
function bitmapToDataURL(bitmap, maxDim = 420) {
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', 0.85);
}

export default function ColorByNumber() {
  const [puzzle, setPuzzle] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [filled, setFilled] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // See the comment in JigsawPuzzle.js: comparing against an incrementing
  // token (rather than a plain cancelled-boolean) means only the most
  // recent loadPicture() call's result is ever applied, which stays correct
  // both under React 18 StrictMode's dev-only double-invoke of effects and
  // under rapid repeated "New Picture" clicks.
  const requestIdRef = useRef(0);

  const loadPicture = useCallback(async () => {
    const myId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const bitmap = await fetchRandomAnimalBitmap();
      // Enough cells to actually resolve into a recognizable photo rather
      // than a blurry low-res mush — bigger tap targets turned out to matter
      // far less than just having enough resolution to tell what it is.
      // Hold-and-drag painting (below) is what keeps this tappable despite
      // the smaller cells, rather than relying on cell size for that.
      const result = generateColorByNumberFromBitmap(bitmap, { gridWidth: 46, numColors: 12 });
      if (myId !== requestIdRef.current) return;
      setPuzzle(result);
      setPhotoUrl(bitmapToDataURL(bitmap));
      setFilled(new Set());
    } catch (e) {
      if (myId !== requestIdRef.current) return;
      setPuzzle(null);
      setError("Couldn't load a photo to color. Check your connection and try again.");
    } finally {
      if (myId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPicture();
  }, [loadPicture]);

  const total = puzzle ? puzzle.cells.length : 0;
  const done = puzzle != null && filled.size === total;

  function fillCell(idx) {
    if (idx == null || filled.has(idx)) return;
    setFilled((prev) => {
      const next = new Set(prev);
      next.add(idx);
      return next;
    });
  }

  // Hold-and-drag painting: press down on a cell, then drag across others
  // (mouse or touch) to fill everything the pointer passes over, instead of
  // needing one tap per cell. Uses elementFromPoint on the shared grid
  // container rather than a listener per cell, so it works identically
  // whether the pointer is captured by the cell it started on or not.
  const isPaintingRef = useRef(false);

  function cellIndexAt(clientX, clientY) {
    const el = document.elementFromPoint(clientX, clientY);
    const idxAttr = el?.closest?.('[data-cell-idx]')?.getAttribute('data-cell-idx');
    return idxAttr != null ? Number(idxAttr) : null;
  }

  function handleGridPointerDown(e) {
    isPaintingRef.current = true;
    fillCell(cellIndexAt(e.clientX, e.clientY));
  }
  function handleGridPointerMove(e) {
    if (!isPaintingRef.current) return;
    fillCell(cellIndexAt(e.clientX, e.clientY));
  }
  function stopPainting() {
    isPaintingRef.current = false;
  }

  return (
    <div className="game-page">
      <div className="game-header">
        <Link to="/games" className="game-back">← Games</Link>
        <h1 className="game-title">🎨 Color by Number</h1>
        <p className="game-subtitle">Tap a cell to fill it with its matching color and reveal a real animal photo. No pressure, no clock.</p>
      </div>
      <HowToPlay>
        <p>Every cell is numbered. Each number corresponds to one color in the legend below.</p>
        <ul>
          <li>Tap any cell to paint it with its number's color — or press and drag across several cells to paint them all in one stroke.</li>
          <li>Work through the whole grid at your own pace — there's no timer and nothing to lose.</li>
          <li>Once every cell is colored, you're done! Press "New Picture" for a fresh animal photo anytime.</li>
        </ul>
      </HowToPlay>

      {loading && (
        <div className="gs-loading">
          <div className="gs-spinner" />
          <p>Fetching a photo to color...</p>
        </div>
      )}

      {!loading && error && (
        <div className="gs-error-box">
          {error}
          <div style={{ marginTop: 10 }}>
            <button type="button" className="gs-btn gs-btn-primary gs-btn-sm" onClick={loadPicture}>
              Try Again
            </button>
          </div>
        </div>
      )}

      {!loading && !error && puzzle && (
        <>
          <div className="color-by-number-legend">
            {puzzle.palette.map((color, i) => (
              <div className="color-by-number-swatch" key={i}>
                <span className="color-by-number-swatch-chip" style={{ background: rgbString(color) }}>{i + 1}</span>
              </div>
            ))}
          </div>

          <div className="color-by-number-board-wrap">
            <div
              className="color-by-number-grid"
              style={{ gridTemplateColumns: `repeat(${puzzle.gridWidth}, 1fr)`, touchAction: 'none' }}
              onPointerDown={handleGridPointerDown}
              onPointerMove={handleGridPointerMove}
              onPointerUp={stopPainting}
              onPointerCancel={stopPainting}
              onPointerLeave={stopPainting}
            >
              {puzzle.cells.map((paletteIdx, idx) => {
                const isFilled = filled.has(idx);
                return (
                  <div
                    key={idx}
                    data-cell-idx={idx}
                    className={`color-by-number-cell${isFilled ? ' is-filled' : ''}`}
                    style={isFilled ? { background: rgbString(puzzle.palette[paletteIdx]) } : undefined}
                    role="button"
                    aria-label={`Cell, color ${paletteIdx + 1}`}
                  >
                    {!isFilled && (paletteIdx + 1)}
                  </div>
                );
              })}
            </div>
          </div>
          <p className="color-by-number-hint">Tip: press and drag across cells to paint several at once. Pinch to zoom in if the numbers are too small to read.</p>

          {done && (
            <div className="color-by-number-reveal">
              <p className="color-by-number-done">🎉 Done! Here's the real photo:</p>
              {photoUrl && <img src={photoUrl} alt="The real animal photo" className="color-by-number-reveal-img" />}
            </div>
          )}

          <div className="color-by-number-footer">
            <button type="button" className="color-by-number-btn" onClick={loadPicture}>
              New Picture
            </button>
          </div>
        </>
      )}
    </div>
  );
}
