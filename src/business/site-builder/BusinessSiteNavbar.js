import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, ChevronDown } from 'lucide-react';
import { getCurrentBusinessSiteSubdomain } from '../../siteMode';
import { cartItemCount, subscribeCart } from './cart';
import useSiteChrome from './useSiteChrome';
import { applySiteTheme, DEFAULT_THEME } from './theme';
import './theme.css';

function NavLink({ link }) {
  return link.path?.startsWith('http') ? (
    <a href={link.path} target="_blank" rel="noreferrer">{link.label}</a>
  ) : (
    <Link to={link.path || '/'}>{link.label}</Link>
  );
}

/** One top-level nav item -- plain link, or (when it has children) a
 * dropdown trigger. Hover opens it for free via CSS (.sb-navbar-dropdown
 * rule); `openIndex` is only the TOUCH fallback, since hover doesn't
 * exist on a touchscreen -- tapping the chevron toggles it instead of
 * following the parent link (a parent with children is assumed to be a
 * group label, not its own destination, same convention most sites with
 * dropdown nav already use). */
function NavItem({ link, isOpen, onToggle }) {
  const hasChildren = link.children?.length > 0;
  return (
    <li>
      {hasChildren ? (
        <button type="button" className="sb-navbar-dropdown-toggle" onClick={onToggle}>
          {link.label} <ChevronDown size={12} />
        </button>
      ) : (
        <NavLink link={link} />
      )}
      {hasChildren && (
        <ul className={`sb-navbar-dropdown${isOpen ? ' sb-navbar-dropdown-open' : ''}`}>
          {link.children.map((child, i) => <li key={i}><NavLink link={child} /></li>)}
        </ul>
      )}
    </li>
  );
}

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
  // Touch-fallback open state for dropdown submenus -- index into navLinks,
  // or null. Desktop/mouse never touches this (CSS :hover handles it for
  // free); only used when a touch device taps a dropdown's chevron.
  const [openDropdown, setOpenDropdown] = useState(null);

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
  const isSplit = theme.navStyle === 'split';
  const navClass = `sb-navbar sb-navbar-${theme.navStyle}${theme.navStyle === 'side' ? ' sb-navbar-side' : ''}`;
  const toggle = (i) => setOpenDropdown((cur) => (cur === i ? null : i));

  const brand = <Link to="/" className="sb-navbar-brand">{chrome?.name || 'Loading…'}</Link>;
  const cart = count > 0 && (
    <Link to="/cart" className="sb-navbar-cart">
      <ShoppingCart size={16} /> {count}
    </Link>
  );

  if (isSplit && theme.navStyle !== 'minimal') {
    const mid = Math.ceil(navLinks.length / 2);
    const left = navLinks.slice(0, mid);
    const right = navLinks.slice(mid);
    return (
      <nav className={navClass}>
        <ul className="sb-navbar-links sb-navbar-links-left">
          {left.map((link, i) => <NavItem key={i} link={link} isOpen={openDropdown === i} onToggle={() => toggle(i)} />)}
        </ul>
        {brand}
        <ul className="sb-navbar-links sb-navbar-links-right">
          {right.map((link, i) => <NavItem key={mid + i} link={link} isOpen={openDropdown === mid + i} onToggle={() => toggle(mid + i)} />)}
        </ul>
        {cart}
      </nav>
    );
  }

  return (
    <nav className={navClass}>
      {brand}
      {theme.navStyle !== 'minimal' && (
        <ul className="sb-navbar-links">
          {navLinks.map((link, i) => <NavItem key={i} link={link} isOpen={openDropdown === i} onToggle={() => toggle(i)} />)}
        </ul>
      )}
      {cart}
    </nav>
  );
}
