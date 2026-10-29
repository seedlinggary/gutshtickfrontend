import React, { useState } from 'react';
import { formatMoney } from '../../shared/calculatorMath';
import { DonutChart } from '../../shared/SimpleCharts';

const DEFAULTS = { currency: 'USD', price: 400000, downPct: 20, closingPct: 3 };

export default function ClosingCostsCalculator() {
  const [f, setF] = useState(DEFAULTS);
  const set = (key) => (e) => setF((s) => ({ ...s, [key]: e.target.type === 'number' || e.target.type === 'range' ? Number(e.target.value) : e.target.value }));

  const downAmount = f.price * (f.downPct / 100);
  const loan = Math.max(0, f.price - downAmount);
  const closingCosts = f.price * (f.closingPct / 100);
  const cashToClose = downAmount + closingCosts;

  return (
    <div className="est-calc-layout">
      <div>
        <p className="est-calc-intro">
          Your down payment isn't the only cash you need on closing day -- closing costs (lender, title and
          government fees) are a separate chunk, typically 2-5% of the price in the US (lower, but still real, in
          Israel once you add the lawyer and purchase tax -- see the Israel Purchase Tax calculator for that piece
          specifically). This adds the two together so you know the real amount to have ready.
        </p>

        <div className="est-form-section">
          <h3>The numbers</h3>
          <div className="est-form-grid">
            <div>
              <label className="est-field-label">Currency</label>
              <select className="gs-input" value={f.currency} onChange={set('currency')}>
                <option value="USD">USD ($)</option>
                <option value="ILS">ILS (₪)</option>
              </select>
            </div>
            <div>
              <label className="est-field-label">Home price</label>
              <input className="gs-input" type="number" value={f.price} onChange={set('price')} />
            </div>
          </div>

          <div className="est-calc-field" style={{ marginTop: 14 }}>
            <div className="est-calc-field-row"><label>Down payment</label><span className="est-calc-field-value">{f.downPct}%</span></div>
            <input className="est-calc-slider" type="range" min="0" max="100" step="1" value={f.downPct} onChange={set('downPct')} />
          </div>

          <div className="est-calc-field">
            <div className="est-calc-field-row"><label>Estimated closing costs</label><span className="est-calc-field-value">{f.closingPct}% of price</span></div>
            <input className="est-calc-slider" type="range" min="0" max="8" step="0.1" value={f.closingPct} onChange={set('closingPct')} />
            <p className="est-calc-help">US buyers typically land in the 2-5% range; ask your lender/title company for a Loan Estimate once you're under contract for the real number.</p>
          </div>
        </div>

        <div className="est-form-section">
          <h3>What's usually in "closing costs"</h3>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13.5, lineHeight: 1.7, color: 'var(--text)' }}>
            <li><strong>Loan origination/lender fees</strong> -- the lender's own charge for underwriting the mortgage.</li>
            <li><strong>Title search &amp; title insurance</strong> -- confirms the seller actually owns the property free of hidden liens, and insures you against a mistake in that search.</li>
            <li><strong>Appraisal &amp; inspection fees</strong> -- paid to the independent professionals who assess the home's value and condition.</li>
            <li><strong>Escrow/attorney fees</strong> -- whoever holds funds and paperwork through closing (an attorney is mandatory in Israel, common but not universal in the US).</li>
            <li><strong>Recording fees &amp; transfer taxes</strong> -- what your local government charges to officially register the new ownership.</li>
          </ul>
        </div>

        <div className="est-chart-card">
          <h3 style={{ marginTop: 0, fontSize: 14 }}>Cash to close, broken down</h3>
          <DonutChart
            segments={[
              { label: 'Down payment', value: downAmount },
              { label: 'Closing costs', value: closingCosts },
            ]}
            formatValue={(v) => formatMoney(v, f.currency)}
            centerLabel="Cash to close"
          />
        </div>
      </div>

      <div className="est-calc-results">
        <h4>Cash needed at closing</h4>
        <div className="est-calc-headline">{formatMoney(cashToClose, f.currency)}</div>
        <div className="est-calc-headline-label">down payment + closing costs</div>

        <div className="est-calc-row"><span className="est-calc-row-label">Down payment</span><span className="est-calc-row-value">{formatMoney(downAmount, f.currency)}</span></div>
        <div className="est-calc-row"><span className="est-calc-row-label">Estimated closing costs</span><span className="est-calc-row-value">{formatMoney(closingCosts, f.currency)}</span></div>
        <div className="est-calc-row total"><span className="est-calc-row-label">Total cash to close</span><span className="est-calc-row-value">{formatMoney(cashToClose, f.currency)}</span></div>
        <div className="est-calc-row" style={{ marginTop: 10 }}><span className="est-calc-row-label">Loan amount</span><span className="est-calc-row-value">{formatMoney(loan, f.currency)}</span></div>
      </div>
    </div>
  );
}
