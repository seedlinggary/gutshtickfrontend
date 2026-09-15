// Shared by BusinessDirectory.js and DealsFeed.js to default their city
// filter to "near me" -- same Photon reverse-geocoder AddressAutocomplete.js
// already uses for forward geocoding, just called with /api/reverse
// instead. Never throws and never surfaces a UI error: geolocation is a
// nice-to-have default a user can always override by typing a city, not
// something that should ever block or error the page.
const PHOTON_REVERSE_URL = 'https://photon.komoot.io/api/reverse';

function getPosition() {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null), // denied, unavailable, or timed out -- all the same to the caller
      { timeout: 6000, maximumAge: 10 * 60 * 1000 }
    );
  });
}

/** Resolves to a city name near the browser's current position, or null if
 * geolocation is unavailable/denied/fails for any reason. Never rejects. */
export default async function detectNearbyCity() {
  const pos = await getPosition();
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
