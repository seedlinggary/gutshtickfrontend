import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import apiRequest from '../ApiRequest';

/** Token-only manage page for a guest (no-account) Hock comment -- the only
 * one of the 3 comment types whose guest routes include an edit (PATCH),
 * matching Hock comments' own logged-in edit support (see CommentNode's
 * submitEdit in HockPostPage.js). GET/PATCH/DELETE all hit
 * /hock/comments/guest/<token>. */
export default function HockCommentGuestManage() {
  const { token } = useParams();
  const [state, setState] = useState('loading'); // loading | ready | notfound | deleted
  const [comment, setComment] = useState(null);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    apiRequest('GET', null, `/hock/comments/guest/${token}`)
      .then((data) => { setComment(data); setState('ready'); })
      .catch(() => setState('notfound'));
  }, [token]);

  const startEdit = () => {
    setText(comment.text || '');
    setError('');
    setEditing(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!text.trim()) { setError('Comment cannot be empty.'); return; }
    setBusy(true);
    setError('');
    try {
      const updated = await apiRequest('PATCH', { text: text.trim() }, `/hock/comments/guest/${token}`);
      setComment(updated);
      setEditing(false);
      setMsg('Saved.');
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to save changes.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Delete this comment? This cannot be undone.')) return;
    setBusy(true);
    try {
      await apiRequest('DELETE', null, `/hock/comments/guest/${token}`);
      setState('deleted');
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to delete.');
      setBusy(false);
    }
  };

  if (state === 'loading') {
    return <div className="feed-section"><div className="gs-container" style={{ maxWidth: 480 }}><div className="gs-loading"><div className="gs-spinner" /> Loading…</div></div></div>;
  }

  if (state === 'notfound') {
    return (
      <div className="feed-section">
        <div className="gs-container" style={{ maxWidth: 480, textAlign: 'center' }}>
          <div className="gs-error-box">This link is invalid, or the comment it manages has been removed.</div>
          <Link to="/hock" className="gs-btn gs-btn-outline" style={{ marginTop: 16 }}>← Back to Hock</Link>
        </div>
      </div>
    );
  }

  if (state === 'deleted') {
    return (
      <div className="feed-section">
        <div className="gs-container" style={{ maxWidth: 480, textAlign: 'center' }}>
          <div className="gs-success-box">Your comment has been deleted.</div>
          <Link to="/hock" className="gs-btn gs-btn-outline" style={{ marginTop: 16 }}>← Back to Hock</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 480 }}>
        <h1 style={{ margin: '0 0 4px' }}>Manage your comment</h1>
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>No account needed — this private link is how you manage it.</p>

        {msg && <div className="gs-success-box" style={{ marginBottom: 12 }}>{msg}</div>}
        {error && <div className="gs-error-box" style={{ marginBottom: 12 }}>{error}</div>}

        {comment.approved_to_publish === null && (
          <div className="gs-success-box" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Clock size={15} /> Pending review — check back soon.
          </div>
        )}
        {comment.approved_to_publish === true && (
          <div className="gs-success-box" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <CheckCircle2 size={15} /> Live on the post.
          </div>
        )}
        {comment.approved_to_publish === false && (
          <div className="gs-error-box" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <XCircle size={15} /> Not approved.
          </div>
        )}

        <div className="gs-card">
          <div className="gs-card-body">
            {!editing ? (
              <>
                <p style={{ whiteSpace: 'pre-wrap' }}>{comment.text}</p>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={startEdit} disabled={busy}>Edit</button>
                  <button className="gs-btn gs-btn-danger gs-btn-sm" onClick={remove} disabled={busy}>Delete</button>
                </div>
              </>
            ) : (
              <form onSubmit={saveEdit}>
                <textarea className="gs-input gs-textarea" rows={3} value={text} onChange={(e) => setText(e.target.value)} />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
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
