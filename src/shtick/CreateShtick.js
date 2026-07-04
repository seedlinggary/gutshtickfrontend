import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import useFetch from '../UseFetch';
import UploadFile from '../Uploadfile';

const CreateShtick = () => {
  const [form, setForm] = useState({
    caption: '',
    credit: '',
    specific_category: '',
    category_id: '',
    content: null,
    url: null,
    picture: null,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const cookie = localStorage.getItem('cookie');
  const { data: categories } = useFetch('/generalc', {
    method: 'GET',
    headers: { 'x-access-token': cookie },
  });

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value || null }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.caption) { setError('Caption is required.'); return; }
    if (!form.category_id && categories?.length) {
      setError('Please select a category.'); return;
    }
    setError('');
    setLoading(true);
    try {
      const payload = {
        ...form,
        category_id: form.category_id || (categories?.[0]?.id ?? 1),
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
          <h2 className="create-title">Share Good Shtick</h2>
          <p className="create-subtitle">Post something worth sharing — a quote, link, image, or just a great caption.</p>

          {error && <div className="gs-error-box">{error}</div>}
          {success && (
            <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius)', padding: '14px 18px', color: 'var(--success)', marginBottom: 20 }}>
              Posted! Redirecting…
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Required fields */}
            <div className="gs-field">
              <label className="gs-label" htmlFor="category">Category</label>
              <select
                id="category"
                className="gs-select"
                value={form.category_id}
                onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
              >
                <option value="">Select a category…</option>
                {categories && categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="gs-field">
              <label className="gs-label" htmlFor="specific_cat">Specific category</label>
              <input
                id="specific_cat"
                className="gs-input"
                placeholder="e.g. Tech news, Funny videos…"
                value={form.specific_category || ''}
                onChange={(e) => setForm((f) => ({ ...f, specific_category: e.target.value }))}
              />
            </div>

            <div className="gs-field">
              <label className="gs-label" htmlFor="caption">Caption <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input
                id="caption"
                className="gs-input"
                placeholder="What's this about?"
                value={form.caption}
                onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))}
              />
            </div>

            <div className="gs-field">
              <label className="gs-label" htmlFor="credit">Credit / Source</label>
              <input
                id="credit"
                className="gs-input"
                placeholder="Where's it from?"
                value={form.credit || ''}
                onChange={(e) => setForm((f) => ({ ...f, credit: e.target.value }))}
              />
            </div>

            <hr className="create-divider" />
            <p className="create-optional-heading">Optional — add one of the following</p>

            <div className="gs-field">
              <label className="gs-label" htmlFor="content">Text content</label>
              <textarea
                id="content"
                className="gs-input gs-textarea"
                placeholder="A quote, joke, or snippet of text…"
                value={form.content || ''}
                onChange={set('content')}
              />
            </div>

            <div className="gs-field">
              <label className="gs-label" htmlFor="url">Link / URL</label>
              <input
                id="url"
                className="gs-input"
                placeholder="https://…"
                value={form.url || ''}
                onChange={set('url')}
              />
            </div>

            <div className="gs-field">
              <label className="gs-label">Image upload</label>
              <UploadFile
                setInvestors={(name) => setForm((f) => ({ ...f, picture: name }))}
                apiextension="/shtick/upload"
              />
              {form.picture && (
                <p style={{ fontSize: 12, color: 'var(--success)', marginTop: 6 }}>
                  ✓ Image uploaded
                </p>
              )}
            </div>

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
