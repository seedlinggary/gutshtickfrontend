import React, { useEffect, useState } from 'react';
import { ArrowLeft, Ban, RotateCcw, Trash2, PauseCircle, PlayCircle, Save, Pencil } from 'lucide-react';
import nonprofitApiRequest from '../nonprofitApi';
import FamilyLinkCell from '../FamilyLinkCell';
import { linkRecordToFamily, unlinkRecordFromFamily } from '../familyLinkActions';
import '../nonprofit.css';

function formatCents(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ILS' }).format((cents || 0) / 100);
}

function MembershipEditForm({ membership, onSaved, onCancel }) {
  const [fullName, setFullName] = useState(membership.full_name || '');
  const [email, setEmail] = useState(membership.email || '');
  const [phone, setPhone] = useState(membership.phone || '');
  const [address, setAddress] = useState(membership.address || '');
  const [city, setCity] = useState(membership.city || '');
  const [tier, setTier] = useState(membership.tier || 'associate');
  const [monthly, setMonthly] = useState((membership.monthly_cents / 100).toFixed(2));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    const monthlyCents = Math.round(Number(monthly) * 100);
    if (!monthlyCents || monthlyCents <= 0) { setError('Monthly amount must be greater than 0.'); return; }
    setSaving(true);
    setError('');
    nonprofitApiRequest('PUT', {
      full_name: fullName.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
      city: city.trim() || null,
      tier,
      monthly_cents: monthlyCents,
    }, `/nonprofit/memberships/${membership.id}/override`)
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
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <select className="gs-select" value={tier} onChange={(e) => setTier(e.target.value)} style={{ flex: '1 1 140px' }}>
          <option value="associate">Associate</option>
          <option value="full">Full</option>
        </select>
        <input className="gs-input" type="number" step="0.01" min="0.01" placeholder="Monthly (ILS)" value={monthly} onChange={(e) => setMonthly(e.target.value)} style={{ flex: '1 1 140px' }} required />
      </div>
      <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
        This changes our records only -- it does not touch the live standing order amount (use "Change live amount" below for that).
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="gs-btn gs-btn-sm" disabled={saving}>Save</button>
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function UpdateAmountForm({ membership, onDone }) {
  const [amount, setAmount] = useState((membership.monthly_cents / 100).toFixed(2));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const cents = Math.round(Number(amount) * 100);
    if (!cents || cents <= 0) { setError('Enter an amount greater than 0.'); return; }
    // This writes straight to the LIVE standing order at Nedarim Plus, so
    // it gets a double confirm on top of the normal form submit -- there's
    // no "undo" for a real recurring charge getting changed by accident.
    if (!window.confirm(`Change the LIVE standing order to ${formatCents(cents)}/month? This takes effect on the real payment processor immediately.`)) return;
    if (!window.confirm('Are you sure? This cannot be undone from here.')) return;
    setBusy(true);
    setError('');
    nonprofitApiRequest('POST', { monthly_cents: cents }, `/nonprofit/memberships/${membership.id}/nedarim/update-amount`)
      .then(onDone)
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not update amount.'))
      .finally(() => setBusy(false));
  };

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap', marginTop: 10 }}>
      {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13, width: '100%' }}>{error}</p>}
      <input className="gs-input" type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ width: 140 }} />
      <button type="submit" className="gs-btn gs-btn-sm" disabled={busy}><Save size={13} /> Update live amount</button>
    </form>
  );
}

export default function NonprofitMembershipDetailPage({ businessId, staff, membershipId, onBack }) {
  const [data, setData] = useState(null);
  const [families, setFamilies] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [showAmountForm, setShowAmountForm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [familyBusy, setFamilyBusy] = useState(false);

  const load = () => nonprofitApiRequest('GET', null, `/nonprofit/memberships/${membershipId}`)
    .then((d) => setData(d))
    .catch((err) => setLoadError(typeof err === 'string' ? err : 'Could not load membership.'));
  useEffect(() => { load(); }, [membershipId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    nonprofitApiRequest('GET', null, `/nonprofit/businesses/${businessId}/families`).then((d) => setFamilies(d.families)).catch(() => setFamilies([]));
  }, [businessId]);

  if (loadError) return <p className="gs-empty">{loadError}</p>;
  if (!data) return <div className="gs-loading"><div className="gs-spinner" /></div>;

  const chooseFamily = (choice) => {
    setFamilyBusy(true);
    linkRecordToFamily(businessId, 'NonprofitMembership', data.membership.id, choice).then(load).finally(() => setFamilyBusy(false));
  };
  const unlinkFamily = () => {
    setFamilyBusy(true);
    unlinkRecordFromFamily('NonprofitMembership', data.membership.id).then(load).finally(() => setFamilyBusy(false));
  };

  const { membership: m, transactions } = data;

  const disableNedarim = () => {
    if (!window.confirm('Pause this standing order at the payment processor? It can be re-enabled later.')) return;
    setBusy(true);
    nonprofitApiRequest('POST', {}, `/nonprofit/memberships/${m.id}/nedarim/disable`).then(load).finally(() => setBusy(false));
  };
  const enableNedarim = () => {
    setBusy(true);
    nonprofitApiRequest('POST', {}, `/nonprofit/memberships/${m.id}/nedarim/enable`).then(load).finally(() => setBusy(false));
  };
  const deleteNedarim = () => {
    if (window.prompt('This PERMANENTLY deletes the standing order at the payment processor -- it cannot be undone. Type DELETE to confirm:') !== 'DELETE') return;
    setBusy(true);
    nonprofitApiRequest('POST', {}, `/nonprofit/memberships/${m.id}/nedarim/delete`).then(load).finally(() => setBusy(false));
  };
  const runAction = (action) => nonprofitApiRequest('PATCH', { action }, `/nonprofit/memberships/${m.id}`).then(load);

  return (
    <div>
      <button type="button" onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 14, background: 'none', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer' }}><ArrowLeft size={14} /> Back to memberships</button>
      <h2 style={{ marginTop: 0 }}>{m.full_name}</h2>

      <div className="gs-card">
        <div className="admin-card-top">
          <span className={`np-badge np-badge-${m.status}`}>{m.status}</span>
          <span className="admin-date">ref {m.reference_code}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, fontSize: 13, marginTop: 8 }}>
          <div><div className="gs-label">Email</div>{m.email || '--'}</div>
          <div><div className="gs-label">Phone</div>{m.phone || '--'}</div>
          <div><div className="gs-label">Address</div>{m.address || '--'}{m.city ? `, ${m.city}` : ''}</div>
          <div><div className="gs-label">Tier</div>{m.tier}</div>
          <div><div className="gs-label">Monthly</div>{formatCents(m.monthly_cents)}{m.monthly_is_estimated ? ' (estimated)' : ''}</div>
          <div><div className="gs-label">Next charge</div>{m.next_charge_date ? new Date(m.next_charge_date).toLocaleDateString() : '--'}</div>
          <div><div className="gs-label">Last charge</div>{m.last_charge_at ? new Date(m.last_charge_at).toLocaleString() : '--'}</div>
          <div><div className="gs-label">Nedarim payments</div>{m.nedarim_payments_made ?? '--'} made{m.nedarim_payments_remaining != null ? `, ${m.nedarim_payments_remaining} remaining` : ''}</div>
          <div>
            <div className="gs-label">Family</div>
            <FamilyLinkCell families={families} familyId={m.family_id} familyName={m.family_name} busy={familyBusy} onChoose={chooseFamily} onUnlink={unlinkFamily} />
          </div>
        </div>

        {m.nedarim_deleted_at && (
          <p style={{ color: 'var(--danger, #b42318)', fontSize: 13, marginTop: 10 }}>
            Deleted on the payment processor on {new Date(m.nedarim_deleted_at).toLocaleDateString()} -- this cannot be undone.
          </p>
        )}
        {!m.nedarim_deleted_at && m.nedarim_disabled_at && (
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 10 }}>
            Currently paused on the payment processor (since {new Date(m.nedarim_disabled_at).toLocaleDateString()}).
          </p>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {m.status !== 'cancelled' ? (
            <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => { if (window.confirm('Cancel this membership?')) runAction('cancel'); }}><Ban size={13} /> Cancel</button>
          ) : (
            <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => runAction('reactivate')}><RotateCcw size={13} /> Reactivate</button>
          )}
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>This does not cancel the real standing order</span>
          {staff.role === 'superadmin' && (
            <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setEditing((e) => !e)}><Pencil size={13} /> Edit details</button>
          )}
        </div>

        {editing && (
          <MembershipEditForm membership={m} onSaved={() => { setEditing(false); load(); }} onCancel={() => setEditing(false)} />
        )}
      </div>

      {staff.role === 'superadmin' && m.keva_id && !m.nedarim_deleted_at && (
        <div className="gs-card" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>Live standing order (Nedarim Plus)</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {!showAmountForm && <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setShowAmountForm(true)}><Save size={13} /> Change live amount</button>}
            {!m.nedarim_disabled_at && <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" disabled={busy} onClick={disableNedarim}><PauseCircle size={13} /> Pause</button>}
            {m.nedarim_disabled_at && <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" disabled={busy} onClick={enableNedarim}><PlayCircle size={13} /> Resume</button>}
            <button type="button" className="gs-btn gs-btn-danger gs-btn-sm" disabled={busy} onClick={deleteNedarim}><Trash2 size={13} /> Delete permanently</button>
          </div>
          {showAmountForm && <UpdateAmountForm membership={m} onDone={() => { setShowAmountForm(false); load(); }} />}
        </div>
      )}

      <div className="gs-card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Transactions</h3>
        {transactions.length === 0 && <p className="gs-empty">No transactions yet.</p>}
        <div className="admin-list">
          {transactions.map((t) => (
            <div key={t.id} className="admin-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{formatCents(t.amount_cents)}{t.amount_is_estimated ? ' (estimated)' : ''}</span>
              <span className="admin-date">{t.received_at ? new Date(t.received_at).toLocaleDateString() : ''}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
