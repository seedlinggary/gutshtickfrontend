import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BookOpen, CheckCircle2, Clock, XCircle } from 'lucide-react';
import apiRequest from '../ApiRequest';

const TITLE_MAX = 150;
const BODY_MAX = 8000;

const CATEGORIES = [
  { key: 'parsha', label: 'Parsha' },
  { key: 'halacha', label: 'Halacha' },
  { key: 'mussar', label: 'Mussar' },
  { key: 'stories', label: 'Stories' },
  { key: 'holidays', label: 'Holidays' },
  { key: 'other', label: 'Other' },
];

function StatusNotice({ post }) {
  if (post.approved_to_publish === null) {
    return (
      <div className="gs-success-box" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Clock size={15} /> Pending review — this isn't on Gut Torah yet. You can still edit it below.
      </div>
    );
  }
  if (post.approved_to_publish === false) {
    return (
      <div className="gs-error-box" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <XCircle size={15} /> This post wasn't approved. You can edit it and it'll go back in for review once you save.
      </div>
    );
  }
  return (
    <div className="gs-success-box" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <CheckCircle2 size={15} /> Live on Gut Torah.
    </div>
  );
}

/** Token-only management page for a guest (no-account) Torah post -- the
 * link emailed by backend/torah/routes/torah_post.py's create_guest_post
 * (and shown on-screen right after posting, see PostForm.js). Edit/delete
 * only, same as a logged-in author gets -- no photos here, since a guest
 * never had a way to upload one in the first place. */
export default function TorahGuestManage() {
  const { token } = useParams();
  const [state, setState] = useState('loading'); // loading | ready | notfound | deleted
  const [post, setPost] = useState(null);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [category, setCategory] = useState('other');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    apiRequest('GET', null, `/torah/posts/guest/${token}`)
      .then((data) => { setPost(data); setState('ready'); })
      .catch(() => setState('notfound'));
  }, [token]);

  const startEdit = () => {
    setTitle(post.title || '');
    setBodyText(post.body_text || '');
    setYoutubeUrl(post.youtube_video_id ? `https://www.youtube.com/watch?v=${post.youtube_video_id}` : '');
    setCategory(post.category || 'other');
    setError('');
    setEditing(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const updated = await apiRequest('PATCH', {
        title: title.trim(),
        body_text: bodyText.trim(),
        youtube_url: youtubeUrl.trim(),
        category,
      }, `/torah/posts/guest/${token}`);
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
      await apiRequest('DELETE', null, `/torah/posts/guest/${token}`);
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
          <Link to="/" className="gs-btn gs-btn-outline" style={{ marginTop: 16 }}>← Back to Gut Torah</Link>
        </div>
      </div>
    );
  }

  if (state === 'deleted') {
    return (
      <div className="feed-section">
        <div className="gs-container" style={{ maxWidth: 560, textAlign: 'center' }}>
          <div className="gs-success-box">Your post has been deleted.</div>
          <Link to="/" className="gs-btn gs-btn-outline" style={{ marginTop: 16 }}>← Back to Gut Torah</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 560 }}>
        <h1 style={{ margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <BookOpen size={20} /> Manage your post
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
                {post.youtube_video_id && (
                  <p style={{ fontSize: 13, color: 'var(--muted)' }}>YouTube: https://www.youtube.com/watch?v={post.youtube_video_id}</p>
                )}
                {post.body_text && <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{post.body_text}</p>}
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
                  <div>Category: {CATEGORIES.find((c) => c.key === post.category)?.label || post.category}</div>
                </div>

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
                  <select className="gs-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                    {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
                <div className="gs-field">
                  <input className="gs-input" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="YouTube URL (optional)" />
                </div>
                <div className="gs-field">
                  <textarea className="gs-input gs-textarea" rows={5} value={bodyText} maxLength={BODY_MAX} onChange={(e) => setBodyText(e.target.value)} placeholder="Text (optional)" />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" className="gs-btn gs-btn-primary gs-btn-sm" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
                  <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setEditing(false)} disabled={busy}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>

        <Link to="/" style={{ display: 'inline-block', marginTop: 16 }}>← Back to Gut Torah</Link>
      </div>
    </div>
  );
}
