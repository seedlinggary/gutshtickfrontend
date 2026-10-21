import React, { lazy } from 'react';
import RequireAuth from '../RequireAuth';
import { isLoggedIn } from '../auth';
import Contact from '../Contact';
import NotFound from '../NotFound';

const EstatesDirectory = lazy(() => import('./EstatesDirectory'));
const ListingProfile   = lazy(() => import('./ListingProfile'));
const ListingForm      = lazy(() => import('./ListingForm'));
const MyListings       = lazy(() => import('./MyListings'));
const GroupBuy         = lazy(() => import('./GroupBuy'));
const GroupBuyProfile  = lazy(() => import('./GroupBuyProfile'));
const GroupBuyForm     = lazy(() => import('./GroupBuyForm'));
const MyGroupBuys      = lazy(() => import('./MyGroupBuys'));
const Learn            = lazy(() => import('./Learn'));
const Calculators      = lazy(() => import('./Calculators'));

/** Gut Estates's own routes -- same {path, element} shape as business/routes.js,
 * registered the same way via src/sites/registry.js. `Contact`/`NotFound` are
 * reused as-is from the main site (already theme-agnostic). */
export default [
  { path: '/', element: <EstatesDirectory /> },
  { path: '/listings/new', element: <RequireAuth check={isLoggedIn}><ListingForm /></RequireAuth> },
  { path: '/listings/:idOrSlug/edit', element: <RequireAuth check={isLoggedIn}><ListingForm /></RequireAuth> },
  { path: '/listings/:idOrSlug', element: <ListingProfile /> },
  { path: '/my-listings', element: <RequireAuth check={isLoggedIn}><MyListings /></RequireAuth> },
  { path: '/group-buy', element: <GroupBuy /> },
  { path: '/group-buy/new', element: <RequireAuth check={isLoggedIn}><GroupBuyForm /></RequireAuth> },
  { path: '/group-buy/:slug/edit', element: <RequireAuth check={isLoggedIn}><GroupBuyForm /></RequireAuth> },
  { path: '/group-buy/:slug', element: <GroupBuyProfile /> },
  { path: '/my-group-buys', element: <RequireAuth check={isLoggedIn}><MyGroupBuys /></RequireAuth> },
  { path: '/learn', element: <Learn /> },
  { path: '/calculators', element: <Calculators /> },
  { path: '/contact', element: <Contact /> },
  { path: '*', element: <NotFound /> },
];
