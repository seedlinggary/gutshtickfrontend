import React, { useEffect, useState } from 'react';
import { Store, Building2, Globe, ShieldCheck, LayoutGrid, CheckCircle2 } from 'lucide-react';
import apiRequest from '../ApiRequest';

const BUSINESS_TILES = [
  { key: 'businesses', label: 'Businesses', Icon: Store },
  { key: 'cities', label: 'Cities', Icon: Building2 },
  { key: 'countries', label: 'Countries', Icon: Globe },
  { key: 'kosher_locations', label: 'Kosher-Certified', Icon: ShieldCheck },
  { key: 'categories', label: 'Categories', Icon: LayoutGrid },
];

const COMMUNITY_TILES = [
  { key: 'businesses', label: 'Shuls & Organizations', Icon: Store },
  { key: 'cities', label: 'Cities', Icon: Building2 },
  { key: 'countries', label: 'Countries', Icon: Globe },
  { key: 'claimed', label: 'Claimed', Icon: CheckCircle2 },
  { key: 'categories', label: 'Categories', Icon: LayoutGrid },
];

// Keeps the Community area (shuls, chessed organizations) and the regular
// Business directory's counts from bleeding into each other -- see
// list_businesses()/business_stats()'s categories/exclude_categories params.
const COMMUNITY_CATEGORIES = 'shul,nonprofit';

function formatCount(n) {
  return typeof n === 'number' ? n.toLocaleString() : '—';
}

/** Fetches /business/stats once and renders a small "trust bar" of live
 * directory-wide counts. Silently renders nothing on failure -- it's a nice
 * touch, not something worth an error state taking up space on the page.
 * `scope="community"` scopes every count to just shuls/chessed organizations
 * (and swaps in a tile set that fits that area) instead of the regular
 * Business directory's own counts. */
export default function StatsBar({ scope = 'business' }) {
  const [stats, setStats] = useState(null);
  const isCommunity = scope === 'community';
  const tiles = isCommunity ? COMMUNITY_TILES : BUSINESS_TILES;

  useEffect(() => {
    let cancelled = false;
    const qs = isCommunity ? `?categories=${COMMUNITY_CATEGORIES}` : `?exclude_categories=${COMMUNITY_CATEGORIES}`;
    setStats(null);
    apiRequest('GET', null, `/business/stats${qs}`)
      .then((data) => { if (!cancelled) setStats(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isCommunity]);

  if (!stats) return null;

  return (
    <div className="biz-stats-bar">
      {tiles.map((t) => (
        <div key={t.key} className="biz-stats-tile">
          <span className="biz-stats-value"><t.Icon size={17} /> {formatCount(stats[t.key])}</span>
          <span className="biz-stats-label">{t.label}</span>
        </div>
      ))}
    </div>
  );
}
