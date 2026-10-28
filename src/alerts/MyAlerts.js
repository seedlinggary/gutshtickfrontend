import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiRequest from '../ApiRequest';

const SITE_LABEL = { estates: 'Gut Estates', tachlis: 'Gut Money' };

/** "Manage alerts in the account" -- Stage 3 of gut_next_level_agent.md.
 * Lists every alert linked to the signed-in user (an alert made while
 * logged out attaches automatically the moment that email signs up or logs
 * in -- see backend's link_alerts_to_user()), with pause/resume and delete. */
export default function MyAlerts() {
  const [alerts, setAlerts] = useState(null);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    apiRequest('GET', null, '/alerts/mine')
      .then(setAlerts)
      .catch(() => setError(true));
  };

  useEffect(() => { load(); }, []);

  const togglePause = async (alert) => {
    setBusyId(alert.id);
    try {
      const updated = await apiRequest('PATCH', { paused: !alert.paused }, `/alerts/${alert.id}`);
      setAlerts((prev) => prev.map((a) => (a.id === alert.id ? updated : a)));
    } catch (e) { /* ignore */ } finally { setBusyId(null); }
  };

  const remove = async (alert) => {
    if (!window.confirm('Delete this alert? You can always set it up again later.')) return;
    setBusyId(alert.id);
    try {
      await apiRequest('DELETE', null, `/alerts/${alert.id}`);
      setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
    } catch (e) { /* ignore */ } finally { setBusyId(null); }
  };

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 680 }}>
        <h1 style={{ margin: '0 0 4px' }}>🔔 My Alerts</h1>
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>
          Searches you're getting emailed about. Set one up from any search or area page on Gut Estates or Gut Money's Job Board.
        </p>

        {!alerts && !error && <div className="gs-loading"><div className="gs-spinner" /> Loading…</div>}
        {error && <div className="gs-error-box">Couldn't load your alerts right now.</div>}

        {alerts && alerts.length === 0 && (
          <div className="gs-empty">
            <p style={{ fontSize: 40, marginBottom: 8 }}>🔔</p>
            <p>No alerts yet. Look for "Get alerts for this search" on any listing or job search.</p>
          </div>
        )}

        {alerts && alerts.map((alert) => (
          <div key={alert.id} className="gs-card" style={{ marginBottom: 10 }}>
            <div className="gs-card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <strong>{alert.label || 'Saved search'}</strong>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
                  {SITE_LABEL[alert.search_type] || alert.search_type}
                  {!alert.confirmed && ' · pending confirmation (check your email)'}
                  {alert.paused && ' · paused'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button" className="gs-btn gs-btn-outline gs-btn-sm"
                  onClick={() => togglePause(alert)} disabled={busyId === alert.id}
                >
                  {alert.paused ? 'Resume' : 'Pause'}
                </button>
                <button
                  type="button" className="gs-btn gs-btn-outline gs-btn-sm"
                  onClick={() => remove(alert)} disabled={busyId === alert.id}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}

        <Link to="/" className="gs-btn gs-btn-outline" style={{ marginTop: 16 }}>← Back to Gut Shtick</Link>
      </div>
    </div>
  );
}
