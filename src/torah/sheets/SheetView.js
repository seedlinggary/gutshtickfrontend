import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ScrollText, ArrowLeft, Plus, Trash2, Pencil, ChevronUp, ChevronDown,
  Globe, Lock, Copy, FileDown, FileText, Languages, Check, X,
} from 'lucide-react';
import apiRequest from '../../ApiRequest';
import downloadSheetFile from './downloadSheetFile';
import ShareButton from '../../ShareButton';

function textSegmentCount(item) {
  return Math.max((item.he_text || []).length, (item.en_text || []).length);
}

function AddItemForm({ sheetId, onAdded }) {
  const [kind, setKind] = useState('source');
  const [ref, setRef] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [noteText, setNoteText] = useState('');
  const [includeTranslation, setIncludeTranslation] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (kind === 'source' && !ref.trim()) { setError('Enter a source reference.'); return; }
    if (kind === 'note' && !noteText.trim()) { setError('Enter the header/note text.'); return; }
    setSaving(true);
    try {
      const body = kind === 'source'
        ? { item_type: 'source', ref: ref.trim(), custom_title: customTitle.trim() || undefined, note_text: noteText.trim() || undefined, include_translation: includeTranslation }
        : { item_type: 'note', custom_title: customTitle.trim() || undefined, note_text: noteText.trim() };
      const sheet = await apiRequest('POST', body, `/torah/sheets/${sheetId}/items`);
      onAdded(sheet);
      setRef(''); setCustomTitle(''); setNoteText('');
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Could not add this item.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="tor-form-section">
      <h3>Add to this sheet</h3>
      <div className="tor-chip-row" style={{ marginBottom: 14 }}>
        <button type="button" className={`tor-chip${kind === 'source' ? ' active' : ''}`} onClick={() => setKind('source')}>A source</button>
        <button type="button" className={`tor-chip${kind === 'note' ? ' active' : ''}`} onClick={() => setKind('note')}>A header / note</button>
      </div>
      <form onSubmit={submit} className="tor-sheet-add-form">
        {kind === 'source' ? (
          <>
            <div>
              <label className="tor-field-label">Source reference</label>
              <input
                className="gs-input" placeholder="e.g. Genesis 1:1, Berakhot 2a, Rashi on Genesis 1:1:1"
                value={ref} onChange={(e) => setRef(e.target.value)}
              />
              <p style={{ fontSize: 11.5, color: 'var(--muted)', margin: '4px 0 0' }}>
                Browse <Link to="/sources">Sources</Link> to find the exact reference for a Gemara, Tanach verse, Rambam, or any commentary -- it's shown under each text block there.
              </p>
            </div>
            <div>
              <label className="tor-field-label">Display title (optional)</label>
              <input className="gs-input" placeholder="Defaults to the reference itself" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} />
            </div>
            <div>
              <label className="tor-field-label">Your own note under this source (optional)</label>
              <textarea className="gs-input" style={{ minHeight: 60 }} value={noteText} onChange={(e) => setNoteText(e.target.value)} />
            </div>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={includeTranslation} onChange={(e) => setIncludeTranslation(e.target.checked)} />
              Include English translation for this source
            </label>
          </>
        ) : (
          <>
            <div>
              <label className="tor-field-label">Header / note text</label>
              <textarea className="gs-input" style={{ minHeight: 70 }} placeholder='e.g. "Part 2: The Machloket"' value={noteText} onChange={(e) => setNoteText(e.target.value)} />
            </div>
          </>
        )}
        {error && <p className="tor-error">{error}</p>}
        <div>
          <button type="submit" className="gs-btn gs-btn-primary" disabled={saving}>
            <Plus size={15} /> {saving ? 'Adding…' : 'Add to sheet'}
          </button>
        </div>
      </form>
    </div>
  );
}

function EditItemRow({ item, onSave, onCancel }) {
  const [customTitle, setCustomTitle] = useState(item.custom_title || '');
  const [noteText, setNoteText] = useState(item.note_text || '');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input className="gs-input" placeholder="Title" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} />
      <textarea className="gs-input" style={{ minHeight: 60 }} placeholder="Note" value={noteText} onChange={(e) => setNoteText(e.target.value)} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="gs-btn gs-btn-primary gs-btn-sm" onClick={() => onSave({ custom_title: customTitle, note_text: noteText })}><Check size={13} /> Save</button>
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={onCancel}><X size={13} /> Cancel</button>
      </div>
    </div>
  );
}

export default function SheetView() {
  const { sheetId } = useParams();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [showEnglish, setShowEnglish] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [renaming, setRenaming] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    apiRequest('GET', null, `/torah/sheets/${sheetId}`).then(setSheet).catch(() => setNotFound(true));
  };

  useEffect(() => { load(); }, [sheetId]);

  if (notFound) return <div className="feed-section"><div className="gs-container"><p className="tor-empty">This source sheet doesn't exist, or isn't public.</p></div></div>;
  if (!sheet) return <div className="feed-section"><div className="gs-container"><p style={{ color: 'var(--muted)' }}>Loading…</p></div></div>;

  const items = (sheet.items || []).slice().sort((a, b) => a.position - b.position);

  const saveTitle = async () => {
    if (!titleDraft.trim()) return;
    setError('');
    try {
      const updated = await apiRequest('PATCH', { title: titleDraft.trim() }, `/torah/sheets/${sheet.id}`);
      setSheet(updated);
      setRenaming(false);
    } catch (_) {
      setError('Could not rename this sheet.');
    }
  };

  const togglePublic = async () => {
    setError('');
    try {
      const updated = await apiRequest('PATCH', { is_public: !sheet.is_public }, `/torah/sheets/${sheet.id}`);
      setSheet(updated);
    } catch (_) {
      setError('Could not change this sheet\'s visibility.');
    }
  };

  const deleteSheet = async () => {
    if (!window.confirm('Delete this entire sheet? This cannot be undone.')) return;
    setError('');
    try {
      await apiRequest('DELETE', null, `/torah/sheets/${sheet.id}`);
      navigate('/sheets');
    } catch (_) {
      setError('Could not delete this sheet.');
    }
  };

  const copySheet = async () => {
    setError('');
    try {
      const copy = await apiRequest('POST', {}, `/torah/sheets/${sheet.id}/copy`);
      navigate(`/sheets/${copy.id}`);
    } catch (_) {
      setError('Could not copy this sheet.');
    }
  };

  const deleteItem = async (itemId) => {
    if (!window.confirm('Remove this item from the sheet?')) return;
    setError('');
    try {
      const updated = await apiRequest('DELETE', null, `/torah/sheets/${sheet.id}/items/${itemId}`);
      setSheet(updated);
    } catch (_) {
      setError('Could not remove this item.');
    }
  };

  const saveItem = async (itemId, patch) => {
    setError('');
    try {
      const updated = await apiRequest('PATCH', patch, `/torah/sheets/${sheet.id}/items/${itemId}`);
      setSheet(updated);
      setEditingItemId(null);
    } catch (_) {
      setError('Could not save this item.');
    }
  };

  const move = async (index, dir) => {
    const otherIndex = index + dir;
    if (otherIndex < 0 || otherIndex >= items.length) return;
    const order = items.map((it) => it.id);
    [order[index], order[otherIndex]] = [order[otherIndex], order[index]];
    setBusy(true);
    setError('');
    try {
      const updated = await apiRequest('POST', { item_ids: order }, `/torah/sheets/${sheet.id}/reorder`);
      setSheet(updated);
    } catch (_) {
      setError('Could not reorder this sheet.');
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async (format, mode) => {
    try {
      await downloadSheetFile(
        `/torah/sheets/${sheet.id}/export.${format}${mode === 'download' ? '?download=1' : ''}`,
        `${sheet.title}.${format}`,
        mode,
      );
    } catch (e) {
      window.alert('Could not generate this file right now.');
    }
  };

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 760 }}>
        <Link to="/sheets" className="tor-back-link"><ArrowLeft size={14} style={{ verticalAlign: -2 }} /> My Sheets</Link>

        <div className="tor-masthead">
          <div className="tor-masthead-row">
            <div className="tor-masthead-copy">
              <div className="tor-masthead-kicker"><ScrollText size={13} /> Source Sheet</div>
              {renaming ? (
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <input className="gs-input" value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} />
                  <button type="button" className="gs-btn gs-btn-primary gs-btn-sm" onClick={saveTitle}><Check size={14} /></button>
                  <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setRenaming(false)}><X size={14} /></button>
                </div>
              ) : (
                <h1 className="tor-masthead-title">
                  {sheet.title}
                  {sheet.is_own_sheet && (
                    <button type="button" onClick={() => { setTitleDraft(sheet.title); setRenaming(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 8, color: 'rgba(255,255,255,0.6)' }}>
                      <Pencil size={15} />
                    </button>
                  )}
                </h1>
              )}
              <p className="tor-masthead-sub">
                By {sheet.author_name || 'Unknown'}
                {sheet.forked_from_id && ' · copied from another sheet'}
              </p>
            </div>
            <button
              type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setShowEnglish((s) => !s)}
              style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}
            >
              <Languages size={14} /> {showEnglish ? 'Hide English' : 'Show English'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', margin: '0 0 16px' }}>
          {sheet.is_own_sheet && (
            <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={togglePublic}>
              {sheet.is_public ? <><Globe size={13} /> Public -- anyone can view &amp; copy</> : <><Lock size={13} /> Private -- only you</>}
            </button>
          )}
          <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={copySheet}><Copy size={13} /> Copy to my sheets</button>
          {sheet.is_public && (
            <ShareButton
              title={sheet.title}
              text={`${sheet.title} — a source sheet on Gut Torah`}
              url={window.location.href}
            />
          )}
          {sheet.is_own_sheet && (
            <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={deleteSheet} style={{ color: '#b3261e', borderColor: '#b3261e' }}>
              <Trash2 size={13} /> Delete sheet
            </button>
          )}
        </div>

        <div className="tor-sheet-export-row">
          <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => handleExport('pdf', 'preview')}><FileText size={14} /> Preview PDF</button>
          <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => handleExport('pdf', 'download')}><FileDown size={14} /> Download PDF</button>
          <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => handleExport('docx', 'download')}><FileDown size={14} /> Download Word</button>
        </div>

        {error && <p className="tor-error">{error}</p>}

        {items.length === 0 && <p className="tor-empty">This sheet is empty. Add your first source or header below.</p>}

        {items.map((item, i) => (
          <div key={item.id} className={`tor-sheet-item${item.item_type === 'note' ? ' tor-sheet-item-note' : ''}`}>
            <div className="tor-sheet-item-head">
              {editingItemId !== item.id && (
                <h4 className={item.item_type === 'note' ? 'tor-sheet-note-text' : 'tor-sheet-item-title'}>
                  {item.item_type === 'note' ? (item.note_text || item.custom_title) : (item.custom_title || item.ref)}
                </h4>
              )}
              {sheet.is_own_sheet && editingItemId !== item.id && (
                <div className="tor-sheet-item-controls">
                  <button type="button" className="tor-sheet-item-btn" onClick={() => move(i, -1)} disabled={i === 0 || busy} aria-label="Move up"><ChevronUp size={14} /></button>
                  <button type="button" className="tor-sheet-item-btn" onClick={() => move(i, 1)} disabled={i === items.length - 1 || busy} aria-label="Move down"><ChevronDown size={14} /></button>
                  <button type="button" className="tor-sheet-item-btn" onClick={() => setEditingItemId(item.id)} aria-label="Edit"><Pencil size={13} /></button>
                  <button type="button" className="tor-sheet-item-btn" onClick={() => deleteItem(item.id)} aria-label="Remove"><Trash2 size={13} /></button>
                </div>
              )}
            </div>

            {editingItemId === item.id ? (
              <EditItemRow item={item} onSave={(patch) => saveItem(item.id, patch)} onCancel={() => setEditingItemId(null)} />
            ) : item.item_type === 'source' && (
              <>
                {Array.from({ length: textSegmentCount(item) }).map((_, segI) => (
                  <div key={segI}>
                    {showEnglish && item.en_text && item.en_text[segI] && (
                      <p className="tor-text-en" data-no-translate dangerouslySetInnerHTML={{ __html: item.en_text[segI] }} />
                    )}
                    {item.he_text && item.he_text[segI] && (
                      <p className="tor-hebrew" data-no-translate dangerouslySetInnerHTML={{ __html: item.he_text[segI] }} />
                    )}
                  </div>
                ))}
                {item.note_text && <p className="tor-sheet-comment">{item.note_text}</p>}
              </>
            )}
          </div>
        ))}

        {sheet.is_own_sheet && <AddItemForm sheetId={sheet.id} onAdded={setSheet} />}

        <p style={{ fontSize: 12, color: 'var(--muted)' }}>
          Source texts from <a href="https://www.sefaria.org" target="_blank" rel="noreferrer">Sefaria.org</a>.
        </p>
      </div>
    </div>
  );
}
