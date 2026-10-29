import React, { useEffect, useState } from 'react';
import { Bell, Mail, HelpCircle } from 'lucide-react';
import apiRequest from '../ApiRequest';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];
const WEEKDAYS = [
  { value: 0, label: 'Monday' }, { value: 1, label: 'Tuesday' }, { value: 2, label: 'Wednesday' },
  { value: 3, label: 'Thursday' }, { value: 4, label: 'Friday' }, { value: 5, label: 'Saturday' },
  { value: 6, label: 'Sunday' },
];

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
  const [weekday, setWeekday] = useState(6);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [runningWeekly, setRunningWeekly] = useState(false);
  const [weeklyRunResult, setWeeklyRunResult] = useState(null);
  const [stillAvailableEnabled, setStillAvailableEnabled] = useState(false);
  const [togglingStillAvailable, setTogglingStillAvailable] = useState(false);
  const [runningStillAvailable, setRunningStillAvailable] = useState(false);
  const [stillAvailableRunResult, setStillAvailableRunResult] = useState(null);

  const load = () => {
    setLoading(true);
    apiRequest('GET', null, '/alerts/admin/schedule')
      .then((data) => {
        setSchedule(data);
        setHour(data.send_hour);
        setMinute(data.send_minute);
        setWeekday(data.weekly_weekday);
        setStillAvailableEnabled(!!data.still_available_check_enabled);
      })
      .catch(() => setMsg('Could not load the current schedule.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    setMsg('');
    try {
      const updated = await apiRequest('PATCH', { send_hour: hour, send_minute: minute, weekly_weekday: weekday }, '/alerts/admin/schedule');
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

  const toggleStillAvailable = async (next) => {
    if (next && !window.confirm(
      "Turn ON the \"Still available?\" check? This will start emailing real posters whose sale/long-term "
      + "listings or job posts are 14+ days old, asking them to confirm, and will HIDE anything that doesn't "
      + 'reply within a few days. This runs automatically from now on.'
    )) return;
    setTogglingStillAvailable(true);
    setMsg('');
    try {
      const updated = await apiRequest('PATCH', { send_hour: hour, send_minute: minute, weekly_weekday: weekday, still_available_check_enabled: next }, '/alerts/admin/schedule');
      setStillAvailableEnabled(!!updated.still_available_check_enabled);
      setMsg(next ? 'Turned on -- it will start running automatically.' : 'Turned off.');
    } catch (e) {
      setMsg(e?.message || 'Could not change this setting.');
    } finally {
      setTogglingStillAvailable(false);
    }
  };

  const runStillAvailableNow = async () => {
    if (!window.confirm(
      'Run the "Still available?" check right now? This sends real email to real posters whose listings/posts '
      + 'are old enough, and will hide anything past its grace period with no reply -- regardless of whether '
      + 'the automatic switch above is on.'
    )) return;
    setRunningStillAvailable(true);
    setStillAvailableRunResult(null);
    setMsg('');
    try {
      const result = await apiRequest('POST', {}, '/alerts/admin/run-still-available-now');
      setStillAvailableRunResult(result);
    } catch (e) {
      setMsg(e?.message || 'Could not run the check.');
    } finally {
      setRunningStillAvailable(false);
    }
  };

  const runWeeklyNow = async () => {
    if (!window.confirm('Send the weekly digest right now to EVERY opted-in member who has something new? This sends real email to many people.')) return;
    setRunningWeekly(true);
    setWeeklyRunResult(null);
    setMsg('');
    try {
      const result = await apiRequest('POST', {}, '/alerts/admin/run-weekly-now');
      setWeeklyRunResult(result);
      load();
    } catch (e) {
      setMsg(e?.message || 'Could not run the weekly digest.');
    } finally {
      setRunningWeekly(false);
    }
  };

  return (
    <div className="admin-card" style={{ maxWidth: 560 }}>
      <h3><Bell size={18} /> Alert Digest Schedule</h3>
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

          <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <h4 style={{ margin: '0 0 6px' }}><Mail size={15} /> "Your Week" digest</h4>
            <p style={{ color: 'var(--muted)', marginTop: 0, fontSize: 13.5 }}>
              A weekly roundup email for every opted-in member, same time of day as above, on this day:
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
              <select value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>
                {WEEKDAYS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
              </select>
              <button type="button" className="gs-btn gs-btn-sm" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
            {schedule?.last_weekly_run_date && (
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>Last actually sent: {schedule.last_weekly_run_date}</p>
            )}
            <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={runWeeklyNow} disabled={runningWeekly}>
              {runningWeekly ? 'Sending…' : 'Send weekly digest now (test / override)'}
            </button>
            {weeklyRunResult && (
              <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>
                Checked {weeklyRunResult.users_checked} member{weeklyRunResult.users_checked === 1 ? '' : 's'} ·
                {' '}sent {weeklyRunResult.emails_sent} email{weeklyRunResult.emails_sent === 1 ? '' : 's'}
              </p>
            )}
          </div>

          <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <h4 style={{ margin: '0 0 6px' }}><HelpCircle size={15} /> "Still available?" check</h4>
            <p style={{ color: 'var(--muted)', marginTop: 0, fontSize: 13.5 }}>
              14 days after posting, asks the poster to confirm a sale/long-term listing or job post is still
              available. No reply within a few days hides it. <strong>Messages real posters and hides their
              content on silence -- off by default.</strong>
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <input
                id="stillAvailableEnabled" type="checkbox" checked={stillAvailableEnabled}
                disabled={togglingStillAvailable}
                onChange={(e) => toggleStillAvailable(e.target.checked)}
              />
              <label htmlFor="stillAvailableEnabled">
                {stillAvailableEnabled ? 'ON -- running automatically' : 'OFF -- not running'}
              </label>
            </div>
            <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={runStillAvailableNow} disabled={runningStillAvailable}>
              {runningStillAvailable ? 'Running…' : 'Run once now (test, regardless of the switch above)'}
            </button>
            {stillAvailableRunResult && (
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>
                <p style={{ margin: '2px 0' }}>
                  Estates: {stillAvailableRunResult.estates?.candidates ?? 0} candidates ·
                  {' '}{stillAvailableRunResult.estates?.reminders_sent ?? 0} reminders sent ·
                  {' '}{stillAvailableRunResult.estates?.hidden ?? 0} hidden
                </p>
                <p style={{ margin: '2px 0' }}>
                  Job Board: {stillAvailableRunResult.tachlis?.candidates ?? 0} candidates ·
                  {' '}{stillAvailableRunResult.tachlis?.reminders_sent ?? 0} reminders sent ·
                  {' '}{stillAvailableRunResult.tachlis?.hidden ?? 0} hidden
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
