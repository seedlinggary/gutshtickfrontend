import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import HowToPlay from '../HowToPlay';

const TOOLS = [
  { key: 'pen', label: 'Pen', icon: '🖊️' },
  { key: 'marker', label: 'Marker', icon: '🖍️' },
  { key: 'brush', label: 'Thin Brush', icon: '✒️' },
  { key: 'eraser', label: 'Eraser', icon: '🧹' },
  { key: 'duplicate', label: 'Duplicate', icon: '⧉' },
];

const SIZES = ['S', 'M', 'L'];

const SIZE_PX = {
  pen: { S: 3, M: 5, L: 9 },
  marker: { S: 10, M: 16, L: 24 },
  brush: { S: 1.5, M: 2.5, L: 4 },
  eraser: { S: 12, M: 22, L: 34 },
};

const COLORS = [
  '#1971c2', '#e03131', '#f08c00', '#ffd43b', '#2f9e44', '#0c8599',
  '#5f3dc4', '#c2255c', '#e64980', '#1b1a24', '#495057', '#ffffff',
  '#a5d8ff', '#b2f2bb', '#ffec99', '#eebefa',
];

const SYMMETRY_MODES = [
  { key: 'off', label: 'Off' },
  { key: 'mirror-x', label: 'Mirror ↔' },
  { key: 'mirror-y', label: 'Mirror ↕' },
  { key: 'mirror-xy', label: '4-Way Mirror' },
  { key: 'mandala4', label: 'Mandala 4' },
  { key: 'mandala8', label: 'Mandala 8' },
];

const BG_COLORS = [
  { key: 'white', label: 'White', color: '#ffffff' },
  { key: 'cream', label: 'Cream', color: '#f7f0e0' },
  { key: 'black', label: 'Black', color: '#1b1a24' },
  { key: 'sky', label: 'Sky', color: '#e7f3ff' },
  { key: 'blush', label: 'Blush', color: '#fdeef0' },
  { key: 'mint', label: 'Mint', color: '#eafaf1' },
];

const MAX_HISTORY = 20;

// Returns the set of point-space transforms (and, for stamping, the
// rotation/flip needed to orient duplicated bitmap content) for a given
// symmetry mode, computed around canvas center (cx, cy). Straight line
// segments only need the endpoints transformed; stamped images additionally
// need `angle`/`flip` applied to the bitmap itself so duplicates look
// properly rotated/mirrored rather than just repositioned.
function getTransforms(mode, cx, cy) {
  const identity = { pt: (p) => p, angle: 0, flip: null };
  switch (mode) {
    case 'mirror-x':
      return [identity, { pt: (p) => ({ x: 2 * cx - p.x, y: p.y }), angle: 0, flip: 'x' }];
    case 'mirror-y':
      return [identity, { pt: (p) => ({ x: p.x, y: 2 * cy - p.y }), angle: 0, flip: 'y' }];
    case 'mirror-xy':
      return [
        identity,
        { pt: (p) => ({ x: 2 * cx - p.x, y: p.y }), angle: 0, flip: 'x' },
        { pt: (p) => ({ x: p.x, y: 2 * cy - p.y }), angle: 0, flip: 'y' },
        { pt: (p) => ({ x: 2 * cx - p.x, y: 2 * cy - p.y }), angle: 0, flip: 'xy' },
      ];
    case 'mandala4':
      return rotations(4, cx, cy);
    case 'mandala8':
      return rotations(8, cx, cy);
    default:
      return [identity];
  }
}

function rotations(n, cx, cy) {
  const arr = [];
  for (let i = 0; i < n; i++) {
    const theta = (i * 2 * Math.PI) / n;
    arr.push({ pt: (p) => rotatePoint(p, cx, cy, theta), angle: theta, flip: null });
  }
  return arr;
}

function rotatePoint(p, cx, cy, theta) {
  const dx = p.x - cx;
  const dy = p.y - cy;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}

/** An old-desktop-style paint program: pick a tool (pen, marker, thin brush,
 * eraser), a color and size, and draw freely. Two "fun feature" additions
 * beyond a plain canvas: a Symmetry mode that mirrors/rotates every stroke
 * (and every stamped duplicate) around the canvas center for instant
 * kaleidoscope patterns, and a Duplicate tool that lets you marquee-select
 * part of the drawing and stamp copies of it anywhere. */
export default function DrawStudio() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const historyRef = useRef([]);
  const drawingRef = useRef(false);
  const strokeBaseRef = useRef(null);
  const currentPathRef = useRef([]);
  const marqueeRef = useRef(null);

  const [tool, setTool] = useState('pen');
  const [size, setSize] = useState('M');
  const [color, setColor] = useState(COLORS[0]);
  const [symmetry, setSymmetry] = useState('off');
  const [bgColor, setBgColor] = useState(BG_COLORS[0]);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [hasCapture, setHasCapture] = useState(false);
  const [selectionBox, setSelectionBox] = useState(null);
  const [canUndo, setCanUndo] = useState(false);

  const toolRef = useRef(tool);
  toolRef.current = tool;
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const colorRef = useRef(color);
  colorRef.current = color;
  const symmetryRef = useRef(symmetry);
  symmetryRef.current = symmetry;
  const bgColorRef = useRef(bgColor);
  bgColorRef.current = bgColor;

  const fillBackground = useCallback((ctx, canvas, bg) => {
    ctx.fillStyle = bg.color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  // Responsive square canvas that preserves the drawing across resizes
  // (e.g. a phone rotation) by re-drawing the previous frame scaled into
  // the freshly-sized canvas instead of just wiping it.
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const nextSize = Math.max(240, Math.floor(rect.width));
      if (canvas.width === nextSize && canvas.height === nextSize) return;
      const prevData = canvas.width > 0 && canvas.height > 0 ? canvas.toDataURL() : null;
      canvas.width = nextSize;
      canvas.height = nextSize;
      const ctx = canvas.getContext('2d');
      fillBackground(ctx, canvas, bgColorRef.current);
      if (prevData) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0, nextSize, nextSize);
        img.src = prevData;
      }
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => ro.disconnect();
  }, [fillBackground]);

  const getPoint = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const pushHistory = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const h = historyRef.current;
    h.push(snap);
    if (h.length > MAX_HISTORY) h.shift();
    setCanUndo(true);
    return snap;
  };

  const undo = () => {
    const h = historyRef.current;
    if (h.length === 0) return;
    const snap = h.pop();
    const canvas = canvasRef.current;
    canvas.getContext('2d').putImageData(snap, 0, 0);
    setCanUndo(h.length > 0);
  };

  const clearCanvas = () => {
    pushHistory();
    const canvas = canvasRef.current;
    fillBackground(canvas.getContext('2d'), canvas, bgColorRef.current);
  };

  const saveImage = () => {
    const canvas = canvasRef.current;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'my-drawing.png';
    a.click();
  };

  const chooseBackground = (bg) => {
    pushHistory();
    bgColorRef.current = bg;
    setBgColor(bg);
    const canvas = canvasRef.current;
    fillBackground(canvas.getContext('2d'), canvas, bg);
  };

  // Re-renders the whole in-progress stroke as a single continuous path per
  // symmetry copy, restored from a snapshot taken before the stroke began.
  // Redrawing segment-by-segment instead (stroking just the newest point-to
  // -point piece each move) makes translucent tools like Marker show visible
  // double-opacity blobs at every join, since each round line cap overlaps
  // the next segment's cap. A single stroke() call per copy has no such
  // internal overlap, so semi-transparent strokes render smoothly.
  const renderStroke = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (strokeBaseRef.current) ctx.putImageData(strokeBaseRef.current, 0, 0);
    const path = currentPathRef.current;
    if (path.length === 0) return;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const t = toolRef.current;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = SIZE_PX[t][sizeRef.current];
    if (t === 'eraser') {
      ctx.strokeStyle = bgColorRef.current.color;
      ctx.globalAlpha = 1;
    } else if (t === 'marker') {
      ctx.strokeStyle = colorRef.current;
      ctx.globalAlpha = 0.55;
    } else {
      ctx.strokeStyle = colorRef.current;
      ctx.globalAlpha = 1;
    }
    getTransforms(symmetryRef.current, cx, cy).forEach(({ pt }) => {
      ctx.beginPath();
      path.forEach((p, i) => {
        const tp = pt(p);
        if (i === 0) ctx.moveTo(tp.x, tp.y);
        else ctx.lineTo(tp.x, tp.y);
      });
      if (path.length === 1) {
        const tp = pt(path[0]);
        ctx.lineTo(tp.x + 0.01, tp.y + 0.01);
      }
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  };

  const beginStroke = (p) => {
    strokeBaseRef.current = pushHistory();
    currentPathRef.current = [p];
    renderStroke();
  };

  const continueStroke = (p) => {
    currentPathRef.current.push(p);
    renderStroke();
  };

  const stampAt = (p) => {
    const capture = captureCanvasRef.current;
    if (!capture) return;
    pushHistory();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const w = capture.width;
    const h = capture.height;
    getTransforms(symmetryRef.current, cx, cy).forEach(({ pt, angle, flip }) => {
      const target = pt(p);
      ctx.save();
      ctx.translate(target.x, target.y);
      if (angle) ctx.rotate(angle);
      if (flip === 'x') ctx.scale(-1, 1);
      else if (flip === 'y') ctx.scale(1, -1);
      else if (flip === 'xy') ctx.scale(-1, -1);
      ctx.drawImage(capture, -w / 2, -h / 2);
      ctx.restore();
    });
  };

  const updateSelectionOverlay = (x1, y1, x2, y2) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;
    setSelectionBox({
      left: Math.min(x1, x2) * scaleX,
      top: Math.min(y1, y2) * scaleY,
      width: Math.abs(x2 - x1) * scaleX,
      height: Math.abs(y2 - y1) * scaleY,
    });
  };

  const finalizeSelection = (p) => {
    const m = marqueeRef.current;
    marqueeRef.current = null;
    setSelectionBox(null);
    if (!m) return;
    const x = Math.round(Math.min(m.startX, p.x));
    const y = Math.round(Math.min(m.startY, p.y));
    const w = Math.round(Math.abs(p.x - m.startX));
    const h = Math.round(Math.abs(p.y - m.startY));
    if (w < 6 || h < 6) return;
    const canvas = canvasRef.current;
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    off.getContext('2d').drawImage(canvas, x, y, w, h, 0, 0, w, h);
    captureCanvasRef.current = off;
    setHasCapture(true);
  };

  const newSelection = () => {
    captureCanvasRef.current = null;
    setHasCapture(false);
    setSelectionBox(null);
  };

  const selectTool = (key) => {
    setTool(key);
    if (key !== 'duplicate') {
      captureCanvasRef.current = null;
      setHasCapture(false);
      setSelectionBox(null);
      marqueeRef.current = null;
    }
  };

  const handlePointerDown = (e) => {
    const canvas = canvasRef.current;
    canvas.setPointerCapture(e.pointerId);
    const p = getPoint(e);
    if (toolRef.current === 'duplicate') {
      if (captureCanvasRef.current) {
        stampAt(p);
      } else {
        marqueeRef.current = { startX: p.x, startY: p.y };
        updateSelectionOverlay(p.x, p.y, p.x, p.y);
      }
      return;
    }
    drawingRef.current = true;
    beginStroke(p);
  };

  const handlePointerMove = (e) => {
    const p = getPoint(e);
    if (toolRef.current === 'duplicate') {
      if (marqueeRef.current) updateSelectionOverlay(marqueeRef.current.startX, marqueeRef.current.startY, p.x, p.y);
      return;
    }
    if (!drawingRef.current) return;
    continueStroke(p);
  };

  const endStroke = (e) => {
    if (toolRef.current === 'duplicate' && marqueeRef.current) {
      finalizeSelection(getPoint(e));
    }
    drawingRef.current = false;
    currentPathRef.current = [];
    strokeBaseRef.current = null;
    const canvas = canvasRef.current;
    if (canvas && e.pointerId !== undefined) {
      try { canvas.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    }
  };

  const showSize = tool !== 'duplicate';
  const showColor = tool !== 'eraser' && tool !== 'duplicate';

  return (
    <div className="game-page">
      <div className="game-header">
        <Link to="/games" className="game-back">← Games</Link>
        <h1 className="game-title">🖌️ Draw Studio</h1>
        <p className="game-subtitle">A free-draw canvas with real tools — plus symmetry mirroring and a select-and-duplicate stamp.</p>
      </div>

      <HowToPlay>
        <p>Pick a tool, a color, and a size, then draw on the canvas below — just like an old-school paint program.</p>
        <ul>
          <li><b>Pen</b>, <b>Marker</b> (soft, semi-transparent), and <b>Thin Brush</b> each feel different. <b>Eraser</b> paints over with the canvas background.</li>
          <li><b>Symmetry</b> mirrors or rotates every stroke around the center automatically — great for instant kaleidoscope patterns.</li>
          <li><b>Duplicate</b>: drag a rectangle to select part of your drawing, then tap anywhere to stamp copies of it. Combine it with Symmetry to stamp several mirrored copies at once — perfect for flower petals or patterns.</li>
          <li><b>🖼 Canvas</b> lets you pick a background color/paper tone. <b>Undo</b>, <b>Clear</b>, and <b>Save</b> (downloads a PNG) are always available.</li>
        </ul>
      </HowToPlay>

      <div className="game-controls-bar">
        <div className="ds-toolbar-left">
          <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={undo} disabled={!canUndo}>↩ Undo</button>
          <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={clearCanvas}>🗑 Clear</button>
          <button type="button" className="gs-btn gs-btn-primary gs-btn-sm" onClick={saveImage}>💾 Save</button>
          <button
            type="button"
            className={`gs-btn gs-btn-outline gs-btn-sm${showBgPicker ? ' active' : ''}`}
            onClick={() => setShowBgPicker((s) => !s)}
          >
            🖼 Canvas
          </button>
        </div>
      </div>

      {showBgPicker && (
        <div className="ds-bg-picker">
          {BG_COLORS.map((bg) => (
            <button
              key={bg.key}
              type="button"
              className={`ds-bg-swatch${bgColor.key === bg.key ? ' active' : ''}`}
              style={{ background: bg.color }}
              title={bg.label}
              onClick={() => chooseBackground(bg)}
            />
          ))}
        </div>
      )}

      <div className="ds-tool-row">
        {TOOLS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`ds-tool-btn${tool === t.key ? ' active' : ''}`}
            onClick={() => selectTool(t.key)}
          >
            <span className="ds-tool-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div className="ds-options-row">
        {showSize && (
          <div className="ds-size-group">
            <span className="ds-group-label">Size</span>
            {SIZES.map((s) => (
              <button
                key={s}
                type="button"
                className={`ds-size-btn${size === s ? ' active' : ''}`}
                onClick={() => setSize(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <div className="ds-symmetry-group">
          <span className="ds-group-label">Symmetry</span>
          {SYMMETRY_MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              className={`ds-symmetry-btn${symmetry === m.key ? ' active' : ''}`}
              onClick={() => setSymmetry(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {showColor && (
        <div className="ds-color-row">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`ds-color-swatch${color === c ? ' active' : ''}`}
              style={{ background: c }}
              aria-label={`Use color ${c}`}
              onClick={() => setColor(c)}
            />
          ))}
          <input
            type="color"
            className="ds-custom-color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            aria-label="Custom color"
          />
        </div>
      )}

      {tool === 'eraser' && <p className="ds-hint">Eraser paints over with the current canvas background color.</p>}
      {tool === 'duplicate' && (
        <p className="ds-hint">
          {hasCapture
            ? <>Tap anywhere to stamp a copy. <button type="button" className="ds-hint-link" onClick={newSelection}>New Selection</button></>
            : 'Drag a rectangle on the canvas to select part of your drawing.'}
        </p>
      )}

      <div ref={containerRef} className="ds-canvas-wrapper">
        <canvas
          ref={canvasRef}
          className="ds-canvas"
          style={{ touchAction: 'none' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
        />
        {selectionBox && (
          <div
            className="ds-selection-box"
            style={{ left: selectionBox.left, top: selectionBox.top, width: selectionBox.width, height: selectionBox.height }}
          />
        )}
      </div>
    </div>
  );
}
