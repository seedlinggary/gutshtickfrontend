import React, { useState } from 'react';
import { X, Plus, Trash2, ChevronRight } from 'lucide-react';
import { NAV_STYLES, FOOTER_STYLES } from './theme';

/** `nestable` turns on the "Parent" dropdown and sub-link rendering --
 * only the nav menu supports dropdown submenus (see BusinessSiteNavbar.js),
 * so footer links keep the plain flat list this always was. Picking a
 * parent in that dropdown is literally how an owner organizes pages into
 * a group instead of a long flat nav -- "Services" with 3 pages nested
 * under it, say -- without needing a dedicated page/folder concept. */
function LinksEditor({ links, onChange, nestable = false }) {
  const [label, setLabel] = useState('');
  const [path, setPath] = useState('');
  const [parentIndex, setParentIndex] = useState('');

  const topLevel = links || [];

  const add = () => {
    if (!label.trim() || !path.trim()) return;
    const newLink = { label: label.trim(), path: path.trim() };
    if (parentIndex === '') {
      onChange([...topLevel, newLink]);
    } else {
      const idx = Number(parentIndex);
      onChange(topLevel.map((l, i) => (i === idx ? { ...l, children: [...(l.children || []), newLink] } : l)));
    }
    setLabel('');
    setPath('');
  };

  const removeTop = (i) => onChange(topLevel.filter((_, idx) => idx !== i));
  const removeChild = (parentI, childI) => onChange(topLevel.map((l, i) => (
    i !== parentI ? l : { ...l, children: l.children.filter((_, ci) => ci !== childI) }
  )));

  return (
    <div className="gs-field">
      {topLevel.map((link, i) => (
        <div key={i} style={{ marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ flex: 1 }}>{link.label} → {link.path}</span>
            <button type="button" className="sb-icon-btn" onClick={() => removeTop(i)}><Trash2 size={12} /></button>
          </div>
          {(link.children || []).map((child, ci) => (
            <div key={ci} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginLeft: 16, marginTop: 3, color: 'var(--muted)' }}>
              <ChevronRight size={11} />
              <span style={{ flex: 1 }}>{child.label} → {child.path}</span>
              <button type="button" className="sb-icon-btn" onClick={() => removeChild(i, ci)}><Trash2 size={11} /></button>
            </div>
          ))}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
        <input className="gs-input" placeholder="Label (e.g. About)" value={label} onChange={(e) => setLabel(e.target.value)} style={{ flex: '1 1 100px' }} />
        <input className="gs-input" placeholder="Path (e.g. /about)" value={path} onChange={(e) => setPath(e.target.value)} style={{ flex: '1 1 100px' }} />
        {nestable && topLevel.length > 0 && (
          <select className="gs-select" value={parentIndex} onChange={(e) => setParentIndex(e.target.value)} style={{ flex: '1 1 130px' }}>
            <option value="">Top level</option>
            {topLevel.map((l, i) => <option key={i} value={i}>Under "{l.label}"</option>)}
          </select>
        )}
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
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 8px' }}>
                Pick a parent below to nest a link as a dropdown under it, instead of adding another top-level item.
              </p>
              <LinksEditor links={navLinks} onChange={onChangeNavLinks} nestable />
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
