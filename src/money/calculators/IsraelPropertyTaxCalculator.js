import React, { useState } from 'react';
import { tieredTax, formatMoney } from '../../shared/calculatorMath';
import { DonutChart, BarChart } from '../../shared/SimpleCharts';
import SavedScenarios from '../SavedScenarios';

const DEFAULTS = {
  mode: 'sell',
  // Selling (mas shevach)
  purchasePrice: 1500000,
  salePrice: 2800000,
  soleResidence: true,
  ownedMonths: 60,
  // Buying (mas rechisha)
  propertyValue: 2200000,
  isAdditionalDwelling: false,
};

// 16.1.2025-15.1.2028 brackets (NIS), sole/only dwelling. The 5%-band ceiling
// isn't separately published everywhere -- reconstructed from the fact that
// it lines up with the additional-dwelling 8% band's own ceiling below, so
// treat that one boundary as approximate until confirmed on the Tax
// Authority's own calculator.
const SOLE_DWELLING_BRACKETS = [
  { upTo: 1978745, ratePct: 0 },
  { upTo: 2347040, ratePct: 3.5 },
  { upTo: 6055070, ratePct: 5 },
  { upTo: 20183565, ratePct: 8 },
  { upTo: null, ratePct: 10 },
];

// Additional/investment dwelling -- under the temporary order running
// through end of 2026; confirm it hasn't reverted before relying on it for
// a 2027 purchase.
const ADDITIONAL_DWELLING_BRACKETS = [
  { upTo: 6055070, ratePct: 8 },
  { upTo: null, ratePct: 10 },
];

const SHEVACH_EXEMPTION_CEILING = 5008000; // 2026, sole qualifying residence
const SHEVACH_RATE_PCT = 25;

export default function IsraelPropertyTaxCalculator() {
  const [f, setF] = useState(DEFAULTS);
  const set = (key) => (e) => setF((s) => ({ ...s, [key]: Number(e.target.value) }));
  const setBool = (key) => (e) => setF((s) => ({ ...s, [key]: e.target.checked }));
  const setMode = (mode) => setF((s) => ({ ...s, mode }));

  // -- Selling: mas shevach --
  const gain = Math.max(0, f.salePrice - f.purchasePrice);
  const qualifiesForExemption = f.soleResidence && f.ownedMonths >= 18;
  let shevachTax = 0;
  let exemptPortion = gain;
  if (!qualifiesForExemption) {
    shevachTax = gain * (SHEVACH_RATE_PCT / 100);
    exemptPortion = 0;
  } else if (f.salePrice > SHEVACH_EXEMPTION_CEILING) {
    // Above the ceiling, the exemption applies only proportionally -- the
    // share of the gain up to the ceiling is exempt, the rest is taxed.
    exemptPortion = gain * (SHEVACH_EXEMPTION_CEILING / f.salePrice);
    const taxablePortion = gain - exemptPortion;
    shevachTax = taxablePortion * (SHEVACH_RATE_PCT / 100);
  }
  const netSaleProceeds = f.salePrice - shevachTax;

  // -- Buying: mas rechisha --
  const purchaseBrackets = f.isAdditionalDwelling ? ADDITIONAL_DWELLING_BRACKETS : SOLE_DWELLING_BRACKETS;
  const purchaseTax = tieredTax(Math.max(0, f.propertyValue), purchaseBrackets);
  const totalToClose = f.propertyValue + purchaseTax.total;

  return (
    <div>
      <p className="fin-calc-intro">
        Real estate uses entirely different taxes from everything else on this page: <strong>mas shevach</strong>{' '}
        (the seller's gain, mas shevach) when you sell, and <strong>mas rechisha</strong> (purchase tax) when you buy.
        This is a simplified planning estimate -- it ignores improvement costs, indexation, and the
        pre-2014 linear exemption that can lower a real mas shevach bill, and purchase-tax bracket
        thresholds change periodically. Always get an exact number from an accountant or lawyer before a real
        transaction.
      </p>

      <div className="fin-guide-tabs" style={{ marginBottom: 16 }}>
        <button type="button" className={`fin-chip${f.mode === 'sell' ? ' active' : ''}`} onClick={() => setMode('sell')}>Selling (mas shevach)</button>
        <button type="button" className={`fin-chip${f.mode === 'buy' ? ' active' : ''}`} onClick={() => setMode('buy')}>Buying (mas rechisha)</button>
      </div>

      {f.mode === 'sell' ? (
        <div className="fin-calc-layout">
          <div>
            <div className="fin-chart-card">
              <h3 style={{ marginTop: 0, fontSize: 14 }}>How the sale price breaks down</h3>
              <DonutChart
                segments={[
                  { label: 'Original purchase price', value: Math.min(f.purchasePrice, f.salePrice) },
                  { label: 'Gain kept', value: Math.max(0, gain - shevachTax) },
                  { label: 'Mas shevach', value: shevachTax },
                ]}
                formatValue={(v) => formatMoney(v, 'ILS')}
                centerLabel="Sale price"
              />
            </div>
            <div className="fin-form-section">
              <h3>The sale</h3>
              <div className="fin-form-grid">
                <div><label className="fin-field-label">Purchase price (₪)</label><input className="gs-input" type="number" value={f.purchasePrice} onChange={set('purchasePrice')} /></div>
                <div><label className="fin-field-label">Sale price (₪)</label><input className="gs-input" type="number" value={f.salePrice} onChange={set('salePrice')} /></div>
                <div><label className="fin-field-label">Months owned</label><input className="gs-input" type="number" value={f.ownedMonths} onChange={set('ownedMonths')} /></div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                <input type="checkbox" checked={f.soleResidence} onChange={setBool('soleResidence')} />
                This is my only home in Israel (and I haven't used this exemption on another sale in the last 18 months)
              </label>
              <p className="fin-calc-help">
                A qualifying sole residence held 18+ months is exempt up to ₪{SHEVACH_EXEMPTION_CEILING.toLocaleString()}{' '}
                of sale price (2026) -- fully exempt below that, partially exempt above it. An investment property, a
                second home, or one that doesn't meet these conditions is taxed on the real gain instead.
              </p>
            </div>
          </div>
          <div className="fin-calc-results">
            <h4>Net proceeds after mas shevach</h4>
            <div className="fin-calc-headline">{formatMoney(netSaleProceeds, 'ILS')}</div>
            <div className="fin-calc-headline-label">in your account after the sale</div>
            <div className="fin-calc-row"><span className="fin-calc-row-label">Gain (sale − purchase)</span><span className="fin-calc-row-value">{formatMoney(gain, 'ILS')}</span></div>
            <div className="fin-calc-row"><span className="fin-calc-row-label">Exempt portion</span><span className="fin-calc-row-value">{formatMoney(exemptPortion, 'ILS')}</span></div>
            <div className="fin-calc-row total"><span className="fin-calc-row-label">Mas shevach owed</span><span className="fin-calc-row-value">{formatMoney(shevachTax, 'ILS')}</span></div>
          </div>
        </div>
      ) : (
        <div className="fin-calc-layout">
          <div>
            <div className="fin-chart-card">
              <h3 style={{ marginTop: 0, fontSize: 14 }}>Total cost to close</h3>
              <DonutChart
                segments={[
                  { label: 'Property value', value: f.propertyValue },
                  { label: 'Mas rechisha', value: purchaseTax.total },
                ]}
                formatValue={(v) => formatMoney(v, 'ILS')}
                centerLabel="Total to close"
              />
            </div>
            {purchaseTax.breakdown.length > 1 && (
              <div className="fin-chart-card">
                <h3 style={{ marginTop: 0, fontSize: 14 }}>Tax owed per bracket</h3>
                <BarChart
                  bars={purchaseTax.breakdown.map((b) => ({
                    label: `${formatMoney(b.from, 'ILS')}–${b.to === Infinity ? '∞' : formatMoney(b.to, 'ILS')} @ ${b.ratePct}%`,
                    value: b.tax,
                  }))}
                  formatValue={(v) => formatMoney(v, 'ILS')}
                />
              </div>
            )}
            <div className="fin-form-section">
              <h3>The purchase</h3>
              <div className="fin-form-grid">
                <div><label className="fin-field-label">Property value (₪)</label><input className="gs-input" type="number" value={f.propertyValue} onChange={set('propertyValue')} /></div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                <input type="checkbox" checked={f.isAdditionalDwelling} onChange={setBool('isAdditionalDwelling')} />
                This is an additional dwelling (I already own another home)
              </label>
              <p className="fin-calc-help">
                A sole/only-home purchase gets a 0% band on the first ~₪2M before the rate climbs; an additional or
                investment property is taxed from the first shekel at a flat 8% up to ~₪6M, then 10% above that.
                Non-residents pay the additional-dwelling scale even for their only Israeli home.
              </p>
            </div>
            {purchaseTax.breakdown.length > 0 && (
              <div className="fin-form-section">
                <h3 style={{ marginTop: 0 }}>Bracket breakdown</h3>
                {purchaseTax.breakdown.map((b, i) => (
                  <div key={i} className="fin-calc-row">
                    <span className="fin-calc-row-label">{formatMoney(b.from, 'ILS')} – {b.to === Infinity ? '∞' : formatMoney(b.to, 'ILS')} @ {b.ratePct}%</span>
                    <span className="fin-calc-row-value">{formatMoney(b.tax, 'ILS')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="fin-calc-results">
            <h4>Purchase tax (mas rechisha)</h4>
            <div className="fin-calc-headline">{formatMoney(purchaseTax.total, 'ILS')}</div>
            <div className="fin-calc-headline-label">owed on top of the property price</div>
            <div className="fin-calc-row"><span className="fin-calc-row-label">Property value</span><span className="fin-calc-row-value">{formatMoney(f.propertyValue, 'ILS')}</span></div>
            <div className="fin-calc-row total"><span className="fin-calc-row-label">Total to close</span><span className="fin-calc-row-value">{formatMoney(totalToClose, 'ILS')}</span></div>
          </div>
        </div>
      )}
      <SavedScenarios calculatorKey="israel_property_tax" inputs={f} onLoad={setF} />
    </div>
  );
}
