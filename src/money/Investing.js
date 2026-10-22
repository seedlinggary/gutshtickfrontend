import React, { useEffect, useState } from 'react';
import { LineChart as LineChartIcon, Search, Star, X, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';
import { LineChart } from '../shared/SimpleCharts';
import { computeInsights, GLOSSARY } from './stockInsights';
import { INDICATOR_META, RANGE_GLOSSARY, changeOverYears, rangeOverYears } from './economicInsights';

// Ranges under 6M are sliced from the daily series (free-tier daily history
// only covers the latest ~100 trading days -- about 4-5 months); 6M and up
// come from the weekly series instead, which has no such cap (confirmed
// live: 1,400+ weekly points of full history on the free tier).
const RANGES = [
  { key: '1M', label: '1M', days: 30, series: 'daily' },
  { key: '3M', label: '3M', days: 91, series: 'daily' },
  { key: '6M', label: '6M', days: 182, series: 'weekly' },
  { key: '1Y', label: '1Y', days: 365, series: 'weekly' },
  { key: '5Y', label: '5Y', days: 365 * 5, series: 'weekly' },
  { key: 'MAX', label: 'Max', days: null, series: 'weekly' },
];

function sliceRange(points, range) {
  if (!points || !range) return null;
  if (range.days == null) return points;
  const cutoff = Date.now() - range.days * 24 * 60 * 60 * 1000;
  return points.filter((p) => new Date(p.date).getTime() >= cutoff);
}

const INDICATORS = [
  { key: 'cpi', label: 'CPI (Inflation)', unitSuffix: '' },
  { key: 'unemployment', label: 'Unemployment Rate', unitSuffix: '%' },
  { key: 'federal_funds_rate', label: 'Federal Funds Rate', unitSuffix: '%' },
  { key: 'real_gdp', label: 'Real GDP', unitSuffix: '' },
].map((ind) => ({ ...ind, ...INDICATOR_META[ind.key] }));

// These 4 endpoints return FULL history with no outputsize cap (confirmed
// live -- CPI alone goes back to 1913), so "large" ranges are real options
// here, unlike stock daily data.
const INDICATOR_RANGES = [
  { key: '1Y', label: '1Y', years: 1 },
  { key: '5Y', label: '5Y', years: 5 },
  { key: '10Y', label: '10Y', years: 10 },
  { key: '25Y', label: '25Y', years: 25 },
  { key: 'MAX', label: 'Max', years: null },
];

function sliceByYears(points, years) {
  if (years == null || points.length === 0) return points;
  // Measured from the latest DATA point, not today -- see
  // economicInsights.js's changeOverYears for why (annual series like real
  // GDP lag real-time by a year or more).
  const cutoff = new Date(points[points.length - 1].date).getTime() - years * 365 * 24 * 60 * 60 * 1000;
  return points.filter((p) => new Date(p.date).getTime() >= cutoff);
}

function formatIndicatorValue(value, unitSuffix) {
  return `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}${unitSuffix}`;
}

function IndicatorCard({ indicator }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [range, setRange] = useState(INDICATOR_RANGES[1]); // 5Y default
  const [glossaryOpen, setGlossaryOpen] = useState(false);

  useEffect(() => {
    apiRequest('GET', null, `/finance/indicator/${indicator.key}`)
      .then(setData)
      .catch(() => setError(true));
  }, [indicator.key]);

  if (error) return <div className="fin-indicator-card"><h4>{indicator.label}</h4><p className="fin-empty">Unavailable right now.</p></div>;
  if (!data) return <div className="fin-indicator-card"><h4>{indicator.label}</h4><p className="fin-empty">Loading…</p></div>;

  // AV returns these newest-first; flip to oldest-first once, used for both
  // the compact sparkline and (sliced further) the expanded chart/metrics.
  const allPoints = (data.data || []).slice().reverse().map((d) => ({ date: d.date, value: d.value }));
  const latest = data.data && data.data[0];

  if (!expanded) {
    const miniPoints = allPoints.slice(-24).map((p, i) => ({ x: i, y: Number(p.value), date: p.date }));
    return (
      <div className="fin-indicator-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h4>{indicator.label}</h4>
          <button type="button" className="fin-indicator-expand" onClick={() => setExpanded(true)}>
            View details <ChevronDown size={13} />
          </button>
        </div>
        <div className="fin-indicator-value">{latest ? formatIndicatorValue(latest.value, indicator.unitSuffix) : '—'}</div>
        {miniPoints.length > 1 && (
          <LineChart
            points={miniPoints} height={120} compact
            formatY={(v) => `${v.toFixed(1)}${indicator.unitSuffix}`}
            xLabel={(p) => p.date}
            ariaLabel={`${indicator.label} trend`}
          />
        )}
        <p style={{ fontSize: 11.5, color: 'var(--muted)', margin: '6px 0 0' }}>As of {latest ? latest.date : '—'}</p>
      </div>
    );
  }

  const rangedPoints = sliceByYears(allPoints, range.years);
  const chartPoints = rangedPoints.map((p, i) => ({ x: i, y: Number(p.value), date: p.date }));
  const change1Y = changeOverYears(allPoints, 1, indicator.kind);
  const change5Y = changeOverYears(allPoints, 5, indicator.kind);
  const rangeStats = rangeOverYears(allPoints, range.years ?? 200);
  const change1YLabel = indicator.key === 'cpi' ? 'Annual inflation rate' : '1-year change';

  return (
    <div className="fin-indicator-card fin-indicator-card-expanded" style={{ gridColumn: '1 / -1' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h4>{indicator.label}</h4>
        <button type="button" className="fin-indicator-expand" onClick={() => setExpanded(false)}>
          Collapse <ChevronUp size={13} />
        </button>
      </div>
      <div className="fin-indicator-value">{latest ? formatIndicatorValue(latest.value, indicator.unitSuffix) : '—'}</div>
      <p style={{ fontSize: 11.5, color: 'var(--muted)', margin: '-6px 0 10px' }}>As of {latest ? latest.date : '—'}</p>

      <div className="fin-chip-row" style={{ marginBottom: 0 }}>
        {INDICATOR_RANGES.map((r) => (
          <button key={r.key} type="button" className={`fin-chip${range.key === r.key ? ' active' : ''}`} onClick={() => setRange(r)}>
            {r.label}
          </button>
        ))}
      </div>
      {chartPoints.length > 1 && (
        <div style={{ marginTop: 10 }}>
          <LineChart points={chartPoints} formatY={(v) => `${v.toFixed(1)}${indicator.unitSuffix}`} xLabel={(p) => p.date} ariaLabel={`${indicator.label} history`} />
        </div>
      )}

      <div className="fin-insight-section">
        <h4 className="fin-insight-heading">In-depth: what this data actually means</h4>
        <div className="fin-insight-grid">
          <div className="fin-insight-tile">
            <div className="fin-insight-tile-label">Range over selected period</div>
            {rangeStats ? (
              <div className="fin-insight-tile-value">
                {formatIndicatorValue(rangeStats.min, indicator.unitSuffix)} – {formatIndicatorValue(rangeStats.max, indicator.unitSuffix)}
              </div>
            ) : <div className="fin-insight-tile-value" style={{ color: 'var(--muted)' }}>—</div>}
          </div>
          <div className="fin-insight-tile">
            <div className="fin-insight-tile-label">{change1YLabel}</div>
            {change1Y ? (
              <div className={`fin-insight-tile-value ${(change1Y.pctChange ?? change1Y.pointChange) >= 0 ? 'up' : 'down'}`}>
                {indicator.kind === 'rate'
                  ? `${change1Y.pointChange >= 0 ? '+' : ''}${change1Y.pointChange.toFixed(2)} pts`
                  : `${change1Y.pctChange >= 0 ? '+' : ''}${change1Y.pctChange.toFixed(1)}%`}
              </div>
            ) : <div className="fin-insight-tile-value" style={{ color: 'var(--muted)' }}>Not enough history</div>}
            <div className="fin-insight-tile-note">vs. ~1 year ago</div>
          </div>
          <div className="fin-insight-tile">
            <div className="fin-insight-tile-label">5-year change</div>
            {change5Y ? (
              <div className={`fin-insight-tile-value ${(change5Y.pctChange ?? change5Y.pointChange) >= 0 ? 'up' : 'down'}`}>
                {indicator.kind === 'rate'
                  ? `${change5Y.pointChange >= 0 ? '+' : ''}${change5Y.pointChange.toFixed(2)} pts`
                  : `${change5Y.pctChange >= 0 ? '+' : ''}${change5Y.pctChange.toFixed(1)}%`}
              </div>
            ) : <div className="fin-insight-tile-value" style={{ color: 'var(--muted)' }}>Not enough history</div>}
            <div className="fin-insight-tile-note">vs. ~5 years ago</div>
          </div>
        </div>

        <div className="fin-glossary">
          <button type="button" className="fin-glossary-toggle" onClick={() => setGlossaryOpen((o) => !o)}>
            {glossaryOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            What do these terms mean?
          </button>
          {glossaryOpen && (
            <div className="fin-glossary-list">
              {[indicator.glossary, ...RANGE_GLOSSARY].map((g) => (
                <div key={g.term}>
                  <div className="fin-glossary-term">{g.term}</div>
                  <p className="fin-glossary-def">{g.definition}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Investing() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [symbol, setSymbol] = useState(null);
  const [quote, setQuote] = useState(null);
  const [chart, setChart] = useState(null);
  const [weeklyChart, setWeeklyChart] = useState(null);
  const [range, setRange] = useState(RANGES[1]); // 3M default
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [watchlist, setWatchlist] = useState(null);
  const loggedIn = isLoggedIn();

  useEffect(() => {
    if (loggedIn) {
      apiRequest('GET', null, '/finance/watchlist').then((d) => setWatchlist(d.items || [])).catch(() => setWatchlist([]));
    }
  }, [loggedIn]);

  const search = async (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    setSearching(true);
    try {
      const d = await apiRequest('GET', null, `/finance/search?q=${encodeURIComponent(q.trim())}`);
      setResults(d.results || []);
    } catch (e2) {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const loadSymbol = async (sym) => {
    setSymbol(sym);
    setResults(null);
    setQuote(null);
    setChart(null);
    setWeeklyChart(null);
    setRange(RANGES[1]);
    setLoadError('');
    try {
      // Weekly is fetched alongside the quote/daily chart (not lazily on
      // range-change) because the insights panel below -- 52-week range,
      // moving averages, period returns -- needs it by default, not just
      // when someone clicks a 6M+ range button.
      const [q1, c1, c2] = await Promise.all([
        apiRequest('GET', null, `/finance/quote?symbol=${encodeURIComponent(sym)}`),
        apiRequest('GET', null, `/finance/chart?symbol=${encodeURIComponent(sym)}`),
        apiRequest('GET', null, `/finance/chart?symbol=${encodeURIComponent(sym)}&series=weekly`),
      ]);
      setQuote(q1.quote);
      setChart(c1.points);
      setWeeklyChart(c2.points);
    } catch (e) {
      setLoadError(typeof e === 'string' ? e : 'Could not load market data for this symbol right now (the shared free API quota may be used up for today -- try again later).');
    }
  };

  const isWatched = (sym) => (watchlist || []).some((w) => w.symbol === sym);
  const toggleWatch = async (sym) => {
    if (!loggedIn) return;
    if (isWatched(sym)) {
      await apiRequest('DELETE', null, `/finance/watchlist/${sym}`);
      setWatchlist((rows) => rows.filter((w) => w.symbol !== sym));
    } else {
      await apiRequest('POST', { symbol: sym }, '/finance/watchlist');
      setWatchlist((rows) => [...rows, { symbol: sym }]);
    }
  };

  const changePct = quote ? parseFloat(quote['change percent']) : null;
  const rangeSourcePoints = range.series === 'weekly' ? weeklyChart : chart;
  const rangedPoints = sliceRange(rangeSourcePoints, range);
  const chartPoints = rangedPoints
    ? rangedPoints.map((p, i) => ({ x: i, y: Number(p.close), date: p.date }))
    : null;
  const insights = (chart && weeklyChart) ? computeInsights({ quote, daily: chart, weekly: weeklyChart }) : null;

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 980 }}>
        <div className="fin-masthead">
          <div className="fin-masthead-kicker"><LineChartIcon size={13} /> Investing</div>
          <h1 className="fin-masthead-title">Look up a stock, track the economy</h1>
          <p className="fin-masthead-sub">Quotes and charts are real market data, delayed and refreshed periodically (not live-streaming) -- this is a research tool, not a trading platform.</p>
        </div>

        <form onSubmit={search} style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--muted)' }} />
            <input className="gs-input" style={{ paddingLeft: 32, width: '100%' }} placeholder="Search by company name or ticker" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <button type="submit" className="gs-btn gs-btn-primary" disabled={searching}>{searching ? 'Searching…' : 'Search'}</button>
        </form>

        {results && (
          <div className="fin-form-section">
            {results.length === 0 && <p className="fin-empty">No matches found.</p>}
            {results.map((r) => (
              <div key={r.symbol} className="fin-search-result" onClick={() => loadSymbol(r.symbol)}>
                <div><strong>{r.symbol}</strong> <span style={{ color: 'var(--muted)' }}>{r.name}</span></div>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{r.region}</span>
              </div>
            ))}
          </div>
        )}

        {loadError && <p className="fin-error">{loadError}</p>}

        {symbol && !loadError && (
          <div className="fin-quote-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ margin: 0 }}>{symbol}</h2>
                {quote && (
                  <div>
                    <span className="fin-quote-price">${quote.price}</span>
                    <span className={`fin-quote-change ${changePct >= 0 ? 'up' : 'down'}`}>
                      {changePct >= 0 ? <TrendingUp size={14} style={{ verticalAlign: -2 }} /> : <TrendingDown size={14} style={{ verticalAlign: -2 }} />}
                      {' '}{quote.change} ({quote['change percent']})
                    </span>
                  </div>
                )}
              </div>
              {loggedIn && (
                <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => toggleWatch(symbol)}>
                  <Star size={14} fill={isWatched(symbol) ? 'currentColor' : 'none'} /> {isWatched(symbol) ? 'Watching' : 'Watch'}
                </button>
              )}
            </div>
            <div className="fin-chip-row" style={{ marginTop: 16, marginBottom: 0 }}>
              {RANGES.map((r) => (
                <button
                  key={r.key} type="button" className={`fin-chip${range.key === r.key ? ' active' : ''}`}
                  onClick={() => setRange(r)} disabled={r.series === 'weekly' && !weeklyChart}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {chartPoints && (
              <div style={{ marginTop: 10 }}>
                <LineChart points={chartPoints} formatY={(v) => `$${v.toFixed(2)}`} xLabel={(p) => p.date} ariaLabel={`${symbol} price history`} />
              </div>
            )}
            {quote && (
              <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 8 }}>
                Latest trading day: {quote['latest trading day']} · Volume: {Number(quote.volume).toLocaleString()}
              </p>
            )}

            {insights && (
              <div className="fin-insight-section">
                <h4 className="fin-insight-heading">In-depth: what this data actually means</h4>

                {insights.fiftyTwoWeek && insights.currentPrice && (
                  <div className="fin-insight-tile" style={{ marginBottom: 12 }}>
                    <div className="fin-insight-tile-label">52-week range -- where today's price sits</div>
                    <div className="fin-52wk-bar">
                      <div
                        className="fin-52wk-bar-dot"
                        style={{
                          left: `${Math.min(100, Math.max(0, ((insights.currentPrice - insights.fiftyTwoWeek.low) / ((insights.fiftyTwoWeek.high - insights.fiftyTwoWeek.low) || 1)) * 100))}%`,
                        }}
                      />
                    </div>
                    <div className="fin-52wk-bar-labels">
                      <span>${insights.fiftyTwoWeek.low.toFixed(2)} low</span>
                      <span>${insights.fiftyTwoWeek.high.toFixed(2)} high</span>
                    </div>
                    <p className="fin-insight-tile-note">
                      {(() => {
                        const { high, low } = insights.fiftyTwoWeek;
                        const fromHigh = ((high - insights.currentPrice) / high) * 100;
                        const fromLow = ((insights.currentPrice - low) / low) * 100;
                        return fromHigh <= fromLow
                          ? `Trading ${fromHigh.toFixed(1)}% below its 52-week high.`
                          : `Trading ${fromLow.toFixed(1)}% above its 52-week low.`;
                      })()}
                    </p>
                  </div>
                )}

                <div className="fin-insight-grid">
                  {[
                    { label: '20-day average', value: insights.ma20 },
                    { label: '50-day average', value: insights.ma50 },
                    { label: '~200-day average', value: insights.ma200, note: '(approximated from 40 weeks)' },
                  ].map((m) => {
                    const above = m.value != null && insights.currentPrice != null && insights.currentPrice >= m.value;
                    return (
                      <div key={m.label} className="fin-insight-tile">
                        <div className="fin-insight-tile-label">{m.label}</div>
                        {m.value != null ? (
                          <>
                            <div className={`fin-insight-tile-value ${above ? 'up' : 'down'}`}>${m.value.toFixed(2)}</div>
                            <div className="fin-insight-tile-note">Price is {above ? 'above' : 'below'} this {m.note || ''}</div>
                          </>
                        ) : <div className="fin-insight-tile-value" style={{ color: 'var(--muted)' }}>Not enough history yet</div>}
                      </div>
                    );
                  })}
                </div>

                <div className="fin-insight-grid">
                  {Object.entries(insights.returns).map(([label, pct]) => (
                    <div key={label} className="fin-insight-tile">
                      <div className="fin-insight-tile-label">{label} return</div>
                      {pct != null ? (
                        <div className={`fin-insight-tile-value ${pct >= 0 ? 'up' : 'down'}`}>{pct >= 0 ? '+' : ''}{pct.toFixed(1)}%</div>
                      ) : <div className="fin-insight-tile-value" style={{ color: 'var(--muted)' }}>—</div>}
                    </div>
                  ))}
                </div>

                <div className="fin-glossary">
                  <button type="button" className="fin-glossary-toggle" onClick={() => setGlossaryOpen((o) => !o)}>
                    {glossaryOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    What do these terms mean?
                  </button>
                  {glossaryOpen && (
                    <div className="fin-glossary-list">
                      {GLOSSARY.map((g) => (
                        <div key={g.term}>
                          <div className="fin-glossary-term">{g.term}</div>
                          <p className="fin-glossary-def">{g.definition}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {loggedIn && watchlist && watchlist.length > 0 && (
          <div className="fin-form-section">
            <h3>Your watchlist</h3>
            {watchlist.map((w) => (
              <div key={w.symbol} className="fin-watchlist-row">
                <button type="button" style={{ background: 'none', border: 'none', fontWeight: 700, cursor: 'pointer', color: 'var(--text)' }} onClick={() => loadSymbol(w.symbol)}>{w.symbol}</button>
                <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => toggleWatch(w.symbol)} aria-label="Remove from watchlist"><X size={13} /></button>
              </div>
            ))}
          </div>
        )}

        <h2 style={{ marginTop: 28 }}>The economy right now</h2>
        <p style={{ color: 'var(--muted)', fontSize: 13.5, marginTop: -8, marginBottom: 16 }}>Official US economic indicators, updated monthly.</p>
        <div className="fin-indicator-grid">
          {INDICATORS.map((ind) => <IndicatorCard key={ind.key} indicator={ind} />)}
        </div>
      </div>
    </div>
  );
}
