import React, { useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import HowToPlay from '../HowToPlay';

const SAND_COLOR = '#ddc79a';
const ROCK_COLORS = ['#6b665f', '#7d7268', '#5c574f', '#847a6c', '#6f6a63', '#59544c'];

const randRange = (min, max) => min + Math.random() * (max - min);

// Rock positions/sizes are stored as fractions of the canvas so the layout
// stays correct no matter what size the canvas ends up being rendered at.
function generateRocks() {
  const count = 4 + Math.floor(Math.random() * 4); // 4-7 rocks
  const rocks = [];
  for (let i = 0; i < count; i++) {
    rocks.push({
      x: randRange(0.12, 0.88),
      y: randRange(0.18, 0.86),
      rx: randRange(0.035, 0.075),
      ry: randRange(0.024, 0.05),
      rot: randRange(0, Math.PI),
      color: ROCK_COLORS[Math.floor(Math.random() * ROCK_COLORS.length)],
    });
  }
  return rocks;
}

/** A calming digital sand garden: drag to rake wavy trails through the sand,
 * with a handful of rocks scattered around that the rake marks pass under.
 * No score, no timer, no win condition — just a fresh layout every visit. */
export default function ZenGarden() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const rocksRef = useRef(generateRocks());
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const distRef = useRef(0);

  const paintSand = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = SAND_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Faint mottling so the sand isn't a totally flat color.
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const r = randRange(6, 22);
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }, []);

  const drawRock = useCallback((ctx, rock, w, h) => {
    const cx = rock.x * w;
    const cy = rock.y * h;
    const dim = Math.min(w, h);
    const rx = rock.rx * dim;
    const ry = rock.ry * dim;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rock.rot);
    // Soft shadow so the rock feels like it's resting on the sand.
    ctx.beginPath();
    ctx.ellipse(rx * 0.18, ry * 0.45, rx * 1.08, ry * 0.95, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(80,60,30,0.20)';
    ctx.fill();
    // Rock body.
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = rock.color;
    ctx.fill();
    // Subtle highlight.
    ctx.beginPath();
    ctx.ellipse(-rx * 0.28, -ry * 0.32, rx * 0.4, ry * 0.28, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fill();
    ctx.restore();
  }, []);

  const drawRocks = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    rocksRef.current.forEach((r) => drawRock(ctx, r, canvas.width, canvas.height));
  }, [drawRock]);

  const redrawAll = useCallback(() => {
    paintSand();
    drawRocks();
  }, [paintSand, drawRocks]);

  // Responsive sizing: the canvas's internal pixel size tracks the
  // container's rendered width so drawing coordinates stay accurate on any
  // screen, from a 320px phone up to a wide desktop viewport.
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const width = Math.max(240, Math.floor(rect.width));
      const height = Math.floor(width * 0.66);
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

  // Draws a short "rake" of several parallel tines along the segment from
  // p1 to p2, with a gentle sine wobble so the lines read as raked sand
  // rather than a single hard-edged stroke.
  const rake = (p1, p2) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.5) return;
    const nx = -dy / len;
    const ny = dx / len;
    distRef.current += len;

    const tineCount = 5;
    const spacing = 4;
    ctx.lineCap = 'round';
    ctx.lineWidth = 2;
    for (let i = 0; i < tineCount; i++) {
      const offset = (i - (tineCount - 1) / 2) * spacing;
      const wave = Math.sin(distRef.current / 16 + i * 1.3) * 1.4;
      const ox = nx * (offset + wave);
      const oy = ny * (offset + wave);
      ctx.beginPath();
      ctx.moveTo(p1.x + ox, p1.y + oy);
      ctx.lineTo(p2.x + ox, p2.y + oy);
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(112,86,50,0.30)' : 'rgba(240,220,180,0.35)';
      ctx.stroke();
    }
  };

  const handlePointerDown = (e) => {
    const canvas = canvasRef.current;
    canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    distRef.current = 0;
    lastPointRef.current = getPoint(e);
  };

  const handlePointerMove = (e) => {
    if (!drawingRef.current) return;
    const p = getPoint(e);
    rake(lastPointRef.current, p);
    lastPointRef.current = p;
    // Redraw rocks each stroke so rake marks always appear to pass under them.
    drawRocks();
  };

  const endStroke = (e) => {
    drawingRef.current = false;
    lastPointRef.current = null;
    const canvas = canvasRef.current;
    if (canvas && e.pointerId !== undefined) {
      try { canvas.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    }
  };

  const newGarden = () => {
    rocksRef.current = generateRocks();
    redrawAll();
  };

  const clearRakeMarks = () => {
    redrawAll();
  };

  return (
    <div className="game-page">
      <div className="game-header">
        <Link to="/games" className="game-back">← Games</Link>
        <h1 className="game-title">🪨 Zen Garden</h1>
        <p className="game-subtitle">Drag across the sand to rake calming patterns. No score, no timer.</p>
      </div>

      <HowToPlay>
        <p>Click (or touch) and drag anywhere on the sand to rake a trail through it — the rocks stay put while the rake marks weave around them.</p>
        <p>There's nothing to win here. Press <b>New Garden</b> for a fresh layout with new rocks, or <b>Clear Rake Marks</b> to smooth the sand back out without moving the rocks.</p>
      </HowToPlay>

      <div className="game-controls">
        <button className="gs-btn gs-btn-primary gs-btn-sm" onClick={newGarden}>🔄 New Garden</button>
        <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={clearRakeMarks}>Clear Rake Marks</button>
      </div>

      <div ref={containerRef} className="zen-garden-canvas-wrapper">
        <canvas
          ref={canvasRef}
          className="zen-garden-canvas"
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
