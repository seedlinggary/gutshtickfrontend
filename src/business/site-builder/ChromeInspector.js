import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { NAV_STYLES, FOOTER_STYLES } from './theme';

function LinksEditor({ links, onChange }) {
  const [label, setLabel] = useState('');
  const [path, setPath] = useState('');

  const add = () => {
    if (!label.trim() || !path.trim()) return;
    onChange([...(links || []), { label: label.trim(), path: path.trim() }]);
    setLabel('');
    setPath('');
  };

  return (
    <div className="gs-field">
      {(links || []).map((link, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 4 }}>
          <span style={{ flex: 1 }}>{link.label} → {link.path}</span>
          <button type="button" className="sb-icon-btn" onClick={() => onChange(links.filter((_, idx) => idx !== i))}><Trash2 size={12} /></button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        <input className="gs-input" placeholder="Label (e.g. About)" value={label} onChange={(e) => setLabel(e.target.value)} style={{ flex: 1 }} />
        <input className="gs-input" placeholder="Path (e.g. /about)" value={path} onChange={(e) => setPath(e.target.value)} style={{ flex: 1 }} />
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={add}><Plus size={13} /></button>
      </div>
    </div>
  );
}

/** The settings panel that opens when a NavPreview/FooterPreview (see
 * ChromePreview.js) is clicked -- "what type of navbar/footer, and
 * what's in it," the thing that was missing when the only way to edit a
 * block was x/y/w/h. Shares the same `.sb-inspector`/overlay shell as
 * BlockInspector so the two feel like one consistent system, just with
 * site-wide fields (nav/footer apply to every page) instead of per-block
 * ones. */
export default function ChromeInspector({
  mode, theme, navLinks, footerText, footerLinks,
  onChangeTheme, onChangeNavLinks, onChangeFooterText, onChangeFooterLinks, onClose,
}) {
  return (
    <div className="sb-inspector">
      <div className="sb-inspector-header">
        <strong>{mode === 'nav' ? 'Navbar settings' : 'Footer settings'}</strong>
        <button type="button" className="sb-icon-btn" onClick={onClose}><X size={14} /></button>
      </div>

      {mode === 'nav' ? (
        <>
          <div className="gs-field">
            <div className="gs-label">Navbar type</div>
            <select className="gs-select" value={theme.navStyle || 'top'} onChange={(e) => onChangeTheme({ navStyle: e.target.value })}>
              {Object.entries(NAV_STYLES).map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
            </select>
          </div>
          {theme.navStyle !== 'minimal' && (
            <div className="gs-field" style={{ marginTop: 14 }}>
              <div className="gs-label">Links (shown on every page)</div>
              <LinksEditor links={navLinks} onChange={onChangeNavLinks} />
            </div>
          )}
        </>
      ) : (
        <>
          <div className="gs-field">
            <div className="gs-label">Footer type</div>
            <select className="gs-select" value={theme.footerStyle || 'simple'} onChange={(e) => onChangeTheme({ footerStyle: e.target.value })}>
              {Object.entries(FOOTER_STYLES).map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
            </select>
          </div>
          {theme.footerStyle !== 'none' && (
            <>
              <div className="gs-field" style={{ marginTop: 14 }}>
                <div className="gs-label">Footer text</div>
                <input className="gs-input" defaultValue={footerText || ''} placeholder={`© ${new Date().getFullYear()} your business`}
                  onBlur={(e) => onChangeFooterText(e.target.value)} />
              </div>
              {theme.footerStyle === 'columns' && (
                <div className="gs-field" style={{ marginTop: 14 }}>
                  <div className="gs-label">Footer links</div>
                  <LinksEditor links={footerLinks} onChange={onChangeFooterLinks} />
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
