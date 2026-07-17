import React from 'react';
import { Link } from 'react-router-dom';
import timeAgo from '../utils/timeAgo';

/**
 * A Hock thread rendered inline in the Daily Board feed (see
 * backend/shtick/routes/shtick.py's board-feed algorithm, which folds one
 * Hock pick into a fixed slot on every page). Same gs-card/genre-forum
 * treatment Hock's own page uses, so it reads as a native board card, not a
 * bolted-on widget -- the "found in Hock" tag is the only tell.
 */
export default function BoardHockCard({ post }) {
  const authorInitial = post.user?.profile_name?.charAt(0).toUpperCase() || '?';
  const preview = post.body?.length > 200 ? `${post.body.slice(0, 200)}…` : post.body;

  return (
    <Link to={`/hock/post/${post.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="gs-card genre-forum cross-post" style={{ marginBottom: 14 }}>
        <div className="gs-card-body">
          <span className="card-kind">🗣 From Hock</span>
          <div className="shtick-meta">
            <div className="shtick-author" style={{ flex: 1 }}>
              <div className="shtick-author-avatar">{authorInitial}</div>
              <span className="shtick-author-name">{post.user?.profile_name || 'Anonymous'}</span>
            </div>
            <span className="shtick-time">{timeAgo(post.pub_date)}</span>
          </div>
          <h3 className="shtick-caption" style={{ marginTop: 8 }}>{post.title}</h3>
          {preview && (
            <p style={{ color: 'var(--text, inherit)', margin: '6px 0 0', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
              {preview}
            </p>
          )}
          <div className="shtick-footer" style={{ marginTop: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>
              👍 {post.like_count || 0} · 💬 {post.comment_count || 0}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
