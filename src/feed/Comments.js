import React, { useState, useEffect } from 'react';
import apiRequest from '../ApiRequest';
import { isLoggedIn, isAdmin } from '../auth';

function formatDate(d) {
  if (!d) return '';
  const date = new Date(d);
  const now = new Date();
  const mins = Math.floor((now - date) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Comments({ shtickId }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const loggedIn = isLoggedIn();
  const boss = isAdmin();
  const myProfileName = localStorage.getItem('profile_name');

  useEffect(() => {
    apiRequest('GET', null, `/comment/${shtickId}`)
      .then(setComments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [shtickId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setPosting(true);
    try {
      const newComment = await apiRequest('POST', { text: text.trim(), shtick_id: shtickId }, '/comment');
      setComments((prev) => [...prev, newComment]);
      setText('');
    } catch (_) {}
    setPosting(false);
  };

  const handleDelete = async (commentId) => {
    try {
      await apiRequest('DELETE', null, `/comment/${commentId}`);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (_) {}
  };

  const shown = expanded ? comments : comments.slice(0, 3);

  return (
    <div className="comments-section">
      <button className="comments-toggle" onClick={() => setExpanded((e) => !e)}>
        💬 {comments.length} comment{comments.length !== 1 ? 's' : ''}
        {!expanded && comments.length > 3 ? ` · show all` : expanded ? ' · collapse' : ''}
      </button>

      {expanded && (
        <div className="comments-body">
          {loading && <div style={{ color: 'var(--muted)', fontSize: 13 }}>Loading…</div>}

          {!loading && comments.length === 0 && (
            <div style={{ color: 'var(--muted)', fontSize: 13, margin: '8px 0' }}>
              No comments yet. Be the first!
            </div>
          )}

          <div className="comment-list">
            {shown.map((c) => (
              <div key={c.id} className="comment-item">
                <div className="comment-avatar">
                  {(c.user?.profile_name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="comment-content">
                  <div className="comment-meta">
                    <span className="comment-author">{c.user?.profile_name || 'User'}</span>
                    <span className="comment-time">{formatDate(c.pub_date)}</span>
                    {(boss || c.user?.profile_name === myProfileName) && (
                      <button className="comment-delete" onClick={() => handleDelete(c.id)}>×</button>
                    )}
                  </div>
                  <p className="comment-text">{c.text}</p>
                </div>
              </div>
            ))}
          </div>

          {comments.length > 3 && (
            <button className="comments-toggle" onClick={() => setExpanded((e) => !e)}>
              {expanded ? 'Show fewer' : `Show all ${comments.length} comments`}
            </button>
          )}

          {loggedIn ? (
            <form className="comment-form" onSubmit={handleSubmit}>
              <input
                className="comment-input"
                type="text"
                placeholder="Add a comment…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={500}
              />
              <button type="submit" className="gs-btn gs-btn-primary gs-btn-sm" disabled={posting || !text.trim()}>
                {posting ? '…' : 'Post'}
              </button>
            </form>
          ) : (
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
              <a href="/signin">Sign in</a> to leave a comment.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
