import React, { lazy } from 'react';
import Contact from '../Contact';
import NotFound from '../NotFound';

const Calculators = lazy(() => import('./Calculators'));
const Investing   = lazy(() => import('./Investing'));
const Budgeting   = lazy(() => import('./Budgeting'));
const Learn       = lazy(() => import('./Learn'));

/** Gut Money's own routes -- same {path, element} shape as business/routes.js
 * and estates/routes.js, registered the same way via src/sites/registry.js. */
export default [
  { path: '/', element: <Calculators /> },
  { path: '/investing', element: <Investing /> },
  { path: '/budgeting', element: <Budgeting /> },
  { path: '/learn', element: <Learn /> },
  { path: '/contact', element: <Contact /> },
  { path: '*', element: <NotFound /> },
];
