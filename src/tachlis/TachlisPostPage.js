import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import ShareButton from '../ShareButton';
import { isLoggedIn, isAdmin } from '../auth';
import { TypeBadge } from './Tachlis';
import timeAgo from '../utils/timeAgo';

const TITLE_MAX = 150;

function StatusBanner({ post }) {
  if (post.approved_to_publish === true) return null;
  if (post.approved_to_publish === false) {
    return (
      <div className="gs-error-box" style={{ marginBottom: 12 }}>
        This post was rejected by a moderator and isn't visible to the public.
      </div>
    );
  }
  return (
    <div className="gs-success-box" style={{ marginBottom: 12 }}>
      This post is pending review and isn't visible on the public board yet.
    </div>
  );
}

export default function TachlisPostPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [editingPost, setEditingPost] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editCompensation, setEditCompensation] = useState('');
  const [busy, setBusy] = useState(false);

  const loggedIn = isLoggedIn();
  const boss = isAdmin();
  const myPublicId = localStorage.getItem('public_id');

  useEffect(() => {
    setLoading(true);
    setError(false);
    apiRequest('GET', null, `/tachlis/posts/${id}`)
      .then((data) => setPost(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  const startEdit = () => {
    setEditTitle(post.title);
    setEditBody(post.body);
    setEditContact(post.contact);
    setEditLocation(post.location || '');
    setEditCompensation(post.compensation || '');
    setEditingPost(true);
  };

  const savePostEdit = async (e) => {
    e.preventDefault();
    if (!editTitle.trim() || !editBody.trim() || !editContact.trim()) return;
    setBusy(true);
    try {
      const updated = await apiRequest('PATCH', {
        title: editTitle.trim(),
        body: editBody.trim(),
        contact: editContact.trim(),
        location: editLocation.trim() || null,
        compensation: editCompensation.trim() || null,
      }, `/tachlis/posts/${id}`);
      setPost(updated);
      setEditingPost(false);
    } catch (_) {}
    setBusy(false);
  };

  const deletePost = async () => {
    if (!window.confirm("Delete this post? This can't be undone.")) return;
    setBusy(true);
    try {
      await apiRequest('DELETE', null, `/tachlis/posts/${id}`);
      navigate('/tachlis');
    } catch (_) { setBusy(false); }
  };

  const moderate = async (reject) => {
    setBusy(true);
    try {
      await apiRequest('POST', { reject }, `/tachlis/admin/posts/${id}/approve`);
      const refreshed = await apiRequest('GET', null, `/tachlis/posts/${id}`);
      setPost(refreshed);
    } catch (_) {}
    setBusy(false);
  };

  const isOwner = post && myPublicId && post.user_id === myPublicId;
  const shareText = post && (post.body?.length > 140
    ? `${post.body.slice(0, 140)}…`
    : (post.body || [post.location, post.compensation].filter(Boolean).join(' • ')));

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 680 }}>
        <Link to="/tachlis" className="gs-btn gs-btn-outline gs-btn-sm" style={{ marginBottom: 12, display: 'inline-block' }}>
          ← Back to Tachlis
        </Link>

        {loading && <div className="gs-loading"><div className="gs-spinner" /> Loading…</div>}

        {!loading && error && (
          <div className="gs-empty">
            <p style={{ fontSize: 40, marginBottom: 8 }}>🤷</p>
            <p>This post isn't available — it may have been removed, or you may not have access.</p>
          </div>
        )}

        {!loading && post && (
          <>
            {(isOwner || boss) && <StatusBanner post={post} />}

            <div className="gs-card">
              <div className="gs-card-body">
                <div className="shtick-meta">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    <TypeBadge type={post.post_type} />
                    {post.location && (
                      <span style={{ fontSize: 13, color: 'var(--muted)' }}>📍 {post.location}</span>
                    )}
                    {post.compensation && (
                      <span style={{ fontSize: 13, color: 'var(--muted)' }}>💰 {post.compensation}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="shtick-time">{timeAgo(post.pub_date)}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }} title="Post ID">#{post.id}</span>
                    <ShareButton
                      title={post.title}
                      text={shareText}
                      url={`${window.location.origin}/tachlis/post/${post.id}`}
                    />
                  </div>
                </div>

                {editingPost ? (
                  <form onSubmit={savePostEdit} style={{ marginTop: 10 }}>
                    <div className="gs-field">
                      <input className="gs-input" value={editTitle} maxLength={TITLE_MAX}
                        onChange={(e) => setEditTitle(e.target.value)} placeholder="Title" />
                    </div>
                    <div className="gs-field">
                      <textarea className="gs-input gs-textarea" value={editBody} rows={6}
                        onChange={(e) => setEditBody(e.target.value)} placeholder="Body" />
                    </div>
                    <div className="gs-field">
                      <input className="gs-input" value={editContact}
                        onChange={(e) => setEditContact(e.target.value)} placeholder="Contact info" />
                    </div>
                    <div className="gs-field">
                      <input className="gs-input" value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)} placeholder="Location (optional)" />
                    </div>
                    <div className="gs-field">
                      <input className="gs-input" value={editCompensation}
                        onChange={(e) => setEditCompensation(e.target.value)} placeholder="Compensation (optional)" />
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="submit" className="gs-btn gs-btn-primary gs-btn-sm" disabled={busy}>Save</button>
                      <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setEditingPost(false)} disabled={busy}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <h1 className="shtick-caption" style={{ fontSize: 24 }}>{post.title}</h1>
                    <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, margin: '10px 0 0' }}>{post.body}</p>

                    <div className="gs-card" style={{ marginTop: 16, background: 'var(--bg)' }}>
                      <div className="gs-card-body">
                        <strong>Contact</strong>
                        <p style={{ margin: '6px 0 0' }}>{post.contact}</p>
                        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
                          Contact the poster directly — Tachlis doesn't have internal messaging.
                        </p>
                      </div>
                    </div>
                  </>
                )}

                <div className="shtick-footer" style={{ gap: 14, marginTop: 14 }}>
                  <div className="shtick-author">
                    <div className="shtick-author-avatar">
                      {post.user?.profile_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <span className="shtick-author-name">{post.user?.profile_name || 'Anonymous'}</span>
                  </div>
                  {isOwner && !editingPost && (
                    <button className="comment-action-link" onClick={startEdit}>Edit</button>
                  )}
                  {(isOwner || boss) && (
                    <button className="comment-action-link" style={{ color: 'var(--danger)' }} onClick={deletePost} disabled={busy}>Delete</button>
                  )}
                </div>
              </div>
            </div>

            {boss && (
              <div className="gs-card" style={{ marginTop: 16 }}>
                <div className="gs-card-body">
                  <h3 style={{ marginTop: 0 }}>Moderation</h3>
                  <p style={{ color: 'var(--muted)', fontSize: 13 }}>
                    Status: {post.approved_to_publish === true ? 'Approved' : post.approved_to_publish === false ? 'Rejected' : 'Pending review'}
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="gs-btn gs-btn-success gs-btn-sm" disabled={busy} onClick={() => moderate(false)}>Approve</button>
                    <button className="gs-btn gs-btn-danger gs-btn-sm" disabled={busy} onClick={() => moderate(true)}>Reject</button>
                  </div>
                </div>
              </div>
            )}

            {!loggedIn && (
              <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 12 }}>
                <Link to="/signin">Sign in</Link> to post your own job, resume, or service listing.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
