import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, LayoutTemplate, Check, Plus, Trash2, Pencil } from 'lucide-react';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';
import { CATEGORY_LABELS } from './categories';
import Canvas from './site-builder/Canvas';
import BlockInspector from './site-builder/BlockInspector';
import ChromeInspector from './site-builder/ChromeInspector';
import { NavPreview, FooterPreview } from './site-builder/ChromePreview';
import AiAssistantPanel from './site-builder/AiAssistantPanel';
import { THEME_PALETTES, FONT_PAIRINGS, DEFAULT_THEME, themeToCssVars } from './site-builder/theme';
import { CustomColorEditor } from './site-builder/ThemePanel';
import './site-builder/site-builder.css';
import './site-builder/theme.css';

const DRAFT_KEY = 'sb_free_builder_draft';
let idCounter = 0;
const newId = (prefix) => { idCounter += 1; return `${prefix}-${Date.now().toString(36)}-${idCounter}`; };
const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '') || 'page';

function newHomePage() {
  return {
    id: newId('page'), title: 'Home', slug: 'home', isHome: true,
    sections: [{ id: newId('section'), background: { type: 'color', value: 'transparent' }, padding: { top: 48, bottom: 48 }, height: 420, blocks: [] }],
  };
}

function loadDraft() {
  try {
    const raw = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    if (!raw) return null;
    // Migrate an older single-page draft (just {sections, theme}, from
    // before multi-page support existed here) into the current shape
    // instead of discarding it.
    if (!raw.pages && raw.sections) {
      return { pages: [{ ...newHomePage(), sections: raw.sections }], theme: raw.theme, navLinks: [], footerText: '', footerLinks: [] };
    }
    return raw;
  } catch (_) {
    return null;
  }
}

function saveDraft(data) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  } catch (_) {
    // private window / blocked storage -- the session still works, it
    // just won't survive a refresh or the login redirect round trip.
  }
}

function PaletteSwatch({ palette, active, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{ display: 'flex', gap: 2, padding: 4, borderRadius: 8, border: active ? '2px solid var(--accent)' : '2px solid transparent', cursor: 'pointer', background: 'none' }}>
      {['primary', 'secondary', 'background'].map((key) => (
        <span key={key} style={{ width: 16, height: 16, borderRadius: 4, background: palette[key], border: '1px solid rgba(0,0,0,0.1)' }} />
      ))}
    </button>
  );
}

function PageTabs({ pages, activePageId, onSelect, onAdd, onDelete, onRename }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', padding: '8px 2px' }}>
      {pages.map((p) => (
        <div key={p.id} style={{ display: 'flex', alignItems: 'center' }}>
          <button
            type="button"
            className={`gs-btn gs-btn-sm${p.id === activePageId ? '' : ' gs-btn-outline'}`}
            onClick={() => onSelect(p.id)}
            onDoubleClick={() => onRename(p.id)}
            title="Double-click to rename"
          >
            {p.title}
          </button>
          <button type="button" className="sb-icon-btn" title={`Rename "${p.title}"`} style={{ marginLeft: -4 }} onClick={() => onRename(p.id)}>
            <Pencil size={12} />
          </button>
          {pages.length > 1 && (
            <button type="button" className="sb-icon-btn" title={`Delete "${p.title}"`} style={{ marginLeft: -4 }}
              onClick={() => { if (window.confirm(`Delete the "${p.title}" page?`)) onDelete(p.id); }}>
              <Trash2 size={12} />
            </button>
          )}
        </div>
      ))}
      <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={onAdd}><Plus size={13} /> Add page</button>
    </div>
  );
}

/** "Anyone can design a website, you only need to log in to save it" --
 * this is the entire site builder (Canvas/BlockInspector, same
 * components the real owner dashboard uses at /business/:id/tools)
 * mounted at a PUBLIC route with no business/site/page behind it yet.
 * Multiple pages + sitewide chrome (nav/footer) live in plain component
 * state here, mirrored into localStorage so the in-progress design
 * survives a refresh AND the login/signup redirect round trip -- see
 * handleSaveClick. Data-driven blocks (product_grid, booking_widget,
 * analytics_widget) render their own "nothing here yet" empty states
 * with no businessId/subdomain to fetch against, which is the correct
 * degraded behavior here: there's nothing real to show until this design
 * is actually attached to a business, right after Save & Publish.
 */
export default function FreeBuilder() {
  const navigate = useNavigate();
  const initial = useMemo(() => loadDraft(), []);
  const [pages, setPages] = useState(() => initial?.pages?.length ? initial.pages : [newHomePage()]);
  const [activePageId, setActivePageId] = useState(() => pages[0]?.id);
  const [theme, setTheme] = useState(initial?.theme || DEFAULT_THEME);
  const [navLinks, setNavLinks] = useState(initial?.navLinks || []);
  const [footerText, setFooterText] = useState(initial?.footerText || '');
  const [footerLinks, setFooterLinks] = useState(initial?.footerLinks || []);
  const [selected, setSelected] = useState({ sectionId: null, blockId: null });
  // null | 'nav' | 'footer'
  const [chromeSelected, setChromeSelected] = useState(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [templates, setTemplates] = useState(null);
  const [styleOpen, setStyleOpen] = useState(false);
  const [styleCatalog, setStyleCatalog] = useState(null);
  const [saveFlowOpen, setSaveFlowOpen] = useState(false);
  const [myBusinesses, setMyBusinesses] = useState(null);
  const [newBizName, setNewBizName] = useState('');
  const [newBizCategory, setNewBizCategory] = useState('other');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { saveDraft({ pages, theme, navLinks, footerText, footerLinks }); }, [pages, theme, navLinks, footerText, footerLinks]);

  // Same reasoning as PageEditor.js's identical effect -- the inspector is
  // a fixed overlay now, already in view when it opens; kept only in case
  // its own content needs scrolling into view within itself.
  const inspectorRef = useRef(null);
  useEffect(() => {
    if ((selected.blockId || chromeSelected) && inspectorRef.current) {
      inspectorRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.blockId, chromeSelected]);

  const activePage = pages.find((p) => p.id === activePageId) || pages[0];
  const setActiveSections = (sections) => setPages(pages.map((p) => (p.id === activePage.id ? { ...p, sections } : p)));

  const selectedSection = activePage?.sections.find((s) => s.id === selected.sectionId);
  const selectedBlock = selectedSection?.blocks.find((b) => b.id === selected.blockId);

  const addPage = () => {
    const title = window.prompt('Page title (e.g. About)');
    if (!title || !title.trim()) return;
    const base = slugify(title);
    let slug = base;
    let n = 2;
    while (pages.some((p) => p.slug === slug)) { slug = `${base}-${n}`; n += 1; }
    const page = { id: newId('page'), title: title.trim(), slug, isHome: false, sections: [] };
    setPages([...pages, page]);
    setActivePageId(page.id);
    setSelected({ sectionId: null, blockId: null });
  };

  const renamePage = (pageId) => {
    const page = pages.find((p) => p.id === pageId);
    if (!page) return;
    const title = window.prompt('Page title', page.title);
    if (title === null || !title.trim()) return;
    let slug = window.prompt('URL slug (letters, numbers, hyphens)', page.slug);
    if (slug === null) return;
    slug = slugify(slug);
    if (!slug) return;
    if (pages.some((p) => p.id !== pageId && p.slug === slug)) {
      window.alert('Another page already uses that slug -- pick a different one.');
      return;
    }
    setPages(pages.map((p) => (p.id === pageId ? { ...p, title: title.trim(), slug } : p)));
  };

  const deletePage = (pageId) => {
    const remaining = pages.filter((p) => p.id !== pageId);
    setPages(remaining);
    if (activePageId === pageId) setActivePageId(remaining[0]?.id);
    setSelected({ sectionId: null, blockId: null });
  };

  const toggleStyle = () => {
    if (styleCatalog) { setStyleOpen((o) => !o); return; }
    // No auth and no business yet, so this is the one owner-facing theme
    // endpoint that's genuinely public (a static catalog, not tied to any
    // business) -- same GET ThemePanel.js uses once a business exists.
    apiRequest('GET', null, '/business/site-themes').then((d) => { setStyleCatalog(d); setStyleOpen(true); }).catch(() => {});
  };

  const toggleTemplates = () => {
    if (templates) { setTemplatesOpen((o) => !o); return; }
    apiRequest('GET', null, '/business/site-templates').then((d) => { setTemplates(d.templates); setTemplatesOpen(true); });
  };

  const applyTemplate = (t) => {
    if (!window.confirm(`Use "${t.name}" for the "${activePage.title}" page? This replaces what you've built on it so far.`)) return;
    setActiveSections(t.home_sections || []);
    setTheme({ ...DEFAULT_THEME, ...(t.theme || {}) });
    if (t.nav_links) setNavLinks(t.nav_links);
    if (t.footer_text) setFooterText(t.footer_text);
    setTemplatesOpen(false);
    setSelected({ sectionId: null, blockId: null });
  };

  // The button says "Save & Publish" -- it must actually publish, not
  // just save a draft. A page only goes live once PUT .../draft is
  // followed by POST .../publish; without the publish call, a business
  // created from this flow looked done (no error, no further prompt) but
  // every page silently sat in Draft, invisible on the real site.
  const saveAllPagesTo = (businessId) => (
    apiRequest('GET', null, `/business/businesses/${businessId}/site-pages`).then((d) => {
      const existing = d.pages || [];
      return Promise.all(pages.map((local) => {
        const match = existing.find((e) => e.slug === local.slug) || (local.isHome && existing.find((e) => e.is_home));
        const draftSaved = match
          ? apiRequest('PUT', { sections: local.sections, title: local.title }, `/business/site-pages/${match.id}/draft`)
          : apiRequest('POST', { title: local.title, slug: local.slug, is_home: local.isHome }, `/business/businesses/${businessId}/site-pages`)
            .then((page) => apiRequest('PUT', { sections: local.sections }, `/business/site-pages/${page.id}/draft`));
        return draftSaved.then((data) => apiRequest('POST', {}, `/business/site-pages/${data.page.id}/publish`));
      }));
    })
  );

  const attachAndRedirect = (business) => {
    setBusy(true);
    setError('');
    apiRequest('GET', null, `/business/businesses/${business.id}/site`)
      .then(() => Promise.all([
        apiRequest('PATCH', { theme, nav_links: navLinks, footer_text: footerText, footer_links: footerLinks }, `/business/businesses/${business.id}/site`),
        saveAllPagesTo(business.id),
      ]))
      .then(() => {
        try { localStorage.removeItem(DRAFT_KEY); } catch (_) { /* noop */ }
        navigate(`/business/${business.slug}/tools`);
      })
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not save your design -- try again.'))
      .finally(() => setBusy(false));
  };

  const createBusinessAndAttach = (e) => {
    e.preventDefault();
    if (!newBizName.trim()) return;
    setBusy(true);
    setError('');
    apiRequest('POST', { name: newBizName.trim(), category: newBizCategory }, '/business/businesses')
      .then((business) => attachAndRedirect(business))
      .catch((err) => { setError(typeof err === 'string' ? err : 'Could not create your business.'); setBusy(false); });
  };

  const handleSaveClick = () => {
    saveDraft({ pages, theme, navLinks, footerText, footerLinks });
    if (!isLoggedIn()) {
      navigate('/signin?next=/build');
      return;
    }
    setSaveFlowOpen(true);
    if (!myBusinesses) {
      apiRequest('GET', null, '/business/my/businesses').then((d) => setMyBusinesses(d.owned || [])).catch(() => setMyBusinesses([]));
    }
  };

  return (
    <div className="sb-editor">
      <div className="sb-editor-toolbar">
        <strong>Build your website</strong>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginLeft: 16 }}>
          {Object.entries(THEME_PALETTES).map(([key, palette]) => (
            <PaletteSwatch key={key} palette={palette} active={theme.palette === key} onClick={() => setTheme({ ...theme, palette: key })} />
          ))}
          <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={toggleStyle}>More styles</button>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={toggleTemplates}>
            <LayoutTemplate size={14} /> Templates
          </button>
          <button type="button" className="gs-btn gs-btn-sm" onClick={handleSaveClick}>
            <UploadCloud size={14} /> Save &amp; Publish
          </button>
        </div>
      </div>

      <PageTabs pages={pages} activePageId={activePage?.id} onSelect={(id) => { setActivePageId(id); setSelected({ sectionId: null, blockId: null }); }} onAdd={addPage} onDelete={deletePage} onRename={renamePage} />

      {styleOpen && styleCatalog && (
        <div className="gs-card" style={{ marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
            <div className="gs-field">
              <div className="gs-label">Font pairing</div>
              <select className="gs-select" value={theme.fontPairing || 'modern'} onChange={(e) => setTheme({ ...theme, fontPairing: e.target.value })}>
                {Object.entries(FONT_PAIRINGS).map(([key]) => <option key={key} value={key}>{styleCatalog.fontPairings[key]?.label || key}</option>)}
              </select>
            </div>
            <div className="gs-field">
              <div className="gs-label">Buttons</div>
              <select className="gs-select" value={theme.buttonStyle || 'rounded'} onChange={(e) => setTheme({ ...theme, buttonStyle: e.target.value })}>
                {Object.entries(styleCatalog.buttonStyles).map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
              </select>
            </div>
            <div className="gs-field">
              <div className="gs-label">Forms</div>
              <select className="gs-select" value={theme.formStyle || 'boxed'} onChange={(e) => setTheme({ ...theme, formStyle: e.target.value })}>
                {Object.entries(styleCatalog.formStyles).map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
              </select>
            </div>
          </div>
          <CustomColorEditor theme={theme} onChange={(patch) => setTheme({ ...theme, ...patch })} />
        </div>
      )}

      {templatesOpen && (
        <div className="gs-card" style={{ marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {(templates || []).map((t) => (
              <div key={t.id} style={{ border: '1px solid var(--border, #e5e1d6)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <strong style={{ fontSize: 13 }}>{t.name}</strong>
                {t.description && <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>{t.description}</p>}
                <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => applyTemplate(t)}>Use this</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <div className="gs-error-box">{error}</div>}

      <AiAssistantPanel sections={activePage.sections} onSectionsChange={setActiveSections} theme={theme} onThemeChange={setTheme} />

      <div className={`sb-editor-body${(selectedBlock || chromeSelected) ? ' sb-body-inspector-open' : ''}`}>
        <div className="sb-editor-canvas-wrap sb-theme" style={themeToCssVars(theme)}>
          <NavPreview
            theme={theme}
            navLinks={navLinks}
            businessName={newBizName}
            selected={chromeSelected === 'nav'}
            onSelect={() => { setSelected({ sectionId: null, blockId: null }); setChromeSelected('nav'); }}
          />
          <Canvas
            sections={activePage.sections}
            onChange={setActiveSections}
            selected={selected.sectionId ? selected : null}
            onSelect={(sectionId, blockId) => { setChromeSelected(null); setSelected({ sectionId, blockId }); }}
          />
          <FooterPreview
            theme={theme}
            footerText={footerText}
            footerLinks={footerLinks}
            businessName={newBizName}
            selected={chromeSelected === 'footer'}
            onSelect={() => { setSelected({ sectionId: null, blockId: null }); setChromeSelected('footer'); }}
          />
        </div>
      </div>

      {(selectedBlock || chromeSelected) && (
        <>
          <div className="sb-inspector-backdrop" onClick={() => { setSelected({ sectionId: null, blockId: null }); setChromeSelected(null); }} />
          <div className="sb-inspector-overlay" ref={inspectorRef}>
            {selectedBlock ? (
              <BlockInspector
                block={selectedBlock}
                onChange={(updatedBlock) => setActiveSections(activePage.sections.map((s) => (s.id !== selectedSection.id ? s : {
                  ...s, blocks: s.blocks.map((b) => (b.id === updatedBlock.id ? updatedBlock : b)),
                })))}
                onClose={() => setSelected({ sectionId: null, blockId: null })}
              />
            ) : (
              <ChromeInspector
                mode={chromeSelected}
                theme={theme}
                navLinks={navLinks}
                footerText={footerText}
                footerLinks={footerLinks}
                onChangeTheme={(patch) => setTheme({ ...theme, ...patch })}
                onChangeNavLinks={setNavLinks}
                onChangeFooterText={setFooterText}
                onChangeFooterLinks={setFooterLinks}
                onClose={() => setChromeSelected(null)}
              />
            )}
          </div>
        </>
      )}

      {saveFlowOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="gs-card" style={{ maxWidth: 420, width: '90%' }}>
            {!myBusinesses ? (
              <div className="gs-loading"><div className="gs-spinner" /></div>
            ) : myBusinesses.length === 0 ? (
              <form onSubmit={createBusinessAndAttach}>
                <h3 style={{ marginTop: 0 }}>Name your business</h3>
                <p style={{ fontSize: 13, color: 'var(--muted)' }}>This creates your business listing and saves your design to it.</p>
                {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13 }}>{error}</p>}
                <input className="gs-input" placeholder="Business name" value={newBizName} onChange={(e) => setNewBizName(e.target.value)} required style={{ marginBottom: 10 }} />
                <select className="gs-select" value={newBizCategory} onChange={(e) => setNewBizCategory(e.target.value)} style={{ marginBottom: 14 }}>
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" className="gs-btn gs-btn-sm" disabled={busy}>{busy ? 'Saving…' : 'Create & Save'}</button>
                  <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setSaveFlowOpen(false)}>Cancel</button>
                </div>
              </form>
            ) : (
              <>
                <h3 style={{ marginTop: 0 }}>Save to which business?</h3>
                {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13 }}>{error}</p>}
                <div className="admin-list">
                  {myBusinesses.map((b) => (
                    <div key={b.id} className="admin-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{b.name}</span>
                      <button type="button" className="gs-btn gs-btn-sm" disabled={busy} onClick={() => attachAndRedirect(b)}>
                        {busy ? 'Saving…' : <><Check size={13} /> Use this</>}
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setSaveFlowOpen(false)} style={{ marginTop: 10 }}>Cancel</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
