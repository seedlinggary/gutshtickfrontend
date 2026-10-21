import React from 'react';
import { Lock } from 'lucide-react';
import { isSuperAdmin } from '../auth';

/** Soft-locks every Gut News page to super_admin only -- not a permanent
 * design, just the pre-launch gate until the site is ready to open to the
 * public (see the matching note in backend/news/routes/news_article.py).
 * Reverting later just means deleting this wrapper from routes.js. */
export default function SuperAdminGate({ children }) {
  if (isSuperAdmin()) return children;
  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 680 }}>
        <div className="news-masthead">
          <div className="news-masthead-kicker"><Lock size={13} /> Gut News</div>
          <h1 className="news-masthead-title">Not open to the public yet</h1>
          <p className="news-masthead-sub">
            Gut News is still being set up and isn't available yet. Check back soon.
          </p>
        </div>
      </div>
    </div>
  );
}
