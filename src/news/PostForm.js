import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Newspaper } from 'lucide-react';
import apiRequest from '../ApiRequest';
import UploadFile from '../Uploadfile';

const EMPTY = { title: '', excerpt: '', body_text: '', category: 'other', source_url: '', image: '' };

const CATEGORIES = [
  { key: 'world', label: 'World' }, { key: 'politics', label: 'Politics' }, { key: 'business', label: 'Business' },
  { key: 'science', label: 'Science' }, { key: 'health', label: 'Health' }, { key: 'sports', label: 'Sports' },
  { key: 'entertainment', label: 'Entertainment' }, { key: 'other', label: 'Other' },
];

export default function PostForm() {
  const { idOrSlug } = useParams();
  const editing = !!idOrSlug;
  const navigate = useNavigate();
  const [articleId, setArticleId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(editing);

  useEffect(() => {
    if (!editing) return;
    apiRequest('GET', null, `/news/articles/${idOrSlug}`)
      .then((a) => {
        setArticleId(a.id);
        setForm({
          title: a.title || '', excerpt: a.excerpt || '', body_text: a.body_text || '',
          category: a.category || 'other', source_url: a.source_url || '', image: '',
        });
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
    const req = editing
      ? apiRequest('PATCH', form, `/news/articles/${articleId}`)
      : apiRequest('POST', form, '/news/articles');
    req
      .then((a) => navigate(`/articles/${a.slug}`))
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not save this post.'))
      .finally(() => setSaving(false));
  };

  if (loading) return <div className="feed-section"><div className="gs-container" style={{ maxWidth: 680 }}><p style={{ color: 'var(--muted)' }}>Loading…</p></div></div>;

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 680 }}>
        <Link to="/" className="news-back-link">← Articles</Link>
        <div className="news-masthead">
          <div className="news-masthead-kicker"><Newspaper size={13} /> {editing ? 'Edit post' : 'Write a Post'}</div>
          <h1 className="news-masthead-title">{editing ? `Edit ${form.title}` : 'Write an original post'}</h1>
          <p className="news-masthead-sub">Share something newsworthy -- a local update, an op-ed, a story worth knowing about.</p>
        </div>

        <form onSubmit={submit}>
          {error && <p className="news-error">{error}</p>}

          <div className="news-form-section">
            <label className="news-field-label">Title *</label>
            <input className="gs-input" value={form.title} onChange={set('title')} required style={{ marginBottom: 12 }} />

            <label className="news-field-label">Category</label>
            <select className="gs-input" value={form.category} onChange={set('category')} style={{ marginBottom: 12 }}>
              {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>

            <label className="news-field-label">Excerpt (shown on the feed)</label>
            <textarea className="gs-input" style={{ minHeight: 70, marginBottom: 12 }} value={form.excerpt} onChange={set('excerpt')} />

            <label className="news-field-label">Full text</label>
            <textarea className="gs-input" style={{ minHeight: 160, marginBottom: 12 }} value={form.body_text} onChange={set('body_text')} />

            <label className="news-field-label">Source link (optional, if based on an external article)</label>
            <input className="gs-input" type="url" placeholder="https://..." value={form.source_url} onChange={set('source_url')} style={{ marginBottom: 12 }} />

            <label className="news-field-label">Photo (optional)</label>
            <UploadFile apiextension="/news/upload" setInvestors={(name) => setForm((f) => ({ ...f, image: name }))} />
          </div>

          <button type="submit" className="gs-btn gs-btn-primary" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Publish'}
          </button>
        </form>
      </div>
    </div>
  );
}
