// Vercel serves a literal static file at a request's exact path BEFORE it
// ever consults vercel.json's `rewrites` -- so with dist/index.html present,
// every site's own "/" always served that one generic file directly,
// silently skipping the host-conditioned rewrite to /api/static-meta that's
// supposed to inject that site's own title/description/og:image. Every
// OTHER route (no literal file at that path) went through rewrites
// correctly; only the homepage -- the one page most worth getting right --
// was shadowed like this, on all 5 sites.
//
// Fix: after `vite build`, rename dist/index.html to dist/shell.html so
// there's nothing left sitting at the literal path Vercel's static server
// would intercept for "/". vercel.json's rewrites (including the plain
// /sitemap.xml, /robots.txt etc. that never had this problem) now own "/"
// for real. api/static-meta.js, api/render.js and api/shell.js all fetch
// this file by name to get the built shell HTML to inject meta into --
// update those alongside this script if the filename ever changes again.
//
// Local dev (`vite`) never touches dist/ at all, so this has no effect on
// `npm run start` -- only the production build Vercel actually deploys.
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
const from = path.join(DIST, 'index.html');
const to = path.join(DIST, 'shell.html');

if (!fs.existsSync(from)) {
  console.error(`post-build-shell: ${from} not found -- did vite build run first?`);
  process.exit(1);
}
fs.renameSync(from, to);
console.log(`post-build-shell: dist/index.html -> dist/shell.html`);
