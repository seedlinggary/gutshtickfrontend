export const getRole = () => localStorage.getItem('role') || 'viewer';
export const getEmail = () => localStorage.getItem('email') || null;
export const getToken = () => localStorage.getItem('cookie') || null;
export const isLoggedIn = () => !!getEmail() && !!getToken();
export const isAdmin = () => ['admin', 'super_admin'].includes(getRole());
export const isSuperAdmin = () => getRole() === 'super_admin';

const ANALYTICS_API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

export const clearAuth = () => {
  localStorage.removeItem('cookie');
  localStorage.removeItem('email');
  localStorage.removeItem('role');
  localStorage.removeItem('is_boss');
  localStorage.removeItem('profile_name');
  localStorage.removeItem('public_id');

  // Rotates the anon_id visitor-tracking cookie so post-logout browsing is
  // recorded as a fresh, genuinely anonymous session instead of staying
  // permanently linked to the account that just signed out (see
  // backend/analytics/routes/visitor.py's beacon() docstring).
  fetch(`${ANALYTICS_API}/analytics/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
};

export const saveAuth = (data, email) => {
  localStorage.setItem('cookie', data.token);
  localStorage.setItem('email', email);
  localStorage.setItem('role', data.role || 'user');
  localStorage.setItem('is_boss', data.is_boss ? 'true' : 'false');
  if (data.profile_name) localStorage.setItem('profile_name', data.profile_name);
  if (data.public_id) localStorage.setItem('public_id', data.public_id);
};
