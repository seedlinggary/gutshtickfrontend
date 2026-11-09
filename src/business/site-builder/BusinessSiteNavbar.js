import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, ChevronDown, Phone, Menu, X } from 'lucide-react';
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
  const location = useLocation();
  const chrome = useSiteChrome(subdomain);
  const [count, setCount] = useState(() => (subdomain ? cartItemCount(subdomain) : 0));
  // Touch-fallback open state for dropdown submenus -- index into navLinks,
  // or null. Desktop/mouse never touches this (CSS :hover handles it for
  // free); only used when a touch device taps a dropdown's chevron.
  const [openDropdown, setOpenDropdown] = useState(null);
  // Below the sb-navbar's own 720px breakpoint, the links list is a
  // collapsed hamburger menu instead of inline links -- real businesses
  // (Altmax, KTY) hit this live: with no collapse at all, every nav style
  // but "minimal" just let the links wrap next to the brand/cart/CTA on a
  // phone, which reflowed into an unreadable mess once there were more
  // than 2-3 of them. See theme.css's matching @media (max-width: 720px)
  // block for the actual collapse/reveal rules.
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!subdomain) return undefined;
    return subscribeCart(() => setCount(cartItemCount(subdomain)));
  }, [subdomain]);

  // Closes the mobile menu on every navigation -- without this, clicking a
  // link inside the open menu would leave it open over the new page (the
  // nav itself never unmounts between routes).
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

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
  const navClass = `sb-navbar sb-navbar-${theme.navStyle}${theme.navStyle === 'side' ? ' sb-navbar-side' : ''}${theme.navUppercase ? ' sb-navbar-uppercase' : ''}`;
  const toggleDropdown = (i) => setOpenDropdown((cur) => (cur === i ? null : i));
  const linksClass = `sb-navbar-links${mobileOpen ? ' sb-navbar-links-open' : ''}`;
  const mobileToggle = theme.navStyle !== 'minimal' && navLinks.length > 0 && (
    <button
      type="button"
      className="sb-navbar-toggle"
      aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
      aria-expanded={mobileOpen}
      onClick={() => setMobileOpen((o) => !o)}
    >
      {mobileOpen ? <X size={20} /> : <Menu size={20} />}
    </button>
  );

  const brand = <Link to="/" className="sb-navbar-brand">{chrome?.name || 'Loading…'}</Link>;
  const cart = count > 0 && (
    <Link to="/cart" className="sb-navbar-cart">
      <ShoppingCart size={16} /> {count}
    </Link>
  );
  // A dark contact strip above the main bar, and a standalone CTA button
  // beside the links -- a real business's actual header had both, and
  // neither had anywhere to live before (nav_links is just plain {label,
  // path} entries rendered identically; a phone number or a "stand out"
  // CTA button needs different styling, not one more link in that list).
  const announcement = theme.navAnnouncement?.text && (
    <div className="sb-navbar-announcement">
      <span>{theme.navAnnouncement.text}</span>
      {theme.navAnnouncement.phone && (
        <a href={`tel:${theme.navAnnouncement.phone.replace(/[^0-9+]/g, '')}`}>
          <Phone size={12} /> {theme.navAnnouncement.phone}
        </a>
      )}
    </div>
  );
  const navCta = theme.navCta?.label && (
    theme.navCta.path?.startsWith('http')
      ? <a href={theme.navCta.path} target="_blank" rel="noreferrer" className="sb-navbar-cta sb-button">{theme.navCta.label}</a>
      : <Link to={theme.navCta.path || '/'} className="sb-navbar-cta sb-button">{theme.navCta.label}</Link>
  );

  if (isSplit && theme.navStyle !== 'minimal') {
    const mid = Math.ceil(navLinks.length / 2);
    const left = navLinks.slice(0, mid);
    const right = navLinks.slice(mid);
    return (
      <>
        {announcement}
        <nav className={navClass}>
          <ul className={`${linksClass} sb-navbar-links-left`}>
            {left.map((link, i) => <NavItem key={i} link={link} isOpen={openDropdown === i} onToggle={() => toggleDropdown(i)} />)}
          </ul>
          {brand}
          <ul className={`${linksClass} sb-navbar-links-right`}>
            {right.map((link, i) => <NavItem key={mid + i} link={link} isOpen={openDropdown === mid + i} onToggle={() => toggleDropdown(mid + i)} />)}
          </ul>
          {mobileToggle}
          {cart}
          {navCta}
        </nav>
      </>
    );
  }

  return (
    <>
      {announcement}
      <nav className={navClass}>
        {brand}
        {mobileToggle}
        {theme.navStyle !== 'minimal' && (
          <ul className={linksClass}>
            {navLinks.map((link, i) => <NavItem key={i} link={link} isOpen={openDropdown === i} onToggle={() => toggleDropdown(i)} />)}
          </ul>
        )}
        {cart}
        {navCta}
      </nav>
    </>
  );
}
