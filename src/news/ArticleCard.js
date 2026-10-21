import React from 'react';
import { Link } from 'react-router-dom';
import { Newspaper } from 'lucide-react';

const CATEGORY_LABEL = {
  world: 'World', politics: 'Politics', business: 'Business', science: 'Science',
  health: 'Health', sports: 'Sports', entertainment: 'Entertainment', other: 'Other',
};

export default function ArticleCard({ article }) {
  return (
    <Link to={`/articles/${article.slug}`} className="news-article-card">
      {article.image_url ? (
        <img src={article.image_url} alt={article.title} className="news-article-card-img" />
      ) : (
        <div className="news-article-card-img news-article-card-img-placeholder"><Newspaper size={28} /></div>
      )}
      <div className={`news-article-card-badge${!article.imported ? ' original' : ''}`}>
        {article.imported ? (CATEGORY_LABEL[article.category] || article.category) : 'Original'}
      </div>
      <div className="news-article-card-body">
        <h3>{article.title}</h3>
        {article.excerpt && <p>{article.excerpt}</p>}
        {article.source_name && <span className="news-article-card-source">{article.source_name}</span>}
      </div>
    </Link>
  );
}
