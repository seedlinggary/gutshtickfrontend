import React, { useState } from 'react';
import { isBusinessSite, otherSiteHomeUrl } from './siteMode';
import { isLoggedIn, getEmail } from './auth';
import apiRequest from './ApiRequest';

/** The one and only way to cross between the consumer site and the business
 * site -- a small fixed icon, not a nav item. If logged in, carries a
 * one-time SSO handoff token so the other side logs the same user in
 * automatically (see SsoBootstrap.js / backend/user/routes/sso.py). */
export default function CrossSiteLink() {
  const [loading, setLoading] = useState(false);
  const business = isBusinessSite();

  const go = async () => {
    if (loading) return;
    const base = otherSiteHomeUrl();
    if (!isLoggedIn()) {
      window.location.href = base;
      return;
    }
    setLoading(true);
    try {
      const { sso_token } = await apiRequest('POST', {}, '/sso/create');
      const email = encodeURIComponent(getEmail() || '');
      window.location.href = `${base}#sso=${encodeURIComponent(sso_token)}&email=${email}`;
    } catch (_) {
      window.location.href = base;
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      className="cross-site-link"
      onClick={go}
      disabled={loading}
      title={business ? 'Go to Gut Shtick' : 'Go to Good Shtick Business'}
      aria-label={business ? 'Go to Gut Shtick' : 'Go to Good Shtick Business'}
    >
      {business ? '🏠' : '🏪'}
    </button>
  );
}
