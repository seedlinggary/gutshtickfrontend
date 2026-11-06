import React, { useEffect, useState } from 'react';
import { Mail, Check, X, Flag, Inbox, Send, Download } from 'lucide-react';
import nonprofitApiRequest from '../nonprofitApi';
import '../nonprofit.css';

function formatCents(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ILS' }).format((cents || 0) / 100);
}

const STATUS_TABS = [
  { value: 'open', label: 'Open' },
  { value: 'email_sent', label: 'Email sent' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
  { value: '', label: 'All' },
];

const REASON_LABELS = {
  stale_pending: 'Stale pending',
  manual: 'Manual',
  failure_email: 'Decline email',
  api_decline: 'API decline',
};

function FlagForm({ businessId, onDone, onCancel }) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const body = {
      full_name: fullName.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      amount_cents: amount === '' ? null : Math.round(Number(amount) * 100),
      notes: notes.trim() || null,
      category: category.trim() || null,
    };
    nonprofitApiRequest('POST', body, `/nonprofit/businesses/${businessId}/payment-followups/flag`)
      .then(() => onDone())
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not flag.'))
      .finally(() => setSaving(false));
  };

  return (
    <form onSubmit={submit} className="sb-new-page-form" style={{ maxWidth: 420 }}>
      {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13 }}>{error}</p>}
      <input className="gs-input" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      <input className="gs-input" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <input className="gs-input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="gs-input" type="number" step="0.01" min="0" placeholder="Amount (optional)" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <input className="gs-input" placeholder="Category (optional)" value={category} onChange={(e) => setCategory(e.target.value)} />
      <textarea className="gs-input" rows={2} placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="gs-btn gs-btn-sm" disabled={saving}>Flag</button>
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function ImportEmailForm({ businessId, onDone }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setResult(null);
    nonprofitApiRequest('POST', { email_text: text }, `/nonprofit/businesses/${businessId}/payment-followups/import-failure-email`)
      .then((followup) => { setResult(followup); setText(''); onDone(); })
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not recognize this as a decline email.'))
      .finally(() => setSaving(false));
  };

  return (
    <form onSubmit={submit} className="sb-new-page-form" style={{ maxWidth: 520 }}>
      {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13 }}>{error}</p>}
      {result && (
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>
          Flagged {result.full_name || 'an unnamed payer'}{result.amount_cents ? ` for ${formatCents(result.amount_cents)}` : ''}.
        </p>
      )}
      <textarea className="gs-input" rows={6} placeholder="Paste the full forwarded decline email here..." value={text} onChange={(e) => setText(e.target.value)} required />
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="gs-btn gs-btn-sm" disabled={saving || !text.trim()}>Parse &amp; flag</button>
      </div>
    </form>
  );
}

export default function NonprofitFollowupsPage({ businessId }) {
  const [status, setStatus] = useState('open');
  const [followups, setFollowups] = useState(null);
  const [flagOpen, setFlagOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [sendAllMsg, setSendAllMsg] = useState('');
  const [rowError, setRowError] = useState({});

  const load = () => {
    const qs = status ? `?status=${status}` : '';
    nonprofitApiRequest('GET', null, `/nonprofit/businesses/${businessId}/payment-followups${qs}`)
      .then((d) => setFollowups(d.followups))
      .catch(() => setFollowups([]));
  };
  useEffect(() => { load(); }, [businessId, status]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = (id, action) => {
    setRowError((e) => ({ ...e, [id]: '' }));
    nonprofitApiRequest('POST', null, `/nonprofit/payment-followups/${id}/${action}`)
      .then(load)
      .catch((err) => setRowError((e) => ({ ...e, [id]: typeof err === 'string' ? err : 'Could not do that.' })));
  };

  const sendAll = () => {
    setSendAllMsg('');
    nonprofitApiRequest('POST', null, `/nonprofit/businesses/${businessId}/payment-followups/send-all`)
      .then((d) => { setSendAllMsg(`Sent ${d.sent}, skipped ${d.skipped} (no email on file).`); load(); })
      .catch((err) => setSendAllMsg(typeof err === 'string' ? err : 'Could not send.'));
  };

  const exportCsv = () => {
    const qs = status ? `?status=${status}` : '';
    nonprofitApiRequest('GET', null, `/nonprofit/businesses/${businessId}/payment-followups/export${qs}`).then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'payment-followups.csv';
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  if (!followups) return <div className="gs-loading"><div className="gs-spinner" /></div>;

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Payment follow-ups</h2>

      <div className="np-toolbar">
        <div className="np-filters">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              className={`gs-btn gs-btn-sm ${status === t.value ? '' : 'gs-btn-outline'}`}
              onClick={() => setStatus(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={exportCsv}><Download size={14} /> Export CSV</button>
          <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={sendAll}><Send size={14} /> Send all (open)</button>
        </div>
      </div>
      {sendAllMsg && <p style={{ fontSize: 13, color: 'var(--muted)' }}>{sendAllMsg}</p>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => { setFlagOpen((s) => !s); setImportOpen(false); }}>
          <Flag size={14} /> {flagOpen ? 'Close' : 'Flag manually'}
        </button>
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => { setImportOpen((s) => !s); setFlagOpen(false); }}>
          <Inbox size={14} /> {importOpen ? 'Close' : 'Paste a decline email'}
        </button>
      </div>
      {flagOpen && (
        <div className="gs-card" style={{ marginBottom: 14 }}>
          <FlagForm businessId={businessId} onDone={() => { setFlagOpen(false); load(); }} onCancel={() => setFlagOpen(false)} />
        </div>
      )}
      {importOpen && (
        <div className="gs-card" style={{ marginBottom: 14 }}>
          <ImportEmailForm businessId={businessId} onDone={load} />
        </div>
      )}

      {followups.length === 0 ? <p className="gs-empty">No follow-ups.</p> : (
        <div className="admin-list">
          {followups.map((f) => {
            const closed = f.status === 'resolved' || f.status === 'dismissed';
            return (
              <div key={f.id} className="admin-card">
                <div className="admin-card-top">
                  <span className={`np-badge np-badge-${f.status}`}>{f.status.replace('_', ' ')}</span>
                  <span className="admin-date">{f.created_at ? new Date(f.created_at).toLocaleDateString() : ''}</span>
                </div>
                <div style={{ fontSize: 13 }}>
                  <strong>{f.full_name || 'Unnamed'}</strong> -- {formatCents(f.amount_cents)}
                  {f.is_standalone && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--muted)' }}>(not linked to a record)</span>}
                </div>
                <div className="admin-card-meta">
                  {REASON_LABELS[f.reason] || f.reason}
                  {f.email && ` · ${f.email}`}
                  {f.phone && ` · ${f.phone}`}
                  {f.failure_reason && ` · ${f.failure_reason}`}
                  {f.card_last4 && ` · card ••${f.card_last4}`}
                  {f.emails_sent_count > 0 && ` · ${f.emails_sent_count} email(s) sent`}
                </div>
                {f.notes && <div className="admin-card-meta">{f.notes}</div>}
                {rowError[f.id] && <p style={{ color: 'var(--danger, #b42318)', fontSize: 12 }}>{rowError[f.id]}</p>}
                {!closed && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => act(f.id, 'send-email')}><Mail size={13} /> Send email</button>
                    <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => act(f.id, 'resolve')}><Check size={13} /> Resolve</button>
                    <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => act(f.id, 'dismiss')}><X size={13} /> Dismiss</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
