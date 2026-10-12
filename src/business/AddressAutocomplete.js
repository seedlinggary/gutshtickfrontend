import React, { useEffect, useRef, useState } from 'react';

// Photon (https://photon.komoot.io) -- a free, keyless, worldwide geocoder
// built on OpenStreetMap data. No API key/billing setup needed, unlike
// Google Places -- same reasoning as picking MapLibre/OpenFreeMap over
// Google Maps for BusinessMap.js. Public instance, so keep queries light
// (debounced) and don't hammer it.
const PHOTON_URL = 'https://photon.komoot.io/api/';
const DEBOUNCE_MS = 400;
const MIN_QUERY_LEN = 3;

function formatSuggestion(feature) {
  const p = feature.properties;
  const line1 = [p.housenumber, p.street].filter(Boolean).join(' ') || p.name;
  const line2 = [p.city || p.district, p.state, p.postcode, p.country].filter(Boolean).join(', ');
  return { label: [line1, line2].filter(Boolean).join(', '), properties: p, coordinates: feature.geometry?.coordinates };
}

function suggestionToLocation(s) {
  const p = s.properties;
  const streetLine = [p.housenumber, p.street].filter(Boolean).join(' ');
  const [lng, lat] = s.coordinates || [];
  return {
    address: streetLine || p.name || '',
    city: p.city || p.district || p.town || p.village || '',
    state: p.state || '',
    zip_code: p.postcode || '',
    country: p.country || '',
    lat: lat != null ? lat : '',
    lng: lng != null ? lng : '',
  };
}

/** Type-ahead address search -- pick a suggestion to auto-fill address/city/
 * state/zip/country + lat/lng (see suggestionToLocation). Works worldwide. */
export default function AddressAutocomplete({ initialQuery = '', onSelect }) {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const boxRef = useRef(null);

  useEffect(() => {
    if (query.trim().length < MIN_QUERY_LEN) { setSuggestions([]); return; }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`${PHOTON_URL}?q=${encodeURIComponent(query.trim())}&limit=5&lang=en`)
        .then((res) => res.json())
        .then((data) => {
          if (cancelled) return;
          setSuggestions((data.features || []).map(formatSuggestion));
          setOpen(true);
          setHighlighted(-1);
        })
        .catch(() => { if (!cancelled) setSuggestions([]); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, DEBOUNCE_MS);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query]);

  useEffect(() => {
    function onOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  const pick = (s) => {
    setQuery(s.label);
    setOpen(false);
    setHighlighted(-1);
    onSelect(suggestionToLocation(s));
  };

  const onKeyDown = (e) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => (h + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => (h <= 0 ? suggestions.length - 1 : h - 1));
    } else if (e.key === 'Enter') {
      if (highlighted >= 0) { e.preventDefault(); pick(suggestions[highlighted]); }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setHighlighted(-1);
    }
  };

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      <input
        className="gs-input"
        placeholder="Start typing an address — anywhere in the world…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open && suggestions.length > 0}
        aria-autocomplete="list"
      />
      {loading && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Searching…</div>}
      {open && suggestions.length > 0 && (
        <ul role="listbox" style={{
          position: 'absolute', zIndex: 20, left: 0, right: 0, top: '100%', marginTop: 2,
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
          boxShadow: 'var(--shadow-sm)', listStyle: 'none', padding: 4, maxHeight: 260, overflowY: 'auto',
        }}>
          {suggestions.map((s, i) => (
            <li key={i} role="option" aria-selected={i === highlighted}>
              <button
                type="button"
                onClick={() => pick(s)}
                onMouseEnter={() => setHighlighted(i)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px',
                  background: i === highlighted ? 'var(--surface-alt, #f2ece3)' : 'none',
                  border: 'none', cursor: 'pointer', fontSize: 13, borderRadius: 6,
                }}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
        Address search by Photon / OpenStreetMap contributors
      </div>
    </div>
  );
}
