// Per-host robots.txt, served at every domain via the unconditional
// "/robots.txt -> /api/robots" rewrite in vercel.json (same shape as the
// existing "/sitemap.xml -> /api/sitemap" rule). Replaces the old
// public/robots.txt, which was one static file served byte-identical on
// all 5 domains -- always pointing Sitemap: at gutcommunity.com's sitemap
// regardless of which domain was actually being crawled, and never
// Disallow-ing the auth/account pages (signin/signup/profile/admin) that
// are reachable (and shared, see api/_routes.js's UNIVERSAL_PREFIXES) on
// every site but should never be indexed on any of them.

const { siteForHost } = require('./_sites');

// Applies on every host regardless of site -- none of these are ever
// worth indexing anywhere.
const UNIVERSAL_DISALLOW = ['/signin', '/signup', '/forgotpassword', '/profile', '/admin', '/superadmin'];

// Site-specific rules, same intent as the old static file's Business-only
// list (private/ownership-gated pages that happen to be reachable but
// shouldn't be crawled) -- extend this per-site as other sites grow their
// own owner-only pages.
const SITE_DISALLOW = {
  business: ['/business/new', '/business/*/edit', '/business/*/post-deal', '/business/*/tools', '/communities/new', '/communities/*/edit', '/my-businesses', '/my-deals', '/vendor-board'],
  estates: ['/listings/new', '/listings/*/edit', '/my-listings', '/group-buy/new', '/group-buy/*/edit', '/my-group-buys'],
  money: ['/tachlis?new=1'],
  torah: ['/posts/new', '/posts/*/edit', '/my-posts', '/sheets'],
  main: [],
};

module.exports = async function handler(req, res) {
  const site = siteForHost(req.headers.host);
  const origin = `https://${req.headers.host}`;
  const disallow = [...UNIVERSAL_DISALLOW, ...(SITE_DISALLOW[site] || [])];

  const lines = [
    'User-agent: *',
    ...disallow.map((d) => `Disallow: ${d}`),
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ];

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  res.status(200).send(lines.join('\n'));
};
