import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import UploadFile from '../Uploadfile';
import { POST_TYPE_META } from './categories';

const TITLE_MAX = 150;
const BODY_MAX = 4000;

export default function CreateDealPost() {
  const { idOrSlug } = useParams();
  const navigate = useNavigate();
  const [business, setBusiness] = useState(null);
  const [postType, setPostType] = useState('sale');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [image, setImage] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiRequest('GET', null, `/business/businesses/${idOrSlug}`)
      .then(setBusiness)
      .catch(() => setError('Could not load this business.'))
      .finally(() => setLoading(false));
  }, [idOrSlug]);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required.'); return; }
    if (!body.trim()) { setError('Body is required.'); return; }
    setError('');
    setSubmitting(true);
    try {
      await apiRequest('POST', {
        business_id: business.id, post_type: postType, title: title.trim(), body: body.trim(), image,
      }, '/business/posts');
      navigate(`/business/${business.slug}`);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Could not post. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="feed-section"><div className="gs-container"><div className="gs-loading"><div className="gs-spinner" /> Loading…</div></div></div>;
  if (!business) return <div className="feed-section"><div className="gs-container"><div className="gs-error-box">{error || 'Business not found.'}</div></div></div>;
  if (!business.is_own_business) {
    return <div className="feed-section"><div className="gs-container"><div className="gs-error-box">Only this business's claimed owner can post deals.</div></div></div>;
  }

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 680 }}>
        <h1>Post a Deal — {business.name}</h1>
        {error && <div className="gs-error-box">{error}</div>}
        <form onSubmit={submit}>
          <div className="gs-field">
            <div className="content-type-tabs">
              {Object.entries(POST_TYPE_META).map(([key, meta]) => (
                <button key={key} type="button" className={`content-type-tab${postType === key ? ' active' : ''}`} onClick={() => setPostType(key)}>
                  {meta.label}
                </button>
              ))}
            </div>
          </div>
          <div className="gs-field">
            <input className="gs-input" placeholder="Title" value={title} maxLength={TITLE_MAX} onChange={(e) => setTitle(e.target.value)} />
            <div className="char-counter">{title.length}/{TITLE_MAX}</div>
          </div>
          <div className="gs-field">
            <textarea className="gs-input gs-textarea" placeholder="Details…" rows={5} value={body} maxLength={BODY_MAX} onChange={(e) => setBody(e.target.value)} />
          </div>
          <div className="gs-field">
            <div className="gs-label">Image (optional)</div>
            <UploadFile setInvestors={(name_) => setImage(name_)} apiextension="/business/posts/upload" />
            {image && <span style={{ fontSize: 12, color: 'var(--muted)' }}>Uploaded ✓</span>}
          </div>
          <button type="submit" className="gs-btn gs-btn-primary" disabled={submitting}>
            {submitting ? 'Posting…' : 'Post deal'}
          </button>
        </form>
      </div>
    </div>
  );
}
