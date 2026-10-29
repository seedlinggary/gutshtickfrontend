import React, { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { CATEGORY_LABELS } from './categories';
import { describeKashrut } from './kashrutInfo';

const MAX_COMPARE = 3;

/** A floating tray that collects up to 3 businesses (toggled from a card's
 * "+ Compare" control -- see BusinessCard.js) and a modal table laying them
 * out side by side: rating, kashrut, hours, category, price signal. Pure
 * client-side against data the directory already fetched -- no extra
 * network round trip. */
export function useCompareTray() {
  const [items, setItems] = useState([]);

  const toggle = (business) => {
    setItems((cur) => {
      const exists = cur.find((b) => b.id === business.id);
      if (exists) return cur.filter((b) => b.id !== business.id);
      if (cur.length >= MAX_COMPARE) return cur;
      return [...cur, business];
    });
  };

  const isSelected = (id) => items.some((b) => b.id === id);
  const clear = () => setItems([]);

  return { items, toggle, isSelected, clear, canAddMore: items.length < MAX_COMPARE };
}

export default function CompareTray({ items, onRemove, onClear }) {
  const [open, setOpen] = useState(false);
  if (!items.length) return null;

  return (
    <>
      <div className="biz-compare-tray">
        <span className="biz-compare-tray-label">Compare ({items.length}/{MAX_COMPARE})</span>
        <div className="biz-compare-tray-chips">
          {items.map((b) => (
            <span key={b.id} className="biz-compare-chip">
              {b.name}
              <button type="button" onClick={() => onRemove(b.id)} aria-label={`Remove ${b.name}`}>×</button>
            </span>
          ))}
        </div>
        <button type="button" className="biz-compare-view-btn" disabled={items.length < 2} onClick={() => setOpen(true)}>
          View comparison
        </button>
        <button type="button" className="biz-compare-clear-btn" onClick={onClear}>Clear</button>
      </div>
      {open && <CompareModal items={items} onClose={() => setOpen(false)} />}
    </>
  );
}

function CompareModal({ items, onClose }) {
  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const rows = [
    { label: 'Category', get: (b) => CATEGORY_LABELS[b.category] || b.category },
    { label: 'Rating', get: (b) => (b.rating_count ? (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <Star size={13} fill="var(--gold, #f5a623)" color="var(--gold, #f5a623)" /> {b.rating_avg.toFixed(1)} ({b.rating_count})
      </span>
    ) : 'No ratings yet') },
    { label: 'Kashrut', get: (b) => b.primary_location?.kashrut || '—' },
    { label: 'Certifies', get: (b) => describeKashrut(b.primary_location?.kashrut).map((k) => k.label).join(', ') || '—' },
    { label: 'City', get: (b) => b.primary_location?.city || '—' },
    { label: 'Claimed', get: (b) => (b.is_claimed ? 'Yes' : 'Not yet claimed') },
  ];

  return (
    <div className="biz-compare-overlay" onClick={onClose}>
      <div className="biz-compare-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="biz-compare-close" onClick={onClose} aria-label="Close">×</button>
        <div className="biz-compare-table" style={{ '--cols': items.length }}>
          <div className="biz-compare-row biz-compare-header-row">
            <div className="biz-compare-cell biz-compare-row-label" />
            {items.map((b) => <div key={b.id} className="biz-compare-cell biz-compare-name">{b.name}</div>)}
          </div>
          {rows.map((row) => (
            <div key={row.label} className="biz-compare-row">
              <div className="biz-compare-cell biz-compare-row-label">{row.label}</div>
              {items.map((b) => <div key={b.id} className="biz-compare-cell">{row.get(b)}</div>)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
