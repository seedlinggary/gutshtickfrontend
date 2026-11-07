import React, { useEffect, useMemo, useState } from 'react';
import { HandCoins, Repeat, CalendarDays, Minus, Plus, Check, Users } from 'lucide-react';
import apiRequest from '../../../ApiRequest';
import TurnstileWidget from '../../site-builder/TurnstileWidget';
import { fieldIsVisible, fieldLabel, FieldInput } from '../dynamicFormFields';
import { DEFAULT_THEME } from '../../site-builder/theme';

/** Embeddable versions of the nonprofit module's public flows (donate/
 * membership/holiday-seats/dynamic-form) -- the SAME backend endpoints
 * NonprofitDonatePage.js etc. use, just rendered inline inside a block's
 * own box instead of as a standalone page with its own header/footer.
 * Letting an owner drop these directly into a page they're building is
 * the whole point: without this, a donate/membership/signup flow only
 * ever existed at a fixed route the owner had no way to surface except
 * linking out to it.
 *
 * `editable` makes every control inert (disabled inputs, no submit) --
 * same convention ContactFormBlock.js already uses -- so clicking one of
 * these in the canvas selects the block instead of accidentally creating
 * a real donation/membership/bill while the owner is just building the
 * page.
 */

function formatCents(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ILS' }).format((cents || 0) / 100);
}

const SUGGESTED_AMOUNTS = [50, 100, 250, 500];

export function DonationFormBlock({ content, editable, subdomain }) {
  const [amount, setAmount] = useState(100);
  const [customAmount, setCustomAmount] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(undefined);

  const finalAmount = customAmount ? Number(customAmount) : amount;

  const submit = (e) => {
    e.preventDefault();
    if (editable) return;
    setBusy(true);
    setError('');
    apiRequest('POST', { full_name: fullName, email, amount: finalAmount, captcha_token: captchaToken || undefined },
      `/nonprofit/public/${subdomain}/donate`)
      .then((data) => { window.location.href = data.payment_url; })
      .catch((err) => { setError(typeof err === 'string' ? err : 'Could not start your donation -- try again.'); setBusy(false); });
  };

  return (
    <form onSubmit={submit} className="sb-theme" style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%', overflow: 'auto', padding: 4 }}>
      {content.heading && <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><HandCoins size={18} /> {content.heading}</h3>}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {SUGGESTED_AMOUNTS.map((a) => (
          <button key={a} type="button" disabled={editable} className={`gs-btn gs-btn-sm${amount === a && !customAmount ? '' : ' gs-btn-outline'}`}
            onClick={() => { setAmount(a); setCustomAmount(''); }}>
            ₪{a}
          </button>
        ))}
      </div>
      <input className="sb-input" type="number" min="1" placeholder="Custom amount (₪)" value={customAmount} disabled={editable}
        onChange={(e) => setCustomAmount(e.target.value)} />
      <input className="sb-input" placeholder="Full name" value={fullName} disabled={editable} required onChange={(e) => setFullName(e.target.value)} />
      <input className="sb-input" type="email" placeholder="Email" value={email} disabled={editable} required onChange={(e) => setEmail(e.target.value)} />
      {!editable && <TurnstileWidget onToken={setCaptchaToken} />}
      {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 12, margin: 0 }}>{error}</p>}
      <button type="submit" className="sb-button" disabled={editable || busy || !finalAmount || captchaToken === undefined} style={{ alignSelf: 'flex-start' }}>
        {busy ? 'Redirecting…' : `Donate ₪${finalAmount || 0}`}
      </button>
    </form>
  );
}

export function MembershipFormBlock({ content, editable, subdomain }) {
  const [tier, setTier] = useState('associate');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(undefined);

  const submit = (e) => {
    e.preventDefault();
    if (editable) return;
    setBusy(true);
    setError('');
    apiRequest('POST', { full_name: fullName, email, tier, captcha_token: captchaToken || undefined },
      `/nonprofit/public/${subdomain}/membership`)
      .then((data) => { window.location.href = data.payment_url; })
      .catch((err) => { setError(typeof err === 'string' ? err : 'Could not start -- try again.'); setBusy(false); });
  };

  return (
    <form onSubmit={submit} className="sb-theme" style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%', overflow: 'auto', padding: 4 }}>
      {content.heading && <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Repeat size={18} /> {content.heading}</h3>}
      <div style={{ display: 'flex', gap: 8 }}>
        {['associate', 'full'].map((t) => (
          <button key={t} type="button" disabled={editable} className={`gs-btn gs-btn-sm${tier === t ? '' : ' gs-btn-outline'}`} style={{ flex: 1 }}
            onClick={() => setTier(t)}>
            {t === 'associate' ? 'Associate' : 'Full'}
          </button>
        ))}
      </div>
      <input className="sb-input" placeholder="Full name" value={fullName} disabled={editable} required onChange={(e) => setFullName(e.target.value)} />
      <input className="sb-input" type="email" placeholder="Email" value={email} disabled={editable} required onChange={(e) => setEmail(e.target.value)} />
      {!editable && <TurnstileWidget onToken={setCaptchaToken} />}
      {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 12, margin: 0 }}>{error}</p>}
      <button type="submit" className="sb-button" disabled={editable || busy || captchaToken === undefined} style={{ alignSelf: 'flex-start' }}>
        {busy ? 'Redirecting…' : 'Set up membership'}
      </button>
    </form>
  );
}

export function HolidaySeatsFormBlock({ content, editable, subdomain }) {
  const [holidays, setHolidays] = useState(editable ? [] : null);
  const [seats, setSeats] = useState({});
  const [isMember, setIsMember] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(undefined);

  useEffect(() => {
    if (editable || !subdomain) return;
    apiRequest('GET', null, `/nonprofit/public/${subdomain}/holidays`).then((d) => setHolidays(d.holidays)).catch(() => setHolidays([]));
  }, [editable, subdomain]);

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
    if (editable) return;
    setBusy(true);
    setError('');
    apiRequest('POST', { full_name: fullName, phone, is_member: isMember, items, captcha_token: captchaToken || undefined },
      `/nonprofit/public/${subdomain}/holiday-seats`)
      .then((data) => { window.location.href = data.payment_url; })
      .catch((err) => { setError(typeof err === 'string' ? err : 'Could not start checkout -- try again.'); setBusy(false); });
  };

  if (editable) {
    return (
      <div className="sb-theme" style={{ height: '100%', overflow: 'auto', padding: 4 }}>
        {content.heading && <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><CalendarDays size={18} /> {content.heading}</h3>}
        <p style={{ fontSize: 12, color: 'var(--sb-muted, #8a7a68)' }}>Visitors will pick open holidays and seat counts here.</p>
      </div>
    );
  }
  if (holidays === null) return <div className="gs-loading" style={{ height: '100%' }}><div className="gs-spinner" /></div>;

  return (
    <div className="sb-theme" style={{ height: '100%', overflow: 'auto', padding: 4 }}>
      {content.heading && <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><CalendarDays size={18} /> {content.heading}</h3>}
      {holidays.length === 0 && <p className="gs-empty">No holidays are open right now.</p>}
      <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0' }}>
        <input type="checkbox" checked={isMember} onChange={(e) => setIsMember(e.target.checked)} /> I am a member
      </label>
      {holidays.map((h) => {
        const s = seats[h.id] || { men: 0, women: 0 };
        const price = isMember ? h.member_price_cents : h.non_member_price_cents;
        return (
          <div key={h.id} style={{ borderBottom: '1px solid var(--sb-border, #e5e1d6)', padding: '8px 0' }}>
            <strong style={{ fontSize: 14 }}>{h.name_en}</strong>
            <div style={{ fontSize: 12, color: 'var(--sb-muted, #8a7a68)' }}>{formatCents(price)} per seat</div>
            <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12 }}>Men</span>
                <button type="button" className="sb-icon-btn" onClick={() => setCount(h.id, 'men', -1)}><Minus size={11} /></button>
                <span>{s.men}</span>
                <button type="button" className="sb-icon-btn" onClick={() => setCount(h.id, 'men', 1)}><Plus size={11} /></button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12 }}>Women</span>
                <button type="button" className="sb-icon-btn" onClick={() => setCount(h.id, 'women', -1)}><Minus size={11} /></button>
                <span>{s.women}</span>
                <button type="button" className="sb-icon-btn" onClick={() => setCount(h.id, 'women', 1)}><Plus size={11} /></button>
              </div>
            </div>
          </div>
        );
      })}
      {items.length > 0 && (
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 13 }}>
            <span>Total</span><span>{formatCents(totalCents)}</span>
          </div>
          <input className="sb-input" placeholder="Full name" value={fullName} required onChange={(e) => setFullName(e.target.value)} />
          <input className="sb-input" placeholder="Phone" value={phone} required onChange={(e) => setPhone(e.target.value)} />
          <TurnstileWidget onToken={setCaptchaToken} />
          {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 12, margin: 0 }}>{error}</p>}
          <button type="submit" className="sb-button" disabled={busy || captchaToken === undefined} style={{ alignSelf: 'flex-start' }}>
            {busy ? 'Redirecting…' : `Pay ${formatCents(totalCents)}`}
          </button>
        </form>
      )}
    </div>
  );
}

// A plain link styled as a site-wide button, pointing at the one fixed
// /family-portal route every nonprofit-module site already has (see
// siteMode.js) -- lets an owner surface it from their own built pages
// (homepage, a "members" page, wherever) without needing to build the
// portal itself, which already exists and needs no page builder at all.
export function FamilyLoginButtonBlock({ content, editable }) {
  const style = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', textDecoration: 'none' };
  const btn = (
    <span className="sb-button" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
      <Users size={14} /> {content.text || 'Family login'}
    </span>
  );
  if (editable) return <div style={style}>{btn}</div>;
  return <a href="/family-portal" style={style}>{btn}</a>;
}

export function DynamicFormBlock({ content, editable, subdomain, theme }) {
  const [form, setForm] = useState(editable ? null : undefined);
  const [answers, setAnswers] = useState({});
  const [sent, setSent] = useState(false);
  const [thankYou, setThankYou] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (editable || !subdomain || !content.formSlug) return;
    apiRequest('GET', null, `/nonprofit/public/${subdomain}/forms/${content.formSlug}`).then(setForm).catch(() => setForm(null));
  }, [editable, subdomain, content.formSlug]);

  if (editable) {
    return (
      <div className="sb-theme" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sb-muted, #8a7a68)', fontSize: 13, textAlign: 'center', padding: 8 }}>
        {content.formSlug ? `Embeds "${content.formSlug}" -- select this block to change it` : 'Pick a form in the panel on the right'}
      </div>
    );
  }
  if (!content.formSlug) return null;
  if (form === undefined) return <div className="gs-loading" style={{ height: '100%' }}><div className="gs-spinner" /></div>;
  if (form === null) return <div className="sb-theme" style={{ padding: 8, color: 'var(--sb-muted, #8a7a68)', fontSize: 13 }}>Form not found.</div>;

  const visibleFields = form.fields.filter((f) => fieldIsVisible(f, answers));

  const submit = (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const visibleIds = new Set(visibleFields.map((f) => String(f.id)));
    const cleaned = Object.fromEntries(Object.entries(answers).filter(([id]) => visibleIds.has(id)));
    apiRequest('POST', { answers: cleaned }, `/nonprofit/public/${subdomain}/forms/${form.slug}/responses`)
      .then((data) => { setThankYou(data.message); setSent(true); })
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not submit -- try again.'))
      .finally(() => setBusy(false));
  };

  if (sent) {
    return (
      <div className="sb-theme" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, textAlign: 'center', padding: 8 }}>
        <Check size={24} /><p style={{ margin: 0 }}>{thankYou}</p>
      </div>
    );
  }

  // Same "formStyle override, else the site-wide Forms picker" convention
  // as ContactFormBlock -- this used to render with none of that (no
  // `theme` prop at all), so a dynamic form embedded in a page silently
  // ignored both the owner's chosen form look AND always used the
  // plain .gs-label app-chrome class for its labels/heading instead of a
  // theme-font-aware one, the one visible place a built page's font
  // picker didn't actually apply.
  const effectiveStyle = content.formStyle || (theme || DEFAULT_THEME).formStyle || 'boxed';
  const formClass = effectiveStyle !== 'boxed' ? `sb-form-${effectiveStyle}` : '';

  const fieldsMarkup = (
    <>
      {visibleFields.map((field) => (
        <div key={field.id} className="gs-field" style={{ marginBottom: 0 }}>
          <div className="gs-label" style={{ fontFamily: 'var(--sb-font-body)' }}>{fieldLabel(field, answers)}{field.required && ' *'}</div>
          {field.help_text && <p style={{ fontSize: 11, color: 'var(--sb-muted, #8a7a68)', margin: '0 0 4px' }}>{field.help_text}</p>}
          <FieldInput field={field} value={answers[String(field.id)]} onChange={(v) => setAnswers((a) => ({ ...a, [String(field.id)]: v }))} />
        </div>
      ))}
      {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 12, margin: 0 }}>{error}</p>}
      <button type="submit" className="sb-button" disabled={busy} style={{ alignSelf: content.fullWidthButton ? 'stretch' : 'flex-start' }}>
        {busy ? 'Submitting…' : (content.submitText || 'Submit')}
      </button>
      {content.helperText && <p className="sb-form-helper">{content.helperText}</p>}
    </>
  );

  // "Card header" -- a colored header strip (eyebrow + the form's own
  // title + a subtitle) above the fields, inside a bordered/shadowed
  // card -- the real business this was modeled on embeds its proposal
  // form exactly this way (ProposalBox.jsx: a dark header strip with
  // "Free, No-Obligation" / "Request a Proposal" / a one-line subtitle,
  // THEN the white field area), which a plain `<h3>{title}</h3>` had no
  // way to reproduce. Opt-in (content.cardHeader) so every other embedded
  // form keeps its plain look unless the owner asks for this one.
  if (content.cardHeader) {
    return (
      <div className="sb-theme sb-form-card" style={{ height: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div className="sb-form-card-header">
          {content.headerEyebrow && <p className="sb-form-card-eyebrow">{content.headerEyebrow}</p>}
          <h3>{form.title}</h3>
          {content.headerSubtitle && <p className="sb-form-card-subtitle">{content.headerSubtitle}</p>}
        </div>
        <form onSubmit={submit} className={`sb-form-card-body ${formClass}`} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {fieldsMarkup}
        </form>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={`sb-theme ${formClass}`} style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%', overflow: 'auto', padding: 4 }}>
      <h3 style={{ margin: 0, fontFamily: 'var(--sb-font-heading)' }}>{form.title}</h3>
      {fieldsMarkup}
    </form>
  );
}
