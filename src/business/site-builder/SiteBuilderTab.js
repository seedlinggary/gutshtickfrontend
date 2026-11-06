import React, { useEffect, useState } from 'react';
import { Globe, Plus, Pencil, Trash2, Settings as SettingsIcon, Mail, Users, Link2, Check, X as XIcon, Copy } from 'lucide-react';
import apiRequest from '../../ApiRequest';
import NonprofitOwnerPanel from '../nonprofit/NonprofitOwnerPanel';
import PageEditor from './PageEditor';
import PaymentsPanel from './PaymentsPanel';
import ProductsPanel from './ProductsPanel';
import BookingsPanel from './BookingsPanel';
import CrmPanel from './CrmPanel';
import InvoicesPanel from './InvoicesPanel';
import ThemePanel from './ThemePanel';
import TemplatesPanel from './TemplatesPanel';
import { BLOCK_DEFS, newBlockId } from './blocks/blockDefs';
import './site-builder.css';

function SubdomainEditor({ site, onSave, saving }) {
  const [value, setValue] = useState(site.subdomain);
  const dirty = value !== site.subdomain;
  return (
    <div className="gs-field">
      <div className="gs-label">Subdomain</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input className="gs-input" value={value} onChange={(e) => setValue(e.target.value.toLowerCase())} style={{ maxWidth: 220 }} />
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>.yourdomain.com</span>
        {dirty && (
          <button type="button" className="gs-btn gs-btn-sm" disabled={saving} onClick={() => onSave(value)}>Save</button>
        )}
      </div>
    </div>
  );
}

/** Lets an owner point their OWN domain (one they already own elsewhere --
 * "www.shmuelsbakery.com", not a *.gutcommunity.com subdomain) at their
 * site, instead of only ever being reachable at the free subdomain.
 * Three states, driven entirely by site.custom_domain_status:
 *  - no custom_domain set: just the "connect a domain" form.
 *  - 'pending': domain is saved but NOT live yet -- shows the DNS records
 *    to publish and a Verify button. An owner can leave this half-finished
 *    indefinitely with zero effect on their live subdomain site.
 *  - 'verified': ownership is proven; the domain will start working once
 *    DNS is pointed at this app (see the note in the verified state) --
 *    getting the domain actually added to the hosting project itself is
 *    still a manual step today (same category of one-time infra setup as
 *    the wildcard subdomain base domain itself), not something this panel
 *    can trigger on its own. */
function DomainPanel({ businessId, site, onSiteUpdate }) {
  const [domain, setDomain] = useState('');
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [copied, setCopied] = useState(false);

  const connect = (e) => {
    e.preventDefault();
    const clean = domain.trim().toLowerCase();
    if (!clean) return;
    setSaving(true);
    setError('');
    apiRequest('POST', { domain: clean }, `/business/businesses/${businessId}/site/domain`)
      .then((updated) => { onSiteUpdate(updated); setDomain(''); })
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not connect that domain.'))
      .finally(() => setSaving(false));
  };

  const verify = () => {
    setVerifying(true);
    setVerifyError('');
    apiRequest('POST', {}, `/business/businesses/${businessId}/site/domain/verify`)
      .then(onSiteUpdate)
      .catch((err) => setVerifyError(typeof err === 'string' ? err : 'Not verified yet -- try again in a bit.'))
      .finally(() => setVerifying(false));
  };

  const remove = () => {
    if (!window.confirm(`Disconnect ${site.custom_domain}? Your site stays reachable at your free subdomain either way.`)) return;
    apiRequest('DELETE', null, `/business/businesses/${businessId}/site/domain`).then(onSiteUpdate);
  };

  const copyValue = (value) => {
    navigator.clipboard?.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };

  if (!site.custom_domain) {
    return (
      <div className="gs-field" style={{ marginTop: 14 }}>
        <div className="gs-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Link2 size={14} /> Use your own domain</div>
        <p style={{ fontSize: 12, color: 'var(--muted)', margin: '2px 0 8px' }}>
          Already own a domain (like www.yourbusiness.com)? Connect it here instead of using the free subdomain above.
        </p>
        <form onSubmit={connect} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input className="gs-input" placeholder="www.yourbusiness.com" value={domain} onChange={(e) => setDomain(e.target.value)} style={{ maxWidth: 260 }} />
          <button type="submit" className="gs-btn gs-btn-sm" disabled={saving || !domain.trim()}>Connect</button>
        </form>
        {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13, marginTop: 6 }}>{error}</p>}
      </div>
    );
  }

  const record = site.custom_domain_verify_record;

  return (
    <div className="gs-field" style={{ marginTop: 14 }}>
      <div className="gs-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Link2 size={14} /> Custom domain</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
        <strong>{site.custom_domain}</strong>
        {site.custom_domain_status === 'verified' ? (
          <span className="admin-badge approved" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Check size={12} /> Verified</span>
        ) : (
          <span className="admin-badge pending" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>Pending verification</span>
        )}
        <button type="button" className="sb-icon-btn" title="Disconnect" onClick={remove}><XIcon size={14} /></button>
      </div>

      {site.custom_domain_status !== 'verified' && record && (
        <div style={{ marginTop: 10, fontSize: 13 }}>
          <p style={{ margin: '0 0 6px' }}>To prove you own this domain, add this TXT record at your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.):</p>
          <table style={{ fontSize: 12, borderCollapse: 'collapse', marginBottom: 8 }}>
            <tbody>
              <tr><td style={{ padding: '2px 8px 2px 0', color: 'var(--muted)' }}>Type</td><td><code>TXT</code></td></tr>
              <tr>
                <td style={{ padding: '2px 8px 2px 0', color: 'var(--muted)' }}>Host</td>
                <td><code>{record.host}</code> <button type="button" className="sb-icon-btn" onClick={() => copyValue(record.host)}><Copy size={11} /></button></td>
              </tr>
              <tr>
                <td style={{ padding: '2px 8px 2px 0', color: 'var(--muted)', verticalAlign: 'top' }}>Value</td>
                <td><code>{record.value}</code> <button type="button" className="sb-icon-btn" onClick={() => copyValue(record.value)}><Copy size={11} /></button></td>
              </tr>
            </tbody>
          </table>
          <p style={{ margin: '0 0 8px', color: 'var(--muted)' }}>DNS changes can take anywhere from a few minutes to about a day to show up.</p>
          <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" disabled={verifying} onClick={verify}>
            {verifying ? 'Checking…' : 'Verify now'}
          </button>
          {copied && <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8 }}>Copied</span>}
          {verifyError && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13, marginTop: 6 }}>{verifyError}</p>}
        </div>
      )}

      {site.custom_domain_status === 'verified' && (
        <div style={{ marginTop: 10, fontSize: 13 }}>
          <p style={{ margin: '0 0 6px' }}>Ownership confirmed. Last step: point the domain's DNS at this app so visitors actually reach it --</p>
          <ul style={{ margin: '0 0 8px', paddingLeft: 18, color: 'var(--muted)' }}>
            <li>If it's a subdomain (like <code>www.yourbusiness.com</code>): add a <strong>CNAME</strong> record pointing to <code>cname.vercel-dns.com</code></li>
            <li>If it's your bare root domain (like <code>yourbusiness.com</code>): add an <strong>A</strong> record pointing to <code>76.76.21.21</code></li>
          </ul>
          <p style={{ margin: 0, color: 'var(--muted)' }}>We also need to add this domain on our hosting side once -- message us and we'll finish turning it on.</p>
        </div>
      )}
    </div>
  );
}

/** Two separate, default-ON toggles (checked unless the owner opts out) --
 * surfacing a site's products/active discount codes onto the main Gut
 * Community feed via promo_sync.py. Deliberately NOT part of the generic
 * "Features" module grid below (every one of those defaults OFF) -- this
 * was an explicit, specific ask with its own default. */
function CommunitySharingToggles({ site, onToggle, saving }) {
  return (
    <div className="gs-field" style={{ marginTop: 14 }}>
      <div className="gs-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Users size={14} /> Share with the wider Gut Community</div>
      <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <input type="checkbox" checked={!!site.share_products_with_community} disabled={saving}
          onChange={(e) => onToggle({ share_products_with_community: e.target.checked })} />
        Share my products on the community feed
      </label>
      <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
        <input type="checkbox" checked={!!site.share_deals_with_community} disabled={saving}
          onChange={(e) => onToggle({ share_deals_with_community: e.target.checked })} />
        Share my discounts &amp; sales on the community feed
      </label>
    </div>
  );
}

function NewPageForm({ businessId, onCreated, onCancel }) {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [isHome, setIsHome] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '');

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
      <input className="gs-input" placeholder="Page title (e.g. About Us)" value={title} onChange={(e) => setTitle(e.target.value)} required />
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

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '');

/** Inline rename of a page's title/slug -- PATCH /site-pages/:id (new;
 * there was previously no way to change a slug at all, ever, after
 * creating the page). Same component shape as NewPageForm above, just
 * pre-filled and PATCHing instead of POSTing. */
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
      <input className="gs-input" placeholder="Page title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <input className="gs-input" placeholder="URL slug" value={slug} onChange={(e) => setSlug(e.target.value)} required />
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="gs-btn gs-btn-sm" disabled={saving}>Save</button>
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

/** Mounted as BusinessOwnerTools.js's 'site' tab. Settles into one of three
 * states: loading, the settings+pages list, or (while editingPageId is
 * set) the full-bleed PageEditor -- kept as local state here rather than a
 * route so the rest of BusinessOwnerTools' tab chrome (sidebar, header)
 * doesn't have to account for a page editor wanting the whole content
 * area to itself. */
export default function SiteBuilderTab({ businessId }) {
  const [site, setSite] = useState(null);
  const [pages, setPages] = useState(null);
  const [modules, setModules] = useState({});
  const [error, setError] = useState('');
  const [savingSite, setSavingSite] = useState(false);
  const [editingPageId, setEditingPageId] = useState(null);
  const [newPageOpen, setNewPageOpen] = useState(false);
  const [renamingPageId, setRenamingPageId] = useState(null);
  // Separate from `error` above -- that one gates the WHOLE tab (used
  // only for "couldn't load the site at all"), so a recoverable, in-
  // place failure like a failed page delete must not reuse it, or the
  // entire Pages list would vanish behind a full-page error box over a
  // single failed delete.
  const [pagesError, setPagesError] = useState('');

  const loadPages = () => apiRequest('GET', null, `/business/businesses/${businessId}/site-pages`).then((d) => setPages(d.pages)).catch(() => setPages([]));

  useEffect(() => {
    apiRequest('GET', null, `/business/businesses/${businessId}/site`).then(setSite).catch(() => setError('Could not load your site.'));
    loadPages();
    apiRequest('GET', null, '/business/site-modules').then((d) => setModules(d.modules)).catch(() => {});
  }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (editingPageId) {
    return (
      <PageEditor
        businessId={businessId}
        pageId={editingPageId}
        subdomain={site?.subdomain}
        onClose={() => { setEditingPageId(null); loadPages(); }}
      />
    );
  }

  if (error) return <div className="gs-error-box">{error}</div>;
  if (!site || !pages) return <div className="gs-loading"><div className="gs-spinner" /></div>;

  const patchSite = (patch) => {
    setSavingSite(true);
    return apiRequest('PATCH', patch, `/business/businesses/${businessId}/site`)
      .then(setSite)
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not save.'))
      .finally(() => setSavingSite(false));
  };

  const hasContactPage = pages.some((p) => p.slug === 'contact');

  // A pre-populated page, not just a bare "form" block type sitting
  // unused in the palette -- this is what "make sure each website has
  // the option to create a contact page" means concretely: one click
  // instead of a blank page + manually adding/placing the block.
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
      .then((p) => { loadPages(); setEditingPageId(p.id); })
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not create the contact page.'));
  };

  return (
    <div className="sb-tab">
      <div className="gs-card" style={{ marginBottom: 20 }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 0 }}><Globe size={18} /> Your site</h3>
        <SubdomainEditor site={site} saving={savingSite} onSave={(subdomain) => patchSite({ subdomain })} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
          <span style={{ fontSize: 13 }}>Site is <strong>{site.status === 'published' ? 'live' : 'in draft'}</strong></span>
          <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" disabled={savingSite}
            onClick={() => patchSite({ status: site.status === 'published' ? 'draft' : 'published' })}>
            {site.status === 'published' ? 'Take offline' : 'Go live'}
          </button>
        </div>
        <CommunitySharingToggles site={site} saving={savingSite} onToggle={patchSite} />
        <DomainPanel businessId={businessId} site={site} onSiteUpdate={setSite} />
      </div>

      <div style={{ marginBottom: 20 }}>
        <TemplatesPanel businessId={businessId} onApplied={loadPages} />
      </div>

      <div style={{ marginBottom: 20 }}>
        <ThemePanel businessId={businessId} site={site} onSiteUpdate={setSite} />
      </div>

      <div style={{ marginBottom: 20 }}>
        <PaymentsPanel businessId={businessId} />
      </div>

      <div className="gs-card" style={{ marginBottom: 20 }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 0 }}><SettingsIcon size={18} /> Features</h3>
        <div className="sb-module-grid">
          {Object.entries(modules).map(([key, cfg]) => (
            <label key={key} className="sb-module-toggle">
              <input type="checkbox" checked={!!site.enabled_modules[key]} disabled={savingSite}
                onChange={(e) => patchSite({ enabled_modules: { [key]: e.target.checked } })} />
              {cfg.label}
            </label>
          ))}
        </div>
      </div>

      {site.enabled_modules.nonprofit && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Users size={18} /> Nonprofit back office</h3>
          <NonprofitOwnerPanel businessId={businessId} />
        </div>
      )}

      {site.enabled_modules.products && (
        <div style={{ marginBottom: 20 }}>
          <ProductsPanel businessId={businessId} />
        </div>
      )}

      {site.enabled_modules.bookings && (
        <div style={{ marginBottom: 20 }}>
          <BookingsPanel businessId={businessId} />
        </div>
      )}

      {site.enabled_modules.crm && (
        <div style={{ marginBottom: 20 }}>
          <CrmPanel businessId={businessId} />
        </div>
      )}

      {site.enabled_modules.invoices && (
        <div style={{ marginBottom: 20 }}>
          <InvoicesPanel businessId={businessId} />
        </div>
      )}

      <div className="gs-card">
        {pagesError && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13 }}>{pagesError}</p>}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Pages</h3>
          {!newPageOpen && (
            <div style={{ display: 'flex', gap: 8 }}>
              {!hasContactPage && (
                <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={addContactPage}>
                  <Mail size={14} /> Add contact page
                </button>
              )}
              <button type="button" className="gs-btn gs-btn-sm" onClick={() => setNewPageOpen(true)}><Plus size={14} /> New page</button>
            </div>
          )}
        </div>

        {newPageOpen && (
          <NewPageForm
            businessId={businessId}
            onCreated={(p) => { setNewPageOpen(false); loadPages(); setEditingPageId(p.id); }}
            onCancel={() => setNewPageOpen(false)}
          />
        )}

        <div className="admin-list" style={{ marginTop: 12 }}>
          {pages.length === 0 && !newPageOpen && <p className="gs-empty">No pages yet -- add your home page to get started.</p>}
          {pages.map((p) => (
            <div key={p.id} className="admin-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {renamingPageId === p.id ? (
                <PageRenameForm
                  page={p}
                  onSaved={() => { setRenamingPageId(null); loadPages(); }}
                  onCancel={() => setRenamingPageId(null)}
                />
              ) : (
              <>
              <div>
                <strong>{p.title}</strong>{' '}
                {p.is_home && <span className="admin-badge approved">Home</span>}
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                  /{p.slug} · {p.status === 'published' ? (p.has_draft_changes ? 'Published (unsaved changes)' : 'Published') : 'Draft'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setEditingPageId(p.id)}>
                  <Pencil size={13} /> Edit
                </button>
                <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setRenamingPageId(p.id)}>
                  Rename
                </button>
                <button
                  type="button"
                  className="sb-icon-btn"
                  title="Delete"
                  onClick={() => {
                    const warning = p.is_home
                      ? `"${p.title}" is your Home page -- deleting it leaves your site with no home page until you set another one. This can't be undone.`
                      : `Delete "${p.title}"? This can't be undone.`;
                    if (!window.confirm(warning)) return;
                    setPagesError('');
                    apiRequest('DELETE', null, `/business/site-pages/${p.id}`)
                      .then(loadPages)
                      .catch((err) => setPagesError(typeof err === 'string' ? err : 'Could not delete that page -- try again.'));
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
