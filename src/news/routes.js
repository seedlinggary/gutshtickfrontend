import React, { lazy } from 'react';
import RequireAuth from '../RequireAuth';
import { isLoggedIn, isAdmin } from '../auth';
import Contact from '../Contact';
import NotFound from '../NotFound';

const Feed           = lazy(() => import('./Feed'));
const ArticleProfile  = lazy(() => import('./ArticleProfile'));
const PostForm        = lazy(() => import('./PostForm'));
const MyPosts         = lazy(() => import('./MyPosts'));
const Learn           = lazy(() => import('./Learn'));
const Pending         = lazy(() => import('./Pending'));
const NewsGuestSubmit = lazy(() => import('./NewsGuestSubmit'));
const NewsGuestManage = lazy(() => import('./NewsGuestManage'));

/** GutKol's own routes -- same {path, element} shape as the other
 * sites', registered the same way via src/sites/registry.js. The
 * pre-launch SuperAdminGate soft lock that used to wrap every route here
 * is gone now that the site is open to the public (see SuperAdminGate.js,
 * left in place but unused, for how to re-apply it if ever needed). */
export default [
  { path: '/guest-submit', element: <NewsGuestSubmit /> },
  { path: '/guest/news/:token', element: <NewsGuestManage /> },
  { path: '/', element: <Feed /> },
  { path: '/articles/new', element: <RequireAuth check={isLoggedIn}><PostForm /></RequireAuth> },
  { path: '/articles/:idOrSlug/edit', element: <RequireAuth check={isLoggedIn}><PostForm /></RequireAuth> },
  { path: '/articles/:slug', element: <ArticleProfile /> },
  { path: '/my-articles', element: <RequireAuth check={isLoggedIn}><MyPosts /></RequireAuth> },
  { path: '/learn', element: <Learn /> },
  { path: '/pending', element: <RequireAuth check={isAdmin}><Pending /></RequireAuth> },
  { path: '/contact', element: <Contact /> },
  { path: '*', element: <NotFound /> },
];
