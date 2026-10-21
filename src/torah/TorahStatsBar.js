import React, { useEffect, useState } from 'react';
import { BookOpen, Users } from 'lucide-react';
import apiRequest from '../ApiRequest';

const TILES = [
  { key: 'posts', label: 'Posts', Icon: BookOpen },
  { key: 'contributors', label: 'Contributors', Icon: Users },
];

function formatCount(n) {
  return typeof n === 'number' ? n.toLocaleString() : '—';
}

export default function TorahStatsBar() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiRequest('GET', null, '/torah/stats')
      .then((data) => { if (!cancelled) setStats(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!stats) return null;

  return (
    <div className="tor-stats-bar">
      {TILES.map((t) => (
        <div key={t.key} className="tor-stats-tile">
          <span className="tor-stats-value"><t.Icon size={17} /> {formatCount(stats[t.key])}</span>
          <span className="tor-stats-label">{t.label}</span>
        </div>
      ))}
    </div>
  );
}
