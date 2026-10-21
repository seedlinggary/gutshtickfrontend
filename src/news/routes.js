import React, { lazy } from 'react';
import RequireAuth from '../RequireAuth';
import { isLoggedIn, isSuperAdmin } from '../auth';
import Contact from '../Contact';
import NotFound from '../NotFound';
import SuperAdminGate from './SuperAdminGate';

const Feed           = lazy(() => import('./Feed'));
const ArticleProfile  = lazy(() => import('./ArticleProfile'));
const PostForm        = lazy(() => import('./PostForm'));
const MyPosts         = lazy(() => import('./MyPosts'));
const Learn           = lazy(() => import('./Learn'));
const Pending         = lazy(() => import('./Pending'));

// Every route wrapped in SuperAdminGate -- the whole site is soft-locked to
// super_admin only for now (see SuperAdminGate.js for why/how to revert).
const gate = (el) => <SuperAdminGate>{el}</SuperAdminGate>;

/** Gut News's own routes -- same {path, element} shape as the other
 * sites', registered the same way via src/sites/registry.js. */
export default [
  { path: '/', element: gate(<Feed />) },
  { path: '/articles/new', element: gate(<RequireAuth check={isLoggedIn}><PostForm /></RequireAuth>) },
  { path: '/articles/:idOrSlug/edit', element: gate(<RequireAuth check={isLoggedIn}><PostForm /></RequireAuth>) },
  { path: '/articles/:slug', element: gate(<ArticleProfile />) },
  { path: '/my-articles', element: gate(<RequireAuth check={isLoggedIn}><MyPosts /></RequireAuth>) },
  { path: '/learn', element: gate(<Learn />) },
  { path: '/pending', element: gate(<RequireAuth check={isSuperAdmin}><Pending /></RequireAuth>) },
  { path: '/contact', element: gate(<Contact />) },
  { path: '*', element: gate(<NotFound />) },
];
