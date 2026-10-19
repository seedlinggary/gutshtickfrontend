import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Search, MapPin, Info } from 'lucide-react';
import apiRequest from '../ApiRequest';

const TEFILAH_LABELS = { shacharit: 'Shacharit', mincha: 'Mincha', maariv: 'Maariv', other: 'Other' };
const ANCHOR_LABELS = { netz: 'Netz (sunrise)', shkiya: 'Shkiya (sunset)', chatzos: 'Chatzos (midday)', alos: 'Alos (dawn)', tzeis: 'Tzeis (nightfall)' };

function formatMinyan(m) {
  if (m.fixed_time) return m.fixed_time;
  if (m.relative_anchor) {
    const offset = m.relative_offset_minutes || 0;
    const anchor = ANCHOR_LABELS[m.relative_anchor] || m.relative_anchor;
    if (offset === 0) return `At ${anchor}`;
    return `${Math.abs(offset)} min ${offset < 0 ? 'before' : 'after'} ${anchor}`;
  }
  return '—';
}

export default function MinyanSearch() {
  const [city, setCity] = useState('');
  const [tefilah, setTefilah] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (city.trim()) params.set('city', city.trim());
    if (tefilah) params.set('tefilah', tefilah);
    if (q.trim()) params.set('q', q.trim());
    apiRequest('GET', null, `/business/minyanim/search?${params.toString()}`)
      .then(setData)
      .catch(() => setData({ results: [], total: 0, has_more: false }))
      .finally(() => setLoading(false));
  }, [city, tefilah, q, page]);

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 900 }}>
        <div className="biz-masthead">
          <div className="biz-masthead-kicker"><Clock size={13} /> Minyan Times</div>
          <h1 className="biz-masthead-title">Find a minyan</h1>
          <p className="biz-masthead-sub">Search minyan times across every shul in the directory.</p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '16px 0' }}>
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <MapPin size={15} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--muted)' }} />
            <input className="gs-input" style={{ paddingLeft: 32, width: '100%' }} placeholder="City"
              value={city} onChange={(e) => { setPage(1); setCity(e.target.value); }} />
          </div>
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--muted)' }} />
            <input className="gs-input" style={{ paddingLeft: 32, width: '100%' }} placeholder="Shul name"
              value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} />
          </div>
          <select className="gs-input" style={{ width: 160 }} value={tefilah} onChange={(e) => { setPage(1); setTefilah(e.target.value); }}>
            <option value="">All tefilot</option>
            {Object.entries(TEFILAH_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {loading && <p style={{ color: 'var(--muted)' }}>Loading…</p>}
        {!loading && data && data.results.length === 0 && (
          <p style={{ color: 'var(--muted)' }}>No minyan times found for that search.</p>
        )}

        {!loading && data && data.results.length > 0 && (
          <>
            <div className="biz-minyan-groups">
              {data.results.map((m) => (
                <div key={m.id} className="biz-minyan-group">
                  <div className="biz-minyan-group-title">
                    <Link to={`/business/${m.business_slug}`} style={{ color: 'inherit' }}>{m.business_name}</Link>
                    {m.city && <span style={{ fontWeight: 400, textTransform: 'none', marginLeft: 6 }}>· {m.city}{m.state ? `, ${m.state}` : ''}</span>}
                  </div>
                  <div className="biz-minyan-row">
                    <span className="biz-minyan-time">{formatMinyan(m)}</span>
                    <span className="biz-minyan-meta">
                      {TEFILAH_LABELS[m.tefilah]}
                      {m.label && <span> · {m.label}</span>}
                      {m.days && <span> · {m.days}</span>}
                    </span>
                    <span className="biz-minyan-source">
                      Source: {m.source_url ? <a href={m.source_url} target="_blank" rel="noopener noreferrer">{m.source_name}</a> : m.source_name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="biz-minyan-disclaimer"><Info size={13} /> {data.disclaimer}</p>
          </>
        )}

        {!loading && data && (page > 1 || data.has_more) && (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', margin: '20px 0' }}>
            <button className="gs-btn gs-btn-outline gs-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Newer</button>
            <button className="gs-btn gs-btn-outline gs-btn-sm" disabled={!data.has_more} onClick={() => setPage((p) => p + 1)}>Older</button>
          </div>
        )}
      </div>
    </div>
  );
}
