import React from 'react';
import { Link } from 'react-router-dom';
import { Newspaper, Trash2 } from 'lucide-react';

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

// onDelete is only ever passed by a caller that already checked isAdmin()
// (Feed.js, MyPosts.js) -- this component has no opinion on who's allowed,
// it just renders the button when given a handler and leaves permission
// enforcement to the caller (and, as the real backstop, the backend's own
// _can_manage check on the DELETE route).
export default function ArticleCard({ article, onDelete }) {
  return (
    <Link to={`/articles/${article.slug}`} className="news-article-card">
      {onDelete && (
        <button
          type="button"
          className="news-article-card-delete"
          title="Delete this article"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(article); }}
        >
          <Trash2 size={14} />
        </button>
      )}
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
