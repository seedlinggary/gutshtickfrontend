import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Home, Heart, Plus, Eye, MessageCircle } from 'lucide-react';
import apiRequest from '../ApiRequest';
import ListingCard from './ListingCard';

const STATUS_LABEL = { active: 'Active', rented: 'Rented', sold: 'Sold' };

/** Stage 5's poster dashboard -- views/WhatsApp-taps/saves at a glance for
 * one of the user's own listings. Renew/mark-rented/mark-sold controls
 * already live on the listing's own detail page (ListingProfile.js) rather
 * than being duplicated here -- this is the at-a-glance summary, "Manage"
 * links through to where the actions actually are. */
function PosterStats({ listing }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 6, fontSize: 13, color: 'var(--muted)', flexWrap: 'wrap' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Eye size={13} /> {listing.views_count || 0} views</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MessageCircle size={13} /> {listing.contact_taps || 0} contact taps</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Heart size={13} /> {listing.like_count || 0} saved</span>
      {listing.status !== 'active' && (
        <span className="admin-badge rejected">{STATUS_LABEL[listing.status] || listing.status}</span>
      )}
      <Link to={`/listings/${listing.slug}`} style={{ marginLeft: 'auto' }}>Manage →</Link>
    </div>
  );
}

const STATUS_OPTIONS = [
  { value: 'saved', label: 'Saved' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'viewed', label: 'Viewed' },
  { value: 'applied', label: 'Applied' },
];

/** Stage 4's "saved items with status" -- a note + a status the member
 * tracks themselves (contacted/viewed/applied), saved on the listing's own
 * EstatesListingLike row via PATCH /estates/listings/<id>/like. */
function SavedItemTracker({ listing, onChange }) {
  const [status, setStatus] = useState(listing.saved_status || 'saved');
  const [note, setNote] = useState(listing.saved_note || '');
  const [saving, setSaving] = useState(false);

  const save = async (patch) => {
    setSaving(true);
    try {
      const updated = await apiRequest('PATCH', patch, `/estates/listings/${listing.id}/like`);
      onChange(listing.id, updated);
    } catch (_) { /* ignore -- next successful save corrects it */ }
    setSaving(false);
  };

  return (
    <div className="est-saved-tracker" style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
      <select
        value={status}
        disabled={saving}
        onChange={(e) => { setStatus(e.target.value); save({ status: e.target.value }); }}
        style={{ fontSize: 13 }}
      >
        {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
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

export default function MyListings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'saved' ? 'saved' : 'mine';
  const [mine, setMine] = useState(null);
  const [saved, setSaved] = useState(null);

  useEffect(() => {
    apiRequest('GET', null, '/estates/my/listings').then((d) => setMine(d.listings || [])).catch(() => setMine([]));
    apiRequest('GET', null, '/estates/my/likes').then((d) => setSaved(d.listings || [])).catch(() => setSaved([]));
  }, []);

  const updateSavedTracking = (listingId, { status, note }) => {
    setSaved((prev) => prev.map((l) => (l.id === listingId ? { ...l, saved_status: status, saved_note: note } : l)));
  };

  const list = tab === 'saved' ? saved : mine;

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 1180 }}>
        <div className="est-masthead">
          <div className="est-masthead-kicker"><Home size={13} /> Your account</div>
          <h1 className="est-masthead-title">My Listings</h1>
          <p className="est-masthead-sub">Everything you've posted, including expired listings kept here for your own records, plus anything you've saved to look at again.</p>
        </div>

        <div className="est-segmented" style={{ marginBottom: 18 }}>
          <button type="button" className={`est-segmented-btn${tab === 'mine' ? ' active' : ''}`} onClick={() => setSearchParams({})}>
            <Home size={14} /> My Listings {mine ? `(${mine.length})` : ''}
          </button>
          <button type="button" className={`est-segmented-btn${tab === 'saved' ? ' active' : ''}`} onClick={() => setSearchParams({ tab: 'saved' })}>
            <Heart size={14} /> Saved {saved ? `(${saved.length})` : ''}
          </button>
        </div>

        {tab === 'mine' && (
          <div className="biz-list-cta">
            <Link to="/listings/new" className="gs-btn gs-btn-primary"><Plus size={15} /> List a new property</Link>
          </div>
        )}

        {list === null && <p style={{ color: 'var(--muted)' }}>Loading…</p>}
        {list && list.length === 0 && (
          <p className="est-empty">{tab === 'saved' ? "You haven't saved any listings yet." : "You haven't posted any listings yet."}</p>
        )}
        {list && list.length > 0 && (
          <div className="est-listing-grid">
            {list.map((l) => (
              <div key={l.id}>
                <ListingCard
                  listing={l}
                  initiallyLiked={tab === 'saved' ? true : undefined}
                  onUnlike={tab === 'saved' ? (id) => setSaved((prev) => prev.filter((x) => x.id !== id)) : undefined}
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
