// Shared by BusinessDirectory.js and DealsFeed.js to default their city
// filter to "near me" -- same Photon reverse-geocoder AddressAutocomplete.js
// already uses for forward geocoding, just called with /api/reverse
// instead. Never throws and never surfaces a UI error: geolocation is a
// nice-to-have default a user can always override by typing a city, not
// something that should ever block or error the page.
const PHOTON_REVERSE_URL = 'https://photon.komoot.io/api/reverse';

// Mirrors the standard GeolocationPositionError codes (1/2/3) plus a 0 for
// "the API doesn't exist at all in this browser" -- kept as plain numbers
// rather than importing anything, since navigator.geolocation's own error
// object already uses exactly this numbering.
export const GEO_UNSUPPORTED = 0;
export const GEO_PERMISSION_DENIED = 1;
export const GEO_POSITION_UNAVAILABLE = 2;
export const GEO_TIMEOUT = 3;

function getPosition() {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) { resolve({ error: GEO_UNSUPPORTED }); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ pos }),
      (err) => resolve({ error: err.code }),
      // A real permission *denial* still rejects instantly no matter how
      // high this is set -- the browser doesn't wait around for that. What
      // this actually bounds is "permission granted, still waiting on an
      // actual fix," which commonly takes longer than 6s on a desktop/
      // laptop with no GPS (falling back to WiFi/IP-based positioning) or
      // on a phone's first-ever cold GPS fix. 6s was cutting that off and
      // surfacing "couldn't get your location" even on a clean allow.
      { timeout: 20000, maximumAge: 10 * 60 * 1000 }
    );
  });
}

/** Resolves to {lat, lng} for the browser's current position, or null --
 * same never-throws contract as detectNearbyCity, for anything that just
 * wants coordinates and doesn't care why it failed (city auto-fill). Use
 * getBrowserCoordsDetailed instead where the UI should explain *why* it
 * didn't work (permission denied vs. just slow/unavailable). */
export async function getBrowserCoords() {
  const { pos } = await getPosition();
  return pos ? { lat: pos.coords.latitude, lng: pos.coords.longitude } : null;
}

/** Same as getBrowserCoords, but resolves to {coords}|{error} instead of
 * collapsing every failure to the same null -- lets the "Near me" chip tell
 * "you blocked location for this site" apart from "that just timed out,
 * try again", instead of a single blanket permissions message that's wrong
 * more often than not (most failures here are #2/#3, not #1). */
export async function getBrowserCoordsDetailed() {
  const { pos, error } = await getPosition();
  return pos ? { coords: { lat: pos.coords.latitude, lng: pos.coords.longitude } } : { error };
}

// Shared by the "Near me" filter-panel chip (BusinessDirectory.js) and the
// map's own "Find nearby" (BusinessMap.js, which also draws a matching
// circle from the same math) so a radius search means the same bounding box
// no matter which control produced it.
const MILES_PER_DEGREE_LAT = 69;

export function radiusToBbox(point, miles) {
  const latDelta = miles / MILES_PER_DEGREE_LAT;
  const lngDelta = miles / (MILES_PER_DEGREE_LAT * Math.cos((point.lat * Math.PI) / 180));
  return {
    north: point.lat + latDelta, south: point.lat - latDelta,
    east: point.lng + lngDelta, west: point.lng - lngDelta,
  };
}

/** Resolves to a city name near the browser's current position, or null if
 * geolocation is unavailable/denied/fails for any reason. Never rejects. */
export default async function detectNearbyCity() {
  const { pos } = await getPosition();
  if (!pos) return null;
  try {
    const url = `${PHOTON_REVERSE_URL}?lon=${pos.coords.longitude}&lat=${pos.coords.latitude}&lang=en`;
    const res = await fetch(url);
    const data = await res.json();
    const props = data?.features?.[0]?.properties;
    return props ? (props.city || props.district || props.town || props.village || null) : null;
  } catch (_) {
    return null;
  }
}
