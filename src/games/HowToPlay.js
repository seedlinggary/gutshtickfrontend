import React, { useState } from 'react';

/** Consistent, collapsible "How to Play" block for every game. Collapsed by
 * default so it doesn't push the board down on a phone screen — the player
 * opens it on demand instead of scrolling past a wall of text every time. */
export default function HowToPlay({ children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`how-to-play${open ? ' open' : ''}`}>
      <button
        className="how-to-play-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span>ℹ️ How to Play</span>
        <span className="how-to-play-chevron">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="how-to-play-body">{children}</div>}
    </div>
  );
}
