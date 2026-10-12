import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Hourglass, CheckCircle2, XCircle, Wrench, Store, Plus } from 'lucide-react';
import apiRequest from '../ApiRequest';
import BusinessCard from './BusinessCard';
import BulkManager from './BulkManager';

const CLAIM_LABEL = {
  pending: { text: 'Pending review', Icon: Hourglass },
  approved: { text: 'Approved', Icon: CheckCircle2 },
  rejected: { text: 'Rejected', Icon: XCircle },
};

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
          <Link to="/business/new" className="gs-btn gs-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Plus size={15} /> List a business</Link>
        </div>

        {owned.length > 0 && (
          <>
            <h3>Claimed by you</h3>
            {owned.map((b) => (
              <div key={b.id}>
                <BusinessCard business={b} />
                <div style={{ display: 'flex', gap: 10, margin: '-6px 0 14px 4px' }}>
                  <Link to={`/business/${b.slug}/tools`} className="gs-btn gs-btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Wrench size={13} /> Manage tools</Link>
                </div>
              </div>
            ))}
            {owned.length > 1 && <BulkManager businesses={owned} />}
          </>
        )}

        {createdOnly.length > 0 && (
          <>
            <h3>Submitted by you (not yet claimed)</h3>
            {createdOnly.map((b) => <BusinessCard key={b.id} business={b} />)}
          </>
        )}

        {owned.length === 0 && createdOnly.length === 0 && (
          <div className="gs-empty">
            <Store size={40} style={{ marginBottom: 8, color: 'var(--muted-faint)' }} />
            <p>You haven't listed or claimed any businesses yet.</p>
            <Link to="/business/new" className="gs-btn gs-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <Plus size={15} /> List your business
            </Link>
          </div>
        )}

        {claims.length > 0 && (
          <>
            <h3>Your claim requests</h3>
            {claims.map((c) => {
              const claimMeta = CLAIM_LABEL[c.status];
              const ClaimIcon = claimMeta?.Icon;
              return (
                <div key={c.id} className="gs-card" style={{ marginBottom: 10 }}>
                  <div className="gs-card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Link to={`/business/${c.business?.slug}`} style={{ textDecoration: 'none', color: 'inherit', fontWeight: 600 }}>
                      {c.business?.name}
                    </Link>
                    <span style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      {claimMeta ? <><ClaimIcon size={14} /> {claimMeta.text}</> : c.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
