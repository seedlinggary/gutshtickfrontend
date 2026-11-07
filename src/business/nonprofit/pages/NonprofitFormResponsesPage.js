import React, { useEffect, useState } from 'react';
import { ArrowLeft, Download, Trash2 } from 'lucide-react';
import FamilyLinkCell from '../FamilyLinkCell';
import '../nonprofit.css';

function formatAnswer(value) {
  if (value === null || value === undefined || value === '') return '';
  if (Array.isArray(value)) {
    return value.map((v) => (v && typeof v === 'object' ? `${v.name} (${v.date})` : v)).join(', ');
  }
  return String(value);
}

export default function NonprofitFormResponsesPage({ apiRequest, fetchBlob, urlPrefix = '/nonprofit', formsSegment = 'forms', showFamilyLink = true, businessId, formId, onBack }) {
  const [form, setForm] = useState(null);
  const [responses, setResponses] = useState(null);
  const [families, setFamilies] = useState([]);
  const [familyBusyId, setFamilyBusyId] = useState(null);

  const formUrl = `${urlPrefix}/${formsSegment}/${formId}`;

  const loadForm = () => apiRequest('GET', null, formUrl).then((d) => setForm(d));
  const loadResponses = () => apiRequest('GET', null, `${formUrl}/responses`).then((d) => setResponses(d.responses)).catch(() => setResponses([]));

  useEffect(() => { loadForm(); loadResponses(); }, [formId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Families are a nonprofit-only concept (household grouping across
    // donations/memberships/holiday seats) -- a general business's own
    // Custom Forms responses have nothing to link to, so this fetch (and
    // the whole Family column below) is skipped entirely for that case.
    if (!showFamilyLink) return;
    apiRequest('GET', null, `${urlPrefix}/businesses/${businessId}/families`).then((d) => setFamilies(d.families)).catch(() => setFamilies([]));
  }, [businessId, showFamilyLink]); // eslint-disable-line react-hooks/exhaustive-deps

  const remove = (response) => {
    if (!window.confirm('Delete this response?')) return;
    apiRequest('DELETE', null, `${formUrl}/responses/${response.id}`).then(loadResponses);
  };

  // FormResponse isn't one of the record types families/merge understands
  // (it has no full_name/email columns of its own to backfill a Family
  // from -- everything lives inside its answers blob), so linking goes
  // through its own direct family_id PATCH instead. "+ New family" has
  // to actually create one first (merge auto-creates one for the other
  // record types; there's nothing to auto-name this one from besides the
  // guessed identity, so fall back to asking).
  const chooseFamily = (response, choice) => {
    setFamilyBusyId(response.id);
    const patchWith = (familyId) => apiRequest('PATCH', { family_id: familyId }, `${formUrl}/responses/${response.id}`).then(loadResponses).finally(() => setFamilyBusyId(null));
    if (choice === '__new__') {
      const guessedName = response.guessed_identity?.name;
      const name = guessedName || window.prompt('New family name:');
      if (!name || !name.trim()) { setFamilyBusyId(null); return; }
      apiRequest('POST', { full_name: name.trim() }, `${urlPrefix}/businesses/${businessId}/families`)
        .then((family) => patchWith(family.id))
        .catch(() => setFamilyBusyId(null));
    } else {
      patchWith(choice);
    }
  };
  const unlinkFamily = (response) => {
    setFamilyBusyId(response.id);
    apiRequest('PATCH', { family_id: null }, `${formUrl}/responses/${response.id}`).then(loadResponses).finally(() => setFamilyBusyId(null));
  };

  const exportCsv = () => {
    // CSV export returns a non-JSON blob, which the plain apiRequest
    // helpers don't parse -- `fetchBlob` is the one piece each call site
    // (nonprofit staff vs. a regular owner) still has to supply itself,
    // since it needs that context's own auth header.
    fetchBlob(`${formUrl}/responses/export`).then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'responses.csv';
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  if (!form || !responses) return <div className="gs-loading"><div className="gs-spinner" /></div>;

  const fields = form.fields.filter((f) => !f.archived).sort((a, b) => a.order - b.order);

  return (
    <div>
      <button type="button" onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 10, fontSize: 13, background: 'none', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer' }}><ArrowLeft size={14} /> Back to forms</button>
      <div className="np-toolbar">
        <h2 style={{ margin: 0 }}>{form.title} -- responses</h2>
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={exportCsv}><Download size={14} /> Export CSV</button>
      </div>

      {responses.length === 0 && <p className="gs-empty">No responses yet.</p>}

      {responses.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '6px 10px', borderBottom: '1px solid var(--border)' }}>Submitted</th>
                {fields.map((f) => (
                  <th key={f.id} style={{ textAlign: 'left', padding: '6px 10px', borderBottom: '1px solid var(--border)' }}>{f.label}</th>
                ))}
                {showFamilyLink && <th style={{ textAlign: 'left', padding: '6px 10px', borderBottom: '1px solid var(--border)' }}>Family</th>}
                <th style={{ borderBottom: '1px solid var(--border)' }} />
              </tr>
            </thead>
            <tbody>
              {responses.map((r) => {
                const gi = r.guessed_identity;
                const giParts = gi ? Object.values(gi).filter((v) => v) : [];
                return (
                  <tr key={r.id}>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', verticalAlign: 'top' }}>
                      {r.created_at ? new Date(r.created_at).toLocaleString() : ''}
                      {giParts.length > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Looks like: {giParts.join(', ')}</div>
                      )}
                    </td>
                    {fields.map((f) => (
                      <td key={f.id} style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', verticalAlign: 'top' }}>
                        {formatAnswer(r.answers?.[f.id])}
                      </td>
                    ))}
                    {showFamilyLink && (
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', verticalAlign: 'top' }}>
                        <FamilyLinkCell
                          families={families} familyId={r.family_id} familyName={r.family_name} busy={familyBusyId === r.id}
                          onChoose={(choice) => chooseFamily(r, choice)} onUnlink={() => unlinkFamily(r)}
                        />
                      </td>
                    )}
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', verticalAlign: 'top' }}>
                      <button type="button" className="sb-icon-btn" title="Delete" onClick={() => remove(r)}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
