import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, ArrowRight, Copy, Check } from 'lucide-react';
import apiRequest from '../ApiRequest';

function timeLeft(expiresAt) {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const days = Math.floor(ms / 86400000);
  if (days > 0) return `${days} day${days === 1 ? '' : 's'} left`;
  const hours = Math.floor(ms / 3600000);
  return hours > 0 ? `${hours} hour${hours === 1 ? '' : 's'} left` : 'Expires soon';
}

export default function DealWallet() {
  const [deals, setDeals] = useState(null);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    apiRequest('GET', null, '/business/my/deals').then(setDeals).catch((err) => setError(err));
  }, []);

  const copyCode = async (deal) => {
    try {
      await navigator.clipboard.writeText(deal.code);
      setCopiedId(deal.id);
      setTimeout(() => setCopiedId((id) => (id === deal.id ? null : id)), 2000);
    } catch (_) { /* clipboard unavailable -- the code's still shown on screen */ }
  };

  if (error) return <div className="biz-page biz-wallet"><p className="biz-error">The deal wallet isn't available yet -- it's still being tested.</p></div>;
  if (!deals) return <div className="biz-page biz-wallet"><p>Loading...</p></div>;

  return (
    <div className="biz-page biz-wallet">
      <h1 className="biz-page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Ticket size={26} /> My Deal Wallet</h1>
      {deals.length === 0 && (
        <div className="biz-empty">
          <p>No saved deals yet -- tap "Get This Deal" on any deal post to save it here.</p>
          <Link to="/deals" className="gs-btn gs-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
            Browse deals <ArrowRight size={14} />
          </Link>
        </div>
      )}
      <div className="biz-wallet-grid">
        {deals.map((d) => (
          <div key={d.id} className={`biz-wallet-card${d.status === 'redeemed' ? ' biz-wallet-card-redeemed' : ''}`}>
            <div className="biz-wallet-card-header">
              <h3>{d.post?.title || 'Deal'}</h3>
              {d.status === 'redeemed' ? (
                <span className="biz-wallet-badge biz-wallet-badge-redeemed">Redeemed</span>
              ) : (
                <span className="biz-wallet-badge">{timeLeft(d.post?.expires_at)}</span>
              )}
            </div>
            <p className="biz-wallet-business">{d.post?.business?.name}</p>
            <p className="biz-wallet-code" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {d.code}
              <button
                type="button"
                onClick={() => copyCode(d)}
                title="Copy code"
                aria-label="Copy code"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, display: 'inline-flex', alignItems: 'center' }}
              >
                {copiedId === d.id ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </p>
            {d.status !== 'redeemed' && (
              <p className="biz-wallet-hint">Show this code to the business to redeem.</p>
            )}
            {d.post?.business?.slug && (
              <Link to={`/business/${d.post.business.slug}`} className="biz-wallet-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>View business <ArrowRight size={12} /></Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
