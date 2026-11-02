import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Store, CheckCircle2, Clock, XCircle } from 'lucide-react';
import apiRequest from '../ApiRequest';
import { CATEGORY_LABELS } from './categories';

const NAME_MAX = 150;
const ABOUT_MAX = 4000;

function StatusNotice({ business }) {
  if (business.approved_to_publish === null) {
    return <div className="gs-success-box" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={15} /> Pending review — not in the directory yet. You can still edit it below.</div>;
  }
  if (business.approved_to_publish === false) {
    return <div className="gs-error-box" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><XCircle size={15} /> This listing wasn't approved. Editing and saving sends it back in for review.</div>;
  }
  return <div className="gs-success-box" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle2 size={15} /> Live in the directory.</div>;
}

/** Token-only management page for a guest (no-account) business listing --
 * see backend/business/routes/business.py's edit_guest_business/
 * delete_guest_business. No location editing and no logo upload here:
 * edit_guest_business only accepts name/category/about/website/attributes,
 * and /business/upload (logo) is @token_required with no guest equivalent
 * -- those stay fixed at whatever was submitted until the listing is
 * claimed by a real account. */
export default function BusinessGuestManage() {
  const { token } = useParams();
  const [state, setState] = useState('loading');
  const [business, setBusiness] = useState(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('other');
  const [about, setAbout] = useState('');
  const [website, setWebsite] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    apiRequest('GET', null, `/business/businesses/guest/${token}`)
      .then((data) => { setBusiness(data); setState('ready'); })
      .catch(() => setState('notfound'));
  }, [token]);

  const startEdit = () => {
    setName(business.name || '');
    setCategory(business.category || 'other');
    setAbout(business.about || '');
    setWebsite(business.website || '');
    setError('');
    setEditing(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required.'); return; }
    setBusy(true);
    setError('');
    try {
      const updated = await apiRequest('PATCH', {
        name: name.trim(), category, about: about.trim() || null, website: website.trim() || null,
      }, `/business/businesses/guest/${token}`);
      setBusiness(updated);
      setEditing(false);
      setMsg('Saved.');
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to save changes.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Delete this listing? This cannot be undone.')) return;
    setBusy(true);
    try {
      await apiRequest('DELETE', null, `/business/businesses/guest/${token}`);
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
    return <div className="feed-section"><div className="gs-container" style={{ maxWidth: 560, textAlign: 'center' }}><div className="gs-error-box">This link is invalid, or the listing it manages has been removed.</div></div></div>;
  }
  if (state === 'deleted') {
    return <div className="feed-section"><div className="gs-container" style={{ maxWidth: 560, textAlign: 'center' }}><div className="gs-success-box">Your listing has been deleted.</div></div></div>;
  }

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 560 }}>
        <h1 style={{ margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}><Store size={20} /> Manage your business listing</h1>
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>No account needed — this private link is how you manage it.</p>

        {msg && <div className="gs-success-box" style={{ marginBottom: 12 }}>{msg}</div>}
        {error && <div className="gs-error-box" style={{ marginBottom: 12 }}>{error}</div>}
        <div style={{ marginBottom: 14 }}><StatusNotice business={business} /></div>

        <div className="gs-card">
          <div className="gs-card-body">
            {!editing ? (
              <>
                <h3 style={{ marginTop: 0 }}>{business.name}</h3>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
                  <div>Category: {CATEGORY_LABELS[business.category] || business.category}</div>
                  {business.website && <div>Website: {business.website}</div>}
                  {business.about && <p style={{ whiteSpace: 'pre-wrap' }}>{business.about}</p>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={startEdit} disabled={busy}>Edit</button>
                  <button className="gs-btn gs-btn-danger gs-btn-sm" onClick={remove} disabled={busy}>Delete</button>
                </div>
              </>
            ) : (
              <form onSubmit={saveEdit}>
                <div className="gs-field">
                  <input className="gs-input" value={name} maxLength={NAME_MAX} onChange={(e) => setName(e.target.value)} placeholder="Business name" />
                </div>
                <div className="gs-field">
                  <select className="gs-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                  </select>
                </div>
                <div className="gs-field">
                  <textarea className="gs-input gs-textarea" rows={4} value={about} maxLength={ABOUT_MAX} onChange={(e) => setAbout(e.target.value)} placeholder="About this business" />
                </div>
                <div className="gs-field">
                  <input className="gs-input" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="Website (optional)" />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" className="gs-btn gs-btn-primary gs-btn-sm" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
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
