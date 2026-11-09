import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Mail, Copy, X as XIcon } from 'lucide-react';
import apiRequest from '../../ApiRequest';
import PageEditor from './PageEditor';
import { BLOCK_DEFS, newBlockId } from './blocks/blockDefs';

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '');

function NewPageForm({ businessId, onCreated, onCancel }) {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [isHome, setIsHome] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    apiRequest('POST', { title, slug: slug ? slugify(slug) : slugify(title), is_home: isHome }, `/business/businesses/${businessId}/site-pages`)
      .then(onCreated)
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not create page.'))
      .finally(() => setSaving(false));
  };

  return (
    <form onSubmit={submit} className="sb-new-page-form">
      {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13 }}>{error}</p>}
      <input className="gs-input" placeholder="Page title (e.g. About Us)" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
      <input className="gs-input" placeholder="URL slug (optional, e.g. about)" value={slug} onChange={(e) => setSlug(e.target.value)} />
      <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
        <input type="checkbox" checked={isHome} onChange={(e) => setIsHome(e.target.checked)} /> Make this the home page
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="gs-btn gs-btn-sm" disabled={saving || !title.trim()}>Create</button>
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

/** Same component shape as NewPageForm above, just pre-filled and PATCHing
 * instead of POSTing -- PATCH /site-pages/:id handles the rename itself. */
function PageRenameForm({ page, onSaved, onCancel }) {
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    const cleanSlug = slugify(slug);
    if (!cleanTitle || !cleanSlug) { setError('Title and slug are both required.'); return; }
    setSaving(true);
    setError('');
    apiRequest('PATCH', { title: cleanTitle, slug: cleanSlug }, `/business/site-pages/${page.id}`)
      .then(onSaved)
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not save.'))
      .finally(() => setSaving(false));
  };

  return (
    <form onSubmit={submit} className="sb-new-page-form">
      {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13 }}>{error}</p>}
      <input className="gs-input" placeholder="Page title" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
      <input className="gs-input" placeholder="URL slug" value={slug} onChange={(e) => setSlug(e.target.value)} required />
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="gs-btn gs-btn-sm" disabled={saving}>Save</button>
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

/**
 * The "Pages" section tab of the website workspace (see SiteBuilderTab.js).
 * A tab per page across the top -- click to switch, × to delete (with the
 * same window.confirm this app already uses for every other destructive
 * action, see e.g. BusinessOwnerTools.js's own delete flows), + to add --
 * instead of the old separate "pick a page from a list, then the whole
 * screen becomes that page's editor with no way back except one button."
 * The actual canvas/toolbar/inspector below the tabs is still exactly
 * PageEditor.js, just re-keyed per page so switching tabs cleanly remounts
 * it (reusing its own existing load-on-mount effect, no new plumbing).
 *
 * Listens for 'gs-site-ai-updated' (dispatched by SiteAiAssistant.js after
 * it saves new drafts for one or more pages -- same "custom window event
 * instead of prop-drilling" convention ProductBlocks.js already uses for
 * ProductsPanel->canvas updates) so a page the AI just rewrote refreshes
 * immediately if it happens to be the one currently open, instead of
 * silently showing stale content until a manual reload.
 */
export default function WebsitePagesPanel({ businessId, subdomain, site, pages, onPagesChanged, onNavChange }) {
  const [activePageId, setActivePageId] = useState(null);
  const [newPageOpen, setNewPageOpen] = useState(false);
  const [renamingPageId, setRenamingPageId] = useState(null);
  const [pagesError, setPagesError] = useState('');
  const [remountNonce, setRemountNonce] = useState(0);
  // Which page a just-finished create/duplicate should land on --
  // onPagesChanged (the parent's loadPages) takes no args and just
  // re-fetches the list, so the page to select once that new list
  // arrives is tracked here instead.
  const [pendingActiveId, setPendingActiveId] = useState(undefined);

  // Keeps activePageId valid as `pages` changes underneath it (a reload
  // after create/duplicate/delete, or a rename changing nothing about
  // which page is active) -- defaults to the home page, or the first
  // page, the first time pages actually loads.
  useEffect(() => {
    if (pendingActiveId !== undefined) {
      setActivePageId(pendingActiveId);
      setPendingActiveId(undefined);
      return;
    }
    setActivePageId((cur) => {
      if (cur && pages.some((p) => p.id === cur)) return cur;
      return (pages.find((p) => p.is_home) || pages[0] || {}).id ?? null;
    });
  }, [pages]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onAiUpdated = (e) => {
      if (e.detail?.pageIds?.includes(activePageId)) setRemountNonce((n) => n + 1);
    };
    window.addEventListener('gs-site-ai-updated', onAiUpdated);
    return () => window.removeEventListener('gs-site-ai-updated', onAiUpdated);
  }, [activePageId]);

  const reload = (preferPageId) => { setPendingActiveId(preferPageId); onPagesChanged(); };

  const activePage = pages.find((p) => p.id === activePageId) || null;
  const hasContactPage = pages.some((p) => p.slug === 'contact');
  const pagePath = (page) => (page.is_home ? '/' : `/${page.slug}`);
  const isInNav = (page) => (site.nav_links || []).some((l) => l.path === pagePath(page));
  const toggleNav = (page) => {
    const links = site.nav_links || [];
    const path = pagePath(page);
    const next = isInNav(page) ? links.filter((l) => l.path !== path) : [...links, { label: page.title, path }];
    onNavChange(next);
  };

  // A pre-populated page, not just a bare "form" block sitting unused in
  // the palette -- one click instead of a blank page + manually adding/
  // placing the block.
  const addContactPage = () => {
    apiRequest('POST', { title: 'Contact', slug: 'contact', is_home: false }, `/business/businesses/${businessId}/site-pages`)
      .then((p) => {
        const formDef = BLOCK_DEFS.form;
        const sections = [{
          id: newBlockId('section'),
          background: { type: 'color', value: 'transparent' },
          padding: { top: 32, bottom: 32 },
          blocks: [{
            id: newBlockId('block'), type: 'form',
            x: 30, y: 10, w: formDef.defaultSize.w, h: formDef.defaultSize.h,
            z: 0, content: { ...formDef.defaultContent }, mobileLayout: null,
          }],
        }];
        return apiRequest('PUT', { sections }, `/business/site-pages/${p.id}/draft`).then(() => p);
      })
      .then((p) => reload(p.id))
      .catch((err) => setPagesError(typeof err === 'string' ? err : 'Could not create the contact page.'));
  };

  // Building a new page from an existing one's layout instead of starting
  // blank every time. Always a (non-home) page with a unique "<title>
  // Copy[ N]" slug; starts unpublished regardless of the source's own
  // status, so duplicating a live page never silently publishes a copy.
  const duplicatePage = (page) => {
    setPagesError('');
    apiRequest('GET', null, `/business/site-pages/${page.id}/draft`)
      .then(({ sections }) => {
        const existingSlugs = new Set(pages.map((p) => p.slug));
        let candidate = `${page.slug}-copy`;
        let i = 2;
        while (existingSlugs.has(candidate)) { candidate = `${page.slug}-copy-${i}`; i += 1; }
        return apiRequest('POST', { title: `${page.title} Copy`, slug: candidate, is_home: false }, `/business/businesses/${businessId}/site-pages`)
          .then((created) => apiRequest('PUT', { sections }, `/business/site-pages/${created.id}/draft`).then(() => created));
      })
      .then((created) => reload(created.id))
      .catch((err) => setPagesError(typeof err === 'string' ? err : 'Could not duplicate that page.'));
  };

  const deletePage = (page) => {
    const warning = page.is_home
      ? `"${page.title}" is your Home page -- deleting it leaves your site with no home page until you set another one. This can't be undone.`
      : `Delete "${page.title}"? This can't be undone.`;
    if (!window.confirm(warning)) return;
    setPagesError('');
    apiRequest('DELETE', null, `/business/site-pages/${page.id}`)
      .then(() => reload())
      .catch((err) => setPagesError(typeof err === 'string' ? err : 'Could not delete that page -- try again.'));
  };

  return (
    <div className="sb-pages-tab">
      {pagesError && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13 }}>{pagesError}</p>}

      <div className="sb-page-tabs">
        {pages.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`sb-page-tab${p.id === activePageId ? ' active' : ''}`}
            onClick={() => setActivePageId(p.id)}
          >
            <span>{p.title}{p.is_home && <span className="sb-page-tab-badge">Home</span>}</span>
            <span
              className="sb-page-tab-close"
              role="button"
              tabIndex={0}
              title="Delete this page"
              onClick={(e) => { e.stopPropagation(); deletePage(p); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); deletePage(p); } }}
            >
              <XIcon size={12} />
            </span>
          </button>
        ))}
        <button type="button" className="sb-page-tab sb-page-tab-add" title="Add a page" onClick={() => setNewPageOpen((o) => !o)}>
          <Plus size={14} />
        </button>
        {!hasContactPage && (
          <button type="button" className="sb-page-tab sb-page-tab-add" title="Add a contact page" onClick={addContactPage}>
            <Mail size={14} />
          </button>
        )}
      </div>

      {newPageOpen && (
        <NewPageForm
          businessId={businessId}
          onCreated={(p) => { setNewPageOpen(false); reload(p.id); }}
          onCancel={() => setNewPageOpen(false)}
        />
      )}

      {!activePage && !newPageOpen && (
        <p className="gs-empty">No pages yet -- add your home page to get started.</p>
      )}

      {activePage && (
        <>
          {renamingPageId === activePage.id ? (
            <PageRenameForm
              page={activePage}
              onSaved={() => { setRenamingPageId(null); reload(activePage.id); }}
              onCancel={() => setRenamingPageId(null)}
            />
          ) : (
            <div className="sb-page-actions-row">
              {!activePage.is_home && (
                <button type="button" className={`gs-btn gs-btn-sm ${isInNav(activePage) ? '' : 'gs-btn-outline'}`}
                  title={isInNav(activePage) ? 'Remove from your site\'s navigation menu' : 'Add to your site\'s navigation menu'}
                  onClick={() => toggleNav(activePage)}>
                  {isInNav(activePage) ? 'In menu' : '+ Add to menu'}
                </button>
              )}
              <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setRenamingPageId(activePage.id)}>
                <Pencil size={13} /> Rename
              </button>
              <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => duplicatePage(activePage)}>
                <Copy size={13} /> Duplicate
              </button>
              <span className="sb-page-status-note">
                /{activePage.slug} · {activePage.status === 'published' ? (activePage.has_draft_changes ? 'Published (unsaved changes)' : 'Published') : 'Draft'}
              </span>
            </div>
          )}

          <PageEditor key={`${activePage.id}-${remountNonce}`} businessId={businessId} pageId={activePage.id} subdomain={subdomain} />
        </>
      )}
    </div>
  );
}
