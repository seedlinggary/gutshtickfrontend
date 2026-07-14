import React, { useEffect, useState } from 'react';
import apiRequest from '../ApiRequest';

/**
 * Self-contained SuperAdmin panel: generate short-form posts via the OpenAI API
 * and drop them into the pending-approval queue. No required props — fetches its
 * own category list. Meant to be dropped into a new SuperAdminDashboard tab.
 */
export default function AdminAiPosts() {
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [count, setCount] = useState(20);
  const [includeImage, setIncludeImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    // Reuse the existing public categories endpoint (schema: [{ id, name }, ...]).
    apiRequest('GET', null, '/generalc')
      .then((cats) => {
        if (cancelled) return;
        setCategories(cats || []);
        if (cats && cats.length > 0) setCategoryId(String(cats[0].id));
      })
      .catch(() => { if (!cancelled) setError('Failed to load categories.'); });
    return () => { cancelled = true; };
  }, []);

  const generate = async () => {
    setError('');
    setResult(null);
    if (!categoryId) {
      setError('Please pick a category.');
      return;
    }
    const n = Number(count);
    if (!Number.isInteger(n) || n < 1) {
      setError('Count must be a whole number of at least 1.');
      return;
    }

    setLoading(true);
    try {
      const data = await apiRequest('POST', {
        category_id: Number(categoryId),
        count: n,
        include_image: includeImage,
      }, '/content-pipeline/ai/generate');
      setResult(data);
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-ai-posts">
      <div className="gs-card" style={{ maxWidth: 560 }}>
        <div className="gs-card-body">
          <h3 className="shtick-caption" style={{ marginBottom: 6 }}>🤖 AI Content Generator</h3>
          <p className="admin-empty" style={{ margin: '0 0 18px' }}>
            Generate short posts with the OpenAI API. They land in the <strong>Pending</strong> queue
            for review before going live — nothing is auto-published.
          </p>

          <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 14 }}>Category</label>
          <select
            className="auth-input"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={loading || categories.length === 0}
            style={{ width: '100%', marginBottom: 6 }}
          >
            {categories.length === 0 && <option value="">No categories found</option>}
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <p className="admin-empty" style={{ margin: '0 0 16px', fontSize: 13 }}>
            Need a new category? Add one in the Categories tab.
          </p>

          <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 14 }}>
            How many posts?
          </label>
          <input
            type="number"
            className="auth-input"
            min={1}
            max={50}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            disabled={loading}
            style={{ width: '100%', marginBottom: 16 }}
          />

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={includeImage}
              onChange={(e) => setIncludeImage(e.target.checked)}
              disabled={loading}
            />
            <span>Include AI-generated images <em style={{ opacity: 0.7 }}>(slower &amp; costs more)</em></span>
          </label>

          <button
            className="gs-btn gs-btn-primary"
            onClick={generate}
            disabled={loading || !categoryId}
            style={{ width: '100%' }}
          >
            {loading ? 'Generating…' : `Generate ${count || ''} post${Number(count) === 1 ? '' : 's'}`}
          </button>

          {loading && (
            <div className="gs-loading" style={{ marginTop: 18 }}>
              <div className="gs-spinner" />
              <p className="admin-empty" style={{ marginTop: 10 }}>
                This can take a while{includeImage ? ' (images take longer)' : ''} — hang tight, don't close the tab.
              </p>
            </div>
          )}

          {error && (
            <div className="gs-error-box" style={{ marginTop: 16 }}>{error}</div>
          )}

          {result && !loading && (
            <div className="gs-success-box" style={{ marginTop: 16 }}>
              ✅ {result.created} post{result.created === 1 ? '' : 's'} created
              {result.failed > 0 ? `, ${result.failed} failed` : ''}
              {result.duplicates_skipped > 0 ? `, ${result.duplicates_skipped} duplicate${result.duplicates_skipped === 1 ? '' : 's'} skipped` : ''}
              {' '}in “{result.category}”.
              {' '}Check the Pending queue to review {result.created === 1 ? 'it' : 'them'}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
