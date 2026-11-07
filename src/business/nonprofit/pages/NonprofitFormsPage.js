import React, { useEffect, useState } from 'react';
import { ClipboardList, Plus, Trash2, FileText, BarChart3 } from 'lucide-react';
import '../nonprofit.css';

function NewFormForm({ apiRequest, urlPrefix, formsSegment, businessId, onCreated, onCancel }) {
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (!slug.trim() || !title.trim()) {
      setError('A slug and a title are required.');
      return;
    }
    setSaving(true);
    setError('');
    apiRequest('POST', { slug: slug.trim(), title: title.trim(), description: description.trim() || null }, `${urlPrefix}/businesses/${businessId}/${formsSegment}`)
      .then(onCreated)
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not create form.'))
      .finally(() => setSaving(false));
  };

  return (
    <form onSubmit={submit} className="sb-new-page-form" style={{ maxWidth: 420 }}>
      {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13 }}>{error}</p>}
      <input className="gs-input" placeholder="Slug (e.g. membership-renewal)" value={slug} onChange={(e) => setSlug(e.target.value)} required />
      <input className="gs-input" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <textarea className="gs-input" placeholder="Description (optional)" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="gs-btn gs-btn-sm" disabled={saving}>Create &amp; edit fields</button>
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

/** `apiRequest`/`urlPrefix`/`formsSegment` let this same component (and
 * its siblings NonprofitFormBuilderPage/NonprofitFormResponsesPage) serve
 * two completely different auth contexts with zero duplicated UI:
 * nonprofit staff (`nonprofitApiRequest`, '/nonprofit', 'forms' -- see
 * NonprofitOwnerPanel.js) and any other business's own owner login
 * (plain `apiRequest`, '/business', 'custom-forms' -- see
 * site-builder/FormsPanel.js, backend/business/routes/site_forms.py).
 * Defaults match the original nonprofit-only call sites so this is a
 * backward-compatible prop addition, not a breaking change. */
export default function NonprofitFormsPage({ apiRequest, urlPrefix = '/nonprofit', formsSegment = 'forms', businessId, onOpenItem, onOpenResponses }) {
  const [forms, setForms] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  const load = () => apiRequest('GET', null, `${urlPrefix}/businesses/${businessId}/${formsSegment}`).then((d) => setForms(d.forms)).catch(() => setForms([]));
  useEffect(() => { load(); }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleOpen = (form) => apiRequest('PATCH', { is_open: !form.is_open }, `${urlPrefix}/${formsSegment}/${form.id}`).then(load);

  const remove = (form) => {
    if (!window.confirm(`Delete the form "${form.title}"? This also removes access to its responses.`)) return;
    apiRequest('DELETE', null, `${urlPrefix}/${formsSegment}/${form.id}`).then(load);
  };

  if (!forms) return <div className="gs-loading"><div className="gs-spinner" /></div>;

  return (
    <div>
      <div className="np-toolbar">
        <h2 style={{ margin: 0 }}>Forms</h2>
        {!formOpen && (
          <button type="button" className="gs-btn gs-btn-sm" onClick={() => setFormOpen(true)}><Plus size={14} /> New form</button>
        )}
      </div>

      {formOpen && (
        <div className="gs-card" style={{ marginBottom: 16 }}>
          <NewFormForm
            apiRequest={apiRequest}
            urlPrefix={urlPrefix}
            formsSegment={formsSegment}
            businessId={businessId}
            onCreated={(form) => onOpenItem(form.id)}
            onCancel={() => setFormOpen(false)}
          />
        </div>
      )}

      {forms.length === 0 && <p className="gs-empty">No forms yet.</p>}

      <div className="admin-list">
        {forms.map((form) => (
          <div key={form.id} className="admin-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ClipboardList size={18} />
              <div>
                <strong>{form.title}</strong>{' '}
                <button type="button" className={`np-badge ${form.is_open ? 'np-badge-active' : 'np-badge-cancelled'}`} style={{ border: 'none', cursor: 'pointer' }} onClick={() => toggleOpen(form)}>
                  {form.is_open ? 'Open' : 'Closed'}
                </button>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>/{form.slug} · {form.response_count} response{form.response_count === 1 ? '' : 's'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => onOpenItem(form.id)}><FileText size={13} /> Edit fields</button>
              <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => onOpenResponses(form.id)}><BarChart3 size={13} /> Responses</button>
              <button type="button" className="sb-icon-btn" title="Delete" onClick={() => remove(form)}><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
