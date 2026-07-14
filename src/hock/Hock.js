import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import UploadFile from '../Uploadfile';
import ShareButton from '../ShareButton';
import { isLoggedIn } from '../auth';
import timeAgo from '../utils/timeAgo';

const TITLE_MAX = 200;
const BODY_MAX = 10000;

const SORTS = [
  { key: 'hot', label: '🔥 Hot' },
  { key: 'new', label: '🆕 New' },
  { key: 'top', label: '🏆 Top' },
];

function HeartIcon({ filled }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function PostCard({ post, onLikeChange }) {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(!!post.liked_by_me);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [busy, setBusy] = useState(false);
  const loggedIn = isLoggedIn();

  const handleLike = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!loggedIn) { navigate('/signin'); return; }
    if (busy) return;
    setBusy(true);
    try {
      const res = await apiRequest('POST', {}, `/hock/posts/${post.id}/like`);
      setLiked(res.liked);
      setLikeCount(res.like_count);
      if (onLikeChange) onLikeChange(post.id, res.like_count, res.liked);
    } catch (_) {}
    setBusy(false);
  };

  const authorInitial = post.user?.profile_name?.charAt(0).toUpperCase() || '?';
  const preview = post.body?.length > 240 ? `${post.body.slice(0, 240)}…` : post.body;
  const shareExcerpt = post.body?.length > 100 ? `${post.body.slice(0, 100)}…` : post.body;

  return (
    <div className="gs-card">
      <div className="gs-card-body">
        <div className="shtick-meta">
          <div className="shtick-author" style={{ flex: 1 }}>
            <div className="shtick-author-avatar">{authorInitial}</div>
            <span className="shtick-author-name">{post.user?.profile_name || 'Anonymous'}</span>
          </div>
          <span className="shtick-time">
            {timeAgo(post.pub_date)}
            {post.edited_at && <span title="Edited"> · edited</span>}
          </span>
          <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 8 }} title="Post ID">#{post.id}</span>
        </div>

        <Link to={`/hock/post/${post.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <h3 className="shtick-caption" style={{ cursor: 'pointer' }}>{post.title}</h3>
          {preview && (
            <p style={{ color: 'var(--text, inherit)', margin: '6px 0 0', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
              {preview}
            </p>
          )}
          {post.image_url && (
            <img className="shtick-image" src={post.image_url} alt={post.title} loading="lazy" />
          )}
        </Link>

        <div className="shtick-footer">
          <button
            className={`like-btn${liked ? ' liked' : ''}`}
            onClick={handleLike}
            title={liked ? 'Unlike' : 'Like'}
            disabled={busy}
          >
            <HeartIcon filled={liked} />
            {likeCount > 0 && <span>{likeCount}</span>}
          </button>
          <Link to={`/hock/post/${post.id}`} className="like-btn" style={{ textDecoration: 'none' }}>
            💬 {post.comment_count || 0}
            <span style={{ marginLeft: 4 }}>
              comment{post.comment_count !== 1 ? 's' : ''}
            </span>
          </Link>
          <ShareButton
            title={post.title}
            text={shareExcerpt}
            url={`${window.location.origin}/hock/post/${post.id}`}
          />
        </div>
      </div>
    </div>
  );
}

function CreatePostForm({ onCreated, onCancel }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [image, setImage] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setError('Give your conversation a title.'); return; }
    if (!body.trim()) { setError('Add some body text.'); return; }
    if (title.length > TITLE_MAX) { setError(`Title must be ${TITLE_MAX} characters or fewer.`); return; }
    setError('');
    setLoading(true);
    try {
      const created = await apiRequest('POST', {
        title: title.trim(),
        body: body.trim(),
        image: image || null,
      }, '/hock/posts');
      onCreated(created);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to post. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="gs-card" style={{ marginBottom: 20 }}>
      <div className="gs-card-body">
        <h3 style={{ marginTop: 0 }}>Start a Conversation</h3>
        {error && <div className="gs-error-box">{error}</div>}
        <form onSubmit={submit}>
          <div className="gs-field">
            <input
              className="gs-input"
              placeholder="Title — what do you want to talk about?"
              value={title}
              maxLength={TITLE_MAX}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div className="char-counter">{title.length}/{TITLE_MAX}</div>
          </div>
          <div className="gs-field">
            <textarea
              className="gs-input gs-textarea"
              placeholder="Say more…"
              value={body}
              maxLength={BODY_MAX}
              rows={5}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <div className="gs-field">
            <label className="gs-label">Image (optional)</label>
            <UploadFile setInvestors={(name) => setImage(name)} apiextension="/hock/upload" />
            {image && (
              <p style={{ fontSize: 12, color: 'var(--success)', marginTop: 6 }}>✓ Image attached</p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="gs-btn gs-btn-primary" disabled={loading}>
              {loading ? 'Posting…' : 'Post'}
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

export default function Hock() {
  const navigate = useNavigate();
  const [sort, setSort] = useState('hot');
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

  const load = useCallback((sortKey, pageNum, append, searchTerm) => {
    if (append) setLoadingMore(true); else setLoading(true);
    setError(false);
    const params = new URLSearchParams({ sort: sortKey, page: pageNum });
    if (searchTerm) params.set('q', searchTerm);
    apiRequest('GET', null, `/hock/posts?${params.toString()}`)
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
    load(sort, 1, false, debouncedSearch);
  }, [sort, debouncedSearch, load]);

  const handleCreated = (created) => {
    setComposing(false);
    // Show it immediately at the top regardless of active sort.
    setPosts((prev) => [created, ...prev]);
  };

  const startCompose = () => {
    if (!loggedIn) { navigate('/signin'); return; }
    setComposing((c) => !c);
  };

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 680 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <h1 style={{ margin: 0 }}>🗣️ Hock</h1>
          <button className="gs-btn gs-btn-primary" onClick={startCompose}>
            {composing ? 'Close' : '+ New Post'}
          </button>
        </div>
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>
          The Good Shtick's discussion forum — start a conversation, weigh in, and vote.
        </p>

        {composing && loggedIn && (
          <CreatePostForm onCreated={handleCreated} onCancel={() => setComposing(false)} />
        )}

        <div className="games-search-row" style={{ marginBottom: 12 }}>
          <input
            type="text"
            className="auth-input games-search-input"
            placeholder="🔎 Search Hock posts by title, body, id, or author…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="content-type-tabs" style={{ marginBottom: 16 }}>
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              className={`content-type-tab${sort === s.key ? ' active' : ''}`}
              onClick={() => setSort(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="gs-loading"><div className="gs-spinner" /> Loading…</div>
        )}

        {!loading && error && (
          <div className="gs-error-box">Couldn't load Hock right now. Please try again.</div>
        )}

        {!loading && !error && posts.length === 0 && (
          <div className="gs-empty">
            <p style={{ fontSize: 40, marginBottom: 8 }}>🗣️</p>
            <p>{debouncedSearch ? `No posts match "${debouncedSearch}".` : 'No conversations yet. Be the first to start one!'}</p>
          </div>
        )}

        {!loading && !error && posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}

        {!loading && !error && hasMore && (
          <div style={{ textAlign: 'center', paddingTop: 8, paddingBottom: 24 }}>
            <button
              className="gs-btn gs-btn-outline"
              onClick={() => load(sort, page + 1, true, debouncedSearch)}
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
