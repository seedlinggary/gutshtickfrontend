import React, { useState } from 'react';
import { monthlyPI, formatMoney } from '../../shared/calculatorMath';
import { DonutChart } from '../../shared/SimpleCharts';

const DEFAULTS = {
  currency: 'USD', annualIncome: 90000, monthlyDebts: 400, downPayment: 60000,
  rate: 6.5, years: 30, frontEndPct: 28, backEndPct: 36, taxPct: 1.1, insuranceAnnual: 1400, hoaMonthly: 0,
};

export default function AffordabilityCalculator({ initialValues } = {}) {
  // This calculator has no `price` input (it solves FOR a price), so only
  // `currency` is ever worth seeding from the URL -- anything else (e.g. a
  // stray `price` param meant for the Mortgage tab) is ignored on purpose.
  const cleanInitial = initialValues && initialValues.currency !== undefined
    ? { currency: initialValues.currency }
    : {};
  const [f, setF] = useState({ ...DEFAULTS, ...cleanInitial });
  const set = (key) => (e) => setF((s) => ({ ...s, [key]: e.target.type === 'number' || e.target.type === 'range' ? Number(e.target.value) : e.target.value }));

  const grossMonthly = f.annualIncome / 12;
  const frontEndLimit = grossMonthly * (f.frontEndPct / 100);
  const backEndLimit = grossMonthly * (f.backEndPct / 100) - f.monthlyDebts;
  const maxMonthlyPayment = Math.max(0, Math.min(frontEndLimit, backEndLimit));
  const bindingRule = frontEndLimit <= backEndLimit ? 'front-end' : 'back-end';

  // See the 28/36 note below for where these ratios come from. Solving for
  // max loan: maxMonthlyPayment = loan*(piFactor + taxPct/1200) +
  // down*taxPct/1200 + insuranceMonthly + hoa -- see calculatorMath.js's
  // monthlyPI(1, rate, years) used as the "payment per $1 borrowed" factor.
  const piFactor = monthlyPI(1, f.rate, f.years);
  const insuranceMonthly = f.insuranceAnnual / 12;
  const taxFactor = f.taxPct / 1200;
  const remainder = maxMonthlyPayment - f.downPayment * taxFactor - insuranceMonthly - f.hoaMonthly;
  const maxLoan = Math.max(0, remainder / (piFactor + taxFactor));
  const maxPrice = maxLoan + f.downPayment;
  const piOnly = monthlyPI(maxLoan, f.rate, f.years);
  const taxOnly = maxPrice * taxFactor;

  return (
    <div className="est-calc-layout">
      <div>
        <p className="est-calc-intro">
          Uses the standard "28/36 rule" lenders use to judge affordability: your housing payment alone shouldn't
          exceed 28% of gross monthly income (the <strong>front-end ratio</strong>), and your housing payment plus all
          other debt payments shouldn't exceed 36% (the <strong>back-end ratio</strong>). Whichever limit is tighter
          wins -- a lot of existing debt (car loan, student loans, credit cards) can cap you well below the front-end
          number alone.
        </p>

        <div className="est-form-section">
          <h3>Income &amp; debts</h3>
          <div className="est-form-grid">
            <div>
              <label className="est-field-label">Currency</label>
              <select className="gs-input" value={f.currency} onChange={set('currency')}>
                <option value="USD">USD ($)</option>
                <option value="ILS">ILS (₪)</option>
              </select>
            </div>
            <div>
              <label className="est-field-label">Annual gross income (household)</label>
              <input className="gs-input" type="number" value={f.annualIncome} onChange={set('annualIncome')} />
            </div>
            <div>
              <label className="est-field-label">Other monthly debt payments</label>
              <input className="gs-input" type="number" value={f.monthlyDebts} onChange={set('monthlyDebts')} />
            </div>
            <div>
              <label className="est-field-label">Down payment available</label>
              <input className="gs-input" type="number" value={f.downPayment} onChange={set('downPayment')} />
            </div>
          </div>
          <p className="est-calc-help">"Other monthly debt payments" means car loans, student loans, minimum credit card payments, child support -- anything that shows up on a credit report, not everyday spending.</p>
        </div>

        <div className="est-form-section">
          <h3>Loan assumptions</h3>
          <div className="est-calc-field">
            <div className="est-calc-field-row"><label>Interest rate</label><span className="est-calc-field-value">{f.rate}%</span></div>
            <input className="est-calc-slider" type="range" min="0" max="15" step="0.05" value={f.rate} onChange={set('rate')} />
          </div>
          <div className="est-calc-field">
            <div className="est-calc-field-row"><label>Loan term</label><span className="est-calc-field-value">{f.years} years</span></div>
            <input className="est-calc-slider" type="range" min="5" max="40" step="1" value={f.years} onChange={set('years')} />
          </div>
          <div className="est-form-grid">
            <div>
              <label className="est-field-label">Front-end ratio limit</label>
              <input className="gs-input" type="number" value={f.frontEndPct} onChange={set('frontEndPct')} />
            </div>
            <div>
              <label className="est-field-label">Back-end ratio limit</label>
              <input className="gs-input" type="number" value={f.backEndPct} onChange={set('backEndPct')} />
            </div>
            <div>
              <label className="est-field-label">Property tax (annual, % of price)</label>
              <input className="gs-input" type="number" step="0.1" value={f.taxPct} onChange={set('taxPct')} />
            </div>
            <div>
              <label className="est-field-label">Home insurance (annual)</label>
              <input className="gs-input" type="number" value={f.insuranceAnnual} onChange={set('insuranceAnnual')} />
            </div>
          </div>
          <p className="est-calc-help">28/36 are conventional-loan norms -- some loan programs (FHA, VA, and many Israeli bank products) allow higher ratios. Adjust these if your lender quoted you different limits.</p>
        </div>

        <div className="est-chart-card">
          <h3 style={{ marginTop: 0, fontSize: 14 }}>What your max monthly payment is made of</h3>
          <DonutChart
            segments={[
              { label: 'Principal & interest', value: piOnly },
              { label: 'Property tax', value: taxOnly },
              { label: 'Insurance', value: insuranceMonthly },
              ...(f.hoaMonthly > 0 ? [{ label: 'HOA / Vaad Bayit', value: f.hoaMonthly }] : []),
            ]}
            formatValue={(v) => formatMoney(v, f.currency)}
            centerLabel="Max monthly payment"
          />
        </div>
      </div>

      <div className="est-calc-results">
        <h4>You can likely afford</h4>
        <div className="est-calc-headline">{formatMoney(maxPrice, f.currency)}</div>
        <div className="est-calc-headline-label">estimated max home price</div>

        <div className="est-calc-row"><span className="est-calc-row-label">Max monthly housing payment</span><span className="est-calc-row-value">{formatMoney(maxMonthlyPayment, f.currency)}</span></div>
        <div className="est-calc-row"><span className="est-calc-row-label">Limited by</span><span className="est-calc-row-value">{bindingRule === 'front-end' ? 'Front-end (28%)' : 'Back-end (36%)'} rule</span></div>
        <div className="est-calc-row"><span className="est-calc-row-label">Implied loan amount</span><span className="est-calc-row-value">{formatMoney(maxLoan, f.currency)}</span></div>
        <div className="est-calc-row total"><span className="est-calc-row-label">+ your down payment</span><span className="est-calc-row-value">{formatMoney(f.downPayment, f.currency)}</span></div>
      </div>
    </div>
  );
}
