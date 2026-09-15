import React, { useState } from 'react';

const UploadFile = ({ setInvestors, apiextension }) => {
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  // Uploads as soon as a file is picked -- no separate "Upload" button/step.
  // This is also why there's no <form> here: every caller already renders
  // this inside its own <form> (the business/deal/hock listing form), and a
  // <form> nested inside a <form> is invalid HTML that React's DOM-API-based
  // rendering doesn't auto-correct the way the browser's HTML parser would.
  // The inner form's submit event still bubbles up to the outer form, so
  // clicking a submit button in here silently triggered the *outer* form's
  // submit handler too -- which saved/created the whole listing and
  // navigated away, looking like the page had refreshed.
  const handleChange = async (ev) => {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;

    const cookie = localStorage.getItem('cookie');
    const data = new FormData();
    data.append('file', file);

    setUploading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${apiextension}`, {
        method: 'POST',
        headers: { 'x-access-token': cookie },
        body: data,
      });
      if (!res.ok) throw new Error(await res.text());
      const result = await res.json();
      setInvestors(result);
      setUploaded(true);
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <input
        type="file"
        accept="image/*"
        onChange={handleChange}
        disabled={uploading}
        style={{ fontSize: 13 }}
      />
      {uploading && <span style={{ fontSize: 12, color: 'var(--muted)' }}>Uploading…</span>}
      {uploaded && !uploading && <span style={{ fontSize: 12, color: 'var(--muted)' }}>Uploaded ✓</span>}
    </div>
  );
};

export default UploadFile;
