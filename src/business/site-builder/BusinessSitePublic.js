import React, { useEffect, useState } from 'react';
import { Store, Hourglass } from 'lucide-react';
import apiRequest from '../../ApiRequest';
import PublicSiteRenderer from './PublicSiteRenderer';
import SiteFooter from './SiteFooter';
import './theme.css';

/**
 * The public-facing storefront itself, resolved purely by subdomain (see
 * src/siteMode.js). Tries the real home page first (PublicSiteRenderer,
 * driven by whatever the owner built in the page builder); falls back to
 * a plain name/logo/about placeholder when there's no home page yet (or
 * the "pages" module is off) -- same fallback this component started as
 * in Phase 1, now demoted to the "nothing built yet" case instead of
 * being the only thing this component can show.
 */
export default function BusinessSitePublic({ subdomain }) {
  const [state, setState] = useState('loading'); // loading | home_page | placeholder | not_found
  const [site, setSite] = useState(null);
  const [homePage, setHomePage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    apiRequest('GET', null, `/business-site/public/by-subdomain/${encodeURIComponent(subdomain)}`)
      .then((data) => {
        if (cancelled) return;
        setSite(data);
        if (!data.enabled_modules?.pages) { setState('placeholder'); return; }
        apiRequest('GET', null, `/business-site/public/${encodeURIComponent(subdomain)}/home`)
          .then((page) => { if (!cancelled) { setHomePage(page); setState('home_page'); } })
          .catch(() => { if (!cancelled) setState('placeholder'); });
      })
      .catch(() => { if (!cancelled) setState('not_found'); });
    return () => { cancelled = true; };
  }, [subdomain]);

  useEffect(() => {
    if (site?.name) document.title = homePage?.page?.seo_title || site.name;
  }, [site, homePage]);

  useEffect(() => {
    if (!site?.favicon_url) return;
    let link = document.querySelector("link[rel='icon']");
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
    link.href = site.favicon_url;
  }, [site]);

  let body;
  if (state === 'loading') {
    body = (
      <div className="gs-loading" style={{ minHeight: '60vh' }}>
        <div className="gs-spinner" />
      </div>
    );
  } else if (state === 'not_found') {
    body = (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, textAlign: 'center', padding: 24 }}>
        <div className="gs-empty-icon"><Hourglass size={26} /></div>
        <h2 style={{ margin: 0 }}>This site isn't available</h2>
        <p style={{ color: 'var(--muted)', maxWidth: 420 }}>
          Either this address doesn't belong to a business yet, or the owner hasn't published their site.
        </p>
      </div>
    );
    // Not-found is a genuine dead end, not a themed business page -- no
    // footer, and skip the .sb-theme wrapper below entirely.
    return body;
  } else if (state === 'home_page') {
    body = <PublicSiteRenderer sections={homePage.sections} subdomain={subdomain} businessId={homePage.business_id} theme={homePage.theme} enabledModules={site?.enabled_modules} />;
  } else {
    body = (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, textAlign: 'center', padding: 24 }}>
        {site.logo ? (
          <img src={site.logo} alt={site.name} style={{ width: 88, height: 88, borderRadius: 16, objectFit: 'cover' }} />
        ) : (
          <div className="gs-empty-icon"><Store size={26} /></div>
        )}
        <h1 style={{ margin: 0 }}>{site.name}</h1>
        {site.about && <p style={{ color: 'var(--muted)', maxWidth: 480 }}>{site.about}</p>}
        <p style={{ color: 'var(--muted-faint, #96a39c)', fontSize: 13 }}>
          This business's site is being built — check back soon.
        </p>
      </div>
    );
  }

  return (
    <div className="sb-theme">
      {body}
      <SiteFooter subdomain={subdomain} />
    </div>
  );
}
