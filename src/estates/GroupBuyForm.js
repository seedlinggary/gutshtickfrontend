import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import apiRequest from '../ApiRequest';
import EstatesPhotoUpload from './EstatesPhotoUpload';
import { normalizePhone, isValidPhone } from '../shared/phone';

const EMPTY = {
  title: '', description: '', developer_name: '', stage: '',
  address: '', neighborhood: '', city: '', state: '', country: '', lat: '', lng: '',
  price_per_unit_estimate: '', currency: 'USD', total_units: '', min_group_size: '', expected_completion: '',
  contact_name: '', contact_email: '', contact_phone: '', contact_whatsapp: '',
};

export default function GroupBuyForm() {
  const { slug } = useParams();
  const editing = !!slug;
  const navigate = useNavigate();
  const [gbId, setGbId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [photos, setPhotos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(editing);

  useEffect(() => {
    if (!editing) return;
    apiRequest('GET', null, `/estates/group-buys/${slug}`)
      .then((gb) => {
        setGbId(gb.id);
        setForm({
          title: gb.title || '', description: gb.description || '', developer_name: gb.developer_name || '', stage: gb.stage || '',
          address: gb.address || '', neighborhood: gb.neighborhood || '', city: gb.city || '', state: gb.state || '', country: gb.country || '',
          lat: gb.lat ?? '', lng: gb.lng ?? '',
          price_per_unit_estimate: gb.price_per_unit_estimate ?? '', currency: gb.currency || 'USD',
          total_units: gb.total_units ?? '', min_group_size: gb.min_group_size ?? '', expected_completion: gb.expected_completion || '',
          contact_name: gb.contact_name || '', contact_email: gb.contact_email || '',
          contact_phone: gb.contact_phone || '', contact_whatsapp: gb.contact_whatsapp || '',
        });
        setPhotos(gb.photos || []);
      })
      .catch(() => setError('Could not load this group buy.'))
      .finally(() => setLoading(false));
  }, [editing, slug]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) { setError('Title is required.'); return; }
    if (!form.contact_email.trim() && !form.contact_phone.trim()) {
      setError('At least one of contact email or contact phone is required.');
      return;
    }
    setSaving(true);
    const numOrNull = (v) => (v === '' || v === null ? null : Number(v));
    const intOrNull = (v) => (v === '' || v === null ? null : parseInt(v, 10));
    const body = {
      ...form,
      lat: numOrNull(form.lat), lng: numOrNull(form.lng),
      price_per_unit_estimate: numOrNull(form.price_per_unit_estimate),
      total_units: intOrNull(form.total_units), min_group_size: intOrNull(form.min_group_size),
      contact_phone: normalizePhone(form.contact_phone, form.country),
      contact_whatsapp: normalizePhone(form.contact_whatsapp, form.country),
      photos: photos.map((p) => p.filename),
    };
    const req = editing
      ? apiRequest('PATCH', body, `/estates/group-buys/${gbId}`)
      : apiRequest('POST', body, '/estates/group-buys');
    req
      .then((gb) => navigate(`/group-buy/${gb.slug}`))
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not save this group buy.'))
      .finally(() => setSaving(false));
  };

  if (loading) return <div className="feed-section"><div className="gs-container" style={{ maxWidth: 680 }}><p style={{ color: 'var(--muted)' }}>Loading…</p></div></div>;

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 680 }}>
        <Link to="/group-buy" className="est-back-link">← Group Buy</Link>
        <div className="est-masthead">
          <div className="est-masthead-kicker"><Users size={13} /> {editing ? 'Edit group buy' : 'Start a group buy'}</div>
          <h1 className="est-masthead-title">{editing ? `Edit ${form.title}` : 'Start a group buy'}</h1>
          <p className="est-masthead-sub">Post a pre-construction project and let interested buyers find you -- you coordinate the actual group discount with the developer once enough people have joined.</p>
        </div>

        <form onSubmit={submit}>
          {error && <p className="est-error">{error}</p>}

          <div className="est-form-section">
            <h3>Project</h3>
            <label className="est-field-label">Title *</label>
            <input className="gs-input" value={form.title} onChange={set('title')} required style={{ marginBottom: 12 }} />
            <label className="est-field-label">Description</label>
            <textarea className="gs-input" style={{ minHeight: 90, marginBottom: 12 }} value={form.description} onChange={set('description')} />
            <div className="est-form-grid">
              <div>
                <label className="est-field-label">Developer name</label>
                <input className="gs-input" value={form.developer_name} onChange={set('developer_name')} />
              </div>
              <div>
                <label className="est-field-label">Stage</label>
                <select className="gs-input" value={form.stage} onChange={set('stage')}>
                  <option value="">—</option>
                  <option value="pre_construction">Pre-Construction</option>
                  <option value="under_construction">Under Construction</option>
                  <option value="nearing_completion">Nearing Completion</option>
                </select>
              </div>
              <div>
                <label className="est-field-label">Expected completion</label>
                <input className="gs-input" placeholder="e.g. Q4 2027" value={form.expected_completion} onChange={set('expected_completion')} />
              </div>
            </div>
          </div>

          <div className="est-form-section">
            <h3>Pricing &amp; group size</h3>
            <div className="est-form-grid">
              <div>
                <label className="est-field-label">Est. price per unit</label>
                <input className="gs-input" type="number" step="any" value={form.price_per_unit_estimate} onChange={set('price_per_unit_estimate')} />
              </div>
              <div>
                <label className="est-field-label">Currency</label>
                <select className="gs-input" value={form.currency} onChange={set('currency')}>
                  <option value="USD">USD ($)</option>
                  <option value="ILS">ILS (₪)</option>
                </select>
              </div>
              <div>
                <label className="est-field-label">Total units</label>
                <input className="gs-input" type="number" value={form.total_units} onChange={set('total_units')} />
              </div>
              <div>
                <label className="est-field-label">Min. group size for discount</label>
                <input className="gs-input" type="number" value={form.min_group_size} onChange={set('min_group_size')} />
              </div>
            </div>
          </div>

          <div className="est-form-section">
            <h3>Location</h3>
            <label className="est-field-label">Address</label>
            <input className="gs-input" value={form.address} onChange={set('address')} style={{ marginBottom: 12 }} />
            <div className="est-form-grid">
              <div><label className="est-field-label">Neighborhood (optional)</label><input className="gs-input" placeholder="e.g. Neve Shamir" value={form.neighborhood} onChange={set('neighborhood')} /></div>
              <div><label className="est-field-label">City</label><input className="gs-input" value={form.city} onChange={set('city')} /></div>
              <div><label className="est-field-label">State / region</label><input className="gs-input" value={form.state} onChange={set('state')} /></div>
              <div><label className="est-field-label">Country</label><input className="gs-input" value={form.country} onChange={set('country')} /></div>
            </div>
            <div className="est-form-grid" style={{ marginTop: 12 }}>
              <div><label className="est-field-label">Latitude (optional)</label><input className="gs-input" type="number" step="any" value={form.lat} onChange={set('lat')} /></div>
              <div><label className="est-field-label">Longitude (optional)</label><input className="gs-input" type="number" step="any" value={form.lng} onChange={set('lng')} /></div>
            </div>
          </div>

          <div className="est-form-section">
            <h3>Photos (up to 5)</h3>
            <EstatesPhotoUpload photos={photos} onChange={setPhotos} />
          </div>

          <div className="est-form-section">
            <h3>Contact *</h3>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 12px' }}>At least one of email or phone is required.</p>
            <div className="est-form-grid">
              <div><label className="est-field-label">Your name</label><input className="gs-input" value={form.contact_name} onChange={set('contact_name')} /></div>
              <div><label className="est-field-label">Email</label><input className="gs-input" type="email" value={form.contact_email} onChange={set('contact_email')} /></div>
              <div>
                <label className="est-field-label">Phone</label>
                <input className="gs-input" type="tel" value={form.contact_phone} onChange={set('contact_phone')} />
                {form.contact_phone.trim() && !isValidPhone(form.contact_phone, form.country) && (
                  <p style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 0' }}>
                    Doesn't look like a complete number -- include an area/country code if "Country" above doesn't cover it.
                  </p>
                )}
              </div>
              <div>
                <label className="est-field-label">WhatsApp (optional)</label>
                <input className="gs-input" type="tel" value={form.contact_whatsapp} onChange={set('contact_whatsapp')} />
                {form.contact_whatsapp.trim() && !isValidPhone(form.contact_whatsapp, form.country) && (
                  <p style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 0' }}>
                    Doesn't look like a complete number -- include an area/country code if "Country" above doesn't cover it.
                  </p>
                )}
              </div>
            </div>
          </div>

          <button type="submit" className="gs-btn gs-btn-primary" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Publish group buy'}
          </button>
        </form>
      </div>
    </div>
  );
}
