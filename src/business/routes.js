import React, { lazy } from 'react';
import RequireAuth from '../RequireAuth';
import { isLoggedIn } from '../auth';
import Contact from '../Contact';
import NotFound from '../NotFound';

const BusinessDirectory = lazy(() => import('./BusinessDirectory'));
const BusinessProfile   = lazy(() => import('./BusinessProfile'));
const BusinessForm      = lazy(() => import('./BusinessForm'));
const DealsFeed         = lazy(() => import('./DealsFeed'));
const CreateDealPost    = lazy(() => import('./CreateDealPost'));
const MyBusinesses      = lazy(() => import('./MyBusinesses'));

/** The business site's routes as data, so App.js's <Routes> can render any
 * registered site's routes the same generic way (see src/sites/registry.js)
 * instead of special-casing each site inline. Adding a new sub-site later
 * means adding a sibling routes.js like this one, not editing App.js.
 * `Contact`/`NotFound` are reused as-is from the main site -- both are
 * already theme-agnostic (plain gs-* classes, no consumer-site-specific
 * copy), and DataDisclaimer.js links to /contact, so it has to exist here. */
export default [
  { path: '/', element: <BusinessDirectory /> },
  { path: '/deals', element: <DealsFeed /> },
  { path: '/business/new', element: <RequireAuth check={isLoggedIn}><BusinessForm /></RequireAuth> },
  { path: '/business/:idOrSlug/edit', element: <RequireAuth check={isLoggedIn}><BusinessForm /></RequireAuth> },
  { path: '/business/:idOrSlug/post-deal', element: <RequireAuth check={isLoggedIn}><CreateDealPost /></RequireAuth> },
  { path: '/business/:idOrSlug', element: <BusinessProfile /> },
  { path: '/my-businesses', element: <RequireAuth check={isLoggedIn}><MyBusinesses /></RequireAuth> },
  { path: '/contact', element: <Contact /> },
  { path: '*', element: <NotFound /> },
];
