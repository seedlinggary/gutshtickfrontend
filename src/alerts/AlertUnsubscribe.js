import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AlertTriangle, BellOff } from 'lucide-react';
import apiRequest from '../ApiRequest';

/** Landing page for the one-click unsubscribe link in every alert email --
 * see backend/alerts/routes/alert.py's unsubscribe_alert(). No confirmation
 * step: Stage 3 of gut_next_level_agent.md calls for "unsubscribe stops it
 * in one click." */
export default function AlertUnsubscribe() {
  const { token } = useParams();
  const [state, setState] = useState('loading');

  useEffect(() => {
    apiRequest('GET', null, `/alerts/unsubscribe/${token}`)
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
            <h1 style={{ fontSize: 22 }}>Already gone</h1>
            <p style={{ color: 'var(--muted)' }}>This alert no longer exists -- it may already be unsubscribed.</p>
          </>
        )}
        {state === 'done' && (
          <>
            <div className="gs-empty-icon"><BellOff size={26} /></div>
            <h1 style={{ fontSize: 22 }}>Unsubscribed</h1>
            <p style={{ color: 'var(--muted)' }}>You won't get any more emails for this alert.</p>
            <Link to="/" className="gs-btn gs-btn-outline" style={{ marginTop: 12 }}>Back to Gut Shtick</Link>
          </>
        )}
      </div>
    </div>
  );
}
