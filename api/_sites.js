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

/** The first configured hostname for a site -- the canonical domain to
 * redirect an unrecognized host to, or to build a cross-site redirect
 * target from. Returns null if that site has no hostnames configured
 * (e.g. local dev with no .env set) -- callers must handle that rather
 * than redirect to an empty/undefined host. */
function canonicalHost(site) {
  return (SITE_HOSTS[site] && SITE_HOSTS[site][0]) || null;
}

module.exports = { parseHostnames, siteForHost, isKnownHost, canonicalHost, SITE_HOSTS };
