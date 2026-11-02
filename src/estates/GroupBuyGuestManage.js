import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import apiRequest from '../ApiRequest';
import { normalizePhone } from '../shared/phone';

const TITLE_MAX = 150;
const DESCRIPTION_MAX = 4000;

/** Token-only management page for a guest (no-account) Estates Group Buy --
 * the link emailed by backend/estates/routes/estates_group_buy.py's
 * create_guest_group_buy. Only GET/PATCH/DELETE exist for the guest routes
 * (no renew/status/close-group-buy equivalent), so this only offers
 * edit/delete -- no invented capability. */
export default function GroupBuyGuestManage() {
  const { token } = useParams();
  const [state, setState] = useState('loading');
  const [gb, setGb] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    apiRequest('GET', null, `/estates/group-buys/guest/${token}`)
      .then((data) => { setGb(data); setState('ready'); })
      .catch(() => setState('notfound'));
  }, [token]);

  const startEdit = () => {
    setForm({
      title: gb.title || '', description: gb.description || '', developer_name: gb.developer_name || '',
      contact_name: gb.contact_name || '', contact_email: gb.contact_email || '',
      contact_phone: gb.contact_phone || '', contact_whatsapp: gb.contact_whatsapp || '',
      country: gb.country || '',
    });
    setError('');
    setEditing(true);
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    if (!form.contact_email.trim() && !form.contact_phone.trim()) {
      setError('At least one of contact email or contact phone is required.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const updated = await apiRequest('PATCH', {
        title: form.title.trim(),
        description: form.description.trim() || null,
        developer_name: form.developer_name.trim() || null,
        contact_name: form.contact_name.trim() || null,
        contact_email: form.contact_email.trim() || null,
        contact_phone: normalizePhone(form.contact_phone, form.country),
        contact_whatsapp: normalizePhone(form.contact_whatsapp, form.country),
      }, `/estates/group-buys/guest/${token}`);
      setGb(updated);
      setEditing(false);
      setMsg('Saved.');
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to save changes.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Delete this group buy? This cannot be undone.')) return;
    setBusy(true);
    try {
      await apiRequest('DELETE', null, `/estates/group-buys/guest/${token}`);
      setState('deleted');
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to delete.');
      setBusy(false);
    }
  };

  if (state === 'loading') {
    return <div className="feed-section"><div className="gs-container" style={{ maxWidth: 680 }}><div className="gs-loading"><div className="gs-spinner" /> Loading…</div></div></div>;
  }

  if (state === 'notfound') {
    return (
      <div className="feed-section">
        <div className="gs-container" style={{ maxWidth: 680, textAlign: 'center' }}>
          <div className="gs-error-box">This link is invalid, or the group buy it manages has been removed.</div>
          <Link to="/group-buy" className="gs-btn gs-btn-outline" style={{ marginTop: 16 }}>← Group Buy</Link>
        </div>
      </div>
    );
  }

  if (state === 'deleted') {
    return (
      <div className="feed-section">
        <div className="gs-container" style={{ maxWidth: 680, textAlign: 'center' }}>
          <div className="gs-success-box">Your group buy has been deleted.</div>
          <Link to="/group-buy" className="gs-btn gs-btn-outline" style={{ marginTop: 16 }}>← Group Buy</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 680 }}>
        <div className="est-masthead">
          <div className="est-masthead-kicker"><Users size={13} /> Manage your group buy</div>
          <h1 className="est-masthead-title">{gb.title}</h1>
          <p className="est-masthead-sub">No account needed — this private link is how you manage it.</p>
        </div>

        {msg && <div className="gs-success-box" style={{ marginBottom: 12 }}>{msg}</div>}
        {error && <div className="gs-error-box" style={{ marginBottom: 12 }}>{error}</div>}

        {!editing ? (
          <div className="est-form-section">
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>
              {gb.member_count} interested {gb.member_count === 1 ? 'buyer' : 'buyers'} so far.
            </div>
            {gb.description && <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{gb.description}</p>}
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
              <div>Contact: {gb.contact_name || ''} {gb.contact_email} {gb.contact_phone}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={startEdit} disabled={busy}>Edit</button>
              <button className="gs-btn gs-btn-danger gs-btn-sm" onClick={remove} disabled={busy}>Delete</button>
            </div>
          </div>
        ) : (
          <form onSubmit={saveEdit} className="est-form-section">
            <label className="est-field-label">Title *</label>
            <input className="gs-input" value={form.title} maxLength={TITLE_MAX} onChange={set('title')} style={{ marginBottom: 12 }} />
            <label className="est-field-label">Description</label>
            <textarea className="gs-input" style={{ minHeight: 100, marginBottom: 12 }} value={form.description} maxLength={DESCRIPTION_MAX} onChange={set('description')} />
            <label className="est-field-label">Developer name</label>
            <input className="gs-input" value={form.developer_name} onChange={set('developer_name')} style={{ marginBottom: 12 }} />

            <div className="est-form-grid">
              <div><label className="est-field-label">Your name</label><input className="gs-input" value={form.contact_name} onChange={set('contact_name')} /></div>
              <div><label className="est-field-label">Email</label><input className="gs-input" type="email" value={form.contact_email} onChange={set('contact_email')} /></div>
              <div><label className="est-field-label">Phone</label><input className="gs-input" type="tel" value={form.contact_phone} onChange={set('contact_phone')} /></div>
              <div><label className="est-field-label">WhatsApp</label><input className="gs-input" type="tel" value={form.contact_whatsapp} onChange={set('contact_whatsapp')} /></div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button type="submit" className="gs-btn gs-btn-primary gs-btn-sm" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
              <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setEditing(false)} disabled={busy}>Cancel</button>
            </div>
          </form>
        )}

        <Link to="/group-buy" style={{ display: 'inline-block', marginTop: 16 }}>← Group Buy</Link>
      </div>
    </div>
  );
}
