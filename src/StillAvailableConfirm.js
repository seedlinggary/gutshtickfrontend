import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiRequest from './ApiRequest';
import { CheckCircle2 } from 'lucide-react';

/** Stage 5's "Still available?" check -- landing page for the one-click
 * confirm link in that email. `apiPrefix` points at whichever site's API
 * actually owns the token ('/estates' or '/tachlis'); registered once per
 * site in that site's own routes.js. */
export default function StillAvailableConfirm({ apiPrefix }) {
  const { token } = useParams();
  const [state, setState] = useState('loading');
  const [title, setTitle] = useState('');

  useEffect(() => {
    apiRequest('GET', null, `${apiPrefix}/still-available/confirm/${token}`)
      .then((data) => { setTitle(data.title || ''); setState('done'); })
      .catch(() => setState('error'));
  }, [apiPrefix, token]);

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 480, textAlign: 'center' }}>
        {state === 'loading' && <div className="gs-loading"><div className="gs-spinner" /> Confirming…</div>}
        {state === 'done' && (
          <div className="gs-success-box" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={16} /> Thanks! {title && <strong>{title}</strong>} is confirmed still available.
          </div>
        )}
        {state === 'error' && (
          <div className="gs-error-box">This link is invalid or has already been used.</div>
        )}
        <Link to="/" className="gs-btn gs-btn-outline" style={{ marginTop: 16 }}>← Back home</Link>
      </div>
    </div>
  );
}
