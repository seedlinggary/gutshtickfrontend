import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import { isAdmin, isSuperAdmin } from '../auth';
import ShowUrl from '../feed/ShowURL';
import { TypeBadge } from '../tachlis/Tachlis';
import timeAgo from '../utils/timeAgo';

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
  const [tachlisPending, setTachlisPending] = useState([]);
  const [tachlisAll, setTachlisAll] = useState([]);
  const [hockAll, setHockAll] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => {
    if (!isAdmin()) { navigate('/'); return; }
    setSelectedIds([]);
    loadTab(tab);
  }, [tab]);

  async function loadTab(t) {
    setLoading(true);
    setMsg('');
    try {
      if (t === 'pending') setPending(await apiRequest('GET', null, '/admin/pending'));
      if (t === 'all') setAllShticks(await apiRequest('GET', null, '/admin/shticks'));
      if (t === 'rejected') setRejected(await apiRequest('GET', null, '/admin/rejected'));
      if (t === 'comments') {
        const [feedComments, hockComments] = await Promise.all([
          apiRequest('GET', null, '/admin/comments'),
          isSuperAdmin() ? apiRequest('GET', null, '/hock/admin/comments') : Promise.resolve([]),
        ]);
        const merged = [
          ...feedComments.map((c) => ({ ...c, source: 'feed' })),
          ...hockComments.map((c) => ({ ...c, source: 'hock' })),
        ].sort((a, b) => new Date(b.pub_date) - new Date(a.pub_date));
        setComments(merged);
      }
      if (t === 'tachlis') {
        setTachlisPending(await apiRequest('GET', null, '/tachlis/admin/pending'));
        if (isSuperAdmin()) setTachlisAll(await apiRequest('GET', null, '/tachlis/admin/posts'));
      }
      if (t === 'hock' && isSuperAdmin()) setHockAll(await apiRequest('GET', null, '/hock/admin/posts'));
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

  function toggleSelected(id) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => prev.length === pending.length ? [] : pending.map((s) => s.id));
  }

  async function bulkApprove(reject) {
    if (selectedIds.length === 0) return;
    const label = reject ? 'reject' : 'approve';
    if (!window.confirm(`${reject ? 'Reject' : 'Approve'} ${selectedIds.length} selected post${selectedIds.length === 1 ? '' : 's'}?`)) return;
    setBulkBusy(true);
    try {
      const res = await apiRequest('POST', { ids: selectedIds, reject }, '/admin/shtick/bulk-approve');
      setPending((p) => p.filter((s) => !selectedIds.includes(s.id)));
      setSelectedIds([]);
      setMsg(`${res.updated} post${res.updated === 1 ? '' : 's'} ${label === 'reject' ? 'rejected' : 'approved'} ✓`);
    } catch (e) {
      setMsg(typeof e === 'string' ? e : 'Bulk action failed');
    } finally {
      setBulkBusy(false);
    }
  }

  async function approveTachlis(id) {
    await apiRequest('POST', { reject: false }, `/tachlis/admin/posts/${id}/approve`);
    setTachlisPending((p) => p.filter((s) => s.id !== id));
    setMsg('Tachlis post approved ✓');
  }

  async function rejectTachlis(id) {
    await apiRequest('POST', { reject: true }, `/tachlis/admin/posts/${id}/approve`);
    setTachlisPending((p) => p.filter((s) => s.id !== id));
    setMsg('Tachlis post rejected');
  }

  async function unapproveTachlis(id) {
    if (!window.confirm('Send this Tachlis post back to the pending queue?')) return;
    await apiRequest('POST', null, `/tachlis/admin/posts/${id}/unapprove`);
    setTachlisAll((s) => s.map((x) => x.id === id ? { ...x, approved_to_publish: null, approved_by: null } : x));
    setMsg('Unapproved — back in the pending queue');
  }

  async function unapproveHock(id) {
    if (!window.confirm('Hide this Hock post from public view?')) return;
    await apiRequest('POST', null, `/hock/admin/posts/${id}/unapprove`);
    setHockAll((s) => s.map((x) => x.id === id ? { ...x, approved_to_publish: false } : x));
    setMsg('Hock post hidden');
  }

  async function approveHock(id) {
    await apiRequest('POST', null, `/hock/admin/posts/${id}/approve`);
    setHockAll((s) => s.map((x) => x.id === id ? { ...x, approved_to_publish: true } : x));
    setMsg('Hock post restored');
  }

  async function unapprove(id) {
    if (!window.confirm('Send this post back to the pending queue?')) return;
    await apiRequest('POST', null, `/admin/shtick/${id}/unapprove`);
    setAllShticks((s) => s.map((x) => x.id === id ? { ...x, approved_to_publish: null, approver: null } : x));
    setMsg('Unapproved — back in the pending queue');
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

  async function deleteComment(id, source) {
    if (!window.confirm('Delete this comment?')) return;
    await apiRequest('DELETE', null, source === 'hock' ? `/hock/comments/${id}` : `/comment/${id}`);
    setComments((c) => c.filter((x) => !(x.id === id && x.source === source)));
    setMsg('Comment deleted');
  }

  async function unapproveComment(id, source) {
    const base = source === 'hock' ? '/hock/admin/comments' : '/admin/comments';
    await apiRequest('POST', null, `${base}/${id}/unapprove`);
    setComments((c) => c.map((x) => (x.id === id && x.source === source) ? { ...x, approved_to_publish: false } : x));
    setMsg('Comment hidden');
  }

  async function approveComment(id, source) {
    const base = source === 'hock' ? '/hock/admin/comments' : '/admin/comments';
    await apiRequest('POST', null, `${base}/${id}/approve`);
    setComments((c) => c.map((x) => (x.id === id && x.source === source) ? { ...x, approved_to_publish: true } : x));
    setMsg('Comment restored');
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
          ['pending', `⏳ Feed Pending (${pending.length})`],
          ['tachlis', `💼 Tachlis Pending (${tachlisPending.length})`],
          ['all', '📋 All Posts'],
          ['rejected', `🗑 Rejected (${rejected.length})`],
          ['comments', '💬 Comments'],
          ...(isSuperAdmin() ? [['hock', '🗣 Hock Moderation']] : []),
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
          {pending.length > 0 && (
            <div className="admin-bulk-bar" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedIds.length === pending.length}
                  onChange={toggleSelectAll}
                />
                Select all ({pending.length})
              </label>
              {selectedIds.length > 0 && (
                <>
                  <span style={{ color: 'var(--muted)' }}>{selectedIds.length} selected</span>
                  <button className="gs-btn gs-btn-success gs-btn-sm" disabled={bulkBusy} onClick={() => bulkApprove(false)}>
                    ✓ Approve Selected
                  </button>
                  <button className="gs-btn gs-btn-danger gs-btn-sm" disabled={bulkBusy} onClick={() => bulkApprove(true)}>
                    ✕ Reject Selected
                  </button>
                </>
              )}
            </div>
          )}
          {pending.map((s) => (
            <div key={s.id} className="admin-card">
              <div className="admin-card-top">
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(s.id)}
                    onChange={() => toggleSelected(s.id)}
                    style={{ marginRight: 4 }}
                  />
                  <span className="admin-badge pending">Pending</span>
                  {(s.categories?.length ? s.categories : s.generalc ? [s.generalc] : []).map((c) => (
                    <span key={c.id} className="shtick-badge">{c.name}</span>
                  ))}
                </div>
                <span className="admin-date">{formatDate(s.pub_date)} <span style={{ fontSize: 11 }} title="Post ID">#{s.id}</span></span>
              </div>
              <h3 className="admin-caption">{s.caption}</h3>
              {s.credit && <p className="admin-meta" style={{ marginTop: 4 }}>— {s.credit}</p>}
              {s.picture?.url && (
                <img className="shtick-image" src={s.picture.url} alt={s.caption} loading="lazy" />
              )}
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

      {/* ── Tachlis Pending (jobs/resumes/services -- a completely separate
          content type from the Feed above; kept as its own tab with a
          distinct accent color + "TACHLIS" label on every card so it's never
          mistaken for a feed post) ── */}
      {tab === 'tachlis' && !loading && (
        <div className="admin-list">
          {tachlisPending.length === 0 && <div className="admin-empty">Nothing pending on Tachlis — all clear! ✓</div>}
          {tachlisPending.map((s) => (
            <div key={s.id} className="admin-card" style={{ borderLeft: '4px solid #6366f1' }}>
              <div className="admin-card-top">
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4,
                      color: '#fff', background: '#6366f1', borderRadius: 999, padding: '2px 10px',
                    }}
                  >
                    💼 Tachlis
                  </span>
                  <TypeBadge type={s.post_type} />
                  {s.location && <span style={{ fontSize: 13, color: 'var(--muted)' }}>📍 {s.location}</span>}
                  {s.compensation && <span style={{ fontSize: 13, color: 'var(--muted)' }}>💰 {s.compensation}</span>}
                </div>
                <span className="admin-date">{timeAgo(s.pub_date)} <span style={{ fontSize: 11 }} title="Post ID">#{s.id}</span></span>
              </div>
              <h3 className="admin-caption">{s.title}</h3>
              <p style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{s.body}</p>
              <div className="admin-card-meta" style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 8 }}>
                <span>Contact: <b>{s.contact}</b></span>
                <span>By: <b>{s.user?.profile_name || s.user_id}</b></span>
              </div>
              <div className="admin-actions">
                <button className="gs-btn gs-btn-success gs-btn-sm" onClick={() => approveTachlis(s.id)}>✓ Approve</button>
                <button className="gs-btn gs-btn-danger gs-btn-sm" onClick={() => rejectTachlis(s.id)}>✕ Reject</button>
              </div>
            </div>
          ))}

          {isSuperAdmin() && (
            <>
              <h3 style={{ margin: '24px 0 12px' }}>All Tachlis Posts</h3>
              {tachlisAll.filter((s) => s.approved_to_publish !== null).map((s) => (
                <div key={s.id} className="admin-card" style={{ borderLeft: '4px solid #6366f1' }}>
                  <div className="admin-card-top">
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <StatusBadge v={s.approved_to_publish} />
                      <TypeBadge type={s.post_type} />
                    </div>
                    <span className="admin-date">{timeAgo(s.pub_date)} <span style={{ fontSize: 11 }} title="Post ID">#{s.id}</span></span>
                  </div>
                  <h3 className="admin-caption">{s.title}</h3>
                  <div className="admin-card-meta">
                    <span>By: <b>{s.user?.profile_name || s.user_id}</b></span>
                  </div>
                  {s.approved_to_publish === true && (
                    <div className="admin-actions">
                      <button className="gs-btn gs-btn-sm" onClick={() => unapproveTachlis(s.id)}>↩ Unapprove</button>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
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
                <span className="admin-date">{formatDate(s.pub_date)} <span style={{ fontSize: 11 }} title="Post ID">#{s.id}</span></span>
              </div>
              <h3 className="admin-caption">{s.caption}</h3>
              {s.credit && <p className="admin-meta" style={{ marginTop: 4 }}>— {s.credit}</p>}
              {s.picture?.url && (
                <img className="shtick-image" src={s.picture.url} alt={s.caption} loading="lazy" />
              )}
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
                {s.approved_to_publish !== null && isSuperAdmin() && (
                  <button className="gs-btn gs-btn-sm" onClick={() => unapprove(s.id)}>↩ Unapprove</button>
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
                <span className="admin-date">{formatDate(s.pub_date)} <span style={{ fontSize: 11 }} title="Post ID">#{s.id}</span></span>
              </div>
              <h3 className="admin-caption">{s.caption}</h3>
              {s.credit && <p className="admin-meta" style={{ marginTop: 4 }}>— {s.credit}</p>}
              {s.picture?.url && (
                <img className="shtick-image" src={s.picture.url} alt={s.caption} loading="lazy" />
              )}
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

      {/* ── Comments (Feed + Hock merged; unapprove is super_admin-only) ── */}
      {tab === 'comments' && !loading && (
        <div className="admin-list">
          {comments.length === 0 && <div className="admin-empty">No comments yet.</div>}
          {comments.map((c) => (
            <div key={`${c.source}-${c.id}`} className="admin-card comment-card">
              <div className="admin-card-top">
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4,
                      color: '#fff', background: c.source === 'hock' ? '#6366f1' : '#0ea5e9',
                      borderRadius: 999, padding: '2px 10px',
                    }}
                  >
                    {c.source === 'hock' ? '🗣 Hock' : '📰 Feed'}
                  </span>
                  <span><b>{c.user?.profile_name || c.user_id}</b></span>
                  {c.approved_to_publish === false && <span className="admin-badge rejected">Hidden</span>}
                </div>
                <span className="admin-date">{formatDate(c.pub_date)} <span style={{ fontSize: 11 }} title="Comment ID">#{c.id}</span></span>
              </div>
              <p style={{ margin: '6px 0' }}>{c.text}</p>
              <div className="admin-actions">
                {isSuperAdmin() && c.approved_to_publish !== false && (
                  <button className="gs-btn gs-btn-sm" onClick={() => unapproveComment(c.id, c.source)}>↩ Unapprove</button>
                )}
                {isSuperAdmin() && c.approved_to_publish === false && (
                  <button className="gs-btn gs-btn-success gs-btn-sm" onClick={() => approveComment(c.id, c.source)}>✓ Approve</button>
                )}
                <button className="gs-btn gs-btn-danger gs-btn-sm" onClick={() => deleteComment(c.id, c.source)}>🗑 Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Hock Moderation (super_admin only -- Hock posts auto-publish, this
          is just a reversible takedown/restore switch, not a pre-publish queue) ── */}
      {tab === 'hock' && !loading && isSuperAdmin() && (
        <div className="admin-list">
          {hockAll.length === 0 && <div className="admin-empty">No Hock posts yet.</div>}
          {hockAll.map((p) => (
            <div key={p.id} className="admin-card" style={{ borderLeft: '4px solid #6366f1' }}>
              <div className="admin-card-top">
                <span className={`admin-badge ${p.approved_to_publish ? 'approved' : 'rejected'}`}>
                  {p.approved_to_publish ? 'Visible' : 'Hidden'}
                </span>
                <span className="admin-date">{timeAgo(p.pub_date)} <span style={{ fontSize: 11 }} title="Post ID">#{p.id}</span></span>
              </div>
              <h3 className="admin-caption">{p.title}</h3>
              <p style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{p.body}</p>
              <div className="admin-card-meta">
                <span>By: <b>{p.user?.profile_name || p.user_id}</b></span>
                <span> · 👍 {p.like_count || 0} · 💬 {p.comment_count || 0}</span>
              </div>
              <div className="admin-actions">
                {p.approved_to_publish ? (
                  <button className="gs-btn gs-btn-sm" onClick={() => unapproveHock(p.id)}>↩ Unapprove</button>
                ) : (
                  <button className="gs-btn gs-btn-success gs-btn-sm" onClick={() => approveHock(p.id)}>✓ Approve</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
