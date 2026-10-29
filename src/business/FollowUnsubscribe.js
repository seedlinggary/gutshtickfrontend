import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import apiRequest from '../ApiRequest';

/** Landing page for the one-click unsubscribe link in a "new deal" alert
 * email -- see backend/business/routes/business_follow.py's
 * unsubscribe_follow(). Unsubscribing from deal alerts for a business just
 * unfollows it: there's no separate "follow but mute" state, since
 * following IS what opts someone into those emails in the first place
 * (same one-click, no-login-required pattern as alerts/AlertUnsubscribe.js). */
export default function FollowUnsubscribe() {
  const { token } = useParams();
  const [state, setState] = useState('loading');
  const [businessName, setBusinessName] = useState('');

  useEffect(() => {
    apiRequest('GET', null, `/business/follow/unsubscribe/${token}`)
      .then((res) => { setBusinessName(res.business_name || ''); setState('done'); })
      .catch(() => setState('error'));
  }, [token]);

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 480, textAlign: 'center', paddingTop: 40 }}>
        {state === 'loading' && <div className="gs-loading"><div className="gs-spinner" /> Unsubscribing…</div>}
        {state === 'error' && (
          <>
            <div className="gs-empty-icon"><AlertTriangle size={26} /></div>
            <h1 style={{ fontSize: 22 }}>Already gone</h1>
            <p style={{ color: 'var(--muted)' }}>This follow no longer exists -- you may already be unfollowed.</p>
          </>
        )}
        {state === 'done' && (
          <>
            <div className="gs-empty-icon"><CheckCircle2 size={26} /></div>
            <h1 style={{ fontSize: 22 }}>Unfollowed{businessName ? ` ${businessName}` : ''}</h1>
            <p style={{ color: 'var(--muted)' }}>You won't get any more deal emails from them.</p>
            <Link to="/" className="gs-btn gs-btn-outline" style={{ marginTop: 12 }}>Back to Gut Community</Link>
          </>
        )}
      </div>
    </div>
  );
}
