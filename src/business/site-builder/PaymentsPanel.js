import React, { useEffect, useState } from 'react';
import { CreditCard, Check, ExternalLink, ChevronDown } from 'lucide-react';
import apiRequest from '../../ApiRequest';

/** Reads the one-time ?payments=connected|error&message=... the Stripe
 * OAuth callback redirect lands with (see payments.py's
 * _frontend_return_url) -- shown once, not persisted, same spirit as
 * SsoBootstrap.js stripping its own #sso fragment after reading it. */
function useOauthReturnBanner() {
  const [banner, setBanner] = useState(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payments = params.get('payments');
    if (payments) {
      setBanner({ ok: payments === 'connected', message: params.get('message') });
      params.delete('payments');
      params.delete('message');
      params.delete('tab');
      const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
      window.history.replaceState({}, '', next);
    }
  }, []);
  return banner;
}

export default function PaymentsPanel({ businessId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualId, setManualId] = useState('');
  const [manualBusy, setManualBusy] = useState(false);
  const banner = useOauthReturnBanner();

  const load = () => apiRequest('GET', null, `/business/businesses/${businessId}/payments/status`).then(setData).catch(() => setError('Could not load payment status.'));

  useEffect(() => { load(); }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  const connect = () => {
    setConnecting(true);
    apiRequest('POST', {}, `/business/businesses/${businessId}/payments/connect/start`)
      .then(({ authorize_url }) => { window.location.href = authorize_url; })
      .catch((err) => { setError(typeof err === 'string' ? err : 'Could not start that connection.'); setConnecting(false); });
  };

  const manualConnect = () => {
    const trimmed = manualId.trim();
    if (!trimmed) return;
    setManualBusy(true);
    setError('');
    apiRequest('POST', { account_id: trimmed }, `/business/businesses/${businessId}/payments/connect/manual`)
      .then(() => { setManualId(''); setShowManual(false); load(); })
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not connect that account.'))
      .finally(() => setManualBusy(false));
  };

  const disconnect = () => {
    if (!window.confirm('Disconnect Stripe? Checkout and bookings will stop accepting payments until you reconnect.')) return;
    setError('');
    apiRequest('DELETE', null, `/business/businesses/${businessId}/payments/disconnect`).then(load).catch((err) => setError(typeof err === 'string' ? err : 'Could not disconnect -- try again.'));
  };

  if (!data) return <div className="gs-loading"><div className="gs-spinner" /></div>;

  const account = data.account;
  const isActive = account?.status === 'active';

  return (
    <div className="gs-card">
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 0 }}><CreditCard size={18} /> Payments</h3>

      {banner && (
        <p style={{ fontSize: 13, color: banner.ok ? 'var(--accent)' : 'var(--danger, #b42318)' }}>
          {banner.ok ? 'Stripe connected.' : (banner.message || 'Could not connect Stripe.')}
        </p>
      )}
      {error && <div className="gs-error-box">{error}</div>}

      {!data.stripe_configured && (
        <p className="gs-empty">Payments aren't set up on this platform yet -- check back soon.</p>
      )}

      {data.stripe_configured && !isActive && (
        <>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            Connect your own Stripe account to accept payments for products and bookings on your site. Money goes straight to your account -- we never hold it.
          </p>
          <button type="button" className="gs-btn" disabled={connecting} onClick={connect}>
            <ExternalLink size={14} /> Connect Stripe
          </button>

          <button type="button" className="sb-icon-btn" style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
            onClick={() => setShowManual((s) => !s)}>
            <ChevronDown size={12} style={{ transform: showManual ? 'rotate(180deg)' : 'none' }} />
            Already have a Stripe account ID?
          </button>
          {showManual && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <input className="gs-input" placeholder="acct_..." value={manualId} onChange={(e) => setManualId(e.target.value)} style={{ maxWidth: 260 }} />
              <button type="button" className="gs-btn gs-btn-sm" disabled={manualBusy || !manualId.trim()} onClick={manualConnect}>Connect</button>
            </div>
          )}
        </>
      )}

      {isActive && (
        <>
          <p style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent)' }}>
            <Check size={16} /> Connected{account.details?.business_name ? ` as ${account.details.business_name}` : ''}
          </p>
          <ul style={{ fontSize: 13, color: 'var(--muted)', paddingLeft: 18 }}>
            <li>Charges: {account.details?.charges_enabled ? 'enabled' : 'not yet enabled'}</li>
            <li>Payouts: {account.details?.payouts_enabled ? 'enabled' : 'not yet enabled'}</li>
          </ul>
          <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={disconnect}>Disconnect</button>
        </>
      )}
    </div>
  );
}
