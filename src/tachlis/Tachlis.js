import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import ShareButton from '../ShareButton';
import { isLoggedIn } from '../auth';
import timeAgo from '../utils/timeAgo';
import PinSomethingCard from '../PinSomethingCard';

const TITLE_MAX = 150;
const BODY_MAX = 8000;
const CONTACT_MAX = 300;
const LOCATION_MAX = 120;
const COMPENSATION_MAX = 120;

const TABS = [
  { key: '', label: 'All' },
  { key: 'job', label: 'Jobs' },
  { key: 'resume', label: 'Resumes' },
  { key: 'service', label: 'Services' },
];

const TYPE_META = {
  job: { label: 'Job', color: 'var(--accent)' },
  resume: { label: 'Resume', color: 'var(--success)' },
  service: { label: 'Service', color: '#6366f1' },
};

export function TypeBadge({ type }) {
  const meta = TYPE_META[type] || { label: type, color: 'var(--muted)' };
  return (
    <span style={{
      display: 'inline-block',
      fontSize: 11,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      color: '#fff',
      background: meta.color,
      borderRadius: 999,
      padding: '2px 10px',
    }}>
      {meta.label}
    </span>
  );
}

function PostCard({ post }) {
  const authorInitial = post.user?.profile_name?.charAt(0).toUpperCase() || '?';
  const preview = post.body?.length > 220 ? `${post.body.slice(0, 220)}…` : post.body;
  const shareText = post.body?.length > 140
    ? `${post.body.slice(0, 140)}…`
    : (post.body || [post.location, post.compensation].filter(Boolean).join(' • '));

  return (
    <Link to={`/tachlis/post/${post.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="gs-card genre-flyer" style={{ marginBottom: 14 }}>
        <div className="gs-card-body">
          <span className="card-kind">📌 Flyer · Tachlis</span>
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
            <span className="shtick-time">
              {timeAgo(post.pub_date)}
              <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 8 }} title="Post ID">#{post.id}</span>
            </span>
          </div>

          <h3 className="shtick-caption" style={{ cursor: 'pointer', marginTop: 8 }}>{post.title}</h3>
          {preview && (
            <p style={{ color: 'var(--text, inherit)', margin: '6px 0 0', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
              {preview}
            </p>
          )}

          <div className="shtick-footer">
            <div className="shtick-author">
              <div className="shtick-author-avatar">{authorInitial}</div>
              <span className="shtick-author-name">{post.user?.profile_name || 'Anonymous'}</span>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <ShareButton
                title={post.title}
                text={shareText}
                url={`${window.location.origin}/tachlis/post/${post.id}`}
              />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function CreatePostForm({ onCreated, onCancel }) {
  const [postType, setPostType] = useState('job');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [contact, setContact] = useState('');
  const [location, setLocation] = useState('');
  const [compensation, setCompensation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setError('Give your post a title.'); return; }
    if (!body.trim()) { setError('Add some details in the body.'); return; }
    if (!contact.trim()) { setError('Add a way for people to contact you (email, phone, or link).'); return; }
    if (title.length > TITLE_MAX) { setError(`Title must be ${TITLE_MAX} characters or fewer.`); return; }
    setError('');
    setLoading(true);
    try {
      const created = await apiRequest('POST', {
        post_type: postType,
        title: title.trim(),
        body: body.trim(),
        contact: contact.trim(),
        location: location.trim() || null,
        compensation: compensation.trim() || null,
      }, '/tachlis/posts');
      setSubmitted(true);
      if (onCreated) onCreated(created);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to post. Please try again.');
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="gs-card" style={{ marginBottom: 20 }}>
        <div className="gs-card-body">
          <div className="gs-success-box">
            ✅ Your post is in! It's pending review and will appear on the board once an admin approves it.
          </div>
          <button className="gs-btn gs-btn-outline" style={{ marginTop: 10 }} onClick={onCancel}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="gs-card" style={{ marginBottom: 20 }}>
      <div className="gs-card-body">
        <h3 style={{ marginTop: 0 }}>New Tachlis Post</h3>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: -6 }}>
          Every post is reviewed by an admin before it goes live on the board.
        </p>
        {error && <div className="gs-error-box">{error}</div>}
        <form onSubmit={submit}>
          <div className="gs-field">
            <label className="gs-label">Type</label>
            <div className="content-type-tabs">
              {['job', 'resume', 'service'].map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`content-type-tab${postType === t ? ' active' : ''}`}
                  onClick={() => setPostType(t)}
                >
                  {TYPE_META[t].label}
                </button>
              ))}
            </div>
          </div>
          <div className="gs-field">
            <input
              className="gs-input"
              placeholder="Title"
              value={title}
              maxLength={TITLE_MAX}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div className="char-counter">{title.length}/{TITLE_MAX}</div>
          </div>
          <div className="gs-field">
            <textarea
              className="gs-input gs-textarea"
              placeholder="Details — describe the job, your experience, or the service you offer…"
              value={body}
              maxLength={BODY_MAX}
              rows={5}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <div className="gs-field">
            <input
              className="gs-input"
              placeholder="Contact info (email, phone, or link) — shown publicly on the post"
              value={contact}
              maxLength={CONTACT_MAX}
              onChange={(e) => setContact(e.target.value)}
            />
          </div>
          <div className="gs-field">
            <input
              className="gs-input"
              placeholder="Location (optional) — e.g. Brooklyn, NY or Remote"
              value={location}
              maxLength={LOCATION_MAX}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div className="gs-field">
            <input
              className="gs-input"
              placeholder="Compensation (optional) — e.g. $50k-70k or Negotiable"
              value={compensation}
              maxLength={COMPENSATION_MAX}
              onChange={(e) => setCompensation(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="gs-btn gs-btn-primary" disabled={loading}>
              {loading ? 'Submitting…' : 'Submit for review'}
            </button>
            <button type="button" className="gs-btn gs-btn-outline" onClick={onCancel} disabled={loading}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Tachlis() {
  const navigate = useNavigate();
  const [type, setType] = useState('');
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [composing, setComposing] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const loggedIn = isLoggedIn();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback((typeKey, pageNum, append, searchTerm) => {
    if (append) setLoadingMore(true); else setLoading(true);
    setError(false);
    const params = new URLSearchParams({ page: pageNum });
    if (typeKey) params.set('type', typeKey);
    if (searchTerm) params.set('q', searchTerm);
    apiRequest('GET', null, `/tachlis/posts?${params.toString()}`)
      .then((res) => {
        const list = res.posts || [];
        setPosts((prev) => (append ? [...prev, ...list] : list));
        setHasMore(!!res.has_more);
        setPage(pageNum);
      })
      .catch(() => setError(true))
      .finally(() => { setLoading(false); setLoadingMore(false); });
  }, []);

  useEffect(() => {
    load(type, 1, false, debouncedSearch);
  }, [type, debouncedSearch, load]);

  const handleCreated = () => {
    // New posts start pending review, so don't inject into the (approved-only) list.
  };

  const startCompose = () => {
    if (!loggedIn) { navigate(`/signin?next=${encodeURIComponent('/tachlis')}`); return; }
    setComposing((c) => !c);
  };

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 680 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <h1 style={{ margin: 0 }}>💼 Tachlis</h1>
          <button className="gs-btn gs-btn-primary" onClick={startCompose}>
            {composing ? 'Close' : '+ New Post'}
          </button>
        </div>
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>
          Gut Shtick's classifieds board — post a job, a resume, or a service. Every post is contact-first: reach out directly.
        </p>

        {composing && loggedIn && (
          <CreatePostForm onCreated={handleCreated} onCancel={() => setComposing(false)} />
        )}

        <div className="games-search-row" style={{ marginBottom: 12 }}>
          <input
            type="text"
            className="auth-input games-search-input"
            placeholder="🔎 Search Tachlis posts by title, body, location, id, or author…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="content-type-tabs" style={{ marginBottom: 16 }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`content-type-tab${type === t.key ? ' active' : ''}`}
              onClick={() => setType(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="gs-loading"><div className="gs-spinner" /> Loading…</div>
        )}

        {!loading && error && (
          <div className="gs-error-box">Couldn't load Tachlis right now. Please try again.</div>
        )}

        {!loading && !error && posts.length === 0 && (
          <div className="gs-empty">
            <p style={{ fontSize: 40, marginBottom: 8 }}>💼</p>
            <p>{debouncedSearch ? `No posts match "${debouncedSearch}".` : 'No posts here yet. Be the first!'}</p>
          </div>
        )}

        {!loading && !error && posts.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <PinSomethingCard to="/tachlis" prompt="Hiring, looking for work, or offering a service? Post a flyer." cta="Post a flyer" />
          </div>
        )}

        {!loading && !error && posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}

        {!loading && !error && hasMore && (
          <div style={{ textAlign: 'center', paddingTop: 8, paddingBottom: 24 }}>
            <button
              className="gs-btn gs-btn-outline"
              onClick={() => load(type, page + 1, true, debouncedSearch)}
              disabled={loadingMore}
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
