import React, { useEffect, useState } from 'react';
import { ArrowLeft, Download, Trash2, Plus } from 'lucide-react';
import nonprofitApiRequest from '../nonprofitApi';
import FamilyLinkCell from '../FamilyLinkCell';
import { linkRecordToFamily, unlinkRecordFromFamily } from '../familyLinkActions';
import '../nonprofit.css';

function formatCents(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ILS' }).format((cents || 0) / 100);
}

function ManualSignupForm({ businessId, holidayId, onSaved, onCancel }) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isMember, setIsMember] = useState(false);
  const [menSeats, setMenSeats] = useState('');
  const [womenSeats, setWomenSeats] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    const men = Number(menSeats) || 0;
    const women = Number(womenSeats) || 0;
    if (!fullName.trim() || !phone.trim() || (men <= 0 && women <= 0)) {
      setError('Name, phone, and at least one seat are required.');
      return;
    }
    setSaving(true);
    setError('');
    const body = {
      full_name: fullName.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
      is_member: isMember,
      items: [{ holiday_id: Number(holidayId), men_seats: men, women_seats: women }],
    };
    nonprofitApiRequest('POST', body, `/nonprofit/businesses/${businessId}/holiday-bills`)
      .then(onSaved)
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not save.'))
      .finally(() => setSaving(false));
  };

  return (
    <form onSubmit={submit} className="sb-new-page-form" style={{ maxWidth: 420 }}>
      {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13 }}>{error}</p>}
      <input className="gs-input" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
      <input className="gs-input" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
      <input className="gs-input" type="email" placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input className="gs-input" type="number" min="0" placeholder="Men seats" value={menSeats} onChange={(e) => setMenSeats(e.target.value)} style={{ flex: '1 1 120px' }} />
        <input className="gs-input" type="number" min="0" placeholder="Women seats" value={womenSeats} onChange={(e) => setWomenSeats(e.target.value)} style={{ flex: '1 1 120px' }} />
      </div>
      <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
        <input type="checkbox" checked={isMember} onChange={(e) => setIsMember(e.target.checked)} /> Member pricing
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="gs-btn gs-btn-sm" disabled={saving}>Save</button>
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default function NonprofitHolidaySignupsPage({ businessId, holidayId, onBack }) {
  const [signups, setSignups] = useState(null);
  const [families, setFamilies] = useState([]);
  const [holidayName, setHolidayName] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [seatEdits, setSeatEdits] = useState({});
  const [familyBusyId, setFamilyBusyId] = useState(null);

  const load = () => nonprofitApiRequest('GET', null, `/nonprofit/holidays/${holidayId}/signups`).then((d) => setSignups(d.signups)).catch(() => setSignups([]));

  useEffect(() => {
    load();
    nonprofitApiRequest('GET', null, `/nonprofit/businesses/${businessId}/holidays`)
      .then((d) => { const h = d.holidays.find((x) => String(x.id) === String(holidayId)); if (h) setHolidayName(h.name_en); })
      .catch(() => {});
  }, [businessId, holidayId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    nonprofitApiRequest('GET', null, `/nonprofit/businesses/${businessId}/families`).then((d) => setFamilies(d.families)).catch(() => setFamilies([]));
  }, [businessId]);

  // Family lives on the Bill, not the Signup line item -- so this links
  // signup.bill_id, same record every other line item on that bill
  // shares (combining one seat purchase with a family combines the
  // whole purchase, which is what you want: a family rarely buys half
  // their seats "as themselves" and half anonymously).
  const chooseFamily = (signup, choice) => {
    setFamilyBusyId(signup.id);
    linkRecordToFamily(businessId, 'NonprofitBill', signup.bill_id, choice).then(load).finally(() => setFamilyBusyId(null));
  };
  const unlinkFamily = (signup) => {
    setFamilyBusyId(signup.id);
    unlinkRecordFromFamily('NonprofitBill', signup.bill_id).then(load).finally(() => setFamilyBusyId(null));
  };

  const seatValue = (signup, field) => (seatEdits[signup.id]?.[field] !== undefined ? seatEdits[signup.id][field] : signup[field]);

  const setSeatEdit = (signup, field, value) => setSeatEdits((prev) => ({ ...prev, [signup.id]: { ...prev[signup.id], [field]: value } }));

  const saveSeats = (signup) => {
    const men = Number(seatValue(signup, 'men_seats'));
    const women = Number(seatValue(signup, 'women_seats'));
    if (men === signup.men_seats && women === signup.women_seats) return;
    nonprofitApiRequest('PATCH', { men_seats: men, women_seats: women }, `/nonprofit/signups/${signup.id}`).then(load);
  };

  // "mark_paid"/"cancel"/"reopen" flip the status of the signup's PARENT
  // bill (status lives on the bill, not the signup) -- the signup we get
  // back just reflects that. Always reload the whole list after one of
  // these so any sibling line items on the same bill stay in sync too.
  const doAction = (signup, action) => nonprofitApiRequest('PATCH', { action }, `/nonprofit/signups/${signup.id}`).then(load);

  const remove = (signup) => {
    if (!window.confirm(`Remove the signup for ${signup.full_name}?`)) return;
    nonprofitApiRequest('DELETE', null, `/nonprofit/signups/${signup.id}`).then(load);
  };

  const exportCsv = () => {
    nonprofitApiRequest('GET', null, `/nonprofit/holidays/${holidayId}/signups/export`).then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'signups.csv';
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  if (!signups) return <div className="gs-loading"><div className="gs-spinner" /></div>;

  return (
    <div>
      <button type="button" onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 10, fontSize: 13, background: 'none', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer' }}><ArrowLeft size={14} /> Back to holidays</button>
      <div className="np-toolbar">
        <h2 style={{ margin: 0 }}>{holidayName || 'Signups'}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={exportCsv}><Download size={14} /> Export CSV</button>
          {!formOpen && (
            <button type="button" className="gs-btn gs-btn-sm" onClick={() => setFormOpen(true)}><Plus size={14} /> Manual signup</button>
          )}
        </div>
      </div>

      {formOpen && (
        <div className="gs-card" style={{ marginBottom: 16 }}>
          <ManualSignupForm
            businessId={businessId}
            holidayId={holidayId}
            onSaved={() => { setFormOpen(false); load(); }}
            onCancel={() => setFormOpen(false)}
          />
        </div>
      )}

      {signups.length === 0 && <p className="gs-empty">No signups yet.</p>}

      <div className="admin-list">
        {signups.map((s) => (
          <div key={s.id} className="gs-card admin-card">
            <div className="admin-card-top">
              <strong>{s.full_name}</strong>
              <span className={`np-badge np-badge-${s.bill_status}`}>{s.bill_status}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              {s.phone} · {s.is_member ? 'Member' : 'Non-member'} · ref {s.reference_code}
            </div>
            <div style={{ marginTop: 6 }}>
              <FamilyLinkCell
                families={families} familyId={s.family_id} familyName={s.family_name} busy={familyBusyId === s.id}
                onChoose={(choice) => chooseFamily(s, choice)} onUnlink={() => unlinkFamily(s)}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
              <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                Men
                <input
                  className="gs-input"
                  type="number"
                  min="0"
                  style={{ width: 70 }}
                  value={seatValue(s, 'men_seats')}
                  onChange={(e) => setSeatEdit(s, 'men_seats', e.target.value)}
                  onBlur={() => saveSeats(s)}
                />
              </label>
              <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                Women
                <input
                  className="gs-input"
                  type="number"
                  min="0"
                  style={{ width: 70 }}
                  value={seatValue(s, 'women_seats')}
                  onChange={(e) => setSeatEdit(s, 'women_seats', e.target.value)}
                  onBlur={() => saveSeats(s)}
                />
              </label>
              <strong>{formatCents(s.total_cents)}</strong>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {s.bill_status === 'pending' && <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => doAction(s, 'mark_paid')}>Mark paid</button>}
              {s.bill_status !== 'cancelled' && <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => doAction(s, 'cancel')}>Cancel</button>}
              {s.bill_status === 'cancelled' && <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => doAction(s, 'reopen')}>Reopen</button>}
              <button type="button" className="sb-icon-btn" title="Delete" onClick={() => remove(s)}><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
