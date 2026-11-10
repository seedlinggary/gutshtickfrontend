import React, { useEffect, useState } from 'react';
import { Users, Mail, KeyRound, LogOut, HandCoins, Repeat, CalendarDays, Link2, Receipt, FileText, ArrowLeft } from 'lucide-react';
import apiRequest from '../../../ApiRequest';
import { familyApiRequest, getFamilyToken, setFamilyToken, clearFamilyToken } from '../familyPortalApi';
import TurnstileWidget from '../../site-builder/TurnstileWidget';
import SiteFooter from '../../site-builder/SiteFooter';
import '../../site-builder/theme.css';

function formatCents(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ILS' }).format((cents || 0) / 100);
}

const STATUS_LABEL = { pending: 'Pending', paid: 'Paid', active: 'Active', past_due: 'Past due', cancelled: 'Cancelled' };
const PAYABLE_STATUSES = ['pending', 'past_due'];

const RECORD_META = {
  holiday_seats: { icon: CalendarDays, label: 'Holiday seats' },
  donation: { icon: HandCoins, label: 'Donation' },
  membership: { icon: Repeat, label: 'Membership' },
  payment_link: { icon: Link2, label: 'Payment' },
  external_transaction: { icon: Receipt, label: 'Payment received' },
};

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

/** The family-portal counterpart to NonprofitStaffLogin.js -- but for a
 * family, not staff, and "prove you own this email right now" (a mailed
 * 6-digit code) instead of a password (see nonprofit_family_auth.py's
 * docstring for why). Three states: request a code by email, enter the
 * code, view the data once verified -- plus a 4th implicit state (data
 * loads straight away) when a still-valid token is already in
 * localStorage from a previous visit. */
export default function NonprofitFamilyPortalPage({ subdomain }) {
  const [step, setStep] = useState('checking'); // checking | email | code | data
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(undefined);
  const [data, setData] = useState(null);

  const loadMe = () => familyApiRequest(subdomain, 'GET', null, `/nonprofit/family-portal/${subdomain}/me`)
    .then((d) => { setData(d); setStep('data'); })
    .catch(() => { clearFamilyToken(subdomain); setStep('email'); });

  useEffect(() => {
    if (getFamilyToken(subdomain)) loadMe();
    else setStep('email');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subdomain]);

  const requestCode = (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    apiRequest('POST', { email, captcha_token: captchaToken || undefined }, `/nonprofit/family-portal/${subdomain}/request-code`)
      .then((d) => { setInfo(d.message); setStep('code'); })
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not send a code -- try again.'))
      .finally(() => setBusy(false));
  };

  const verifyCode = (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    apiRequest('POST', { email, code: code.trim() }, `/nonprofit/family-portal/${subdomain}/verify-code`)
      .then((d) => { setFamilyToken(subdomain, d.token); loadMe(); })
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not verify that code.'))
      .finally(() => setBusy(false));
  };

  const logOut = () => { clearFamilyToken(subdomain); setData(null); setEmail(''); setCode(''); setInfo(''); setStep('email'); };

  if (step === 'checking') {
    return <div className="gs-loading" style={{ minHeight: '60vh' }}><div className="gs-spinner" /></div>;
  }

  return (
    <div className="sb-theme">
      <div style={{ maxWidth: step === 'data' ? 720 : 440, margin: '0 auto', padding: 24 }}>
        {step === 'email' && (
          <>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Users size={24} /> Family portal</h1>
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>
              Enter the email address on file with us and we'll send you a one-time code to view your family's donations, membership, and more.
            </p>
            <form onSubmit={requestCode} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input className="sb-input" type="email" required placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <TurnstileWidget onToken={setCaptchaToken} />
              {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13 }}>{error}</p>}
              <button type="submit" className="sb-button" disabled={busy || !email || captchaToken === undefined}>
                <Mail size={15} /> {busy ? 'Sending…' : 'Send me a code'}
              </button>
            </form>
          </>
        )}

        {step === 'code' && (
          <>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><KeyRound size={24} /> Enter your code</h1>
            {info && <p style={{ color: 'var(--muted)', fontSize: 14 }}>{info}</p>}
            <form onSubmit={verifyCode} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                className="sb-input" inputMode="numeric" autoFocus maxLength={6} placeholder="6-digit code"
                value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                style={{ fontSize: 24, letterSpacing: 6, textAlign: 'center' }}
              />
              {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13 }}>{error}</p>}
              <button type="submit" className="sb-button" disabled={busy || code.length !== 6}>
                {busy ? 'Checking…' : 'View my family'}
              </button>
              <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => { setStep('email'); setCode(''); setError(''); }}>
                <ArrowLeft size={14} /> Use a different email
              </button>
            </form>
          </>
        )}

        {step === 'data' && data && (
          <FamilyData data={data} subdomain={subdomain} onLogOut={logOut} />
        )}
      </div>
      <SiteFooter subdomain={subdomain} />
    </div>
  );
}

function FamilyData({ data, subdomain, onLogOut }) {
  const { family, records, form_responses: formResponses, organization_name: orgName } = data;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 10 }}><Users size={24} /> {family.full_name}</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>{orgName}</p>
        </div>
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={onLogOut}><LogOut size={14} /> Log out</button>
      </div>

      <div className="gs-card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0, fontSize: 14 }}>Your info on file</h3>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
          {family.email}{family.phone ? ` · ${family.phone}` : ''}{family.address ? ` · ${family.address}` : ''}{family.city ? `, ${family.city}` : ''}
        </p>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, marginBottom: 0 }}>
          Something here out of date? Contact {orgName} directly to have it corrected.
        </p>
      </div>

      <h3 style={{ marginTop: 24 }}>Giving &amp; payment history</h3>
      {records.length === 0 ? (
        <p className="gs-empty">Nothing on file yet.</p>
      ) : (
        <div className="admin-list">
          {records.map((r) => <RecordCard key={`${r.type}-${r.id}`} record={r} subdomain={subdomain} />)}
        </div>
      )}

      {formResponses.length > 0 && (
        <>
          <h3 style={{ marginTop: 24 }}>Forms you've submitted</h3>
          <div className="admin-list">
            {formResponses.map((r) => (
              <div key={r.id} className="admin-card">
                <div className="admin-card-top">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}><FileText size={14} /> {r.form_title}</span>
                  <span className="admin-date">{r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</span>
                </div>
                {r.answers.map((a, i) => (
                  <div key={i} style={{ fontSize: 13, display: 'flex', gap: 6 }}>
                    <span style={{ color: 'var(--muted)' }}>{a.label}:</span>
                    <span>{Array.isArray(a.value) ? a.value.map((v) => (typeof v === 'object' ? `${v.name} (${v.date})` : v)).join(', ') : String(a.value)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function RecordCard({ record, subdomain }) {
  const meta = RECORD_META[record.type] || { icon: Receipt, label: record.type };
  const Icon = meta.icon;
  const canPay = record.reference_code && PAYABLE_STATUSES.includes(record.status);
  return (
    <div className="admin-card">
      <div className="admin-card-top">
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
          <Icon size={14} /> {meta.label}{record.label ? ` -- ${record.label}` : ''}{record.purpose ? ` -- ${record.purpose}` : ''}
        </span>
        {record.status && <span className={`admin-badge ${record.status === 'paid' || record.status === 'active' ? 'approved' : record.status === 'cancelled' ? 'rejected' : 'pending'}`}>{STATUS_LABEL[record.status] || record.status}</span>}
      </div>
      <div style={{ fontSize: 13, color: 'var(--muted)' }}>
        {record.amount_cents != null && formatCents(record.amount_cents)}
        {record.type === 'membership' && record.tier ? ` / month -- ${record.tier}` : ''}
        {record.created_at ? ` · ${new Date(record.created_at).toLocaleDateString()}` : ''}
        {record.description ? ` · ${record.description}` : ''}
      </div>
      {record.holidays && record.holidays.length > 0 && (
        <ul style={{ fontSize: 12, color: 'var(--muted)', margin: '6px 0 0', paddingLeft: 18 }}>
          {record.holidays.map((h, i) => (
            <li key={i}>{h.name_en} -- {Object.values(h.seats || {}).reduce((a, b) => a + b, 0)} seat(s) ({formatCents(h.total_cents)})</li>
          ))}
        </ul>
      )}
      {canPay && (
        <a className="gs-btn gs-btn-sm" style={{ marginTop: 8, display: 'inline-flex' }} href={`${API}/nonprofit/public/${subdomain}/pay-link/${record.reference_code}`}>
          Complete payment
        </a>
      )}
    </div>
  );
}
