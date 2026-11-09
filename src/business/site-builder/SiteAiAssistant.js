import React, { useState } from 'react';
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
 * On success, dispatches 'gs-site-ai-updated' with the ids of every page
 * it actually rewrote -- WebsitePagesPanel.js listens for this to refresh
 * the currently-open page if the AI just changed it (same "custom window
 * event instead of prop-drilling" convention ProductBlocks.js already
 * uses for gs-products-changed).
 */
export default function SiteAiAssistant({ businessId, pages, theme, onThemeChange }) {
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!instruction.trim() || busy || !pages?.length) return;
    setBusy(true);
    setError('');
    setMessage('');

    Promise.all(pages.map((p) => apiRequest('GET', null, `/business/site-pages/${p.id}/draft`)
      .then(({ sections }) => ({ id: p.id, slug: p.slug, title: p.title, sections }))))
      .then((pagesWithSections) => apiRequest(
        'POST',
        { instruction: instruction.trim(), theme, pages: pagesWithSections },
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
            setMessage(data.message || 'Done.');
            setInstruction('');
          });
      })
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not reach the AI assistant.'))
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
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <textarea
              className="gs-input" rows={3}
              placeholder='Try "Use a warmer color palette everywhere" or "Rewrite the About page to sound more personal"'
              value={instruction} onChange={(e) => setInstruction(e.target.value)}
            />
            {message && !error && <p style={{ fontSize: 13, color: 'var(--accent)', margin: 0 }}>{message}</p>}
            {error && <p style={{ fontSize: 13, color: 'var(--danger, #b42318)', margin: 0 }}>{error}</p>}
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
