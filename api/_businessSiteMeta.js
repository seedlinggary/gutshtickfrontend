// Per-page <title>/meta/OG for a business-owner storefront's own pages
// (Phase 6 of the site builder) -- same reasoning/approach as static-
// meta.js and render.js for the 5 built-in sites: a plain SPA's single
// built index.html has one site-wide title, which would make every
// business's every page share identical link-preview text otherwise
// (Facebook/WhatsApp/iMessage unfurls never run the SPA's JS). Kept as its
// own file rather than folded into static-meta.js/render.js since neither
// of those is reachable for a dynamically-resolved subdomain -- this is
// called directly from shell.js's business-site branch instead of via a
// vercel.json host-gated rewrite, which is how those two get their input.

const API_BASE = process.env.SEO_API_URL || process.env.VITE_API_URL;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** null for /cart, /order/:id/confirmation, and anything else that isn't
 * an owner-authored page -- those are fixed templates with no SEO fields
 * of their own, so the plain shell (default title) is correct for them. */
async function fetchBusinessSiteMeta(subdomain, path) {
  if (!API_BASE) return null;
  const segment = path.split('/').filter(Boolean)[0] || '';
  if (segment === 'cart' || segment === 'order') return null;

  const url = segment
    ? `${API_BASE}/business-site/public/${encodeURIComponent(subdomain)}/pages/${encodeURIComponent(segment)}`
    : `${API_BASE}/business-site/public/${encodeURIComponent(subdomain)}/home`;

  try {
    const apiRes = await fetch(url);
    if (!apiRes.ok) return null;
    const data = await apiRes.json();
    const page = data.page || {};
    const title = page.seo_title || (page.title ? `${page.title} | ${data.name}` : data.name);
    if (!title) return null;
    return {
      title, description: page.seo_description || '', image: page.seo_og_image || null,
      // Built server-side (backend/business/routes/business_site_public.py's
      // _structured_data) from the business's own real data -- never
      // owner-authored, so there's nothing here to escape/sanitize beyond
      // the standard </script>-breakout guard in injectBusinessSiteMeta.
      structuredData: data.structured_data || null,
    };
  } catch (_) {
    return null;
  }
}

function injectBusinessSiteMeta(html, meta, canonicalUrl) {
  if (!meta || !meta.title) return html;
  const structuredDataJson = meta.structuredData
    ? JSON.stringify({ ...meta.structuredData, url: meta.structuredData.url || canonicalUrl })
      // Guards against a value that happens to contain "</script>" (e.g. an
      // owner's "about" text) from breaking out of the script tag --
      // standard JSON-in-<script> escaping, not specific to any field here.
      .replace(/</g, '\\u003c')
    : null;
  const headExtra = `
    <title>${escapeHtml(meta.title)}</title>
    ${meta.description ? `<meta name="description" content="${escapeHtml(meta.description)}" />` : ''}
    <link rel="canonical" href="${canonicalUrl}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escapeHtml(meta.title)}" />
    ${meta.description ? `<meta property="og:description" content="${escapeHtml(meta.description)}" />` : ''}
    <meta property="og:url" content="${canonicalUrl}" />
    ${meta.image ? `<meta property="og:image" content="${escapeHtml(meta.image)}" />` : ''}
    ${structuredDataJson ? `<script type="application/ld+json">${structuredDataJson}</script>` : ''}
`;
  return html
    .replace(/<title>.*?<\/title>\s*/s, '')
    .replace(/<meta\s+name="description"[^>]*>\s*/i, '')
    .replace('</head>', `${headExtra}</head>`);
}

/** Serves the SPA shell for a confirmed business-site host (wildcard
 * subdomain or verified custom domain) with that page's own real meta
 * injected -- the one correct way to respond to ANY path on such a host,
 * used by both shell.js's catch-all and static-meta.js's /about and
 * /contact rewrites (those used to serve generic Gut Shtick meta for a
 * business-site host, via the same unconditional rewrite every real site
 * shares, since they had no way to recognize a dynamically-resolved
 * subdomain was even a business site at all). */
async function serveBusinessSiteShell(req, res, host, path, subdomain) {
  const origin = `https://${host}`;
  const shellRes = await fetch(`${origin}/shell.html`);
  let shellHtml = await shellRes.text();

  // Best-effort -- a slow/failed backend call never blocks the page
  // itself, it just means this one response renders the plain shell's
  // default title instead of this page's real one.
  const meta = await fetchBusinessSiteMeta(subdomain, path);
  shellHtml = injectBusinessSiteMeta(shellHtml, meta, `${origin}${path}`);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  res.status(200).send(shellHtml);
}

module.exports = { fetchBusinessSiteMeta, injectBusinessSiteMeta, serveBusinessSiteShell };
