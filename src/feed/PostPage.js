import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import ShowMessage from './ShowMessage';

/** Permalink for a single post — this is what a shared link actually opens,
 * as opposed to the paginated "/feed/<category>" view a share recipient
 * couldn't be pointed at directly. */
export default function PostPage() {
  const { id } = useParams();
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(false);
    apiRequest('GET', null, `/shtick/post/${id}`)
      .then(setMessage)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 640 }}>
        {loading && (
          <div className="gs-loading"><div className="gs-spinner" /> Loading…</div>
        )}
        {!loading && error && (
          <div className="gs-empty">
            <p style={{ fontSize: 40, marginBottom: 8 }}>🤷</p>
            <p>This post isn't available — it may have been removed.</p>
            <Link to="/" className="gs-btn gs-btn-outline gs-btn-sm" style={{ marginTop: 12 }}>Back to feed</Link>
          </div>
        )}
        {!loading && message && <ShowMessage message={message} />}
      </div>
    </div>
  );
}
