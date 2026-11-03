import React, { useEffect, useState } from 'react';
import { Bell, Pencil } from 'lucide-react';
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

/** The inverse of toQueryString -- rebuilds a plain {key: value} object from
 * an alert's stored filters string, so editing an existing alert can
 * pre-fill this same form's fields from it. */
function fromQueryString(qs) {
  const out = {};
  new URLSearchParams(qs || '').forEach((v, k) => { out[k] = v; });
  return out;
}

/** "Set up any alert you want" -- lets a signed-in member build a brand new
 * alert from scratch in My Alerts, instead of only ever starting one from a
 * live Estates/Job Board search page (see GetAlertsButton.js, the other way
 * an Alert row gets created) -- and also edit an existing one in place, when
 * passed `alert`. Posts to POST /alerts to create, or PATCH /alerts/<id> to
 * edit; either way the backend treats the filters identically to a live
 * search's own, since both are the exact same querystring. */
export default function NewAlertForm({ alert, onSaved, onCancel }) {
  const editing = !!alert;
  const initialFilters = editing ? fromQueryString(alert.filters) : {};

  const [searchType, setSearchType] = useState(editing ? alert.search_type : 'estates');
  const [label, setLabel] = useState(editing ? (alert.label || '') : '');
  const [labelTouched, setLabelTouched] = useState(editing);
  const [status, setStatus] = useState('idle'); // idle | saving | error
  const [error, setError] = useState('');

  // Estates fields
  const [listingType, setListingType] = useState(initialFilters.listing_type || '');
  const [city, setCity] = useState(initialFilters.city || '');
  const [neighborhood, setNeighborhood] = useState(initialFilters.neighborhood || '');
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [minPrice, setMinPrice] = useState(initialFilters.min_price || '');
  const [maxPrice, setMaxPrice] = useState(initialFilters.max_price || '');
  const [minBedrooms, setMinBedrooms] = useState(initialFilters.min_bedrooms || '');

  // Tachlis fields
  const [postType, setPostType] = useState(initialFilters.type || '');
  const [location, setLocation] = useState(initialFilters.location || '');
  const [locations, setLocations] = useState([]);
  const [category, setCategory] = useState(initialFilters.category || '');
  const [categories, setCategories] = useState([]);
  const [remoteOnly, setRemoteOnly] = useState(initialFilters.remote === '1');
  const [hasPay, setHasPay] = useState(initialFilters.has_pay === '1');

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
      if (editing) {
        const updated = await apiRequest('PATCH', {
          search_type: searchType,
          filters: qs,
          label: effectiveLabel,
        }, `/alerts/${alert.id}`);
        onSaved(updated);
      } else {
        const created = await apiRequest('POST', {
          search_type: searchType,
          filters: qs,
          label: effectiveLabel,
        }, '/alerts');
        onSaved(created);
      }
    } catch (err) {
      setStatus('error');
      setError(typeof err === 'string' ? err : 'Could not save this alert.');
    }
  };

  return (
    <form onSubmit={submit} className="gs-card" style={{ padding: 18, marginBottom: 14 }}>
      <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
        {editing ? <><Pencil size={14} /> Edit alert</> : <><Bell size={14} /> New alert</>}
      </strong>

      <div className="gs-field">
        <label className="gs-label">Where to search</label>
        <div className="gs-chip-row">
          <button type="button" className={`gs-chip${searchType === 'estates' ? ' active' : ''}`} onClick={() => setSearchType('estates')}>
            Gut Estates
          </button>
          <button type="button" className={`gs-chip${searchType === 'tachlis' ? ' active' : ''}`} onClick={() => setSearchType('tachlis')}>
            Job Board
          </button>
        </div>
      </div>

      {searchType === 'estates' ? (
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <div className="gs-field" style={{ flex: '1 1 160px' }}>
            <label className="gs-label">Type</label>
            <select className="gs-select" value={listingType} onChange={(e) => setListingType(e.target.value)}>
              {ESTATES_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="gs-field" style={{ flex: '1 1 160px' }}>
            <label className="gs-label">Neighborhood</label>
            <select className="gs-select" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)}>
              <option value="">Any neighborhood</option>
              {neighborhoods.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="gs-field" style={{ flex: '1 1 160px' }}>
            <label className="gs-label">City</label>
            <input className="gs-input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Any city" />
          </div>
          <div className="gs-field" style={{ flex: '1 1 110px' }}>
            <label className="gs-label">Min price</label>
            <input type="number" className="gs-input" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
          </div>
          <div className="gs-field" style={{ flex: '1 1 110px' }}>
            <label className="gs-label">Max price</label>
            <input type="number" className="gs-input" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
          </div>
          <div className="gs-field" style={{ flex: '1 1 110px' }}>
            <label className="gs-label">Min bedrooms</label>
            <input type="number" className="gs-input" value={minBedrooms} onChange={(e) => setMinBedrooms(e.target.value)} />
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div className="gs-field" style={{ flex: '1 1 160px' }}>
            <label className="gs-label">Type</label>
            <select className="gs-select" value={postType} onChange={(e) => setPostType(e.target.value)}>
              {TACHLIS_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="gs-field" style={{ flex: '1 1 160px' }}>
            <label className="gs-label">Location</label>
            <select className="gs-select" value={location} onChange={(e) => setLocation(e.target.value)}>
              <option value="">Any location</option>
              {locations.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="gs-field" style={{ flex: '1 1 160px' }}>
            <label className="gs-label">Category</label>
            <select className="gs-select" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Any category</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="gs-field" style={{ display: 'flex', gap: 16, alignItems: 'center', paddingTop: 28 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5 }}>
              <input type="checkbox" checked={remoteOnly} onChange={(e) => setRemoteOnly(e.target.checked)} /> Remote only
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5 }}>
              <input type="checkbox" checked={hasPay} onChange={(e) => setHasPay(e.target.checked)} /> Must list pay
            </label>
          </div>
        </div>
      )}

      <div className="gs-field">
        <label className="gs-label">Name this alert</label>
        <input
          className="gs-input"
          value={effectiveLabel}
          onChange={(e) => { setLabel(e.target.value); setLabelTouched(true); }}
          maxLength={300}
        />
      </div>

      {status === 'error' && <div className="gs-error-box" style={{ fontSize: 13, marginBottom: 12 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="gs-btn gs-btn-primary gs-btn-sm" disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving…' : editing ? 'Save changes' : 'Create alert'}
        </button>
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
