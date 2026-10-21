import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { tieredTax, formatMoney } from '../../shared/calculatorMath';

// Approximate brackets reported for the instruction covering 16.01.2025
// through 15.01.2028 (see the Learn page's Sources list) -- the Tax
// Authority re-indexes the thresholds for inflation each January, and the
// rates differ further for olim/disabled/other special statuses this
// doesn't attempt to model. These exist so the bracket *mechanism* (tiered,
// like income tax) is right out of the box, not because these exact
// thresholds should be trusted without checking misim.gov.il first -- the
// UI says so loudly, and every row is editable.
const ONLY_HOME_DEFAULT = [
  { upTo: 1978745, ratePct: 0 },
  { upTo: 2347040, ratePct: 3.5 },
  { upTo: 6055070, ratePct: 5 },
  { upTo: 20183565, ratePct: 8 },
  { upTo: null, ratePct: 10 },
];
const ADDITIONAL_HOME_DEFAULT = [
  { upTo: 6055070, ratePct: 8 },
  { upTo: null, ratePct: 10 },
];

export default function PurchaseTaxCalculator() {
  const [price, setPrice] = useState(2200000);
  const [onlyHome, setOnlyHome] = useState(true);
  const [onlyHomeBrackets, setOnlyHomeBrackets] = useState(ONLY_HOME_DEFAULT);
  const [additionalBrackets, setAdditionalBrackets] = useState(ADDITIONAL_HOME_DEFAULT);

  const brackets = onlyHome ? onlyHomeBrackets : additionalBrackets;
  const setBrackets = onlyHome ? setOnlyHomeBrackets : setAdditionalBrackets;
  const { total, breakdown } = tieredTax(price, brackets);

  const updateRow = (i, key, value) => {
    setBrackets((rows) => rows.map((r, idx) => (idx === i ? { ...r, [key]: value === '' ? null : Number(value) } : r)));
  };
  const removeRow = (i) => setBrackets((rows) => rows.filter((_, idx) => idx !== i));
  const addRow = () => setBrackets((rows) => {
    const last = rows[rows.length - 1];
    const prevUpTo = rows.length > 1 ? rows[rows.length - 2].upTo : 0;
    const inserted = { upTo: (last.upTo || prevUpTo || 0) + 500000, ratePct: last.ratePct };
    return [...rows.slice(0, -1), inserted, last];
  });

  return (
    <div className="est-calc-layout">
      <div>
        <p className="est-calc-intro">
          Israel's Mas Rechisha (purchase tax) is <strong>tiered like income tax</strong> -- each bracket's rate only
          applies to the slice of the price inside that bracket, not the whole price. The rate structure also depends
          on whether this will be your only home in Israel or an additional one.
        </p>
        <div className="est-guide-note">
          The defaults below approximate the brackets reported for the instruction covering 16.01.2025-15.01.2028 (see
          sourcing on the <Link to="/learn">Learn</Link> page) -- but thresholds are re-indexed for inflation every
          January, and this doesn't account for special-status discounts (new immigrants/olim, people with
          disabilities, etc.). Look up the current thresholds at <strong>misim.gov.il</strong> (or ask your lawyer)
          and edit the rows below before trusting this number.
        </div>

        <div className="est-form-section">
          <h3>Purchase</h3>
          <label className="est-field-label">Price (₪)</label>
          <input className="gs-input" type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} style={{ marginBottom: 14 }} />

          <div className="est-radio-row">
            <label className="est-radio-option"><input type="radio" checked={onlyHome} onChange={() => setOnlyHome(true)} /> This is my only home in Israel</label>
            <label className="est-radio-option"><input type="radio" checked={!onlyHome} onChange={() => setOnlyHome(false)} /> This is an additional / investment property</label>
          </div>
        </div>

        <div className="est-form-section">
          <h3>Tax brackets ({onlyHome ? 'only home' : 'additional property'})</h3>
          <table className="est-calc-brackets">
            <thead>
              <tr><th>Up to (₪)</th><th>Rate</th><th /></tr>
            </thead>
            <tbody>
              {brackets.map((b, i) => (
                <tr key={i}>
                  <td>
                    {b.upTo == null ? <span style={{ color: 'var(--muted)' }}>and above</span> : (
                      <input className="gs-input" type="number" value={b.upTo} onChange={(e) => updateRow(i, 'upTo', e.target.value)} />
                    )}
                  </td>
                  <td>
                    <input className="gs-input" type="number" step="0.1" value={b.ratePct} onChange={(e) => updateRow(i, 'ratePct', e.target.value)} style={{ width: 70 }} />%
                  </td>
                  <td>
                    {brackets.length > 1 && i < brackets.length - 1 && (
                      <button type="button" className="est-calc-brackets-remove" onClick={() => removeRow(i)} aria-label="Remove bracket"><X size={14} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={addRow}><Plus size={13} /> Add bracket</button>
        </div>
      </div>

      <div className="est-calc-results">
        <h4>Estimated purchase tax</h4>
        <div className="est-calc-headline">{formatMoney(total, 'ILS')}</div>
        <div className="est-calc-headline-label">{((total / price) * 100 || 0).toFixed(2)}% effective rate</div>

        {breakdown.map((b, i) => (
          <div className="est-calc-row" key={i}>
            <span className="est-calc-row-label">{formatMoney(b.from, 'ILS')}–{b.to === Infinity ? '∞' : formatMoney(b.to, 'ILS')} @ {b.ratePct}%</span>
            <span className="est-calc-row-value">{formatMoney(b.tax, 'ILS')}</span>
          </div>
        ))}
        <div className="est-calc-row total"><span className="est-calc-row-label">Total tax</span><span className="est-calc-row-value">{formatMoney(total, 'ILS')}</span></div>
      </div>
    </div>
  );
}
