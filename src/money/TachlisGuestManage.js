import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Briefcase, CheckCircle2, Clock, XCircle } from 'lucide-react';
import apiRequest from '../ApiRequest';

const TITLE_MAX = 150;
const BODY_MAX = 8000;
const CONTACT_MAX = 300;
const LOCATION_MAX = 120;
const COMPENSATION_MAX = 120;

function StatusNotice({ post }) {
  if (post.approved_to_publish === null) {
    return (
      <div className="gs-success-box" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Clock size={15} /> Pending review — this isn't on the board yet. You can still edit it below.
      </div>
    );
  }
  if (post.approved_to_publish === false) {
    return (
      <div className="gs-error-box" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <XCircle size={15} /> This post wasn't approved. You can edit and it'll go back in for review once you save.
      </div>
    );
  }
  return (
    <div className="gs-success-box" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <CheckCircle2 size={15} /> Live on the Job Board.
    </div>
  );
}

/** Token-only management page for a guest (no-account) Tachlis post -- the
 * link emailed by backend/tachlis/routes/tachlis_post.py's create_guest_post
 * (and shown on-screen right after submitting, see Tachlis.js). Mirrors the
 * edit/renew/mark-filled/delete controls TachlisPostPage.js gives a logged-in
 * owner, but against the /posts/guest/<token> routes -- the token itself is
 * the credential, no JWT involved. */
export default function TachlisGuestManage() {
  const { token } = useParams();
  const [state, setState] = useState('loading'); // loading | ready | notfound | deleted
  const [post, setPost] = useState(null);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [contact, setContact] = useState('');
  const [location, setLocation] = useState('');
  const [compensation, setCompensation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    apiRequest('GET', null, `/tachlis/posts/guest/${token}`)
      .then((data) => { setPost(data); setState('ready'); })
      .catch(() => setState('notfound'));
  }, [token]);

  const startEdit = () => {
    setTitle(post.title || '');
    setBody(post.body || '');
    setContact(post.contact || '');
    setLocation(post.location || '');
    setCompensation(post.compensation || '');
    setError('');
    setEditing(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim() || !contact.trim()) {
      setError('Title, details, and contact info are all required.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const updated = await apiRequest('PATCH', {
        title: title.trim(),
        body: body.trim(),
        contact: contact.trim(),
        location: location.trim() || null,
        compensation: compensation.trim() || null,
      }, `/tachlis/posts/guest/${token}`);
      setPost(updated);
      setEditing(false);
      setMsg('Saved.');
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to save changes.');
    } finally {
      setBusy(false);
    }
  };

  const renew = async () => {
    setBusy(true);
    try {
      const updated = await apiRequest('POST', null, `/tachlis/posts/guest/${token}/renew`);
      setPost(updated);
      setMsg('Renewed.');
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to renew.');
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (status) => {
    setBusy(true);
    try {
      const updated = await apiRequest('PATCH', { status }, `/tachlis/posts/guest/${token}/status`);
      setPost(updated);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to update status.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    setBusy(true);
    try {
      await apiRequest('DELETE', null, `/tachlis/posts/guest/${token}`);
      setState('deleted');
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to delete.');
      setBusy(false);
    }
  };

  if (state === 'loading') {
    return <div className="feed-section"><div className="gs-container" style={{ maxWidth: 560 }}><div className="gs-loading"><div className="gs-spinner" /> Loading…</div></div></div>;
  }

  if (state === 'notfound') {
    return (
      <div className="feed-section">
        <div className="gs-container" style={{ maxWidth: 560, textAlign: 'center' }}>
          <div className="gs-error-box">This link is invalid, or the post it manages has been removed.</div>
          <Link to="/tachlis" className="gs-btn gs-btn-outline" style={{ marginTop: 16 }}>← Back to the Job Board</Link>
        </div>
      </div>
    );
  }

  if (state === 'deleted') {
    return (
      <div className="feed-section">
        <div className="gs-container" style={{ maxWidth: 560, textAlign: 'center' }}>
          <div className="gs-success-box">Your post has been deleted.</div>
          <Link to="/tachlis" className="gs-btn gs-btn-outline" style={{ marginTop: 16 }}>← Back to the Job Board</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 560 }}>
        <h1 style={{ margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Briefcase size={20} /> Manage your post
        </h1>
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>No account needed — this private link is how you manage it.</p>

        {msg && <div className="gs-success-box" style={{ marginBottom: 12 }}>{msg}</div>}
        {error && <div className="gs-error-box" style={{ marginBottom: 12 }}>{error}</div>}

        <div style={{ marginBottom: 14 }}><StatusNotice post={post} /></div>

        <div className="gs-card">
          <div className="gs-card-body">
            {!editing ? (
              <>
                <h3 style={{ marginTop: 0 }}>{post.title}</h3>
                <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{post.body}</p>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
                  <div>Contact: {post.contact}</div>
                  {post.location && <div>Location: {post.location}</div>}
                  {post.compensation && <div>Compensation: {post.compensation}</div>}
                  <div>Status: {post.status === 'filled' ? 'Filled' : 'Active'}{post.is_expired && post.status === 'active' ? ' (expired)' : ''}</div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={startEdit} disabled={busy}>Edit</button>
                  {post.status === 'active' ? (
                    <>
                      <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={renew} disabled={busy}>Renew</button>
                      <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setStatus('filled')} disabled={busy}>Mark filled</button>
                    </>
                  ) : (
                    <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setStatus('active')} disabled={busy}>Still open? Reactivate</button>
                  )}
                  <button className="gs-btn gs-btn-danger gs-btn-sm" onClick={remove} disabled={busy}>Delete</button>
                </div>
              </>
            ) : (
              <form onSubmit={saveEdit}>
                <div className="gs-field">
                  <input className="gs-input" value={title} maxLength={TITLE_MAX} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
                </div>
                <div className="gs-field">
                  <textarea className="gs-input gs-textarea" rows={5} value={body} maxLength={BODY_MAX} onChange={(e) => setBody(e.target.value)} placeholder="Details" />
                </div>
                <div className="gs-field">
                  <input className="gs-input" value={contact} maxLength={CONTACT_MAX} onChange={(e) => setContact(e.target.value)} placeholder="Contact info" />
                </div>
                <div className="gs-field">
                  <input className="gs-input" value={location} maxLength={LOCATION_MAX} onChange={(e) => setLocation(e.target.value)} placeholder="Location (optional)" />
                </div>
                <div className="gs-field">
                  <input className="gs-input" value={compensation} maxLength={COMPENSATION_MAX} onChange={(e) => setCompensation(e.target.value)} placeholder="Compensation (optional)" />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" className="gs-btn gs-btn-primary gs-btn-sm" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
                  <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setEditing(false)} disabled={busy}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>

        <Link to="/tachlis" style={{ display: 'inline-block', marginTop: 16 }}>← Back to the Job Board</Link>
      </div>
    </div>
  );
}
