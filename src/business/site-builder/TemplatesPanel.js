import React, { useEffect, useState } from 'react';
import { LayoutTemplate, Check } from 'lucide-react';
import apiRequest from '../../ApiRequest';
import { THEME_PALETTES } from './theme';

function TemplateSwatch({ themeKey }) {
  const palette = THEME_PALETTES[themeKey] || THEME_PALETTES.warm;
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {['primary', 'secondary', 'background'].map((key) => (
        <span key={key} style={{ width: 14, height: 14, borderRadius: 3, background: palette[key], border: '1px solid rgba(0,0,0,0.1)' }} />
      ))}
    </div>
  );
}

/** Lets an owner apply a starter template -- a complete, multi-page site
 * (Home plus, for most templates, About/Services/Contact), not just a
 * home page -- instead of starting from a blank canvas. Always
 * available, not just on a brand-new site, since reaching for a fresh
 * look later is completely reasonable too. Applying only ever writes
 * new DRAFT versions (see site_templates.py's apply_template) -- every
 * live published page is untouched until the owner opens it and hits
 * Publish themselves. The color palette (and font pairing) can be
 * changed afterward from Look & Feel without touching any of the
 * template's layout -- every template's own text relies on theme color
 * tokens rather than hardcoded colors, by design. */
export default function TemplatesPanel({ businessId, onApplied }) {
  const [templates, setTemplates] = useState(null);
  const [applyingId, setApplyingId] = useState(null);
  const [appliedId, setAppliedId] = useState(null);
  const [pagesCreated, setPagesCreated] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open || templates) return;
    apiRequest('GET', null, '/business/site-templates').then((d) => setTemplates(d.templates)).catch(() => setTemplates([]));
  }, [open, templates]);

  const apply = (templateId) => {
    setApplyingId(templateId);
    apiRequest('POST', { template_id: templateId }, `/business/businesses/${businessId}/site/apply-template`)
      .then((data) => { setAppliedId(templateId); setPagesCreated(data.pages_created); onApplied?.(); })
      .finally(() => setApplyingId(null));
  };

  return (
    <div className="gs-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}><LayoutTemplate size={18} /> Templates</h3>
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setOpen((o) => !o)}>
          {open ? 'Hide' : 'Browse templates'}
        </button>
      </div>
      {!open && <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 0 }}>Start your whole site -- home, about, services, contact -- from a ready-made layout instead of a blank canvas.</p>}

      {open && (
        !templates ? (
          <div className="gs-loading"><div className="gs-spinner" /></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginTop: 14 }}>
            {templates.map((t) => (
              <div key={t.id} style={{ border: '1px solid var(--border, #e5e1d6)', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: 14 }}>{t.name}</strong>
                  <TemplateSwatch themeKey={t.theme?.palette} />
                </div>
                {t.description && <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0, flex: 1 }}>{t.description}</p>}
                <button
                  type="button"
                  className="gs-btn gs-btn-sm"
                  disabled={applyingId === t.id}
                  onClick={() => {
                    const pageNote = t.extra_pages?.length
                      ? ` This creates DRAFTS of ${1 + t.extra_pages.length} pages (Home${t.extra_pages.map((p) => `, ${p.title}`).join('')}).`
                      : " This replaces your home page's DRAFT.";
                    if (window.confirm(`Apply "${t.name}"?${pageNote} Every published page stays live until you publish again.`)) apply(t.id);
                  }}
                >
                  {appliedId === t.id ? <><Check size={13} /> Applied{pagesCreated ? ` (${pagesCreated} pages)` : ''}</> : applyingId === t.id ? 'Applying…' : 'Use this template'}
                </button>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
