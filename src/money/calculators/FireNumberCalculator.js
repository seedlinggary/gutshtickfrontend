import React, { useMemo, useState } from 'react';
import { formatMoney } from '../../shared/calculatorMath';
import { LineChart } from '../../shared/SimpleCharts';
import SavedScenarios from '../SavedScenarios';

const DEFAULTS = { annualExpenses: 48000, withdrawalRatePct: 4 };

export default function FireNumberCalculator() {
  const [f, setF] = useState(DEFAULTS);
  const set = (key) => (e) => setF((s) => ({ ...s, [key]: Number(e.target.value) }));

  // The "4% rule": a portfolio you withdraw 4%/year from has historically
  // had a good chance of lasting 30 years. Flip it around and 4% of what
  // number equals my spending? -> expenses / 0.04 = expenses x 25.
  const fireNumber = f.withdrawalRatePct > 0 ? f.annualExpenses / (f.withdrawalRatePct / 100) : Infinity;
  const multiple = f.withdrawalRatePct > 0 ? 100 / f.withdrawalRatePct : Infinity;

  const sensitivity = useMemo(() => {
    const pts = [];
    for (let r = 2; r <= 6; r += 0.25) {
      pts.push({ x: r, y: f.annualExpenses / (r / 100) });
    }
    return pts;
  }, [f.annualExpenses]);

  return (
    <div>
      <p className="fin-calc-intro">
        Your <strong>"FIRE number"</strong> is the portfolio size where, per the <strong>4% rule</strong>, you could
        withdraw enough every year to cover your spending indefinitely without running out -- the core number behind
        "Financial Independence, Retire Early." It's a rough historical guideline, not a guarantee: a market downturn
        early in retirement, taxes, and healthcare costs can all change the real safe number for you.
      </p>
      <div className="fin-calc-layout">
        <div>
          <div className="fin-form-section">
            <h3>Your spending</h3>
            <label className="fin-field-label">Annual expenses you want covered</label>
            <input className="gs-input" type="number" value={f.annualExpenses} onChange={set('annualExpenses')} />
            <p className="fin-calc-help">Use your real, total annual spending in retirement -- not your current income. Include healthcare, since employer coverage usually ends.</p>
          </div>
          <div className="fin-form-section">
            <h3>Withdrawal rate assumption</h3>
            <div className="fin-calc-field">
              <div className="fin-calc-field-row"><label>Safe withdrawal rate</label><span className="fin-calc-field-value">{f.withdrawalRatePct}%</span></div>
              <input className="fin-calc-slider" type="range" min="2" max="6" step="0.25" value={f.withdrawalRatePct} onChange={set('withdrawalRatePct')} />
              <p className="fin-calc-help">4% is the traditional "4% rule," based on historical US market returns over 30-year retirements (the "Trinity Study"). Some planners now suggest 3-3.5% for extra safety, especially over a longer-than-30-year retirement (common for an early retiree).</p>
            </div>
          </div>
          <div className="fin-chart-card">
            <h3 style={{ marginTop: 0, fontSize: 14 }}>How your number changes with the withdrawal rate</h3>
            <LineChart points={sensitivity} formatY={(v) => formatMoney(v)} xLabel={(p) => `${p.x}%`} ariaLabel="FIRE number required at different withdrawal rates" />
          </div>
        </div>
        <div className="fin-calc-results">
          <h4>Your FIRE number</h4>
          <div className="fin-calc-headline">{formatMoney(fireNumber)}</div>
          <div className="fin-calc-headline-label">at a {f.withdrawalRatePct}% withdrawal rate ({isFinite(multiple) ? multiple.toFixed(0) : '—'}x annual expenses)</div>
          <div className="fin-calc-row"><span className="fin-calc-row-label">Annual expenses</span><span className="fin-calc-row-value">{formatMoney(f.annualExpenses)}</span></div>
          <div className="fin-calc-row total"><span className="fin-calc-row-label">≈ Monthly sustainable withdrawal</span><span className="fin-calc-row-value">{formatMoney(f.annualExpenses / 12)}</span></div>
        </div>
      </div>
      <SavedScenarios calculatorKey="fire_number" inputs={f} onLoad={setF} />
    </div>
  );
}
