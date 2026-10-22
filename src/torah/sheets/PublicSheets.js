import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users, ArrowLeft } from 'lucide-react';
import apiRequest from '../../ApiRequest';

export default function PublicSheets() {
  const [q, setQ] = useState('');
  const [sheets, setSheets] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    apiRequest('GET', null, `/torah/sheets/public?${params.toString()}`)
      .then((d) => setSheets(d.sheets || []))
      .catch(() => setSheets([]));
  }, [q]);

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 1180 }}>
        <Link to="/sheets" className="tor-back-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <ArrowLeft size={14} /> My Sheets
        </Link>
        <div className="tor-masthead">
          <div className="tor-masthead-kicker"><Users size={13} /> Source Sheets</div>
          <h1 className="tor-masthead-title">Browse public source sheets</h1>
          <p className="tor-masthead-sub">Sheets other rabbis have shared. Copy any of them into your own sheets to use as a starting point -- your copy is fully independent, so edit the order or add your own sources freely.</p>
        </div>

        <div style={{ position: 'relative', margin: '0 0 18px', maxWidth: 420 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--muted)' }} />
          <input className="gs-input" style={{ paddingLeft: 32, width: '100%' }} placeholder="Search by title" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        {sheets === null && <p style={{ color: 'var(--muted)' }}>Loading…</p>}
        {sheets && sheets.length === 0 && <p className="tor-empty">No public sheets found.</p>}
        {sheets && sheets.length > 0 && (
          <div className="tor-sheet-grid">
            {sheets.map((s) => (
              <Link key={s.id} to={`/sheets/${s.id}`} className="tor-sheet-card">
                <h3>{s.title}</h3>
                <p>{s.item_count} {s.item_count === 1 ? 'item' : 'items'} · by {s.author_name || 'Unknown'}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
