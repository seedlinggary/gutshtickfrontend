import React, { useState } from 'react';

/** Minimal, dependency-free SVG line chart -- this codebase has no charting
 * library anywhere else, and these two components cover every chart Gut
 * Money needs (price history, economic indicator trends, budget
 * breakdown) without adding one. `points` is [{x, y}] with numeric x/y;
 * `xLabel(point)`/`formatY(value)` control axis text. Hovering a point
 * shows its value via a simple tooltip -- no external interaction library. */
export function LineChart({ points, height = 220, color = 'var(--accent)', formatY = (v) => v, xLabel = (p) => p.x, ariaLabel }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const width = 600;
  const padding = { top: 16, right: 12, bottom: 24, left: 12 };

  if (!points || points.length < 2) {
    return <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Not enough data to chart yet.</div>;
  }

  const ys = points.map((p) => p.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanY = maxY - minY || 1;
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const coords = points.map((p, i) => ({
    x: padding.left + (i / (points.length - 1)) * innerW,
    y: padding.top + innerH - ((p.y - minY) / spanY) * innerH,
    point: p,
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${coords[coords.length - 1].x.toFixed(1)},${padding.top + innerH} L${coords[0].x.toFixed(1)},${padding.top + innerH} Z`;
  const hovered = hoverIdx != null ? coords[hoverIdx] : null;

  return (
    <div style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label={ariaLabel}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="simpleChartFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#simpleChartFade)" stroke="none" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" />
        {coords.map((c, i) => (
          <rect
            key={i} x={c.x - innerW / points.length / 2} y={0} width={innerW / points.length} height={height}
            fill="transparent" onMouseEnter={() => setHoverIdx(i)}
          />
        ))}
        {hovered && <circle cx={hovered.x} cy={hovered.y} r="4" fill={color} />}
        <text x={padding.left} y={height - 6} fontSize="11" fill="var(--muted)">{xLabel(points[0])}</text>
        <text x={width - padding.right} y={height - 6} fontSize="11" fill="var(--muted)" textAnchor="end">{xLabel(points[points.length - 1])}</text>
      </svg>
      {hovered && (
        <div style={{
          position: 'absolute', left: `${(hovered.x / width) * 100}%`, top: 0, transform: 'translateX(-50%)',
          background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 8px',
          borderRadius: 6, whiteSpace: 'nowrap', pointerEvents: 'none',
        }}>
          {xLabel(hovered.point)}: {formatY(hovered.point.y)}
        </div>
      )}
    </div>
  );
}

/** Minimal horizontal bar chart -- used for the budget category breakdown. */
export function BarChart({ bars, formatValue = (v) => v }) {
  const max = Math.max(...bars.map((b) => Math.abs(b.value)), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {bars.map((b) => (
        <div key={b.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 3 }}>
            <span style={{ color: 'var(--text)', fontWeight: 600 }}>{b.label}</span>
            <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{formatValue(b.value)}</span>
          </div>
          <div style={{ background: 'var(--surface-deep)', borderRadius: 999, height: 8, overflow: 'hidden' }}>
            <div style={{
              width: `${(Math.abs(b.value) / max) * 100}%`, height: '100%', borderRadius: 999,
              background: b.color || 'var(--accent)', transition: 'width 200ms ease',
            }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
