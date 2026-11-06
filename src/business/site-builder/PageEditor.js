import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Save, UploadCloud, EyeOff, Monitor, Pencil, Check, X, Search } from 'lucide-react';
import apiRequest from '../../ApiRequest';
import Canvas from './Canvas';
import BlockInspector from './BlockInspector';
import ChromeInspector from './ChromeInspector';
import SeoInspector from './SeoInspector';
import { NavPreview, FooterPreview } from './ChromePreview';
import AiAssistantPanel from './AiAssistantPanel';
import DevicePreviewModal from './DevicePreviewModal';
import { themeToCssVars, DEFAULT_THEME } from './theme';
import './site-builder.css';
import './theme.css';

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '');

/** There used to be no way to change a page's title or slug after
 * creating it -- title could only be changed as a side effect of saving a
 * draft (and slug couldn't be changed at all, ever). PATCH /site-pages/:id
 * (new) handles the rename itself; this just opens/closes the small inline
 * form for it. */
function PageRenameControl({ page, onRenamed }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!editing) {
    return (
      <button type="button" className="sb-icon-btn" style={{ marginLeft: 10, border: 'none', background: 'none' }} onClick={() => { setTitle(page.title); setSlug(page.slug); setError(''); setEditing(true); }}>
        <strong>{page.title}</strong> <Pencil size={12} />
      </button>
    );
  }

  const save = () => {
    const cleanTitle = title.trim();
    const cleanSlug = slugify(slug);
    if (!cleanTitle) { setError('Title is required.'); return; }
    if (!cleanSlug) { setError('Slug is required.'); return; }
    setSaving(true);
    setError('');
    apiRequest('PATCH', { title: cleanTitle, slug: cleanSlug }, `/business/site-pages/${page.id}`)
      .then((updated) => { onRenamed(updated); setEditing(false); })
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not save.'))
      .finally(() => setSaving(false));
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 10, flexWrap: 'wrap' }}>
      <input className="gs-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Page title" style={{ width: 160 }} />
      <span style={{ fontSize: 12, color: 'var(--muted)' }}>/</span>
      <input className="gs-input" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="url-slug" style={{ width: 140 }} />
      <button type="button" className="sb-icon-btn" disabled={saving} onClick={save}><Check size={13} /></button>
      <button type="button" className="sb-icon-btn" onClick={() => setEditing(false)}><X size={13} /></button>
      {error && <span style={{ fontSize: 12, color: 'var(--danger, #b42318)' }}>{error}</span>}
    </div>
  );
}

export default function PageEditor({ businessId, pageId, subdomain, onClose }) {
  const [page, setPage] = useState(null);
  const [sections, setSections] = useState([]);
  const [selected, setSelected] = useState({ sectionId: null, blockId: null });
  // null | 'nav' | 'footer' -- mutually exclusive with a selected block
  // (see the click handlers below), so only one overlay panel is ever
  // open at a time.
  const [chromeSelected, setChromeSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  // The site's own theme/nav_links/footer_text/footer_links/name/logo, read
  // straight from the OWNER-authenticated GET /business/businesses/:id/site
  // -- the same endpoint SiteBuilderTab/ThemePanel already use, and already
  // proven to both save and read back correctly. This used to come from
  // useSiteChrome(subdomain), which hits the PUBLIC by-subdomain lookup --
  // that endpoint only ever serves a *published* site (404 otherwise, by
  // design: a stranger shouldn't be able to tell "draft" apart from
  // "doesn't exist"). Every site starts in Draft, so while building, that
  // 404 meant this preview's theme/nav/footer never loaded at all, and any
  // change made via ChromeInspector below -- even though the PATCH itself
  // genuinely saved -- never showed up here, looking exactly like "doesn't
  // save." Fetching owner-side instead removes that gate entirely for the
  // person who's actually allowed to see their own in-progress site.
  const [site, setSite] = useState(null);
  const inspectorRef = useRef(null);

  useEffect(() => {
    apiRequest('GET', null, `/business/businesses/${businessId}/site`).then(setSite).catch(() => {});
  }, [businessId]);

  const effectiveTheme = { ...DEFAULT_THEME, ...(site?.theme) };
  const effectiveNavLinks = site?.nav_links ?? [];
  const effectiveFooterText = site?.footer_text ?? '';
  const effectiveFooterLinks = site?.footer_links ?? [];

  // The inspector is now a fixed overlay (see site-builder.css), so it's
  // always already in view the moment it opens -- this effect is kept only
  // for the rare case its own content is tall enough to need scrolling
  // into view within itself.
  useEffect(() => {
    if ((selected.blockId || chromeSelected) && inspectorRef.current) {
      inspectorRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.blockId, chromeSelected]);

  // One generic site-level PATCH used by the AI assistant's theme changes,
  // the chrome preview's navbar/footer settings, and anything else at this
  // level -- patch is a subset of {theme, nav_links, footer_text,
  // footer_links}. Updates local `site` state from the PATCH response
  // itself (same pattern ThemePanel/SiteBuilderTab already use), instead of
  // a separate speculative local override -- one source of truth, and it's
  // the server's own merged result (the backend already merges theme
  // patches onto the existing one, so a lone buttonStyle change can't wipe
  // out palette/fontPairing -- re-deriving that merge logic a second time
  // here would be redundant and could drift out of sync with it).
  const patchSite = (patch) => {
    apiRequest('PATCH', patch, `/business/businesses/${businessId}/site`)
      .then((d) => { setSite(d); setError(''); })
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not save -- try again.'));
  };

  useEffect(() => {
    apiRequest('GET', null, `/business/site-pages/${pageId}/draft`)
      .then((data) => { setPage(data.page); setSections(data.sections || []); })
      .catch(() => setError('Could not load this page.'));
  }, [pageId]);

  const saveDraft = () => {
    setSaving(true);
    setError('');
    return apiRequest('PUT', { sections }, `/business/site-pages/${pageId}/draft`)
      .then((data) => { setPage(data.page); setSavedAt(new Date()); return data; })
      .catch((err) => { setError(typeof err === 'string' ? err : 'Could not save.'); throw err; })
      .finally(() => setSaving(false));
  };

  const publish = () => {
    saveDraft()
      .then(() => apiRequest('POST', {}, `/business/site-pages/${pageId}/publish`))
      .then(setPage)
      .catch((err) => { if (typeof err === 'string') setError(err); });
  };

  const unpublish = () => {
    apiRequest('POST', {}, `/business/site-pages/${pageId}/unpublish`)
      .then(setPage)
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not unpublish -- try again.'));
  };

  if (error && !page) return <div className="gs-error-box">{error}</div>;
  if (!page) return <div className="gs-loading"><div className="gs-spinner" /></div>;

  const selectedSection = sections.find((s) => s.id === selected.sectionId);
  const selectedBlock = selectedSection?.blocks.find((b) => b.id === selected.blockId);

  return (
    <div className="sb-editor">
      <div className="sb-editor-toolbar">
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={onClose}><ArrowLeft size={14} /> Back to pages</button>
        <PageRenameControl page={page} onRenamed={setPage} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {savedAt && <span style={{ fontSize: 12, color: 'var(--muted)' }}>Saved {savedAt.toLocaleTimeString()}</span>}
          <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => { setSelected({ sectionId: null, blockId: null }); setChromeSelected('seo'); }}>
            <Search size={14} /> SEO
          </button>
          <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" disabled={saving} onClick={saveDraft}>
            <Save size={14} /> Save draft
          </button>
          {page.status === 'published' && (
            <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={unpublish}>
              <EyeOff size={14} /> Unpublish
            </button>
          )}
          <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setPreviewOpen(true)}>
            <Monitor size={14} /> Preview
          </button>
          <button type="button" className="gs-btn gs-btn-sm" disabled={saving} onClick={publish}>
            <UploadCloud size={14} /> Publish
          </button>
        </div>
      </div>

      {error && <div className="gs-error-box">{error}</div>}

      <AiAssistantPanel
        sections={sections}
        onSectionsChange={setSections}
        theme={effectiveTheme}
        onThemeChange={(newTheme) => patchSite({ theme: newTheme })}
      />

      <div className={`sb-editor-body${(selectedBlock || chromeSelected) ? ' sb-body-inspector-open' : ''}`}>
        <div className="sb-editor-canvas-wrap sb-theme" style={themeToCssVars(effectiveTheme)}>
          <NavPreview
            theme={effectiveTheme}
            navLinks={effectiveNavLinks}
            businessName={site?.name}
            selected={chromeSelected === 'nav'}
            onSelect={() => { setSelected({ sectionId: null, blockId: null }); setChromeSelected('nav'); }}
          />
          <Canvas
            sections={sections}
            onChange={setSections}
            selected={selected.sectionId ? selected : null}
            onSelect={(sectionId, blockId) => { setChromeSelected(null); setSelected({ sectionId, blockId }); }}
            subdomain={subdomain}
            businessId={businessId}
            theme={effectiveTheme}
            enabledModules={site?.enabled_modules}
          />
          <FooterPreview
            theme={effectiveTheme}
            footerText={effectiveFooterText}
            footerLinks={effectiveFooterLinks}
            businessName={site?.name}
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
                businessId={businessId}
                block={selectedBlock}
                onChange={(updatedBlock) => setSections(sections.map((s) => (s.id !== selectedSection.id ? s : {
                  ...s, blocks: s.blocks.map((b) => (b.id === updatedBlock.id ? updatedBlock : b)),
                })))}
                onClose={() => setSelected({ sectionId: null, blockId: null })}
              />
            ) : chromeSelected === 'seo' ? (
              <SeoInspector
                page={page}
                onSaved={setPage}
                onClose={() => setChromeSelected(null)}
              />
            ) : (
              <ChromeInspector
                mode={chromeSelected}
                theme={effectiveTheme}
                navLinks={effectiveNavLinks}
                footerText={effectiveFooterText}
                footerLinks={effectiveFooterLinks}
                onChangeTheme={(patch) => patchSite({ theme: patch })}
                onChangeNavLinks={(links) => patchSite({ nav_links: links })}
                onChangeFooterText={(text) => patchSite({ footer_text: text })}
                onChangeFooterLinks={(links) => patchSite({ footer_links: links })}
                onClose={() => setChromeSelected(null)}
              />
            )}
          </div>
        </>
      )}

      {previewOpen && (
        <DevicePreviewModal
          sections={sections}
          subdomain={subdomain}
          businessId={businessId}
          theme={effectiveTheme}
          enabledModules={site?.enabled_modules}
          navLinks={effectiveNavLinks}
          footerText={effectiveFooterText}
          footerLinks={effectiveFooterLinks}
          businessName={site?.name}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
}
