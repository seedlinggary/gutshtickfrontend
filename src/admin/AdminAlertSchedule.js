import React, { useEffect, useState } from 'react';
import apiRequest from '../ApiRequest';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

function formatHour(h) {
  const period = h < 12 ? 'AM' : 'PM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00 ${period}`;
}

/**
 * Super Admin control for when the daily Alert digest actually sends --
 * edits AlertDigestSchedule (one row, Israel-local send_hour/send_minute)
 * via PATCH /alerts/admin/schedule, no redeploy involved. The external
 * scheduler/opportunistic sweep hitting the backend don't need to change
 * at all when this does -- see backend/alerts/routes/alert.py's
 * _maybe_run_scheduled_digest() for how the gate actually works.
 */
export default function AdminAlertSchedule() {
  const [schedule, setSchedule] = useState(null);
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);

  const load = () => {
    setLoading(true);
    apiRequest('GET', null, '/alerts/admin/schedule')
      .then((data) => {
        setSchedule(data);
        setHour(data.send_hour);
        setMinute(data.send_minute);
      })
      .catch(() => setMsg('Could not load the current schedule.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    setMsg('');
    try {
      const updated = await apiRequest('PATCH', { send_hour: hour, send_minute: minute }, '/alerts/admin/schedule');
      setSchedule((prev) => ({ ...prev, ...updated }));
      setMsg('Saved -- takes effect on the next scheduler ping or sweep, no deploy needed.');
    } catch (e) {
      setMsg(e?.message || 'Could not save the schedule.');
    } finally {
      setSaving(false);
    }
  };

  const runNow = async () => {
    if (!window.confirm('Send the digest right now to every due alert, bypassing today\'s scheduled time? This sends real email.')) return;
    setRunning(true);
    setRunResult(null);
    setMsg('');
    try {
      const result = await apiRequest('POST', {}, '/alerts/admin/run-now');
      setRunResult(result);
      load();
    } catch (e) {
      setMsg(e?.message || 'Could not run the digest.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="admin-card" style={{ maxWidth: 560 }}>
      <h3>🔔 Alert Digest Schedule</h3>
      <p style={{ color: 'var(--muted)', marginTop: 0 }}>
        Once a day, every confirmed, unpaused alert gets emailed its new matches.
        This is when that happens -- in Israel time, regardless of where the server
        or the external scheduler actually runs.
      </p>

      {loading ? (
        <div className="gs-loading"><div className="gs-spinner" /> Loading…</div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            <label>
              Send at{' '}
              <select value={hour} onChange={(e) => setHour(Number(e.target.value))}>
                {HOURS.map((h) => <option key={h} value={h}>{formatHour(h)}</option>)}
              </select>
            </label>
            <select value={minute} onChange={(e) => setMinute(Number(e.target.value))}>
              {MINUTES.map((m) => <option key={m} value={m}>:{String(m).padStart(2, '0')}</option>)}
            </select>
            <span style={{ color: 'var(--muted)', fontSize: 13 }}>Israel time (Asia/Jerusalem)</span>
            <button type="button" className="gs-btn gs-btn-sm" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>

          {schedule?.last_run_date && (
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>Last actually sent: {schedule.last_run_date}</p>
          )}

          {msg && <div className="gs-success-box" style={{ marginTop: 6 }}>{msg}</div>}

          <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={runNow} disabled={running}>
              {running ? 'Sending…' : 'Send digest now (test / override)'}
            </button>
            {runResult && (
              <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>
                Checked {runResult.alerts_checked} alert{runResult.alerts_checked === 1 ? '' : 's'} ·
                {' '}sent {runResult.emails_sent} email{runResult.emails_sent === 1 ? '' : 's'} ·
                {' '}notified {runResult.alerts_notified} alert{runResult.alerts_notified === 1 ? '' : 's'}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
