import React, { useEffect, useState } from 'react';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';

export default function FollowButton({ businessId }) {
  const [following, setFollowing] = useState(false);
  const [count, setCount] = useState(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isLoggedIn() || !businessId) return;
    let cancelled = false;
    apiRequest('GET', null, `/business/businesses/${businessId}/follow-status`)
      .then((res) => { if (!cancelled) { setFollowing(res.following); setCount(res.follower_count); } })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [businessId]);

  if (!isLoggedIn()) return null;

  const toggle = () => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    const method = following ? 'DELETE' : 'POST';
    apiRequest(method, null, `/business/businesses/${businessId}/follow`)
      .then(() => {
        setFollowing(!following);
        setCount((c) => (c == null ? c : c + (following ? -1 : 1)));
      })
      .catch(() => {
        setFailed(true);
        setTimeout(() => setFailed(false), 3000);
      })
      .finally(() => setBusy(false));
  };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <button
        type="button"
        className={`biz-follow-btn${following ? ' biz-follow-btn-active' : ''}`}
        onClick={toggle}
        disabled={busy}
      >
        {following ? '✓ Following' : '+ Follow'}
        {count != null && count > 0 && <span className="biz-follow-count"> · {count}</span>}
      </button>
      {failed && <span style={{ fontSize: 11, color: 'var(--error, #c0392b)' }}>Couldn't update -- try again</span>}
    </span>
  );
}
