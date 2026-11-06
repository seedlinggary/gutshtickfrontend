import React from 'react';
import { Users, X } from 'lucide-react';

/** The "combine with family" quick-picker + "who it's coming from"
 * display, shared by every record-list page (Donations, Memberships,
 * Payment Links, Holiday Signups, Other Transactions, Form Responses) --
 * one real implementation instead of five pages each growing their own
 * slightly-different version. Linked: shows the family's name as a
 * small badge with an Unlink button. Unlinked: a dropdown of existing
 * families plus "+ New family" (auto-named from this record, same as
 * picking no target family does when merging from the Families page
 * itself).
 *
 * `onChoose(familyId | '__new__')` -- the page decides how to actually
 * apply it (most go through the families/merge endpoint; form responses
 * go through their own direct family_id PATCH instead), since that
 * differs per record type and isn't this component's concern. */
export default function FamilyLinkCell({ families, familyId, familyName, onChoose, onUnlink, busy }) {
  if (familyId) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)' }}>
        <Users size={12} /> {familyName || `Family #${familyId}`}
        <button type="button" className="sb-icon-btn" disabled={busy} onClick={onUnlink} title="Unlink from family">
          <X size={11} />
        </button>
      </span>
    );
  }

  return (
    <select
      className="gs-select"
      style={{ fontSize: 12, padding: '3px 6px', maxWidth: 180 }}
      value=""
      disabled={busy}
      onChange={(e) => {
        if (!e.target.value) return;
        onChoose(e.target.value === '__new__' ? '__new__' : Number(e.target.value));
        e.target.value = '';
      }}
    >
      <option value="">Combine with family…</option>
      {(families || []).map((f) => <option key={f.id} value={f.id}>{f.full_name}</option>)}
      <option value="__new__">+ New family</option>
    </select>
  );
}
