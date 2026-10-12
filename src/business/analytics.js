import apiRequest from '../ApiRequest';

/** Fire-and-forget click analytics for a business's own listing (profile
 * views, WhatsApp taps, directions taps, deal views/shares) -- reuses the
 * same anonymous id the main site's VisitorTracker.js already generates,
 * so a business's numbers and the site-wide visitor numbers are counting
 * the same underlying visitors, not two disjoint identities. */
export function trackBusinessEvent(businessId, eventType) {
  if (!businessId || !eventType) return;
  let anonId = null;
  try { anonId = localStorage.getItem('anon_id'); } catch (e) { /* ignore */ }
  apiRequest('POST', { event_type: eventType, anon_id: anonId }, `/business/businesses/${businessId}/track`)
    .catch(() => { /* never let a tracking failure affect the UI action it's attached to */ });
}
