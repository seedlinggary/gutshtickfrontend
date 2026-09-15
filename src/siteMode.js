import { SITES } from './sites/registry';

// Decides which "site" this browser tab renders. Every sub-site (see
// src/sites/registry.js) is the exact same deployed app; only the domain
// the request came in on (or, on localhost, a `?site=<id>` dev toggle)
// decides which one shows -- nothing to build/deploy separately per site.
// Adding a new sub-site means adding an entry to SITES, not touching this
// file's logic.
const MAIN_HOSTS = (import.meta.env.VITE_MAIN_HOSTNAMES || '')
  .split(',').map((s) => s.trim()).filter(Boolean);

const DEV_MODE_KEY = 'dev_site_mode';
const isLocalHost = (host) => host === 'localhost' || host === '127.0.0.1';

// Each site's production hostnames live in an env var named after its id,
// e.g. site id "business" -> VITE_BUSINESS_HOSTNAMES (comma-separated).
function hostnamesFor(site) {
  const envVar = `VITE_${site.id.toUpperCase()}_HOSTNAMES`;
  return (import.meta.env[envVar] || '').split(',').map((s) => s.trim()).filter(Boolean);
}

/** Returns the matched entry from SITES for the current hostname/dev
 * toggle, or null for the main consumer site. */
export function getCurrentSite() {
  const host = window.location.hostname;
  const byHost = SITES.find((site) => hostnamesFor(site).includes(host));
  if (byHost) return byHost;
  if (MAIN_HOSTS.includes(host)) return null;

  if (isLocalHost(host)) {
    const param = new URLSearchParams(window.location.search).get('site');
    if (param) {
      localStorage.setItem(DEV_MODE_KEY, param);
      return SITES.find((site) => site.id === param) || null;
    }
    try {
      const saved = localStorage.getItem(DEV_MODE_KEY);
      return SITES.find((site) => site.id === saved) || null;
    } catch (_) {
      return null;
    }
  }
  return null;
}

/** Back-compat boolean wrapper -- prefer getCurrentSite() in new code. */
export function isBusinessSite() {
  return getCurrentSite()?.id === 'business';
}

/** Home URL of the main consumer site, for the small cross-site footer icon
 * every sub-site shows. Sub-sites link back to the one consumer site, not
 * to each other, so this always resolves to "main" regardless of how many
 * sub-sites exist; from *main*, it links out to the first registered
 * sub-site (there's only ever been one "other site" link to show). */
export function otherSiteHomeUrl() {
  const host = window.location.hostname;
  const site = getCurrentSite();
  if (site) {
    const target = MAIN_HOSTS[0];
    if (target) return `${window.location.protocol}//${target}/`;
    return isLocalHost(host) ? `${window.location.origin}/?site=main` : window.location.origin;
  }
  const fallback = SITES[0];
  if (!fallback) return window.location.origin;
  const target = hostnamesFor(fallback)[0];
  if (target) return `${window.location.protocol}//${target}/`;
  return isLocalHost(host) ? `${window.location.origin}/?site=${fallback.id}` : window.location.origin;
}
