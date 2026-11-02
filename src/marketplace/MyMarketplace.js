import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ShoppingBag, Heart, Plus, Eye, MessageCircle } from 'lucide-react';
import apiRequest from '../ApiRequest';
import MarketplaceCard from './MarketplaceCard';
import { SAVE_STATUS_OPTIONS, STATUS_LABELS } from './constants';

/** Mirrors Estates' MyListings.js PosterStats -- views/contact-taps at a
 * glance for one of the user's own listings, "Manage" links through to the
 * detail page where renew/status-change controls actually live rather than
 * duplicating them here. */
function PosterStats({ listing }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 6, fontSize: 13, color: 'var(--muted)', flexWrap: 'wrap' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Eye size={13} /> {listing.views_count || 0} views</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MessageCircle size={13} /> {listing.contact_taps || 0} contact taps</span>
      {listing.status !== 'active' && (
        <span className="admin-badge rejected">{STATUS_LABELS[listing.status] || listing.status}</span>
      )}
      <Link to={`/marketplace/${listing.slug}`} style={{ marginLeft: 'auto' }}>Manage →</Link>
    </div>
  );
}

/** Mirrors Estates' SavedItemTracker -- a status + note the member tracks
 * themselves, saved via PATCH /marketplace/listings/<id>/save. */
function SavedItemTracker({ listing, onChange }) {
  const [status, setStatus] = useState(listing.saved_status || 'saved');
  const [note, setNote] = useState(listing.saved_note || '');
  const [saving, setSaving] = useState(false);

  const save = async (patch) => {
    setSaving(true);
    try {
      await apiRequest('PATCH', patch, `/marketplace/listings/${listing.id}/save`);
      onChange(listing.id, { ...patch, status: patch.status ?? status, note: patch.note ?? note });
    } catch (_) { /* ignore -- next successful save corrects it */ }
    setSaving(false);
  };

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
      <select
        value={status}
        disabled={saving}
        onChange={(e) => { setStatus(e.target.value); save({ status: e.target.value }); }}
        style={{ fontSize: 13 }}
      >
        {SAVE_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <input
        type="text"
        value={note}
        placeholder="Add a note…"
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => save({ note })}
        style={{ fontSize: 13, flex: 1, minWidth: 140, padding: '4px 8px' }}
        maxLength={500}
      />
    </div>
  );
}

export default function MyMarketplace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'saved' ? 'saved' : 'mine';
  const [categories, setCategories] = useState({});
  const [mine, setMine] = useState(null);
  const [saved, setSaved] = useState(null);

  useEffect(() => {
    apiRequest('GET', null, '/marketplace/categories').then((d) => setCategories(d.categories || {})).catch(() => {});
    apiRequest('GET', null, '/marketplace/my/listings').then((d) => setMine(d.listings || [])).catch(() => setMine([]));
    apiRequest('GET', null, '/marketplace/my/likes').then((d) => setSaved(d.listings || [])).catch(() => setSaved([]));
  }, []);

  const updateSavedTracking = (listingId, { status, note }) => {
    setSaved((prev) => prev.map((l) => (l.id === listingId ? { ...l, saved_status: status, saved_note: note } : l)));
  };

  const list = tab === 'saved' ? saved : mine;

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 1180 }}>
        <div className="est-masthead">
          <div className="est-masthead-kicker"><ShoppingBag size={13} /> Your account</div>
          <h1 className="est-masthead-title">My Marketplace</h1>
          <p className="est-masthead-sub">Everything you've posted, including sold/expired listings kept here for your own records, plus anything you've saved to look at again.</p>
        </div>

        <div className="est-segmented" style={{ marginBottom: 18 }}>
          <button type="button" className={`est-segmented-btn${tab === 'mine' ? ' active' : ''}`} onClick={() => setSearchParams({})}>
            <ShoppingBag size={14} /> My Listings {mine ? `(${mine.length})` : ''}
          </button>
          <button type="button" className={`est-segmented-btn${tab === 'saved' ? ' active' : ''}`} onClick={() => setSearchParams({ tab: 'saved' })}>
            <Heart size={14} /> Saved {saved ? `(${saved.length})` : ''}
          </button>
        </div>

        {tab === 'mine' && (
          <div className="biz-list-cta">
            <Link to="/marketplace/new" className="gs-btn gs-btn-primary"><Plus size={15} /> Post a new item</Link>
          </div>
        )}

        {list === null && <div className="gs-loading"><div className="gs-spinner" /> Loading…</div>}
        {list && list.length === 0 && (
          <div className="gs-empty">{tab === 'saved' ? "You haven't saved any listings yet." : "You haven't posted anything yet."}</div>
        )}
        {list && list.length > 0 && (
          <div className="est-listing-grid">
            {list.map((l) => (
              <div key={l.id}>
                <MarketplaceCard
                  listing={l}
                  categories={categories}
                  savedMode={tab === 'saved'}
                  onUnsave={tab === 'saved' ? (id) => setSaved((prev) => prev.filter((x) => x.id !== id)) : undefined}
                />
                {tab === 'saved' && <SavedItemTracker listing={l} onChange={updateSavedTracking} />}
                {tab === 'mine' && <PosterStats listing={l} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
