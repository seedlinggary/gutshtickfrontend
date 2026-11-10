import React, { useState } from 'react';
import { X, ArrowLeft, ArrowRight, RotateCcw, Sparkles } from 'lucide-react';
import apiRequest from '../../ApiRequest';
import UploadFile from '../../Uploadfile';
import { DomainPanel } from './SiteBuilderTab';
import PaymentsPanel from './PaymentsPanel';
import { GoogleCalendarSection } from './BookingsPanel';
import { GreenInvoiceSettings } from './InvoicesPanel';

const STEPS = ['Domain & payments', 'Google Calendar', 'Green Invoice', 'Favicon'];

function FaviconStep({ businessId, site, onSiteUpdate }) {
  const patchChrome = (patch) => apiRequest('PATCH', patch, `/business/businesses/${businessId}/site`).then(onSiteUpdate);
  return (
    <div className="gs-field">
      <div className="gs-label">Browser tab icon (optional)</div>
      <p style={{ color: 'var(--muted)', fontSize: 13 }}>
        A small square image shown in the browser tab and when the site's link is shared. Skip this if you don't have one ready -- it's also in the Theme tab anytime.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {site.favicon_url && <img src={site.favicon_url} alt="" style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border, #e5e1d6)' }} />}
        <UploadFile apiextension="/business/upload" setInvestors={(filename) =>
          apiRequest('GET', null, `/business/upload-url/${filename}`).then(({ url }) => patchChrome({ favicon_url: url }))} />
        {site.favicon_url && (
          <button type="button" className="sb-icon-btn" onClick={() => patchChrome({ favicon_url: null })}><RotateCcw size={12} /></button>
        )}
      </div>
    </div>
  );
}

/** Shown once per site (gated on !site.setup_wizard_dismissed in
 * SiteBuilderTab.js) and reachable anytime after via the "Setup" section
 * tab -- see that file's own comment on SECTIONS for why reopening never
 * un-dismisses it. Each step just mounts the real, already-built panel for
 * that piece (DomainPanel/PaymentsPanel already existed; the Calendar/
 * Green Invoice sections are shared with their own tabs via the named
 * exports above) rather than duplicating any of their logic here. */
export default function WebsiteSetupWizard({ businessId, site, onSiteUpdate, onClose }) {
  const [step, setStep] = useState(0);
  const last = step === STEPS.length - 1;

  const finish = () => {
    apiRequest('PATCH', { setup_wizard_dismissed: true }, `/business/businesses/${businessId}/site`)
      .then(onSiteUpdate)
      .finally(onClose);
  };

  return (
    <div className="gs-card" style={{ marginBottom: 16, border: '1px solid var(--accent, #2f6f4f)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}><Sparkles size={18} /> Finish setting up your site</h3>
        <button type="button" className="sb-icon-btn" onClick={finish} title="Skip for now"><X size={16} /></button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {STEPS.map((label, i) => (
          <span key={label} style={{
            fontSize: 12, padding: '3px 10px', borderRadius: 999,
            background: i === step ? 'var(--accent, #2f6f4f)' : 'var(--border, #e5e1d6)',
            color: i === step ? '#fff' : 'var(--muted)',
          }}>
            {i + 1}. {label}
          </span>
        ))}
      </div>

      {step === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <DomainPanel businessId={businessId} site={site} onSiteUpdate={onSiteUpdate} />
          <PaymentsPanel businessId={businessId} />
        </div>
      )}
      {step === 1 && <GoogleCalendarSection businessId={businessId} />}
      {step === 2 && <GreenInvoiceSettings businessId={businessId} />}
      {step === 3 && <FaviconStep businessId={businessId} site={site} onSiteUpdate={onSiteUpdate} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
          <ArrowLeft size={14} /> Back
        </button>
        {last ? (
          <button type="button" className="gs-btn gs-btn-sm" onClick={finish}>Finish</button>
        ) : (
          <button type="button" className="gs-btn gs-btn-sm" onClick={() => setStep((s) => s + 1)}>
            Next <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
