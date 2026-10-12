import React from 'react';
import { Link } from 'react-router-dom';
import StarRating from './StarRating';
import { CATEGORY_LABELS, CATEGORY_TINTS, LOCATION_TYPE_META } from './categories';
import { isOpenNow } from './hours';
import TypeTags from './TypeTags';
import KashrutInfo from './kashrutInfo';
import CategoryIcon from './CategoryIcon';
import LocationTypeIcon from './LocationTypeIcon';
import { Rocket, ShieldCheck, MapPin, ChevronRight } from 'lucide-react';

function locationBlurb(loc) {
  if (!loc) return null;
  const type = loc.location_type || 'physical';
  if (type === 'online') return { icon: <LocationTypeIcon type="online" size={12} />, text: 'Online only' };
  if (type === 'delivery') return { icon: <LocationTypeIcon type="delivery" size={12} />, text: loc.city ? `Delivers to ${loc.city}` : 'Delivery' };
  return loc.city ? { icon: <MapPin size={12} />, text: loc.city } : null;
}

/** `onHover(id|null)` -- if given, lets the Directory's split view highlight
 * this card's pin on the map while the pointer is over it. `active` mirrors
 * that back (e.g. hovering the pin itself) so the highlight is two-way.
 * `onCompareToggle`/`isComparing` -- if given, renders a "+ Compare" chip
 * (see CompareTray.js) instead of requiring a separate mode/page. */
export default function BusinessCard({ business, onHover, active, onCompareToggle, isComparing }) {
  const loc = business.primary_location;
  const blurb = locationBlurb(loc);
  const open = isOpenNow(loc);
  return (
    <div
      className={`gs-card biz-card-hover${active ? ' biz-card-active' : ''}`}
      style={{ marginBottom: 14, position: 'relative' }}
      onMouseEnter={() => onHover && onHover(business.id)}
      onMouseLeave={() => onHover && onHover(null)}
    >
      {onCompareToggle && (
        <button
          type="button"
          className={`biz-compare-toggle${isComparing ? ' biz-compare-toggle-active' : ''}`}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCompareToggle(business); }}
        >
          {isComparing ? '✓ Comparing' : '+ Compare'}
        </button>
      )}
      <Link to={`/business/${business.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div className="gs-card-body" style={{ display: 'flex', gap: 14 }}>
          <div className="biz-card-media" style={{ '--media-tint': CATEGORY_TINTS[business.category] || undefined }}>
            {business.logo_url ? (
              <img src={business.logo_url} alt={business.name} />
            ) : <CategoryIcon category={business.category} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h3 className="shtick-caption" style={{ margin: 0 }}>{business.name}</h3>
              {business.is_claimed && <span className="biz-badge biz-badge-claimed" title="Claimed by verified owner">✓</span>}
              {business.is_boosted && <span className="biz-badge biz-badge-boost" title="Boosted placement"><Rocket size={11} /></span>}
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
              <span>{CATEGORY_LABELS[business.category] || business.category}</span>
              {blurb && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>· {blurb.icon} {blurb.text}</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              <StarRating value={business.rating_avg} count={business.rating_count} />
              {loc?.holiday_closed_reason ? (
                <span className="biz-badge biz-badge-closed">Closed for {loc.holiday_closed_reason}</span>
              ) : open === true ? (
                <span className="biz-badge biz-badge-open">● Open now</span>
              ) : null}
              {loc?.kashrut && (
                <span className="biz-badge biz-badge-kashrut">
                  <ShieldCheck size={12} /> {loc.kashrut} <KashrutInfo kashrutText={loc.kashrut} />
                </span>
              )}
            </div>
            <TypeTags types={business.types} />
          </div>
          <ChevronRight size={18} className="biz-card-chevron" />
        </div>
      </Link>
    </div>
  );
}
