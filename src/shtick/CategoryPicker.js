import React, { useState, useRef } from 'react';

/** Type-ahead multi-select over a (potentially large) category list — replaces
 * showing every category as an always-visible chip, which stops scaling once
 * there are dozens of them. */
export default function CategoryPicker({ categories, selectedIds, onChange }) {
  const [query, setQuery] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);

  const selected = (categories || []).filter((c) => selectedIds.includes(c.id));
  const matches = query.trim()
    ? (categories || [])
        .filter((c) => !selectedIds.includes(c.id))
        .filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()))
        .slice(0, 8)
    : [];

  const select = (cat) => {
    onChange([...selectedIds, cat.id]);
    setQuery('');
    setHighlightIdx(0);
    inputRef.current?.focus();
  };

  const remove = (id) => onChange(selectedIds.filter((c) => c !== id));

  const handleKeyDown = (e) => {
    if (!matches.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIdx((i) => Math.min(i + 1, matches.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); select(matches[highlightIdx]); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <div className="category-picker">
      {selected.length > 0 && (
        <div className="category-tag-list">
          {selected.map((c) => (
            <span key={c.id} className="category-tag">
              {c.name}
              <button type="button" onClick={() => remove(c.id)} aria-label={`Remove ${c.name}`}>×</button>
            </span>
          ))}
        </div>
      )}
      <div className="category-picker-input-wrap">
        <input
          ref={inputRef}
          className="gs-input"
          placeholder="Type to search categories…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setHighlightIdx(0); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
        />
        {open && query.trim() && (
          <div className="category-picker-dropdown">
            {matches.length === 0 && (
              <div className="category-picker-empty">No matching categories.</div>
            )}
            {matches.map((c, i) => (
              <button
                type="button"
                key={c.id}
                className={`category-picker-option${i === highlightIdx ? ' highlighted' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(c)}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
