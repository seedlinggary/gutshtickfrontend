import React, { useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import HowToPlay from '../HowToPlay';

const BG_COLOR = '#06060e';
const FADE = 'rgba(6,6,14,0.09)';

/** The simplest of the relaxing toys: drag your finger or mouse across the
 * canvas and a glowing trail follows, fading out gradually rather than
 * persisting — classic light-trail / long-exposure pointer tracking. Purely
 * ambient, no objective. The trail color slowly cycles through the color
 * wheel as you draw, and "New Colors" jumps it to a fresh hue. */
export default function LightTrails() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const queueRef = useRef([]);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const hueRef = useRef(Math.random() * 360);

  const paintSolidBg = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  // Draws one trail segment with a soft outer glow (wide, blurred, hue
  // colored) plus a thin bright core (near-white) so the trail reads as
  // glowing light rather than a flat colored line.
  const drawSegment = (ctx, seg) => {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = seg.color;
    ctx.shadowBlur = 16;
    ctx.strokeStyle = seg.color;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(seg.x1, seg.y1);
    ctx.lineTo(seg.x2, seg.y2);
    ctx.stroke();

    ctx.shadowBlur = 6;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(seg.x1, seg.y1);
    ctx.lineTo(seg.x2, seg.y2);
    ctx.stroke();
    ctx.restore();
  };

  // Runs continuously: each frame paints a low-alpha dark overlay across the
  // whole canvas (which is what makes older strokes fade toward the
  // background instead of persisting forever), then draws any new segments
  // queued up since the last frame.
  const tick = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) { rafRef.current = null; return; }
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = FADE;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const queue = queueRef.current;
    if (queue.length) {
      queue.forEach((seg) => drawSegment(ctx, seg));
      queueRef.current = [];
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [tick]);

  // Responsive canvas sizing, matching ZenGarden/MandalaDraw's pattern.
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
        paintSolidBg();
      }
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => ro.disconnect();
  }, [paintSolidBg]);

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

  const handlePointerDown = (e) => {
    const canvas = canvasRef.current;
    canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastPointRef.current = getPoint(e);
  };

  const handlePointerMove = (e) => {
    if (!drawingRef.current) return;
    const p = getPoint(e);
    hueRef.current = (hueRef.current + 0.6) % 360;
    queueRef.current.push({
      x1: lastPointRef.current.x,
      y1: lastPointRef.current.y,
      x2: p.x,
      y2: p.y,
      color: `hsl(${hueRef.current}, 90%, 62%)`,
    });
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

  const newColors = () => {
    hueRef.current = Math.random() * 360;
  };

  return (
    <div className="game-page">
      <div className="game-header">
        <Link to="/games" className="game-back">← Games</Link>
        <h1 className="game-title">✨ Light Trails</h1>
        <p className="game-subtitle">Drag to draw glowing light that fades away on its own.</p>
      </div>

      <HowToPlay>
        <p>Click and drag (or touch and drag on a phone) anywhere on the dark canvas — a glowing trail follows your pointer and gradually fades away instead of sticking around.</p>
        <p>The color slowly drifts through the rainbow as you draw. Press <b>New Colors</b> to jump to a different hue. There's nothing to win — just ambient light play.</p>
      </HowToPlay>

      <div className="game-controls">
        <button className="gs-btn gs-btn-primary gs-btn-sm" onClick={newColors}>🔄 New Colors</button>
      </div>

      <div ref={containerRef} className="light-trails-canvas-wrapper">
        <canvas
          ref={canvasRef}
          className="light-trails-canvas"
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
