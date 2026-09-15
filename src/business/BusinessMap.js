import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// OpenFreeMap: free vector tiles, no API key, no rate limits, self-hostable.
// https://openfreemap.org
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const DEFAULT_CENTER = [-74.006, 40.7128]; // [lng, lat] -- NYC, until pins load
const DEFAULT_ZOOM = 10;
const SOURCE_ID = 'gs-businesses';

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

/** Renders a "view profile" popup that navigates via react-router (not a
 * hard page load), since the popup's DOM lives outside the React tree. */
function popupNode(props, navigate) {
  const el = document.createElement('div');
  el.className = 'biz-map-popup';
  const strong = document.createElement('strong');
  strong.textContent = props.name;
  const cityLine = document.createElement('div');
  cityLine.textContent = props.city || '';
  cityLine.style.color = 'var(--muted)';
  const link = document.createElement('a');
  link.href = `/business/${props.slug}`;
  link.textContent = 'View profile →';
  link.addEventListener('click', (e) => {
    e.preventDefault();
    navigate(`/business/${props.slug}`);
  });
  el.append(strong, cityLine, link);
  return el;
}

/** Plots one pin per (business, location) pair with lat/lng set, clustered
 * when there are many. `onBoundsSearch(bbox)` — if given — enables a
 * "search this area" button once the user pans/zooms manually.
 * `hoveredId` — if given — highlights that business's pin gold, for the
 * split-view Directory hovering a card in the list. */
export default function BusinessMap({ businesses, onBoundsSearch, hoveredId }) {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const loadedRef = useRef(false);
  const businessesRef = useRef(businesses);
  const skipNextFitRef = useRef(false);
  const [showSearchArea, setShowSearchArea] = useState(false);
  const [styleError, setStyleError] = useState(false);

  useEffect(() => { businessesRef.current = businesses; }, [businesses]);

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

        map.on('click', 'gs-unclustered', (e) => {
          const [feature] = e.features || [];
          if (!feature) return;
          new maplibregl.Popup({ closeButton: true, maxWidth: '220px' })
            .setLngLat(feature.geometry.coordinates)
            .setDOMContent(popupNode(feature.properties, navigate))
            .addTo(map);
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
        if (bounds) map.fitBounds(bounds, { padding: 40, maxZoom: 14, duration: 0 });
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

  const hasPins = businesses.some((b) =>
    (b.locations || (b.primary_location ? [b.primary_location] : [])).some((l) => l && l.lat != null && l.lng != null));

  return (
    <div className="biz-map-wrap">
      <div ref={containerRef} className="biz-map-canvas" />
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
