import React, { useEffect, useState } from 'react';
import { Store, Building2, Globe, ShieldCheck, LayoutGrid, CheckCircle2, FerrisWheel } from 'lucide-react';
import apiRequest from '../ApiRequest';

const BUSINESS_TILES = [
  { key: 'businesses', label: 'Businesses', Icon: Store },
  { key: 'cities', label: 'Cities', Icon: Building2 },
  { key: 'countries', label: 'Countries', Icon: Globe },
  { key: 'kosher_locations', label: 'Kosher-Certified', Icon: ShieldCheck },
  { key: 'categories', label: 'Categories', Icon: LayoutGrid },
];

const COMMUNITY_TILES = [
  { key: 'businesses', label: 'Shuls, Mikvahs & Organizations', Icon: Store },
  { key: 'cities', label: 'Cities', Icon: Building2 },
  { key: 'countries', label: 'Countries', Icon: Globe },
  { key: 'claimed', label: 'Claimed', Icon: CheckCircle2 },
  { key: 'categories', label: 'Categories', Icon: LayoutGrid },
];

const ACTIVITIES_TILES = [
  { key: 'businesses', label: 'Activities', Icon: FerrisWheel },
  { key: 'cities', label: 'Cities', Icon: Building2 },
  { key: 'countries', label: 'Countries', Icon: Globe },
  { key: 'categories', label: 'Categories', Icon: LayoutGrid },
];

// Keeps the Community area (shuls, schools, chessed organizations), the
// Activities area (attractions), and the regular Business directory's
// counts from bleeding into each other -- see
// list_businesses()/business_stats()'s categories/exclude_categories params.
// 'education' and 'mikvah' moved from the Business directory into Community
// (schools and mikvahs belong there, not mixed in with restaurants/retail),
// and 'attraction' moved out of both into its own Activities scope.
const COMMUNITY_CATEGORIES = 'shul,nonprofit,education,mikvah';
const DIRECTORY_EXCLUDED_CATEGORIES = 'shul,nonprofit,education,mikvah,attraction';
const ACTIVITIES_CATEGORIES = 'attraction';

function formatCount(n) {
  return typeof n === 'number' ? n.toLocaleString() : '—';
}

/** Fetches /business/stats once and renders a small "trust bar" of live
 * directory-wide counts. Silently renders nothing on failure -- it's a nice
 * touch, not something worth an error state taking up space on the page.
 * `scope="community"` scopes every count to shuls/schools/chessed
 * organizations, `scope="activities"` to attractions, instead of the
 * regular Business directory's own counts (each swaps in its own tile set
 * too). */
export default function StatsBar({ scope = 'business' }) {
  const [stats, setStats] = useState(null);
  const isCommunity = scope === 'community';
  const isActivities = scope === 'activities';
  const tiles = isCommunity ? COMMUNITY_TILES : isActivities ? ACTIVITIES_TILES : BUSINESS_TILES;

  useEffect(() => {
    let cancelled = false;
    const qs = isCommunity ? `?categories=${COMMUNITY_CATEGORIES}`
      : isActivities ? `?categories=${ACTIVITIES_CATEGORIES}`
        : `?exclude_categories=${DIRECTORY_EXCLUDED_CATEGORIES}`;
    setStats(null);
    apiRequest('GET', null, `/business/stats${qs}`)
      .then((data) => { if (!cancelled) setStats(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isCommunity, isActivities]);

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
