import React, { useState } from 'react';
import { formatMoney } from '../../shared/calculatorMath';

const DEFAULTS = { monthlyExpenses: 3000, monthsCoverage: 4, currentSavings: 2000, monthlySavings: 300 };

export default function EmergencyFundCalculator() {
  const [f, setF] = useState(DEFAULTS);
  const set = (key) => (e) => setF((s) => ({ ...s, [key]: Number(e.target.value) }));

  const target = f.monthlyExpenses * f.monthsCoverage;
  const gap = Math.max(0, target - f.currentSavings);
  const monthsToGoal = f.monthlySavings > 0 ? Math.ceil(gap / f.monthlySavings) : Infinity;
  const pctFunded = target > 0 ? Math.min(100, (f.currentSavings / target) * 100) : 0;

  return (
    <div>
      <p className="fin-calc-intro">
        An emergency fund is cash set aside purely to cover essential living costs if income stops suddenly (job loss,
        medical issue, major repair) -- kept in something safe and immediately accessible (a savings account), not
        invested, since you may need it on short notice.
      </p>
      <div className="fin-calc-layout">
        <div>
          <div className="fin-form-section">
            <h3>Your expenses</h3>
            <label className="fin-field-label">Essential monthly expenses (rent, food, utilities, insurance, minimum debt payments)</label>
            <input className="gs-input" type="number" value={f.monthlyExpenses} onChange={set('monthlyExpenses')} style={{ marginBottom: 14 }} />
            <div className="fin-calc-field">
              <div className="fin-calc-field-row"><label>Months of coverage to target</label><span className="fin-calc-field-value">{f.monthsCoverage} months</span></div>
              <input className="fin-calc-slider" type="range" min="1" max="12" step="1" value={f.monthsCoverage} onChange={set('monthsCoverage')} />
              <p className="fin-calc-help">3-6 months is the most commonly recommended range -- lean toward 6+ if your income is variable (freelance, commission) or you're the sole earner in your household.</p>
            </div>
          </div>
          <div className="fin-form-section">
            <h3>Where you stand</h3>
            <div className="fin-form-grid">
              <div><label className="fin-field-label">Current emergency savings</label><input className="gs-input" type="number" value={f.currentSavings} onChange={set('currentSavings')} /></div>
              <div><label className="fin-field-label">Amount you can save monthly</label><input className="gs-input" type="number" value={f.monthlySavings} onChange={set('monthlySavings')} /></div>
            </div>
          </div>
        </div>
        <div className="fin-calc-results">
          <h4>Your target</h4>
          <div className="fin-calc-headline">{formatMoney(target)}</div>
          <div className="fin-calc-headline-label">{f.monthsCoverage} months of essential expenses</div>
          <div className="fin-calc-row"><span className="fin-calc-row-label">Currently funded</span><span className="fin-calc-row-value">{pctFunded.toFixed(0)}%</span></div>
          <div className="fin-calc-row"><span className="fin-calc-row-label">Still needed</span><span className="fin-calc-row-value">{formatMoney(gap)}</span></div>
          <div className="fin-calc-row total"><span className="fin-calc-row-label">Months to reach goal</span><span className="fin-calc-row-value">{isFinite(monthsToGoal) ? monthsToGoal : '—'}</span></div>
        </div>
      </div>
    </div>
  );
}
