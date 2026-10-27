// Dynamically generated sitemap.xml, served at EVERY site's own domain via
// the single unconditional `/sitemap.xml -> /api/sitemap` rewrite in
// vercel.json (a sitemap has to live under the same host as the pages it
// lists -- it can't just point at the API's domain, and since this is one
// shared deployment for every site, that one rewrite fires for all of them).
// So unlike render.js/static-meta.js (routed to the right per-site builder
// by vercel.json's own host-gated rewrites), THIS file has to work out which
// site it's serving itself, from req.headers.host -- see _sites.js.
//
// Pulls lean {slug/id, updated} rows from the backend rather than full
// record payloads, since a sitemap only needs enough to print <url> entries.
//
// Single flat file stays correct up to ~50,000 URLs (the sitemap protocol's
// hard cap); Gut Community's businesses + communities are already in the
// 30-40k range, so that one site will need splitting into a <sitemapindex>
// of several sitemap-N.xml files once it crosses that -- not needed yet, but
// the next maintainer should watch its logged counts. Every other site here
// is nowhere close.

const { siteForHost } = require('./_sites');

const API_BASE = process.env.SEO_API_URL || process.env.VITE_API_URL;

async function fetchJson(path) {
  if (!API_BASE) return null;
  try {
    const res = await fetch(`${API_BASE}${path}`);
    return res.ok ? await res.json() : null;
  } catch (e) {
    return null; // a slow/down backend shouldn't take the whole sitemap offline
  }
}

function escapeXml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
}

function urlEntry(loc, { lastmod, changefreq, priority } = {}) {
  return [
    '  <url>',
    `    <loc>${escapeXml(loc)}</loc>`,
    lastmod ? `    <lastmod>${lastmod.slice(0, 10)}</lastmod>` : '',
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : '',
    priority ? `    <priority>${priority}</priority>` : '',
    '  </url>',
  ].filter(Boolean).join('\n');
}

async function businessEntries(origin) {
  const [b, c] = await Promise.all([
    fetchJson('/business/sitemap-data'),
    fetchJson('/business/communities/sitemap-data'),
  ]);
  const businesses = (b && b.businesses) || [];
  const communities = (c && c.communities) || [];
  return [
    ...[
      { path: '/', changefreq: 'daily', priority: '1.0' },
      { path: '/community', changefreq: 'daily', priority: '0.9' },
      { path: '/communities', changefreq: 'daily', priority: '0.9' },
      { path: '/activities', changefreq: 'weekly', priority: '0.7' },
      { path: '/deals', changefreq: 'daily', priority: '0.8' },
      { path: '/minyanim', changefreq: 'weekly', priority: '0.6' },
    ].map((p) => urlEntry(`${origin}${p.path}`, p)),
    ...businesses.filter((x) => x.slug).map((x) => urlEntry(`${origin}/business/${x.slug}`, { lastmod: x.updated, changefreq: 'weekly', priority: '0.6' })),
    ...communities.filter((x) => x.slug).map((x) => urlEntry(`${origin}/communities/${x.slug}`, { lastmod: x.updated, changefreq: 'weekly', priority: '0.6' })),
  ];
}

async function estatesEntries(origin) {
  const [l, g, a] = await Promise.all([
    fetchJson('/estates/sitemap-data'),
    fetchJson('/estates/group-buys/sitemap-data'),
    fetchJson('/estates/areas'),
  ]);
  const listings = (l && l.listings) || [];
  const groupBuys = (g && g.group_buys) || [];
  const areas = (a && a.areas) || [];
  return [
    ...[
      { path: '/', changefreq: 'daily', priority: '1.0' },
      { path: '/group-buy', changefreq: 'daily', priority: '0.7' },
      { path: '/learn', changefreq: 'monthly', priority: '0.5' },
      { path: '/calculators', changefreq: 'monthly', priority: '0.6' },
    ].map((p) => urlEntry(`${origin}${p.path}`, p)),
    ...listings.filter((x) => x.slug).map((x) => urlEntry(`${origin}/listings/${x.slug}`, { lastmod: x.updated, changefreq: 'weekly', priority: '0.7' })),
    ...groupBuys.filter((x) => x.slug).map((x) => urlEntry(`${origin}/group-buy/${x.slug}`, { lastmod: x.updated, changefreq: 'weekly', priority: '0.6' })),
    ...areas.filter((x) => x.area_slug).map((x) => urlEntry(`${origin}/areas/${x.area_slug}`, { changefreq: 'daily', priority: '0.6' })),
  ];
}

async function moneyEntries(origin) {
  // Quotes are looked up by ticker on the fly, not canonical indexable
  // URLs -- the only per-record pages here are Tachlis posts (moved here
  // from the main site).
  const [tachlis, a] = await Promise.all([
    fetchJson('/tachlis/posts/sitemap-data'),
    fetchJson('/tachlis/areas'),
  ]);
  const tachlisPosts = (tachlis && tachlis.posts) || [];
  const areas = (a && a.areas) || [];
  return [
    ...[
      { path: '/', changefreq: 'weekly', priority: '1.0' },
      { path: '/investing', changefreq: 'weekly', priority: '0.6' },
      { path: '/budgeting', changefreq: 'monthly', priority: '0.6' },
      { path: '/learn', changefreq: 'monthly', priority: '0.6' },
      { path: '/tachlis', changefreq: 'daily', priority: '0.7' },
    ].map((p) => urlEntry(`${origin}${p.path}`, p)),
    ...tachlisPosts.filter((x) => x.id != null).map((x) => urlEntry(`${origin}/tachlis/post/${x.id}`, { lastmod: x.updated, changefreq: 'weekly', priority: '0.5' })),
    ...areas.filter((x) => x.area_slug).map((x) => urlEntry(`${origin}/tachlis/areas/${x.area_slug}`, { changefreq: 'daily', priority: '0.6' })),
  ];
}

async function torahEntries(origin) {
  const [p, s] = await Promise.all([
    fetchJson('/torah/posts/sitemap-data'),
    fetchJson('/torah/sheets/sitemap-data'),
  ]);
  const posts = (p && p.posts) || [];
  const sheets = (s && s.sheets) || [];
  return [
    ...[
      { path: '/', changefreq: 'daily', priority: '1.0' },
      { path: '/zmanim', changefreq: 'monthly', priority: '0.6' },
      { path: '/sources', changefreq: 'weekly', priority: '0.8' },
      { path: '/prayers', changefreq: 'monthly', priority: '0.5' },
      { path: '/sheets/public', changefreq: 'daily', priority: '0.7' },
    ].map((x) => urlEntry(`${origin}${x.path}`, x)),
    ...posts.filter((x) => x.slug).map((x) => urlEntry(`${origin}/posts/${x.slug}`, { lastmod: x.updated, changefreq: 'monthly', priority: '0.6' })),
    ...sheets.filter((x) => x.id != null).map((x) => urlEntry(`${origin}/sheets/${x.id}`, { lastmod: x.updated, changefreq: 'monthly', priority: '0.5' })),
  ];
}

async function mainEntries(origin) {
  const [shtick, hock] = await Promise.all([
    fetchJson('/shtick/sitemap-data'),
    fetchJson('/hock/posts/sitemap-data'),
  ]);
  const shtickPosts = (shtick && shtick.posts) || [];
  const hockPosts = (hock && hock.posts) || [];
  return [
    ...[
      { path: '/', changefreq: 'daily', priority: '1.0' },
      { path: '/today', changefreq: 'hourly', priority: '0.8' },
      { path: '/hock', changefreq: 'daily', priority: '0.8' },
      { path: '/about', changefreq: 'yearly', priority: '0.3' },
    ].map((p) => urlEntry(`${origin}${p.path}`, p)),
    ...shtickPosts.filter((x) => x.id != null).map((x) => urlEntry(`${origin}/post/${x.id}`, { lastmod: x.updated, changefreq: 'monthly', priority: '0.5' })),
    ...hockPosts.filter((x) => x.id != null).map((x) => urlEntry(`${origin}/hock/post/${x.id}`, { lastmod: x.updated, changefreq: 'monthly', priority: '0.5' })),
  ];
}

const ENTRY_BUILDERS = {
  business: businessEntries,
  estates: estatesEntries,
  money: moneyEntries,
  torah: torahEntries,
  main: mainEntries,
  // Gut News is locked to super_admin only -- nothing public to index, so it
  // intentionally has no entry here and falls through to an empty sitemap.
};

module.exports = async function handler(req, res) {
  const origin = `https://${req.headers.host}`;
  const site = siteForHost(req.headers.host);
  const build = ENTRY_BUILDERS[site];
  const entries = build ? await build(origin) : [];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=43200, stale-while-revalidate=86400');
  res.status(200).send(xml);
};
