// Final catch-all for every request vercel.json's specific rewrites didn't
// already handle -- replaces a plain static "/(.*)" -> "/index.html" rule,
// which always returned 200 with the identical generic shell regardless of
// host or whether the path was real. That's what let every one of the 5
// domains' unmatched paths (and raw *.vercel.app preview URLs) look like
// indexable duplicate "Gut Shtick" pages to a crawler, and let genuinely
// nonexistent URLs return 200 instead of a real 404.
//
// vercel.json passes the ORIGINAL request path explicitly via ?path=/$1
// (captured from "source": "/(.*)") rather than relying on this function's
// own req.url, which render.js/static-meta.js never needed to do since they
// only ever care about explicit :slug/:route params, not the raw path.

const { siteForHost, isKnownHost, canonicalHost } = require('./_sites');
const { siteForPath } = require('./_routes');

function redirectTo(res, host, path, extraQuery) {
  const qs = extraQuery ? `?${extraQuery}` : '';
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  res.redirect(301, `https://${host}${path}${qs}`);
}

module.exports = async function handler(req, res) {
  const host = req.headers.host;
  const { path: rawPath, ...rest } = req.query || {};
  const path = rawPath || '/';
  const extraQuery = new URLSearchParams(rest).toString();

  // A host that isn't any of the real configured site domains -- a Vercel
  // preview URL, the raw *.vercel.app production alias, a typo'd domain --
  // represents an extra indexable duplicate of whatever it happens to
  // render. There's no way to know which of the 5 real sites a visitor
  // there "meant", so send everything to the main canonical domain rather
  // than let it serve ANY content under a non-canonical host.
  if (!isKnownHost(host)) {
    const mainHost = canonicalHost('main');
    if (mainHost) {
      redirectTo(res, mainHost, path, extraQuery);
      return;
    }
    // No main hostname configured at all (e.g. local dev with no .env) --
    // nothing sensible to redirect to, fall through and serve normally.
  }

  const currentSite = siteForHost(host);
  const owner = siteForPath(path, currentSite);

  // Owned by a DIFFERENT real site than the one this host serves -- e.g.
  // gutshtick.com/listings/some-estates-slug. Redirect to where it
  // actually lives instead of letting the generic shell (with no real
  // content behind it on this host) pose as a duplicate of that page.
  if (owner && owner !== 'universal' && owner !== 'ambiguous' && owner !== currentSite) {
    const targetHost = canonicalHost(owner);
    if (targetHost) {
      redirectTo(res, targetHost, path, extraQuery);
      return;
    }
    // That site has no hostname configured yet -- fall through rather than
    // redirect to nothing.
  }

  const origin = `https://${host}`;
  const shellRes = await fetch(`${origin}/shell.html`);
  const shellHtml = await shellRes.text();

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  // `owner === null` (not owned anywhere) or 'ambiguous' (owned by more
  // than one site, e.g. /learn, with no single correct redirect target) --
  // a genuinely nonexistent URL for this host. The body is still the plain
  // SPA shell (the client's own NotFound component renders after
  // hydration, same as before) -- only the status code changes, which is
  // what actually matters to a crawler deciding whether to index/deindex
  // this URL.
  const status = (owner === null || owner === 'ambiguous') ? 404 : 200;
  res.status(status).send(shellHtml);
};
