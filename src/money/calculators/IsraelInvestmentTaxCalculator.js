import React, { useState } from 'react';
import { formatMoney } from '../../shared/calculatorMath';
import { DonutChart } from '../../shared/SimpleCharts';
import SavedScenarios from '../SavedScenarios';

const DEFAULTS = {
  purchaseAmount: 50000,
  saleAmount: 65000,
  substantialShareholder: false,
  foreignResidentTase: false,
};

const STANDARD_RATE = 25; // mas revach hon -- individuals, securities/most assets
const SUBSTANTIAL_SHAREHOLDER_RATE = 30; // 10%+ holding in the company

export default function IsraelInvestmentTaxCalculator() {
  const [f, setF] = useState(DEFAULTS);
  const set = (key) => (e) => setF((s) => ({ ...s, [key]: Number(e.target.value) }));
  const setBool = (key) => (e) => setF((s) => ({ ...s, [key]: e.target.checked }));

  const gain = Math.max(0, f.saleAmount - f.purchaseAmount);
  const exempt = f.foreignResidentTase;
  const ratePct = f.substantialShareholder ? SUBSTANTIAL_SHAREHOLDER_RATE : STANDARD_RATE;
  const tax = exempt ? 0 : gain * (ratePct / 100);
  const netProceeds = f.saleAmount - tax;

  return (
    <div>
      <p className="fin-calc-intro">
        Estimates <strong>mas revach hon</strong> (capital gains tax) on selling an investment in Israel -- shares,
        ETFs/mutual funds (kranot), or other securities. Real estate uses a completely different tax (mas shevach)
        with its own exemptions, and isn't covered by this calculator.
      </p>
      <div className="fin-calc-layout">
        <div>
          <div className="fin-chart-card">
            <h3 style={{ marginTop: 0, fontSize: 14 }}>How the sale amount breaks down</h3>
            <DonutChart
              segments={[
                { label: 'Original cost', value: Math.min(f.purchaseAmount, f.saleAmount) },
                { label: 'Gain kept', value: Math.max(0, gain - tax) },
                { label: 'Capital gains tax', value: tax },
              ]}
              formatValue={(v) => formatMoney(v, 'ILS')}
              centerLabel="Sale amount"
            />
          </div>
          <div className="fin-form-section">
            <h3>The sale</h3>
            <div className="fin-form-grid">
              <div><label className="fin-field-label">Purchase amount (₪)</label><input className="gs-input" type="number" value={f.purchaseAmount} onChange={set('purchaseAmount')} /></div>
              <div><label className="fin-field-label">Sale amount (₪)</label><input className="gs-input" type="number" value={f.saleAmount} onChange={set('saleAmount')} /></div>
            </div>
          </div>

          <div className="fin-form-section">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={f.foreignResidentTase} onChange={setBool('foreignResidentTase')} />
              I'm a foreign (non-Israeli) tax resident, selling securities listed on the TASE
            </label>
            <p className="fin-calc-help" style={{ marginTop: 6 }}>
              Foreign residents are generally exempt from Israeli capital gains tax on TASE-listed securities --
              except REITs and short-term government bonds, and only once you hold a valid withholding-exemption
              certificate from the Tax Authority before the sale. Israeli residents (including olim, outside their
              foreign-income years) don't get this exemption.
            </p>
            {!f.foreignResidentTase && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                <input type="checkbox" checked={f.substantialShareholder} onChange={setBool('substantialShareholder')} />
                I held 10%+ of the company ("substantial shareholder")
              </label>
            )}
          </div>
        </div>

        <div className="fin-calc-results">
          <h4>Net proceeds after tax</h4>
          <div className="fin-calc-headline">{formatMoney(netProceeds, 'ILS')}</div>
          <div className="fin-calc-headline-label">in your account after the sale</div>
          <div className="fin-calc-row"><span className="fin-calc-row-label">Capital gain</span><span className="fin-calc-row-value">{formatMoney(gain, 'ILS')}</span></div>
          <div className="fin-calc-row"><span className="fin-calc-row-label">Tax rate applied</span><span className="fin-calc-row-value">{exempt ? 'Exempt' : `${ratePct}%`}</span></div>
          <div className="fin-calc-row total"><span className="fin-calc-row-label">Capital gains tax</span><span className="fin-calc-row-value">{formatMoney(tax, 'ILS')}</span></div>
        </div>
      </div>
      <SavedScenarios calculatorKey="israel_investment_tax" inputs={f} onLoad={setF} />
    </div>
  );
}
