import React, { useEffect, useState } from 'react';
import nonprofitApiRequest from '../nonprofitApi';
import '../nonprofit.css';

function formatCents(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ILS' }).format((cents || 0) / 100);
}

const TYPE_LABELS = {
  NonprofitBill: 'Bill',
  NonprofitDonation: 'Donation',
  NonprofitMembership: 'Membership',
  NonprofitPaymentLink: 'Payment link',
  NonprofitExternalTransaction: 'Other transaction',
  NonprofitPaymentFollowUp: 'Follow-up',
  NonprofitFormResponse: 'Form response',
};

export default function NonprofitSearchPage({ businessId }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q) { setResults(null); return; }
    setSearching(true);
    const timer = setTimeout(() => {
      nonprofitApiRequest('GET', null, `/nonprofit/businesses/${businessId}/search?q=${encodeURIComponent(q)}`)
        .then((d) => setResults(d.results))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query, businessId]);

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Search</h2>
      <div className="gs-field" style={{ maxWidth: 420 }}>
        <input
          className="gs-input"
          placeholder="Search by name, email, phone, or reference code..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      {searching && <div className="gs-loading"><div className="gs-spinner" /></div>}

      {!searching && results && (
        results.length === 0 ? <p className="gs-empty">No results.</p> : (
          <div className="admin-list" style={{ marginTop: 14 }}>
            {results.map((r, i) => (
              <div key={`${r.type}-${r.id}-${i}`} className="admin-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 13 }}>
                  <span className="admin-badge">{TYPE_LABELS[r.type] || r.type}</span>{' '}
                  <strong>{r.name || '—'}</strong>
                  {r.name == null && <span style={{ color: 'var(--muted)' }}> #{r.id}</span>}
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13 }}>
                  {r.amount_cents != null && <span>{formatCents(r.amount_cents)}</span>}
                  {r.status && <span className={`np-badge np-badge-${r.status}`}>{r.status}</span>}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
