import React, { useState } from 'react';
import { Calculator } from 'lucide-react';
import CompoundInterestCalculator from './calculators/CompoundInterestCalculator';
import RetirementCalculator from './calculators/RetirementCalculator';
import DebtPayoffCalculator from './calculators/DebtPayoffCalculator';
import EmergencyFundCalculator from './calculators/EmergencyFundCalculator';
import SavingsGoalCalculator from './calculators/SavingsGoalCalculator';

const TABS = [
  { key: 'compound', label: 'Compound Interest', Component: CompoundInterestCalculator },
  { key: 'retirement', label: 'Retirement', Component: RetirementCalculator },
  { key: 'debt', label: 'Debt Payoff', Component: DebtPayoffCalculator },
  { key: 'emergency', label: 'Emergency Fund', Component: EmergencyFundCalculator },
  { key: 'goal', label: 'Savings Goal', Component: SavingsGoalCalculator },
];

export default function Calculators() {
  const [tab, setTab] = useState('compound');
  const Active = TABS.find((t) => t.key === tab).Component;

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 980 }}>
        <div className="fin-masthead">
          <div className="fin-masthead-kicker"><Calculator size={13} /> Calculators</div>
          <h1 className="fin-masthead-title">Plan it out before you commit</h1>
          <p className="fin-masthead-sub">Every input is editable and every figure is explained -- these are planning estimates, not financial advice. Always confirm real numbers with a financial advisor or accountant before acting on them.</p>
        </div>

        <div className="fin-guide-tabs">
          {TABS.map((t) => (
            <button key={t.key} type="button" className={`fin-chip${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        <Active />
      </div>
    </div>
  );
}
