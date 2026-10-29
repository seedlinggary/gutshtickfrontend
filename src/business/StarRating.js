import React, { useState } from 'react';
import { Star } from 'lucide-react';

/** Read-only stars when `onRate` isn't given; an interactive 1-5 picker when it is. */
export default function StarRating({ value = 0, count, onRate, size = 16 }) {
  const [hover, setHover] = useState(0);
  const interactive = typeof onRate === 'function';
  const display = hover || value;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{ display: 'inline-flex' }} onMouseLeave={() => interactive && setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => {
          const Tag = interactive ? 'button' : 'span';
          return (
            <Tag
              key={n}
              type={interactive ? 'button' : undefined}
              aria-label={interactive ? `Rate ${n} star${n === 1 ? '' : 's'}` : undefined}
              onMouseEnter={() => interactive && setHover(n)}
              onFocus={() => interactive && setHover(n)}
              onBlur={() => interactive && setHover(0)}
              onClick={() => interactive && onRate(n)}
              style={{
                display: 'inline-flex',
                color: n <= display ? 'var(--gold, #f5a623)' : 'var(--border)',
                cursor: interactive ? 'pointer' : 'default',
                lineHeight: 1,
                background: 'none',
                border: 'none',
                padding: 0,
                fontFamily: 'inherit',
              }}
            >
              <Star size={size} fill={n <= display ? 'var(--gold, #f5a623)' : 'none'} color={n <= display ? 'var(--gold, #f5a623)' : 'var(--border)'} />
            </Tag>
          );
        })}
      </span>
      {typeof count === 'number' && (
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
          {count > 0 ? `${value.toFixed(1)} (${count})` : 'No ratings yet'}
        </span>
      )}
    </span>
  );
}
