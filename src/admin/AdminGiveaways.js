import React, { useEffect, useState } from 'react';
import {
  Gift, Plus, ChevronDown, ChevronUp, Users, UserCheck, Link2, Trophy,
  Download, Ban, Shuffle, Copy, Check, Mail, ListChecks, BarChart3,
  ShieldAlert, Scale, CheckCircle2, MousePointerClick, Calendar, Clock,
  Settings, Eye, EyeOff,
} from 'lucide-react';
import apiRequest from '../ApiRequest';
import { CampaignLinks } from './AdminCampaigns';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

async function downloadCsv(path, filename) {
  const token = localStorage.getItem('cookie');
  const res = await fetch(`${API}${path}`, { headers: { 'x-access-token': token || '' } });
  if (!res.ok) throw 'Could not export this file.';
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function timeRemainingLabel(endsAt) {
  if (!endsAt) return null;
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return 'ended';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h left`;
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${hours}h ${mins}m left`;
}

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// datetime-local inputs want "YYYY-MM-DDTHH:mm" in the viewer's local time,
// not the ISO string's UTC offset -- this reformats without shifting the
// clock value shown to the admin.
function isoToLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const STATUS_LABEL = {
  draft: 'Draft', scheduled: 'Scheduled', active: 'Active', paused: 'Paused',
  closed: 'Closed', winner_selected: 'Winner selected', completed: 'Completed',
};
const SETTABLE_STATUSES = ['draft', 'scheduled', 'active', 'paused', 'closed'];
const VERIFICATION_METHODS = ['auto', 'manual', 'self_certify'];

function StatChip({ Icon, value, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12.5, color: 'var(--muted)' }}>
      <Icon size={13} /> <b style={{ color: 'var(--text)' }}>{value}</b> {label}
    </span>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" title="Copy link" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, display: 'inline-flex', alignItems: 'center' }}
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch (_) { /* link's shown on screen */ }
      }}>
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

// ── Entry actions config ─────────────────────────────────────────────────

const EMPTY_ACTION_FORM = {
  action_key: '', label: '', description: '', action_url: '',
  entry_quantity: 1, is_required: false, verification_method: 'self_certify',
  max_completions: 1, is_enabled: true, sort_order: 0,
};

function EntryActionsPanel({ campaign, onActionsChanged }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_ACTION_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function save(e) {
    e.preventDefault();
    if (!form.action_key.trim() || !form.label.trim()) { setError('action_key and label are both required.'); return; }
    setSaving(true);
    setError('');
    try {
      const created = await apiRequest('POST', form, `/giveaways/${campaign.id}/entry-actions`);
      onActionsChanged([...(campaign.entry_actions || []), created]);
      setForm(EMPTY_ACTION_FORM);
      setAdding(false);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Could not create this action.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleEnabled(action) {
    const updated = await apiRequest('PATCH', { is_enabled: !action.is_enabled }, `/giveaways/entry-actions/${action.id}`);
    onActionsChanged((campaign.entry_actions || []).map((a) => (a.id === action.id ? updated : a)));
  }

  return (
    <div>
      <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '0 0 10px' }}>
        Each action is a way to earn entries (email verify, join WhatsApp, follow Instagram, refer a friend...).
        "Entries" is each action's weight -- a referral worth 5 earns 5x an email-verify worth 1.
        Use the action key <code>email_signup</code> for the act of entering, <code>email_verify</code> for
        confirming the email, and <code>referral_qualified</code> for a successful referral -- those three keys are
        recognized automatically by the entry flow.
      </p>
      {(campaign.entry_actions || []).length === 0 && !adding && (
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>No entry actions configured yet.</p>
      )}
      {(campaign.entry_actions || []).map((a) => (
        <div key={a.id} className="gs-card" style={{ marginBottom: 8, opacity: a.is_enabled ? 1 : 0.55 }}>
          <div className="gs-card-body" style={{ padding: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                {a.label} <code style={{ fontSize: 11, color: 'var(--muted)' }}>{a.action_key}</code>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                +{a.entry_quantity} {a.entry_quantity === 1 ? 'entry' : 'entries'} · {a.verification_method}
                {a.is_required ? ' · required' : ''} · max {a.max_completions == null ? 'unlimited' : a.max_completions}
              </div>
            </div>
            <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => toggleEnabled(a)}>
              {a.is_enabled ? 'Disable' : 'Enable'}
            </button>
          </div>
        </div>
      ))}

      {adding ? (
        <form onSubmit={save} className="gs-card" style={{ marginTop: 6 }}>
          <div className="gs-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12 }}>
            {error && <div className="gs-error-box" style={{ fontSize: 12.5, padding: 8 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input className="gs-input" style={{ flex: '1 1 180px' }} placeholder="Action key (e.g. instagram_follow)"
                value={form.action_key} onChange={(e) => setForm((f) => ({ ...f, action_key: e.target.value.trim() }))} />
              <input className="gs-input" style={{ flex: '1 1 180px' }} placeholder="Label (e.g. Follow us on Instagram)"
                value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
            </div>
            <input className="gs-input" placeholder="Action URL (optional, e.g. the Instagram profile link)"
              value={form.action_url} onChange={(e) => setForm((f) => ({ ...f, action_url: e.target.value }))} />
            <textarea className="gs-input" rows={2} placeholder="Description (optional)"
              value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <label style={{ fontSize: 12.5, color: 'var(--muted)' }}>Entries
                <input type="number" min={1} className="gs-input" style={{ width: 70, marginLeft: 6 }}
                  value={form.entry_quantity} onChange={(e) => setForm((f) => ({ ...f, entry_quantity: e.target.value }))} />
              </label>
              <label style={{ fontSize: 12.5, color: 'var(--muted)' }}>Verification
                <select className="gs-input" style={{ marginLeft: 6 }} value={form.verification_method}
                  onChange={(e) => setForm((f) => ({ ...f, verification_method: e.target.value }))}>
                  {VERIFICATION_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </label>
              <label style={{ fontSize: 12.5, color: 'var(--muted)' }}>Max completions
                <input type="number" min={0} className="gs-input" style={{ width: 70, marginLeft: 6 }}
                  placeholder="unlimited" value={form.max_completions}
                  onChange={(e) => setForm((f) => ({ ...f, max_completions: e.target.value === '' ? null : e.target.value }))} />
              </label>
              <label style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 4 }}>
                <input type="checkbox" checked={form.is_required}
                  onChange={(e) => setForm((f) => ({ ...f, is_required: e.target.checked }))} /> Required
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="gs-btn gs-btn-primary gs-btn-sm" disabled={saving}>{saving ? 'Saving…' : 'Add action'}</button>
              <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => { setAdding(false); setError(''); }}>Cancel</button>
            </div>
          </div>
        </form>
      ) : (
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setAdding(true)}><Plus size={13} /> New entry action</button>
      )}
    </div>
  );
}

// ── Tracking links (embeds the existing Campaigns tab's own component) ──

function TrackingLinksPanel({ marketingCampaignId }) {
  const [campaign, setCampaign] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest('GET', null, `/campaigns/${marketingCampaignId}`)
      .then(setCampaign)
      .catch((e) => setError(typeof e === 'string' ? e : 'Failed to load tracking links.'));
  }, [marketingCampaignId]);

  if (error) return <div className="gs-error-box">{error}</div>;
  if (!campaign) return <div className="gs-loading"><div className="gs-spinner" /></div>;

  return (
    <div>
      <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '0 0 10px' }}>
        Create one tracked link per channel (WhatsApp, Instagram, email blast...) -- each shows clicks, visitors, and
        signups. These are the same links/stats as the Campaigns tab, scoped to this giveaway.
      </p>
      <CampaignLinks campaign={campaign} onLinkCreated={(_id, link) => setCampaign((c) => ({ ...c, links: [link, ...c.links] }))} />
    </div>
  );
}

// ── Participants ─────────────────────────────────────────────────────────

function ParticipantRow({ campaignId, row, onChanged }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (expanded) { setExpanded(false); return; }
    setExpanded(true);
    if (!detail) {
      const data = await apiRequest('GET', null, `/giveaways/participations/${row.id}`);
      setDetail(data);
    }
  }

  async function invalidateEntry(entryId) {
    const reason = window.prompt('Reason for invalidating this entry?');
    if (!reason) return;
    setBusy(true);
    try {
      await apiRequest('POST', { reason }, `/giveaways/entries/${entryId}/invalidate`);
      const data = await apiRequest('GET', null, `/giveaways/participations/${row.id}`);
      setDetail(data);
      onChanged();
    } finally { setBusy(false); }
  }

  async function disqualify() {
    const reason = window.prompt('Reason for disqualifying this participant?');
    if (!reason) return;
    setBusy(true);
    try {
      await apiRequest('POST', { reason }, `/giveaways/participations/${row.id}/disqualify`);
      onChanged();
    } finally { setBusy(false); }
  }

  return (
    <div className="gs-card" style={{ marginBottom: 6 }}>
      <div className="gs-card-body" style={{ padding: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13.5 }}>
            {row.name || '(no name)'} <span style={{ fontWeight: 400, color: 'var(--muted)' }}>{row.email}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
            <span className={`admin-badge ${row.status === 'disqualified' ? 'rejected' : row.verified_at ? 'approved' : 'pending'}`}>
              {row.status}
            </span>{' '}
            · {row.entry_total} {row.entry_total === 1 ? 'entry' : 'entries'} · entered {formatDateTime(row.created_at)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={toggle}>
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Details
          </button>
          {row.status !== 'disqualified' && (
            <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" disabled={busy} onClick={disqualify}>
              <Ban size={13} /> Disqualify
            </button>
          )}
        </div>
      </div>
      {expanded && detail && (
        <div style={{ borderTop: '1px solid var(--border)', padding: 10, fontSize: 12.5 }}>
          <div style={{ marginBottom: 6, color: 'var(--muted)' }}>
            Referral code <code>{detail.referral_code}</code> · {detail.referral_clicks_count} referral click(s) ·
            {' '}{(detail.referred_participants || []).length} referred friend(s)
            {detail.referrer_participation_id && <> · referred by participation #{detail.referrer_participation_id}</>}
          </div>
          <div style={{ marginBottom: 6, color: 'var(--muted)' }}>
            First touch: {detail.first_touch && (detail.first_touch.source || detail.first_touch.medium)
              ? [detail.first_touch.source, detail.first_touch.medium, detail.first_touch.channel].filter(Boolean).join(' / ')
              : 'direct (no campaign params)'}
            {' '}· Marketing consent: {detail.consent_marketing ? 'yes' : 'no'}
          </div>
          <b>Entries</b>
          {(detail.entries || []).length === 0 && <p style={{ color: 'var(--muted)' }}>No entries yet.</p>}
          {(detail.entries || []).map((e) => (
            <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--border)', opacity: e.invalidated ? 0.5 : 1 }}>
              <span>{e.action_key} · +{e.entry_quantity} {e.invalidated && <em>(invalidated: {e.invalidated_reason})</em>}</span>
              {!e.invalidated && (
                <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" disabled={busy} onClick={() => invalidateEntry(e.id)}>Invalidate</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ParticipantsPanel({ campaignId }) {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, total: 0, per_page: 50, has_more: false });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [verified, setVerified] = useState('');

  function load(page = 1) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (q.trim()) params.set('q', q.trim());
    if (status) params.set('status', status);
    if (verified) params.set('verified', verified);
    apiRequest('GET', null, `/giveaways/${campaignId}/participants?${params.toString()}`)
      .then((d) => { setItems(d.items); setMeta({ page: d.page, total: d.total, per_page: d.per_page, has_more: d.has_more }); })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(1); }, [campaignId, status, verified]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <input className="gs-input" style={{ flex: '1 1 200px' }} placeholder="Search name or email"
          value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load(1)} />
        <select className="gs-input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {['pending_verification', 'active', 'disqualified', 'winner', 'backup_winner'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="gs-input" value={verified} onChange={(e) => setVerified(e.target.value)}>
          <option value="">Verified or not</option>
          <option value="true">Verified only</option>
          <option value="false">Unverified only</option>
        </select>
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => load(1)}>Search</button>
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm"
          onClick={() => downloadCsv(`/giveaways/${campaignId}/export/participants`, `giveaway-${campaignId}-participants.csv`)}>
          <Download size={13} /> Export all
        </button>
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm"
          onClick={() => downloadCsv(`/giveaways/${campaignId}/export/eligible`, `giveaway-${campaignId}-eligible.csv`)}>
          <Download size={13} /> Export eligible
        </button>
      </div>

      {loading && <div className="gs-loading"><div className="gs-spinner" /></div>}
      {!loading && items.length === 0 && <div className="admin-empty">No participants match these filters.</div>}
      {!loading && items.map((row) => (
        <ParticipantRow key={row.id} campaignId={campaignId} row={row} onChanged={() => load(meta.page)} />
      ))}
      {!loading && meta.total > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
          <button className="gs-btn gs-btn-outline gs-btn-sm" disabled={meta.page <= 1} onClick={() => load(meta.page - 1)}>← Prev</button>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>
            {(meta.page - 1) * meta.per_page + 1}–{Math.min(meta.page * meta.per_page, meta.total)} of {meta.total}
          </span>
          <button className="gs-btn gs-btn-outline gs-btn-sm" disabled={!meta.has_more} onClick={() => load(meta.page + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}

// ── Leaderboard + acquisition ────────────────────────────────────────────

function LeaderboardPanel({ campaignId }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    apiRequest('GET', null, `/giveaways/${campaignId}/leaderboard`).then((d) => setRows(d.leaderboard));
  }, [campaignId]);
  if (!rows) return <div className="gs-loading"><div className="gs-spinner" /></div>;
  if (rows.length === 0) return <div className="admin-empty">No referral activity yet.</div>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', fontSize: 12.5, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--muted)' }}>
            <th style={{ padding: '4px 8px' }}>Participant</th>
            <th style={{ padding: '4px 8px' }}>Referral clicks</th>
            <th style={{ padding: '4px 8px' }}>Registrations</th>
            <th style={{ padding: '4px 8px' }}>Qualified referrals</th>
            <th style={{ padding: '4px 8px' }}>Entries earned</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.participation_id} style={{ borderTop: '1px solid var(--border)' }}>
              <td style={{ padding: '4px 8px' }}>{r.name || r.email}</td>
              <td style={{ padding: '4px 8px' }}>{r.referral_clicks}</td>
              <td style={{ padding: '4px 8px' }}>{r.registrations}</td>
              <td style={{ padding: '4px 8px' }}>{r.qualified_referrals}</td>
              <td style={{ padding: '4px 8px' }}><b>{r.entries_from_referrals}</b></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AcquisitionPanel({ campaignId }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    apiRequest('GET', null, `/giveaways/${campaignId}/acquisition`).then(setData);
  }, [campaignId]);
  if (!data) return <div className="gs-loading"><div className="gs-spinner" /></div>;

  const Table = ({ title, rows }) => (
    <div style={{ marginBottom: 16 }}>
      <h4 style={{ margin: '0 0 6px', fontSize: 12.5, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.04em' }}>{title}</h4>
      {rows.length === 0 ? <p style={{ fontSize: 13, color: 'var(--muted)' }}>No data yet.</p> : (
        <table style={{ width: '100%', fontSize: 12.5, borderCollapse: 'collapse' }}>
          <thead><tr style={{ textAlign: 'left', color: 'var(--muted)' }}>
            <th style={{ padding: '4px 8px' }}>{title === 'By day' ? 'Day' : title.replace('By ', '')}</th>
            <th style={{ padding: '4px 8px' }}>Participants</th><th style={{ padding: '4px 8px' }}>Verified</th><th style={{ padding: '4px 8px' }}>Conversion</th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '4px 8px' }}>{r.key}</td>
                <td style={{ padding: '4px 8px' }}>{r.participants}</td>
                <td style={{ padding: '4px 8px' }}>{r.verified}</td>
                <td style={{ padding: '4px 8px' }}>{r.conversion_rate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
  return (
    <div>
      <Table title="By source" rows={data.by_source} />
      <Table title="By medium" rows={data.by_medium} />
      <Table title="By day" rows={data.by_day} />
    </div>
  );
}

// ── Pending review (manual-verification entry actions) ──────────────────

function PendingReviewPanel({ campaignId, onChanged }) {
  const [items, setItems] = useState(null);

  function load() {
    apiRequest('GET', null, `/giveaways/${campaignId}/pending-review`).then((d) => setItems(d.items));
  }
  useEffect(() => { load(); }, [campaignId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function approve(entryId) {
    await apiRequest('POST', {}, `/giveaways/entries/${entryId}/approve`);
    load();
    if (onChanged) onChanged();
  }

  async function reject(entryId) {
    const reason = window.prompt('Reason for rejecting this submission?');
    if (!reason) return;
    await apiRequest('POST', { reason }, `/giveaways/entries/${entryId}/invalidate`);
    load();
    if (onChanged) onChanged();
  }

  return (
    <div>
      <p style={{ fontSize: 12.5, color: 'var(--muted)' }}>
        Entries submitted for a "manual" verification action -- none of these count toward anyone's entry total
        (or draw eligibility, if the action is required) until you approve them.
      </p>
      {items === null && <div className="gs-loading"><div className="gs-spinner" /></div>}
      {items && items.length === 0 && <div className="admin-empty">Nothing awaiting review.</div>}
      {items && items.map((row) => (
        <div key={row.id} className="gs-card" style={{ marginBottom: 6 }}>
          <div className="gs-card-body" style={{ padding: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                {row.name || '(no name)'} <span style={{ fontWeight: 400, color: 'var(--muted)' }}>{row.email}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                {row.action_key} · +{row.entry_quantity} {row.entry_quantity === 1 ? 'entry' : 'entries'} · submitted {formatDateTime(row.created_at)}
              </div>
              {row.evidence && <div style={{ fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>"{row.evidence}"</div>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="gs-btn gs-btn-primary gs-btn-sm" onClick={() => approve(row.id)}>
                <Check size={13} /> Approve
              </button>
              <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => reject(row.id)}>
                <Ban size={13} /> Reject
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Fraud review ──────────────────────────────────────────────────────────

function FraudPanel({ campaignId }) {
  const [items, setItems] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [msg, setMsg] = useState('');

  function load() {
    apiRequest('GET', null, `/giveaways/${campaignId}/fraud-flags`).then((d) => setItems(d.items));
  }
  useEffect(() => { load(); }, [campaignId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function scan() {
    setScanning(true);
    setMsg('');
    try {
      const data = await apiRequest('POST', {}, `/giveaways/${campaignId}/fraud-scan`);
      setMsg(data.flagged > 0 ? `Flagged ${data.flagged} participation(s) for review.` : 'No new shared-IP clusters found.');
      load();
    } finally { setScanning(false); }
  }

  async function clearFlags(id) {
    await apiRequest('POST', {}, `/giveaways/participations/${id}/clear-flags`);
    load();
  }

  async function disqualify(id) {
    const reason = window.prompt('Reason for disqualifying this participant?');
    if (!reason) return;
    await apiRequest('POST', { reason }, `/giveaways/participations/${id}/disqualify`);
    load();
  }

  return (
    <div>
      <p style={{ fontSize: 12.5, color: 'var(--muted)' }}>
        A scan flags (never auto-disqualifies) participations whose entries share an IP address with several
        others -- a shul, office, or school WiFi can look like this too, so review before disqualifying anyone.
      </p>
      <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" disabled={scanning} onClick={scan}>
        <ShieldAlert size={13} /> {scanning ? 'Scanning…' : 'Run fraud scan'}
      </button>
      {msg && <p style={{ fontSize: 12.5, color: 'var(--muted)' }}>{msg}</p>}
      {items === null && <div className="gs-loading"><div className="gs-spinner" /></div>}
      {items && items.length === 0 && <div className="admin-empty">No flagged or disqualified participants.</div>}
      {items && items.map((row) => (
        <div key={row.id} className="gs-card" style={{ marginBottom: 6 }}>
          <div className="gs-card-body" style={{ padding: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                {row.name || '(no name)'} <span style={{ fontWeight: 400, color: 'var(--muted)' }}>{row.email}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                <span className={`admin-badge ${row.status === 'disqualified' ? 'rejected' : 'pending'}`}>{row.status}</span>
                {(row.fraud_flags || []).length > 0 && <span> · {row.fraud_flags.join(', ')}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => clearFlags(row.id)}>Clear flags</button>
              {row.status !== 'disqualified' && (
                <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => disqualify(row.id)}>
                  <Ban size={13} /> Disqualify
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Winner draw ───────────────────────────────────────────────────────────

function DrawPanel({ campaign, onCampaignChange }) {
  const [snapshot, setSnapshot] = useState(null);
  const [backupCount, setBackupCount] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function freeze() {
    if (!window.confirm('Freeze the eligible pool now? This closes entries -- no one can earn more entries on this campaign after this.')) return;
    setBusy(true);
    setError('');
    try {
      const data = await apiRequest('POST', {}, `/giveaways/${campaign.id}/draw/freeze`);
      setSnapshot(data);
      onCampaignChange({ ...campaign, status: 'closed' });
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Could not freeze the pool.');
    } finally { setBusy(false); }
  }

  async function draw() {
    if (!window.confirm('Draw a winner now? This cannot be undone -- running it again only adds backup winners, never changes the original winner.')) return;
    setBusy(true);
    setError('');
    try {
      const data = await apiRequest('POST', { backup_count: Number(backupCount) || 0 }, `/giveaways/${campaign.id}/draw`);
      setResult(data.drawn);
      onCampaignChange({ ...campaign, status: 'winner_selected' });
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Could not run the draw.');
    } finally { setBusy(false); }
  }

  return (
    <div>
      {error && <div className="gs-error-box">{error}</div>}
      <p style={{ fontSize: 12.5, color: 'var(--muted)' }}>
        Freezing takes a snapshot of every verified, non-disqualified participant's live entry total and closes the
        campaign to new entries. Drawing picks a winner weighted by entries using a cryptographically secure random
        choice, and is recorded permanently -- running the draw again on the same snapshot only adds backup winners.
      </p>
      {campaign.status !== 'closed' && campaign.status !== 'winner_selected' && campaign.status !== 'completed' && (
        <button type="button" className="gs-btn gs-btn-primary gs-btn-sm" disabled={busy} onClick={freeze}>
          Freeze eligible pool
        </button>
      )}
      {snapshot && (
        <div className="gs-card" style={{ marginTop: 10 }}>
          <div className="gs-card-body" style={{ padding: 12 }}>
            <p style={{ margin: '0 0 8px' }}><b>{snapshot.eligible_count}</b> eligible participation(s) frozen (snapshot #{snapshot.snapshot_id}).</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label style={{ fontSize: 12.5 }}>Backup winners
                <input type="number" min={0} className="gs-input" style={{ width: 60, marginLeft: 6 }} value={backupCount}
                  onChange={(e) => setBackupCount(e.target.value)} />
              </label>
              <button type="button" className="gs-btn gs-btn-primary gs-btn-sm" disabled={busy} onClick={draw}>
                <Shuffle size={13} /> Draw winner
              </button>
            </div>
          </div>
        </div>
      )}
      {(campaign.status === 'closed' || campaign.status === 'winner_selected' || campaign.status === 'completed') && !snapshot && (
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" disabled={busy} onClick={draw}>
          <Shuffle size={13} /> Draw from latest snapshot
        </button>
      )}
      {result && (
        <div className="gs-card" style={{ marginTop: 10 }}>
          <div className="gs-card-body" style={{ padding: 12 }}>
            <b>Draw results</b>
            {result.map((r) => (
              <div key={r.draw_id} style={{ padding: '6px 0', borderTop: '1px solid var(--border)' }}>
                <Trophy size={13} style={{ verticalAlign: -2 }} /> {r.is_backup ? `Backup #${r.backup_rank}` : 'Winner'}: {r.name || r.email} ({r.email})
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm"
          onClick={() => downloadCsv(`/giveaways/${campaign.id}/draw/report`, `giveaway-${campaign.id}-draw-report.csv`)}>
          <Download size={13} /> Download draw report
        </button>
        {campaign.status === 'winner_selected' && (
          <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const updated = await apiRequest('POST', {}, `/giveaways/${campaign.id}/complete`);
                onCampaignChange(updated);
              } finally { setBusy(false); }
            }}>
            <CheckCircle2 size={13} /> Mark completed (prize sent)
          </button>
        )}
      </div>
    </div>
  );
}

// ── Campaign settings (dates, prize/terms text, public visibility) ───────

function SettingsPanel({ campaign, onCampaignChange }) {
  const [form, setForm] = useState({
    name: campaign.name || '', description: campaign.description || '',
    prize_details: campaign.prize_details || '', terms_text: campaign.terms_text || '',
    privacy_note: campaign.privacy_note || '', image_url: campaign.image_url || '',
    starts_at: isoToLocalInput(campaign.starts_at), ends_at: isoToLocalInput(campaign.ends_at),
    show_participant_count: (campaign.entry_rules || {}).show_participant_count !== false,
    ask_marketing_consent: (campaign.entry_rules || {}).ask_marketing_consent !== false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const updated = await apiRequest('PATCH', {
        name: form.name, description: form.description, prize_details: form.prize_details,
        terms_text: form.terms_text, privacy_note: form.privacy_note, image_url: form.image_url,
        starts_at: form.starts_at || null, ends_at: form.ends_at || null,
        entry_rules: {
          ...(campaign.entry_rules || {}),
          show_participant_count: form.show_participant_count,
          ask_marketing_consent: form.ask_marketing_consent,
        },
      }, `/giveaways/${campaign.id}`);
      onCampaignChange(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Could not save these changes.');
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 520 }}>
      {error && <div className="gs-error-box">{error}</div>}
      <div className="auth-field">
        <label className="auth-label">Campaign name</label>
        <input className="auth-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
      </div>
      <div className="auth-field">
        <label className="auth-label">Description</label>
        <textarea className="auth-input" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div className="auth-field" style={{ flex: '1 1 200px' }}>
          <label className="auth-label">Starts</label>
          <input type="datetime-local" className="auth-input" value={form.starts_at} onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))} />
        </div>
        <div className="auth-field" style={{ flex: '1 1 200px' }}>
          <label className="auth-label">Ends</label>
          <input type="datetime-local" className="auth-input" value={form.ends_at} onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))} />
        </div>
      </div>
      <div className="auth-field">
        <label className="auth-label">Prize details</label>
        <textarea className="auth-input" rows={2} value={form.prize_details} onChange={(e) => setForm((f) => ({ ...f, prize_details: e.target.value }))} />
      </div>
      <div className="auth-field">
        <label className="auth-label">Image URL</label>
        <input className="auth-input" value={form.image_url} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))} />
      </div>
      <div className="auth-field">
        <label className="auth-label">Terms &amp; conditions</label>
        <textarea className="auth-input" rows={3} value={form.terms_text} onChange={(e) => setForm((f) => ({ ...f, terms_text: e.target.value }))} />
      </div>
      <div className="auth-field">
        <label className="auth-label">Privacy note</label>
        <textarea className="auth-input" rows={2} value={form.privacy_note} onChange={(e) => setForm((f) => ({ ...f, privacy_note: e.target.value }))} />
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
        <input type="checkbox" checked={form.show_participant_count}
          onChange={(e) => setForm((f) => ({ ...f, show_participant_count: e.target.checked }))} />
        {form.show_participant_count ? <Eye size={14} /> : <EyeOff size={14} />}
        Show "N already entered" count on the public page
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
        <input type="checkbox" checked={form.ask_marketing_consent}
          onChange={(e) => setForm((f) => ({ ...f, ask_marketing_consent: e.target.checked }))} />
        Ask entrants to opt in to promotional emails (shown unchecked by default -- entering never requires it)
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="gs-btn gs-btn-primary gs-btn-sm" disabled={saving}>
          {saving ? 'Saving…' : 'Save settings'}
        </button>
        {saved && <span style={{ fontSize: 12.5, color: 'var(--accent)', alignSelf: 'center' }}><Check size={13} style={{ verticalAlign: -2 }} /> Saved</span>}
      </div>
    </form>
  );
}

// ── Campaign card ─────────────────────────────────────────────────────────

const SUB_TABS = [
  ['settings', Settings, 'Settings'],
  ['actions', ListChecks, 'Entry Actions'],
  ['links', Link2, 'Tracking Links'],
  ['participants', Users, 'Participants'],
  ['leaderboard', Trophy, 'Leaderboard'],
  ['acquisition', BarChart3, 'Acquisition'],
  ['pending_review', Clock, 'Pending Review'],
  ['fraud', ShieldAlert, 'Fraud Review'],
  ['draw', Shuffle, 'Winner Draw'],
];
const TERMINAL_STATUSES = ['winner_selected', 'completed'];

function CampaignCard({ campaign, onUpdate, compareSelected, onToggleCompare }) {
  const [expanded, setExpanded] = useState(false);
  const [subTab, setSubTab] = useState('actions');
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusError, setStatusError] = useState('');

  async function setStatus(status) {
    setSavingStatus(true);
    setStatusError('');
    try {
      const updated = await apiRequest('PATCH', { status }, `/giveaways/${campaign.id}`);
      onUpdate(updated);
    } catch (err) {
      setStatusError(typeof err === 'string' ? err : 'Could not change this campaign\'s status.');
    } finally { setSavingStatus(false); }
  }

  const stats = campaign.stats || { participants: 0, verified: 0, entries: 0, referral_clicks: 0, qualified_referrals: 0, conversion_rate: 0 };
  const landingUrl = `${(import.meta.env.VITE_MAIN_SITE_URL || 'https://www.gutshtick.com')}/campaign/${campaign.slug}`;

  return (
    <div className="gs-card" style={{ marginBottom: 16 }}>
      <div className="gs-card-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Gift size={15} />
              <strong style={{ fontSize: 15.5 }}>{campaign.name}</strong>
              <span className={`admin-badge ${['active', 'winner_selected', 'completed'].includes(campaign.status) ? 'approved' : campaign.status === 'draft' ? 'pending' : 'rejected'}`}>
                {STATUS_LABEL[campaign.status] || campaign.status}
              </span>
            </div>
            {campaign.description && <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>{campaign.description}</p>}
            {(campaign.starts_at || campaign.ends_at) && (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Calendar size={12} />
                {campaign.starts_at ? formatDateTime(campaign.starts_at) : 'no start set'} → {campaign.ends_at ? formatDateTime(campaign.ends_at) : 'no end set'}
                {campaign.ends_at && <b> ({timeRemainingLabel(campaign.ends_at)})</b>}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <code style={{ fontSize: 12, background: 'var(--bg)', padding: '3px 6px', borderRadius: 6, wordBreak: 'break-all' }}>{landingUrl}</code>
              <CopyButton text={landingUrl} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
              <StatChip Icon={MousePointerClick} value={stats.referral_clicks} label="referral clicks" />
              <StatChip Icon={Trophy} value={stats.qualified_referrals} label="qualified referrals" />
              <StatChip Icon={BarChart3} value={`${stats.conversion_rate}%`} label="conversion" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--muted)' }}>
              <input type="checkbox" checked={compareSelected} onChange={() => onToggleCompare(campaign.id)} /> Compare
            </label>
            <StatChip Icon={Users} value={stats.participants} label="participants" />
            <StatChip Icon={UserCheck} value={stats.verified} label="verified" />
            <StatChip Icon={Mail} value={stats.entries} label="entries" />
            <select className="gs-input gs-btn-sm" disabled={savingStatus || TERMINAL_STATUSES.includes(campaign.status)}
              value={campaign.status} onChange={(e) => setStatus(e.target.value)}
              title={TERMINAL_STATUSES.includes(campaign.status) ? 'A winner has already been selected -- status is locked' : undefined}>
              {[...SETTABLE_STATUSES, 'winner_selected', 'completed']
                .filter((s) => SETTABLE_STATUSES.includes(s) || s === campaign.status)
                .map((s) => <option key={s} value={s} disabled={!SETTABLE_STATUSES.includes(s)}>{STATUS_LABEL[s]}</option>)}
            </select>
            <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setExpanded((v) => !v)}>
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Manage
            </button>
          </div>
        </div>
        {statusError && (
          <p style={{ fontSize: 12.5, color: 'var(--danger, #c0392b)', marginTop: 8 }}>{statusError}</p>
        )}

        {expanded && (
          <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {SUB_TABS.map(([key, Icon, label]) => (
                <button key={key} type="button" className={`gs-btn gs-btn-sm ${subTab === key ? 'gs-btn-primary' : 'gs-btn-outline'}`}
                  onClick={() => setSubTab(key)}>
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>
            {subTab === 'settings' && <SettingsPanel campaign={campaign} onCampaignChange={onUpdate} />}
            {subTab === 'actions' && <EntryActionsPanel campaign={campaign} onActionsChanged={(entry_actions) => onUpdate({ ...campaign, entry_actions })} />}
            {subTab === 'links' && <TrackingLinksPanel marketingCampaignId={campaign.marketing_campaign_id} />}
            {subTab === 'participants' && <ParticipantsPanel campaignId={campaign.id} />}
            {subTab === 'leaderboard' && <LeaderboardPanel campaignId={campaign.id} />}
            {subTab === 'acquisition' && <AcquisitionPanel campaignId={campaign.id} />}
            {subTab === 'pending_review' && <PendingReviewPanel campaignId={campaign.id} />}
            {subTab === 'fraud' && <FraudPanel campaignId={campaign.id} />}
            {subTab === 'draw' && <DrawPanel campaign={campaign} onCampaignChange={onUpdate} />}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Campaign comparison ──────────────────────────────────────────────────

function CompareView({ ids, onClose }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    apiRequest('GET', null, `/giveaways/compare?ids=${ids.join(',')}`).then((d) => setData(d.campaigns));
  }, [ids]);

  return (
    <div className="gs-card" style={{ marginBottom: 16 }}>
      <div className="gs-card-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}><Scale size={15} style={{ verticalAlign: -2 }} /> Comparing {ids.length} campaigns</h3>
          <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={onClose}>Close</button>
        </div>
        {!data && <div className="gs-loading"><div className="gs-spinner" /></div>}
        {data && (
          <div style={{ overflowX: 'auto', marginTop: 10 }}>
            <table style={{ width: '100%', fontSize: 12.5, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--muted)' }}>
                  <th style={{ padding: '4px 8px' }}>Campaign</th>
                  <th style={{ padding: '4px 8px' }}>Status</th>
                  <th style={{ padding: '4px 8px' }}>Participants</th>
                  <th style={{ padding: '4px 8px' }}>Verified</th>
                  <th style={{ padding: '4px 8px' }}>Entries</th>
                  <th style={{ padding: '4px 8px' }}>Referral clicks</th>
                  <th style={{ padding: '4px 8px' }}>Qualified referrals</th>
                  <th style={{ padding: '4px 8px' }}>Conversion</th>
                </tr>
              </thead>
              <tbody>
                {data.map((c) => (
                  <tr key={c.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '4px 8px', fontWeight: 700 }}>{c.name}</td>
                    <td style={{ padding: '4px 8px' }}>{STATUS_LABEL[c.status] || c.status}</td>
                    <td style={{ padding: '4px 8px' }}>{c.participants}</td>
                    <td style={{ padding: '4px 8px' }}>{c.verified}</td>
                    <td style={{ padding: '4px 8px' }}>{c.entries}</td>
                    <td style={{ padding: '4px 8px' }}>{c.referral_clicks}</td>
                    <td style={{ padding: '4px 8px' }}>{c.qualified_referrals}</td>
                    <td style={{ padding: '4px 8px' }}>{c.conversion_rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Top-level: campaign list + create form ───────────────────────────────

const EMPTY_CAMPAIGN_FORM = {
  name: '', description: '', campaign_type: 'giveaway', image_url: '',
  prize_details: '', terms_text: '', privacy_note: '', starts_at: '', ends_at: '',
};

export default function AdminGiveaways() {
  const [campaigns, setCampaigns] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_CAMPAIGN_FORM);
  const [saving, setSaving] = useState(false);
  const [compareIds, setCompareIds] = useState([]);
  const [showCompare, setShowCompare] = useState(false);

  useEffect(() => { load(); }, []);

  function toggleCompare(id) {
    setCompareIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function load() {
    setLoading(true);
    setError('');
    apiRequest('GET', null, '/giveaways')
      .then(setCampaigns)
      .catch((e) => setError(typeof e === 'string' ? e : 'Failed to load giveaway campaigns.'))
      .finally(() => setLoading(false));
  }

  async function saveCampaign(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Campaign name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const created = await apiRequest('POST', form, '/giveaways');
      setCampaigns((prev) => [created, ...(prev || [])]);
      setForm(EMPTY_CAMPAIGN_FORM);
      setCreating(false);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Could not create this campaign.');
    } finally { setSaving(false); }
  }

  function onUpdate(updated) {
    setCampaigns((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
  }

  return (
    <div>
      <p style={{ color: 'var(--muted)', marginTop: 0 }}>
        Create and run a giveaway end-to-end: entry actions, referral tracking, participant management, and a fair,
        auditable winner draw. No code changes needed -- the public page at <code>/campaign/&lt;slug&gt;</code> is
        driven entirely by what's configured here.
      </p>
      {error && <div className="gs-error-box">{error}</div>}

      <div className="ad-manager-toolbar">
        <h3 style={{ margin: 0 }}>Giveaway Campaigns</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          {compareIds.length >= 2 && (
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setShowCompare(true)}>
              <Scale size={14} /> Compare selected ({compareIds.length})
            </button>
          )}
          {!creating && (
            <button className="gs-btn gs-btn-primary gs-btn-sm" onClick={() => setCreating(true)}>
              <Plus size={14} /> New Campaign
            </button>
          )}
        </div>
      </div>

      {showCompare && compareIds.length >= 2 && (
        <CompareView ids={compareIds} onClose={() => setShowCompare(false)} />
      )}

      {creating && (
        <form onSubmit={saveCampaign} className="gs-card" style={{ marginBottom: 16 }}>
          <div className="gs-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="auth-field">
              <label className="auth-label">Campaign name*</label>
              <input className="auth-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoFocus />
            </div>
            <div className="auth-field">
              <label className="auth-label">Description</label>
              <textarea className="auth-input" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="auth-field">
              <label className="auth-label">Prize details</label>
              <textarea className="auth-input" rows={2} value={form.prize_details} onChange={(e) => setForm((f) => ({ ...f, prize_details: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <div className="auth-field" style={{ flex: '1 1 200px' }}>
                <label className="auth-label">Starts</label>
                <input type="datetime-local" className="auth-input" value={form.starts_at} onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))} />
              </div>
              <div className="auth-field" style={{ flex: '1 1 200px' }}>
                <label className="auth-label">Ends</label>
                <input type="datetime-local" className="auth-input" value={form.ends_at} onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))} />
              </div>
            </div>
            <div className="auth-field">
              <label className="auth-label">Image URL</label>
              <input className="auth-input" value={form.image_url} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))} />
            </div>
            <div className="auth-field">
              <label className="auth-label">Terms &amp; conditions</label>
              <textarea className="auth-input" rows={3} value={form.terms_text} onChange={(e) => setForm((f) => ({ ...f, terms_text: e.target.value }))} />
            </div>
            <div className="auth-field">
              <label className="auth-label">Privacy note (optional -- shown alongside the site's own privacy policy)</label>
              <textarea className="auth-input" rows={2} value={form.privacy_note} onChange={(e) => setForm((f) => ({ ...f, privacy_note: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="gs-btn gs-btn-primary gs-btn-sm" disabled={saving}>{saving ? 'Creating…' : 'Create campaign'}</button>
              <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => { setCreating(false); setForm(EMPTY_CAMPAIGN_FORM); }}>Cancel</button>
            </div>
          </div>
        </form>
      )}

      {loading && <div className="gs-loading"><div className="gs-spinner" /></div>}
      {!loading && campaigns && campaigns.length === 0 && (
        <div className="admin-empty">No giveaway campaigns yet -- create one above.</div>
      )}
      {!loading && campaigns && campaigns.map((c) => (
        <CampaignCard key={c.id} campaign={c} onUpdate={onUpdate}
          compareSelected={compareIds.includes(c.id)} onToggleCompare={toggleCompare} />
      ))}
    </div>
  );
}
