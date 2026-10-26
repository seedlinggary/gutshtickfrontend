import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Search, Plus } from 'lucide-react';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';
import TorahStatsBar from './TorahStatsBar';
import PostCard from './PostCard';
import { AdCard, useInThreadAds } from '../ads/AdSlot';

const CATEGORY_TABS = [
  { key: '', label: 'All' },
  { key: 'parsha', label: 'Parsha' },
  { key: 'halacha', label: 'Halacha' },
  { key: 'mussar', label: 'Mussar' },
  { key: 'stories', label: 'Stories' },
  { key: 'holidays', label: 'Holidays' },
];

export default function Feed() {
  const [category, setCategory] = useState('');
  const [postType, setPostType] = useState('');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('random');
  const [results, setResults] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const neededAdCount = results ? Math.floor(results.length / 6) : 0;
  const { adAt, dismiss: dismissAd } = useInThreadAds('torah_feed', neededAdCount);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), sort });
    if (category) params.set('category', category);
    if (postType) params.set('post_type', postType);
    if (q.trim()) params.set('q', q.trim());
    apiRequest('GET', null, `/torah/posts?${params.toString()}`)
      .then((d) => { setResults(d.posts || []); setHasMore(!!d.has_more); })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [category, postType, q, sort, page]);

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 1180 }}>
        <div className="tor-masthead">
          <div className="tor-masthead-row">
            <div className="tor-masthead-copy">
              <div className="tor-masthead-kicker"><BookOpen size={13} /> Gut Torah</div>
              <h1 className="tor-masthead-title">Divrei Torah, shared by the community</h1>
              <p className="tor-masthead-sub">Text, video, or photos -- anyone can share a dvar Torah, a story, or a halachic insight.</p>
            </div>
            <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setSort(sort === 'random' ? 'newest' : 'random')} style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}>
              {sort === 'random' ? 'Newest first' : 'Shuffle'}
            </button>
          </div>
          <TorahStatsBar />
        </div>

        {isLoggedIn() && (
          <div className="biz-list-cta">
            <Link to="/posts/new" className="gs-btn gs-btn-primary"><Plus size={15} /> Share Torah</Link>
          </div>
        )}

        <div className="tor-chip-row">
          {CATEGORY_TABS.map((t) => (
            <button key={t.key || 'all'} type="button" className={`tor-chip${category === t.key ? ' active' : ''}`} onClick={() => { setPage(1); setCategory(t.key); }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '0 0 16px' }}>
          <div style={{ position: 'relative', flex: '1 1 220px' }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--muted)' }} />
            <input className="gs-input" style={{ paddingLeft: 32, width: '100%' }} placeholder="Search posts" value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} />
          </div>
          <select className="gs-input" style={{ width: 160 }} value={postType} onChange={(e) => { setPage(1); setPostType(e.target.value); }}>
            <option value="">All types</option>
            <option value="text">Text</option>
            <option value="video">Video</option>
            <option value="image">Photos</option>
          </select>
        </div>

        {loading && <p style={{ color: 'var(--muted)' }}>Loading…</p>}
        {!loading && results && results.length === 0 && <p className="tor-empty">No posts found. Be the first to share something.</p>}
        {!loading && results && results.length > 0 && (
          <div className="tor-post-grid">
            {results.map((p, i) => {
              const slotIdx = i % 6 === 5 ? Math.floor(i / 6) : null;
              return (
                <React.Fragment key={p.id}>
                  <PostCard post={p} />
                  {slotIdx !== null && <AdCard ad={adAt(slotIdx)} onDismiss={() => dismissAd(slotIdx)} />}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {!loading && (page > 1 || hasMore) && (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', margin: '20px 0' }}>
            <button className="gs-btn gs-btn-outline gs-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Newer</button>
            <button className="gs-btn gs-btn-outline gs-btn-sm" disabled={!hasMore} onClick={() => setPage((p) => p + 1)}>Older</button>
          </div>
        )}
      </div>
    </div>
  );
}
