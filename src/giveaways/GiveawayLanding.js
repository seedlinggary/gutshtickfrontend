import React, { useEffect, useRef, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  Gift, Check, Clock, Link2, Mail, ChevronDown, ChevronUp,
  Sparkles, Store, Home as HomeIcon, Briefcase, BookOpen, Newspaper, ArrowRight,
} from 'lucide-react';
import apiRequest from '../ApiRequest';
import ShareButton from '../ShareButton';
import { crossSiteNavigate } from '../CrossSiteLink';
import { listAllSites } from '../siteMode';

function tokenKey(slug) {
  return `giveaway_token_${slug}`;
}

// One line of "what's actually there" per property -- shown below so
// someone who came in just for the giveaway sees a reason to look around,
// same spirit as ContributePicker.js's cross-site cards. Icon/description
// keyed by siteMode.js's site `id` (listAllSites() gives id/label/url;
// this just adds the parts that registry doesn't carry).
const EXPLORE_META = {
  main: { Icon: Sparkles, sub: 'Games, deals, community posts, and more -- the main hub.' },
  business: { Icon: Store, sub: 'Find and support local businesses, deals, and community groups.' },
  estates: { Icon: HomeIcon, sub: 'Buy, sell, or rent property -- plus neighborhood group buys.' },
  money: { Icon: Briefcase, sub: 'Job board, budgeting tools, and investing resources.' },
  torah: { Icon: BookOpen, sub: 'Shiurim, sources, zmanim, and daily learning.' },
  news: { Icon: Newspaper, sub: 'Curated news and community-written headlines.' },
};

/** "While you're here" -- every Gut property, each a short pitch + link,
 * shown on the giveaway page so an entrant (who may have landed here from
 * one single shared link and nowhere else) notices there's a whole
 * ecosystem beyond this one page. Uses crossSiteNavigate() (not a plain
 * <a>) so a logged-in entrant's session carries over via SSO handoff
 * instead of landing them there signed out. */
function ExploreMore() {
  const sites = listAllSites();
  return (
    <div style={{ margin: '22px 0' }}>
      <h3 style={{ fontSize: 14, margin: '0 0 10px' }}>While you're here</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sites.map((site) => {
          const meta = EXPLORE_META[site.id] || { Icon: Sparkles, sub: '' };
          const Icon = meta.Icon;
          return (
            <button
              key={site.id} type="button" onClick={() => crossSiteNavigate(site.url)}
              className="gs-card" style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: 14, textAlign: 'left',
                border: 'none', cursor: 'pointer', width: '100%', font: 'inherit', color: 'inherit',
              }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 36, height: 36, borderRadius: 999, background: 'var(--bg)', color: 'var(--accent)', flexShrink: 0,
              }}>
                <Icon size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <strong data-no-translate style={{ display: 'block', fontSize: 14 }}>{site.label}</strong>
                <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{meta.sub}</span>
              </div>
              <ArrowRight size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function useQuery() {
  const { search } = useLocation();
  return new URLSearchParams(search);
}

/** Days/hours/min/sec countdown to `endsAt` -- same visible fill-bar idea
 * as src/games/TriviaRush.js's per-question timer, but date-diff driven
 * instead of a fixed per-tick duration. */
function Countdown({ endsAt }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!endsAt) return null;
  const end = new Date(endsAt).getTime();
  const diff = Math.max(0, end - now);
  if (diff <= 0) return <p style={{ fontWeight: 700, color: 'var(--accent)' }}>This giveaway has closed.</p>;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'center', margin: '10px 0' }}>
      <Clock size={16} style={{ color: 'var(--accent)' }} />
      {[['d', days], ['h', hours], ['m', mins], ['s', secs]].map(([label, value]) => (
        <span key={label} style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 15, fontWeight: 700 }}>
          {value}<span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>{label}</span>
        </span>
      ))}
    </div>
  );
}

function EntryActionItem({ slug, token, action, onCompleted }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showEvidence, setShowEvidence] = useState(false);
  const [evidence, setEvidence] = useState('');
  const isManual = action.verification_method === 'manual';

  async function complete() {
    setBusy(true);
    setError('');
    try {
      await apiRequest('POST', { token, action_key: action.action_key, evidence: evidence.trim() || undefined }, `/giveaways/public/${slug}/action`);
      setShowEvidence(false);
      onCompleted();
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Could not record this action.');
    } finally { setBusy(false); }
  }

  return (
    <div className="gs-card" style={{ marginBottom: 8, opacity: (action.completed || action.pending_review) ? 0.75 : 1 }}>
      <div className="gs-card-body" style={{ padding: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div>
            <strong style={{ fontSize: 14 }}>{action.label}</strong>
            <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>
              +{action.entry_quantity} {action.entry_quantity === 1 ? 'entry' : 'entries'}
            </span>
            {action.is_required && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--muted)' }}>(required to be eligible)</span>}
            {action.description && <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--muted)' }}>{action.description}</p>}
            {error && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#ef4444' }}>{error}</p>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {action.action_url && (
              <a href={action.action_url} target="_blank" rel="noreferrer" className="gs-btn gs-btn-outline gs-btn-sm">Open</a>
            )}
            {action.completed ? (
              <span className="gs-btn gs-btn-sm" style={{ background: 'var(--success, #10b981)', color: '#fff' }}>
                <Check size={13} /> Done
              </span>
            ) : action.pending_review ? (
              <span className="gs-btn gs-btn-sm gs-btn-outline"><Clock size={13} /> Pending review</span>
            ) : isManual && !showEvidence ? (
              <button type="button" className="gs-btn gs-btn-primary gs-btn-sm" onClick={() => setShowEvidence(true)}>
                Submit for review
              </button>
            ) : !isManual ? (
              <button type="button" className="gs-btn gs-btn-primary gs-btn-sm" disabled={busy} onClick={complete}>
                {busy ? 'Saving…' : "I've done this"}
              </button>
            ) : null}
          </div>
        </div>
        {isManual && showEvidence && !action.completed && !action.pending_review && (
          <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input className="gs-input" style={{ flex: '1 1 220px' }} placeholder="Link or note proving you did this (optional)"
              value={evidence} onChange={(e) => setEvidence(e.target.value)} />
            <button type="button" className="gs-btn gs-btn-primary gs-btn-sm" disabled={busy} onClick={complete}>
              {busy ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const EMPTY_FORM = { name: '', email: '', phone: '', consent_marketing: false };

export default function GiveawayLanding() {
  const { slug } = useParams();
  const query = useQuery();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [me, setMe] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [pendingMessage, setPendingMessage] = useState('');
  const [resendMessage, setResendMessage] = useState('');
  const [resending, setResending] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const clickLogged = useRef(false);

  const refCode = query.get('ref');
  const justVerified = query.get('verified') === '1';

  useEffect(() => {
    apiRequest('GET', null, `/giveaways/public/${slug}`)
      .then(setCampaign)
      .catch(() => setNotFound(true));
  }, [slug]);

  // Sticky referral code -- captured once per browser per campaign, never
  // overwritten by a later visit without a ref param (first-touch, same
  // "don't overwrite the original attribution" rule the whole spec asks
  // for), and logged as a click exactly once per page load.
  useEffect(() => {
    if (!refCode) return;
    try {
      if (!localStorage.getItem(`giveaway_ref_${slug}`)) {
        localStorage.setItem(`giveaway_ref_${slug}`, refCode);
      }
    } catch (_) { /* no-op */ }
    if (!clickLogged.current) {
      clickLogged.current = true;
      apiRequest('POST', { ref: refCode }, `/giveaways/public/${slug}/referral-click`).catch(() => {});
    }
  }, [refCode, slug]);

  // A verify-email redirect lands back here with ?participation_token=...
  // -- adopt it as this browser's token for the campaign so /me resolves
  // immediately, same as a token saved right after entering.
  useEffect(() => {
    const fromUrl = query.get('participation_token');
    if (fromUrl) {
      try { localStorage.setItem(tokenKey(slug), fromUrl); } catch (_) { /* no-op */ }
      navigate(`/campaign/${slug}`, { replace: true });
    }
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  function loadMe() {
    let token;
    try { token = localStorage.getItem(tokenKey(slug)); } catch (_) { token = null; }
    if (!token) return;
    apiRequest('GET', null, `/giveaways/public/${slug}/me?token=${encodeURIComponent(token)}`)
      .then(setMe)
      .catch(() => { try { localStorage.removeItem(tokenKey(slug)); } catch (_) { /* no-op */ } });
  }

  useEffect(() => { loadMe(); }, [slug, justVerified]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submitEntry(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) { setError('Name and email are both required.'); return; }
    setSubmitting(true);
    setError('');
    let refFromStorage = null;
    try { refFromStorage = localStorage.getItem(`giveaway_ref_${slug}`); } catch (_) { /* no-op */ }

    const params = new URLSearchParams(window.location.search);
    try {
      const data = await apiRequest('POST', {
        name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() || undefined,
        consent_marketing: form.consent_marketing, ref: refFromStorage || undefined,
        source: params.get('utm_source') || undefined, medium: params.get('utm_medium') || undefined,
        channel: params.get('utm_channel') || undefined, promotion: params.get('utm_promotion') || undefined,
        creative: params.get('utm_content') || undefined, partner: params.get('utm_partner') || undefined,
        landing_page: window.location.pathname,
      }, `/giveaways/public/${slug}/enter`);
      try { localStorage.setItem(tokenKey(slug), data.participation_token); } catch (_) { /* no-op */ }
      setPendingMessage(data.message);
      loadMe();
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Could not submit your entry -- please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function resendVerifyEmail() {
    if (!form.email.trim()) return;
    setResending(true);
    setResendMessage('');
    try {
      const data = await apiRequest('POST', { email: form.email.trim() }, `/giveaways/public/${slug}/resend-verify`);
      setResendMessage(data.message);
    } catch (err) {
      setResendMessage(typeof err === 'string' ? err : 'Could not resend the email -- please try again.');
    } finally {
      setResending(false);
    }
  }

  if (notFound) {
    return (
      <div className="feed-section"><div className="gs-container" style={{ maxWidth: 640 }}>
        <p>This giveaway could not be found.</p>
      </div></div>
    );
  }
  if (!campaign) {
    return <div className="feed-section"><div className="gs-container"><div className="gs-loading"><div className="gs-spinner" /></div></div></div>;
  }

  const closed = !['active', 'scheduled'].includes(campaign.status);

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 680 }}>
        {campaign.image_url && (
          <img src={campaign.image_url} alt={campaign.name} style={{ width: '100%', maxHeight: 320, objectFit: 'cover', borderRadius: 16, marginBottom: 18 }} />
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Gift size={18} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent)' }}>Giveaway</span>
        </div>
        <h1 style={{ margin: '0 0 6px' }}>{campaign.name}</h1>
        {campaign.description && <p style={{ color: 'var(--muted)', fontSize: 15, lineHeight: 1.6 }}>{campaign.description}</p>}
        {campaign.prize_details && (
          <div className="gs-card" style={{ margin: '14px 0' }}>
            <div className="gs-card-body" style={{ whiteSpace: 'pre-wrap' }}>{campaign.prize_details}</div>
          </div>
        )}
        <Countdown endsAt={campaign.ends_at} />
        {campaign.participants_count != null && (
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>{campaign.participants_count} already entered</p>
        )}

        {justVerified && !me && (
          <div className="gs-success-box" style={{ margin: '10px 0' }}>Your entry is confirmed!</div>
        )}

        {me ? (
          <div className="gs-card" style={{ margin: '16px 0' }}>
            <div className="gs-card-body">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <strong style={{ fontSize: 18 }}>{me.entry_total}</strong> <span style={{ color: 'var(--muted)' }}>{me.entry_total === 1 ? 'entry' : 'entries'} so far</span>
                  {!me.verified && (
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
                      <Mail size={13} style={{ verticalAlign: -2 }} /> Check your email to confirm your entry.
                    </p>
                  )}
                </div>
                <ShareButton title={campaign.name} text={`Enter to win: ${campaign.name}`} url={`${window.location.origin}/campaign/${slug}?ref=${me.referral_code}`} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
                <code style={{ fontSize: 12, background: 'var(--bg)', padding: '4px 8px', borderRadius: 6, wordBreak: 'break-all', flex: 1 }}>
                  {me.referral_url}
                </code>
                <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" title="Copy"
                  onClick={() => { try { navigator.clipboard.writeText(me.referral_url); } catch (_) { /* no-op */ } }}>
                  <Link2 size={13} />
                </button>
              </div>

              {me.actions.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h3 style={{ fontSize: 14, margin: '0 0 8px' }}>Earn more entries</h3>
                  {me.actions.map((a) => (
                    <EntryActionItem key={a.action_key} slug={slug} token={(() => { try { return localStorage.getItem(tokenKey(slug)); } catch (_) { return null; } })()} action={a} onCompleted={loadMe} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : pendingMessage ? (
          <div style={{ margin: '16px 0' }}>
            <div className="gs-success-box">{pendingMessage}</div>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 8 }}>
              Didn't get it?{' '}
              <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" disabled={resending} onClick={resendVerifyEmail}>
                {resending ? 'Sending…' : 'Resend confirmation email'}
              </button>
            </p>
            {resendMessage && <p style={{ fontSize: 12.5, color: 'var(--muted)' }}>{resendMessage}</p>}
          </div>
        ) : closed ? (
          <div className="gs-error-box" style={{ margin: '16px 0' }}>This giveaway is not currently open for entries.</div>
        ) : (
          <form onSubmit={submitEntry} className="gs-card" style={{ margin: '16px 0' }}>
            <div className="gs-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h3 style={{ margin: 0 }}>Enter now</h3>
              {error && <div className="gs-error-box">{error}</div>}
              <input className="gs-input" placeholder="Your name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              <input className="gs-input" type="email" placeholder="Email address" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              <input className="gs-input" placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              {campaign.ask_marketing_consent !== false && (
                <label style={{ display: 'flex', gap: 8, fontSize: 12.5, color: 'var(--muted)', alignItems: 'flex-start' }}>
                  <input type="checkbox" style={{ marginTop: 2 }} checked={form.consent_marketing}
                    onChange={(e) => setForm((f) => ({ ...f, consent_marketing: e.target.checked }))} />
                  Send me occasional updates and offers (optional -- not required to enter).
                </label>
              )}
              <button type="submit" className="gs-btn gs-btn-primary gs-btn-block" disabled={submitting}>
                {submitting ? 'Entering…' : 'Enter the giveaway'}
              </button>
            </div>
          </form>
        )}

        <ExploreMore />

        {(campaign.terms_text || campaign.privacy_note) && (
          <div style={{ marginTop: 10 }}>
            <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setShowTerms((v) => !v)}>
              {showTerms ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Terms &amp; conditions
            </button>
            {showTerms && (
              <div style={{ fontSize: 12.5, color: 'var(--muted)', whiteSpace: 'pre-wrap', marginTop: 8 }}>
                {campaign.terms_text}
                {campaign.privacy_note && <p style={{ marginTop: 10 }}>{campaign.privacy_note}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
