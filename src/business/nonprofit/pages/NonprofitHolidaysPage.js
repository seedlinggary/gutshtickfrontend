import React, { useEffect, useState } from 'react';
import { CalendarDays, Plus, Pencil, Users, Trash2 } from 'lucide-react';
import nonprofitApiRequest from '../nonprofitApi';
import '../nonprofit.css';

function formatCents(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ILS' }).format((cents || 0) / 100);
}

// Owner-named price tiers (e.g. "Member"/"Non-Member", or "Adult"/"Child"
// for a non-seating event) -- any number, not a fixed pair. A visitor
// picks a seat count per active tier (see the public holiday-seats page);
// archiving one hides it from new signups without losing what it meant
// on past ones (NonprofitSignup.seat_breakdown stores tier ids).
function TierEditor({ tiers, onChange }) {
  const update = (i, patch) => onChange(tiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  const archive = (i) => onChange(tiers.map((t, idx) => (idx === i ? { ...t, archived: true } : t)));
  const add = () => onChange([...tiers, { label: '', price_cents: '' }]);

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Price tiers</div>
      {tiers.map((t, i) => !t.archived && (
        <div key={t.id || `new-${i}`} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
          <input className="gs-input" placeholder="Tier name (e.g. Member)" value={t.label}
            onChange={(e) => update(i, { label: e.target.value })} style={{ flex: '2 1 160px' }} />
          <input className="gs-input" type="number" step="0.01" min="0" placeholder="Price (₪)"
            value={t.price_cents === '' ? '' : (t.price_cents / 100)}
            onChange={(e) => update(i, { price_cents: Math.round(Number(e.target.value) * 100) })}
            style={{ flex: '1 1 100px' }} />
          {tiers.filter((x) => !x.archived).length > 1 && (
            <button type="button" className="sb-icon-btn" title="Remove tier" onClick={() => archive(i)}><Trash2 size={13} /></button>
          )}
        </div>
      ))}
      <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={add}><Plus size={13} /> Add tier</button>
    </div>
  );
}

function HolidayForm({ businessId, holiday, onSaved, onCancel }) {
  const [slug, setSlug] = useState(holiday?.slug || '');
  const [nameEn, setNameEn] = useState(holiday?.name_en || '');
  const [tiers, setTiers] = useState(holiday?.tiers?.length ? holiday.tiers : [{ label: 'Member', price_cents: '' }, { label: 'Non-Member', price_cents: '' }]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    const active = tiers.filter((t) => !t.archived);
    if (!slug.trim() || !nameEn.trim() || active.length === 0 || active.some((t) => !t.label.trim() || !t.price_cents)) {
      setError('Slug, name, and every tier\'s name and price are required.');
      return;
    }
    setSaving(true);
    setError('');
    const body = { slug: slug.trim(), name_en: nameEn.trim(), tiers };
    const req = holiday
      ? nonprofitApiRequest('PATCH', body, `/nonprofit/holidays/${holiday.id}`)
      : nonprofitApiRequest('POST', body, `/nonprofit/businesses/${businessId}/holidays`);
    req.then(onSaved).catch((err) => setError(typeof err === 'string' ? err : 'Could not save.')).finally(() => setSaving(false));
  };

  return (
    <form onSubmit={submit} className="sb-new-page-form" style={{ maxWidth: 420 }}>
      {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13 }}>{error}</p>}
      <input className="gs-input" placeholder="Slug (e.g. rosh-hashana-5787)" value={slug} onChange={(e) => setSlug(e.target.value)} required />
      <input className="gs-input" placeholder="Name" value={nameEn} onChange={(e) => setNameEn(e.target.value)} required />
      <TierEditor tiers={tiers} onChange={setTiers} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="gs-btn gs-btn-sm" disabled={saving}>Save</button>
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default function NonprofitHolidaysPage({ businessId, onOpenItem }) {
  const [stats, setStats] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = () => nonprofitApiRequest('GET', null, `/nonprofit/businesses/${businessId}/holidays/stats`).then((d) => setStats(d.stats)).catch(() => setStats([]));
  useEffect(() => { load(); }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleOpen = (holiday) => {
    nonprofitApiRequest('PATCH', { is_open: !holiday.is_open }, `/nonprofit/holidays/${holiday.id}`).then(load);
  };

  if (!stats) return <div className="gs-loading"><div className="gs-spinner" /></div>;

  return (
    <div>
      <div className="np-toolbar">
        <h2 style={{ margin: 0 }}>Holidays</h2>
        {!formOpen && (
          <button type="button" className="gs-btn gs-btn-sm" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus size={14} /> New holiday</button>
        )}
      </div>

      {formOpen && (
        <div className="gs-card" style={{ marginBottom: 16 }}>
          <HolidayForm
            businessId={businessId}
            holiday={editing}
            onSaved={() => { setFormOpen(false); setEditing(null); load(); }}
            onCancel={() => { setFormOpen(false); setEditing(null); }}
          />
        </div>
      )}

      {stats.length === 0 && <p className="gs-empty">No holidays set up yet.</p>}

      <div className="admin-list">
        {stats.map(({ holiday, total_seats, paid_count, pending_count, paid_revenue_cents }) => (
          <div key={holiday.id} className="gs-card admin-card">
            <div className="admin-card-top">
              <button type="button" onClick={() => onOpenItem(holiday.id)} style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer', font: 'inherit' }}>
                <CalendarDays size={16} /> {holiday.name_en}
              </button>
              <button
                type="button"
                className={`np-badge ${holiday.is_open ? 'np-badge-active' : 'np-badge-cancelled'}`}
                style={{ border: 'none', cursor: 'pointer' }}
                onClick={() => toggleOpen(holiday)}
              >
                {holiday.is_open ? 'Open' : 'Closed'}
              </button>
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              {holiday.tiers.filter((t) => !t.archived).map((t) => `${t.label} ${formatCents(t.price_cents)}`).join(' · ') || 'No tiers yet'}
            </div>
            <div className="admin-card-meta">
              {total_seats} seats · {paid_count} paid · {pending_count} pending · {formatCents(paid_revenue_cents)} collected
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => onOpenItem(holiday.id)}><Users size={13} /> View signups</button>
              <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => { setEditing(holiday); setFormOpen(true); }}><Pencil size={13} /> Edit prices</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
