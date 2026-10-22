import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ScrollText, Plus, X } from 'lucide-react';

/** Sidebar on the Sources browser -- pick/create the "active" sheet once,
 * then every text block on the page gets a one-click "Add to sheet"
 * button (see Sources.js's TextDisplay) instead of having to copy a
 * reference and go build the sheet separately afterward. */
export default function SourceSheetPanel({ sheetState }) {
  const { loggedIn, sheets, activeId, activeSheet, selectSheet, createSheet, removeItem } = sheetState;
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  if (!loggedIn) {
    return (
      <div className="tor-sheet-panel">
        <h4><ScrollText size={14} style={{ verticalAlign: -2 }} /> Source Sheet</h4>
        <p className="tor-empty" style={{ padding: 0 }}>Sign in to build a source sheet while you browse.</p>
      </div>
    );
  }

  const create = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    setError('');
    try {
      await createSheet(newTitle.trim());
      setNewTitle('');
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Could not create this sheet.');
    } finally {
      setCreating(false);
    }
  };

  const remove = async (itemId) => {
    setError('');
    try {
      await removeItem(itemId);
    } catch (_) {
      setError('Could not remove this item.');
    }
  };

  return (
    <div className="tor-sheet-panel">
      <h4><ScrollText size={14} style={{ verticalAlign: -2 }} /> Source Sheet</h4>

      {sheets && sheets.length > 0 && (
        <select
          className="gs-input" style={{ marginBottom: 10 }}
          value={activeId || ''}
          onChange={(e) => selectSheet(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Choose a sheet…</option>
          {sheets.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
      )}

      <form onSubmit={create} style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        <input className="gs-input" placeholder="New sheet name" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
        <button type="submit" className="gs-btn gs-btn-outline gs-btn-sm" disabled={creating} aria-label="Create sheet"><Plus size={14} /></button>
      </form>
      {error && <p className="tor-error" style={{ marginTop: -6, marginBottom: 12 }}>{error}</p>}

      {activeSheet ? (
        <>
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 8px' }}>
            <strong>{activeSheet.title}</strong> · {activeSheet.items.length} item{activeSheet.items.length === 1 ? '' : 's'}
          </p>
          {activeSheet.items.length > 0 && (
            <div className="tor-sheet-panel-list">
              {activeSheet.items.map((it) => (
                <div key={it.id} className="tor-sheet-panel-item">
                  <span>{it.custom_title || it.ref || it.note_text}</span>
                  <button type="button" onClick={() => remove(it.id)} aria-label="Remove"><X size={12} /></button>
                </div>
              ))}
            </div>
          )}
          <Link to={`/sheets/${activeSheet.id}`} className="gs-btn gs-btn-outline gs-btn-sm" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }}>
            Open full sheet
          </Link>
        </>
      ) : (
        <p className="tor-empty" style={{ padding: 0 }}>Choose or create a sheet above, then look for "Add to sheet" next to any source.</p>
      )}
    </div>
  );
}
