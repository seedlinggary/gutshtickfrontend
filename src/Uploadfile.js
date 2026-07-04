import React, { useState } from 'react';

const UploadFile = ({ setInvestors, apiextension }) => {
  const [fileInput, setFileInput] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  const handleUpload = async (ev) => {
    ev.preventDefault();
    if (!fileInput || !fileInput.files[0]) return;

    const cookie = localStorage.getItem('cookie');
    const data = new FormData();
    data.append('file', fileInput.files[0]);

    setUploading(true);
    try {
      const res = await fetch(`http://localhost:5000${apiextension}`, {
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
    <form onSubmit={handleUpload} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <input
        type="file"
        accept="image/*"
        ref={(ref) => setFileInput(ref)}
        style={{ fontSize: 13 }}
      />
      <button
        type="submit"
        className="gs-btn gs-btn-outline gs-btn-sm"
        disabled={uploading || uploaded}
      >
        {uploading ? 'Uploading…' : uploaded ? 'Uploaded ✓' : 'Upload'}
      </button>
    </form>
  );
};

export default UploadFile;
