import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AlertTriangle, BellOff } from 'lucide-react';
import apiRequest from '../ApiRequest';

/** Landing page for the one-click unsubscribe link in Stage 4's "Your week"
 * digest email (see backend/user/routes/user.py's unsubscribe_weekly_digest)
 * -- and now also in a Tachlis job-match alert email, which reuses this
 * same token/toggle (see backend/tachlis/routes/tachlis_post.py's
 * _notify_job_match_users) rather than inventing a second opt-out. Same
 * no-login, one-click pattern as AlertUnsubscribe.js. */
export default function WeeklyDigestUnsubscribe() {
  const { token } = useParams();
  const [state, setState] = useState('loading');

  useEffect(() => {
    apiRequest('GET', null, `/user/weekly-digest/unsubscribe/${token}`)
      .then(() => setState('done'))
      .catch(() => setState('error'));
  }, [token]);

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 480, textAlign: 'center', paddingTop: 40 }}>
        {state === 'loading' && <div className="gs-loading"><div className="gs-spinner" /> Unsubscribing…</div>}
        {state === 'error' && (
          <>
            <div className="gs-empty-icon"><AlertTriangle size={26} /></div>
            <h1 style={{ fontSize: 22 }}>Invalid link</h1>
            <p style={{ color: 'var(--muted)' }}>This unsubscribe link isn't valid -- it may already have been used.</p>
          </>
        )}
        {state === 'done' && (
          <>
            <div className="gs-empty-icon"><BellOff size={26} /></div>
            <h1 style={{ fontSize: 22 }}>Unsubscribed</h1>
            <p style={{ color: 'var(--muted)' }}>
              You won't get the weekly digest or job-match emails anymore. You can turn them back on anytime from your profile.
            </p>
            <Link to="/" className="gs-btn gs-btn-outline" style={{ marginTop: 12 }}>Back to Gut Shtick</Link>
          </>
        )}
      </div>
    </div>
  );
}
