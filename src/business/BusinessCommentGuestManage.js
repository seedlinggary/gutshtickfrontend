import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import apiRequest from '../ApiRequest';

/** Token-only manage page for a guest (no-account) Business comment -- GET +
 * DELETE only, no edit (same as the Shtick comment manage page). Status
 * display mirrors src/shtick/CommentGuestManage.js's 3-state pattern. */
export default function BusinessCommentGuestManage() {
  const { token } = useParams();
  const [state, setState] = useState('loading'); // loading | ready | notfound | deleted
  const [comment, setComment] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest('GET', null, `/business/comments/guest/${token}`)
      .then((data) => { setComment(data); setState('ready'); })
      .catch(() => setState('notfound'));
  }, [token]);

  const remove = async () => {
    if (!window.confirm('Delete this comment? This cannot be undone.')) return;
    setBusy(true);
    try {
      await apiRequest('DELETE', null, `/business/comments/guest/${token}`);
      setState('deleted');
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to delete.');
      setBusy(false);
    }
  };

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 480, textAlign: 'center' }}>
        {state === 'loading' && <div className="gs-loading"><div className="gs-spinner" /> Loading…</div>}

        {state === 'notfound' && (
          <div className="gs-error-box">This link is invalid, or the comment it manages has been removed.</div>
        )}

        {state === 'deleted' && (
          <div className="gs-success-box">Your comment has been deleted.</div>
        )}

        {state === 'ready' && comment && (
          <>
            <p style={{ whiteSpace: 'pre-wrap', textAlign: 'left', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
              {comment.body}
            </p>
            {error && <div className="gs-error-box">{error}</div>}

            {comment.approved_to_publish === null && (
              <div className="gs-success-box" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Clock size={16} /> Pending review — check back soon.
              </div>
            )}
            {comment.approved_to_publish === true && (
              <div className="gs-success-box" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={16} /> Live on the business's profile.
              </div>
            )}
            {comment.approved_to_publish === false && (
              <div className="gs-error-box" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <XCircle size={16} /> Not approved.
              </div>
            )}

            <div style={{ marginTop: 14 }}>
              <button className="gs-btn gs-btn-danger gs-btn-sm" onClick={remove} disabled={busy}>Delete comment</button>
            </div>
          </>
        )}

        <div style={{ marginTop: 16 }}>
          <Link to="/" className="gs-btn gs-btn-outline">← Back home</Link>
        </div>
      </div>
    </div>
  );
}
