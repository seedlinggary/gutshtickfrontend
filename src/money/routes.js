import React, { lazy } from 'react';
import Contact from '../Contact';
import NotFound from '../NotFound';
import RequireAuth from '../RequireAuth';
import { isLoggedIn } from '../auth';
import StillAvailableConfirm from '../StillAvailableConfirm';

const Calculators     = lazy(() => import('./Calculators'));
const Investing       = lazy(() => import('./Investing'));
const Budgeting       = lazy(() => import('./Budgeting'));
const Learn           = lazy(() => import('./Learn'));
const Tachlis         = lazy(() => import('./Tachlis'));
const TachlisPostPage = lazy(() => import('./TachlisPostPage'));
const AreaPage        = lazy(() => import('./AreaPage'));
const MyPosts         = lazy(() => import('./MyPosts'));
const Talent          = lazy(() => import('./Talent'));

/** Gut Money's own routes -- same {path, element} shape as business/routes.js
 * and estates/routes.js, registered the same way via src/sites/registry.js.
 * Tachlis (moved here from the main site) keeps its original path literally
 * -- every existing bookmark/deep-link to /tachlis/post/:id keeps working
 * once it resolves against Money's own hostname instead. */
export default [
  { path: '/', element: <Calculators /> },
  { path: '/investing', element: <Investing /> },
  { path: '/budgeting', element: <Budgeting /> },
  { path: '/learn', element: <Learn /> },
  { path: '/tachlis', element: <Tachlis /> },
  { path: '/tachlis/post/:id', element: <TachlisPostPage /> },
  { path: '/tachlis/areas/:areaSlug', element: <AreaPage /> },
  { path: '/my-tachlis-posts', element: <RequireAuth check={isLoggedIn}><MyPosts /></RequireAuth> },
  { path: '/tachlis/talent', element: <Talent /> },
  { path: '/still-available/confirm/:token', element: <StillAvailableConfirm apiPrefix="/tachlis" /> },
  { path: '/contact', element: <Contact /> },
  { path: '*', element: <NotFound /> },
];
