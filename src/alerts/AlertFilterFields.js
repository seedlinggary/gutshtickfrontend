import React, { useEffect, useState } from 'react';
import apiRequest from '../ApiRequest';

/** Shared between NewAlertForm.js (My Alerts -- "build a new alert from
 * scratch") and GetAlertsButton.js (showFilters=true -- the catch-all
 * header buttons on Gut Estates/Gut Money, where visitors should be able to
 * narrow "new properties"/"new jobs" down to what they actually want,
 * not just take the unfiltered catch-all). One copy of the field list,
 * the neighborhood/location/category options, and the auto-suggested
 * label, so the two forms can never quietly drift apart. */

export const ESTATES_TYPES = [
  { value: '', label: 'Any type' },
  { value: 'sale', label: 'For Sale' },
  { value: 'long_term_lease', label: 'Long-Term Rent' },
  { value: 'short_term_lease', label: 'Short-Term Rent' },
];
export const TACHLIS_TYPES = [
  { value: '', label: 'Jobs & Resumes' },
  { value: 'job', label: 'Jobs only' },
  { value: 'resume', label: 'Resumes only' },
];

export function defaultLabel(searchType, f) {
  if (searchType === 'estates') {
    const type = ESTATES_TYPES.find((t) => t.value === f.listing_type)?.label;
    const where = f.neighborhood || f.city;
    if (type && f.listing_type && where) return `${type} in ${where}`;
    if (type && f.listing_type) return type;
    if (where) return `Homes in ${where}`;
    return 'new properties';
  }
  const type = TACHLIS_TYPES.find((t) => t.value === f.type)?.label;
  const where = f.location || f.category;
  if (type && f.type && where) return `${type} in ${where}`;
  if (type && f.type) return type;
  if (where) return `Job Board in ${where}`;
  return 'new jobs';
}

/** Fetches the same dropdown option lists NewAlertForm/live search already
 * use (neighborhoods for Estates, locations + categories for Tachlis) --
 * one shared fetch so GetAlertsButton's filter fields don't need their own
 * copy of this wiring. */
export function useAlertFilterOptions() {
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    apiRequest('GET', null, '/estates/neighborhoods').then((res) => setNeighborhoods(res.neighborhoods || [])).catch(() => {});
    apiRequest('GET', null, '/tachlis/locations').then((res) => setLocations(res.locations || [])).catch(() => {});
    apiRequest('GET', null, '/tachlis/categories').then((res) => setCategories(res.categories || [])).catch(() => {});
  }, []);

  return { neighborhoods, locations, categories };
}

/** Controlled editable filter fields for one searchType. `filters` / `onChange`
 * work like any other controlled form -- `onChange(nextFiltersObject)`. Field
 * names match the querystring keys _apply_listing_filters/_apply_post_filters
 * read server-side, so the object this builds can go straight into
 * GetAlertsButton's existing filtersQs encoding with no translation step. */
export default function AlertFilterFields({ searchType, filters, onChange }) {
  const { neighborhoods, locations, categories } = useAlertFilterOptions();
  const set = (key) => (e) => onChange({ ...filters, [key]: e.target.value });
  const setChecked = (key) => (e) => onChange({ ...filters, [key]: e.target.checked });

  if (searchType === 'estates') {
    return (
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div className="gs-field" style={{ flex: '1 1 130px' }}>
          <label className="gs-label">Type</label>
          <select className="gs-select" value={filters.listing_type || ''} onChange={set('listing_type')}>
            {ESTATES_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="gs-field" style={{ flex: '1 1 130px' }}>
          <label className="gs-label">Neighborhood</label>
          <select className="gs-select" value={filters.neighborhood || ''} onChange={set('neighborhood')}>
            <option value="">Any neighborhood</option>
            {neighborhoods.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="gs-field" style={{ flex: '1 1 110px' }}>
          <label className="gs-label">City</label>
          <input className="gs-input" value={filters.city || ''} onChange={set('city')} placeholder="Any city" />
        </div>
        <div className="gs-field" style={{ flex: '1 1 90px' }}>
          <label className="gs-label">Min price</label>
          <input type="number" className="gs-input" value={filters.min_price || ''} onChange={set('min_price')} />
        </div>
        <div className="gs-field" style={{ flex: '1 1 90px' }}>
          <label className="gs-label">Max price</label>
          <input type="number" className="gs-input" value={filters.max_price || ''} onChange={set('max_price')} />
        </div>
        <div className="gs-field" style={{ flex: '1 1 90px' }}>
          <label className="gs-label">Min bedrooms</label>
          <input type="number" className="gs-input" value={filters.min_bedrooms || ''} onChange={set('min_bedrooms')} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div className="gs-field" style={{ flex: '1 1 130px' }}>
        <label className="gs-label">Type</label>
        <select className="gs-select" value={filters.type || ''} onChange={set('type')}>
          {TACHLIS_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div className="gs-field" style={{ flex: '1 1 130px' }}>
        <label className="gs-label">Location</label>
        <select className="gs-select" value={filters.location || ''} onChange={set('location')}>
          <option value="">Any location</option>
          {locations.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>
      <div className="gs-field" style={{ flex: '1 1 130px' }}>
        <label className="gs-label">Category</label>
        <select className="gs-select" value={filters.category || ''} onChange={set('category')}>
          <option value="">Any category</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="gs-field" style={{ display: 'flex', gap: 14, alignItems: 'center', paddingTop: 22 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}>
          <input type="checkbox" checked={filters.remote === '1'} onChange={(e) => onChange({ ...filters, remote: e.target.checked ? '1' : '' })} /> Remote only
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}>
          <input type="checkbox" checked={filters.has_pay === '1'} onChange={(e) => onChange({ ...filters, has_pay: e.target.checked ? '1' : '' })} /> Must list pay
        </label>
      </div>
    </div>
  );
}
