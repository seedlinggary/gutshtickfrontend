import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Home, Heart, Plus } from 'lucide-react';
import apiRequest from '../ApiRequest';
import ListingCard from './ListingCard';

export default function MyListings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'saved' ? 'saved' : 'mine';
  const [mine, setMine] = useState(null);
  const [saved, setSaved] = useState(null);

  useEffect(() => {
    apiRequest('GET', null, '/estates/my/listings').then((d) => setMine(d.listings || [])).catch(() => setMine([]));
    apiRequest('GET', null, '/estates/my/likes').then((d) => setSaved(d.listings || [])).catch(() => setSaved([]));
  }, []);

  const list = tab === 'saved' ? saved : mine;

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 1180 }}>
        <div className="est-masthead">
          <div className="est-masthead-kicker"><Home size={13} /> Your account</div>
          <h1 className="est-masthead-title">My Listings</h1>
          <p className="est-masthead-sub">Everything you've posted, including expired listings kept here for your own records, plus anything you've saved to look at again.</p>
        </div>

        <div className="est-segmented" style={{ marginBottom: 18 }}>
          <button type="button" className={`est-segmented-btn${tab === 'mine' ? ' active' : ''}`} onClick={() => setSearchParams({})}>
            <Home size={14} /> My Listings {mine ? `(${mine.length})` : ''}
          </button>
          <button type="button" className={`est-segmented-btn${tab === 'saved' ? ' active' : ''}`} onClick={() => setSearchParams({ tab: 'saved' })}>
            <Heart size={14} /> Saved {saved ? `(${saved.length})` : ''}
          </button>
        </div>

        {tab === 'mine' && (
          <div className="biz-list-cta">
            <Link to="/listings/new" className="gs-btn gs-btn-primary"><Plus size={15} /> List a new property</Link>
          </div>
        )}

        {list === null && <p style={{ color: 'var(--muted)' }}>Loading…</p>}
        {list && list.length === 0 && (
          <p className="est-empty">{tab === 'saved' ? "You haven't saved any listings yet." : "You haven't posted any listings yet."}</p>
        )}
        {list && list.length > 0 && (
          <div className="est-listing-grid">
            {list.map((l) => (
              <ListingCard
                key={l.id}
                listing={l}
                initiallyLiked={tab === 'saved' ? true : undefined}
                onUnlike={tab === 'saved' ? (id) => setSaved((prev) => prev.filter((x) => x.id !== id)) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
