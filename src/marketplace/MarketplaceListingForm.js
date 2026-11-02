import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import apiRequest from '../ApiRequest';
import AddressAutocomplete from '../shared/AddressAutocomplete';
import EstatesPhotoUpload from '../estates/EstatesPhotoUpload';
import { normalizePhone, isValidPhone } from '../shared/phone';
import { isLoggedIn } from '../auth';
import GuestContactFields from '../guest/GuestContactFields';
import GuestSubmitSuccess from '../guest/GuestSubmitSuccess';
import { CONDITION_OPTIONS } from './constants';
import './marketplace.css';

const EMPTY = {
  title: '', description: '',
  category: '', subcategory: '', condition: '',
  is_free: false, price: '', currency: 'USD', ships: false,
  address: '', city: '', state: '', zip_code: '', country: '', lat: '', lng: '',
  contact_name: '', contact_email: '', contact_phone: '', contact_whatsapp: '', contact_link: '',
};

export default function MarketplaceListingForm() {
  const { idOrSlug } = useParams();
  const editing = !!idOrSlug;
  const navigate = useNavigate();
  const [listingId, setListingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [photos, setPhotos] = useState([]);
  const [categories, setCategories] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(editing);
  const loggedIn = isLoggedIn();
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestResult, setGuestResult] = useState(null);

  useEffect(() => {
    apiRequest('GET', null, '/marketplace/categories').then((d) => setCategories(d.categories || {})).catch(() => {});
  }, []);

  useEffect(() => {
    if (!editing) return;
    apiRequest('GET', null, `/marketplace/listings/${idOrSlug}`)
      .then((l) => {
        setListingId(l.id);
        setForm({
          title: l.title || '', description: l.description || '',
          category: l.category || '', subcategory: l.subcategory || '', condition: l.condition || '',
          is_free: !!l.is_free, price: l.price ?? '', currency: l.currency || 'USD', ships: !!l.ships,
          address: l.address || '', city: l.city || '', state: l.state || '', zip_code: '', country: l.country || '',
          lat: l.lat ?? '', lng: l.lng ?? '',
          contact_name: l.contact_name || '', contact_email: l.contact_email || '',
          contact_phone: l.contact_phone || '', contact_whatsapp: l.contact_whatsapp || '',
          contact_link: l.contact_link || '',
        });
        setPhotos(l.photos || []);
      })
      .catch(() => setError('Could not load this listing.'))
      .finally(() => setLoading(false));
  }, [editing, idOrSlug]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const onAddressSelect = (found) => setForm((f) => ({ ...f, ...found }));

  const subcats = (form.category && categories[form.category]?.subcategories) || [];

  const submit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) { setError('Title is required.'); return; }
    if (!form.category) { setError('Category is required.'); return; }
    if (!form.contact_email.trim() && !form.contact_phone.trim() && !form.contact_link.trim()) {
      setError('At least one of contact email, contact phone, or a contact link is required.');
      return;
    }
    if (!editing && !loggedIn && !guestEmail.trim() && !guestPhone.trim()) {
      setError('Add an email or phone so we can send you a link to manage this listing.');
      return;
    }
    setSaving(true);
    const numOrNull = (v) => (v === '' || v === null ? null : Number(v));
    const body = {
      title: form.title, description: form.description,
      category: form.category, subcategory: form.subcategory || null,
      condition: form.condition || null,
      is_free: form.is_free,
      price: form.is_free ? null : numOrNull(form.price),
      currency: form.currency,
      ships: form.ships,
      address: form.address, city: form.city, state: form.state, country: form.country,
      lat: numOrNull(form.lat), lng: numOrNull(form.lng),
      contact_name: form.contact_name,
      contact_email: form.contact_email,
      // Normalized to international (+<country>) format the same way
      // Estates' ListingForm does, so WhatsApp/call links always resolve.
      contact_phone: normalizePhone(form.contact_phone, form.country),
      contact_whatsapp: normalizePhone(form.contact_whatsapp, form.country),
      contact_link: form.contact_link,
      photos: photos.map((p) => p.filename),
    };
    if (!editing && !loggedIn) {
      body.guest_email = guestEmail.trim() || null;
      body.guest_phone = guestPhone.trim() || null;
    }
    const req = editing
      ? apiRequest('PATCH', body, `/marketplace/listings/${listingId}`)
      : apiRequest('POST', body, loggedIn ? '/marketplace/listings' : '/marketplace/listings/guest');
    req
      .then((l) => {
        if (!editing && !loggedIn) {
          setGuestResult(l);
        } else {
          navigate(`/marketplace/${l.slug}`);
        }
      })
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not save this listing.'))
      .finally(() => setSaving(false));
  };

  if (loading) return <div className="feed-section"><div className="gs-container" style={{ maxWidth: 680 }}><p style={{ color: 'var(--muted)' }}>Loading…</p></div></div>;

  if (guestResult) {
    return (
      <div className="feed-section">
        <div className="gs-container" style={{ maxWidth: 680 }}>
          <div className="est-masthead">
            <div className="est-masthead-kicker"><ShoppingBag size={13} /> Marketplace</div>
            <h1 className="est-masthead-title">Listing submitted</h1>
          </div>
          <GuestSubmitSuccess
            manageUrl={`${window.location.origin}/guest/marketplace/${guestResult.guest_manage_token}`}
            guestEmail={guestEmail.trim()}
          />
          <Link to="/marketplace" className="gs-btn gs-btn-outline" style={{ marginTop: 16 }}>← Back to Marketplace</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 680 }}>
        <Link to="/marketplace" className="est-back-link">← Marketplace</Link>
        <div className="est-masthead">
          <div className="est-masthead-kicker"><ShoppingBag size={13} /> {editing ? 'Edit listing' : 'Post an item'}</div>
          <h1 className="est-masthead-title">{editing ? `Edit ${form.title}` : 'Post an item'}</h1>
          <p className="est-masthead-sub">Buy, sell, trade or give away -- listings show on the public marketplace until marked sold/traded or they expire.</p>
        </div>

        <form onSubmit={submit}>
          {error && <p className="est-error">{error}</p>}

          <div className="est-form-section">
            <h3>Details</h3>
            <label className="est-field-label">Title *</label>
            <input className="gs-input" value={form.title} onChange={set('title')} required style={{ marginBottom: 12 }} />
            <label className="est-field-label">Description</label>
            <textarea className="gs-input" style={{ minHeight: 100, marginBottom: 12 }} value={form.description} onChange={set('description')} />

            <div className="est-form-grid">
              <div>
                <label className="est-field-label">Category *</label>
                <select className="gs-input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value, subcategory: '' }))} required>
                  <option value="">Select a category…</option>
                  {Object.entries(categories).map(([key, c]) => <option key={key} value={key}>{c.label}</option>)}
                </select>
              </div>
              {subcats.length > 0 && (
                <div>
                  <label className="est-field-label">Subcategory</label>
                  <select className="gs-input" value={form.subcategory} onChange={set('subcategory')}>
                    <option value="">—</option>
                    {subcats.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="est-field-label">Condition</label>
                <select className="gs-input" value={form.condition} onChange={set('condition')}>
                  <option value="">Not specified</option>
                  {CONDITION_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <label className="est-radio-option">
                <input type="checkbox" checked={form.is_free} onChange={(e) => setForm((f) => ({ ...f, is_free: e.target.checked }))} />
                This item is free
              </label>
            </div>

            {form.is_free ? (
              <p className="mp-free-badge" style={{ marginTop: 10 }}>Free</p>
            ) : (
              <div className="est-form-grid" style={{ marginTop: 12 }}>
                <div>
                  <label className="est-field-label">Price</label>
                  <input className="gs-input" type="number" step="any" value={form.price} onChange={set('price')} />
                </div>
                <div>
                  <label className="est-field-label">Currency</label>
                  <select className="gs-input" value={form.currency} onChange={set('currency')}>
                    <option value="USD">USD ($)</option>
                    <option value="ILS">ILS (₪)</option>
                  </select>
                </div>
              </div>
            )}

            <div style={{ marginTop: 12 }}>
              <label className="est-radio-option">
                <input type="checkbox" checked={form.ships} onChange={(e) => setForm((f) => ({ ...f, ships: e.target.checked }))} />
                I can ship this
              </label>
            </div>
          </div>

          {(editing || loggedIn) && (
            <div className="est-form-section">
              <h3>Photos (up to 6)</h3>
              <EstatesPhotoUpload photos={photos} onChange={setPhotos} uploadUrl="/marketplace/upload" max={6} />
            </div>
          )}

          <div className="est-form-section">
            <h3>Location</h3>
            <label className="est-field-label">Quick address search</label>
            <AddressAutocomplete
              initialQuery={[form.address, form.city].filter(Boolean).join(', ')}
              onSelect={onAddressSelect}
            />
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: '8px 0 12px' }}>Or fill these in by hand:</p>
            <div className="est-form-grid">
              <div><label className="est-field-label">Address</label><input className="gs-input" value={form.address} onChange={set('address')} /></div>
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
            <h3>Contact *</h3>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 12px' }}>At least one of email, phone, or a contact link is required.</p>
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
                <input className="gs-input" type="tel" placeholder="+1 555 123 4567" value={form.contact_whatsapp} onChange={set('contact_whatsapp')} />
                {form.contact_whatsapp.trim() && !isValidPhone(form.contact_whatsapp, form.country) && (
                  <p style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 0' }}>
                    Doesn't look like a complete number -- include an area/country code if "Country" above doesn't cover it.
                  </p>
                )}
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <label className="est-field-label">Contact link (optional)</label>
              <input
                className="gs-input"
                type="url"
                placeholder="https://example.com/this-listing"
                value={form.contact_link}
                onChange={set('contact_link')}
              />
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 0' }}>
                For a listing sourced from another site that wants to be contacted through its own page or form
                instead of directly -- shown as a button on the listing alongside (or instead of) email/phone.
              </p>
            </div>
          </div>

          {!editing && !loggedIn && (
            <div className="est-form-section">
              <GuestContactFields
                email={guestEmail}
                phone={guestPhone}
                onEmailChange={setGuestEmail}
                onPhoneChange={setGuestPhone}
              />
            </div>
          )}

          <button type="submit" className="gs-btn gs-btn-primary" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Publish listing'}
          </button>
        </form>
      </div>
    </div>
  );
}
