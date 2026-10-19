import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  MapPin, Users, Landmark, Droplets, ShoppingBasket, UtensilsCrossed, FerrisWheel,
  Pencil, Trash2, GraduationCap, HeartHandshake, Map, Info,
} from 'lucide-react';
import apiRequest from '../ApiRequest';
import BusinessCard from './BusinessCard';

const SECTIONS = [
  { key: 'shuls', label: 'Shuls', icon: Landmark, emptyHint: 'No shuls found nearby yet. Know of one? Add it to the directory.' },
  { key: 'mikvahs', label: 'Mikvahs', icon: Droplets, emptyHint: 'No mikvah found nearby yet.' },
  { key: 'groceries', label: 'Groceries', icon: ShoppingBasket, emptyHint: 'No kosher grocery found nearby yet.' },
  { key: 'restaurants', label: 'Restaurants', icon: UtensilsCrossed, emptyHint: 'No restaurant found nearby yet.' },
  { key: 'schools', label: 'Schools & Yeshivos', icon: GraduationCap, emptyHint: 'No schools found nearby yet.' },
  { key: 'organizations', label: 'Community Organizations', icon: HeartHandshake, emptyHint: 'No community organizations (Hatzalah, Chevra Kadisha, Vaad Hakashrus, etc.) found nearby yet.' },
  { key: 'attractions', label: 'Activities & Attractions', icon: FerrisWheel, emptyHint: 'No activities added nearby yet.' },
];

export default function CommunityProfile() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [community, setCommunity] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setCommunity(null);
    setNotFound(false);
    apiRequest('GET', null, `/business/communities/${slug}`)
      .then(setCommunity)
      .catch(() => setNotFound(true));
  }, [slug]);

  const remove = () => {
    if (!window.confirm(`Delete the "${community.name}" community page? This won't delete any businesses.`)) return;
    apiRequest('DELETE', null, `/business/communities/${community.id}`)
      .then(() => navigate('/communities'))
      .catch(() => {});
  };

  if (notFound) {
    return (
      <div className="feed-section"><div className="gs-container" style={{ maxWidth: 1180 }}>
        <p>Community not found. <Link to="/communities">Back to Community</Link></p>
      </div></div>
    );
  }
  if (!community) {
    return <div className="feed-section"><div className="gs-container" style={{ maxWidth: 1180 }}><p style={{ color: 'var(--muted)' }}>Loading…</p></div></div>;
  }

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 1180 }}>
        <Link to="/communities" style={{ fontSize: 13, color: 'var(--muted)' }}>← All communities</Link>

        <div className="biz-masthead">
          <div className="biz-masthead-row">
            <div className="biz-masthead-copy">
              <div className="biz-masthead-kicker"><Users size={13} /> Community</div>
              <h1 className="biz-masthead-title">{community.name}</h1>
              <p className="biz-masthead-sub" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={14} /> {[community.city, community.state, community.country].filter(Boolean).join(', ')}
              </p>
              {community.description && <p className="biz-masthead-sub">{community.description}</p>}
            </div>
            {community.can_manage && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate(`/communities/${slug}/edit`)}><Pencil size={13} /> Edit</button>
                <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={remove}><Trash2 size={13} /> Delete</button>
              </div>
            )}
          </div>
        </div>

        {(community.eruv_status || community.eruv_map_image_url) && (
          <div className="gs-card" style={{ marginBottom: 16 }}>
            <div className="gs-card-body">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 6px' }}><Map size={18} /> Eruv</h3>
              {community.eruv_status && (
                <p style={{ margin: '0 0 6px' }}>
                  {community.eruv_status}
                  {community.eruv_url && (
                    <> — <a href={community.eruv_url} target="_blank" rel="noopener noreferrer">view eruv map</a></>
                  )}
                </p>
              )}
              {community.eruv_map_image_url && (
                <a href={community.eruv_map_image_url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={community.eruv_map_image_url}
                    alt={`${community.name} eruv map`}
                    style={{ maxWidth: '100%', borderRadius: 8, marginBottom: 8, display: 'block' }}
                  />
                </a>
              )}
              {community.eruv_disclaimer && (
                <p style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: 'var(--muted)', margin: 0 }}>
                  <Info size={13} /> {community.eruv_disclaimer}
                </p>
              )}
            </div>
          </div>
        )}

        {community.amenities_note && <p style={{ color: 'var(--muted)', fontSize: 13 }}>{community.amenities_note}</p>}

        {community.radius_miles && (
          <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 0 }}>
            Showing businesses within {community.radius_miles} miles of {community.name}.
          </p>
        )}

        {SECTIONS.map(({ key, label, icon: Icon, emptyHint }) => {
          const items = (community.amenities || {})[key] || [];
          return (
            <div key={key} style={{ marginBottom: 24 }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}><Icon size={19} /> {label}</h3>
              {items.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: 13 }}>{emptyHint}</p>
              ) : (
                <div className="biz-amenity-grid">
                  {items.map((b) => <BusinessCard key={b.id} business={b} />)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
