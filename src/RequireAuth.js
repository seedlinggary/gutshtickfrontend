import { Navigate } from 'react-router-dom';

/** Redirects to /signin unless `check()` passes (e.g. isLoggedIn). Hoisted
 * out of App.js so any site's routes.js (see src/sites/registry.js) can use
 * it without importing from App.js. */
export default function RequireAuth({ check, children }) {
  if (!check()) return <Navigate to="/signin" replace />;
  return children;
}
