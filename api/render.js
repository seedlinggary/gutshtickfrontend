// Backend-injected per-page <title>/meta/Open Graph/JSON-LD for business and
// community detail pages. Vite builds this into a single static index.html
// with one site-wide title (see good-shtick/index.html) -- fine for a plain
// SPA, but it means every /business/:slug and /communities/:slug page would
// otherwise show identical text in search results and link previews
// (Facebook/WhatsApp/iMessage unfurls don't run the SPA's JS, so a
// document.title set after mount never reaches them).
//
// vercel.json rewrites /business/:slug and /communities/:slug here instead of
// straight to index.html. This fetches the real record from the API, stitches
// real meta into the built index.html (self-fetched so we never have to deal
// with locating the hashed asset-referencing file on disk at runtime), and
// falls back to the plain SPA shell untouched for anything that isn't a real
// record -- in particular /business/new and /communities/new, which match the
// same single-segment rewrite pattern but are app routes, not slugs.
//
// Response is edge-cached per slug (see Cache-Control below) so this extra
// hop (index.html + API fetch) only costs latency for the first visitor to a
// given page per cache window, not every visitor.

const API_BASE = process.env.SEO_API_URL || process.env.VITE_API_URL;
const SITE_NAME = 'Gut Community';
const RESERVED_SLUGS = new Set(['new']);
const DESCRIPTION_MAX = 160;

const CATEGORY_LABEL = {
  restaurant: 'Restaurant', grocery: 'Grocery', retail: 'Retail', professional_services: 'Professional Services',
  health_beauty: 'Health & Beauty', home_services: 'Home Services', education: 'School', entertainment: 'Entertainment',
  automotive: 'Automotive', nonprofit: 'Nonprofit', gemach: 'Gemach', shul: 'Shul', kollel: 'Kollel',
  mikvah: 'Mikvah', attraction: 'Attraction', other: 'Business',
};

const CATEGORY_SCHEMA_TYPE = {
  restaurant: 'Restaurant', grocery: 'GroceryStore', retail: 'Store', professional_services: 'ProfessionalService',
  health_beauty: 'HealthAndBeautyBusiness', home_services: 'HomeAndConstructionBusiness', education: 'School',
  entertainment: 'EntertainmentBusiness', automotive: 'AutomotiveBusiness', nonprofit: 'NGO', gemach: 'LocalBusiness',
  shul: 'PlaceOfWorship', kollel: 'PlaceOfWorship', mikvah: 'LocalBusiness', attraction: 'TouristAttraction',
  other: 'LocalBusiness',
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function truncate(s, n) {
  if (!s) return '';
  const t = s.trim();
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
}

async function buildBusinessMeta(slug, origin) {
  const apiRes = await fetch(`${API_BASE}/business/businesses/${encodeURIComponent(slug)}`);
  if (!apiRes.ok) return null;
  const b = await apiRes.json();
  const loc = (b.locations || []).find((l) => l.is_primary) || (b.locations || [])[0] || null;
  const cityState = [loc?.city, loc?.state].filter(Boolean).join(', ');
  const label = CATEGORY_LABEL[b.category] || 'Business';
  const title = `${b.name} — ${label}${cityState ? ` in ${cityState}` : ''} | ${SITE_NAME}`;
  const description = truncate(
    b.about || `${b.name} is a ${label.toLowerCase()}${cityState ? ` in ${cityState}` : ''}, listed on ${SITE_NAME} -- a real, community-sourced Jewish business directory.`,
    DESCRIPTION_MAX,
  );
  const url = `${origin}/business/${b.slug}`;
  const image = b.logo_url || `${origin}/logo192.png`;

  const address = loc ? {
    '@type': 'PostalAddress',
    ...(loc.address ? { streetAddress: loc.address } : {}),
    ...(loc.city ? { addressLocality: loc.city } : {}),
    ...(loc.state ? { addressRegion: loc.state } : {}),
    ...(loc.zip_code ? { postalCode: loc.zip_code } : {}),
    ...(loc.country ? { addressCountry: loc.country } : {}),
  } : undefined;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': CATEGORY_SCHEMA_TYPE[b.category] || 'LocalBusiness',
    name: b.name,
    url,
    ...(b.logo_url ? { image: b.logo_url } : {}),
    ...(address ? { address } : {}),
    ...(loc && loc.lat != null && loc.lng != null ? { geo: { '@type': 'GeoCoordinates', latitude: loc.lat, longitude: loc.lng } } : {}),
    ...(loc && loc.phone ? { telephone: loc.phone } : {}),
    ...(b.website ? { sameAs: [b.website] } : {}),
    ...(b.rating_count > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: b.rating_avg, reviewCount: b.rating_count } } : {}),
  };

  return { title, description, url, image, jsonLd };
}

async function buildCommunityMeta(slug, origin) {
  const apiRes = await fetch(`${API_BASE}/business/communities/${encodeURIComponent(slug)}`);
  if (!apiRes.ok) return null;
  const c = await apiRes.json();
  const cityState = [c.city, c.state].filter(Boolean).join(', ');
  const title = `${c.name} Jewish Community Guide${cityState && cityState !== c.name ? ` — ${cityState}` : ''} | ${SITE_NAME}`;
  const description = truncate(
    c.description || `Shuls, mikvahs, schools and kosher businesses in the ${c.name} Jewish community, all in one place on ${SITE_NAME}.`,
    DESCRIPTION_MAX,
  );
  const url = `${origin}/communities/${c.slug}`;
  const image = c.logo_url || `${origin}/logo192.png`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: c.name,
    url,
    ...(c.lat != null && c.lng != null ? { geo: { '@type': 'GeoCoordinates', latitude: c.lat, longitude: c.lng } } : {}),
  };

  return { title, description, url, image, jsonLd };
}

function injectMeta(html, meta) {
  const headExtra = `
    <title>${escapeHtml(meta.title)}</title>
    <meta name="description" content="${escapeHtml(meta.description)}" />
    <link rel="canonical" href="${meta.url}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />
    <meta property="og:title" content="${escapeHtml(meta.title)}" />
    <meta property="og:description" content="${escapeHtml(meta.description)}" />
    <meta property="og:url" content="${meta.url}" />
    <meta property="og:image" content="${escapeHtml(meta.image)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(meta.title)}" />
    <meta name="twitter:description" content="${escapeHtml(meta.description)}" />
    <meta name="twitter:image" content="${escapeHtml(meta.image)}" />
    <script type="application/ld+json">${JSON.stringify(meta.jsonLd)}</script>
`;
  return html
    .replace(/<title>.*?<\/title>\s*/s, '')
    .replace(/<meta\s+name="description"[^>]*>\s*/i, '')
    .replace('</head>', `${headExtra}</head>`);
}

module.exports = async function handler(req, res) {
  const { kind, slug } = req.query;
  const origin = `https://${req.headers.host}`;
  const shellRes = await fetch(`${origin}/index.html`);
  const shellHtml = await shellRes.text();

  let meta = null;
  if (slug && !RESERVED_SLUGS.has(slug) && API_BASE) {
    try {
      meta = kind === 'community' ? await buildCommunityMeta(slug, origin) : await buildBusinessMeta(slug, origin);
    } catch (e) {
      meta = null; // backend hiccup -- still serve the plain SPA shell below
    }
  }

  const html = meta ? injectMeta(shellHtml, meta) : shellHtml;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', meta ? 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400' : 'public, max-age=0, must-revalidate');
  res.status(200).send(html);
};
