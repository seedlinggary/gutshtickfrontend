import React, { useEffect, useState } from 'react';
import { ArrowLeft, Save, Plus, Trash2, ChevronUp, ChevronDown, ChevronRight, X } from 'lucide-react';
import ItemStyleFields from '../../site-builder/ItemStyleFields';
import '../nonprofit.css';

const FIELD_TYPES = [
  ['short_text', 'Short text'],
  ['long_text', 'Long text'],
  ['email', 'Email'],
  ['phone', 'Phone'],
  ['number', 'Number'],
  ['date', 'Date'],
  ['single_choice', 'Single choice'],
  ['multi_choice', 'Multi choice'],
  ['multi_text', 'Multiple text entries'],
  ['name_date_list', 'Name + date list'],
];

function OptionsEditor({ options, onChange }) {
  const opts = options || [];
  return (
    <div>
      <div className="gs-label">Options</div>
      {opts.map((opt, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <input className="gs-input" value={opt} onChange={(e) => onChange(opts.map((o, idx) => (idx === i ? e.target.value : o)))} />
          <button type="button" className="sb-icon-btn" onClick={() => onChange(opts.filter((_, idx) => idx !== i))}><X size={14} /></button>
        </div>
      ))}
      <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => onChange([...opts, ''])}><Plus size={13} /> Add option</button>
    </div>
  );
}

function ConditionEditor({ field, index, fields, update }) {
  const [expanded, setExpanded] = useState(!!field.condition_field_id || !!field.alt_label);
  // Only earlier fields that already have a server-assigned id can be the
  // target of a condition -- a brand new, unsaved field has no id yet to
  // reference, so it's excluded from this list until after it's saved once.
  const earlier = fields.slice(0, index).filter((f) => f.id);

  return (
    <div style={{ marginTop: 10 }}>
      <button type="button" className="sb-icon-btn" onClick={() => setExpanded((e) => !e)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />} Conditional logic
      </button>
      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8, paddingLeft: 10, borderLeft: '2px solid var(--border)' }}>
          <div className="gs-field">
            <div className="gs-label">Depends on field</div>
            <select
              className="gs-select"
              value={field.condition_field_id || ''}
              onChange={(e) => update({ condition_field_id: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">None</option>
              {earlier.map((f) => <option key={f.id} value={f.id}>{f.label || `Field ${f.id}`}</option>)}
            </select>
          </div>
          {field.condition_field_id && (
            <>
              <div className="gs-field">
                <div className="gs-label">Mode</div>
                <select className="gs-select" value={field.condition_mode || 'show_if'} onChange={(e) => update({ condition_mode: e.target.value })}>
                  <option value="show_if">Show if answer equals</option>
                  <option value="hide_if">Hide if answer equals</option>
                </select>
              </div>
              <div className="gs-field">
                <div className="gs-label">Value to match</div>
                <input className="gs-input" value={field.condition_value || ''} onChange={(e) => update({ condition_value: e.target.value })} />
              </div>
            </>
          )}
          <div className="gs-field">
            <div className="gs-label">Alt label (shown instead of this field's own label when the depended-on field's answer equals the value above, regardless of show/hide mode)</div>
            <input className="gs-input" value={field.alt_label || ''} onChange={(e) => update({ alt_label: e.target.value || null })} />
          </div>
        </div>
      )}
    </div>
  );
}

/** Same collapsed-unless-already-set convention as ConditionEditor right
 * above -- most fields never need this, so it stays out of the way until
 * a field actually has a label_style set. Shares ItemStyleFields with the
 * site builder's card/list blocks (see that file's own docstring) --
 * allowBackground={false} since a form field's label has no card concept
 * the way a feature-grid item does. */
function LabelStyleEditor({ field, update }) {
  const [expanded, setExpanded] = useState(!!field.label_style);
  return (
    <div style={{ marginTop: 10 }}>
      <button type="button" className="sb-icon-btn" onClick={() => setExpanded((e) => !e)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />} Label style
      </button>
      {expanded && (
        <div style={{ marginTop: 8, paddingLeft: 10, borderLeft: '2px solid var(--border)' }}>
          <ItemStyleFields value={field.label_style} onChange={(label_style) => update({ label_style })} allowBackground={false} />
        </div>
      )}
    </div>
  );
}

function FieldRow({ field, index, fields, onChange, onRemove, onMoveUp, onMoveDown, isFirst, isLast }) {
  const update = (patch) => onChange({ ...field, ...patch });
  const isChoice = field.type === 'single_choice' || field.type === 'multi_choice';

  return (
    <div className="gs-card" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '2 1 220px' }}>
          <div className="gs-label">Label</div>
          <input className="gs-input" value={field.label || ''} onChange={(e) => update({ label: e.target.value })} />
        </div>
        <div style={{ flex: '1 1 150px' }}>
          <div className="gs-label">Type</div>
          <select className="gs-select" value={field.type} onChange={(e) => update({ type: e.target.value })}>
            {FIELD_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button type="button" className="sb-icon-btn" disabled={isFirst} onClick={onMoveUp} title="Move up"><ChevronUp size={14} /></button>
          <button type="button" className="sb-icon-btn" disabled={isLast} onClick={onMoveDown} title="Move down"><ChevronDown size={14} /></button>
        </div>
        <button type="button" className="sb-icon-btn" onClick={onRemove} title="Remove"><Trash2 size={14} /></button>
      </div>

      <div className="gs-field" style={{ marginTop: 10 }}>
        <div className="gs-label">Help text</div>
        <input className="gs-input" value={field.help_text || ''} onChange={(e) => update({ help_text: e.target.value || null })} />
      </div>

      <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
        <input type="checkbox" checked={!!field.required} onChange={(e) => update({ required: e.target.checked })} /> Required
      </label>

      {isChoice && (
        <div style={{ marginTop: 10 }}>
          <OptionsEditor options={field.options} onChange={(options) => update({ options })} />
        </div>
      )}

      <ConditionEditor field={field} index={index} fields={fields} update={update} />
      <LabelStyleEditor field={field} update={update} />
    </div>
  );
}

let localKeySeq = 0;
function emptyField() {
  return { _key: `tmp-${localKeySeq++}`, label: '', type: 'short_text', required: false, options: [], help_text: '', condition_field_id: null, condition_value: '', condition_mode: null, alt_label: '', label_style: null };
}

export default function NonprofitFormBuilderPage({ apiRequest, urlPrefix = '/nonprofit', formsSegment = 'forms', businessId, formId, onBack }) {
  const [meta, setMeta] = useState(null);
  const [fields, setFields] = useState([]);
  const [savingMeta, setSavingMeta] = useState(false);
  const [savingFields, setSavingFields] = useState(false);
  const [metaSaved, setMetaSaved] = useState(false);
  const [fieldsSaved, setFieldsSaved] = useState(false);

  const formUrl = `${urlPrefix}/${formsSegment}/${formId}`;

  const load = () => apiRequest('GET', null, formUrl).then((d) => {
    setMeta({ title: d.title, slug: d.slug, description: d.description || '', thank_you_message: d.thank_you_message || '', is_open: d.is_open });
    setFields(d.fields.filter((f) => !f.archived).sort((a, b) => a.order - b.order).map((f) => ({ ...f, _key: `id-${f.id}` })));
  });
  useEffect(() => { load(); }, [formId]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveMeta = (e) => {
    e.preventDefault();
    setSavingMeta(true);
    setMetaSaved(false);
    apiRequest('PATCH', meta, formUrl)
      .then(() => setMetaSaved(true))
      .finally(() => setSavingMeta(false));
  };

  const saveFields = () => {
    setSavingFields(true);
    setFieldsSaved(false);
    const body = {
      fields: fields.map((f) => ({
        id: f.id,
        label: f.label,
        type: f.type,
        required: !!f.required,
        options: f.type === 'single_choice' || f.type === 'multi_choice' ? (f.options || []).filter((o) => o.trim()) : [],
        help_text: f.help_text || null,
        condition_field_id: f.condition_field_id || null,
        condition_value: f.condition_value || null,
        condition_mode: f.condition_mode || null,
        alt_label: f.alt_label || null,
        label_style: f.label_style || null,
      })),
    };
    apiRequest('PATCH', body, formUrl)
      .then((d) => { setFields(d.fields.filter((f) => !f.archived).sort((a, b) => a.order - b.order).map((f) => ({ ...f, _key: `id-${f.id}` }))); setFieldsSaved(true); })
      .finally(() => setSavingFields(false));
  };

  if (!meta) return <div className="gs-loading"><div className="gs-spinner" /></div>;

  const updateFieldAt = (i, next) => setFields((fs) => fs.map((f, idx) => (idx === i ? next : f)));
  const removeFieldAt = (i) => setFields((fs) => fs.filter((_, idx) => idx !== i));
  const moveField = (i, dir) => setFields((fs) => {
    const next = [...fs];
    const j = i + dir;
    if (j < 0 || j >= next.length) return fs;
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

  return (
    <div>
      <button type="button" onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 10, fontSize: 13, background: 'none', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer' }}><ArrowLeft size={14} /> Back to forms</button>
      <h2 style={{ marginTop: 0 }}>Edit form</h2>

      <form onSubmit={saveMeta} className="gs-card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Form settings</h3>
        <div className="gs-field">
          <div className="gs-label">Title</div>
          <input className="gs-input" value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
        </div>
        <div className="gs-field">
          <div className="gs-label">Slug</div>
          <input className="gs-input" value={meta.slug} onChange={(e) => setMeta({ ...meta, slug: e.target.value })} />
        </div>
        <div className="gs-field">
          <div className="gs-label">Description</div>
          <textarea className="gs-input" rows={2} value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} />
        </div>
        <div className="gs-field">
          <div className="gs-label">Thank-you message</div>
          <textarea className="gs-input" rows={2} value={meta.thank_you_message} onChange={(e) => setMeta({ ...meta, thank_you_message: e.target.value })} />
        </div>
        <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={meta.is_open} onChange={(e) => setMeta({ ...meta, is_open: e.target.checked })} /> Open (accepting responses)
        </label>
        <button type="submit" className="gs-btn gs-btn-sm" disabled={savingMeta} style={{ marginTop: 10 }}><Save size={14} /> Save settings</button>
        {metaSaved && <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 10 }}>Saved</span>}
      </form>

      <h3>Fields</h3>
      {fields.map((field, i) => (
        <FieldRow
          key={field._key}
          field={field}
          index={i}
          fields={fields}
          onChange={(next) => updateFieldAt(i, next)}
          onRemove={() => removeFieldAt(i)}
          onMoveUp={() => moveField(i, -1)}
          onMoveDown={() => moveField(i, 1)}
          isFirst={i === 0}
          isLast={i === fields.length - 1}
        />
      ))}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10 }}>
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setFields((fs) => [...fs, emptyField()])}><Plus size={14} /> Add field</button>
        <button type="button" className="gs-btn gs-btn-sm" disabled={savingFields} onClick={saveFields}><Save size={14} /> Save fields</button>
        {fieldsSaved && <span style={{ fontSize: 12, color: 'var(--muted)' }}>Saved</span>}
      </div>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>
        Removing a field here and saving doesn't delete its past answers -- the server archives any field left out of this list instead of deleting it.
      </p>
    </div>
  );
}
