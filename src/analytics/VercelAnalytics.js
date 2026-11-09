import { Analytics } from '@vercel/analytics/react';
import { isSuperAdmin, isAdminDevice } from '../auth';

const LOCAL_HOSTNAMES = ['localhost', '127.0.0.1', '0.0.0.0'];

/**
 * Vercel's own pageview/web-vitals script, gated the same way the custom
 * beacon in VisitorTracker.js is: never on a dev machine, and never for the
 * site owner's own traffic. `isAdminDevice()` is the sticky flag ApiRequest.js
 * sets on login and never clears on logout (see auth.js) -- checked here too
 * so switching to a logged-out tab on the same browser doesn't start
 * counting that browsing either.
 */
export default function VercelAnalytics() {
  const isLocalHost = LOCAL_HOSTNAMES.includes(window.location.hostname);
  if (isLocalHost || isSuperAdmin() || isAdminDevice()) return null;

  return <Analytics />;
}
