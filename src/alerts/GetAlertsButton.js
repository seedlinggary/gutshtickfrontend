import React, { useState } from 'react';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';

const _EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** "Get alerts for this search" -- Stage 3 of gut_next_level_agent.md.
 * Drop onto any search/area page: pass the same filter object that page's
 * own fetch already builds (only non-empty values matter; this reuses them
 * as-is so whatever the live search returns is exactly what the alert will
 * later match against -- see backend's shared _apply_*_filters()) and a
 * short human-readable label describing the current search. Logged-in
 * visitors skip the email step and confirmation email entirely (the
 * account itself is the confirmation); logged-out visitors get the normal
 * confirm-by-email flow. */
export default function GetAlertsButton({ searchType, filters, label }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | done | error
  const [message, setMessage] = useState('');
  const loggedIn = isLoggedIn();

  const filtersQs = Object.entries(filters || {})
    .filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== false)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  const submit = async (e) => {
    e.preventDefault();
    if (!loggedIn && !_EMAIL_RE.test(email.trim())) {
      setStatus('error'); setMessage('Enter a valid email address.');
      return;
    }
    setStatus('sending');
    try {
      const res = await apiRequest('POST', {
        search_type: searchType,
        filters: filtersQs,
        label,
        ...(loggedIn ? {} : { email: email.trim() }),
      }, '/alerts');
      setStatus('done');
      setMessage(loggedIn ? 'Alert on -- see it anytime in My Alerts.' : (res.message || 'Check your email to confirm.'));
    } catch (err) {
      setStatus('error');
      setMessage(typeof err === 'string' ? err : 'Could not save this alert.');
    }
  };

  if (!open) {
    return (
      <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setOpen(true)}>
        🔔 Get alerts for this search
      </button>
    );
  }

  if (status === 'done') {
    return <div className="gs-success-box" style={{ fontSize: 13.5 }}>✅ {message}</div>;
  }

  return (
    <form onSubmit={submit} className="gs-card" style={{ display: 'inline-flex', flexDirection: 'column', gap: 8, padding: 14, maxWidth: 360 }}>
      <strong style={{ fontSize: 13.5 }}>🔔 Get alerts for: {label}</strong>
      {!loggedIn && (
        <input
          type="email" className="gs-input" placeholder="Your email"
          value={email} onChange={(e) => setEmail(e.target.value)} required
        />
      )}
      {status === 'error' && <div className="gs-error-box" style={{ fontSize: 12.5, padding: 8 }}>{message}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="gs-btn gs-btn-primary gs-btn-sm" disabled={status === 'sending'}>
          {status === 'sending' ? 'Saving…' : 'Set up alert'}
        </button>
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
