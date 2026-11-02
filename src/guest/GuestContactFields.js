import React from 'react';

export const GUEST_EMAIL_MAX = 150;
export const GUEST_PHONE_MAX = 40;

/** Shared guest-contact inputs for every "no account required" create form
 * (backend's guest-posting feature -- guest_email/guest_phone/guest_manage_token
 * on each content model). At least one of email/phone is required; the caller
 * validates that before submit, same as the backend does. */
export default function GuestContactFields({ email, phone, onEmailChange, onPhoneChange }) {
  return (
    <div className="gs-field guest-contact-fields" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
      <label className="gs-label" style={{ marginBottom: 4, display: 'block' }}>
        Posting without an account — how can we reach you?
      </label>
      <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 10px' }}>
        Your post is reviewed before it goes live. We'll send a private link to edit or take it down later — at least one is required.
      </p>
      <input
        className="gs-input"
        type="email"
        placeholder="Email"
        value={email}
        maxLength={GUEST_EMAIL_MAX}
        onChange={(e) => onEmailChange(e.target.value)}
        style={{ marginBottom: 8 }}
      />
      <input
        className="gs-input"
        type="tel"
        placeholder="Phone"
        value={phone}
        maxLength={GUEST_PHONE_MAX}
        onChange={(e) => onPhoneChange(e.target.value)}
      />
    </div>
  );
}
