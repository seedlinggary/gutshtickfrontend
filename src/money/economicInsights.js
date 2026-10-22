/** Same idea as stockInsights.js, for the 4 economic indicator cards:
 * derive plain-language metrics from the price history Gut Money already
 * has (these 4 endpoints return FULL history on the free tier -- no
 * outputsize cap like stock daily data has, confirmed live: CPI back to
 * 1913, unemployment to 1948, fed funds rate to 1954, real GDP to 1929). */

const DAY_MS = 24 * 60 * 60 * 1000;

// 'rate' indicators (unemployment, fed funds rate) are already percentages,
// so their "change" is shown in percentage POINTS (+0.4 pts), not a percent
// change of a percent, which would be a confusing double-percentage. 'level'
// indicators (CPI, real GDP) show a percent change instead -- for CPI, the
// 12-month percent change *is*, by definition, the commonly-quoted annual
// inflation rate, which is called out explicitly rather than left for the
// reader to realize on their own.
export const INDICATOR_META = {
  cpi: { kind: 'level', glossary: { term: 'CPI (Consumer Price Index)', definition: "A measure of the average price of a fixed basket of consumer goods and services. It's an index number, not a dollar amount -- what matters is how much it's changed. Its 12-month percent change is literally how the US annual inflation rate is calculated." } },
  unemployment: { kind: 'rate', glossary: { term: 'Unemployment rate', definition: 'The share of the labor force that is jobless and actively looking for work. A rise generally signals a weakening job market; a fall generally signals a strengthening one.' } },
  federal_funds_rate: { kind: 'rate', glossary: { term: 'Federal funds rate', definition: "The Federal Reserve's benchmark interest rate -- what banks charge each other for overnight loans. The Fed raises it to cool inflation/borrowing and cuts it to stimulate the economy, and it ripples out to mortgage, credit card, and savings rates economy-wide." } },
  real_gdp: { kind: 'level', glossary: { term: 'Real GDP', definition: "The total value of everything the US economy produced, adjusted for inflation (that's what \"real\" means here, as opposed to \"nominal\"). Its year-over-year percent change is the economic growth rate." } },
};

export const RANGE_GLOSSARY = [
  { term: 'Range over period', definition: 'The lowest and highest reading in the time window you have selected -- a quick way to see how much this indicator has actually moved, not just where it is today.' },
  { term: 'Change over period', definition: "How much this indicator has moved from some point in the past to its latest reading. Shown as a percent change for index/level-style indicators (CPI, GDP), or as percentage POINTS for indicators that are already a percentage (unemployment, Fed funds rate)." },
];

// The closest point BY DATE to the target, not just "first at or after" --
// a fixed 365-day year is only an approximation (leap years are 366 days),
// which is harmless for monthly/weekly data (there's always another point
// within a few days) but can skip right past the one point that exists for
// annual data like real GDP, landing one day short of an exact match and
// coming up with nothing. Closest-by-distance has no such edge case.
function closestToDate(points, targetMs) {
  let best = null;
  let bestDist = Infinity;
  for (const p of points) {
    const dist = Math.abs(new Date(p.date).getTime() - targetMs);
    if (dist < bestDist) { best = p; bestDist = dist; }
  }
  return best;
}

/** `points` must be sorted oldest-first, [{date, value}] with numeric-ish
 * value. The "N years ago" cutoff is measured from the latest DATA point,
 * not from today -- annual series like real GDP can lag a year or more
 * behind real-time (the newest reading is for last year, not this one), so
 * measuring from "today" would come up empty even with plenty of history
 * to compare against. */
export function changeOverYears(points, years, kind) {
  if (!points || points.length < 2) return null;
  const latest = points[points.length - 1];
  const latestValue = Number(latest.value);
  const target = new Date(latest.date).getTime() - years * 365 * DAY_MS;
  const past = closestToDate(points, target);
  if (!past || past === latest) return null;
  const pastValue = Number(past.value);
  if (kind === 'rate') {
    return { pointChange: latestValue - pastValue, pastDate: past.date };
  }
  if (!pastValue) return null;
  return { pctChange: ((latestValue - pastValue) / pastValue) * 100, pastDate: past.date };
}

/** Same "measure from the latest data point, not today" reasoning as
 * changeOverYears above. */
export function rangeOverYears(points, years) {
  if (!points || points.length === 0) return null;
  const latestDate = points[points.length - 1].date;
  const cutoff = new Date(latestDate).getTime() - years * 365 * DAY_MS;
  const windowed = points.filter((p) => new Date(p.date).getTime() >= cutoff);
  if (windowed.length === 0) return null;
  const values = windowed.map((p) => Number(p.value));
  return { min: Math.min(...values), max: Math.max(...values) };
}
