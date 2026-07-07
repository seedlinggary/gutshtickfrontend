import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import HowToPlay from '../HowToPlay';
import { fetchRandomAnimalBitmap } from './animalImage';

// Target piece counts per difficulty — the actual column/row split is
// computed from each photo's real aspect ratio (see computeGridDims), so the
// true piece count varies a bit from these but stays close.
const SIZES = [
  [9, 'Easy'],
  [16, 'Medium'],
  [25, 'Hard'],
];

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Picks a column/row split that both (a) multiplies out to close to
// targetTotal pieces and (b) matches the photo's actual aspect ratio, so
// each piece stays square and the assembled image isn't stretched —
// previously this always forced an n×n grid regardless of whether the photo
// was portrait or landscape, visibly distorting anything non-square.
function computeGridDims(aspect, targetTotal) {
  const cols = Math.max(2, Math.round(Math.sqrt(targetTotal * aspect)));
  const rows = Math.max(2, Math.round(Math.sqrt(targetTotal / aspect)));
  return { cols, rows };
}

// Draws the fetched bitmap into an offscreen canvas (capped to a sane max
// dimension so we're not shipping a multi-megabyte source image around for a
// ~440px puzzle board) and turns it into an object URL for use as a plain
// CSS background-image. Blob-URL-derived canvases are never cross-origin
// tainted, so toBlob works fine here even though the underlying photo came
// from a third-party CDN via our proxy.
function bitmapToObjectURL(bitmap, maxDim = 900) {
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(URL.createObjectURL(blob));
      else reject(new Error('Failed to encode puzzle image'));
    }, 'image/jpeg', 0.88);
  });
}

const makePieces = (total) => Array.from({ length: total }, () => ({ currentSlot: null }));
const shuffledIds = (total) => shuffle(Array.from({ length: total }, (_, i) => i));

function pieceStyle(id, cols, rows, photoUrl) {
  const col = id % cols;
  const row = Math.floor(id / cols);
  const pctX = cols === 1 ? 0 : 100 / (cols - 1);
  const pctY = rows === 1 ? 0 : 100 / (rows - 1);
  return {
    backgroundImage: photoUrl ? `url(${photoUrl})` : undefined,
    backgroundSize: `${cols * 100}% ${rows * 100}%`,
    backgroundPosition: `${col * pctX}% ${row * pctY}%`,
  };
}

/** A jigsaw puzzle sliced from a real animal photo fetched via our backend
 * proxy. No drag-and-drop API — pieces are placed with a simple
 * tap-to-pick-up, tap-to-place interaction so it works identically with
 * mouse and touch. No fail state or timer; just keep going until it's
 * solved. */
export default function JigsawPuzzle() {
  const [targetTotal, setTargetTotal] = useState(16);
  const [grid, setGrid] = useState({ cols: 4, rows: 4 });
  const [photoUrl, setPhotoUrl] = useState(null);
  const [pieces, setPieces] = useState(() => makePieces(16));
  const [order, setOrder] = useState(() => shuffledIds(16));
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const photoUrlRef = useRef(null);
  // A monotonically increasing token identifying the "latest" load. Using a
  // single boolean cancelled-flag here would break under React 18 StrictMode
  // (which mounts -> cleans up -> re-mounts effects once in dev) and under
  // rapid repeated "New Puzzle" clicks: an in-flight older fetch could
  // resolve after a newer one and clobber its result. Comparing against the
  // token instead means only the most recent call's result is ever applied,
  // and a stale one that finishes late just cleans up its own blob URL.
  const requestIdRef = useRef(0);

  const loadPuzzle = useCallback(async (nextTargetTotal) => {
    const myId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const bitmap = await fetchRandomAnimalBitmap();
      const url = await bitmapToObjectURL(bitmap);
      if (myId !== requestIdRef.current) {
        URL.revokeObjectURL(url);
        return;
      }
      const { cols, rows } = computeGridDims(bitmap.width / bitmap.height, nextTargetTotal);
      const total = cols * rows;
      if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
      photoUrlRef.current = url;
      setPhotoUrl(url);
      setPieces(makePieces(total));
      setOrder(shuffledIds(total));
      setSelected(null);
      setGrid({ cols, rows });
      setTargetTotal(nextTargetTotal);
    } catch (e) {
      if (myId !== requestIdRef.current) return;
      setError('Could not load a photo for this puzzle. Check your connection and try again.');
    } finally {
      if (myId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPuzzle(targetTotal);
    return () => {
      if (photoUrlRef.current) {
        URL.revokeObjectURL(photoUrlRef.current);
        photoUrlRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gridSize = grid.cols * grid.rows;

  const slotMap = useMemo(() => {
    const m = new Array(gridSize).fill(null);
    pieces.forEach((p, id) => {
      if (p.currentSlot !== null) m[p.currentSlot] = id;
    });
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pieces, gridSize]);

  const trayIds = order.filter((id) => pieces[id]?.currentSlot === null);
  const complete = pieces.length > 0 && pieces.every((p, id) => p.currentSlot === id);

  const selectFromTray = (id) => {
    setSelected((sel) => (sel === id ? null : id));
  };

  const handleSlotClick = (slotIndex) => {
    if (selected == null) {
      const occupantId = slotMap[slotIndex];
      if (occupantId !== null) setSelected(occupantId);
      return;
    }
    setPieces((prev) => {
      const next = prev.map((p) => ({ ...p }));
      const occupantId = next.findIndex((p) => p.currentSlot === slotIndex);
      const prevSlotOfSelected = next[selected].currentSlot;
      if (occupantId !== -1 && occupantId !== selected) {
        next[occupantId].currentSlot = prevSlotOfSelected;
      }
      next[selected].currentSlot = slotIndex;
      return next;
    });
    setSelected(null);
  };

  return (
    <div className="game-page">
      <div className="game-header">
        <Link to="/games" className="game-back">← Games</Link>
        <h1 className="game-title">🧩 Jigsaw Puzzle</h1>
        <p className="game-subtitle">Piece together a real animal photo. Tap a piece, then tap where it goes.</p>
      </div>

      <HowToPlay>
        <p>Tap a piece in the tray below to pick it up — it'll get a highlighted ring. Then tap an empty square on the board to place it there.</p>
        <p>Tap a piece already on the board to pick it back up and move it. If you tap a slot that's already occupied while holding a piece, the two pieces swap.</p>
        <p>Pieces in the correct spot get a green outline. No timer, no fail state — press <b>New Puzzle</b> any time for a fresh photo.</p>
      </HowToPlay>

      <div className="game-controls-bar">
        <div className="game-difficulty-select">
          {SIZES.map(([n, label]) => (
            <button
              key={n}
              type="button"
              className={`difficulty-btn${targetTotal === n ? ' active' : ''}`}
              onClick={() => loadPuzzle(n)}
              disabled={loading}
            >
              {label}
            </button>
          ))}
        </div>
        <button type="button" className="gs-btn gs-btn-primary gs-btn-sm" onClick={() => loadPuzzle(targetTotal)} disabled={loading}>
          🔄 New Puzzle
        </button>
      </div>

      {loading && (
        <div className="gs-loading">
          <div className="gs-spinner" />
          <p>Fetching a photo for your puzzle...</p>
        </div>
      )}

      {!loading && error && (
        <div className="gs-error-box">
          {error}
          <div style={{ marginTop: 10 }}>
            <button type="button" className="gs-btn gs-btn-primary gs-btn-sm" onClick={() => loadPuzzle(targetTotal)}>
              Try Again
            </button>
          </div>
        </div>
      )}

      {!loading && !error && photoUrl && (
        <>
          {complete && <div className="game-result-banner won">🎉 Complete! Nice work.</div>}

          <div className="jigsaw-game" style={{ '--jigsaw-cols': grid.cols, '--jigsaw-rows': grid.rows }}>
            <div className="jigsaw-board-wrap">
              <div className="jigsaw-board">
                {Array.from({ length: gridSize }).map((_, slotIndex) => {
                  const occupantId = slotMap[slotIndex];
                  const isCorrect = occupantId !== null && occupantId === slotIndex;
                  const isSelected = occupantId !== null && occupantId === selected;
                  return (
                    <button
                      key={slotIndex}
                      type="button"
                      className={`jigsaw-slot${isCorrect ? ' correct' : ''}${isSelected ? ' selected' : ''}`}
                      onClick={() => handleSlotClick(slotIndex)}
                      aria-label={`Board position ${slotIndex + 1}`}
                    >
                      {occupantId !== null && (
                        <span className="jigsaw-piece jigsaw-piece-in-slot" style={pieceStyle(occupantId, grid.cols, grid.rows, photoUrl)} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="jigsaw-tray">
              {trayIds.length === 0 && !complete && (
                <span className="jigsaw-tray-empty">Tray is empty — swap pieces on the board to fix any that are out of place.</span>
              )}
              {trayIds.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`jigsaw-piece jigsaw-piece-tray${selected === id ? ' selected' : ''}`}
                  style={pieceStyle(id, grid.cols, grid.rows, photoUrl)}
                  onClick={() => selectFromTray(id)}
                  aria-label="Puzzle piece"
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
