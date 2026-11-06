import { useEffect, useState } from 'react';
import apiRequest from '../../ApiRequest';

// Simple in-memory cache (not persisted, cleared on reload) -- the navbar
// and whichever page component is showing both need the same site's
// theme/nav/footer data and mount at roughly the same time as siblings
// under App.js, so this avoids firing the identical GET twice on every
// navigation within one page load. Short TTL (not indefinite) -- without
// one, a visitor who loads one page, then client-side-navigates to
// another on the same site minutes later, would keep seeing whatever
// nav/footer/theme was live at the moment of their FIRST page load for
// the rest of that tab's session, even after the owner publishes a change
// (e.g. adding a footer) in the meantime.
const CACHE_TTL_MS = 60_000;
const cache = new Map();

function freshEntry(subdomain) {
  const entry = cache.get(subdomain);
  if (!entry) return null;
  if (Date.now() - entry.at > CACHE_TTL_MS) return null;
  return entry.data;
}

/** theme/nav_links/footer_text/footer_links + the business's own name/
 * logo/about -- everything from GET /business-site/public/by-subdomain/
 * :subdomain, which every business-site page already needs a piece of.
 * Returns null until loaded. */
export default function useSiteChrome(subdomain) {
  const [chrome, setChrome] = useState(() => (subdomain ? freshEntry(subdomain) : null));

  useEffect(() => {
    if (!subdomain) return;
    const fresh = freshEntry(subdomain);
    if (fresh) {
      setChrome(fresh);
      return;
    }
    apiRequest('GET', null, `/business-site/public/by-subdomain/${encodeURIComponent(subdomain)}`)
      .then((data) => { cache.set(subdomain, { data, at: Date.now() }); setChrome(data); })
      .catch(() => {});
  }, [subdomain]);

  return chrome;
}
