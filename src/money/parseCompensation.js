/** Best-effort parser for the free-text "Compensation" field on a Tachlis
 * (Job Board) post -- see Tachlis.js's CreatePostForm, whose placeholder is
 * "Compensation (optional) — e.g. $50k-70k or Negotiable". People type
 * anything from "$50k-70k" to "Negotiable" to "₪15,000/mo" to "DOE" in that
 * one box, so this has to be liberal about giving up: returning `null` on
 * anything it isn't confident about is always correct, a wrong number never
 * is. Framework-free on purpose (same "pure function" style as
 * calculatorMath.js) so it can be unit-tested/reused without React. */

// Any token that matches these words (allowing for a little surrounding
// text like "Salary DOE" or "Pay is negotiable") means there's no number to
// find at all -- these show up constantly on real job boards.
const NO_NUMBER_WORDS = /\b(negotiable|doe|competitive|tbd|n\/?a|depends|flexible|open|based on experience|commensurate)\b/i;

// A single amount token: optional thousands-comma groups and/or a decimal,
// e.g. "50", "50,000", "50.5". The "k" suffix (for "50k") is captured
// separately since it multiplies the number rather than being part of it.
const AMOUNT_RE = /(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)\s*(k)?/gi;

const HOURLY_RE = /\/\s*(hr|hour)\b/i;
const MONTHLY_RE = /\/\s*(mo|month)\b/i;
const YEARLY_RE = /\/\s*(yr|year|annual|annum)\b/i;

/** Parses a free-text compensation string into a structured
 * { amount, period, currency } or returns `null` if it can't be confidently
 * parsed. `period` is 'hourly' | 'monthly' | 'yearly'; `currency` is
 * 'USD' | 'ILS'. Never throws. */
export function parseCompensation(text) {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  // No digits at all -- "Negotiable", "DOE", "Competitive", "Open", etc.
  // Nothing to parse, and no point guessing.
  if (!/\d/.test(trimmed)) return null;
  // Belt-and-suspenders: even if a stray digit shows up next to one of
  // these words (e.g. "Negotiable, 40hrs/week"), treat the whole field as
  // non-numeric rather than risk extracting the wrong number.
  if (NO_NUMBER_WORDS.test(trimmed) && !/[$₪]/.test(trimmed)) return null;

  const currency = trimmed.includes('₪') ? 'ILS' : 'USD';

  // Strip the currency symbols themselves (they're not part of the number)
  // but keep everything else -- hyphens, slashes and spaces all matter for
  // range/period detection below.
  const stripped = trimmed.replace(/[$₪]/g, '');

  const matches = [...stripped.matchAll(AMOUNT_RE)];
  if (matches.length === 0) return null;

  const toNumber = (m) => {
    const n = parseFloat(m[1].replace(/,/g, ''));
    if (!isFinite(n)) return null;
    return m[2] ? n * 1000 : n; // "k" suffix = thousands multiplier
  };

  // A range ("50k-70k", "$50,000 - $70,000") is two amount tokens -- take
  // the midpoint as the single representative figure. More than two
  // matches (e.g. a stray year number elsewhere in the text) just uses the
  // first two; anything beyond that is outside what this field is for.
  const first = toNumber(matches[0]);
  if (first == null) return null;
  let amount = first;
  if (matches.length >= 2) {
    const second = toNumber(matches[1]);
    if (second != null) amount = (first + second) / 2;
  }
  if (amount <= 0) return null;

  // Explicit period suffix wins when present.
  let period;
  if (HOURLY_RE.test(trimmed)) period = 'hourly';
  else if (MONTHLY_RE.test(trimmed)) period = 'monthly';
  else if (YEARLY_RE.test(trimmed)) period = 'yearly';
  else {
    // No suffix given -- guess from magnitude. This is a heuristic, not a
    // certainty: real-world job posts almost always write hourly pay under
    // $1,000 ("$25" means $25/hr, nobody pays $25/yr), monthly pay in the
    // thousands-to-low-five-figures range, and anything larger as an
    // annual salary. It will occasionally misfire on an oddly-written post
    // (e.g. a tiny annual stipend), but there's no suffix to go on, so a
    // reasonable guess beats showing nothing.
    if (amount < 1000) period = 'hourly';
    else if (amount < 20000) period = 'monthly';
    else period = 'yearly';
  }

  return { amount, period, currency };
}

export default parseCompensation;
