import React, { useState } from 'react';

// Short, factual descriptions of what each hashgacha actually certifies --
// not exhaustive, but enough to remove the "what does this symbol even
// mean" friction for a directory whose whole premise rests on kashrut
// trust. Matched by substring against whatever string an owner typed into
// the kashrut field, so "OU" matches "OU-D" too.
export const KASHRUT_GLOSSARY = [
  { match: /\bOU\b/i, label: 'OU', description: 'Orthodox Union -- one of the largest kosher certification agencies worldwide, supervising ingredients and production.' },
  { match: /\bOK\b/i, label: 'OK', description: 'OK Kosher Certification -- a major international kosher certification agency.' },
  { match: /star-?k/i, label: 'Star-K', description: 'Star-K Kosher Certification, based in Baltimore -- certifies food products, restaurants, and hotels.' },
  { match: /\bkof-?k\b/i, label: 'Kof-K', description: 'Kof-K Kosher Supervision -- certifies food manufacturers and restaurants.' },
  { match: /crc|chicago rabbinical/i, label: 'cRc', description: 'Chicago Rabbinical Council -- regional kosher certification agency.' },
  { match: /badatz|beth din/i, label: 'Badatz', description: 'A regional Beth Din\'s kosher certification -- standards can vary by beth din, so check with the specific business if unsure.' },
  { match: /chalav yisrael/i, label: 'Chalav Yisrael', description: 'Dairy produced under direct Jewish supervision from milking through processing, a stricter standard than "chalav stam."' },
  { match: /pas yisrael/i, label: 'Pas Yisrael', description: 'Bread/baked goods where a Jew was involved in lighting the oven, a stricter standard than plain kosher-certified baked goods.' },
  { match: /glatt/i, label: 'Glatt', description: 'A stricter standard for kosher meat requiring the animal\'s lungs to be free of certain adhesions.' },
];

export function describeKashrut(kashrutText) {
  if (!kashrutText) return [];
  return KASHRUT_GLOSSARY.filter((entry) => entry.match.test(kashrutText));
}

/** A small "(i)" next to a hashgacha badge -- click/tap to see what it
 * actually certifies, without leaving the page. */
export default function KashrutInfo({ kashrutText }) {
  const [open, setOpen] = useState(false);
  const matches = describeKashrut(kashrutText);
  if (!matches.length) return null;

  return (
    <span className="biz-kashrut-info">
      <button
        type="button"
        className="biz-kashrut-info-btn"
        aria-label="What does this kosher symbol mean?"
        aria-expanded={open}
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen((o) => !o); }}
      >
        ⓘ
      </button>
      {open && (
        <span className="biz-kashrut-info-popover" role="tooltip">
          {matches.map((entry) => (
            <span key={entry.label} className="biz-kashrut-info-row">
              <strong>{entry.label}:</strong> {entry.description}
            </span>
          ))}
        </span>
      )}
    </span>
  );
}
