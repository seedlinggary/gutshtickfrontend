import React, { useState } from 'react';
import { SUBTYPE_SUGGESTIONS } from './subtypes';

/** Hybrid dropdown-and-type picker for a business's subtype(s) -- e.g. a
 * restaurant being Dairy/Meat/Pizza/Fine Dining. Shows curated suggestion
 * chips for the selected top-level `category` (if any exist), plus any
 * already-picked custom tags not in that list, plus a free-text "+ Add"
 * entry for anything that isn't suggested. Multiple tags allowed.
 * `value` is a plain string[]; `onChange(nextArray)` reports changes. */
export default function TypeTagPicker({ category, value, onChange }) {
  const [customText, setCustomText] = useState('');
  const selected = value || [];
  const suggestions = SUBTYPE_SUGGESTIONS[category] || [];
  // Already-selected tags that aren't in this category's suggestion list
  // (e.g. a custom tag, or one picked before the category was changed) --
  // still shown as removable chips so nothing picked ever silently vanishes.
  const extraSelected = selected.filter((t) => !suggestions.includes(t));

  const toggle = (tag) => {
    onChange(selected.includes(tag) ? selected.filter((t) => t !== tag) : [...selected, tag]);
  };

  const addCustom = () => {
    const trimmed = customText.trim();
    if (!trimmed || selected.includes(trimmed)) { setCustomText(''); return; }
    onChange([...selected, trimmed]);
    setCustomText('');
  };

  return (
    <div>
      {(suggestions.length > 0 || extraSelected.length > 0) && (
        <div className="biz-type-picker-row">
          {suggestions.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`biz-chip${selected.includes(tag) ? ' active' : ''}`}
              onClick={() => toggle(tag)}
            >
              {tag}
            </button>
          ))}
          {extraSelected.map((tag) => (
            <button key={tag} type="button" className="biz-chip active" onClick={() => toggle(tag)}>
              {tag} <span className="biz-chip-remove">×</span>
            </button>
          ))}
        </div>
      )}
      <div className="biz-type-picker-custom">
        <input
          className="auth-input"
          type="text"
          placeholder="Not listed? Type your own…"
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
        />
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={addCustom}>+ Add</button>
      </div>
    </div>
  );
}
