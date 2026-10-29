import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircleQuestion, X, Send, Loader2 } from 'lucide-react';
import apiRequest from '../ApiRequest';
import { crossSiteNavigate } from '../CrossSiteLink';
import { siteUrl } from '../siteMode';
import { GROUP_STYLE, DEFAULT_GROUP_STYLE } from '../search/SearchResults';

const HISTORY_KEY = 'askgut_history';
const MAX_SENT_HISTORY = 16;

/** One result item from a tool call -- most shapes carry {title, snippet,
 * path, site_id}, same convention as search/SearchResults.js's result
 * cards (deliberately reused, see below); a minyan-time result has no
 * single `title` field (business_name/tefilah/time instead), so this
 * builds an equivalent display title/subtitle for that one shape instead
 * of forcing the backend to flatten it into something less useful for the
 * model's own reasoning. */
function displayFields(type, item) {
  if (type === 'minyan') {
    const timeLabel = item.time || [item.relative_anchor, item.relative_offset_minutes]
      .filter(Boolean).join(' + ');
    return {
      title: `${item.business_name} — ${item.tefilah}${item.label ? ` (${item.label})` : ''}`,
      snippet: [timeLabel, item.days, item.city].filter(Boolean).join(' · '),
    };
  }
  return { title: item.title, snippet: item.snippet };
}

function iconStyleFor(type) {
  if (type === 'shtick_hock') return GROUP_STYLE.hock;
  if (type === 'minyan') return GROUP_STYLE.business;
  return GROUP_STYLE[type] || DEFAULT_GROUP_STYLE;
}

function ResultCard({ type, item }) {
  const { Icon, bg, fg } = iconStyleFor(type);
  const { title, snippet } = displayFields(type, item);
  const sameSite = !item.site_id || item.site_id === 'main';

  const body = (
    <>
      <div className="search-result-icon" style={{ background: bg, color: fg }}>
        <Icon size={15} />
      </div>
      <div className="search-result-body">
        <div className="search-result-title">{title}</div>
        {snippet && <div className="search-result-snippet">{snippet}</div>}
      </div>
    </>
  );

  if (!item.path) return <div className="askgut-result-row">{body}</div>;
  if (sameSite) {
    return <Link to={item.path} className="search-result-row askgut-result-row" target="_blank">{body}</Link>;
  }
  return (
    <button
      type="button"
      className="search-result-row search-result-row-btn askgut-result-row"
      onClick={() => crossSiteNavigate(siteUrl(item.site_id, item.path))}
    >
      {body}
    </button>
  );
}

/** Floating "Ask GUT" button + bottom-sheet chat panel, mounted once in
 * App.js (same "global, outside the per-site router content" placement as
 * the lang-select-corner-wrap widget right next to it) so it's available
 * on every site. Conversation history is kept in sessionStorage only --
 * resets per-tab, never sent anywhere except back to /askgut/chat as
 * context for the next turn (see backend/askgut/routes/chat.py). */
export default function AskGutWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem(HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [capHit, setCapHit] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-40)));
    } catch (_) { /* storage unavailable (private window etc.) -- conversation just won't persist */ }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, open]);

  const send = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setError(null);
    const history = messages
      .slice(-MAX_SENT_HISTORY)
      .map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setSending(true);
    try {
      const res = await apiRequest('POST', { message: text, history }, '/askgut/chat');
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply, results: res.results || [] }]);
    } catch (err) {
      const msg = typeof err === 'string' ? err : "Ask GUT couldn't answer that just now.";
      if (String(msg).toLowerCase().includes('limit')) setCapHit(true);
      setError(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="askgut-wrap" data-no-translate>
      {open && (
        <div className="askgut-panel">
          <div className="askgut-panel-header">
            <span><MessageCircleQuestion size={16} /> Ask GUT</span>
            <button type="button" className="askgut-close" aria-label="Close" onClick={() => setOpen(false)}>
              <X size={16} />
            </button>
          </div>
          <div className="askgut-panel-body">
            {messages.length === 0 && (
              <p className="askgut-intro">
                Ask me anything across GUT — businesses, listings, jobs, Hock, Torah posts, minyan times,
                or run a real mortgage/tax calculation.
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`askgut-msg askgut-msg-${m.role}`}>
                <div className="askgut-msg-bubble">{m.content}</div>
                {m.results?.map((group, gi) => (
                  <div key={gi} className="askgut-result-group">
                    {group.items.slice(0, 5).map((item, ii) => (
                      <ResultCard key={ii} type={group.type} item={item} />
                    ))}
                  </div>
                ))}
              </div>
            ))}
            {sending && (
              <div className="askgut-msg askgut-msg-assistant">
                <div className="askgut-msg-bubble askgut-typing"><Loader2 size={14} className="askgut-spin" /> Thinking…</div>
              </div>
            )}
            {error && <div className="askgut-error">{error}</div>}
            <div ref={bottomRef} />
          </div>
          <form className="askgut-panel-form" onSubmit={send}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={capHit ? "Today's question limit is reached — try tomorrow" : 'Ask about GUT…'}
              disabled={sending || capHit}
              aria-label="Ask GUT a question"
            />
            <button type="submit" disabled={sending || capHit || !input.trim()} aria-label="Send">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
      <button
        type="button"
        className="askgut-fab"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close Ask GUT' : 'Open Ask GUT'}
      >
        {open ? <X size={20} /> : <MessageCircleQuestion size={20} />}
      </button>
    </div>
  );
}
