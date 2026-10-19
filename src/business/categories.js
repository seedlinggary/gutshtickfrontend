// Mirrors backend/business/modals/business.py's BUSINESS_CATEGORIES /
// BUSINESS_POST_TYPES exactly -- kept as a frontend constant (rather than an
// extra round-trip to /business/categories on every page) since it changes
// about as often as this file does.
export const CATEGORY_LABELS = {
  restaurant: 'Restaurant',
  grocery: 'Grocery',
  retail: 'Retail',
  professional_services: 'Professional Services',
  health_beauty: 'Health & Beauty',
  home_services: 'Home Services',
  education: 'Education',
  entertainment: 'Entertainment',
  automotive: 'Automotive',
  nonprofit: 'Nonprofit',
  gemach: 'Gemach',
  shul: 'Shul',
  kollel: 'Kollel',
  mikvah: 'Mikvah',
  attraction: 'Attraction/Activity',
  other: 'Other',
};

// Mirrors backend/business/modals/business.py's LOCATION_TYPES. `icon` names
// a lucide-react component, rendered via LocationTypeIcon.js.
export const LOCATION_TYPE_META = {
  physical: { label: 'Physical address', icon: 'MapPin' },
  delivery: { label: 'Delivery / service area (no storefront)', icon: 'Truck' },
  online: { label: 'Online only', icon: 'Globe2' },
};

export const FOOD_CATEGORIES = new Set(['restaurant', 'grocery']);

// Soft tint per category for BusinessCard's media-placeholder gradient when
// a business has no logo -- just enough color variety to help a scrolling
// list of cards read as distinct at a glance, not fabricated photography.
export const CATEGORY_TINTS = {
  restaurant: '#c76b4a',
  grocery: '#3d8361',
  retail: '#8b5cf6',
  professional_services: '#2b5fd9',
  health_beauty: '#d1487a',
  home_services: '#b45309',
  education: '#0e7490',
  entertainment: '#d4a24c',
  automotive: '#475569',
  nonprofit: '#0f766e',
  gemach: '#a16207',
  shul: '#1c2438',
  kollel: '#1c2438',
  mikvah: '#0369a1',
  attraction: '#be185d',
  other: '#5b6472',
};

export const POST_TYPE_META = {
  sale: { label: 'Sale', color: '#c2542f', iconName: 'Tag' },
  new_product: { label: 'New Product', color: 'var(--accent)', iconName: 'Sparkles' },
  new_service: { label: 'New Service', color: '#6a4fc4', iconName: 'BellRing' },
  event: { label: 'Event', color: '#0d7d7a', iconName: 'CalendarDays' },
  announcement: { label: 'Announcement', color: 'var(--success, #2f9e59)', iconName: 'Megaphone' },
  other: { label: 'Other', color: 'var(--muted)', iconName: 'FileText' },
};

export const WEEKDAYS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];
