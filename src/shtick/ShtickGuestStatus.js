import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import apiRequest from '../ApiRequest';

/** Token-only status check for a guest (no-account) Shtick post -- no
 * edit/delete here because no Shtick post, guest or logged-in, has one
 * (see the comment above create_guest_shtick in backend/shtick/routes/
 * shtick.py). Just answers "did it go through / is it live yet". */
export default function ShtickGuestStatus() {
  const { token } = useParams();
  const [state, setState] = useState('loading');
  const [post, setPost] = useState(null);

  useEffect(() => {
    apiRequest('GET', null, `/shtick/guest/${token}`)
      .then((data) => { setPost(data); setState('ready'); })
      .catch(() => setState('notfound'));
  }, [token]);

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 480, textAlign: 'center' }}>
        {state === 'loading' && <div className="gs-loading"><div className="gs-spinner" /> Loading…</div>}

        {state === 'notfound' && (
          <div className="gs-error-box">This link is invalid, or the post it checks on has been removed.</div>
        )}

        {state === 'ready' && post && (
          <>
            <h3 style={{ marginBottom: 4 }}>{post.caption}</h3>
            {post.approved_to_publish === null && (
              <div className="gs-success-box" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Clock size={16} /> Pending review — check back soon.
              </div>
            )}
            {post.approved_to_publish === true && (
              <div className="gs-success-box" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={16} /> Live on Gut Shtick!
              </div>
            )}
            {post.approved_to_publish === false && (
              <div className="gs-error-box" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <XCircle size={16} /> Not approved.
              </div>
            )}
          </>
        )}

        <div style={{ marginTop: 16 }}>
          <Link to="/" className="gs-btn gs-btn-outline">← Back home</Link>
        </div>
      </div>
    </div>
  );
}
