import React, { useState } from 'react';
import { Newspaper } from 'lucide-react';
import apiRequest from '../ApiRequest';
import GuestContactFields from '../guest/GuestContactFields';
import GuestSubmitSuccess from '../guest/GuestSubmitSuccess';

const TITLE_MAX = 200;
const EXCERPT_MAX = 500;
const BODY_MAX = 8000;

const CATEGORIES = [
  { key: 'world', label: 'World' }, { key: 'politics', label: 'Politics' }, { key: 'business', label: 'Business' },
  { key: 'science', label: 'Science' }, { key: 'health', label: 'Health' }, { key: 'sports', label: 'Sports' },
  { key: 'entertainment', label: 'Entertainment' }, { key: 'other', label: 'Other' },
];

/** Gut News is still soft-locked to super_admin-only (see SuperAdminGate.js)
 * -- but the backend's guest-submission routes were deliberately left
 * un-gated so submissions can stockpile ahead of launch (see the matching
 * note above create_guest_article in backend/news/routes/news_article.py).
 * This page -- and its /guest/news/:token manage counterpart -- are
 * registered in news/routes.js OUTSIDE the SuperAdminGate wrapper for
 * exactly that reason; don't move them inside it. No image upload here
 * (/news/upload is @token_required, no guest equivalent exists). */
export default function NewsGuestSubmit() {
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [category, setCategory] = useState('other');
  const [sourceUrl, setSourceUrl] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required.'); return; }
    if (!guestEmail.trim() && !guestPhone.trim()) {
      setError('Add an email or phone so we can send you a link to manage this later.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const created = await apiRequest('POST', {
        title: title.trim(),
        excerpt: excerpt.trim() || null,
        body_text: bodyText.trim() || null,
        category,
        source_url: sourceUrl.trim() || null,
        guest_email: guestEmail.trim() || null,
        guest_phone: guestPhone.trim() || null,
      }, '/news/articles/guest');
      setResult(created);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="feed-section">
        <div className="gs-container" style={{ maxWidth: 680 }}>
          <div className="news-masthead">
            <div className="news-masthead-kicker"><Newspaper size={13} /> Gut News</div>
            <h1 className="news-masthead-title">Thanks for the tip</h1>
          </div>
          <GuestSubmitSuccess
            manageUrl={`${window.location.origin}/guest/news/${result.guest_manage_token}`}
            guestEmail={guestEmail.trim()}
            message="Submitted! It'll be reviewed before anything goes live."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 680 }}>
        <div className="news-masthead">
          <div className="news-masthead-kicker"><Newspaper size={13} /> Gut News</div>
          <h1 className="news-masthead-title">Submit a news tip</h1>
          <p className="news-masthead-sub">
            No account needed — a local update, an op-ed, or a story worth knowing about. Every submission is reviewed before it goes live.
          </p>
        </div>

        <form onSubmit={submit}>
          {error && <p className="news-error">{error}</p>}

          <div className="news-form-section">
            <label className="news-field-label">Title *</label>
            <input className="gs-input" value={title} maxLength={TITLE_MAX} onChange={(e) => setTitle(e.target.value)} required style={{ marginBottom: 12 }} />

            <label className="news-field-label">Category</label>
            <select className="gs-input" value={category} onChange={(e) => setCategory(e.target.value)} style={{ marginBottom: 12 }}>
              {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>

            <label className="news-field-label">Excerpt (shown on the feed)</label>
            <textarea className="gs-input" style={{ minHeight: 70, marginBottom: 12 }} value={excerpt} maxLength={EXCERPT_MAX} onChange={(e) => setExcerpt(e.target.value)} />

            <label className="news-field-label">Full text</label>
            <textarea className="gs-input" style={{ minHeight: 160, marginBottom: 12 }} value={bodyText} maxLength={BODY_MAX} onChange={(e) => setBodyText(e.target.value)} />

            <label className="news-field-label">Source link (optional, if based on an external article)</label>
            <input className="gs-input" type="url" placeholder="https://..." value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} style={{ marginBottom: 12 }} />

            <GuestContactFields email={guestEmail} phone={guestPhone} onEmailChange={setGuestEmail} onPhoneChange={setGuestPhone} />
          </div>

          <button type="submit" className="gs-btn gs-btn-primary" disabled={loading} style={{ marginTop: 12 }}>
            {loading ? 'Submitting…' : 'Submit for review'}
          </button>
        </form>
      </div>
    </div>
  );
}
