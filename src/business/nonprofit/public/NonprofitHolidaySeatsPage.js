import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Minus, Plus } from 'lucide-react';
import apiRequest from '../../../ApiRequest';
import SiteFooter from '../../site-builder/SiteFooter';
import TurnstileWidget from '../../site-builder/TurnstileWidget';
import '../../site-builder/theme.css';

function formatCents(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ILS' }).format((cents || 0) / 100);
}

// Same card/chip/seat-card treatment as the embeddable
// HolidaySeatsFormBlock -- see NonprofitDonatePage.js's own comment for
// why this standalone page needed the same fix independently. This is
// also the exact page a real business's own "Holiday Seats" nav link
// points to when it never embeds the block on a built page at all.
export default function NonprofitHolidaySeatsPage({ subdomain }) {
  const [holidays, setHolidays] = useState(null);
  const [seats, setSeats] = useState({}); // holidayId -> {men, women}
  const [isMember, setIsMember] = useState(null);
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
    if (!holidays || isMember === null) return { items: [], totalCents: 0 };
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
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--sb-font-heading)', marginBottom: 20 }}>
          <CalendarDays size={24} /> Holiday seats
        </h1>

        <div className="sb-form-plain-card" style={{ display: 'flex', flexDirection: 'column', gap: 16, boxSizing: 'border-box' }}>
          {holidays.length === 0 ? (
            <p className="gs-empty">No holidays are open for seat sales right now.</p>
          ) : (
            <>
              <div>
                <div className="sb-form-section-heading">Membership Status</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className={`sb-choice-chip${isMember === true ? ' sb-choice-chip-active' : ''}`} onClick={() => setIsMember(true)}>Member</button>
                  <button type="button" className={`sb-choice-chip${isMember === false ? ' sb-choice-chip-active' : ''}`} onClick={() => setIsMember(false)}>Non-Member</button>
                </div>
              </div>

              <div>
                <div className="sb-form-section-heading">Choose Your Seats</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {holidays.map((h) => {
                    const s = seats[h.id] || { men: 0, women: 0 };
                    const hasSeats = s.men + s.women > 0;
                    return (
                      <div key={h.id} className={`sb-seat-card${hasSeats ? ' sb-seat-card-active' : ''}`}>
                        <h4>{h.name_en}</h4>
                        {h.description_en && <p className="sb-seat-card-desc">{h.description_en}</p>}
                        <div className="sb-seat-card-prices">
                          <span>{formatCents(h.member_price_cents)} / seat (member)</span>
                          <span>{formatCents(h.non_member_price_cents)} / seat (non-member)</span>
                        </div>
                        <div className="sb-seat-steppers">
                          <div>
                            <span className="sb-stepper-label">Men's Seats</span>
                            <div className="sb-stepper-row">
                              <button type="button" className="sb-stepper-btn" onClick={() => setCount(h.id, 'men', -1)}><Minus size={13} /></button>
                              <span className="sb-stepper-value">{s.men}</span>
                              <button type="button" className="sb-stepper-btn" onClick={() => setCount(h.id, 'men', 1)}><Plus size={13} /></button>
                            </div>
                          </div>
                          <div>
                            <span className="sb-stepper-label">Women's Seats</span>
                            <div className="sb-stepper-row">
                              <button type="button" className="sb-stepper-btn" onClick={() => setCount(h.id, 'women', -1)}><Minus size={13} /></button>
                              <span className="sb-stepper-value">{s.women}</span>
                              <button type="button" className="sb-stepper-btn" onClick={() => setCount(h.id, 'women', 1)}><Plus size={13} /></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {items.length > 0 && (
                <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="sb-form-section-heading">Your Details</div>
                  <div className="sb-form-grid-2">
                    <input className="sb-input" placeholder="Full name *" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                    <input className="sb-input" type="tel" placeholder="Phone *" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                  </div>
                  <input className="sb-input" type="email" placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <textarea className="sb-textarea" rows={2} placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

                  <TurnstileWidget onToken={setCaptchaToken} />
                  {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13, margin: 0 }}>{error}</p>}

                  <div className="sb-form-footer">
                    <div className="sb-form-footer-total">
                      <p className="sb-form-total-label">Total Due</p>
                      <p className="sb-form-total-value">{formatCents(totalCents)}</p>
                    </div>
                    <button type="submit" className="sb-button" disabled={busy || captchaToken === undefined}>
                      {busy ? 'Redirecting to payment…' : 'Continue to Payment'}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
      <SiteFooter subdomain={subdomain} />
    </div>
  );
}
