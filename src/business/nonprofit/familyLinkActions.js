import nonprofitApiRequest from './nonprofitApi';

/** Shared by every record-list page's FamilyLinkCell wiring (Donations,
 * Memberships, Payment Links, Holiday Signups) -- these four record
 * types are the ones the families/merge endpoint already understands
 * (_MERGEABLE_MODELS server-side), so "combine this one record with a
 * family" is just a one-item call to that same endpoint, not a separate
 * API. `familyChoice` is either a real family id, or the '__new__'
 * sentinel FamilyLinkCell sends for "create a new family from this
 * record" (merge with no family_id does exactly that server-side,
 * auto-naming the family after the record). */
export function linkRecordToFamily(businessId, recordType, recordId, familyChoice) {
  const body = { items: [{ record_type: recordType, record_id: recordId }] };
  if (familyChoice !== '__new__') body.family_id = familyChoice;
  return nonprofitApiRequest('POST', body, `/nonprofit/businesses/${businessId}/families/merge`);
}

export function unlinkRecordFromFamily(recordType, recordId) {
  return nonprofitApiRequest('POST', { record_type: recordType, record_id: recordId }, '/nonprofit/records/unlink');
}
