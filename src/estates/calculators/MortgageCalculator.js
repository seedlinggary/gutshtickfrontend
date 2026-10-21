import React, { useState } from 'react';
import { monthlyPI, totalInterest, formatMoney } from '../../shared/calculatorMath';

const DEFAULTS = {
  price: 400000, downPct: 20, rate: 6.5, years: 30, currency: 'USD',
  taxPct: 1.1, insuranceAnnual: 1400, hoaMonthly: 0, pmiRatePct: 0.6,
};

export default function MortgageCalculator() {
  const [f, setF] = useState(DEFAULTS);
  const set = (key) => (e) => setF((s) => ({ ...s, [key]: e.target.type === 'number' || e.target.type === 'range' ? Number(e.target.value) : e.target.value }));

  const downAmount = f.price * (f.downPct / 100);
  const loan = Math.max(0, f.price - downAmount);
  const pAndI = monthlyPI(loan, f.rate, f.years);
  const monthlyTax = (f.price * (f.taxPct / 100)) / 12;
  const monthlyInsurance = f.insuranceAnnual / 12;
  const needsPMI = f.downPct < 20;
  const monthlyPMI = needsPMI ? (loan * (f.pmiRatePct / 100)) / 12 : 0;
  const totalMonthly = pAndI + monthlyTax + monthlyInsurance + f.hoaMonthly + monthlyPMI;
  const interestOverLife = totalInterest(loan, f.rate, f.years);

  return (
    <div className="est-calc-layout">
      <div>
        <p className="est-calc-intro">
          Estimates your full monthly housing payment -- not just loan principal and interest, but property tax,
          insurance, HOA/Vaad Bayit, and <strong>PMI</strong> (Private Mortgage Insurance, a fee lenders charge when
          your down payment is under 20% of the price, to protect themselves if you default -- it drops off once you've
          paid down enough to hit 20% equity).
        </p>

        <div className="est-form-section">
          <h3>Property &amp; loan</h3>
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
            <div className="est-calc-field-row">
              <label>Down payment</label>
              <span className="est-calc-field-value">{f.downPct}% ({formatMoney(downAmount, f.currency)})</span>
            </div>
            <input className="est-calc-slider" type="range" min="0" max="100" step="1" value={f.downPct} onChange={set('downPct')} />
            <p className="est-calc-help">Less than 20% down means PMI applies (see below) -- 20%+ avoids it entirely.</p>
          </div>

          <div className="est-calc-field">
            <div className="est-calc-field-row">
              <label>Interest rate (annual)</label>
              <span className="est-calc-field-value">{f.rate}%</span>
            </div>
            <input className="est-calc-slider" type="range" min="0" max="15" step="0.05" value={f.rate} onChange={set('rate')} />
          </div>

          <div className="est-calc-field">
            <div className="est-calc-field-row">
              <label>Loan term</label>
              <span className="est-calc-field-value">{f.years} years</span>
            </div>
            <input className="est-calc-slider" type="range" min="5" max="40" step="1" value={f.years} onChange={set('years')} />
          </div>
        </div>

        <div className="est-form-section">
          <h3>Taxes, insurance &amp; fees</h3>
          <div className="est-form-grid">
            <div>
              <label className="est-field-label">Property tax (annual, % of price)</label>
              <input className="gs-input" type="number" step="0.1" value={f.taxPct} onChange={set('taxPct')} />
            </div>
            <div>
              <label className="est-field-label">Home insurance (annual amount)</label>
              <input className="gs-input" type="number" value={f.insuranceAnnual} onChange={set('insuranceAnnual')} />
            </div>
            <div>
              <label className="est-field-label">HOA / Vaad Bayit (monthly)</label>
              <input className="gs-input" type="number" value={f.hoaMonthly} onChange={set('hoaMonthly')} />
            </div>
            {needsPMI && (
              <div>
                <label className="est-field-label">PMI rate (annual, % of loan)</label>
                <input className="gs-input" type="number" step="0.05" value={f.pmiRatePct} onChange={set('pmiRatePct')} />
              </div>
            )}
          </div>
          <p className="est-calc-help">
            Property tax rates and typical insurance costs vary a lot by location -- these defaults are rough starting
            points, not a quote. Check your specific city/county's actual rate before relying on this.
          </p>
        </div>
      </div>

      <div className="est-calc-results">
        <h4>Estimated monthly payment</h4>
        <div className="est-calc-headline">{formatMoney(totalMonthly, f.currency)}</div>
        <div className="est-calc-headline-label">per month, all-in</div>

        <div className="est-calc-row"><span className="est-calc-row-label">Principal &amp; interest</span><span className="est-calc-row-value">{formatMoney(pAndI, f.currency)}</span></div>
        <div className="est-calc-row"><span className="est-calc-row-label">Property tax</span><span className="est-calc-row-value">{formatMoney(monthlyTax, f.currency)}</span></div>
        <div className="est-calc-row"><span className="est-calc-row-label">Home insurance</span><span className="est-calc-row-value">{formatMoney(monthlyInsurance, f.currency)}</span></div>
        {f.hoaMonthly > 0 && <div className="est-calc-row"><span className="est-calc-row-label">HOA / Vaad Bayit</span><span className="est-calc-row-value">{formatMoney(f.hoaMonthly, f.currency)}</span></div>}
        {needsPMI && <div className="est-calc-row"><span className="est-calc-row-label">PMI</span><span className="est-calc-row-value">{formatMoney(monthlyPMI, f.currency)}</span></div>}
        <div className="est-calc-row total"><span className="est-calc-row-label">Total monthly</span><span className="est-calc-row-value">{formatMoney(totalMonthly, f.currency)}</span></div>

        <div className="est-calc-row" style={{ marginTop: 10 }}><span className="est-calc-row-label">Loan amount</span><span className="est-calc-row-value">{formatMoney(loan, f.currency)}</span></div>
        <div className="est-calc-row"><span className="est-calc-row-label">Total interest over {f.years}y</span><span className="est-calc-row-value">{formatMoney(interestOverLife, f.currency)}</span></div>
      </div>
    </div>
  );
}
