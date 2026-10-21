import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import apiRequest from '../ApiRequest';
import TorahPhotoUpload from './TorahPhotoUpload';

const EMPTY = { post_type: 'text', title: '', body_text: '', youtube_url: '', category: 'other' };

const CATEGORIES = [
  { key: 'parsha', label: 'Parsha' },
  { key: 'halacha', label: 'Halacha' },
  { key: 'mussar', label: 'Mussar' },
  { key: 'stories', label: 'Stories' },
  { key: 'holidays', label: 'Holidays' },
  { key: 'other', label: 'Other' },
];

export default function PostForm() {
  const { idOrSlug } = useParams();
  const editing = !!idOrSlug;
  const navigate = useNavigate();
  const [postId, setPostId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [photos, setPhotos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(editing);

  useEffect(() => {
    if (!editing) return;
    apiRequest('GET', null, `/torah/posts/${idOrSlug}`)
      .then((p) => {
        setPostId(p.id);
        setForm({
          post_type: p.post_type, title: p.title || '', body_text: p.body_text || '',
          youtube_url: p.youtube_video_id ? `https://www.youtube.com/watch?v=${p.youtube_video_id}` : '',
          category: p.category || 'other',
        });
        setPhotos(p.photos || []);
      })
      .catch(() => setError('Could not load this post.'))
      .finally(() => setLoading(false));
  }, [editing, idOrSlug]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setSaving(true);
    const body = { ...form, photos: photos.map((p) => p.filename) };
    const req = editing
      ? apiRequest('PATCH', body, `/torah/posts/${postId}`)
      : apiRequest('POST', body, '/torah/posts');
    req
      .then((p) => navigate(`/posts/${p.slug}`))
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not save this post.'))
      .finally(() => setSaving(false));
  };

  if (loading) return <div className="feed-section"><div className="gs-container" style={{ maxWidth: 680 }}><p style={{ color: 'var(--muted)' }}>Loading…</p></div></div>;

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 680 }}>
        <Link to="/" className="tor-back-link">← Posts</Link>
        <div className="tor-masthead">
          <div className="tor-masthead-kicker"><BookOpen size={13} /> {editing ? 'Edit post' : 'Share Torah'}</div>
          <h1 className="tor-masthead-title">{editing ? `Edit ${form.title}` : 'Share a dvar Torah'}</h1>
          <p className="tor-masthead-sub">Text, a YouTube video, photos, or any mix -- whatever fits what you want to share.</p>
        </div>

        <form onSubmit={submit}>
          {error && <p className="tor-error">{error}</p>}

          <div className="tor-form-section">
            <h3>Type &amp; category</h3>
            <div className="tor-radio-row">
              <label className="tor-radio-option"><input type="radio" checked={form.post_type === 'text'} onChange={() => setForm((f) => ({ ...f, post_type: 'text' }))} /> Text</label>
              <label className="tor-radio-option"><input type="radio" checked={form.post_type === 'video'} onChange={() => setForm((f) => ({ ...f, post_type: 'video' }))} /> Video</label>
              <label className="tor-radio-option"><input type="radio" checked={form.post_type === 'image'} onChange={() => setForm((f) => ({ ...f, post_type: 'image' }))} /> Photos</label>
            </div>
            <div style={{ marginTop: 14 }}>
              <label className="tor-field-label">Category</label>
              <select className="gs-input" value={form.category} onChange={set('category')}>
                {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <div className="tor-form-section">
            <h3>Content</h3>
            <label className="tor-field-label">Title *</label>
            <input className="gs-input" value={form.title} onChange={set('title')} required style={{ marginBottom: 12 }} />

            {form.post_type === 'video' && (
              <>
                <label className="tor-field-label">YouTube URL</label>
                <input className="gs-input" placeholder="https://www.youtube.com/watch?v=..." value={form.youtube_url} onChange={set('youtube_url')} style={{ marginBottom: 12 }} />
              </>
            )}

            <label className="tor-field-label">Text (optional, in addition to video/photos)</label>
            <textarea className="gs-input" style={{ minHeight: 140 }} value={form.body_text} onChange={set('body_text')} />
          </div>

          {form.post_type === 'image' && (
            <div className="tor-form-section">
              <h3>Photos (up to 5)</h3>
              <TorahPhotoUpload photos={photos} onChange={setPhotos} />
            </div>
          )}

          <button type="submit" className="gs-btn gs-btn-primary" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Publish'}
          </button>
        </form>
      </div>
    </div>
  );
}
