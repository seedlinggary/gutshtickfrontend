import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Mail, Phone, MessageCircle, Heart, Pencil, Trash2, RefreshCw,
  BadgeCheck, MapPin, Home,
} from 'lucide-react';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';
import ShareButton from '../ShareButton';

const TYPE_LABEL = {
  sale: 'For Sale',
  long_term_lease: 'Long-Term Rental',
  short_term_lease: 'Short-Term Rental',
};

function formatPrice(listing) {
  const symbol = listing.currency === 'ILS' ? '₪' : '$';
  if (listing.price == null) return 'Price on request';
  const amount = listing.price.toLocaleString();
  if (listing.listing_type === 'sale') return `${symbol}${amount}`;
  return `${symbol}${amount}${listing.price_period ? ` / ${listing.price_period}` : ''}`;
}

function whatsappHref(number) {
  const digits = (number || '').replace(/[^\d+]/g, '').replace(/^\+/, '');
  return `https://wa.me/${digits}`;
}

function daysUntil(dateStr) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

export default function ListingProfile() {
  const { idOrSlug } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [liking, setLiking] = useState(false);

  useEffect(() => {
    setListing(null);
    setNotFound(false);
    apiRequest('GET', null, `/estates/listings/${idOrSlug}`)
      .then(setListing)
      .catch(() => setNotFound(true));
  }, [idOrSlug]);

  const toggleLike = async () => {
    if (!isLoggedIn() || !listing) return;
    setLiking(true);
    const next = !listing.is_liked;
    try {
      await apiRequest(next ? 'POST' : 'DELETE', null, `/estates/listings/${listing.id}/like`);
      setListing((l) => ({ ...l, is_liked: next, like_count: l.like_count + (next ? 1 : -1) }));
    } catch (e) { /* ignore */ } finally { setLiking(false); }
  };

  const handleRenew = async () => {
    try {
      const updated = await apiRequest('POST', null, `/estates/listings/${listing.id}/renew`);
      setListing(updated);
    } catch (e) { /* ignore */ }
  };

  const handleMarkStatus = async (status) => {
    const label = status === 'rented' ? 'rented' : 'sold';
    if (!window.confirm(`Mark this listing as ${label}? It'll be hidden from search right away.`)) return;
    try {
      const updated = await apiRequest('PATCH', { status }, `/estates/listings/${listing.id}/status`);
      setListing(updated);
    } catch (e) { /* ignore */ }
  };

  const trackContactTap = () => {
    // Fire-and-forget -- never blocks or delays the contact action itself.
    apiRequest('POST', null, `/estates/listings/${listing.id}/contact-tap`).catch(() => {});
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this listing? This cannot be undone.')) return;
    try {
      await apiRequest('DELETE', null, `/estates/listings/${listing.id}`);
      navigate('/my-listings');
    } catch (e) { /* ignore */ }
  };

  if (notFound) {
    return (
      <div className="feed-section"><div className="gs-container" style={{ maxWidth: 820 }}>
        <p>Listing not found. <Link to="/">Back to Buy &amp; Rent</Link></p>
      </div></div>
    );
  }
  if (!listing) {
    return <div className="feed-section"><div className="gs-container"><div className="gs-loading"><div className="gs-spinner" /> Loading…</div></div></div>;
  }

  const photos = listing.photos || [];

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 820 }}>
        <Link to="/" className="est-back-link"><ArrowLeft size={13} /> Back to Buy &amp; Rent</Link>

        {photos.length > 0 ? (
          <div className="est-hero-gallery">
            {photos.map((p) => <img key={p.id} src={p.url} alt={listing.title} />)}
          </div>
        ) : (
          <div className="est-hero-gallery-empty"><Home size={40} /></div>
        )}

        <div className="est-badge-row">
          <span className="est-badge">{TYPE_LABEL[listing.listing_type] || listing.listing_type}</span>
          <span className={`est-badge${listing.is_agent ? ' agent' : listing.is_agent === null ? ' unknown' : ''}`}>
            <BadgeCheck size={13} /> {listing.is_agent === true ? 'Real Estate Agent' : listing.is_agent === false ? 'Private Owner' : 'Agent/Owner Not Specified'}
          </span>
        </div>

        <h1 dir="auto" style={{ margin: '0 0 4px' }}>{listing.title}</h1>
        <p dir="auto" style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 5, margin: '0 0 8px' }}>
          <MapPin size={14} /> {[listing.address, listing.neighborhood, listing.city, listing.state, listing.country].filter(Boolean).join(', ')}
        </p>
        <div className="est-price-line">
          {formatPrice(listing)}
          {listing.below_market_price && (
            <span className="est-below-market-tag">Below usual price here</span>
          )}
        </div>
        {listing.price_per_sqm != null && (
          <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: -6, marginBottom: 8 }}>
            {listing.currency === 'ILS' ? '₪' : '$'}{listing.price_per_sqm.toLocaleString()} / m²
          </div>
        )}

        {(listing.bedrooms || listing.bathrooms || listing.size_value) && (
          <div className="est-spec-row">
            {listing.bedrooms != null && <div className="est-spec"><span className="est-spec-value">{listing.bedrooms}</span><span className="est-spec-label">Bedrooms</span></div>}
            {listing.bathrooms != null && <div className="est-spec"><span className="est-spec-value">{listing.bathrooms}</span><span className="est-spec-label">Bathrooms</span></div>}
            {listing.size_value != null && <div className="est-spec"><span className="est-spec-value">{listing.size_value}</span><span className="est-spec-label">{listing.size_unit === 'sqm' ? 'm²' : 'sq ft'}</span></div>}
          </div>
        )}

        {listing.description && <p dir="auto" style={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{listing.description}</p>}

        {listing.is_own_listing && listing.expires_at && (
          <div className={`est-expiry-note${listing.is_expired ? ' expired' : ''}`}>
            {listing.is_expired
              ? 'This listing has expired and is hidden from the public feed.'
              : `Expires in ${daysUntil(listing.expires_at)} day(s) (${new Date(listing.expires_at).toLocaleDateString()}).`}
            {' '}
            <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" style={{ marginLeft: 8 }} onClick={handleRenew}>
              <RefreshCw size={13} /> Renew 30 days
            </button>
          </div>
        )}

        {listing.is_own_listing && listing.status === 'active' && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => handleMarkStatus('rented')}>
              Mark as rented
            </button>
            <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => handleMarkStatus('sold')}>
              Mark as sold
            </button>
          </div>
        )}
        {listing.is_own_listing && listing.status !== 'active' && (
          <div className="est-expiry-note">
            Marked {listing.status}. <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" style={{ marginLeft: 8 }} onClick={handleRenew}>
              <RefreshCw size={13} /> Still available? Reactivate
            </button>
          </div>
        )}

        <div className="est-contact-card">
          <strong>{listing.contact_name || 'Contact the poster'}</strong>
          <div className="est-contact-row">
            {listing.contact_email && (
              <a className="gs-btn gs-btn-outline gs-btn-sm" href={`mailto:${listing.contact_email}`} onClick={trackContactTap}><Mail size={14} /> Email</a>
            )}
            {listing.contact_phone && (
              <a className="gs-btn gs-btn-outline gs-btn-sm" href={`tel:${listing.contact_phone}`} onClick={trackContactTap}><Phone size={14} /> Call</a>
            )}
            {listing.contact_whatsapp && (
              <a className="gs-btn gs-btn-outline gs-btn-sm" href={whatsappHref(listing.contact_whatsapp)} target="_blank" rel="noreferrer" onClick={trackContactTap}><MessageCircle size={14} /> WhatsApp</a>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          <ShareButton
            title={listing.title}
            text={`${listing.title} — ${formatPrice(listing)}${listing.neighborhood || listing.city ? ` in ${listing.neighborhood || listing.city}` : ''}`}
            url={window.location.href}
          />
          {isLoggedIn() && !listing.is_own_listing && (
            <button type="button" className={`gs-btn gs-btn-outline${listing.is_liked ? ' active' : ''}`} onClick={toggleLike} disabled={liking}>
              <Heart size={15} fill={listing.is_liked ? 'currentColor' : 'none'} /> {listing.is_liked ? 'Saved' : 'Save for later'}
            </button>
          )}
          {listing.is_own_listing && (
            <>
              <Link to={`/listings/${listing.slug}/edit`} className="gs-btn gs-btn-outline"><Pencil size={15} /> Edit</Link>
              <button type="button" className="gs-btn gs-btn-outline" onClick={handleDelete}><Trash2 size={15} /> Delete</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
