import { useEffect } from 'react';
import { apiRequestRaw } from './ApiRequest';
import { saveAuth } from './auth';

/** Mounted once at the app root. If the URL carries a one-time cross-site
 * login handoff (#sso=...&email=...), exchanges it for a real session and
 * logs the user in automatically -- see CrossSiteLink.js and
 * backend/user/routes/sso.py. The email travels alongside the token purely
 * for display (saveAuth stores it locally); it's not part of the credential. */
export default function SsoBootstrap() {
  useEffect(() => {
    const rawHash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
    const params = new URLSearchParams(rawHash);
    const ssoToken = params.get('sso');
    if (!ssoToken) return;
    const email = params.get('email') || '';

    // Strip immediately so a refresh/back-nav never resubmits it.
    window.history.replaceState(null, '', window.location.pathname + window.location.search);

    apiRequestRaw('POST', { sso_token: ssoToken }, '/sso/exchange').then(({ ok, data }) => {
      if (ok && data) {
        saveAuth(data, email || data.profile_name || data.public_id);
        window.location.reload();
      }
    }).catch(() => {});
  }, []);

  return null;
}
