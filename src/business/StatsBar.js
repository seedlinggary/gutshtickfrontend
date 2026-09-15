import React, { useEffect, useState } from 'react';
import apiRequest from '../ApiRequest';

const TILES = [
  { key: 'businesses', label: 'Businesses', icon: '🏪' },
  { key: 'cities', label: 'Cities', icon: '🏙️' },
  { key: 'countries', label: 'Countries', icon: '🌍' },
  { key: 'kosher_locations', label: 'Kosher-Certified', icon: '✡️' },
  { key: 'categories', label: 'Categories', icon: '🗂️' },
];

function formatCount(n) {
  return typeof n === 'number' ? n.toLocaleString() : '—';
}

/** Fetches /business/stats once and renders a small "trust bar" of live
 * directory-wide counts. Silently renders nothing on failure -- it's a nice
 * touch, not something worth an error state taking up space on the page. */
export default function StatsBar() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiRequest('GET', null, '/business/stats')
      .then((data) => { if (!cancelled) setStats(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!stats) return null;

  return (
    <div className="biz-stats-bar">
      {TILES.map((t) => (
        <div key={t.key} className="biz-stats-tile">
          <span className="biz-stats-value">{t.icon} {formatCount(stats[t.key])}</span>
          <span className="biz-stats-label">{t.label}</span>
        </div>
      ))}
    </div>
  );
}
