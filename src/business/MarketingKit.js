import React, { useCallback, useState } from 'react';
import QRCode from 'qrcode';
import { Printer } from 'lucide-react';

const FLYER_W = 1200;
const FLYER_H = 1600; // 3:4 portrait -- prints reasonably on letter/A4

/** A print-ready flyer generated entirely client-side: business name, a
 * short tagline, and a QR code to the profile (or an active deal). No PDF
 * library -- a high-res PNG at this aspect ratio prints fine from any photo
 * app or a print shop's self-serve kiosk, which is what this audience
 * actually uses it for. */
export default function MarketingKit({ business }) {
  const [tagline, setTagline] = useState(business.about ? business.about.slice(0, 120) : '');
  const [linkTarget, setLinkTarget] = useState('profile');
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  const profileUrl = `${window.location.origin}/business/${business.slug}`;
  const dealsUrl = `${window.location.origin}/deals?business_id=${business.id}`;
  const targetUrl = linkTarget === 'deals' ? dealsUrl : profileUrl;

  const generate = useCallback(async () => {
    setBusy(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = FLYER_W;
      canvas.height = FLYER_H;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#f7f8fb';
      ctx.fillRect(0, 0, FLYER_W, FLYER_H);
      ctx.fillStyle = '#1c2438';
      ctx.fillRect(0, 0, FLYER_W, 90);

      if (business.logo_url) {
        try {
          const img = await loadImage(business.logo_url);
          const size = 260;
          ctx.save();
          ctx.beginPath();
          ctx.arc(FLYER_W / 2, 300, size / 2, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, FLYER_W / 2 - size / 2, 300 - size / 2, size, size);
          ctx.restore();
        } catch (e) { /* logo failed to load cross-origin -- skip it, flyer still works */ }
      }

      ctx.fillStyle = '#1c2438';
      ctx.font = '700 64px Georgia, serif';
      ctx.textAlign = 'center';
      wrapText(ctx, business.name, FLYER_W / 2, 520, FLYER_W - 160, 72);

      ctx.fillStyle = '#5b6472';
      ctx.font = '400 34px Georgia, serif';
      wrapText(ctx, tagline || 'Find us in the Gut Community directory', FLYER_W / 2, 640, FLYER_W - 220, 44);

      const qrDataUrl = await QRCode.toDataURL(targetUrl, { width: 420, margin: 1 });
      const qrImg = await loadImage(qrDataUrl);
      ctx.drawImage(qrImg, FLYER_W / 2 - 210, 850, 420, 420);

      ctx.fillStyle = '#1c2438';
      ctx.font = '600 32px Georgia, serif';
      ctx.fillText('Scan to visit us online', FLYER_W / 2, 1330);

      ctx.fillStyle = '#d4a24c';
      ctx.font = '700 28px Georgia, serif';
      ctx.fillText('GUT COMMUNITY', FLYER_W / 2, FLYER_H - 50);

      setPreview(canvas.toDataURL('image/png'));
    } finally {
      setBusy(false);
    }
  }, [business, tagline, targetUrl]);

  return (
    <div className="biz-marketing-kit">
      <h3 className="biz-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Printer size={19} /> Marketing Kit</h3>
      <p className="biz-page-subtitle">Generate a print-ready flyer with a QR code, for a shul bulletin board, table, or storefront.</p>

      <div className="biz-marketing-kit-form">
        <label>
          Tagline
          <input type="text" value={tagline} maxLength={120} onChange={(e) => setTagline(e.target.value)} placeholder="A short line about your business" />
        </label>
        <label>
          Link the QR code to
          <select value={linkTarget} onChange={(e) => setLinkTarget(e.target.value)}>
            <option value="profile">My business profile</option>
            <option value="deals">My current deals</option>
          </select>
        </label>
        <button type="button" onClick={generate} disabled={busy}>{busy ? 'Generating...' : 'Generate flyer'}</button>
      </div>

      {preview && (
        <div className="biz-marketing-kit-preview">
          <img src={preview} alt="Flyer preview" />
          <a href={preview} download={`${business.slug}-flyer.png`} className="gs-btn gs-btn-primary">⬇ Download flyer (PNG)</a>
        </div>
      )}
    </div>
  );
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = (text || '').split(' ');
  let line = '';
  let curY = y;
  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, curY);
      line = word;
      curY += lineHeight;
    } else {
      line = test;
    }
  });
  if (line) ctx.fillText(line, x, curY);
}
