import React, { useState } from 'react';
import { Calculator } from 'lucide-react';
import MortgageCalculator from './calculators/MortgageCalculator';
import AffordabilityCalculator from './calculators/AffordabilityCalculator';
import ClosingCostsCalculator from './calculators/ClosingCostsCalculator';
import RentVsBuyCalculator from './calculators/RentVsBuyCalculator';
import PurchaseTaxCalculator from './calculators/PurchaseTaxCalculator';

const TABS = [
  { key: 'mortgage', label: 'Mortgage Payment', Component: MortgageCalculator },
  { key: 'afford', label: 'How Much Can I Afford', Component: AffordabilityCalculator },
  { key: 'closing', label: 'Down Payment & Closing Costs', Component: ClosingCostsCalculator },
  { key: 'rentvsbuy', label: 'Rent vs. Buy', Component: RentVsBuyCalculator },
  { key: 'iltax', label: 'Israel Purchase Tax', Component: PurchaseTaxCalculator },
];

export default function Calculators() {
  const [tab, setTab] = useState('mortgage');
  const Active = TABS.find((t) => t.key === tab).Component;

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 980 }}>
        <div className="est-masthead">
          <div className="est-masthead-kicker"><Calculator size={13} /> Calculators</div>
          <h1 className="est-masthead-title">Run the numbers before you commit</h1>
          <p className="est-masthead-sub">Every input is editable and every figure is explained -- these are planning estimates, not a loan quote or tax filing. Always confirm real numbers with a lender, accountant or lawyer before acting on them.</p>
        </div>

        <div className="est-guide-tabs">
          {TABS.map((t) => (
            <button key={t.key} type="button" className={`est-chip${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        <Active />
      </div>
    </div>
  );
}
