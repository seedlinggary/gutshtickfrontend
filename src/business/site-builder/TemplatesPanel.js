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

/** Lets an owner apply a starter template to their home page -- always
 * available, not just on a brand-new site, since reaching for a fresh
 * layout later is a completely reasonable thing to want too. Applying
 * only ever writes a new DRAFT version (see site_templates.py's
 * apply_template) -- the live published page is untouched until the
 * owner opens the page and hits Publish themselves. */
export default function TemplatesPanel({ businessId, onApplied }) {
  const [templates, setTemplates] = useState(null);
  const [applyingId, setApplyingId] = useState(null);
  const [appliedId, setAppliedId] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open || templates) return;
    apiRequest('GET', null, '/business/site-templates').then((d) => setTemplates(d.templates)).catch(() => setTemplates([]));
  }, [open, templates]);

  const apply = (templateId) => {
    setApplyingId(templateId);
    apiRequest('POST', { template_id: templateId }, `/business/businesses/${businessId}/site/apply-template`)
      .then(() => { setAppliedId(templateId); onApplied?.(); })
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
      {!open && <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 0 }}>Start your home page from a ready-made layout instead of a blank canvas.</p>}

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
                    if (window.confirm(`Apply "${t.name}"? This replaces your home page's DRAFT (your published page stays live until you publish again).`)) apply(t.id);
                  }}
                >
                  {appliedId === t.id ? <><Check size={13} /> Applied</> : applyingId === t.id ? 'Applying…' : 'Use this template'}
                </button>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
