import React, { useState } from 'react';

/** Read-only stars when `onRate` isn't given; an interactive 1-5 picker when it is. */
export default function StarRating({ value = 0, count, onRate, size = 16 }) {
  const [hover, setHover] = useState(0);
  const interactive = typeof onRate === 'function';
  const display = hover || value;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{ display: 'inline-flex' }} onMouseLeave={() => interactive && setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            onMouseEnter={() => interactive && setHover(n)}
            onClick={() => interactive && onRate(n)}
            style={{
              fontSize: size,
              color: n <= display ? 'var(--gold, #f5a623)' : 'var(--border)',
              cursor: interactive ? 'pointer' : 'default',
              lineHeight: 1,
            }}
          >
            ★
          </span>
        ))}
      </span>
      {typeof count === 'number' && (
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
          {value ? value.toFixed(1) : '—'} ({count})
        </span>
      )}
    </span>
  );
}
