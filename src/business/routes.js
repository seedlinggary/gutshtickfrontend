import React, { lazy } from 'react';
import RequireAuth from '../RequireAuth';
import { isLoggedIn, isAdmin } from '../auth';
import Contact from '../Contact';
import NotFound from '../NotFound';

const BusinessDirectory = lazy(() => import('./BusinessDirectory'));
const BusinessProfile   = lazy(() => import('./BusinessProfile'));
const BusinessForm      = lazy(() => import('./BusinessForm'));
const DealsFeed         = lazy(() => import('./DealsFeed'));
const CreateDealPost    = lazy(() => import('./CreateDealPost'));
const MyBusinesses      = lazy(() => import('./MyBusinesses'));
const BusinessOwnerTools = lazy(() => import('./BusinessOwnerTools'));
const DealWallet        = lazy(() => import('./DealWallet'));
const ReferralBoard     = lazy(() => import('./ReferralBoard'));
const AdminIntegrations = lazy(() => import('./AdminIntegrations'));

/** The business site's routes as data, so App.js's <Routes> can render any
 * registered site's routes the same generic way (see src/sites/registry.js)
 * instead of special-casing each site inline. Adding a new sub-site later
 * means adding a sibling routes.js like this one, not editing App.js.
 * `Contact`/`NotFound` are reused as-is from the main site -- both are
 * already theme-agnostic (plain gs-* classes, no consumer-site-specific
 * copy), and DataDisclaimer.js links to /contact, so it has to exist here. */
export default [
  // `key` forces a full remount when navigating between these two -- both
  // routes render the same BusinessDirectory component type at the same
  // position in the tree, so without a distinguishing key React treats a
  // navigation between them as a prop update to the SAME instance rather
  // than a fresh mount: all the `useState(savedFilters...)` initializers
  // only run once on mount, so the old mode's category/businesses/etc. just
  // sat there under the new mode's masthead, and the signature-comparison
  // effect that decides whether to re-fetch doesn't include `mode` in what
  // it compares, so it saw no *filter* change and never re-fetched either.
  // That's what let a leftover Business-mode list (or an invisible leftover
  // `category=shul` after coming the other way) silently keep showing.
  { path: '/', element: <BusinessDirectory key="business" /> },
  { path: '/community', element: <BusinessDirectory key="community" mode="community" /> },
  { path: '/deals', element: <DealsFeed /> },
  { path: '/business/new', element: <RequireAuth check={isLoggedIn}><BusinessForm /></RequireAuth> },
  { path: '/business/:idOrSlug/edit', element: <RequireAuth check={isLoggedIn}><BusinessForm /></RequireAuth> },
  { path: '/business/:idOrSlug/post-deal', element: <RequireAuth check={isLoggedIn}><CreateDealPost /></RequireAuth> },
  { path: '/business/:idOrSlug', element: <BusinessProfile /> },
  { path: '/business/:idOrSlug/tools', element: <RequireAuth check={isLoggedIn}><BusinessOwnerTools /></RequireAuth> },
  { path: '/my-businesses', element: <RequireAuth check={isLoggedIn}><MyBusinesses /></RequireAuth> },
  { path: '/my-deals', element: <RequireAuth check={isLoggedIn}><DealWallet /></RequireAuth> },
  { path: '/vendor-board', element: <RequireAuth check={isLoggedIn}><ReferralBoard /></RequireAuth> },
  { path: '/admin/integrations', element: <RequireAuth check={isAdmin}><AdminIntegrations /></RequireAuth> },
  { path: '/contact', element: <Contact /> },
  { path: '*', element: <NotFound /> },
];
