import React from 'react';
import { Link } from 'react-router-dom';
import { Store, Briefcase, Home as HomeIcon, MessageSquare } from 'lucide-react';
import { siteUrl } from './siteMode';

/** Landing page for the single "contribute" campaign link
 * (good-shtick-backend's campaigns module) sent out when the destination
 * site isn't picked in advance -- each site also has its OWN /contribute
 * (see business/estates/money routes.js) that lands straight on that
 * site's own guest-capable create form; this picker is only what shows on
 * the main site/an unrecognized host, where we don't yet know which of the
 * three someone wants. Hopping to another site's /contribute re-appends
 * the campaign's ad code from localStorage so attribution (and the
 * eventual "contribution" conversion event) carries across the domain
 * change the same way the original campaign redirect's own ?gs_ad= did --
 * see src/analytics/VisitorTracker.js's captureAdCodeFromUrl(). The
 * "just send a message" option stays same-origin (plain /contact, already
 * site-agnostic -- see Contact.js) since there's no listing/post to track
 * a contribution conversion for there, only the click itself. */
function crossSiteHref(siteId) {
  const target = siteUrl(siteId, '/contribute');
  // Read fresh at render/click time, never cached at module-eval time --
  // VisitorTracker's captureAdCodeFromUrl() effect (what actually writes
  // this key) isn't guaranteed to have already run by the time this
  // module's top level would otherwise have evaluated it once and for all.
  const adCode = (() => { try { return localStorage.getItem('gs_ad_code'); } catch (_) { return null; } })();
  if (!adCode) return target;
  const sep = target.includes('?') ? '&' : '?';
  return `${target}${sep}gs_ad=${encodeURIComponent(adCode)}`;
}

const OPTIONS_META = [
  { id: 'business', icon: Store, title: 'List a business', sub: 'Add your business or community to Gut Community.', siteId: 'business' },
  { id: 'money', icon: Briefcase, title: 'Post a job or resume', sub: 'Hiring, or looking for work? Post it on Gut Money.', siteId: 'money' },
  { id: 'estates', icon: HomeIcon, title: 'List a property', sub: 'Selling or renting? List it on Gut Estates.', siteId: 'estates' },
  { id: 'contact', icon: MessageSquare, title: 'Send us a message', sub: 'Not sure where it fits, or just have a question? Contact us directly.', to: '/contact' },
];

export default function ContributePicker() {
  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 640 }}>
        <h1 style={{ marginBottom: 6 }}>What would you like to do?</h1>
        <p style={{ color: 'var(--muted)', marginTop: 0, marginBottom: 20 }}>
          No account needed -- pick one, fill in a few details, and it goes in for a quick review.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {OPTIONS_META.map(({ id, icon: Icon, title, sub, siteId, to }) => {
            const href = siteId ? crossSiteHref(siteId) : undefined;
            const CardTag = to ? Link : 'a';
            const cardProps = to ? { to } : { href };
            return (
              <CardTag key={id} {...cardProps} className="gs-card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 18, textDecoration: 'none', color: 'inherit' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 42, height: 42, borderRadius: 999, background: 'var(--bg)', color: 'var(--accent)', flexShrink: 0,
                }}>
                  <Icon size={20} />
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: 15.5 }}>{title}</strong>
                  <span style={{ fontSize: 13.5, color: 'var(--muted)' }}>{sub}</span>
                </div>
              </CardTag>
            );
          })}
        </div>
      </div>
    </div>
  );
}
