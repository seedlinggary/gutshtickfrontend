import React from 'react';
import { Link } from 'react-router-dom';
import StarRating from './StarRating';
import TypeTags from './TypeTags';
import { CATEGORY_LABELS, CATEGORY_ICONS, CATEGORY_TINTS } from './categories';
import { hoursToday, isOpenNow } from './hours';

/** Shown in the Directory's list column in place of the results list when a
 * map pin is clicked -- a quick look at that one business with a path to
 * its full profile, so clicking a pin browses in place instead of jumping
 * straight to a new page. `onBack` returns to the normal results list. */
export default function BusinessPreviewPanel({ business, onBack }) {
  const loc = business.primary_location;
  const open = isOpenNow(loc);
  const today = hoursToday(loc);
  const icon = CATEGORY_ICONS[business.category] || '🏪';

  return (
    <div className="biz-preview-panel">
      <button type="button" className="gs-btn gs-btn-outline gs-btn-sm biz-preview-back" onClick={onBack}>
        ← Back to results
      </button>
      <div style={{ display: 'flex', gap: 14, marginTop: 12 }}>
        <div className="biz-card-media" style={{ '--media-tint': CATEGORY_TINTS[business.category] || undefined }}>
          {business.logo_url ? <img src={business.logo_url} alt={business.name} /> : icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h3 className="shtick-caption" style={{ margin: 0 }}>{business.name}</h3>
            {business.is_claimed && <span className="biz-badge biz-badge-claimed" title="Claimed by verified owner">✓</span>}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
            {CATEGORY_LABELS[business.category] || business.category}
            {loc?.city && ` · 📍 ${loc.city}`}
          </div>
          <TypeTags types={business.types} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        <StarRating value={business.rating_avg} count={business.rating_count} />
        {open === true && <span className="biz-badge biz-badge-open">● Open now</span>}
        {open === false && <span className="biz-badge biz-badge-closed">Closed now</span>}
        {loc?.kashrut && <span className="biz-badge biz-badge-kashrut">✡️ {loc.kashrut}</span>}
      </div>

      {loc?.address && <p style={{ fontSize: 13, color: 'var(--muted)', margin: '10px 0 0' }}>📍 {loc.address}{loc.city ? `, ${loc.city}` : ''}</p>}
      {today && <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>🕒 {today}</p>}

      <Link to={`/business/${business.slug}`} className="gs-btn gs-btn-primary" style={{ marginTop: 14, display: 'inline-block' }}>
        View full profile →
      </Link>
    </div>
  );
}
