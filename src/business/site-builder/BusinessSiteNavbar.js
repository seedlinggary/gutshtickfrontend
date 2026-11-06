import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { getCurrentBusinessSiteSubdomain } from '../../siteMode';
import { cartItemCount, subscribeCart } from './cart';
import useSiteChrome from './useSiteChrome';
import { applySiteTheme, DEFAULT_THEME } from './theme';
import './theme.css';

/**
 * The actual theme-driven navbar every business-site page shares (mounted
 * once at the App.js level, same as every other registered site's own
 * Navbar -- see src/sites/registry.js). Fetches its own site-chrome data
 * by subdomain (useSiteChrome) since App.js never passes props to a
 * site's Navbar -- same reasoning the cart-count badge below already
 * handled this way before theming existed.
 */
export default function BusinessSiteNavbar() {
  const subdomain = getCurrentBusinessSiteSubdomain();
  const chrome = useSiteChrome(subdomain);
  const [count, setCount] = useState(() => (subdomain ? cartItemCount(subdomain) : 0));

  useEffect(() => {
    if (!subdomain) return undefined;
    return subscribeCart(() => setCount(cartItemCount(subdomain)));
  }, [subdomain]);

  const theme = { ...DEFAULT_THEME, ...(chrome?.theme || {}) };

  useEffect(() => {
    if (!chrome) return;
    applySiteTheme(chrome.theme);
    // .main-content is App.js's own shared page wrapper -- toggling this
    // class from here (rather than touching App.js itself) is what makes
    // the sidebar nav style actually reserve room for itself instead of
    // the fixed rail overlapping the page content underneath it.
    document.body.classList.toggle('sb-layout-with-sidebar', theme.navStyle === 'side');
  }, [chrome, theme.navStyle]);
  const navLinks = chrome?.nav_links || [];
  const navClass = `sb-navbar sb-navbar-${theme.navStyle}${theme.navStyle === 'side' ? ' sb-navbar-side' : ''}`;

  return (
    <nav className={navClass}>
      <Link to="/" className="sb-navbar-brand">{chrome?.name || 'Loading…'}</Link>
      {theme.navStyle !== 'minimal' && (
        <ul className="sb-navbar-links">
          {navLinks.map((link, i) => (
            <li key={i}>
              {link.path?.startsWith('http') ? (
                <a href={link.path} target="_blank" rel="noreferrer">{link.label}</a>
              ) : (
                <Link to={link.path || '/'}>{link.label}</Link>
              )}
            </li>
          ))}
        </ul>
      )}
      {count > 0 && (
        <Link to="/cart" className="sb-navbar-cart">
          <ShoppingCart size={16} /> {count}
        </Link>
      )}
    </nav>
  );
}
