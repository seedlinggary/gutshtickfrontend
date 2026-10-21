/** Derives plain-language insights from the raw Alpha Vantage data Gut
 * Money already has on hand (a quote, ~100 days of daily closes, and full
 * weekly history) -- Alpha Vantage's free tier has no "fundamentals"
 * endpoint (OVERVIEW is premium-only, confirmed live), so there's no P/E,
 * market cap, or dividend yield to show. Everything here is instead
 * computed from price history itself: 52-week range, moving averages, and
 * period returns -- the same things a beginner would otherwise have to look
 * up the definition of AND do the math for by hand. */

export const GLOSSARY = [
  { term: 'Open / High / Low / Close', definition: "A trading day's first, highest, lowest, and final price. \"Close\" is what most charts and quotes mean by \"the price.\"" },
  { term: 'Previous close', definition: 'The closing price from the last trading day before this one -- the baseline that "change" and "change %" are measured against.' },
  { term: 'Change / Change %', definition: "How much the price moved since the previous close, in dollars and as a percentage. Positive means up, negative means down." },
  { term: 'Volume', definition: 'How many shares changed hands. Higher volume means a move is backed by more trading activity, which generally makes it more meaningful.' },
  { term: '52-week range', definition: "The lowest and highest price this stock has touched in the past year. Where today's price sits in that range is a quick way to gauge whether it's historically cheap or expensive right now." },
  { term: 'Moving average (MA)', definition: 'The average closing price over a trailing window (e.g. the last 20 days). It smooths out day-to-day noise so you can see the underlying trend. Price above its moving average is generally read as a sign of upward momentum; below is generally read as downward momentum.' },
  { term: 'Period return', definition: 'The percentage change in price from some point in the past (a week, a month, a year ago) to today -- a plain way to answer "how has this actually done lately?"' },
];

const DAY_MS = 24 * 60 * 60 * 1000;

function closesSince(points, days) {
  const cutoff = Date.now() - days * DAY_MS;
  return points.filter((p) => new Date(p.date).getTime() >= cutoff);
}

function sma(points, windowSize) {
  if (points.length < windowSize) return null;
  const last = points.slice(-windowSize);
  return last.reduce((sum, p) => sum + Number(p.close), 0) / windowSize;
}

function returnOver(points, days, currentPrice) {
  const cutoff = Date.now() - days * DAY_MS;
  // First point on/after the cutoff -- the closest available trading day
  // to "N days ago" (markets aren't open every calendar day).
  const past = points.find((p) => new Date(p.date).getTime() >= cutoff);
  if (!past || !currentPrice) return null;
  const pastClose = Number(past.close);
  if (!pastClose) return null;
  return ((currentPrice - pastClose) / pastClose) * 100;
}

/** `daily`/`weekly` are the sorted (oldest-first) point arrays from
 * /finance/chart (default + ?series=weekly), `quote` is /finance/quote's
 * payload. Any input can be missing/short -- every computed field is null
 * when there isn't enough history for it, rather than guessing. */
export function computeInsights({ quote, daily, weekly }) {
  const currentPrice = quote ? parseFloat(quote.price) : null;
  const dailyPts = daily || [];
  const weeklyPts = weekly || [];

  const yearPts = closesSince(weeklyPts, 365);
  const fiftyTwoWeek = yearPts.length > 0 ? {
    high: Math.max(...yearPts.map((p) => Number(p.high))),
    low: Math.min(...yearPts.map((p) => Number(p.low))),
  } : null;

  const ma20 = sma(dailyPts, 20);
  const ma50 = sma(dailyPts, 50);
  // ~200 trading days -- approximated from weekly closes (40 weeks) since
  // free-tier daily history only ever covers the latest ~100 trading days.
  const ma200 = sma(weeklyPts, 40);

  const returns = {
    '1W': returnOver(dailyPts, 7, currentPrice),
    '1M': returnOver(dailyPts, 30, currentPrice),
    '3M': returnOver(weeklyPts, 91, currentPrice),
    '6M': returnOver(weeklyPts, 182, currentPrice),
    '1Y': returnOver(weeklyPts, 365, currentPrice),
  };

  return { currentPrice, fiftyTwoWeek, ma20, ma50, ma200, returns };
}
