// Dynamically generated sitemap.xml, served at the site's own domain via the
// /sitemap.xml rewrite in vercel.json (a sitemap has to live under the same
// host as the pages it lists -- it can't just point at the API's domain).
// Pulls lean {slug, updated} rows from the backend rather than the full
// business/community payloads, since a sitemap only needs enough to print
// <url> entries.
//
// Single flat file stays correct up to ~50,000 URLs (the sitemap protocol's
// hard cap); businesses + communities are already in the 30-40k range, so
// this will need splitting into a <sitemapindex> of several sitemap-N.xml
// files once that's crossed -- not needed yet, but the next maintainer
// should watch BUSINESS_COUNT/COMMUNITY_COUNT logs below.

const API_BASE = process.env.SEO_API_URL || process.env.VITE_API_URL;

const STATIC_PATHS = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/community', changefreq: 'daily', priority: '0.9' },
  { path: '/communities', changefreq: 'daily', priority: '0.9' },
  { path: '/activities', changefreq: 'weekly', priority: '0.7' },
  { path: '/deals', changefreq: 'daily', priority: '0.8' },
  { path: '/minyanim', changefreq: 'weekly', priority: '0.6' },
];

function escapeXml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
}

function urlEntry(loc, { lastmod, changefreq, priority }) {
  return [
    '  <url>',
    `    <loc>${escapeXml(loc)}</loc>`,
    lastmod ? `    <lastmod>${lastmod.slice(0, 10)}</lastmod>` : '',
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : '',
    priority ? `    <priority>${priority}</priority>` : '',
    '  </url>',
  ].filter(Boolean).join('\n');
}

module.exports = async function handler(req, res) {
  const origin = `https://${req.headers.host}`;

  let businesses = [];
  let communities = [];
  if (API_BASE) {
    try {
      const [bRes, cRes] = await Promise.all([
        fetch(`${API_BASE}/business/sitemap-data`),
        fetch(`${API_BASE}/business/communities/sitemap-data`),
      ]);
      if (bRes.ok) businesses = (await bRes.json()).businesses || [];
      if (cRes.ok) communities = (await cRes.json()).communities || [];
    } catch (e) {
      // Fall through and still serve the static pages below -- a slow/down
      // backend shouldn't take the whole sitemap offline.
    }
  }

  const entries = [
    ...STATIC_PATHS.map((p) => urlEntry(`${origin}${p.path}`, p)),
    ...businesses
      .filter((b) => b.slug)
      .map((b) => urlEntry(`${origin}/business/${b.slug}`, { lastmod: b.updated, changefreq: 'weekly', priority: '0.6' })),
    ...communities
      .filter((c) => c.slug)
      .map((c) => urlEntry(`${origin}/communities/${c.slug}`, { lastmod: c.updated, changefreq: 'weekly', priority: '0.6' })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=43200, stale-while-revalidate=86400');
  res.status(200).send(xml);
};
