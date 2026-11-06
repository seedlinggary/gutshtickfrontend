import React, { useEffect, useState } from 'react';
import { Users, MessageSquare, Gem, ShoppingBag, CalendarClock } from 'lucide-react';
import apiRequest from '../../ApiRequest';

function formatCents(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'usd' }).format((cents || 0) / 100);
}

function CustomerNotes({ businessId, identityKey }) {
  const [notes, setNotes] = useState(null);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => apiRequest('GET', null, `/business/businesses/${businessId}/customers/${encodeURIComponent(identityKey)}/notes`)
    .then((d) => setNotes(d.notes)).catch(() => setNotes([]));
  useEffect(() => { load(); }, [businessId, identityKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    apiRequest('POST', { note: text.trim() }, `/business/businesses/${businessId}/customers/${encodeURIComponent(identityKey)}/notes`)
      .then(() => { setText(''); load(); })
      .finally(() => setSaving(false));
  };

  if (!notes) return <p style={{ fontSize: 12, color: 'var(--muted)' }}>Loading notes…</p>;

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border, #e5e1d6)' }}>
      {notes.map((n) => (
        <div key={n.id} style={{ fontSize: 13, marginBottom: 6 }}>
          <span style={{ color: 'var(--muted)', fontSize: 11 }}>{new Date(n.created_at).toLocaleDateString()}</span>
          <p style={{ margin: '2px 0 0' }}>{n.note}</p>
        </div>
      ))}
      <form onSubmit={submit} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input className="gs-input" placeholder="Add a note…" value={text} onChange={(e) => setText(e.target.value)} style={{ flex: 1 }} />
        <button type="submit" className="gs-btn gs-btn-sm" disabled={saving}>Add</button>
      </form>
    </div>
  );
}

export default function CrmPanel({ businessId }) {
  const [customers, setCustomers] = useState(null);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    apiRequest('GET', null, `/business/businesses/${businessId}/customers`).then((d) => setCustomers(d.customers)).catch(() => setCustomers([]));
  }, [businessId]);

  if (!customers) return <div className="gs-loading"><div className="gs-spinner" /></div>;

  return (
    <div className="gs-card">
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 0 }}><Users size={18} /> Customers</h3>
      {customers.length === 0 && <p className="gs-empty">No customers yet -- orders and bookings will show up here.</p>}
      <div className="admin-list">
        {customers.map((c) => (
          <div key={c.identity_key} className="admin-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                 onClick={() => setExpanded(expanded === c.identity_key ? null : c.identity_key)}>
              <div>
                <strong>{c.label}</strong>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span><ShoppingBag size={11} style={{ verticalAlign: -1 }} /> {c.order_count} order{c.order_count === 1 ? '' : 's'} · {formatCents(c.total_spent_cents)}</span>
                  {c.appointment_count > 0 && <span><CalendarClock size={11} style={{ verticalAlign: -1 }} /> {c.appointment_count} booking{c.appointment_count === 1 ? '' : 's'}</span>}
                  {c.loyalty_stamps > 0 && <span><Gem size={11} style={{ verticalAlign: -1 }} /> {c.loyalty_stamps} stamps</span>}
                  {c.notes_count > 0 && <span><MessageSquare size={11} style={{ verticalAlign: -1 }} /> {c.notes_count} note{c.notes_count === 1 ? '' : 's'}</span>}
                </div>
              </div>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{c.last_activity_at ? new Date(c.last_activity_at).toLocaleDateString() : ''}</span>
            </div>
            {expanded === c.identity_key && <CustomerNotes businessId={businessId} identityKey={c.identity_key} />}
          </div>
        ))}
      </div>
    </div>
  );
}
