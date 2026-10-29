import React from 'react';
import { Briefcase, Home, Store, Tag, BookOpen, Search } from 'lucide-react';
import { siteUrl } from '../siteMode';
import timeAgo from '../utils/timeAgo';

/** Renders one item from GET /feed/aggregate (see backend/feed/routes/
 * aggregate.py) -- a job/listing/business/deal/Torah post from one of the
 * other 4 sites, linking out to its real page there via siteUrl(). Used to
 * mix that cross-site activity directly into the main board's own feed
 * (see FeedHome.js), the same way Hock items are already mixed in there. */

const SOURCE_ICON = {
  tachlis: Briefcase,
  estates_listing: Home,
  business_new: Store,
  business_deal: Tag,
  torah_post: BookOpen,
};

const SOURCE_LABELS = {
  tachlis: 'Jobs & Gigs',
  estates_listing: 'Real Estate',
  business_new: 'New Business',
  business_deal: 'Deal',
  torah_post: 'Torah',
};

export default function CrossSiteCard({ item }) {
  const SourceIcon = SOURCE_ICON[item.source] || Search;
  return (
    <a
      href={siteUrl(item.site_id, item.url_path)}
      target="_blank" rel="noopener noreferrer"
      className="gs-card genre-flyer"
      style={{ display: 'block', marginBottom: 14, textDecoration: 'none', color: 'inherit' }}
    >
      <div className="gs-card-body">
        <span className="card-kind"><SourceIcon size={13} /> {SOURCE_LABELS[item.source] || item.source}</span>
        {item.image && (
          <img src={item.image} alt="" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 8, margin: '8px 0' }} />
        )}
        <h3 className="shtick-caption" style={{ marginTop: 8 }}>{item.title}</h3>
        {item.subtitle && (
          <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: 13.5 }}>{item.subtitle}</p>
        )}
        <div className="shtick-footer">
          <span className="shtick-time">{timeAgo(item.pub_date)}</span>
        </div>
      </div>
    </a>
  );
}
