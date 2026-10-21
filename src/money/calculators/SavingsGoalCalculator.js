import React, { useState } from 'react';
import { formatMoney } from '../../shared/calculatorMath';

const DEFAULTS = { goal: 20000, currentSavings: 2000, years: 3, rate: 4 };

/** Inverse of futureValueWithContributions -- solves for the monthly
 * contribution needed to reach `goal` from `principal` in `years` at
 * `annualRatePct`. */
function requiredMonthlyContribution(goal, principal, annualRatePct, years) {
  const n = years * 12;
  const r = annualRatePct / 100 / 12;
  const growthOnPrincipal = principal * (1 + r) ** n;
  const remaining = goal - growthOnPrincipal;
  if (remaining <= 0) return 0;
  if (r === 0) return remaining / n;
  return remaining / (((1 + r) ** n - 1) / r);
}

export default function SavingsGoalCalculator() {
  const [f, setF] = useState(DEFAULTS);
  const set = (key) => (e) => setF((s) => ({ ...s, [key]: Number(e.target.value) }));

  const required = requiredMonthlyContribution(f.goal, f.currentSavings, f.rate, f.years);

  return (
    <div>
      <p className="fin-calc-intro">
        Works backward from a goal (a down payment, a trip, a wedding, anything with a price tag and a date) to the
        monthly amount you'd need to save to get there -- accounting for any growth your money earns along the way.
      </p>
      <div className="fin-calc-layout">
        <div>
          <div className="fin-form-section">
            <h3>The goal</h3>
            <div className="fin-form-grid">
              <div><label className="fin-field-label">Goal amount</label><input className="gs-input" type="number" value={f.goal} onChange={set('goal')} /></div>
              <div><label className="fin-field-label">Already saved toward it</label><input className="gs-input" type="number" value={f.currentSavings} onChange={set('currentSavings')} /></div>
            </div>
            <div className="fin-calc-field" style={{ marginTop: 14 }}>
              <div className="fin-calc-field-row"><label>Time to reach it</label><span className="fin-calc-field-value">{f.years} year(s)</span></div>
              <input className="fin-calc-slider" type="range" min="0.5" max="30" step="0.5" value={f.years} onChange={set('years')} />
            </div>
            <div className="fin-calc-field">
              <div className="fin-calc-field-row"><label>Expected annual return on savings</label><span className="fin-calc-field-value">{f.rate}%</span></div>
              <input className="fin-calc-slider" type="range" min="0" max="12" step="0.5" value={f.rate} onChange={set('rate')} />
              <p className="fin-calc-help">Use something low (0-4%) for a near-term goal you'll keep in cash/savings; a higher assumption only makes sense if you'd actually invest it and have years to ride out market swings.</p>
            </div>
          </div>
        </div>
        <div className="fin-calc-results">
          <h4>You need to save</h4>
          <div className="fin-calc-headline">{formatMoney(required)}</div>
          <div className="fin-calc-headline-label">per month for {f.years} year(s)</div>
          <div className="fin-calc-row"><span className="fin-calc-row-label">Goal</span><span className="fin-calc-row-value">{formatMoney(f.goal)}</span></div>
          <div className="fin-calc-row total"><span className="fin-calc-row-label">Already saved</span><span className="fin-calc-row-value">{formatMoney(f.currentSavings)}</span></div>
        </div>
      </div>
    </div>
  );
}
