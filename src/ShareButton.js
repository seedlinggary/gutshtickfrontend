import React, { useState } from 'react';

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
      <button type="button" className="share-btn" onClick={handleShareClick} onBlur={() => setTimeout(() => setOpen(false), 150)}>
        📤 Share
      </button>
      {open && (
        <div className="share-menu">
          <a
            className="share-menu-item"
            href={`https://wa.me/?text=${encodeURIComponent(fullText)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
          >
            💬 WhatsApp
          </a>
          <a
            className="share-menu-item"
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url || '')}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
          >
            🐦 Twitter / X
          </a>
          <button type="button" className="share-menu-item" onMouseDown={(e) => e.preventDefault()} onClick={copyLink}>
            {copied ? '✓ Copied!' : '🔗 Copy Link'}
          </button>
        </div>
      )}
    </div>
  );
}
