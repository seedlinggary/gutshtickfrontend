// One entry per type in BLOCK_TYPES (backend/business/modals/business_site.py)
// -- the palette (BlockPalette.js) offers exactly these, in this order, and
// a freshly-added block starts at defaultSize/defaultContent. requiresModule
// marks the 4 block types that depend on a later phase's feature (products,
// bookings, the analytics widget) -- they render as a labeled placeholder
// (see ComingSoonBody in BlockRenderer.js) until that module ships and the
// owner turns it on, rather than being left out of the palette entirely
// (the block + its saved position/size are harmless to keep around either
// way, and nothing has to be rebuilt once the real feature lands).
export const BLOCK_DEFS = {
  text: { label: 'Text', defaultSize: { w: 40, h: 10 }, defaultContent: { text: 'Add your text here', fontSize: 18, align: 'left' } },
  image: { label: 'Image', defaultSize: { w: 40, h: 30 }, defaultContent: { src: null, alt: '' } },
  button: { label: 'Button', defaultSize: { w: 20, h: 8 }, defaultContent: { text: 'Click here', href: '' } },
  spacer: { label: 'Spacer', defaultSize: { w: 100, h: 6 }, defaultContent: {} },
  gallery: { label: 'Gallery', defaultSize: { w: 60, h: 30 }, defaultContent: { images: [] } },
  map: { label: 'Map', defaultSize: { w: 50, h: 30 }, defaultContent: { address: '' } },
  form: { label: 'Contact form', defaultSize: { w: 40, h: 40 }, defaultContent: { heading: 'Get in touch' } },
  product_grid: { label: 'Product grid', defaultSize: { w: 100, h: 40 }, defaultContent: {}, requiresModule: 'products' },
  product_detail: { label: 'Product detail', defaultSize: { w: 100, h: 50 }, defaultContent: { productId: null }, requiresModule: 'products' },
  booking_widget: { label: 'Booking', defaultSize: { w: 50, h: 40 }, defaultContent: { serviceTypeId: null, serviceName: null }, requiresModule: 'bookings' },
  analytics_widget: { label: 'Analytics', defaultSize: { w: 50, h: 30 }, defaultContent: {}, requiresModule: 'analytics_widget' },
  donation_form: { label: 'Donation form', defaultSize: { w: 45, h: 60 }, defaultContent: { heading: 'Make a donation' }, requiresModule: 'nonprofit' },
  membership_form: { label: 'Membership signup', defaultSize: { w: 45, h: 55 }, defaultContent: { heading: 'Become a member' }, requiresModule: 'nonprofit' },
  holiday_seats_form: { label: 'Holiday seats', defaultSize: { w: 60, h: 60 }, defaultContent: { heading: 'Holiday seats' }, requiresModule: 'nonprofit' },
  dynamic_form: { label: 'Custom form', defaultSize: { w: 45, h: 55 }, defaultContent: { formSlug: null }, requiresModule: 'nonprofit' },
  // Not every nonprofit needs a whole page for this -- just a button
  // anywhere on the site linking to the one fixed /family-portal route
  // (see NonprofitFamilyPortalPage.js) every nonprofit-module site
  // already has, whether or not the owner's ever built a page for it.
  family_login_button: { label: 'Family login button', defaultSize: { w: 22, h: 8 }, defaultContent: { text: 'Family login' }, requiresModule: 'nonprofit' },
};

// Human-readable names for each requiresModule key, shared by the block
// palette (Canvas.js) and the inspector's "goes live once..." note so they
// say the same thing.
export const MODULE_LABELS = {
  products: 'Products',
  bookings: 'Bookings',
  analytics_widget: 'Analytics',
  nonprofit: 'Nonprofit',
};

export const BLOCK_TYPE_ORDER = Object.keys(BLOCK_DEFS);

let nextId = 1;
export function newBlockId(prefix) {
  nextId += 1;
  return `${prefix}-${Date.now().toString(36)}-${nextId}`;
}
