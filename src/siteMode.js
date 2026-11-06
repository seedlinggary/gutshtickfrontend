import React from 'react';
import { SITES } from './sites/registry';
import BusinessSiteNavbar from './business/site-builder/BusinessSiteNavbar';
import BusinessSitePublic from './business/site-builder/BusinessSitePublic';
import BusinessSitePageBySlug from './business/site-builder/BusinessSitePageBySlug';
import CartPage from './business/site-builder/CartPage';
import OrderConfirmationPage from './business/site-builder/OrderConfirmationPage';
import NonprofitStaffApp from './business/nonprofit/NonprofitStaffApp';
import NonprofitDonatePage from './business/nonprofit/public/NonprofitDonatePage';
import NonprofitMembershipPage from './business/nonprofit/public/NonprofitMembershipPage';
import NonprofitHolidaySeatsPage from './business/nonprofit/public/NonprofitHolidaySeatsPage';
import NonprofitFormPage from './business/nonprofit/public/NonprofitFormPage';
import NonprofitThankYouPage from './business/nonprofit/public/NonprofitThankYouPage';
import NonprofitFamilyPortalPage from './business/nonprofit/public/NonprofitFamilyPortalPage';

// Decides which "site" this browser tab renders. Every sub-site (see
// src/sites/registry.js) is the exact same deployed app; only the domain
// the request came in on (or, on localhost, a `?site=<id>` dev toggle)
// decides which one shows -- nothing to build/deploy separately per site.
// Adding a new sub-site means adding an entry to SITES, not touching this
// file's logic.
// Hostname env vars should be bare hosts ("www.example.com"), but a stray
// "https://" prefix or trailing slash is an easy mistake to paste into a
// Vercel env var -- window.location.hostname never has either, so an
// un-normalized entry would silently never match anything (falling through
// to the main site) and would also corrupt siteUrl()'s protocol+host
// concatenation below. Strip both defensively rather than fail silently.
function normalizeHost(raw) {
  return raw.trim().replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').replace(/\/+$/, '');
}

function parseHostnames(envValue) {
  return (envValue || '').split(',').map(normalizeHost).filter(Boolean);
}

const MAIN_HOSTS = parseHostnames(import.meta.env.VITE_MAIN_HOSTNAMES);

// Business-owner storefronts (site builder) -- see the matching
// api/_sites.js comment server-side. Unlike MAIN_HOSTS/hostnamesFor()
// above, this is a BASE domain, not a list of exact hosts: any subdomain
// of it belongs to whichever business claimed that subdomain, resolved at
// request time (GET /business-site/public/by-subdomain/:subdomain), not
// from a fixed list known at build/deploy time.
const BUSINESS_SITE_WILDCARD_DOMAINS = parseHostnames(import.meta.env.VITE_BUSINESS_SITE_WILDCARD_DOMAINS);

function businessSiteSubdomainFor(host) {
  const bare = normalizeHost(host || '');
  if (!bare.includes('.')) return null;
  for (const base of BUSINESS_SITE_WILDCARD_DOMAINS) {
    if (bare !== base && bare.endsWith(`.${base}`)) {
      return bare.slice(0, bare.length - base.length - 1);
    }
  }
  return null;
}

/** Synthetic SITES-shaped descriptor for a business-owner storefront --
 * deliberately NOT an entry in registry.js, since (unlike every real
 * entry there) its content isn't known until runtime: there's one of
 * these per subdomain, resolved by a lookup, not a fixed route table
 * built at deploy time. Conforming to the exact {id, themeClass, Navbar,
 * routes} shape every registry.js entry has means App.js needs no
 * changes at all to render it -- it can't tell this apart from a "real"
 * site, which is the point. */
export function businessSiteDescriptor(subdomain) {
  return {
    id: 'business-site',
    label: 'Business site',
    // Reuses the Business/Community site's own theme class rather than
    // inventing a new one -- a storefront is conceptually part of that
    // same family, it picks up its CSS variables for free, and (just as
    // importantly) App.js's theme-class cleanup loop only knows how to
    // remove classes that are in registry.js's SITES list, so a brand new
    // class here would never get cleared when switching away from it via
    // the local-dev ?site= toggle.
    themeClass: 'business-theme',
    Navbar: BusinessSiteNavbar,
    routes: [
      { path: '/', element: React.createElement(BusinessSitePublic, { subdomain }) },
      { path: '/cart', element: React.createElement(CartPage, { subdomain }) },
      { path: '/order/:orderId/confirmation', element: React.createElement(OrderConfirmationPage, { subdomain }) },
      // Nonprofit module -- same "fixed route, not a page the owner built"
      // treatment as /cart above, for exactly the same reason: these need
      // real logic (payment-link redirects, a staff-only area), not a
      // freeform page. /staff/* carries its OWN nested <Routes> (login +
      // the whole dashboard shell), so it must stay above the catch-all
      // too, same as every other fixed path here.
      { path: '/donate', element: React.createElement(NonprofitDonatePage, { subdomain }) },
      { path: '/membership', element: React.createElement(NonprofitMembershipPage, { subdomain }) },
      { path: '/holidays', element: React.createElement(NonprofitHolidaySeatsPage, { subdomain }) },
      { path: '/forms/:slug', element: React.createElement(NonprofitFormPage, { subdomain }) },
      { path: '/pay/thank-you', element: React.createElement(NonprofitThankYouPage, { subdomain }) },
      { path: '/family-portal', element: React.createElement(NonprofitFamilyPortalPage, { subdomain }) },
      { path: '/staff/*', element: React.createElement(NonprofitStaffApp, { subdomain }) },
      // Catch-all for any other page the owner has built, by slug -- MUST
      // stay last, since react-router matches these in array order and
      // every fixed path above would otherwise also match ":slug".
      { path: '/:slug', element: React.createElement(BusinessSitePageBySlug, { subdomain }) },
    ],
  };
}

/** Which business-site subdomain the CURRENT page belongs to, if any --
 * same resolution getCurrentSite() already does internally, exposed for
 * components that need just the subdomain string without re-deriving the
 * whole site descriptor (BusinessSiteNavbar's cart badge, any future
 * storefront component that needs to know "whose site is this"). */
export function getCurrentBusinessSiteSubdomain() {
  const host = window.location.hostname;
  const wildcardSubdomain = businessSiteSubdomainFor(host);
  if (wildcardSubdomain) return wildcardSubdomain;
  if (isLocalHost(host)) {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('site') === 'business-site') return params.get('subdomain') || 'demo';
      if (localStorage.getItem(DEV_MODE_KEY) === 'business-site') {
        return localStorage.getItem(DEV_SUBDOMAIN_KEY) || 'demo';
      }
    } catch (_) {
      return null;
    }
  }
  return null;
}

const DEV_MODE_KEY = 'dev_site_mode';
const DEV_SUBDOMAIN_KEY = 'dev_business_site_subdomain';
const isLocalHost = (host) => host === 'localhost' || host === '127.0.0.1';

// Each site's production hostnames live in an env var named after its id,
// e.g. site id "business" -> VITE_BUSINESS_HOSTNAMES (comma-separated).
function hostnamesFor(site) {
  const envVar = `VITE_${site.id.toUpperCase()}_HOSTNAMES`;
  return parseHostnames(import.meta.env[envVar]);
}

/** Returns the matched entry from SITES for the current hostname/dev
 * toggle, or null for the main consumer site. */
export function getCurrentSite() {
  const host = window.location.hostname;
  const byHost = SITES.find((site) => hostnamesFor(site).includes(host));
  if (byHost) return byHost;
  if (MAIN_HOSTS.includes(host)) return null;

  const wildcardSubdomain = businessSiteSubdomainFor(host);
  if (wildcardSubdomain) return businessSiteDescriptor(wildcardSubdomain);

  if (isLocalHost(host)) {
    const params = new URLSearchParams(window.location.search);
    const param = params.get('site');
    if (param === 'business-site') {
      const sub = params.get('subdomain') || 'demo';
      localStorage.setItem(DEV_MODE_KEY, param);
      localStorage.setItem(DEV_SUBDOMAIN_KEY, sub);
      return businessSiteDescriptor(sub);
    }
    if (param) {
      localStorage.setItem(DEV_MODE_KEY, param);
      return SITES.find((site) => site.id === param) || null;
    }
    try {
      const saved = localStorage.getItem(DEV_MODE_KEY);
      if (saved === 'business-site') {
        return businessSiteDescriptor(localStorage.getItem(DEV_SUBDOMAIN_KEY) || 'demo');
      }
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

/** True only for a host that NONE of the synchronous checks above
 * recognize -- not a main-site host, not one of the 5 fixed sub-sites,
 * not a wildcard business-site subdomain, and not local dev. This is the
 * ONLY case worth an async lookup for: a business owner's own (verified)
 * custom domain looks identical to a stray/unknown host until
 * /business-site/public/by-domain/:host resolves it, and that lookup is
 * never worth paying for on every one of the already-fast, already-
 * recognized hosts above. */
export function isUnrecognizedHost() {
  const host = window.location.hostname;
  if (isLocalHost(host)) return false;
  if (MAIN_HOSTS.includes(host)) return false;
  if (SITES.some((site) => hostnamesFor(site).includes(host))) return false;
  if (businessSiteSubdomainFor(host)) return false;
  return true;
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
