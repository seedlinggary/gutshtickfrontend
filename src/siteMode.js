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

/** Absolute URL to a path on a specific registered sub-site, for linking
 * into it from OUTSIDE that site (e.g. the main site's Super Admin linking
 * to a Business listing) -- a plain react-router <Link> would resolve
 * against the current site's own route table instead, since sub-sites are
 * different hostnames in production. Falls back to the same `?site=` dev
 * toggle site detection itself uses on localhost. `id: 'main'` is accepted
 * too (not a SITES entry -- it's the one site with its own MAIN_HOSTS env
 * var instead), so every site this app serves can be addressed the same way
 * -- see listAllSites()/CrossSiteLink.js, which needs exactly that. */
export function siteUrl(id, path = '/') {
  const host = window.location.hostname;
  if (isLocalHost(host)) {
    const sep = path.includes('?') ? '&' : '?';
    return `${window.location.origin}${path}${sep}site=${id}`;
  }
  let target = MAIN_HOSTS[0];
  if (id !== 'main') {
    const site = SITES.find((s) => s.id === id);
    target = site && hostnamesFor(site)[0];
  }
  return target ? `${window.location.protocol}//${target}${path}` : `${window.location.origin}${path}`;
}

/** Every site this deployment serves, main consumer site included (as
 * `id: 'main'`, which isn't itself a SITES entry -- see siteUrl() above) --
 * what CrossSiteLink's "switch sites" menu lists. Each entry's `url` is
 * already resolved for the current environment (dev `?site=` toggle vs.
 * production hostname), via siteUrl(). */
export function listAllSites() {
  return [
    { id: 'main', label: 'Gut Shtick', url: siteUrl('main', '/') },
    ...SITES.map((site) => ({ id: site.id, label: site.label || site.id, url: siteUrl(site.id, '/') })),
  ];
}
