import React, { useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import HowToPlay from '../HowToPlay';

const SKY_COLOR = '#070a17';
const BG_STAR_COUNT = 110;
const LINK_DISTANCE_FRACTION = 0.26; // fraction of min(width,height)

const randRange = (min, max) => min + Math.random() * (max - min);

// Tiny dim background stars for atmosphere, generated once. Positions are
// stored as fractions of the canvas so they stay correctly placed at any
// canvas size, and each carries its own twinkle speed/phase/amplitude so
// the low-frame-rate redraw loop can give them a gentle, non-uniform pulse.
function generateBgStars() {
  const stars = [];
  for (let i = 0; i < BG_STAR_COUNT; i++) {
    stars.push({
      fx: Math.random(),
      fy: Math.random(),
      r: randRange(0.4, 1.3),
      base: randRange(0.15, 0.45),
      amp: randRange(0.1, 0.3),
      speed: randRange(0.3, 0.9),
      phase: randRange(0, Math.PI * 2),
    });
  }
  return stars;
}

/** Tap to place a star on a dark night sky; nearby stars automatically get
 * thin connecting lines, so clusters of nearby taps naturally read as
 * little constellations while distant taps stay unconnected. A sprinkling
 * of tiny dim background stars twinkle gently for atmosphere. No score, no
 * timer — just build whatever sky you like. */
export default function Constellation() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const bgStarsRef = useRef(generateBgStars());
  const placedRef = useRef([]);

  // Redraws the entire scene: sky background, twinkling dim background
  // stars, faint constellation lines between nearby placed stars, then the
  // placed stars themselves (bright, with a soft glow and a slow twinkle).
  // Kept to a throttled ~10fps loop below rather than every animation
  // frame, since nothing here needs a full 60fps redraw to look smooth.
  const redraw = useCallback((t) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = SKY_COLOR;
    ctx.fillRect(0, 0, w, h);

    bgStarsRef.current.forEach((s) => {
      const alpha = Math.max(0, Math.min(1, s.base + s.amp * Math.sin(t * s.speed + s.phase)));
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(s.fx * w, s.fy * h, s.r, 0, Math.PI * 2);
      ctx.fill();
    });

    const placed = placedRef.current;
    const threshold = Math.min(w, h) * LINK_DISTANCE_FRACTION;
    ctx.strokeStyle = 'rgba(170,195,255,0.28)';
    ctx.lineWidth = 1;
    for (let i = 0; i < placed.length; i++) {
      const a = placed[i];
      const ax = a.fx * w;
      const ay = a.fy * h;
      for (let j = i + 1; j < placed.length; j++) {
        const b = placed[j];
        const bx = b.fx * w;
        const by = b.fy * h;
        const dist = Math.hypot(ax - bx, ay - by);
        if (dist <= threshold) {
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();
        }
      }
    }

    placed.forEach((s) => {
      const x = s.fx * w;
      const y = s.fy * h;
      const tw = 0.75 + 0.25 * Math.sin(t * 1.4 + s.phase);
      ctx.save();
      ctx.shadowColor = 'rgba(220,235,255,0.95)';
      ctx.shadowBlur = 9 * tw;
      ctx.fillStyle = `rgba(255,255,255,${0.7 + 0.3 * tw})`;
      ctx.beginPath();
      ctx.arc(x, y, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }, []);

  // Throttled redraw loop: a cheap ~10fps canvas redraw is enough for a
  // convincing gentle twinkle without repainting hundreds of stars at 60fps.
  useEffect(() => {
    let raf;
    let last = 0;
    const loop = (now) => {
      if (now - last >= 100) {
        last = now;
        redraw(now / 1000);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [redraw]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const width = Math.max(240, Math.floor(rect.width));
      const height = Math.floor(width * 0.62);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        redraw(performance.now() / 1000);
      }
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => ro.disconnect();
  }, [redraw]);

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

  const placeStar = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { x, y } = getPoint(e);
    placedRef.current.push({
      fx: x / canvas.width,
      fy: y / canvas.height,
      phase: Math.random() * Math.PI * 2,
    });
    redraw(performance.now() / 1000);
  };

  const newSky = () => {
    placedRef.current = [];
    bgStarsRef.current = generateBgStars();
    redraw(performance.now() / 1000);
  };

  return (
    <div className="game-page">
      <div className="game-header">
        <Link to="/games" className="game-back">← Games</Link>
        <h1 className="game-title">⭐ Constellation</h1>
        <p className="game-subtitle">Tap to place stars — nearby ones link up into little constellations.</p>
      </div>

      <HowToPlay>
        <p>Tap or click anywhere on the night sky to place a star. Place another star near one you already placed and a thin line connects them automatically — cluster your taps to draw little constellation shapes, or spread them out to keep stars unlinked.</p>
        <p>There's nothing to win. Press <b>New Sky</b> to clear all your stars and start a fresh sky.</p>
      </HowToPlay>

      <div className="game-controls">
        <button className="gs-btn gs-btn-primary gs-btn-sm" onClick={newSky}>🔄 New Sky</button>
      </div>

      <div ref={containerRef} className="constellation-canvas-wrapper">
        <canvas
          ref={canvasRef}
          className="constellation-canvas"
          style={{ touchAction: 'none', width: '100%', height: 'auto', display: 'block' }}
          onPointerDown={placeStar}
        />
      </div>
    </div>
  );
}
