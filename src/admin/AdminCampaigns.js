import React, { useEffect, useState } from 'react';
import { Copy, Check, Plus, Link2, MousePointerClick, Users, UserCheck, FilePlus2, ChevronDown, ChevronUp, Pause, Play, Archive } from 'lucide-react';
import apiRequest from '../ApiRequest';

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title="Copy link"
      aria-label="Copy link"
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, display: 'inline-flex', alignItems: 'center' }}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch (_) { /* link's still shown on screen */ }
      }}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

function StatChip({ Icon, value, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12.5, color: 'var(--muted)' }}>
      <Icon size={13} /> <b style={{ color: 'var(--text)' }}>{value}</b> {label}
    </span>
  );
}

const EMPTY_LINK_FORM = { label: '', destination_url: '' };

// One-click destination_url fills for the "/contribute" guest-submission
// flow (see src/ContributePicker.js + business/estates/money routes.js) --
// the first one is the single "let them pick" link this feature is mostly
// about; the other three skip straight to one site's own form when the
// campaign already knows which content type it's recruiting for.
const CONTRIBUTE_PRESETS = [
  { label: 'Contribute (let them pick)', url: 'https://www.gutshtick.com/contribute' },
  { label: 'Contribute → Business', url: 'https://www.gutcommunity.com/contribute' },
  { label: 'Contribute → Jobs', url: 'https://www.gutmoney.com/contribute' },
  { label: 'Contribute → Estates', url: 'https://www.gutestates.com/contribute' },
];

/** One campaign's links -- new-link form, link rows with their stats, and
 * a per-link expandable activity drill-down (raw clicks + attributed
 * visitor sessions, from GET /campaigns/links/<id>/activity). */
function CampaignLinks({ campaign, onLinkCreated }) {
  const [addingLink, setAddingLink] = useState(false);
  const [linkForm, setLinkForm] = useState(EMPTY_LINK_FORM);
  const [linkError, setLinkError] = useState('');
  const [savingLink, setSavingLink] = useState(false);
  const [expandedLinkId, setExpandedLinkId] = useState(null);
  const [activity, setActivity] = useState(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState('');
  const [clicksPage, setClicksPage] = useState(1);

  async function saveLink(e) {
    e.preventDefault();
    if (!linkForm.label.trim() || !linkForm.destination_url.trim()) {
      setLinkError('Label and destination URL are both required.');
      return;
    }
    setSavingLink(true);
    setLinkError('');
    try {
      const created = await apiRequest('POST', linkForm, `/campaigns/${campaign.id}/links`);
      onLinkCreated(campaign.id, created);
      setLinkForm(EMPTY_LINK_FORM);
      setAddingLink(false);
    } catch (err) {
      setLinkError(typeof err === 'string' ? err : 'Could not create this link -- destination must be a full http(s) URL.');
    } finally {
      setSavingLink(false);
    }
  }

  async function toggleActivity(linkId) {
    if (expandedLinkId === linkId) {
      setExpandedLinkId(null);
      setActivity(null);
      return;
    }
    setExpandedLinkId(linkId);
    setClicksPage(1);
    await loadActivity(linkId, 1);
  }

  async function loadActivity(linkId, page) {
    setActivityLoading(true);
    setActivityError('');
    try {
      const data = await apiRequest('GET', null, `/campaigns/links/${linkId}/activity?page=${page}`);
      setActivity(data);
      setClicksPage(page);
    } catch (err) {
      setActivityError(typeof err === 'string' ? err : 'Failed to load this link\'s activity.');
    } finally {
      setActivityLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 10 }}>
      {campaign.links.length === 0 && !addingLink && (
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '6px 0' }}>No links yet on this campaign.</p>
      )}

      {campaign.links.map((link) => {
        const stats = link.stats || { clicks: 0, visitors: 0, signups: 0 };
        const expanded = expandedLinkId === link.id;
        return (
          <div key={link.id} className="gs-card" style={{ marginBottom: 8, opacity: link.is_active ? 1 : 0.6 }}>
            <div className="gs-card-body" style={{ padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                    {link.label}{!link.is_active && <span style={{ color: 'var(--muted)', fontWeight: 400 }}> (inactive)</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, wordBreak: 'break-all' }}>
                    → {link.destination_url}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                    <code style={{ fontSize: 12, background: 'var(--bg)', padding: '3px 6px', borderRadius: 6, wordBreak: 'break-all' }}>
                      {link.tracked_url}
                    </code>
                    <CopyButton text={link.tracked_url} />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <StatChip Icon={MousePointerClick} value={stats.clicks} label="clicks" />
                    <StatChip Icon={Users} value={stats.visitors} label="visitors" />
                    <StatChip Icon={UserCheck} value={stats.signups} label="signups" />
                    <StatChip Icon={FilePlus2} value={stats.contributions} label="contributions" />
                  </div>
                  <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => toggleActivity(link.id)}>
                    {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Activity
                  </button>
                </div>
              </div>

              {expanded && (
                <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                  {activityLoading && <div className="gs-loading"><div className="gs-spinner" /></div>}
                  {activityError && <div className="gs-error-box">{activityError}</div>}
                  {!activityLoading && activity && (
                    <>
                      <h4 style={{ margin: '0 0 6px', fontSize: 12.5, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.04em' }}>
                        Visitors ({activity.visitors.length})
                      </h4>
                      {activity.visitors.length === 0 && (
                        <p style={{ fontSize: 13, color: 'var(--muted)' }}>No one's visited through this link yet.</p>
                      )}
                      {activity.visitors.length > 0 && (
                        <div style={{ overflowX: 'auto', marginBottom: 14 }}>
                          <table style={{ width: '100%', fontSize: 12.5, borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ textAlign: 'left', color: 'var(--muted)' }}>
                                <th style={{ padding: '4px 8px' }}>Visitor</th>
                                <th style={{ padding: '4px 8px' }}>Country</th>
                                <th style={{ padding: '4px 8px' }}>First seen</th>
                                <th style={{ padding: '4px 8px' }}>Last seen</th>
                                <th style={{ padding: '4px 8px' }}>Page views</th>
                                <th style={{ padding: '4px 8px' }}>Signed up</th>
                              </tr>
                            </thead>
                            <tbody>
                              {activity.visitors.map((v) => (
                                <tr key={v.anonymous_id} style={{ borderTop: '1px solid var(--border)' }}>
                                  <td style={{ padding: '4px 8px' }}>{v.user_name || `Anonymous (${v.anonymous_id})`}</td>
                                  <td style={{ padding: '4px 8px' }}>{v.country}</td>
                                  <td style={{ padding: '4px 8px' }}>{formatDateTime(v.first_seen)}</td>
                                  <td style={{ padding: '4px 8px' }}>{formatDateTime(v.last_seen)}</td>
                                  <td style={{ padding: '4px 8px' }}>{v.page_view_count}</td>
                                  <td style={{ padding: '4px 8px' }}>
                                    {v.signed_up_at ? <span style={{ color: 'var(--success, #16a34a)' }}>{formatDateTime(v.signed_up_at)}</span> : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <h4 style={{ margin: '0 0 6px', fontSize: 12.5, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.04em' }}>
                        Raw clicks ({activity.clicks.total})
                      </h4>
                      {activity.clicks.items.length === 0 && (
                        <p style={{ fontSize: 13, color: 'var(--muted)' }}>No clicks logged yet.</p>
                      )}
                      {activity.clicks.items.length > 0 && (
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', fontSize: 12.5, borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ textAlign: 'left', color: 'var(--muted)' }}>
                                <th style={{ padding: '4px 8px' }}>When</th>
                                <th style={{ padding: '4px 8px' }}>Referrer</th>
                                <th style={{ padding: '4px 8px' }}>Country</th>
                                <th style={{ padding: '4px 8px' }}>User agent</th>
                              </tr>
                            </thead>
                            <tbody>
                              {activity.clicks.items.map((c) => (
                                <tr key={c.id} style={{ borderTop: '1px solid var(--border)' }}>
                                  <td style={{ padding: '4px 8px', whiteSpace: 'nowrap' }}>{formatDateTime(c.created_at)}</td>
                                  <td style={{ padding: '4px 8px', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.referrer || '—'}</td>
                                  <td style={{ padding: '4px 8px' }}>{c.country || '—'}</td>
                                  <td style={{ padding: '4px 8px', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.user_agent || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {(activity.clicks.page > 1 || activity.clicks.has_more) && (
                            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                              <button className="gs-btn gs-btn-outline gs-btn-sm" disabled={clicksPage <= 1}
                                onClick={() => loadActivity(link.id, clicksPage - 1)}>← Prev</button>
                              <button className="gs-btn gs-btn-outline gs-btn-sm" disabled={!activity.clicks.has_more}
                                onClick={() => loadActivity(link.id, clicksPage + 1)}>Next →</button>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {addingLink ? (
        <form onSubmit={saveLink} className="gs-card" style={{ marginTop: 6 }}>
          <div className="gs-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12 }}>
            {linkError && <div className="gs-error-box" style={{ fontSize: 12.5, padding: 8 }}>{linkError}</div>}
            <input
              className="gs-input" placeholder="Label (e.g. Instagram story, Email blast #2)"
              value={linkForm.label} onChange={(e) => setLinkForm((f) => ({ ...f, label: e.target.value }))}
            />
            <input
              className="gs-input" placeholder="Destination URL (e.g. https://www.gutshtick.com/signup)"
              value={linkForm.destination_url} onChange={(e) => setLinkForm((f) => ({ ...f, destination_url: e.target.value }))}
            />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11.5, color: 'var(--muted)', alignSelf: 'center' }}>Quick fill:</span>
              {CONTRIBUTE_PRESETS.map((p) => (
                <button
                  key={p.url} type="button" className="gs-chip"
                  onClick={() => setLinkForm((f) => ({ ...f, destination_url: p.url }))}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="gs-btn gs-btn-primary gs-btn-sm" disabled={savingLink}>
                {savingLink ? 'Creating…' : 'Create link'}
              </button>
              <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => { setAddingLink(false); setLinkError(''); }}>
                Cancel
              </button>
            </div>
          </div>
        </form>
      ) : (
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setAddingLink(true)}>
          <Plus size={13} /> New link
        </button>
      )}
    </div>
  );
}

const EMPTY_CAMPAIGN_FORM = { name: '', description: '' };

/** Super Admin tab: create campaigns, generate trackable links per
 * campaign, and see clicks/visitors/signups per link -- backed by
 * backend/campaigns/routes/campaign.py. Deliberately separate from the
 * existing "Ads" tab (in-site ad slots SHOWN to visitors, a different
 * system entirely) -- this is outbound links we hand out elsewhere that
 * point back at us. */
export default function AdminCampaigns() {
  const [campaigns, setCampaigns] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_CAMPAIGN_FORM);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    setError('');
    apiRequest('GET', null, '/campaigns')
      .then(setCampaigns)
      .catch((e) => setError(typeof e === 'string' ? e : 'Failed to load campaigns.'))
      .finally(() => setLoading(false));
  }

  async function saveCampaign(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Campaign name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const created = await apiRequest('POST', form, '/campaigns');
      setCampaigns((prev) => [created, ...(prev || [])]);
      setForm(EMPTY_CAMPAIGN_FORM);
      setCreating(false);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Could not create this campaign.');
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(campaign, status) {
    try {
      const updated = await apiRequest('PATCH', { status }, `/campaigns/${campaign.id}`);
      setCampaigns((prev) => prev.map((c) => (c.id === campaign.id ? { ...c, ...updated, links: campaign.links } : c)));
    } catch (err) {
      setMsg(typeof err === 'string' ? err : 'Failed to update campaign status.');
    }
  }

  function onLinkCreated(campaignId, link) {
    setCampaigns((prev) => prev.map((c) => (
      c.id === campaignId ? { ...c, links: [link, ...c.links] } : c
    )));
  }

  return (
    <div>
      <p style={{ color: 'var(--muted)', marginTop: 0 }}>
        Create a campaign, generate a tracked link per channel (Facebook, Instagram, email…), and see exactly who clicked, who signed up because of it, and how they used the site afterward.
      </p>
      {msg && <div className="gs-success-box">{msg}</div>}
      {error && <div className="gs-error-box">{error}</div>}

      <div className="ad-manager-toolbar">
        <h3 style={{ margin: 0 }}>Campaigns</h3>
        {!creating && (
          <button className="gs-btn gs-btn-primary gs-btn-sm" onClick={() => setCreating(true)}>
            <Plus size={14} /> New Campaign
          </button>
        )}
      </div>

      {creating && (
        <form onSubmit={saveCampaign} className="gs-card" style={{ marginBottom: 16 }}>
          <div className="gs-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="auth-field">
              <label className="auth-label">Campaign name*</label>
              <input className="auth-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoFocus />
            </div>
            <div className="auth-field">
              <label className="auth-label">Description</label>
              <textarea className="auth-input" rows={2} value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="gs-btn gs-btn-primary gs-btn-sm" disabled={saving}>
                {saving ? 'Creating…' : 'Create campaign'}
              </button>
              <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => { setCreating(false); setForm(EMPTY_CAMPAIGN_FORM); }}>
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {loading && <div className="gs-loading"><div className="gs-spinner" /></div>}
      {!loading && campaigns && campaigns.length === 0 && (
        <div className="admin-empty">No campaigns yet -- create one to generate your first trackable link.</div>
      )}

      {!loading && campaigns && campaigns.map((campaign) => {
        const totals = campaign.totals || { clicks: 0, visitors: 0, signups: 0 };
        return (
          <div key={campaign.id} className="gs-card" style={{ marginBottom: 18 }}>
            <div className="gs-card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Link2 size={15} />
                    <strong style={{ fontSize: 15.5 }}>{campaign.name}</strong>
                    <span className={`admin-badge ${campaign.status === 'active' ? 'approved' : campaign.status === 'ended' ? 'rejected' : 'pending'}`}>
                      {campaign.status}
                    </span>
                  </div>
                  {campaign.description && <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>{campaign.description}</p>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <StatChip Icon={MousePointerClick} value={totals.clicks} label="clicks" />
                  <StatChip Icon={Users} value={totals.visitors} label="visitors" />
                  <StatChip Icon={UserCheck} value={totals.signups} label="signups" />
                  <StatChip Icon={FilePlus2} value={totals.contributions} label="contributions" />
                  {campaign.status === 'active' ? (
                    <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setStatus(campaign, 'paused')} title="Pause">
                      <Pause size={13} /> Pause
                    </button>
                  ) : campaign.status === 'paused' ? (
                    <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setStatus(campaign, 'active')} title="Resume">
                      <Play size={13} /> Resume
                    </button>
                  ) : null}
                  {campaign.status !== 'ended' && (
                    <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setStatus(campaign, 'ended')} title="End campaign">
                      <Archive size={13} /> End
                    </button>
                  )}
                </div>
              </div>

              <CampaignLinks campaign={campaign} onLinkCreated={onLinkCreated} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
