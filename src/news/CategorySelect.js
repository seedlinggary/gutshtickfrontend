import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import apiRequest from '../ApiRequest';
import { categoryLabel } from './ArticleCard';

const CUSTOM = '__custom__';
const FALLBACK_MAX = 3;

/** Multi-category picker, capped at `max` (matches the backend's own
 * MAX_CATEGORIES) -- each picked category shows as a removable chip, with
 * ONE dropdown underneath to add another (hidden once the cap is hit)
 * instead of ever showing every known category at once. Picking "+ Add a
 * new topic" swaps that dropdown for a plain text input so a poster who
 * doesn't see a fit can name their own (see news_article.py's
 * normalize_categories). `value`/`onChange` are a controlled string array,
 * owned by the parent form. */
export default function CategorySelect({ value, onChange }) {
  const [options, setOptions] = useState([]);
  const [max, setMax] = useState(FALLBACK_MAX);
  const [addingCustom, setAddingCustom] = useState(false);
  const [customText, setCustomText] = useState('');

  useEffect(() => {
    apiRequest('GET', null, '/news/categories')
      .then((d) => { setOptions(d.categories || []); setMax(d.max_categories || FALLBACK_MAX); })
      .catch(() => setOptions([]));
  }, []);

  const atMax = value.length >= max;

  const add = (raw) => {
    const clean = (raw || '').trim().toLowerCase();
    if (!clean || value.includes(clean) || value.length >= max) return;
    onChange([...value, clean]);
  };

  const remove = (cat) => onChange(value.filter((c) => c !== cat));

  const handleSelect = (e) => {
    const picked = e.target.value;
    e.target.value = '';
    if (!picked) return;
    if (picked === CUSTOM) { setAddingCustom(true); return; }
    add(picked);
  };

  const confirmCustom = () => {
    add(customText);
    setCustomText('');
    setAddingCustom(false);
  };

  const remaining = options.filter((c) => !value.includes(c));

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {value.length === 0 && <span style={{ color: 'var(--muted)', fontSize: 13.5 }}>No topics picked yet.</span>}
        {value.map((c) => (
          <span key={c} className="news-category-chip">
            {categoryLabel(c)}
            <button type="button" onClick={() => remove(c)} aria-label={`Remove ${categoryLabel(c)}`}>
              <X size={11} />
            </button>
          </span>
        ))}
      </div>

      {!atMax && !addingCustom && (
        <select className="gs-input" value="" onChange={handleSelect} style={{ marginBottom: 12 }}>
          <option value="">+ Add a topic ({value.length}/{max})</option>
          {remaining.map((c) => <option key={c} value={c}>{categoryLabel(c)}</option>)}
          <option value={CUSTOM}>+ Type my own…</option>
        </select>
      )}

      {!atMax && addingCustom && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            className="gs-input" autoFocus placeholder="Name your own topic" value={customText}
            maxLength={40} onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmCustom(); } }}
          />
          <button type="button" className="gs-btn gs-btn-primary gs-btn-sm" onClick={confirmCustom}>Add</button>
          <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => { setAddingCustom(false); setCustomText(''); }}>Cancel</button>
        </div>
      )}

      {atMax && <p style={{ margin: '0 0 12px', fontSize: 12.5, color: 'var(--muted)' }}>Up to {max} topics -- remove one to add another.</p>}
    </div>
  );
}
