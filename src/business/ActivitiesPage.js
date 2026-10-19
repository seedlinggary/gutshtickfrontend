import React, { useEffect, useState, useRef, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { FerrisWheel, Search, MapPin, Menu, Map } from 'lucide-react';
import apiRequest from '../ApiRequest';
import BusinessCard from './BusinessCard';
import ErrorBoundary from '../ErrorBoundary';
import StatsBar from './StatsBar';
import { useNearMe, NearMeShakeControls } from './NearMeShake';

const BusinessMap = lazy(() => import('./BusinessMap'));

const SUBTITLE = 'Things to do, free or paid, near your community -- museums, parks, trips, classes and more. Added by neighbors and business owners, same as the rest of the directory.';
const DESKTOP_QUERY = '(min-width: 960px)';
const NEAR_ME_RADIUS_MILES = 25;

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

export default function ActivitiesPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const [sort, setSort] = useState('random');
  const [nearCoords, setNearCoords] = useState(null);
  const [shakeSeed, setShakeSeed] = useState(0);
  const [shaking, setShaking] = useState(false);
  const [page, setPage] = useState(1);
  const [results, setResults] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileView, setMobileView] = useState('list');
  const [hoveredId, setHoveredId] = useState(null);
  const isDesktop = useIsDesktop();
  const resultsRef = useRef([]);

  const { locating, nearMeActive, nearMeError, findNearMe } = useNearMe(
    (coords) => { setNearCoords(coords); setSort('distance'); setPage(1); },
    () => { setNearCoords(null); setSort('random'); setPage(1); }
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
    const params = new URLSearchParams({ category: 'attraction', sort, page: String(page) });
    if (q.trim()) params.set('q', q.trim());
    if (city.trim()) params.set('city', city.trim());
    if (sort === 'distance' && nearCoords) {
      params.set('lat', nearCoords.lat);
      params.set('lng', nearCoords.lng);
    }
    apiRequest('GET', null, `/business/businesses?${params.toString()}`)
      .then((d) => { setResults(d.businesses || []); setHasMore(!!d.has_more); })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, city, sort, page, nearCoords, shakeSeed]);

  useEffect(() => { resultsRef.current = results || []; }, [results]);

  const listView = (
    <>
      {loading && <p style={{ color: 'var(--muted)' }}>Loading…</p>}
      {!loading && results && results.length === 0 && (
        <p style={{ color: 'var(--muted)' }}>No activities found yet{city ? ` in ${city}` : ''}. Know of one? Add it to the directory as an Attraction/Activity.</p>
      )}
      {!loading && results && results.length > 0 && (
        <div className="biz-amenity-grid">
          {results.map((b) => <BusinessCard key={b.id} business={b} onHover={setHoveredId} active={hoveredId === b.id} />)}
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
          businesses={results || []}
          hoveredId={hoveredId}
          onSelectBusiness={(id) => {
            const b = resultsRef.current.find((x) => x.id === id);
            if (b) navigate(`/business/${b.slug}`);
          }}
        />
      </Suspense>
    </ErrorBoundary>
  );

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 1180 }}>
        <div className="biz-masthead">
          <div className="biz-masthead-row">
            <div className="biz-masthead-copy">
              <div className="biz-masthead-kicker"><FerrisWheel size={13} /> Activities</div>
              <h1 className="biz-masthead-title">Things to do</h1>
              <p className="biz-masthead-sub">{SUBTITLE}</p>
            </div>
            <NearMeShakeControls
              nearMeActive={nearMeActive} locating={locating} onNearMe={findNearMe}
              radiusMiles={NEAR_ME_RADIUS_MILES} shaking={shaking} onShake={shake} nearMeError={nearMeError}
            />
          </div>
          <StatsBar scope="activities" />
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '16px 0' }}>
          <div style={{ position: 'relative', flex: '1 1 220px' }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--muted)' }} />
            <input className="gs-input" style={{ paddingLeft: 32, width: '100%' }} placeholder="Search activities"
              value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} />
          </div>
          <div style={{ position: 'relative', flex: '1 1 180px' }}>
            <MapPin size={15} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--muted)' }} />
            <input className="gs-input" style={{ paddingLeft: 32, width: '100%' }} placeholder="City"
              value={city} onChange={(e) => { setPage(1); setCity(e.target.value); }} />
          </div>
          <select className="gs-input" style={{ width: 160 }} value={sort} onChange={(e) => { setPage(1); setSort(e.target.value); }}>
            <option value="random">Random</option>
            <option value="alpha">A–Z</option>
            <option value="rating">Top Rated</option>
            {nearMeActive && <option value="distance">Distance</option>}
          </select>
        </div>

        <div className="biz-directory-split">
          <div className="biz-directory-list">
            {!isDesktop && (
              <div className="biz-mobile-toggle">
                <div className="biz-segmented">
                  <button type="button" className={`biz-segmented-btn${mobileView === 'list' ? ' active' : ''}`} onClick={() => setMobileView('list')}><Menu size={14} /> List</button>
                  <button type="button" className={`biz-segmented-btn${mobileView === 'map' ? ' active' : ''}`} onClick={() => setMobileView('map')}><Map size={14} /> Map</button>
                </div>
              </div>
            )}
            {!isDesktop && mobileView === 'map' ? mapView : listView}
          </div>
          {isDesktop && <div className="biz-directory-mappane">{mapView}</div>}
        </div>
      </div>
    </div>
  );
}
