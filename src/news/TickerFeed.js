import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Radio } from 'lucide-react';
import apiRequest from '../ApiRequest';
import timeAgo from '../utils/timeAgo';

/** Public "scroll through every ticker" page -- no 24-hour cutoff, unlike
 * the rotating homepage widget (NewsTicker.js), which only ever shows the
 * last day's worth. This is the full history, newest first. */
export default function TickerFeed() {
  const [items, setItems] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiRequest('GET', null, `/news/ticker/all?page=${page}`)
      .then((d) => { setItems(d.items || []); setHasMore(!!d.has_more); })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 680 }}>
        <Link to="/" className="news-back-link">← Articles</Link>
        <div className="news-masthead">
          <div className="news-masthead-kicker"><Radio size={13} /> GutKol</div>
          <h1 className="news-masthead-title">All Tickers</h1>
          <p className="news-masthead-sub">Every ticker headline, newest first -- no 24-hour cutoff.</p>
        </div>

        {loading && <p style={{ color: 'var(--muted)' }}>Loading…</p>}
        {!loading && items && items.length === 0 && <p className="news-empty">No ticker items yet.</p>}
        {!loading && items && items.map((item) => (
          <div key={item.id} className="news-pending-card">
            <div style={{ flex: 1 }}>
              <strong>
                {item.link_url ? (
                  item.link_url.startsWith('/')
                    ? <Link to={item.link_url}>{item.text}</Link>
                    : <a href={item.link_url} target="_blank" rel="noreferrer">{item.text}</a>
                ) : item.text}
              </strong>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted)' }}>{timeAgo(item.created_at)}</p>
            </div>
          </div>
        ))}

        {!loading && (page > 1 || hasMore) && (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', margin: '20px 0' }}>
            <button className="gs-btn gs-btn-outline gs-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Newer</button>
            <button className="gs-btn gs-btn-outline gs-btn-sm" disabled={!hasMore} onClick={() => setPage((p) => p + 1)}>Older</button>
          </div>
        )}
      </div>
    </div>
  );
}
