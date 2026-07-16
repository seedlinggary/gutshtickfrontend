import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import ShowMessage from './ShowMessage';
import BoardHockCard from './BoardHockCard';
import BoardTachlisCard from './BoardTachlisCard';
import { AdCard, getDismissedIds, dismissAdId } from '../ads/AdSlot';
import apiRequest from '../ApiRequest';
import { connect } from 'react-redux';
import { fetchLimitsLoaded, fetchData } from '../actions';
import PinSomethingCard from '../PinSomethingCard';

const AD_EVERY_N_POSTS = 5;

const FeedHome = ({ feed, error, isLoading, fetchLimitsLoaded, fetchData }) => {
  const { category_id } = useParams();
  const isRoot = !category_id;

  const handleLoadMore = () => {
    fetchLimitsLoaded();
    fetchData();
  };

  // One batched request per newly-needed batch of in-feed ad slots, instead
  // of every <AdSlot> firing its own /ads/serve call -- this used to scale
  // with feed length (every "Load more" added more independent ad requests).
  // Slots are indexed by position and never removed on dismiss (only nulled
  // out), so earlier slots stay stable as later ones get appended.
  const [feedAds, setFeedAds] = useState([]);
  const fetchingRef = useRef(false);
  const neededAdCount = feed ? Math.floor(feed.length / AD_EVERY_N_POSTS) : 0;

  useEffect(() => {
    if (neededAdCount <= feedAds.length || fetchingRef.current) return;
    const toFetch = neededAdCount - feedAds.length;
    fetchingRef.current = true;
    const exclude = [...getDismissedIds(), ...feedAds.filter(Boolean).map((a) => a.id)].join(',');
    const qs = `?placement=feed&count=${toFetch}${exclude ? `&exclude=${exclude}` : ''}`;
    apiRequest('GET', null, `/ads/serve_many${qs}`)
      .then((data) => setFeedAds((prev) => [...prev, ...(Array.isArray(data) ? data : [])]))
      .catch(() => {})
      .finally(() => { fetchingRef.current = false; });
  }, [neededAdCount, feedAds]);

  const dismissFeedAd = (slotIdx) => {
    const ad = feedAds[slotIdx];
    if (!ad) return;
    dismissAdId(ad.id);
    setFeedAds((prev) => prev.map((a, i) => (i === slotIdx ? null : a)));
  };

  if (isLoading && !feed) {
    return (
      <div className="gs-loading">
        <div className="gs-spinner" />
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="gs-error-box">
        Failed to load feed: {error}
      </div>
    );
  }

  if (!feed || feed.length === 0) {
    return (
      <div className="gs-empty">
        <p style={{ fontSize: 40, marginBottom: 8 }}>🤷</p>
        <p>Nothing here yet. Check back soon!</p>
        {isRoot && (
          <div style={{ maxWidth: 360, margin: '20px auto 0' }}>
            <PinSomethingCard to="/CreateShtick" prompt="Be the first to pin something today." cta="Pin something" />
          </div>
        )}
      </div>
    );
  }

  // The day's editorial pin: whatever's getting the most engagement on the
  // page you already fetched -- no extra request, just a different
  // treatment for the post that's clearly resonating right now. Only ever a
  // Shtick (ShowMessage renders a Shtick's shape) -- the board feed also
  // mixes in Hock/Tachlis items (kind: 'hock' | 'tachlis'), which aren't
  // eligible for the pin slot.
  const isShtick = (m) => !m.kind || m.kind === 'shtick';
  const pinned = isRoot
    ? feed.filter(isShtick).reduce((best, m) => {
        const score = (m.likes?.length || 0) + (m.comments?.length || 0);
        const bestScore = best ? (best.likes?.length || 0) + (best.comments?.length || 0) : -1;
        return score > bestScore ? m : best;
      }, null)
    : null;

  return (
    <div>
      {isRoot && pinned && <ShowMessage message={pinned} pinned />}
      {isRoot && (
        <div style={{ marginBottom: 20 }}>
          <PinSomethingCard to="/CreateShtick" prompt="Got something good? Pin it to the board." cta="Pin something" />
        </div>
      )}
      {feed.map((message, idx) => {
        if (isRoot && pinned && isShtick(message) && message.id === pinned.id) return null;
        const isAdSlot = (idx + 1) % AD_EVERY_N_POSTS === 0;
        const slotIdx = isAdSlot ? Math.floor(idx / AD_EVERY_N_POSTS) : null;
        return (
          <React.Fragment key={`${message.kind || 'shtick'}-${message.id}`}>
            {message.kind === 'hock' ? (
              <BoardHockCard post={message} />
            ) : message.kind === 'tachlis' ? (
              <BoardTachlisCard post={message} />
            ) : (
              <ShowMessage message={message} />
            )}
            {isAdSlot && (
              <AdCard ad={feedAds[slotIdx]} onDismiss={() => dismissFeedAd(slotIdx)} />
            )}
          </React.Fragment>
        );
      })}
      <div style={{ textAlign: 'center', paddingTop: 8, paddingBottom: 24 }}>
        <button className="gs-btn gs-btn-outline" onClick={handleLoadMore} disabled={isLoading}>
          {isLoading ? 'Loading…' : 'Load more'}
        </button>
      </div>
    </div>
  );
};

const mapStateToProps = (state) => ({
  feed: state.feed,
  error: state.error,
  isLoading: state.isLoading,
});

export default connect(mapStateToProps, { fetchLimitsLoaded, fetchData })(FeedHome);
