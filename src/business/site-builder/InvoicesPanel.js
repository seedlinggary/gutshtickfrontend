import React, { useEffect, useState } from 'react';
import { Receipt, Download, ExternalLink, Undo2, ChevronDown } from 'lucide-react';
import apiRequest from '../../ApiRequest';

function formatCents(cents, currency) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: (currency || 'usd').toUpperCase() }).format((cents || 0) / 100);
}

/** API Key ID + Secret the owner generates inside their own Green Invoice
 * account, plus the open/closed-style "enabled" toggle (see
 * modals/green_invoice_account.py) -- a saved key pair can exist and still
 * be off, so pausing real document creation never loses the saved keys. */
export function GreenInvoiceSettings({ businessId }) {
  const [data, setData] = useState(null);
  const [apiKeyId, setApiKeyId] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  const load = () => apiRequest('GET', null, `/business/businesses/${businessId}/green-invoice`).then(setData).catch(() => setData({ connected: false, enabled: false }));
  useEffect(() => { load(); }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => {
    setSaving(true);
    setError('');
    apiRequest('PATCH', { api_key_id: apiKeyId || undefined, api_secret: apiSecret || undefined }, `/business/businesses/${businessId}/green-invoice`)
      .then((d) => { setData(d); setApiKeyId(''); setApiSecret(''); })
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not save -- try again.'))
      .finally(() => setSaving(false));
  };

  const toggleEnabled = (enabled) => {
    setSaving(true);
    apiRequest('PATCH', { enabled }, `/business/businesses/${businessId}/green-invoice`)
      .then(setData)
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not save -- try again.'))
      .finally(() => setSaving(false));
  };

  const test = () => {
    setTesting(true);
    setTestResult(null);
    apiRequest('POST', {}, `/business/businesses/${businessId}/green-invoice/test`)
      .then(() => setTestResult({ ok: true, message: 'Connection successful.' }))
      .catch((err) => setTestResult({ ok: false, message: typeof err === 'string' ? err : 'Could not connect.' }))
      .finally(() => setTesting(false));
  };

  const disconnect = () => {
    if (!window.confirm('Disconnect Green Invoice? Saved keys will be removed.')) return;
    apiRequest('DELETE', null, `/business/businesses/${businessId}/green-invoice`).then(() => setData({ connected: false, enabled: false }));
  };

  if (!data) return null;

  return (
    <div style={{ marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid var(--border, #e5e1d6)' }}>
      <button type="button" className="sb-icon-btn" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, fontWeight: 600 }}
        onClick={() => setOpen((o) => !o)}>
        <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
        Green Invoice {data.connected ? (data.enabled ? '(connected, on)' : '(connected, off)') : ''}
      </button>
      {open && (
        <div style={{ marginTop: 10 }}>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            Connect your own Green Invoice account to issue real, tax-compliant invoices for paid orders, instead of only the internal PDF receipt below.
          </p>
          {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13 }}>{error}</p>}

          {!data.connected ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input className="gs-input" placeholder="API Key ID" value={apiKeyId} onChange={(e) => setApiKeyId(e.target.value)} style={{ maxWidth: 220 }} />
              <input className="gs-input" placeholder="API Secret" type="password" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} style={{ maxWidth: 220 }} />
              <button type="button" className="gs-btn gs-btn-sm" disabled={saving || !apiKeyId.trim() || !apiSecret.trim()} onClick={save}>Connect</button>
            </div>
          ) : (
            <>
              <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <input type="checkbox" checked={!!data.enabled} disabled={saving} onChange={(e) => toggleEnabled(e.target.checked)} />
                Create real Green Invoice documents for paid orders
              </label>
              {data.last_error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 12 }}>Last error: {data.last_error}</p>}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" disabled={testing} onClick={test}>
                  {testing ? 'Testing…' : 'Test connection'}
                </button>
                <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={disconnect}>Disconnect</button>
              </div>
              {testResult && (
                <p style={{ fontSize: 12, marginTop: 6, color: testResult.ok ? 'var(--accent)' : 'var(--danger, #b42318)' }}>{testResult.message}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function InvoicesPanel({ businessId }) {
  const [invoices, setInvoices] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = () => apiRequest('GET', null, `/business/businesses/${businessId}/invoices`).then((d) => setInvoices(d.invoices)).catch(() => setInvoices([]));
  useEffect(() => { load(); }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  const issueCreditNote = (orderId) => {
    if (!window.confirm('Issue a Green Invoice credit note for this order? Green Invoice documents cannot be edited or deleted once issued -- this is the only way to void one.')) return;
    setBusyId(orderId);
    apiRequest('POST', {}, `/business/orders/${orderId}/invoice/credit-note`)
      .then(() => { window.alert('Credit note issued.'); load(); })
      .catch((err) => window.alert(typeof err === 'string' ? err : 'Could not issue a credit note -- try again.'))
      .finally(() => setBusyId(null));
  };

  if (!invoices) return <div className="gs-loading"><div className="gs-spinner" /></div>;

  return (
    <div className="gs-card">
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 0 }}><Receipt size={18} /> Invoices</h3>

      <GreenInvoiceSettings businessId={businessId} />

      {invoices.length === 0 && <p className="gs-empty">No invoices yet -- a receipt is generated automatically for every paid order or booking.</p>}
      <div className="admin-list">
        {invoices.map((inv) => (
          <div key={inv.order_id} className="admin-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <strong>{inv.invoice_number}</strong>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {inv.customer_label} · {formatCents(inv.total_cents, inv.currency)} · {inv.created_at ? new Date(inv.created_at).toLocaleDateString() : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {inv.green_invoice_pdf_url && (
                <a href={inv.green_invoice_pdf_url} target="_blank" rel="noreferrer" className="gs-btn gs-btn-outline gs-btn-sm">
                  <ExternalLink size={13} /> Green Invoice
                </a>
              )}
              {inv.green_invoice_doc_id && (
                <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" disabled={busyId === inv.order_id} onClick={() => issueCreditNote(inv.order_id)}>
                  <Undo2 size={13} /> Cancel & issue credit note
                </button>
              )}
              <button
                type="button"
                className="gs-btn gs-btn-outline gs-btn-sm"
                onClick={() => {
                  // A plain <a href> can't carry the auth token this route
                  // needs, so this fetches the PDF as a blob and triggers
                  // the save itself instead of navigating.
                  const cookie = localStorage.getItem('cookie');
                  const base = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';
                  fetch(`${base}/business/orders/${inv.order_id}/invoice.pdf?download=1`, { headers: { 'x-access-token': cookie } })
                    .then((res) => res.blob())
                    .then((blob) => {
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${inv.invoice_number}.pdf`;
                      a.click();
                      URL.revokeObjectURL(url);
                    });
                }}
              >
                <Download size={13} /> PDF
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
