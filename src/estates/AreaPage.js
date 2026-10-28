import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Home } from 'lucide-react';
import apiRequest from '../ApiRequest';
import ListingCard from './ListingCard';
import ShareButton from '../ShareButton';
import GetAlertsButton from '../alerts/GetAlertsButton';

const LISTING_TYPE_LABEL = { sale: 'For Sale', long_term_lease: 'For Rent (Long-Term)', short_term_lease: 'Short-Term Rentals' };

/** One "homes in <area>" landing page per neighborhood/city -- live count,
 * typical price, newest 20 listings. Stage 2 of gut_next_level_agent.md
 * ("Neighborhood and city pages"). SEO title/description come from
 * api/render.js (kind=estates_area), not this component -- see vercel.json's
 * host-conditioned rewrite for /areas/:slug on gutestates.com. */
export default function AreaPage() {
  const { areaSlug } = useParams();
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setData(null);
    setNotFound(false);
    apiRequest('GET', null, `/estates/areas/${areaSlug}`)
      .then(setData)
      .catch(() => setNotFound(true));
  }, [areaSlug]);

  if (notFound) {
    return (
      <div className="feed-section"><div className="gs-container" style={{ maxWidth: 1180 }}>
        <p>No listings found for this area. <Link to="/">Back to all listings</Link></p>
      </div></div>
    );
  }
  if (!data) {
    return <div className="feed-section"><div className="gs-container"><div className="gs-loading"><div className="gs-spinner" /> Loading…</div></div></div>;
  }

  const currencySymbol = data.listings[0]?.currency === 'ILS' ? '₪' : '$';

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 1180 }}>
        <div className="est-masthead">
          <div className="est-masthead-row">
            <div className="est-masthead-copy">
              <div className="est-masthead-kicker"><MapPin size={13} /> Area guide</div>
              <h1 className="est-masthead-title">Homes in {data.area}</h1>
              <p className="est-masthead-sub">
                {data.count} active listing{data.count === 1 ? '' : 's'}
                {data.typical_price != null && <> · typical price {currencySymbol}{Math.round(data.typical_price).toLocaleString()}</>}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <GetAlertsButton
                searchType="estates"
                filters={data.area_type === 'neighborhood' ? { neighborhood: data.area } : { city: data.area }}
                label={`Homes in ${data.area}`}
              />
              <ShareButton
                title={`Homes in ${data.area}`}
                text={`${data.count} listing${data.count === 1 ? '' : 's'} in ${data.area} on Gut Estates`}
                url={typeof window !== 'undefined' ? window.location.href : ''}
              />
            </div>
          </div>
        </div>

        {Object.keys(data.by_type).length > 0 && (
          <div className="est-chip-row" style={{ marginBottom: 16 }}>
            {Object.entries(data.by_type).map(([type, n]) => (
              <span key={type} className="est-chip">{LISTING_TYPE_LABEL[type] || type} ({n})</span>
            ))}
          </div>
        )}

        {data.listings.length === 0 ? (
          <p className="est-empty">No active listings in {data.area} right now.</p>
        ) : (
          <div className="est-listing-grid">
            {data.listings.map((l) => <ListingCard key={l.id} listing={l} />)}
          </div>
        )}

        <Link to="/" className="gs-btn gs-btn-outline" style={{ marginTop: 20 }}>
          <Home size={15} /> Browse all listings
        </Link>
      </div>
    </div>
  );
}
