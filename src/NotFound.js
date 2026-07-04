import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="not-found-page">
      <div className="not-found-code">404</div>
      <h2 className="not-found-title">Page not found</h2>
      <p className="not-found-sub">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/" className="gs-btn gs-btn-dark">
        Back to the feed
      </Link>
    </div>
  );
};

export default NotFound;
