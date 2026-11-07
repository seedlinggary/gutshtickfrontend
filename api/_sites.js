// Shared host -> site-id resolution for the SEO API functions (sitemap.js
// today; render.js/static-meta.js are routed to the right per-site meta
// builder via vercel.json's own host-gated rewrites instead, so they don't
// need this directly). Vercel exposes every configured Environment Variable
// to serverless functions via process.env regardless of the VITE_ prefix --
// that prefix is purely a Vite client-bundling convention, not a visibility
// restriction -- so this reads the exact same env vars src/siteMode.js reads
// client-side, just via process.env instead of import.meta.env.
//
// Same normalizeHost() defensive stripping as siteMode.js, for the same
// reason: a stray "https://" or trailing slash pasted into a Vercel env var
// would otherwise silently never match any incoming req.headers.host.

function normalizeHost(raw) {
  return raw.trim().replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').replace(/\/+$/, '');
}

function parseHostnames(envValue) {
  return (envValue || '').split(',').map(normalizeHost).filter(Boolean);
}

const SITE_HOSTS = {
  business: parseHostnames(process.env.VITE_BUSINESS_HOSTNAMES),
  estates: parseHostnames(process.env.VITE_ESTATES_HOSTNAMES),
  money: parseHostnames(process.env.VITE_MONEY_HOSTNAMES),
  torah: parseHostnames(process.env.VITE_TORAH_HOSTNAMES),
  // News is locked to super_admin only (see src/news's RequireAuth gate) --
  // included here so sitemap.js can positively identify its hostnames and
  // correctly serve an empty sitemap, rather than misidentifying them as an
  // unmatched host and falling through to the main site's sitemap.
  news: parseHostnames(process.env.VITE_NEWS_HOSTNAMES),
  main: parseHostnames(process.env.VITE_MAIN_HOSTNAMES),
};

/** Which registered site owns this hostname -- 'main' for anything
 * unmatched, mirroring siteMode.js's own fallback (an unrecognized host
 * renders the main consumer site's routes). */
function siteForHost(host) {
  const bare = normalizeHost(host || '');
  for (const [id, hosts] of Object.entries(SITE_HOSTS)) {
    if (hosts.includes(bare)) return id;
  }
  return 'main';
}

/** True only if this exact host is in one of the real configured
 * VITE_*_HOSTNAMES lists -- unlike siteForHost(), this does NOT fall back
 * to 'main' for an unmatched host. Lets api/shell.js tell apart a
 * genuinely-configured main-site domain from an unrecognized one (a
 * Vercel preview URL, the raw *.vercel.app production alias, a typo'd
 * domain) -- siteForHost() alone can't make that distinction since both
 * cases return 'main'. */
function isKnownHost(host) {
  const bare = normalizeHost(host || '');
  return Object.values(SITE_HOSTS).some((hosts) => hosts.includes(bare));
}

// Business-owner storefronts (the site-builder feature) don't get a fixed
// per-site hostname list like the 5 sub-sites above -- a new business can
// claim a subdomain at any time, long after this deploy's env vars were
// set, so there's no way to enumerate them up front the way SITE_HOSTS
// does. Instead this is a wildcard BASE domain (e.g. "gutcommunity.com")
// added as a wildcard domain in the Vercel project itself (an account/DNS
// action, not a code change) -- any subdomain of it reaches this same
// deployment and is resolved at request time by the backend's
// /business-site/public/by-subdomain/:subdomain lookup, not by anything
// in this file. This function only has to recognize that a host IS one of
// those subdomains, so api/shell.js knows not to redirect it away as
// "unknown".
const BUSINESS_SITE_WILDCARD_DOMAINS = parseHostnames(process.env.VITE_BUSINESS_SITE_WILDCARD_DOMAINS);

/** The subdomain label itself (e.g. "shmuelsbakery"), or null if this host
 * isn't a business-site subdomain at all -- businessSiteMeta.js (Phase 6's
 * SEO injection) needs the actual label, not just a yes/no. */
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

function isBusinessSiteHost(host) {
  return businessSiteSubdomainFor(host) !== null;
}

const API_BASE = process.env.SEO_API_URL || process.env.VITE_API_URL;

/** A business owner can also point their OWN domain (one they don't
 * share a suffix with -- "www.shmuelsbakery.com", not a
 * *.gutcommunity.com subdomain) at their site. Unlike the wildcard
 * subdomains above, there's no way to recognize one of these from the
 * hostname string alone -- it has to be looked up against every site's
 * custom_domain column, and only a 'verified' one (ownership actually
 * proven via the DNS TXT check in backend/business/routes/business_site.py)
 * is ever honored. Returns the resolved subdomain string, or null if this
 * host isn't a verified custom domain -- callers (shell.js, sitemap.js)
 * then treat that resolved subdomain exactly like a wildcard-subdomain
 * request. Best-effort: a down/slow backend just means this one request
 * falls through to "not a business site" rather than hanging.
 */
async function resolveCustomDomainSubdomain(host) {
  if (!API_BASE) return null;
  const bare = normalizeHost(host || '');
  if (!bare) return null;
  try {
    const res = await fetch(`${API_BASE}/business-site/public/by-domain/${encodeURIComponent(bare)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.subdomain || null;
  } catch (_) {
    return null;
  }
}

/** The first configured hostname for a site -- the canonical domain to
 * redirect an unrecognized host to, or to build a cross-site redirect
 * target from. Returns null if that site has no hostnames configured
 * (e.g. local dev with no .env set) -- callers must handle that rather
 * than redirect to an empty/undefined host. */
function canonicalHost(site) {
  return (SITE_HOSTS[site] && SITE_HOSTS[site][0]) || null;
}

/** Combines businessSiteSubdomainFor (wildcard subdomain, sync) and
 * resolveCustomDomainSubdomain (verified foreign domain, async) into the
 * one check every business-site-aware route handler needs: "does this
 * host belong to a business site at all, and if so, which subdomain."
 * Checked in that order since the wildcard case never needs a network
 * round trip. */
async function resolveBusinessSiteForHost(host) {
  const wildcardSubdomain = businessSiteSubdomainFor(host);
  if (wildcardSubdomain) return wildcardSubdomain;
  return resolveCustomDomainSubdomain(host);
}

module.exports = {
  parseHostnames, siteForHost, isKnownHost, isBusinessSiteHost, businessSiteSubdomainFor,
  resolveCustomDomainSubdomain, resolveBusinessSiteForHost, canonicalHost, SITE_HOSTS,
};
