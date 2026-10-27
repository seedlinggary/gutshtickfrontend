import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Home, Heart } from 'lucide-react';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';
import FreshnessBadge from '../utils/FreshnessBadge';
import ShareButton from '../ShareButton';

export function formatPrice(listing) {
  const symbol = listing.currency === 'ILS' ? '₪' : '$';
  if (listing.price == null) return 'Price on request';
  const amount = listing.price.toLocaleString();
  if (listing.listing_type === 'sale') return `${symbol}${amount}`;
  return `${symbol}${amount}${listing.price_period ? ` / ${listing.price_period}` : ''}`;
}

/** Shared tile for the Directory grid, My Listings, and Saved listings --
 * `initiallyLiked` lets Saved-listings callers skip a redundant is_liked
 * round-trip since they already know (that's the whole reason the card is
 * in that list). `onUnlike` lets the Saved tab drop a card from its own
 * grid immediately on unlike instead of waiting for a re-fetch. */
export default function ListingCard({ listing, initiallyLiked, onUnlike }) {
  const [liked, setLiked] = useState(initiallyLiked ?? !!listing.is_liked);
  const [busy, setBusy] = useState(false);

  const toggleLike = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn() || busy) return;
    const next = !liked;
    setBusy(true);
    setLiked(next);
    try {
      await apiRequest(next ? 'POST' : 'DELETE', null, `/estates/listings/${listing.id}/like`);
      if (!next) onUnlike && onUnlike(listing.id);
    } catch (e2) {
      setLiked(!next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Link to={`/listings/${listing.slug}`} className="est-listing-card">
      {isLoggedIn() && (
        <button className={`est-like-btn${liked ? ' active' : ''}`} onClick={toggleLike} aria-label="Save listing">
          <Heart size={15} fill={liked ? 'currentColor' : 'none'} />
        </button>
      )}
      <div className="est-card-share" onClick={(e) => e.stopPropagation()}>
        <ShareButton
          title={listing.title}
          text={`${listing.title} — ${formatPrice(listing)}${listing.neighborhood || listing.city ? ` in ${listing.neighborhood || listing.city}` : ''}`}
          url={`${window.location.origin}/listings/${listing.slug}`}
        />
      </div>
      {listing.cover_photo_url ? (
        <img src={listing.cover_photo_url} alt={listing.title} className="est-listing-card-img" />
      ) : (
        <div className="est-listing-card-img est-listing-card-img-placeholder"><Home size={28} /></div>
      )}
      <div className={`est-listing-card-badge${listing.is_agent ? ' agent' : listing.is_agent === null ? ' unknown' : ''}`}>
        {listing.is_agent === true ? 'Agent' : listing.is_agent === false ? 'Owner' : 'Unspecified'}
      </div>
      {listing.is_expired && <div className="est-listing-card-expired">No longer available</div>}
      <div className="est-listing-card-body">
        <div className="est-listing-card-price">{formatPrice(listing)}</div>
        <FreshnessBadge item={listing} style={{ marginBottom: 4 }} />
        <h3 dir="auto">{listing.title}</h3>
        <p dir="auto">{[listing.neighborhood, listing.city, listing.state || listing.country].filter(Boolean).join(', ')}</p>
        {(listing.bedrooms || listing.bathrooms || listing.size_value) && (
          <div className="est-listing-card-specs">
            {listing.bedrooms ? <span>{listing.bedrooms} bd</span> : null}
            {listing.bathrooms ? <span>{listing.bathrooms} ba</span> : null}
            {listing.size_value ? <span>{listing.size_value} {listing.size_unit}</span> : null}
          </div>
        )}
      </div>
    </Link>
  );
}
