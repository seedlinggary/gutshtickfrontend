import React from 'react';
import { ChevronDown } from 'lucide-react';
import { DEFAULT_THEME } from './theme';

/**
 * A click-to-edit PREVIEW of the site's own navbar/footer, rendered right
 * inside the page canvas -- not the real BusinessSiteNavbar/SiteFooter
 * (those fetch their own data via the current hostname's subdomain,
 * which makes no sense mounted inside the owner dashboard). Markup/classes
 * are kept identical to the real ones so this looks exactly like what a
 * visitor actually sees, and clicking it opens ChromeInspector instead of
 * requiring the owner to go find a separate settings tab -- that gap (nav/
 * footer existing only in a disconnected panel, invisible from the page
 * being built) was the actual complaint this file exists to fix.
 */
export function NavPreview({ theme, navLinks, businessName, selected, onSelect }) {
  const t = { ...DEFAULT_THEME, ...(theme || {}) };
  const navClass = `sb-navbar sb-navbar-${t.navStyle}${t.navStyle === 'side' ? ' sb-navbar-side' : ''}`;
  return (
    <div
      className={`sb-chrome-preview${selected ? ' sb-chrome-preview-selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      title="Click to edit your navbar"
    >
      <nav className={navClass}>
        <span className="sb-navbar-brand">{businessName || 'Your Business'}</span>
        {t.navStyle !== 'minimal' && (
          <ul className="sb-navbar-links">
            {(navLinks || []).length === 0 && <li style={{ opacity: 0.6 }}>No links yet</li>}
            {(navLinks || []).map((link, i) => (
              <li key={i} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  {link.label}
                  {link.children?.length > 0 && <ChevronDown size={11} style={{ opacity: 0.6 }} />}
                </span>
                {link.children?.length > 0 && (
                  <span style={{ fontSize: 11, opacity: 0.6, paddingLeft: 10 }}>
                    {link.children.map((c) => c.label).join(' · ')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </nav>
      <span className="sb-chrome-preview-tag">Navbar -- click to edit</span>
    </div>
  );
}

export function FooterPreview({ theme, footerText, footerLinks, businessName, selected, onSelect }) {
  const t = { ...DEFAULT_THEME, ...(theme || {}) };
  if (t.footerStyle === 'none') {
    return (
      <div
        className={`sb-chrome-preview sb-chrome-preview-empty${selected ? ' sb-chrome-preview-selected' : ''}`}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        title="Click to edit your footer"
      >
        <span style={{ fontSize: 12, color: 'var(--sb-muted, #8A7A68)' }}>No footer -- click to add one</span>
      </div>
    );
  }
  const text = footerText || `© ${new Date().getFullYear()} ${businessName || 'your business'}`;
  return (
    <div
      className={`sb-chrome-preview${selected ? ' sb-chrome-preview-selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      title="Click to edit your footer"
    >
      <footer className={`sb-footer sb-footer-${t.footerStyle}`}>
        <span>{text}</span>
        {(t.footerStyle === 'columns' || t.footerStyle === 'stacked') && (footerLinks || []).length > 0 && (
          <ul className="sb-footer-links">
            {footerLinks.map((link, i) => <li key={i}>{link.label}</li>)}
          </ul>
        )}
      </footer>
      <span className="sb-chrome-preview-tag">Footer -- click to edit</span>
    </div>
  );
}
