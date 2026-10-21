import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Pencil, Trash2, ExternalLink, Newspaper } from 'lucide-react';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';

const CATEGORY_LABEL = {
  world: 'World', politics: 'Politics', business: 'Business', science: 'Science',
  health: 'Health', sports: 'Sports', entertainment: 'Entertainment', other: 'Other',
};

export default function ArticleProfile() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setArticle(null);
    setNotFound(false);
    apiRequest('GET', null, `/news/articles/${slug}`).then(setArticle).catch(() => setNotFound(true));
  }, [slug]);

  const toggleLike = async () => {
    if (!isLoggedIn() || !article) return;
    const next = !article.is_liked;
    try {
      await apiRequest(next ? 'POST' : 'DELETE', null, `/news/articles/${article.id}/like`);
      setArticle((a) => ({ ...a, is_liked: next, like_count: a.like_count + (next ? 1 : -1) }));
    } catch (e) { /* ignore */ }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    try {
      await apiRequest('DELETE', null, `/news/articles/${article.id}`);
      navigate('/my-articles');
    } catch (e) { /* ignore */ }
  };

  if (notFound) {
    return (
      <div className="feed-section"><div className="gs-container" style={{ maxWidth: 760 }}>
        <p>Article not found. <Link to="/">Back to Articles</Link></p>
      </div></div>
    );
  }
  if (!article) {
    return <div className="feed-section"><div className="gs-container"><div className="gs-loading"><div className="gs-spinner" /> Loading…</div></div></div>;
  }

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 760 }}>
        <Link to="/" className="news-back-link"><ArrowLeft size={13} /> Back to Articles</Link>

        {article.image_url ? (
          <img src={article.image_url} alt={article.title} style={{ width: '100%', maxHeight: 360, objectFit: 'cover', borderRadius: 12, marginBottom: 18 }} />
        ) : (
          <div style={{ width: '100%', height: 200, background: 'var(--surface-deep)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-faint)', marginBottom: 18 }}>
            <Newspaper size={40} />
          </div>
        )}

        <div className={`news-article-card-badge${!article.imported ? ' original' : ''}`} style={{ position: 'static', display: 'inline-flex', marginBottom: 10 }}>
          {article.imported ? (CATEGORY_LABEL[article.category] || article.category) : 'Original post'}
        </div>
        <h1 style={{ margin: '0 0 8px' }}>{article.title}</h1>
        {article.source_name && (
          <p style={{ color: 'var(--muted)', fontSize: 13.5, margin: '0 0 16px' }}>
            Source: {article.source_url ? <a href={article.source_url} target="_blank" rel="noreferrer">{article.source_name} <ExternalLink size={12} style={{ verticalAlign: -1 }} /></a> : article.source_name}
          </p>
        )}

        {article.excerpt && <p style={{ lineHeight: 1.7, fontSize: 15.5, fontStyle: article.imported ? 'italic' : 'normal', color: article.imported ? 'var(--muted)' : 'var(--text)' }}>{article.excerpt}</p>}
        {article.body_text && <p style={{ lineHeight: 1.7, whiteSpace: 'pre-wrap', fontSize: 15.5 }}>{article.body_text}</p>}

        {article.imported && article.source_url && (
          <a href={article.source_url} target="_blank" rel="noreferrer" className="gs-btn gs-btn-primary" style={{ marginTop: 10 }}>
            Read full story at {article.source_name} <ExternalLink size={14} />
          </a>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          {isLoggedIn() && (
            <button type="button" className={`gs-btn gs-btn-outline${article.is_liked ? ' active' : ''}`} onClick={toggleLike}>
              <Heart size={15} fill={article.is_liked ? 'currentColor' : 'none'} /> {article.like_count} {article.like_count === 1 ? 'Like' : 'Likes'}
            </button>
          )}
          {article.can_manage && !article.imported && (
            <>
              <Link to={`/articles/${article.slug}/edit`} className="gs-btn gs-btn-outline"><Pencil size={15} /> Edit</Link>
              <button type="button" className="gs-btn gs-btn-outline" onClick={handleDelete}><Trash2 size={15} /> Delete</button>
            </>
          )}
          <span style={{ color: 'var(--muted-faint)', fontSize: 12.5, marginLeft: 'auto' }}>{article.views_count} views</span>
        </div>
      </div>
    </div>
  );
}
