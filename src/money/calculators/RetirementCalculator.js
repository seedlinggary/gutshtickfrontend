import React, { useState, useMemo } from 'react';
import { futureValueWithContributions, formatMoney } from '../../shared/calculatorMath';
import { LineChart } from '../../shared/SimpleCharts';

const DEFAULTS = { currentAge: 30, retireAge: 65, currentSavings: 20000, monthlyContribution: 500, rate: 7, withdrawalRatePct: 4 };

export default function RetirementCalculator() {
  const [f, setF] = useState(DEFAULTS);
  const set = (key) => (e) => setF((s) => ({ ...s, [key]: Number(e.target.value) }));

  const years = Math.max(0, f.retireAge - f.currentAge);
  const nestEgg = futureValueWithContributions(f.currentSavings, f.monthlyContribution, f.rate, years);
  const sustainableAnnual = nestEgg * (f.withdrawalRatePct / 100);
  const sustainableMonthly = sustainableAnnual / 12;

  const points = useMemo(() => {
    const pts = [];
    for (let y = 0; y <= years; y++) {
      pts.push({ x: f.currentAge + y, y: futureValueWithContributions(f.currentSavings, f.monthlyContribution, f.rate, y) });
    }
    return pts;
  }, [f.currentAge, f.currentSavings, f.monthlyContribution, f.rate, years]);

  return (
    <div>
      <p className="fin-calc-intro">
        Projects your retirement savings forward using compound growth, then applies the common
        <strong> "4% rule"</strong> -- a rough guideline that withdrawing about 4% of a retirement portfolio per year
        has historically had a good chance of lasting 30 years without running out, adjusted for inflation each year.
        It's a planning rule of thumb, not a guarantee.
      </p>
      <div className="fin-calc-layout">
        <div>
          <div className="fin-form-section">
            <h3>Where you are now</h3>
            <div className="fin-form-grid">
              <div><label className="fin-field-label">Current age</label><input className="gs-input" type="number" value={f.currentAge} onChange={set('currentAge')} /></div>
              <div><label className="fin-field-label">Target retirement age</label><input className="gs-input" type="number" value={f.retireAge} onChange={set('retireAge')} /></div>
              <div><label className="fin-field-label">Current retirement savings</label><input className="gs-input" type="number" value={f.currentSavings} onChange={set('currentSavings')} /></div>
              <div><label className="fin-field-label">Monthly contribution</label><input className="gs-input" type="number" value={f.monthlyContribution} onChange={set('monthlyContribution')} /></div>
            </div>
          </div>
          <div className="fin-form-section">
            <h3>Assumptions</h3>
            <div className="fin-calc-field">
              <div className="fin-calc-field-row"><label>Expected annual return</label><span className="fin-calc-field-value">{f.rate}%</span></div>
              <input className="fin-calc-slider" type="range" min="0" max="15" step="0.1" value={f.rate} onChange={set('rate')} />
            </div>
            <div className="fin-calc-field">
              <div className="fin-calc-field-row"><label>Safe withdrawal rate</label><span className="fin-calc-field-value">{f.withdrawalRatePct}%</span></div>
              <input className="fin-calc-slider" type="range" min="2" max="8" step="0.5" value={f.withdrawalRatePct} onChange={set('withdrawalRatePct')} />
              <p className="fin-calc-help">4% is the traditional rule of thumb; some planners now suggest 3-3.5% for extra safety over very long retirements.</p>
            </div>
          </div>
          <div className="fin-chart-card">
            <h3 style={{ marginTop: 0, fontSize: 14 }}>Projected growth by age</h3>
            <LineChart points={points} formatY={(v) => formatMoney(v)} xLabel={(p) => `Age ${p.x}`} ariaLabel="Projected retirement savings by age" />
          </div>
        </div>
        <div className="fin-calc-results">
          <h4>At age {f.retireAge}</h4>
          <div className="fin-calc-headline">{formatMoney(nestEgg)}</div>
          <div className="fin-calc-headline-label">projected nest egg</div>
          <div className="fin-calc-row"><span className="fin-calc-row-label">Sustainable annual income</span><span className="fin-calc-row-value">{formatMoney(sustainableAnnual)}</span></div>
          <div className="fin-calc-row total"><span className="fin-calc-row-label">≈ per month</span><span className="fin-calc-row-value">{formatMoney(sustainableMonthly)}</span></div>
        </div>
      </div>
    </div>
  );
}
