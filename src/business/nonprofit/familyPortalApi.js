// Mirrors nonprofitApi.js's own split from src/ApiRequest.js, one level
// further: a family-portal visitor is neither a platform User nor a
// nonprofit staff login (see the backend's nonprofit_family_auth.py
// docstring), so it gets its own token header (X-Family-Token) and its
// own localStorage key, scoped per-subdomain -- a browser could plausibly
// hold a valid code-verified session for more than one organization's
// family portal at once (two shuls' sites, same parent), and a single
// shared key would make the second login silently clobber the first.
const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

const keyFor = (subdomain) => `family_portal_token:${subdomain}`;

export function getFamilyToken(subdomain) {
  try { return localStorage.getItem(keyFor(subdomain)); } catch (_) { return null; }
}

export function setFamilyToken(subdomain, token) {
  try { localStorage.setItem(keyFor(subdomain), token); } catch (_) { /* noop */ }
}

export function clearFamilyToken(subdomain) {
  try { localStorage.removeItem(keyFor(subdomain)); } catch (_) { /* noop */ }
}

export async function familyApiRequest(subdomain, method, body, path) {
  const token = getFamilyToken(subdomain);
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Family-Token': token || '' },
    body: method !== 'GET' ? JSON.stringify(body) : undefined,
  });
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;
  if (!res.ok) throw (data && data.message) || res.status;
  return data;
}
