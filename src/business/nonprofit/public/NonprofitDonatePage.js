import React, { useState } from 'react';
import { HandCoins } from 'lucide-react';
import apiRequest from '../../../ApiRequest';
import SiteFooter from '../../site-builder/SiteFooter';
import TurnstileWidget from '../../site-builder/TurnstileWidget';
import '../../site-builder/theme.css';

const SUGGESTED_AMOUNTS = [50, 100, 250, 500];

export default function NonprofitDonatePage({ subdomain }) {
  const [amount, setAmount] = useState(100);
  const [customAmount, setCustomAmount] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [purpose, setPurpose] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(undefined);

  const finalAmount = customAmount ? Number(customAmount) : amount;

  const submit = (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    apiRequest('POST', {
      full_name: fullName, email, phone, address, city, purpose, amount: finalAmount,
      captcha_token: captchaToken || undefined,
    }, `/nonprofit/public/${subdomain}/donate`)
      .then((data) => { window.location.href = data.payment_url; })
      .catch((err) => { setError(typeof err === 'string' ? err : 'Could not start your donation -- try again.'); setBusy(false); });
  };

  return (
    <div className="sb-theme">
      <div style={{ maxWidth: 480, margin: '0 auto', padding: 24 }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><HandCoins size={24} /> Make a donation</h1>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="gs-field">
            <div className="gs-label">Amount</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {SUGGESTED_AMOUNTS.map((a) => (
                <button key={a} type="button" className={`gs-btn gs-btn-sm${amount === a && !customAmount ? '' : ' gs-btn-outline'}`}
                  onClick={() => { setAmount(a); setCustomAmount(''); }}>
                  ₪{a}
                </button>
              ))}
            </div>
            <input className="sb-input" type="number" min="1" step="0.01" placeholder="Custom amount (₪)" value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)} style={{ marginTop: 8 }} />
          </div>
          <input className="sb-input" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <input className="sb-input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="sb-input" placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input className="sb-input" placeholder="Address (optional)" value={address} onChange={(e) => setAddress(e.target.value)} />
          <input className="sb-input" placeholder="City (optional)" value={city} onChange={(e) => setCity(e.target.value)} />
          <input className="sb-input" placeholder="In honor/memory of… (optional)" value={purpose} onChange={(e) => setPurpose(e.target.value)} />

          <TurnstileWidget onToken={setCaptchaToken} />
          {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13 }}>{error}</p>}

          <button type="submit" className="sb-button" disabled={busy || !finalAmount || finalAmount <= 0 || captchaToken === undefined}>
            {busy ? 'Redirecting to payment…' : `Donate ₪${finalAmount || 0}`}
          </button>
        </form>
      </div>
      <SiteFooter subdomain={subdomain} />
    </div>
  );
}
