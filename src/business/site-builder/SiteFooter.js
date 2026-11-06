import React from 'react';
import { Link } from 'react-router-dom';
import useSiteChrome from './useSiteChrome';
import { DEFAULT_THEME } from './theme';
import './theme.css';

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

  return (
    <footer className={`sb-footer sb-footer-${theme.footerStyle}`}>
      {theme.footerStyle === 'columns' ? (
        <>
          <span>{text}</span>
          {footerLinks.length > 0 && (
            <ul className="sb-footer-links">
              {footerLinks.map((link, i) => (
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
        </>
      ) : (
        <span>{text}</span>
      )}
    </footer>
  );
}
