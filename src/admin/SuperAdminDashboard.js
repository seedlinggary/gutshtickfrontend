import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import { isSuperAdmin } from '../auth';
import UploadFile from '../Uploadfile';
import AdminAiPosts from './AdminAiPosts';
import AdminScrapers from './AdminScrapers';
import AdminYoutubeChannels from './AdminYoutubeChannels';
import AdminAnalytics from './AdminAnalytics';

const ROLES = ['viewer', 'user', 'admin', 'super_admin'];
const ROLE_LABELS = { viewer: 'Viewer', user: 'User', admin: 'Admin', super_admin: 'Super Admin' };
const ROLE_COLOR = { viewer: '#94a3b8', user: '#3b82f6', admin: '#f59e0b', super_admin: '#ef4444' };

const DESTINATION_LABELS = {
  url: 'Destination URL*',
  whatsapp: 'WhatsApp number (with country code)*',
  phone: 'Phone number*',
  email: 'Email address*',
  internal: 'Internal path (e.g. /games)*',
};

const PLACEMENT_LABELS = {
  feed: '📰 Feed',
  games_hub: '🎮 Games Hub',
  game_page: '🕹️ In-Game (while playing)',
  top: '⬆️ Home Top',
  bottom: '⬇️ Home Bottom',
  sidebar_left: '◀️ Sidebar Left',
  sidebar_right: '▶️ Sidebar Right',
};

const EMPTY_AD_FORM = {
  name: '', advertiser_name: '', headline: '', body_text: '', cta_label: 'Learn More',
  destination_type: 'url', destination_value: '', placement: 'feed',
  target_age_min: '', target_age_max: '', target_gender: '', target_countries: '',
  start_date: '', end_date: '', weight: 1,
};

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatusBadgeInline({ v }) {
  return (
    <span className={`admin-badge ${v === true ? 'approved' : v === false ? 'rejected' : 'pending'}`}>
      {v === true ? 'Approved' : v === false ? 'Rejected' : 'Pending'}
    </span>
  );
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const [ads, setAds] = useState([]);
  const [adForm, setAdForm] = useState(null);
  const [editingAdId, setEditingAdId] = useState(null);
  const [adMsg, setAdMsg] = useState('');
  const [expandedStatsAdId, setExpandedStatsAdId] = useState(null);
  const [adStats, setAdStats] = useState(null);
  const [adStatsLoading, setAdStatsLoading] = useState(false);

  const toggleAdStats = async (adId) => {
    if (expandedStatsAdId === adId) {
      setExpandedStatsAdId(null);
      setAdStats(null);
      return;
    }
    setExpandedStatsAdId(adId);
    setAdStats(null);
    setAdStatsLoading(true);
    try {
      const data = await apiRequest('GET', null, `/ads/${adId}/stats`);
      setAdStats(data);
    } catch (e) {
      setAdStats({ error: typeof e === 'string' ? e : 'Failed to load stats.' });
    } finally {
      setAdStatsLoading(false);
    }
  };

  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryMsg, setCategoryMsg] = useState('');

  useEffect(() => {
    if (!isSuperAdmin()) { navigate('/'); return; }
    loadAll();
  }, []);

  useEffect(() => {
    const term = searchQuery.trim();
    if (!term) { setSearchResults(null); setSearching(false); return; }
    setSearching(true);
    const t = setTimeout(() => {
      apiRequest('GET', null, `/admin/search?q=${encodeURIComponent(term)}`)
        .then(setSearchResults)
        .catch(() => setSearchResults(null))
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  async function loadAll() {
    setLoading(true);
    try {
      const [s, u, a, ads, cats] = await Promise.all([
        apiRequest('GET', null, '/admin/stats'),
        apiRequest('GET', null, '/admin/users'),
        apiRequest('GET', null, '/admin/approvals'),
        apiRequest('GET', null, '/ads'),
        apiRequest('GET', null, '/generalc'),
      ]);
      setStats(s);
      setUsers(u);
      setApprovals(a);
      setAds(ads);
      setCategories(cats);
    } catch (e) {
      setMsg(typeof e === 'string' ? e : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  async function unapproveShtick(id) {
    if (!window.confirm('Send this post back to the pending queue?')) return;
    await apiRequest('POST', null, `/admin/shtick/${id}/unapprove`);
    setApprovals((a) => a.filter((s) => s.id !== id));
    setMsg('Unapproved — back in the pending queue');
  }

  async function addCategory(e) {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;
    setCategoryMsg('');
    try {
      const created = await apiRequest('POST', { name }, '/generalc');
      setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCategoryName('');
    } catch (e) {
      setCategoryMsg(typeof e === 'string' ? e : 'Failed to add category');
    }
  }

  async function deleteCategory(cat) {
    if (!window.confirm(`Delete "${cat.name}"? This only works if no posts use it.`)) return;
    setCategoryMsg('');
    try {
      await apiRequest('DELETE', null, `/generalc/${cat.id}`);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
    } catch (e) {
      setCategoryMsg(typeof e === 'string' ? e : 'Failed to delete category');
    }
  }

  function openNewAdForm() {
    setEditingAdId(null);
    setAdForm({ ...EMPTY_AD_FORM });
    setTab('ads');
  }

  function openEditAdForm(ad) {
    setEditingAdId(ad.id);
    setAdForm({
      name: ad.name || '',
      advertiser_name: ad.advertiser_name || '',
      headline: ad.headline || '',
      body_text: ad.body_text || '',
      cta_label: ad.cta_label || 'Learn More',
      destination_type: ad.destination_type || 'url',
      destination_value: ad.destination_value || '',
      placement: ad.placement || 'feed',
      target_age_min: ad.target_age_min ?? '',
      target_age_max: ad.target_age_max ?? '',
      target_gender: ad.target_gender || '',
      target_countries: ad.target_countries || '',
      start_date: ad.start_date ? ad.start_date.slice(0, 10) : '',
      end_date: ad.end_date ? ad.end_date.slice(0, 10) : '',
      weight: ad.weight || 1,
    });
    setTab('ads');
  }

  function cancelAdForm() {
    setAdForm(null);
    setEditingAdId(null);
  }

  async function saveAd() {
    const body = {
      ...adForm,
      target_age_min: adForm.target_age_min === '' ? null : Number(adForm.target_age_min),
      target_age_max: adForm.target_age_max === '' ? null : Number(adForm.target_age_max),
      weight: Number(adForm.weight) || 1,
      start_date: adForm.start_date || null,
      end_date: adForm.end_date || null,
    };
    try {
      if (editingAdId) {
        const updated = await apiRequest('PUT', body, `/ads/${editingAdId}`);
        setAds((prev) => prev.map((a) => a.id === updated.id ? updated : a));
        setAdMsg('Ad updated.');
      } else {
        const created = await apiRequest('POST', body, '/ads');
        setAds((prev) => [created, ...prev]);
        setAdMsg('Ad created as a draft — activate it from the list when it\'s ready to go live.');
      }
      cancelAdForm();
    } catch (e) {
      setAdMsg(typeof e === 'string' ? e : 'Failed to save ad');
    }
  }

  async function setAdStatus(id, status) {
    try {
      const updated = await apiRequest('PUT', { status }, `/ads/${id}`);
      setAds((prev) => prev.map((a) => a.id === id ? updated : a));
    } catch (e) {
      setAdMsg(typeof e === 'string' ? e : 'Failed to update ad status');
    }
  }

  async function deleteAd(id) {
    if (!window.confirm('Delete this draft ad? This cannot be undone.')) return;
    try {
      await apiRequest('DELETE', null, `/ads/${id}`);
      setAds((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      setAdMsg(typeof e === 'string' ? e : 'Failed to delete ad');
    }
  }

  async function changeRole(publicId, newRole) {
    try {
      const updated = await apiRequest('PATCH', { role: newRole }, `/admin/users/${publicId}/role`);
      setUsers((u) => u.map((x) => x.public_id === publicId ? { ...x, role: updated.role } : x));
      setMsg(`Role updated to ${ROLE_LABELS[newRole]}`);
    } catch (e) {
      setMsg(typeof e === 'string' ? e : 'Failed');
    }
  }

  async function viewActivity(user) {
    setSelectedUser(user);
    setTab('activity');
    setLoading(true);
    try {
      const data = await apiRequest('GET', null, `/admin/users/${user.public_id}/activity`);
      setActivity(data);
    } catch (_) {
      setActivity(null);
    } finally {
      setLoading(false);
    }
  }

  const filteredUsers = roleFilter === 'all' ? users : users.filter((u) => u.role === roleFilter);

  return (
    <div className="admin-page superadmin-page">
      <div className="admin-header">
        <h1>⭐ Super Admin</h1>
        <p>Full platform control — users, roles, analytics, approval history.</p>
      </div>

      {msg && <div className="gs-success-box">{msg}</div>}

      <div className="admin-tabs">
        {[
          ['overview', '📊 Overview'],
          ['search', '🔎 Search'],
          ['users', `👥 Users (${users.length})`],
          ['approvals', '✅ Approval History'],
          ['ads', `📢 Ads (${ads.length})`],
          ['categories', `🏷️ Categories (${categories.length})`],
          ['content_pipeline', '🤖 Content Pipeline'],
          ['analytics', '📈 Analytics'],
          ['activity', selectedUser ? `🔍 ${selectedUser.profile_name}` : '🔍 Activity'],
        ].map(([key, label]) => (
          <button key={key} className={`admin-tab${tab === key ? ' active' : ''}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Search (checks id/title/body/category/submitted-by across every
          table: Feed posts+comments, Hock posts+comments, Tachlis posts, Users) ── */}
      {tab === 'search' && (
        <div>
          <input
            type="text"
            className="auth-input games-search-input"
            style={{ marginBottom: 16, maxWidth: 480 }}
            placeholder="🔎 Search everything by id, title, body, category, or submitted by…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />

          {searching && <div className="gs-loading"><div className="gs-spinner" /></div>}

          {!searching && !searchQuery.trim() && (
            <div className="admin-empty">Type at least one character to search across every table.</div>
          )}

          {!searching && searchQuery.trim() && searchResults && (
            <>
              {Object.values(searchResults).every((arr) => arr.length === 0) && (
                <div className="admin-empty">No matches for "{searchQuery.trim()}".</div>
              )}

              {searchResults.shticks.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h3>📰 Feed Posts ({searchResults.shticks.length})</h3>
                  {searchResults.shticks.map((s) => (
                    <div key={s.id} className="admin-card">
                      <div className="admin-card-top">
                        <StatusBadgeInline v={s.approved_to_publish} />
                        <span className="admin-date">{new Date(s.pub_date).toLocaleDateString()} <span style={{ fontSize: 11 }}>#{s.id}</span></span>
                      </div>
                      <h3 className="admin-caption">{s.caption}</h3>
                      <div className="admin-card-meta">
                        <span>By: <b>{s.submitted_by || 'Unknown'}</b></span>
                        {' · '}
                        <a href={`/post/${s.id}`} target="_blank" rel="noreferrer">View on site ↗</a>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {searchResults.hock_posts.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h3>🗣 Hock Posts ({searchResults.hock_posts.length})</h3>
                  {searchResults.hock_posts.map((p) => (
                    <div key={p.id} className="admin-card" style={{ borderLeft: '4px solid #6366f1' }}>
                      <div className="admin-card-top">
                        <span className={`admin-badge ${p.approved_to_publish ? 'approved' : 'rejected'}`}>
                          {p.approved_to_publish ? 'Visible' : 'Hidden'}
                        </span>
                        <span className="admin-date">{new Date(p.pub_date).toLocaleDateString()} <span style={{ fontSize: 11 }}>#{p.id}</span></span>
                      </div>
                      <h3 className="admin-caption">{p.title}</h3>
                      <div className="admin-card-meta">
                        <span>By: <b>{p.submitted_by || 'Unknown'}</b></span>
                        {' · '}
                        <a href={`/hock/post/${p.id}`} target="_blank" rel="noreferrer">View on site ↗</a>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {searchResults.hock_comments.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h3>💬 Hock Comments ({searchResults.hock_comments.length})</h3>
                  {searchResults.hock_comments.map((c) => (
                    <div key={c.id} className="admin-card comment-card">
                      <div className="admin-card-top">
                        <span><b>{c.submitted_by || 'Unknown'}</b></span>
                        <span className="admin-date">{new Date(c.pub_date).toLocaleDateString()} <span style={{ fontSize: 11 }}>#{c.id}</span></span>
                      </div>
                      <p style={{ margin: '6px 0' }}>{c.text}</p>
                      <a href={`/hock/post/${c.hock_post_id}`} target="_blank" rel="noreferrer">View post ↗</a>
                    </div>
                  ))}
                </div>
              )}

              {searchResults.tachlis_posts.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h3>💼 Tachlis Posts ({searchResults.tachlis_posts.length})</h3>
                  {searchResults.tachlis_posts.map((t) => (
                    <div key={t.id} className="admin-card" style={{ borderLeft: '4px solid #6366f1' }}>
                      <div className="admin-card-top">
                        <StatusBadgeInline v={t.approved_to_publish} />
                        <span className="admin-date">{new Date(t.pub_date).toLocaleDateString()} <span style={{ fontSize: 11 }}>#{t.id}</span></span>
                      </div>
                      <h3 className="admin-caption">{t.title}</h3>
                      <div className="admin-card-meta">
                        <span>Type: <b>{t.post_type}</b> · By: <b>{t.submitted_by || 'Unknown'}</b></span>
                        {' · '}
                        <a href={`/tachlis/post/${t.id}`} target="_blank" rel="noreferrer">View on site ↗</a>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {searchResults.comments.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h3>💬 Feed Comments ({searchResults.comments.length})</h3>
                  {searchResults.comments.map((c) => (
                    <div key={c.id} className="admin-card comment-card">
                      <div className="admin-card-top">
                        <span><b>{c.submitted_by || 'Unknown'}</b></span>
                        <span className="admin-date">{new Date(c.pub_date).toLocaleDateString()} <span style={{ fontSize: 11 }}>#{c.id}</span></span>
                      </div>
                      <p style={{ margin: '6px 0' }}>{c.text}</p>
                      <a href={`/post/${c.shtick_id}`} target="_blank" rel="noreferrer">View post ↗</a>
                    </div>
                  ))}
                </div>
              )}

              {searchResults.users.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h3>👥 Users ({searchResults.users.length})</h3>
                  {searchResults.users.map((u) => (
                    <div key={u.id} className="admin-card" style={{ cursor: 'pointer' }} onClick={() => viewActivity(u)}>
                      <div className="admin-card-top">
                        <span style={{ color: ROLE_COLOR[u.role] || 'var(--muted)', fontWeight: 700 }}>
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                        <span className="admin-date" style={{ fontSize: 11 }}>#{u.id}</span>
                      </div>
                      <h3 className="admin-caption">{u.profile_name}</h3>
                      <div className="admin-card-meta">{u.email}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {loading && <div className="gs-loading"><div className="gs-spinner" /></div>}

      {/* ── Overview ── */}
      {tab === 'overview' && stats && !loading && (
        <div className="superadmin-stats-grid">
          <div className="sa-stat-card blue">
            <div className="sa-stat-num">{stats.users}</div>
            <div className="sa-stat-label">Total Users</div>
          </div>
          <div className="sa-stat-card amber">
            <div className="sa-stat-num">{stats.shticks?.pending}</div>
            <div className="sa-stat-label">Pending Posts</div>
          </div>
          <div className="sa-stat-card green">
            <div className="sa-stat-num">{stats.shticks?.approved}</div>
            <div className="sa-stat-label">Approved Posts</div>
          </div>
          <div className="sa-stat-card purple">
            <div className="sa-stat-num">{stats.comments}</div>
            <div className="sa-stat-label">Comments</div>
          </div>
          <div className="sa-stat-card red">
            <div className="sa-stat-num">{stats.likes}</div>
            <div className="sa-stat-label">Total Likes</div>
          </div>
          <div className="sa-stat-card teal">
            <div className="sa-stat-num">{stats.game_sessions}</div>
            <div className="sa-stat-label">Game Sessions</div>
          </div>
        </div>
      )}

      {/* ── Users ── */}
      {tab === 'users' && !loading && (
        <div>
          <div className="sa-user-filters">
            {['all', ...ROLES].map((r) => (
              <button key={r} className={`difficulty-btn${roleFilter === r ? ' active' : ''}`}
                onClick={() => setRoleFilter(r)}>
                {r === 'all' ? 'All' : ROLE_LABELS[r]}
              </button>
            ))}
          </div>
          <div className="sa-user-table">
            <div className="sa-user-row header">
              <span>User</span><span>Email</span><span>Role</span><span>Posts</span><span>Joined</span><span>Actions</span>
            </div>
            {filteredUsers.map((u) => (
              <div key={u.public_id} className="sa-user-row">
                <span className="sa-profile">
                  <div className="shtick-author-avatar" style={{ width: 30, height: 30, fontSize: 12 }}>
                    {u.profile_name?.charAt(0).toUpperCase()}
                  </div>
                  {u.profile_name}
                </span>
                <span>{u.email}</span>
                <span>
                  <select
                    value={u.role}
                    onChange={(e) => changeRole(u.public_id, e.target.value)}
                    className="sa-role-select"
                    style={{ borderColor: ROLE_COLOR[u.role] }}
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                </span>
                <span>{u.shtick_count}</span>
                <span>{formatDate(u.pub_date)}</span>
                <span>
                  <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => viewActivity(u)}>
                    View Activity
                  </button>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Approval History ── */}
      {tab === 'approvals' && !loading && (
        <div className="admin-list">
          {approvals.length === 0 && <div className="admin-empty">No approvals yet.</div>}
          {approvals.map((s) => (
            <div key={s.id} className="admin-card">
              <div className="admin-card-top">
                <span className={`admin-badge ${s.approved_to_publish ? 'approved' : 'rejected'}`}>
                  {s.approved_to_publish ? '✓ Approved' : '✕ Rejected'}
                </span>
                <span className="admin-date">{formatDate(s.pub_date)} <span style={{ fontSize: 11 }} title="Post ID">#{s.id}</span></span>
              </div>
              <h3 className="admin-caption">{s.caption}</h3>
              <div className="admin-card-meta">
                <span>Submitted by: <b>{s.user?.profile_name || s.user_id}</b></span>
                {s.approver && <span> · Decision by: <b>{s.approver.profile_name}</b></span>}
              </div>
              <div className="admin-actions">
                <button className="gs-btn gs-btn-sm" onClick={() => unapproveShtick(s.id)}>↩ Unapprove</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Ads ── */}
      {tab === 'ads' && !loading && (
        <div>
          {adMsg && <div className="gs-success-box">{adMsg}</div>}

          <div className="ad-manager-toolbar">
            <h3 style={{ margin: 0 }}>Advertisements</h3>
            {!adForm && (
              <button className="gs-btn gs-btn-primary gs-btn-sm" onClick={openNewAdForm}>+ New Ad</button>
            )}
          </div>

          {adForm && (
            <div className="gs-card" style={{ marginBottom: 20 }}>
              <div className="gs-card-body">
                <h4>{editingAdId ? 'Edit Ad' : 'New Ad'}</h4>
                <div className="ad-form-grid">
                  <div className="auth-field">
                    <label className="auth-label">Internal name*</label>
                    <input className="auth-input" value={adForm.name}
                      onChange={(e) => setAdForm({ ...adForm, name: e.target.value })} />
                  </div>
                  <div className="auth-field">
                    <label className="auth-label">Advertiser</label>
                    <input className="auth-input" value={adForm.advertiser_name}
                      onChange={(e) => setAdForm({ ...adForm, advertiser_name: e.target.value })} />
                  </div>

                  <div className="auth-field full-span">
                    <label className="auth-label">Headline</label>
                    <input className="auth-input" value={adForm.headline}
                      onChange={(e) => setAdForm({ ...adForm, headline: e.target.value })} />
                  </div>
                  <div className="auth-field full-span">
                    <label className="auth-label">Body text</label>
                    <textarea className="auth-input" rows={2} value={adForm.body_text}
                      onChange={(e) => setAdForm({ ...adForm, body_text: e.target.value })} />
                  </div>

                  <div className="auth-field">
                    <label className="auth-label">CTA button label</label>
                    <input className="auth-input" value={adForm.cta_label}
                      onChange={(e) => setAdForm({ ...adForm, cta_label: e.target.value })} />
                  </div>
                  <div className="auth-field">
                    <label className="auth-label">Placement</label>
                    <select className="auth-input" value={adForm.placement}
                      onChange={(e) => setAdForm({ ...adForm, placement: e.target.value })}>
                      <option value="feed">Feed (between posts)</option>
                      <option value="games_hub">Games Hub (banner)</option>
                      <option value="game_page">In-Game (while actually playing)</option>
                      <option value="top">Home page — top banner</option>
                      <option value="bottom">Home page — bottom banner</option>
                      <option value="sidebar_left">Sidebar — left</option>
                      <option value="sidebar_right">Sidebar — right</option>
                    </select>
                  </div>

                  <div className="auth-field">
                    <label className="auth-label">Click destination type</label>
                    <select className="auth-input" value={adForm.destination_type}
                      onChange={(e) => setAdForm({ ...adForm, destination_type: e.target.value })}>
                      <option value="url">Website URL</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="phone">Phone call</option>
                      <option value="email">Email</option>
                      <option value="internal">Internal page</option>
                    </select>
                  </div>
                  <div className="auth-field">
                    <label className="auth-label">{DESTINATION_LABELS[adForm.destination_type]}</label>
                    <input className="auth-input" value={adForm.destination_value}
                      onChange={(e) => setAdForm({ ...adForm, destination_value: e.target.value })} />
                  </div>

                  <div className="auth-field full-span" style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 4 }}>
                    <label className="auth-label" style={{ fontWeight: 700 }}>
                      Targeting (optional — leave blank on any field to show to everyone on that axis)
                    </label>
                  </div>
                  <div className="auth-field">
                    <label className="auth-label">Min age</label>
                    <input className="auth-input" type="number" min="0" value={adForm.target_age_min}
                      onChange={(e) => setAdForm({ ...adForm, target_age_min: e.target.value })} />
                  </div>
                  <div className="auth-field">
                    <label className="auth-label">Max age</label>
                    <input className="auth-input" type="number" min="0" value={adForm.target_age_max}
                      onChange={(e) => setAdForm({ ...adForm, target_age_max: e.target.value })} />
                  </div>
                  <div className="auth-field">
                    <label className="auth-label">Gender</label>
                    <select className="auth-input" value={adForm.target_gender}
                      onChange={(e) => setAdForm({ ...adForm, target_gender: e.target.value })}>
                      <option value="">Any</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="auth-field">
                    <label className="auth-label">Countries (comma-separated ISO codes)</label>
                    <input className="auth-input" placeholder="US, CA, GB" value={adForm.target_countries}
                      onChange={(e) => setAdForm({ ...adForm, target_countries: e.target.value })} />
                  </div>

                  <div className="auth-field full-span" style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 4 }}>
                    <label className="auth-label" style={{ fontWeight: 700 }}>Scheduling &amp; diversification</label>
                  </div>
                  <div className="auth-field">
                    <label className="auth-label">Start date</label>
                    <input className="auth-input" type="date" value={adForm.start_date}
                      onChange={(e) => setAdForm({ ...adForm, start_date: e.target.value })} />
                  </div>
                  <div className="auth-field">
                    <label className="auth-label">End date</label>
                    <input className="auth-input" type="date" value={adForm.end_date}
                      onChange={(e) => setAdForm({ ...adForm, end_date: e.target.value })} />
                  </div>
                  <div className="auth-field">
                    <label className="auth-label">Weight (higher = shown more vs other eligible ads)</label>
                    <input className="auth-input" type="number" min="1" value={adForm.weight}
                      onChange={(e) => setAdForm({ ...adForm, weight: e.target.value })} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                  <button className="gs-btn gs-btn-outline" onClick={cancelAdForm}>Cancel</button>
                  <button
                    className="gs-btn gs-btn-primary"
                    onClick={saveAd}
                    disabled={!adForm.name || !adForm.destination_value}
                  >
                    {editingAdId ? 'Save changes' : 'Create ad (as draft)'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="ad-manager-list">
            {ads.length === 0 && <div className="admin-empty">No ads yet — click "+ New Ad" to create one.</div>}
            {ads.map((ad) => (
              <div key={ad.id} className="ad-manager-row">
                {ad.image_url
                  ? <img className="ad-manager-thumb" src={ad.image_url} alt={ad.name} />
                  : <div className="ad-manager-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🖼️</div>
                }
                <div className="ad-manager-info">
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <strong>{ad.name}</strong>
                    <span className={`ad-status-badge status-${ad.status}`}>{ad.status}</span>
                  </div>
                  <div className="ad-manager-meta">
                    <span>{PLACEMENT_LABELS[ad.placement] || ad.placement}</span>
                    <span>· {ad.destination_type} → {ad.destination_value}</span>
                    {ad.advertiser_name && <span>· {ad.advertiser_name}</span>}
                  </div>
                  <div className="ad-manager-meta">
                    <span>👁 {ad.impression_count || 0} impressions</span>
                    <span>🖱 {ad.click_count || 0} clicks</span>
                    <span>
                      CTR {ad.impression_count ? ((ad.click_count / ad.impression_count) * 100).toFixed(1) : '0.0'}%
                    </span>
                    {(ad.target_age_min || ad.target_age_max || ad.target_gender || ad.target_countries) && (
                      <span>· 🎯 targeted</span>
                    )}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <UploadFile
                      apiextension={`/ads/${ad.id}/image`}
                      setInvestors={(updated) => setAds((prev) => prev.map((a) => a.id === updated.id ? updated : a))}
                    />
                  </div>
                </div>
                <div className="ad-manager-actions">
                  {ad.status !== 'active' && ad.status !== 'archived' && (
                    <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setAdStatus(ad.id, 'active')}>▶ Activate</button>
                  )}
                  {ad.status === 'active' && (
                    <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setAdStatus(ad.id, 'paused')}>⏸ Pause</button>
                  )}
                  {ad.status !== 'archived' && (
                    <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setAdStatus(ad.id, 'archived')}>🗄 Archive</button>
                  )}
                  <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => openEditAdForm(ad)}>✎ Edit</button>
                  {ad.status === 'draft' && (
                    <button className="gs-btn gs-btn-danger gs-btn-sm" onClick={() => deleteAd(ad.id)}>🗑 Delete</button>
                  )}
                  <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => toggleAdStats(ad.id)}>
                    📊 {expandedStatsAdId === ad.id ? 'Hide' : 'Detailed'} Stats
                  </button>
                </div>
                {expandedStatsAdId === ad.id && (
                  <div className="ad-stats-panel" style={{ width: '100%', marginTop: 12, padding: 12, background: 'var(--bg)', borderRadius: 8 }}>
                    {adStatsLoading && <div>Loading stats…</div>}
                    {adStats && adStats.error && <div className="gs-error-box">{adStats.error}</div>}
                    {adStats && !adStats.error && (
                      <>
                        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 12 }}>
                          <div><strong>{adStats.impressions}</strong> impressions</div>
                          <div><strong>{adStats.clicks}</strong> clicks</div>
                          <div><strong>{adStats.ctr_percent}%</strong> CTR</div>
                          <div><strong>{adStats.unique_logged_in_viewers}</strong> unique logged-in viewers</div>
                        </div>
                        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                          <div>
                            <div className="shtick-caption" style={{ marginBottom: 6 }}>Top Countries</div>
                            {adStats.top_countries.length === 0 && <div style={{ color: 'var(--muted)' }}>No geo data yet.</div>}
                            {adStats.top_countries.map((c) => (
                              <div key={c.country}>{c.country}: {c.impressions}</div>
                            ))}
                          </div>
                          <div>
                            <div className="shtick-caption" style={{ marginBottom: 6 }}>Last 30 Days</div>
                            {adStats.daily_trend_30d.length === 0 && <div style={{ color: 'var(--muted)' }}>No activity yet.</div>}
                            {adStats.daily_trend_30d.map((d) => (
                              <div key={d.date}>{d.date}: {d.impressions}</div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Content Pipeline (AI posts / news scrapers / YouTube channels) ──
          Stays mounted once loaded (hidden via CSS, not unmounted) so a
          generate/scrape/check run in progress keeps going — and its result
          is still there — if the admin switches to another tab and back. */}
      {!loading && (
        <div
          className="content-pipeline-panels"
          style={{ display: tab === 'content_pipeline' ? 'block' : 'none' }}
        >
          <section style={{ marginBottom: 32 }}>
            <h3 className="shtick-caption" style={{ marginBottom: 10 }}>🤖 AI-Generated Posts</h3>
            <AdminAiPosts />
          </section>
          <section style={{ marginBottom: 32 }}>
            <h3 className="shtick-caption" style={{ marginBottom: 10 }}>📰 News Scrapers</h3>
            <AdminScrapers />
          </section>
          <section>
            <h3 className="shtick-caption" style={{ marginBottom: 10 }}>▶️ YouTube Channels</h3>
            <AdminYoutubeChannels />
          </section>
        </div>
      )}

      {/* ── Analytics (visitor tracking, same stays-mounted pattern) ── */}
      {!loading && (
        <div style={{ display: tab === 'analytics' ? 'block' : 'none' }}>
          <AdminAnalytics />
        </div>
      )}

      {/* ── Categories ── */}
      {tab === 'categories' && !loading && (
        <div>
          {categoryMsg && <div className="gs-error-box">{categoryMsg}</div>}
          <p style={{ color: 'var(--muted)', marginBottom: 16 }}>
            These are the categories post authors can pick from when sharing a shtick.
            Add as many as you like — posters get a type-ahead search instead of a long list.
          </p>
          <form onSubmit={addCategory} style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
            <input
              className="gs-input"
              style={{ maxWidth: 260 }}
              placeholder="New category name…"
              maxLength={100}
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
            />
            <button type="submit" className="gs-btn gs-btn-primary gs-btn-sm" disabled={!newCategoryName.trim()}>
              + Add Category
            </button>
          </form>
          <div className="category-tag-list">
            {categories.map((c) => (
              <span key={c.id} className="category-tag" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                {c.name}
                <button type="button" onClick={() => deleteCategory(c)} title={`Delete ${c.name}`} style={{ background: 'var(--bg)', color: 'var(--muted)' }}>×</button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── User Activity ── */}
      {tab === 'activity' && !loading && activity && (
        <div className="sa-activity">
          <h2>Activity for: <b>{activity.user?.profile_name}</b></h2>
          <p style={{ color: 'var(--muted)' }}>{activity.user?.email} · Role: <b>{ROLE_LABELS[activity.user?.role]}</b></p>

          <div className="sa-activity-grid">
            <div className="sa-activity-section">
              <h4>Posts ({activity.shticks?.length})</h4>
              {activity.shticks?.map((s, i) => (
                <div key={i} className="sa-activity-item">
                  <span className={`admin-badge ${s.approved ? 'approved' : s.approved === false ? 'rejected' : 'pending'}`}>
                    {s.approved ? '✓' : s.approved === false ? '✕' : '⏳'}
                  </span>
                  <span>{s.caption}</span>
                  <span className="admin-date">{formatDate(s.pub_date)}</span>
                </div>
              ))}
            </div>

            <div className="sa-activity-section">
              <h4>Likes ({activity.likes?.length})</h4>
              {activity.likes?.slice(0, 20).map((l, i) => (
                <div key={i} className="sa-activity-item">
                  <span>Post #{l.shtick_id}</span>
                  <span className="admin-date">{formatDate(l.pub_date)}</span>
                </div>
              ))}
            </div>

            <div className="sa-activity-section">
              <h4>Comments ({activity.comments?.length})</h4>
              {activity.comments?.map((c, i) => (
                <div key={i} className="sa-activity-item">
                  <span>"{c.text.slice(0, 60)}{c.text.length > 60 ? '…' : ''}"</span>
                  <span className="admin-date">{formatDate(c.pub_date)}</span>
                </div>
              ))}
            </div>

            <div className="sa-activity-section">
              <h4>Game Scores ({activity.game_scores?.length})</h4>
              {activity.game_scores?.map((g, i) => (
                <div key={i} className="sa-activity-item">
                  <span>{g.game_type}</span>
                  <span className={`admin-badge ${g.result.startsWith('win') ? 'approved' : 'rejected'}`}>
                    {g.result}
                  </span>
                  <span>{g.score} pts</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
