import React from 'react';
import ShowMessage from './ShowMessage';
import AdSlot from '../ads/AdSlot';
import { connect } from 'react-redux';
import { fetchLimitsLoaded, fetchData } from '../actions';

const AD_EVERY_N_POSTS = 5;

const FeedHome = ({ feed, error, isLoading, fetchLimitsLoaded, fetchData }) => {
  const handleLoadMore = () => {
    fetchLimitsLoaded();
    fetchData();
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
      </div>
    );
  }

  return (
    <div>
      {feed.map((message, idx) => (
        <React.Fragment key={message.id}>
          <ShowMessage message={message} />
          {(idx + 1) % AD_EVERY_N_POSTS === 0 && (
            <AdSlot key={`ad-${idx}`} placement="feed" />
          )}
        </React.Fragment>
      ))}
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
