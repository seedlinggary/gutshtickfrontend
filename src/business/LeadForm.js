import React, { useState } from 'react';
import apiRequest from '../ApiRequest';
import { getEmail } from '../auth';

const MESSAGE_MAX = 2000;

export default function LeadForm({ businessId }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: getEmail() || '', phone: '', message: '' });
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setStatus(null);
    apiRequest('POST', form, `/business/businesses/${businessId}/leads`)
      .then(() => { setStatus('ok'); setForm({ ...form, message: '' }); })
      .catch((err) => setStatus(typeof err === 'string' ? err : 'Could not send that -- try again'))
      .finally(() => setBusy(false));
  };

  if (!open) {
    return (
      <button type="button" className="biz-lead-open-btn" onClick={() => setOpen(true)}>
        Request a Quote
      </button>
    );
  }

  if (status === 'ok') {
    return <p className="biz-lead-sent">Sent! The business will follow up at {form.email}.</p>;
  }

  return (
    <form className="biz-lead-form" onSubmit={submit}>
      <input
        type="text" required placeholder="Your name" value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />
      <input
        type="email" required placeholder="Your email" value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
      />
      <input
        type="tel" placeholder="Phone (optional)" value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value })}
      />
      <textarea
        required maxLength={MESSAGE_MAX} placeholder="What do you need a quote for?" value={form.message}
        onChange={(e) => setForm({ ...form, message: e.target.value })}
      />
      {status && typeof status === 'string' && <p className="biz-lead-error">{status}</p>}
      <div className="biz-lead-actions">
        <button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send request'}</button>
        <button type="button" className="biz-lead-cancel" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
