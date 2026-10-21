import React, { useEffect, useState } from 'react';
import { Newspaper, Users } from 'lucide-react';
import apiRequest from '../ApiRequest';

const TILES = [
  { key: 'articles', label: 'Articles', Icon: Newspaper },
  { key: 'contributors', label: 'Contributors', Icon: Users },
];

function formatCount(n) {
  return typeof n === 'number' ? n.toLocaleString() : '—';
}

export default function NewsStatsBar() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiRequest('GET', null, '/news/stats')
      .then((data) => { if (!cancelled) setStats(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!stats) return null;

  return (
    <div className="news-stats-bar">
      {TILES.map((t) => (
        <div key={t.key} className="news-stats-tile">
          <span className="news-stats-value"><t.Icon size={17} /> {formatCount(stats[t.key])}</span>
          <span className="news-stats-label">{t.label}</span>
        </div>
      ))}
    </div>
  );
}
