import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import apiRequest from '../ApiRequest';

const SITE_LABEL = { estates: 'Gut Estates', tachlis: 'Gut Money' };

/** Landing page for the link in an alert's confirmation email -- see
 * backend/alerts/routes/alert.py's confirm_alert(). Lives on the main site
 * regardless of which site the alert's search came from (one shared pair
 * of confirm/unsubscribe pages for every alert, see that route's own
 * MAIN_SITE_URL comment). */
export default function AlertConfirm() {
  const { token } = useParams();
  const [state, setState] = useState('loading');
  const [data, setData] = useState(null);

  useEffect(() => {
    apiRequest('GET', null, `/alerts/confirm/${token}`)
      .then((res) => { setData(res); setState('done'); })
      .catch(() => setState('error'));
  }, [token]);

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 480, textAlign: 'center', paddingTop: 40 }}>
        {state === 'loading' && <div className="gs-loading"><div className="gs-spinner" /> Confirming…</div>}
        {state === 'error' && (
          <>
            <div className="gs-empty-icon"><AlertTriangle size={26} /></div>
            <h1 style={{ fontSize: 22 }}>Link not valid</h1>
            <p style={{ color: 'var(--muted)' }}>This confirmation link is invalid or has already been used.</p>
          </>
        )}
        {state === 'done' && (
          <>
            <div className="gs-empty-icon"><CheckCircle2 size={26} /></div>
            <h1 style={{ fontSize: 22 }}>Alert confirmed</h1>
            <p style={{ color: 'var(--muted)' }}>
              You're set -- you'll get an email whenever there's a new match for
              {' '}{data?.label ? <strong>{data.label}</strong> : 'your search'}
              {data?.search_type && ` on ${SITE_LABEL[data.search_type] || 'GUT'}`}.
            </p>
            <Link to="/" className="gs-btn gs-btn-primary" style={{ marginTop: 12 }}>Back to Gut Shtick</Link>
          </>
        )}
      </div>
    </div>
  );
}
