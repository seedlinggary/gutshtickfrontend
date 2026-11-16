// Lets a campaign's tracked URL (see backend/campaigns/schemas/campaign.py's
// get_tracked_url) show the SAME domain as its destination_url -- e.g.
// https://www.gutcommunity.com/campaigns/r/<code> -- instead of the
// backend's own domain, even though the click logging + redirect decision
// both still live entirely in the backend (backend/campaigns/routes/
// campaign.py's redirect_link). vercel.json rewrites /campaigns/r/:code on
// every site domain to this function, which just forwards the request to
// the real backend route and relays whatever it decides (a 302 to
// destination_url?gs_ad=<code>, or a 404 if the link is missing/inactive).
//
// Referer/User-Agent are forwarded so the click log backend writes still
// reflects the real visitor, not this server-to-server hop. The
// x-vercel-ip-country we forward is the one Vercel's edge attached to the
// ORIGINAL request (to this domain) -- but Vercel's edge may overwrite it
// again on the outbound hop to the backend's own domain based on this
// function's egress IP, so country on a proxied click can be less precise
// than clicks/visitors/signups, which aren't affected by any of this.

const API_BASE = process.env.SEO_API_URL || process.env.VITE_API_URL;

module.exports = async function handler(req, res) {
  const { code } = req.query;
  if (!code || !API_BASE) {
    res.status(404).send('Not found');
    return;
  }

  let upstream;
  try {
    upstream = await fetch(`${API_BASE}/campaigns/r/${encodeURIComponent(code)}`, {
      redirect: 'manual',
      headers: {
        Referer: req.headers.referer || '',
        'User-Agent': req.headers['user-agent'] || '',
        'x-vercel-ip-country': req.headers['x-vercel-ip-country'] || '',
      },
    });
  } catch (e) {
    res.status(502).send('This link could not be reached. Please try again shortly.');
    return;
  }

  const location = upstream.headers.get('location');
  if (upstream.status >= 300 && upstream.status < 400 && location) {
    res.setHeader('Cache-Control', 'no-store');
    res.redirect(302, location);
    return;
  }

  const body = await upstream.text();
  res.status(upstream.status || 502).send(body);
};
