import React, { lazy } from 'react';
import RequireAuth from '../RequireAuth';
import { isLoggedIn, isSuperAdmin } from '../auth';
import Contact from '../Contact';
import NotFound from '../NotFound';

const Feed           = lazy(() => import('./Feed'));
const ArticleProfile  = lazy(() => import('./ArticleProfile'));
const PostForm        = lazy(() => import('./PostForm'));
const MyPosts         = lazy(() => import('./MyPosts'));
const Learn           = lazy(() => import('./Learn'));
const Pending         = lazy(() => import('./Pending'));

/** Gut News's own routes -- same {path, element} shape as the other
 * sites', registered the same way via src/sites/registry.js. */
export default [
  { path: '/', element: <Feed /> },
  { path: '/articles/new', element: <RequireAuth check={isLoggedIn}><PostForm /></RequireAuth> },
  { path: '/articles/:idOrSlug/edit', element: <RequireAuth check={isLoggedIn}><PostForm /></RequireAuth> },
  { path: '/articles/:slug', element: <ArticleProfile /> },
  { path: '/my-articles', element: <RequireAuth check={isLoggedIn}><MyPosts /></RequireAuth> },
  { path: '/learn', element: <Learn /> },
  { path: '/pending', element: <RequireAuth check={isSuperAdmin}><Pending /></RequireAuth> },
  { path: '/contact', element: <Contact /> },
  { path: '*', element: <NotFound /> },
];
