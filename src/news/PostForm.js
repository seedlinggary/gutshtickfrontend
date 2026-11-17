import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Newspaper, Radio } from 'lucide-react';
import apiRequest from '../ApiRequest';
import UploadFile from '../Uploadfile';
import CategorySelect from './CategorySelect';
import { isAdmin } from '../auth';

const EMPTY = { title: '', excerpt: '', body_text: '', categories: ['finance'], source_url: '', image: '' };
const TICKER_DEFAULT_MAX_WORDS = 15;

export default function PostForm() {
  const { idOrSlug } = useParams();
  const editing = !!idOrSlug;
  const boss = isAdmin();
  const navigate = useNavigate();
  const [articleId, setArticleId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(editing);

  // Admin-only shortcut: skip the full article form entirely and post a
  // short scrolling headline instead (see TickerAdmin.js, which this
  // mirrors -- that page still exists for managing/hiding/deleting items
  // after the fact, this is just a more discoverable way to ADD one from
  // the same place everyone already goes to post something).
  const [tickerMode, setTickerMode] = useState(false);
  const [tickerMaxWords, setTickerMaxWords] = useState(TICKER_DEFAULT_MAX_WORDS);
  const [tickerText, setTickerText] = useState('');
  const [tickerLink, setTickerLink] = useState('');

  useEffect(() => {
    if (!boss || editing) return;
    apiRequest('GET', null, '/news/ticker/admin')
      .then((d) => setTickerMaxWords(d.max_words || TICKER_DEFAULT_MAX_WORDS))
      .catch(() => {});
  }, [boss, editing]);

  useEffect(() => {
    if (!editing) return;
    apiRequest('GET', null, `/news/articles/${idOrSlug}`)
      .then((a) => {
        setArticleId(a.id);
        setForm({
          title: a.title || '', excerpt: a.excerpt || '', body_text: a.body_text || '',
          categories: a.categories && a.categories.length ? a.categories : ['other'], source_url: a.source_url || '', image: '',
        });
      })
      .catch(() => setError('Could not load this post.'))
      .finally(() => setLoading(false));
  }, [editing, idOrSlug]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const tickerWordCount = tickerText.trim() ? tickerText.trim().split(/\s+/).length : 0;
  const tickerOverLimit = tickerWordCount > tickerMaxWords;

  const submit = (e) => {
    e.preventDefault();
    setError('');

    if (tickerMode) {
      if (!tickerText.trim()) { setError('Text is required.'); return; }
      if (tickerOverLimit) { setError(`Keep it to ${tickerMaxWords} words or fewer.`); return; }
      setSaving(true);
      apiRequest('POST', { text: tickerText.trim(), link_url: tickerLink.trim() || null }, '/news/ticker')
        .then(() => navigate('/ticker'))
        .catch((err) => setError(typeof err === 'string' ? err : 'Could not add this ticker item.'))
        .finally(() => setSaving(false));
      return;
    }

    if (!form.title.trim()) { setError('Title is required.'); return; }
    if (!form.excerpt.trim()) { setError('A short snippet/headline (excerpt) is required.'); return; }
    if (!form.body_text.trim()) { setError('The full article text is required.'); return; }
    if (!form.categories.length) { setError('Pick at least one category, or add your own.'); return; }
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
          <div className="news-masthead-kicker">
            {tickerMode ? <Radio size={13} /> : <Newspaper size={13} />} {editing ? 'Edit post' : tickerMode ? 'Add a ticker headline' : 'Write a Post'}
          </div>
          <h1 className="news-masthead-title">{editing ? `Edit ${form.title}` : tickerMode ? 'Just a quick headline' : 'Write an original post'}</h1>
          <p className="news-masthead-sub">
            {tickerMode
              ? `A short scrolling headline shown at the top of every GutKol page -- ${tickerMaxWords} words or fewer, optionally linking somewhere.`
              : 'Share something newsworthy -- a local update, an op-ed, a story worth knowing about.'}
          </p>
        </div>

        {boss && !editing && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 16px', fontSize: 13.5, fontWeight: 600, color: 'var(--muted)' }}>
            <input type="checkbox" checked={tickerMode} onChange={(e) => { setTickerMode(e.target.checked); setError(''); }} />
            This is just a ticker headline, not a full article
          </label>
        )}

        {tickerMode && !editing ? (
          <form onSubmit={submit} className="news-form-section">
            {error && <p className="news-error">{error}</p>}
            <label className="news-field-label">Text *</label>
            <textarea className="gs-input" style={{ minHeight: 60, marginBottom: 4 }} value={tickerText} onChange={(e) => setTickerText(e.target.value)} />
            <p style={{ margin: '0 0 12px', fontSize: 12.5, color: tickerOverLimit ? '#b3261e' : 'var(--muted)' }}>
              {tickerWordCount}/{tickerMaxWords} words
            </p>

            <label className="news-field-label">Link (optional -- an article path or external URL)</label>
            <input
              className="gs-input" placeholder="/articles/some-slug or https://..."
              value={tickerLink} onChange={(e) => setTickerLink(e.target.value)} style={{ marginBottom: 12 }}
            />

            <button type="submit" className="gs-btn gs-btn-primary" disabled={saving || tickerOverLimit}>
              {saving ? 'Adding…' : 'Add to ticker'}
            </button>
          </form>
        ) : (
          <form onSubmit={submit}>
            {error && <p className="news-error">{error}</p>}

            <div className="news-form-section">
              <label className="news-field-label">Title *</label>
              <input className="gs-input" value={form.title} onChange={set('title')} required style={{ marginBottom: 12 }} />

              <label className="news-field-label">Topics * (up to 3)</label>
              <CategorySelect value={form.categories} onChange={(v) => setForm((f) => ({ ...f, categories: v }))} />

              <label className="news-field-label">Excerpt / snippet headline (shown on the feed) *</label>
              <textarea className="gs-input" style={{ minHeight: 70, marginBottom: 12 }} value={form.excerpt} onChange={set('excerpt')} required />

              <label className="news-field-label">Full text *</label>
              <textarea className="gs-input" style={{ minHeight: 160, marginBottom: 12 }} value={form.body_text} onChange={set('body_text')} required />

              <label className="news-field-label">Source link (optional, if based on an external article)</label>
              <input className="gs-input" type="url" placeholder="https://..." value={form.source_url} onChange={set('source_url')} style={{ marginBottom: 12 }} />

              <label className="news-field-label">Photo (optional)</label>
              <UploadFile apiextension="/news/upload" setInvestors={(name) => setForm((f) => ({ ...f, image: name }))} />
            </div>

            <button type="submit" className="gs-btn gs-btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Publish'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
