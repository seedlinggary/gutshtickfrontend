import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import apiRequest from '../../../ApiRequest';
import SiteFooter from '../../site-builder/SiteFooter';
import { fieldIsVisible, fieldLabel, FieldInput } from '../dynamicFormFields';
import '../../site-builder/theme.css';

/** Renders a dynamic form built in the staff portal's form builder.
 * Deliberately outside the normal page-slug catch-all (siteMode.js wires
 * this to a fixed /forms/:slug path) -- same "never publicly listed,
 * only reachable by direct link" framing the ported system's own public
 * forms use. This is the standalone full-page version; the same form can
 * also be embedded inline in a built page via blocks/NonprofitBlocks.js's
 * DynamicFormBlock, which shares the field rendering/visibility logic
 * imported above rather than re-deriving it. */

export default function NonprofitFormPage({ subdomain }) {
  const { slug } = useParams();
  const [form, setForm] = useState(null);
  const [state, setState] = useState('loading'); // loading | found | not_found | sent
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [thankYou, setThankYou] = useState('');

  useEffect(() => {
    apiRequest('GET', null, `/nonprofit/public/${subdomain}/forms/${slug}`)
      .then((data) => { setForm(data); setState('found'); })
      .catch(() => setState('not_found'));
  }, [subdomain, slug]);

  const visibleFields = useMemo(() => {
    if (!form) return [];
    return form.fields.filter((f) => fieldIsVisible(f, answers));
  }, [form, answers]);

  const submit = (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const visibleIds = new Set(visibleFields.map((f) => String(f.id)));
    const cleaned = Object.fromEntries(Object.entries(answers).filter(([id]) => visibleIds.has(id)));
    apiRequest('POST', { answers: cleaned }, `/nonprofit/public/${subdomain}/forms/${slug}/responses`)
      .then((data) => { setThankYou(data.message); setState('sent'); })
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not submit -- try again.'))
      .finally(() => setBusy(false));
  };

  if (state === 'loading') return <div className="gs-loading" style={{ minHeight: '60vh' }}><div className="gs-spinner" /></div>;
  if (state === 'not_found') {
    return (
      <div className="sb-theme">
        <div style={{ maxWidth: 480, margin: '0 auto', padding: 24, textAlign: 'center' }}>
          <h2>Form not found</h2>
        </div>
      </div>
    );
  }
  if (state === 'sent') {
    return (
      <div className="sb-theme">
        <div style={{ maxWidth: 480, margin: '0 auto', padding: 24, textAlign: 'center' }}>
          <Check size={32} />
          <p>{thankYou}</p>
        </div>
        <SiteFooter subdomain={subdomain} />
      </div>
    );
  }

  return (
    <div className="sb-theme">
      <div style={{ maxWidth: 560, margin: '0 auto', padding: 24 }}>
        <h1>{form.title}</h1>
        {form.description && <p style={{ color: 'var(--sb-muted, #8a7a68)' }}>{form.description}</p>}
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {visibleFields.map((field) => (
            <div key={field.id} className="gs-field">
              <div className="gs-label">{fieldLabel(field, answers)}{field.required && ' *'}</div>
              {field.help_text && <p style={{ fontSize: 12, color: 'var(--sb-muted, #8a7a68)', margin: '0 0 6px' }}>{field.help_text}</p>}
              <FieldInput field={field} value={answers[String(field.id)]} onChange={(v) => setAnswers((a) => ({ ...a, [String(field.id)]: v }))} />
            </div>
          ))}
          {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13 }}>{error}</p>}
          <button type="submit" className="sb-button" disabled={busy}>{busy ? 'Submitting…' : 'Submit'}</button>
        </form>
      </div>
      <SiteFooter subdomain={subdomain} />
    </div>
  );
}
