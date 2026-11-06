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
    return { title, description: page.seo_description || '', image: page.seo_og_image || null };
  } catch (_) {
    return null;
  }
}

function injectBusinessSiteMeta(html, meta, canonicalUrl) {
  if (!meta || !meta.title) return html;
  const headExtra = `
    <title>${escapeHtml(meta.title)}</title>
    ${meta.description ? `<meta name="description" content="${escapeHtml(meta.description)}" />` : ''}
    <link rel="canonical" href="${canonicalUrl}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escapeHtml(meta.title)}" />
    ${meta.description ? `<meta property="og:description" content="${escapeHtml(meta.description)}" />` : ''}
    <meta property="og:url" content="${canonicalUrl}" />
    ${meta.image ? `<meta property="og:image" content="${escapeHtml(meta.image)}" />` : ''}
`;
  return html
    .replace(/<title>.*?<\/title>\s*/s, '')
    .replace(/<meta\s+name="description"[^>]*>\s*/i, '')
    .replace('</head>', `${headExtra}</head>`);
}

module.exports = { fetchBusinessSiteMeta, injectBusinessSiteMeta };
