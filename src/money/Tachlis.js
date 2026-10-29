import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Pin, MapPin, Home, Tag, DollarSign, CheckCircle2, ClipboardPaste, Briefcase, Search, SlidersHorizontal, Plus, Store } from 'lucide-react';
import apiRequest from '../ApiRequest';
import ShareButton from '../ShareButton';
import { isLoggedIn } from '../auth';
import timeAgo from '../utils/timeAgo';
import PinSomethingCard from '../PinSomethingCard';
import { AdCard, useInThreadAds } from '../ads/AdSlot';
import FreshnessBadge from '../utils/FreshnessBadge';
import GetAlertsButton from '../alerts/GetAlertsButton';
import { siteUrl } from '../siteMode';

const TITLE_MAX = 150;
const BODY_MAX = 8000;
const CONTACT_MAX = 300;
const LOCATION_MAX = 120;
const COMPENSATION_MAX = 120;
const CATEGORY_MAX = 60;

const TABS = [
  { key: '', label: 'All' },
  { key: 'job', label: 'Jobs' },
  { key: 'resume', label: 'Resumes' },
];

const TYPE_META = {
  job: { label: 'Job', color: 'var(--accent)' },
  resume: { label: 'Resume', color: 'var(--success)' },
  // Services-offered posts are retired (Gut Community already covers this
  // via its own business/vendor listings) -- kept here only so any
  // already-posted service listing still renders with a real label/color
  // instead of falling back to TypeBadge's generic muted default.
  service: { label: 'Service', color: 'var(--tag-flyer-text)' },
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

/** Small "Posted by [Business]" pill for a post that came from a claimed
 * business's own Hiring tab (post.business_id set, see
 * BusinessOwnerTools.js's HiringTab) -- links out to that business's public
 * profile, which lives on the Business sub-site, not this one. Shared by
 * PostCard and TachlisPostPage. */
export function BusinessPostBadge({ post }) {
  if (!post.business_id || !post.business_slug) return null;
  return (
    <a
      href={siteUrl('business', `/business/${post.business_slug}`)}
      target="_blank" rel="noopener noreferrer"
      className="tachlis-business-badge"
      onClick={(e) => e.stopPropagation()}
    >
      <Store size={12} /> Posted by {post.business_name || 'a local business'}
    </a>
  );
}

export function PostCard({ post }) {
  const authorInitial = post.user?.profile_name?.charAt(0).toUpperCase() || '?';
  const preview = post.body?.length > 220 ? `${post.body.slice(0, 220)}…` : post.body;
  const shareText = post.body?.length > 140
    ? `${post.body.slice(0, 140)}…`
    : (post.body || [post.location, post.compensation].filter(Boolean).join(' • '));

  return (
    <Link to={`/tachlis/post/${post.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="gs-card genre-flyer" style={{ marginBottom: 14 }}>
        <div className="gs-card-body">
          <span className="card-kind" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Pin size={13} /> Flyer · Job Board</span>
          <div className="shtick-meta">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, flexWrap: 'wrap' }}>
              <TypeBadge type={post.post_type} />
              <FreshnessBadge item={post} />
              <BusinessPostBadge post={post} />
              {post.location && (
                <span style={{ fontSize: 13, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin size={13} /> {post.location}</span>
              )}
              {post.remote && (
                <span style={{ fontSize: 13, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Home size={13} /> Remote</span>
              )}
              {post.category && (
                <span style={{ fontSize: 13, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Tag size={13} /> {post.category}</span>
              )}
              {post.compensation && (
                <span style={{ fontSize: 13, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><DollarSign size={13} /> {post.compensation}</span>
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
  const [category, setCategory] = useState('');
  const [remote, setRemote] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [pasteText, setPasteText] = useState('');
  const [pasteOpen, setPasteOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');

  const parseFromPaste = async () => {
    setParseError('');
    setParsing(true);
    try {
      const draft = await apiRequest('POST', { text: pasteText }, '/tachlis/posts/parse-draft');
      if (draft.post_type) setPostType(draft.post_type);
      if (draft.title) setTitle(draft.title);
      if (draft.body) setBody(draft.body);
      if (draft.contact) setContact(draft.contact);
      if (draft.location) setLocation(draft.location);
      if (draft.compensation) setCompensation(draft.compensation);
      if (draft.category) setCategory(draft.category);
      if (draft.remote !== null && draft.remote !== undefined) setRemote(draft.remote);
      setPasteOpen(false);
    } catch (err) {
      setParseError(typeof err === 'string' ? err : "Couldn't read that -- try pasting more detail, or fill in the form by hand.");
    } finally {
      setParsing(false);
    }
  };

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
        category: category.trim() || null,
        remote: postType === 'job' ? remote : null,
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
          <div className="gs-success-box" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle2 size={15} /> Your post is in! It's pending review and will appear on the board once an admin approves it.
          </div>
          <button className="gs-btn gs-btn-outline" style={{ marginTop: 10 }} onClick={onCancel}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="gs-card" style={{ marginBottom: 20 }}>
      <div className="gs-card-body">
        <h3 style={{ marginTop: 0 }}>New Job Board Post</h3>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: -6 }}>
          Every post is reviewed by an admin before it goes live on the board.
        </p>
        {error && <div className="gs-error-box">{error}</div>}

        {!pasteOpen ? (
          <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" style={{ marginBottom: 14, display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={() => setPasteOpen(true)}>
            <ClipboardPaste size={14} /> Paste a WhatsApp post instead
          </button>
        ) : (
          <div className="gs-field" style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 8px' }}>
              We'll read it and fill in the form below -- review everything before submitting.
            </p>
            <textarea
              className="gs-input gs-textarea"
              rows={4}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste the post text here…"
            />
            {parseError && <div className="gs-error-box" style={{ marginTop: 6 }}>{parseError}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button type="button" className="gs-btn gs-btn-primary gs-btn-sm" onClick={parseFromPaste} disabled={parsing || !pasteText.trim()}>
                {parsing ? 'Reading…' : 'Fill in from this'}
              </button>
              <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => { setPasteOpen(false); setParseError(''); }} disabled={parsing}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <form onSubmit={submit}>
          <div className="gs-field">
            <label className="gs-label">Type</label>
            <div className="content-type-tabs">
              {['job', 'resume'].map((t) => (
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
              placeholder="Details — describe the job or your experience…"
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
          <div className="gs-field">
            <input
              className="gs-input"
              placeholder="Category (optional) — e.g. Tech, Healthcare, Education"
              value={category}
              maxLength={CATEGORY_MAX}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>
          {postType === 'job' && (
            <div className="gs-field">
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                <input type="checkbox" checked={remote} onChange={(e) => setRemote(e.target.checked)} />
                This job is remote
              </label>
            </div>
          )}
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
  const [searchParams, setSearchParams] = useSearchParams();
  // Every filter initializes from the URL (once, on mount) so a copied link
  // restores the same search -- see the sync-back effect below, which is
  // the other half of that round trip.
  const [type, setType] = useState(() => searchParams.get('type') || '');
  const [posts, setPosts] = useState([]);
  const neededAdCount = Math.floor(posts.length / 5);
  const { adAt, dismiss: dismissAd } = useInThreadAds('tachlis_board', neededAdCount);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [composing, setComposing] = useState(false);
  const [search, setSearch] = useState(() => searchParams.get('q') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get('q') || '');
  const [filterOpen, setFilterOpen] = useState(false);
  const [location, setLocation] = useState(() => searchParams.get('location') || '');
  const [category, setCategory] = useState(() => searchParams.get('category') || '');
  const [remoteOnly, setRemoteOnly] = useState(() => searchParams.get('remote') === '1');
  const [hasPay, setHasPay] = useState(() => searchParams.get('has_pay') === '1');
  const [sort, setSort] = useState(() => searchParams.get('sort') || 'newest');
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const loggedIn = isLoggedIn();
  const activeFilterCount = [location, category, remoteOnly, hasPay, sort !== 'newest'].filter(Boolean).length;

  useEffect(() => {
    apiRequest('GET', null, '/tachlis/locations')
      .then((res) => setLocations(res.locations || []))
      .catch(() => {});
    apiRequest('GET', null, '/tachlis/categories')
      .then((res) => setCategories(res.categories || []))
      .catch(() => {});
  }, []);

  // Lets MoneyNavbar's "Post to Tachlis" button jump straight into compose
  // mode (via /tachlis?new=1) without needing a separate /tachlis/new
  // route -- this form is simple enough (5 flat fields, no photo upload)
  // that it doesn't need its own dedicated page the way Estates/Business's
  // heavier create flows do.
  useEffect(() => {
    if (searchParams.get('new') === '1') setComposing(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- read once on mount only
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Keeps the address bar in sync with every active filter (not `page` --
  // only the search itself needs to be a shareable/reloadable link) so a
  // copied URL reproduces the same results. `replace: true` avoids filling
  // browser history with one entry per keystroke/toggle.
  useEffect(() => {
    const next = new URLSearchParams();
    if (type) next.set('type', type);
    if (debouncedSearch) next.set('q', debouncedSearch);
    if (location) next.set('location', location);
    if (category) next.set('category', category);
    if (remoteOnly) next.set('remote', '1');
    if (hasPay) next.set('has_pay', '1');
    if (sort !== 'newest') next.set('sort', sort);
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, debouncedSearch, location, category, remoteOnly, hasPay, sort]);

  const load = useCallback((typeKey, pageNum, append, searchTerm, locationVal, categoryVal, remoteVal, hasPayVal, sortVal) => {
    if (append) setLoadingMore(true); else setLoading(true);
    setError(false);
    const params = new URLSearchParams({ page: pageNum });
    if (typeKey) params.set('type', typeKey);
    if (searchTerm) params.set('q', searchTerm);
    if (locationVal) params.set('location', locationVal);
    if (categoryVal) params.set('category', categoryVal);
    if (remoteVal) params.set('remote', '1');
    if (hasPayVal) params.set('has_pay', '1');
    if (sortVal && sortVal !== 'newest') params.set('sort', sortVal);
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
    load(type, 1, false, debouncedSearch, location, category, remoteOnly, hasPay, sort);
  }, [type, debouncedSearch, location, category, remoteOnly, hasPay, sort, load]);

  const clearFilters = () => {
    setLocation('');
    setCategory('');
    setRemoteOnly(false);
    setHasPay(false);
    setSort('newest');
  };

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
        <div className="gs-board-hero">
          <div className="gs-board-hero-top">
            <div>
              <span className="gs-board-hero-eyebrow">Gut Money Classifieds</span>
              <h1 className="gs-board-hero-title"><Briefcase size={24} /> Job Board</h1>
              <p className="gs-board-hero-sub">
                Post a job opening or your resume. Every post is contact-first: reach out directly.
              </p>
            </div>
            <button className="gs-board-hero-cta" onClick={startCompose}>
              {composing ? 'Close' : <><Plus size={14} /> New Post</>}
            </button>
          </div>
        </div>

        {composing && loggedIn && (
          <CreatePostForm onCreated={handleCreated} onCancel={() => setComposing(false)} />
        )}

        <div className="board-toolbar">
          <div className="board-toolbar-search">
            <Search size={15} className="board-toolbar-search-icon" />
            <input
              type="text"
              className="board-toolbar-search-input"
              placeholder="Search Job Board posts by title, body, location, id, or author…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="board-toolbar-controls">
            <div className="content-type-tabs" style={{ margin: 0 }}>
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
            <div className="board-toolbar-actions">
              <button
                type="button"
                className={`gs-btn gs-btn-outline gs-btn-sm${activeFilterCount > 0 ? ' active' : ''}`}
                onClick={() => setFilterOpen((o) => !o)}
              >
                <SlidersHorizontal size={13} /> Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </button>
              <GetAlertsButton
                searchType="tachlis"
                filters={{
                  type, q: debouncedSearch, location, category,
                  remote: remoteOnly ? '1' : '', has_pay: hasPay ? '1' : '',
                }}
                label={[TABS.find((t) => t.key === type)?.label !== 'All' ? TABS.find((t) => t.key === type)?.label : null, location || category]
                  .filter(Boolean).join(' in ') || 'Job Board posts'}
              />
            </div>
          </div>

          {filterOpen && (
            <div className="board-toolbar-filters">
              <div className="gs-field" style={{ margin: 0 }}>
                <label className="gs-label">Location</label>
                <select className="gs-input" style={{ minWidth: 180 }} value={location} onChange={(e) => setLocation(e.target.value)}>
                  <option value="">All locations</option>
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
              <div className="gs-field" style={{ margin: 0 }}>
                <label className="gs-label">Category</label>
                <select className="gs-input" style={{ minWidth: 160 }} value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="gs-field" style={{ margin: 0 }}>
                <label className="gs-label">Sort</label>
                <select className="gs-input" style={{ minWidth: 150 }} value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, marginBottom: 2 }}>
                <input type="checkbox" checked={remoteOnly} onChange={(e) => setRemoteOnly(e.target.checked)} />
                Remote only
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, marginBottom: 2 }}>
                <input type="checkbox" checked={hasPay} onChange={(e) => setHasPay(e.target.checked)} />
                Pay listed only
              </label>
              {activeFilterCount > 0 && (
                <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={clearFilters}>
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>

        {loading && (
          <div className="gs-loading"><div className="gs-spinner" /> Loading…</div>
        )}

        {!loading && error && (
          <div className="gs-error-box">Couldn't load the Job Board right now. Please try again.</div>
        )}

        {!loading && !error && posts.length === 0 && (
          <div className="gs-empty">
            <div className="gs-empty-icon"><Briefcase size={26} /></div>
            <p>{debouncedSearch ? `No posts match "${debouncedSearch}".` : 'No posts here yet. Be the first!'}</p>
          </div>
        )}

        {!loading && !error && posts.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <PinSomethingCard to="/tachlis" prompt="Hiring, or looking for work? Post a flyer." cta="Post a flyer" />
          </div>
        )}

        {!loading && !error && posts.map((post, i) => {
          const slotIdx = i % 5 === 4 ? Math.floor(i / 5) : null;
          return (
            <React.Fragment key={post.id}>
              <PostCard post={post} />
              {slotIdx !== null && <AdCard ad={adAt(slotIdx)} onDismiss={() => dismissAd(slotIdx)} />}
            </React.Fragment>
          );
        })}

        {!loading && !error && hasMore && (
          <div style={{ textAlign: 'center', paddingTop: 8, paddingBottom: 24 }}>
            <button
              className="gs-btn gs-btn-outline"
              onClick={() => load(type, page + 1, true, debouncedSearch, location, category, remoteOnly, hasPay, sort)}
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
