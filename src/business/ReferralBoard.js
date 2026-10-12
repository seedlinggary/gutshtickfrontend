import React, { useEffect, useState } from 'react';
import { Handshake } from 'lucide-react';
import apiRequest from '../ApiRequest';

const TITLE_MAX = 200, BODY_MAX = 3000, REPLY_MAX = 2000;

export default function ReferralBoard() {
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ title: '', body: '' });
  const [replyDrafts, setReplyDrafts] = useState({});
  const [posting, setPosting] = useState(false);
  const [replyingId, setReplyingId] = useState(null);
  const [replyError, setReplyError] = useState(null);

  const load = () => apiRequest('GET', null, '/business/referrals').then(setPosts).catch((err) => setError(err));
  useEffect(() => { load(); }, []);

  const submitPost = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim() || posting) return;
    setPosting(true);
    apiRequest('POST', form, '/business/referrals')
      .then(() => { setForm({ title: '', body: '' }); load(); })
      .catch((err) => setError(err))
      .finally(() => setPosting(false));
  };

  const submitReply = (postId) => {
    const body = (replyDrafts[postId] || '').trim();
    if (!body || replyingId) return;
    setReplyingId(postId);
    setReplyError(null);
    apiRequest('POST', { body }, `/business/referrals/${postId}/replies`)
      .then(() => setReplyDrafts((d) => ({ ...d, [postId]: '' })))
      .then(load)
      .catch(() => setReplyError('Could not send your reply -- try again.'))
      .finally(() => setReplyingId(null));
  };

  if (error) {
    return (
      <div className="biz-page biz-referral-board">
        <p className="biz-error">{typeof error === 'string' ? error : 'Only owners of a claimed business can view the vendor board.'}</p>
      </div>
    );
  }
  if (!posts) return <div className="biz-page biz-referral-board"><p>Loading...</p></div>;

  return (
    <div className="biz-page biz-referral-board">
      <h1 className="biz-page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Handshake size={26} /> Vendor Board</h1>
      <p className="biz-page-subtitle">Private to claimed business owners -- ask "who do you use for X," share a recommendation, or find a supplier.</p>

      <form className="biz-referral-form" onSubmit={submitPost}>
        <input
          type="text" placeholder="Title (e.g. 'Anyone use a good sign printer?')" maxLength={TITLE_MAX}
          value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <textarea
          placeholder="Details..." maxLength={BODY_MAX}
          value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
        />
        <button type="submit" disabled={posting}>{posting ? 'Posting…' : 'Post'}</button>
      </form>

      <div className="biz-referral-list">
        {replyError && <p className="biz-error" style={{ fontSize: 12 }}>{replyError}</p>}
        {posts.length === 0 && <p className="biz-empty">No posts yet -- be the first.</p>}
        {posts.map((post) => (
          <div key={post.id} className="biz-referral-post">
            <h3>{post.title}</h3>
            <p className="biz-referral-meta">{post.business_name} · {new Date(post.created_at).toLocaleDateString()}</p>
            <p className="biz-referral-body">{post.body}</p>
            {post.replies.length > 0 && (
              <ul className="biz-referral-replies">
                {post.replies.map((r) => (
                  <li key={r.id}><strong>{r.user?.profile_name || 'A member'}:</strong> {r.body}</li>
                ))}
              </ul>
            )}
            <div className="biz-referral-reply-form">
              <input
                type="text" maxLength={REPLY_MAX} placeholder="Reply..."
                value={replyDrafts[post.id] || ''}
                onChange={(e) => setReplyDrafts((d) => ({ ...d, [post.id]: e.target.value }))}
                disabled={replyingId === post.id}
              />
              <button type="button" onClick={() => submitReply(post.id)} disabled={!!replyingId}>
                {replyingId === post.id ? 'Replying…' : 'Reply'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
