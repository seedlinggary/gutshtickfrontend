import React, { useEffect, useState } from 'react';
import { CalendarDays, Plus, Pencil, Users } from 'lucide-react';
import nonprofitApiRequest from '../nonprofitApi';
import '../nonprofit.css';

function formatCents(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ILS' }).format((cents || 0) / 100);
}

function HolidayForm({ businessId, holiday, onSaved, onCancel }) {
  const [slug, setSlug] = useState(holiday?.slug || '');
  const [nameEn, setNameEn] = useState(holiday?.name_en || '');
  const [memberPrice, setMemberPrice] = useState(holiday ? (holiday.member_price_cents / 100).toFixed(2) : '');
  const [nonMemberPrice, setNonMemberPrice] = useState(holiday ? (holiday.non_member_price_cents / 100).toFixed(2) : '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    const memberCents = Math.round(Number(memberPrice) * 100);
    const nonMemberCents = Math.round(Number(nonMemberPrice) * 100);
    if (!slug.trim() || !nameEn.trim() || !memberCents || !nonMemberCents) {
      setError('Slug, name, and both prices are required.');
      return;
    }
    setSaving(true);
    setError('');
    const body = { slug: slug.trim(), name_en: nameEn.trim(), member_price_cents: memberCents, non_member_price_cents: nonMemberCents };
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
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input className="gs-input" type="number" step="0.01" min="0" placeholder="Member price (₪)" value={memberPrice} onChange={(e) => setMemberPrice(e.target.value)} style={{ flex: '1 1 160px' }} required />
        <input className="gs-input" type="number" step="0.01" min="0" placeholder="Non-member price (₪)" value={nonMemberPrice} onChange={(e) => setNonMemberPrice(e.target.value)} style={{ flex: '1 1 160px' }} required />
      </div>
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
              Member {formatCents(holiday.member_price_cents)} · Non-member {formatCents(holiday.non_member_price_cents)}
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
