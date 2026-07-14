import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';
const LOCAL_HOSTNAMES = ['localhost', '127.0.0.1', '0.0.0.0'];

/**
 * Renders nothing. Fires a beacon (POST /analytics/beacon) once on mount and
 * again on every client-side route change, so the backend can log page
 * views for both anonymous (cookie-based) and logged-in visitors.
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

    fetch(`${API}/analytics/beacon`, {
      method: 'POST',
      credentials: 'include', // required so the anon_id cookie is set/sent
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'x-access-token': token } : {}),
      },
      body: JSON.stringify({
        path: location.pathname,
        force: forceAnalytics,
      }),
    }).catch(() => {
      // Analytics must never break the app -- swallow network errors silently.
    });
  }, [location.pathname]);

  return null;
}
