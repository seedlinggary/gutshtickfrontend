import React from 'react';
import { Link } from 'react-router-dom';
import { Newspaper } from 'lucide-react';

export const CATEGORY_LABEL = {
  finance: 'Finance', political: 'Political', american: 'American', international: 'International',
  technology: 'Technology', health: 'Health & Science', other: 'Other',
};

/** A preset category has a friendly label above; a custom one a poster
 * typed in (see PostForm's "add your own topic") doesn't, so this title-
 * cases the raw string instead of showing it lowercase/unstyled. */
export function categoryLabel(category) {
  if (!category) return '';
  return CATEGORY_LABEL[category] || category.replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ArticleCard({ article }) {
  return (
    <Link to={`/articles/${article.slug}`} className="news-article-card">
      {article.image_url ? (
        <img src={article.image_url} alt={article.title} className="news-article-card-img" />
      ) : (
        <div className="news-article-card-img news-article-card-img-placeholder"><Newspaper size={22} /></div>
      )}
      <div className="news-article-card-body">
        <div className="news-article-card-badges">
          {(article.categories || []).map((c) => (
            <span key={c} className={`news-article-card-badge${!article.imported ? ' original' : ''}`}>
              {categoryLabel(c)}
            </span>
          ))}
        </div>
        <h3>{article.title}</h3>
        {article.excerpt && <p>{article.excerpt}</p>}
        {article.source_name && <span className="news-article-card-source">{article.source_name}</span>}
      </div>
    </Link>
  );
}
