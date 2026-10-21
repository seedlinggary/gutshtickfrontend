import React, { useEffect, useState } from 'react';
import { Home, Building2, Globe, LayoutGrid } from 'lucide-react';
import apiRequest from '../ApiRequest';

const TILES = [
  { key: 'listings', label: 'Listings', Icon: Home },
  { key: 'cities', label: 'Cities', Icon: Building2 },
  { key: 'countries', label: 'Countries', Icon: Globe },
];

function formatCount(n) {
  return typeof n === 'number' ? n.toLocaleString() : '—';
}

/** Mirrors business/StatsBar.js's pattern -- a quiet live-count row along the
 * masthead's bottom edge, fed by /estates/stats. */
export default function EstatesStatsBar() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiRequest('GET', null, '/estates/stats')
      .then((data) => { if (!cancelled) setStats(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!stats) return null;

  return (
    <div className="est-stats-bar">
      {TILES.map((t) => (
        <div key={t.key} className="est-stats-tile">
          <span className="est-stats-value"><t.Icon size={17} /> {formatCount(stats[t.key])}</span>
          <span className="est-stats-label">{t.label}</span>
        </div>
      ))}
    </div>
  );
}
