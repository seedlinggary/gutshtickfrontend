import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Newspaper, Plus } from 'lucide-react';
import apiRequest from '../ApiRequest';
import ArticleCard from './ArticleCard';

export default function MyPosts() {
  const [articles, setArticles] = useState(null);

  useEffect(() => {
    apiRequest('GET', null, '/news/my/articles').then((d) => setArticles(d.articles || [])).catch(() => setArticles([]));
  }, []);

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 1180 }}>
        <div className="news-masthead">
          <div className="news-masthead-kicker"><Newspaper size={13} /> Your account</div>
          <h1 className="news-masthead-title">My Posts</h1>
          <p className="news-masthead-sub">Everything you've written.</p>
        </div>

        <div className="biz-list-cta">
          <Link to="/articles/new" className="gs-btn gs-btn-primary"><Plus size={15} /> Write a Post</Link>
        </div>

        {articles === null && <p style={{ color: 'var(--muted)' }}>Loading…</p>}
        {articles && articles.length === 0 && <p className="news-empty">You haven't written anything yet.</p>}
        {articles && articles.length > 0 && (
          <div className="news-article-grid">
            {articles.map((a) => <ArticleCard key={a.id} article={a} />)}
          </div>
        )}
      </div>
    </div>
  );
}
