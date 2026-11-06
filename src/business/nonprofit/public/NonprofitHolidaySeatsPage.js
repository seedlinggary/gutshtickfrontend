import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Minus, Plus } from 'lucide-react';
import apiRequest from '../../../ApiRequest';
import SiteFooter from '../../site-builder/SiteFooter';
import TurnstileWidget from '../../site-builder/TurnstileWidget';
import '../../site-builder/theme.css';

function formatCents(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ILS' }).format((cents || 0) / 100);
}

export default function NonprofitHolidaySeatsPage({ subdomain }) {
  const [holidays, setHolidays] = useState(null);
  const [seats, setSeats] = useState({}); // holidayId -> {men, women}
  const [isMember, setIsMember] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(undefined);

  useEffect(() => {
    apiRequest('GET', null, `/nonprofit/public/${subdomain}/holidays`).then((d) => setHolidays(d.holidays)).catch(() => setHolidays([]));
  }, [subdomain]);

  const setCount = (holidayId, key, delta) => {
    setSeats((cur) => {
      const current = cur[holidayId] || { men: 0, women: 0 };
      const next = Math.max(0, current[key] + delta);
      return { ...cur, [holidayId]: { ...current, [key]: next } };
    });
  };

  const { items, totalCents } = useMemo(() => {
    if (!holidays) return { items: [], totalCents: 0 };
    let total = 0;
    const list = [];
    for (const h of holidays) {
      const s = seats[h.id];
      if (!s || s.men + s.women <= 0) continue;
      const price = isMember ? h.member_price_cents : h.non_member_price_cents;
      total += price * (s.men + s.women);
      list.push({ holiday_id: h.id, men_seats: s.men, women_seats: s.women });
    }
    return { items: list, totalCents: total };
  }, [holidays, seats, isMember]);

  const submit = (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    apiRequest('POST', {
      full_name: fullName, phone, email, is_member: isMember, notes, items, captcha_token: captchaToken || undefined,
    }, `/nonprofit/public/${subdomain}/holiday-seats`)
      .then((data) => { window.location.href = data.payment_url; })
      .catch((err) => { setError(typeof err === 'string' ? err : 'Could not start checkout -- try again.'); setBusy(false); });
  };

  if (!holidays) return <div className="gs-loading"><div className="gs-spinner" /></div>;

  return (
    <div className="sb-theme">
      <div style={{ maxWidth: 560, margin: '0 auto', padding: 24 }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><CalendarDays size={24} /> Holiday seats</h1>

        {holidays.length === 0 && <p className="gs-empty">No holidays are open for seat sales right now.</p>}

        <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <input type="checkbox" checked={isMember} onChange={(e) => setIsMember(e.target.checked)} /> I am a member
        </label>

        {holidays.map((h) => {
          const s = seats[h.id] || { men: 0, women: 0 };
          const price = isMember ? h.member_price_cents : h.non_member_price_cents;
          return (
            <div key={h.id} style={{ borderBottom: '1px solid var(--sb-border, #e5e1d6)', padding: '12px 0' }}>
              <strong>{h.name_en}</strong>
              <div style={{ fontSize: 13, color: 'var(--sb-muted, #8a7a68)' }}>{formatCents(price)} per seat</div>
              <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--sb-muted, #8a7a68)' }}>Men</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button type="button" className="sb-icon-btn" onClick={() => setCount(h.id, 'men', -1)}><Minus size={12} /></button>
                    <span>{s.men}</span>
                    <button type="button" className="sb-icon-btn" onClick={() => setCount(h.id, 'men', 1)}><Plus size={12} /></button>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--sb-muted, #8a7a68)' }}>Women</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button type="button" className="sb-icon-btn" onClick={() => setCount(h.id, 'women', -1)}><Minus size={12} /></button>
                    <span>{s.women}</span>
                    <button type="button" className="sb-icon-btn" onClick={() => setCount(h.id, 'women', 1)}><Plus size={12} /></button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {items.length > 0 && (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
              <span>Total</span><span>{formatCents(totalCents)}</span>
            </div>
            <input className="sb-input" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            <input className="sb-input" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            <input className="sb-input" type="email" placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="sb-input" placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

            <TurnstileWidget onToken={setCaptchaToken} />
            {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13 }}>{error}</p>}

            <button type="submit" className="sb-button" disabled={busy || captchaToken === undefined}>
              {busy ? 'Redirecting to payment…' : `Pay ${formatCents(totalCents)}`}
            </button>
          </form>
        )}
      </div>
      <SiteFooter subdomain={subdomain} />
    </div>
  );
}
