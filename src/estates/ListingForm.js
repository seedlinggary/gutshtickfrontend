import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Home, ClipboardPaste } from 'lucide-react';
import apiRequest from '../ApiRequest';
import EstatesPhotoUpload from './EstatesPhotoUpload';
import { normalizePhone, isValidPhone } from '../shared/phone';
import { isLoggedIn } from '../auth';
import GuestContactFields from '../guest/GuestContactFields';
import GuestSubmitSuccess from '../guest/GuestSubmitSuccess';

const EMPTY = {
  listing_type: 'sale', title: '', description: '',
  price: '', currency: 'USD', price_period: '',
  address: '', neighborhood: '', city: '', state: '', zip_code: '', country: '',
  lat: '', lng: '',
  bedrooms: '', bathrooms: '', size_value: '', size_unit: 'sqft',
  is_agent: false,
  contact_name: '', contact_email: '', contact_phone: '', contact_whatsapp: '', contact_link: '',
};

const LEASE_PERIODS = ['night', 'week', 'month'];

export default function ListingForm() {
  const { idOrSlug } = useParams();
  const editing = !!idOrSlug;
  const navigate = useNavigate();
  const [listingId, setListingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [photos, setPhotos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(editing);

  const [pasteText, setPasteText] = useState('');
  const [pasteOpen, setPasteOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');

  const loggedIn = isLoggedIn();
  // Only the "new listing" path (not editing) is ever reachable while
  // logged out -- /listings/:idOrSlug/edit stays RequireAuth-gated.
  const guestMode = !editing && !loggedIn;
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestResult, setGuestResult] = useState(null);

  useEffect(() => {
    if (!editing) return;
    apiRequest('GET', null, `/estates/listings/${idOrSlug}`)
      .then((l) => {
        setListingId(l.id);
        setForm({
          listing_type: l.listing_type, title: l.title || '', description: l.description || '',
          price: l.price ?? '', currency: l.currency || 'USD', price_period: l.price_period || '',
          address: l.address || '', neighborhood: l.neighborhood || '', city: l.city || '', state: l.state || '', zip_code: l.zip_code || '', country: l.country || '',
          lat: l.lat ?? '', lng: l.lng ?? '',
          bedrooms: l.bedrooms ?? '', bathrooms: l.bathrooms ?? '', size_value: l.size_value ?? '', size_unit: l.size_unit || 'sqft',
          is_agent: l.is_agent === null || l.is_agent === undefined ? null : !!l.is_agent,
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

  const parseFromPaste = async () => {
    setParseError('');
    setParsing(true);
    try {
      const draft = await apiRequest('POST', { text: pasteText }, '/estates/listings/parse-draft');
      setForm((f) => ({
        ...f,
        listing_type: draft.listing_type || f.listing_type,
        title: draft.title || f.title,
        description: draft.description || f.description,
        price: draft.price ?? f.price,
        currency: draft.currency || f.currency,
        price_period: draft.price_period || f.price_period,
        bedrooms: draft.bedrooms ?? f.bedrooms,
        bathrooms: draft.bathrooms ?? f.bathrooms,
        city: draft.city || f.city,
        neighborhood: draft.neighborhood || f.neighborhood,
        is_agent: draft.is_agent === undefined ? f.is_agent : draft.is_agent,
        contact_name: draft.contact_name || f.contact_name,
        contact_phone: draft.contact_phone || f.contact_phone,
        contact_whatsapp: draft.contact_whatsapp || f.contact_whatsapp,
        contact_email: draft.contact_email || f.contact_email,
        contact_link: draft.contact_link || f.contact_link,
      }));
      setPasteOpen(false);
    } catch (e) {
      setParseError(typeof e === 'string' ? e : "Couldn't read that -- try pasting more detail, or fill in the form by hand.");
    } finally {
      setParsing(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) { setError('Title is required.'); return; }
    if (!form.contact_email.trim() && !form.contact_phone.trim() && !form.contact_link.trim()) {
      setError('At least one of contact email, contact phone, or a contact link is required.');
      return;
    }
    if (guestMode && !guestEmail.trim() && !guestPhone.trim()) {
      setError('Add an email or phone so we can send you a link to manage this listing.');
      return;
    }
    setSaving(true);
    const numOrNull = (v) => (v === '' || v === null ? null : Number(v));
    const body = {
      ...form,
      price: numOrNull(form.price),
      lat: numOrNull(form.lat),
      lng: numOrNull(form.lng),
      bedrooms: numOrNull(form.bedrooms),
      bathrooms: numOrNull(form.bathrooms),
      size_value: numOrNull(form.size_value),
      price_period: form.listing_type === 'sale' ? null : (form.price_period || null),
      // Normalized to international (+<country>) format when the country
      // field lets us resolve it, so every WhatsApp/call link this listing
      // produces opens straight away instead of silently failing on a
      // number saved without its own country code -- see shared/phone.js.
      contact_phone: normalizePhone(form.contact_phone, form.country),
      contact_whatsapp: normalizePhone(form.contact_whatsapp, form.country),
      photos: photos.map((p) => p.filename),
    };
    if (guestMode) {
      body.guest_email = guestEmail.trim() || null;
      body.guest_phone = guestPhone.trim() || null;
    }
    const req = editing
      ? apiRequest('PATCH', body, `/estates/listings/${listingId}`)
      : apiRequest('POST', body, guestMode ? '/estates/listings/guest' : '/estates/listings');
    req
      .then((l) => {
        if (guestMode) { setGuestResult(l); return; }
        navigate(`/listings/${l.slug}`);
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
            <div className="est-masthead-kicker"><Home size={13} /> List a property</div>
            <h1 className="est-masthead-title">Thanks for the listing</h1>
          </div>
          <GuestSubmitSuccess
            manageUrl={`${window.location.origin}/guest/estates/${guestResult.guest_manage_token}`}
            guestEmail={guestEmail.trim()}
          />
          <Link to="/" className="gs-btn gs-btn-outline" style={{ marginTop: 16 }}>← Buy &amp; Rent</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 680 }}>
        <Link to="/" className="est-back-link">← Buy &amp; Rent</Link>
        <div className="est-masthead">
          <div className="est-masthead-kicker"><Home size={13} /> {editing ? 'Edit listing' : 'List a property'}</div>
          <h1 className="est-masthead-title">{editing ? `Edit ${form.title}` : 'List a property'}</h1>
          <p className="est-masthead-sub">
            Sale and long-term rental listings show for 30 days by default, then quietly drop off the public feed
            (you can renew from the listing page) -- short-term rentals stay up since they're ongoing availability.
          </p>
        </div>

        {!editing && (
          <div className="est-form-section">
            {!pasteOpen ? (
              <button type="button" className="gs-btn gs-btn-outline" onClick={() => setPasteOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <ClipboardPaste size={15} /> Paste a WhatsApp post instead
              </button>
            ) : (
              <>
                <h3>Paste a WhatsApp post</h3>
                <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 8px' }}>
                  We'll read it and fill in the form below -- review everything before publishing.
                </p>
                <textarea
                  className="gs-input"
                  style={{ minHeight: 100, marginBottom: 8 }}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste the post text here…"
                />
                {parseError && <p className="est-error">{parseError}</p>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="gs-btn gs-btn-primary gs-btn-sm" onClick={parseFromPaste} disabled={parsing || !pasteText.trim()}>
                    {parsing ? 'Reading…' : 'Fill in from this'}
                  </button>
                  <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => { setPasteOpen(false); setParseError(''); }} disabled={parsing}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        <form onSubmit={submit}>
          {error && <p className="est-error">{error}</p>}

          <div className="est-form-section">
            <h3>Listing type</h3>
            <div className="est-radio-row">
              <label className="est-radio-option"><input type="radio" name="listing_type" checked={form.listing_type === 'sale'} onChange={() => setForm((f) => ({ ...f, listing_type: 'sale' }))} /> For sale</label>
              <label className="est-radio-option"><input type="radio" name="listing_type" checked={form.listing_type === 'long_term_lease'} onChange={() => setForm((f) => ({ ...f, listing_type: 'long_term_lease' }))} /> Long-term rental</label>
              <label className="est-radio-option"><input type="radio" name="listing_type" checked={form.listing_type === 'short_term_lease'} onChange={() => setForm((f) => ({ ...f, listing_type: 'short_term_lease' }))} /> Short-term rental</label>
            </div>

            <div style={{ marginTop: 14 }}>
              <span className="est-field-label">Are you a real estate agent or the owner? *</span>
              <div className="est-radio-row">
                <label className="est-radio-option"><input type="radio" name="is_agent" checked={form.is_agent === false} onChange={() => setForm((f) => ({ ...f, is_agent: false }))} /> I'm the owner</label>
                <label className="est-radio-option"><input type="radio" name="is_agent" checked={form.is_agent === true} onChange={() => setForm((f) => ({ ...f, is_agent: true }))} /> I'm a real estate agent</label>
                <label className="est-radio-option"><input type="radio" name="is_agent" checked={form.is_agent === null} onChange={() => setForm((f) => ({ ...f, is_agent: null }))} /> Not sure / prefer not to say</label>
              </div>
            </div>
          </div>

          <div className="est-form-section">
            <h3>Details</h3>
            <label className="est-field-label">Title *</label>
            <input className="gs-input" value={form.title} onChange={set('title')} required style={{ marginBottom: 12 }} />
            <label className="est-field-label">Description</label>
            <textarea className="gs-input" style={{ minHeight: 100, marginBottom: 12 }} value={form.description} onChange={set('description')} />

            <div className="est-form-grid">
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
              {form.listing_type !== 'sale' && (
                <div>
                  <label className="est-field-label">Per</label>
                  <select className="gs-input" value={form.price_period} onChange={set('price_period')}>
                    <option value="">—</option>
                    {LEASE_PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="est-form-grid" style={{ marginTop: 12 }}>
              <div><label className="est-field-label">Bedrooms</label><input className="gs-input" type="number" step="any" value={form.bedrooms} onChange={set('bedrooms')} /></div>
              <div><label className="est-field-label">Bathrooms</label><input className="gs-input" type="number" step="any" value={form.bathrooms} onChange={set('bathrooms')} /></div>
              <div><label className="est-field-label">Size</label><input className="gs-input" type="number" step="any" value={form.size_value} onChange={set('size_value')} /></div>
              <div>
                <label className="est-field-label">Unit</label>
                <select className="gs-input" value={form.size_unit} onChange={set('size_unit')}>
                  <option value="sqft">sq ft</option>
                  <option value="sqm">m²</option>
                </select>
              </div>
            </div>
          </div>

          <div className="est-form-section">
            <h3>Location</h3>
            <label className="est-field-label">Address</label>
            <input className="gs-input" value={form.address} onChange={set('address')} style={{ marginBottom: 12 }} />
            <div className="est-form-grid">
              <div><label className="est-field-label">Neighborhood (optional)</label><input className="gs-input" placeholder="e.g. Givat Hamivtar" value={form.neighborhood} onChange={set('neighborhood')} /></div>
              <div><label className="est-field-label">City</label><input className="gs-input" value={form.city} onChange={set('city')} /></div>
              <div><label className="est-field-label">State / region</label><input className="gs-input" value={form.state} onChange={set('state')} /></div>
              <div><label className="est-field-label">ZIP / postal code</label><input className="gs-input" value={form.zip_code} onChange={set('zip_code')} /></div>
              <div><label className="est-field-label">Country</label><input className="gs-input" value={form.country} onChange={set('country')} /></div>
            </div>
            <div className="est-form-grid" style={{ marginTop: 12 }}>
              <div><label className="est-field-label">Latitude (optional)</label><input className="gs-input" type="number" step="any" value={form.lat} onChange={set('lat')} /></div>
              <div><label className="est-field-label">Longitude (optional)</label><input className="gs-input" type="number" step="any" value={form.lng} onChange={set('lng')} /></div>
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: '8px 0 0' }}>
              Without coordinates, this listing won't show up on the map.
            </p>
          </div>

          {!guestMode && (
            <div className="est-form-section">
              <h3>Photos (up to 5)</h3>
              <EstatesPhotoUpload photos={photos} onChange={setPhotos} />
            </div>
          )}

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

          {guestMode && (
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
