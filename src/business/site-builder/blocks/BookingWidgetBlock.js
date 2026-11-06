import React, { useEffect, useState } from 'react';
import { Calendar, Check } from 'lucide-react';
import apiRequest from '../../../ApiRequest';
import { isLoggedIn } from '../../../auth';
import TurnstileWidget from '../TurnstileWidget';

function formatCents(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'usd' }).format((cents || 0) / 100);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function BookingWidgetBlock({ content, subdomain, editable }) {
  const serviceTypeId = content?.serviceTypeId;
  const [date, setDate] = useState(todayStr());
  const [slots, setSlots] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [repeatWeeks, setRepeatWeeks] = useState(1);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  // undefined = not resolved yet; null = "no CAPTCHA configured, proceed
  // freely" -- see TurnstileWidget.js and CartPage.js's identical pattern.
  const [captchaToken, setCaptchaToken] = useState(undefined);
  const loggedIn = isLoggedIn();

  useEffect(() => {
    if (!serviceTypeId || !subdomain || editable) return;
    setSlots(null);
    setSelectedSlot(null);
    apiRequest('GET', null, `/business-site/public/${encodeURIComponent(subdomain)}/booking/${serviceTypeId}/slots?date=${date}`)
      .then(setSlots)
      .catch(() => setSlots({ slots: [] }));
  }, [subdomain, serviceTypeId, date, editable]);

  if (!serviceTypeId) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>
        Pick a service in the panel on the right
      </div>
    );
  }
  if (editable) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6, color: 'var(--muted)' }}>
        <Calendar size={22} style={{ opacity: 0.5 }} />
        <span style={{ fontSize: 13 }}>Booking: {content.serviceName || 'selected service'}</span>
      </div>
    );
  }

  const book = () => {
    setError('');
    if (!loggedIn && !guestEmail.trim()) {
      setError('An email is required to book.');
      return;
    }
    setBooking(true);
    apiRequest('POST', {
      service_type_id: serviceTypeId,
      start_at: `${date}T${selectedSlot}`,
      guest_email: guestEmail.trim() || undefined,
      guest_phone: guestPhone.trim() || undefined,
      repeat_weeks: repeatWeeks > 1 ? repeatWeeks : undefined,
      captcha_token: captchaToken || undefined,
    }, `/business-site/public/${encodeURIComponent(subdomain)}/booking/checkout`)
      .then((data) => {
        if (data.requires_payment) {
          window.location.href = data.checkout_url;
        } else {
          setDone(true);
        }
      })
      .catch((err) => { setError(typeof err === 'string' ? err : 'Could not book that slot.'); setBooking(false); });
  };

  if (done) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
        <Check size={26} />
        <p>You're booked for {date} at {selectedSlot}.</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {content.serviceName && <h3 style={{ margin: 0 }}>{content.serviceName}</h3>}
      <input className="sb-input" type="date" min={todayStr()} value={date} onChange={(e) => { setDate(e.target.value); setSelectedSlot(null); }} style={{ maxWidth: 200 }} />

      {!slots ? (
        <div className="gs-loading"><div className="gs-spinner" /></div>
      ) : slots.slots.length === 0 ? (
        <p className="gs-empty">No open times that day.</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {slots.slots.map((s) => (
            <button key={s} type="button" className={`sb-button sb-button-sm ${selectedSlot === s ? '' : 'sb-button-outline'}`} onClick={() => setSelectedSlot(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      {selectedSlot && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--sb-border, #e5e1d6)', paddingTop: 12 }}>
          {slots?.price_cents != null && <span style={{ fontSize: 14 }}>{formatCents(slots.price_cents)}</span>}
          {!loggedIn && (
            <>
              <input className="sb-input" type="email" placeholder="Your email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} required />
              <input className="sb-input" placeholder="Phone (optional)" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} />
            </>
          )}
          <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            Repeat weekly for
            <input className="sb-input" type="number" min={1} max={52} value={repeatWeeks} onChange={(e) => setRepeatWeeks(Number(e.target.value) || 1)} style={{ width: 70 }} />
            week(s)
          </label>
          <TurnstileWidget onToken={setCaptchaToken} />
          {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13 }}>{error}</p>}
          <button type="button" className="sb-button" disabled={booking || captchaToken === undefined} onClick={book}>{booking ? 'Booking…' : 'Book'}</button>
        </div>
      )}
    </div>
  );
}
