import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';
const LOCAL_HOSTNAMES = ['localhost', '127.0.0.1', '0.0.0.0'];
const ANON_ID_KEY = 'anon_id';

function getOrCreateAnonId() {
  let id = localStorage.getItem(ANON_ID_KEY);
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    localStorage.setItem(ANON_ID_KEY, id);
  }
  return id;
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
 * Tracking is OFF by default on localhost/127.0.0.1/0.0.0.0 dev machines, so
 * local development never pollutes real visitor analytics reported to
 * advertisers. To test tracking locally, open the browser console and run:
 *
 *   localStorage.setItem('force_analytics', 'true')
 *
 * then reload (localStorage.removeItem('force_analytics') to go back to
 * normal). That flips this component's own gate AND is sent through as
 * `force: true` in the beacon body, because the backend has its own
 * independent localhost check too (a deliberate belt-and-braces second
 * check -- see backend/analytics/routes/visitor.py) that would otherwise
 * silently no-op the DB write even if this component fired the request.
 *
 * Mount once, high in the tree, inside the Router (needs useLocation()) --
 * e.g. inside <BrowserRouter> in App.js, alongside the route definitions.
 */
export default function VisitorTracker() {
  const location = useLocation();

  useEffect(() => {
    const isLocalHost = LOCAL_HOSTNAMES.includes(window.location.hostname);
    const forceAnalytics = localStorage.getItem('force_analytics') === 'true';
    const trackingActive = !isLocalHost || forceAnalytics;
    if (!trackingActive) return;

    // Same localStorage key ApiRequest.js uses for the logged-in-user JWT.
    // Sending it (when present) lets the backend link this anonymous
    // session to the logged-in user -- it's optional server-side, so a
    // missing/expired token never breaks the beacon.
    const token = localStorage.getItem('cookie');
    const anonId = getOrCreateAnonId();

    fetch(`${API}/analytics/beacon`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'x-access-token': token } : {}),
      },
      body: JSON.stringify({
        anon_id: anonId,
        path: location.pathname,
        force: forceAnalytics,
      }),
    }).catch(() => {
      // Analytics must never break the app -- swallow network errors silently.
    });
  }, [location.pathname]);

  return null;
}
