import React, { lazy } from 'react';
import RequireAuth from '../RequireAuth';
import { isLoggedIn, isAdmin, isSuperAdmin } from '../auth';
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
const FindCommunity      = lazy(() => import('./FindCommunity'));
const CommunityProfile   = lazy(() => import('./CommunityProfile'));
const CommunityForm      = lazy(() => import('./CommunityForm'));
const MyCommunities      = lazy(() => import('./MyCommunities'));
const ActivitiesPage     = lazy(() => import('./ActivitiesPage'));
const MinyanSearch       = lazy(() => import('./MinyanSearch'));
const FollowUnsubscribe  = lazy(() => import('./FollowUnsubscribe'));
const BusinessGuestManage = lazy(() => import('./BusinessGuestManage'));
const CommunityGuestManage = lazy(() => import('./CommunityGuestManage'));
const MinyanGuestManage   = lazy(() => import('./MinyanGuestManage'));
const FreeBuilder         = lazy(() => import('./FreeBuilder'));

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
  // Open to guests too -- BusinessForm reveals its own guest-contact section
  // instead of redirecting to /signin when nobody's logged in.
  { path: '/business/new', element: <BusinessForm /> },
  // TEMPORARY, prod-testing-only restriction: the whole site builder
  // feature (this included) is super-admin-only right now -- see
  // BusinessOwnerTools.js's RESTRICTED_TABS comment. Was previously fully
  // public ("anyone can design a website, log in only to save it" --
  // see FreeBuilder.js's own login/signup gate at Save & Publish time);
  // revert this back to a plain, un-gated route once that's ready again.
  { path: '/build', element: <RequireAuth check={isSuperAdmin}><FreeBuilder /></RequireAuth> },
  { path: '/guest/business/:token', element: <BusinessGuestManage /> },
  { path: '/business/:idOrSlug/edit', element: <RequireAuth check={isLoggedIn}><BusinessForm /></RequireAuth> },
  { path: '/business/:idOrSlug/post-deal', element: <RequireAuth check={isLoggedIn}><CreateDealPost /></RequireAuth> },
  { path: '/business/:idOrSlug', element: <BusinessProfile /> },
  { path: '/business/:idOrSlug/tools', element: <RequireAuth check={isLoggedIn}><BusinessOwnerTools /></RequireAuth> },
  { path: '/my-businesses', element: <RequireAuth check={isLoggedIn}><MyBusinesses /></RequireAuth> },
  { path: '/my-deals', element: <RequireAuth check={isLoggedIn}><DealWallet /></RequireAuth> },
  { path: '/vendor-board', element: <RequireAuth check={isLoggedIn}><ReferralBoard /></RequireAuth> },
  { path: '/admin/integrations', element: <RequireAuth check={isAdmin}><AdminIntegrations /></RequireAuth> },
  { path: '/communities', element: <FindCommunity /> },
  // Open to guests too, same reasoning as /business/new above.
  { path: '/communities/new', element: <CommunityForm /> },
  { path: '/guest/community/:token', element: <CommunityGuestManage /> },
  { path: '/communities/mine', element: <RequireAuth check={isLoggedIn}><MyCommunities /></RequireAuth> },
  { path: '/communities/:slug/edit', element: <RequireAuth check={isLoggedIn}><CommunityForm /></RequireAuth> },
  { path: '/communities/:slug', element: <CommunityProfile /> },
  { path: '/activities', element: <ActivitiesPage /> },
  { path: '/minyanim', element: <MinyanSearch /> },
  { path: '/follow/unsubscribe/:token', element: <FollowUnsubscribe /> },
  { path: '/contact', element: <Contact /> },
  { path: '*', element: <NotFound /> },
];
