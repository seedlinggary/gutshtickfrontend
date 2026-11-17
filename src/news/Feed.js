import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Newspaper, Search, Plus } from 'lucide-react';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';
import NewsStatsBar from './NewsStatsBar';
import ArticleCard, { categoryLabel } from './ArticleCard';

export default function Feed() {
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('');
  const [source, setSource] = useState('');
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('GET', null, '/news/categories')
      .then((d) => setCategories(d.categories || []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), sort: 'newest' });
    if (category) params.set('category', category);
    if (source) params.set('source', source);
    if (q.trim()) params.set('q', q.trim());
    apiRequest('GET', null, `/news/articles?${params.toString()}`)
      .then((d) => { setResults(d.articles || []); setHasMore(!!d.has_more); })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [category, source, q, page]);

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 1180 }}>
        <div className="news-masthead">
          <div className="news-masthead-kicker"><Newspaper size={13} /> GutKol</div>
          <h1 className="news-masthead-title">News, curated and community-written</h1>
          <p className="news-masthead-sub">Headlines pulled from real news sources, plus original posts from the community -- every scraped headline is reviewed by a human before it ever shows up here.</p>
          <NewsStatsBar />
        </div>

        {isLoggedIn() && (
          <div className="biz-list-cta">
            <Link to="/articles/new" className="gs-btn gs-btn-primary"><Plus size={15} /> Write a Post</Link>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '0 0 16px' }}>
          <div style={{ position: 'relative', flex: '1 1 220px' }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--muted)' }} />
            <input className="gs-input" style={{ paddingLeft: 32, width: '100%' }} placeholder="Search articles" value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} />
          </div>
          <select className="gs-input" style={{ width: 170 }} value={category} onChange={(e) => { setPage(1); setCategory(e.target.value); }}>
            <option value="">All topics</option>
            {categories.map((c) => <option key={c} value={c}>{categoryLabel(c)}</option>)}
          </select>
          <select className="gs-input" style={{ width: 160 }} value={source} onChange={(e) => { setPage(1); setSource(e.target.value); }}>
            <option value="">All posts</option>
            <option value="original">Community posts</option>
            <option value="aggregated">News headlines</option>
          </select>
        </div>

        {loading && <p style={{ color: 'var(--muted)' }}>Loading…</p>}
        {!loading && results && results.length === 0 && <p className="news-empty">No articles found.</p>}
        {!loading && results && results.length > 0 && (
          <div className="news-article-grid">
            {results.map((a) => <ArticleCard key={a.id} article={a} />)}
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
