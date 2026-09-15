import React, { useCallback, useEffect, useRef, useState, Suspense, lazy } from 'react';
import apiRequest from '../ApiRequest';
import PinSomethingCard from '../PinSomethingCard';
import AdSlot from '../ads/AdSlot';
import ErrorBoundary from '../ErrorBoundary';
import BusinessCard from './BusinessCard';
import BusinessPreviewPanel from './BusinessPreviewPanel';
import StatsBar from './StatsBar';
import DataDisclaimer from './DataDisclaimer';
import detectNearbyCity from './geolocation';
import { CATEGORY_LABELS, CATEGORY_ICONS, FOOD_CATEGORIES, LOCATION_TYPE_META } from './categories';

// Lazy so maplibre-gl (a sizeable library) only downloads once the map is
// actually needed -- on desktop that's on load (split view), but on mobile
// it stays deferred until the List/Map toggle is switched to Map.
const BusinessMap = lazy(() => import('./BusinessMap'));

const SORTS = [
  { key: 'random', label: '🔀 Random' },
  { key: 'alpha', label: 'A–Z' },
  { key: 'rating', label: 'Top Rated' },
];

function SkeletonCard() {
  return (
    <div className="biz-skeleton-card">
      <div className="biz-skeleton" style={{ width: 84, height: 84, borderRadius: 16, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div className="biz-skeleton" style={{ width: '55%', height: 16, marginBottom: 8 }} />
        <div className="biz-skeleton" style={{ width: '35%', height: 12, marginBottom: 10 }} />
        <div className="biz-skeleton" style={{ width: '25%', height: 12 }} />
      </div>
    </div>
  );
}

const DESKTOP_QUERY = '(min-width: 960px)';

// Filters/search/sort survive a trip to a business's full profile page and
// back -- sessionStorage rather than URL params, kept simple since nothing
// here needs to be a shareable/bookmarkable link. Cleared automatically
// when the tab closes (sessionStorage, not localStorage) so it never goes
// stale across visits.
const SAVED_STATE_KEY = 'biz_directory_filters';
// Bump whenever the saved shape changes -- guards against a stale snapshot
// from an older version of this code (e.g. one saved before `nearbySelection`
// existed, or before the pin-click nearby fix) being silently reused and
// looking inconsistent with what the current code expects.
const SAVED_STATE_VERSION = 2;

function loadSavedFilters() {
  try {
    const raw = sessionStorage.getItem(SAVED_STATE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed.version === SAVED_STATE_VERSION ? parsed : {};
  } catch (_) {
    return {};
  }
}

/** Tracks whether the split (desktop) layout is active, so the caller can
 * ensure exactly one <BusinessMap> is ever mounted -- otherwise a resize
 * across the breakpoint could leave both the mobile toggle's map slot and
 * the persistent desktop map pane mounted at once. */
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
      <p style={{ fontSize: 32, marginBottom: 8 }}>🗺️</p>
      <p>The map couldn't load.</p>
      <p style={{ fontSize: 12, color: 'var(--muted-faint)' }}>{String(error?.message || error)}</p>
      <button className="gs-btn gs-btn-outline gs-btn-sm" style={{ marginTop: 8 }} onClick={retry}>Try again</button>
    </div>
  );
}

export default function BusinessDirectory() {
  const saved = loadSavedFilters();
  const [q, setQ] = useState(saved.q || '');
  const [debouncedQ, setDebouncedQ] = useState(saved.q || '');
  const [category, setCategory] = useState(saved.category || '');
  const [city, setCity] = useState(saved.city || '');
  const [debouncedCity, setDebouncedCity] = useState(saved.city || '');
  const [cityAuto, setCityAuto] = useState(saved.cityAuto || false);
  const [locationType, setLocationType] = useState(saved.locationType || '');
  const [foodOnly, setFoodOnly] = useState(saved.foodOnly || false);
  const [kashrutOnly, setKashrutOnly] = useState(saved.kashrutOnly || false);
  const [openNow, setOpenNow] = useState(saved.openNow || false);
  const [sort, setSort] = useState(saved.sort || 'random');
  const [shakeSeed, setShakeSeed] = useState(0);
  const [mobileView, setMobileView] = useState('list');
  const [bbox, setBbox] = useState(saved.bbox || null);
  // The exact point+radius behind a "find nearby" bbox (not set for a plain
  // "search this area" box) -- kept so the map can redraw the same pin and
  // circle after remounting, e.g. returning from a business's profile page.
  const [nearbySelection, setNearbySelection] = useState(saved.nearbySelection || null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const filterRef = useRef(null);
  const isDesktop = useIsDesktop();

  // Restoring the actual previous result list (not just the filters) matters
  // because the default sort is random -- re-running the same search with
  // identical filters still comes back as a different random sample/order
  // each time, which would make "go back" look different even though
  // nothing the user chose had changed.
  // An empty saved list isn't a meaningful snapshot to trust as "the
  // definitive answer" -- it could be a genuinely empty result from an
  // earlier search, or just never-populated leftover state. Either way,
  // treating it as authoritative meant a fresh visit that happened to reuse
  // a tab with one of those saved could show "No businesses match" forever,
  // with nothing to ever trigger a real fetch. Only a non-empty list is
  // worth skipping the initial fetch for.
  const hasSavedResults = Array.isArray(saved.businesses) && saved.businesses.length > 0;
  const [businesses, setBusinesses] = useState(saved.businesses || []);
  const [page, setPage] = useState(saved.page || 1);
  const [hasMore, setHasMore] = useState(saved.hasMore || false);
  const [loading, setLoading] = useState(!hasSavedResults);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedCity(city.trim()), 350);
    return () => clearTimeout(t);
  }, [city]);

  // Default the city filter to "near me" on first load, if the browser
  // will share a location and the user hasn't already typed one -- they can
  // always clear/change it afterward, this only ever sets an initial value.
  useEffect(() => {
    let cancelled = false;
    detectNearbyCity().then((found) => {
      if (found && !cancelled) {
        setCity((current) => {
          if (current) return current;
          setCityAuto(true);
          return found;
        });
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(SAVED_STATE_KEY, JSON.stringify({
        version: SAVED_STATE_VERSION,
        q, category, city, cityAuto, locationType, foodOnly, kashrutOnly, openNow, sort, bbox, nearbySelection,
        businesses, page, hasMore,
      }));
    } catch (_) { /* private browsing / storage disabled -- fine to just skip persisting */ }
  }, [q, category, city, cityAuto, locationType, foodOnly, kashrutOnly, openNow, sort, bbox, nearbySelection, businesses, page, hasMore]);

  useEffect(() => {
    if (!filterOpen) return undefined;
    const onOutside = (e) => { if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false); };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [filterOpen]);

  const load = useCallback((pageNum, append) => {
    if (append) setLoadingMore(true); else setLoading(true);
    setError(false);
    const params = new URLSearchParams({ page: pageNum, sort });
    if (debouncedQ) params.set('q', debouncedQ);
    if (category) params.set('category', category);
    if (debouncedCity) params.set('city', debouncedCity);
    if (locationType) params.set('location_type', locationType);
    if (foodOnly) params.set('food_only', '1');
    if (kashrutOnly) params.set('kashrut_only', '1');
    if (openNow) params.set('open_now', '1');
    if (bbox) {
      params.set('north', bbox.north); params.set('south', bbox.south);
      params.set('east', bbox.east); params.set('west', bbox.west);
    }
    apiRequest('GET', null, `/business/businesses?${params.toString()}`)
      .then((res) => {
        const list = res.businesses || [];
        setBusinesses((prev) => (append ? [...prev, ...list] : list));
        setHasMore(!!res.has_more);
        setPage(pageNum);
      })
      .catch(() => setError(true))
      .finally(() => { setLoading(false); setLoadingMore(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, category, debouncedCity, locationType, foodOnly, kashrutOnly, openNow, sort, shakeSeed, bbox]);

  // Skip fetching when the current filters exactly match what was already
  // restored/fetched -- comparing against a stored signature, NOT a
  // "have I run yet" flag. A one-shot ref flag looks right in isolation but
  // breaks under React.StrictMode (active in this app's index.js): StrictMode
  // deliberately invokes every effect twice right after mount to catch
  // exactly this kind of assumption, and a flag that's already been
  // consumed by the first of those two passes does nothing to stop the
  // second one from firing "for real" and immediately refetching over the
  // just-restored snapshot. Comparing signatures is idempotent regardless of
  // how many times the effect body actually runs.
  const lastLoadSignatureRef = useRef(hasSavedResults
    ? JSON.stringify([debouncedQ, category, debouncedCity, locationType, foodOnly, kashrutOnly, openNow, sort, bbox])
    : null);
  useEffect(() => {
    const signature = JSON.stringify([debouncedQ, category, debouncedCity, locationType, foodOnly, kashrutOnly, openNow, sort, bbox]);
    if (lastLoadSignatureRef.current === signature) return;
    lastLoadSignatureRef.current = signature;
    load(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  // Typing a new search/city, or shaking the board, implies the user wants
  // a fresh area rather than staying boxed into an earlier map "search this
  // area" click — but refining category/sort/etc. within that same map
  // viewport should keep it, so those are deliberately left out here.
  // Same signature-comparison approach as above, for the same StrictMode
  // reason -- a "skip the first run" ref flag would wipe a `bbox` just
  // restored from sessionStorage the moment StrictMode's second pass hits.
  const lastQCityShakeRef = useRef(JSON.stringify([debouncedQ, debouncedCity, shakeSeed]));
  useEffect(() => {
    const signature = JSON.stringify([debouncedQ, debouncedCity, shakeSeed]);
    if (lastQCityShakeRef.current === signature) return;
    lastQCityShakeRef.current = signature;
    setBbox(null);
    setNearbySelection(null);
  }, [debouncedQ, debouncedCity, shakeSeed]);

  // A selected pin's preview panel shouldn't linger once the underlying
  // list has changed out from under it (different filters/search/sort/area).
  useEffect(() => { setSelectedId(null); }, [debouncedQ, category, debouncedCity, locationType, foodOnly, kashrutOnly, openNow, sort, shakeSeed, bbox]);

  const shake = () => {
    if (shaking) return;
    setShaking(true);
    setSort('random');
    setShakeSeed((s) => s + 1);
    setTimeout(() => setShaking(false), 500);
  };

  const toggleCategory = (key) => setCategory((c) => (c === key ? '' : key));
  const showKashrutOption = foodOnly || (category && FOOD_CATEGORIES.has(category));
  const activeFilterCount = [category, debouncedCity && city, locationType, foodOnly, kashrutOnly, openNow].filter(Boolean).length;
  const countLabel = `${businesses.length}${hasMore ? '+' : ''} business${businesses.length === 1 && !hasMore ? '' : 'es'}`;

  const resultsList = (
    <>
      {loading && (<><SkeletonCard /><SkeletonCard /><SkeletonCard /></>)}
      {!loading && error && <div className="gs-error-box">Couldn't load the directory right now. Please try again.</div>}
      {!loading && !error && businesses.length === 0 && (
        <div className="gs-empty">
          <p style={{ fontSize: 40, marginBottom: 8 }}>🏪</p>
          <p>No businesses match your filters yet.</p>
        </div>
      )}
      {!loading && !error && businesses.map((b, i) => (
        <React.Fragment key={b.id}>
          <BusinessCard business={b} onHover={setHoveredId} active={hoveredId === b.id} />
          {i === 3 && <AdSlot placement="business_directory" />}
        </React.Fragment>
      ))}
      {!loading && !error && hasMore && (
        <div style={{ textAlign: 'center', paddingTop: 8, paddingBottom: 24 }}>
          <button className="gs-btn gs-btn-outline" onClick={() => load(page + 1, true)} disabled={loadingMore}>
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
      {!loading && !error && <DataDisclaimer />}
    </>
  );

  const selectedBusiness = selectedId ? businesses.find((b) => b.id === selectedId) : null;

  const mapView = (
    <ErrorBoundary fallback={MapErrorFallback}>
      <Suspense fallback={<div className="gs-loading"><div className="gs-spinner" /> Loading map…</div>}>
        <BusinessMap
          businesses={businesses}
          onBoundsSearch={(box) => { setBbox(box); setNearbySelection(null); }}
          onNearbySearch={({ bbox: box, point, radius }) => { setBbox(box); setNearbySelection({ point, radius }); }}
          initialNearby={nearbySelection}
          hoveredId={hoveredId}
          onSelectBusiness={(id) => {
            setSelectedId(id);
            if (!isDesktop) setMobileView('list'); // the preview only ever renders in the list column
          }}
        />
      </Suspense>
    </ErrorBoundary>
  );

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 1180 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
          <h1 style={{ margin: 0 }}>🏪 Business Directory</h1>
          <button className="gs-btn gs-btn-outline" onClick={shake} disabled={shaking}>
            {shaking ? 'shaking…' : '🔀 Shake the board'}
          </button>
        </div>
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>
          Find local Jewish-owned businesses — results come back in a random order by default so
          newer and less-discovered listings get seen too. Pick A–Z if you want it predictable.
        </p>

        <StatsBar />

        <div style={{ marginBottom: 16 }}>
          <PinSomethingCard to="/business/new" prompt="Own a business? Add it to the directory — free." cta="List your business" />
        </div>

        <div className="biz-directory-split">
          <div className="biz-directory-list">
            <div className="biz-topbar">
              <input
                type="text"
                className="auth-input biz-topbar-search"
                placeholder="🔎 Search by name or about…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <div ref={filterRef}>
                <button
                  type="button"
                  className={`biz-filter-toggle${activeFilterCount ? ' has-active' : ''}`}
                  onClick={() => setFilterOpen((o) => !o)}
                >
                  ⚙ Filters {activeFilterCount > 0 && <span className="biz-filter-count">{activeFilterCount}</span>}
                </button>
                {filterOpen && (
                  <div className="biz-filter-panel">
                    <div className="biz-filter-panel-section">
                      <div className="biz-filter-panel-label">Category</div>
                      <div className="biz-chip-row">
                        <button type="button" className={`biz-chip${!category ? ' active' : ''}`} onClick={() => setCategory('')}>All</button>
                        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                          <button key={key} type="button" className={`biz-chip${category === key ? ' active' : ''}`} onClick={() => toggleCategory(key)}>
                            {CATEGORY_ICONS[key] || '🏪'} {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="biz-filter-panel-section">
                      <div className="biz-filter-panel-label">Location</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <input
                          type="text"
                          className="auth-input"
                          style={{ maxWidth: 140 }}
                          placeholder="📍 City"
                          value={city}
                          onChange={(e) => { setCity(e.target.value); setCityAuto(false); }}
                        />
                        {cityAuto && city && (
                          <span className="biz-badge biz-badge-open" title="Defaulted to your location — edit or clear to change it">📍 Near you</span>
                        )}
                        <select className="auth-input" style={{ maxWidth: 180 }} value={locationType} onChange={(e) => setLocationType(e.target.value)}>
                          <option value="">Any location type</option>
                          {Object.entries(LOCATION_TYPE_META).map(([key, meta]) => (
                            <option key={key} value={key}>{meta.icon} {meta.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="biz-filter-panel-section">
                      <div className="biz-filter-panel-label">Quick filters</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button type="button" className={`biz-chip${foodOnly ? ' active' : ''}`} onClick={() => setFoodOnly((v) => { if (v) setKashrutOnly(false); return !v; })}>🍽️ Food only</button>
                        <button type="button" className={`biz-chip${openNow ? ' active' : ''}`} onClick={() => setOpenNow((v) => !v)}>🕒 Open now</button>
                        {showKashrutOption && (
                          <button type="button" className={`biz-chip gold-active${kashrutOnly ? ' active' : ''}`} onClick={() => setKashrutOnly((v) => !v)}>✡️ Kosher info</button>
                        )}
                      </div>
                    </div>
                    <div className="biz-filter-panel-section">
                      <div className="biz-filter-panel-label">Sort</div>
                      <div className="biz-segmented">
                        {SORTS.map((s) => (
                          <button key={s.key} type="button" className={`biz-segmented-btn${sort === s.key ? ' active' : ''}`} onClick={() => setSort(s.key)}>{s.label}</button>
                        ))}
                      </div>
                    </div>
                    <div className="biz-filter-panel-footer">
                      <span className="biz-result-count">{countLabel}</span>
                      <button
                        type="button"
                        className="gs-btn gs-btn-outline gs-btn-sm"
                        onClick={() => { setCategory(''); setCity(''); setCityAuto(false); setLocationType(''); setFoodOnly(false); setKashrutOnly(false); setOpenNow(false); }}
                      >
                        Clear all
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <span className="biz-result-count" style={{ marginLeft: 'auto' }}>{!loading && !error ? countLabel : ' '}</span>
            </div>

            {!isDesktop && (
              <div className="biz-mobile-toggle">
                <div className="biz-segmented">
                  <button type="button" className={`biz-segmented-btn${mobileView === 'list' ? ' active' : ''}`} onClick={() => setMobileView('list')}>☰ List</button>
                  <button type="button" className={`biz-segmented-btn${mobileView === 'map' ? ' active' : ''}`} onClick={() => setMobileView('map')}>🗺️ Map</button>
                </div>
              </div>
            )}

            {!isDesktop && mobileView === 'map' ? mapView : (
              selectedBusiness
                ? <BusinessPreviewPanel business={selectedBusiness} onBack={() => setSelectedId(null)} />
                : resultsList
            )}
          </div>

          {isDesktop && (
            <div className="biz-directory-mappane">
              {mapView}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
