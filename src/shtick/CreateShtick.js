import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import useFetch from '../UseFetch';
import UploadFile from '../Uploadfile';
import CategoryPicker from './CategoryPicker';

const CAPTION_MAX = 120;
const CREDIT_MAX = 125;

const CONTENT_TABS = [
  { key: 'link', label: '🔗 Link / Video' },
  { key: 'text', label: '📝 Text Quote' },
  { key: 'image', label: '🖼️ Image' },
];

const CreateShtick = () => {
  const [caption, setCaption] = useState('');
  const [credit, setCredit] = useState('');
  const [categoryIds, setCategoryIds] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [picture, setPicture] = useState(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const cookie = localStorage.getItem('cookie');
  const { data: categories } = useFetch('/generalc', {
    method: 'GET',
    headers: { 'x-access-token': cookie },
  });

  const selectTab = (key) => setActiveTab((prev) => (prev === key ? null : key));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!caption.trim()) { setError('Caption is required.'); return; }
    if (caption.length > CAPTION_MAX) { setError(`Caption must be ${CAPTION_MAX} characters or fewer.`); return; }
    if (credit.length > CREDIT_MAX) { setError(`Credit must be ${CREDIT_MAX} characters or fewer.`); return; }
    if (categories?.length && categoryIds.length === 0) {
      setError('Please select at least one category.'); return;
    }
    setError('');
    setLoading(true);
    try {
      const payload = {
        caption,
        credit: credit || null,
        category_ids: categoryIds,
        content: activeTab === 'text' ? (content || null) : null,
        url: activeTab === 'link' ? (url || null) : null,
        picture: activeTab === 'image' ? (picture || null) : null,
      };
      await apiRequest('POST', payload, '/shtick');
      setSuccess(true);
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-page">
      <div className="gs-container">
        <div className="create-card">
          <h2 className="create-title">Share Gut Shtick</h2>
          <p className="create-subtitle">Post something worth sharing — a quote, link, image, or just a great caption.</p>
          <p className="create-subtitle" style={{ marginTop: -8, marginBottom: 18 }}>
            Every post is reviewed before it goes live — see our{' '}
            <Link to="/content-guidelines">Content Guidelines</Link> for what gets approved.
          </p>

          {error && <div className="gs-error-box">{error}</div>}
          {success && (
            <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius)', padding: '14px 18px', color: 'var(--success)', marginBottom: 20 }}>
              Posted! Redirecting…
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Caption — required */}
            <div className="gs-field">
              <label className="gs-label" htmlFor="caption">Caption <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input
                id="caption"
                className="gs-input"
                placeholder="What's this about?"
                value={caption}
                maxLength={CAPTION_MAX}
                onChange={(e) => setCaption(e.target.value)}
              />
              <div className="char-counter">{caption.length}/{CAPTION_MAX}</div>
            </div>

            {/* Category — one picker, multiple options selectable */}
            <div className="gs-field">
              <label className="gs-label">Category <span style={{ color: 'var(--danger)' }}>*</span></label>
              <p className="gs-field-hint">Type to search — pick as many as apply.</p>
              <CategoryPicker
                categories={categories}
                selectedIds={categoryIds}
                onChange={setCategoryIds}
              />
            </div>

            <div className="gs-field">
              <label className="gs-label" htmlFor="credit">Credit / Source</label>
              <input
                id="credit"
                className="gs-input"
                placeholder="Where's it from?"
                value={credit}
                maxLength={CREDIT_MAX}
                onChange={(e) => setCredit(e.target.value)}
              />
              <div className="char-counter">{credit.length}/{CREDIT_MAX}</div>
            </div>

            <hr className="create-divider" />
            <p className="create-optional-heading">Optional — add one of the following</p>

            <div className="content-type-tabs">
              {CONTENT_TABS.map((t) => (
                <button
                  type="button"
                  key={t.key}
                  className={`content-type-tab${activeTab === t.key ? ' active' : ''}`}
                  onClick={() => selectTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {activeTab === 'link' && (
              <div className="gs-field">
                <label className="gs-label" htmlFor="url">Link / URL</label>
                <input
                  id="url"
                  className="gs-input"
                  placeholder="https://…"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  autoFocus
                />
                <div className="post-help-box">
                  <p><strong>✅ YouTube</strong> — paste any youtube.com or youtu.be link and it plays right in the post.</p>
                  <p><strong>✅ Twitter / X</strong> — paste a tweet link (twitter.com/…/status/… or x.com/…/status/…) and it embeds the full tweet.</p>
                  <p><strong>⚠️ WhatsApp Status</strong> — WhatsApp doesn't give statuses a public link. Save the photo/video from the status to your phone first, then use the <strong>🖼️ Image</strong> tab above to upload it directly.</p>
                  <p><strong>🔗 Everything else</strong> (Instagram, TikTok, Facebook, articles, etc.) — the link shows as a clickable card pointing to the original post. It won't play inline, just like WhatsApp.</p>
                </div>
              </div>
            )}

            {activeTab === 'text' && (
              <div className="gs-field">
                <label className="gs-label" htmlFor="content">Text content</label>
                <textarea
                  id="content"
                  className="gs-input gs-textarea"
                  placeholder="A quote, joke, or snippet of text…"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  autoFocus
                />
              </div>
            )}

            {activeTab === 'image' && (
              <div className="gs-field">
                <label className="gs-label">Image upload</label>
                <div className="post-help-box">
                  <p>Accepts JPG, PNG, or GIF. This is also the right place for a saved screenshot or downloaded video-thumbnail from a WhatsApp Status, Instagram Story, or anywhere else that doesn't support a direct link.</p>
                </div>
                <UploadFile
                  setInvestors={(name) => setPicture(name)}
                  apiextension="/shtick/upload"
                />
                {picture && (
                  <p style={{ fontSize: 12, color: 'var(--success)', marginTop: 6 }}>
                    ✓ Image uploaded
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              className="gs-btn gs-btn-primary gs-btn-block"
              style={{ marginTop: 8 }}
              disabled={loading || success}
            >
              {loading ? 'Posting…' : 'Post Shtick'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateShtick;
