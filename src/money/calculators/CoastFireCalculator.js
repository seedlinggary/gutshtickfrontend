import React, { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatMoney, futureValue, presentValue } from '../../shared/calculatorMath';
import { LineChart } from '../../shared/SimpleCharts';
import SavedScenarios from '../SavedScenarios';

const DEFAULTS = { currentAge: 30, retireAge: 65, fireNumber: 1200000, currentSavings: 150000, rate: 7 };

export default function CoastFireCalculator() {
  const [f, setF] = useState(DEFAULTS);
  const set = (key) => (e) => setF((s) => ({ ...s, [key]: Number(e.target.value) }));

  const years = Math.max(0, f.retireAge - f.currentAge);
  // "Coast FIRE today" -- the lump sum that, with NO further contributions,
  // grows into the FIRE number by retirement age on compound growth alone.
  const coastFireNumberToday = presentValue(f.fireNumber, f.rate, years);
  const hasCoasted = f.currentSavings >= coastFireNumberToday;
  const gap = Math.max(0, coastFireNumberToday - f.currentSavings);
  const projectedAtRetirement = futureValue(f.currentSavings, f.rate, years);

  const projection = useMemo(() => {
    const pts = [];
    for (let y = 0; y <= years; y++) {
      pts.push({ x: f.currentAge + y, y: futureValue(f.currentSavings, f.rate, y) });
    }
    return pts;
  }, [f.currentAge, f.currentSavings, f.rate, years]);

  return (
    <div>
      <p className="fin-calc-intro">
        <strong>Coast FIRE</strong> is the point where you've saved enough that, even if you stopped contributing
        entirely today, compound growth alone would carry you to your full retirement number by retirement age --
        from there you only need to earn enough to "coast," covering current living costs without saving another
        dollar for retirement. This answers "how much do I need <em>right now</em>, with no more saving, to still get
        there?"
      </p>
      <div className="fin-calc-layout">
        <div>
          <div className="fin-form-section">
            <h3>Your timeline</h3>
            <div className="fin-form-grid">
              <div><label className="fin-field-label">Current age</label><input className="gs-input" type="number" value={f.currentAge} onChange={set('currentAge')} /></div>
              <div><label className="fin-field-label">Target retirement age</label><input className="gs-input" type="number" value={f.retireAge} onChange={set('retireAge')} /></div>
            </div>
          </div>
          <div className="fin-form-section">
            <h3>Your target &amp; current savings</h3>
            <div className="fin-form-grid">
              <div><label className="fin-field-label">FIRE number (full retirement target)</label><input className="gs-input" type="number" value={f.fireNumber} onChange={set('fireNumber')} /></div>
              <div><label className="fin-field-label">Current retirement savings</label><input className="gs-input" type="number" value={f.currentSavings} onChange={set('currentSavings')} /></div>
            </div>
            <p className="fin-calc-help">Not sure your FIRE number? Use the "FIRE Number" calculator (your annual expenses ÷ 4%) to find it first, then come back here.</p>
          </div>
          <div className="fin-form-section">
            <h3>Growth assumption</h3>
            <div className="fin-calc-field">
              <div className="fin-calc-field-row"><label>Expected annual return</label><span className="fin-calc-field-value">{f.rate}%</span></div>
              <input className="fin-calc-slider" type="range" min="0" max="12" step="0.5" value={f.rate} onChange={set('rate')} />
            </div>
          </div>
          <div className="fin-chart-card">
            <h3 style={{ marginTop: 0, fontSize: 14 }}>Coasting from today's savings, with no more contributions</h3>
            <LineChart points={projection} formatY={(v) => formatMoney(v)} xLabel={(p) => `Age ${p.x}`} ariaLabel="Projected balance coasting to retirement with no further contributions" />
          </div>
        </div>
        <div className="fin-calc-results">
          <h4>Coast FIRE number today</h4>
          <div className="fin-calc-headline">{formatMoney(coastFireNumberToday)}</div>
          <div className="fin-calc-headline-label">needed now, with zero further contributions, to reach {formatMoney(f.fireNumber)} by age {f.retireAge}</div>
          <div className={`fin-insight-tile-value ${hasCoasted ? 'up' : 'down'}`} style={{ margin: '14px 0 4px', fontSize: 15 }}>
            {hasCoasted ? <TrendingUp size={15} style={{ verticalAlign: -2 }} /> : <TrendingDown size={15} style={{ verticalAlign: -2 }} />}
            {' '}{hasCoasted ? "You've already hit Coast FIRE" : 'Not there yet'}
          </div>
          {hasCoasted ? (
            <div className="fin-calc-row total"><span className="fin-calc-row-label">Projected at retirement, coasting from today</span><span className="fin-calc-row-value">{formatMoney(projectedAtRetirement)}</span></div>
          ) : (
            <div className="fin-calc-row total"><span className="fin-calc-row-label">Still need (one-time, today)</span><span className="fin-calc-row-value">{formatMoney(gap)}</span></div>
          )}
        </div>
      </div>
      <SavedScenarios calculatorKey="coast_fire" inputs={f} onLoad={setF} />
    </div>
  );
}
