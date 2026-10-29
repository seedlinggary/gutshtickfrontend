import React, { useState, useMemo } from 'react';
import { futureValueWithContributions, formatMoney } from '../../shared/calculatorMath';
import { StackedAreaChart } from '../../shared/SimpleCharts';
import SavedScenarios from '../SavedScenarios';

const DEFAULTS = { principal: 5000, monthlyContribution: 200, rate: 7, years: 20 };

export default function CompoundInterestCalculator() {
  const [f, setF] = useState(DEFAULTS);
  const set = (key) => (e) => setF((s) => ({ ...s, [key]: Number(e.target.value) }));

  const finalValue = futureValueWithContributions(f.principal, f.monthlyContribution, f.rate, f.years);
  const totalContributed = f.principal + f.monthlyContribution * 12 * f.years;
  const totalGrowth = finalValue - totalContributed;

  const series = useMemo(() => {
    const contributed = []; const growth = [];
    for (let y = 0; y <= f.years; y++) {
      const balance = futureValueWithContributions(f.principal, f.monthlyContribution, f.rate, y);
      const contributedSoFar = f.principal + f.monthlyContribution * 12 * y;
      contributed.push({ x: y, y: contributedSoFar });
      growth.push({ x: y, y: Math.max(0, balance - contributedSoFar) });
    }
    return [
      { label: 'Contributed', points: contributed },
      { label: 'Growth', points: growth },
    ];
  }, [f.principal, f.monthlyContribution, f.rate, f.years]);

  return (
    <div>
      <p className="fin-calc-intro">
        Shows how a starting amount plus regular monthly contributions grows with <strong>compound interest</strong> --
        interest earned on interest, not just on your original deposit. The longer the timeframe, the more of the
        final total comes from growth rather than your own contributions.
      </p>
      <div className="fin-calc-layout">
        <div>
          <div className="fin-form-section">
            <h3>Starting point</h3>
            <div className="fin-form-grid">
              <div><label className="fin-field-label">Starting amount</label><input className="gs-input" type="number" value={f.principal} onChange={set('principal')} /></div>
              <div><label className="fin-field-label">Monthly contribution</label><input className="gs-input" type="number" value={f.monthlyContribution} onChange={set('monthlyContribution')} /></div>
            </div>
          </div>
          <div className="fin-form-section">
            <h3>Growth assumptions</h3>
            <div className="fin-calc-field">
              <div className="fin-calc-field-row"><label>Expected annual return</label><span className="fin-calc-field-value">{f.rate}%</span></div>
              <input className="fin-calc-slider" type="range" min="0" max="15" step="0.1" value={f.rate} onChange={set('rate')} />
              <p className="fin-calc-help">A broad US stock index fund has historically averaged roughly 7-10%/year before inflation over long periods -- a savings account or CD would be much lower (1-5%). Past returns don't guarantee future ones.</p>
            </div>
            <div className="fin-calc-field">
              <div className="fin-calc-field-row"><label>Time horizon</label><span className="fin-calc-field-value">{f.years} years</span></div>
              <input className="fin-calc-slider" type="range" min="1" max="50" step="1" value={f.years} onChange={set('years')} />
            </div>
          </div>
          <div className="fin-chart-card">
            <h3 style={{ marginTop: 0, fontSize: 14 }}>Balance over time -- contributed vs. growth</h3>
            <StackedAreaChart series={series} formatY={(v) => formatMoney(v)} xLabel={(p) => `Yr ${p.x}`} ariaLabel="Projected balance, split into contributions and growth, over time" />
          </div>
        </div>
        <div className="fin-calc-results">
          <h4>Projected balance</h4>
          <div className="fin-calc-headline">{formatMoney(finalValue)}</div>
          <div className="fin-calc-headline-label">after {f.years} years</div>
          <div className="fin-calc-row"><span className="fin-calc-row-label">Total contributed</span><span className="fin-calc-row-value">{formatMoney(totalContributed)}</span></div>
          <div className="fin-calc-row"><span className="fin-calc-row-label">Growth earned</span><span className="fin-calc-row-value">{formatMoney(totalGrowth)}</span></div>
          <div className="fin-calc-row total"><span className="fin-calc-row-label">Final balance</span><span className="fin-calc-row-value">{formatMoney(finalValue)}</span></div>
        </div>
      </div>
      <SavedScenarios calculatorKey="compound" inputs={f} onLoad={setF} />
    </div>
  );
}
