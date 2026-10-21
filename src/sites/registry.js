import BusinessNavbar from '../business/BusinessNavbar';
import businessRoutes from '../business/routes';
import '../business/business-theme.css';
import EstatesNavbar from '../estates/EstatesNavbar';
import estatesRoutes from '../estates/routes';
import '../estates/estates-theme.css';
import MoneyNavbar from '../money/MoneyNavbar';
import moneyRoutes from '../money/routes';
import '../money/money-theme.css';
import TorahNavbar from '../torah/TorahNavbar';
import torahRoutes from '../torah/routes';
import '../torah/torah-theme.css';
import NewsNavbar from '../news/NewsNavbar';
import newsRoutes from '../news/routes';
import '../news/news-theme.css';

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
 *
 * `label` is the display name CrossSiteLink.js's "switch sites" menu shows --
 * the only other consumer of this registry besides App.js/siteMode.js.
 */
export const SITES = [
  {
    id: 'business',
    label: 'Gut Community',
    themeClass: 'business-theme',
    Navbar: BusinessNavbar,
    routes: businessRoutes,
  },
  {
    id: 'estates',
    label: 'Gut Estates',
    themeClass: 'estates-theme',
    Navbar: EstatesNavbar,
    routes: estatesRoutes,
  },
  {
    id: 'money',
    label: 'Gut Money',
    themeClass: 'money-theme',
    Navbar: MoneyNavbar,
    routes: moneyRoutes,
  },
  {
    id: 'torah',
    label: 'Gut Torah',
    themeClass: 'torah-theme',
    Navbar: TorahNavbar,
    routes: torahRoutes,
  },
  {
    id: 'news',
    label: 'Gut News',
    themeClass: 'news-theme',
    Navbar: NewsNavbar,
    routes: newsRoutes,
  },
];
