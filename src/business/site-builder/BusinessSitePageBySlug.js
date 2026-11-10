import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Hourglass } from 'lucide-react';
import apiRequest from '../../ApiRequest';
import PublicSiteRenderer from './PublicSiteRenderer';
import SiteFooter from './SiteFooter';
import './theme.css';

/** Any page on a business's site other than the home page (/cart and
 * /order/:id/confirmation are matched first in siteMode.js's route list,
 * so this only ever sees a real owner-authored slug by the time it
 * renders). Mirrors BusinessSitePublic.js's home-page fetch, just against
 * an explicit slug instead of the /home convenience route. */
export default function BusinessSitePageBySlug({ subdomain }) {
  const { slug } = useParams();
  const [state, setState] = useState('loading'); // loading | found | not_found
  const [page, setPage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    apiRequest('GET', null, `/business-site/public/${encodeURIComponent(subdomain)}/pages/${encodeURIComponent(slug)}`)
      .then((data) => { if (!cancelled) { setPage(data); setState('found'); } })
      .catch(() => { if (!cancelled) setState('not_found'); });
    return () => { cancelled = true; };
  }, [subdomain, slug]);

  useEffect(() => {
    if (page?.page?.seo_title || page?.page?.title) document.title = page.page.seo_title || page.page.title;
  }, [page]);

  useEffect(() => {
    if (!page?.favicon_url) return;
    let link = document.querySelector("link[rel='icon']");
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
    link.href = page.favicon_url;
  }, [page]);

  if (state === 'loading') {
    return (
      <div className="gs-loading" style={{ minHeight: '60vh' }}>
        <div className="gs-spinner" />
      </div>
    );
  }

  if (state === 'not_found') {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, textAlign: 'center', padding: 24 }}>
        <div className="gs-empty-icon"><Hourglass size={26} /></div>
        <h2 style={{ margin: 0 }}>Page not found</h2>
      </div>
    );
  }

  return (
    <div className="sb-theme">
      <PublicSiteRenderer sections={page.sections} subdomain={subdomain} businessId={page.business_id} theme={page.theme} enabledModules={page.enabled_modules} />
      <SiteFooter subdomain={subdomain} />
    </div>
  );
}
