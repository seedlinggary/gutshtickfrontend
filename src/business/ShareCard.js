import React, { useCallback, useState } from 'react';
import { trackBusinessEvent } from './analytics';

const CARD_W = 1080;
const CARD_H = 1080;

/** Draws a simple branded share image on an off-screen canvas (name, tagline,
 * category) -- no server round trip, no image-generation dependency. Handed
 * to the Web Share API when available (native share sheet -- WhatsApp,
 * Instagram Story, etc. all show up there on a phone); falls back to just
 * sharing the link on desktop/browsers without navigator.share/canShare. */
async function buildShareImage(title, subtitle) {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  gradient.addColorStop(0, '#16233d');
  gradient.addColorStop(1, '#3a5c8f');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  ctx.fillStyle = '#d9ab5c';
  ctx.font = '600 40px Georgia, serif';
  ctx.fillText('GUT COMMUNITY', 60, 100);

  ctx.fillStyle = '#f3ede0';
  ctx.font = '700 72px Georgia, serif';
  wrapText(ctx, title, 60, 260, CARD_W - 120, 84);

  ctx.fillStyle = '#b9c0d4';
  ctx.font = '400 40px Georgia, serif';
  wrapText(ctx, subtitle, 60, 460, CARD_W - 120, 52);

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
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

export default function ShareCard({ businessId, title, subtitle, url }) {
  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    trackBusinessEvent(businessId, 'business_share');
    try {
      const blob = await buildShareImage(title, subtitle || '');
      const file = new File([blob], 'share.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title, text: subtitle, url: shareUrl });
        return;
      }
    } catch (e) { /* fall through to link-only share below */ }

    if (navigator.share) {
      try { await navigator.share({ title, text: subtitle, url: shareUrl }); return; } catch (e) { /* user cancelled or unsupported */ }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      window.prompt('Copy this link:', shareUrl);
    }
  }, [businessId, title, subtitle, shareUrl]);

  return (
    <button type="button" className="biz-share-btn" onClick={handleShare}>
      {copied ? 'Link copied!' : <>↗ Share</>}
    </button>
  );
}
