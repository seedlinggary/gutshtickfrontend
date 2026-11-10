import React from 'react';
import { X, AlignLeft, AlignCenter, AlignRight, Palette } from 'lucide-react';

/** Shared control set for the {align, color, size, bg} shape used by:
 * - ContentBlocks.js's resolveItemStyle() (content.itemStyle / item.style
 *   on feature_grid/testimonial_grid/service_list/faq_accordion items),
 * - dynamicFormFields.js's fieldLabelStyle() (a form field's label_style,
 *   which just omits `bg` -- a label has no card concept, so pass
 *   `allowBackground={false}` there).
 * Identical whether it's bound to a block-wide default or one specific
 * item/field's own override, so this is the ONE place "text align/color/
 * size + item background" gets built, in its own file (not BlockInspector
 * .js) so the nonprofit/custom forms builder can use it too without
 * pulling in the whole site-builder inspector bundle. `null` in `value`
 * for a key means "not set, fall back to the default" -- the X button
 * next to color/background clears back to that, same convention
 * ThemePanel.js's own color resets already use. */
export default function ItemStyleFields({ value, onChange, allowBackground = true }) {
  const v = value || {};
  const set = (patch) => onChange({ ...v, ...patch });
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: 2 }}>
        {[['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]].map(([a, Icon]) => (
          <button key={a} type="button" className={`sb-icon-btn${v.align === a ? ' active' : ''}`}
            onClick={() => set({ align: v.align === a ? null : a })} title={`Align ${a}`}>
            <Icon size={13} />
          </button>
        ))}
      </div>
      <label style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
        Text
        <input type="color" value={v.color || '#2b2118'} onChange={(e) => set({ color: e.target.value })}
          style={{ width: 28, height: 24, padding: 0, border: '1px solid var(--border)', borderRadius: 6 }} />
        {v.color && <button type="button" className="sb-icon-btn" onClick={() => set({ color: null })}><X size={10} /></button>}
      </label>
      <label style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
        Size
        <input className="gs-input" type="number" min={10} max={48} value={v.size || ''} placeholder="auto"
          onChange={(e) => set({ size: e.target.value ? Number(e.target.value) : null })} style={{ width: 56 }} />
      </label>
      {allowBackground && (
        <label style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Palette size={12} /> Background
          <input type="color" value={v.bg || '#ffffff'} onChange={(e) => set({ bg: e.target.value })}
            style={{ width: 28, height: 24, padding: 0, border: '1px solid var(--border)', borderRadius: 6 }} />
          {v.bg && <button type="button" className="sb-icon-btn" onClick={() => set({ bg: null })}><X size={10} /></button>}
        </label>
      )}
    </div>
  );
}
