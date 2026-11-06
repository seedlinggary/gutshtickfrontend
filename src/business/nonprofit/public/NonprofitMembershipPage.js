import React, { useEffect, useState } from 'react';
import { Repeat } from 'lucide-react';
import apiRequest from '../../../ApiRequest';
import SiteFooter from '../../site-builder/SiteFooter';
import TurnstileWidget from '../../site-builder/TurnstileWidget';
import '../../site-builder/theme.css';

function formatCents(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ILS' }).format((cents || 0) / 100);
}

export default function NonprofitMembershipPage({ subdomain }) {
  const [prices, setPrices] = useState(null);
  const [tier, setTier] = useState('associate');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(undefined);

  useEffect(() => {
    // No dedicated public pricing endpoint -- the amount is resolved
    // authoritatively server-side at submit time anyway, so this is
    // purely informational; fall back to the ported system's own
    // defaults if it can't be reached pre-submit.
    setPrices({ associate: 10000, full: 20000 });
  }, []);

  const submit = (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    apiRequest('POST', {
      full_name: fullName, email, phone, address, city, tier, captcha_token: captchaToken || undefined,
    }, `/nonprofit/public/${subdomain}/membership`)
      .then((data) => { window.location.href = data.payment_url; })
      .catch((err) => { setError(typeof err === 'string' ? err : 'Could not start your membership -- try again.'); setBusy(false); });
  };

  if (!prices) return <div className="gs-loading"><div className="gs-spinner" /></div>;

  return (
    <div className="sb-theme">
      <div style={{ maxWidth: 480, margin: '0 auto', padding: 24 }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Repeat size={24} /> Become a member</h1>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="gs-field">
            <div className="gs-label">Membership tier</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {['associate', 'full'].map((t) => (
                <button key={t} type="button" className={`gs-btn gs-btn-sm${tier === t ? '' : ' gs-btn-outline'}`} onClick={() => setTier(t)} style={{ flex: 1 }}>
                  {t === 'associate' ? 'Associate' : 'Full'} -- {formatCents(prices[t])}/mo
                </button>
              ))}
            </div>
          </div>
          <input className="sb-input" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <input className="sb-input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="sb-input" placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input className="sb-input" placeholder="Address (optional)" value={address} onChange={(e) => setAddress(e.target.value)} />
          <input className="sb-input" placeholder="City (optional)" value={city} onChange={(e) => setCity(e.target.value)} />

          <p style={{ fontSize: 12, color: 'var(--sb-muted, #8a7a68)' }}>
            This sets up a monthly standing order -- you'll continue to be charged {formatCents(prices[tier])} every month until you cancel.
          </p>

          <TurnstileWidget onToken={setCaptchaToken} />
          {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13 }}>{error}</p>}

          <button type="submit" className="sb-button" disabled={busy || captchaToken === undefined}>
            {busy ? 'Redirecting to payment…' : 'Set up membership'}
          </button>
        </form>
      </div>
      <SiteFooter subdomain={subdomain} />
    </div>
  );
}
