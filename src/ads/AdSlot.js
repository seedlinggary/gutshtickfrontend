import React, { useState, useEffect, useRef } from 'react';
import apiRequest from '../ApiRequest';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';
const DISMISSED_KEY = 'dismissed_ads';

// The 4 fixed banners shown on every page of every site (mounted once at the
// App.js root, not per-page) -- shared here so App.js and anything else
// referencing them stays in sync on the exact placement list.
export const FIXED_BANNER_PLACEMENTS = ['top', 'bottom', 'sidebar_left', 'sidebar_right'];

// sessionStorage, not localStorage -- dismissing an ad should only hide it
// for the rest of this browser session (tab/window), not forever. With only
// a handful of ads in the system at any time, a permanent dismissal list
// would otherwise silently exhaust the whole pool across repeat visits.
export function getDismissedIds() {
  try {
    const raw = JSON.parse(sessionStorage.getItem(DISMISSED_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch (_) {
    return [];
  }
}

export function dismissAdId(id) {
  const ids = getDismissedIds();
  if (!ids.includes(id)) {
    ids.push(id);
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(ids));
  }
}

/** Pure presentational ad card — no fetching. Renders nothing if `ad` is falsy. */
export function AdCard({ ad, className, onDismiss }) {
  if (!ad) return null;
  // A plain <a href> navigation can't carry a custom header the way
  // ApiRequest.js's x-admin-device header can for the /serve* fetch calls
  // -- a query param is the only way to carry the same "this browser has
  // logged in as admin before" signal through to /ads/<id>/click (see
  // auth.js's isAdminDevice(), backend's _is_excluded_viewer()).
  const clickUrl = `${API}/ads/${ad.id}/click${localStorage.getItem('admin_device') === 'true' ? '?admin_device=1' : ''}`;
  return (
    <div className={`gs-card ad-slot${className ? ` ${className}` : ''}`}>
      <button className="ad-slot-close" onClick={onDismiss} title="Stop seeing this ad" aria-label="Dismiss ad">×</button>
      <div className="gs-card-body">
        <div className="ad-slot-label">Sponsored</div>
        {ad.image_url && (
          <a href={clickUrl} target="_blank" rel="noopener noreferrer sponsored">
            <img className="shtick-image ad-slot-image" src={ad.image_url} alt={ad.headline || ad.advertiser_name || 'Advertisement'} loading="lazy" />
          </a>
        )}
        {ad.headline && <h3 className="shtick-caption">{ad.headline}</h3>}
        {ad.body_text && <p className="ad-slot-body">{ad.body_text}</p>}
        <a
          className="gs-btn gs-btn-primary gs-btn-sm ad-slot-cta"
          href={clickUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
        >
          {ad.cta_label || 'Learn More'}
        </a>
        {ad.advertiser_name && <p className="ad-slot-advertiser">— {ad.advertiser_name}</p>}
      </div>
    </div>
  );
}

/** The one fetch path for every FIXED, non-repeating ad slot on the site
 * (home banners, games hub, in-game banner) -- one /ads/serve_batch call for
 * any list of 1+ placements, so a single mount and a page with several
 * fixed slots both go through the exact same code (change it once here and
 * every fixed slot everywhere picks it up). Returns { ads, dismiss }. */
export function useFixedAds(placements) {
  const [ads, setAds] = useState({});
  const key = placements.join(',');

  useEffect(() => {
    let cancelled = false;
    const exclude = getDismissedIds().join(',');
    const qs = `?placements=${key}${exclude ? `&exclude=${exclude}` : ''}`;
    apiRequest('GET', null, `/ads/serve_batch${qs}`)
      .then((data) => { if (!cancelled) setAds(data || {}); })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const dismiss = (placement) => {
    const ad = ads[placement];
    if (!ad) return;
    dismissAdId(ad.id);
    setAds((prev) => ({ ...prev, [placement]: null }));
  };

  return { ads, dismiss };
}

/** The one fetch path for every REPEATING in-thread ad slot on the site (one
 * ad every N items in a scrolling list/board/feed -- Hock+Shtick feed,
 * business directory, deals feed, estates listings/group buys, Tachlis job
 * board, Torah posts feed). One batched /ads/serve_many call per newly-
 * needed batch of slots, instead of each slot firing its own request --
 * this is what keeps request count flat as a list grows via "load more"
 * instead of scaling with list length. Slots are indexed by position and
 * never removed on dismiss (only nulled out), so earlier slots stay stable
 * as later ones get appended. Returns { adAt(slotIndex), dismiss(slotIndex) }. */
export function useInThreadAds(placement, neededCount) {
  const [ads, setAds] = useState([]);
  const adsRef = useRef(ads);
  adsRef.current = ads;
  const fetchingRef = useRef(false);

  useEffect(() => {
    const current = adsRef.current;
    if (neededCount <= current.length || fetchingRef.current) return;
    const toFetch = neededCount - current.length;
    fetchingRef.current = true;
    const exclude = [...getDismissedIds(), ...current.filter(Boolean).map((a) => a.id)].join(',');
    const qs = `?placement=${placement}&count=${toFetch}${exclude ? `&exclude=${exclude}` : ''}`;
    apiRequest('GET', null, `/ads/serve_many${qs}`)
      .then((data) => {
        // Only touch state when there's genuinely something new -- reacting
        // to `ads` itself here (instead of just neededCount) would mean an
        // empty response (ad inventory exhausted) still produces a *new*
        // array reference via the spread below, re-triggering this same
        // effect forever: an infinite request loop once a visitor's
        // eligible ad pool runs dry.
        if (Array.isArray(data) && data.length > 0) {
          setAds((prev) => [...prev, ...data]);
        }
      })
      .catch(() => {})
      .finally(() => { fetchingRef.current = false; });
  }, [placement, neededCount]);

  const adAt = (slotIndex) => ads[slotIndex] || null;

  const dismiss = (slotIndex) => {
    const ad = ads[slotIndex];
    if (!ad) return;
    dismissAdId(ad.id);
    setAds((prev) => prev.map((a, i) => (i === slotIndex ? null : a)));
  };

  return { adAt, dismiss };
}

/** Fetches and renders a single targeted ad for one fixed placement -- a
 * thin convenience wrapper over useFixedAds for pages that only need one
 * slot (games_hub, game_page), so they can still write <AdSlot placement="x" />
 * while running through the exact same batch-fetch code as the home banners. */
export default function AdSlot({ placement, className }) {
  const { ads, dismiss } = useFixedAds([placement]);
  return <AdCard ad={ads[placement]} className={className} onDismiss={() => dismiss(placement)} />;
}
