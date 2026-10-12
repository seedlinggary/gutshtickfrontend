import React, { useCallback, useEffect, useRef, useState, Suspense, lazy } from 'react';
import apiRequest from '../ApiRequest';
import PinSomethingCard from '../PinSomethingCard';
import AdSlot from '../ads/AdSlot';
import ErrorBoundary from '../ErrorBoundary';
import BusinessCard from './BusinessCard';
import BusinessPreviewPanel from './BusinessPreviewPanel';
import StatsBar from './StatsBar';
import DataDisclaimer from './DataDisclaimer';
import { getBrowserCoordsDetailed, radiusToBbox, GEO_PERMISSION_DENIED, GEO_UNSUPPORTED } from './geolocation';
import { CATEGORY_LABELS, FOOD_CATEGORIES, LOCATION_TYPE_META } from './categories';
import CategoryIcon from './CategoryIcon';
import CompareTray, { useCompareTray } from './CompareTray';
import { useLanguage } from './i18n';
import {
  Shuffle, Map, Store, Search, SlidersHorizontal, MapPin, UtensilsCrossed,
  Clock, ShieldCheck, Menu, HeartHandshake,
} from 'lucide-react';

const DIRECTORY_SUBTITLE = 'Every listing here is a real Jewish-owned business, added by its neighbors or its owner. Results come back in a random order by default so newer and less-discovered ones get seen too — pick A–Z if you want it predictable.';
const COMMUNITY_SUBTITLE = 'Shuls and chessed organizations, in their own area rather than mixed in with restaurants and retail. Results come back in a random order by default so newer and less-discovered ones get seen too — pick A–Z if you want it predictable.';

// Shuls and chessed organizations (nonprofits) live in their own Community
// area rather than the regular Business directory -- gemachs and kollels
// stay put. The Directory always excludes these two; the Community page
// shows only them (optionally narrowed to just one via its own category
// chips). See list_businesses()'s categories/exclude_categories params.
const COMMUNITY_CATEGORIES = ['shul', 'nonprofit'];

// Default radius for the one-click "Near me" masthead button.
const NEAR_ME_RADIUS_MILES = 10;

// Lazy so maplibre-gl (a sizeable library) only downloads once the map is
// actually needed -- on desktop that's on load (split view), but on mobile
// it stays deferred until the List/Map toggle is switched to Map.
const BusinessMap = lazy(() => import('./BusinessMap'));

const SORTS = [
  { key: 'random', label: 'Random' },
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
// stale across visits. Keyed separately per mode so the Directory and the
// Community page don't clobber each other's saved filters.
function savedStateKey(mode) {
  return mode === 'community' ? 'biz_community_filters' : 'biz_directory_filters';
}
// Bump whenever the saved shape changes -- guards against a stale snapshot
// from an older version of this code (e.g. one saved before `nearbySelection`
// existed, or before the pin-click nearby fix) being silently reused and
// looking inconsistent with what the current code expects.
const SAVED_STATE_VERSION = 2;

function loadSavedFilters(mode) {
  try {
    const raw = sessionStorage.getItem(savedStateKey(mode));
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
      <Map size={32} style={{ marginBottom: 8, color: 'var(--muted-faint)' }} />
      <p>The map couldn't load.</p>
      <p style={{ fontSize: 12, color: 'var(--muted-faint)' }}>{String(error?.message || error)}</p>
      <button className="gs-btn gs-btn-outline gs-btn-sm" style={{ marginTop: 8 }} onClick={retry}>Try again</button>
    </div>
  );
}

export default function BusinessDirectory({ mode = 'business' }) {
  const isCommunity = mode === 'community';
  const saved = loadSavedFilters(mode);
  const [q, setQ] = useState(saved.q || '');
  const [debouncedQ, setDebouncedQ] = useState(saved.q || '');
  const [category, setCategory] = useState(saved.category || '');
  const [city, setCity] = useState(saved.city || '');
  const [debouncedCity, setDebouncedCity] = useState(saved.city || '');
  const [locationType, setLocationType] = useState(saved.locationType || '');
  const [foodOnly, setFoodOnly] = useState(saved.foodOnly || false);
  const [kashrutOnly, setKashrutOnly] = useState(saved.kashrutOnly || false);
  const [openNow, setOpenNow] = useState(saved.openNow || false);
  const [sort, setSort] = useState(saved.sort || 'random');
  const [nearCoords, setNearCoords] = useState(saved.nearCoords || null);
  const [locating, setLocating] = useState(false);
  const [nearMeError, setNearMeError] = useState(null);
  const compareTray = useCompareTray();
  const { t } = useLanguage();
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
  // The true count of businesses matching the current filters (from the
  // backend's own count query), not just how many cards are loaded so far --
  // `businesses.length` only ever reflects what's been paged in.
  const [total, setTotal] = useState(typeof saved.total === 'number' ? saved.total : null);
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

  // There used to be an effect here that silently called the browser's
  // geolocation API on every page load to auto-fill this city field --
  // removed because it was quietly burning the ONE permission prompt a
  // browser gives an origin: a visitor who ignored/dismissed that silent
  // background prompt (easy to do, since nothing on screen explained why a
  // location permission bar had appeared) left the permission decided
  // before "Near me" ever got a chance to ask for itself, so the explicit
  // button below just silently failed with no prompt at all. Asking for
  // location only when the user deliberately clicks something that needs
  // it (Near me, the map's Find nearby) is the only way to guarantee that
  // action gets its own real shot at the permission prompt.
  useEffect(() => {
    try {
      sessionStorage.setItem(savedStateKey(mode), JSON.stringify({
        version: SAVED_STATE_VERSION,
        q, category, city, locationType, foodOnly, kashrutOnly, openNow, sort, bbox, nearbySelection, nearCoords,
        businesses, page, hasMore, total,
      }));
    } catch (_) { /* private browsing / storage disabled -- fine to just skip persisting */ }
  }, [mode, q, category, city, locationType, foodOnly, kashrutOnly, openNow, sort, bbox, nearbySelection, nearCoords, businesses, page, hasMore, total]);

  useEffect(() => {
    if (!filterOpen) return undefined;
    const onOutside = (e) => { if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false); };
    const onKeyDown = (e) => { if (e.key === 'Escape') setFilterOpen(false); };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [filterOpen]);

  const load = useCallback((pageNum, append) => {
    if (append) setLoadingMore(true); else setLoading(true);
    setError(false);
    const params = new URLSearchParams({ page: pageNum, sort });
    if (debouncedQ) params.set('q', debouncedQ);
    if (category) {
      params.set('category', category);
    } else if (isCommunity) {
      params.set('categories', COMMUNITY_CATEGORIES.join(','));
    } else {
      params.set('exclude_categories', COMMUNITY_CATEGORIES.join(','));
    }
    if (debouncedCity) params.set('city', debouncedCity);
    if (locationType) params.set('location_type', locationType);
    if (foodOnly) params.set('food_only', '1');
    if (kashrutOnly) params.set('kashrut_only', '1');
    if (openNow) params.set('open_now', '1');
    if (sort === 'distance' && nearCoords) {
      params.set('lat', nearCoords.lat); params.set('lng', nearCoords.lng);
    }
    if (bbox) {
      params.set('north', bbox.north); params.set('south', bbox.south);
      params.set('east', bbox.east); params.set('west', bbox.west);
    }
    apiRequest('GET', null, `/business/businesses?${params.toString()}`)
      .then((res) => {
        const list = res.businesses || [];
        setBusinesses((prev) => (append ? [...prev, ...list] : list));
        setHasMore(!!res.has_more);
        setTotal(typeof res.total === 'number' ? res.total : null);
        setPage(pageNum);
      })
      .catch(() => setError(true))
      .finally(() => { setLoading(false); setLoadingMore(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCommunity, debouncedQ, category, debouncedCity, locationType, foodOnly, kashrutOnly, openNow, sort, shakeSeed, bbox, nearCoords]);

  // "Near me" actually restricts results to a real radius around the user
  // (same bbox math the map's "Find nearby" uses) -- it used to just set
  // sort=distance, which only re-orders results by distance with no cutoff
  // at all, so "near me" never excluded anything far away; it was also
  // bundled with openNow, so this doubled as a confusing "and only if
  // currently open" filter nobody asked for. Those are now independent --
  // see the separate "Open now" chip.
  const findNearMe = () => {
    setLocating(true);
    setNearMeError(null);
    getBrowserCoordsDetailed().then(({ coords, error }) => {
      setLocating(false);
      if (!coords) {
        // Most real failures here are "still waiting on a fix" (timeout) or
        // "no position available" (no GPS/WiFi signal to triangulate from),
        // not an actual block -- a blanket "check your permission" message
        // was wrong more often than right and sent people to the wrong
        // settings screen. Only a real PERMISSION_DENIED points there now --
        // though even that code name is misleading: on Windows/macOS,
        // Chrome/Edge/Safari all report this exact same error when the
        // OPERATING SYSTEM's own location toggle is off, even if the site's
        // own per-site permission was never touched (the browser can't even
        // ask the OS for a position, so it reports it as denied). That's at
        // least as common a cause as an actual site-level block, so the
        // message has to send people to both places, not just one.
        if (error === GEO_PERMISSION_DENIED) {
          setNearMeError("Location access was denied. Two things to check: (1) your browser's site settings for this page -- the icon left of the address bar -- make sure Location isn't set to Block; (2) your computer's own Location Services setting (Windows: Settings > Privacy & security > Location; Mac: System Settings > Privacy & Security > Location Services) -- make sure it's on and your browser is allowed.");
        } else if (error === GEO_UNSUPPORTED) {
          setNearMeError("This browser doesn't support location lookup -- try typing a city instead.");
        } else {
          setNearMeError("Couldn't get your location -- this can take a moment on some connections, try again.");
        }
        return;
      }
      setNearCoords(coords);
      setSort('distance');
      setBbox(radiusToBbox(coords, NEAR_ME_RADIUS_MILES));
      setNearbySelection({ point: coords, radius: NEAR_ME_RADIUS_MILES });
    });
  };

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
    ? JSON.stringify([debouncedQ, category, debouncedCity, locationType, foodOnly, kashrutOnly, openNow, sort, bbox, shakeSeed, nearCoords])
    : null);
  useEffect(() => {
    // shakeSeed has to be part of this signature, not just of `load`'s own
    // deps -- "Shake the board" only ever changes `sort` when it wasn't
    // already 'random' (its default), so a shake while already on random
    // sort produced a `load` with a new identity but a signature identical
    // to the last one, and this effect silently no-opped: the button
    // flashed "shaking…" for its local half-second timeout and reverted,
    // but no fetch ever went out and the list never actually changed.
    // nearCoords is included for the same reason -- "open now near me" can
    // be pressed again after moving, which only changes nearCoords.
    const signature = JSON.stringify([debouncedQ, category, debouncedCity, locationType, foodOnly, kashrutOnly, openNow, sort, bbox, shakeSeed, nearCoords]);
    if (lastLoadSignatureRef.current === signature) return;
    lastLoadSignatureRef.current = signature;
    load(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  // Typing a new search/city implies the user wants a fresh area rather than
  // staying boxed into an earlier map "search this area" click -- but
  // refining category/sort/etc. (or shaking the board) within that same map
  // viewport should keep it, so those are deliberately left out here.
  // shakeSeed used to be included on the theory that shaking also "wants a
  // fresh area" -- but that's backwards from what shaking the board is for
  // (reroll within whatever's currently in view/filtered, not reset it), and
  // it raced with the effect below: shaking sets shakeSeed, which changed
  // `load`'s identity and fired a fetch WITH the still-set bbox, then this
  // effect cleared bbox a moment later and fired a SECOND fetch without it --
  // two in-flight requests for one shake, with no ordering guarantee between
  // them, so the one that lost the race could silently overwrite the other's
  // (correct) results. That's what made shaking look flaky, especially right
  // after a "search this area"/"find nearby" click or two shakes in a row.
  // Same signature-comparison approach as above, for the same StrictMode
  // reason -- a "skip the first run" ref flag would wipe a `bbox` just
  // restored from sessionStorage the moment StrictMode's second pass hits.
  const lastQCityRef = useRef(JSON.stringify([debouncedQ, debouncedCity]));
  useEffect(() => {
    const signature = JSON.stringify([debouncedQ, debouncedCity]);
    if (lastQCityRef.current === signature) return;
    lastQCityRef.current = signature;
    setBbox(null);
    setNearbySelection(null);
  }, [debouncedQ, debouncedCity]);

  // A selected pin's preview panel shouldn't linger once the underlying
  // list has changed out from under it (different filters/search/sort/area).
  useEffect(() => { setSelectedId(null); }, [debouncedQ, category, debouncedCity, locationType, foodOnly, kashrutOnly, openNow, sort, shakeSeed, bbox, nearCoords]);

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
  const clearAdvancedFilters = () => {
    setCategory(''); setCity(''); setLocationType('');
    setFoodOnly(false); setKashrutOnly(false); setOpenNow(false);
  };
  // A broader reset than the filter panel's own "Clear all" -- also drops the
  // search box and any map-drawn area, since someone staring at zero results
  // most likely wants a clean slate, not just the advanced filters cleared.
  const clearEverything = () => {
    clearAdvancedFilters();
    setQ('');
    setBbox(null);
    setNearbySelection(null);
  };
  const hasAnyFilter = activeFilterCount > 0 || !!q.trim() || !!bbox;
  // Prefer the backend's real count of everything matching the current
  // filters; fall back to "how many cards are loaded so far" (with a "+"
  // hinting there's more) only for an older cached snapshot that predates
  // the backend returning `total` at all.
  const resultNoun = (n) => (isCommunity ? `listing${n === 1 ? '' : 's'}` : `business${n === 1 ? '' : 'es'}`);
  const countLabel = typeof total === 'number'
    ? `${total} ${resultNoun(total)}`
    : `${businesses.length}${hasMore ? '+' : ''} ${resultNoun(hasMore ? 2 : businesses.length)}`;

  const resultsList = (
    <>
      {loading && (<><SkeletonCard /><SkeletonCard /><SkeletonCard /></>)}
      {!loading && error && <div className="gs-error-box">Couldn't load {isCommunity ? 'the community area' : 'the directory'} right now. Please try again.</div>}
      {!loading && !error && businesses.length === 0 && (
        <div className="gs-empty">
          <Store size={40} style={{ marginBottom: 8, color: 'var(--muted-faint)' }} />
          <p>No {isCommunity ? 'shuls or organizations' : 'businesses'} match your filters yet.</p>
          {hasAnyFilter && (
            <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={clearEverything}>
              Clear search &amp; filters
            </button>
          )}
        </div>
      )}
      {!loading && !error && businesses.map((b, i) => (
        <React.Fragment key={b.id}>
          <BusinessCard
            business={b} onHover={setHoveredId} active={hoveredId === b.id}
            onCompareToggle={compareTray.toggle} isComparing={compareTray.isSelected(b.id)}
          />
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
        <div className="biz-masthead">
          <div className="biz-masthead-row">
            <div className="biz-masthead-copy">
              <div className="biz-masthead-kicker">
                {isCommunity ? <><HeartHandshake size={13} /> The Community</> : <><Store size={13} /> The Directory</>}
              </div>
              <h1 className="biz-masthead-title">
                {isCommunity ? 'Find a shul or community organization' : 'Find your next favorite local business'}
              </h1>
              <p className="biz-masthead-sub">{isCommunity ? COMMUNITY_SUBTITLE : DIRECTORY_SUBTITLE}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className={`biz-shake-btn${nearbySelection && sort === 'distance' ? ' active' : ''}`}
                  onClick={findNearMe}
                  disabled={locating}
                  title={`Show only listings within ${NEAR_ME_RADIUS_MILES} miles of your location`}
                >
                  <MapPin size={15} /> {locating ? 'Locating…' : t('nearMe')}
                </button>
                <button className="biz-shake-btn" onClick={shake} disabled={shaking}>
                  <Shuffle size={15} className={shaking ? 'biz-shake-spin' : ''} /> {shaking ? 'Shaking…' : 'Shake the board'}
                </button>
              </div>
              {nearMeError && (
                <p style={{ fontSize: 12, color: '#ffb4a8', margin: 0, maxWidth: 260, textAlign: 'right' }}>{nearMeError}</p>
              )}
            </div>
          </div>
          <StatsBar scope={isCommunity ? 'community' : 'business'} />
        </div>

        <div className="biz-list-cta">
          {isCommunity ? (
            <PinSomethingCard to="/business/new" prompt="Run a shul or chessed organization? Add it — free." cta="List your organization" />
          ) : (
            <PinSomethingCard to="/business/new" prompt="Own a business? Add it to the directory — free." cta="List your business" />
          )}
        </div>

        <div className="biz-directory-split">
          <div className="biz-directory-list">
            <div className="biz-topbar">
              <div className="biz-input-icon-wrap biz-topbar-search">
                <Search size={15} />
                <input
                  type="text"
                  className="auth-input"
                  placeholder="Search by name or about…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <div ref={filterRef}>
                <button
                  type="button"
                  className={`biz-filter-toggle${activeFilterCount ? ' has-active' : ''}`}
                  onClick={() => setFilterOpen((o) => !o)}
                >
                  <SlidersHorizontal size={14} /> Filters {activeFilterCount > 0 && <span className="biz-filter-count">{activeFilterCount}</span>}
                </button>
                {filterOpen && (
                  <div className="biz-filter-panel">
                    <div className="biz-filter-panel-section">
                      <div className="biz-filter-panel-label">Category</div>
                      <div className="biz-chip-row">
                        <button type="button" className={`biz-chip${!category ? ' active' : ''}`} onClick={() => setCategory('')}>All</button>
                        {Object.entries(CATEGORY_LABELS)
                          .filter(([key]) => isCommunity === COMMUNITY_CATEGORIES.includes(key))
                          .map(([key, label]) => (
                            <button key={key} type="button" className={`biz-chip${category === key ? ' active' : ''}`} onClick={() => toggleCategory(key)}>
                              <CategoryIcon category={key} size={14} /> {label}
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
                          placeholder="City"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                        />
                        <select className="auth-input" style={{ maxWidth: 180 }} value={locationType} onChange={(e) => setLocationType(e.target.value)}>
                          <option value="">Any location type</option>
                          {Object.entries(LOCATION_TYPE_META).map(([key, meta]) => (
                            <option key={key} value={key}>{meta.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="biz-filter-panel-section">
                      <div className="biz-filter-panel-label">Quick filters</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {!isCommunity && (
                          <button type="button" className={`biz-chip${foodOnly ? ' active' : ''}`} onClick={() => setFoodOnly((v) => { if (v) setKashrutOnly(false); return !v; })}><UtensilsCrossed size={13} /> Food only</button>
                        )}
                        <button type="button" className={`biz-chip${openNow ? ' active' : ''}`} onClick={() => setOpenNow((v) => !v)}><Clock size={13} /> Open now</button>
                        {showKashrutOption && (
                          <button type="button" className={`biz-chip gold-active${kashrutOnly ? ' active' : ''}`} onClick={() => setKashrutOnly((v) => !v)}><ShieldCheck size={13} /> Kosher info</button>
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
                        onClick={clearAdvancedFilters}
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
                  <button type="button" className={`biz-segmented-btn${mobileView === 'list' ? ' active' : ''}`} onClick={() => setMobileView('list')}><Menu size={14} /> List</button>
                  <button type="button" className={`biz-segmented-btn${mobileView === 'map' ? ' active' : ''}`} onClick={() => setMobileView('map')}><Map size={14} /> Map</button>
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
      <CompareTray items={compareTray.items} onRemove={(id) => compareTray.toggle({ id })} onClear={compareTray.clear} />
    </div>
  );
}
