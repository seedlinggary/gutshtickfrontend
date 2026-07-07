import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import HowToPlay from '../HowToPlay';
import { fetchRandomAnimalBitmap } from './animalImage';
import { generateDotToDotFromBitmap } from './dotToDotGen';

const MAX_ATTEMPTS = 4;

// Downsizes the source bitmap and returns a small JPEG data URL, used only
// as a faded backdrop behind the dots. A data URL (rather than an object
// URL) needs no manual revoke bookkeeping, which is fine here since we only
// ever hold one at a time and it's small.
function bitmapToDataURL(bitmap, maxDim = 320) {
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', 0.82);
}

export default function DotToDot() {
  const [puzzle, setPuzzle] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [progress, setProgress] = useState(0);
  const [shakeIndex, setShakeIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // See the comment in JigsawPuzzle.js: a plain cancelled-boolean breaks
  // under React 18 StrictMode's dev-only double-invoke of effects (an
  // earlier "cancelled" call can un-cancel itself when the effect re-runs).
  // Comparing against an incrementing token instead means only the most
  // recent loadPuzzle() call's result is ever applied.
  const requestIdRef = useRef(0);

  const loadPuzzle = useCallback(async () => {
    const myId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      let bitmap;
      try {
        bitmap = await fetchRandomAnimalBitmap();
      } catch (e) {
        if (myId !== requestIdRef.current) return;
        setPuzzle(null);
        setError("Couldn't load a photo. Check your connection and try again.");
        setLoading(false);
        return;
      }
      if (myId !== requestIdRef.current) return;
      // More points traced against a finer source mask makes the connected
      // outline noticeably more detailed/recognizable, at the cost of each
      // dot needing to be smaller — see the dynamic radius/font-size below.
      const result = generateDotToDotFromBitmap(bitmap, { numPoints: 34, gridWidth: 110 });
      if (result) {
        setPuzzle({ points: result.points.map(([x, y]) => ({ x, y })), key: Math.random().toString(36).slice(2) });
        setPhotoUrl(bitmapToDataURL(bitmap));
        setProgress(0);
        setShakeIndex(null);
        setLoading(false);
        return;
      }
      // Degenerate silhouette — try another photo.
    }
    if (myId !== requestIdRef.current) return;
    setPuzzle(null);
    setError("Couldn't find a good outline in that photo — try New Picture.");
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPuzzle();
  }, [loadPuzzle]);

  const total = puzzle ? puzzle.points.length : 0;
  const completed = puzzle != null && progress >= total;
  // More dots means less space between them — shrink the visible circle and
  // number to match so they don't overlap, but never shrink the actual tap
  // target (a separate larger invisible circle) below a usable size.
  const dotRadius = puzzle ? Math.max(1.6, Math.min(4.6, 75 / total)) : 4.6;
  const fontSize = Math.max(1.4, dotRadius * 0.92);

  const handleDotDown = useCallback((e, i) => {
    e.preventDefault();
    if (i === progress) {
      setProgress((p) => p + 1);
    } else {
      setShakeIndex(i);
      window.setTimeout(() => setShakeIndex((cur) => (cur === i ? null : cur)), 300);
    }
  }, [progress]);

  const linePoints = useMemo(
    () => (puzzle ? puzzle.points.slice(0, progress).map((p) => `${p.x},${p.y}`).join(' ') : ''),
    [puzzle, progress]
  );

  return (
    <div className="game-page">
      <div className="game-header">
        <Link to="/games" className="game-back">← Games</Link>
        <h1 className="game-title">🔢 Dot to Dot</h1>
        <p className="game-subtitle">Connect the dots in order to reveal a real animal photo. No timer, no score.</p>
      </div>

      <HowToPlay>
        <p><b>Objective:</b> tap or click the dots in order — 1, then 2, then 3 — to trace the hidden picture.</p>
        <ul>
          <li>Tapping the correct next dot draws a line to it and marks it done.</li>
          <li>Tapping a dot out of order is simply ignored — there's no penalty, just find the right one.</li>
          <li>Finish connecting every dot to reveal the completed picture.</li>
          <li>Press "New Picture" any time for a fresh photo.</li>
        </ul>
      </HowToPlay>

      <div className="dot-to-dot-wrap">
        {loading && (
          <div className="gs-loading">
            <div className="gs-spinner" />
            <p>Finding a good outline...</p>
          </div>
        )}

        {!loading && error && (
          <div className="gs-error-box">
            {error}
            <div style={{ marginTop: 10 }}>
              <button type="button" className="gs-btn gs-btn-primary gs-btn-sm" onClick={loadPuzzle}>
                New Picture
              </button>
            </div>
          </div>
        )}

        {!loading && !error && puzzle && (
          <>
            <p className="dot-to-dot-progress">
              {completed ? 'All connected!' : `Find dot #${progress + 1} of ${total}`}
            </p>

            <div className="dot-to-dot-board">
              <svg className="dot-to-dot-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                {photoUrl && (
                  <image
                    href={photoUrl}
                    x="0" y="0" width="100" height="100"
                    preserveAspectRatio="xMidYMid slice"
                    opacity={completed ? 0.85 : 0.12}
                    style={{ transition: 'opacity .4s ease' }}
                  />
                )}
                {progress > 1 && (
                  <polyline
                    points={linePoints}
                    className={`dot-to-dot-line${completed ? ' complete' : ''}`}
                    fill="none"
                  />
                )}
                {puzzle.points.map((p, i) => {
                  const state = i < progress ? 'done' : i === progress ? 'next' : '';
                  const shaking = shakeIndex === i ? ' shake' : '';
                  return (
                    <g
                      key={i}
                      className={`dot-to-dot-dot ${state}${shaking}`}
                      onPointerDown={(e) => handleDotDown(e, i)}
                    >
                      {/* Invisible larger hit area — keeps taps easy even
                          though the visible dot shrinks at high dot counts. */}
                      <circle cx={p.x} cy={p.y} r={Math.max(dotRadius, 3.2)} style={{ fill: 'transparent', stroke: 'none' }} />
                      <circle cx={p.x} cy={p.y} r={dotRadius} />
                      <text x={p.x} y={p.y} dominantBaseline="central" style={{ fontSize: `${fontSize}px` }}>{i + 1}</text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {completed && <p className="dot-to-dot-complete">🎉 Picture complete!</p>}

            <div className="dot-to-dot-controls">
              <button className="gs-btn gs-btn-primary gs-btn-sm" onClick={loadPuzzle}>New Picture</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
