import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, Users } from 'lucide-react';

const STAGE_LABEL = {
  pre_construction: 'Pre-Construction',
  under_construction: 'Under Construction',
  nearing_completion: 'Nearing Completion',
};

export default function GroupBuyCard({ groupBuy }) {
  const pct = groupBuy.min_group_size
    ? Math.min(100, Math.round((groupBuy.member_count / groupBuy.min_group_size) * 100))
    : null;

  return (
    <Link to={`/group-buy/${groupBuy.slug}`} className="est-listing-card">
      {groupBuy.cover_photo_url ? (
        <img src={groupBuy.cover_photo_url} alt={groupBuy.title} className="est-listing-card-img" />
      ) : (
        <div className="est-listing-card-img est-listing-card-img-placeholder"><Building2 size={28} /></div>
      )}
      {groupBuy.stage && <div className="est-listing-card-badge">{STAGE_LABEL[groupBuy.stage] || groupBuy.stage}</div>}
      <div className="est-listing-card-body">
        <h3 style={{ marginTop: 0 }}>{groupBuy.title}</h3>
        <p>{[groupBuy.neighborhood, groupBuy.city, groupBuy.state || groupBuy.country].filter(Boolean).join(', ')}</p>
        {groupBuy.price_per_unit_estimate != null && (
          <div className="est-listing-card-price">
            ~{groupBuy.currency === 'ILS' ? '₪' : '$'}{groupBuy.price_per_unit_estimate.toLocaleString()}
            <span className="est-listing-card-price-period"> / unit est.</span>
          </div>
        )}
        {pct !== null && (
          <>
            <div className="est-progress-bar"><div className="est-progress-fill" style={{ width: `${pct}%` }} /></div>
            <div className="est-listing-card-specs"><Users size={13} /> {groupBuy.member_count} joined · min {groupBuy.min_group_size} for the discount</div>
          </>
        )}
        {pct === null && (
          <div className="est-listing-card-specs"><Users size={13} /> {groupBuy.member_count} joined</div>
        )}
      </div>
    </Link>
  );
}
