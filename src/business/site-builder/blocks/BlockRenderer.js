import React from 'react';
import { Image as ImageIcon, MapPin, Hourglass } from 'lucide-react';
import ContactFormBlock from './ContactFormBlock';
import { ProductGridBody, ProductDetailBody } from './ProductBlocks';
import BookingWidgetBlock from './BookingWidgetBlock';
import AnalyticsWidgetBlock from './AnalyticsWidgetBlock';
import { DonationFormBlock, MembershipFormBlock, HolidaySeatsFormBlock, DynamicFormBlock, FamilyLoginButtonBlock } from '../../nonprofit/blocks/NonprofitBlocks';
import { FaqAccordionBlock, FeatureGridBlock, TestimonialGridBlock, GoogleReviewsBadgeBlock, ServiceListBlock } from './ContentBlocks';
import { DEFAULT_THEME, BUTTON_RADIUS } from '../theme';
import { BLOCK_DEFS, isModuleSatisfied, moduleLabelFor } from './blockDefs';

function TextBody({ content }) {
  return (
    <p style={{ margin: 0, fontSize: content.fontSize || 18, textAlign: content.align || 'left', color: content.color || 'inherit', whiteSpace: 'pre-wrap' }}>
      {content.text || ''}
    </p>
  );
}

function ImageBody({ content, editable }) {
  if (!content.src) {
    // An AI-built page always leaves image blocks like this (it never
    // invents a photo -- see site_ai.py's prompt), so without real text
    // here it looks like "the AI didn't add anything" rather than "here's
    // a spot waiting for your own photo."
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6, background: 'var(--border-soft, #eef3f0)', borderRadius: 8, color: 'var(--muted)', textAlign: 'center', padding: 8 }}>
        <ImageIcon size={28} style={{ opacity: 0.4 }} />
        {editable && <span style={{ fontSize: 12 }}>No photo yet -- select this block to upload one</span>}
      </div>
    );
  }
  return <img src={content.src} alt={content.alt || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />;
}

// Styles that need an actual class swap (background/color/shadow, not
// just radius) -- 'rounded'/'pill'/'square' only ever change
// --sb-button-radius, already applied via CSS var regardless of which
// component is rendering, so they need no class of their own.
const BUTTON_STYLE_CLASS = { outline: 'sb-button-outline', ghost: 'sb-button-ghost', shadow: 'sb-button-shadow' };

function ButtonBody({ content, editable, theme }) {
  // content.buttonStyle, when set, overrides the site-wide default (Look &
  // feel's Buttons picker) for just this one button -- "use site default"
  // in the inspector clears it back to null.
  const effectiveStyle = content.buttonStyle || (theme || DEFAULT_THEME).buttonStyle || 'rounded';
  const style = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' };
  const btnClass = `sb-button${BUTTON_STYLE_CLASS[effectiveStyle] ? ` ${BUTTON_STYLE_CLASS[effectiveStyle]}` : ''}`;
  const btnStyle = {
    width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: content.buttonStyle ? (BUTTON_RADIUS[effectiveStyle] || BUTTON_RADIUS.rounded) : undefined,
  };
  const btn = <span className={btnClass} style={btnStyle}>{content.text || 'Click here'}</span>;
  if (editable || !content.href) return <div style={style}>{btn}</div>;
  return <a href={content.href} style={{ ...style, textDecoration: 'none' }}>{btn}</a>;
}

function GalleryBody({ content, editable }) {
  const images = content.images || [];
  if (!images.length) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6, background: 'var(--border-soft, #eef3f0)', borderRadius: 8, color: 'var(--muted)', textAlign: 'center', padding: 8 }}>
        <ImageIcon size={22} style={{ opacity: 0.4 }} />
        <span style={{ fontSize: 12 }}>{editable ? 'No photos yet -- select this block to upload some' : 'Gallery'}</span>
      </div>
    );
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 6, width: '100%', height: '100%', overflow: 'auto' }}>
      {images.map((src, i) => <img key={i} src={src} alt="" style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 6 }} />)}
    </div>
  );
}

function MapBody({ content }) {
  if (!content.address) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--border-soft, #eef3f0)', borderRadius: 8, gap: 6, color: 'var(--muted)' }}>
        <MapPin size={22} style={{ opacity: 0.4 }} /> Map
      </div>
    );
  }
  const src = `https://maps.google.com/maps?q=${encodeURIComponent(content.address)}&output=embed`;
  return <iframe title="Map" src={src} style={{ width: '100%', height: '100%', border: 0, borderRadius: 8 }} loading="lazy" />;
}

function SpacerBody() {
  return <div style={{ width: '100%', height: '100%' }} />;
}

function ComingSoonBody({ type }) {
  const label = type.replace(/_/g, ' ');
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6, background: 'var(--border-soft, #eef3f0)', borderRadius: 8, color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: 8 }}>
      <Hourglass size={20} style={{ opacity: 0.5 }} />
      <span>{label} -- coming soon</span>
    </div>
  );
}

// Shown on the PUBLIC site in place of a module-gated block's real,
// interactive component when the owner hasn't turned that module on --
// without this, a visitor got a fully working-looking form (donation,
// booking, product grid...) that only failed, generically, on submit.
// Canvas.js's palette now flags these before they're even added (Lock
// icon + tooltip) and BlockInspector.js repeats the note once selected,
// but a block added before either of those existed, or added then the
// module later turned back off, still needs this fallback at render time.
function ModuleGatedBody({ requiresModule }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6, background: 'var(--border-soft, #eef3f0)', borderRadius: 8, color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: 8 }}>
      <Hourglass size={20} style={{ opacity: 0.5 }} />
      <span>Not available yet -- this business hasn't turned on {moduleLabelFor(requiresModule)}.</span>
    </div>
  );
}

/**
 * Deliberately the SAME component in Canvas.js (editable) and
 * PublicSiteRenderer.js (public) -- content editing itself happens through
 * BlockInspector's form fields, not inline here, so there's almost no
 * editable-vs-public branching needed in the actual render output; the
 * one real exception is the contact form, which must stay inert on the
 * canvas (clicking it should select the block, not submit something) and
 * actually submit on the public site.
 */
export default function BlockRenderer({ block, editable, subdomain, businessId, theme, enabledModules }) {
  const content = block.content || {};

  // Only gates the PUBLIC render -- in the editor (editable=true) the
  // owner is still the one configuring the block, and BlockInspector's own
  // note already tells them it won't go live until the module's on.
  const requiresModule = BLOCK_DEFS[block.type]?.requiresModule;
  if (!editable && requiresModule && !isModuleSatisfied(requiresModule, enabledModules)) {
    return <ModuleGatedBody requiresModule={requiresModule} />;
  }

  switch (block.type) {
    case 'text': return <TextBody content={content} />;
    case 'image': return <ImageBody content={content} editable={editable} />;
    case 'button': return <ButtonBody content={content} editable={editable} theme={theme} />;
    case 'spacer': return <SpacerBody />;
    case 'gallery': return <GalleryBody content={content} editable={editable} />;
    case 'map': return <MapBody content={content} />;
    case 'form': return <ContactFormBlock content={content} editable={editable} subdomain={subdomain} theme={theme} />;
    case 'product_grid': return <ProductGridBody subdomain={subdomain} businessId={businessId} editable={editable} />;
    case 'product_detail': return <ProductDetailBody content={content} subdomain={subdomain} businessId={businessId} editable={editable} />;
    case 'booking_widget': return <BookingWidgetBlock content={content} subdomain={subdomain} editable={editable} />;
    case 'analytics_widget': return <AnalyticsWidgetBlock businessId={businessId} editable={editable} />;
    case 'donation_form': return <DonationFormBlock content={content} editable={editable} subdomain={subdomain} />;
    case 'membership_form': return <MembershipFormBlock content={content} editable={editable} subdomain={subdomain} />;
    case 'holiday_seats_form': return <HolidaySeatsFormBlock content={content} editable={editable} subdomain={subdomain} />;
    case 'dynamic_form': return <DynamicFormBlock content={content} editable={editable} subdomain={subdomain} theme={theme} />;
    case 'family_login_button': return <FamilyLoginButtonBlock content={content} editable={editable} />;
    case 'faq_accordion': return <FaqAccordionBlock content={content} editable={editable} />;
    case 'feature_grid': return <FeatureGridBlock content={content} editable={editable} />;
    case 'testimonial_grid': return <TestimonialGridBlock content={content} editable={editable} />;
    case 'google_reviews_badge': return <GoogleReviewsBadgeBlock content={content} editable={editable} />;
    case 'service_list': return <ServiceListBlock content={content} editable={editable} />;
    default: return <ComingSoonBody type={block.type} />;
  }
}
