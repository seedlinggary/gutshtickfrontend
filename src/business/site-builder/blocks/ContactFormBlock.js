import React, { useState } from 'react';
import { Send, Check } from 'lucide-react';
import apiRequest from '../../../ApiRequest';
import { DEFAULT_THEME } from '../theme';

/**
 * The only block type with real interactive behavior worth telling apart
 * between edit and public mode -- in the canvas it's a static preview (so
 * clicking it in the builder selects the block instead of submitting
 * something), on the public site it actually posts to
 * POST /business-site/public/:subdomain/contact.
 */
export default function ContactFormBlock({ content, editable, subdomain, theme }) {
  // content.formStyle, when set, overrides the site-wide default (Look &
  // feel's Forms picker) for just this one form. This used to apply
  // nowhere at all -- theme.css defines .sb-form-underline/.sb-form-soft
  // (boxed is the unstyled base look), but nothing ever added either class
  // to an actual form, so picking "Underline" or "Soft" in the theme panel
  // never visibly changed anything, on this form or any other.
  const effectiveStyle = content.formStyle || (theme || DEFAULT_THEME).formStyle || 'boxed';
  const formClass = effectiveStyle !== 'boxed' ? `sb-form-${effectiveStyle}` : '';
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [state, setState] = useState('idle'); // idle | sending | sent | error
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (editable || state === 'sending') return;
    setState('sending');
    setError('');
    apiRequest('POST', form, `/business-site/public/${subdomain}/contact`)
      .then(() => setState('sent'))
      .catch((err) => { setState('error'); setError(typeof err === 'string' ? err : 'Could not send -- try again.'); });
  };

  if (state === 'sent') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, textAlign: 'center' }}>
        <Check size={28} />
        <p>Thanks — your message was sent.</p>
      </div>
    );
  }

  // Same "on a dark background" opt-in as the content blocks in
  // ContentBlocks.js (DarkBackgroundToggle) -- this form's own heading
  // text has no way to see its section's background color, so a form
  // embedded directly in a dark hero (not inside its own white card)
  // needs this explicitly set to stay legible.
  const headingColor = content.dark ? '#FFFFFF' : undefined;

  return (
    <form onSubmit={submit} className={formClass} style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%', overflow: 'auto' }}>
      {content.heading && <h3 style={{ margin: 0, color: headingColor }}>{content.heading}</h3>}
      <input className="sb-input" placeholder="Your name" required disabled={editable}
        value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <input className="sb-input" type="email" placeholder="Your email" required disabled={editable}
        value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <textarea className="sb-textarea" placeholder="Message" required disabled={editable} rows={4}
        value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
      {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 12, margin: 0 }}>{error}</p>}
      <button type="submit" className="sb-button" disabled={editable || state === 'sending'} style={{ alignSelf: 'flex-start' }}>
        <Send size={14} /> {state === 'sending' ? 'Sending…' : 'Send'}
      </button>
    </form>
  );
}
