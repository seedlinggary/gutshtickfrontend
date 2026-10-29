import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import apiRequest from '../ApiRequest';
import NewAlertForm from './NewAlertForm';

const SITE_LABEL = { estates: 'Gut Estates', tachlis: 'Gut Money' };

/** "Manage alerts in the account" -- Stage 3 of gut_next_level_agent.md.
 * Lists every alert linked to the signed-in user (an alert made while
 * logged out attaches automatically the moment that email signs up or logs
 * in -- see backend's link_alerts_to_user()), with pause/resume and delete. */
export default function MyAlerts() {
  const [alerts, setAlerts] = useState(null);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [creating, setCreating] = useState(false);

  const load = () => {
    apiRequest('GET', null, '/alerts/mine')
      .then(setAlerts)
      .catch(() => setError(true));
  };

  useEffect(() => { load(); }, []);

  const updateAlert = async (alert, patch) => {
    setBusyId(alert.id);
    try {
      const updated = await apiRequest('PATCH', patch, `/alerts/${alert.id}`);
      setAlerts((prev) => prev.map((a) => (a.id === alert.id ? updated : a)));
    } catch (e) { /* ignore -- the control's next change retries */ } finally { setBusyId(null); }
  };

  const togglePause = (alert) => updateAlert(alert, { paused: !alert.paused });

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
        <h1 style={{ margin: '0 0 4px', display: 'inline-flex', alignItems: 'center', gap: 8 }}><Bell size={22} /> My Alerts</h1>
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>
          Searches you're getting emailed about. Set one up here, or from any search or area page on Gut Estates or Gut Money's Job Board.
        </p>

        {!creating && (
          <button type="button" className="gs-btn gs-btn-sm" style={{ marginBottom: 14 }} onClick={() => setCreating(true)}>
            + New alert
          </button>
        )}
        {creating && (
          <NewAlertForm
            onCancel={() => setCreating(false)}
            onCreated={() => { setCreating(false); load(); }}
          />
        )}

        {!alerts && !error && <div className="gs-loading"><div className="gs-spinner" /> Loading…</div>}
        {error && <div className="gs-error-box">Couldn't load your alerts right now.</div>}

        {alerts && alerts.length === 0 && !creating && (
          <div className="gs-empty">
            <div className="gs-empty-icon"><Bell size={26} /></div>
            <p>No alerts yet. Create one above, or look for "Get alerts for this search" on any listing or job search.</p>
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
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', padding: '0 16px 14px', fontSize: 13 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                Send:
                <select
                  value={alert.cadence}
                  disabled={busyId === alert.id}
                  onChange={(e) => updateAlert(alert, { cadence: e.target.value })}
                >
                  <option value="daily">Once a day</option>
                  <option value="instant">The moment it matches</option>
                </select>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                Via:
                <select
                  value={alert.channel}
                  disabled={busyId === alert.id}
                  onChange={(e) => updateAlert(alert, { channel: e.target.value })}
                >
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp (coming soon)</option>
                </select>
              </label>
              {alert.channel === 'whatsapp' && (
                <span style={{ color: 'var(--muted)' }}>
                  WhatsApp alerts aren't live yet -- you'll keep getting these by email until they are.
                </span>
              )}
            </div>
          </div>
        ))}

        <Link to="/" className="gs-btn gs-btn-outline" style={{ marginTop: 16 }}>← Back to Gut Shtick</Link>
      </div>
    </div>
  );
}
