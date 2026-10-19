import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  LineChart, TrendingUp, Megaphone, Printer, Rocket, Inbox, HelpCircle,
  Ticket, Gem, Gift, PartyPopper, Wrench, ArrowRight, Pencil, Clock,
} from 'lucide-react';
import apiRequest from '../ApiRequest';
import { isSuperAdmin } from '../auth';
import SocialDesk from './SocialDesk';
import BusinessAnalytics from './BusinessAnalytics';
import AskQuestion from './AskQuestion';
import MinyanTimes from './MinyanTimes';
import MarketingKit from './MarketingKit';
import ToolExplainer from './ToolExplainer';

// These six are still being tested end-to-end (real OAuth apps, payment-free
// reward mechanics, etc.) so they're only visible/reachable for super admins
// for now -- the backend enforces this too (see e.g. routes/social.py,
// routes/loyalty_card.py), this is just so a regular owner never sees a
// control that would 403 if they clicked it.
const RESTRICTED_TABS = new Set(['social', 'marketing', 'leads', 'redeem', 'loyalty', 'referrals']);

const TAB_META = {
  insights: { label: 'Insights', Icon: LineChart },
  analytics: { label: 'Analytics', Icon: TrendingUp },
  social: { label: 'Social Desk', Icon: Megaphone },
  marketing: { label: 'Marketing Kit', Icon: Printer },
  boost: { label: 'Boost', Icon: Rocket },
  leads: { label: 'Leads', Icon: Inbox },
  questions: { label: 'Questions', Icon: HelpCircle },
  minyanim: { label: 'Minyan Times', Icon: Clock },
  redeem: { label: 'Redeem a Deal', Icon: Ticket },
  loyalty: { label: 'Loyalty', Icon: Gem },
  referrals: { label: 'Referrals', Icon: Gift },
};

const ALL_GROUPS = [
  { key: 'performance', label: 'Performance', tabs: ['insights', 'analytics'] },
  { key: 'grow', label: 'Grow', tabs: ['social', 'marketing', 'boost'] },
  { key: 'customers', label: 'Customers', tabs: ['leads', 'questions', 'minyanim', 'redeem'] },
  { key: 'rewards', label: 'Rewards', tabs: ['loyalty', 'referrals'] },
];

const EXPLAINERS = {
  insights: 'See how your listing compares to other businesses in your category, plus concrete suggestions for what to fix first.',
  analytics: "See how many people are viewing your listing, tapping your WhatsApp number, getting directions, and viewing or redeeming your deals -- so you can tell what's actually working.",
  social: "Connect your Facebook, Instagram, Google Business Profile, X, and LinkedIn accounts once, then write a post here to publish everywhere at once. TikTok and WhatsApp Status don't let outside apps post directly, so for those you'll get a \"Share now\" button that hands your caption and image to your phone -- one more tap and it's posted.",
  marketing: 'Generate a print-ready flyer with your logo and a QR code linking to your profile or your current deals -- good for a shul bulletin board, a table, or your storefront window.',
  boost: "Boosted placement puts your listing at the top of its category and search results for 7 days. It's earned by completing your profile, not paid for -- once one ends, you can activate another.",
  leads: 'When someone requests a quote from your profile, it lands here with their contact details so you can follow up directly.',
  questions: 'Customers can ask a question right from your profile instead of needing your phone number. Answer it here and it becomes a public FAQ that future visitors can see too.',
  minyanim: "Add your shul's minyan times here -- they'll show on your public profile and in sitewide minyan search. Every time needs a source (your website, a call to the office, a posted sign) since we never want to show a time we can't back up, and we show everyone a reminder to confirm with you directly since times shift with the season and the sun.",
  redeem: "When a customer taps \"Get This Deal,\" they get a unique code (with a QR version) saved to their Deal Wallet. Type or scan that code here when they show up to mark it redeemed -- this is also how your Insights tab knows a deal actually got used, not just viewed.",
  loyalty: 'A digital punch-card for repeat visits. Turn it on, pick how many visits earn a reward, and each customer gets their own scannable code. Enter their code here on each visit to add a stamp -- when they hit your threshold, they earn the reward and the count resets.',
  referrals: "Every customer automatically gets a personal link to refer friends to your business. When someone new uses that link to get one of your deals, it shows up here so you know who's sending you customers. You decide the reward and hand it out yourself -- there's no automatic discount applied.",
};

function LeadsTab({ businessId }) {
  const [leads, setLeads] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { apiRequest('GET', null, `/business/businesses/${businessId}/leads`).then(setLeads).catch(() => setLeads([])); }, [businessId]);
  const markStatus = (id, status) => {
    if (updatingId) return;
    setUpdatingId(id);
    setError(null);
    apiRequest('PATCH', { status }, `/business/leads/${id}/status`)
      .then((updated) => setLeads((cur) => cur.map((l) => (l.id === id ? updated : l))))
      .catch(() => setError('Could not update that lead -- try again.'))
      .finally(() => setUpdatingId(null));
  };
  if (!leads) return <p>Loading...</p>;
  if (!leads.length) return <p className="biz-empty">No quote requests yet.</p>;
  return (
    <div className="biz-leads-list">
      {error && <p className="biz-error" style={{ fontSize: 12 }}>{error}</p>}
      {leads.map((lead) => (
        <div key={lead.id} className={`biz-lead-row biz-lead-${lead.status}`}>
          <div>
            <strong>{lead.name}</strong> · <a href={`mailto:${lead.email}`}>{lead.email}</a>{lead.phone && ` · ${lead.phone}`}
            <p>{lead.message}</p>
            <span className="biz-lead-date">{new Date(lead.created_at).toLocaleDateString()}</span>
          </div>
          <div className="biz-lead-actions-row">
            {lead.status !== 'read' && <button type="button" disabled={!!updatingId} onClick={() => markStatus(lead.id, 'read')}>Mark read</button>}
            {lead.status !== 'archived' && <button type="button" disabled={!!updatingId} onClick={() => markStatus(lead.id, 'archived')}>Archive</button>}
          </div>
        </div>
      ))}
    </div>
  );
}

function QuestionsTab({ businessId }) {
  return <AskQuestion businessId={businessId} canManage />;
}

function RedeemTab({ businessId }) {
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [log, setLog] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { apiRequest('GET', null, `/business/businesses/${businessId}/redemptions`).then(setLog).catch(() => setLog([])); }, [businessId]);

  const redeem = (e) => {
    e.preventDefault();
    if (busy || !code.trim()) return;
    setBusy(true);
    apiRequest('POST', { code: code.trim() }, `/business/businesses/${businessId}/redeem`)
      .then((res) => { setResult({ ok: true, message: 'Redeemed!' }); setCode(''); setLog((cur) => [res, ...(cur || [])]); })
      .catch((err) => setResult({ ok: false, message: typeof err === 'string' ? err : 'Could not redeem that code' }))
      .finally(() => setBusy(false));
  };

  return (
    <div className="biz-redeem-tab">
      <form onSubmit={redeem} className="biz-redeem-form">
        <input type="text" placeholder="Enter customer's deal code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} disabled={busy} />
        <button type="submit" disabled={!code.trim() || busy}>{busy ? 'Redeeming…' : 'Redeem'}</button>
      </form>
      {result && <p className={result.ok ? 'biz-redeem-ok' : 'biz-redeem-error'}>{result.message}</p>}
      <h4>Recent redemptions</h4>
      {log && log.length === 0 && <p className="biz-empty">No deals issued yet.</p>}
      {log && log.map((r) => (
        <div key={r.id} className="biz-redeem-log-row">
          <span>{r.code}</span>
          <span className={`biz-wallet-badge${r.status === 'redeemed' ? ' biz-wallet-badge-redeemed' : ''}`}>{r.status}</span>
        </div>
      ))}
    </div>
  );
}

function BoostTab({ businessId }) {
  const [data, setData] = useState(null);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState(null);
  const load = () => apiRequest('GET', null, `/business/businesses/${businessId}/boost/eligibility`).then(setData).catch(() => {});
  useEffect(() => { load(); }, [businessId]);

  const activate = () => {
    if (activating) return;
    setActivating(true);
    setError(null);
    apiRequest('POST', {}, `/business/businesses/${businessId}/boost/activate`)
      .then(load)
      .catch((err) => setError(typeof err === 'string' ? err : "Couldn't activate the boost -- try again."))
      .finally(() => setActivating(false));
  };

  if (!data) return <p>Loading...</p>;

  return (
    <div className="biz-boost-tab">
      {data.boost_active ? (
        <p className="biz-boost-active"><Rocket size={16} /> Boosted until {new Date(data.boost_until).toLocaleString()}</p>
      ) : (
        <>
          <ul className="biz-boost-checklist">
            {Object.entries(data.checks).map(([key, ok]) => (
              <li key={key} className={ok ? 'biz-boost-check-ok' : 'biz-boost-check-missing'}>
                {ok ? '✓' : '○'} {key.replace(/_/g, ' ')}
              </li>
            ))}
          </ul>
          <button type="button" disabled={!data.eligible || activating} onClick={activate} className="gs-btn gs-btn-primary">
            {activating ? 'Activating…' : data.eligible ? 'Activate 7-day boost' : 'Complete your profile to unlock'}
          </button>
          {error && <p className="biz-error" style={{ fontSize: 12, marginTop: 6 }}>{error}</p>}
        </>
      )}
    </div>
  );
}

function InsightsTab({ businessId }) {
  const [data, setData] = useState(null);
  useEffect(() => { apiRequest('GET', null, `/business/businesses/${businessId}/insights`).then(setData).catch(() => {}); }, [businessId]);
  if (!data) return <p>Loading...</p>;

  const stats = [
    { label: 'Your rating', value: data.your_stats.rating_avg ? `★ ${data.your_stats.rating_avg.toFixed(1)}` : '—' },
    { label: 'Category average', value: `★ ${data.category_benchmark.avg_rating.toFixed(1)}` },
    { label: 'Followers', value: data.your_stats.follower_count },
    { label: 'Profile complete', value: `${data.your_stats.profile_completeness_pct}%` },
    { label: 'Deal redemption rate', value: data.your_stats.deal_redemption_rate_pct != null ? `${data.your_stats.deal_redemption_rate_pct}%` : '—' },
    { label: 'Businesses in your category', value: data.category_benchmark.peer_count },
  ];

  return (
    <div className="biz-insights-tab">
      <div className="biz-analytics-tiles">
        {stats.map((s) => (
          <div key={s.label} className="biz-analytics-tile">
            <div className="biz-analytics-tile-value">{s.value}</div>
            <div className="biz-analytics-tile-label">{s.label}</div>
          </div>
        ))}
      </div>
      <h4 className="biz-section-title">Recommendations</h4>
      {data.recommendations.length === 0 ? (
        <p className="biz-empty">Nothing urgent -- your profile is in good shape.</p>
      ) : (
        <ul className="biz-insights-recommendations">
          {data.recommendations.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      )}
    </div>
  );
}

function LoyaltyTab({ business, onBusinessUpdate }) {
  const [settings, setSettings] = useState(null);
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [stamping, setStamping] = useState(false);
  const [settingsError, setSettingsError] = useState(null);
  const attrs = business.attributes || {};

  useEffect(() => {
    apiRequest('GET', null, `/business/businesses/${business.id}/loyalty/settings`).then(setSettings).catch(() => {});
  }, [business.id]);

  const saveSettings = (patch) => {
    setSettingsError(null);
    const attributes = { ...attrs, ...patch };
    apiRequest('PATCH', { attributes }, `/business/businesses/${business.id}`)
      .then((updated) => { onBusinessUpdate(updated); setSettings((s) => ({ ...s, ...patch })); })
      .catch(() => setSettingsError('Could not save that setting -- try again.'));
  };

  const stamp = (e) => {
    e.preventDefault();
    if (stamping || !code.trim()) return;
    setStamping(true);
    apiRequest('POST', { code: code.trim() }, `/business/businesses/${business.id}/loyalty/stamp`)
      .then((res) => { setResult(res); setCode(''); })
      .catch((err) => setResult({ error: typeof err === 'string' ? err : 'Could not find that card' }))
      .finally(() => setStamping(false));
  };

  return (
    <div className="biz-loyalty-tab">
      <h4 className="biz-section-title">Program settings</h4>
      {settingsError && <p className="biz-error" style={{ fontSize: 12 }}>{settingsError}</p>}
      <label className="biz-bulk-field-toggle">
        <input type="checkbox" checked={!!attrs.loyalty_enabled} onChange={(e) => saveSettings({ loyalty_enabled: e.target.checked })} />
        Enable a loyalty punch-card for this business
      </label>
      {attrs.loyalty_enabled && (
        <>
          <label className="biz-loyalty-setting">
            Stamps needed for a reward
            <input type="number" min={2} max={50} defaultValue={attrs.loyalty_threshold || 10}
                   onBlur={(e) => saveSettings({ loyalty_threshold: parseInt(e.target.value, 10) || 10 })} />
          </label>
          <label className="biz-loyalty-setting">
            Reward description
            <input type="text" defaultValue={attrs.loyalty_reward || ''} placeholder="e.g. Free coffee"
                   onBlur={(e) => saveSettings({ loyalty_reward: e.target.value })} />
          </label>

          <h4 className="biz-section-title">Add a stamp</h4>
          <p className="biz-tool-subnote">Ask the customer to show their loyalty code (they'll find it on your profile page), then type or scan it here.</p>
          <form onSubmit={stamp} className="biz-redeem-form">
            <input type="text" placeholder="Enter customer's loyalty code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} disabled={stamping} />
            <button type="submit" disabled={!code.trim() || stamping}>{stamping ? 'Stamping…' : 'Stamp'}</button>
          </form>
          {result && (
            result.error
              ? <p className="biz-redeem-error">{result.error}</p>
              : <p className={result.reward_earned ? 'biz-redeem-ok' : ''}>
                  {result.reward_earned ? <><PartyPopper size={13} /> Reward earned! </> : ''}Now at {result.stamps}/{settings?.threshold || 10} stamps.
                </p>
          )}
        </>
      )}
    </div>
  );
}

function ReferralsTab({ business, onBusinessUpdate }) {
  const [referrals, setReferrals] = useState(null);
  const attrs = business.attributes || {};

  useEffect(() => {
    apiRequest('GET', null, `/business/businesses/${business.id}/referral/list`).then(setReferrals).catch(() => setReferrals([]));
  }, [business.id]);

  const saveReward = (e) => {
    e.preventDefault();
    apiRequest('PATCH', { attributes: { ...attrs, referral_reward: e.target.reward.value } }, `/business/businesses/${business.id}`)
      .then(onBusinessUpdate);
  };

  return (
    <div className="biz-referrals-tab">
      <form onSubmit={saveReward} className="biz-referral-reward-form">
        <label>
          Referral reward (shown to customers -- leave blank to hide this feature on your profile)
          <input name="reward" type="text" defaultValue={attrs.referral_reward || ''} placeholder="e.g. 10% off for both of you" />
        </label>
        <button type="submit">Save</button>
      </form>
      <h4 className="biz-section-title">Who's referring customers</h4>
      {!referrals ? <p>Loading...</p> : referrals.length === 0 ? (
        <p className="biz-empty">No referrals yet -- once a customer's link brings in someone new, it'll show up here.</p>
      ) : (
        <ul className="biz-referral-owner-list">
          {referrals.map((r) => (
            <li key={r.id}>{r.use_count} referral{r.use_count === 1 ? '' : 's'} via code {r.code}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function BusinessOwnerTools() {
  const { idOrSlug } = useParams();
  const [business, setBusiness] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('insights');

  useEffect(() => {
    apiRequest('GET', null, `/business/businesses/${idOrSlug}`).then(setBusiness).catch(setError);
  }, [idOrSlug]);

  if (error) return <div className="biz-page"><p className="biz-error">Could not load this business.</p></div>;
  if (!business) return <div className="biz-page"><p>Loading...</p></div>;
  // The backend's own _can_manage checks (every business_* route) already
  // treat a super admin as able to manage any business, not just their own --
  // this just matches that on the frontend so Super Admin's business lookup
  // can actually get in, instead of stopping at a client-side wall the
  // server was never going to enforce anyway.
  if (!business.is_own_business && !isSuperAdmin()) {
    return <div className="biz-page"><p className="biz-error">You don't manage this business.</p></div>;
  }

  const canSeeRestricted = isSuperAdmin();
  const isShul = business.category === 'shul';
  const tabAllowed = (key) => (canSeeRestricted || !RESTRICTED_TABS.has(key)) && (key !== 'minyanim' || isShul);
  const groups = ALL_GROUPS
    .map((group) => ({ ...group, tabs: group.tabs.filter(tabAllowed) }))
    .filter((group) => group.tabs.length > 0);
  const activeTab = tabAllowed(tab) ? tab : 'insights';
  const meta = TAB_META[activeTab];

  return (
    <div className="biz-page biz-owner-tools">
      <div className="biz-owner-tools-header">
        <h1 className="biz-page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Wrench size={26} /> {business.name}</h1>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link to={`/business/${business.slug}/edit`} className="biz-owner-tools-view-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Pencil size={13} /> Edit business info</Link>
          <Link to={`/business/${business.slug}`} className="biz-owner-tools-view-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>View public profile <ArrowRight size={13} /></Link>
        </div>
      </div>

      <div className="biz-owner-tools-layout">
        <nav className="biz-owner-tools-sidebar">
          {groups.map((group) => (
            <div key={group.key} className="biz-owner-tools-group">
              <div className="biz-owner-tools-group-label">{group.label}</div>
              {group.tabs.map((key) => {
                const TabIcon = TAB_META[key].Icon;
                return (
                  <button
                    key={key}
                    type="button"
                    className={`biz-owner-tools-navbtn${key === activeTab ? ' active' : ''}`}
                    onClick={() => setTab(key)}
                  >
                    <TabIcon size={16} /> {TAB_META[key].label}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="biz-owner-tools-content">
          <h2 className="biz-owner-tools-content-title"><meta.Icon size={22} /> {meta.label}</h2>
          <ToolExplainer>{EXPLAINERS[activeTab]}</ToolExplainer>

          {activeTab === 'insights' && <InsightsTab businessId={business.id} />}
          {activeTab === 'analytics' && <BusinessAnalytics businessId={business.id} />}
          {activeTab === 'questions' && <QuestionsTab businessId={business.id} />}
          {activeTab === 'minyanim' && <MinyanTimes businessId={business.id} canManage />}
          {activeTab === 'boost' && <BoostTab businessId={business.id} />}
          {canSeeRestricted && activeTab === 'social' && <SocialDesk businessId={business.id} />}
          {canSeeRestricted && activeTab === 'leads' && <LeadsTab businessId={business.id} />}
          {canSeeRestricted && activeTab === 'redeem' && <RedeemTab businessId={business.id} />}
          {canSeeRestricted && activeTab === 'loyalty' && <LoyaltyTab business={business} onBusinessUpdate={setBusiness} />}
          {canSeeRestricted && activeTab === 'referrals' && <ReferralsTab business={business} onBusinessUpdate={setBusiness} />}
          {canSeeRestricted && activeTab === 'marketing' && <MarketingKit business={business} />}
        </div>
      </div>
    </div>
  );
}
