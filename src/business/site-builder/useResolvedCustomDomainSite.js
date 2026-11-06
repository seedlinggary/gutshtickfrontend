import { useEffect, useState } from 'react';
import apiRequest from '../../ApiRequest';

const CACHE_PREFIX = 'custom_domain_subdomain:';
const NONE_MARKER = '__none__';

/** Resolves the CURRENT hostname against /business-site/public/by-domain/
 * once, only when `active` is true (App.js only passes true for a host
 * siteMode.js's synchronous checks didn't already recognize -- see
 * isUnrecognizedHost there). Cached in sessionStorage so navigating
 * between pages on the same custom domain doesn't re-hit the backend on
 * every route change, just once per tab session. Returns
 * {status: 'none'|'checking'|'found', subdomain}. */
export default function useResolvedCustomDomainSite(active) {
  const [state, setState] = useState(() => {
    if (!active) return { status: 'none', subdomain: null };
    try {
      const cached = sessionStorage.getItem(CACHE_PREFIX + window.location.hostname);
      if (cached === NONE_MARKER) return { status: 'none', subdomain: null };
      if (cached) return { status: 'found', subdomain: cached };
    } catch (_) { /* sessionStorage unavailable -- fall through to a live check */ }
    return { status: 'checking', subdomain: null };
  });

  useEffect(() => {
    if (!active || state.status !== 'checking') return;
    const host = window.location.hostname;
    apiRequest('GET', null, `/business-site/public/by-domain/${encodeURIComponent(host)}`)
      .then((data) => {
        setState({ status: 'found', subdomain: data.subdomain });
        try { sessionStorage.setItem(CACHE_PREFIX + host, data.subdomain); } catch (_) {}
      })
      .catch(() => {
        setState({ status: 'none', subdomain: null });
        try { sessionStorage.setItem(CACHE_PREFIX + host, NONE_MARKER); } catch (_) {}
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, state.status]);

  return state;
}
