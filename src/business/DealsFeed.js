import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import ShareButton from '../ShareButton';
import AdSlot from '../ads/AdSlot';
import timeAgo from '../utils/timeAgo';
import DataDisclaimer from './DataDisclaimer';
import detectNearbyCity from './geolocation';
import { POST_TYPE_META, CATEGORY_TINTS } from './categories';

const TYPES = [
  { key: '', label: 'All types' },
  { key: 'sale', label: '💰 Sales' },
  { key: 'new_product', label: '✨ New Products' },
  { key: 'new_service', label: '🛎️ New Services' },
  { key: 'event', label: '📅 Events' },
  { key: 'announcement', label: '📣 Announcements' },
];

function SkeletonCard() {
  return (
    <div className="biz-skeleton-card" style={{ flexDirection: 'column', gap: 8 }}>
      <div className="biz-skeleton" style={{ width: '30%', height: 14 }} />
      <div className="biz-skeleton" style={{ width: '70%', height: 18 }} />
      <div className="biz-skeleton" style={{ width: '100%', height: 40 }} />
    </div>
  );
}

function PostCard({ post }) {
  const meta = POST_TYPE_META[post.post_type] || { label: post.post_type, color: 'var(--muted)' };
  const tint = CATEGORY_TINTS[post.business?.category] || meta.color;
  return (
    <div className="gs-card biz-deal-card" style={{ marginBottom: 14, '--deal-color': meta.color }}>
      <div className="gs-card-body">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <div className="biz-card-media" style={{ width: 44, height: 44, borderRadius: 12, fontSize: 18, '--media-tint': tint }}>
            {post.business?.logo_url ? (
              <img src={post.business.logo_url} alt={post.business.name} />
            ) : (post.business?.is_food ? '🍽️' : '🏪')}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Link to={`/business/${post.business?.slug}`} style={{ fontWeight: 700, textDecoration: 'none', color: 'inherit', display: 'block' }}>
              {post.business?.name}
            </Link>
            <span className="shtick-time">{timeAgo(post.pub_date)}</span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#fff', background: meta.color, borderRadius: 999, padding: '2px 10px', flexShrink: 0 }}>
            {meta.label}
          </span>
        </div>
        <h3 className="shtick-caption" style={{ marginTop: 0 }}>{post.title}</h3>
        <p style={{ whiteSpace: 'pre-wrap', margin: '6px 0 0' }}>{post.body}</p>
        {post.image_url && <img src={post.image_url} alt={post.title} className="shtick-image" style={{ marginTop: 8 }} />}
        <div className="shtick-footer">
          <div />
          <ShareButton title={post.title} text={post.body} url={`${window.location.origin}/deals?post=${post.id}`} />
        </div>
      </div>
    </div>
  );
}

export default function DealsFeed() {
  const [searchParams] = useSearchParams();
  const businessId = searchParams.get('business_id') || '';
  const [type, setType] = useState('');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [city, setCity] = useState('');
  const [debouncedCity, setDebouncedCity] = useState('');
  const [cityAuto, setCityAuto] = useState(false);
  const [sort, setSort] = useState('recent');
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedCity(city.trim()), 350);
    return () => clearTimeout(t);
  }, [city]);

  // Default to "near me" on first load, same as the Directory -- only ever
  // sets an initial value, never overwrites something the user typed.
  useEffect(() => {
    let cancelled = false;
    detectNearbyCity().then((found) => {
      if (found && !cancelled) {
        setCity((current) => {
          if (current) return current;
          setCityAuto(true);
          return found;
        });
      }
    });
    return () => { cancelled = true; };
  }, []);

  const load = useCallback((pageNum, append) => {
    if (append) setLoadingMore(true); else setLoading(true);
    setError(false);
    const params = new URLSearchParams({ page: pageNum, sort });
    if (type) params.set('type', type);
    if (debouncedQ) params.set('q', debouncedQ);
    if (debouncedCity) params.set('city', debouncedCity);
    if (businessId) params.set('business_id', businessId);
    apiRequest('GET', null, `/business/posts?${params.toString()}`)
      .then((res) => {
        const list = res.posts || [];
        setPosts((prev) => (append ? [...prev, ...list] : list));
        setHasMore(!!res.has_more);
        setPage(pageNum);
      })
      .catch(() => setError(true))
      .finally(() => { setLoading(false); setLoadingMore(false); });
  }, [type, debouncedQ, debouncedCity, sort, businessId]);

  useEffect(() => { load(1, false); }, [load]);

  const countLabel = `${posts.length}${hasMore ? '+' : ''} deal${posts.length === 1 && !hasMore ? '' : 's'}`;

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 720 }}>
        <h1>🏷️ Deals</h1>
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>
          Sales, new products, events, and announcements from businesses in the directory.
        </p>

        <div className="biz-topbar">
          <input
            type="text"
            className="auth-input biz-topbar-search"
            placeholder="🔎 Search deals…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <input
            type="text"
            className="auth-input"
            style={{ maxWidth: 150 }}
            placeholder="📍 City"
            value={city}
            onChange={(e) => { setCity(e.target.value); setCityAuto(false); }}
          />
          {cityAuto && city && (
            <span className="biz-badge biz-badge-open" title="Defaulted to your location — edit or clear the city field to change it">📍 Near you</span>
          )}
          <select className="auth-input" style={{ maxWidth: 190 }} value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          <div className="biz-segmented">
            <button type="button" className={`biz-segmented-btn${sort === 'recent' ? ' active' : ''}`} onClick={() => setSort('recent')}>Newest</button>
            <button type="button" className={`biz-segmented-btn${sort === 'random' ? ' active' : ''}`} onClick={() => setSort('random')}>🔀 Surprise</button>
          </div>
          <span className="biz-result-count" style={{ marginLeft: 'auto' }}>{!loading && !error ? countLabel : ' '}</span>
        </div>

        {loading && <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>}
        {!loading && error && <div className="gs-error-box">Couldn't load deals right now. Please try again.</div>}
        {!loading && !error && posts.length === 0 && (
          <div className="gs-empty"><p style={{ fontSize: 40, marginBottom: 8 }}>🏷️</p><p>No deals here yet.</p></div>
        )}

        {!loading && !error && posts.map((post, i) => (
          <React.Fragment key={post.id}>
            <PostCard post={post} />
            {i === 3 && <AdSlot placement="deals_feed" />}
          </React.Fragment>
        ))}

        {!loading && !error && hasMore && (
          <div style={{ textAlign: 'center', paddingTop: 8, paddingBottom: 24 }}>
            <button className="gs-btn gs-btn-outline" onClick={() => load(page + 1, true)} disabled={loadingMore}>
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
        {!loading && !error && <DataDisclaimer />}
      </div>
    </div>
  );
}
