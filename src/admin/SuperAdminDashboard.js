import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import { isSuperAdmin, getPublicId } from '../auth';
import { siteUrl, listAllSites } from '../siteMode';
import UploadFile from '../Uploadfile';
import AdminAiPosts from './AdminAiPosts';
import AdminScrapers from './AdminScrapers';
import AdminYoutubeChannels from './AdminYoutubeChannels';
import AdminAnalytics from './AdminAnalytics';
import AdminBusinessAnalytics from './AdminBusinessAnalytics';
import AdminAlertSchedule from './AdminAlertSchedule';
import AdminSiteBanner from './AdminSiteBanner';
import {
  ShieldCheck, LayoutDashboard, Search, Users, CheckCircle2, Megaphone, Bell, Flag, Tag,
  ScrollText, Bot, LineChart, Store, UserSearch, Newspaper, MessagesSquare, MessageCircle,
  Briefcase, Home, BookOpen, ImageOff, Eye, MousePointerClick, Target, Archive, Pencil,
  Trash2, BarChart3, Undo2, Check, X, Clock, UserCircle2, Play, Pause, Heart, Gamepad2, Plus,
  LogIn,
} from 'lucide-react';

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

// One entry per site, listing every page/placement that site can show an ad
// on -- this is what lets a SuperAdmin put one ad on one or many pages
// across any of the 5 sites. `kind` just labels whether that spot is a
// fixed single banner or a repeating in-thread slot inside a scrolling
// list; it doesn't change how targeting works, only how it's described here.
const PLACEMENT_GROUPS = [
  { site: 'Gut Shtick', items: [
    { value: 'top', label: 'Home — top banner', kind: 'fixed' },
    { value: 'bottom', label: 'Home — bottom banner', kind: 'fixed' },
    { value: 'sidebar_left', label: 'Sidebar — left', kind: 'fixed' },
    { value: 'sidebar_right', label: 'Sidebar — right', kind: 'fixed' },
    { value: 'feed', label: 'Feed (Hock + Shtick board)', kind: 'in-thread' },
    { value: 'games_hub', label: 'Games Hub banner', kind: 'fixed' },
    { value: 'game_page', label: 'In-Game banner (while playing)', kind: 'fixed' },
  ]},
  { site: 'Gut Community', items: [
    { value: 'business_directory', label: 'Business directory', kind: 'in-thread' },
    { value: 'deals_feed', label: 'Deals feed', kind: 'in-thread' },
  ]},
  { site: 'Gut Estates', items: [
    { value: 'estates_listings', label: 'Property listings', kind: 'in-thread' },
    { value: 'estates_group_buy', label: 'Group buy listings', kind: 'in-thread' },
  ]},
  { site: 'Gut Money', items: [
    { value: 'tachlis_board', label: 'Job Board', kind: 'in-thread' },
  ]},
  { site: 'Gut Torah', items: [
    { value: 'torah_feed', label: 'Posts feed', kind: 'in-thread' },
  ]},
];
const PLACEMENT_LABELS = Object.fromEntries(
  PLACEMENT_GROUPS.flatMap((g) => g.items.map((it) => [it.value, it.label]))
);

const EMPTY_AD_FORM = {
  name: '', advertiser_name: '', headline: '', body_text: '', cta_label: 'Learn More',
  destination_type: 'url', destination_value: '', allPages: true, placements: [],
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

const EMPTY_PAGE_META = { page: 1, total: 0, per_page: 50, has_more: false };

/** Simple prev/next pager shown under a paginated list -- same meta shape
 * (`{page, total, per_page, has_more}`) returned by /admin/users,
 * /admin/approvals, /ads, and /admin/audit-log. */
function Pager({ meta, onPage, loading }) {
  if (!meta.total) return null;
  const start = (meta.page - 1) * meta.per_page + 1;
  const end = Math.min(meta.page * meta.per_page, meta.total);
  return (
    <div className="sa-pager" style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
      <button className="gs-btn gs-btn-outline gs-btn-sm" disabled={loading || meta.page <= 1}
        onClick={() => onPage(meta.page - 1)}>← Prev</button>
      <span style={{ fontSize: 13, color: 'var(--muted)' }}>
        {start}–{end} of {meta.total}
      </span>
      <button className="gs-btn gs-btn-outline gs-btn-sm" disabled={loading || !meta.has_more}
        onClick={() => onPage(meta.page + 1)}>Next →</button>
    </div>
  );
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const myPublicId = getPublicId();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState('');
  const [users, setUsers] = useState([]);
  const [usersMeta, setUsersMeta] = useState(EMPTY_PAGE_META);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [approvals, setApprovals] = useState([]);
  const [approvalsMeta, setApprovalsMeta] = useState(EMPTY_PAGE_META);
  const [approvalsLoading, setApprovalsLoading] = useState(false);
  const [approvalsError, setApprovalsError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const [auditLog, setAuditLog] = useState(null);
  const [auditLogMeta, setAuditLogMeta] = useState(EMPTY_PAGE_META);
  const [auditLogLoading, setAuditLogLoading] = useState(false);
  const [auditLogError, setAuditLogError] = useState('');

  const [loginLog, setLoginLog] = useState(null);
  const [loginLogMeta, setLoginLogMeta] = useState(EMPTY_PAGE_META);
  const [loginLogLoading, setLoginLogLoading] = useState(false);
  const [loginLogError, setLoginLogError] = useState('');
  const [loginLogDays, setLoginLogDays] = useState(30);
  const [loginLogSite, setLoginLogSite] = useState('');
  const [loginLogSuccess, setLoginLogSuccess] = useState('');
  const [loginLogSearchInput, setLoginLogSearchInput] = useState('');
  const [loginLogSearch, setLoginLogSearch] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const [ads, setAds] = useState([]);
  const [adsMeta, setAdsMeta] = useState(EMPTY_PAGE_META);
  const [adsLoading, setAdsLoading] = useState(false);
  const [adsError, setAdsError] = useState('');
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
  const [categoriesError, setCategoriesError] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryMsg, setCategoryMsg] = useState('');

  useEffect(() => {
    if (!isSuperAdmin()) { navigate('/'); return; }
    loadAll();
  }, []);

  useEffect(() => {
    if (tab === 'audit_log' && auditLog === null) {
      loadAuditLog(1);
    }
  }, [tab]);

  // Debounce the login log email search the same way the global Search tab
  // debounces its query (350ms) -- see searchQuery below.
  useEffect(() => {
    const t = setTimeout(() => setLoginLogSearch(loginLogSearchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [loginLogSearchInput]);

  // Reload page 1 whenever the tab becomes active or any filter changes --
  // same "filters reset to page 1" pattern AdminAnalytics.js uses for its
  // session list.
  useEffect(() => {
    if (tab === 'login_log') loadLoginLog(1);
  }, [tab, loginLogDays, loginLogSite, loginLogSuccess, loginLogSearch]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Each section loads/fails independently (Promise.allSettled, not
  // Promise.all) -- one endpoint being down (e.g. /ads) used to blank the
  // ENTIRE dashboard since all 5 shared one try/catch. Now a failure only
  // empties that one section's own state, with its own error message shown
  // only in that tab, while every other tab's data still loads normally.
  async function loadAll() {
    setLoading(true);
    await Promise.allSettled([
      loadStats(),
      loadUsers(1, roleFilter),
      loadApprovals(1),
      loadAds(1),
      loadCategories(),
    ]);
    setLoading(false);
  }

  async function loadStats() {
    try {
      const s = await apiRequest('GET', null, '/admin/stats');
      setStats(s);
      setStatsError('');
    } catch (e) {
      setStatsError(typeof e === 'string' ? e : 'Failed to load platform stats.');
    }
  }

  async function loadUsers(page = 1, role = roleFilter) {
    setUsersLoading(true);
    try {
      const qs = role && role !== 'all' ? `&role=${encodeURIComponent(role)}` : '';
      const data = await apiRequest('GET', null, `/admin/users?page=${page}${qs}`);
      setUsers(data.items || []);
      setUsersMeta({ page: data.page, total: data.total, per_page: data.per_page, has_more: data.has_more });
      setUsersError('');
    } catch (e) {
      setUsersError(typeof e === 'string' ? e : 'Failed to load users.');
    } finally {
      setUsersLoading(false);
    }
  }

  async function loadApprovals(page = 1) {
    setApprovalsLoading(true);
    try {
      const data = await apiRequest('GET', null, `/admin/approvals?page=${page}`);
      setApprovals(data.items || []);
      setApprovalsMeta({ page: data.page, total: data.total, per_page: data.per_page, has_more: data.has_more });
      setApprovalsError('');
    } catch (e) {
      setApprovalsError(typeof e === 'string' ? e : 'Failed to load approval history.');
    } finally {
      setApprovalsLoading(false);
    }
  }

  async function loadAds(page = 1) {
    setAdsLoading(true);
    try {
      const data = await apiRequest('GET', null, `/ads?page=${page}`);
      setAds(data.items || []);
      setAdsMeta({ page: data.page, total: data.total, per_page: data.per_page, has_more: data.has_more });
      setAdsError('');
    } catch (e) {
      setAdsError(typeof e === 'string' ? e : 'Failed to load ads.');
    } finally {
      setAdsLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const cats = await apiRequest('GET', null, '/generalc');
      setCategories(cats);
      setCategoriesError('');
    } catch (e) {
      setCategoriesError(typeof e === 'string' ? e : 'Failed to load categories.');
    }
  }

  async function loadAuditLog(page = 1) {
    setAuditLogLoading(true);
    try {
      const data = await apiRequest('GET', null, `/admin/audit-log?page=${page}`);
      setAuditLog(data.items || []);
      setAuditLogMeta({ page: data.page, total: data.total, per_page: data.per_page, has_more: data.has_more });
      setAuditLogError('');
    } catch (e) {
      setAuditLogError(typeof e === 'string' ? e : 'Failed to load audit log.');
    } finally {
      setAuditLogLoading(false);
    }
  }

  async function loadLoginLog(page = 1) {
    setLoginLogLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (loginLogDays) params.set('days', String(loginLogDays));
      if (loginLogSite) params.set('site', loginLogSite);
      if (loginLogSuccess !== '') params.set('success', loginLogSuccess);
      if (loginLogSearch) params.set('q', loginLogSearch);
      const data = await apiRequest('GET', null, `/admin/login-log?${params.toString()}`);
      setLoginLog(data.items || []);
      setLoginLogMeta({ page: data.page, total: data.total, per_page: data.per_page, has_more: data.has_more });
      setLoginLogError('');
    } catch (e) {
      setLoginLogError(typeof e === 'string' ? e : 'Failed to load login log.');
    } finally {
      setLoginLogLoading(false);
    }
  }

  async function unapproveShtick(id) {
    if (!window.confirm('Send this post back to the pending queue?')) return;
    await apiRequest('POST', null, `/admin/shtick/${id}/unapprove`);
    setApprovals((a) => a.filter((s) => s.id !== id));
    setApprovalsMeta((m) => ({ ...m, total: Math.max(0, m.total - 1) }));
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
      allPages: !ad.placements,
      placements: ad.placements ? ad.placements.split(',') : [],
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

  function toggleAdPlacement(value) {
    setAdForm((prev) => ({
      ...prev,
      placements: prev.placements.includes(value)
        ? prev.placements.filter((p) => p !== value)
        : [...prev.placements, value],
    }));
  }

  async function saveAd() {
    const { allPages, ...rest } = adForm;
    const body = {
      ...rest,
      placements: allPages ? [] : adForm.placements,
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
        await apiRequest('POST', body, '/ads');
        // Reload page 1 rather than prepending locally -- a new ad always
        // sorts to the top of the newest-first list, but prepending into
        // whatever page the admin happens to be viewing would show it in
        // the wrong place (or duplicate it) on any page beyond the first.
        await loadAds(1);
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
      setAdsMeta((m) => ({ ...m, total: Math.max(0, m.total - 1) }));
    } catch (e) {
      setAdMsg(typeof e === 'string' ? e : 'Failed to delete ad');
    }
  }

  async function changeRole(publicId, newRole) {
    // Self-lockout guard: the role <select> on your OWN row is disabled
    // (see the Users table render below) so this path shouldn't normally
    // be reachable for your own account -- but this stays as a defensive
    // backstop in case that ever changes. The useEffect above redirects
    // out of this whole dashboard the instant isSuperAdmin() goes false,
    // so a self-demotion otherwise has no undo from here.
    if (publicId === myPublicId) {
      setMsg("You can't change your own role from here — ask another Super Admin.");
      return;
    }
    // Granting super_admin hands over full platform control -- a raw <select>
    // is one misclick away from doing that to the wrong account, with no
    // undo. Every other role change is much lower-stakes and stays a single
    // click, matching how the rest of this dashboard only confirms the
    // genuinely destructive/high-blast-radius actions.
    if (newRole === 'super_admin') {
      const target = users.find((u) => u.public_id === publicId);
      const ok = window.confirm(`Make ${target?.profile_name || 'this user'} a Super Admin? They'll get full platform control, including this same ability to change anyone else's role.`);
      if (!ok) return;
    }
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

  // Prepend "All sites" the same way AdminAnalytics.js's own site dropdown
  // does, over the real registry list (listAllSites()) instead of a
  // hand-copied array.
  const loginLogSites = [{ id: '', label: 'All sites' }, ...listAllSites()];

  return (
    <div className="admin-page superadmin-page">
      <div className="admin-header">
        <h1><ShieldCheck size={24} /> Super Admin</h1>
        <p>Full platform control — users, roles, analytics, approval history.</p>
      </div>

      {msg && <div className="gs-success-box">{msg}</div>}

      <div className="admin-tabs">
        {[
          ['overview', LayoutDashboard, 'Overview'],
          ['search', Search, 'Search'],
          ['users', Users, `Users (${usersMeta.total})`],
          ['approvals', CheckCircle2, `Approval History (${approvalsMeta.total})`],
          ['ads', Megaphone, `Ads (${adsMeta.total})`],
          ['alerts', Bell, 'Alerts'],
          ['banner', Flag, 'Banner'],
          ['categories', Tag, `Categories (${categories.length})`],
          ['audit_log', ScrollText, 'Audit Log'],
          ['login_log', LogIn, 'Login Log'],
          ['content_pipeline', Bot, 'Content Pipeline'],
          ['analytics', LineChart, 'Analytics'],
          ['business_analytics', Store, 'Business'],
          ['activity', UserSearch, selectedUser ? selectedUser.profile_name : 'Activity'],
        ].map(([key, Icon, label]) => (
          <button key={key} className={`admin-tab${tab === key ? ' active' : ''}`} onClick={() => setTab(key)}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ── Search (checks id/title/body/category/submitted-by across every
          table: Feed posts+comments, Hock posts+comments, Tachlis posts, Users,
          Business listings, Estates listings, Torah posts, Ads) ── */}
      {tab === 'search' && (
        <div>
          <input
            type="text"
            className="auth-input games-search-input"
            style={{ marginBottom: 16, maxWidth: 480 }}
            placeholder="Search everything by id, title, body, category, or submitted by…"
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
                  <h3 className="admin-section-label"><Newspaper size={16} /> Feed Posts ({searchResults.shticks.length})</h3>
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
                  <h3 className="admin-section-label"><MessagesSquare size={16} /> Hock Posts ({searchResults.hock_posts.length})</h3>
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
                  <h3 className="admin-section-label"><MessageCircle size={16} /> Hock Comments ({searchResults.hock_comments.length})</h3>
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
                  <h3 className="admin-section-label"><Briefcase size={16} /> Job Board Posts ({searchResults.tachlis_posts.length})</h3>
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
                        <a href={siteUrl('money', `/tachlis/post/${t.id}`)} target="_blank" rel="noopener noreferrer">View on site ↗</a>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {searchResults.comments.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h3 className="admin-section-label"><MessageCircle size={16} /> Feed Comments ({searchResults.comments.length})</h3>
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
                  <h3 className="admin-section-label"><Users size={16} /> Users ({searchResults.users.length})</h3>
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

              {searchResults.businesses.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h3 className="admin-section-label"><Store size={16} /> Business Listings ({searchResults.businesses.length})</h3>
                  {searchResults.businesses.map((b) => (
                    <div key={b.id} className="admin-card" style={{ borderLeft: '4px solid #6366f1' }}>
                      <div className="admin-card-top">
                        <span className="admin-badge pending">{b.category}</span>
                        <span className="admin-date">{new Date(b.pub_date).toLocaleDateString()} <span style={{ fontSize: 11 }}>#{b.id}</span></span>
                      </div>
                      <h3 className="admin-caption">{b.name}</h3>
                      <div className="admin-card-meta">
                        <span>Added by: <b>{b.submitted_by || 'Unknown'}</b></span>
                        {' · '}
                        <a href={siteUrl('business', `/business/${b.slug}`)} target="_blank" rel="noopener noreferrer">View on site ↗</a>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {searchResults.estates_listings.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h3 className="admin-section-label"><Home size={16} /> Estates Listings ({searchResults.estates_listings.length})</h3>
                  {searchResults.estates_listings.map((e) => (
                    <div key={e.id} className="admin-card" style={{ borderLeft: '4px solid #6366f1' }}>
                      <div className="admin-card-top">
                        <span className="admin-badge pending">{e.listing_type}</span>
                        <span className="admin-date">{new Date(e.pub_date).toLocaleDateString()} <span style={{ fontSize: 11 }}>#{e.id}</span></span>
                      </div>
                      <h3 className="admin-caption">{e.title}</h3>
                      <div className="admin-card-meta">
                        <span>{[e.neighborhood, e.city].filter(Boolean).join(', ') || 'No location'} · By: <b>{e.submitted_by || 'Unknown'}</b></span>
                        {' · '}
                        <a href={siteUrl('estates', `/listings/${e.slug}`)} target="_blank" rel="noopener noreferrer">View on site ↗</a>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {searchResults.torah_posts.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h3 className="admin-section-label"><BookOpen size={16} /> Torah Posts ({searchResults.torah_posts.length})</h3>
                  {searchResults.torah_posts.map((t) => (
                    <div key={t.id} className="admin-card" style={{ borderLeft: '4px solid #6366f1' }}>
                      <div className="admin-card-top">
                        <span className="admin-badge pending">{t.category}</span>
                        <span className="admin-date">{new Date(t.pub_date).toLocaleDateString()} <span style={{ fontSize: 11 }}>#{t.id}</span></span>
                      </div>
                      <h3 className="admin-caption">{t.title}</h3>
                      <div className="admin-card-meta">
                        <span>By: <b>{t.submitted_by || 'Unknown'}</b></span>
                        {' · '}
                        <a href={siteUrl('torah', `/posts/${t.slug}`)} target="_blank" rel="noopener noreferrer">View on site ↗</a>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {searchResults.ads.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h3 className="admin-section-label"><Megaphone size={16} /> Ads ({searchResults.ads.length})</h3>
                  {searchResults.ads.map((a) => (
                    <div key={a.id} className="admin-card" style={{ cursor: 'pointer' }} onClick={() => setTab('ads')}>
                      <div className="admin-card-top">
                        <span className={`ad-status-badge status-${a.status}`}>{a.status}</span>
                        <span className="admin-date">{new Date(a.pub_date).toLocaleDateString()} <span style={{ fontSize: 11 }}>#{a.id}</span></span>
                      </div>
                      <h3 className="admin-caption">{a.name}</h3>
                      <div className="admin-card-meta">
                        {a.headline && <span>"{a.headline}" · </span>}
                        <span>Advertiser: <b>{a.advertiser_name || 'Unknown'}</b></span>
                        {' · '}
                        <span style={{ textDecoration: 'underline' }}>Go to Ads tab ↗</span>
                      </div>
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
      {tab === 'overview' && !loading && statsError && (
        <div className="gs-error-box">{statsError}</div>
      )}
      {tab === 'overview' && stats && !loading && (
        <div className="superadmin-stats-grid">
          <div className="sa-stat-card blue">
            <Users size={18} className="sa-stat-icon" />
            <div className="sa-stat-num">{stats.users}</div>
            <div className="sa-stat-label">Total Users</div>
          </div>
          <div className="sa-stat-card amber">
            <Clock size={18} className="sa-stat-icon" />
            <div className="sa-stat-num">{stats.shticks?.pending}</div>
            <div className="sa-stat-label">Pending Posts</div>
          </div>
          <div className="sa-stat-card green">
            <CheckCircle2 size={18} className="sa-stat-icon" />
            <div className="sa-stat-num">{stats.shticks?.approved}</div>
            <div className="sa-stat-label">Approved Posts</div>
          </div>
          <div className="sa-stat-card purple">
            <MessageCircle size={18} className="sa-stat-icon" />
            <div className="sa-stat-num">{stats.comments}</div>
            <div className="sa-stat-label">Comments</div>
          </div>
          <div className="sa-stat-card red">
            <Heart size={18} className="sa-stat-icon" />
            <div className="sa-stat-num">{stats.likes}</div>
            <div className="sa-stat-label">Total Likes</div>
          </div>
          <div className="sa-stat-card teal">
            <Gamepad2 size={18} className="sa-stat-icon" />
            <div className="sa-stat-num">{stats.game_sessions}</div>
            <div className="sa-stat-label">Game Sessions</div>
          </div>
        </div>
      )}

      {/* ── Users ── */}
      {tab === 'users' && !loading && (
        <div>
          {usersError && <div className="gs-error-box">{usersError}</div>}
          <div className="sa-user-filters">
            {['all', ...ROLES].map((r) => (
              <button key={r} className={`difficulty-btn${roleFilter === r ? ' active' : ''}`}
                disabled={usersLoading}
                onClick={() => { setRoleFilter(r); loadUsers(1, r); }}>
                {r === 'all' ? 'All' : ROLE_LABELS[r]}
              </button>
            ))}
          </div>
          {usersLoading && <div className="gs-loading"><div className="gs-spinner" /></div>}
          {!usersLoading && (
            <div className="sa-user-table">
              <div className="sa-user-row header">
                <span>User</span><span>Email</span><span>Role</span><span>Posts</span><span>Joined</span><span>Actions</span>
              </div>
              {users.map((u) => {
                const isSelf = u.public_id === myPublicId;
                return (
                  <div key={u.public_id} className="sa-user-row">
                    <span className="sa-profile">
                      <div className="shtick-author-avatar" style={{ width: 30, height: 30, fontSize: 12 }}>
                        {u.profile_name?.charAt(0).toUpperCase()}
                      </div>
                      {u.profile_name}{isSelf && ' (you)'}
                    </span>
                    <span>{u.email}</span>
                    <span>
                      <select
                        value={u.role}
                        onChange={(e) => changeRole(u.public_id, e.target.value)}
                        className="sa-role-select"
                        style={{ borderColor: ROLE_COLOR[u.role] }}
                        disabled={isSelf}
                        title={isSelf ? "You can't change your own role here — ask another Super Admin." : undefined}
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
                );
              })}
            </div>
          )}
          <Pager meta={usersMeta} loading={usersLoading} onPage={(p) => loadUsers(p, roleFilter)} />
        </div>
      )}

      {/* ── Approval History ── */}
      {tab === 'approvals' && !loading && (
        <div className="admin-list">
          {approvalsError && <div className="gs-error-box">{approvalsError}</div>}
          {approvalsLoading && <div className="gs-loading"><div className="gs-spinner" /></div>}
          {!approvalsLoading && approvals.length === 0 && <div className="admin-empty">No approvals yet.</div>}
          {!approvalsLoading && approvals.map((s) => (
            <div key={s.id} className="admin-card">
              <div className="admin-card-top">
                <span className={`admin-badge ${s.approved_to_publish ? 'approved' : 'rejected'}`}>
                  {s.approved_to_publish ? <><Check size={12} /> Approved</> : <><X size={12} /> Rejected</>}
                </span>
                <span className="admin-date">{formatDate(s.pub_date)} <span style={{ fontSize: 11 }} title="Post ID">#{s.id}</span></span>
              </div>
              <h3 className="admin-caption">{s.caption}</h3>
              <div className="admin-card-meta">
                <span>Submitted by: <b>{s.user?.profile_name || s.user_id}</b></span>
                {s.approver && <span> · Decision by: <b>{s.approver.profile_name}</b></span>}
              </div>
              <div className="admin-actions">
                <button className="gs-btn gs-btn-sm" onClick={() => unapproveShtick(s.id)}><Undo2 size={13} /> Unapprove</button>
              </div>
            </div>
          ))}
          {!approvalsLoading && <Pager meta={approvalsMeta} loading={approvalsLoading} onPage={(p) => loadApprovals(p)} />}
        </div>
      )}

      {/* ── Ads ── */}
      {tab === 'ads' && !loading && (
        <div>
          {adMsg && <div className="gs-success-box">{adMsg}</div>}
          {adsError && <div className="gs-error-box">{adsError}</div>}

          <div className="ad-manager-toolbar">
            <h3 style={{ margin: 0 }}>Advertisements</h3>
            {!adForm && (
              <button className="gs-btn gs-btn-primary gs-btn-sm" onClick={openNewAdForm}><Plus size={14} /> New Ad</button>
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
                    <label className="auth-label" style={{ fontWeight: 700 }}>Pages</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 13 }}>
                      <input type="checkbox" checked={adForm.allPages}
                        onChange={(e) => setAdForm({ ...adForm, allPages: e.target.checked })} />
                      All pages (every site, every placement)
                    </label>
                    {!adForm.allPages && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginTop: 10 }}>
                        {PLACEMENT_GROUPS.map((group) => (
                          <div key={group.site} style={{ minWidth: 180 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>{group.site}</div>
                            {group.items.map((item) => (
                              <label key={item.value} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 4 }}>
                                <input type="checkbox" checked={adForm.placements.includes(item.value)}
                                  onChange={() => toggleAdPlacement(item.value)} />
                                {item.label}
                                <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                                  {item.kind === 'in-thread' ? '(in-thread)' : '(fixed)'}
                                </span>
                              </label>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                    {!adForm.allPages && adForm.placements.length === 0 && (
                      // Unchecking "All pages" but selecting zero specific
                      // placements would send placements: [] -- which the
                      // backend (and every other consumer of this field)
                      // treats as NULL, i.e. "all placements" again. That's
                      // the exact opposite of what narrowing to zero pages
                      // was trying to do, so block it rather than let it
                      // submit silently (see the Save button's disabled
                      // check below).
                      <div className="gs-error-box" style={{ marginTop: 10 }}>
                        Select at least one page/placement, or leave "All pages" checked —
                        zero placements selected would actually show this ad on EVERY page.
                      </div>
                    )}
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
                    disabled={!adForm.name || !adForm.destination_value
                      || (!adForm.allPages && adForm.placements.length === 0)}
                  >
                    {editingAdId ? 'Save changes' : 'Create ad (as draft)'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {adsLoading && <div className="gs-loading"><div className="gs-spinner" /></div>}
          <div className="ad-manager-list">
            {!adsLoading && ads.length === 0 && <div className="admin-empty">No ads yet — click "New Ad" to create one.</div>}
            {!adsLoading && ads.map((ad) => (
              <div key={ad.id} className="ad-manager-row">
                {ad.image_url
                  ? <img className="ad-manager-thumb" src={ad.image_url} alt={ad.name} />
                  : <div className="ad-manager-thumb ad-manager-thumb-empty"><ImageOff size={20} /></div>
                }
                <div className="ad-manager-info">
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <strong>{ad.name}</strong>
                    <span className={`ad-status-badge status-${ad.status}`}>{ad.status}</span>
                  </div>
                  <div className="ad-manager-meta">
                    <span>
                      {ad.placements
                        ? ad.placements.split(',').map((p) => PLACEMENT_LABELS[p] || p).join(', ')
                        : 'All pages'}
                    </span>
                    <span>· {ad.destination_type} → {ad.destination_value}</span>
                    {ad.advertiser_name && <span>· {ad.advertiser_name}</span>}
                  </div>
                  <div className="ad-manager-meta">
                    <span><Eye size={13} /> {ad.impression_count || 0} impressions</span>
                    <span><MousePointerClick size={13} /> {ad.click_count || 0} clicks</span>
                    <span>
                      CTR {ad.impression_count ? ((ad.click_count / ad.impression_count) * 100).toFixed(1) : '0.0'}%
                    </span>
                    {(ad.target_age_min || ad.target_age_max || ad.target_gender || ad.target_countries) && (
                      <span><Target size={13} /> targeted</span>
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
                    <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setAdStatus(ad.id, 'active')}><Play size={13} /> Activate</button>
                  )}
                  {ad.status === 'active' && (
                    <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setAdStatus(ad.id, 'paused')}><Pause size={13} /> Pause</button>
                  )}
                  {ad.status !== 'archived' && (
                    <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setAdStatus(ad.id, 'archived')}><Archive size={13} /> Archive</button>
                  )}
                  <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => openEditAdForm(ad)}><Pencil size={13} /> Edit</button>
                  {ad.status === 'draft' && (
                    <button className="gs-btn gs-btn-danger gs-btn-sm" onClick={() => deleteAd(ad.id)}><Trash2 size={13} /> Delete</button>
                  )}
                  <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => toggleAdStats(ad.id)}>
                    <BarChart3 size={13} /> {expandedStatsAdId === ad.id ? 'Hide' : 'Detailed'} Stats
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
          {!adsLoading && <Pager meta={adsMeta} loading={adsLoading} onPage={(p) => loadAds(p)} />}
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
            <h3 className="shtick-caption admin-section-label" style={{ marginBottom: 10 }}><Bot size={17} /> AI-Generated Posts</h3>
            <AdminAiPosts />
          </section>
          <section style={{ marginBottom: 32 }}>
            <h3 className="shtick-caption admin-section-label" style={{ marginBottom: 10 }}><Newspaper size={17} /> News Scrapers</h3>
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

      {/* ── Business site analytics ── */}
      {!loading && (
        <div style={{ display: tab === 'business_analytics' ? 'block' : 'none' }}>
          <AdminBusinessAnalytics />
        </div>
      )}

      {/* ── Alerts (digest schedule) ── */}
      {!loading && (
        <div style={{ display: tab === 'alerts' ? 'block' : 'none' }}>
          <AdminAlertSchedule />
        </div>
      )}

      {/* ── Site-wide announcement banner ── */}
      {!loading && (
        <div style={{ display: tab === 'banner' ? 'block' : 'none' }}>
          <AdminSiteBanner />
        </div>
      )}

      {/* ── Categories ── */}
      {tab === 'categories' && !loading && (
        <div>
          {categoryMsg && <div className="gs-error-box">{categoryMsg}</div>}
          {categoriesError && <div className="gs-error-box">{categoriesError}</div>}
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

      {/* ── Audit Log (who did what, when -- role changes, ad status changes/
          deletion, category deletion, unapproving a post; see
          backend/user/modals/audit_log.py's log_admin_action) ── */}
      {tab === 'audit_log' && !loading && (
        <div className="admin-list">
          {auditLogError && <div className="gs-error-box">{auditLogError}</div>}
          {auditLogLoading && <div className="gs-loading"><div className="gs-spinner" /></div>}
          {!auditLogLoading && auditLog && auditLog.length === 0 && (
            <div className="admin-empty">No logged actions yet.</div>
          )}
          {!auditLogLoading && auditLog && auditLog.map((l) => (
            <div key={l.id} className="admin-card">
              <div className="admin-card-top">
                <span className="admin-badge pending">{l.action}</span>
                <span className="admin-date">{new Date(l.created_at).toLocaleString()}</span>
              </div>
              <div className="admin-card-meta">
                <span>By: <b>{l.actor_name || l.actor_public_id || 'Unknown'}</b></span>
                {l.target_type && <span> · Target: <b>{l.target_type}{l.target_id ? ` #${l.target_id}` : ''}</b></span>}
              </div>
              {l.details && <p style={{ margin: '6px 0', color: 'var(--muted)' }}>{l.details}</p>}
            </div>
          ))}
          {!auditLogLoading && auditLog && <Pager meta={auditLogMeta} loading={auditLogLoading} onPage={(p) => loadAuditLog(p)} />}
        </div>
      )}

      {/* ── Login Log (every login attempt -- password + cross-site SSO
          exchange -- across every sub-site; see backend/user/routes/sso.py
          and the login route) ── */}
      {tab === 'login_log' && !loading && (
        <div className="admin-list">
          {loginLogError && <div className="gs-error-box">{loginLogError}</div>}

          <div className="sa-user-filters" style={{ alignItems: 'center' }}>
            <select className="gs-select" value={loginLogDays} onChange={(e) => setLoginLogDays(Number(e.target.value))}>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <select className="gs-select" value={loginLogSite} onChange={(e) => setLoginLogSite(e.target.value)}>
              {loginLogSites.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            {[
              { key: '', label: 'All' },
              { key: '1', label: 'Success' },
              { key: '0', label: 'Failed' },
            ].map((o) => (
              <button key={o.key} className={`difficulty-btn${loginLogSuccess === o.key ? ' active' : ''}`}
                onClick={() => setLoginLogSuccess(o.key)}>
                {o.label}
              </button>
            ))}
            <input
              type="text"
              className="auth-input games-search-input"
              style={{ maxWidth: 220 }}
              placeholder="Search by email…"
              value={loginLogSearchInput}
              onChange={(e) => setLoginLogSearchInput(e.target.value)}
            />
          </div>

          {loginLogLoading && <div className="gs-loading"><div className="gs-spinner" /></div>}
          {!loginLogLoading && loginLog && loginLog.length === 0 && (
            <div className="admin-empty">No login attempts match these filters.</div>
          )}
          {!loginLogLoading && loginLog && loginLog.map((l) => {
            const siteLabel = l.site ? (loginLogSites.find((s) => s.id === l.site)?.label || l.site) : 'Unknown';
            const methodLabel = l.method === 'password' ? 'Password' : l.method === 'sso_exchange' ? 'Site switch' : (l.method || 'Unknown');
            return (
              <div key={l.id} className="admin-card">
                <div className="admin-card-top">
                  <span className={`admin-badge ${l.success ? 'approved' : 'pending'}`}>
                    {l.success ? 'Success' : 'Failed'}
                  </span>
                  <span className="admin-date">{new Date(l.created_at).toLocaleString()}</span>
                </div>
                <div className="admin-card-meta">
                  <span>{l.email_attempted || l.user_id || 'Unknown'}</span>
                  {' · '}
                  <span>{siteLabel}</span>
                  {' · '}
                  <span>{methodLabel}</span>
                  {l.ip_address && <> · <span>{l.ip_address}</span></>}
                </div>
              </div>
            );
          })}
          {!loginLogLoading && loginLog && <Pager meta={loginLogMeta} loading={loginLogLoading} onPage={(p) => loadLoginLog(p)} />}
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
                    {s.approved ? <Check size={11} /> : s.approved === false ? <X size={11} /> : <Clock size={11} />}
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
