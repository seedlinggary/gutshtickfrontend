export const getRole = () => localStorage.getItem('role') || 'viewer';
export const getEmail = () => localStorage.getItem('email') || null;
export const getToken = () => localStorage.getItem('cookie') || null;
export const isLoggedIn = () => !!getEmail() && !!getToken();
export const isAdmin = () => ['admin', 'super_admin'].includes(getRole());
export const isSuperAdmin = () => getRole() === 'super_admin';

export const clearAuth = () => {
  localStorage.removeItem('cookie');
  localStorage.removeItem('email');
  localStorage.removeItem('role');
  localStorage.removeItem('is_boss');
  localStorage.removeItem('profile_name');
  localStorage.removeItem('public_id');
};

export const saveAuth = (data, email) => {
  localStorage.setItem('cookie', data.token);
  localStorage.setItem('email', email);
  localStorage.setItem('role', data.role || 'user');
  localStorage.setItem('is_boss', data.is_boss ? 'true' : 'false');
  if (data.profile_name) localStorage.setItem('profile_name', data.profile_name);
  if (data.public_id) localStorage.setItem('public_id', data.public_id);
};
