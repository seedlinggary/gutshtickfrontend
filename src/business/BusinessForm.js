import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import UploadFile from '../Uploadfile';
import HoursEditor from './HoursEditor';
import AddressAutocomplete from './AddressAutocomplete';
import { CATEGORY_LABELS, FOOD_CATEGORIES, LOCATION_TYPE_META } from './categories';

const NAME_MAX = 150;
const ABOUT_MAX = 4000;

function blankLocation() {
  return {
    tempId: Math.random().toString(36).slice(2),
    location_type: 'physical',
    address: '', city: '', state: '', zip_code: '', country: '',
    lat: '', lng: '', phone: '', email: '', kashrut: '', hours: {}, is_primary: false,
  };
}

function locationToPayload(loc) {
  return {
    location_type: loc.location_type,
    address: loc.address, city: loc.city, state: loc.state, zip_code: loc.zip_code, country: loc.country,
    lat: loc.lat === '' ? null : loc.lat, lng: loc.lng === '' ? null : loc.lng,
    phone: loc.phone, email: loc.email, kashrut: loc.kashrut, hours: loc.hours, is_primary: !!loc.is_primary,
  };
}

function composedAddress(loc) {
  return [loc.address, loc.city, loc.state, loc.country].filter(Boolean).join(', ');
}

function LocationEditor({ loc, index, isFood, onChange, onRemove }) {
  const set = (patch) => onChange(index, { ...loc, ...patch });
  const type = loc.location_type || 'physical';

  return (
    <div className="gs-card" style={{ marginBottom: 12 }}>
      <div className="gs-card-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>Location {index + 1}</strong>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <label style={{ fontSize: 12, display: 'flex', gap: 4, alignItems: 'center' }}>
              <input type="radio" name="primary-loc" checked={!!loc.is_primary} onChange={() => onChange('setPrimary', index)} />
              Main location
            </label>
            <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => onRemove(index)}>Remove</button>
          </div>
        </div>

        <div className="content-type-tabs" style={{ margin: '8px 0 12px' }}>
          {Object.entries(LOCATION_TYPE_META).map(([key, meta]) => (
            <button
              key={key}
              type="button"
              className={`content-type-tab${type === key ? ' active' : ''}`}
              onClick={() => set({ location_type: key })}
            >
              {meta.icon} {meta.label}
            </button>
          ))}
        </div>

        {type === 'physical' && (
          <div className="gs-field">
            <div className="gs-label">Address</div>
            <AddressAutocomplete
              initialQuery={composedAddress(loc)}
              onSelect={(found) => set(found)}
            />
            {loc.city && (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                Using: {composedAddress(loc)} {loc.lat && loc.lng ? '(located on map ✓)' : ''}
              </div>
            )}
          </div>
        )}

        {type === 'delivery' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="gs-input" placeholder="City you deliver to / serve" value={loc.city} onChange={(e) => set({ city: e.target.value })} />
            <input className="gs-input" placeholder="Country" value={loc.country} onChange={(e) => set({ country: e.target.value })} />
          </div>
        )}

        {type === 'online' && (
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0 0' }}>
            No address needed — this listing will show as an online-only business, findable from anywhere.
          </p>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input className="gs-input" placeholder="Phone" value={loc.phone} onChange={(e) => set({ phone: e.target.value })} />
          <input className="gs-input" placeholder="Email" value={loc.email} onChange={(e) => set({ email: e.target.value })} />
        </div>
        {isFood && (
          <div className="gs-field" style={{ marginTop: 8 }}>
            <input className="gs-input" placeholder="Kashrut / hashgacha (e.g. OU, Star-K)" value={loc.kashrut} onChange={(e) => set({ kashrut: e.target.value })} />
          </div>
        )}
        <div style={{ marginTop: 10 }}>
          <div className="gs-label">Hours</div>
          <HoursEditor hours={loc.hours} onChange={(hours) => set({ hours })} />
        </div>
      </div>
    </div>
  );
}

export default function BusinessForm() {
  const { idOrSlug } = useParams();
  const editing = !!idOrSlug;
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('other');
  const [about, setAbout] = useState('');
  const [website, setWebsite] = useState('');
  const [logo, setLogo] = useState(null);
  const [businessId, setBusinessId] = useState(null);
  const [locations, setLocations] = useState([blankLocation()]);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!editing) return;
    apiRequest('GET', null, `/business/businesses/${idOrSlug}`)
      .then((b) => {
        setBusinessId(b.id);
        setName(b.name);
        setCategory(b.category);
        setAbout(b.about || '');
        setWebsite(b.website || '');
        setLogo(null);
        setLocations((b.locations || []).map((l) => ({ ...l, tempId: `existing-${l.id}` })));
      })
      .catch(() => setError('Could not load this business.'))
      .finally(() => setLoading(false));
  }, [editing, idOrSlug]);

  const isFood = FOOD_CATEGORIES.has(category);

  const updateLocation = (indexOrAction, valueOrIndex) => {
    if (indexOrAction === 'setPrimary') {
      const primaryIndex = valueOrIndex;
      setLocations((prev) => prev.map((l, i) => ({ ...l, is_primary: i === primaryIndex })));
      return;
    }
    setLocations((prev) => prev.map((l, i) => (i === indexOrAction ? valueOrIndex : l)));
  };

  const removeLocation = async (index) => {
    const loc = locations[index];
    if (editing && loc.id) {
      try { await apiRequest('DELETE', null, `/business/locations/${loc.id}`); } catch (_) { /* best-effort */ }
    }
    setLocations((prev) => prev.filter((_, i) => i !== index));
  };

  const addLocation = () => setLocations((prev) => [...prev, blankLocation()]);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required.'); return; }
    if (name.length > NAME_MAX) { setError(`Name must be ${NAME_MAX} characters or fewer.`); return; }
    if (about.length > ABOUT_MAX) { setError(`About must be ${ABOUT_MAX} characters or fewer.`); return; }
    setError('');
    setSaving(true);

    try {
      if (!editing) {
        const created = await apiRequest('POST', {
          name: name.trim(), category, about: about.trim(), logo, website: website.trim(),
          locations: locations.map(locationToPayload),
        }, '/business/businesses');
        navigate(`/business/${created.slug}`);
        return;
      }

      await apiRequest('PATCH', { name: name.trim(), category, about: about.trim(), logo, website: website.trim() }, `/business/businesses/${businessId}`);
      for (const loc of locations) {
        const payload = locationToPayload(loc);
        if (loc.id) {
          await apiRequest('PATCH', payload, `/business/locations/${loc.id}`);
        } else {
          await apiRequest('POST', payload, `/business/businesses/${businessId}/locations`);
        }
      }
      navigate(`/business/${idOrSlug}`);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Could not save. Please check your entries and try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="feed-section"><div className="gs-container"><div className="gs-loading"><div className="gs-spinner" /> Loading…</div></div></div>;

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 680 }}>
        <h1>{editing ? 'Edit Business' : 'List Your Business'}</h1>
        {error && <div className="gs-error-box">{error}</div>}
        <form onSubmit={submit}>
          <div className="gs-field">
            <input className="gs-input" placeholder="Business name" value={name} maxLength={NAME_MAX} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="gs-field">
            <select className="gs-input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </div>
          <div className="gs-field">
            <textarea className="gs-input gs-textarea" placeholder="About this business…" rows={4} value={about} maxLength={ABOUT_MAX} onChange={(e) => setAbout(e.target.value)} />
          </div>
          <div className="gs-field">
            <input className="gs-input" type="url" placeholder="Website (optional) — https://…" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
          <div className="gs-field">
            <div className="gs-label">Logo</div>
            <UploadFile setInvestors={(name_) => setLogo(name_)} apiextension="/business/upload" />
          </div>

          <h3>Locations</h3>
          {locations.map((loc, i) => (
            <LocationEditor key={loc.tempId} loc={loc} index={i} isFood={isFood} onChange={updateLocation} onRemove={removeLocation} />
          ))}
          <button type="button" className="gs-btn gs-btn-outline" onClick={addLocation} style={{ marginBottom: 16 }}>+ Add another location</button>

          <div>
            <button type="submit" className="gs-btn gs-btn-primary" disabled={saving}>
              {saving ? 'Saving…' : (editing ? 'Save changes' : 'List this business')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
