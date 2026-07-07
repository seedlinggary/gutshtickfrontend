import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import HowToPlay from '../HowToPlay';

const BG_COLOR = '#1b1a24';
const SYMMETRY_OPTIONS = [6, 8, 10, 12];
const PALETTES = [
  ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa'],
  ['#f783ac', '#e64980', '#cc5de8', '#845ef7', '#5c7cfa'],
  ['#63e6be', '#38d9a9', '#20c997', '#12b886', '#0ca678'],
  ['#ffd43b', '#fcc419', '#fab005', '#f59f00', '#f08c00'],
  ['#74c0fc', '#4dabf7', '#339af0', '#228be6', '#1c7ed6'],
  ['#ffa8a8', '#ff8787', '#ff6b6b', '#fa5252', '#f03f3f'],
];

const randomSymmetry = () => SYMMETRY_OPTIONS[Math.floor(Math.random() * SYMMETRY_OPTIONS.length)];
const randomPalette = () => PALETTES[Math.floor(Math.random() * PALETTES.length)];

const polar = (p, c) => ({ r: Math.hypot(p.x - c.x, p.y - c.y), a: Math.atan2(p.y - c.y, p.x - c.x) });
const cartesian = (pt, c) => ({ x: c.x + pt.r * Math.cos(pt.a), y: c.y + pt.r * Math.sin(pt.a) });

/** A kaleidoscope drawing toy: every stroke is mirrored and rotated around
 * the center across N symmetry axes, so one drag produces a full
 * radially-symmetric mandala pattern. No score, no win condition. */
export default function MandalaDraw() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const clippedRef = useRef(false);

  const [symmetry, setSymmetry] = useState(randomSymmetry);
  const [palette, setPalette] = useState(randomPalette);
  const [color, setColor] = useState(() => palette[0]);
  const symmetryRef = useRef(symmetry);
  const colorRef = useRef(color);
  symmetryRef.current = symmetry;
  colorRef.current = color;

  // Resets the canvas to a blank slate: fills the background, draws a
  // guide ring, and (re-)establishes a circular clip so all subsequent
  // drawing stays inside the circular "mandala" area.
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (clippedRef.current) {
      ctx.restore();
      clippedRef.current = false;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = Math.min(cx, cy) - 6;

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    clippedRef.current = true;
  }, []);

  // Responsive square canvas sized from the container's rendered width.
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const size = Math.max(220, Math.floor(rect.width));
      if (canvas.width !== size || canvas.height !== size) {
        canvas.width = size;
        canvas.height = size;
        initCanvas();
      }
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => ro.disconnect();
  }, [initCanvas]);

  const getPoint = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // Mirrors + rotates the segment (p1 -> p2) across every symmetry axis so
  // one drag draws the whole radially-symmetric pattern at once.
  const drawMandalaSegment = (p1, p2) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const center = { x: canvas.width / 2, y: canvas.height / 2 };
    const n = symmetryRef.current;
    const P1 = polar(p1, center);
    const P2 = polar(p2, center);

    ctx.lineCap = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = colorRef.current;

    for (let i = 0; i < n; i++) {
      const rot = (i * 2 * Math.PI) / n;

      const a1 = cartesian({ r: P1.r, a: P1.a + rot }, center);
      const a2 = cartesian({ r: P2.r, a: P2.a + rot }, center);
      ctx.beginPath();
      ctx.moveTo(a1.x, a1.y);
      ctx.lineTo(a2.x, a2.y);
      ctx.stroke();

      // Mirrored copy (reflect the angle before rotating) doubles the
      // symmetry axes so the pattern also has reflective symmetry.
      const b1 = cartesian({ r: P1.r, a: -P1.a + rot }, center);
      const b2 = cartesian({ r: P2.r, a: -P2.a + rot }, center);
      ctx.beginPath();
      ctx.moveTo(b1.x, b1.y);
      ctx.lineTo(b2.x, b2.y);
      ctx.stroke();
    }
  };

  const handlePointerDown = (e) => {
    const canvas = canvasRef.current;
    canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastPointRef.current = getPoint(e);
  };

  const handlePointerMove = (e) => {
    if (!drawingRef.current) return;
    const p = getPoint(e);
    drawMandalaSegment(lastPointRef.current, p);
    lastPointRef.current = p;
  };

  const endStroke = (e) => {
    drawingRef.current = false;
    lastPointRef.current = null;
    const canvas = canvasRef.current;
    if (canvas && e.pointerId !== undefined) {
      try { canvas.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    }
  };

  const newPattern = () => {
    const nextPalette = randomPalette();
    setSymmetry(randomSymmetry());
    setPalette(nextPalette);
    setColor(nextPalette[0]);
    initCanvas();
  };

  const clearDrawing = () => {
    initCanvas();
  };

  return (
    <div className="game-page">
      <div className="game-header">
        <Link to="/games" className="game-back">← Games</Link>
        <h1 className="game-title">🌸 Mandala Draw</h1>
        <p className="game-subtitle">Drag inside the circle — every stroke mirrors into a full symmetric pattern.</p>
      </div>

      <HowToPlay>
        <p>Click (or touch) and drag inside the circle. Whatever you draw is automatically mirrored and rotated around the center, so one stroke fills out a whole radially-symmetric mandala.</p>
        <p>Pick a color swatch to change what you're drawing with. Press <b>New Pattern</b> for a new symmetry count and color palette (and a clean canvas), or <b>Clear</b> to wipe the current drawing without changing those settings.</p>
      </HowToPlay>

      <div className="game-controls">
        <button className="gs-btn gs-btn-primary gs-btn-sm" onClick={newPattern}>🔄 New Pattern</button>
        <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={clearDrawing}>Clear</button>
      </div>

      <div className="mandala-swatch-row">
        {palette.map((c) => (
          <button
            key={c}
            className={`mandala-swatch${c === color ? ' active' : ''}`}
            style={{ background: c }}
            aria-label={`Use color ${c}`}
            onClick={() => setColor(c)}
          />
        ))}
        <span className="mandala-symmetry-label">{symmetry}-way symmetry</span>
      </div>

      <div ref={containerRef} className="mandala-canvas-wrapper">
        <canvas
          ref={canvasRef}
          className="mandala-canvas"
          style={{ touchAction: 'none', width: '100%', height: 'auto', display: 'block' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
        />
      </div>
    </div>
  );
}
