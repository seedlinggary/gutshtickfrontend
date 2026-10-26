// Server-side route-ownership table, mirroring each site's own
// src/<id>/routes.js (plus App.js's shared block) -- lets api/shell.js (the
// final catch-all, see vercel.json) tell apart "this path belongs to a
// DIFFERENT site" (redirect there) from "this path doesn't exist anywhere"
// (real 404) from "this path is intentionally shared by every site"
// (serve normally, no redirect/404).
//
// Expressed as top-level path PREFIXES, not full route patterns -- a prefix
// like '/business' covers every one of that site's own sub-paths
// (/business/new, /business/:id, /business/:id/edit, /business/:id/tools,
// /business/:id/post-deal) without needing to enumerate each one.

const SITE_OWNED_PREFIXES = {
  business: ['/business', '/communities', '/community', '/activities', '/deals', '/minyanim', '/my-businesses', '/my-deals', '/vendor-board'],
  estates: ['/listings', '/group-buy', '/my-listings', '/my-group-buys', '/calculators'],
  money: ['/investing', '/budgeting', '/tachlis'],
  torah: ['/posts', '/zmanim', '/sources', '/prayers', '/sheets', '/my-posts'],
  main: ['/feed', '/post', '/hock', '/CreateShtick'],
};

// Valid on EVERY site by the app's own design (App.js's shared route block,
// rendered unconditionally regardless of which site is active) -- never
// redirected, never 404'd, no matter which domain requests them.
const UNIVERSAL_PREFIXES = [
  '/about', '/contact', '/disclaimer', '/content-guidelines',
  '/signin', '/signup', '/forgotpassword', '/profile', '/admin', '/superadmin', '/games',
];

// Owned by more than one site (Estates AND Money both have /learn) -- on
// any OTHER site, there's no single correct redirect target between the
// listed owners, so these are deliberately excluded from auto-redirect and
// just 404 there, same as any other unrecognized path. But on a host that
// IS one of the listed owners, the path is completely real and must serve
// normally -- confirmed live by this file's own end-to-end test catching
// gutmoney.com/learn (Money's own real route) 404ing before this fix.
const AMBIGUOUS_PREFIXES = { '/learn': ['estates', 'money'] };

function pathStartsWithAny(path, prefixes) {
  return prefixes.some((p) => path === p || path.startsWith(`${p}/`));
}

/** Returns the owning site id, 'universal', 'ambiguous', or null (owned
 * nowhere -- a genuinely unknown path). `path` should be the request
 * pathname only (no query string). `currentSite` resolves an ambiguous
 * path to its real owner when the current host happens to be one of them. */
function siteForPath(path, currentSite) {
  if (path === '/' || path === '') return 'universal';
  if (pathStartsWithAny(path, UNIVERSAL_PREFIXES)) return 'universal';
  for (const [prefix, owners] of Object.entries(AMBIGUOUS_PREFIXES)) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      return owners.includes(currentSite) ? currentSite : 'ambiguous';
    }
  }
  for (const [site, prefixes] of Object.entries(SITE_OWNED_PREFIXES)) {
    if (pathStartsWithAny(path, prefixes)) return site;
  }
  return null;
}

module.exports = { siteForPath, SITE_OWNED_PREFIXES, UNIVERSAL_PREFIXES, AMBIGUOUS_PREFIXES };
