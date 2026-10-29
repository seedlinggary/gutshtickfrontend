import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ShowMessage from './ShowMessage';
import BoardHockCard from './BoardHockCard';
import CrossSiteCard from './CrossSiteCard';
import { AdCard, useInThreadAds } from '../ads/AdSlot';
import { connect } from 'react-redux';
import { fetchLimitsLoaded, fetchData } from '../actions';
import PinSomethingCard from '../PinSomethingCard';
import apiRequest from '../ApiRequest';
import { Inbox, Eye } from 'lucide-react';

const AD_EVERY_N_POSTS = 5;
const CROSS_SITE_EVERY_N_POSTS = 6;

const FeedHome = ({ feed, error, isLoading, fetchLimitsLoaded, fetchData }) => {
  const { category_id } = useParams();
  const isRoot = !category_id;

  const handleLoadMore = () => {
    fetchLimitsLoaded();
    fetchData();
  };

  const neededAdCount = feed ? Math.floor(feed.length / AD_EVERY_N_POSTS) : 0;
  const { adAt, dismiss: dismissFeedAd } = useInThreadAds('feed', neededAdCount);

  // Mixes in the most recent Gut Money/Estates/Community/Torah activity
  // alongside Shtick+Hock, the same "everything in one board" idea as the
  // Hock mix-in above -- root page only (a category page is specifically
  // Shtick, not the whole network). One fetch of the aggregate feed's first
  // page is plenty of inventory to sprinkle through a normal scroll session.
  const [crossItems, setCrossItems] = useState([]);
  useEffect(() => {
    if (!isRoot) return;
    apiRequest('GET', null, '/feed/aggregate?page=1')
      .then((res) => setCrossItems(res.items || []))
      .catch(() => {});
  }, [isRoot]);

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
        <div className="gs-empty-icon"><Inbox size={26} /></div>
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
  // mixes in Hock items (kind: 'hock'), which aren't eligible for the pin slot.
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
      {(() => {
        // The first Hock pick in the whole session gets a one-time, friendly
        // nudge right before it ("you're a few posts in, Hock's got
        // something going") -- a gentle pull deeper into the scroll rather
        // than letting it go flat. Only once per load: repeating this on
        // every page would turn a nudge into nagging.
        let nudgeShown = false;
        return feed.map((message, idx) => {
          if (isRoot && pinned && isShtick(message) && message.id === pinned.id) return null;
          const isAdSlot = (idx + 1) % AD_EVERY_N_POSTS === 0;
          const slotIdx = isAdSlot ? Math.floor(idx / AD_EVERY_N_POSTS) : null;
          const isCrossSlot = isRoot && crossItems.length > 0 && (idx + 1) % CROSS_SITE_EVERY_N_POSTS === 0;
          const crossItem = isCrossSlot ? crossItems[Math.floor(idx / CROSS_SITE_EVERY_N_POSTS) % crossItems.length] : null;
          const showNudge = isRoot && !nudgeShown && message.kind === 'hock';
          if (showNudge) nudgeShown = true;
          return (
            <React.Fragment key={`${message.kind || 'shtick'}-${message.id}`}>
              {showNudge && (
                <div className="feed-nudge">
                  <span className="feed-nudge-emoji"><Eye size={18} /></span>
                  <p>Hock's got a live conversation going — take a peek?</p>
                </div>
              )}
              {message.kind === 'hock' ? (
                <BoardHockCard post={message} />
              ) : (
                <ShowMessage message={message} />
              )}
              {isAdSlot && (
                <AdCard ad={adAt(slotIdx)} onDismiss={() => dismissFeedAd(slotIdx)} />
              )}
              {crossItem && <CrossSiteCard item={crossItem} />}
            </React.Fragment>
          );
        });
      })()}
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
