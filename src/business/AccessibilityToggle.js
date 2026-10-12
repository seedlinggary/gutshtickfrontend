import React, { useEffect, useRef, useState } from 'react';
import { Accessibility } from 'lucide-react';

const CONTRAST_KEY = 'biz_high_contrast';
const LARGE_TAP_KEY = 'biz_large_tap';

function readFlag(key) {
  try { return localStorage.getItem(key) === '1'; } catch (e) { return false; }
}

function writeFlag(key, value) {
  try { localStorage.setItem(key, value ? '1' : '0'); } catch (e) { /* ignore */ }
}

/** Applies data-attributes on <html> that business-theme.css keys off of
 * (see [data-biz-contrast="high"] / [data-biz-tap="large"]) -- kept as plain
 * attributes rather than a class so it composes cleanly with the light/dark
 * theme attribute the host page may already set. */
function applyDom(highContrast, largeTap) {
  const root = document.documentElement;
  if (highContrast) root.setAttribute('data-biz-contrast', 'high');
  else root.removeAttribute('data-biz-contrast');
  if (largeTap) root.setAttribute('data-biz-tap', 'large');
  else root.removeAttribute('data-biz-tap');
}

export default function AccessibilityToggle() {
  const [highContrast, setHighContrast] = useState(() => readFlag(CONTRAST_KEY));
  const [largeTap, setLargeTap] = useState(() => readFlag(LARGE_TAP_KEY));
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => { applyDom(highContrast, largeTap); }, [highContrast, largeTap]);

  useEffect(() => {
    if (!open) return undefined;
    const onOutside = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    const onKeyDown = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="biz-a11y-toggle" ref={boxRef}>
      <button
        type="button"
        className="biz-a11y-btn"
        aria-label="Accessibility options"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Accessibility size={16} />
      </button>
      {open && (
        <div className="biz-a11y-menu" role="menu">
          <label className="biz-a11y-item">
            <input
              type="checkbox"
              checked={highContrast}
              onChange={(e) => { setHighContrast(e.target.checked); writeFlag(CONTRAST_KEY, e.target.checked); }}
            />
            High contrast
          </label>
          <label className="biz-a11y-item">
            <input
              type="checkbox"
              checked={largeTap}
              onChange={(e) => { setLargeTap(e.target.checked); writeFlag(LARGE_TAP_KEY, e.target.checked); }}
            />
            Larger tap targets
          </label>
        </div>
      )}
    </div>
  );
}
