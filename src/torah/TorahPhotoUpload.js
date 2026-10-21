import React, { useState } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';

/** Same pattern as estates/EstatesPhotoUpload.js -- up to `max` photo slots,
 * each uploading immediately on file pick. Kept as its own copy rather than
 * a shared cross-site import since the only difference is the upload
 * endpoint and CSS class prefix; see EstatesPhotoUpload.js's own docstring
 * for why this is the first multi-image uploader pattern and how it works. */
export default function TorahPhotoUpload({ photos, onChange, max = 5, uploadUrl = '/torah/upload' }) {
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
      const previewUrl = URL.createObjectURL(file);
      onChange([...(photos || []), { filename, url: previewUrl }]);
    } catch (err) {
      setError('Upload failed -- try a smaller image or a different file.');
    } finally {
      setUploading(false);
    }
  };

  const removeAt = (i) => onChange((photos || []).filter((_, idx) => idx !== i));
  const slots = photos || [];

  return (
    <div>
      <div className="tor-photo-grid">
        {slots.map((p, i) => (
          <div key={i} className="tor-photo-slot">
            <img src={p.url} alt={`Photo ${i + 1}`} />
            <button type="button" className="tor-photo-slot-remove" onClick={() => removeAt(i)} aria-label="Remove photo">
              <X size={13} />
            </button>
          </div>
        ))}
        {slots.length < max && (
          <div className="tor-photo-slot">
            <label className="tor-photo-add">
              <input type="file" accept="image/*" onChange={handlePick} disabled={uploading} />
              {uploading ? <Loader2 size={18} className="tor-spin" /> : <Plus size={18} />}
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
