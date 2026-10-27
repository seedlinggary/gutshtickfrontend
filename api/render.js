// Backend-injected per-page <title>/meta/Open Graph/JSON-LD for every site's
// detail pages (a business/community/listing/group-buy/post/sheet). Vite
// builds this into a single static index.html with one site-wide title (see
// good-shtick/index.html) -- fine for a plain SPA, but it means every detail
// page would otherwise show identical text in search results and link
// previews (Facebook/WhatsApp/iMessage unfurls don't run the SPA's JS, so a
// document.title set after mount never reaches them).
//
// vercel.json rewrites each site's own detail-page pattern here (passing
// `kind` + the record's slug/id) instead of straight to index.html. This
// fetches the real record from the API, stitches real meta into the built
// index.html (self-fetched so we never have to deal with locating the
// hashed asset-referencing file on disk at runtime), and falls back to the
// plain SPA shell untouched for anything that isn't a real record -- in
// particular .../new and .../:id/edit, which match the same rewrite pattern
// but are app routes, not real records.
//
// Response is edge-cached per record (see Cache-Control below) so this extra
// hop (index.html + API fetch) only costs latency for the first visitor to a
// given page per cache window, not every visitor.

const API_BASE = process.env.SEO_API_URL || process.env.VITE_API_URL;
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
  const SITE_NAME = 'Gut Community';
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
  const image = b.logo_url || `${origin}/og/business.png`;

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

  return { siteName: SITE_NAME, title, description, url, image, jsonLd };
}

async function buildCommunityMeta(slug, origin) {
  const SITE_NAME = 'Gut Community';
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
  const image = c.logo_url || `${origin}/og/business.png`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: c.name,
    url,
    ...(c.lat != null && c.lng != null ? { geo: { '@type': 'GeoCoordinates', latitude: c.lat, longitude: c.lng } } : {}),
  };

  return { siteName: SITE_NAME, title, description, url, image, jsonLd };
}

const LISTING_TYPE_LABEL = { sale: 'For Sale', long_term_lease: 'For Rent', short_term_lease: 'Short-Term Rental' };

async function buildEstatesListingMeta(idOrSlug, origin) {
  const SITE_NAME = 'Gut Estates';
  const apiRes = await fetch(`${API_BASE}/estates/listings/${encodeURIComponent(idOrSlug)}/seo`);
  if (!apiRes.ok) return null;
  const l = await apiRes.json();
  const cityState = [l.neighborhood || l.city, l.state].filter(Boolean).join(', ');
  const typeLabel = LISTING_TYPE_LABEL[l.listing_type] || 'Listing';
  const priceStr = l.price != null ? `${l.currency === 'ILS' ? '₪' : '$'}${Math.round(l.price).toLocaleString()}` : null;
  const title = `${l.title}${cityState ? ` — ${cityState}` : ''} | ${typeLabel} | ${SITE_NAME}`;
  const description = truncate(
    `${l.title}${cityState ? ` in ${cityState}` : ''}${priceStr ? `, ${priceStr}` : ''} -- a real listing posted directly on ${SITE_NAME}.`,
    DESCRIPTION_MAX,
  );
  const url = `${origin}/listings/${l.slug}`;
  const image = l.cover_photo_url || `${origin}/og/estates.png`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': l.listing_type === 'sale' ? 'Product' : 'Apartment',
    name: l.title,
    url,
    image,
    ...(l.address || l.city ? { address: {
      '@type': 'PostalAddress',
      ...(l.address ? { streetAddress: l.address } : {}),
      ...(l.city ? { addressLocality: l.city } : {}),
      ...(l.state ? { addressRegion: l.state } : {}),
      ...(l.country ? { addressCountry: l.country } : {}),
    } } : {}),
    ...(l.lat != null && l.lng != null ? { geo: { '@type': 'GeoCoordinates', latitude: l.lat, longitude: l.lng } } : {}),
    ...(l.price != null ? { offers: { '@type': 'Offer', price: l.price, priceCurrency: l.currency || 'USD' } } : {}),
  };

  return { siteName: SITE_NAME, title, description, url, image, jsonLd };
}

async function buildEstatesGroupBuyMeta(slug, origin) {
  const SITE_NAME = 'Gut Estates';
  const apiRes = await fetch(`${API_BASE}/estates/group-buys/${encodeURIComponent(slug)}`);
  if (!apiRes.ok) return null;
  const g = await apiRes.json();
  const cityState = [g.neighborhood || g.city, g.state].filter(Boolean).join(', ');
  const title = `${g.title}${cityState ? ` — ${cityState}` : ''} | Group Buy | ${SITE_NAME}`;
  const description = truncate(
    g.description || `A group buy${cityState ? ` in ${cityState}` : ''}${g.developer_name ? ` by ${g.developer_name}` : ''} -- band together with other buyers for a bulk discount, on ${SITE_NAME}.`,
    DESCRIPTION_MAX,
  );
  const url = `${origin}/group-buy/${g.slug}`;
  const image = (g.photos && g.photos[0] && g.photos[0].url) || `${origin}/og/estates.png`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: g.title,
    url,
    image,
    ...(g.city ? { address: { '@type': 'PostalAddress', addressLocality: g.city, ...(g.state ? { addressRegion: g.state } : {}) } } : {}),
    ...(g.lat != null && g.lng != null ? { geo: { '@type': 'GeoCoordinates', latitude: g.lat, longitude: g.lng } } : {}),
  };

  return { siteName: SITE_NAME, title, description, url, image, jsonLd };
}

async function buildEstatesAreaMeta(areaSlug, origin) {
  const SITE_NAME = 'Gut Estates';
  const apiRes = await fetch(`${API_BASE}/estates/areas/${encodeURIComponent(areaSlug)}`);
  if (!apiRes.ok) return null;
  const a = await apiRes.json();
  const title = `Homes in ${a.area} | ${SITE_NAME}`;
  const priceStr = a.typical_price != null ? `, typical price $${Math.round(a.typical_price).toLocaleString()}` : '';
  const description = truncate(
    `${a.count} active listing${a.count === 1 ? '' : 's'} in ${a.area}${priceStr} -- real listings posted directly by owners and agents on ${SITE_NAME}.`,
    DESCRIPTION_MAX,
  );
  const url = `${origin}/areas/${a.area_slug}`;
  const image = `${origin}/og/estates.png`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    url,
    about: a.area,
  };

  return { siteName: SITE_NAME, title, description, url, image, jsonLd };
}

async function buildMoneyAreaMeta(areaSlug, origin) {
  const SITE_NAME = 'Gut Money';
  const apiRes = await fetch(`${API_BASE}/tachlis/areas/${encodeURIComponent(areaSlug)}`);
  if (!apiRes.ok) return null;
  const a = await apiRes.json();
  const title = `Jobs in ${a.area} | Job Board | ${SITE_NAME}`;
  const description = truncate(
    `${a.count} job post${a.count === 1 ? '' : 's'} in ${a.area} on the ${SITE_NAME} Job Board -- a straightforward classifieds board.`,
    DESCRIPTION_MAX,
  );
  const url = `${origin}/tachlis/areas/${encodeURIComponent(areaSlug)}`;
  const image = `${origin}/og/money.png`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    url,
    about: a.area,
  };

  return { siteName: SITE_NAME, title, description, url, image, jsonLd };
}

const TORAH_CATEGORY_LABEL = { parsha: 'Parsha', halacha: 'Halacha', mussar: 'Mussar', stories: 'Stories', holidays: 'Holidays', other: 'Torah' };

async function buildTorahPostMeta(slug, origin) {
  const SITE_NAME = 'Gut Torah';
  const apiRes = await fetch(`${API_BASE}/torah/posts/${encodeURIComponent(slug)}/seo`);
  if (!apiRes.ok) return null;
  const p = await apiRes.json();
  const label = TORAH_CATEGORY_LABEL[p.category] || 'Torah';
  const title = `${p.title} | ${label} | ${SITE_NAME}`;
  const description = truncate(p.excerpt || `A ${label.toLowerCase()} dvar Torah shared on ${SITE_NAME}.`, DESCRIPTION_MAX);
  const url = `${origin}/posts/${p.slug}`;
  const image = p.cover_photo_url || `${origin}/og/torah.png`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: p.title,
    url,
    image,
    ...(p.pub_date ? { datePublished: p.pub_date } : {}),
    articleSection: label,
  };

  return { siteName: SITE_NAME, title, description, url, image, jsonLd };
}

async function buildTorahSheetMeta(sheetId, origin) {
  const SITE_NAME = 'Gut Torah';
  const apiRes = await fetch(`${API_BASE}/torah/sheets/${encodeURIComponent(sheetId)}`);
  if (!apiRes.ok) return null;
  const s = await apiRes.json();
  if (!s.is_public) return null; // private sheets get no special meta -- plain SPA shell, same 404-after-hydration UX as before
  const title = `${s.title} — Source Sheet | ${SITE_NAME}`;
  const description = truncate(
    `A source sheet${s.author_name ? ` by ${s.author_name}` : ''} with ${s.items.length} source${s.items.length === 1 ? '' : 's'}, shared on ${SITE_NAME}.`,
    DESCRIPTION_MAX,
  );
  const url = `${origin}/sheets/${s.id}`;
  const image = `${origin}/og/torah.png`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: s.title,
    url,
    ...(s.author_name ? { author: { '@type': 'Person', name: s.author_name } } : {}),
    ...(s.updated_at ? { dateModified: s.updated_at } : {}),
  };

  return { siteName: SITE_NAME, title, description, url, image, jsonLd };
}

async function buildShtickPostMeta(id, origin) {
  const SITE_NAME = 'Gut Shtick';
  const apiRes = await fetch(`${API_BASE}/shtick/post/${encodeURIComponent(id)}`);
  if (!apiRes.ok) return null;
  const p = await apiRes.json();
  const category = p.generalc && p.generalc.name;
  const title = `${p.caption}${category ? ` | ${category}` : ''} | ${SITE_NAME}`;
  const bodySnippet = p.content && p.content.stuff;
  const description = truncate(bodySnippet || p.caption || `Shared on ${SITE_NAME}.`, DESCRIPTION_MAX);
  const url = `${origin}/post/${p.id}`;
  const image = (p.picture && p.picture.url) || `${origin}/og/main.png`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SocialMediaPosting',
    headline: p.caption,
    url,
    image,
    ...(p.pub_date ? { datePublished: p.pub_date } : {}),
  };

  return { siteName: SITE_NAME, title, description, url, image, jsonLd };
}

async function buildHockPostMeta(id, origin) {
  const SITE_NAME = 'Gut Shtick';
  const apiRes = await fetch(`${API_BASE}/hock/posts/${encodeURIComponent(id)}`);
  if (!apiRes.ok) return null;
  const p = await apiRes.json();
  if (!p.approved_to_publish) return null;
  const title = `${p.title} | Hock | ${SITE_NAME}`;
  const description = truncate(p.body || `A Hock forum post on ${SITE_NAME}.`, DESCRIPTION_MAX);
  const url = `${origin}/hock/post/${p.id}`;
  const image = p.image_url || `${origin}/og/main.png`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'DiscussionForumPosting',
    headline: p.title,
    url,
    image,
    ...(p.pub_date ? { datePublished: p.pub_date } : {}),
  };

  return { siteName: SITE_NAME, title, description, url, image, jsonLd };
}

const TACHLIS_TYPE_LABEL = { job: 'Job', resume: 'Resume', service: 'Service' };

async function buildTachlisPostMeta(id, origin) {
  const SITE_NAME = 'Gut Money';
  const apiRes = await fetch(`${API_BASE}/tachlis/posts/${encodeURIComponent(id)}`);
  if (!apiRes.ok) return null;
  const p = await apiRes.json();
  if (p.approved_to_publish !== true) return null;
  const label = TACHLIS_TYPE_LABEL[p.post_type] || 'Listing';
  const title = `${p.title}${p.location ? ` — ${p.location}` : ''} | Job Board ${label} | ${SITE_NAME}`;
  const description = truncate(p.body || `A Job Board ${label.toLowerCase()} listing on ${SITE_NAME}.`, DESCRIPTION_MAX);
  const url = `${origin}/tachlis/post/${p.id}`;
  const image = `${origin}/og/money.png`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': p.post_type === 'job' ? 'JobPosting' : 'Article',
    ...(p.post_type === 'job'
      ? { title: p.title, description: p.body, ...(p.location ? { jobLocation: { '@type': 'Place', address: p.location } } : {}) }
      : { headline: p.title }),
    url,
    ...(p.pub_date ? { datePosted: p.pub_date, datePublished: p.pub_date } : {}),
  };

  return { siteName: SITE_NAME, title, description, url, image, jsonLd };
}

const BUILDERS = {
  business: buildBusinessMeta,
  community: buildCommunityMeta,
  estates_listing: buildEstatesListingMeta,
  estates_groupbuy: buildEstatesGroupBuyMeta,
  estates_area: buildEstatesAreaMeta,
  money_area: buildMoneyAreaMeta,
  torah_post: buildTorahPostMeta,
  torah_sheet: buildTorahSheetMeta,
  shtick_post: buildShtickPostMeta,
  hock_post: buildHockPostMeta,
  tachlis_post: buildTachlisPostMeta,
};

function injectMeta(html, meta) {
  const headExtra = `
    <title>${escapeHtml(meta.title)}</title>
    <meta name="description" content="${escapeHtml(meta.description)}" />
    <link rel="canonical" href="${meta.url}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${escapeHtml(meta.siteName)}" />
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
  const shellRes = await fetch(`${origin}/shell.html`);
  const shellHtml = await shellRes.text();

  const builder = BUILDERS[kind];
  let meta = null;
  if (slug && !RESERVED_SLUGS.has(slug) && API_BASE && builder) {
    try {
      meta = await builder(slug, origin);
    } catch (e) {
      meta = null; // backend hiccup -- still serve the plain SPA shell below
    }
  }

  const html = meta ? injectMeta(shellHtml, meta) : shellHtml;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', meta ? 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400' : 'public, max-age=0, must-revalidate');
  res.status(200).send(html);
};
