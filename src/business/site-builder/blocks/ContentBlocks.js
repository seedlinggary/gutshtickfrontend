import React, { useState } from 'react';
import {
  ChevronDown, Star, Building2, Wrench, Users, LineChart, Smartphone,
  ShieldCheck, FileText, HardHat, HeartHandshake, MapPin, Home, History,
  Zap, Calculator, Cpu, TrendingUp, Quote, CheckCircle2, Clock, Award,
  Sparkles, Phone, Mail, Truck, Leaf, Camera, Briefcase,
} from 'lucide-react';

// Curated, generic icon set -- broad enough for most business types
// (property management, retail, services, nonprofits...) without pulling
// in all of lucide-react. ICON_NAMES is what BlockInspector's picker
// offers; a saved block whose icon name falls out of this list (e.g. the
// icon was removed from the set after being used) still falls back to
// Star rather than rendering nothing.
export const ICON_COMPONENTS = {
  Star, Building2, Wrench, Users, LineChart, Smartphone, ShieldCheck,
  FileText, HardHat, HeartHandshake, MapPin, Home, History, Zap,
  Calculator, Cpu, TrendingUp, CheckCircle2, Clock, Award, Sparkles,
  Phone, Mail, Truck, Leaf, Camera, Briefcase,
};
export const ICON_NAMES = Object.keys(ICON_COMPONENTS);

function FeatureIcon({ name, size = 22, style }) {
  const Cmp = ICON_COMPONENTS[name] || Star;
  return <Cmp size={size} style={style} />;
}

/** Collapsible question/answer list -- the one structured-content shape
 * that kept coming up (every services business has an FAQ page) with no
 * block equivalent before this: a plain text block loses the collapse
 * behavior and the visual grouping a real FAQ needs. Editable mode shows
 * every item expanded (so the owner can see/edit everything without
 * clicking through), public mode starts fully collapsed with one open at
 * a time, same "accordion" convention as the business this was modeled
 * on. */
export function FaqAccordionBlock({ content, editable }) {
  const items = content.items || [];
  const [openIndex, setOpenIndex] = useState(editable ? null : -1);

  return (
    <div className={`sb-faq${content.dark ? ' sb-content-dark' : ''}`} style={{ height: '100%', overflow: 'auto' }}>
      {content.heading && <h3 className="sb-faq-heading">{content.heading}</h3>}
      {items.length === 0 && editable && (
        <p style={{ color: 'var(--sb-muted)', fontSize: 13 }}>No questions yet -- add some in the inspector.</p>
      )}
      {items.map((item, i) => {
        const open = editable || openIndex === i;
        return (
          <div key={i} className="sb-faq-item">
            <button
              type="button"
              className="sb-faq-question"
              onClick={() => !editable && setOpenIndex(openIndex === i ? -1 : i)}
              disabled={editable}
            >
              <span>{item.question}</span>
              <ChevronDown size={16} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>
            {open && <div className="sb-faq-answer">{item.answer}</div>}
          </div>
        );
      })}
    </div>
  );
}

/** Repeating icon + title + description cards -- covers a services grid,
 * a "why choose us" differentiators grid, a plain stat row, a checklist,
 * and a timeline, via content.cardStyle. Added recreating a real
 * business's existing site surfaced that "icon in a bordered box, title,
 * description" (this block's original and ONLY shape) doesn't actually
 * cover most of the repeating-card patterns a real site uses -- its own
 * differentiators are a borderless icon-circle-left/text-right row, its
 * stats are a plain number+label with no icon or border at all, its
 * checklist is a check mark + one line of text in a flat light card, and
 * its timeline swaps the icon for a big year number. Generic on purpose,
 * not business-specific -- any site can use any of these five shapes. */
/** Renders as a plain div, or as an <a> wrapping the same content when
 * the item has an href -- added after comparing against real sites
 * (Airbnb, Pentagram) where an entire card is one click target, not just
 * a separate "read more" link buried inside it. One wrapper for every
 * cardStyle rather than repeating the div/a branch in each. */
function CardWrap({ href, className, children }) {
  if (!href) return <div className={className}>{children}</div>;
  return <a href={href} className={`${className} sb-card-link`}>{children}</a>;
}

/** A small pill in the card's corner -- "New", "Best Seller", a category
 * tag -- the same real-site comparison surfaced this as a common need
 * (status badges on listing cards) with no equivalent here at all. */
function CardBadge({ text }) {
  if (!text) return null;
  return <span className="sb-card-badge">{text}</span>;
}

export function FeatureGridBlock({ content }) {
  const items = content.items || [];
  const cardStyle = content.cardStyle || 'card';
  return (
    <div className={content.dark ? 'sb-content-dark' : ''} style={{ height: '100%', overflow: 'auto' }}>
      {content.heading && <h3 className="sb-faq-heading">{content.heading}</h3>}
      <div className={`sb-feature-grid sb-feature-grid-${cardStyle}`}>
        {items.map((item, i) => {
          if (cardStyle === 'row') {
            return (
              <CardWrap key={i} href={item.href} className="sb-feature-row">
                <div className="sb-feature-row-icon"><FeatureIcon name={item.icon} size={20} /></div>
                <div>
                  <h4>{item.title}</h4>
                  <p>{item.description}</p>
                </div>
              </CardWrap>
            );
          }
          if (cardStyle === 'checklist') {
            return (
              <CardWrap key={i} href={item.href} className="sb-feature-checklist-item">
                <FeatureIcon name={item.icon || 'CheckCircle2'} size={18} />
                <span>{item.title}</span>
              </CardWrap>
            );
          }
          if (cardStyle === 'timeline') {
            return (
              <CardWrap key={i} href={item.href} className="sb-feature-timeline-item">
                <span className="sb-feature-timeline-badge">{item.badge}</span>
                <h4>{item.title}</h4>
                <p>{item.description}</p>
              </CardWrap>
            );
          }
          if (cardStyle === 'stat') {
            return (
              <div key={i} className="sb-feature-stat-item">
                <div className="sb-feature-stat-value">{item.title}</div>
                <p>{item.description}</p>
              </div>
            );
          }
          if (cardStyle === 'panel') {
            return (
              <CardWrap key={i} href={item.href} className="sb-feature-panel-item">
                <h4>{item.title}</h4>
                <p>{item.description}</p>
              </CardWrap>
            );
          }
          return (
            <CardWrap key={i} href={item.href} className="sb-feature-card">
              {item.badge && <CardBadge text={item.badge} />}
              <div className="sb-feature-icon"><FeatureIcon name={item.icon} /></div>
              <h4>{item.title}</h4>
              <p>{item.description}</p>
              {item.href && <span className="sb-feature-card-link">Learn more →</span>}
            </CardWrap>
          );
        })}
      </div>
    </div>
  );
}

/** The actual multicolor Google "G" mark, not a text label -- a real
 * business's own badge used this exact mark (its brand colors, not
 * theme-driven, same reasoning the star-fill color below isn't either),
 * and a plain "Google" text label next to 5 stars reads as a generic
 * knockoff of a very recognizable real logo. */
function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20.4H24v7.2h11.3c-1.6 4.5-5.9 7.8-11.3 7.8-6.9 0-12.5-5.6-12.5-12.5S17.1 10.4 24 10.4c3.2 0 6.1 1.2 8.3 3.2l5.1-5.1C34.2 5.4 29.4 3.4 24 3.4 12.4 3.4 3 12.8 3 24.4s9.4 21 21 21c10.9 0 20.1-8 20.1-21 0-1.3-.2-2.6-.5-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l5.9 4.3C13.8 15 18.5 12 24 12c3.2 0 6.1 1.2 8.3 3.2l5.1-5.1C34.2 6.9 29.4 4.9 24 4.9c-7.6 0-14.2 4.3-17.7 10.6z" />
      <path fill="#4CAF50" d="M24 44.9c5.3 0 10-1.8 13.7-5l-6.3-5.3c-2 1.4-4.6 2.3-7.4 2.3-5.4 0-9.9-3.4-11.6-8.2l-6.1 4.7c3.4 6.8 10.4 11.5 17.7 11.5z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20.4H24v7.2h11.3c-.8 2.2-2.2 4.1-4 5.4l6.3 5.3C40.5 36.1 44 30.6 44 24.4c0-1.3-.2-2.6-.4-3.9z" />
    </svg>
  );
}

/** Owner-entered (not live-fetched -- see this block's own comment in
 * BLOCK_TYPES, backend/business/modals/business_site.py) Google rating
 * badge: the real G mark, a 5-star row (partially filled to the decimal
 * rating via a clipped overlay -- plain CSS, no per-half-star image/icon
 * needed), the numeric rating, and the review count, in a bordered pill
 * linking out to the owner's Google review page when a URL is set. */
export function GoogleReviewsBadgeBlock({ content }) {
  // Matches the real source's own branching exactly (not just its
  // layout): a business with no Google rating YET -- the common case
  // before a profile has enough reviews, including the real Altmax's own
  // current state -- shows a plain "Read our reviews on Google" link,
  // never a fabricated 0.0-star rating row.
  const hasRating = content.rating != null && content.reviewCount != null;
  const rating = Math.max(0, Math.min(5, Number(content.rating) || 0));
  const fillPct = (rating / 5) * 100;

  const stars = (
    <span className="sb-google-stars">
      <span className="sb-google-stars-row sb-google-stars-outline">
        {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={14} />)}
      </span>
      <span className="sb-google-stars-row sb-google-stars-filled" style={{ width: `${fillPct}%` }}>
        {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={14} fill="currentColor" />)}
      </span>
    </span>
  );

  const badge = (
    <span className="sb-google-badge">
      <GoogleG />
      {hasRating ? (
        <span className="sb-google-badge-col">
          <span className="sb-google-badge-rating">{rating.toFixed(1)} {stars}</span>
          <span className="sb-google-badge-text">{content.reviewCount} Google reviews</span>
        </span>
      ) : (
        <span className="sb-google-badge-rating">Read our reviews on Google</span>
      )}
    </span>
  );

  if (!content.url) return badge;
  return <a href={content.url} target="_blank" rel="noopener noreferrer" className="sb-google-badge-link">{badge}</a>;
}

/** A numbered, full-width card per item -- icon + large index number on
 * the left, title + description + a 2-column checklist of supporting
 * points on the right. Built recreating a real business's existing
 * Services page, which structured each service this way (icon, 01/02...
 * index, description, then 4 bullet points in 2 columns) -- feature_grid
 * only supports a single description string per item, with no sub-list
 * and no numbering, so that page's real content (each service's actual
 * bullet points) had to be flattened into one run-on sentence to fit it.
 * This is the dedicated block for when a list of things genuinely has
 * both a paragraph AND supporting bullet points per item -- a services
 * page, a process breakdown, a plans/tiers list. */
export function ServiceListBlock({ content }) {
  const items = content.items || [];
  return (
    <div className={content.dark ? 'sb-content-dark' : ''} style={{ height: '100%', overflow: 'auto' }}>
      {content.heading && <h3 className="sb-faq-heading">{content.heading}</h3>}
      <div className="sb-service-list">
        {items.map((item, i) => (
          <CardWrap key={i} href={item.href} className="sb-service-card">
            <div className="sb-service-icon-col">
              <div className="sb-service-icon"><FeatureIcon name={item.icon} size={26} /></div>
              {content.numbered !== false && <span className="sb-service-index">{String(i + 1).padStart(2, '0')}</span>}
            </div>
            <div>
              <h4>{item.title}</h4>
              <p>{item.description}</p>
              {(item.points || []).filter(Boolean).length > 0 && (
                <ul className="sb-service-points">
                  {item.points.filter(Boolean).map((point, pi) => (
                    <li key={pi}><CheckCircle2 size={14} />{point}</li>
                  ))}
                </ul>
              )}
            </div>
          </CardWrap>
        ))}
      </div>
    </div>
  );
}

/** Repeating quote + author + role cards -- or, with cardStyle 'quote',
 * one full-width pull-quote with no card chrome at all (large centered
 * italic type, just the quote and a name underneath). A real design
 * agency's own site used exactly this for a single standout quote,
 * distinct enough from a wall of boxed testimonial cards to be its own
 * style rather than a one-item grid of the default card. */
export function TestimonialGridBlock({ content }) {
  const items = content.items || [];
  const cardStyle = content.cardStyle || 'card';
  if (cardStyle === 'quote') {
    return (
      <div className={content.dark ? 'sb-content-dark' : ''} style={{ height: '100%', overflow: 'auto' }}>
        {content.heading && <h3 className="sb-faq-heading">{content.heading}</h3>}
        {items.map((item, i) => (
          <figure key={i} className="sb-testimonial-pullquote">
            <blockquote>“{item.quote}”</blockquote>
            <figcaption>{item.author}{item.role ? <span> · {item.role}</span> : null}</figcaption>
          </figure>
        ))}
      </div>
    );
  }
  return (
    <div className={content.dark ? 'sb-content-dark' : ''} style={{ height: '100%', overflow: 'auto' }}>
      {content.heading && <h3 className="sb-faq-heading">{content.heading}</h3>}
      <div className="sb-testimonial-grid">
        {items.map((item, i) => (
          <div key={i} className="sb-testimonial-card">
            <Quote size={20} className="sb-testimonial-quote-icon" />
            <p className="sb-testimonial-quote">{item.quote}</p>
            <p className="sb-testimonial-author">{item.author}{item.role ? <span>{item.role}</span> : null}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const CALLOUT_SCHEMES = {
  red: { bg: '#FEF2F2', border: '#FECACA', icon: '#DC2626', heading: '#991B1B', text: '#B91C1C' },
  amber: { bg: '#FFFBEB', border: '#FDE68A', icon: '#D97706', heading: '#92400E', text: '#B45309' },
  blue: { bg: '#EFF6FF', border: '#BFDBFE', icon: '#2563EB', heading: '#1E3A8A', text: '#1D4ED8' },
  green: { bg: '#F0FDF4', border: '#BBF7D0', icon: '#16A34A', heading: '#14532D', text: '#15803D' },
  gray: { bg: '#F8FAFC', border: '#E2E8F0', icon: '#475569', heading: '#1E293B', text: '#334155' },
};

/** A tinted, bordered notice -- modeled on a real business's actual FAQ
 * page, which has exactly this for its "Building emergency? Call ###"
 * notice: its own icon, background/border tint, and bold colored heading,
 * all independent of the site's normal theme (an emergency notice should
 * look like one regardless of the rest of the page's palette) -- a plain
 * text block has no background, border, or icon at all, so this is the
 * dedicated block for "a highlighted notice" generally, not just that one
 * real instance. */
export function CalloutBlock({ content }) {
  const scheme = CALLOUT_SCHEMES[content.colorScheme] || CALLOUT_SCHEMES.red;
  return (
    <div
      style={{
        height: '100%', overflow: 'auto', display: 'flex', gap: 14, alignItems: 'flex-start',
        background: scheme.bg, border: `1px solid ${scheme.border}`, borderRadius: 10, padding: 16, boxSizing: 'border-box',
      }}
    >
      {content.icon && <FeatureIcon name={content.icon} size={22} style={{ color: scheme.icon, flexShrink: 0, marginTop: 2 }} />}
      <div>
        {content.heading && <p style={{ margin: 0, fontWeight: 700, color: scheme.heading, fontSize: content.headingSize || 15 }}>{content.heading}</p>}
        {content.text && <p style={{ margin: '4px 0 0', color: scheme.text, fontSize: content.textSize || 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{content.text}</p>}
      </div>
    </div>
  );
}

/** A row of logos -- client logos, press mentions, certifications, award
 * badges -- each optionally linking out. Real sites across every category
 * researched (a SaaS marketing site's client-logo strip, a nonprofit's
 * Charity Navigator/BBB trust badges) use this exact pattern, and there
 * was no block that fit it: feature_grid's cards all have a title under
 * the icon, which is wrong here -- this is just the logos, nothing else. */
export function LogoStripBlock({ content, editable }) {
  const items = content.items || [];
  const grayscale = content.grayscale !== false;
  if (items.length === 0) {
    return (
      <div className={content.dark ? 'sb-content-dark' : ''} style={{ height: '100%', overflow: 'auto' }}>
        {content.heading && <h3 className="sb-faq-heading">{content.heading}</h3>}
        {editable && <p style={{ fontSize: 12, color: 'var(--sb-muted)' }}>No logos yet -- add some in the inspector.</p>}
      </div>
    );
  }
  return (
    <div className={content.dark ? 'sb-content-dark' : ''} style={{ height: '100%', overflow: 'auto' }}>
      {content.heading && <h3 className="sb-faq-heading" style={{ textAlign: 'center' }}>{content.heading}</h3>}
      <div className="sb-logo-strip">
        {items.map((item, i) => {
          const img = item.src
            ? <img src={item.src} alt={item.alt || ''} className={grayscale ? 'sb-logo-strip-img-gray' : ''} />
            : <span className="sb-logo-strip-placeholder">{item.alt || 'Logo'}</span>;
          return item.href ? <a key={i} href={item.href} target="_blank" rel="noopener noreferrer">{img}</a> : <div key={i}>{img}</div>;
        })}
      </div>
    </div>
  );
}
