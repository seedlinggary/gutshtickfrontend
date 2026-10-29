import React, { useState } from 'react';

/** Builds `count` evenly-spaced tick values between min and max (inclusive),
 * deduped -- not "nice rounded" ticks (no charting library here to do that
 * for us), just a plain linear split, which is legible enough at the sizes
 * these charts render at. */
function niceTicks(min, max, count) {
  if (min === max) return [min];
  const ticks = [];
  for (let i = 0; i < count; i += 1) ticks.push(min + ((max - min) * i) / (count - 1));
  return ticks;
}

/** Minimal, dependency-free SVG line chart -- this codebase has no charting
 * library anywhere else, and these two components cover every chart Gut
 * Money needs (price history, economic indicator trends, budget
 * breakdown) without adding one. `points` is [{x, y}] with numeric x/y;
 * `xLabel(point)`/`formatY(value)` control axis text. Both axes always draw
 * with real tick values (not just a bare line) so a chart is readable
 * without hovering -- hovering a point additionally shows its exact value
 * via a simple tooltip. `yTickCount`/`xTickCount` are reduced automatically
 * for small/sparkline-sized charts via the `compact` prop. */
export function LineChart({
  points, height = 220, color = 'var(--accent)', formatY = (v) => v, xLabel = (p) => p.x, ariaLabel, compact = false,
}) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const width = 600;
  const yTickCount = compact ? 3 : 5;
  const xTickCount = compact ? 3 : 6;
  const leftPad = compact ? 34 : 48;
  const padding = { top: 14, right: 10, bottom: 28, left: leftPad };

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

  const yTicks = niceTicks(minY, maxY, yTickCount);
  const xTickIdxs = Array.from(new Set(
    Array.from({ length: xTickCount }, (_, i) => Math.round((i / (xTickCount - 1)) * (points.length - 1)))
  ));

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

        {/* Y-axis gridlines + value labels */}
        {yTicks.map((t, i) => {
          const y = padding.top + innerH - ((t - minY) / spanY) * innerH;
          return (
            <g key={i}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="var(--border)" strokeWidth="1" />
              <text x={padding.left - 6} y={y} fontSize={compact ? 9.5 : 10.5} fill="var(--muted)" textAnchor="end" dominantBaseline="middle">
                {formatY(t)}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill="url(#simpleChartFade)" stroke="none" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" />
        {coords.map((c, i) => (
          <rect
            key={i} x={c.x - innerW / points.length / 2} y={0} width={innerW / points.length} height={height}
            fill="transparent" onMouseEnter={() => setHoverIdx(i)}
          />
        ))}
        {hovered && <circle cx={hovered.x} cy={hovered.y} r="4" fill={color} />}

        {/* X-axis tick labels */}
        {xTickIdxs.map((idx) => {
          const c = coords[idx];
          const anchor = idx === 0 ? 'start' : idx === points.length - 1 ? 'end' : 'middle';
          return (
            <text key={idx} x={c.x} y={height - 8} fontSize={compact ? 9.5 : 10.5} fill="var(--muted)" textAnchor={anchor}>
              {xLabel(c.point)}
            </text>
          );
        })}
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

// Shared across every multi-series/segment chart below. --accent/--gold are
// theme-aware (each site repaints them), so a 2-series chart (the common
// case: contributions vs growth, principal vs interest, net vs tax)
// automatically matches whichever site it's rendered on; the rest are fixed
// fallback hues for a 3rd/4th/5th segment.
const PALETTE = ['var(--accent)', 'var(--gold)', '#64748b', '#b3261e', '#7c3aed', '#0ea5e9'];

/** Multi-series line/area chart -- the composition-over-time counterpart to
 * LineChart's single series. `stacked` (default true) draws cumulative
 * filled areas on top of each other (e.g. principal paid + interest paid
 * stacking up to the total paid) so the question "how much of this is
 * interest" has a direct visual answer; pass `stacked={false}` to instead
 * overlay plain comparison lines from a shared zero baseline (e.g. renting
 * vs. buying's running cost -- two competing totals, not parts of one
 * whole). Every series must share the same x values/length. Hovering shows
 * every series' value (and the stacked total) at that x, same tooltip
 * pattern as LineChart. */
export function StackedAreaChart({
  series, stacked = true, height = 240, formatY = (v) => v, xLabel = (p) => p.x, ariaLabel, compact = false,
}) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const width = 600;
  const yTickCount = compact ? 3 : 5;
  const xTickCount = compact ? 3 : 6;
  const leftPad = compact ? 34 : 48;
  const padding = { top: 14, right: 10, bottom: 28, left: leftPad };

  const n = series && series.length ? series[0].points.length : 0;
  if (!series || !series.length || n < 2) {
    return <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Not enough data to chart yet.</div>;
  }

  const colored = series.map((s, i) => ({ ...s, color: s.color || PALETTE[i % PALETTE.length] }));

  // layers[seriesIdx][i] = {bottom, top, raw} -- for stacked mode, `top` is
  // the running cumulative sum so later series draw starting where the
  // previous one left off; for overlaid mode every series starts at 0.
  const layers = colored.map(() => []);
  let maxY = 0;
  for (let i = 0; i < n; i++) {
    let running = 0;
    colored.forEach((s, si) => {
      const raw = s.points[i].y;
      const bottom = stacked ? running : 0;
      const top = stacked ? running + raw : raw;
      layers[si][i] = { bottom, top, raw };
      if (stacked) running += raw;
      maxY = Math.max(maxY, stacked ? running : raw);
    });
  }
  const minY = 0;
  const spanY = maxY - minY || 1;
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const xAt = (i) => padding.left + (i / (n - 1)) * innerW;
  const yAt = (v) => padding.top + innerH - ((v - minY) / spanY) * innerH;

  const areaPaths = colored.map((s, si) => {
    const top = layers[si].map((l, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${yAt(l.top).toFixed(1)}`).join(' ');
    if (!stacked) return top; // open line, no fill
    const bottomRev = layers[si].slice().reverse()
      .map((l, ri) => `L${xAt(n - 1 - ri).toFixed(1)},${yAt(l.bottom).toFixed(1)}`).join(' ');
    return `${top} ${bottomRev} Z`;
  });

  const yTicks = niceTicks(minY, maxY, yTickCount);
  const xTickIdxs = Array.from(new Set(
    Array.from({ length: xTickCount }, (_, i) => Math.round((i / (xTickCount - 1)) * (n - 1)))
  ));
  const hoverX = hoverIdx != null ? xAt(hoverIdx) : null;

  return (
    <div style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label={ariaLabel}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {yTicks.map((t, i) => {
          const y = yAt(t);
          return (
            <g key={i}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="var(--border)" strokeWidth="1" />
              <text x={padding.left - 6} y={y} fontSize={compact ? 9.5 : 10.5} fill="var(--muted)" textAnchor="end" dominantBaseline="middle">
                {formatY(t)}
              </text>
            </g>
          );
        })}

        {areaPaths.map((d, si) => (
          <path
            key={si} d={d} fill={stacked ? colored[si].color : 'none'} fillOpacity={stacked ? 0.72 : 0}
            stroke={colored[si].color} strokeWidth={stacked ? 1 : 2.25}
          />
        ))}

        {hoverX != null && <line x1={hoverX} x2={hoverX} y1={padding.top} y2={padding.top + innerH} stroke="var(--muted-faint)" strokeWidth="1" strokeDasharray="3,3" />}
        {hoverIdx != null && colored.map((s, si) => (
          <circle key={si} cx={hoverX} cy={yAt(layers[si][hoverIdx].top)} r="3.5" fill={s.color} stroke="var(--surface)" strokeWidth="1.5" />
        ))}

        {Array.from({ length: n }).map((_, i) => (
          <rect
            key={i} x={xAt(i) - innerW / n / 2} y={0} width={innerW / n} height={height}
            fill="transparent" onMouseEnter={() => setHoverIdx(i)}
          />
        ))}

        {xTickIdxs.map((idx) => {
          const anchor = idx === 0 ? 'start' : idx === n - 1 ? 'end' : 'middle';
          return (
            <text key={idx} x={xAt(idx)} y={height - 8} fontSize={compact ? 9.5 : 10.5} fill="var(--muted)" textAnchor={anchor}>
              {xLabel(colored[0].points[idx])}
            </text>
          );
        })}
      </svg>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 6, fontSize: 12 }}>
        {colored.map((s) => (
          <span key={s.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--muted)' }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: s.color, display: 'inline-block' }} />
            {s.label}
          </span>
        ))}
      </div>

      {hoverIdx != null && (
        <div style={{
          position: 'absolute', left: `${Math.min(88, Math.max(12, (hoverX / width) * 100))}%`, top: 0, transform: 'translateX(-50%)',
          background: 'var(--accent)', color: '#fff', fontSize: 11.5, padding: '6px 10px', borderRadius: 8,
          whiteSpace: 'nowrap', pointerEvents: 'none', boxShadow: 'var(--shadow)', lineHeight: 1.5,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>{xLabel(colored[0].points[hoverIdx])}</div>
          {colored.map((s, si) => (
            <div key={si}>{s.label}: <strong>{formatY(layers[si][hoverIdx].raw)}</strong></div>
          ))}
          {stacked && colored.length > 1 && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.25)', marginTop: 3, paddingTop: 3 }}>
              Total: <strong>{formatY(layers[layers.length - 1][hoverIdx].top)}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Donut breakdown chart -- "where did this amount actually go" at a single
 * point in time (vs. StackedAreaChart's over-time version): net pay split
 * into tax/NI/savings, a sale price split into net proceeds/tax, a monthly
 * mortgage payment split into P&I/tax/insurance. Hovering (or tapping) a
 * segment -- on the ring itself or its legend row -- shows that segment's
 * exact value and share of the total in the donut's own center. */
export function DonutChart({ segments, size = 180, formatValue = (v) => v, centerLabel }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const clean = (segments || []).filter((s) => s.value > 0);
  const total = clean.reduce((sum, s) => sum + s.value, 0);

  if (total <= 0) {
    return <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Nothing to show yet.</div>;
  }

  const r = size / 2;
  const strokeWidth = size * 0.24;
  const innerR = r - strokeWidth / 2;
  const circumference = 2 * Math.PI * innerR;

  let acc = 0;
  const arcs = clean.map((s, i) => {
    const frac = s.value / total;
    const dash = frac * circumference;
    const arc = { ...s, frac, dashArray: `${dash} ${circumference - dash}`, dashOffset: -acc, color: s.color || PALETTE[i % PALETTE.length] };
    acc += dash;
    return arc;
  });
  const hovered = hoverIdx != null ? arcs[hoverIdx] : null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Breakdown">
          <g transform={`rotate(-90 ${r} ${r})`}>
            {arcs.map((a, i) => (
              <circle
                key={i} cx={r} cy={r} r={innerR} fill="none" stroke={a.color} strokeWidth={strokeWidth}
                strokeDasharray={a.dashArray} strokeDashoffset={a.dashOffset}
                opacity={hoverIdx == null || hoverIdx === i ? 1 : 0.32}
                style={{ transition: 'opacity 120ms ease', cursor: 'pointer' }}
                onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx(null)}
              />
            ))}
          </g>
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', textAlign: 'center', pointerEvents: 'none', padding: '0 8px',
        }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            {hovered ? hovered.label : (centerLabel || 'Total')}
          </div>
          <div style={{ fontSize: size > 150 ? 17 : 14, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)', lineHeight: 1.3 }}>
            {formatValue(hovered ? hovered.value : total)}
          </div>
          {hovered && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{(hovered.frac * 100).toFixed(1)}%</div>}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12.5, minWidth: 140 }}>
        {arcs.map((a, i) => (
          <div
            key={a.label}
            style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: hoverIdx == null || hoverIdx === i ? 1 : 0.45, cursor: 'pointer' }}
            onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx(null)}
          >
            <span style={{ width: 9, height: 9, borderRadius: 3, background: a.color, flexShrink: 0 }} />
            <span style={{ color: 'var(--text)', fontWeight: 600 }}>{a.label}</span>
            <span style={{ color: 'var(--muted)', marginLeft: 'auto', fontFamily: 'var(--font-mono)', paddingLeft: 10, whiteSpace: 'nowrap' }}>
              {formatValue(a.value)} ({(a.frac * 100).toFixed(0)}%)
            </span>
          </div>
        ))}
      </div>
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
