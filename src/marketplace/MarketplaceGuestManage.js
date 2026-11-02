import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShoppingBag, CheckCircle2, Clock, XCircle } from 'lucide-react';
import apiRequest from '../ApiRequest';

const TITLE_MAX = 150;
const DESCRIPTION_MAX = 4000;

const STATUS_LABEL = { active: 'Active', sold: 'Sold', traded: 'Traded', expired: 'Expired' };

function StatusNotice({ listing }) {
  if (listing.approved_to_publish === null) {
    return (
      <div className="gs-success-box" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Clock size={15} /> Pending review — this isn't on the Marketplace yet. You can still edit it below.
      </div>
    );
  }
  if (listing.approved_to_publish === false) {
    return (
      <div className="gs-error-box" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <XCircle size={15} /> This listing wasn't approved. Editing and saving sends it back in for review.
      </div>
    );
  }
  return (
    <div className="gs-success-box" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <CheckCircle2 size={15} /> Live on the Marketplace.
    </div>
  );
}

/** Token-only management page for a guest (no-account) Marketplace listing --
 * the link emailed by backend/marketplace/routes/marketplace.py's
 * create_guest_listing (and shown on-screen right after submitting, see
 * MarketplaceListingForm.js). Mirrors src/money/TachlisGuestManage.js's
 * structure. Keeps the lightweight field set (title/description/price/
 * condition/contact) -- category, location and photos aren't editable here;
 * delete and repost covers those rarer changes, same tradeoff Tachlis's own
 * guest manage page makes by not allowing post_type to change either. */
export default function MarketplaceGuestManage() {
  const { token } = useParams();
  const [state, setState] = useState('loading');
  const [listing, setListing] = useState(null);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [price, setPrice] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactLink, setContactLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    apiRequest('GET', null, `/marketplace/listings/guest/${token}`)
      .then((data) => { setListing(data); setState('ready'); })
      .catch(() => setState('notfound'));
  }, [token]);

  const startEdit = () => {
    setTitle(listing.title || '');
    setDescription(listing.description || '');
    setIsFree(!!listing.is_free);
    setPrice(listing.price ?? '');
    setContactEmail(listing.contact_email || '');
    setContactPhone(listing.contact_phone || '');
    setContactLink(listing.contact_link || '');
    setError('');
    setEditing(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required.'); return; }
    if (!contactEmail.trim() && !contactPhone.trim() && !contactLink.trim()) {
      setError('At least one of contact email, contact phone, or a contact link is required.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const updated = await apiRequest('PATCH', {
        title: title.trim(),
        description: description.trim(),
        is_free: isFree,
        price: isFree ? null : (price === '' ? null : Number(price)),
        contact_email: contactEmail.trim(),
        contact_phone: contactPhone.trim(),
        contact_link: contactLink.trim(),
      }, `/marketplace/listings/guest/${token}`);
      setListing(updated);
      setEditing(false);
      setMsg('Saved.');
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to save changes.');
    } finally {
      setBusy(false);
    }
  };

  const renew = async () => {
    setBusy(true);
    try {
      const updated = await apiRequest('POST', null, `/marketplace/listings/guest/${token}/renew`);
      setListing(updated);
      setMsg('Renewed.');
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to renew.');
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (status) => {
    setBusy(true);
    try {
      const updated = await apiRequest('PATCH', { status }, `/marketplace/listings/guest/${token}/status`);
      setListing(updated);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to update status.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Delete this listing? This cannot be undone.')) return;
    setBusy(true);
    try {
      await apiRequest('DELETE', null, `/marketplace/listings/guest/${token}`);
      setState('deleted');
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to delete.');
      setBusy(false);
    }
  };

  if (state === 'loading') {
    return <div className="feed-section"><div className="gs-container" style={{ maxWidth: 680 }}><div className="gs-loading"><div className="gs-spinner" /> Loading…</div></div></div>;
  }

  if (state === 'notfound') {
    return (
      <div className="feed-section">
        <div className="gs-container" style={{ maxWidth: 680, textAlign: 'center' }}>
          <div className="gs-error-box">This link is invalid, or the listing it manages has been removed.</div>
          <Link to="/marketplace" className="gs-btn gs-btn-outline" style={{ marginTop: 16 }}>← Back to Marketplace</Link>
        </div>
      </div>
    );
  }

  if (state === 'deleted') {
    return (
      <div className="feed-section">
        <div className="gs-container" style={{ maxWidth: 680, textAlign: 'center' }}>
          <div className="gs-success-box">Your listing has been deleted.</div>
          <Link to="/marketplace" className="gs-btn gs-btn-outline" style={{ marginTop: 16 }}>← Back to Marketplace</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 680 }}>
        <h1 style={{ margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShoppingBag size={20} /> Manage your listing
        </h1>
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>No account needed — this private link is how you manage it.</p>

        {msg && <div className="gs-success-box" style={{ marginBottom: 12 }}>{msg}</div>}
        {error && <div className="gs-error-box" style={{ marginBottom: 12 }}>{error}</div>}

        <div style={{ marginBottom: 14 }}><StatusNotice listing={listing} /></div>

        <div className="gs-card">
          <div className="gs-card-body">
            {!editing ? (
              <>
                <h3 style={{ marginTop: 0 }}>{listing.title}</h3>
                {listing.description && <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{listing.description}</p>}
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
                  <div>{listing.is_free ? 'Free' : listing.price != null ? `${listing.price} ${listing.currency}` : 'No price set'}</div>
                  {listing.contact_email && <div>Contact email: {listing.contact_email}</div>}
                  {listing.contact_phone && <div>Contact phone: {listing.contact_phone}</div>}
                  {listing.contact_link && <div>Contact link: {listing.contact_link}</div>}
                  <div>Status: {STATUS_LABEL[listing.status] || listing.status}{listing.is_expired && listing.status === 'active' ? ' (expired)' : ''}</div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={startEdit} disabled={busy}>Edit</button>
                  {listing.status === 'active' ? (
                    <>
                      <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={renew} disabled={busy}>Renew</button>
                      <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setStatus('sold')} disabled={busy}>Mark sold</button>
                      <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setStatus('traded')} disabled={busy}>Mark traded</button>
                    </>
                  ) : (
                    <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setStatus('active')} disabled={busy}>Still available? Reactivate</button>
                  )}
                  <button className="gs-btn gs-btn-danger gs-btn-sm" onClick={remove} disabled={busy}>Delete</button>
                </div>
              </>
            ) : (
              <form onSubmit={saveEdit}>
                <div className="gs-field">
                  <input className="gs-input" value={title} maxLength={TITLE_MAX} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
                </div>
                <div className="gs-field">
                  <textarea className="gs-input gs-textarea" rows={5} value={description} maxLength={DESCRIPTION_MAX} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
                </div>
                <div className="gs-field">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                    <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />
                    This item is free
                  </label>
                </div>
                {!isFree && (
                  <div className="gs-field">
                    <input className="gs-input" type="number" step="any" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" />
                  </div>
                )}
                <div className="gs-field">
                  <input className="gs-input" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Contact email" />
                </div>
                <div className="gs-field">
                  <input className="gs-input" type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Contact phone" />
                </div>
                <div className="gs-field">
                  <input className="gs-input" type="url" value={contactLink} onChange={(e) => setContactLink(e.target.value)} placeholder="Contact link" />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" className="gs-btn gs-btn-primary gs-btn-sm" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
                  <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setEditing(false)} disabled={busy}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>

        <Link to="/marketplace" style={{ display: 'inline-block', marginTop: 16 }}>← Back to Marketplace</Link>
      </div>
    </div>
  );
}
