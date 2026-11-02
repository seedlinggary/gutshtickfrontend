import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Newspaper, CheckCircle2, Clock, XCircle } from 'lucide-react';
import apiRequest from '../ApiRequest';

const TITLE_MAX = 200;
const EXCERPT_MAX = 500;
const BODY_MAX = 8000;

const CATEGORIES = [
  { key: 'world', label: 'World' }, { key: 'politics', label: 'Politics' }, { key: 'business', label: 'Business' },
  { key: 'science', label: 'Science' }, { key: 'health', label: 'Health' }, { key: 'sports', label: 'Sports' },
  { key: 'entertainment', label: 'Entertainment' }, { key: 'other', label: 'Other' },
];

function StatusNotice({ article }) {
  if (article.approved_to_publish === null) {
    return <div className="gs-success-box" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={15} /> Pending review.</div>;
  }
  if (article.approved_to_publish === false) {
    return <div className="gs-error-box" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><XCircle size={15} /> Not approved. Editing and saving sends it back in for review.</div>;
  }
  return <div className="gs-success-box" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle2 size={15} /> Live on Gut News.</div>;
}

/** Token-only management page for a guest (no-account) News submission --
 * see NewsGuestSubmit.js for why this stays registered outside the site's
 * SuperAdminGate in news/routes.js. */
export default function NewsGuestManage() {
  const { token } = useParams();
  const [state, setState] = useState('loading');
  const [article, setArticle] = useState(null);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [category, setCategory] = useState('other');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    apiRequest('GET', null, `/news/articles/guest/${token}`)
      .then((data) => { setArticle(data); setState('ready'); })
      .catch(() => setState('notfound'));
  }, [token]);

  const startEdit = () => {
    setTitle(article.title || '');
    setExcerpt(article.excerpt || '');
    setBodyText(article.body_text || '');
    setCategory(article.category || 'other');
    setError('');
    setEditing(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required.'); return; }
    setBusy(true);
    setError('');
    try {
      const updated = await apiRequest('PATCH', {
        title: title.trim(), excerpt: excerpt.trim() || null, body_text: bodyText.trim() || null, category,
      }, `/news/articles/guest/${token}`);
      setArticle(updated);
      setEditing(false);
      setMsg('Saved.');
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to save changes.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Delete this submission? This cannot be undone.')) return;
    setBusy(true);
    try {
      await apiRequest('DELETE', null, `/news/articles/guest/${token}`);
      setState('deleted');
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to delete.');
      setBusy(false);
    }
  };

  if (state === 'loading') {
    return <div className="feed-section"><div className="gs-container" style={{ maxWidth: 680 }}><div className="gs-loading"><div className="gs-spinner" /> Loading…</div></div></div>;
  }

  if (state === 'notfound') {
    return (
      <div className="feed-section">
        <div className="gs-container" style={{ maxWidth: 680, textAlign: 'center' }}>
          <div className="gs-error-box">This link is invalid, or the submission it manages has been removed.</div>
        </div>
      </div>
    );
  }

  if (state === 'deleted') {
    return (
      <div className="feed-section">
        <div className="gs-container" style={{ maxWidth: 680, textAlign: 'center' }}>
          <div className="gs-success-box">Your submission has been deleted.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 680 }}>
        <div className="news-masthead">
          <div className="news-masthead-kicker"><Newspaper size={13} /> Gut News</div>
          <h1 className="news-masthead-title">Manage your submission</h1>
          <p className="news-masthead-sub">No account needed — this private link is how you manage it.</p>
        </div>

        {msg && <div className="gs-success-box" style={{ marginBottom: 12 }}>{msg}</div>}
        {error && <p className="news-error">{error}</p>}
        <div style={{ marginBottom: 14 }}><StatusNotice article={article} /></div>

        {!editing ? (
          <div className="news-form-section">
            <h3 style={{ marginTop: 0 }}>{article.title}</h3>
            {article.excerpt && <p style={{ color: 'var(--muted)' }}>{article.excerpt}</p>}
            {article.body_text && <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{article.body_text}</p>}
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={startEdit} disabled={busy}>Edit</button>
              <button className="gs-btn gs-btn-danger gs-btn-sm" onClick={remove} disabled={busy}>Delete</button>
            </div>
          </div>
        ) : (
          <form onSubmit={saveEdit} className="news-form-section">
            <label className="news-field-label">Title *</label>
            <input className="gs-input" value={title} maxLength={TITLE_MAX} onChange={(e) => setTitle(e.target.value)} style={{ marginBottom: 12 }} />

            <label className="news-field-label">Category</label>
            <select className="gs-input" value={category} onChange={(e) => setCategory(e.target.value)} style={{ marginBottom: 12 }}>
              {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>

            <label className="news-field-label">Excerpt</label>
            <textarea className="gs-input" style={{ minHeight: 70, marginBottom: 12 }} value={excerpt} maxLength={EXCERPT_MAX} onChange={(e) => setExcerpt(e.target.value)} />

            <label className="news-field-label">Full text</label>
            <textarea className="gs-input" style={{ minHeight: 160, marginBottom: 12 }} value={bodyText} maxLength={BODY_MAX} onChange={(e) => setBodyText(e.target.value)} />

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="gs-btn gs-btn-primary gs-btn-sm" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
              <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setEditing(false)} disabled={busy}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
