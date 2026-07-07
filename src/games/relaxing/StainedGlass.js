import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import HowToPlay from '../HowToPlay';

const FRAME_COLOR = '#2b2825';

// Curated jewel-tone palettes — deep sapphire, ruby, emerald, amber,
// amethyst — the classic leaded-glass window colors.
const JEWEL_PALETTES = [
  ['#1e3a5f', '#8e1b3c', '#1f6650', '#c98a2c', '#4a2a6b'],
  ['#0f4c75', '#b23a4e', '#2e6f40', '#d4a017', '#5b2a86'],
  ['#123c69', '#a12030', '#0e5c4a', '#b8860b', '#3d1e6d'],
  ['#284b78', '#7e1946', '#1a5d3a', '#c9782f', '#452a72'],
  ['#1a4d6e', '#9c2b3e', '#256b4f', '#c1901f', '#5a3178'],
];

const randRange = (min, max) => min + Math.random() * (max - min);
const randomPalette = () => JEWEL_PALETTES[Math.floor(Math.random() * JEWEL_PALETTES.length)];

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function darkenHex(hex, amount) {
  const h = hex.replace('#', '');
  const r = Math.max(0, parseInt(h.substring(0, 2), 16) - amount);
  const g = Math.max(0, parseInt(h.substring(2, 4), 16) - amount);
  const b = Math.max(0, parseInt(h.substring(4, 6), 16) - amount);
  return `rgb(${r}, ${g}, ${b})`;
}

// A random, roughly-convex 4-7 sided polygon centered at (cx, cy): angles
// are evenly spaced around a full turn with small jitter (keeping them
// monotonically increasing so the polygon never self-intersects) and each
// vertex's radius varies a bit for an irregular, hand-cut "glass shard"
// silhouette rather than a perfect regular polygon.
function randomShardPoints(cx, cy, baseRadius) {
  const sides = 4 + Math.floor(Math.random() * 4);
  const rotation = Math.random() * Math.PI * 2;
  const points = [];
  for (let i = 0; i < sides; i++) {
    const angle = rotation + (i / sides) * Math.PI * 2 + randRange(-0.15, 0.15) * (Math.PI * 2 / sides);
    const r = baseRadius * randRange(0.62, 1);
    points.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  return points;
}

/** A creative accumulation toy: tap anywhere to drop a randomly shaped,
 * randomly colored translucent "glass shard" that stays put, building up a
 * stained-glass mosaic across the canvas. No score, no timer, no win
 * condition — just keep tapping to fill the window. */
export default function StainedGlass() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  // Shards are stored as fractions of the canvas (0-1) so the mosaic
  // survives a resize/orientation change and can be redrawn at any size.
  const shardsRef = useRef([]);
  const [palette, setPalette] = useState(randomPalette);
  const paletteRef = useRef(palette);
  paletteRef.current = palette;

  const drawShard = useCallback((ctx, shard, width, height) => {
    const pts = shard.points.map((p) => ({ x: p.fx * width, y: p.fy * height }));
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.fillStyle = hexToRgba(shard.color, 0.5);
    ctx.fill();
    ctx.strokeStyle = darkenHex(shard.color, 60);
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // A soft highlight streak gives each shard a little glassy sheen.
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(pts[Math.min(1, pts.length - 1)].x, pts[Math.min(1, pts.length - 1)].y);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, []);

  const paintFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = FRAME_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    paintFrame();
    shardsRef.current.forEach((s) => drawShard(ctx, s, canvas.width, canvas.height));
  }, [paintFrame, drawShard]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const width = Math.max(240, Math.floor(rect.width));
      const height = Math.floor(width * 0.78);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        redrawAll();
      }
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => ro.disconnect();
  }, [redrawAll]);

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

  const placeShard = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getPoint(e);
    const unit = Math.min(canvas.width, canvas.height);
    const baseRadius = randRange(unit * 0.07, unit * 0.16);
    const color = paletteRef.current[Math.floor(Math.random() * paletteRef.current.length)];
    const points = randomShardPoints(x, y, baseRadius);
    const shard = {
      color,
      points: points.map((p) => ({ fx: p.x / canvas.width, fy: p.y / canvas.height })),
    };
    shardsRef.current.push(shard);
    drawShard(ctx, shard, canvas.width, canvas.height);
  };

  const newGlass = () => {
    shardsRef.current = [];
    setPalette(randomPalette());
    paintFrame();
  };

  return (
    <div className="game-page">
      <div className="game-header">
        <Link to="/games" className="game-back">← Games</Link>
        <h1 className="game-title">🪟 Stained Glass</h1>
        <p className="game-subtitle">Tap anywhere to drop a glass shard and build a mosaic.</p>
      </div>

      <HowToPlay>
        <p>Tap or click anywhere on the canvas to place a randomly shaped, randomly colored piece of "glass." Shards stay where you place them, so the mosaic builds up the more you tap.</p>
        <p>There's no target picture to complete — just an accumulation of jewel-toned shapes. Press <b>New Palette</b> to clear the window and start over with a fresh set of colors.</p>
      </HowToPlay>

      <div className="game-controls">
        <button className="gs-btn gs-btn-primary gs-btn-sm" onClick={newGlass}>🔄 New Palette</button>
      </div>

      <div ref={containerRef} className="stained-glass-canvas-wrapper">
        <canvas
          ref={canvasRef}
          className="stained-glass-canvas"
          style={{ touchAction: 'none', width: '100%', height: 'auto', display: 'block' }}
          onPointerDown={placeShard}
        />
      </div>
    </div>
  );
}
