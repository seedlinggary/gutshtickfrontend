import React, { useState } from 'react';
import { HandCoins } from 'lucide-react';
import apiRequest from '../../../ApiRequest';
import SiteFooter from '../../site-builder/SiteFooter';
import TurnstileWidget from '../../site-builder/TurnstileWidget';
import '../../site-builder/theme.css';

const SUGGESTED_AMOUNTS = [50, 100, 250, 500];

// Same card/chip/grid treatment as the embeddable DonationFormBlock
// (NonprofitBlocks.js) -- this standalone page used to be its own,
// plainer version (gs-btn pills, no card, one flat column of fields),
// which is exactly the "forms look bad" gap: a business that doesn't
// embed the block anywhere (nav links straight to this fixed page
// instead) got none of that fix.
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
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--sb-font-heading)', marginBottom: 20 }}>
          <HandCoins size={24} /> Make a donation
        </h1>
        <form onSubmit={submit} className="sb-form-plain-card" style={{ display: 'flex', flexDirection: 'column', gap: 16, boxSizing: 'border-box' }}>
          <div>
            <div className="sb-form-section-heading">Amount</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              {SUGGESTED_AMOUNTS.map((a) => (
                <button key={a} type="button" className={`sb-choice-chip${amount === a && !customAmount ? ' sb-choice-chip-active' : ''}`}
                  onClick={() => { setAmount(a); setCustomAmount(''); }}>
                  ₪{a}
                </button>
              ))}
            </div>
            <input className="sb-input" type="number" min="1" step="0.01" placeholder="Custom amount (₪)" value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)} />
          </div>
          <input className="sb-input" placeholder="In honor/memory of… (optional)" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
          <div className="sb-form-grid-2">
            <input className="sb-input" placeholder="Full name *" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            <input className="sb-input" type="email" placeholder="Email *" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className="sb-input" type="tel" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <input className="sb-input" placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
            <input className="sb-input" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>

          <TurnstileWidget onToken={setCaptchaToken} />
          {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13, margin: 0 }}>{error}</p>}

          <div className="sb-form-footer">
            <button type="submit" className="sb-button" disabled={busy || !finalAmount || finalAmount <= 0 || captchaToken === undefined}>
              {busy ? 'Redirecting to payment…' : `Donate ₪${finalAmount || 0}`}
            </button>
          </div>
        </form>
      </div>
      <SiteFooter subdomain={subdomain} />
    </div>
  );
}
