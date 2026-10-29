import React, { useMemo, useState } from 'react';
import { formatMoney, futureValueWithContributions } from '../../shared/calculatorMath';
import { LineChart } from '../../shared/SimpleCharts';
import SavedScenarios from '../SavedScenarios';

const DEFAULTS = { mode: 'monthly', goal: 20000, currentSavings: 2000, years: 3, rate: 4 };

/** Both modes below compound monthly (matching futureValueWithContributions,
 * the formula the "I'll save monthly" mode is the inverse of) so that
 * switching modes for the same goal/savings/rate/years doesn't silently
 * change how fast the already-saved money is assumed to grow. */
function monthlyCompoundFV(principal, annualRatePct, years) {
  const n = years * 12;
  const r = annualRatePct / 100 / 12;
  return principal * (1 + r) ** n;
}
function monthlyCompoundPV(amount, annualRatePct, years) {
  const n = years * 12;
  const r = annualRatePct / 100 / 12;
  return amount / (1 + r) ** n;
}

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
  const isLumpSum = f.mode === 'lump_sum';

  const requiredMonthly = requiredMonthlyContribution(f.goal, f.currentSavings, f.rate, f.years);
  // Present value of the REMAINING gap only -- what's already saved still
  // grows on its own either way, so the lump-sum deposit only needs to
  // cover what that growth won't.
  const remainingGapToday = Math.max(0, f.goal - monthlyCompoundFV(f.currentSavings, f.rate, f.years));
  const requiredLumpSum = monthlyCompoundPV(remainingGapToday, f.rate, f.years);

  const projection = useMemo(() => {
    const totalMonths = Math.max(1, Math.round(f.years * 12));
    const principal = isLumpSum ? f.currentSavings + requiredLumpSum : f.currentSavings;
    const monthly = isLumpSum ? 0 : requiredMonthly;
    const pts = [];
    for (let m = 0; m <= totalMonths; m++) {
      pts.push({ x: m, y: futureValueWithContributions(principal, monthly, f.rate, m / 12) });
    }
    return pts;
  }, [f.currentSavings, f.rate, f.years, isLumpSum, requiredLumpSum, requiredMonthly]);

  return (
    <div>
      <p className="fin-calc-intro">
        Works backward from a goal (a down payment, a trip, a wedding, anything with a price tag and a date) to what
        it'd take to get there -- either a monthly amount you keep saving, or a single deposit today and nothing more,
        letting growth alone close the gap.
      </p>
      <div className="fin-calc-layout">
        <div>
          <div className="fin-form-section">
            <h3>The goal</h3>
            <div className="fin-chip-row" style={{ marginBottom: 14 }}>
              <button type="button" className={`fin-chip${!isLumpSum ? ' active' : ''}`} onClick={() => setF((s) => ({ ...s, mode: 'monthly' }))}>I'll save monthly</button>
              <button type="button" className={`fin-chip${isLumpSum ? ' active' : ''}`} onClick={() => setF((s) => ({ ...s, mode: 'lump_sum' }))}>One-time deposit, no more saving</button>
            </div>
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
          <div className="fin-chart-card">
            <h3 style={{ marginTop: 0, fontSize: 14 }}>Balance over time, toward your goal of {formatMoney(f.goal)}</h3>
            <LineChart points={projection} formatY={(v) => formatMoney(v)} xLabel={(p) => `Mo ${p.x}`} ariaLabel="Projected savings balance over time toward the goal" />
          </div>
        </div>
        <div className="fin-calc-results">
          {isLumpSum ? (
            <>
              <h4>Deposit today</h4>
              <div className="fin-calc-headline">{formatMoney(requiredLumpSum)}</div>
              <div className="fin-calc-headline-label">once, on top of what's already saved -- no further contributions</div>
            </>
          ) : (
            <>
              <h4>You need to save</h4>
              <div className="fin-calc-headline">{formatMoney(requiredMonthly)}</div>
              <div className="fin-calc-headline-label">per month for {f.years} year(s)</div>
            </>
          )}
          <div className="fin-calc-row"><span className="fin-calc-row-label">Goal</span><span className="fin-calc-row-value">{formatMoney(f.goal)}</span></div>
          <div className="fin-calc-row total"><span className="fin-calc-row-label">Already saved</span><span className="fin-calc-row-value">{formatMoney(f.currentSavings)}</span></div>
        </div>
      </div>
      <SavedScenarios calculatorKey="goal" inputs={f} onLoad={setF} />
    </div>
  );
}
