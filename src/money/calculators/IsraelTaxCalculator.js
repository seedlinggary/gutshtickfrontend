import React, { useState } from 'react';
import { tieredTax, formatMoney } from '../../shared/calculatorMath';
import { DonutChart } from '../../shared/SimpleCharts';
import SavedScenarios from '../SavedScenarios';
import CreditPointsHelper from './CreditPointsHelper';
import Form106Upload from './Form106Upload';

const DEFAULTS = {
  grossMonthly: 15000,
  creditPoints: 2.25,
  includeSavings: false,
  pensionPct: 6,
  studyFundPct: 2.5,
};

// Amendment 288's 2026-2027 brackets, monthly (annual ÷ 12): 84,120 / 120,720
// / 228,000 / 301,200 / 560,280 then 47%, plus the 3% "mas yisuf" surtax above
// 721,560/yr (=60,130/mo) which pushes the true top rate to 50%. Frozen for
// 2026-2027, not index-linked -- re-check the Tax Authority's own table
// before trusting these past 2027.
const INCOME_TAX_BRACKETS = [
  { upTo: 7010, ratePct: 10 },
  { upTo: 10060, ratePct: 14 },
  { upTo: 19000, ratePct: 20 },
  { upTo: 25100, ratePct: 31 },
  { upTo: 46690, ratePct: 35 },
  { upTo: 60130, ratePct: 47 },
  { upTo: null, ratePct: 50 },
];

// Bituach Leumi (National Insurance) + Bituach Briut (health tax) employee
// rates, combined into one tiered schedule since both use the same 60%-of-
// average-wage threshold: 1.04%+3.23%=4.27% up to ₪7,703/mo, 7.00%+5.16%=
// 12.16% from there to the ₪51,910/mo ceiling, nothing above the ceiling.
const NI_HEALTH_BRACKETS = [
  { upTo: 7703, ratePct: 4.27 },
  { upTo: 51910, ratePct: 12.16 },
  { upTo: null, ratePct: 0 },
];

const CREDIT_POINT_VALUE = 242; // NIS/month, 2026

export default function IsraelTaxCalculator() {
  const [f, setF] = useState(DEFAULTS);
  const [form106, setForm106] = useState(null);
  const set = (key) => (e) => setF((s) => ({ ...s, [key]: Number(e.target.value) }));
  const setBool = (key) => (e) => setF((s) => ({ ...s, [key]: e.target.checked }));

  const gross = Math.max(0, f.grossMonthly);
  const niHealth = tieredTax(gross, NI_HEALTH_BRACKETS);

  const pensionAmt = f.includeSavings ? gross * (f.pensionPct / 100) : 0;
  const studyFundAmt = f.includeSavings ? gross * (f.studyFundPct / 100) : 0;
  // Employee pension + study-fund contributions are "recognized" (tax-
  // deductible) up to a ceiling most salaries never reach, so for a planning
  // estimate we just subtract them from the income-tax base -- NI/health is
  // still charged on the FULL gross, since that deduction doesn't apply there.
  const taxableForIncomeTax = Math.max(0, gross - pensionAmt - studyFundAmt);
  const incomeTaxGross = tieredTax(taxableForIncomeTax, INCOME_TAX_BRACKETS);
  const creditValue = Math.max(0, f.creditPoints) * CREDIT_POINT_VALUE;
  const incomeTaxAfterCredits = Math.max(0, incomeTaxGross.total - creditValue);

  const netCash = gross - niHealth.total - incomeTaxAfterCredits - pensionAmt - studyFundAmt;
  const effectiveRate = gross > 0 ? (incomeTaxAfterCredits / gross) * 100 : 0;
  const lastBracket = incomeTaxGross.breakdown[incomeTaxGross.breakdown.length - 1];
  const marginalRate = lastBracket ? lastBracket.ratePct : 0;

  // "Explain my unique situation" -- compares what the Form 106 actually
  // reported against what these brackets + the entered inputs predict,
  // using the SAME annualized basis on both sides.
  let comparison = null;
  if (form106 && form106.grossAnnualIncome != null && form106.incomeTaxWithheld != null) {
    const formEffectiveRate = (form106.incomeTaxWithheld / form106.grossAnnualIncome) * 100;
    const ourAnnualTax = incomeTaxAfterCredits * 12;
    const diff = form106.incomeTaxWithheld - ourAnnualTax;
    const diffPct = form106.grossAnnualIncome > 0 ? (diff / form106.grossAnnualIncome) * 100 : 0;
    let explanation;
    if (Math.abs(diffPct) < 1.5) {
      explanation = "That's close to what the brackets predict for the income and credit points entered above -- looks consistent.";
    } else if (diff > 0) {
      explanation = 'Your form shows more tax withheld than this estimate. Common reasons: fewer credit points were applied at work than you\'ve entered above, a bonus or overtime pushed part of the year into a higher bracket, or you have other taxable income this form doesn\'t cover.';
    } else {
      explanation = 'Your form shows less tax withheld than this estimate. Common reasons: unpaid leave or a mid-year raise changed your average, or your employer applied more credit points than you\'ve entered above.';
    }
    comparison = { formEffectiveRate, ourAnnualTax, diff, explanation };
  }

  return (
    <div>
      <p className="fin-calc-intro">
        Estimates a <strong>salaried employee's</strong> net monthly pay in Israel from gross salary, using the
        2026-2027 income tax brackets, Bituach Leumi (National Insurance) + Bituach Briut (health tax), and your tax
        credit points (nekudot zikui). Self-employed (osek patur/murshe) pay National Insurance on a different
        schedule and aren't covered here. This is a planning estimate, not a payslip -- always check your actual
        tlush maskoret (payslip) or a licensed Israeli accountant (ro'eh cheshbon) for the exact number.
      </p>
      <div className="fin-calc-layout">
        <div>
          <div className="fin-chart-card">
            <h3 style={{ marginTop: 0, fontSize: 14 }}>Where your gross salary goes</h3>
            <DonutChart
              segments={[
                { label: 'Net pay', value: netCash },
                { label: 'Income tax', value: incomeTaxAfterCredits },
                { label: 'National Insurance + health', value: niHealth.total },
                ...(f.includeSavings ? [{ label: 'Pension + study fund', value: pensionAmt + studyFundAmt }] : []),
              ]}
              formatValue={(v) => formatMoney(v, 'ILS')}
              centerLabel="Gross"
            />
          </div>
          <div className="fin-form-section">
            <h3>Your salary</h3>
            <div className="fin-form-grid">
              <div><label className="fin-field-label">Gross monthly salary (₪)</label><input className="gs-input" type="number" value={f.grossMonthly} onChange={set('grossMonthly')} /></div>
              <div><label className="fin-field-label">Tax credit points (nekudot zikui)</label><input className="gs-input" type="number" step="0.25" value={f.creditPoints} onChange={set('creditPoints')} /></div>
            </div>
            <p className="fin-calc-help">
              Every Israeli resident starts with a base number of points (worth ₪{CREDIT_POINT_VALUE}/month each,
              2026): 2.25 for men, 2.75 for women, plus more for children, new immigrants (for their first 54 months),
              single parents and others. Check your own total on the Tax Authority's credit-point calculator --
              defaults here are just the plain adult base.
            </p>
            <CreditPointsHelper onApply={(total) => setF((s) => ({ ...s, creditPoints: total }))} />
          </div>

          <div className="fin-form-section">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
              <input type="checkbox" checked={f.includeSavings} onChange={setBool('includeSavings')} />
              Include pension + study fund (keren hishtalmut) contributions
            </label>
            <p className="fin-calc-help" style={{ marginTop: 6 }}>
              These come out of your paycheck too, but they're not "lost" -- they land in your own long-term savings,
              and they lower the income you're taxed on. Defaults are common employee shares (the employer separately
              pays in more on top, which never touches your paycheck at all).
            </p>
            {f.includeSavings && (
              <div className="fin-form-grid" style={{ marginTop: 10 }}>
                <div><label className="fin-field-label">Pension contribution (%)</label><input className="gs-input" type="number" step="0.5" value={f.pensionPct} onChange={set('pensionPct')} /></div>
                <div><label className="fin-field-label">Study fund contribution (%)</label><input className="gs-input" type="number" step="0.5" value={f.studyFundPct} onChange={set('studyFundPct')} /></div>
              </div>
            )}
          </div>

          <Form106Upload onParsed={(fields) => setForm106(fields)} />

          {comparison && (
            <div className="fin-form-section">
              <h3 style={{ marginTop: 0 }}>Your Form 106, explained</h3>
              <div className="fin-calc-row"><span className="fin-calc-row-label">Reported annual income</span><span className="fin-calc-row-value">{formatMoney(form106.grossAnnualIncome, 'ILS')}</span></div>
              <div className="fin-calc-row"><span className="fin-calc-row-label">Reported tax withheld</span><span className="fin-calc-row-value">{formatMoney(form106.incomeTaxWithheld, 'ILS')} ({comparison.formEffectiveRate.toFixed(1)}%)</span></div>
              <div className="fin-calc-row"><span className="fin-calc-row-label">This calculator's estimate</span><span className="fin-calc-row-value">{formatMoney(comparison.ourAnnualTax, 'ILS')}</span></div>
              <div className="fin-calc-row total"><span className="fin-calc-row-label">Difference</span><span className="fin-calc-row-value">{formatMoney(Math.abs(comparison.diff), 'ILS')} {comparison.diff >= 0 ? 'more on the form' : 'more in the estimate'}</span></div>
              <p className="fin-calc-help">{comparison.explanation}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setF((s) => ({ ...s, grossMonthly: Math.round(form106.grossAnnualIncome / 12) }))}>
                  Use this income (₪{Math.round(form106.grossAnnualIncome / 12).toLocaleString()}/mo)
                </button>
                {form106.creditPoints != null && (
                  <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setF((s) => ({ ...s, creditPoints: form106.creditPoints }))}>
                    Use these credit points ({form106.creditPoints})
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="fin-calc-results">
          <h4>Net take-home pay</h4>
          <div className="fin-calc-headline">{formatMoney(netCash, 'ILS')}</div>
          <div className="fin-calc-headline-label">per month, in your pocket</div>
          <div className="fin-calc-row"><span className="fin-calc-row-label">Gross monthly salary</span><span className="fin-calc-row-value">{formatMoney(gross, 'ILS')}</span></div>
          <div className="fin-calc-row"><span className="fin-calc-row-label">− National Insurance + health tax</span><span className="fin-calc-row-value">-{formatMoney(niHealth.total, 'ILS')}</span></div>
          <div className="fin-calc-row"><span className="fin-calc-row-label">− Income tax (before credits)</span><span className="fin-calc-row-value">-{formatMoney(incomeTaxGross.total, 'ILS')}</span></div>
          <div className="fin-calc-row"><span className="fin-calc-row-label">+ Credit points ({f.creditPoints} × ₪{CREDIT_POINT_VALUE})</span><span className="fin-calc-row-value">+{formatMoney(creditValue, 'ILS')}</span></div>
          {f.includeSavings && (
            <>
              <div className="fin-calc-row"><span className="fin-calc-row-label">− Pension (to your savings)</span><span className="fin-calc-row-value">-{formatMoney(pensionAmt, 'ILS')}</span></div>
              <div className="fin-calc-row"><span className="fin-calc-row-label">− Study fund (to your savings)</span><span className="fin-calc-row-value">-{formatMoney(studyFundAmt, 'ILS')}</span></div>
            </>
          )}
          <div className="fin-calc-row total"><span className="fin-calc-row-label">= Net cash in hand</span><span className="fin-calc-row-value">{formatMoney(netCash, 'ILS')}</span></div>
          <div className="fin-calc-row"><span className="fin-calc-row-label">Effective income tax rate</span><span className="fin-calc-row-value">{effectiveRate.toFixed(1)}%</span></div>
          <div className="fin-calc-row"><span className="fin-calc-row-label">Marginal rate (your top bracket)</span><span className="fin-calc-row-value">{marginalRate}%</span></div>
          <div className="fin-calc-row"><span className="fin-calc-row-label">≈ Annual net</span><span className="fin-calc-row-value">{formatMoney(netCash * 12, 'ILS')}</span></div>
        </div>
      </div>
      <SavedScenarios calculatorKey="israel_tax" inputs={f} onLoad={setF} />
    </div>
  );
}
