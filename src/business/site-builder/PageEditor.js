import React, { useEffect, useRef, useState } from 'react';
import { Save, UploadCloud, EyeOff, Monitor, Pencil, Check, X, Search, Undo2, Redo2 } from 'lucide-react';
import apiRequest from '../../ApiRequest';
import Canvas from './Canvas';
import BlockInspector from './BlockInspector';
import ChromeInspector from './ChromeInspector';
import SeoInspector from './SeoInspector';
import { NavPreview, FooterPreview } from './ChromePreview';
import DevicePreviewModal from './DevicePreviewModal';
import useHistoryState from './useHistoryState';
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

export default function PageEditor({ businessId, pageId, subdomain, site, onSiteUpdate }) {
  const [page, setPage] = useState(null);
  const [sections, setSections, sectionsHistory] = useHistoryState([]);
  const [selected, setSelected] = useState({ sectionId: null, blockId: null });
  // null | 'nav' | 'footer' -- mutually exclusive with a selected block
  // (see the click handlers below), so only one overlay panel is ever
  // open at a time.
  const [chromeSelected, setChromeSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  // The site's own theme/nav_links/footer_text/footer_links/name/logo --
  // passed down from SiteBuilderTab (the one place that fetches it) as
  // `site`/`onSiteUpdate` instead of this component fetching its own
  // separate copy. It used to: that second copy only ever synced back up
  // with ThemePanel/SiteAiAssistant's changes when this component
  // happened to fully remount (switching pages, reopening the tab), which
  // is exactly why a theme-only AI edit or a ThemePanel change didn't
  // show up here immediately -- two independent `site` states, kept in
  // sync only by accident. One shared state fixes that for every source
  // of a site-level change, not just the one that prompted this.
  const inspectorRef = useRef(null);

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

  // One generic site-level PATCH used by the chrome preview's navbar/
  // footer settings and anything else at this level -- patch is a subset
  // of {theme, nav_links, footer_text, footer_links}. Reports the PATCH
  // response up through onSiteUpdate (the server's own merged result,
  // same as ThemePanel/SiteBuilderTab already do) instead of keeping a
  // separate local copy -- see the `site` prop's own comment above.
  const patchSite = (patch) => {
    apiRequest('PATCH', patch, `/business/businesses/${businessId}/site`)
      .then((d) => { onSiteUpdate(d); setError(''); })
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not save -- try again.'));
  };

  useEffect(() => {
    apiRequest('GET', null, `/business/site-pages/${pageId}/draft`)
      .then((data) => { setPage(data.page); sectionsHistory.reset(data.sections || []); })
      .catch(() => setError('Could not load this page.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId]);

  // SiteAiAssistant.js dispatches this after it saves new drafts for one
  // or more pages (same "custom window event instead of prop-drilling"
  // convention ProductBlocks.js uses for ProductsPanel->canvas updates).
  // Pulls the AI's new sections in as one more history step (setSections,
  // not sectionsHistory.reset) specifically so Ctrl+Z still has the
  // pre-AI version to go back to -- a full reset here would wipe that
  // out, which is exactly what force-remounting this component used to do
  // before this listener existed.
  useEffect(() => {
    const onAiUpdated = (e) => {
      if (!e.detail?.pageIds?.includes(pageId)) return;
      apiRequest('GET', null, `/business/site-pages/${pageId}/draft`)
        .then((data) => { setPage(data.page); setSections(data.sections || [], { commit: true }); })
        .catch(() => {});
    };
    window.addEventListener('gs-site-ai-updated', onAiUpdated);
    return () => window.removeEventListener('gs-site-ai-updated', onAiUpdated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId]);

  // Ctrl/Cmd+Z to undo, Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y to redo -- skipped
  // while focus is inside a text input/textarea (the inspector's own
  // fields) so this doesn't fight the browser's native text-undo there.
  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
      const mod = e.ctrlKey || e.metaKey;
      if (!mod || e.key.toLowerCase() !== 'z' && e.key.toLowerCase() !== 'y') return;
      if (e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); sectionsHistory.undo(); }
      else if (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey)) { e.preventDefault(); sectionsHistory.redo(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sectionsHistory]);

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
        <PageRenameControl page={page} onRenamed={setPage} />
        <div style={{ display: 'flex', gap: 2, marginLeft: 10 }}>
          <button type="button" className="sb-icon-btn" title="Undo (Ctrl+Z)" disabled={!sectionsHistory.canUndo} onClick={sectionsHistory.undo}><Undo2 size={15} /></button>
          <button type="button" className="sb-icon-btn" title="Redo (Ctrl+Shift+Z)" disabled={!sectionsHistory.canRedo} onClick={sectionsHistory.redo}><Redo2 size={15} /></button>
        </div>
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
                history={sectionsHistory}
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
