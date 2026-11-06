import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, Clock, Hourglass } from 'lucide-react';
import apiRequest from '../../../ApiRequest';
import SiteFooter from '../../site-builder/SiteFooter';
import '../../site-builder/theme.css';

const PARAMS = ['bill', 'donation', 'membership', 'link'];

/** Nedarim Plus redirects here after a successful payment or standing-
 * order setup (see nedarim.py's build_payment_link/
 * build_recurring_payment_link `redirect_url`). The ONLY trustworthy
 * confirmation is the server-to-server webhook, not this page -- this is
 * purely UX (a thank-you message / "we'll let you know"), never what
 * actually marks anything paid. Deliberately uncached (fetches fresh on
 * every load) so it never shows a stale status right after the webhook
 * lands.
 */
export default function NonprofitThankYouPage({ subdomain }) {
  const [params] = useSearchParams();
  const [state, setState] = useState('loading');
  const [result, setResult] = useState(null);

  useEffect(() => {
    const query = PARAMS.map((p) => (params.get(p) ? `${p}=${encodeURIComponent(params.get(p))}` : null)).filter(Boolean).join('&');
    if (!query) { setState('not_found'); return; }
    apiRequest('GET', null, `/nonprofit/public/${subdomain}/pay/status?${query}`)
      .then((data) => { setResult(data); setState('found'); })
      .catch(() => setState('not_found'));
  }, [subdomain, params]);

  let body;
  if (state === 'loading') {
    body = <div className="gs-loading"><div className="gs-spinner" /></div>;
  } else if (state === 'not_found') {
    body = <><Hourglass size={32} /><h2>We couldn't find that payment</h2></>;
  } else if (result.status === 'paid' || result.status === 'active') {
    body = <><Check size={32} /><h2>Thank you, {result.full_name}!</h2><p>Your payment was received.</p></>;
  } else {
    body = <><Clock size={32} /><h2>Thanks, {result.full_name}</h2><p>We're waiting for confirmation from your bank -- this page will reflect it shortly once it comes through.</p></>;
  }

  return (
    <div className="sb-theme">
      <div style={{ maxWidth: 480, margin: '0 auto', padding: 40, textAlign: 'center' }}>{body}</div>
      <SiteFooter subdomain={subdomain} />
    </div>
  );
}
