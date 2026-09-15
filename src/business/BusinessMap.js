import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// OpenFreeMap: free vector tiles, no API key, no rate limits, self-hostable.
// https://openfreemap.org
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const DEFAULT_CENTER = [-74.006, 40.7128]; // [lng, lat] -- NYC, until pins load
const DEFAULT_ZOOM = 10;
const STREET_ZOOM = 16;
// Below this zoom, a 0.5-10 mile radius isn't visually meaningful (could be
// a few pixels on screen) and a click's real-world position is imprecise --
// see dropNearbyPoint below.
const NEARBY_MIN_ZOOM = 11;
const SOURCE_ID = 'gs-businesses';
const NEARBY_SOURCE_ID = 'gs-nearby-circle';
const NEARBY_RADII = [0.5, 1, 5, 10];
// Shared with the bbox math below so the drawn circle's N/S/E/W extent
// visually matches the actual search area sent to the backend.
const MILES_PER_DEGREE_LAT = 69;

function radiusToBbox(point, miles) {
  const latDelta = miles / MILES_PER_DEGREE_LAT;
  const lngDelta = miles / (MILES_PER_DEGREE_LAT * Math.cos((point.lat * Math.PI) / 180));
  return {
    north: point.lat + latDelta, south: point.lat - latDelta,
    east: point.lng + lngDelta, west: point.lng - lngDelta,
  };
}

// A polygon approximation of a circle (GL styles have no native circle-by-
// real-world-radius geometry) -- purely a visual reference for the area the
// bbox above actually searches, not sent anywhere itself.
function circlePolygon(point, miles) {
  const latDelta = miles / MILES_PER_DEGREE_LAT;
  const lngDelta = miles / (MILES_PER_DEGREE_LAT * Math.cos((point.lat * Math.PI) / 180));
  const steps = 64;
  const coords = [];
  for (let i = 0; i <= steps; i += 1) {
    const theta = (i / steps) * 2 * Math.PI;
    coords.push([point.lng + lngDelta * Math.cos(theta), point.lat + latDelta * Math.sin(theta)]);
  }
  return { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] }, properties: {} }] };
}

const EMPTY_FC = { type: 'FeatureCollection', features: [] };

// OpenFreeMap's "liberty" style is built on the OpenMapTiles schema:
// - Its `boundary` source-layer tags disputed borders (the Green Line /
//   West Bank boundary, Kashmir, Crimea, etc.) with a `disputed` field
//   distinct from ordinary admin borders.
// - Its `place` source-layer draws country/region name labels, including
//   a "Palestine"/"Palestinian Territories" label over the West Bank/Gaza.
// Rather than hope no layer happens to render either, both are explicitly
// filtered out below so neither can ever be drawn -- Israel reads as one
// contiguous area with no line or label distinguishing Yehuda VeShomron.
//
// This runs *after* the map has loaded its style (via map.setFilter), not
// by pre-fetching+mutating the style JSON ourselves -- handing MapLibre a
// pre-parsed style object instead of a URL string means it can't resolve
// that style's own relative sprite/glyph/source references against a base
// URL, which silently breaks icons/labels. Passing the URL string and
// patching filters post-load gets the same guaranteed result without that
// risk.
// Verified against the live style (tiles.openfreemap.org/styles/liberty):
// country-name labels are their own layers (id "label_country_1/2/3"),
// separate from city/town/village labels -- scoping the name-text filter to
// just those (rather than every `place` layer) matters because there are
// real, unrelated towns literally named Palestine (Texas, Illinois,
// Arkansas, ...) whose labels must stay untouched.
const PLACE_NAME_FIELDS = ['name', 'name:en', 'name_en', 'name:latin', 'name_int'];

function sanitizeMapStyle(map) {
  const layers = map.getStyle()?.layers || [];
  const notDisputedBoundary = ['!=', ['get', 'disputed'], 1];
  const notPalestineLabel = ['all',
    ...PLACE_NAME_FIELDS.map((f) => ['!', ['in', 'palestin', ['downcase', ['coalesce', ['get', f], '']]]]),
    ['!=', ['coalesce', ['get', 'iso_a2'], ''], 'PS'],
  ];

  layers.forEach((layer) => {
    let extra = null;
    if (layer['source-layer'] === 'boundary') extra = notDisputedBoundary;
    else if (layer['source-layer'] === 'place' && /country/i.test(layer.id)) extra = notPalestineLabel;
    if (!extra) return;
    const existing = map.getFilter(layer.id);
    map.setFilter(layer.id, existing ? ['all', existing, extra] : extra);
  });
}

function toFeatureCollection(businesses) {
  const features = [];
  businesses.forEach((b) => {
    (b.locations || (b.primary_location ? [b.primary_location] : [])).forEach((loc) => {
      if (loc && loc.lat != null && loc.lng != null) {
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [loc.lng, loc.lat] },
          properties: { id: b.id, name: b.name, slug: b.slug, city: loc.city || '' },
        });
      }
    });
  });
  return { type: 'FeatureCollection', features };
}

function boundsOfFeatures(fc) {
  if (fc.features.length === 0) return null;
  const bounds = new maplibregl.LngLatBounds();
  fc.features.forEach((f) => bounds.extend(f.geometry.coordinates));
  return bounds;
}

/** Plots one pin per (business, location) pair with lat/lng set, clustered
 * when there are many. `onBoundsSearch(bbox)` — if given — enables a
 * "search this area" button once the user pans/zooms manually, and also
 * powers the "find nearby" radius search below.
 * `hoveredId` — if given — highlights that business's pin gold, for the
 * split-view Directory hovering a card in the list.
 * `onSelectBusiness(id)` — if given, clicking a pin flies the map to street
 * level at that pin and reports the id back up (the Directory shows a
 * preview panel for it) instead of this component navigating anywhere
 * itself.
 * `onNearbySearch({bbox, point, radius})` — called instead of
 * `onBoundsSearch` when the area comes from "find nearby" rather than
 * "search this area", so the Directory can remember the exact point+radius
 * (not just the resulting box) and hand it back via `initialNearby` to
 * redraw the same pin+circle after remounting -- e.g. after visiting a
 * business's profile page and clicking back, per an explicit user request
 * that this look identical to how they left it.
 * `initialNearby` — `{point:{lat,lng}, radius}` to redraw on mount, when
 * resuming a previous "find nearby" search rather than starting fresh. */
export default function BusinessMap({ businesses, onBoundsSearch, hoveredId, onSelectBusiness, onNearbySearch, initialNearby }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const loadedRef = useRef(false);
  const businessesRef = useRef(businesses);
  const skipNextFitRef = useRef(false);
  const nearbyModeRef = useRef(false);
  const nearbyMarkerRef = useRef(null);
  const [showSearchArea, setShowSearchArea] = useState(false);
  const [styleError, setStyleError] = useState(false);
  const [nearbyMode, setNearbyMode] = useState(false);
  const [nearbyPoint, setNearbyPoint] = useState(null);

  useEffect(() => { businessesRef.current = businesses; }, [businesses]);
  useEffect(() => { nearbyModeRef.current = nearbyMode; }, [nearbyMode]);

  // Mount the map once.
  useEffect(() => {
    let cancelled = false;
    let map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: STYLE_URL,
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        attributionControl: { compact: true },
      });
    } catch (err) {
      setStyleError(true);
      return undefined;
    }
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.on('error', (e) => {
      // eslint-disable-next-line no-console
      console.error('MapLibre error:', e?.error || e);
    });

    map.on('load', () => {
      if (cancelled) return;
      try {
        sanitizeMapStyle(map);
        map.addSource(SOURCE_ID, {
          type: 'geojson',
          data: toFeatureCollection(businessesRef.current),
          cluster: true,
          clusterRadius: 46,
          clusterMaxZoom: 15,
        });
        map.addLayer({
          id: 'gs-clusters', type: 'circle', source: SOURCE_ID,
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': '#1c2438',
            'circle-radius': ['step', ['get', 'point_count'], 16, 10, 20, 50, 26],
            'circle-stroke-width': 3,
            'circle-stroke-color': 'rgba(212,162,76,0.55)',
          },
        });
        map.addLayer({
          id: 'gs-cluster-count', type: 'symbol', source: SOURCE_ID,
          filter: ['has', 'point_count'],
          layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 13, 'text-font': ['Noto Sans Bold'] },
          paint: { 'text-color': '#ffffff' },
        });
        map.addLayer({
          id: 'gs-unclustered', type: 'circle', source: SOURCE_ID,
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': '#1c2438',
            'circle-radius': 8,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
        });

        // "Find nearby" radius circle -- purely visual, empty until a
        // center point + radius are picked below.
        map.addSource(NEARBY_SOURCE_ID, { type: 'geojson', data: EMPTY_FC });
        map.addLayer({
          id: 'gs-nearby-fill', type: 'fill', source: NEARBY_SOURCE_ID,
          paint: { 'fill-color': '#d4a24c', 'fill-opacity': 0.12 },
        });
        map.addLayer({
          id: 'gs-nearby-line', type: 'line', source: NEARBY_SOURCE_ID,
          paint: { 'line-color': '#d4a24c', 'line-width': 2, 'line-dasharray': [2, 2] },
        });

        map.on('mouseenter', 'gs-clusters', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'gs-clusters', () => { map.getCanvas().style.cursor = ''; });
        map.on('mouseenter', 'gs-unclustered', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'gs-unclustered', () => { map.getCanvas().style.cursor = ''; });

        map.on('click', 'gs-clusters', (e) => {
          const [feature] = map.queryRenderedFeatures(e.point, { layers: ['gs-clusters'] });
          if (!feature) return;
          const clusterId = feature.properties.cluster_id;
          map.getSource(SOURCE_ID).getClusterExpansionZoom(clusterId).then((zoom) => {
            map.easeTo({ center: feature.geometry.coordinates, zoom });
          }).catch(() => {});
        });

        // A radius of a few miles is meaningless -- and effectively
        // unclickable -- at a zoomed-out view (the directory's default view
        // fits bounds to every business worldwide, which can mean a whole
        // continent on screen). Dropping a nearby-search point always zooms
        // in to at least this level first, so the pick lands where the user
        // can actually see it and the radius circle is a real, visible size.
        const dropNearbyPoint = (point) => {
          setNearbyPoint(point);
          if (map.getZoom() < NEARBY_MIN_ZOOM) {
            map.flyTo({ center: [point.lng, point.lat], zoom: NEARBY_MIN_ZOOM });
          }
        };

        map.on('click', 'gs-unclustered', (e) => {
          const [feature] = e.features || [];
          if (!feature) return;
          if (nearbyModeRef.current) {
            // In "find nearby" mode, clicking an existing pin uses that
            // business's own location as the search center -- just as valid
            // a thing to click as empty map space.
            dropNearbyPoint({ lng: feature.geometry.coordinates[0], lat: feature.geometry.coordinates[1] });
            return;
          }
          map.flyTo({ center: feature.geometry.coordinates, zoom: STREET_ZOOM });
          if (onSelectBusiness) onSelectBusiness(feature.properties.id);
        });

        // "Find nearby": while armed, a click anywhere on the map that
        // didn't land on a pin (handled above, which sets the point itself
        // in that case) drops a center point for the radius picker below.
        map.on('click', (e) => {
          if (!nearbyModeRef.current) return;
          const hits = map.queryRenderedFeatures(e.point, { layers: ['gs-unclustered'] });
          if (hits.length > 0) return;
          dropNearbyPoint({ lng: e.lngLat.lng, lat: e.lngLat.lat });
        });

        // Only user-driven moves (drag/scroll/pinch) carry an
        // `originalEvent` -- programmatic fitBounds/easeTo calls don't --
        // so this fires the "search this area" affordance for real
        // interactions only, never for our own re-centering.
        map.on('moveend', (e) => {
          if (e.originalEvent && onBoundsSearch) setShowSearchArea(true);
        });

        loadedRef.current = true;
        const fc = toFeatureCollection(businessesRef.current);
        const bounds = boundsOfFeatures(fc);
        // Guarded the same way as the [businesses]-effect's fitBounds below:
        // the map's style can take a while to finish loading (slow network,
        // cold cache), and the business list can easily have already
        // arrived by then. If the user has since armed "find nearby" (and
        // possibly already been flown to their own location) while waiting
        // on this, this call must not undo that with an instant snap back
        // out to a worldwide view -- that's exactly what was happening.
        if (bounds && !nearbyModeRef.current) map.fitBounds(bounds, { padding: 40, maxZoom: 14, duration: 0 });

        // Resuming a previous "find nearby" search (see initialNearby doc
        // above) -- redraw its pin + circle immediately, without arming
        // nearbyMode, so it reads as an already-committed result rather
        // than an in-progress pick.
        if (initialNearby?.point) {
          setNearbyPoint(initialNearby.point);
          map.getSource(NEARBY_SOURCE_ID).setData(circlePolygon(initialNearby.point, initialNearby.radius));
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('BusinessMap load-time error:', err);
        setStyleError(true);
      }
    });

    return () => {
      cancelled = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      loadedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Highlight the hovered card's pin gold instead of navy.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current || !map.getLayer('gs-unclustered')) return;
    map.setPaintProperty('gs-unclustered', 'circle-color', [
      'case', ['==', ['get', 'id'], hoveredId ?? -1], '#d4a24c', '#1c2438',
    ]);
    map.setPaintProperty('gs-unclustered', 'circle-radius', [
      'case', ['==', ['get', 'id'], hoveredId ?? -1], 10, 8,
    ]);
  }, [hoveredId]);

  // Push new results into the map whenever the filtered list changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const source = map.getSource(SOURCE_ID);
    if (!source) return;
    const fc = toFeatureCollection(businesses);
    source.setData(fc);
    setShowSearchArea(false);
    if (skipNextFitRef.current) {
      skipNextFitRef.current = false;
      return;
    }
    if (nearbyModeRef.current) {
      // A businesses refresh landing mid-pick (e.g. the initial full-list
      // fetch resolving late, right as the user armed "find nearby" and got
      // flown to their own location) must not yank the camera back out to
      // fit the whole list -- that discarded an in-progress pick in
      // practice. Once a radius is actually chosen, nearbyMode is already
      // off by the time the filtered results come back, so that refit still
      // happens normally.
      return;
    }
    const bounds = boundsOfFeatures(fc);
    if (bounds) map.fitBounds(bounds, { padding: 40, maxZoom: 14, duration: 400 });
  }, [businesses]);

  const searchThisArea = () => {
    const map = mapRef.current;
    if (!map || !onBoundsSearch) return;
    const b = map.getBounds();
    skipNextFitRef.current = true;
    setShowSearchArea(false);
    onBoundsSearch({ north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() });
  };

  // Drop/move a marker at the picked center point; cleared entirely once
  // nearby mode is turned off or re-armed for a new pick.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    if (nearbyMarkerRef.current) { nearbyMarkerRef.current.remove(); nearbyMarkerRef.current = null; }
    if (nearbyPoint) {
      nearbyMarkerRef.current = new maplibregl.Marker({ color: '#d4a24c' })
        .setLngLat([nearbyPoint.lng, nearbyPoint.lat])
        .addTo(map);
    }
  }, [nearbyPoint]);

  const clearNearbyOverlay = () => {
    const map = mapRef.current;
    const source = map && map.getSource(NEARBY_SOURCE_ID);
    if (source) source.setData(EMPTY_FC);
  };

  const toggleNearbyMode = () => {
    const map = mapRef.current;
    if (nearbyMode) {
      nearbyModeRef.current = false; // synchronous -- see note below on why this can't wait for the effect
      setNearbyMode(false);
      setNearbyPoint(null);
      if (map) map.getCanvas().style.cursor = '';
      clearNearbyOverlay();
      return;
    }
    setNearbyPoint(null);
    clearNearbyOverlay();
    if (map) map.getCanvas().style.cursor = 'crosshair';
    // Set synchronously, not just via the `nearbyMode` state (which the
    // separate sync effect below only reflects into the ref after React's
    // *next* render/commit). The geolocation callback right after this can
    // resolve before that render happens -- with a mocked/instant location
    // this isn't hypothetical, it reliably raced and silently ate the
    // fly-to. Reading a ref updated in the same tick sidesteps that.
    nearbyModeRef.current = true;
    setNearbyMode(true);

    // The directory's default view fits bounds to every business worldwide
    // now that listings span multiple countries -- that leaves nothing
    // sensible to click on. Jump to the user's own location first (same
    // best-effort, never-blocks pattern as the city auto-fill elsewhere in
    // this app) so there's a real starting point; if it's denied/unavailable
    // this just silently does nothing; the user can still pan/zoom manually.
    if (map && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (nearbyModeRef.current) {
            map.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: NEARBY_MIN_ZOOM });
          }
        },
        () => {},
        { timeout: 6000, maximumAge: 10 * 60 * 1000 }
      );
    }
  };

  const pickRadius = (miles) => {
    const map = mapRef.current;
    if (!nearbyPoint || !onNearbySearch) return;
    const source = map && map.getSource(NEARBY_SOURCE_ID);
    if (source) source.setData(circlePolygon(nearbyPoint, miles));
    if (map) map.getCanvas().style.cursor = '';
    onNearbySearch({ bbox: radiusToBbox(nearbyPoint, miles), point: nearbyPoint, radius: miles });
    setNearbyMode(false);
  };

  const hasPins = businesses.some((b) =>
    (b.locations || (b.primary_location ? [b.primary_location] : [])).some((l) => l && l.lat != null && l.lng != null));

  return (
    <div className="biz-map-wrap">
      <div ref={containerRef} className="biz-map-canvas" />
      <button
        type="button"
        className={`biz-map-nearby-toggle${nearbyMode ? ' active' : ''}`}
        onClick={toggleNearbyMode}
        title="Click a point on the map, then pick a radius to find businesses around it"
      >
        📍 {nearbyMode ? 'Click the map…' : 'Find nearby'}
      </button>
      {nearbyMode && nearbyPoint && (
        <div className="biz-map-nearby-picker">
          <span>Within</span>
          {NEARBY_RADII.map((mi) => (
            <button key={mi} type="button" className="biz-chip" onClick={() => pickRadius(mi)}>{mi} mi</button>
          ))}
          <button type="button" className="biz-map-nearby-cancel" onClick={toggleNearbyMode}>✕</button>
        </div>
      )}
      {showSearchArea && (
        <button type="button" className="biz-map-search-area" onClick={searchThisArea}>
          🔎 Search this area
        </button>
      )}
      {styleError && (
        <div className="gs-empty" style={{ padding: 12 }}>Couldn't load the map right now.</div>
      )}
      {!styleError && !hasPins && (
        <div className="gs-empty" style={{ padding: 12 }}>No mappable results — try widening your filters.</div>
      )}
    </div>
  );
}
