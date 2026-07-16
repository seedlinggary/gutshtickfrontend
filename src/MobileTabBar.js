import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getEmail } from './auth';

const STOPS = [
  { path: '/', label: 'Board', icon: '📌' },
  { path: '/hock', label: 'Hock', icon: '🗣️' },
  { path: '/tachlis', label: 'Tachlis', icon: '📌' },
  { path: '/games', label: 'Break', icon: '☕' },
];

/**
 * Sticky bottom ticket-strip tab bar for mobile -- the same four
 * destinations as the top nav, just reachable with a thumb. Desktop hides
 * this entirely via CSS (.mobile-tabbar { display: none } above 768px).
 */
export default function MobileTabBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const loggedIn = !!getEmail();
  const lastStop = loggedIn
    ? { path: '/profile', label: 'You', icon: '🧾' }
    : { path: '/signin', label: 'You', icon: '🧾' };
  const stops = [...STOPS, lastStop];

  return (
    <nav className="mobile-tabbar" aria-label="Primary">
      {stops.map((s) => {
        const active = location.pathname === s.path || (s.path !== '/' && location.pathname.startsWith(s.path));
        return (
          <button
            key={s.path}
            className={`mobile-tabbar-stop${active ? ' active' : ''}`}
            onClick={() => navigate(s.path)}
            type="button"
          >
            <span className="mobile-tabbar-icon">{s.icon}</span>
            <span className="mobile-tabbar-label">{s.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
