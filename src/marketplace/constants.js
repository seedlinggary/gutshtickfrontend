// Shared lookups for the Community Marketplace (browse/search, post form,
// detail page, My Marketplace) -- kept in one place so the human-readable
// labels for the backend's raw enum values don't drift between pages.

export const CONDITION_LABELS = {
  new: 'New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
  for_parts: 'For Parts',
};

export const CONDITION_OPTIONS = Object.entries(CONDITION_LABELS).map(([value, label]) => ({ value, label }));

export const STATUS_LABELS = {
  active: 'Active',
  sold: 'Sold',
  traded: 'Traded',
  expired: 'Expired',
};

// For the "Saved" tab's own status tracker (mirrors Estates' SavedItemTracker
// pattern) -- these are the marketplace-specific values the /save PATCH
// route accepts, distinct from Estates' saved/contacted/viewed/applied.
export const SAVE_STATUS_OPTIONS = [
  { value: 'saved', label: 'Saved' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'picked_up', label: 'Picked Up' },
];

// Judgment call: GET /marketplace/listings' `country` param is a
// case-insensitive EXACT match (.ilike with no wildcard) -- there's no
// backend endpoint listing which countries have active listings to build a
// dynamic dropdown from. A free-text input would force every searcher to
// type the exact country spelling a lister happened to use. Instead this
// hardcodes the ~15 countries this audience (frum community classifieds)
// realistically posts from, spelled the way AddressAutocomplete's Photon
// lookup actually returns them (see shared/AddressAutocomplete.js /
// shared/phone.js's COUNTRY_TO_ISO keys for the same real-world spellings),
// so a value picked here actually matches listings geocoded through that
// same form. Anyone whose listing's country doesn't appear here is still
// fully findable by keyword/city/category -- only the country filter itself
// is narrowed, not the whole search.
export const COUNTRY_OPTIONS = [
  'United States',
  'Israel',
  'Canada',
  'United Kingdom',
  'Australia',
  'South Africa',
  'France',
  'Belgium',
  'Mexico',
  'Argentina',
  'Brazil',
  'Panama',
  'Switzerland',
  'Netherlands',
  'Germany',
];

export function formatMarketplacePrice(listing) {
  if (listing.is_free) return 'Free';
  if (listing.price == null) return 'Price on request';
  const symbol = listing.currency === 'ILS' ? '₪' : '$';
  return `${symbol}${Number(listing.price).toLocaleString()}`;
}
