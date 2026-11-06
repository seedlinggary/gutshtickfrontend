import React, { useEffect, useState } from 'react';
import { Receipt, Download } from 'lucide-react';
import apiRequest from '../../ApiRequest';

function formatCents(cents, currency) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: (currency || 'usd').toUpperCase() }).format((cents || 0) / 100);
}

export default function InvoicesPanel({ businessId }) {
  const [invoices, setInvoices] = useState(null);

  useEffect(() => {
    apiRequest('GET', null, `/business/businesses/${businessId}/invoices`).then((d) => setInvoices(d.invoices)).catch(() => setInvoices([]));
  }, [businessId]);

  if (!invoices) return <div className="gs-loading"><div className="gs-spinner" /></div>;

  return (
    <div className="gs-card">
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 0 }}><Receipt size={18} /> Invoices</h3>
      {invoices.length === 0 && <p className="gs-empty">No invoices yet -- a receipt is generated automatically for every paid order or booking.</p>}
      <div className="admin-list">
        {invoices.map((inv) => (
          <div key={inv.order_id} className="admin-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>{inv.invoice_number}</strong>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {inv.customer_label} · {formatCents(inv.total_cents, inv.currency)} · {inv.created_at ? new Date(inv.created_at).toLocaleDateString() : ''}
              </div>
            </div>
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
        ))}
      </div>
    </div>
  );
}
