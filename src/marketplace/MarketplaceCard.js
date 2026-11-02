import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Truck, Heart } from 'lucide-react';
import apiRequest from '../ApiRequest';
import { CONDITION_LABELS, formatMarketplacePrice } from './constants';

/** Shared tile for the browse grid and My Marketplace's Mine/Saved tabs --
 * same reuse reasoning as Estates' ListingCard.js. `categories` is the
 * `{key: {label, subcategories}}` map from GET /marketplace/categories,
 * passed down once by the page so every card can resolve its own
 * category's real label instead of hardcoding it client-side.
 *
 * Plain browse-grid cards (search results) carry no `is_saved` signal at
 * all (see the card-object shape in GET /marketplace/listings), so this
 * never renders a save button unless the caller opts in via `savedMode`
 * (My Marketplace's "Saved" tab, where every card IS saved by definition)
 * -- `onUnsave` lets that tab drop a card from its own grid immediately. */
export default function MarketplaceCard({ listing, categories, savedMode, onUnsave }) {
  const [busy, setBusy] = useState(false);

  const unsave = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      await apiRequest('DELETE', null, `/marketplace/listings/${listing.id}/save`);
      onUnsave && onUnsave(listing.id);
    } catch (_) { /* ignore -- leave it in the list, a retry can unsave later */ }
    finally { setBusy(false); }
  };

  const categoryLabel = (categories && categories[listing.category]?.label) || listing.category;

  return (
    <Link to={`/marketplace/${listing.slug}`} className="est-listing-card">
      {savedMode && (
        <button className="est-like-btn active" onClick={unsave} disabled={busy} aria-label="Unsave listing">
          <Heart size={15} fill="currentColor" />
        </button>
      )}
      {listing.cover_photo_url ? (
        <img src={listing.cover_photo_url} alt={listing.title} className="est-listing-card-img" />
      ) : (
        <div className="est-listing-card-img est-listing-card-img-placeholder"><ShoppingBag size={28} /></div>
      )}
      {listing.is_expired && <div className="est-listing-card-expired">No longer available</div>}
      <div className="est-listing-card-body">
        <div className="mp-card-meta-row">
          {listing.is_free ? (
            <span className="mp-free-badge">Free</span>
          ) : (
            <span className="est-listing-card-price" style={{ fontSize: 16 }}>{formatMarketplacePrice(listing)}</span>
          )}
          {listing.condition && <span className="mp-condition-chip">{CONDITION_LABELS[listing.condition] || listing.condition}</span>}
          {listing.ships && <span className="mp-ships-badge"><Truck size={12} /> Ships</span>}
        </div>
        <h3 dir="auto">{listing.title}</h3>
        <p dir="auto">{categoryLabel}{listing.subcategory ? ` · ${listing.subcategory}` : ''}</p>
        <p dir="auto">{[listing.city, listing.country].filter(Boolean).join(', ')}</p>
      </div>
    </Link>
  );
}
