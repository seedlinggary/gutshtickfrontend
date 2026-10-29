import React, { useState } from 'react';
import { Share2, MessageCircle, X as XIcon, Check, Link2 } from 'lucide-react';

/** Uses the native share sheet where available (mobile), falls back to an
 * explicit WhatsApp / Twitter / copy-link menu on desktop. */
export default function ShareButton({ title, text, url, className }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const fullText = url ? `${text} ${url}` : text;

  const handleShareClick = async () => {
    if (navigator.share) {
      try { await navigator.share({ title, text, url }); } catch (_) { /* user cancelled */ }
    } else {
      setOpen((o) => !o);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url || text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (_) { /* clipboard unavailable */ }
  };

  return (
    <div className={`share-btn-wrap${className ? ` ${className}` : ''}`}>
      <button type="button" className="share-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={handleShareClick} onBlur={() => setTimeout(() => setOpen(false), 150)}>
        <Share2 size={14} /> Share
      </button>
      {open && (
        <div className="share-menu">
          <a
            className="share-menu-item"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            href={`https://wa.me/?text=${encodeURIComponent(fullText)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
          >
            <MessageCircle size={14} /> WhatsApp
          </a>
          <a
            className="share-menu-item"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url || '')}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
          >
            <XIcon size={14} /> Twitter / X
          </a>
          <button type="button" className="share-menu-item" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onMouseDown={(e) => e.preventDefault()} onClick={copyLink}>
            {copied ? <><Check size={14} /> Copied!</> : <><Link2 size={14} /> Copy Link</>}
          </button>
        </div>
      )}
    </div>
  );
}
