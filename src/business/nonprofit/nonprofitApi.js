// A wholly separate fetch helper from src/ApiRequest.js -- a nonprofit
// staff login is a wholly separate account system from the platform's
// community User accounts (see the backend's nonprofit_auth.py docstring
// for why), so it gets its own token header (X-Nonprofit-Token, never
// confused with the main site's x-access-token even in a browser logged
// into both at once) and its own localStorage key.
const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';
const TOKEN_KEY = 'nonprofit_staff_token';

export function getStaffToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch (_) { return null; }
}

export function setStaffToken(token) {
  try { localStorage.setItem(TOKEN_KEY, token); } catch (_) { /* noop */ }
}

export function clearStaffToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch (_) { /* noop */ }
}

export async function nonprofitApiRequest(method, body, path) {
  const token = getStaffToken();
  const headers = { 'X-Nonprofit-Token': token || '' };
  const isFormData = body instanceof FormData;
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: method !== 'GET' ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('text/csv')) {
    if (!res.ok) throw 'Could not export';
    return res.blob();
  }
  const isJson = contentType.includes('application/json');
  const data = isJson ? await res.json() : null;
  if (!res.ok) {
    throw (data && data.message) || res.status;
  }
  return data;
}

export default nonprofitApiRequest;
