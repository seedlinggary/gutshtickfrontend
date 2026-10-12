import React from 'react';
import { WEEKDAYS } from './categories';

/** hours shape: {mon: {open, close, closed}, ...} */
export default function HoursEditor({ hours, onChange }) {
  const set = (dayKey, patch) => {
    onChange({ ...hours, [dayKey]: { ...(hours?.[dayKey] || {}), ...patch } });
  };

  // Same hours every day is the common case -- copying one day's value to
  // the rest saves re-entering the same open/close time seven times.
  const copyToAll = (dayKey) => {
    const source = hours?.[dayKey] || {};
    const next = {};
    WEEKDAYS.forEach((w) => { next[w.key] = { ...source }; });
    onChange(next);
  };

  return (
    <div>
      {WEEKDAYS.map((w) => {
        const day = hours?.[w.key] || {};
        return (
          <div key={w.key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ width: 36, fontSize: 13 }}>{w.label}</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
              <input type="checkbox" checked={!!day.closed} onChange={(e) => set(w.key, { closed: e.target.checked })} />
              Closed
            </label>
            {!day.closed && (
              <>
                <input type="time" className="gs-input" style={{ padding: 4, width: 110 }} value={day.open || ''} onChange={(e) => set(w.key, { open: e.target.value })} />
                <span>–</span>
                <input type="time" className="gs-input" style={{ padding: 4, width: 110 }} value={day.close || ''} onChange={(e) => set(w.key, { close: e.target.value })} />
              </>
            )}
            {(day.open || day.closed) && (
              <button
                type="button"
                onClick={() => copyToAll(w.key)}
                title={`Use ${w.label}'s hours for every day`}
                style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 11, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
              >
                Copy to all days
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
