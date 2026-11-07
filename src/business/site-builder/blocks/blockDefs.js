// One entry per type in BLOCK_TYPES (backend/business/modals/business_site.py)
// -- the palette (BlockPalette.js) offers exactly these, in this order, and
// a freshly-added block starts at defaultSize/defaultContent. requiresModule
// marks the 4 block types that depend on a later phase's feature (products,
// bookings, the analytics widget) -- they render as a labeled placeholder
// (see ComingSoonBody in BlockRenderer.js) until that module ships and the
// owner turns it on, rather than being left out of the palette entirely
// (the block + its saved position/size are harmless to keep around either
// way, and nothing has to be rebuilt once the real feature lands).
// `category` groups the palette (Canvas.js's AddBlockMenu) into labeled
// sections instead of one flat alphabetless list -- with ~19 block types
// now, a flat list stopped being scannable. CATEGORY_ORDER below controls
// the section order; a category with no unlocked blocks for this site
// just doesn't render, same spirit as an empty nav group already
// disappearing elsewhere in this app.
export const BLOCK_DEFS = {
  text: { label: 'Text', category: 'Basic', defaultSize: { w: 40, h: 10 }, defaultContent: { text: 'Add your text here', fontSize: 18, align: 'left' } },
  image: { label: 'Image', category: 'Basic', defaultSize: { w: 40, h: 30 }, defaultContent: { src: null, alt: '' } },
  button: { label: 'Button', category: 'Basic', defaultSize: { w: 20, h: 8 }, defaultContent: { text: 'Click here', href: '' } },
  spacer: { label: 'Spacer', category: 'Basic', defaultSize: { w: 100, h: 6 }, defaultContent: {} },
  gallery: { label: 'Gallery', category: 'Basic', defaultSize: { w: 60, h: 30 }, defaultContent: { images: [] } },
  map: { label: 'Map', category: 'Basic', defaultSize: { w: 50, h: 30 }, defaultContent: { address: '' } },
  form: { label: 'Contact form', category: 'Forms', defaultSize: { w: 40, h: 40 }, defaultContent: { heading: 'Get in touch' } },
  product_grid: { label: 'Product grid', category: 'Commerce', defaultSize: { w: 100, h: 40 }, defaultContent: {}, requiresModule: 'products' },
  product_detail: { label: 'Product detail', category: 'Commerce', defaultSize: { w: 100, h: 50 }, defaultContent: { productId: null }, requiresModule: 'products' },
  booking_widget: { label: 'Booking', category: 'Commerce', defaultSize: { w: 50, h: 40 }, defaultContent: { serviceTypeId: null, serviceName: null }, requiresModule: 'bookings' },
  analytics_widget: { label: 'Analytics', category: 'Commerce', defaultSize: { w: 50, h: 30 }, defaultContent: {}, requiresModule: 'analytics_widget' },
  donation_form: { label: 'Donation form', category: 'Nonprofit', defaultSize: { w: 45, h: 60 }, defaultContent: { heading: 'Make a donation' }, requiresModule: 'nonprofit' },
  membership_form: { label: 'Membership signup', category: 'Nonprofit', defaultSize: { w: 45, h: 55 }, defaultContent: { heading: 'Become a member' }, requiresModule: 'nonprofit' },
  holiday_seats_form: { label: 'Holiday seats', category: 'Nonprofit', defaultSize: { w: 60, h: 60 }, defaultContent: { heading: 'Holiday seats' }, requiresModule: 'nonprofit' },
  // Accepts either module -- a nonprofit site's forms are already covered
  // by its 'nonprofit' module (no need to separately turn on
  // 'custom_forms' too), while any other business reaches the exact same
  // form engine via 'custom_forms' alone. See isModuleSatisfied below,
  // the one place that understands requiresModule can be a list like this.
  dynamic_form: { label: 'Custom form', category: 'Forms', defaultSize: { w: 45, h: 55 }, defaultContent: { formSlug: null }, requiresModule: ['nonprofit', 'custom_forms'] },
  // Not every nonprofit needs a whole page for this -- just a button
  // anywhere on the site linking to the one fixed /family-portal route
  // (see NonprofitFamilyPortalPage.js) every nonprofit-module site
  // already has, whether or not the owner's ever built a page for it.
  family_login_button: { label: 'Family login button', category: 'Nonprofit', defaultSize: { w: 22, h: 8 }, defaultContent: { text: 'Family login' }, requiresModule: 'nonprofit' },
  // Generic, every-site structured-content blocks -- not gated behind any
  // module. Added recreating a real business's existing site surfaced
  // that a services grid / FAQ accordion / testimonial wall had no block
  // equivalent (only loose text blocks, which lose the repeating-card
  // structure these need).
  faq_accordion: {
    label: 'FAQ accordion', category: 'Content', defaultSize: { w: 60, h: 50 },
    defaultContent: { heading: 'Frequently Asked Questions', items: [{ question: 'Your question here', answer: 'Your answer here' }] },
  },
  feature_grid: {
    label: 'Feature / service grid', category: 'Content', defaultSize: { w: 80, h: 40 },
    defaultContent: { heading: '', items: [{ icon: 'Star', title: 'Feature title', description: 'A short description of this feature or service.' }] },
  },
  testimonial_grid: {
    label: 'Testimonials', category: 'Content', defaultSize: { w: 70, h: 35 },
    defaultContent: { heading: '', items: [{ quote: 'What a customer said about you.', author: 'Full Name', role: 'Title, Company' }] },
  },
  // Owner-entered, not live-fetched (see BLOCK_TYPES's own comment on
  // this one in business_site.py) -- "update these once the Business
  // Profile is live" is a manual edit in the inspector, same as every
  // other block's content.
  google_reviews_badge: {
    label: 'Google reviews badge', category: 'Content', defaultSize: { w: 28, h: 10 },
    defaultContent: { rating: 5, reviewCount: null, url: '' },
  },
};

export const CATEGORY_ORDER = ['Basic', 'Content', 'Forms', 'Commerce', 'Nonprofit'];

// Human-readable names for each requiresModule key, shared by the block
// palette (Canvas.js) and the inspector's "goes live once..." note so they
// say the same thing.
export const MODULE_LABELS = {
  products: 'Products',
  bookings: 'Bookings',
  analytics_widget: 'Analytics',
  nonprofit: 'Nonprofit',
  custom_forms: 'Custom Forms',
};

/** A block's requiresModule is either a single module key or a list of
 * them (meaning "any one of these") -- dynamic_form is the one block
 * that needs the list form (see its own comment above). Every call site
 * that used to do a direct `enabledModules?.[requiresModule]` lookup
 * (BlockRenderer.js, Canvas.js's AddBlockMenu, BlockInspector.js) goes
 * through this instead, so none of them have to know about the list case
 * on their own. */
export function isModuleSatisfied(requiresModule, enabledModules) {
  if (!requiresModule) return true;
  const keys = Array.isArray(requiresModule) ? requiresModule : [requiresModule];
  return keys.some((k) => enabledModules?.[k]);
}

/** Human-readable "X or Y" label for a requiresModule value, used
 * wherever the UI explains why a block isn't live yet. */
export function moduleLabelFor(requiresModule) {
  const keys = Array.isArray(requiresModule) ? requiresModule : [requiresModule];
  return keys.map((k) => MODULE_LABELS[k] || k).join(' or ');
}

export const BLOCK_TYPE_ORDER = Object.keys(BLOCK_DEFS);

let nextId = 1;
export function newBlockId(prefix) {
  nextId += 1;
  return `${prefix}-${Date.now().toString(36)}-${nextId}`;
}
