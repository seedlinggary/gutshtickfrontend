import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

/** Shared between NonprofitFormPage.js (the standalone /forms/:slug page)
 * and blocks/NonprofitBlocks.js's DynamicFormBlock (the same form
 * embedded inline in a built page) -- one real implementation of all 10
 * field types + the conditional show/hide/relabel logic, so the two
 * never drift into rendering the same form differently depending on
 * where it's embedded. */
export function fieldIsVisible(field, answers) {
  if (!field.condition_field_id) return true;
  const controllingValue = answers[String(field.condition_field_id)];
  const matches = Array.isArray(controllingValue)
    ? controllingValue.includes(field.condition_value)
    : controllingValue === field.condition_value;
  return field.condition_mode === 'hide_if' ? !matches : matches;
}

export function fieldLabel(field, answers) {
  if (field.condition_field_id && field.alt_label) {
    const controllingValue = answers[String(field.condition_field_id)];
    if (controllingValue === field.condition_value) return field.alt_label;
  }
  return field.label;
}

/** field.label_style is {align, color, size} -- same shape as the site
 * builder's own resolveItemStyle() (blocks/ContentBlocks.js), minus `bg`
 * (a field label has no card concept). Spread onto the label's own style
 * prop at each render call site (NonprofitFormPage.js,
 * blocks/NonprofitBlocks.js's DynamicFormBlock). */
export function fieldLabelStyle(field) {
  const s = field.label_style || {};
  return { textAlign: s.align || undefined, color: s.color || undefined, fontSize: s.size || undefined };
}

export function FieldInput({ field, value, onChange }) {
  switch (field.type) {
    case 'long_text':
      return <textarea className="sb-textarea" rows={4} value={value || ''} onChange={(e) => onChange(e.target.value)} required={field.required} />;
    case 'email':
      return <input className="sb-input" type="email" value={value || ''} onChange={(e) => onChange(e.target.value)} required={field.required} />;
    case 'phone':
      return <input className="sb-input" type="tel" value={value || ''} onChange={(e) => onChange(e.target.value)} required={field.required} />;
    case 'number':
      return <input className="sb-input" type="number" value={value || ''} onChange={(e) => onChange(e.target.value)} required={field.required} />;
    case 'date':
      return <input className="sb-input" type="date" value={value || ''} onChange={(e) => onChange(e.target.value)} required={field.required} />;
    case 'single_choice':
      return (
        <select className="sb-select" value={value || ''} onChange={(e) => onChange(e.target.value)} required={field.required}>
          <option value="">Choose…</option>
          {(field.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    case 'multi_choice': {
      const selected = Array.isArray(value) ? value : [];
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(field.options || []).map((o) => (
            <label key={o} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={selected.includes(o)}
                onChange={(e) => onChange(e.target.checked ? [...selected, o] : selected.filter((v) => v !== o))} />
              {o}
            </label>
          ))}
        </div>
      );
    }
    case 'multi_text': {
      const items = Array.isArray(value) ? value : [''];
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 6 }}>
              <input className="sb-input" value={item} onChange={(e) => onChange(items.map((v, idx) => (idx === i ? e.target.value : v)))} />
              <button type="button" className="sb-icon-btn" onClick={() => onChange(items.filter((_, idx) => idx !== i))}><Trash2 size={12} /></button>
            </div>
          ))}
          <button type="button" className="sb-icon-btn" onClick={() => onChange([...items, ''])}><Plus size={12} /> Add</button>
        </div>
      );
    }
    case 'name_date_list': {
      const rows = Array.isArray(value) ? value : [{ name: '', date: '' }];
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rows.map((row, i) => (
            <div key={i} style={{ display: 'flex', gap: 6 }}>
              <input className="sb-input" placeholder="Name" value={row.name || ''}
                onChange={(e) => onChange(rows.map((r, idx) => (idx === i ? { ...r, name: e.target.value } : r)))} />
              <input className="sb-input" type="date" value={row.date || ''}
                onChange={(e) => onChange(rows.map((r, idx) => (idx === i ? { ...r, date: e.target.value } : r)))} />
              <button type="button" className="sb-icon-btn" onClick={() => onChange(rows.filter((_, idx) => idx !== i))}><Trash2 size={12} /></button>
            </div>
          ))}
          <button type="button" className="sb-icon-btn" onClick={() => onChange([...rows, { name: '', date: '' }])}><Plus size={12} /> Add</button>
        </div>
      );
    }
    default:
      return <input className="sb-input" value={value || ''} onChange={(e) => onChange(e.target.value)} required={field.required} />;
  }
}
