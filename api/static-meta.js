// Per-page title/description/OG for the business site's own *listing* pages
// (home, Shuls & Orgs, Community, Activities, Deals, Minyan search) -- these
// have no per-record data to fetch (see render.js for the business/community
// detail pages, which do), just fixed copy that's still unique per page
// instead of every one of them sharing index.html's single site-wide
// "Gut Shtick -- curated content worth sharing" title.
//
// Only "/" is wired through vercel.json with a host check (see the
// gutcommunity.com/www entries there) -- it's the one path this shared
// deployment's OTHER site (the main Gut Shtick consumer site, same repo,
// same build, picked by hostname at runtime in the client) also uses for its
// own homepage, so this must never fire for that domain. The other routes
// here (/community, /communities, /activities, /deals, /minyanim) don't
// exist in the consumer site's own route table at all, so they're safe
// unconditionally.

const SITE_NAME = 'Gut Community';

const PAGES = {
  home: {
    title: 'Gut Community — The Real Jewish Business Directory',
    description: 'Find real, community-sourced Jewish-owned businesses near you: restaurants, grocery, retail and services, searchable by city or "near me."',
    path: '/',
  },
  community: {
    title: 'Shuls & Chessed Organizations Near You | Gut Community',
    description: 'Find a shul, mikvah, school or chessed organization in your area -- real, community-sourced listings, searchable by city or "near me."',
    path: '/community',
  },
  communities: {
    title: 'Find a Jewish Community | Gut Community',
    description: 'Look up any Jewish community by city: shuls, mikvahs, schools, kosher businesses and local activities, all pulled together in one place.',
    path: '/communities',
  },
  activities: {
    title: 'Jewish Family Activities & Attractions Near You | Gut Community',
    description: 'Find kid-friendly attractions and things to do, sourced from the same real local directory data as the rest of Gut Community.',
    path: '/activities',
  },
  deals: {
    title: 'Local Deals from Jewish-Owned Businesses | Gut Community',
    description: 'Real deals and promotions posted directly by Jewish-owned businesses near you -- updated daily.',
    path: '/deals',
  },
  minyanim: {
    title: 'Find a Minyan Time Near You | Gut Community',
    description: 'Search shacharis, mincha and maariv times at shuls near you, including seasonal and sun-relative minyanim.',
    path: '/minyanim',
  },
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function injectMeta(html, meta, url) {
  const headExtra = `
    <title>${escapeHtml(meta.title)}</title>
    <meta name="description" content="${escapeHtml(meta.description)}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />
    <meta property="og:title" content="${escapeHtml(meta.title)}" />
    <meta property="og:description" content="${escapeHtml(meta.description)}" />
    <meta property="og:url" content="${url}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${escapeHtml(meta.title)}" />
    <meta name="twitter:description" content="${escapeHtml(meta.description)}" />
`;
  return html
    .replace(/<title>.*?<\/title>\s*/s, '')
    .replace(/<meta\s+name="description"[^>]*>\s*/i, '')
    .replace('</head>', `${headExtra}</head>`);
}

module.exports = async function handler(req, res) {
  const { route } = req.query;
  const origin = `https://${req.headers.host}`;
  const meta = PAGES[route];

  const shellRes = await fetch(`${origin}/index.html`);
  const shellHtml = await shellRes.text();

  const html = meta ? injectMeta(shellHtml, meta, `${origin}${meta.path}`) : shellHtml;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=86400, stale-while-revalidate=86400');
  res.status(200).send(html);
};
