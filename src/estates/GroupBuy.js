import React, { useEffect, useState, useRef, Suspense, lazy } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Search, Plus, Map, Menu } from 'lucide-react';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';
import ErrorBoundary from '../ErrorBoundary';
import GroupBuyCard from './GroupBuyCard';

const BusinessMap = lazy(() => import('../business/BusinessMap'));

const SUBTITLE = "Common in Israel's pre-construction market (buying \"al haneyar\" / on paper) -- band together with enough other buyers on the same project and the developer can offer a real bulk discount. Browse open projects or start your own.";
const DESKTOP_QUERY = '(min-width: 960px)';

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

// Same reshape as EstatesDirectory.js -- BusinessMap expects
// primary_location-shaped points, a group buy already has flat lat/lng.
function toMapPoints(groupBuys) {
  return groupBuys.filter((g) => g.lat != null && g.lng != null).map((g) => ({
    id: g.id, slug: g.slug, name: g.title,
    primary_location: { lat: g.lat, lng: g.lng, city: g.city },
  }));
}

export default function GroupBuy() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [bbox, setBbox] = useState(null);
  const [nearbySelection, setNearbySelection] = useState(null);
  const [results, setResults] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileView, setMobileView] = useState('list');
  const isDesktop = useIsDesktop();
  const resultsRef = useRef([]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (q.trim()) params.set('q', q.trim());
    if (bbox) {
      params.set('north', bbox.north); params.set('south', bbox.south);
      params.set('east', bbox.east); params.set('west', bbox.west);
    }
    apiRequest('GET', null, `/estates/group-buys?${params.toString()}`)
      .then((d) => { setResults(d.group_buys || []); setHasMore(!!d.has_more); })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [q, page, bbox]);

  useEffect(() => { resultsRef.current = results || []; }, [results]);

  const mapView = (
    <ErrorBoundary fallback={MapErrorFallback}>
      <Suspense fallback={<div className="gs-loading"><div className="gs-spinner" /> Loading map…</div>}>
        <BusinessMap
          businesses={toMapPoints(results || [])}
          onBoundsSearch={(box) => { setBbox(box); setNearbySelection(null); }}
          onNearbySearch={({ bbox: box, point, radius }) => { setBbox(box); setNearbySelection({ point, radius }); }}
          initialNearby={nearbySelection}
          onSelectBusiness={(id) => {
            const g = resultsRef.current.find((x) => x.id === id);
            if (g) navigate(`/group-buy/${g.slug}`);
          }}
        />
      </Suspense>
    </ErrorBoundary>
  );

  const listView = (
    <>
      {loading && <p style={{ color: 'var(--muted)' }}>Loading…</p>}
      {!loading && results && results.length === 0 && (
        <p className="est-empty">No open group buys yet. Be the first to start one.</p>
      )}
      {!loading && results && results.length > 0 && (
        <div className="est-listing-grid">
          {results.map((gb) => <GroupBuyCard key={gb.id} groupBuy={gb} />)}
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

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 1180 }}>
        <div className="est-masthead">
          <div className="est-masthead-kicker"><Users size={13} /> Group Buy</div>
          <h1 className="est-masthead-title">Buy before it's built -- together</h1>
          <p className="est-masthead-sub">{SUBTITLE}</p>
        </div>

        {isLoggedIn() && (
          <div className="biz-list-cta">
            <Link to="/group-buy/new" className="gs-btn gs-btn-primary"><Plus size={15} /> Start a group buy</Link>
          </div>
        )}

        <div style={{ position: 'relative', margin: '16px 0', maxWidth: 420 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--muted)' }} />
          <input
            className="gs-input" style={{ paddingLeft: 32, width: '100%' }}
            placeholder="Search by project or city"
            value={q} onChange={(e) => { setPage(1); setQ(e.target.value); setBbox(null); setNearbySelection(null); }}
          />
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
