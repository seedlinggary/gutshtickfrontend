import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail } from 'lucide-react';
import useSiteChrome from './useSiteChrome';
import { DEFAULT_THEME } from './theme';
import './theme.css';

function FooterLink({ link }) {
  return link.path?.startsWith('http') ? (
    <a href={link.path} target="_blank" rel="noreferrer">{link.label}</a>
  ) : (
    <Link to={link.path || '/'}>{link.label}</Link>
  );
}

/** Rendered at the bottom of every real business-site page (not via
 * App.js -- see useSiteChrome's own comment on why Navbar/Footer each
 * fetch independently rather than threading props down). footerStyle
 * 'none' renders nothing at all, same spirit as a module being off. */
export default function SiteFooter({ subdomain }) {
  const chrome = useSiteChrome(subdomain);
  if (!chrome) return null;

  const theme = { ...DEFAULT_THEME, ...(chrome.theme || {}) };
  if (theme.footerStyle === 'none') return null;

  const footerLinks = chrome.footer_links || [];
  const text = chrome.footer_text || `© ${new Date().getFullYear()} ${chrome.name}`;
  const footerClass = `sb-footer sb-footer-${theme.footerStyle}${theme.footerDark ? ' sb-footer-dark' : ''}`;

  // Multi-column footer with its own grouped link columns + a contact
  // column -- a real business's actual footer (logo/tagline, "Company"
  // links, "Services" links, an address/phone/email block with icons) had
  // no way to be built before this: the simple style only ever had ONE
  // flat link list next to the copyright text.
  const columns = theme.footerColumns || [];
  if (theme.footerStyle === 'columns' && (columns.length > 0 || theme.footerContact)) {
    return (
      <footer className={footerClass}>
        <div className="sb-footer-grid">
          <div className="sb-footer-col">
            <div className="sb-footer-brand">{chrome.name}</div>
            {theme.footerTagline && <p>{theme.footerTagline}</p>}
          </div>
          {columns.map((col, i) => (
            <div key={i} className="sb-footer-col">
              {col.heading && <h4>{col.heading}</h4>}
              <ul>
                {(col.links || []).map((link, j) => <li key={j}><FooterLink link={link} /></li>)}
              </ul>
            </div>
          ))}
          {theme.footerContact && (
            <div className="sb-footer-col">
              {theme.footerContact.heading && <h4>{theme.footerContact.heading}</h4>}
              <ul className="sb-footer-contact">
                {theme.footerContact.address && <li><MapPin size={14} /><span>{theme.footerContact.address}</span></li>}
                {theme.footerContact.phone && <li><a href={`tel:${theme.footerContact.phone.replace(/[^0-9+]/g, '')}`}><Phone size={14} /> {theme.footerContact.phone}</a></li>}
                {theme.footerContact.email && <li><a href={`mailto:${theme.footerContact.email}`}><Mail size={14} /> {theme.footerContact.email}</a></li>}
              </ul>
            </div>
          )}
        </div>
        <div className="sb-footer-bottom">
          <span>{text}</span>
          <span className="sb-footer-bottom-right">
            {theme.footerTagline2 && <span>{theme.footerTagline2}</span>}
            {theme.footerBottomLink?.label && <FooterLink link={theme.footerBottomLink} />}
          </span>
        </div>
      </footer>
    );
  }

  const linkList = footerLinks.length > 0 && (
    <ul className="sb-footer-links">
      {footerLinks.map((link, i) => <li key={i}><FooterLink link={link} /></li>)}
    </ul>
  );

  return (
    <footer className={footerClass}>
      {theme.footerStyle === 'columns' || theme.footerStyle === 'stacked' ? (
        <>
          <span>{text}</span>
          {linkList}
        </>
      ) : (
        <span>{text}</span>
      )}
    </footer>
  );
}
