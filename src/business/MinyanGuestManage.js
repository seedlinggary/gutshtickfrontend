import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Clock, CheckCircle2, XCircle } from 'lucide-react';
import apiRequest from '../ApiRequest';

const TEFILAH_LABELS = { shacharit: 'Shacharit', mincha: 'Mincha', maariv: 'Maariv', other: 'Other' };
const ANCHOR_LABELS = { netz: 'Netz (sunrise)', shkiya: 'Shkiya (sunset)', chatzos: 'Chatzos (midday)', alos: 'Alos (dawn)', tzeis: 'Tzeis (nightfall)' };
const TEFILAH_ORDER = ['shacharit', 'mincha', 'maariv', 'other'];

function toForm(m) {
  return {
    tefilah: m.tefilah, label: m.label || '', days: m.days || '', season: m.season || '',
    timeMode: m.fixed_time ? 'fixed' : 'relative',
    fixed_time: m.fixed_time || '', relative_anchor: m.relative_anchor || 'shkiya',
    relative_offset_minutes: m.relative_offset_minutes ?? '-10',
    notes: m.notes || '', source_name: m.source_name || '', source_url: m.source_url || '',
  };
}

function StatusNotice({ minyan }) {
  if (minyan.approved_to_publish === null) {
    return <div className="gs-success-box" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={15} /> Pending review.</div>;
  }
  if (minyan.approved_to_publish === false) {
    return <div className="gs-error-box" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><XCircle size={15} /> Not approved. Editing and saving sends it back in for review.</div>;
  }
  return <div className="gs-success-box" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle2 size={15} /> Live on the shul's page.</div>;
}

/** Token-only management page for a guest (no-account) minyan-time
 * suggestion -- see backend/business/routes/minyan.py's edit_guest_minyan/
 * delete_guest_minyan. Same field shape as the owner's own add-form in
 * MinyanTimes.js -- source_name stays mandatory, re-validated server-side
 * on every edit just like a fresh submission. */
export default function MinyanGuestManage() {
  const { token } = useParams();
  const [state, setState] = useState('loading');
  const [minyan, setMinyan] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    apiRequest('GET', null, `/business/minyanim/guest/${token}`)
      .then((data) => { setMinyan(data); setState('ready'); })
      .catch(() => setState('notfound'));
  }, [token]);

  const startEdit = () => {
    setForm(toForm(minyan));
    setError('');
    setEditing(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!form.source_name.trim()) { setError('Source is required.'); return; }
    setBusy(true);
    setError('');
    const body = {
      tefilah: form.tefilah, label: form.label || null, days: form.days || null,
      season: form.season || null, notes: form.notes || null,
      source_name: form.source_name, source_url: form.source_url || null,
    };
    if (form.timeMode === 'fixed') {
      body.fixed_time = form.fixed_time;
      body.relative_anchor = null;
    } else {
      body.relative_anchor = form.relative_anchor;
      body.relative_offset_minutes = Number(form.relative_offset_minutes) || 0;
      body.fixed_time = null;
    }
    try {
      const updated = await apiRequest('PATCH', body, `/business/minyanim/guest/${token}`);
      setMinyan(updated);
      setEditing(false);
      setMsg('Saved.');
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to save changes.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Delete this minyan time suggestion? This cannot be undone.')) return;
    setBusy(true);
    try {
      await apiRequest('DELETE', null, `/business/minyanim/guest/${token}`);
      setState('deleted');
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to delete.');
      setBusy(false);
    }
  };

  if (state === 'loading') {
    return <div className="feed-section"><div className="gs-container" style={{ maxWidth: 560 }}><div className="gs-loading"><div className="gs-spinner" /> Loading…</div></div></div>;
  }
  if (state === 'notfound') {
    return <div className="feed-section"><div className="gs-container" style={{ maxWidth: 560, textAlign: 'center' }}><div className="gs-error-box">This link is invalid, or the suggestion it manages has been removed.</div></div></div>;
  }
  if (state === 'deleted') {
    return <div className="feed-section"><div className="gs-container" style={{ maxWidth: 560, textAlign: 'center' }}><div className="gs-success-box">Your suggestion has been deleted.</div></div></div>;
  }

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 560 }}>
        <h1 style={{ margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}><Clock size={20} /> Manage your minyan suggestion</h1>
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>No account needed — this private link is how you manage it.</p>

        {msg && <div className="gs-success-box" style={{ marginBottom: 12 }}>{msg}</div>}
        {error && <div className="gs-error-box" style={{ marginBottom: 12 }}>{error}</div>}
        <div style={{ marginBottom: 14 }}><StatusNotice minyan={minyan} /></div>

        <div className="gs-card">
          <div className="gs-card-body">
            {!editing ? (
              <>
                <h3 style={{ marginTop: 0 }}>{TEFILAH_LABELS[minyan.tefilah] || minyan.tefilah}{minyan.label ? ` — ${minyan.label}` : ''}</h3>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
                  <div>{minyan.fixed_time || `${Math.abs(minyan.relative_offset_minutes || 0)} min ${(minyan.relative_offset_minutes || 0) < 0 ? 'before' : 'after'} ${ANCHOR_LABELS[minyan.relative_anchor] || minyan.relative_anchor}`}</div>
                  {minyan.days && <div>Days: {minyan.days}</div>}
                  {minyan.season && <div>Season: {minyan.season}</div>}
                  <div>Source: {minyan.source_name}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={startEdit} disabled={busy}>Edit</button>
                  <button className="gs-btn gs-btn-danger gs-btn-sm" onClick={remove} disabled={busy}>Delete</button>
                </div>
              </>
            ) : (
              <form className="biz-minyan-form" onSubmit={saveEdit} style={{ maxWidth: 'none' }}>
                <div className="biz-minyan-form-grid">
                  <label>
                    Tefilah
                    <select value={form.tefilah} onChange={(e) => setForm({ ...form, tefilah: e.target.value })}>
                      {TEFILAH_ORDER.map((t) => <option key={t} value={t}>{TEFILAH_LABELS[t]}</option>)}
                    </select>
                  </label>
                  <label>
                    Label (optional)
                    <input type="text" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
                  </label>
                  <label>
                    Days
                    <input type="text" value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} />
                  </label>
                  <label>
                    Season (optional)
                    <input type="text" value={form.season} onChange={(e) => setForm({ ...form, season: e.target.value })} />
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
                    <input type="text" value={form.source_name} onChange={(e) => setForm({ ...form, source_name: e.target.value })} required />
                  </label>
                  <label>
                    Source URL (optional)
                    <input type="url" value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} />
                  </label>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button type="submit" className="gs-btn gs-btn-primary gs-btn-sm" disabled={busy || !form.source_name.trim()}>{busy ? 'Saving…' : 'Save'}</button>
                  <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setEditing(false)} disabled={busy}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
