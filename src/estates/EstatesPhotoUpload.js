import React, { useState } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';

/** Up to `max` photo slots -- each slot uploads immediately on file pick
 * (same "no separate upload button" reasoning as the shared Uploadfile.js:
 * this renders inside ListingForm/GroupBuyForm's own <form>, and a nested
 * <form> there would double-submit the same way Uploadfile.js's own comment
 * describes). Unlike Uploadfile.js (one slot, used for single-image logos),
 * this manages an ordered array of {filename, url} and is the first
 * multi-image uploader in the codebase -- see EstatesListingPhoto's own
 * backend model for why photos are stored as an ordered child table rather
 * than fixed columns.
 *
 * `photos`: array of {filename, url}; `onChange(nextPhotos)` fires on every
 * add/remove. `uploadUrl` defaults to /estates/upload (the same generic
 * Supabase pipeline /business/upload uses -- see upload.py). */
export default function EstatesPhotoUpload({ photos, onChange, max = 5, uploadUrl = '/estates/upload' }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handlePick = async (ev) => {
    const file = ev.target.files && ev.target.files[0];
    ev.target.value = '';
    if (!file) return;

    const cookie = localStorage.getItem('cookie');
    const data = new FormData();
    data.append('file', file);

    setUploading(true);
    setError('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'}${uploadUrl}`, {
        method: 'POST',
        headers: { 'x-access-token': cookie },
        body: data,
      });
      if (!res.ok) throw new Error(await res.text());
      const filename = await res.json();
      // The backend only returns the stored filename, not a resolved public
      // URL -- build a best-effort preview from it isn't possible client
      // side, so we just show the raw filename as a fallback alt text and
      // let the caller re-fetch the listing (which DOES resolve real URLs)
      // after save. For an immediate preview, use a local object URL instead.
      const previewUrl = URL.createObjectURL(file);
      onChange([...(photos || []), { filename, url: previewUrl }]);
    } catch (err) {
      setError('Upload failed -- try a smaller image or a different file.');
    } finally {
      setUploading(false);
    }
  };

  const removeAt = (i) => {
    onChange((photos || []).filter((_, idx) => idx !== i));
  };

  const slots = photos || [];

  return (
    <div>
      <div className="est-photo-grid">
        {slots.map((p, i) => (
          <div key={i} className="est-photo-slot">
            <img src={p.url} alt={`Photo ${i + 1}`} />
            <button type="button" className="est-photo-slot-remove" onClick={() => removeAt(i)} aria-label="Remove photo">
              <X size={13} />
            </button>
          </div>
        ))}
        {slots.length < max && (
          <div className="est-photo-slot">
            <label className="est-photo-add">
              <input type="file" accept="image/*" onChange={handlePick} disabled={uploading} />
              {uploading ? <Loader2 size={18} className="est-spin" /> : <Plus size={18} />}
              {uploading ? 'Uploading…' : 'Add photo'}
            </label>
          </div>
        )}
      </div>
      {error && <p style={{ fontSize: 12, color: 'var(--gold-hover)', margin: '4px 0 0' }}>{error}</p>}
      <p style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 0' }}>{slots.length} / {max} photos</p>
    </div>
  );
}
