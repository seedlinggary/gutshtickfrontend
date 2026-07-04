import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import { isAdmin } from '../auth';
import ShowUrl from '../feed/ShowURL';

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('pending');
  const [pending, setPending] = useState([]);
  const [allShticks, setAllShticks] = useState([]);
  const [rejected, setRejected] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!isAdmin()) { navigate('/'); return; }
    loadTab(tab);
  }, [tab]);

  async function loadTab(t) {
    setLoading(true);
    setMsg('');
    try {
      if (t === 'pending') setPending(await apiRequest('GET', null, '/admin/pending'));
      if (t === 'all') setAllShticks(await apiRequest('GET', null, '/admin/shticks'));
      if (t === 'rejected') setRejected(await apiRequest('GET', null, '/admin/rejected'));
      if (t === 'comments') setComments(await apiRequest('GET', null, '/admin/comments'));
    } catch (e) {
      setMsg(typeof e === 'string' ? e : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  async function approve(id) {
    await apiRequest('POST', { reject: false }, `/admin/shtick/${id}/approve`);
    setPending((p) => p.filter((s) => s.id !== id));
    setMsg('Approved ✓');
  }

  async function reject(id) {
    await apiRequest('POST', { reject: true }, `/admin/shtick/${id}/approve`);
    setPending((p) => p.filter((s) => s.id !== id));
    setMsg('Rejected');
  }

  async function deletePost(id) {
    if (!window.confirm('Delete this post permanently?')) return;
    await apiRequest('DELETE', null, `/admin/shtick/${id}`);
    setAllShticks((s) => s.filter((x) => x.id !== id));
    setMsg('Deleted');
  }

  async function deleteRejected(id) {
    if (!window.confirm('Permanently delete this rejected post?')) return;
    await apiRequest('DELETE', null, `/admin/shtick/${id}`);
    setRejected((s) => s.filter((x) => x.id !== id));
    setMsg('Post permanently deleted');
  }

  async function deleteComment(id) {
    if (!window.confirm('Delete this comment?')) return;
    await apiRequest('DELETE', null, `/comment/${id}`);
    setComments((c) => c.filter((x) => x.id !== id));
    setMsg('Comment deleted');
  }

  const StatusBadge = ({ v }) => (
    <span className={`admin-badge ${v === true ? 'approved' : v === false ? 'rejected' : 'pending'}`}>
      {v === true ? 'Approved' : v === false ? 'Rejected' : 'Pending'}
    </span>
  );

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <p>Review and manage all submitted content.</p>
      </div>

      {msg && <div className="gs-success-box">{msg}</div>}

      <div className="admin-tabs">
        {[
          ['pending', `⏳ Pending (${pending.length})`],
          ['all', '📋 All Posts'],
          ['rejected', `🗑 Rejected (${rejected.length})`],
          ['comments', '💬 Comments'],
        ].map(([key, label]) => (
          <button key={key} className={`admin-tab${tab === key ? ' active' : ''}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {loading && <div className="gs-loading"><div className="gs-spinner" /></div>}

      {/* ── Pending ── */}
      {tab === 'pending' && !loading && (
        <div className="admin-list">
          {pending.length === 0 && <div className="admin-empty">Nothing pending — all clear! ✓</div>}
          {pending.map((s) => (
            <div key={s.id} className="admin-card">
              <div className="admin-card-top">
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className="admin-badge pending">Pending</span>
                  {(s.categories?.length ? s.categories : s.generalc ? [s.generalc] : []).map((c) => (
                    <span key={c.id} className="shtick-badge">{c.name}</span>
                  ))}
                </div>
                <span className="admin-date">{formatDate(s.pub_date)}</span>
              </div>
              <h3 className="admin-caption">{s.caption}</h3>
              {s.credit && <p className="admin-meta" style={{ marginTop: 4 }}>— {s.credit}</p>}
              {s.content && <blockquote className="shtick-content-block">{s.content.stuff}</blockquote>}
              {s.url && <ShowUrl url={s.url.name} />}
              <div className="admin-card-meta">
                <span>By: <b>{s.user?.profile_name || s.user_id}</b></span>
              </div>
              <div className="admin-actions">
                <button className="gs-btn gs-btn-success gs-btn-sm" onClick={() => approve(s.id)}>✓ Approve</button>
                <button className="gs-btn gs-btn-danger gs-btn-sm" onClick={() => reject(s.id)}>✕ Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── All Posts ── */}
      {tab === 'all' && !loading && (
        <div className="admin-list">
          {allShticks.map((s) => (
            <div key={s.id} className="admin-card">
              <div className="admin-card-top">
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <StatusBadge v={s.approved_to_publish} />
                  {(s.categories?.length ? s.categories : s.generalc ? [s.generalc] : []).map((c) => (
                    <span key={c.id} className="shtick-badge">{c.name}</span>
                  ))}
                </div>
                <span className="admin-date">{formatDate(s.pub_date)}</span>
              </div>
              <h3 className="admin-caption">{s.caption}</h3>
              {s.credit && <p className="admin-meta" style={{ marginTop: 4 }}>— {s.credit}</p>}
              {s.content && <blockquote className="shtick-content-block">{s.content.stuff}</blockquote>}
              {s.url && <ShowUrl url={s.url.name} />}
              <div className="admin-card-meta">
                <span>By: <b>{s.user?.profile_name || s.user_id}</b></span>
                {s.approver && <span> · Approved by: <b>{s.approver.profile_name}</b></span>}
                <span> · 👍 {s.likes?.length || 0} · 💬 {s.comments?.length || 0} · 👁 {s.view_count || 0}</span>
              </div>
              <div className="admin-actions">
                {s.approved_to_publish === null && (
                  <button className="gs-btn gs-btn-success gs-btn-sm" onClick={() => approve(s.id)}>✓ Approve</button>
                )}
                <button className="gs-btn gs-btn-danger gs-btn-sm" onClick={() => deletePost(s.id)}>🗑 Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Rejected ── */}
      {tab === 'rejected' && !loading && (
        <div className="admin-list">
          {rejected.length === 0 && <div className="admin-empty">No rejected posts — nothing here.</div>}
          {rejected.map((s) => (
            <div key={s.id} className="admin-card" style={{ borderLeft: '3px solid var(--danger)' }}>
              <div className="admin-card-top">
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className="admin-badge rejected">Rejected</span>
                  {(s.categories?.length ? s.categories : s.generalc ? [s.generalc] : []).map((c) => (
                    <span key={c.id} className="shtick-badge">{c.name}</span>
                  ))}
                </div>
                <span className="admin-date">{formatDate(s.pub_date)}</span>
              </div>
              <h3 className="admin-caption">{s.caption}</h3>
              {s.credit && <p className="admin-meta" style={{ marginTop: 4 }}>— {s.credit}</p>}
              {s.content && <blockquote className="shtick-content-block">{s.content.stuff}</blockquote>}
              {s.url && <ShowUrl url={s.url.name} />}
              <div className="admin-card-meta">
                <span>Submitted by: <b>{s.user?.profile_name || s.user_id}</b></span>
                <span style={{ color: 'var(--danger)' }}> · Rejected {formatDate(s.pub_date)}</span>
              </div>
              <div className="admin-actions">
                <button className="gs-btn gs-btn-danger gs-btn-sm" onClick={() => deleteRejected(s.id)}>
                  🗑 Delete Permanently
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Comments ── */}
      {tab === 'comments' && !loading && (
        <div className="admin-list">
          {comments.length === 0 && <div className="admin-empty">No comments yet.</div>}
          {comments.map((c) => (
            <div key={c.id} className="admin-card comment-card">
              <div className="admin-card-top">
                <span><b>{c.user?.profile_name || c.user_id}</b></span>
                <span className="admin-date">{formatDate(c.pub_date)}</span>
              </div>
              <p style={{ margin: '6px 0' }}>{c.text}</p>
              <div className="admin-actions">
                <button className="gs-btn gs-btn-danger gs-btn-sm" onClick={() => deleteComment(c.id)}>🗑 Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
