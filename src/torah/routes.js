import React, { lazy } from 'react';
import RequireAuth from '../RequireAuth';
import { isLoggedIn } from '../auth';
import Contact from '../Contact';
import NotFound from '../NotFound';

const Feed        = lazy(() => import('./Feed'));
const PostProfile  = lazy(() => import('./PostProfile'));
const PostForm     = lazy(() => import('./PostForm'));
const MyPosts      = lazy(() => import('./MyPosts'));
const Zmanim       = lazy(() => import('./Zmanim'));
const Sources      = lazy(() => import('./Sources'));
const Prayers      = lazy(() => import('./Prayers'));
const MySheets     = lazy(() => import('./sheets/MySheets'));
const PublicSheets = lazy(() => import('./sheets/PublicSheets'));
const SheetView    = lazy(() => import('./sheets/SheetView'));

/** Gut Torah's own routes -- same {path, element} shape as the other
 * sites', registered the same way via src/sites/registry.js. */
export default [
  { path: '/', element: <Feed /> },
  { path: '/posts/new', element: <RequireAuth check={isLoggedIn}><PostForm /></RequireAuth> },
  { path: '/posts/:idOrSlug/edit', element: <RequireAuth check={isLoggedIn}><PostForm /></RequireAuth> },
  { path: '/posts/:slug', element: <PostProfile /> },
  { path: '/my-posts', element: <RequireAuth check={isLoggedIn}><MyPosts /></RequireAuth> },
  { path: '/zmanim', element: <Zmanim /> },
  { path: '/sources', element: <Sources /> },
  { path: '/prayers', element: <Prayers /> },
  { path: '/sheets', element: <RequireAuth check={isLoggedIn}><MySheets /></RequireAuth> },
  { path: '/sheets/public', element: <PublicSheets /> },
  { path: '/sheets/:sheetId', element: <SheetView /> },
  { path: '/contact', element: <Contact /> },
  { path: '*', element: <NotFound /> },
];
