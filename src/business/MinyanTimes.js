import React, { useEffect, useState } from 'react';
import { Clock, Plus, Trash2, Info } from 'lucide-react';
import apiRequest from '../ApiRequest';

const TEFILAH_LABELS = { shacharit: 'Shacharit', mincha: 'Mincha', maariv: 'Maariv', other: 'Other' };
const ANCHOR_LABELS = { netz: 'Netz (sunrise)', shkiya: 'Shkiya (sunset)', chatzos: 'Chatzos (midday)', alos: 'Alos (dawn)', tzeis: 'Tzeis (nightfall)' };
const TEFILAH_ORDER = ['shacharit', 'mincha', 'maariv', 'other'];

const EMPTY_FORM = {
  tefilah: 'shacharit', label: '', days: '', season: '',
  timeMode: 'fixed', fixed_time: '', relative_anchor: 'shkiya', relative_offset_minutes: '-10',
  notes: '', source_name: '', source_url: '',
};

function formatMinyan(m) {
  if (m.fixed_time) return m.fixed_time;
  if (m.relative_anchor) {
    const offset = m.relative_offset_minutes || 0;
    const anchor = ANCHOR_LABELS[m.relative_anchor] || m.relative_anchor;
    if (offset === 0) return `At ${anchor}`;
    return `${Math.abs(offset)} min ${offset < 0 ? 'before' : 'after'} ${anchor}`;
  }
  return '—';
}

/** Shown only on shul-category profiles. Minyan times are never saved
 * without a source (enforced server-side too) -- see routes/minyan.py --
 * and every display of this data carries a disclaimer, since times shift
 * with the season/day/sun and shuls change them without always telling
 * whatever we sourced this from. */
export default function MinyanTimes({ businessId, canManage }) {
  const [data, setData] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    apiRequest('GET', null, `/business/businesses/${businessId}/minyanim`)
      .then(setData)
      .catch(() => {});
  };

  useEffect(() => { if (businessId) load(); }, [businessId]);

  const submit = (e) => {
    e.preventDefault();
    setError('');
    const body = {
      tefilah: form.tefilah, label: form.label || undefined, days: form.days || undefined,
      season: form.season || undefined, notes: form.notes || undefined,
      source_name: form.source_name, source_url: form.source_url || undefined,
    };
    if (form.timeMode === 'fixed') {
      body.fixed_time = form.fixed_time;
    } else {
      body.relative_anchor = form.relative_anchor;
      body.relative_offset_minutes = Number(form.relative_offset_minutes) || 0;
    }
    setSaving(true);
    apiRequest('POST', body, `/business/businesses/${businessId}/minyanim`)
      .then(() => { setForm(EMPTY_FORM); setAdding(false); load(); })
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not save -- check the fields above.'))
      .finally(() => setSaving(false));
  };

  const remove = (id) => {
    if (!window.confirm('Delete this minyan time?')) return;
    apiRequest('DELETE', null, `/business/minyanim/${id}`).then(load).catch(() => {});
  };

  if (!data) return null;
  const grouped = TEFILAH_ORDER
    .map((t) => ({ tefilah: t, items: data.results.filter((m) => m.tefilah === t) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="biz-minyan-section" style={{ marginBottom: 16 }}>
      <h3 className="biz-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Clock size={19} /> Minyan Times
      </h3>

      {data.results.length === 0 && !adding && (
        <p className="biz-empty">No minyan times posted yet.{canManage ? ' Add the first one below.' : ''}</p>
      )}

      {data.results.length > 0 && (
        <>
          <div className="biz-minyan-groups">
            {grouped.map((g) => (
              <div key={g.tefilah} className="biz-minyan-group">
                <div className="biz-minyan-group-title">{TEFILAH_LABELS[g.tefilah]}</div>
                {g.items.map((m) => (
                  <div key={m.id} className="biz-minyan-row">
                    <span className="biz-minyan-time">{formatMinyan(m)}</span>
                    <span className="biz-minyan-meta">
                      {m.label && <span>{m.label}</span>}
                      {m.days && <span>{m.label ? ' · ' : ''}{m.days}</span>}
                      {m.season && <span> · {m.season}</span>}
                    </span>
                    {m.notes && <span className="biz-minyan-notes">{m.notes}</span>}
                    <span className="biz-minyan-source">
                      Source: {m.source_url ? <a href={m.source_url} target="_blank" rel="noopener noreferrer">{m.source_name}</a> : m.source_name}
                    </span>
                    {canManage && (
                      <button type="button" className="biz-minyan-delete" onClick={() => remove(m.id)} title="Delete">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <p className="biz-minyan-disclaimer">
            <Info size={13} /> {data.disclaimer}
          </p>
        </>
      )}

      {canManage && !adding && (
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" style={{ marginTop: 10 }} onClick={() => setAdding(true)}>
          <Plus size={14} /> Add a minyan time
        </button>
      )}

      {canManage && adding && (
        <form className="biz-minyan-form" onSubmit={submit}>
          {error && <p className="biz-error" style={{ fontSize: 12 }}>{error}</p>}
          <div className="biz-minyan-form-grid">
            <label>
              Tefilah
              <select value={form.tefilah} onChange={(e) => setForm({ ...form, tefilah: e.target.value })}>
                {TEFILAH_ORDER.map((t) => <option key={t} value={t}>{TEFILAH_LABELS[t]}</option>)}
              </select>
            </label>
            <label>
              Label (optional)
              <input type="text" placeholder="e.g. Early Minyan" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
            </label>
            <label>
              Days
              <input type="text" placeholder="e.g. Sun-Fri, Shabbat" value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} />
            </label>
            <label>
              Season (optional)
              <input type="text" placeholder="e.g. Summer, Winter" value={form.season} onChange={(e) => setForm({ ...form, season: e.target.value })} />
            </label>
          </div>

          <div className="biz-minyan-time-toggle">
            <label><input type="radio" checked={form.timeMode === 'fixed'} onChange={() => setForm({ ...form, timeMode: 'fixed' })} /> Fixed time</label>
            <label><input type="radio" checked={form.timeMode === 'relative'} onChange={() => setForm({ ...form, timeMode: 'relative' })} /> Relative to sunrise/sunset</label>
          </div>

          {form.timeMode === 'fixed' ? (
            <label className="biz-minyan-form-single">
              Time
              <input type="time" value={form.fixed_time} onChange={(e) => setForm({ ...form, fixed_time: e.target.value })} required />
            </label>
          ) : (
            <div className="biz-minyan-form-grid">
              <label>
                Anchor
                <select value={form.relative_anchor} onChange={(e) => setForm({ ...form, relative_anchor: e.target.value })}>
                  {Object.entries(ANCHOR_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label>
                Offset (minutes, negative = before)
                <input type="number" value={form.relative_offset_minutes} onChange={(e) => setForm({ ...form, relative_offset_minutes: e.target.value })} />
              </label>
            </div>
          )}

          <label className="biz-minyan-form-single">
            Notes (optional)
            <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>

          <div className="biz-minyan-form-grid">
            <label>
              Source <span style={{ color: 'var(--error, #c0392b)' }}>*</span>
              <input type="text" placeholder="e.g. Shul website, called office 3/2026" value={form.source_name}
                onChange={(e) => setForm({ ...form, source_name: e.target.value })} required />
            </label>
            <label>
              Source URL (optional)
              <input type="url" placeholder="https://..." value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} />
            </label>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => { setAdding(false); setError(''); }}>Cancel</button>
            <button type="submit" className="gs-btn gs-btn-primary gs-btn-sm" disabled={saving || !form.source_name.trim()}>
              {saving ? 'Saving…' : 'Save minyan time'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
