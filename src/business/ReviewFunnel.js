import React, { useState } from 'react';
import apiRequest from '../ApiRequest';

const FEEDBACK_MAX = 1000;

/** Private-first review funnel: a happy customer (4-5 stars) gets routed to
 * the business's real Google review link -- worth more for local search
 * ranking than an on-site review. An unhappy one (1-3 stars) stays private
 * and reaches the owner directly instead of becoming a public post. This is
 * separate from the on-site public star rating (see BusinessProfile.js's
 * "Rate this business" box), which still exists unchanged. */
export default function ReviewFunnel({ businessId, googleReviewUrl }) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = (chosenStars) => {
    setStars(chosenStars);
    if (chosenStars >= 4) {
      setBusy(true);
      apiRequest('POST', { stars: chosenStars }, `/business/businesses/${businessId}/feedback`)
        .then((res) => setResult(res))
        .catch(() => setResult({ route_to_google: false }))
        .finally(() => setBusy(false));
    }
  };

  const submitLowFeedback = () => {
    setBusy(true);
    apiRequest('POST', { stars, comment: comment.trim() }, `/business/businesses/${businessId}/feedback`)
      .then(() => setResult({ submitted: true }))
      .catch(() => {})
      .finally(() => setBusy(false));
  };

  if (result?.route_to_google && googleReviewUrl) {
    return (
      <div className="biz-review-funnel biz-review-funnel-positive">
        <p>Glad to hear it! Mind sharing that on Google too? It really helps.</p>
        <a href={googleReviewUrl} target="_blank" rel="noopener noreferrer" className="gs-btn gs-btn-primary">
          ⭐ Leave a Google review
        </a>
      </div>
    );
  }
  if (result?.stars >= 4 || result?.submitted) {
    return <p className="biz-review-funnel-thanks">Thanks for the feedback!</p>;
  }

  if (stars > 0 && stars < 4) {
    return (
      <div className="biz-review-funnel biz-review-funnel-negative">
        <p>Sorry to hear that. What happened? This goes directly and privately to the owner.</p>
        <textarea
          maxLength={FEEDBACK_MAX} value={comment} onChange={(e) => setComment(e.target.value)}
          placeholder="Tell us what went wrong..."
        />
        <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'right', margin: '2px 0 6px' }}>{comment.length}/{FEEDBACK_MAX}</div>
        <button type="button" onClick={submitLowFeedback} disabled={busy}>{busy ? 'Sending…' : 'Send privately'}</button>
      </div>
    );
  }

  return (
    <div className="biz-review-funnel">
      <p className="biz-review-funnel-prompt">Been here before? How was it?</p>
      <p className="biz-review-funnel-explainer">A great rating takes you to leave a quick Google review; anything less comes straight to the owner, privately.</p>
      <div className="biz-review-funnel-stars">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => submit(n)} disabled={busy} aria-label={`${n} stars`}>★</button>
        ))}
      </div>
    </div>
  );
}
