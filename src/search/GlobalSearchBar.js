import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';

/** The one search entry point dropped into every site's navbar (AppNavbar,
 * Business/Estates/Money/TorahNavbar -- not NewsNavbar, since Gut News
 * isn't publicly launched yet, see news/SuperAdminGate.js and
 * search/SearchResults.js's own matching exclusion). Collapsed to a plain
 * icon button so it doesn't compete for space with each site's own
 * differently-sized set of nav links (same reasoning NotificationBell.js
 * and CrossSiteLink.js already use their own small fixed-size triggers
 * instead of an always-visible input); expands into an inline input on
 * click. Submitting always routes to /search, which is registered in the
 * "shared across every site" section of App.js so it resolves the same way
 * regardless of which site's navbar it was opened from. */
export default function GlobalSearchBar() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const inputRef = useRef(null);
  const wrapRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target) && !q.trim()) setOpen(false);
    };
    const onKeyDown = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, q]);

  const submit = (e) => {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    setOpen(false);
    navigate(`/search?q=${encodeURIComponent(term)}`);
  };

  return (
    <div className="global-search-wrap" ref={wrapRef}>
      {open ? (
        <form className="global-search-form" onSubmit={submit} role="search">
          <Search size={15} className="global-search-icon" />
          <input
            ref={inputRef}
            type="search"
            className="global-search-input"
            placeholder="Search all of GUT…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search all of GUT"
          />
          <button type="button" className="global-search-close" aria-label="Close search" onClick={() => setOpen(false)}>
            <X size={14} />
          </button>
        </form>
      ) : (
        <button type="button" className="global-search-btn" aria-label="Search" title="Search" onClick={() => setOpen(true)}>
          <Search size={17} />
        </button>
      )}
    </div>
  );
}
