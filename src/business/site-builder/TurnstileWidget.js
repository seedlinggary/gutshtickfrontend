import React, { useEffect, useRef, useState } from 'react';

let scriptPromise = null;
function loadTurnstileScript() {
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

/**
 * Renders nothing, and calls onToken(null) once, when
 * VITE_TURNSTILE_SITE_KEY isn't set -- same "optional, degrades
 * gracefully" convention as Stripe Connect not being configured yet. A
 * caller treats onToken(null) in that case the same as "already solved"
 * rather than disabling its submit button forever waiting on a widget
 * that will never render. Once a site key IS set, the caller should wait
 * for a real (non-null) token before submitting.
 */
export default function TurnstileWidget({ onToken }) {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const ref = useRef(null);

  useEffect(() => {
    if (!siteKey) {
      onToken(null);
      return undefined;
    }
    let widgetId;
    let cancelled = false;
    loadTurnstileScript().then(() => {
      if (cancelled || !ref.current) return;
      widgetId = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        callback: (token) => onToken(token),
        'expired-callback': () => onToken(null),
        'error-callback': () => onToken(null),
      });
    });
    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey]);

  if (!siteKey) return null;
  return <div ref={ref} style={{ margin: '10px 0' }} />;
}
