import React, { useEffect, useRef, useState } from 'react';
import apiRequest from './ApiRequest';

const DISMISSED_KEY = 'gs_banner_dismissed';

/** Super-admin-editable site-wide announcement banner -- mounted once in
 * App.js (above the navbar), shown on every one of GUT's 5 sites since
 * they all share this one bundle/backend. Fixed above the navbar; sets the
 * --site-banner-h CSS variable to its own rendered height so the navbar,
 * the fixed top-banner ad, and the page's own top padding all shift down
 * by exactly that much (see index.css) -- nothing here overlaps an ad or
 * gets hidden behind the nav, on desktop or mobile, regardless of how many
 * lines the message wraps to.
 *
 * Dismissal is per-browser only (localStorage), keyed off the banner's own
 * updated_at -- editing the message while it's on bumps updated_at, which
 * makes it reappear even for someone who already closed the prior one. */
export default function SiteBanner() {
  const [banner, setBanner] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    apiRequest('GET', null, '/banner')
      .then((data) => {
        if (!data || !data.enabled || !data.message) return;
        let dismissed = null;
        try { dismissed = localStorage.getItem(DISMISSED_KEY); } catch { /* ignore */ }
        if (dismissed === data.updated_at) return;
        setBanner(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const setHeight = (px) => {
      try { document.documentElement.style.setProperty('--site-banner-h', `${px}px`); } catch { /* ignore */ }
    };
    if (!banner || !ref.current) {
      setHeight(0);
      return;
    }
    const el = ref.current;
    setHeight(el.offsetHeight);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    return () => { ro.disconnect(); setHeight(0); };
  }, [banner]);

  if (!banner) return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISSED_KEY, banner.updated_at); } catch { /* ignore */ }
    setBanner(null);
  };

  return (
    <div ref={ref} className={`site-banner site-banner-${banner.style}`} role="region" aria-label="Site announcement">
      <span className="site-banner-message">
        {banner.message}
        {banner.link_url && (
          <a href={banner.link_url} className="site-banner-link" target="_blank" rel="noopener noreferrer">
            {' '}{banner.link_text || 'Learn more'} →
          </a>
        )}
      </span>
      <button type="button" className="site-banner-close" aria-label="Dismiss announcement" onClick={dismiss}>×</button>
    </div>
  );
}
