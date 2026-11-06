import React, { useEffect, useState } from 'react';
import { Palette, Plus, Trash2, RotateCcw } from 'lucide-react';
import apiRequest from '../../ApiRequest';
import { THEME_PALETTES, FONT_PAIRINGS } from './theme';

const CUSTOM_COLOR_KEYS = [
  { key: 'primary', label: 'Primary (buttons, links)' },
  { key: 'secondary', label: 'Secondary' },
  { key: 'background', label: 'Page background' },
  { key: 'text', label: 'Text' },
];

/** Start from a preset (the swatches above), then tweak just one or two
 * keys without losing the rest of that preset -- theme.customColors was
 * already reserved in the schema/themeToCssVars for exactly this, but
 * nothing ever exposed a UI to set it, so "I want to choose colors myself"
 * had no way in beyond picking a whole preset. */
export function CustomColorEditor({ theme, onChange }) {
  const base = THEME_PALETTES[theme.palette] || THEME_PALETTES.warm;
  const custom = theme.customColors || {};

  return (
    <div className="gs-field" style={{ marginTop: 14 }}>
      <div className="gs-label">Custom colors (override the scheme above)</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, marginTop: 6 }}>
        {CUSTOM_COLOR_KEYS.map(({ key, label }) => (
          <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--muted)' }}>
            <input
              type="color"
              value={custom[key] || base[key]}
              onChange={(e) => onChange({ customColors: { ...custom, [key]: e.target.value } })}
              style={{ width: 32, height: 28, padding: 0, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}
            />
            {label}
          </label>
        ))}
      </div>
      {Object.keys(custom).length > 0 && (
        <button type="button" className="sb-icon-btn" style={{ marginTop: 10 }} onClick={() => onChange({ customColors: null })}>
          <RotateCcw size={12} /> Reset to scheme colors
        </button>
      )}
    </div>
  );
}

function LinkListEditor({ label, links, onChange }) {
  const [draftLabel, setDraftLabel] = useState('');
  const [draftPath, setDraftPath] = useState('');

  const add = () => {
    if (!draftLabel.trim() || !draftPath.trim()) return;
    onChange([...links, { label: draftLabel.trim(), path: draftPath.trim() }]);
    setDraftLabel('');
    setDraftPath('');
  };

  return (
    <div className="gs-field">
      <div className="gs-label">{label}</div>
      {links.map((link, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 4 }}>
          <span style={{ flex: 1 }}>{link.label} → {link.path}</span>
          <button type="button" className="sb-icon-btn" onClick={() => onChange(links.filter((_, idx) => idx !== i))}><Trash2 size={12} /></button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        <input className="gs-input" placeholder="Label (e.g. About)" value={draftLabel} onChange={(e) => setDraftLabel(e.target.value)} style={{ flex: 1 }} />
        <input className="gs-input" placeholder="Path (e.g. /about)" value={draftPath} onChange={(e) => setDraftPath(e.target.value)} style={{ flex: 1 }} />
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={add}><Plus size={13} /></button>
      </div>
    </div>
  );
}

function Swatch({ palette, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={palette.label}
      style={{
        display: 'flex', gap: 2, padding: 4, borderRadius: 8,
        border: active ? '2px solid var(--accent)' : '2px solid transparent', cursor: 'pointer', background: 'none',
      }}
    >
      {['primary', 'secondary', 'background'].map((key) => (
        <span key={key} style={{ width: 18, height: 18, borderRadius: 4, background: palette[key], border: '1px solid rgba(0,0,0,0.1)' }} />
      ))}
    </button>
  );
}

export default function ThemePanel({ businessId, site, onSiteUpdate }) {
  const [catalog, setCatalog] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest('GET', null, '/business/site-themes').then(setCatalog).catch(() => {});
  }, []);

  const theme = site.theme || {};

  const patchTheme = (patch) => {
    setSaving(true);
    setError('');
    apiRequest('PATCH', { theme: patch }, `/business/businesses/${businessId}/site`)
      .then(onSiteUpdate)
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not save -- try again.'))
      .finally(() => setSaving(false));
  };

  const patchChrome = (patch) => {
    setSaving(true);
    setError('');
    apiRequest('PATCH', patch, `/business/businesses/${businessId}/site`)
      .then(onSiteUpdate)
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not save -- try again.'))
      .finally(() => setSaving(false));
  };

  if (!catalog) return <div className="gs-loading"><div className="gs-spinner" /></div>;

  return (
    <div className="gs-card">
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 0 }}><Palette size={18} /> Look &amp; feel</h3>
      {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13 }}>{error}</p>}

      <div className="gs-field">
        <div className="gs-label">Color scheme</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {Object.entries(THEME_PALETTES).map(([key, palette]) => (
            <Swatch key={key} palette={palette} active={theme.palette === key} onClick={() => patchTheme({ palette: key })} />
          ))}
        </div>
        <CustomColorEditor theme={theme} onChange={patchTheme} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        <div className="gs-field">
          <div className="gs-label">Font pairing</div>
          <select className="gs-select" disabled={saving} value={theme.fontPairing || 'modern'} onChange={(e) => patchTheme({ fontPairing: e.target.value })}>
            {Object.entries(FONT_PAIRINGS).map(([key]) => <option key={key} value={key}>{catalog.fontPairings[key]?.label || key}</option>)}
          </select>
        </div>
        <div className="gs-field">
          <div className="gs-label">Buttons</div>
          <select className="gs-select" disabled={saving} value={theme.buttonStyle || 'rounded'} onChange={(e) => patchTheme({ buttonStyle: e.target.value })}>
            {Object.entries(catalog.buttonStyles).map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
          </select>
        </div>
        <div className="gs-field">
          <div className="gs-label">Forms</div>
          <select className="gs-select" disabled={saving} value={theme.formStyle || 'boxed'} onChange={(e) => patchTheme({ formStyle: e.target.value })}>
            {Object.entries(catalog.formStyles).map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
          </select>
        </div>
        <div className="gs-field">
          <div className="gs-label">Navigation</div>
          <select className="gs-select" disabled={saving} value={theme.navStyle || 'top'} onChange={(e) => patchTheme({ navStyle: e.target.value })}>
            {Object.entries(catalog.navStyles).map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
          </select>
        </div>
        <div className="gs-field">
          <div className="gs-label">Footer</div>
          <select className="gs-select" disabled={saving} value={theme.footerStyle || 'simple'} onChange={(e) => patchTheme({ footerStyle: e.target.value })}>
            {Object.entries(catalog.footerStyles).map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
          </select>
        </div>
      </div>

      <hr style={{ margin: '18px 0', border: 0, borderTop: '1px solid var(--border, #e5e1d6)' }} />

      <LinkListEditor label="Navbar links (shown on every page)" links={site.nav_links || []} onChange={(links) => patchChrome({ nav_links: links })} />

      <div className="gs-field" style={{ marginTop: 14 }}>
        <div className="gs-label">Footer text</div>
        <input className="gs-input" defaultValue={site.footer_text || ''} placeholder={`© ${new Date().getFullYear()} your business`}
          onBlur={(e) => patchChrome({ footer_text: e.target.value })} />
      </div>

      <div style={{ marginTop: 14 }}>
        <LinkListEditor label="Footer links" links={site.footer_links || []} onChange={(links) => patchChrome({ footer_links: links })} />
      </div>
    </div>
  );
}
