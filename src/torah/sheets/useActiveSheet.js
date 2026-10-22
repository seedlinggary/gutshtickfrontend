import { useState, useEffect, useCallback } from 'react';
import apiRequest from '../../ApiRequest';
import { isLoggedIn } from '../../auth';

const STORAGE_KEY = 'torah_active_sheet_id';

function readStoredId() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? Number(raw) : null;
  } catch (_) {
    return null;
  }
}

/** The one piece of state that makes "add to source sheet" possible from
 * anywhere while browsing (Sources.js) without re-navigating: which sheet
 * is "active" right now, persisted in localStorage so it survives a
 * refresh/revisit, not just the current page session. Shared via this hook
 * rather than React context since only Sources.js needs it today -- easy
 * to lift into a context later if a second consumer shows up. */
export default function useActiveSheet() {
  const loggedIn = isLoggedIn();
  const [sheets, setSheets] = useState(null);
  const [activeId, setActiveId] = useState(readStoredId);
  const [activeSheet, setActiveSheet] = useState(null);

  const loadSheetsList = useCallback(() => {
    if (!loggedIn) { setSheets([]); return; }
    apiRequest('GET', null, '/torah/sheets').then((d) => setSheets(d.sheets || [])).catch(() => setSheets([]));
  }, [loggedIn]);

  const loadActiveSheet = useCallback(() => {
    if (!activeId || !loggedIn) { setActiveSheet(null); return; }
    apiRequest('GET', null, `/torah/sheets/${activeId}`).then(setActiveSheet).catch(() => setActiveSheet(null));
  }, [activeId, loggedIn]);

  useEffect(() => { loadSheetsList(); }, [loadSheetsList]);
  useEffect(() => { loadActiveSheet(); }, [loadActiveSheet]);

  const selectSheet = (id) => {
    setActiveId(id);
    try { id ? localStorage.setItem(STORAGE_KEY, String(id)) : localStorage.removeItem(STORAGE_KEY); } catch (_) { /* ignore */ }
  };

  const createSheet = async (title) => {
    const sheet = await apiRequest('POST', { title }, '/torah/sheets');
    loadSheetsList();
    selectSheet(sheet.id);
    setActiveSheet(sheet);
    return sheet;
  };

  const addSource = async (ref, customTitle, includeTranslation = true) => {
    if (!activeId) throw new Error('No active sheet selected');
    const updated = await apiRequest(
      'POST',
      { item_type: 'source', ref, custom_title: customTitle || undefined, include_translation: includeTranslation },
      `/torah/sheets/${activeId}/items`,
    );
    setActiveSheet(updated);
    return updated;
  };

  const removeItem = async (itemId) => {
    if (!activeId) return;
    const updated = await apiRequest('DELETE', null, `/torah/sheets/${activeId}/items/${itemId}`);
    setActiveSheet(updated);
  };

  return { loggedIn, sheets, activeId, activeSheet, selectSheet, createSheet, addSource, removeItem };
}
