// Per-page title/description/OG for every site's own *listing/static* pages
// (home, category pages, etc.) -- these have no per-record data to fetch
// (see render.js for detail pages, which do), just fixed copy that's still
// unique per page instead of every one of them sharing index.html's single
// site-wide "Gut Shtick -- curated content worth sharing" title.
//
// Every entry's `route` key is site-prefixed (estates_home, money_home, ...)
// so one flat PAGES map can serve every site with no key collisions, even
// where two sites happen to have the same path (e.g. both Estates and Money
// have a "/learn") -- vercel.json's rewrites are what pick the right key per
// site/host, this file just has to not collide once they do. A `siteName`
// per entry (rather than one shared constant) is what makes that safe.
//
// Each site's own "/" entry is wired through vercel.json with a host check
// (see e.g. the gutcommunity.com/www entries there) -- every site here is
// one shared deployment (same repo, same build, picked by hostname at
// runtime in the client), and "/" is the one path EVERY site uses for its
// own homepage, so each "/" rewrite has to be scoped to that site's own
// hostnames or it would fire for the wrong site. Every other route here is
// unique to its own site's route table, so those are safe unconditionally.

const { siteForHost } = require('./_sites');

// Matches the id each PAGES entry's siteName maps to below, and the
// filenames generated into good-shtick/public/og/ -- see
// SITE_LABELS further down, which is the same id set used for
// UNIVERSAL_PAGES' dynamic image lookup.
const SITE_IMAGE = {
  'Gut Community': '/og/business.png',
  'Gut Estates': '/og/estates.png',
  'Gut Money': '/og/money.png',
  'Gut Torah': '/og/torah.png',
  'Gut Shtick': '/og/main.png',
};

const PAGES = {
  // ── Gut Community ──────────────────────────────────────────────────────
  home: {
    siteName: 'Gut Community',
    title: 'Gut Community — The Real Jewish Business Directory',
    description: 'Find real, community-sourced Jewish-owned businesses near you: restaurants, grocery, retail and services, searchable by city or "near me."',
    path: '/',
  },
  community: {
    siteName: 'Gut Community',
    title: 'Shuls & Chessed Organizations Near You | Gut Community',
    description: 'Find a shul, mikvah, school or chessed organization in your area -- real, community-sourced listings, searchable by city or "near me."',
    path: '/community',
  },
  communities: {
    siteName: 'Gut Community',
    title: 'Find a Jewish Community | Gut Community',
    description: 'Look up any Jewish community by city: shuls, mikvahs, schools, kosher businesses and local activities, all pulled together in one place.',
    path: '/communities',
  },
  activities: {
    siteName: 'Gut Community',
    title: 'Jewish Family Activities & Attractions Near You | Gut Community',
    description: 'Find kid-friendly attractions and things to do, sourced from the same real local directory data as the rest of Gut Community.',
    path: '/activities',
  },
  deals: {
    siteName: 'Gut Community',
    title: 'Local Deals from Jewish-Owned Businesses | Gut Community',
    description: 'Real deals and promotions posted directly by Jewish-owned businesses near you -- updated daily.',
    path: '/deals',
  },
  minyanim: {
    siteName: 'Gut Community',
    title: 'Find a Minyan Time Near You | Gut Community',
    description: 'Search shacharis, mincha and maariv times at shuls near you, including seasonal and sun-relative minyanim.',
    path: '/minyanim',
  },

  // ── Gut Estates ─────────────────────────────────────────────────────────
  estates_home: {
    siteName: 'Gut Estates',
    title: 'Gut Estates — Real Listings Posted Directly by Owners & Agents',
    description: 'Buy, rent, or find a short-term rental -- real listings posted directly by owners and agents, searchable by city, price or "near me."',
    path: '/',
  },
  estates_groupbuy: {
    siteName: 'Gut Estates',
    title: 'Group Buys — Pre-Construction Deals | Gut Estates',
    description: "Band together with other buyers on the same pre-construction project for a real bulk discount -- common in Israel's \"al haneyar\" market. Browse open projects or start your own.",
    path: '/group-buy',
  },
  estates_learn: {
    siteName: 'Gut Estates',
    title: 'Home Buying & Renting, Explained Plainly | Gut Estates',
    description: 'Mortgages, closing costs, rent vs. buy, and what agents and owners actually mean -- the basics, with sources.',
    path: '/learn',
  },
  estates_calculators: {
    siteName: 'Gut Estates',
    title: 'Mortgage, Affordability & Rent-vs-Buy Calculators | Gut Estates',
    description: 'Free calculators for a mortgage payment, how much home you can afford, closing costs, purchase tax, and whether renting or buying wins for your numbers.',
    path: '/calculators',
  },

  // ── Gut Money ───────────────────────────────────────────────────────────
  money_home: {
    siteName: 'Gut Money',
    title: 'Gut Money — Budgeting, Investing & Retirement Calculators',
    description: 'Free calculators for compound interest, retirement, debt payoff, a savings goal, your FIRE number and Coast FIRE -- plus real stock quotes, a budgeting tool, and a jobs board.',
    path: '/',
  },
  money_tachlis: {
    siteName: 'Gut Money',
    title: 'Job Board — Jobs & Resumes | Gut Money',
    description: 'Post or browse job openings and resumes -- a straightforward classifieds board.',
    path: '/tachlis',
  },
  money_investing: {
    siteName: 'Gut Money',
    title: 'Stock Quotes & Charts | Gut Money',
    description: 'Look up real quotes and charts for any ticker, and track the ones you care about in a watchlist.',
    path: '/investing',
  },
  money_budgeting: {
    siteName: 'Gut Money',
    title: 'Budgeting Tool | Gut Money',
    description: 'Build a category-by-category monthly budget, see the breakdown as a chart, and set a real savings goal against it.',
    path: '/budgeting',
  },
  money_learn: {
    siteName: 'Gut Money',
    title: 'Money Basics, Explained Plainly | Gut Money',
    description: 'Budgeting, investing, debt, credit, FIRE and the 4% rule -- enough to make sense of the decisions ahead of you, with sources.',
    path: '/learn',
  },

  // ── Gut Torah ───────────────────────────────────────────────────────────
  torah_home: {
    siteName: 'Gut Torah',
    title: 'Gut Torah — Divrei Torah, Zmanim, Sources & Source Sheets',
    description: 'Share and read divrei Torah, look up zmanim for any city, browse the full Tanach/Talmud/Halacha library, and build shareable source sheets.',
    path: '/',
  },
  torah_zmanim: {
    siteName: 'Gut Torah',
    title: 'Zmanim — Halachic Times for Any City | Gut Torah',
    description: 'Look up shacharis, mincha, maariv, candle-lighting and every other halachic time for any city, searchable by name.',
    path: '/zmanim',
  },
  torah_sources: {
    siteName: 'Gut Torah',
    title: 'Tanach, Talmud & Halacha Library | Gut Torah',
    description: 'The full Tanach, Talmud Bavli and Yerushalmi, and Halacha (Rambam, Tur, Shulchan Aruch) with their classic commentaries, down to a single pasuk or sif katan.',
    path: '/sources',
  },
  torah_prayers: {
    siteName: 'Gut Torah',
    title: 'Siddur — Weekday Prayers | Gut Torah',
    description: 'The weekday siddur, laid out for actual davening.',
    path: '/prayers',
  },
  torah_sheets_public: {
    siteName: 'Gut Torah',
    title: 'Browse Public Source Sheets | Gut Torah',
    description: "Source sheets shared by other users -- browse, and copy any of them into your own sheets to edit freely.",
    path: '/sheets/public',
  },

  // ── Gut Shtick (main) ───────────────────────────────────────────────────
  main_home: {
    siteName: 'Gut Shtick',
    title: 'Gut Shtick — Curated Content Worth Sharing',
    description: 'Discover the latest jobs, real estate, businesses, deals and Torah posts from across the Gut Shtick network, plus a daily feed of posts worth sharing, a Hock discussion forum, and dozens of free browser games.',
    path: '/',
  },
  main_hock: {
    siteName: 'Gut Shtick',
    title: 'Hock — Discussion Forum | Gut Shtick',
    description: 'A discussion forum for whatever\'s on your mind -- post, comment, and reply in threads.',
    path: '/hock',
  },
  main_today: {
    siteName: 'Gut Shtick',
    title: 'Today on GUT — New Homes & Jobs | Gut Shtick',
    description: "Today's new real estate listings and job postings from across the GUT network, refreshed daily.",
    path: '/today',
  },
};

const SITE_LABELS = {
  business: 'Gut Community', estates: 'Gut Estates', money: 'Gut Money',
  torah: 'Gut Torah', news: 'Gut News', main: 'Gut Shtick',
};

// Pages reachable on EVERY site by the app's own design (see
// api/_routes.js's UNIVERSAL_PREFIXES) -- these need their og:site_name/
// title to match whichever domain they're actually being viewed on, not a
// single fixed brand. Keyed by route value, built dynamically per-request
// below instead of as fixed PAGES entries (which would need a full
// site x page cross-product -- 5 sites x N pages -- for no real benefit,
// since the copy itself doesn't otherwise vary by site).
const UNIVERSAL_PAGES = {
  about: {
    title: (siteName) => `About | ${siteName}`,
    description: (siteName) => `What ${siteName} is and who it's for.`,
    path: '/about',
  },
  contact: {
    title: (siteName) => `Contact | ${siteName}`,
    description: () => 'Get in touch.',
    path: '/contact',
  },
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function injectMeta(html, meta, url, origin) {
  const image = `${origin}${SITE_IMAGE[meta.siteName] || '/og/main.png'}`;
  const headExtra = `
    <title>${escapeHtml(meta.title)}</title>
    <meta name="description" content="${escapeHtml(meta.description)}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${escapeHtml(meta.siteName)}" />
    <meta property="og:title" content="${escapeHtml(meta.title)}" />
    <meta property="og:description" content="${escapeHtml(meta.description)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(meta.title)}" />
    <meta name="twitter:description" content="${escapeHtml(meta.description)}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
`;
  return html
    .replace(/<title>.*?<\/title>\s*/s, '')
    .replace(/<meta\s+name="description"[^>]*>\s*/i, '')
    .replace('</head>', `${headExtra}</head>`);
}

module.exports = async function handler(req, res) {
  const { route } = req.query;
  const origin = `https://${req.headers.host}`;

  let meta = PAGES[route];
  if (!meta && UNIVERSAL_PAGES[route]) {
    const siteName = SITE_LABELS[siteForHost(req.headers.host)] || SITE_LABELS.main;
    const page = UNIVERSAL_PAGES[route];
    meta = { siteName, title: page.title(siteName), description: page.description(siteName), path: page.path };
  }

  const shellRes = await fetch(`${origin}/shell.html`);
  const shellHtml = await shellRes.text();

  const html = meta ? injectMeta(shellHtml, meta, `${origin}${meta.path}`, origin) : shellHtml;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=86400, stale-while-revalidate=86400');
  res.status(200).send(html);
};
