import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getCurrentSite, getCurrentBusinessSiteSubdomain } from '../siteMode';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';
const LOCAL_HOSTNAMES = ['localhost', '127.0.0.1', '0.0.0.0'];
const ANON_ID_KEY = 'anon_id';
const AD_CODE_KEY = 'gs_ad_code';

function getOrCreateAnonId() {
  let id = localStorage.getItem(ANON_ID_KEY);
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    localStorage.setItem(ANON_ID_KEY, id);
  }
  return id;
}

// A campaign redirect (GET <API>/campaigns/r/<code>, see backend/campaigns/
// routes/campaign.py) 302s here with ?gs_ad=<code> appended. Captured once,
// on whatever page the visitor actually lands on -- stored to localStorage
// (same per-origin caveat as ANON_ID_KEY: a link into a DIFFERENT sub-site
// than where signup happens would lose attribution, since each hostname is
// its own origin) and stripped from the visible URL immediately. Never
// gated behind the localhost check below -- this is harmless bookkeeping
// even when no beacon is ever sent, and is exactly what local testing of
// the redirect flow needs to observe.
function captureAdCodeFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('gs_ad');
    if (!code) return;
    localStorage.setItem(AD_CODE_KEY, code);
    params.delete('gs_ad');
    const qs = params.toString();
    const cleanUrl = window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash;
    window.history.replaceState({}, '', cleanUrl);
  } catch (_) {
    // Never block rendering over this.
  }
}

/**
 * Renders nothing. Fires a beacon (POST /analytics/beacon) once on mount and
 * again on every client-side route change, so the backend can log page
 * views for both anonymous and logged-in visitors.
 *
 * The anonymous id lives in localStorage, not a cookie -- frontend and
 * backend are separate Vercel deployments (different origins), so a cookie
 * set by the backend would be a cross-site/third-party cookie from the
 * page's point of view, and a lot of real traffic (Safari ITP, Firefox ETP,
 * and similar privacy features) silently blocks or drops those, making every
 * single page view look like a brand-new anonymous visitor. localStorage is
 * same-origin only, so it isn't subject to any of that -- same reason the
 * JWT auth token already lives in localStorage instead of a cookie.
 *
 * Tracking is unconditionally OFF on localhost/127.0.0.1/0.0.0.0 dev
 * machines -- no override, no escape hatch. (An earlier version had a
 * `force_analytics` localStorage flag for exercising the write path from a
 * dev machine; removed because that traffic was still landing in the
 * production table even though the dashboard filtered it back out.) The
 * backend has its own independent localhost check too (a deliberate
 * belt-and-braces second gate -- see backend/analytics/routes/visitor.py).
 *
 * Mount once, high in the tree, inside the Router (needs useLocation()) --
 * e.g. inside <BrowserRouter> in App.js, alongside the route definitions.
 */
export default function VisitorTracker() {
  const location = useLocation();

  // Runs once on mount, independent of the beacon effect below -- this has
  // to inspect the browser's raw URL the instant the page lands, not react
  // to a later route change.
  useEffect(() => {
    captureAdCodeFromUrl();
  }, []);

  useEffect(() => {
    const isLocalHost = LOCAL_HOSTNAMES.includes(window.location.hostname);
    if (isLocalHost) return;

    // Same localStorage key ApiRequest.js uses for the logged-in-user JWT.
    // Sending it (when present) lets the backend link this anonymous
    // session to the logged-in user -- it's optional server-side, so a
    // missing/expired token never breaks the beacon.
    const token = localStorage.getItem('cookie');
    const anonId = getOrCreateAnonId();
    const siteId = getCurrentSite()?.id || 'main';
    // Every storefront shares the generic 'business-site' id -- the
    // subdomain is what lets the backend tell one owner's traffic apart
    // from another's (see visitor.py's beacon()).
    const subdomain = siteId === 'business-site' ? getCurrentBusinessSiteSubdomain() : null;
    // Sent on every beacon call (not just once) so the backend can attach
    // it the moment a VisitorSession row exists for this anon_id -- the
    // backend itself only ever applies it sticky/first-touch (see beacon()).
    const adCode = localStorage.getItem(AD_CODE_KEY) || null;

    fetch(`${API}/analytics/beacon`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'x-access-token': token } : {}),
      },
      body: JSON.stringify({
        anon_id: anonId,
        path: location.pathname,
        site: siteId,
        ...(subdomain ? { subdomain } : {}),
        ...(adCode ? { ad_code: adCode } : {}),
      }),
    }).catch(() => {
      // Analytics must never break the app -- swallow network errors silently.
    });
  }, [location.pathname]);

  return null;
}
