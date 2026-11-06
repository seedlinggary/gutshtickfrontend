import React, { useState } from 'react';
import { Sparkles, Send } from 'lucide-react';
import apiRequest from '../../ApiRequest';

/** "Build from scratch, add data, forms, colors, schemes" via the same
 * OPENAI_API_KEY AskGut already uses -- see backend/business/routes/
 * site_ai.py. Always sends the CURRENT sections/theme and gets back a
 * complete replacement for both (never a diff), so this is safe to call
 * repeatedly on top of manual edits without needing any merge logic here.
 * Reused as-is by both the real owner dashboard (PageEditor.js, where
 * onThemeChange also persists to the real site) and the public, no-login
 * builder (FreeBuilder.js, where onThemeChange just updates local state
 * until Save & Publish) -- this component itself has no idea which. */
export default function AiAssistantPanel({ sections, onSectionsChange, theme, onThemeChange }) {
  const [instruction, setInstruction] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (!instruction.trim() || busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    apiRequest('POST', { instruction: instruction.trim(), sections, theme }, '/business/site-ai/generate')
      .then((data) => {
        onSectionsChange(data.sections || []);
        onThemeChange(data.theme || theme);
        setMessage(data.message || 'Done.');
        setInstruction('');
      })
      .catch((err) => setError(typeof err === 'string' ? err : 'Could not reach the AI assistant.'))
      .finally(() => setBusy(false));
  };

  return (
    <div className="gs-card" style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Sparkles size={16} /> AI assistant</strong>
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setOpen((o) => !o)}>{open ? 'Hide' : 'Open'}</button>
      </div>
      {open && (
        <form onSubmit={submit} style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <textarea
            className="gs-input" rows={2}
            placeholder='Try "Build me a page for a flower shop" or "Make the buttons pill-shaped and use a blue color scheme"'
            value={instruction} onChange={(e) => setInstruction(e.target.value)}
          />
          {message && !error && <p style={{ fontSize: 13, color: 'var(--accent)', margin: 0 }}>{message}</p>}
          {error && <p style={{ fontSize: 13, color: 'var(--danger, #b42318)', margin: 0 }}>{error}</p>}
          <button type="submit" className="gs-btn gs-btn-sm" disabled={busy || !instruction.trim()} style={{ alignSelf: 'flex-start' }}>
            {busy ? 'Thinking…' : <><Send size={13} /> Ask</>}
          </button>
        </form>
      )}
    </div>
  );
}
