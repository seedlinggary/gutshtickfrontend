// Deep-link builders for a business location's phone/address -- kept in one
// place since BusinessProfile's LocationCard is the canonical spot every
// location (main + the full Locations tab) renders through.

/** `https://wa.me/<digits>` deep link, or null if there's no phone or the
 * owner hasn't confirmed this number is on WhatsApp. There's no way to
 * verify that server-side without WhatsApp's own paid Business API, so
 * instead the owner self-declares it via the "has WhatsApp" checkbox on the
 * location form (see BusinessForm.js), stored in the location's own
 * attributes JSON. Strips everything but digits; wa.me expects the full
 * number in international format with no leading zeros/symbols, which is
 * mostly what's already stored, but a small share of numbers saved without
 * their country code (e.g. a local "020-..." UK number) won't resolve --
 * an unavoidable data-quality gap without a phone-parsing library. */
export function whatsAppLink(phone, hasWhatsapp) {
  if (!phone || !hasWhatsapp) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}

/** Prefers lat/lng (exact pin) over the free-text address (geocoding-dependent
 * on the map's end) whenever both are available. Returns null if the
 * location has neither -- e.g. an 'online' or 'delivery' location_type,
 * or a 'physical' one that's never been geocoded. */
export function googleMapsLink(loc) {
  if (!loc) return null;
  if (loc.lat != null && loc.lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`;
  }
  const addr = [loc.address, loc.city, loc.state, loc.zip_code, loc.country].filter(Boolean).join(', ');
  return addr ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}` : null;
}

export function wazeLink(loc) {
  if (!loc) return null;
  if (loc.lat != null && loc.lng != null) {
    return `https://waze.com/ul?ll=${loc.lat},${loc.lng}&navigate=yes`;
  }
  const addr = [loc.address, loc.city, loc.state, loc.zip_code, loc.country].filter(Boolean).join(', ');
  return addr ? `https://waze.com/ul?q=${encodeURIComponent(addr)}&navigate=yes` : null;
}
