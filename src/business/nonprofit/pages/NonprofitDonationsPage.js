import React, { useEffect, useState } from 'react';
import { Download, Pencil, CheckCircle2, Ban, RotateCcw } from 'lucide-react';
import nonprofitApiRequest from '../nonprofitApi';
import FamilyLinkCell from '../FamilyLinkCell';
import { linkRecordToFamily, unlinkRecordFromFamily } from '../familyLinkActions';
import '../nonprofit.css';

function formatCents(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ILS' }).format((cents || 0) / 100);
}

function DonationEditForm({ donation, onSaved, onCancel }) {
  const [fullName, setFullName] = useState(donation.full_name || '');
  const [email, setEmail] = useState(donation.email || '');
  const [phone, setPhone] = useState(donation.phone || '');
  const [address, setAddress] = useState(donation.address || '');
  const [city, setCity] = useState(donation.city || '');
  const [purpose, setPurpose] = useState(donation.purpose || '');
  const [amount, setAmount] = useState((donation.amount_cents / 100).toFixed(2));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    const amountCents = Math.round(Number(amount) * 100);
    if (!amountCents || amountCents <= 0) { setError('Amount must be greater than 0.'); return; }
    setSaving(true);
    setError('');
    nonprofitApiRequest('PUT', {
      full_name: fullName.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
      city: city.trim() || null,
      purpose: purpose.trim() || null,
      amount_cents: amountCents,
    }, `/nonprofit/donations/${donation.id}/override`)
      .then(onSaved)
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not save.'))
      .finally(() => setSaving(false));
  };

  return (
    <form onSubmit={submit} className="sb-new-page-form" style={{ maxWidth: 420, marginTop: 10 }}>
      {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13 }}>{error}</p>}
      <input className="gs-input" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input className="gs-input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ flex: '1 1 160px' }} />
        <input className="gs-input" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ flex: '1 1 140px' }} />
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input className="gs-input" placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} style={{ flex: '1 1 160px' }} />
        <input className="gs-input" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} style={{ flex: '1 1 120px' }} />
      </div>
      <input className="gs-input" placeholder="Purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
      <input className="gs-input" type="number" step="0.01" min="0.01" placeholder="Amount (ILS)" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="gs-btn gs-btn-sm" disabled={saving}>Save</button>
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default function NonprofitDonationsPage({ businessId, staff }) {
  const [donations, setDonations] = useState(null);
  const [families, setFamilies] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [familyBusyId, setFamilyBusyId] = useState(null);

  const load = () => nonprofitApiRequest('GET', null, `/nonprofit/businesses/${businessId}/donations`)
    .then((d) => setDonations(d.donations))
    .catch(() => setDonations([]));
  useEffect(() => { load(); }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    nonprofitApiRequest('GET', null, `/nonprofit/businesses/${businessId}/families`).then((d) => setFamilies(d.families)).catch(() => setFamilies([]));
  }, [businessId]);

  const chooseFamily = (donation, choice) => {
    setFamilyBusyId(donation.id);
    linkRecordToFamily(businessId, 'NonprofitDonation', donation.id, choice).then(load).finally(() => setFamilyBusyId(null));
  };
  const unlinkFamily = (donation) => {
    setFamilyBusyId(donation.id);
    unlinkRecordFromFamily('NonprofitDonation', donation.id).then(load).finally(() => setFamilyBusyId(null));
  };

  const exportCsv = () => {
    nonprofitApiRequest('GET', null, `/nonprofit/businesses/${businessId}/donations/export`).then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'donations.csv';
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const runAction = (id, action) => nonprofitApiRequest('PATCH', { action }, `/nonprofit/donations/${id}`).then(load);

  if (!donations) return <div className="gs-loading"><div className="gs-spinner" /></div>;

  const filtered = donations.filter((d) => {
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!(d.full_name || '').toLowerCase().includes(q) && !(d.email || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Donations</h2>

      <div className="np-toolbar">
        <div className="np-filters">
          <input className="gs-input" placeholder="Search by name or email" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 220 }} />
          <select className="gs-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={exportCsv}><Download size={14} /> Export CSV</button>
      </div>

      {filtered.length === 0 && <p className="gs-empty">No donations found.</p>}

      <div className="admin-list">
        {filtered.map((d) => (
          <div key={d.id} className="admin-card">
            <div className="admin-card-top">
              <span className={`np-badge np-badge-${d.status}`}>{d.status}</span>
              <span className="admin-date">{d.created_at ? new Date(d.created_at).toLocaleDateString() : ''}</span>
            </div>
            <div style={{ fontSize: 13 }}>
              <strong>{d.full_name}</strong> {d.email && <span style={{ color: 'var(--muted)' }}>· {d.email}</span>}
            </div>
            <div className="admin-card-meta">
              {formatCents(d.amount_cents)}{d.purpose ? ` · ${d.purpose}` : ''}{d.reference_code ? ` · ref ${d.reference_code}` : ''}
            </div>
            <div style={{ marginTop: 6 }}>
              <FamilyLinkCell
                families={families} familyId={d.family_id} familyName={d.family_name} busy={familyBusyId === d.id}
                onChoose={(choice) => chooseFamily(d, choice)} onUnlink={() => unlinkFamily(d)}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {d.status === 'pending' && (
                <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => runAction(d.id, 'mark_paid')}><CheckCircle2 size={13} /> Mark paid</button>
              )}
              {d.status !== 'cancelled' && (
                <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => { if (window.confirm('Cancel this donation?')) runAction(d.id, 'cancel'); }}><Ban size={13} /> Cancel</button>
              )}
              {d.status === 'cancelled' && (
                <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => runAction(d.id, 'reactivate')}><RotateCcw size={13} /> Reactivate</button>
              )}
              {staff.role === 'superadmin' && (
                <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setEditingId(editingId === d.id ? null : d.id)}><Pencil size={13} /> Edit</button>
              )}
            </div>
            {editingId === d.id && (
              <DonationEditForm
                donation={d}
                onSaved={() => { setEditingId(null); load(); }}
                onCancel={() => setEditingId(null)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
