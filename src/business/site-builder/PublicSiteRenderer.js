import React from 'react';
import BlockRenderer from './blocks/BlockRenderer';
import { DEFAULT_SECTION_HEIGHT } from './sectionDefaults';
import { sectionBackgroundStyle } from './sectionBackground';
import './public-site.css';

/**
 * What a visitor actually sees. Renders each section TWICE -- once as the
 * real desktop layout (blocks absolutely positioned exactly as placed in
 * the canvas) and once as a mobile fallback (every block in reading order,
 * sorted by y then x, stacked full-width) -- and lets CSS (see
 * public-site.css's breakpoint) pick which tree is visible. This is what
 * keeps "full drag-and-drop" from becoming the classic Wix
 * absolute-position-everywhere mobile breakage: there's always a
 * well-defined, never-overlapping mobile layout, with no per-block
 * configuration required. A block's own `mobileLayout` override (reserved
 * in the schema for a future "customize the mobile position too" editor
 * UI) isn't produced by anything yet, so it isn't consumed here yet
 * either -- every block currently falls back to plain reading-order stacking.
 *
 * `mode`: 'auto' (default, used by the real public site) lets the CSS
 * breakpoint in public-site.css decide, by viewport width, same as always.
 * 'desktop'/'mobile' (used by DevicePreviewModal) force one tree on
 * regardless of the actual viewport -- a preview rendered inside this
 * app's own desktop browser window would otherwise always show the
 * desktop tree no matter which one the owner asked to look at.
 */
// block.style's optional {bg, radius, padding} -- see BlockInspector.js's
// generic "Background" panel, which works on any block type since it's
// just a backdrop behind whatever the block itself draws. Applied the
// same way here (both trees) and in Canvas.js's editable render, so the
// owner never sees a different result in the editor than a visitor does.
function blockStyle(style) {
  if (!style?.bg) return undefined;
  return { background: style.bg, borderRadius: style.radius || 0, padding: style.padding || 0, boxSizing: 'border-box' };
}

export default function PublicSiteRenderer({ sections, subdomain, businessId, theme, mode = 'auto', enabledModules }) {
  return (
    <div className="ps-page">
      {(sections || []).map((section) => {
        const mobileOrder = [...(section.blocks || [])].sort((a, b) => (a.y - b.y) || (a.x - b.x));
        return (
          <section
            key={section.id}
            className="ps-section"
            style={{
              ...sectionBackgroundStyle(section.background),
              paddingTop: section.padding?.top ?? 32,
              paddingBottom: section.padding?.bottom ?? 32,
            }}
          >
            {mode !== 'mobile' && (
              <div className="ps-section-desktop" style={{ height: `${section.height || DEFAULT_SECTION_HEIGHT}px`, display: mode === 'desktop' ? 'block' : undefined }}>
                {(section.blocks || []).map((block) => (
                  <div key={block.id} className="ps-block" style={{ left: `${block.x}%`, top: `${block.y}%`, width: `${block.w}%`, height: `${block.h}%`, ...blockStyle(block.style) }}>
                    <BlockRenderer block={block} subdomain={subdomain} businessId={businessId} theme={theme} enabledModules={enabledModules} />
                  </div>
                ))}
              </div>
            )}
            {mode !== 'desktop' && (
              <div className="ps-section-mobile" style={{ display: mode === 'mobile' ? 'flex' : undefined }}>
                {mobileOrder.map((block) => (
                  // minHeight (not height) -- a floor so spacer/image/map/
                  // gallery blocks keep a sensible presence in flow layout,
                  // never a cap that could clip a text block whose real
                  // content needs more room than its desktop box did.
                  <div key={block.id} className="ps-block-mobile" style={{ minHeight: `${Math.round((block.h / 100) * 320)}px`, ...blockStyle(block.style) }}>
                    <BlockRenderer block={block} subdomain={subdomain} businessId={businessId} theme={theme} enabledModules={enabledModules} />
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
