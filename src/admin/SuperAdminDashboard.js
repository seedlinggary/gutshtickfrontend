import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import { isSuperAdmin } from '../auth';

const ROLES = ['viewer', 'user', 'admin', 'super_admin'];
const ROLE_LABELS = { viewer: 'Viewer', user: 'User', admin: 'Admin', super_admin: 'Super Admin' };
const ROLE_COLOR = { viewer: '#94a3b8', user: '#3b82f6', admin: '#f59e0b', super_admin: '#ef4444' };

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

  useEffect(() => {
    if (!isSuperAdmin()) { navigate('/'); return; }
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [s, u, a] = await Promise.all([
        apiRequest('GET', null, '/admin/stats'),
        apiRequest('GET', null, '/admin/users'),
        apiRequest('GET', null, '/admin/approvals'),
      ]);
      setStats(s);
      setUsers(u);
      setApprovals(a);
    } catch (e) {
      setMsg(typeof e === 'string' ? e : 'Failed to load');
    } finally {
      setLoading(false);
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
          ['users', `👥 Users (${users.length})`],
          ['approvals', '✅ Approval History'],
          ['activity', selectedUser ? `🔍 ${selectedUser.profile_name}` : '🔍 Activity'],
        ].map(([key, label]) => (
          <button key={key} className={`admin-tab${tab === key ? ' active' : ''}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

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
                <span className="admin-date">{formatDate(s.pub_date)}</span>
              </div>
              <h3 className="admin-caption">{s.caption}</h3>
              <div className="admin-card-meta">
                <span>Submitted by: <b>{s.user?.profile_name || s.user_id}</b></span>
                {s.approver && <span> · Decision by: <b>{s.approver.profile_name}</b></span>}
              </div>
            </div>
          ))}
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
