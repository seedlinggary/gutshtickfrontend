import React, { useState } from 'react';
import { X } from 'lucide-react';
import apiRequest from '../../ApiRequest';
import UploadFile from '../../Uploadfile';

const TITLE_MAX = 70;
const DESCRIPTION_MAX = 200;

/** Per-page search/share settings -- what shows up as the blue link text
 * and snippet in Google, and as the title/description/image when the page
 * is shared on WhatsApp/Facebook/iMessage. These fields already existed on
 * the backend (SitePage.seo_title/seo_description/seo_og_image) and were
 * already being read by api/_businessSiteMeta.js to inject real <title>/
 * <meta> tags server-side for crawlers -- this is just the owner-facing
 * form that was missing, opened from PageEditor's toolbar next to the
 * page's title/slug control. Same overlay shell as ChromeInspector so it
 * feels like one consistent system. */
export default function SeoInspector({ page, onSaved, onClose }) {
  const [title, setTitle] = useState(page.seo_title || '');
  const [description, setDescription] = useState(page.seo_description || '');
  const [ogImage, setOgImage] = useState(page.seo_og_image || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState(null);

  const uploadToUrl = (filename, cb) => {
    apiRequest('GET', null, `/business/upload-url/${filename}`).then(({ url }) => cb(url));
  };

  const save = (patch) => {
    setSaving(true);
    setError('');
    const body = patch || { seo_title: title.trim(), seo_description: description.trim() };
    apiRequest('PATCH', body, `/business/site-pages/${page.id}`)
      .then((updated) => { onSaved(updated); setSavedAt(new Date()); })
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not save.'))
      .finally(() => setSaving(false));
  };

  return (
    <div className="sb-inspector">
      <div className="sb-inspector-header">
        <strong>Search &amp; sharing (SEO)</strong>
        <button type="button" className="sb-icon-btn" onClick={onClose}><X size={14} /></button>
      </div>

      <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 0 }}>
        What shows up on Google and when this page is shared on WhatsApp, Facebook, or iMessage. Leave blank to fall back to the page title.
      </p>

      <div className="gs-field">
        <div className="gs-label">Page title for search engines</div>
        <input
          className="gs-input"
          value={title}
          maxLength={TITLE_MAX}
          placeholder={page.title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, textAlign: 'right' }}>{title.length}/{TITLE_MAX}</div>
      </div>

      <div className="gs-field" style={{ marginTop: 14 }}>
        <div className="gs-label">Description</div>
        <textarea
          className="gs-input"
          rows={3}
          value={description}
          maxLength={DESCRIPTION_MAX}
          placeholder="A sentence or two describing this page -- shown under the title in search results."
          onChange={(e) => setDescription(e.target.value)}
        />
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, textAlign: 'right' }}>{description.length}/{DESCRIPTION_MAX}</div>
      </div>

      <div className="gs-field" style={{ marginTop: 14 }}>
        <div className="gs-label">Share image</div>
        <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 6px' }}>Shown as the preview image when this page is shared on WhatsApp, Facebook, or iMessage.</p>
        {ogImage && <img src={ogImage} alt="" style={{ width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 6, marginBottom: 6 }} />}
        <UploadFile apiextension="/business/upload" setInvestors={(filename) => uploadToUrl(filename, (url) => { setOgImage(url); save({ seo_og_image: url }); })} />
        {ogImage && (
          <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" style={{ marginTop: 6 }} onClick={() => { setOgImage(''); save({ seo_og_image: '' }); }}>
            Remove image
          </button>
        )}
      </div>

      {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13 }}>{error}</p>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
        <button type="button" className="gs-btn gs-btn-sm" disabled={saving} onClick={() => save()}>Save</button>
        {savedAt && <span style={{ fontSize: 12, color: 'var(--muted)' }}>Saved {savedAt.toLocaleTimeString()}</span>}
      </div>
    </div>
  );
}
