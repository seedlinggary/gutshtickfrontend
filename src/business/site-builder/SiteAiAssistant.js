import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Send, X } from 'lucide-react';
import apiRequest from '../../ApiRequest';

/**
 * Site-wide sibling of AiAssistantPanel.js (which stays scoped to one
 * page -- it's also used by the no-login FreeBuilder.js, which only ever
 * has one page). This one can touch MULTIPLE pages plus the theme in a
 * single instruction ("make the whole site feel more modern," "update
 * the hero on Home and About") -- confirmed as a requirement, since the
 * old per-page assistant had no way to do that.
 *
 * Mounted once at the website workspace level (SiteBuilderTab.js), as a
 * fixed floating button + slide-up panel so it's reachable from every
 * section tab (Pages, Theme, Templates, Settings, ...), not just buried
 * inside whichever page happens to be open.
 *
 * Keeps a running log of every instruction and its outcome (`turns`,
 * session-only -- not persisted) instead of replacing a single message/
 * error line each time, so reopening the panel still shows whether the
 * last few things actually worked, which is exactly what a one-line
 * "Done."/error message that vanishes the moment you ask something else
 * couldn't tell you.
 *
 * On success, dispatches 'gs-site-ai-updated' with the ids of every page
 * it actually rewrote -- PageEditor.js listens for this to pull the new
 * sections into its own undo history if it happens to have that page
 * open (same "custom window event instead of prop-drilling" convention
 * ProductBlocks.js already uses for gs-products-changed). Theme changes
 * reach every open page a simpler way -- onThemeChange here is
 * SiteBuilderTab's own patchSite, so the one shared `site` state updates
 * immediately wherever it's read, no event needed.
 */
export default function SiteAiAssistant({ businessId, pages, theme, onThemeChange }) {
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [busy, setBusy] = useState(false);
  const [turns, setTurns] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns, open]);

  const submit = (e) => {
    e.preventDefault();
    const text = instruction.trim();
    if (!text || busy || !pages?.length) return;
    setInstruction('');
    setTurns((t) => [...t, { role: 'user', content: text }]);
    setBusy(true);

    Promise.all(pages.map((p) => apiRequest('GET', null, `/business/site-pages/${p.id}/draft`)
      .then(({ sections }) => ({ id: p.id, slug: p.slug, title: p.title, sections }))))
      .then((pagesWithSections) => apiRequest(
        'POST',
        { instruction: text, theme, pages: pagesWithSections },
        `/business/businesses/${businessId}/site-ai/generate-site`,
      ))
      .then((data) => {
        const updates = data.pages || [];
        return Promise.all(updates.map((p) => apiRequest('PUT', { sections: p.sections }, `/business/site-pages/${p.id}/draft`)))
          .then(() => {
            if (data.theme) onThemeChange(data.theme);
            if (updates.length) {
              window.dispatchEvent(new CustomEvent('gs-site-ai-updated', { detail: { pageIds: updates.map((p) => p.id) } }));
            }
            setTurns((t) => [...t, { role: 'assistant', content: data.message || 'Done.' }]);
          });
      })
      .catch((err) => {
        setTurns((t) => [...t, { role: 'error', content: typeof err === 'string' ? err : 'Could not reach the AI assistant.' }]);
      })
      .finally(() => setBusy(false));
  };

  return (
    <div className="sb-ai-float">
      {open && (
        <div className="sb-ai-float-panel">
          <div className="sb-ai-float-header">
            <strong style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Sparkles size={15} /> AI assistant</strong>
            <button type="button" className="sb-icon-btn" onClick={() => setOpen(false)}><X size={14} /></button>
          </div>
          <p className="sb-ai-float-hint">
            Works across your whole site -- e.g. "make the whole site feel more modern" or "update the hero heading on Home and About."
          </p>
          <div className="sb-ai-float-log">
            {turns.length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>Ask something below -- every request and its result stays listed here so you can tell at a glance what already happened.</p>
            )}
            {turns.map((turn, i) => (
              <div key={i} className={`sb-ai-turn sb-ai-turn-${turn.role}`}>{turn.content}</div>
            ))}
            {busy && <div className="sb-ai-turn sb-ai-turn-assistant sb-ai-turn-pending">Thinking…</div>}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <textarea
              className="gs-input" rows={3}
              placeholder='Try "Use a warmer color palette everywhere" or "Rewrite the About page to sound more personal"'
              value={instruction} onChange={(e) => setInstruction(e.target.value)}
            />
            <button type="submit" className="gs-btn gs-btn-sm" disabled={busy || !instruction.trim()} style={{ alignSelf: 'flex-start' }}>
              {busy ? 'Thinking…' : <><Send size={13} /> Ask</>}
            </button>
          </form>
        </div>
      )}
      <button type="button" className="sb-ai-float-btn" onClick={() => setOpen((o) => !o)} title="AI assistant">
        <Sparkles size={20} />
      </button>
    </div>
  );
}
