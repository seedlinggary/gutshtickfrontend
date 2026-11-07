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

function FeatureIcon({ name, size = 22 }) {
  const Cmp = ICON_COMPONENTS[name] || Star;
  return <Cmp size={size} />;
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
    <div className="sb-faq" style={{ height: '100%', overflow: 'auto' }}>
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

/** Repeating icon + title + description cards -- covers both a services
 * grid and a "why choose us" differentiators grid (same shape: an icon,
 * a short title, a sentence or two). Generic on purpose, not nonprofit-
 * or category-specific -- any business has SOME version of "what we do"
 * or "why us." */
export function FeatureGridBlock({ content }) {
  const items = content.items || [];
  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      {content.heading && <h3 className="sb-faq-heading">{content.heading}</h3>}
      <div className="sb-feature-grid">
        {items.map((item, i) => (
          <div key={i} className="sb-feature-card">
            <div className="sb-feature-icon"><FeatureIcon name={item.icon} /></div>
            <h4>{item.title}</h4>
            <p>{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Owner-entered (not live-fetched -- see this block's own comment in
 * BLOCK_TYPES, backend/business/modals/business_site.py) Google rating
 * badge: a 5-star row (partially filled to the decimal rating via a
 * clipped overlay -- plain CSS, no per-half-star image/icon needed),
 * the numeric rating, and the review count, linking out to the owner's
 * Google review page when a URL is set. */
export function GoogleReviewsBadgeBlock({ content }) {
  const rating = Math.max(0, Math.min(5, Number(content.rating) || 0));
  const fillPct = (rating / 5) * 100;
  const reviewCount = content.reviewCount;

  const stars = (
    <span className="sb-google-stars">
      <span className="sb-google-stars-row sb-google-stars-outline">
        {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={16} />)}
      </span>
      <span className="sb-google-stars-row sb-google-stars-filled" style={{ width: `${fillPct}%` }}>
        {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={16} fill="currentColor" />)}
      </span>
    </span>
  );

  const badge = (
    <span className="sb-google-badge">
      <span className="sb-google-badge-label">Google</span>
      {stars}
      <span className="sb-google-badge-text">
        {rating.toFixed(1)}{reviewCount ? ` · ${reviewCount} review${reviewCount === 1 ? '' : 's'}` : ''}
      </span>
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
    <div style={{ height: '100%', overflow: 'auto' }}>
      {content.heading && <h3 className="sb-faq-heading">{content.heading}</h3>}
      <div className="sb-service-list">
        {items.map((item, i) => (
          <div key={i} className="sb-service-card">
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
          </div>
        ))}
      </div>
    </div>
  );
}

/** Repeating quote + author + role cards. */
export function TestimonialGridBlock({ content }) {
  const items = content.items || [];
  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
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
