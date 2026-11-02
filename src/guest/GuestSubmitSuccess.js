import React, { useState } from 'react';
import { CheckCircle2, Copy, Check } from 'lucide-react';

/** Shown right after a guest create-route call succeeds. The manage link is
 * also emailed (see backend/alerts/emails.py's send_guest_submission_email),
 * but showing it on-screen too means a phone-only guest (or anyone who
 * doesn't check email right away) can still get back in. */
export default function GuestSubmitSuccess({ manageUrl, guestEmail, message }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(manageUrl)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
      .catch(() => {});
  };
  return (
    <div className="gs-success-box" style={{ display: 'block' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <CheckCircle2 size={16} />
        <strong>{message || "You're in! It's pending review and will appear once an admin approves it."}</strong>
      </div>
      {guestEmail && (
        <p style={{ fontSize: 13, margin: '0 0 8px' }}>We've also emailed this link to {guestEmail}.</p>
      )}
      <p style={{ fontSize: 13, margin: '0 0 6px' }}>
        Save this link to edit or remove it later — it won't be shown again:
      </p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <code style={{
          flex: '1 1 220px', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 12,
          background: 'var(--surface)', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)',
        }}>
          {manageUrl}
        </code>
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={copy}>
          {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy link'}
        </button>
      </div>
    </div>
  );
}
