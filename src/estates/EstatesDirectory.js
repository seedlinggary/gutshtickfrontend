import React, { useEffect, useState, useRef, Suspense, lazy } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, Search, Plus, Map, Menu, BadgeCheck } from 'lucide-react';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';
import ErrorBoundary from '../ErrorBoundary';
import { AdCard, useInThreadAds } from '../ads/AdSlot';
import EstatesStatsBar from './EstatesStatsBar';
import ListingCard from './ListingCard';
import { useNearMe, NearMeShakeControls } from '../shared/NearMeShake';

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
  const [listingType, setListingType] = useState('');
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const [agentOnly, setAgentOnly] = useState(false);
  const [ownerOnly, setOwnerOnly] = useState(false);
  const [sort, setSort] = useState('newest');
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
  }, [listingType, q, city, agentOnly, ownerOnly, page, sort, nearCoords, bbox, shakeSeed]);

  useEffect(() => { resultsRef.current = results || []; }, [results]);

  const neededAdCount = results ? Math.floor(results.length / 6) : 0;
  const { adAt, dismiss: dismissAd } = useInThreadAds('estates_listings', neededAdCount);

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
        </div>

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
