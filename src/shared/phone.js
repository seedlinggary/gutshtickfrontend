import { parsePhoneNumberFromString } from 'libphonenumber-js';

// Free-text country names (as actually typed into Estates'/Business's own
// country field, across real seeded data) mapped to the ISO 3166-1 alpha-2
// code libphonenumber-js needs to resolve a number typed without its own
// country code -- e.g. a Beit Shemesh landlord's local "050-123-4567".
// Lowercased keys; anything not listed here just gets parsed with no
// country hint, which still works for any number already typed with its
// own "+" country code.
const COUNTRY_TO_ISO = {
  israel: 'IL', il: 'IL',
  'united states': 'US', usa: 'US', us: 'US', 'u.s.': 'US', 'u.s.a.': 'US',
  canada: 'CA', ca: 'CA',
  'united kingdom': 'GB', uk: 'GB', england: 'GB', scotland: 'GB', wales: 'GB', 'great britain': 'GB',
  'south africa': 'ZA',
  australia: 'AU', 'new zealand': 'NZ',
  mexico: 'MX', 'méxico': 'MX', france: 'FR', italy: 'IT', belgium: 'BE',
  germany: 'DE', brazil: 'BR', brasil: 'BR', gibraltar: 'GI', austria: 'AT',
  argentina: 'AR', ukraine: 'UA', panama: 'PA', switzerland: 'CH',
  russia: 'RU', netherlands: 'NL', morocco: 'MA', hungary: 'HU',
  india: 'IN', colombia: 'CO', 'czech republic': 'CZ', uruguay: 'UY',
  sweden: 'SE', spain: 'ES', poland: 'PL', chile: 'CL', japan: 'JP',
  thailand: 'TH', 'hong kong': 'HK', singapore: 'SG', denmark: 'DK',
  philippines: 'PH', turkey: 'TR', georgia: 'GE', peru: 'PE',
  uzbekistan: 'UZ', finland: 'FI', portugal: 'PT', ireland: 'IE',
  belarus: 'BY', 'costa rica': 'CR', venezuela: 'VE', china: 'CN',
  cyprus: 'CY', 'north cyprus': 'CY', azerbaijan: 'AZ', lithuania: 'LT',
  bulgaria: 'BG', congo: 'CG', 'united arab emirates': 'AE', uae: 'AE',
  latvia: 'LV', greece: 'GR', moldova: 'MD', estonia: 'EE', vietnam: 'VN',
  slovakia: 'SK', kenya: 'KE', kazakhstan: 'KZ', jamaica: 'JM',
  nigeria: 'NG', 'south korea': 'KR', korea: 'KR', ecuador: 'EC',
  zimbabwe: 'ZW', norway: 'NO', romania: 'RO', paraguay: 'PY',
  cambodia: 'KH', 'dominican republic': 'DO', guatemala: 'GT',
  serbia: 'RS', croatia: 'HR', tunisia: 'TN', taiwan: 'TW',
};

function guessCountry(countryHint) {
  if (!countryHint) return undefined;
  return COUNTRY_TO_ISO[countryHint.trim().toLowerCase()];
}

/** Normalizes a phone number to E.164 (e.g. "+15551234567") using
 * `countryHint` (a free-text country field already on the form) to resolve
 * a number typed without its own country code. Returns the original,
 * trimmed string unchanged if it can't be confidently parsed -- a save
 * must never be blocked by an unparseable number, this only upgrades what
 * it can so every WhatsApp/call link it feeds (see
 * business/contactLinks.js's whatsAppLink()) resolves correctly. */
export function normalizePhone(raw, countryHint) {
  const trimmed = (raw || '').trim();
  if (!trimmed) return trimmed;
  try {
    const parsed = parsePhoneNumberFromString(trimmed, guessCountry(countryHint));
    if (parsed && parsed.isValid()) return parsed.number;
  } catch (_) {
    // Fall through -- keep the original text rather than reject the save.
  }
  return trimmed;
}

/** True if `raw` parses as a real, dialable number (with `countryHint`
 * resolving a missing country code the same way normalizePhone does) --
 * for a soft "this doesn't look right" form hint, never a hard block. */
export function isValidPhone(raw, countryHint) {
  const trimmed = (raw || '').trim();
  if (!trimmed) return true;
  try {
    const parsed = parsePhoneNumberFromString(trimmed, guessCountry(countryHint));
    return !!parsed && parsed.isValid();
  } catch (_) {
    return false;
  }
}
