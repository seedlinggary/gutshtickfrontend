import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Star } from 'lucide-react';
import apiRequest from '../ApiRequest';
import { THEME_PALETTES } from '../business/site-builder/theme';
import '../business/site-builder/site-builder.css';

/** SuperAdmin's catalog of site-builder starter templates -- the 5
 * defaults (is_system_default, can't be deleted here, only deactivated)
 * plus anything added here on top. "Add from an existing business" is
 * deliberately not a separate backend action: this form just takes
 * explicit fields, and the simplest way to fill them in for now is typing
 * them -- a copy-from-business convenience button is a reasonable later
 * add-on, not required for the catalog to actually grow. */
function NewTemplateForm({ onCreated, onCancel }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [palette, setPalette] = useState('warm');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    apiRequest('POST', {
      name: name.trim(),
      description: description.trim() || null,
      category: category.trim() || null,
      theme: { palette },
      // A brand-new template starts with one empty section -- the
      // SuperAdmin builds it out for real using the normal page editor
      // after creating it (apply it to a test business, design the page,
      // then come back and PATCH home_sections -- a dedicated
      // "design a template directly" editor is a reasonable later
      // add-on, not required for the catalog to grow today).
      home_sections: [{ id: 'section-1', background: { type: 'color', value: 'transparent' }, padding: { top: 48, bottom: 48 }, blocks: [] }],
    }, '/business/admin/site-templates')
      .then(onCreated)
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not create.'))
      .finally(() => setSaving(false));
  };

  return (
    <form onSubmit={submit} className="sb-new-page-form" style={{ maxWidth: 420 }}>
      {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13 }}>{error}</p>}
      <input className="gs-input" placeholder="Template name" value={name} onChange={(e) => setName(e.target.value)} required />
      <textarea className="gs-input" placeholder="Description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      <input className="gs-input" placeholder="Category (e.g. restaurant)" value={category} onChange={(e) => setCategory(e.target.value)} />
      <select className="gs-select" value={palette} onChange={(e) => setPalette(e.target.value)}>
        {Object.keys(THEME_PALETTES).map((key) => <option key={key} value={key}>{key}</option>)}
      </select>
      <p style={{ fontSize: 12, color: 'var(--muted)' }}>
        Creates an empty starting layout -- design the real page afterward using the normal page builder, then PATCH its sections in here.
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="gs-btn gs-btn-sm" disabled={saving}>Create</button>
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default function AdminSiteTemplates() {
  const [templates, setTemplates] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState('');

  const load = () => apiRequest('GET', null, '/business/admin/site-templates').then((d) => setTemplates(d.templates)).catch(() => setTemplates([]));
  useEffect(() => { load(); }, []);

  const toggleActive = (t) => apiRequest('PATCH', { active: !t.active }, `/business/admin/site-templates/${t.id}`).then(load);
  const remove = (t) => {
    if (!window.confirm(`Delete "${t.name}"?`)) return;
    apiRequest('DELETE', null, `/business/admin/site-templates/${t.id}`).then(load).catch((err) => setError(typeof err === 'string' ? err : 'Could not delete.'));
  };

  if (!templates) return <div className="gs-loading"><div className="gs-spinner" /></div>;

  return (
    <div>
      <p style={{ color: 'var(--muted)', marginTop: 0 }}>
        Starter templates business owners can apply to their home page. The 5 defaults can be deactivated but not deleted.
      </p>
      {error && <div className="gs-error-box">{error}</div>}
      {!formOpen && <button type="button" className="gs-btn gs-btn-sm" onClick={() => setFormOpen(true)} style={{ marginBottom: 14 }}><Plus size={14} /> New template</button>}
      {formOpen && <NewTemplateForm onCreated={() => { setFormOpen(false); load(); }} onCancel={() => setFormOpen(false)} />}

      <div className="admin-list" style={{ marginTop: 14 }}>
        {templates.map((t) => (
          <div key={t.id} className="admin-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <strong>{t.name}</strong>{' '}
              {t.is_system_default && <span className="admin-badge approved"><Star size={10} style={{ verticalAlign: -1 }} /> Default</span>}
              {!t.active && <span className="admin-badge rejected">Inactive</span>}
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{t.category || 'uncategorized'} · {t.description}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => toggleActive(t)}>{t.active ? 'Deactivate' : 'Activate'}</button>
              {!t.is_system_default && (
                <button type="button" className="sb-icon-btn" title="Delete" onClick={() => remove(t)}><Trash2 size={14} /></button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
