import React, { useState, useMemo } from 'react';
import { monthsToPayoff, formatMoney } from '../../shared/calculatorMath';
import { LineChart } from '../../shared/SimpleCharts';
import SavedScenarios from '../SavedScenarios';

const DEFAULTS = { balance: 8000, rate: 22, monthlyPayment: 300 };

function buildSchedule(balance, annualRatePct, monthlyPayment) {
  const r = annualRatePct / 100 / 12;
  const points = [{ x: 0, y: balance }];
  let b = balance;
  let totalInterest = 0;
  let month = 0;
  while (b > 0 && month < 600) {
    const interest = b * r;
    const principal = Math.min(b, monthlyPayment - interest);
    if (principal <= 0) break; // payment doesn't cover interest -- never pays off
    b -= principal;
    totalInterest += interest;
    month += 1;
    points.push({ x: month, y: Math.max(0, b) });
  }
  return { points, totalInterest, months: month };
}

export default function DebtPayoffCalculator() {
  const [f, setF] = useState(DEFAULTS);
  const set = (key) => (e) => setF((s) => ({ ...s, [key]: Number(e.target.value) }));

  const months = monthsToPayoff(f.balance, f.rate, f.monthlyPayment);
  const schedule = useMemo(() => buildSchedule(f.balance, f.rate, f.monthlyPayment), [f.balance, f.rate, f.monthlyPayment]);
  const isStuck = !isFinite(months);

  return (
    <div>
      <p className="fin-calc-intro">
        Shows how long a fixed monthly payment takes to pay off a balance (a credit card, personal loan, etc.) at a
        given interest rate, and how much of that payment ends up as interest versus actually shrinking the balance.
      </p>
      <div className="fin-calc-layout">
        <div>
          <div className="fin-form-section">
            <h3>The debt</h3>
            <div className="fin-form-grid">
              <div><label className="fin-field-label">Current balance</label><input className="gs-input" type="number" value={f.balance} onChange={set('balance')} /></div>
              <div><label className="fin-field-label">Monthly payment</label><input className="gs-input" type="number" value={f.monthlyPayment} onChange={set('monthlyPayment')} /></div>
            </div>
            <div className="fin-calc-field" style={{ marginTop: 14 }}>
              <div className="fin-calc-field-row"><label>Annual interest rate (APR)</label><span className="fin-calc-field-value">{f.rate}%</span></div>
              <input className="fin-calc-slider" type="range" min="0" max="35" step="0.5" value={f.rate} onChange={set('rate')} />
              <p className="fin-calc-help">Credit cards commonly run 18-28% APR; personal loans and car loans are usually much lower.</p>
            </div>
          </div>
          {!isStuck && (
            <div className="fin-chart-card">
              <h3 style={{ marginTop: 0, fontSize: 14 }}>Balance remaining over time</h3>
              <LineChart points={schedule.points} formatY={(v) => formatMoney(v)} xLabel={(p) => `Mo ${p.x}`} ariaLabel="Remaining debt balance over time" />
            </div>
          )}
        </div>
        <div className="fin-calc-results">
          {isStuck ? (
            <>
              <h4>This payment isn't enough</h4>
              <div className="fin-calc-headline" style={{ fontSize: 20 }}>Balance will never shrink</div>
              <div className="fin-calc-headline-label">Your payment doesn't even cover the interest charged each month -- increase it to make progress.</div>
            </>
          ) : (
            <>
              <h4>Payoff time</h4>
              <div className="fin-calc-headline">{Math.ceil(months)}</div>
              <div className="fin-calc-headline-label">months ({(months / 12).toFixed(1)} years)</div>
              <div className="fin-calc-row"><span className="fin-calc-row-label">Total interest paid</span><span className="fin-calc-row-value">{formatMoney(schedule.totalInterest)}</span></div>
              <div className="fin-calc-row total"><span className="fin-calc-row-label">Total paid</span><span className="fin-calc-row-value">{formatMoney(f.balance + schedule.totalInterest)}</span></div>
            </>
          )}
        </div>
      </div>
      <SavedScenarios calculatorKey="debt" inputs={f} onLoad={setF} />
    </div>
  );
}
