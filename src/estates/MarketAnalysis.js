import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart3, BadgeCheck, X } from 'lucide-react';
import apiRequest from '../ApiRequest';
import ListingCard from './ListingCard';

const TYPE_TABS = [
  { key: '', label: 'All' },
  { key: 'sale', label: 'For Sale' },
  { key: 'long_term_lease', label: 'Long-Term Rent' },
  { key: 'short_term_lease', label: 'Short-Term Rent' },
];
const TYPE_LABEL = { sale: 'For Sale', long_term_lease: 'Long-Term Rent', short_term_lease: 'Short-Term Rent' };
const CUR_SYMBOL = { USD: '$', ILS: '₪' };

function fmtMoney(n, currency) {
  if (n == null) return '—';
  return `${CUR_SYMBOL[currency] || ''}${Math.round(n).toLocaleString()}`;
}

// Every range filter below as [stateKey, setterKey, queryParam, label, step].
// Driving both the filter panel and the querystring builder off one list
// keeps the two from drifting apart as fields get added.
const RANGE_FIELDS = [
  ['minPrice', 'setMinPrice', 'maxPrice', 'setMaxPrice', 'min_price', 'max_price', 'Price', 1],
  ['minBedrooms', 'setMinBedrooms', 'maxBedrooms', 'setMaxBedrooms', 'min_bedrooms', 'max_bedrooms', 'Bedrooms', 1],
  ['minBathrooms', 'setMinBathrooms', 'maxBathrooms', 'setMaxBathrooms', 'min_bathrooms', 'max_bathrooms', 'Bathrooms', 1],
  ['minSize', 'setMinSize', 'maxSize', 'setMaxSize', 'min_size_sqm', 'max_size_sqm', 'Size (sqm)', 1],
  ['minPpsqm', 'setMinPpsqm', 'maxPpsqm', 'setMaxPpsqm', 'min_price_per_sqm', 'max_price_per_sqm', 'Price / sqm', 1],
  ['minPpbr', 'setMinPpbr', 'maxPpbr', 'setMaxPpbr', 'min_price_per_bedroom', 'max_price_per_bedroom', 'Price / bedroom', 1],
];

/** Estates' "analyze what we actually have" page -- modeled after the
 * Community profile's Housing tab (median price by currency/bedroom-bucket,
 * the underlying listings shown right below it), but filter-first instead
 * of pinned to one community's location: every control here is a real
 * /estates/listings filter (see backend's _apply_listing_filters), so the
 * properties grid at the bottom is always fetched with the exact same
 * querystring the stats above it were computed from -- never a separate,
 * potentially-drifting "sample". */
export default function MarketAnalysis() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [listingType, setListingType] = useState(() => searchParams.get('listing_type') || '');
  const [city, setCity] = useState(() => searchParams.get('city') || '');
  const [neighborhood, setNeighborhood] = useState(() => searchParams.get('neighborhood') || '');
  const [agentOnly, setAgentOnly] = useState(() => searchParams.get('agent_only') === '1');
  const [ownerOnly, setOwnerOnly] = useState(() => searchParams.get('owner_only') === '1');
  const [neighborhoods, setNeighborhoods] = useState([]);

  const [minPrice, setMinPrice] = useState(() => searchParams.get('min_price') || '');
  const [maxPrice, setMaxPrice] = useState(() => searchParams.get('max_price') || '');
  const [minBedrooms, setMinBedrooms] = useState(() => searchParams.get('min_bedrooms') || '');
  const [maxBedrooms, setMaxBedrooms] = useState(() => searchParams.get('max_bedrooms') || '');
  const [minBathrooms, setMinBathrooms] = useState(() => searchParams.get('min_bathrooms') || '');
  const [maxBathrooms, setMaxBathrooms] = useState(() => searchParams.get('max_bathrooms') || '');
  const [minSize, setMinSize] = useState(() => searchParams.get('min_size_sqm') || '');
  const [maxSize, setMaxSize] = useState(() => searchParams.get('max_size_sqm') || '');
  const [minPpsqm, setMinPpsqm] = useState(() => searchParams.get('min_price_per_sqm') || '');
  const [maxPpsqm, setMaxPpsqm] = useState(() => searchParams.get('max_price_per_sqm') || '');
  const [minPpbr, setMinPpbr] = useState(() => searchParams.get('min_price_per_bedroom') || '');
  const [maxPpbr, setMaxPpbr] = useState(() => searchParams.get('max_price_per_bedroom') || '');

  const rangeState = {
    minPrice, setMinPrice, maxPrice, setMaxPrice,
    minBedrooms, setMinBedrooms, maxBedrooms, setMaxBedrooms,
    minBathrooms, setMinBathrooms, maxBathrooms, setMaxBathrooms,
    minSize, setMinSize, maxSize, setMaxSize,
    minPpsqm, setMinPpsqm, maxPpsqm, setMaxPpsqm,
    minPpbr, setMinPpbr, maxPpbr, setMaxPpbr,
  };

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [listings, setListings] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [listingsLoading, setListingsLoading] = useState(true);

  useEffect(() => {
    apiRequest('GET', null, '/estates/neighborhoods')
      .then((r) => setNeighborhoods(r.neighborhoods || []))
      .catch(() => {});
  }, []);

  const filterParams = useMemo(() => {
    const p = {};
    if (listingType) p.listing_type = listingType;
    if (city.trim()) p.city = city.trim();
    if (neighborhood) p.neighborhood = neighborhood;
    if (agentOnly) p.agent_only = '1';
    if (ownerOnly) p.owner_only = '1';
    for (const [minKey, , maxKey, , minParam, maxParam] of RANGE_FIELDS) {
      if (rangeState[minKey] !== '') p[minParam] = rangeState[minKey];
      if (rangeState[maxKey] !== '') p[maxParam] = rangeState[maxKey];
    }
    return p;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingType, city, neighborhood, agentOnly, ownerOnly,
      minPrice, maxPrice, minBedrooms, maxBedrooms, minBathrooms, maxBathrooms,
      minSize, maxSize, minPpsqm, maxPpsqm, minPpbr, maxPpbr]);

  const activeFilterCount = Object.keys(filterParams).length;

  // Keeps the address bar in sync with every filter so a copied link
  // reproduces the same analysis -- same convention as EstatesDirectory.
  useEffect(() => {
    setSearchParams(new URLSearchParams(filterParams), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterParams]);

  useEffect(() => {
    setStatsLoading(true);
    const qs = new URLSearchParams(filterParams).toString();
    apiRequest('GET', null, `/estates/market-analysis${qs ? `?${qs}` : ''}`)
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterParams]);

  useEffect(() => {
    setListingsLoading(true);
    const qs = new URLSearchParams({ ...filterParams, page: String(page), sort: 'newest' }).toString();
    apiRequest('GET', null, `/estates/listings?${qs}`)
      .then((d) => { setListings(d.listings || []); setHasMore(!!d.has_more); })
      .catch(() => setListings([]))
      .finally(() => setListingsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterParams, page]);

  const clearFilters = () => {
    setListingType(''); setCity(''); setNeighborhood(''); setAgentOnly(false); setOwnerOnly(false);
    setMinPrice(''); setMaxPrice(''); setMinBedrooms(''); setMaxBedrooms('');
    setMinBathrooms(''); setMaxBathrooms(''); setMinSize(''); setMaxSize('');
    setMinPpsqm(''); setMaxPpsqm(''); setMinPpbr(''); setMaxPpbr('');
    setPage(1);
  };

  // Drill into an area from the "Top areas" table -- a neighborhood name
  // gets the exact dropdown filter, anything else (a city) goes in the
  // free-text city box, same distinction /estates/neighborhoods itself draws.
  const drillIntoArea = (area) => {
    setPage(1);
    if (neighborhoods.includes(area)) { setNeighborhood(area); setCity(''); } else { setCity(area); setNeighborhood(''); }
  };

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 1180 }}>
        <div className="est-masthead">
          <div className="est-masthead-row">
            <div className="est-masthead-copy">
              <div className="est-masthead-kicker"><BarChart3 size={13} /> Market Analysis</div>
              <h1 className="est-masthead-title">What's actually on the market</h1>
              <p className="est-masthead-sub">
                Filter the real listings we have and see median price, price per sqm, and price per bedroom --
                with the exact properties behind every number shown below.
              </p>
            </div>
          </div>
        </div>

        <div className="est-chip-row" style={{ marginBottom: 12 }}>
          {TYPE_TABS.map((t) => (
            <button
              key={t.key || 'all'} type="button"
              className={`est-chip${listingType === t.key ? ' active' : ''}`}
              onClick={() => { setPage(1); setListingType(t.key); }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="gs-card" style={{ marginBottom: 18 }}>
          <div className="gs-card-body">
            <div className="est-analysis-filter-grid">
              <div className="gs-field">
                <label className="gs-label">City</label>
                <input className="gs-input" style={{ width: 160 }} placeholder="Any city"
                  value={city} onChange={(e) => { setPage(1); setCity(e.target.value); }} />
              </div>
              <div className="gs-field">
                <label className="gs-label">Neighborhood</label>
                <select className="gs-input" style={{ minWidth: 170 }} value={neighborhood}
                  onChange={(e) => { setPage(1); setNeighborhood(e.target.value); }}>
                  <option value="">All neighborhoods</option>
                  {neighborhoods.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              {RANGE_FIELDS.map(([minKey, setMinKey, maxKey, setMaxKey, , , label, step]) => (
                <div className="gs-field" key={label}>
                  <label className="gs-label">{label}</label>
                  <div className="est-analysis-range">
                    <input type="number" step={step} className="gs-input" placeholder="Min"
                      value={rangeState[minKey]}
                      onChange={(e) => { setPage(1); rangeState[setMinKey](e.target.value); }} />
                    <input type="number" step={step} className="gs-input" placeholder="Max"
                      value={rangeState[maxKey]}
                      onChange={(e) => { setPage(1); rangeState[setMaxKey](e.target.value); }} />
                  </div>
                </div>
              ))}
              <div className="gs-field">
                <label className="gs-label">Posted by</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" className={`est-chip${agentOnly ? ' active' : ''}`}
                    onClick={() => { setPage(1); setAgentOnly((v) => !v); setOwnerOnly(false); }}>
                    <BadgeCheck size={13} /> Agent
                  </button>
                  <button type="button" className={`est-chip${ownerOnly ? ' active' : ''}`}
                    onClick={() => { setPage(1); setOwnerOnly((v) => !v); setAgentOnly(false); }}>
                    Owner
                  </button>
                </div>
              </div>
            </div>
            {activeFilterCount > 0 && (
              <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" style={{ marginTop: 14 }} onClick={clearFilters}>
                <X size={13} /> Clear all filters ({activeFilterCount})
              </button>
            )}
          </div>
        </div>

        {statsLoading && <p style={{ color: 'var(--muted)' }}>Crunching the numbers…</p>}

        {!statsLoading && stats && stats.count === 0 && (
          <p className="est-empty">No listings match these filters yet. Try widening the range.</p>
        )}

        {!statsLoading && stats && stats.count > 0 && (
          <>
            <div className="est-analysis-summary">
              <strong>{stats.count.toLocaleString()}</strong>
              <span style={{ color: 'var(--muted)' }}>matching listing{stats.count === 1 ? '' : 's'}</span>
            </div>

            <div className="est-analysis-grid">
              {stats.by_currency.map((cur) => (
                <div className="est-analysis-card" key={cur.currency}>
                  <h4>{cur.currency} — {cur.count} priced listing{cur.count === 1 ? '' : 's'}</h4>
                  <div className="est-analysis-figure-row">
                    <span className="est-analysis-figure-label">Median price</span>
                    <span className="est-analysis-figure-value">{fmtMoney(cur.median_price, cur.currency)}</span>
                  </div>
                  <div className="est-analysis-figure-row">
                    <span className="est-analysis-figure-label">Median price / sqm</span>
                    <span className="est-analysis-figure-value">
                      {cur.price_per_sqm ? fmtMoney(cur.price_per_sqm.median, cur.currency) : '—'}
                      {cur.price_per_sqm && <span className="est-analysis-figure-n">n={cur.price_per_sqm.count}</span>}
                    </span>
                  </div>
                  <div className="est-analysis-figure-row">
                    <span className="est-analysis-figure-label">Median price / bedroom</span>
                    <span className="est-analysis-figure-value">
                      {cur.price_per_bedroom ? fmtMoney(cur.price_per_bedroom.median, cur.currency) : '—'}
                      {cur.price_per_bedroom && <span className="est-analysis-figure-n">n={cur.price_per_bedroom.count}</span>}
                    </span>
                  </div>

                  {cur.by_bedrooms.length > 0 && (
                    <table className="est-analysis-table" style={{ marginTop: 14 }}>
                      <thead>
                        <tr><th>Bedrooms</th><th>Count</th><th>Median price</th><th>Median $/sqm</th></tr>
                      </thead>
                      <tbody>
                        {cur.by_bedrooms.map((b) => (
                          <tr key={b.bedrooms}>
                            <td>{b.bedrooms}{b.is_max_bucket ? '+' : ''}</td>
                            <td>{b.count}</td>
                            <td>{fmtMoney(b.median_price, cur.currency)}</td>
                            <td>{b.median_price_per_sqm != null ? fmtMoney(b.median_price_per_sqm, cur.currency) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ))}

              {stats.by_listing_type.length > 0 && (
                <div className="est-analysis-card">
                  <h4>By listing type</h4>
                  <table className="est-analysis-table">
                    <thead><tr><th>Type</th><th>Count</th><th>Median price</th></tr></thead>
                    <tbody>
                      {stats.by_listing_type.map((t) => (
                        <tr key={t.listing_type} className="clickable" onClick={() => { setPage(1); setListingType(t.listing_type); }}>
                          <td>{TYPE_LABEL[t.listing_type] || t.listing_type}</td>
                          <td>{t.count}</td>
                          <td>{fmtMoney(t.median_price, stats.by_currency[0]?.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {stats.by_area.length > 0 && (
                <div className="est-analysis-card">
                  <h4>Top areas in this search</h4>
                  <table className="est-analysis-table">
                    <thead><tr><th>Area</th><th>Count</th><th>Median price</th></tr></thead>
                    <tbody>
                      {stats.by_area.map((a) => (
                        <tr key={a.area} className="clickable" onClick={() => drillIntoArea(a.area)}>
                          <td>{a.area}</td>
                          <td>{a.count}</td>
                          <td>{fmtMoney(a.median_price, stats.by_currency[0]?.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        <div className="est-analysis-divider">Properties used in this analysis</div>

        {listingsLoading && <p style={{ color: 'var(--muted)' }}>Loading listings…</p>}
        {!listingsLoading && listings && listings.length === 0 && (
          <p className="est-empty">No listings to show for this filter.</p>
        )}
        {!listingsLoading && listings && listings.length > 0 && (
          <div className="est-listing-grid">
            {listings.map((l) => <ListingCard key={l.id} listing={l} />)}
          </div>
        )}
        {!listingsLoading && (page > 1 || hasMore) && (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', margin: '20px 0' }}>
            <button className="gs-btn gs-btn-outline gs-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Newer</button>
            <button className="gs-btn gs-btn-outline gs-btn-sm" disabled={!hasMore} onClick={() => setPage((p) => p + 1)}>Older</button>
          </div>
        )}
      </div>
    </div>
  );
}
