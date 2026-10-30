import React, { useEffect, useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import apiRequest from '../../ApiRequest';

const DEFAULTS = {
  amount: 100,
  from: 'USD',
  to: 'ILS',
};

// Shown before the real currency list loads (and as a safe fallback if that
// request ever fails) -- just the two defaults, so the pickers are never
// empty even on a slow/failed /finance/fx/currencies call.
const FALLBACK_CURRENCIES = { USD: 'US Dollar', ILS: 'Israeli New Shekel' };

function formatAmount(value) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function CurrencyConverter({ initialValues } = {}) {
  const cleanInitial = Object.fromEntries(Object.entries(initialValues || {}).filter(([, v]) => v !== undefined));
  const [f, setF] = useState({ ...DEFAULTS, ...cleanInitial });
  const [currencies, setCurrencies] = useState(FALLBACK_CURRENCIES);
  const [rate, setRate] = useState(null);
  const [rateDate, setRateDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (e) => setF((s) => ({ ...s, [key]: e.target.value }));

  useEffect(() => {
    apiRequest('GET', null, '/finance/fx/currencies')
      .then((d) => { if (d.currencies) setCurrencies(d.currencies); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!f.from || !f.to) return;
    setLoading(true);
    setError('');
    apiRequest('GET', null, `/finance/fx?from=${encodeURIComponent(f.from)}&to=${encodeURIComponent(f.to)}`)
      .then((d) => { setRate(d.rate); setRateDate(d.date); })
      .catch(() => setError("Couldn't load today's exchange rate -- try again in a moment."))
      .finally(() => setLoading(false));
  }, [f.from, f.to]);

  const amount = Number(f.amount) || 0;
  const converted = rate != null ? amount * rate : null;
  const currencyOptions = Object.entries(currencies).sort((a, b) => a[1].localeCompare(b[1]));

  const swap = () => setF((s) => ({ ...s, from: s.to, to: s.from }));

  return (
    <div>
      <p className="fin-calc-intro">
        Converts between any two currencies using the European Central Bank's daily reference rates (via{' '}
        <a href="https://www.frankfurter.app" target="_blank" rel="noopener noreferrer">frankfurter.app</a>) --
        defaults to US Dollar → Israeli Shekel, but either side can be changed. Rates update once a day, so this is
        a solid planning estimate, not a live trading price.
      </p>
      <div className="fin-calc-layout">
        <div>
          <div className="fin-form-section">
            <h3>Convert</h3>
            <div className="fin-form-grid">
              <div>
                <label className="fin-field-label">Amount</label>
                <input className="gs-input" type="number" min="0" value={f.amount} onChange={set('amount')} />
              </div>
              <div>
                <label className="fin-field-label">From</label>
                <select className="gs-select" value={f.from} onChange={set('from')}>
                  {currencyOptions.map(([code, name]) => (
                    <option key={code} value={code}>{code} -- {name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0' }}>
              <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={swap} title="Swap currencies">
                <ArrowLeftRight size={14} /> Swap
              </button>
            </div>
            <div className="fin-form-grid">
              <div>
                <label className="fin-field-label">To</label>
                <select className="gs-select" value={f.to} onChange={set('to')}>
                  {currencyOptions.map(([code, name]) => (
                    <option key={code} value={code}>{code} -- {name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          {error && <div className="gs-error-box">{error}</div>}
        </div>

        <div className="fin-calc-results">
          <h4>{f.from} → {f.to}</h4>
          {loading && <div className="fin-calc-headline-label">Loading today's rate…</div>}
          {!loading && converted != null && (
            <>
              <div className="fin-calc-headline">{formatAmount(converted)} {f.to}</div>
              <div className="fin-calc-headline-label">
                {formatAmount(f.amount)} {f.from}{rateDate ? ` · rates as of ${rateDate}` : ''}
              </div>
              <div className="fin-calc-row">
                <span className="fin-calc-row-label">1 {f.from} =</span>
                <span className="fin-calc-row-value">{formatAmount(rate)} {f.to}</span>
              </div>
              <div className="fin-calc-row">
                <span className="fin-calc-row-label">1 {f.to} =</span>
                <span className="fin-calc-row-value">{formatAmount(1 / rate)} {f.from}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
