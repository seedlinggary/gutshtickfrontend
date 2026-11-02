import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Mail, Phone, MessageCircle, Heart, Pencil, Trash2, RefreshCw,
  ShoppingBag, MapPin, ExternalLink, Eye, Truck,
} from 'lucide-react';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';
import ShareButton from '../ShareButton';
import { CONDITION_LABELS, STATUS_LABELS, formatMarketplacePrice } from './constants';
import './marketplace.css';

function whatsappHref(number) {
  const digits = (number || '').replace(/[^\d+]/g, '').replace(/^\+/, '');
  return `https://wa.me/${digits}`;
}

export default function MarketplaceListingProfile() {
  const { idOrSlug } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [categories, setCategories] = useState({});
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiRequest('GET', null, '/marketplace/categories').then((d) => setCategories(d.categories || {})).catch(() => {});
  }, []);

  useEffect(() => {
    setListing(null);
    setNotFound(false);
    // Hits the server's view-count side effect -- this effect only re-runs
    // when idOrSlug changes, so it fires once per real page view rather
    // than once per re-render.
    apiRequest('GET', null, `/marketplace/listings/${idOrSlug}`)
      .then(setListing)
      .catch(() => setNotFound(true));
  }, [idOrSlug]);

  const trackContactTap = () => {
    apiRequest('POST', null, `/marketplace/listings/${listing.id}/contact-tap`).catch(() => {});
  };

  const toggleSave = () => {
    if (!isLoggedIn() || !listing || saving) return;
    const next = !listing.is_saved;
    setSaving(true);
    setListing((l) => ({ ...l, is_saved: next }));
    apiRequest(next ? 'POST' : 'DELETE', null, `/marketplace/listings/${listing.id}/save`)
      .catch(() => setListing((l) => ({ ...l, is_saved: !next })))
      .finally(() => setSaving(false));
  };

  const handleRenew = async () => {
    try {
      const updated = await apiRequest('POST', null, `/marketplace/listings/${listing.id}/renew`);
      setListing(updated);
    } catch (e) { /* ignore */ }
  };

  const handleStatusChange = async (e) => {
    const status = e.target.value;
    try {
      const updated = await apiRequest('PATCH', { status }, `/marketplace/listings/${listing.id}/status`);
      setListing(updated);
    } catch (e2) { /* ignore */ }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this listing? This cannot be undone.')) return;
    try {
      await apiRequest('DELETE', null, `/marketplace/listings/${listing.id}`);
      navigate('/marketplace/mine');
    } catch (e) { /* ignore */ }
  };

  if (notFound) {
    return (
      <div className="feed-section"><div className="gs-container" style={{ maxWidth: 820 }}>
        <p>Listing not found. <Link to="/marketplace">Back to Marketplace</Link></p>
      </div></div>
    );
  }
  if (!listing) {
    return <div className="feed-section"><div className="gs-container"><div className="gs-loading"><div className="gs-spinner" /> Loading…</div></div></div>;
  }

  const photos = listing.photos || [];
  const categoryLabel = categories[listing.category]?.label || listing.category;

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 820 }}>
        <Link to="/marketplace" className="est-back-link"><ArrowLeft size={13} /> Back to Marketplace</Link>

        {photos.length > 0 ? (
          <div className="est-hero-gallery">
            {photos.map((p) => <img key={p.id} src={p.url} alt={listing.title} />)}
          </div>
        ) : (
          <div className="est-hero-gallery-empty"><ShoppingBag size={40} /></div>
        )}

        <p className="mp-breadcrumb">{categoryLabel}{listing.subcategory ? ` → ${listing.subcategory}` : ''}</p>

        <div className="est-badge-row">
          {listing.is_free ? (
            <span className="mp-free-badge">Free</span>
          ) : null}
          {listing.condition && <span className="mp-condition-chip">{CONDITION_LABELS[listing.condition] || listing.condition}</span>}
          {listing.ships && <span className="mp-ships-badge"><Truck size={13} /> Ships</span>}
          {listing.status !== 'active' && <span className="est-listing-card-badge unknown" style={{ position: 'static' }}>{STATUS_LABELS[listing.status] || listing.status}</span>}
        </div>

        <h1 dir="auto" style={{ margin: '0 0 4px' }}>{listing.title}</h1>
        {/* Deliberate choice: unlike Estates (a house's exact address is the
            whole point of that listing), a marketplace seller may well be
            inviting strangers to their private home -- so only city/state/
            country show here publicly, never the street address, even
            though the backend has it stored for the poster's own records. */}
        <p dir="auto" style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 5, margin: '0 0 8px' }}>
          <MapPin size={14} /> {[listing.city, listing.state, listing.country].filter(Boolean).join(', ') || 'Location not specified'}
        </p>
        {!listing.is_free && (
          <div className="est-price-line">{formatMarketplacePrice(listing)}</div>
        )}

        {listing.description && <p dir="auto" style={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{listing.description}</p>}

        <p style={{ color: 'var(--muted)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
          <Eye size={14} /> {listing.views_count || 0} views
        </p>

        {listing.can_manage && listing.expires_at && (
          <div className={`est-expiry-note${listing.is_expired ? ' expired' : ''}`}>
            {listing.is_expired
              ? 'This listing has expired and is hidden from the public marketplace.'
              : `Expires ${new Date(listing.expires_at).toLocaleDateString()}.`}
            {' '}
            <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" style={{ marginLeft: 8 }} onClick={handleRenew}>
              <RefreshCw size={13} /> Renew
            </button>
          </div>
        )}

        {listing.can_manage && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '10px 0' }}>
            <label className="est-field-label" style={{ margin: 0 }}>Status:</label>
            <select className="gs-input" style={{ width: 'auto' }} value={listing.status} onChange={handleStatusChange}>
              <option value="active">Active</option>
              <option value="sold">Sold</option>
              <option value="traded">Traded</option>
            </select>
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
            {listing.contact_link && (
              <a className="gs-btn gs-btn-outline gs-btn-sm" href={listing.contact_link} target="_blank" rel="noopener noreferrer" onClick={trackContactTap}><ExternalLink size={14} /> View / Contact</a>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          <ShareButton
            title={listing.title}
            text={`${listing.title} — ${formatMarketplacePrice(listing)}${listing.city ? ` in ${listing.city}` : ''}`}
            url={window.location.href}
          />
          {isLoggedIn() && !listing.can_manage && (
            <button type="button" className={`gs-btn gs-btn-outline${listing.is_saved ? ' active' : ''}`} onClick={toggleSave} disabled={saving}>
              <Heart size={15} fill={listing.is_saved ? 'currentColor' : 'none'} /> {listing.is_saved ? 'Saved' : 'Save for later'}
            </button>
          )}
          {listing.can_manage && (
            <>
              <Link to={`/marketplace/${listing.slug}/edit`} className="gs-btn gs-btn-outline"><Pencil size={15} /> Edit</Link>
              <button type="button" className="gs-btn gs-btn-outline" onClick={handleDelete}><Trash2 size={15} /> Delete</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
