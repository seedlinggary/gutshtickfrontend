import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Radio, Trash2, Eye, EyeOff } from 'lucide-react';
import apiRequest from '../ApiRequest';

const DEFAULT_MAX_WORDS = 15;

/** Admin-only management page for GutKol's ticker (see NewsTicker.js for
 * the public strip this feeds) -- add a short blurb, hide/show or delete
 * existing ones. No in-place editing: short enough that deleting and
 * re-adding is simpler than a whole edit flow. */
export default function TickerAdmin() {
  const [items, setItems] = useState(null);
  const [maxWords, setMaxWords] = useState(DEFAULT_MAX_WORDS);
  const [text, setText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    apiRequest('GET', null, '/news/ticker/admin')
      .then((d) => { setItems(d.items || []); setMaxWords(d.max_words || DEFAULT_MAX_WORDS); })
      .catch(() => setItems([]));
  };
  useEffect(load, []);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const overLimit = wordCount > maxWords;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!text.trim()) { setError('Text is required.'); return; }
    if (overLimit) { setError(`Keep it to ${maxWords} words or fewer.`); return; }
    setSaving(true);
    try {
      await apiRequest('POST', { text: text.trim(), link_url: linkUrl.trim() || null }, '/news/ticker');
      setText('');
      setLinkUrl('');
      load();
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Could not add this item.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item) => {
    await apiRequest('PATCH', { is_active: !item.is_active }, `/news/ticker/${item.id}`);
    load();
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this ticker item?')) return;
    await apiRequest('DELETE', null, `/news/ticker/${id}`);
    load();
  };

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 680 }}>
        <Link to="/" className="news-back-link">← Articles</Link>
        <div className="news-masthead">
          <div className="news-masthead-kicker"><Radio size={13} /> Admin</div>
          <h1 className="news-masthead-title">Ticker</h1>
          <p className="news-masthead-sub">Short scrolling headlines shown at the top of every GutKol page -- {maxWords} words or fewer each.</p>
        </div>

        <form onSubmit={submit} className="news-form-section">
          {error && <p className="news-error">{error}</p>}
          <label className="news-field-label">Text *</label>
          <textarea className="gs-input" style={{ minHeight: 60, marginBottom: 4 }} value={text} onChange={(e) => setText(e.target.value)} />
          <p style={{ margin: '0 0 12px', fontSize: 12.5, color: overLimit ? '#b3261e' : 'var(--muted)' }}>
            {wordCount}/{maxWords} words
          </p>

          <label className="news-field-label">Link (optional -- an article path or external URL)</label>
          <input
            className="gs-input" placeholder="/articles/some-slug or https://..."
            value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} style={{ marginBottom: 12 }}
          />

          <button type="submit" className="gs-btn gs-btn-primary gs-btn-sm" disabled={saving || overLimit}>
            {saving ? 'Adding…' : 'Add to ticker'}
          </button>
        </form>

        {items === null && <p style={{ color: 'var(--muted)' }}>Loading…</p>}
        {items && items.length === 0 && <p className="news-empty">No ticker items yet.</p>}
        {items && items.map((item) => (
          <div key={item.id} className="news-pending-card">
            <div style={{ flex: 1 }}>
              <strong style={{ opacity: item.is_active ? 1 : 0.5 }}>{item.text}</strong>
              {item.link_url && <p style={{ margin: '4px 0', fontSize: 12.5, color: 'var(--muted)' }}>{item.link_url}</p>}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => toggleActive(item)}>
                  {item.is_active ? <><EyeOff size={13} /> Hide</> : <><Eye size={13} /> Show</>}
                </button>
                <button type="button" className="gs-btn gs-btn-danger gs-btn-sm" onClick={() => remove(item.id)}>
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
