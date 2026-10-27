import timeAgo from './timeAgo';

/** "New today" / "Posted N days ago" -- Stage 1 of gut_next_level_agent.md.
 * Prefers source_posted_at (the real time a listing/post went up in its
 * source WhatsApp group, when Tab's import knows it) over pub_date (when it
 * was added to this DB) -- same fallback the backend's own "newest" sort
 * uses, so the badge always agrees with sort order. */
export default function FreshnessBadge({ item, style }) {
  const dateStr = item.source_posted_at || item.pub_date;
  if (!dateStr) return null;
  const iso = /Z|[+-]\d\d:?\d\d$/.test(dateStr) ? dateStr : `${dateStr}Z`;
  const hours = (Date.now() - new Date(iso).getTime()) / 3600000;
  const isNew = hours < 24;
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 11,
        fontWeight: isNew ? 700 : 500,
        color: isNew ? '#fff' : 'var(--muted)',
        background: isNew ? 'var(--success)' : 'transparent',
        borderRadius: isNew ? 999 : 0,
        padding: isNew ? '2px 8px' : 0,
        ...style,
      }}
    >
      {isNew ? 'New today' : `Posted ${timeAgo(dateStr)}`}
    </span>
  );
}
