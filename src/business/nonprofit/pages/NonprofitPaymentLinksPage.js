import React, { useEffect, useState } from 'react';
import { Download, Plus, Pencil, Ban } from 'lucide-react';
import nonprofitApiRequest from '../nonprofitApi';
import FamilyLinkCell from '../FamilyLinkCell';
import { linkRecordToFamily, unlinkRecordFromFamily } from '../familyLinkActions';
import '../nonprofit.css';

function formatCents(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ILS' }).format((cents || 0) / 100);
}

function PaymentLinkForm({ businessId, link, onSaved, onCancel }) {
  const [label, setLabel] = useState(link?.label || '');
  const [amount, setAmount] = useState(link ? (link.amount_cents / 100).toFixed(2) : '');
  const [fullName, setFullName] = useState(link?.full_name || '');
  const [phone, setPhone] = useState(link?.phone || '');
  const [email, setEmail] = useState(link?.email || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    const amountCents = Math.round(Number(amount) * 100);
    if (!label.trim() || !amountCents || amountCents <= 0) {
      setError('A label and an amount greater than 0 are required.');
      return;
    }
    setSaving(true);
    setError('');
    const body = {
      label: label.trim(),
      amount_cents: amountCents,
      full_name: fullName.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
    };
    const req = link
      ? nonprofitApiRequest('PUT', body, `/nonprofit/payment-links/${link.id}/override`)
      : nonprofitApiRequest('POST', body, `/nonprofit/businesses/${businessId}/payment-links`);
    req.then(onSaved).catch((err) => setError(typeof err === 'string' ? err : 'Could not save.')).finally(() => setSaving(false));
  };

  return (
    <form onSubmit={submit} className="sb-new-page-form" style={{ maxWidth: 420, marginTop: 10 }}>
      {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13 }}>{error}</p>}
      <input className="gs-input" placeholder="Label (e.g. Building fund pledge)" value={label} onChange={(e) => setLabel(e.target.value)} required />
      <input className="gs-input" type="number" step="0.01" min="0.01" placeholder="Amount (ILS)" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      <input className="gs-input" placeholder="Name (optional)" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input className="gs-input" placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ flex: '1 1 140px' }} />
        <input className="gs-input" type="email" placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} style={{ flex: '1 1 160px' }} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="gs-btn gs-btn-sm" disabled={saving}>Save</button>
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default function NonprofitPaymentLinksPage({ businessId, staff }) {
  const [links, setLinks] = useState(null);
  const [families, setFamilies] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [familyBusyId, setFamilyBusyId] = useState(null);

  const load = () => nonprofitApiRequest('GET', null, `/nonprofit/businesses/${businessId}/payment-links`)
    .then((d) => setLinks(d.payment_links))
    .catch(() => setLinks([]));
  useEffect(() => { load(); }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    nonprofitApiRequest('GET', null, `/nonprofit/businesses/${businessId}/families`).then((d) => setFamilies(d.families)).catch(() => setFamilies([]));
  }, [businessId]);

  const chooseFamily = (link, choice) => {
    setFamilyBusyId(link.id);
    linkRecordToFamily(businessId, 'NonprofitPaymentLink', link.id, choice).then(load).finally(() => setFamilyBusyId(null));
  };
  const unlinkFamily = (link) => {
    setFamilyBusyId(link.id);
    unlinkRecordFromFamily('NonprofitPaymentLink', link.id).then(load).finally(() => setFamilyBusyId(null));
  };

  const exportCsv = () => {
    nonprofitApiRequest('GET', null, `/nonprofit/businesses/${businessId}/payment-links/export`).then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'payment-links.csv';
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const cancelLink = (id) => {
    if (!window.confirm('Cancel this payment link?')) return;
    nonprofitApiRequest('POST', null, `/nonprofit/payment-links/${id}/cancel`).then(load);
  };

  if (!links) return <div className="gs-loading"><div className="gs-spinner" /></div>;

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Payment Links</h2>

      <div className="np-toolbar">
        <div className="np-filters">
          {staff.role !== 'superadmin' && <span className="gs-empty" style={{ margin: 0 }}>Only a super admin can create or cancel payment links.</span>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={exportCsv}><Download size={14} /> Export CSV</button>
          {staff.role === 'superadmin' && !formOpen && (
            <button type="button" className="gs-btn gs-btn-sm" onClick={() => { setEditingId(null); setFormOpen(true); }}><Plus size={14} /> Create payment link</button>
          )}
        </div>
      </div>

      {formOpen && staff.role === 'superadmin' && (
        <PaymentLinkForm
          businessId={businessId}
          onSaved={() => { setFormOpen(false); load(); }}
          onCancel={() => setFormOpen(false)}
        />
      )}

      {links.length === 0 && <p className="gs-empty">No payment links yet.</p>}

      <div className="admin-list" style={{ marginTop: 14 }}>
        {links.map((l) => (
          <div key={l.id} className="admin-card">
            <div className="admin-card-top">
              <span className={`np-badge np-badge-${l.status}`}>{l.status}</span>
              <span className="admin-date">{l.created_at ? new Date(l.created_at).toLocaleDateString() : ''}</span>
            </div>
            <div style={{ fontSize: 13 }}>
              <strong>{l.label}</strong>{l.full_name ? ` · ${l.full_name}` : ''}
            </div>
            <div className="admin-card-meta">
              {formatCents(l.amount_cents)} · ref {l.reference_code}
            </div>
            <div style={{ marginTop: 6 }}>
              <FamilyLinkCell
                families={families} familyId={l.family_id} familyName={l.family_name} busy={familyBusyId === l.id}
                onChoose={(choice) => chooseFamily(l, choice)} onUnlink={() => unlinkFamily(l)}
              />
            </div>
            {staff.role === 'superadmin' && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => { setFormOpen(false); setEditingId(editingId === l.id ? null : l.id); }}><Pencil size={13} /> Edit</button>
                {l.status !== 'cancelled' && (
                  <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => cancelLink(l.id)}><Ban size={13} /> Cancel</button>
                )}
              </div>
            )}
            {editingId === l.id && (
              <PaymentLinkForm
                businessId={businessId}
                link={l}
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
