import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import CrossSiteCard from './CrossSiteCard';

/** Stage 4's "one profile, one personal feed" -- GET /feed/aggregate with
 * personalized=1, which biases the existing cross-site merge toward the
 * viewer's own profile_area/budget/line_of_work (see backend/feed/routes/
 * aggregate.py) instead of a second, separate feed implementation. Reuses
 * CrossSiteCard, the same renderer FeedHome.js already uses for this same
 * item shape. */
export default function MyFeed() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [personalized, setPersonalized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  const load = (p) => {
    const setBusy = p === 1 ? setLoading : setLoadingMore;
    setBusy(true);
    apiRequest('GET', null, `/feed/aggregate?personalized=1&page=${p}`)
      .then((res) => {
        setItems((prev) => (p === 1 ? res.items : [...prev, ...res.items]));
        setHasMore(res.has_more);
        setPersonalized(res.personalized);
        setPage(p);
      })
      .catch(() => setError(true))
      .finally(() => setBusy(false));
  };

  useEffect(() => { load(1); }, []);

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 680 }}>
        <h1 style={{ margin: '0 0 4px' }}>📬 My Feed</h1>
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>
          {personalized
            ? "Homes, jobs and businesses from across GUT, weighted toward your profile."
            : (
              <>
                Homes, jobs and businesses from across GUT.{' '}
                <Link to="/profile">Set your area, budget and line of work</Link> to weight this toward you.
              </>
            )}
        </p>

        {loading && <div className="gs-loading"><div className="gs-spinner" /> Loading…</div>}
        {error && <div className="gs-error-box">Couldn't load your feed right now.</div>}

        {!loading && items.length === 0 && !error && (
          <div className="gs-empty"><p>Nothing here yet. Check back soon!</p></div>
        )}

        {items.map((item) => <CrossSiteCard key={item.key} item={item} />)}

        {hasMore && (
          <button
            type="button" className="gs-btn gs-btn-outline gs-btn-block"
            onClick={() => load(page + 1)} disabled={loadingMore}
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        )}
      </div>
    </div>
  );
}
