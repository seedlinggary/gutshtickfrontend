import React, { useEffect, useState } from 'react';
import { LineChart as LineChartIcon, Search, Star, X, TrendingUp, TrendingDown } from 'lucide-react';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';
import { LineChart } from '../shared/SimpleCharts';

const INDICATORS = [
  { key: 'cpi', label: 'CPI (Inflation)', unitSuffix: '' },
  { key: 'unemployment', label: 'Unemployment Rate', unitSuffix: '%' },
  { key: 'federal_funds_rate', label: 'Federal Funds Rate', unitSuffix: '%' },
  { key: 'real_gdp', label: 'Real GDP', unitSuffix: '' },
];

function IndicatorCard({ indicator }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    apiRequest('GET', null, `/finance/indicator/${indicator.key}`)
      .then(setData)
      .catch(() => setError(true));
  }, [indicator.key]);

  if (error) return <div className="fin-indicator-card"><h4>{indicator.label}</h4><p className="fin-empty">Unavailable right now.</p></div>;
  if (!data) return <div className="fin-indicator-card"><h4>{indicator.label}</h4><p className="fin-empty">Loading…</p></div>;

  const points = (data.data || []).slice(0, 24).reverse().map((d, i) => ({ x: i, y: Number(d.value) }));
  const latest = data.data && data.data[0];

  return (
    <div className="fin-indicator-card">
      <h4>{indicator.label}</h4>
      <div className="fin-indicator-value">{latest ? `${latest.value}${indicator.unitSuffix}` : '—'}</div>
      {points.length > 1 && <LineChart points={points} height={80} formatY={(v) => `${v}${indicator.unitSuffix}`} xLabel={() => ''} ariaLabel={`${indicator.label} trend`} />}
      <p style={{ fontSize: 11.5, color: 'var(--muted)', margin: '6px 0 0' }}>As of {latest ? latest.date : '—'}</p>
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
    setLoadError('');
    try {
      const [q1, c1] = await Promise.all([
        apiRequest('GET', null, `/finance/quote?symbol=${encodeURIComponent(sym)}`),
        apiRequest('GET', null, `/finance/chart?symbol=${encodeURIComponent(sym)}`),
      ]);
      setQuote(q1.quote);
      setChart(c1.points);
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
  const chartPoints = chart ? chart.map((p, i) => ({ x: i, y: Number(p.close), date: p.date })) : null;

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
            {chartPoints && (
              <div style={{ marginTop: 16 }}>
                <LineChart points={chartPoints} formatY={(v) => `$${v.toFixed(2)}`} xLabel={(p) => p.date} ariaLabel={`${symbol} price history`} />
              </div>
            )}
            {quote && (
              <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 8 }}>
                Latest trading day: {quote['latest trading day']} · Volume: {Number(quote.volume).toLocaleString()}
              </p>
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
