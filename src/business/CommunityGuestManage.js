import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Users, CheckCircle2, Clock, XCircle } from 'lucide-react';
import apiRequest from '../ApiRequest';

const NAME_MAX = 150;
const DESC_MAX = 2000;

function StatusNotice({ community }) {
  if (community.approved_to_publish === null) {
    return <div className="gs-success-box" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={15} /> Pending review — not listed yet. You can still edit it below.</div>;
  }
  if (community.approved_to_publish === false) {
    return <div className="gs-error-box" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><XCircle size={15} /> This wasn't approved. Editing and saving sends it back in for review.</div>;
  }
  return <div className="gs-success-box" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle2 size={15} /> Live.</div>;
}

/** Token-only management page for a guest (no-account) community submission
 * -- see backend/business/routes/community.py's edit_guest_community/
 * delete_guest_community. Only name/city/state/country/description/lat/lng
 * are editable here -- eruv fields and sub-areas aren't accepted by the
 * guest routes (those stay owner/claim-only), matching CommunityForm.js's
 * reduced guest-create fields. */
export default function CommunityGuestManage() {
  const { token } = useParams();
  const [state, setState] = useState('loading');
  const [community, setCommunity] = useState(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [stateField, setStateField] = useState('');
  const [country, setCountry] = useState('');
  const [description, setDescription] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    apiRequest('GET', null, `/business/communities/guest/${token}`)
      .then((data) => { setCommunity(data); setState('ready'); })
      .catch(() => setState('notfound'));
  }, [token]);

  const startEdit = () => {
    setName(community.name || '');
    setCity(community.city || '');
    setStateField(community.state || '');
    setCountry(community.country || '');
    setDescription(community.description || '');
    setLat(community.lat ?? '');
    setLng(community.lng ?? '');
    setError('');
    setEditing(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !city.trim()) { setError('Name and city are required.'); return; }
    setBusy(true);
    setError('');
    try {
      const updated = await apiRequest('PATCH', {
        name: name.trim(), city: city.trim(), state: stateField.trim() || null, country: country.trim() || null,
        description: description.trim() || null, lat: lat === '' ? null : lat, lng: lng === '' ? null : lng,
      }, `/business/communities/guest/${token}`);
      setCommunity(updated);
      setEditing(false);
      setMsg('Saved.');
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to save changes.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Delete this community? This cannot be undone.')) return;
    setBusy(true);
    try {
      await apiRequest('DELETE', null, `/business/communities/guest/${token}`);
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
    return <div className="feed-section"><div className="gs-container" style={{ maxWidth: 560, textAlign: 'center' }}><div className="gs-error-box">This link is invalid, or the community it manages has been removed.</div></div></div>;
  }
  if (state === 'deleted') {
    return <div className="feed-section"><div className="gs-container" style={{ maxWidth: 560, textAlign: 'center' }}><div className="gs-success-box">Your submission has been deleted.</div></div></div>;
  }

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 560 }}>
        <h1 style={{ margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}><Users size={20} /> Manage your community</h1>
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>No account needed — this private link is how you manage it.</p>

        {msg && <div className="gs-success-box" style={{ marginBottom: 12 }}>{msg}</div>}
        {error && <div className="gs-error-box" style={{ marginBottom: 12 }}>{error}</div>}
        <div style={{ marginBottom: 14 }}><StatusNotice community={community} /></div>

        <div className="gs-card">
          <div className="gs-card-body">
            {!editing ? (
              <>
                <h3 style={{ marginTop: 0 }}>{community.name}</h3>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
                  <div>{[community.city, community.state, community.country].filter(Boolean).join(', ')}</div>
                  {community.description && <p style={{ whiteSpace: 'pre-wrap' }}>{community.description}</p>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={startEdit} disabled={busy}>Edit</button>
                  <button className="gs-btn gs-btn-danger gs-btn-sm" onClick={remove} disabled={busy}>Delete</button>
                </div>
              </>
            ) : (
              <form onSubmit={saveEdit}>
                <div className="gs-field">
                  <input className="gs-input" value={name} maxLength={NAME_MAX} onChange={(e) => setName(e.target.value)} placeholder="Community name" />
                </div>
                <div className="gs-field">
                  <input className="gs-input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
                </div>
                <div className="gs-field">
                  <input className="gs-input" value={stateField} onChange={(e) => setStateField(e.target.value)} placeholder="State / region" />
                </div>
                <div className="gs-field">
                  <input className="gs-input" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" />
                </div>
                <div className="gs-field">
                  <textarea className="gs-input gs-textarea" rows={4} value={description} maxLength={DESC_MAX} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" />
                </div>
                <div className="gs-field" style={{ display: 'flex', gap: 8 }}>
                  <input className="gs-input" type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Latitude (optional)" />
                  <input className="gs-input" type="number" step="any" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="Longitude (optional)" />
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
