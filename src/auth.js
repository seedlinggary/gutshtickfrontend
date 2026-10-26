export const getRole = () => localStorage.getItem('role') || 'viewer';
export const getEmail = () => localStorage.getItem('email') || null;
export const getToken = () => localStorage.getItem('cookie') || null;
export const isLoggedIn = () => !!getEmail() && !!getToken();
export const isAdmin = () => ['admin', 'super_admin'].includes(getRole());
export const isSuperAdmin = () => getRole() === 'super_admin';

// Deliberately NOT cleared by clearAuth() below -- once a browser has ever
// logged in as admin/super_admin, its ad impressions/clicks keep being
// excluded from the advertiser-visible counts even while logged out (or
// before logging back in), not just while actively signed in. See
// ApiRequest.js (sends this as the x-admin-device header) and AdSlot.js's
// AdCard (appends it as a query param on the plain click-through link,
// which can't carry a custom header) -- backend/ads/routes/ads.py's
// _is_excluded_viewer() is what actually honors either one.
export const isAdminDevice = () => localStorage.getItem('admin_device') === 'true';

export const clearAuth = () => {
  localStorage.removeItem('cookie');
  localStorage.removeItem('email');
  localStorage.removeItem('role');
  localStorage.removeItem('is_boss');
  localStorage.removeItem('profile_name');
  localStorage.removeItem('public_id');

  // Rotates the anon_id visitor-tracking id so post-logout browsing is
  // recorded as a fresh, genuinely anonymous session instead of staying
  // permanently linked to the account that just signed out (see
  // backend/analytics/routes/visitor.py's beacon() docstring). Lives in
  // localStorage (see VisitorTracker.js), so this is just a local removal --
  // no backend round-trip needed, unlike when this was cookie-based.
  localStorage.removeItem('anon_id');

  // Gut Torah's "active source sheet" (see torah/sheets/useActiveSheet.js)
  // is a global, not per-user, localStorage key -- without clearing it here,
  // the next person to log in on this browser would have someone else's
  // sheet pre-selected as "active" the moment they open Sources.
  localStorage.removeItem('torah_active_sheet_id');
};

export const saveAuth = (data, email) => {
  localStorage.setItem('cookie', data.token);
  localStorage.setItem('email', email);
  localStorage.setItem('role', data.role || 'user');
  localStorage.setItem('is_boss', data.is_boss ? 'true' : 'false');
  if (data.profile_name) localStorage.setItem('profile_name', data.profile_name);
  if (data.public_id) localStorage.setItem('public_id', data.public_id);
  if (['admin', 'super_admin'].includes(data.role)) localStorage.setItem('admin_device', 'true');
};
