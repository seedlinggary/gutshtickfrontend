import BusinessNavbar from '../business/BusinessNavbar';
import businessRoutes from '../business/routes';
import '../business/business-theme.css';

/**
 * Every "sub-site" this codebase serves, beyond the default main consumer
 * site (which stays hard-coded in App.js since its route table is large and
 * predates this pattern). Adding sub-site #3+ later is meant to be:
 *   1. A new folder `src/<id>/` with a `routes.js` (array of {path, element},
 *      same shape as business/routes.js), a `Navbar` component, and a
 *      `<id>-theme.css` scoped under `.<id>-theme` (see business-theme.css
 *      for the pattern — redefine the shared --bg/--accent/etc. custom
 *      properties, add any bespoke `.biz-*`-style classes of its own).
 *   2. One entry appended to SITES below, importing those three things.
 * `App.js` and `siteMode.js` need no further changes for a new entry.
 *
 * `id` doubles as: the `?site=<id>` dev-mode query param/localStorage value
 * (see siteMode.js), the env var name `VITE_<ID>_HOSTNAMES` checked for
 * production host matching, and the CSS scoping class `<id>-theme`.
 */
export const SITES = [
  {
    id: 'business',
    themeClass: 'business-theme',
    Navbar: BusinessNavbar,
    routes: businessRoutes,
  },
];
