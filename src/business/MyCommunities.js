import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, MapPin, X } from 'lucide-react';
import apiRequest from '../ApiRequest';

/** "Saved communities" -- same grid/card markup FindCommunity.js uses for its
 * results, plus a small unsave control per card. Mirrors the "Saved" tab
 * pattern in src/estates/MyListings.js (fetch once on mount, drop the item
 * from local state on unsave instead of re-fetching the whole list). */
export default function MyCommunities() {
  const [communities, setCommunities] = useState(null);

  useEffect(() => {
    apiRequest('GET', null, '/business/communities/saved')
      .then((d) => setCommunities(d.results || []))
      .catch(() => setCommunities([]));
  }, []);

  const unsave = (e, slug, id) => {
    e.preventDefault();
    e.stopPropagation();
    apiRequest('DELETE', null, `/business/communities/${slug}/save`)
      .then(() => setCommunities((cur) => cur.filter((c) => c.id !== id)))
      .catch(() => {});
  };

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 1180 }}>
        <div className="biz-masthead">
          <div className="biz-masthead-row">
            <div className="biz-masthead-copy">
              <div className="biz-masthead-kicker"><Users size={13} /> Community</div>
              <h1 className="biz-masthead-title">My Communities</h1>
              <p className="biz-masthead-sub">Communities you've saved to come back to.</p>
            </div>
          </div>
        </div>

        {communities === null && <p style={{ color: 'var(--muted)' }}>Loading…</p>}

        {communities && communities.length === 0 && (
          <p style={{ color: 'var(--muted)' }}>
            You haven't saved any communities yet. <Link to="/communities">Browse communities</Link>.
          </p>
        )}

        {communities && communities.length > 0 && (
          <div className="biz-community-grid">
            {communities.map((c) => (
              <Link key={c.id} to={`/communities/${c.slug}`} className="biz-community-card" style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={(e) => unsave(e, c.slug, c.id)}
                  aria-label="Remove from saved communities"
                  className="gs-btn gs-btn-outline gs-btn-sm"
                  style={{ position: 'absolute', top: 8, right: 8, zIndex: 1, padding: '4px 6px' }}
                >
                  <X size={13} />
                </button>
                {c.logo_url ? (
                  <img src={c.logo_url} alt={c.name} className="biz-community-card-img" />
                ) : (
                  <div className="biz-community-card-img biz-community-card-img-placeholder"><MapPin size={28} /></div>
                )}
                <div className="biz-community-card-body">
                  <h3>{c.name}</h3>
                  <p>{[c.city, c.state].filter(Boolean).join(', ')}</p>
                  {c.description && <p className="biz-community-card-desc">{c.description}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
