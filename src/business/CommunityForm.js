import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import apiRequest from '../ApiRequest';
import UploadFile from '../Uploadfile';

const EMPTY = { name: '', city: '', state: '', country: '', description: '', lat: '', lng: '', eruv_status: '', eruv_url: '', eruv_map_image: '' };

export default function CommunityForm() {
  const { slug } = useParams();
  const editing = !!slug;
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [communityId, setCommunityId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(editing);

  useEffect(() => {
    if (!editing) return;
    apiRequest('GET', null, `/business/communities/${slug}`)
      .then((c) => {
        setCommunityId(c.id);
        setForm({
          name: c.name || '', city: c.city || '', state: c.state || '', country: c.country || '',
          description: c.description || '', lat: c.lat ?? '', lng: c.lng ?? '',
          eruv_status: c.eruv_status || '', eruv_url: c.eruv_url || '',
          eruv_map_image: c.eruv_map_image || '',
        });
      })
      .catch(() => setError('Could not load this community.'))
      .finally(() => setLoading(false));
  }, [editing, slug]);

  const submit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.city.trim()) {
      setError('Name and city are required.');
      return;
    }
    setSaving(true);
    const body = { ...form, lat: form.lat === '' ? null : form.lat, lng: form.lng === '' ? null : form.lng };
    const req = editing
      ? apiRequest('PATCH', body, `/business/communities/${communityId}`)
      : apiRequest('POST', body, '/business/communities');
    req
      .then((c) => navigate(`/communities/${c.slug}`))
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not save this community.'))
      .finally(() => setSaving(false));
  };

  if (loading) return <div className="feed-section"><div className="gs-container" style={{ maxWidth: 640 }}><p style={{ color: 'var(--muted)' }}>Loading…</p></div></div>;

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 640 }}>
        <Link to="/communities" style={{ fontSize: 13, color: 'var(--muted)' }}>← All communities</Link>
        <div className="biz-masthead">
          <div className="biz-masthead-kicker"><Users size={13} /> {editing ? 'Edit community' : 'Add a community'}</div>
          <h1 className="biz-masthead-title">{editing ? `Edit ${form.name}` : 'Add a new community'}</h1>
          <p className="biz-masthead-sub">
            A community is just a place marker -- its shuls, mikvah, grocery, restaurants and activities are pulled
            automatically from everything already in the directory nearby. Give it a location so that lookup works.
          </p>
        </div>

        <form onSubmit={submit} className="biz-minyan-form" style={{ maxWidth: 'none' }}>
          {error && <p className="biz-error">{error}</p>}
          <label>Community name
            <input className="gs-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <div className="biz-minyan-form-grid">
            <label>City
              <input className="gs-input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
            </label>
            <label>State / region
              <input className="gs-input" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </label>
          </div>
          <label>Country
            <input className="gs-input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          </label>
          <label>Description (optional)
            <textarea className="gs-input" style={{ minHeight: 70 }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
          <div className="biz-minyan-form-grid">
            <label>Latitude (optional)
              <input className="gs-input" type="number" step="any" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} />
            </label>
            <label>Longitude (optional)
              <input className="gs-input" type="number" step="any" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} />
            </label>
          </div>
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
            Without coordinates, this community's page can't automatically find nearby shuls, mikvahs, groceries,
            restaurants or activities -- it'll just show your description.
          </p>
          <label>Eruv status (optional)
            <input className="gs-input" placeholder="e.g. Active, connected to the Peterson Park eruv"
              value={form.eruv_status} onChange={(e) => setForm({ ...form, eruv_status: e.target.value })} />
          </label>
          <label>Eruv map / hotline link (optional)
            <input className="gs-input" type="url" placeholder="https://..."
              value={form.eruv_url} onChange={(e) => setForm({ ...form, eruv_url: e.target.value })} />
          </label>
          <label>Eruv map image (optional)
            <UploadFile apiextension="/business/upload" setInvestors={(name) => setForm((f) => ({ ...f, eruv_map_image: name }))} />
            {form.eruv_map_image && <span style={{ fontSize: 12, color: 'var(--muted)' }}>A map image is attached.</span>}
          </label>
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
            Eruv status changes week to week -- visitors will always be shown a reminder to confirm with the
            community's own map or hotline before relying on it.
          </p>
          <button type="submit" className="gs-btn gs-btn-primary" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create community'}
          </button>
        </form>
      </div>
    </div>
  );
}
