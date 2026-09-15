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
  other: 'Other',
};

// Mirrors backend/business/modals/business.py's LOCATION_TYPES.
export const LOCATION_TYPE_META = {
  physical: { label: 'Physical address', icon: '📍' },
  delivery: { label: 'Delivery / service area (no storefront)', icon: '🚚' },
  online: { label: 'Online only', icon: '🌐' },
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
  other: '#5b6472',
};

export const CATEGORY_ICONS = {
  restaurant: '🍽️',
  grocery: '🛒',
  retail: '🛍️',
  professional_services: '💼',
  health_beauty: '💇',
  home_services: '🔧',
  education: '📚',
  entertainment: '🎉',
  automotive: '🚗',
  nonprofit: '🤝',
  gemach: '🎁',
  shul: '🕍',
  kollel: '📖',
  other: '🏪',
};

export const POST_TYPE_META = {
  sale: { label: 'Sale', color: '#e0574c' },
  new_product: { label: 'New Product', color: 'var(--accent)' },
  new_service: { label: 'New Service', color: '#6366f1' },
  event: { label: 'Event', color: '#0ea5a4' },
  announcement: { label: 'Announcement', color: 'var(--success, #2f9e59)' },
  other: { label: 'Other', color: 'var(--muted)' },
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
