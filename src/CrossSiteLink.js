import React, { useEffect, useRef, useState } from 'react';
import { LayoutGrid, Check } from 'lucide-react';
import { getCurrentSite, listAllSites } from './siteMode';
import { isLoggedIn, getEmail, isSuperAdmin } from './auth';
import apiRequest from './ApiRequest';

/** Navigates to an absolute cross-site URL (built via siteMode.js's
 * siteUrl()), carrying a one-time SSO handoff token when logged in so the
 * destination site logs the same user in automatically instead of landing
 * them there signed out (see SsoBootstrap.js / backend/user/routes/sso.py).
 * Exported so any other cross-site link -- not just this component's own
 * "switch sites" menu -- can reuse the exact same mechanism instead of a
 * plain `<a>`/`window.location` that would silently drop the session; see
 * search/SearchResults.js, whose result cards link into whichever site
 * actually owns that result. */
export async function crossSiteNavigate(targetUrl) {
  if (!isLoggedIn()) {
    window.location.href = targetUrl;
    return;
  }
  try {
    const { sso_token } = await apiRequest('POST', {}, '/sso/create');
    const email = encodeURIComponent(getEmail() || '');
    window.location.href = `${targetUrl}#sso=${encodeURIComponent(sso_token)}&email=${email}`;
  } catch (_) {
    window.location.href = targetUrl;
  }
}

/** The *only* way to jump between sites -- a small fixed icon (not a nav
 * item) that opens a menu listing every site this deployment serves (main
 * consumer site included), with the current one marked and skipped. Uses
 * crossSiteNavigate() above for the actual handoff. */
export default function CrossSiteLink() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const currentSite = getCurrentSite();
  const currentId = currentSite ? currentSite.id : 'main';
  // Gut News is soft-locked to super_admin only for now (see
  // news/SuperAdminGate.js) -- don't advertise it in the switcher to
  // everyone else.
  const sites = listAllSites().filter((site) => site.id !== 'news' || isSuperAdmin());

  useEffect(() => {
    if (!open) return undefined;
    const onOutside = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKeyDown = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const go = async (base) => {
    if (loading) return;
    setOpen(false);
    setLoading(true);
    try {
      await crossSiteNavigate(base);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cross-site-wrap" ref={ref}>
      {open && (
        <ul className="cross-site-menu" role="menu">
          {sites.map((site) => (
            <li key={site.id}>
              <button
                type="button"
                className="cross-site-item"
                disabled={site.id === currentId || loading}
                onClick={() => go(site.url)}
              >
                {site.id === currentId ? <Check size={14} /> : <span style={{ width: 14, display: 'inline-block' }} />}
                <span data-no-translate>{site.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        className="cross-site-link"
        onClick={() => setOpen((o) => !o)}
        disabled={loading}
        title="Switch sites"
        aria-label="Switch sites"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <LayoutGrid size={18} />
      </button>
    </div>
  );
}
