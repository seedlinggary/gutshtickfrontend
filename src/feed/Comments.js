import React, { useState, useEffect } from 'react';
import apiRequest from '../ApiRequest';
import { isLoggedIn, isAdmin } from '../auth';
import formatDate from '../utils/timeAgo';
import { MessageCircle } from 'lucide-react';
import GuestContactFields from '../guest/GuestContactFields';
import GuestSubmitSuccess from '../guest/GuestSubmitSuccess';

export default function Comments({ shtickId }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestError, setGuestError] = useState('');
  const [guestResult, setGuestResult] = useState(null);
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

  const handleGuestSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (!guestEmail.trim() && !guestPhone.trim()) {
      setGuestError('Add an email or phone so we can send you a link to manage your comment.');
      return;
    }
    setGuestError('');
    setPosting(true);
    try {
      const created = await apiRequest('POST', {
        text: text.trim(),
        shtick_id: shtickId,
        guest_email: guestEmail.trim() || null,
        guest_phone: guestPhone.trim() || null,
      }, '/comment/guest');
      setGuestResult(created);
      setText('');
    } catch (err) {
      setGuestError(typeof err === 'string' ? err : 'Failed to submit. Please try again.');
    }
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
        <MessageCircle size={14} /> {comments.length} comment{comments.length !== 1 ? 's' : ''}
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
                    <span style={{ fontSize: 11, color: 'var(--muted)' }} title="Comment ID">#{c.id}</span>
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
          ) : guestResult ? (
            <div style={{ marginTop: 8 }}>
              <GuestSubmitSuccess
                manageUrl={`${window.location.origin}/guest/comment/${guestResult.guest_manage_token}`}
                guestEmail={guestEmail.trim()}
                message="Comment submitted! It's pending review."
              />
            </div>
          ) : (
            <form className="comment-form" onSubmit={handleGuestSubmit} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
              {guestError && <div className="gs-error-box">{guestError}</div>}
              <input
                className="comment-input"
                type="text"
                placeholder="Add a comment…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={500}
              />
              <GuestContactFields email={guestEmail} phone={guestPhone} onEmailChange={setGuestEmail} onPhoneChange={setGuestPhone} />
              <button type="submit" className="gs-btn gs-btn-primary gs-btn-sm" disabled={posting || !text.trim()} style={{ alignSelf: 'flex-start' }}>
                {posting ? '…' : 'Post without an account'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
