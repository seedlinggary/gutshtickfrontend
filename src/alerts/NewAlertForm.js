import React, { useEffect, useState } from 'react';
import apiRequest from '../ApiRequest';

const ESTATES_TYPES = [
  { value: '', label: 'Any type' },
  { value: 'sale', label: 'For Sale' },
  { value: 'long_term_lease', label: 'Long-Term Rent' },
  { value: 'short_term_lease', label: 'Short-Term Rent' },
];
const TACHLIS_TYPES = [
  { value: '', label: 'Jobs & Resumes' },
  { value: 'job', label: 'Jobs only' },
  { value: 'resume', label: 'Resumes only' },
];

function defaultLabel(searchType, f) {
  if (searchType === 'estates') {
    const type = ESTATES_TYPES.find((t) => t.value === f.listing_type)?.label;
    const where = f.neighborhood || f.city;
    if (type && f.listing_type && where) return `${type} in ${where}`;
    if (type && f.listing_type) return type;
    if (where) return `Homes in ${where}`;
    return 'Gut Estates search';
  }
  const type = TACHLIS_TYPES.find((t) => t.value === f.type)?.label;
  const where = f.location || f.category;
  if (type && f.type && where) return `${type} in ${where}`;
  if (type && f.type) return type;
  if (where) return `Job Board in ${where}`;
  return 'Job Board search';
}

/** Builds the exact querystring GetAlertsButton would, from a plain filters
 * object -- same encoding, so a self-made alert matches the backend's
 * shared _apply_*_filters() identically to one made from a live search
 * page (see backend/alerts/routes/alert.py's _matches_for_alert). */
function toQueryString(filters) {
  return Object.entries(filters)
    .filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== false)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

/** "Set up any alert you want" -- lets a signed-in member build a brand new
 * alert from scratch in My Alerts, instead of only ever starting one from
 * a live Estates/Job Board search page (see GetAlertsButton.js, the other
 * way an Alert row gets created). Posts straight to the same POST /alerts
 * endpoint with a hand-built filters querystring, so the backend treats it
 * identically either way -- no new API needed. */
export default function NewAlertForm({ onCreated, onCancel }) {
  const [searchType, setSearchType] = useState('estates');
  const [label, setLabel] = useState('');
  const [labelTouched, setLabelTouched] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | saving | error
  const [error, setError] = useState('');

  // Estates fields
  const [listingType, setListingType] = useState('');
  const [city, setCity] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minBedrooms, setMinBedrooms] = useState('');

  // Tachlis fields
  const [postType, setPostType] = useState('');
  const [location, setLocation] = useState('');
  const [locations, setLocations] = useState([]);
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [hasPay, setHasPay] = useState(false);

  useEffect(() => {
    apiRequest('GET', null, '/estates/neighborhoods').then((res) => setNeighborhoods(res.neighborhoods || [])).catch(() => {});
    apiRequest('GET', null, '/tachlis/locations').then((res) => setLocations(res.locations || [])).catch(() => {});
    // Fixed taxonomy, not free text -- matching Tachlis.js's own category
    // dropdown exactly, since the backend's category filter is an exact
    // (case-insensitive) match, not a substring search. See
    // backend/tachlis/routes/tachlis_post.py's _apply_post_filters().
    apiRequest('GET', null, '/tachlis/categories').then((res) => setCategories(res.categories || [])).catch(() => {});
  }, []);

  const estatesFilters = { listing_type: listingType, city: city.trim(), neighborhood, min_price: minPrice, max_price: maxPrice, min_bedrooms: minBedrooms };
  const tachlisFilters = { type: postType, location, category: category.trim(), remote: remoteOnly ? '1' : '', has_pay: hasPay ? '1' : '' };
  const filters = searchType === 'estates' ? estatesFilters : tachlisFilters;
  const suggested = defaultLabel(searchType, filters);
  const effectiveLabel = labelTouched ? label : suggested;

  const submit = async (e) => {
    e.preventDefault();
    const qs = toQueryString(filters);
    if (!qs) {
      setStatus('error');
      setError('Pick at least one filter (type, location, price, etc.) so this alert has something to match against.');
      return;
    }
    setStatus('saving');
    setError('');
    try {
      await apiRequest('POST', {
        search_type: searchType,
        filters: qs,
        label: effectiveLabel,
      }, '/alerts');
      onCreated();
    } catch (err) {
      setStatus('error');
      setError(typeof err === 'string' ? err : 'Could not save this alert.');
    }
  };

  return (
    <form onSubmit={submit} className="gs-card" style={{ padding: 16, marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <strong>🔔 New alert</strong>

      <div style={{ display: 'flex', gap: 16 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="radio" name="searchType" checked={searchType === 'estates'} onChange={() => setSearchType('estates')} /> Gut Estates
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="radio" name="searchType" checked={searchType === 'tachlis'} onChange={() => setSearchType('tachlis')} /> Job Board
        </label>
      </div>

      {searchType === 'estates' ? (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <label style={{ flex: '1 1 160px' }}>
            Type
            <select className="auth-input" style={{ width: '100%', marginTop: 4 }} value={listingType} onChange={(e) => setListingType(e.target.value)}>
              {ESTATES_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <label style={{ flex: '1 1 160px' }}>
            Neighborhood
            <select className="auth-input" style={{ width: '100%', marginTop: 4 }} value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)}>
              <option value="">Any neighborhood</option>
              {neighborhoods.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label style={{ flex: '1 1 160px' }}>
            City
            <input className="auth-input" style={{ width: '100%', marginTop: 4 }} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Any city" />
          </label>
          <label style={{ flex: '1 1 110px' }}>
            Min price
            <input type="number" className="auth-input" style={{ width: '100%', marginTop: 4 }} value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
          </label>
          <label style={{ flex: '1 1 110px' }}>
            Max price
            <input type="number" className="auth-input" style={{ width: '100%', marginTop: 4 }} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
          </label>
          <label style={{ flex: '1 1 110px' }}>
            Min bedrooms
            <input type="number" className="auth-input" style={{ width: '100%', marginTop: 4 }} value={minBedrooms} onChange={(e) => setMinBedrooms(e.target.value)} />
          </label>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <label style={{ flex: '1 1 160px' }}>
            Type
            <select className="auth-input" style={{ width: '100%', marginTop: 4 }} value={postType} onChange={(e) => setPostType(e.target.value)}>
              {TACHLIS_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <label style={{ flex: '1 1 160px' }}>
            Location
            <select className="auth-input" style={{ width: '100%', marginTop: 4 }} value={location} onChange={(e) => setLocation(e.target.value)}>
              <option value="">Any location</option>
              {locations.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
          <label style={{ flex: '1 1 160px' }}>
            Category
            <select className="auth-input" style={{ width: '100%', marginTop: 4 }} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Any category</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={remoteOnly} onChange={(e) => setRemoteOnly(e.target.checked)} /> Remote only
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={hasPay} onChange={(e) => setHasPay(e.target.checked)} /> Must list pay
          </label>
        </div>
      )}

      <label>
        Name this alert
        <input
          className="auth-input" style={{ width: '100%', marginTop: 4 }}
          value={effectiveLabel}
          onChange={(e) => { setLabel(e.target.value); setLabelTouched(true); }}
          maxLength={300}
        />
      </label>

      {status === 'error' && <div className="gs-error-box" style={{ fontSize: 13 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="gs-btn gs-btn-primary gs-btn-sm" disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving…' : 'Create alert'}
        </button>
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
