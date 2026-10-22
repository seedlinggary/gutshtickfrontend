import React, { useEffect, useState } from 'react';
import { Save, FolderOpen, Trash2 } from 'lucide-react';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';

/** Embedded in every calculator -- "save for many different items for many
 * different lengths" means one person wants several saved runs of the SAME
 * calculator (a house downpayment, a car, a kid's bar mitzvah), not just
 * one live set of numbers. `inputs` is that calculator's own current
 * field-state object; `onLoad` gets called with a saved scenario's stored
 * inputs to restore them verbatim. */
export default function SavedScenarios({ calculatorKey, inputs, onLoad }) {
  const [scenarios, setScenarios] = useState(null);
  const [listOpen, setListOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const loggedIn = isLoggedIn();

  const load = () => {
    if (!loggedIn) return;
    apiRequest('GET', null, `/finance/scenarios?calculator=${calculatorKey}`)
      .then((d) => setScenarios(d.scenarios || []))
      .catch(() => setScenarios([]));
  };

  useEffect(() => { load(); }, [calculatorKey, loggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!loggedIn) {
    return <p style={{ fontSize: 12, color: 'var(--muted)', margin: '10px 0 0' }}>Sign in to save multiple scenarios and come back to them later.</p>;
  }

  const save = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await apiRequest('POST', { calculator_key: calculatorKey, title: title.trim(), inputs }, '/finance/scenarios');
      setTitle('');
      setSaveOpen(false);
      load();
    } catch (_) {
      // best-effort -- the calculator itself still works fine either way
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    await apiRequest('DELETE', null, `/finance/scenarios/${id}`);
    load();
  };

  return (
    <div className="fin-saved-scenarios">
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setSaveOpen((o) => !o)}>
          <Save size={13} /> Save this scenario
        </button>
        {scenarios && scenarios.length > 0 && (
          <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setListOpen((o) => !o)}>
            <FolderOpen size={13} /> My saved ({scenarios.length})
          </button>
        )}
      </div>

      {saveOpen && (
        <form onSubmit={save} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input className="gs-input" placeholder="e.g. House downpayment" value={title} onChange={(e) => setTitle(e.target.value)} style={{ flex: 1 }} autoFocus />
          <button type="submit" className="gs-btn gs-btn-primary gs-btn-sm" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </form>
      )}

      {listOpen && scenarios && (
        <div className="fin-saved-scenario-list">
          {scenarios.map((s) => (
            <div key={s.id} className="fin-saved-scenario-row">
              <button type="button" onClick={() => { onLoad(s.inputs); setListOpen(false); }}>{s.title}</button>
              <button type="button" onClick={() => remove(s.id)} aria-label="Delete saved scenario"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
