import React, { useEffect, useState } from 'react';
import { Palette, Plus, Trash2, RotateCcw, ChevronDown } from 'lucide-react';
import apiRequest from '../../ApiRequest';
import UploadFile from '../../Uploadfile';
import { THEME_PALETTES, FONT_PAIRINGS } from './theme';

/** This panel grew one section at a time (colors, fonts, buttons, forms,
 * nav, footer, nav extras, footer extras...) until it became one long
 * flat scroll a non-technical owner has to wade through to find anything
 * -- the opposite of "easy to use." Groups it into named, collapsible
 * sections instead: the two almost everyone touches (Colors, Fonts) open
 * by default, the rest (which have grown the most options) collapsed
 * until asked for, so the panel's FIRST impression stays short even
 * though nothing it could already do was removed. */
function Section({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: '1px solid var(--border, #e5e1d6)' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
          background: 'none', border: 'none', cursor: 'pointer', padding: '12px 0',
          font: 'inherit', fontWeight: 600, fontSize: 14, color: 'var(--text)',
        }}
      >
        {title}
        <ChevronDown size={16} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', opacity: 0.6 }} />
      </button>
      {open && <div style={{ paddingBottom: 16 }}>{children}</div>}
    </div>
  );
}

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

/** Any two Google Font family names, not just one of the 8 presets --
 * theme.customFontPairing was reserved for this (same "preset + override"
 * convention as CustomColorEditor above) after recreating a real
 * business's existing site, whose actual fonts matched none of the
 * presets closely enough. The Google Fonts family query fragment is the
 * same syntax fonts.google.com's own "Get embed code" panel shows (e.g.
 * "PT+Serif:wght@700&family=Inter:wght@400;600"), copy-pasted in. */
function CustomFontEditor({ theme, onChange }) {
  const custom = theme.customFontPairing;
  const [draft, setDraft] = useState(custom || { heading: '', body: '', google: '' });

  if (!custom) {
    return (
      <button type="button" className="sb-icon-btn" style={{ marginTop: 6 }}
        onClick={() => onChange({ customFontPairing: { heading: '', body: '', google: '' } })}>
        <Plus size={12} /> Use custom fonts instead
      </button>
    );
  }

  const commit = (patch) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    if (next.heading.trim() && next.body.trim()) onChange({ customFontPairing: next });
  };

  return (
    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <input className="gs-input" placeholder="Heading font-family, e.g. 'PT Serif', Georgia, serif"
        value={draft.heading} onChange={(e) => commit({ heading: e.target.value })} />
      <input className="gs-input" placeholder="Body font-family, e.g. 'Inter', Arial, sans-serif"
        value={draft.body} onChange={(e) => commit({ body: e.target.value })} />
      <input className="gs-input" placeholder="Google Fonts family (optional), e.g. PT+Serif:wght@700&family=Inter:wght@400;600"
        value={draft.google} onChange={(e) => commit({ google: e.target.value })} />
      <button type="button" className="sb-icon-btn" style={{ alignSelf: 'flex-start' }} onClick={() => onChange({ customFontPairing: null })}>
        <RotateCcw size={12} /> Back to a preset pairing
      </button>
    </div>
  );
}

/** One or more HEADED groups of links in the footer (e.g. "Company",
 * "Services"), plus a separate address/phone/email block -- the flat
 * single footer_links list had no way to express this, so a real
 * business's actual 4-column footer (logo+tagline / Company / Services /
 * Contact, each with its own heading) had to collapse into one list with
 * no grouping or contact-info styling at all. */
function FooterColumnsEditor({ theme, onChange }) {
  const columns = theme.footerColumns || [];

  const updateColumn = (i, patch) => onChange({ footerColumns: columns.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) });
  const addColumn = () => onChange({ footerColumns: [...columns, { heading: '', links: [] }] });
  const removeColumn = (i) => onChange({ footerColumns: columns.filter((_, idx) => idx !== i) });

  return (
    <div className="gs-field" style={{ marginTop: 14 }}>
      <div className="gs-label">Footer link columns (optional) — each becomes its own headed column, e.g. "Company", "Services"</div>
      {columns.map((col, i) => (
        <div key={i} style={{ border: '1px solid var(--border, #e5e1d6)', borderRadius: 8, padding: 10, marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <input className="gs-input" placeholder="Column heading, e.g. Company" style={{ flex: 1 }}
              defaultValue={col.heading || ''} onBlur={(e) => updateColumn(i, { heading: e.target.value })} />
            <button type="button" className="sb-icon-btn" onClick={() => removeColumn(i)}><Trash2 size={13} /></button>
          </div>
          <LinkListEditor label="Links" links={col.links || []} onChange={(links) => updateColumn(i, { links })} />
        </div>
      ))}
      <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={addColumn}><Plus size={13} /> Add column</button>
    </div>
  );
}

function FooterContactEditor({ theme, onChange }) {
  const contact = theme.footerContact || {};
  const set = (patch) => onChange({ footerContact: { ...contact, ...patch } });
  return (
    <div className="gs-field" style={{ marginTop: 14 }}>
      <div className="gs-label">Footer contact column (optional)</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <input className="gs-input" placeholder="Column heading, e.g. Contact" defaultValue={contact.heading || ''} onBlur={(e) => set({ heading: e.target.value })} />
        <input className="gs-input" placeholder="Address" defaultValue={contact.address || ''} onBlur={(e) => set({ address: e.target.value })} />
        <input className="gs-input" placeholder="Phone" defaultValue={contact.phone || ''} onBlur={(e) => set({ phone: e.target.value })} />
        <input className="gs-input" placeholder="Email" defaultValue={contact.email || ''} onBlur={(e) => set({ email: e.target.value })} />
      </div>
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

      <div className="gs-field" style={{ marginBottom: 14 }}>
        <div className="gs-label">Browser tab icon (favicon)</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {site.favicon_url && <img src={site.favicon_url} alt="" style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border, #e5e1d6)' }} />}
          <UploadFile apiextension="/business/upload" setInvestors={(filename) =>
            apiRequest('GET', null, `/business/upload-url/${filename}`).then(({ url }) => patchChrome({ favicon_url: url }))} />
          {site.favicon_url && (
            <button type="button" className="sb-icon-btn" onClick={() => patchChrome({ favicon_url: null })}><RotateCcw size={12} /></button>
          )}
        </div>
      </div>

      <Section title="Colors" defaultOpen>
        <div className="gs-field">
          <div className="gs-label">Color scheme</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {Object.entries(THEME_PALETTES).map(([key, palette]) => (
              <Swatch key={key} palette={palette} active={theme.palette === key} onClick={() => patchTheme({ palette: key })} />
            ))}
          </div>
          <CustomColorEditor theme={theme} onChange={patchTheme} />
        </div>
        <div className="gs-field" style={{ marginTop: 14 }}>
          <div className="gs-label">Heading color (defaults to the text color above)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="color" disabled={saving} value={theme.headingColor || (THEME_PALETTES[theme.palette] || THEME_PALETTES.warm).text}
              onChange={(e) => patchTheme({ headingColor: e.target.value })}
              style={{ width: 32, height: 28, padding: 0, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }} />
            {theme.headingColor && (
              <button type="button" className="sb-icon-btn" onClick={() => patchTheme({ headingColor: null })}><RotateCcw size={12} /></button>
            )}
          </div>
        </div>
      </Section>

      <Section title="Fonts" defaultOpen>
        <div className="gs-field">
          <div className="gs-label">Font pairing</div>
          {!theme.customFontPairing && (
            <select className="gs-select" disabled={saving} value={theme.fontPairing || 'modern'} onChange={(e) => patchTheme({ fontPairing: e.target.value })}>
              {Object.entries(FONT_PAIRINGS).map(([key]) => <option key={key} value={key}>{catalog.fontPairings[key]?.label || key}</option>)}
            </select>
          )}
          <CustomFontEditor theme={theme} onChange={patchTheme} />
        </div>
      </Section>

      <Section title="Buttons & forms">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
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
        </div>
      </Section>

      <Section title="Navigation">
        <div className="gs-field">
          <div className="gs-label">Style</div>
          <select className="gs-select" disabled={saving} value={theme.navStyle || 'top'} onChange={(e) => patchTheme({ navStyle: e.target.value })}>
            {Object.entries(catalog.navStyles).map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginTop: 8, color: 'var(--muted)' }}>
            <input type="checkbox" disabled={saving} checked={!!theme.navUppercase} onChange={(e) => patchTheme({ navUppercase: e.target.checked })} />
            Uppercase nav links
          </label>
        </div>

        <div style={{ marginTop: 14 }}>
          <LinkListEditor label="Navbar links (shown on every page)" links={site.nav_links || []} onChange={(links) => patchChrome({ nav_links: links })} />
        </div>

        <div className="gs-field" style={{ marginTop: 14 }}>
          <div className="gs-label">Top announcement bar (optional) — a thin strip above the navbar, e.g. a service area or phone number</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="gs-input" placeholder="Text, e.g. Servicing Condos & Co-ops Across NYC" style={{ flex: 2 }}
              defaultValue={theme.navAnnouncement?.text || ''} onBlur={(e) => patchTheme({ navAnnouncement: { ...(theme.navAnnouncement || {}), text: e.target.value } })} />
            <input className="gs-input" placeholder="Phone (optional)" style={{ flex: 1 }}
              defaultValue={theme.navAnnouncement?.phone || ''} onBlur={(e) => patchTheme({ navAnnouncement: { ...(theme.navAnnouncement || {}), phone: e.target.value } })} />
          </div>
        </div>

        <div className="gs-field" style={{ marginTop: 14 }}>
          <div className="gs-label">Navbar call-to-action button (optional)</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="gs-input" placeholder="Button text, e.g. Request a Proposal" style={{ flex: 1 }}
              defaultValue={theme.navCta?.label || ''} onBlur={(e) => patchTheme({ navCta: { ...(theme.navCta || {}), label: e.target.value } })} />
            <input className="gs-input" placeholder="Links to, e.g. /contact" style={{ flex: 1 }}
              defaultValue={theme.navCta?.path || ''} onBlur={(e) => patchTheme({ navCta: { ...(theme.navCta || {}), path: e.target.value } })} />
          </div>
        </div>
      </Section>

      <Section title="Footer">
        <div className="gs-field">
          <div className="gs-label">Style</div>
          <select className="gs-select" disabled={saving} value={theme.footerStyle || 'simple'} onChange={(e) => patchTheme({ footerStyle: e.target.value })}>
            {Object.entries(catalog.footerStyles).map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginTop: 8, color: 'var(--muted)' }}>
            <input type="checkbox" disabled={saving} checked={!!theme.footerDark} onChange={(e) => patchTheme({ footerDark: e.target.checked })} />
            Dark footer (independent of the site's main colors — common for a visual "anchor" at the bottom of the page)
          </label>
          {theme.footerDark && (
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--muted)' }}>
                <input type="color" disabled={saving} value={theme.footerDarkBg || '#02132A'} onChange={(e) => patchTheme({ footerDarkBg: e.target.value })}
                  style={{ width: 28, height: 24, padding: 0, border: '1px solid var(--border)', borderRadius: 6 }} />
                Background
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--muted)' }}>
                <input type="color" disabled={saving} value={theme.footerDarkText || '#B7E1FB'} onChange={(e) => patchTheme({ footerDarkText: e.target.value })}
                  style={{ width: 28, height: 24, padding: 0, border: '1px solid var(--border)', borderRadius: 6 }} />
                Text
              </label>
            </div>
          )}
        </div>

        <div className="gs-field" style={{ marginTop: 14 }}>
          <div className="gs-label">Footer text</div>
          <input className="gs-input" defaultValue={site.footer_text || ''} placeholder={`© ${new Date().getFullYear()} your business`}
            onBlur={(e) => patchChrome({ footer_text: e.target.value })} />
        </div>

        <div style={{ marginTop: 14 }}>
          <LinkListEditor label="Footer links" links={site.footer_links || []} onChange={(links) => patchChrome({ footer_links: links })} />
        </div>

        {theme.footerStyle === 'columns' && (
          <>
            <div className="gs-field" style={{ marginTop: 14 }}>
              <div className="gs-label">Footer tagline (optional) — a line under your business name in the first column</div>
              <input className="gs-input" defaultValue={theme.footerTagline || ''} onBlur={(e) => patchTheme({ footerTagline: e.target.value })} />
            </div>
            <FooterColumnsEditor theme={theme} onChange={patchTheme} />
            <FooterContactEditor theme={theme} onChange={patchTheme} />
          </>
        )}

        <div className="gs-field" style={{ marginTop: 14 }}>
          <div className="gs-label">Footer bottom-bar extras (optional)</div>
          <input className="gs-input" placeholder="A second line of text, e.g. a tagline" style={{ marginBottom: 6 }}
            defaultValue={theme.footerTagline2 || ''} onBlur={(e) => patchTheme({ footerTagline2: e.target.value })} />
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="gs-input" placeholder="A link's text, e.g. Staff Login" style={{ flex: 1 }}
              defaultValue={theme.footerBottomLink?.label || ''} onBlur={(e) => patchTheme({ footerBottomLink: { ...(theme.footerBottomLink || {}), label: e.target.value } })} />
            <input className="gs-input" placeholder="Links to, e.g. /staff/login" style={{ flex: 1 }}
              defaultValue={theme.footerBottomLink?.path || ''} onBlur={(e) => patchTheme({ footerBottomLink: { ...(theme.footerBottomLink || {}), path: e.target.value } })} />
          </div>
        </div>
      </Section>
    </div>
  );
}
