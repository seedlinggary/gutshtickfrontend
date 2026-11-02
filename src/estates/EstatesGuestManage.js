import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Home, RefreshCw } from 'lucide-react';
import apiRequest from '../ApiRequest';
import { normalizePhone } from '../shared/phone';

const TITLE_MAX = 150;
const DESCRIPTION_MAX = 4000;

const EXPIRING_LISTING_TYPES = ['sale', 'long_term_lease'];

/** Token-only management page for a guest (no-account) Estates listing --
 * the link emailed by backend/estates/routes/estates.py's
 * create_guest_listing (and shown on-screen right after submitting, see
 * ListingForm.js). Mirrors the renew/mark-rented-or-sold controls
 * ListingProfile.js gives a logged-in owner, but against the
 * /listings/guest/<token> routes -- the token itself is the credential.
 * approved_to_publish is never dumped by EstatesListingSchema (same for a
 * logged-in owner's own view, see MyListings.js), so there's no pending/live
 * status banner here either -- not guest-specific, matches the rest of the
 * site. */
export default function EstatesGuestManage() {
  const { token } = useParams();
  const [state, setState] = useState('loading');
  const [listing, setListing] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    apiRequest('GET', null, `/estates/listings/guest/${token}`)
      .then((data) => { setListing(data); setState('ready'); })
      .catch(() => setState('notfound'));
  }, [token]);

  const startEdit = () => {
    setForm({
      title: listing.title || '', description: listing.description || '',
      price: listing.price ?? '', contact_name: listing.contact_name || '',
      contact_email: listing.contact_email || '', contact_phone: listing.contact_phone || '',
      contact_whatsapp: listing.contact_whatsapp || '', contact_link: listing.contact_link || '',
      country: listing.country || '',
    });
    setError('');
    setEditing(true);
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    if (!form.contact_email.trim() && !form.contact_phone.trim() && !form.contact_link.trim()) {
      setError('At least one of contact email, contact phone, or a contact link is required.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const updated = await apiRequest('PATCH', {
        title: form.title.trim(),
        description: form.description.trim() || null,
        price: form.price === '' ? null : Number(form.price),
        contact_name: form.contact_name.trim() || null,
        contact_email: form.contact_email.trim() || null,
        contact_phone: normalizePhone(form.contact_phone, form.country),
        contact_whatsapp: normalizePhone(form.contact_whatsapp, form.country),
        contact_link: form.contact_link.trim() || null,
      }, `/estates/listings/guest/${token}`);
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
    setError('');
    try {
      const updated = await apiRequest('POST', null, `/estates/listings/guest/${token}/renew`);
      setListing(updated);
      setMsg('Renewed.');
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to renew.');
    } finally {
      setBusy(false);
    }
  };

  const markStatus = async (status) => {
    const label = status === 'rented' ? 'rented' : 'sold';
    if (!window.confirm(`Mark this listing as ${label}? It'll be hidden from search right away.`)) return;
    setBusy(true);
    setError('');
    try {
      const updated = await apiRequest('PATCH', { status }, `/estates/listings/guest/${token}/status`);
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
      await apiRequest('DELETE', null, `/estates/listings/guest/${token}`);
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
          <Link to="/" className="gs-btn gs-btn-outline" style={{ marginTop: 16 }}>← Buy &amp; Rent</Link>
        </div>
      </div>
    );
  }

  if (state === 'deleted') {
    return (
      <div className="feed-section">
        <div className="gs-container" style={{ maxWidth: 680, textAlign: 'center' }}>
          <div className="gs-success-box">Your listing has been deleted.</div>
          <Link to="/" className="gs-btn gs-btn-outline" style={{ marginTop: 16 }}>← Buy &amp; Rent</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 680 }}>
        <div className="est-masthead">
          <div className="est-masthead-kicker"><Home size={13} /> Manage your listing</div>
          <h1 className="est-masthead-title">{listing.title}</h1>
          <p className="est-masthead-sub">No account needed — this private link is how you manage it.</p>
        </div>

        {msg && <div className="gs-success-box" style={{ marginBottom: 12 }}>{msg}</div>}
        {error && <div className="gs-error-box" style={{ marginBottom: 12 }}>{error}</div>}

        {!editing ? (
          <div className="est-form-section">
            {listing.expires_at && (
              <div className={`est-expiry-note${listing.is_expired ? ' expired' : ''}`} style={{ marginBottom: 10 }}>
                {listing.is_expired
                  ? 'This listing has expired and is hidden from the public feed.'
                  : `Expires in ${Math.max(0, Math.ceil((new Date(listing.expires_at) - new Date()) / 86400000))} day(s) (${new Date(listing.expires_at).toLocaleDateString()}).`}
                {' '}
                {EXPIRING_LISTING_TYPES.includes(listing.listing_type) && (
                  <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" style={{ marginLeft: 8 }} onClick={renew} disabled={busy}>
                    <RefreshCw size={13} /> Renew 30 days
                  </button>
                )}
              </div>
            )}

            {listing.status === 'active' ? (
              <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => markStatus('rented')} disabled={busy}>Mark as rented</button>
                <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => markStatus('sold')} disabled={busy}>Mark as sold</button>
              </div>
            ) : (
              <div className="est-expiry-note" style={{ marginBottom: 14 }}>
                Marked {listing.status}.
                {EXPIRING_LISTING_TYPES.includes(listing.listing_type) && (
                  <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" style={{ marginLeft: 8 }} onClick={renew} disabled={busy}>
                    <RefreshCw size={13} /> Still available? Reactivate
                  </button>
                )}
              </div>
            )}

            {listing.description && <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{listing.description}</p>}
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
              {listing.price != null && <div>Price: {listing.currency} {listing.price}</div>}
              <div>Contact: {listing.contact_name || ''} {listing.contact_email} {listing.contact_phone}</div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={startEdit} disabled={busy}>Edit</button>
              <button className="gs-btn gs-btn-danger gs-btn-sm" onClick={remove} disabled={busy}>Delete</button>
            </div>
          </div>
        ) : (
          <form onSubmit={saveEdit} className="est-form-section">
            <label className="est-field-label">Title *</label>
            <input className="gs-input" value={form.title} maxLength={TITLE_MAX} onChange={set('title')} style={{ marginBottom: 12 }} />
            <label className="est-field-label">Description</label>
            <textarea className="gs-input" style={{ minHeight: 100, marginBottom: 12 }} value={form.description} maxLength={DESCRIPTION_MAX} onChange={set('description')} />
            <label className="est-field-label">Price</label>
            <input className="gs-input" type="number" step="any" value={form.price} onChange={set('price')} style={{ marginBottom: 12 }} />

            <div className="est-form-grid">
              <div><label className="est-field-label">Your name</label><input className="gs-input" value={form.contact_name} onChange={set('contact_name')} /></div>
              <div><label className="est-field-label">Email</label><input className="gs-input" type="email" value={form.contact_email} onChange={set('contact_email')} /></div>
              <div><label className="est-field-label">Phone</label><input className="gs-input" type="tel" value={form.contact_phone} onChange={set('contact_phone')} /></div>
              <div><label className="est-field-label">WhatsApp</label><input className="gs-input" type="tel" value={form.contact_whatsapp} onChange={set('contact_whatsapp')} /></div>
            </div>
            <div style={{ marginTop: 12 }}>
              <label className="est-field-label">Contact link</label>
              <input className="gs-input" type="url" value={form.contact_link} onChange={set('contact_link')} />
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button type="submit" className="gs-btn gs-btn-primary gs-btn-sm" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
              <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setEditing(false)} disabled={busy}>Cancel</button>
            </div>
          </form>
        )}

        <Link to="/" style={{ display: 'inline-block', marginTop: 16 }}>← Buy &amp; Rent</Link>
      </div>
    </div>
  );
}
