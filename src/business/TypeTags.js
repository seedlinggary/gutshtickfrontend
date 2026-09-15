import React from 'react';

/** Read-only display of a business's subtype tags (e.g. "Dairy",
 * "Fine Dining") -- see TypeTagPicker.js for the editable version used in
 * BusinessForm. Renders nothing when there are no tags. */
export default function TypeTags({ types }) {
  if (!types || types.length === 0) return null;
  return (
    <div className="biz-type-tags">
      {types.map((t) => (
        <span key={t} className="biz-type-tag">{t}</span>
      ))}
    </div>
  );
}
