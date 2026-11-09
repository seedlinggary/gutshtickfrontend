import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Monitor, Smartphone, ChevronDown, Menu } from 'lucide-react';
import PublicSiteRenderer from './PublicSiteRenderer';
import { themeToCssVars } from './theme';
import './theme.css';
import './public-site.css';

function PreviewNavLink({ link }) {
  return link.path?.startsWith('http') ? (
    <a href={link.path} target="_blank" rel="noreferrer">{link.label}</a>
  ) : (
    <Link to={link.path || '/'}>{link.label}</Link>
  );
}

/** Same dropdown markup as BusinessSiteNavbar.js's own NavItem -- hover
 * works here via the same CSS rule (this modal loads theme.css too), so
 * the touch-only click-toggle state isn't needed in a desktop preview
 * modal. */
function PreviewNavItem({ link }) {
  const hasChildren = link.children?.length > 0;
  return (
    <li>
      {hasChildren ? (
        <span className="sb-navbar-dropdown-toggle">{link.label} <ChevronDown size={12} /></span>
      ) : (
        <PreviewNavLink link={link} />
      )}
      {hasChildren && (
        <ul className="sb-navbar-dropdown">
          {link.children.map((child, i) => <li key={i}><PreviewNavLink link={child} /></li>)}
        </ul>
      )}
    </li>
  );
}

/** Non-interactive stand-ins for the real BusinessSiteNavbar/SiteFooter --
 * those two fetch their own site-chrome data by subdomain (via
 * useSiteChrome), which only works for an ALREADY-PUBLISHED site; this
 * modal previews the editor's current in-memory (possibly unsaved, and
 * possibly on an unpublished draft) nav/footer settings instead, so it
 * needs its own render straight from the props PageEditor.js already has
 * in state. Markup/classes match the real ones exactly so this looks like
 * what a visitor will actually see. */
function PreviewNavbar({ theme, navLinks, businessName, mode }) {
  const links = navLinks || [];
  const isSplit = theme.navStyle === 'split';
  const navClass = `sb-navbar sb-navbar-${theme.navStyle}${theme.navStyle === 'side' ? ' sb-navbar-side' : ''}`;
  const brand = <span className="sb-navbar-brand">{businessName || 'Your Business'}</span>;
  // theme.css's collapse rule is a real @media (max-width: 720px) query,
  // which never fires in here -- this modal is rendered inside a normal
  // desktop-width browser tab and only narrows a styled wrapper div, it
  // doesn't actually shrink the viewport (see PublicSiteRenderer's own
  // `mode` prop for the identical reason/fix on the page content itself).
  // So the mobile tree is rendered explicitly here instead of relying on
  // that breakpoint, closed by default since that's what a visitor sees
  // first -- this is a static stand-in, not the interactive real navbar.
  const mobile = mode === 'mobile' && theme.navStyle !== 'minimal' && links.length > 0;
  const linksClass = `sb-navbar-links${mobile ? ' sb-navbar-links-collapsed' : ''}`;
  const mobileToggle = mobile && (
    <button type="button" className="sb-navbar-toggle sb-navbar-toggle-static" tabIndex={-1} aria-hidden="true">
      <Menu size={20} />
    </button>
  );

  if (isSplit && theme.navStyle !== 'minimal') {
    const mid = Math.ceil(links.length / 2);
    return (
      <nav className={navClass}>
        <ul className={`${linksClass} sb-navbar-links-left`}>
          {links.slice(0, mid).map((link, i) => <PreviewNavItem key={i} link={link} />)}
        </ul>
        {brand}
        <ul className={`${linksClass} sb-navbar-links-right`}>
          {links.slice(mid).map((link, i) => <PreviewNavItem key={i} link={link} />)}
        </ul>
        {mobileToggle}
      </nav>
    );
  }

  return (
    <nav className={navClass}>
      {brand}
      {mobileToggle}
      {theme.navStyle !== 'minimal' && (
        <ul className={linksClass}>
          {links.map((link, i) => <PreviewNavItem key={i} link={link} />)}
        </ul>
      )}
    </nav>
  );
}

function PreviewFooter({ theme, footerText, footerLinks, businessName }) {
  if (theme.footerStyle === 'none') return null;
  const text = footerText || `© ${new Date().getFullYear()} ${businessName || 'your business'}`;
  return (
    <footer className={`sb-footer sb-footer-${theme.footerStyle}${theme.footerDark ? ' sb-footer-dark' : ''}`}>
      {theme.footerStyle === 'columns' || theme.footerStyle === 'stacked' ? (
        <>
          <span>{text}</span>
          {(footerLinks || []).length > 0 && (
            <ul className="sb-footer-links">
              {footerLinks.map((link, i) => <li key={i}>{link.label}</li>)}
            </ul>
          )}
        </>
      ) : (
        <span>{text}</span>
      )}
    </footer>
  );
}

/**
 * "What does this actually look like" -- renders through the SAME
 * PublicSiteRenderer a real visitor gets (not a re-approximation of it),
 * fed the editor's current in-memory `sections`/theme directly, so it
 * reflects unsaved changes too, not just the last-saved draft. `mode`
 * forces PublicSiteRenderer to commit to one of its two trees instead of
 * letting a CSS breakpoint pick -- this modal is itself rendered in a
 * desktop browser, so the public site's own viewport-width media query
 * would otherwise always show the desktop tree, exactly the thing being
 * asked to preview around.
 */
export default function DevicePreviewModal({ sections, subdomain, businessId, theme, enabledModules, navLinks, footerText, footerLinks, businessName, onClose }) {
  const [mode, setMode] = useState('desktop');

  return (
    <div className="sb-preview-backdrop" onClick={onClose}>
      <div className="sb-preview-shell" onClick={(e) => e.stopPropagation()}>
        <div className="sb-preview-toolbar">
          <div className="sb-preview-toggle">
            <button type="button" className={`sb-icon-btn${mode === 'desktop' ? ' sb-preview-mode-active' : ''}`} onClick={() => setMode('desktop')}>
              <Monitor size={14} /> Desktop
            </button>
            <button type="button" className={`sb-icon-btn${mode === 'mobile' ? ' sb-preview-mode-active' : ''}`} onClick={() => setMode('mobile')}>
              <Smartphone size={14} /> Mobile
            </button>
          </div>
          <button type="button" className="sb-icon-btn" onClick={onClose}><X size={14} /> Close preview</button>
        </div>
        <div className="sb-preview-viewport">
          <div
            className={`sb-preview-frame sb-preview-frame-${mode} sb-theme`}
            style={themeToCssVars(theme)}
          >
            <PreviewNavbar theme={theme} navLinks={navLinks} businessName={businessName} mode={mode} />
            <PublicSiteRenderer sections={sections} subdomain={subdomain} businessId={businessId} mode={mode} enabledModules={enabledModules} />
            <PreviewFooter theme={theme} footerText={footerText} footerLinks={footerLinks} businessName={businessName} />
          </div>
        </div>
      </div>
    </div>
  );
}
