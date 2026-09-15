import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import BusinessCard from './BusinessCard';

const CLAIM_LABEL = { pending: '⏳ Pending review', approved: '✅ Approved', rejected: '❌ Rejected' };

export default function MyBusinesses() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    apiRequest('GET', null, '/business/my/businesses')
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="feed-section"><div className="gs-container"><div className="gs-loading"><div className="gs-spinner" /> Loading…</div></div></div>;
  if (error) return <div className="feed-section"><div className="gs-container"><div className="gs-error-box">Could not load your businesses.</div></div></div>;

  const owned = data.owned || [];
  const created = data.created || [];
  const claims = data.claims || [];
  const ownedIds = new Set(owned.map((b) => b.id));
  const createdOnly = created.filter((b) => !ownedIds.has(b.id));

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 680 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>My Businesses</h1>
          <Link to="/business/new" className="gs-btn gs-btn-primary">+ List a business</Link>
        </div>

        {owned.length > 0 && (
          <>
            <h3>Claimed by you</h3>
            {owned.map((b) => <BusinessCard key={b.id} business={b} />)}
          </>
        )}

        {createdOnly.length > 0 && (
          <>
            <h3>Submitted by you (not yet claimed)</h3>
            {createdOnly.map((b) => <BusinessCard key={b.id} business={b} />)}
          </>
        )}

        {owned.length === 0 && createdOnly.length === 0 && (
          <div className="gs-empty"><p style={{ fontSize: 40, marginBottom: 8 }}>🏪</p><p>You haven't listed or claimed any businesses yet.</p></div>
        )}

        {claims.length > 0 && (
          <>
            <h3>Your claim requests</h3>
            {claims.map((c) => (
              <div key={c.id} className="gs-card" style={{ marginBottom: 10 }}>
                <div className="gs-card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Link to={`/business/${c.business?.slug}`} style={{ textDecoration: 'none', color: 'inherit', fontWeight: 600 }}>
                    {c.business?.name}
                  </Link>
                  <span style={{ fontSize: 13 }}>{CLAIM_LABEL[c.status] || c.status}</span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
