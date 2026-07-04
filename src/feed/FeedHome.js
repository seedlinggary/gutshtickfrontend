import React from 'react';
import ShowMessage from './ShowMessage';
import { connect } from 'react-redux';
import { fetchLimitsLoaded, fetchData } from '../actions';

const FeedHome = ({ feed, pictures, error, isLoading, fetchLimitsLoaded, fetchData }) => {
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
      {feed.map((message) => (
        <ShowMessage key={message.id} message={message} pictures={pictures} />
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
  pictures: state.pictures,
  error: state.error,
  isLoading: state.isLoading,
});

export default connect(mapStateToProps, { fetchLimitsLoaded, fetchData })(FeedHome);
