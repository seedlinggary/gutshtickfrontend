/** Formats a backend timestamp as a relative "time ago" string.
 * Was independently duplicated (with drifting behavior) across Hock, Tachlis,
 * ShowMessage, Comments, and AdminYoutubeChannels -- this is the one copy. */
export default function timeAgo(dateStr) {
  if (!dateStr) return '';
  // Backend sends naive UTC timestamps; normalise to a UTC instant.
  const iso = /Z|[+-]\d\d:?\d\d$/.test(dateStr) ? dateStr : `${dateStr}Z`;
  const date = new Date(iso);
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
