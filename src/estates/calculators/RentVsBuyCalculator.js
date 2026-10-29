import React, { useMemo, useState } from 'react';
import { monthlyPI, remainingBalance, futureValue, growingAnnualTotal, formatMoney } from '../../shared/calculatorMath';
import { StackedAreaChart } from '../../shared/SimpleCharts';

const DEFAULTS = {
  currency: 'USD', monthlyRent: 2000, rentIncreasePct: 3, stayYears: 7,
  price: 400000, downPct: 20, rate: 6.5, years: 30, appreciationPct: 3,
  taxPct: 1.1, insuranceAnnual: 1400, maintenancePct: 1, closingPct: 3, sellingPct: 7,
};

export default function RentVsBuyCalculator() {
  const [f, setF] = useState(DEFAULTS);
  const set = (key) => (e) => setF((s) => ({ ...s, [key]: e.target.type === 'number' || e.target.type === 'range' ? Number(e.target.value) : e.target.value }));

  const downAmount = f.price * (f.downPct / 100);
  const loan = Math.max(0, f.price - downAmount);
  const pAndI = monthlyPI(loan, f.rate, f.years);
  const monthlyTax = (f.price * (f.taxPct / 100)) / 12;
  const monthlyInsurance = f.insuranceAnnual / 12;
  const monthlyMaintenance = (f.price * (f.maintenancePct / 100)) / 12;
  const monthlyOwnCost = pAndI + monthlyTax + monthlyInsurance + monthlyMaintenance;

  const upfrontBuyCash = downAmount + f.price * (f.closingPct / 100);
  const ownCashOutflow = upfrontBuyCash + monthlyOwnCost * 12 * f.stayYears;

  const futurePrice = futureValue(f.price, f.appreciationPct, f.stayYears);
  const loanBalanceAtSale = remainingBalance(loan, f.rate, f.years, f.stayYears);
  const sellingCosts = futurePrice * (f.sellingPct / 100);
  const netSaleProceeds = futurePrice - loanBalanceAtSale - sellingCosts;

  const netCostOfBuying = ownCashOutflow - netSaleProceeds;
  const totalCostOfRenting = growingAnnualTotal(f.monthlyRent, f.rentIncreasePct, f.stayYears);

  const buyingCheaper = netCostOfBuying < totalCostOfRenting;
  const difference = Math.abs(netCostOfBuying - totalCostOfRenting);

  const comparison = useMemo(() => {
    const rentSeries = []; const buySeries = [];
    for (let y = 0; y <= f.stayYears; y++) {
      rentSeries.push({ x: y, y: growingAnnualTotal(f.monthlyRent, f.rentIncreasePct, y) });
      buySeries.push({ x: y, y: upfrontBuyCash + monthlyOwnCost * 12 * y });
    }
    return [
      { label: 'Cash paid renting', points: rentSeries },
      { label: 'Cash paid buying (before resale)', points: buySeries },
    ];
  }, [f.stayYears, f.monthlyRent, f.rentIncreasePct, upfrontBuyCash, monthlyOwnCost]);

  return (
    <div>
      <p className="est-calc-intro">
        Compares the real net cost of buying (everything you'd pay out, minus what you'd net back from selling at the
        end) against the total cost of renting over the same stretch of time. The "right" answer depends entirely on
        how long you'll actually stay -- buying usually only wins once you're past a few years, since closing costs
        and selling costs are a one-time hit that needs time to be worth it.
      </p>

      <div className="est-calc-layout">
        <div>
          <div className="est-form-section">
            <h3>If you rent instead</h3>
            <div className="est-form-grid">
              <div>
                <label className="est-field-label">Currency</label>
                <select className="gs-input" value={f.currency} onChange={set('currency')}>
                  <option value="USD">USD ($)</option>
                  <option value="ILS">ILS (₪)</option>
                </select>
              </div>
              <div>
                <label className="est-field-label">Monthly rent</label>
                <input className="gs-input" type="number" value={f.monthlyRent} onChange={set('monthlyRent')} />
              </div>
              <div>
                <label className="est-field-label">Annual rent increase</label>
                <input className="gs-input" type="number" step="0.5" value={f.rentIncreasePct} onChange={set('rentIncreasePct')} />
              </div>
            </div>
          </div>

          <div className="est-form-section">
            <h3>If you buy instead</h3>
            <div className="est-form-grid">
              <div><label className="est-field-label">Home price</label><input className="gs-input" type="number" value={f.price} onChange={set('price')} /></div>
              <div><label className="est-field-label">Down payment %</label><input className="gs-input" type="number" value={f.downPct} onChange={set('downPct')} /></div>
              <div><label className="est-field-label">Interest rate</label><input className="gs-input" type="number" step="0.05" value={f.rate} onChange={set('rate')} /></div>
              <div><label className="est-field-label">Loan term (years)</label><input className="gs-input" type="number" value={f.years} onChange={set('years')} /></div>
              <div><label className="est-field-label">Annual appreciation %</label><input className="gs-input" type="number" step="0.5" value={f.appreciationPct} onChange={set('appreciationPct')} /></div>
              <div><label className="est-field-label">Property tax (annual %)</label><input className="gs-input" type="number" step="0.1" value={f.taxPct} onChange={set('taxPct')} /></div>
              <div><label className="est-field-label">Insurance (annual)</label><input className="gs-input" type="number" value={f.insuranceAnnual} onChange={set('insuranceAnnual')} /></div>
              <div><label className="est-field-label">Maintenance (annual %)</label><input className="gs-input" type="number" step="0.1" value={f.maintenancePct} onChange={set('maintenancePct')} /></div>
              <div><label className="est-field-label">Closing costs (% of price)</label><input className="gs-input" type="number" step="0.5" value={f.closingPct} onChange={set('closingPct')} /></div>
              <div><label className="est-field-label">Selling costs later (% of sale price)</label><input className="gs-input" type="number" step="0.5" value={f.sellingPct} onChange={set('sellingPct')} /></div>
            </div>
          </div>

          <div className="est-calc-field">
            <div className="est-calc-field-row"><label>How many years will you stay?</label><span className="est-calc-field-value">{f.stayYears} years</span></div>
            <input className="est-calc-slider" type="range" min="1" max="30" step="1" value={f.stayYears} onChange={set('stayYears')} />
          </div>

          <p className="est-calc-help">
            Not modeled: what you'd earn investing the cash a renter doesn't spend on a down payment/maintenance/etc.
            elsewhere (stocks, a different property...) -- if renting comes out cheaper here, that gap could be even
            larger once you account for that; if buying wins, it's a genuine, not-fully-complete picture either way.
            Treat this as a starting estimate, not a financial plan.
          </p>
        </div>

        <div className="est-calc-results">
          <h4>Over {f.stayYears} year(s)</h4>
          <div className="est-calc-headline">{buyingCheaper ? 'Buying' : 'Renting'} looks cheaper</div>
          <div className="est-calc-headline-label">by about {formatMoney(difference, f.currency)}</div>

          <div className="est-calc-row"><span className="est-calc-row-label">Net cost of buying</span><span className="est-calc-row-value">{formatMoney(netCostOfBuying, f.currency)}</span></div>
          <div className="est-calc-row"><span className="est-calc-row-label">Total cost of renting</span><span className="est-calc-row-value">{formatMoney(totalCostOfRenting, f.currency)}</span></div>
        </div>
      </div>

      <div className="est-calc-comparison">
        <div className={`est-calc-compare-card${!buyingCheaper ? ' winner' : ''}`}>
          <h5>Renting</h5>
          <div className="est-calc-compare-value">{formatMoney(totalCostOfRenting, f.currency)}</div>
          <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '6px 0 0' }}>Total rent paid, nothing recovered at the end.</p>
        </div>
        <div className={`est-calc-compare-card${buyingCheaper ? ' winner' : ''}`}>
          <h5>Buying</h5>
          <div className="est-calc-compare-value">{formatMoney(netCostOfBuying, f.currency)}</div>
          <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '6px 0 0' }}>
            {formatMoney(ownCashOutflow, f.currency)} paid out, minus an estimated {formatMoney(netSaleProceeds, f.currency)} net proceeds if sold after {f.stayYears} year(s).
          </p>
        </div>
      </div>

      <div className="est-chart-card">
        <h3 style={{ marginTop: 0, fontSize: 14 }}>Cumulative cash paid out, year by year</h3>
        <StackedAreaChart
          series={comparison} stacked={false} formatY={(v) => formatMoney(v, f.currency)} xLabel={(p) => `Yr ${p.x}`}
          ariaLabel="Cumulative cash paid renting versus buying over time"
        />
        <p className="est-calc-help" style={{ marginTop: 10 }}>
          This shows cash paid out on each path, not netted against a sale -- buying's real payoff only shows up if
          you actually sell (see the comparison above), so an early crossover here doesn't mean buying has already
          "won" yet.
        </p>
      </div>
    </div>
  );
}
