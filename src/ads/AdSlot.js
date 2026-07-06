import React, { useState, useEffect } from 'react';
import apiRequest from '../ApiRequest';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';
const DISMISSED_KEY = 'dismissed_ads';

export function getDismissedIds() {
  try {
    const raw = JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch (_) {
    return [];
  }
}

export function dismissAdId(id) {
  const ids = getDismissedIds();
  if (!ids.includes(id)) {
    ids.push(id);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids));
  }
}

/** Pure presentational ad card — no fetching. Renders nothing if `ad` is falsy. */
export function AdCard({ ad, className, onDismiss }) {
  if (!ad) return null;
  return (
    <div className={`gs-card ad-slot${className ? ` ${className}` : ''}`}>
      <button className="ad-slot-close" onClick={onDismiss} title="Stop seeing this ad" aria-label="Dismiss ad">×</button>
      <div className="gs-card-body">
        <div className="ad-slot-label">Sponsored</div>
        {ad.image_url && (
          <a href={`${API}/ads/${ad.id}/click`} target="_blank" rel="noopener noreferrer sponsored">
            <img className="shtick-image ad-slot-image" src={ad.image_url} alt={ad.headline || ad.advertiser_name || 'Advertisement'} loading="lazy" />
          </a>
        )}
        {ad.headline && <h3 className="shtick-caption">{ad.headline}</h3>}
        {ad.body_text && <p className="ad-slot-body">{ad.body_text}</p>}
        <a
          className="gs-btn gs-btn-primary gs-btn-sm ad-slot-cta"
          href={`${API}/ads/${ad.id}/click`}
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

/** Fetches and renders a single targeted ad for one placement. Use for standalone
 * slots (feed, games_hub). For a page with several fixed slots at once, fetch
 * with /ads/serve_batch instead and render each result via <AdCard>. */
export default function AdSlot({ placement, className }) {
  const [ad, setAd] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const exclude = getDismissedIds().join(',');
    const qs = exclude ? `?placement=${placement}&exclude=${exclude}` : `?placement=${placement}`;
    apiRequest('GET', null, `/ads/serve${qs}`)
      .then((data) => { if (!cancelled) setAd(data || null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [placement]);

  const handleDismiss = () => {
    dismissAdId(ad.id);
    setAd(null);
  };

  return <AdCard ad={ad} className={className} onDismiss={handleDismiss} />;
}
