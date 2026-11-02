import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MessagesSquare, CheckCircle2, Clock, XCircle } from 'lucide-react';
import apiRequest from '../ApiRequest';

const TITLE_MAX = 200;
const BODY_MAX = 10000;

function StatusNotice({ post }) {
  if (post.approved_to_publish === null) {
    return (
      <div className="gs-success-box" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Clock size={15} /> Pending review — this isn't visible on Hock yet. You can still edit it below.
      </div>
    );
  }
  if (post.approved_to_publish === false) {
    return (
      <div className="gs-error-box" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <XCircle size={15} /> This post wasn't approved.
      </div>
    );
  }
  return (
    <div className="gs-success-box" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <CheckCircle2 size={15} /> Live on Hock.
    </div>
  );
}

/** Token-only management page for a guest (no-account) Hock post -- the
 * link emailed by backend/hock/routes/hock_post.py's create_guest_post (and
 * shown on-screen right after posting, see Hock.js). No renew/status here --
 * Hock posts don't expire for anyone, guest or not -- just edit and delete,
 * against the /posts/guest/<token> routes with the token as the credential. */
export default function HockGuestManage() {
  const { token } = useParams();
  const [state, setState] = useState('loading'); // loading | ready | notfound | deleted
  const [post, setPost] = useState(null);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    apiRequest('GET', null, `/hock/posts/guest/${token}`)
      .then((data) => { setPost(data); setState('ready'); })
      .catch(() => setState('notfound'));
  }, [token]);

  const startEdit = () => {
    setTitle(post.title || '');
    setBody(post.body || '');
    setError('');
    setEditing(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError('Title and body are both required.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const updated = await apiRequest('PATCH', {
        title: title.trim(),
        body: body.trim(),
      }, `/hock/posts/guest/${token}`);
      setPost(updated);
      setEditing(false);
      setMsg('Saved.');
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to save changes.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    setBusy(true);
    try {
      await apiRequest('DELETE', null, `/hock/posts/guest/${token}`);
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
          <Link to="/hock" className="gs-btn gs-btn-outline" style={{ marginTop: 16 }}>← Back to Hock</Link>
        </div>
      </div>
    );
  }

  if (state === 'deleted') {
    return (
      <div className="feed-section">
        <div className="gs-container" style={{ maxWidth: 560, textAlign: 'center' }}>
          <div className="gs-success-box">Your post has been deleted.</div>
          <Link to="/hock" className="gs-btn gs-btn-outline" style={{ marginTop: 16 }}>← Back to Hock</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 560 }}>
        <h1 style={{ margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessagesSquare size={20} /> Manage your post
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

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={startEdit} disabled={busy}>Edit</button>
                  <button className="gs-btn gs-btn-danger gs-btn-sm" onClick={remove} disabled={busy}>Delete</button>
                </div>
              </>
            ) : (
              <form onSubmit={saveEdit}>
                <div className="gs-field">
                  <input className="gs-input" value={title} maxLength={TITLE_MAX} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
                </div>
                <div className="gs-field">
                  <textarea className="gs-input gs-textarea" rows={5} value={body} maxLength={BODY_MAX} onChange={(e) => setBody(e.target.value)} placeholder="Body" />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" className="gs-btn gs-btn-primary gs-btn-sm" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
                  <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setEditing(false)} disabled={busy}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>

        <Link to="/hock" style={{ display: 'inline-block', marginTop: 16 }}>← Back to Hock</Link>
      </div>
    </div>
  );
}
