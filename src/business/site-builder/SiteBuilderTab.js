import React, { useEffect, useState } from 'react';
import {
  Globe, Settings as SettingsIcon, Users, Link2, Check, X as XIcon, Copy,
  FileText, Palette, LayoutTemplate, Sliders, CreditCard, ShoppingBag,
  CalendarDays, Receipt, ClipboardList, HeartHandshake, Sparkles,
} from 'lucide-react';
import apiRequest from '../../ApiRequest';
import NonprofitOwnerPanel from '../nonprofit/NonprofitOwnerPanel';
import WebsitePagesPanel from './WebsitePagesPanel';
import SiteAiAssistant from './SiteAiAssistant';
import PaymentsPanel from './PaymentsPanel';
import ProductsPanel from './ProductsPanel';
import BookingsPanel from './BookingsPanel';
import CrmPanel from './CrmPanel';
import InvoicesPanel from './InvoicesPanel';
import FormsPanel from './FormsPanel';
import ThemePanel from './ThemePanel';
import TemplatesPanel from './TemplatesPanel';
import WebsiteSetupWizard from './WebsiteSetupWizard';
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
export function DomainPanel({ businessId, site, onSiteUpdate }) {
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

// Every section this workspace can show -- `module` gates visibility on
// site.enabled_modules[module] (same flags the old always-stacked panels
// already checked); no `module` means always visible. Order here is the
// tab order. 'pages' is deliberately first/default -- it's the thing an
// owner actually does day to day, unlike Settings/Features which are
// occasional setup.
const SECTIONS = [
  { key: 'pages', label: 'Pages', Icon: FileText },
  { key: 'theme', label: 'Theme', Icon: Palette },
  { key: 'templates', label: 'Templates', Icon: LayoutTemplate },
  { key: 'settings', label: 'Settings', Icon: SettingsIcon },
  { key: 'features', label: 'Features', Icon: Sliders },
  { key: 'payments', label: 'Payments', Icon: CreditCard },
  { key: 'products', label: 'Products', Icon: ShoppingBag, module: 'products' },
  { key: 'bookings', label: 'Bookings', Icon: CalendarDays, module: 'bookings' },
  { key: 'crm', label: 'CRM', Icon: Users, module: 'crm' },
  { key: 'invoices', label: 'Invoices', Icon: Receipt, module: 'invoices' },
  { key: 'forms', label: 'Forms', Icon: ClipboardList, module: 'custom_forms' },
  { key: 'nonprofit', label: 'Nonprofit', Icon: HeartHandshake, module: 'nonprofit' },
];

/** Mounted as BusinessOwnerTools.js's 'site' tab. A small row of section
 * tabs (the owner's own suggestion for organizing what used to be one
 * long scroll of always-stacked panels) replaces the old single page;
 * the AI assistant floats over all of them (SiteAiAssistant.js), since it
 * can touch multiple pages/the theme at once and isn't tied to any one
 * section. */
export default function SiteBuilderTab({ businessId }) {
  const [site, setSite] = useState(null);
  const [pages, setPages] = useState(null);
  const [modules, setModules] = useState({});
  const [error, setError] = useState('');
  const [savingSite, setSavingSite] = useState(false);
  const [activeSection, setActiveSection] = useState('pages');
  const [showWizard, setShowWizard] = useState(false);

  // The one, shared list of pages -- WebsitePagesPanel (create/duplicate/
  // delete/rename) and SiteAiAssistant (needs every page's id/slug/title
  // to know what it can touch) both read it from here instead of each
  // keeping their own fetch, which would otherwise drift out of sync the
  // moment one of them changes a page the other doesn't know about yet.
  const loadPages = () => apiRequest('GET', null, `/business/businesses/${businessId}/site-pages`).then((d) => setPages(d.pages || [])).catch(() => setPages([]));

  useEffect(() => {
    apiRequest('GET', null, `/business/businesses/${businessId}/site`).then(setSite).catch(() => setError('Could not load your site.'));
    loadPages();
    apiRequest('GET', null, '/business/site-modules').then((d) => setModules(d.modules)).catch(() => {});
  }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <div className="gs-error-box">{error}</div>;
  if (!site) return <div className="gs-loading"><div className="gs-spinner" /></div>;

  const patchSite = (patch) => {
    setSavingSite(true);
    return apiRequest('PATCH', patch, `/business/businesses/${businessId}/site`)
      .then(setSite)
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not save.'))
      .finally(() => setSavingSite(false));
  };

  const visibleSections = SECTIONS.filter((s) => !s.module || site.enabled_modules?.[s.module]);
  const activeKey = visibleSections.some((s) => s.key === activeSection) ? activeSection : 'pages';
  const wizardVisible = showWizard || !site.setup_wizard_dismissed;

  return (
    <div className="sb-tab">
      {wizardVisible && (
        <WebsiteSetupWizard businessId={businessId} site={site} onSiteUpdate={setSite} onClose={() => setShowWizard(false)} />
      )}

      <div className="sb-section-tabs">
        {visibleSections.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            className={`sb-section-tab${key === activeKey ? ' active' : ''}`}
            onClick={() => setActiveSection(key)}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
        {!wizardVisible && (
          <button type="button" className="sb-section-tab" onClick={() => setShowWizard(true)}>
            <Sparkles size={14} /> Setup
          </button>
        )}
      </div>

      {activeKey === 'pages' && pages && (
        <WebsitePagesPanel
          businessId={businessId}
          subdomain={site.subdomain}
          site={site}
          onSiteUpdate={setSite}
          pages={pages}
          onPagesChanged={loadPages}
          onNavChange={(nav_links) => patchSite({ nav_links })}
        />
      )}

      {activeKey === 'theme' && <ThemePanel businessId={businessId} site={site} onSiteUpdate={setSite} />}

      {activeKey === 'templates' && <TemplatesPanel businessId={businessId} onApplied={loadPages} />}

      {activeKey === 'settings' && (
        <div className="gs-card">
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
      )}

      {activeKey === 'features' && (
        <div className="gs-card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 0 }}><Sliders size={18} /> Features</h3>
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
      )}

      {activeKey === 'payments' && <PaymentsPanel businessId={businessId} />}
      {activeKey === 'products' && <ProductsPanel businessId={businessId} />}
      {activeKey === 'bookings' && <BookingsPanel businessId={businessId} />}
      {activeKey === 'crm' && <CrmPanel businessId={businessId} />}
      {activeKey === 'invoices' && <InvoicesPanel businessId={businessId} />}
      {activeKey === 'forms' && <FormsPanel businessId={businessId} />}
      {activeKey === 'nonprofit' && <NonprofitOwnerPanel businessId={businessId} />}

      {pages && (
        <SiteAiAssistant businessId={businessId} pages={pages} theme={site.theme} onThemeChange={(theme) => patchSite({ theme })} />
      )}
    </div>
  );
}
