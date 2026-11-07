import React, { useEffect, useState } from 'react';
import { Repeat } from 'lucide-react';
import apiRequest from '../../../ApiRequest';
import SiteFooter from '../../site-builder/SiteFooter';
import TurnstileWidget from '../../site-builder/TurnstileWidget';
import '../../site-builder/theme.css';

function formatCents(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ILS' }).format((cents || 0) / 100);
}

// Same card/chip/grid treatment as the embeddable MembershipFormBlock --
// see NonprofitDonatePage.js's own comment for why this standalone page
// needed the same fix independently.
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
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--sb-font-heading)', marginBottom: 20 }}>
          <Repeat size={24} /> Become a member
        </h1>
        <form onSubmit={submit} className="sb-form-plain-card" style={{ display: 'flex', flexDirection: 'column', gap: 16, boxSizing: 'border-box' }}>
          <div>
            <div className="sb-form-section-heading">Choose Your Membership</div>
            <div className="sb-form-grid-2">
              {['associate', 'full'].map((t) => (
                <button key={t} type="button" className={`sb-choice-card${tier === t ? ' sb-choice-card-active' : ''}`} onClick={() => setTier(t)}>
                  <p className="sb-choice-card-title">{t === 'associate' ? 'Associate Member' : 'Full Member'}</p>
                  <p className="sb-choice-card-sub">{formatCents(prices[t])} / month</p>
                </button>
              ))}
            </div>
          </div>
          <div className="sb-form-grid-2">
            <input className="sb-input" placeholder="Full name *" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            <input className="sb-input" type="email" placeholder="Email *" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className="sb-input" type="tel" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <input className="sb-input" placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
            <input className="sb-input" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>

          <p className="sb-form-intro">
            This sets up a monthly standing order -- you'll continue to be charged {formatCents(prices[tier])} every month until you cancel.
          </p>

          <TurnstileWidget onToken={setCaptchaToken} />
          {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13, margin: 0 }}>{error}</p>}

          <div className="sb-form-footer">
            <button type="submit" className="sb-button" disabled={busy || captchaToken === undefined}>
              {busy ? 'Redirecting to payment…' : 'Continue to Payment'}
            </button>
          </div>
        </form>
      </div>
      <SiteFooter subdomain={subdomain} />
    </div>
  );
}
