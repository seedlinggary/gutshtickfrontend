import React, { useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import HowToPlay from '../HowToPlay';

const BG_COLOR = '#f4efe2';

const randRange = (min, max) => min + Math.random() * (max - min);

// Builds a randomized branching tree ("bloom") rooted at (x, y): a trunk
// segment, then 2-3 child branches at randomized angle offsets and shorter
// lengths recursing 3-5 levels deep, terminating in small flower blobs at
// the tips. Every segment/blob carries a `delay` (ms, relative to the
// bloom's own start) and `duration` (ms) so the caller can animate the
// whole tree growing in over time rather than appearing instantly.
function buildBloom(x, y, unit) {
  const branches = [];
  const blobs = [];
  const branchHue = 85 + Math.random() * 55; // olive -> green
  const flowerHue = Math.random() * 360;
  const maxDepth = 3 + Math.floor(Math.random() * 3); // 3-5 levels deep

  function recurse(x1, y1, angle, length, depth, delay) {
    const duration = 220 - depth * 18;
    const x2 = x1 + length * Math.cos(angle);
    const y2 = y1 + length * Math.sin(angle);
    const width = Math.max(1, Math.max(3, unit * 0.45) * Math.pow(0.72, depth));

    branches.push({
      x1, y1, x2, y2,
      color: `hsl(${branchHue}, 42%, ${26 + depth * 5}%)`,
      width,
      delay,
      duration,
    });

    const nextDelay = delay + duration * 0.55;

    if (depth >= maxDepth) {
      blobs.push({
        x: x2,
        y: y2,
        r: unit * (1.3 + Math.random() * 1.3),
        hue: (flowerHue + randRange(-24, 24) + 360) % 360,
        sat: 62 + Math.random() * 18,
        light: 55 + Math.random() * 12,
        delay: delay + duration,
        duration: 220 + Math.random() * 160,
      });
      return;
    }

    const childCount = depth === 0 ? 2 + Math.floor(Math.random() * 2) : (Math.random() < 0.7 ? 2 : 3);
    const spread = 0.4 + Math.random() * 0.35;
    for (let i = 0; i < childCount; i++) {
      const t = childCount === 1 ? 0 : i / (childCount - 1) - 0.5;
      const angleOffset = t * spread * 2 + randRange(-0.12, 0.12);
      const newAngle = angle + angleOffset;
      const newLength = length * (0.6 + Math.random() * 0.2);
      recurse(x2, y2, newAngle, newLength, depth + 1, nextDelay);
    }
  }

  const trunkLength = unit * (7 + Math.random() * 5);
  const trunkAngle = -Math.PI / 2 + randRange(-0.25, 0.25);
  recurse(x, y, trunkAngle, trunkLength, 0, 0);

  return { branches, blobs };
}

/** A calming tap-to-grow garden toy: click/tap anywhere to plant a
 * procedurally generated branching bloom (a randomized recursive tree that
 * terminates in colorful flower blobs) that grows in over about half a
 * second. Blooms accumulate — nothing is ever cleared automatically — so
 * repeated taps build up a colorful garden across the canvas. No score,
 * no timer, no win condition. */
export default function FractalBloom() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const activeRef = useRef({ branches: [], blobs: [] });

  const paintBackground = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const tick = useCallback((now) => {
    const canvas = canvasRef.current;
    if (!canvas) { rafRef.current = null; return; }
    const ctx = canvas.getContext('2d');
    const active = activeRef.current;
    let stillActive = false;

    active.branches = active.branches.filter((b) => {
      if (now < b.delay) { stillActive = true; return true; }
      const p = Math.min(1, (now - b.delay) / b.duration);
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      ctx.lineTo(b.x1 + (b.x2 - b.x1) * p, b.y1 + (b.y2 - b.y1) * p);
      ctx.strokeStyle = b.color;
      ctx.lineWidth = b.width;
      ctx.lineCap = 'round';
      ctx.stroke();
      if (p < 1) { stillActive = true; return true; }
      return false;
    });

    active.blobs = active.blobs.filter((f) => {
      if (now < f.delay) { stillActive = true; return true; }
      const raw = Math.min(1, (now - f.delay) / f.duration);
      const p = raw * raw * (3 - 2 * raw); // smoothstep, feels less mechanical
      const rad = f.r * p;
      ctx.beginPath();
      ctx.arc(f.x, f.y, rad, 0, Math.PI * 2);
      ctx.fillStyle = `hsl(${f.hue}, ${f.sat}%, ${f.light}%)`;
      ctx.fill();
      if (rad > 1.5) {
        ctx.beginPath();
        ctx.arc(f.x, f.y, rad * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${f.hue}, ${Math.min(100, f.sat + 10)}%, ${Math.max(0, f.light - 24)}%)`;
        ctx.fill();
      }
      if (raw < 1) { stillActive = true; return true; }
      return false;
    });

    rafRef.current = stillActive ? requestAnimationFrame(tick) : null;
  }, []);

  const startLoop = useCallback(() => {
    if (!rafRef.current) rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  // Responsive canvas sizing, mirroring ZenGarden/MandalaDraw: the internal
  // pixel size tracks the container's rendered width. A resize necessarily
  // clears the canvas buffer, so we also reset the in-progress animation
  // list and repaint the background — the same tradeoff ZenGarden makes
  // when its rake marks are lost on resize.
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const width = Math.max(240, Math.floor(rect.width));
      const height = Math.floor(width * 0.72);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        activeRef.current = { branches: [], blobs: [] };
        paintBackground();
      }
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => ro.disconnect();
  }, [paintBackground]);

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

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

  const plantBloom = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = getPoint(e);
    const unit = Math.min(canvas.width, canvas.height) / 60;
    const { branches, blobs } = buildBloom(x, y, unit);
    const now = performance.now();
    const active = activeRef.current;
    branches.forEach((b) => active.branches.push({ ...b, delay: now + b.delay }));
    blobs.forEach((f) => active.blobs.push({ ...f, delay: now + f.delay }));
    startLoop();
  };

  const newGarden = () => {
    activeRef.current = { branches: [], blobs: [] };
    paintBackground();
  };

  return (
    <div className="game-page">
      <div className="game-header">
        <Link to="/games" className="game-back">← Games</Link>
        <h1 className="game-title">🌺 Fractal Bloom</h1>
        <p className="game-subtitle">Tap anywhere to plant a bloom. Taps build up into a colorful garden.</p>
      </div>

      <HowToPlay>
        <p>Tap or click anywhere on the canvas to plant a randomized branching bloom — watch it grow its branches and flower at the tips over about a second.</p>
        <p>Blooms never get cleared automatically, so keep tapping to fill the canvas with a garden of differently colored, differently shaped blooms. Press <b>New Garden</b> to clear everything and start fresh.</p>
      </HowToPlay>

      <div className="game-controls">
        <button className="gs-btn gs-btn-primary gs-btn-sm" onClick={newGarden}>🔄 New Garden</button>
      </div>

      <div ref={containerRef} className="fractal-bloom-canvas-wrapper">
        <canvas
          ref={canvasRef}
          className="fractal-bloom-canvas"
          style={{ touchAction: 'none', width: '100%', height: 'auto', display: 'block' }}
          onPointerDown={plantBloom}
        />
      </div>
    </div>
  );
}
