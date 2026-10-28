import React, { useEffect, useState, useRef, Suspense, lazy } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Home, Search, Plus, Map, Menu, BadgeCheck, SlidersHorizontal } from 'lucide-react';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';
import ErrorBoundary from '../ErrorBoundary';
import { AdCard, useInThreadAds } from '../ads/AdSlot';
import EstatesStatsBar from './EstatesStatsBar';
import ListingCard from './ListingCard';
import { useNearMe, NearMeShakeControls } from '../shared/NearMeShake';
import GetAlertsButton from '../alerts/GetAlertsButton';

const BusinessMap = lazy(() => import('../business/BusinessMap'));

const SUBTITLE = 'Real listings posted directly by owners and agents -- for sale, long-term rentals, and short-term rentals, all on one map.';
const DESKTOP_QUERY = '(min-width: 960px)';
const NEAR_ME_RADIUS_MILES = 25;

const TYPE_TABS = [
  { key: '', label: 'All' },
  { key: 'sale', label: 'For Sale' },
  { key: 'long_term_lease', label: 'Long-Term Rent' },
  { key: 'short_term_lease', label: 'Short-Term Rent' },
];

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(DESKTOP_QUERY).matches
  );
  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY);
    const onChange = (e) => setIsDesktop(e.matches);
    mql.addEventListener ? mql.addEventListener('change', onChange) : mql.addListener(onChange);
    return () => (mql.removeEventListener ? mql.removeEventListener('change', onChange) : mql.removeListener(onChange));
  }, []);
  return isDesktop;
}

function MapErrorFallback(error, retry) {
  return (
    <div className="gs-empty" style={{ padding: 24 }}>
      <Map size={32} style={{ marginBottom: 8, color: 'var(--muted-faint)' }} />
      <p>The map couldn't load.</p>
      <button className="gs-btn gs-btn-outline gs-btn-sm" style={{ marginTop: 8 }} onClick={retry}>Try again</button>
    </div>
  );
}

// BusinessMap expects business-shaped objects (primary_location) -- a
// listing already has flat lat/lng, so just reshape it the same way
// FindCommunity.js/ActivitiesPage.js do for their own non-Business objects.
function toMapPoints(listings) {
  return listings.filter((l) => l.lat != null && l.lng != null).map((l) => ({
    id: l.id, slug: l.slug, name: l.title,
    primary_location: { lat: l.lat, lng: l.lng, city: l.city },
  }));
}

export default function EstatesDirectory() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // Every filter initializes from the URL (once, on mount) so a copied link
  // restores the same search -- see the sync-back effect below, which is
  // the other half of that round trip.
  const [listingType, setListingType] = useState(() => searchParams.get('listing_type') || '');
  const [q, setQ] = useState(() => searchParams.get('q') || '');
  const [city, setCity] = useState(() => searchParams.get('city') || '');
  const [neighborhood, setNeighborhood] = useState(() => searchParams.get('neighborhood') || '');
  const [minPrice, setMinPrice] = useState(() => searchParams.get('min_price') || '');
  const [maxPrice, setMaxPrice] = useState(() => searchParams.get('max_price') || '');
  const [minBedrooms, setMinBedrooms] = useState(() => searchParams.get('min_bedrooms') || '');
  const [maxBedrooms, setMaxBedrooms] = useState(() => searchParams.get('max_bedrooms') || '');
  const [agentOnly, setAgentOnly] = useState(() => searchParams.get('agent_only') === '1');
  const [ownerOnly, setOwnerOnly] = useState(() => searchParams.get('owner_only') === '1');
  const [sort, setSort] = useState(() => searchParams.get('sort') || 'newest');
  const [filterOpen, setFilterOpen] = useState(false);
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [nearCoords, setNearCoords] = useState(null);
  const [bbox, setBbox] = useState(null);
  const [nearbySelection, setNearbySelection] = useState(null);
  const [shakeSeed, setShakeSeed] = useState(0);
  const [shaking, setShaking] = useState(false);
  const [results, setResults] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileView, setMobileView] = useState('list');
  const isDesktop = useIsDesktop();
  const resultsRef = useRef([]);
  const activeFilterCount = [neighborhood, minPrice, maxPrice, minBedrooms, maxBedrooms].filter(Boolean).length;

  useEffect(() => {
    apiRequest('GET', null, '/estates/neighborhoods')
      .then((res) => setNeighborhoods(res.neighborhoods || []))
      .catch(() => {});
  }, []);

  const clearAdvancedFilters = () => {
    setNeighborhood(''); setMinPrice(''); setMaxPrice(''); setMinBedrooms(''); setMaxBedrooms('');
  };

  const { locating, nearMeActive, nearMeError, findNearMe } = useNearMe(
    (coords) => { setNearCoords(coords); setSort('distance'); setPage(1); },
    () => { setNearCoords(null); setSort('newest'); setPage(1); }
  );

  const shake = () => {
    if (shaking) return;
    setShaking(true);
    setSort('random');
    setPage(1);
    setShakeSeed((s) => s + 1);
    setTimeout(() => setShaking(false), 500);
  };

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (listingType) params.set('listing_type', listingType);
    if (q.trim()) params.set('q', q.trim());
    if (city.trim()) params.set('city', city.trim());
    if (neighborhood) params.set('neighborhood', neighborhood);
    if (minPrice !== '') params.set('min_price', minPrice);
    if (maxPrice !== '') params.set('max_price', maxPrice);
    if (minBedrooms !== '') params.set('min_bedrooms', minBedrooms);
    if (maxBedrooms !== '') params.set('max_bedrooms', maxBedrooms);
    if (agentOnly) params.set('agent_only', '1');
    if (ownerOnly) params.set('owner_only', '1');
    if (sort) params.set('sort', sort);
    if (sort === 'distance' && nearCoords) {
      params.set('lat', nearCoords.lat);
      params.set('lng', nearCoords.lng);
    }
    if (bbox) {
      params.set('north', bbox.north); params.set('south', bbox.south);
      params.set('east', bbox.east); params.set('west', bbox.west);
    }
    apiRequest('GET', null, `/estates/listings?${params.toString()}`)
      .then((d) => { setResults(d.listings || []); setHasMore(!!d.has_more); })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingType, q, city, neighborhood, minPrice, maxPrice, minBedrooms, maxBedrooms, agentOnly, ownerOnly, page, sort, nearCoords, bbox, shakeSeed]);

  useEffect(() => { resultsRef.current = results || []; }, [results]);

  // Keeps the address bar in sync with every active filter (not `page`,
  // `bbox`/near-me state, or the shake seed -- those aren't meant to be
  // part of a shareable search link) so a copied URL reproduces the same
  // results. `replace: true` avoids filling browser history with one entry
  // per keystroke/toggle.
  useEffect(() => {
    const next = new URLSearchParams();
    if (listingType) next.set('listing_type', listingType);
    if (q.trim()) next.set('q', q.trim());
    if (city.trim()) next.set('city', city.trim());
    if (neighborhood) next.set('neighborhood', neighborhood);
    if (minPrice !== '') next.set('min_price', minPrice);
    if (maxPrice !== '') next.set('max_price', maxPrice);
    if (minBedrooms !== '') next.set('min_bedrooms', minBedrooms);
    if (maxBedrooms !== '') next.set('max_bedrooms', maxBedrooms);
    if (agentOnly) next.set('agent_only', '1');
    if (ownerOnly) next.set('owner_only', '1');
    if (sort !== 'newest') next.set('sort', sort);
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingType, q, city, neighborhood, minPrice, maxPrice, minBedrooms, maxBedrooms, agentOnly, ownerOnly, sort]);

  const neededAdCount = results ? Math.floor(results.length / 6) : 0;
  const { adAt, dismiss: dismissAd } = useInThreadAds('estates_listings', neededAdCount);

  // Same field names /estates/listings itself reads -- handed to
  // GetAlertsButton as-is so an alert always matches exactly what this
  // search currently returns (see backend's shared _apply_listing_filters).
  const alertFilters = {
    listing_type: listingType, q: q.trim(), city: city.trim(), neighborhood,
    min_price: minPrice, max_price: maxPrice, min_bedrooms: minBedrooms, max_bedrooms: maxBedrooms,
    agent_only: agentOnly ? '1' : '', owner_only: ownerOnly ? '1' : '',
  };
  const alertLabel = [
    listingType ? TYPE_TABS.find((t) => t.key === listingType)?.label : null,
    neighborhood || city.trim(),
  ].filter(Boolean).join(' in ') || 'Gut Estates listings';

  const listView = (
    <>
      {loading && <p style={{ color: 'var(--muted)' }}>Loading listings…</p>}

      {!loading && results && results.length === 0 && (
        <p className="est-empty">No listings found. Try a different search, or be the first to list one.</p>
      )}

      {!loading && results && results.length > 0 && (
        <div className="est-listing-grid">
          {results.map((l, i) => {
            const slotIdx = i % 6 === 5 ? Math.floor(i / 6) : null;
            return (
              <React.Fragment key={l.id}>
                <ListingCard listing={l} />
                {slotIdx !== null && <AdCard ad={adAt(slotIdx)} onDismiss={() => dismissAd(slotIdx)} />}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {!loading && (page > 1 || hasMore) && (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', margin: '20px 0' }}>
          <button className="gs-btn gs-btn-outline gs-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Newer</button>
          <button className="gs-btn gs-btn-outline gs-btn-sm" disabled={!hasMore} onClick={() => setPage((p) => p + 1)}>Older</button>
        </div>
      )}
    </>
  );

  const mapView = (
    <ErrorBoundary fallback={MapErrorFallback}>
      <Suspense fallback={<div className="gs-loading"><div className="gs-spinner" /> Loading map…</div>}>
        <BusinessMap
          businesses={toMapPoints(results || [])}
          onBoundsSearch={(box) => { setBbox(box); setNearbySelection(null); }}
          onNearbySearch={({ bbox: box, point, radius }) => { setBbox(box); setNearbySelection({ point, radius }); }}
          initialNearby={nearbySelection}
          onSelectBusiness={(id) => {
            const l = resultsRef.current.find((x) => x.id === id);
            if (l) navigate(`/listings/${l.slug}`);
          }}
        />
      </Suspense>
    </ErrorBoundary>
  );

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 1180 }}>
        <div className="est-masthead">
          <div className="est-masthead-row">
            <div className="est-masthead-copy">
              <div className="est-masthead-kicker"><Home size={13} /> Buy &amp; Rent</div>
              <h1 className="est-masthead-title">Find your next home</h1>
              <p className="est-masthead-sub">{SUBTITLE}</p>
            </div>
            <NearMeShakeControls
              nearMeActive={nearMeActive} locating={locating} onNearMe={findNearMe}
              radiusMiles={NEAR_ME_RADIUS_MILES} shaking={shaking} onShake={shake} nearMeError={nearMeError}
            />
          </div>
          <EstatesStatsBar />
        </div>

        {isLoggedIn() && (
          <div className="biz-list-cta">
            <Link to="/listings/new" className="gs-btn gs-btn-primary" style={{ whiteSpace: 'nowrap' }}>
              <Plus size={15} /> List a property
            </Link>
          </div>
        )}

        <div className="est-chip-row" style={{ marginBottom: 12 }}>
          {TYPE_TABS.map((t) => (
            <button
              key={t.key || 'all'}
              type="button"
              className={`est-chip${listingType === t.key ? ' active' : ''}`}
              onClick={() => { setPage(1); setListingType(t.key); setBbox(null); setNearbySelection(null); }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '16px 0' }}>
          <div style={{ position: 'relative', flex: '1 1 220px' }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--muted)' }} />
            <input
              className="gs-input"
              style={{ paddingLeft: 32, width: '100%' }}
              placeholder="Search by title or description"
              value={q}
              onChange={(e) => { setPage(1); setQ(e.target.value); setBbox(null); setNearbySelection(null); }}
            />
          </div>
          <input
            className="gs-input" style={{ width: 160 }} placeholder="City"
            value={city} onChange={(e) => { setPage(1); setCity(e.target.value); setBbox(null); setNearbySelection(null); }}
          />
          <select
            className="gs-input" style={{ width: 170 }} value={sort || 'newest'}
            onChange={(e) => { setPage(1); setSort(e.target.value); }}
          >
            <option value="newest">Newest first</option>
            <option value="alpha">A–Z</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
          <button
            type="button" className={`est-chip${agentOnly ? ' active' : ''}`}
            onClick={() => { setPage(1); setAgentOnly((v) => !v); setOwnerOnly(false); setBbox(null); setNearbySelection(null); }}
          >
            <BadgeCheck size={13} /> Agent listings
          </button>
          <button
            type="button" className={`est-chip${ownerOnly ? ' active' : ''}`}
            onClick={() => { setPage(1); setOwnerOnly((v) => !v); setAgentOnly(false); setBbox(null); setNearbySelection(null); }}
          >
            Owner listings
          </button>
          <button
            type="button" className={`est-chip${activeFilterCount ? ' active' : ''}`}
            onClick={() => setFilterOpen((o) => !o)}
          >
            <SlidersHorizontal size={13} /> Filters {activeFilterCount > 0 && <span>({activeFilterCount})</span>}
          </button>
          <GetAlertsButton searchType="estates" filters={alertFilters} label={alertLabel} />
        </div>

        {filterOpen && (
          <div className="gs-card" style={{ marginBottom: 16 }}>
            <div className="gs-card-body" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="gs-field" style={{ margin: 0 }}>
                <label className="gs-label">Neighborhood</label>
                <select
                  className="gs-input" style={{ minWidth: 180 }} value={neighborhood}
                  onChange={(e) => { setPage(1); setNeighborhood(e.target.value); }}
                >
                  <option value="">All neighborhoods</option>
                  {neighborhoods.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div className="gs-field" style={{ margin: 0 }}>
                <label className="gs-label">Price range</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="number" className="gs-input" style={{ width: 100 }} placeholder="Min"
                    value={minPrice} onChange={(e) => { setPage(1); setMinPrice(e.target.value); }}
                  />
                  <input
                    type="number" className="gs-input" style={{ width: 100 }} placeholder="Max"
                    value={maxPrice} onChange={(e) => { setPage(1); setMaxPrice(e.target.value); }}
                  />
                </div>
              </div>
              <div className="gs-field" style={{ margin: 0 }}>
                <label className="gs-label">Rooms</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="number" className="gs-input" style={{ width: 80 }} placeholder="Min"
                    value={minBedrooms} onChange={(e) => { setPage(1); setMinBedrooms(e.target.value); }}
                  />
                  <input
                    type="number" className="gs-input" style={{ width: 80 }} placeholder="Max"
                    value={maxBedrooms} onChange={(e) => { setPage(1); setMaxBedrooms(e.target.value); }}
                  />
                </div>
              </div>
              {activeFilterCount > 0 && (
                <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => { setPage(1); clearAdvancedFilters(); }}>
                  Clear filters
                </button>
              )}
            </div>
          </div>
        )}

        <div className="est-directory-split">
          <div className="est-directory-list">
            {!isDesktop && (
              <div className="est-mobile-toggle">
                <div className="est-segmented">
                  <button type="button" className={`est-segmented-btn${mobileView === 'list' ? ' active' : ''}`} onClick={() => setMobileView('list')}><Menu size={14} /> List</button>
                  <button type="button" className={`est-segmented-btn${mobileView === 'map' ? ' active' : ''}`} onClick={() => setMobileView('map')}><Map size={14} /> Map</button>
                </div>
              </div>
            )}
            {!isDesktop && mobileView === 'map' ? mapView : listView}
          </div>
          {isDesktop && <div className="est-directory-mappane">{mapView}</div>}
        </div>
      </div>
    </div>
  );
}
