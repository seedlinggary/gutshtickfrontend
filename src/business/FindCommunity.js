import React, { useEffect, useState, useRef, Suspense, lazy } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Users, Search, Plus, Clock, Menu, Map } from 'lucide-react';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';
import ErrorBoundary from '../ErrorBoundary';
import StatsBar from './StatsBar';
import { useNearMe, NearMeShakeControls } from './NearMeShake';

const BusinessMap = lazy(() => import('./BusinessMap'));

const SUBTITLE = 'Every city and neighborhood we have real data for, with its shuls, mikvahs, groceries, restaurants and activities pulled together in one place.';
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

// BusinessMap expects business-shaped objects (locations/primary_location) --
// a Community is just a bare lat/lng, so give it the same shape rather than
// writing a second map component from scratch.
function toMapPoints(communities) {
  return communities.map((c) => ({
    id: c.id, slug: c.slug, name: c.name,
    primary_location: { lat: c.lat, lng: c.lng, city: c.city },
  }));
}

export default function FindCommunity() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [state, setState] = useState('');
  const [states, setStates] = useState([]);
  const [sort, setSort] = useState('');
  const [nearCoords, setNearCoords] = useState(null);
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
    () => { setNearCoords(null); setSort(''); setPage(1); }
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
    apiRequest('GET', null, '/business/communities/states').then((d) => setStates(d.states || [])).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (q.trim()) params.set('q', q.trim());
    if (state) params.set('state', state);
    if (sort) params.set('sort', sort);
    if (sort === 'distance' && nearCoords) {
      params.set('lat', nearCoords.lat);
      params.set('lng', nearCoords.lng);
    }
    apiRequest('GET', null, `/business/communities?${params.toString()}`)
      .then((d) => { setResults(d.results || []); setHasMore(!!d.has_more); })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, state, page, sort, nearCoords, shakeSeed]);

  useEffect(() => { resultsRef.current = results || []; }, [results]);

  const listView = (
    <>
      {loading && <p style={{ color: 'var(--muted)' }}>Loading communities…</p>}

      {!loading && results && results.length === 0 && (
        <p style={{ color: 'var(--muted)' }}>No communities found. Try a different search, or add one yourself.</p>
      )}

      {!loading && results && results.length > 0 && (
        <div className="biz-community-grid">
          {results.map((c) => (
            <Link key={c.id} to={`/communities/${c.slug}`} className="biz-community-card">
              {c.logo_url ? (
                <img src={c.logo_url} alt={c.name} className="biz-community-card-img" />
              ) : (
                <div className="biz-community-card-img biz-community-card-img-placeholder"><MapPin size={28} /></div>
              )}
              <div className="biz-community-card-body">
                <h3>{c.name}</h3>
                <p>{[c.city, c.state].filter(Boolean).join(', ')}</p>
                {c.description && <p className="biz-community-card-desc">{c.description}</p>}
              </div>
            </Link>
          ))}
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
          onSelectBusiness={(id) => {
            const c = resultsRef.current.find((x) => x.id === id);
            if (c) navigate(`/communities/${c.slug}`);
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
              <div className="biz-masthead-kicker"><Users size={13} /> Community</div>
              <h1 className="biz-masthead-title">Look up a Jewish community</h1>
              <p className="biz-masthead-sub">{SUBTITLE}</p>
            </div>
            <NearMeShakeControls
              nearMeActive={nearMeActive} locating={locating} onNearMe={findNearMe}
              radiusMiles={NEAR_ME_RADIUS_MILES} shaking={shaking} onShake={shake} nearMeError={nearMeError}
            />
          </div>
          <StatsBar scope="community" />
        </div>

        {isLoggedIn() && (
          <div className="biz-list-cta">
            <Link to="/communities/new" className="gs-btn gs-btn-primary" style={{ whiteSpace: 'nowrap' }}>
              <Plus size={15} /> Add a community
            </Link>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '16px 0' }}>
          <div style={{ position: 'relative', flex: '1 1 260px' }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--muted)' }} />
            <input
              className="gs-input"
              style={{ paddingLeft: 32, width: '100%' }}
              placeholder="Search by community or city name"
              value={q}
              onChange={(e) => { setPage(1); setQ(e.target.value); }}
            />
          </div>
          <select className="gs-input" style={{ width: 160 }} value={state} onChange={(e) => { setPage(1); setState(e.target.value); }}>
            <option value="">All states</option>
            {states.map((s) => <option key={s} value={s}>{s}</option>)}
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

        <Link to="/minyanim" className="biz-minyan-search-link">
          <Clock size={15} /> Looking for a specific minyan time? Search all shuls →
        </Link>
      </div>
    </div>
  );
}
