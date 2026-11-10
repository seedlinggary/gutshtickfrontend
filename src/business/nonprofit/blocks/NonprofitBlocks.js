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
  const [isOpen, setIsOpen] = useState(true);
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

  useEffect(() => {
    if (editable || !subdomain) return;
    apiRequest('GET', null, `/nonprofit/public/${subdomain}/donate-status`).then((d) => setIsOpen(d.is_open)).catch(() => {});
  }, [editable, subdomain]);

  const finalAmount = customAmount ? Number(customAmount) : amount;

  const submit = (e) => {
    e.preventDefault();
    if (editable) return;
    setBusy(true);
    setError('');
    apiRequest('POST', { full_name: fullName, email, phone, address, city, purpose, amount: finalAmount, captcha_token: captchaToken || undefined },
      `/nonprofit/public/${subdomain}/donate`)
      .then((data) => { window.location.href = data.payment_url; })
      .catch((err) => { setError(typeof err === 'string' ? err : 'Could not start your donation -- try again.'); setBusy(false); });
  };

  // Rebuilt against a real business's actual donation form -- a bare
  // flex column of inputs (the only look this ever had) is a real
  // regression from a real site's own version of this exact form: a
  // bordered card, an intro line, amount picked via selectable chips
  // (not the admin dashboard's own gs-btn styling -- those were never
  // theme-aware, so they looked disconnected from the rest of the site
  // regardless of which palette/fonts the owner picked), and the
  // phone/address/city/purpose fields the backend already accepts and
  // stores (NonprofitDonation has all four columns) but this block never
  // actually collected.
  if (!editable && !isOpen) {
    return (
      <div className="sb-theme sb-form-plain-card" style={{ height: '100%', boxSizing: 'border-box' }}>
        {content.heading && <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--sb-font-heading)' }}><HandCoins size={18} /> {content.heading}</h3>}
        <p className="gs-empty">Online donations are not open right now.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="sb-theme sb-form-plain-card" style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%', overflow: 'auto', boxSizing: 'border-box' }}>
      {content.heading && <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--sb-font-heading)' }}><HandCoins size={18} /> {content.heading}</h3>}
      {content.intro && <p className="sb-form-intro">{content.intro}</p>}
      <div>
        <div className="sb-form-section-heading">Amount</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          {SUGGESTED_AMOUNTS.map((a) => (
            <button key={a} type="button" disabled={editable} className={`sb-choice-chip${amount === a && !customAmount ? ' sb-choice-chip-active' : ''}`}
              onClick={() => { setAmount(a); setCustomAmount(''); }}>
              ₪{a}
            </button>
          ))}
        </div>
        <input className="sb-input" type="number" min="1" placeholder="Custom amount (₪)" value={customAmount} disabled={editable}
          onChange={(e) => setCustomAmount(e.target.value)} />
      </div>
      <input className="sb-input" placeholder="In honor/memory of (optional)" value={purpose} disabled={editable} onChange={(e) => setPurpose(e.target.value)} />
      <div className="sb-form-grid-2">
        <input className="sb-input" placeholder="Full name *" value={fullName} disabled={editable} required onChange={(e) => setFullName(e.target.value)} />
        <input className="sb-input" type="email" placeholder="Email *" value={email} disabled={editable} required onChange={(e) => setEmail(e.target.value)} />
        <input className="sb-input" type="tel" placeholder="Phone" value={phone} disabled={editable} onChange={(e) => setPhone(e.target.value)} />
        <input className="sb-input" placeholder="Address" value={address} disabled={editable} onChange={(e) => setAddress(e.target.value)} />
        <input className="sb-input" placeholder="City" value={city} disabled={editable} onChange={(e) => setCity(e.target.value)} />
      </div>
      {!editable && <TurnstileWidget onToken={setCaptchaToken} />}
      {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 12, margin: 0 }}>{error}</p>}
      <div className="sb-form-footer">
        <button type="submit" className="sb-button" disabled={editable || busy || !finalAmount || captchaToken === undefined}>
          {busy ? 'Redirecting…' : `Donate ₪${finalAmount || 0}`}
        </button>
      </div>
    </form>
  );
}

export function MembershipFormBlock({ content, editable, subdomain }) {
  const [tiers, setTiers] = useState(editable ? [] : null);
  const [isOpen, setIsOpen] = useState(true);
  const [tier, setTier] = useState(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(undefined);

  useEffect(() => {
    if (editable || !subdomain) return;
    apiRequest('GET', null, `/nonprofit/public/${subdomain}/membership-tiers`).then((d) => {
      setTiers(d.tiers);
      setIsOpen(d.is_open);
      if (d.tiers.length) setTier(d.tiers[0].id);
    }).catch(() => setTiers([]));
  }, [editable, subdomain]);

  const submit = (e) => {
    e.preventDefault();
    if (editable) return;
    setBusy(true);
    setError('');
    apiRequest('POST', { full_name: fullName, email, phone, address, city, tier, captcha_token: captchaToken || undefined },
      `/nonprofit/public/${subdomain}/membership`)
      .then((data) => { window.location.href = data.payment_url; })
      .catch((err) => { setError(typeof err === 'string' ? err : 'Could not start -- try again.'); setBusy(false); });
  };

  if (editable) {
    return (
      <div className="sb-theme sb-form-plain-card" style={{ height: '100%', overflow: 'auto', boxSizing: 'border-box' }}>
        {content.heading && <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--sb-font-heading)' }}><Repeat size={18} /> {content.heading}</h3>}
        <p style={{ fontSize: 12, color: 'var(--sb-muted, #8a7a68)' }}>Visitors will pick a membership tier (set in Settings → Membership tiers) here.</p>
      </div>
    );
  }
  if (tiers === null) return <div className="gs-loading" style={{ height: '100%' }}><div className="gs-spinner" /></div>;
  if (!isOpen || tiers.length === 0) {
    return (
      <div className="sb-theme sb-form-plain-card" style={{ height: '100%', boxSizing: 'border-box' }}>
        {content.heading && <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--sb-font-heading)' }}><Repeat size={18} /> {content.heading}</h3>}
        <p className="gs-empty">Online membership signup is not open right now.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="sb-theme sb-form-plain-card" style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%', overflow: 'auto', boxSizing: 'border-box' }}>
      {content.heading && <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--sb-font-heading)' }}><Repeat size={18} /> {content.heading}</h3>}
      {content.intro && <p className="sb-form-intro">{content.intro}</p>}
      <div>
        <div className="sb-form-section-heading">Choose Your Membership</div>
        <div className="sb-form-grid-2">
          {tiers.map((t) => (
            <button key={t.id} type="button" disabled={editable} className={`sb-choice-card${tier === t.id ? ' sb-choice-card-active' : ''}`}
              onClick={() => setTier(t.id)}>
              <p className="sb-choice-card-title">{t.label}</p>
              <p className="sb-choice-card-sub">{formatCents(t.monthly_cents)} / month</p>
            </button>
          ))}
        </div>
      </div>
      <div className="sb-form-grid-2">
        <input className="sb-input" placeholder="Full name *" value={fullName} disabled={editable} required onChange={(e) => setFullName(e.target.value)} />
        <input className="sb-input" type="email" placeholder="Email *" value={email} disabled={editable} required onChange={(e) => setEmail(e.target.value)} />
        <input className="sb-input" type="tel" placeholder="Phone" value={phone} disabled={editable} onChange={(e) => setPhone(e.target.value)} />
        <input className="sb-input" placeholder="Address" value={address} disabled={editable} onChange={(e) => setAddress(e.target.value)} />
        <input className="sb-input" placeholder="City" value={city} disabled={editable} onChange={(e) => setCity(e.target.value)} />
      </div>
      {!editable && <TurnstileWidget onToken={setCaptchaToken} />}
      {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 12, margin: 0 }}>{error}</p>}
      <div className="sb-form-footer">
        <button type="submit" className="sb-button" disabled={editable || busy || !tier || captchaToken === undefined}>
          {busy ? 'Redirecting…' : 'Continue to Payment'}
        </button>
      </div>
    </form>
  );
}

export function HolidaySeatsFormBlock({ content, editable, subdomain }) {
  const [holidays, setHolidays] = useState(editable ? [] : null);
  const [seats, setSeats] = useState({}); // holidayId -> {tierId: count}
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(undefined);

  useEffect(() => {
    if (editable || !subdomain) return;
    apiRequest('GET', null, `/nonprofit/public/${subdomain}/holidays`).then((d) => setHolidays(d.holidays)).catch(() => setHolidays([]));
  }, [editable, subdomain]);

  const setCount = (holidayId, tierId, delta) => {
    setSeats((cur) => {
      const current = cur[holidayId] || {};
      const next = Math.max(0, (current[tierId] || 0) + delta);
      return { ...cur, [holidayId]: { ...current, [tierId]: next } };
    });
  };

  const { items, totalCents } = useMemo(() => {
    if (!holidays) return { items: [], totalCents: 0 };
    let total = 0;
    const list = [];
    for (const h of holidays) {
      const s = seats[h.id] || {};
      const tiersById = {};
      h.tiers.forEach((t) => { tiersById[t.id] = t; });
      const activeSeats = Object.fromEntries(Object.entries(s).filter(([, count]) => count > 0));
      if (Object.keys(activeSeats).length === 0) continue;
      for (const [tierId, count] of Object.entries(activeSeats)) {
        total += (tiersById[tierId]?.price_cents || 0) * count;
      }
      list.push({ holiday_id: h.id, seats: activeSeats });
    }
    return { items: list, totalCents: total };
  }, [holidays, seats]);

  const submit = (e) => {
    e.preventDefault();
    if (editable) return;
    setBusy(true);
    setError('');
    apiRequest('POST', { full_name: fullName, phone, email, notes, items, captcha_token: captchaToken || undefined },
      `/nonprofit/public/${subdomain}/holiday-seats`)
      .then((data) => { window.location.href = data.payment_url; })
      .catch((err) => { setError(typeof err === 'string' ? err : 'Could not start checkout -- try again.'); setBusy(false); });
  };

  if (editable) {
    return (
      <div className="sb-theme sb-form-plain-card" style={{ height: '100%', overflow: 'auto', boxSizing: 'border-box' }}>
        {content.heading && <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--sb-font-heading)' }}><CalendarDays size={18} /> {content.heading}</h3>}
        <p style={{ fontSize: 12, color: 'var(--sb-muted, #8a7a68)' }}>Visitors will pick open holidays and seat counts here.</p>
      </div>
    );
  }
  if (holidays === null) return <div className="gs-loading" style={{ height: '100%' }}><div className="gs-spinner" /></div>;

  // Each holiday gets its own card (title, description, every active
  // tier's price shown together, and a labeled stepper per tier) --
  // plus the email/notes fields the backend (NonprofitBill) already
  // stores but this block never collected.
  return (
    <div className="sb-theme sb-form-plain-card" style={{ height: '100%', overflow: 'auto', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {content.heading && <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--sb-font-heading)' }}><CalendarDays size={18} /> {content.heading}</h3>}
      {content.intro && <p className="sb-form-intro">{content.intro}</p>}
      {holidays.length === 0 ? (
        <p className="gs-empty">No holidays are open right now.</p>
      ) : (
        <>
          <div>
            <div className="sb-form-section-heading">Choose Your Seats</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {holidays.map((h) => {
                const s = seats[h.id] || {};
                const hasSeats = Object.values(s).some((c) => c > 0);
                return (
                  <div key={h.id} className={`sb-seat-card${hasSeats ? ' sb-seat-card-active' : ''}`}>
                    <h4>{h.name_en}</h4>
                    {h.description_en && <p className="sb-seat-card-desc">{h.description_en}</p>}
                    <div className="sb-seat-card-prices">
                      {h.tiers.map((t) => <span key={t.id}>{formatCents(t.price_cents)} / seat ({t.label})</span>)}
                    </div>
                    <div className="sb-seat-steppers">
                      {h.tiers.map((t) => (
                        <div key={t.id}>
                          <span className="sb-stepper-label">{t.label}</span>
                          <div className="sb-stepper-row">
                            <button type="button" className="sb-stepper-btn" onClick={() => setCount(h.id, t.id, -1)}><Minus size={13} /></button>
                            <span className="sb-stepper-value">{s[t.id] || 0}</span>
                            <button type="button" className="sb-stepper-btn" onClick={() => setCount(h.id, t.id, 1)}><Plus size={13} /></button>
                          </div>
                        </div>
                      ))}
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
                <input className="sb-input" placeholder="Full name *" value={fullName} required onChange={(e) => setFullName(e.target.value)} />
                <input className="sb-input" type="tel" placeholder="Phone *" value={phone} required onChange={(e) => setPhone(e.target.value)} />
              </div>
              <input className="sb-input" type="email" placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
              <textarea className="sb-textarea" rows={2} placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
              {!editable && <TurnstileWidget onToken={setCaptchaToken} />}
              {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 12, margin: 0 }}>{error}</p>}
              <div className="sb-form-footer">
                <div className="sb-form-footer-total">
                  <p className="sb-form-total-label">Total Due</p>
                  <p className="sb-form-total-value">{formatCents(totalCents)}</p>
                </div>
                <button type="submit" className="sb-button" disabled={busy || captchaToken === undefined}>
                  {busy ? 'Redirecting…' : 'Continue to Payment'}
                </button>
              </div>
            </form>
          )}
        </>
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
      <div className="sb-form-footer" style={{ justifyContent: content.fullWidthButton ? 'stretch' : 'flex-end', borderTop: content.cardHeader ? '1px solid var(--sb-border, #e5e1d6)' : 'none', paddingTop: content.cardHeader ? 16 : 0 }}>
        <button type="submit" className="sb-button" disabled={busy} style={{ width: content.fullWidthButton ? '100%' : undefined }}>
          {busy ? 'Submitting…' : (content.submitText || 'Submit')}
        </button>
      </div>
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
    <form onSubmit={submit} className={`sb-theme ${formClass}${content.noCard ? '' : ' sb-form-plain-card'}`} style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%', overflow: 'auto', boxSizing: 'border-box' }}>
      <h3 style={{ margin: 0, fontFamily: 'var(--sb-font-heading)' }}>{form.title}</h3>
      {fieldsMarkup}
    </form>
  );
}
