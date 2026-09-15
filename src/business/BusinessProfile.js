import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import apiRequest from '../ApiRequest';
import timeAgo from '../utils/timeAgo';
import { isLoggedIn } from '../auth';
import StarRating from './StarRating';
import { CATEGORY_LABELS, POST_TYPE_META, WEEKDAYS, LOCATION_TYPE_META } from './categories';
import { hoursToday, isOpenNow } from './hours';
import TypeTags from './TypeTags';

function LocationCard({ loc }) {
  const today = hoursToday(loc);
  const open = isOpenNow(loc);
  const type = loc.location_type || 'physical';
  const typeMeta = LOCATION_TYPE_META[type];
  return (
    <div className="gs-card" style={{ marginBottom: 10 }}>
      <div className="gs-card-body">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: loc.is_primary ? 6 : 0 }}>
          {loc.is_primary && <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>MAIN LOCATION</span>}
          {type !== 'physical' && (
            <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>{typeMeta.icon} {typeMeta.label}</span>
          )}
          {open === true && <span className="biz-badge biz-badge-open">● Open now</span>}
          {open === false && <span className="biz-badge biz-badge-closed">Closed now</span>}
          {loc.kashrut && <span className="biz-badge biz-badge-kashrut">✡️ {loc.kashrut}</span>}
        </div>
        {type === 'online' && (
          <p style={{ color: 'var(--muted)', margin: 0 }}>No physical location — this business operates online.</p>
        )}
        {type === 'delivery' && (
          <div>🚚 Delivers to {[loc.city, loc.country].filter(Boolean).join(', ') || 'your area'}</div>
        )}
        {type === 'physical' && loc.address && <div>{loc.address}</div>}
        {type === 'physical' && loc.city && <div style={{ color: 'var(--muted)' }}>{[loc.city, loc.state, loc.zip_code, loc.country].filter(Boolean).join(', ')}</div>}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 6, fontSize: 13 }}>
          {loc.phone && <span>📞 {loc.phone}</span>}
          {loc.email && <span>✉️ {loc.email}</span>}
          {today && <span>🕒 {today}</span>}
        </div>
        {loc.hours && (
          <details style={{ marginTop: 6, fontSize: 13 }}>
            <summary style={{ cursor: 'pointer', color: 'var(--muted)' }}>Full hours</summary>
            <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
              {WEEKDAYS.map((w) => {
                const d = loc.hours[w.key];
                return (
                  <li key={w.key}>
                    {w.label}: {d ? (d.closed ? 'Closed' : `${d.open || '?'}–${d.close || '?'}`) : '—'}
                  </li>
                );
              })}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}

function CommentsSection({ businessId, comments, onAdded }) {
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const loggedIn = isLoggedIn();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      const created = await apiRequest('POST', { body: body.trim() }, `/business/businesses/${businessId}/comments`);
      setBody('');
      onAdded(created);
    } catch (_) {
      // no-op -- comment box just stays filled so the user can retry
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="gs-card" style={{ marginTop: 16 }}>
      <div className="gs-card-body">
        <h3 style={{ marginTop: 0 }}>Comments</h3>
        {loggedIn ? (
          <form onSubmit={submit} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input className="gs-input" placeholder="Leave a comment…" value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} />
            <button className="gs-btn gs-btn-primary" disabled={submitting || !body.trim()}>Post</button>
          </form>
        ) : (
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate(`/signin?next=${encodeURIComponent(window.location.pathname)}`)}>Sign in</button> to leave a comment.
          </p>
        )}
        {comments.length === 0 && <p style={{ color: 'var(--muted)' }}>No comments yet.</p>}
        {comments.map((c) => (
          <div key={c.id} style={{ padding: '8px 0', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{c.user?.profile_name || 'Anonymous'} <span style={{ fontWeight: 400, color: 'var(--muted)' }}>· {timeAgo(c.pub_date)}</span></div>
            <div>{c.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'locations', label: 'Locations' },
  { key: 'deals', label: 'Deals' },
  { key: 'reviews', label: 'Reviews' },
];

export default function BusinessProfile() {
  const { idOrSlug } = useParams();
  const navigate = useNavigate();
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [claimMessage, setClaimMessage] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [claimNotice, setClaimNotice] = useState('');
  const [myReview, setMyReview] = useState('');
  const [rating, setRating] = useState(false);
  const [tab, setTab] = useState('overview');

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    apiRequest('GET', null, `/business/businesses/${idOrSlug}`)
      .then((data) => { setBusiness(data); setMyReview(data.my_rating?.review_text || ''); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [idOrSlug]);

  useEffect(() => { load(); }, [load]);

  const submitClaim = async () => {
    if (!isLoggedIn()) { navigate(`/signin?next=${encodeURIComponent(window.location.pathname)}`); return; }
    setClaiming(true);
    try {
      await apiRequest('POST', { message: claimMessage.trim() || undefined }, `/business/businesses/${business.id}/claim`);
      setClaimNotice('Claim submitted — an admin will review it shortly.');
      load();
    } catch (err) {
      setClaimNotice(typeof err === 'string' ? err : 'Could not submit claim.');
    } finally {
      setClaiming(false);
    }
  };

  const rate = async (stars) => {
    if (!isLoggedIn()) { navigate(`/signin?next=${encodeURIComponent(window.location.pathname)}`); return; }
    setRating(true);
    try {
      await apiRequest('POST', { stars, review_text: myReview.trim() || undefined }, `/business/businesses/${business.id}/rate`);
      load();
    } finally {
      setRating(false);
    }
  };

  if (loading) return <div className="feed-section"><div className="gs-container"><div className="gs-loading"><div className="gs-spinner" /> Loading…</div></div></div>;
  if (error || !business) return <div className="feed-section"><div className="gs-container"><div className="gs-error-box">Business not found.</div></div></div>;

  const dealCount = business.recent_posts?.length || 0;
  const reviewCount = business.recent_comments?.length || 0;

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 680 }}>
        <Link to="/" className="biz-back-link">← Back to Directory</Link>
        <div className="biz-hero">
          <div className="biz-hero-top">
            <div className="biz-hero-logo">
              {business.logo_url ? <img src={business.logo_url} alt={business.name} /> : (business.is_food ? '🍽️' : '🏪')}
            </div>
            <div style={{ flex: 1 }}>
              <h1>{business.name} {business.is_claimed && <span className="biz-badge biz-badge-claimed" title="Claimed by verified owner">✓ Claimed</span>}</h1>
              <div className="biz-hero-category">{CATEGORY_LABELS[business.category] || business.category}</div>
              <TypeTags types={business.attributes?.types} />
              <div style={{ marginTop: 6 }}>
                <StarRating value={business.rating_avg} count={business.rating_count} />
              </div>
              {business.website && (
                <div style={{ marginTop: 6 }}>
                  <a className="biz-hero-website" href={business.website} target="_blank" rel="noopener noreferrer">🌐 {business.website.replace(/^https?:\/\//, '')}</a>
                </div>
              )}
            </div>
            {business.is_own_business && (
              <button className="gs-btn gs-btn-outline gs-btn-sm" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} onClick={() => navigate(`/business/${business.slug}/edit`)}>Edit</button>
            )}
          </div>
        </div>

        <div className="biz-tabs">
          {TABS.map((t) => (
            <button key={t.key} type="button" className={`biz-tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}
              {t.key === 'deals' && dealCount > 0 && ` (${dealCount})`}
              {t.key === 'reviews' && reviewCount > 0 && ` (${reviewCount})`}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <>
            {business.about && <p style={{ whiteSpace: 'pre-wrap' }}>{business.about}</p>}

            {business.imported && (
              <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                ℹ️ This listing was added from a public directory
                {business.source_name && <> — <em>{business.source_name}</em></>}
                {business.source_url && <> (<a href={business.source_url} target="_blank" rel="noopener noreferrer">source</a>)</>}.
                {!business.is_claimed && ' Is this your business? Claim it below to take over and correct anything.'}
              </p>
            )}

            {!business.is_claimed && (
              <div className="gs-card" style={{ marginBottom: 16 }}>
                <div className="gs-card-body">
                  {business.my_claim_status === 'pending' ? (
                    <p style={{ margin: 0 }}>⏳ Your claim on this business is pending admin review.</p>
                  ) : business.my_claim_status === 'rejected' ? (
                    <>
                      <p>Your previous claim on this business was rejected. You can submit another one below.</p>
                      <input className="gs-input" placeholder="A note that helps us verify you own this business (optional)" value={claimMessage} onChange={(e) => setClaimMessage(e.target.value)} />
                      <button className="gs-btn gs-btn-primary" style={{ marginTop: 8 }} onClick={submitClaim} disabled={claiming}>Submit claim</button>
                    </>
                  ) : (
                    <>
                      <p style={{ marginTop: 0 }}>Is this your business? Claim it to post deals and updates here.</p>
                      <input className="gs-input" placeholder="A note that helps us verify you own this business (optional)" value={claimMessage} onChange={(e) => setClaimMessage(e.target.value)} />
                      <button className="gs-btn gs-btn-primary" style={{ marginTop: 8 }} onClick={submitClaim} disabled={claiming}>
                        {claiming ? 'Submitting…' : 'Claim this business'}
                      </button>
                    </>
                  )}
                  {claimNotice && <p style={{ marginTop: 8, fontSize: 13 }}>{claimNotice}</p>}
                </div>
              </div>
            )}

            {business.is_own_business && business.owner_user_id && (
              <div style={{ marginBottom: 16 }}>
                <button className="gs-btn gs-btn-primary" onClick={() => navigate(`/business/${business.slug}/post-deal`)}>+ Post a deal</button>
              </div>
            )}

            {(business.locations || []).length > 0 && (
              <>
                <h3>Main Location</h3>
                <LocationCard loc={(business.locations || []).find((l) => l.is_primary) || business.locations[0]} />
                {business.locations.length > 1 && (
                  <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setTab('locations')}>
                    See all {business.locations.length} locations
                  </button>
                )}
              </>
            )}
          </>
        )}

        {tab === 'locations' && (
          <>
            {(business.locations || []).length === 0 && <p style={{ color: 'var(--muted)' }}>No locations listed yet.</p>}
            {(business.locations || []).map((loc) => <LocationCard key={loc.id} loc={loc} />)}
          </>
        )}

        {tab === 'deals' && (
          <>
            {dealCount === 0 && <p style={{ color: 'var(--muted)' }}>No deals posted yet.</p>}
            {business.recent_posts?.map((p) => {
              const meta = POST_TYPE_META[p.post_type] || { label: p.post_type, color: 'var(--muted)' };
              return (
                <div key={p.id} className="gs-card biz-deal-card" style={{ marginBottom: 10, '--deal-color': meta.color }}>
                  <div className="gs-card-body">
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: meta.color, borderRadius: 999, padding: '2px 10px' }}>{meta.label}</span>
                    <h4 style={{ margin: '8px 0 4px' }}>{p.title}</h4>
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{p.body}</p>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>{timeAgo(p.pub_date)}</div>
                  </div>
                </div>
              );
            })}
            {dealCount > 0 && (
              <Link to={`/deals?business_id=${business.id}`} className="gs-btn gs-btn-outline gs-btn-sm">See full deal history</Link>
            )}
          </>
        )}

        {tab === 'reviews' && (
          <>
            <div className="gs-card">
              <div className="gs-card-body">
                <h3 style={{ marginTop: 0 }}>Rate this business</h3>
                <StarRating value={business.my_rating?.stars || 0} onRate={rate} size={22} />
                <textarea
                  className="gs-input gs-textarea"
                  style={{ marginTop: 8 }}
                  placeholder="Optional review…"
                  rows={2}
                  value={myReview}
                  onChange={(e) => setMyReview(e.target.value)}
                  onBlur={() => business.my_rating?.stars && rate(business.my_rating.stars)}
                  disabled={rating}
                />
              </div>
            </div>

            <CommentsSection
              businessId={business.id}
              comments={business.recent_comments || []}
              onAdded={(c) => setBusiness((b) => ({ ...b, recent_comments: [c, ...(b.recent_comments || [])] }))}
            />
          </>
        )}
      </div>
    </div>
  );
}
