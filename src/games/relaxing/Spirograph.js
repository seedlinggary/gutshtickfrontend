import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import HowToPlay from '../HowToPlay';

const BG_COLOR = '#1b1a24';
const COLORS = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa', '#f783ac', '#63e6be'];

// Small integer ratios between R and r tend to produce closed, visually
// interesting hypotrochoid curves (the number of "petals" relates to the
// ratio of R to the difference R-r). We pick R and r as small integers
// (scaled up later) so R/gcd(R,r) stays small and the curve closes cleanly
// within a reasonable number of loops.
function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }

function randomPattern() {
  const R = 5 + Math.floor(Math.random() * 8); // 5-12
  let r;
  do {
    r = 2 + Math.floor(Math.random() * (R - 2)); // 2..R-1
  } while (gcd(R, r) === R); // avoid r === R edge case (gcd(R,R)=R)
  const d = 1 + Math.random() * (r - 0.5); // 0 < d < ~r
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  return { R, r, d, color };
}

/** A classic spirograph / hypotrochoid drawing toy: a small "wheel" gear of
 * radius r rolls inside a "ring" gear of radius R, tracing a loopy curve
 * with a pen offset d from the wheel's center. The curve is animated in
 * progressively, point by point, since watching it trace out is the whole
 * appeal. No score, no timer — just press New Pattern for a new shape. */
export default function Spirograph() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const tRef = useRef(0);
  const lastPointRef = useRef(null);

  const [pattern, setPattern] = useState(randomPattern);
  const patternRef = useRef(pattern);
  patternRef.current = pattern;

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const stop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // Traces the hypotrochoid curve for the current pattern, a small step of
  // `t` per animation frame, drawing a line segment from the previous point
  // to the new one so the curve appears to grow rather than pop in at once.
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { R, r, d, color } = patternRef.current;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    // Scale the pattern's abstract units to fit comfortably in the canvas.
    const scale = (Math.min(canvas.width, canvas.height) / 2 - 12) / R;

    const step = 0.06;
    // The curve closes after the wheel has made r full revolutions around
    // the inside of the ring for the integer R/r ratios we generate here.
    const tMax = 2 * Math.PI * r;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;

    const pointAt = (t) => ({
      x: cx + scale * ((R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t)),
      y: cy + scale * ((R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t)),
    });

    const drawFrame = () => {
      if (tRef.current === 0) {
        lastPointRef.current = pointAt(0);
      }
      // Draw several small steps per frame so the curve completes at a
      // pleasant pace rather than taking forever for large r.
      const stepsPerFrame = 3;
      for (let i = 0; i < stepsPerFrame; i++) {
        tRef.current += step;
        const p = pointAt(tRef.current);
        ctx.beginPath();
        ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        lastPointRef.current = p;
        if (tRef.current >= tMax) break;
      }
      if (tRef.current < tMax) {
        rafRef.current = requestAnimationFrame(drawFrame);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(drawFrame);
  }, []);

  const restart = useCallback(() => {
    stop();
    tRef.current = 0;
    lastPointRef.current = null;
    clearCanvas();
    animate();
  }, [stop, clearCanvas, animate]);

  // Responsive square canvas, sized from the container's rendered width.
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
        restart();
      }
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => stop, [stop]);

  const newPattern = () => {
    setPattern(randomPattern());
  };

  // Whenever the pattern state actually changes, restart the animation with it.
  useEffect(() => {
    patternRef.current = pattern;
    restart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pattern]);

  // Tap/click anywhere on the canvas restarts the same pattern from scratch.
  const handlePointerDown = () => {
    restart();
  };

  return (
    <div className="game-page">
      <div className="game-header">
        <Link to="/games" className="game-back">← Games</Link>
        <h1 className="game-title">🌀 Spirograph</h1>
        <p className="game-subtitle">Watch a hypotrochoid curve trace itself out, loop by loop.</p>
      </div>

      <HowToPlay>
        <p>A little "wheel" gear rolls around inside a "ring" gear, and a pen offset from the wheel traces the looping curve you see draw itself in.</p>
        <p>Tap or click anywhere on the canvas to restart the current pattern from the beginning. Press <b>New Pattern</b> for a new gear ratio, pen offset, and color.</p>
      </HowToPlay>

      <div className="game-controls">
        <button className="gs-btn gs-btn-primary gs-btn-sm" onClick={newPattern}>🔄 New Pattern</button>
        <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={restart}>Restart</button>
      </div>

      <div ref={containerRef} className="spirograph-canvas-wrapper">
        <canvas
          ref={canvasRef}
          className="spirograph-canvas"
          style={{ touchAction: 'none', width: '100%', height: 'auto', display: 'block' }}
          onPointerDown={handlePointerDown}
        />
      </div>
    </div>
  );
}
