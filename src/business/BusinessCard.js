import React from 'react';
import { Link } from 'react-router-dom';
import StarRating from './StarRating';
import { CATEGORY_LABELS, CATEGORY_ICONS, CATEGORY_TINTS, LOCATION_TYPE_META } from './categories';
import { isOpenNow } from './hours';
import TypeTags from './TypeTags';

function locationBlurb(loc) {
  if (!loc) return null;
  const type = loc.location_type || 'physical';
  if (type === 'online') return `${LOCATION_TYPE_META.online.icon} Online only`;
  if (type === 'delivery') return loc.city ? `${LOCATION_TYPE_META.delivery.icon} Delivers to ${loc.city}` : `${LOCATION_TYPE_META.delivery.icon} Delivery`;
  return loc.city ? `📍 ${loc.city}` : null;
}

/** `onHover(id|null)` -- if given, lets the Directory's split view highlight
 * this card's pin on the map while the pointer is over it. `active` mirrors
 * that back (e.g. hovering the pin itself) so the highlight is two-way. */
export default function BusinessCard({ business, onHover, active }) {
  const loc = business.primary_location;
  const blurb = locationBlurb(loc);
  const open = isOpenNow(loc);
  const icon = CATEGORY_ICONS[business.category] || '🏪';
  return (
    <Link
      to={`/business/${business.slug}`}
      style={{ textDecoration: 'none', color: 'inherit' }}
      onMouseEnter={() => onHover && onHover(business.id)}
      onMouseLeave={() => onHover && onHover(null)}
    >
      <div className={`gs-card biz-card-hover${active ? ' biz-card-active' : ''}`} style={{ marginBottom: 14 }}>
        <div className="gs-card-body" style={{ display: 'flex', gap: 14 }}>
          <div className="biz-card-media" style={{ '--media-tint': CATEGORY_TINTS[business.category] || undefined }}>
            {business.logo_url ? (
              <img src={business.logo_url} alt={business.name} />
            ) : icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h3 className="shtick-caption" style={{ margin: 0 }}>{business.name}</h3>
              {business.is_claimed && <span className="biz-badge biz-badge-claimed" title="Claimed by verified owner">✓</span>}
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
              {CATEGORY_LABELS[business.category] || business.category}
              {blurb && ` · ${blurb}`}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              <StarRating value={business.rating_avg} count={business.rating_count} />
              {open === true && <span className="biz-badge biz-badge-open">● Open now</span>}
              {loc?.kashrut && <span className="biz-badge biz-badge-kashrut">✡️ {loc.kashrut}</span>}
            </div>
            <TypeTags types={business.types} />
          </div>
        </div>
      </div>
    </Link>
  );
}
