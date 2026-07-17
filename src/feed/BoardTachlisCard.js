import React from 'react';
import { Link } from 'react-router-dom';
import timeAgo from '../utils/timeAgo';

// Tachlis.js is its own lazy-loaded route chunk -- importing TypeBadge from
// it here would drag that whole page into the main bundle, since this card
// renders on the Home board. Small enough to duplicate instead.
const TYPE_META = {
  job: { label: 'Job', color: 'var(--accent)' },
  resume: { label: 'Resume', color: 'var(--success)' },
  service: { label: 'Service', color: '#6366f1' },
};

function TypeBadge({ type }) {
  const meta = TYPE_META[type] || { label: type, color: 'var(--muted)' };
  return (
    <span style={{
      display: 'inline-block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: 0.4, color: '#fff', background: meta.color, borderRadius: 999, padding: '2px 10px',
    }}>
      {meta.label}
    </span>
  );
}

/**
 * A Tachlis listing rendered inline in the Daily Board feed -- see
 * BoardHockCard.js for why this exists (same board-feed algorithm folds one
 * Tachlis pick into a fixed slot on every page too).
 */
export default function BoardTachlisCard({ post }) {
  const preview = post.body?.length > 180 ? `${post.body.slice(0, 180)}…` : post.body;

  return (
    <Link to={`/tachlis/post/${post.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="gs-card genre-flyer cross-post" style={{ marginBottom: 14 }}>
        <div className="gs-card-body">
          <span className="card-kind">📌 From Tachlis</span>
          <div className="shtick-meta">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <TypeBadge type={post.post_type} />
              {post.location && (
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>📍 {post.location}</span>
              )}
              {post.compensation && (
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>💰 {post.compensation}</span>
              )}
            </div>
            <span className="shtick-time">{timeAgo(post.pub_date)}</span>
          </div>
          <h3 className="shtick-caption" style={{ marginTop: 8 }}>{post.title}</h3>
          {preview && (
            <p style={{ color: 'var(--text, inherit)', margin: '6px 0 0', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
              {preview}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
