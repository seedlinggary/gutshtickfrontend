import React, { useEffect, useRef, useState } from 'react';
import { Bell, CheckCircle2 } from 'lucide-react';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';

const _EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** "Get alerts for this search" -- Stage 3 of gut_next_level_agent.md.
 * Drop onto any search/area/card/detail page: pass the same filter object
 * that page's own fetch already builds (only non-empty values matter; this
 * reuses them as-is so whatever the live search returns is exactly what the
 * alert will later match against -- see backend's shared _apply_*_filters())
 * and a short human-readable label describing the current search. An empty
 * filters object is valid -- it's a catch-all alert for every new item of
 * that search_type, same as backend/alerts/routes/alert.py's create_alert
 * now explicitly allows. Logged-in visitors skip the email step and
 * confirmation email entirely (the account itself is the confirmation);
 * logged-out visitors get the normal confirm-by-email flow, no account
 * required (see email-only form below).
 *
 * `variant="icon"` renders a small round bell instead of the full pill CTA,
 * for dropping onto a listing/post CARD (one icon per item in a results
 * list, rather than one big button above the whole list) -- the form opens
 * in a popover anchored to the icon instead of expanding inline, since an
 * inline expansion would distort that card's place in a grid/list. Callers
 * on a card should pass filters/label describing THAT item specifically
 * (type/city/neighborhood, etc.), not the whole directory's current search,
 * so a signup from a card is pre-filled for "more like this one" with
 * nothing left for the visitor to fill in themselves. */
export default function GetAlertsButton({ searchType, filters, label, variant = 'cta' }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | done | error
  const [message, setMessage] = useState('');
  const loggedIn = isLoggedIn();
  const wrapRef = useRef(null);

  useEffect(() => {
    if (variant !== 'icon' || !open) return undefined;
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [variant, open]);

  const filtersQs = Object.entries(filters || {})
    .filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== false)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  const submit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
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

  const stop = (e) => e.stopPropagation();

  const formBody = status === 'done' ? (
    <div className="gs-success-box" style={{ fontSize: 13.5, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <CheckCircle2 size={14} /> {message}
    </div>
  ) : (
    <form onSubmit={submit} onClick={stop} className="gs-card" style={{ display: 'inline-flex', flexDirection: 'column', gap: 8, padding: 14, width: 280, maxWidth: '80vw' }}>
      <strong style={{ fontSize: 13.5, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Bell size={13} /> Get alerts for: {label}</strong>
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
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={(e) => { stop(e); setOpen(false); }}>Cancel</button>
      </div>
    </form>
  );

  if (variant === 'icon') {
    return (
      <div className="gs-alert-icon-wrap" ref={wrapRef}>
        <button
          type="button"
          className="gs-alert-icon-btn"
          aria-label={`Get alerts for ${label || 'this'}`}
          onClick={(e) => { e.preventDefault(); stop(e); setOpen((o) => !o); }}
        >
          <Bell size={14} />
        </button>
        {open && <div className="gs-alert-popover" onClick={stop}>{formBody}</div>}
      </div>
    );
  }

  if (!open) {
    return (
      <button type="button" className="gs-alert-cta" onClick={() => setOpen(true)}>
        <Bell size={14} /> Get alerts for {label || 'this search'}
      </button>
    );
  }

  return formBody;
}
