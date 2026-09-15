import React from 'react';
import { WEEKDAYS } from './categories';

/** hours shape: {mon: {open, close, closed}, ...} */
export default function HoursEditor({ hours, onChange }) {
  const set = (dayKey, patch) => {
    onChange({ ...hours, [dayKey]: { ...(hours?.[dayKey] || {}), ...patch } });
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
          </div>
        );
      })}
    </div>
  );
}
