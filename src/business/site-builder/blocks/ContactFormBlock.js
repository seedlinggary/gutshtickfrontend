import React, { useState } from 'react';
import { Send, Check } from 'lucide-react';
import apiRequest from '../../../ApiRequest';
import { DEFAULT_THEME } from '../theme';

// The fields every Contact form block starts with -- the exact 3 inputs
// this block always had before content.fields existed, so a block saved
// before this change (content.fields absent) renders and submits exactly
// as it always did. `fixed: true` (name/email) marks a field the backend
// structurally requires and can't be removed or made optional, since
// there's no way to notify "someone" or reply to no address -- every
// other field (message, and anything the owner adds in the inspector) is
// a free-form, independently optional line past that. See
// BlockInspector.js's own editor for this list, and business_site_public.py's
// submit_site_contact for the matching server-side shape.
export const CONTACT_FIXED_FIELDS = [
  { key: 'name', label: 'Your name', type: 'text', required: true, fixed: true },
  { key: 'email', label: 'Your email', type: 'email', required: true, fixed: true },
];
export const CONTACT_DEFAULT_EXTRA_FIELDS = [
  { key: 'message', label: 'Message', type: 'textarea', required: true },
];

function blankValues(fields) {
  return Object.fromEntries(fields.map((f) => [f.key, '']));
}

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
  const extraFields = content.fields || CONTACT_DEFAULT_EXTRA_FIELDS;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [values, setValues] = useState(() => blankValues(extraFields));
  const [state, setState] = useState('idle'); // idle | sending | sent | error
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (editable || state === 'sending') return;
    setState('sending');
    setError('');
    const extra = extraFields
      .filter((f) => (values[f.key] || '').trim())
      .map((f) => ({ label: f.label, value: values[f.key].trim() }));
    apiRequest('POST', { name, email, extra }, `/business-site/public/${subdomain}/contact`)
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
  // A real business's own contact form is a bordered/shadowed card (see
  // DonationFormBlock's comment for the same comparison) -- on by
  // default since every real example of this had one; content.noCard
  // opts out for a page where the surrounding section already provides
  // its own framing.
  const cardClass = content.noCard ? '' : ' sb-form-plain-card';

  return (
    <form onSubmit={submit} className={`${formClass}${cardClass}`} style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%', overflow: 'auto', boxSizing: 'border-box' }}>
      {content.heading && <h3 style={{ margin: 0, color: headingColor, fontFamily: 'var(--sb-font-heading)' }}>{content.heading}</h3>}
      <input className="sb-input" placeholder="Your name" required disabled={editable}
        value={name} onChange={(e) => setName(e.target.value)} />
      <input className="sb-input" type="email" placeholder="Your email" required disabled={editable}
        value={email} onChange={(e) => setEmail(e.target.value)} />
      {extraFields.map((f) => (
        f.type === 'textarea' ? (
          <textarea key={f.key} className="sb-textarea" placeholder={f.label} required={f.required} disabled={editable} rows={4}
            value={values[f.key] || ''} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
        ) : (
          <input key={f.key} className="sb-input" type={f.type || 'text'} placeholder={`${f.label}${f.required ? '' : ' (optional)'}`} required={f.required} disabled={editable}
            value={values[f.key] || ''} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
        )
      ))}
      {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 12, margin: 0 }}>{error}</p>}
      <div className="sb-form-footer">
        <button type="submit" className="sb-button" disabled={editable || state === 'sending'}>
          <Send size={14} /> {state === 'sending' ? 'Sending…' : 'Send'}
        </button>
      </div>
    </form>
  );
}
