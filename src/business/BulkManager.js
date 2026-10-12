import React, { useState } from 'react';
import { Wrench } from 'lucide-react';
import apiRequest from '../ApiRequest';
import HoursEditor from './HoursEditor';

/** For chains/franchises: apply hours or a kashrut string across every
 * selected business the current user owns in one call, instead of
 * location-by-location. Only present when there's more than one owned
 * business to make it worth showing. */
export default function BulkManager({ businesses }) {
  const [selected, setSelected] = useState([]);
  const [hours, setHours] = useState(null);
  const [kashrut, setKashrut] = useState('');
  const [applyHours, setApplyHours] = useState(false);
  const [applyKashrut, setApplyKashrut] = useState(false);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const toggle = (id) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const apply = () => {
    if (!selected.length || (!applyHours && !applyKashrut) || busy) return;
    const names = businesses.filter((b) => selected.includes(b.id)).map((b) => b.name).join(', ');
    if (!window.confirm(`Overwrite hours/kashrut on ${selected.length} business${selected.length === 1 ? '' : 'es'} (${names})? This replaces what's there now.`)) return;
    setBusy(true);
    setStatus(null);
    const body = { business_ids: selected };
    if (applyHours) body.hours = hours || {};
    if (applyKashrut) body.kashrut = kashrut;
    apiRequest('PATCH', body, '/business/my/businesses/bulk')
      .then((res) => setStatus(`Updated ${res.updated.length} business${res.updated.length === 1 ? '' : 'es'}.`))
      .catch((err) => setStatus(typeof err === 'string' ? err : 'Could not apply that update'))
      .finally(() => setBusy(false));
  };

  return (
    <div className="biz-bulk-manager">
      <h3 className="biz-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Wrench size={19} /> Bulk Manager</h3>
      <p className="biz-page-subtitle">Apply the same hours or kashrut certification across several of your businesses at once.</p>

      <div className="biz-bulk-list">
        {businesses.map((b) => (
          <label key={b.id} className="biz-bulk-item">
            <input type="checkbox" checked={selected.includes(b.id)} onChange={() => toggle(b.id)} />
            {b.name}
          </label>
        ))}
      </div>

      <label className="biz-bulk-field-toggle">
        <input type="checkbox" checked={applyHours} onChange={(e) => setApplyHours(e.target.checked)} />
        Apply hours
      </label>
      {applyHours && <HoursEditor hours={hours} onChange={setHours} />}

      <label className="biz-bulk-field-toggle">
        <input type="checkbox" checked={applyKashrut} onChange={(e) => setApplyKashrut(e.target.checked)} />
        Apply kashrut certification
      </label>
      {applyKashrut && (
        <input
          type="text" placeholder="e.g. OU, Star-K, Chalav Yisrael" value={kashrut}
          onChange={(e) => setKashrut(e.target.value)} className="biz-bulk-kashrut-input"
        />
      )}

      <button type="button" className="gs-btn gs-btn-primary" disabled={busy || !selected.length} onClick={apply}>
        Apply to {selected.length} business{selected.length === 1 ? '' : 'es'}
      </button>
      {status && <p className="biz-bulk-status">{status}</p>}
    </div>
  );
}
