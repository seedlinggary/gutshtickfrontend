import React, { useEffect, useState } from 'react';
import { Save, Unlink, ArrowLeft } from 'lucide-react';
import nonprofitApiRequest from '../nonprofitApi';
import '../nonprofit.css';

function formatCents(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ILS' }).format((cents || 0) / 100);
}

const TYPE_LABELS = {
  NonprofitBill: 'Bill',
  NonprofitDonation: 'Donation',
  NonprofitMembership: 'Membership',
  NonprofitPaymentLink: 'Payment link',
  NonprofitExternalTransaction: 'Other transaction',
};

export default function NonprofitFamilyDetailPage({ businessId, familyId, onBack }) { // eslint-disable-line no-unused-vars
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const load = () => nonprofitApiRequest('GET', null, `/nonprofit/families/${familyId}`)
    .then((d) => {
      setDetail(d);
      setForm({
        full_name: d.family.full_name || '',
        email: d.family.email || '',
        phone: d.family.phone || '',
        address: d.family.address || '',
        city: d.family.city || '',
        notes: d.family.notes || '',
      });
    })
    .catch(() => setDetail(false));
  useEffect(() => { load(); }, [familyId]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = (e) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError('');
    nonprofitApiRequest('PATCH', form, `/nonprofit/families/${familyId}`)
      .then(() => setSaved(true))
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not save.'))
      .finally(() => setSaving(false));
  };

  const unlink = (record) => {
    if (!window.confirm(`Unlink "${record.name || record.type}" from this family?`)) return;
    nonprofitApiRequest('POST', { record_type: record.type, record_id: record.id }, '/nonprofit/records/unlink').then(load);
  };

  if (detail === null) return <div className="gs-loading"><div className="gs-spinner" /></div>;
  if (detail === false) return <p className="gs-empty">Could not load this family.</p>;

  return (
    <div>
      <button type="button" onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 14, background: 'none', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer' }}>
        <ArrowLeft size={14} /> Back to families
      </button>
      <h2 style={{ marginTop: 10 }}>{detail.family.full_name}</h2>

      <form onSubmit={save} className="gs-card" style={{ marginBottom: 20, maxWidth: 480 }}>
        {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13 }}>{error}</p>}
        <div className="gs-field">
          <div className="gs-label">Full name</div>
          <input className="gs-input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </div>
        <div className="gs-field">
          <div className="gs-label">Email</div>
          <input className="gs-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="gs-field">
          <div className="gs-label">Phone</div>
          <input className="gs-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="gs-field">
          <div className="gs-label">Address</div>
          <input className="gs-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div className="gs-field">
          <div className="gs-label">City</div>
          <input className="gs-input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </div>
        <div className="gs-field">
          <div className="gs-label">Notes</div>
          <textarea className="gs-input" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <button type="submit" className="gs-btn gs-btn-sm" disabled={saving}><Save size={14} /> Save</button>
        {saved && <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 10 }}>Saved</span>}
      </form>

      <div className="gs-card">
        <h3 style={{ marginTop: 0 }}>Linked records</h3>
        {detail.records.length === 0 ? <p className="gs-empty">No records linked to this family.</p> : (
          <div className="admin-list">
            {detail.records.map((r) => (
              <div key={`${r.type}-${r.id}`} className="admin-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 13 }}>
                  <span className="admin-badge">{TYPE_LABELS[r.type] || r.type}</span>{' '}
                  <strong>{r.name || `#${r.id}`}</strong>
                  {r.amount_cents != null && ` -- ${formatCents(r.amount_cents)}`}
                  {r.status && <span className={`np-badge np-badge-${r.status}`} style={{ marginLeft: 8 }}>{r.status}</span>}
                </div>
                <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => unlink(r)}>
                  <Unlink size={13} /> Unlink
                </button>
              </div>
            ))}
          </div>
        )}
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 14, marginBottom: 0 }}>
          {detail.form_response_count} form response{detail.form_response_count === 1 ? '' : 's'} linked to this household.
        </p>
      </div>
    </div>
  );
}
