import React from 'react';
import { Link } from 'react-router-dom';
import { parseCompensation } from './parseCompensation';
import { formatMoney } from '../shared/calculatorMath';

// Standard full-time approximations, not a real payroll calendar -- just
// enough to flip consistently between hourly/monthly/yearly. 173.3 =
// 40hrs/week * 52 weeks / 12 months (the same figure most US payroll
// calculators use for an hourly-to-salary conversion); 12 months/year is
// exact.
const HOURS_PER_MONTH = 173.3;
const MONTHS_PER_YEAR = 12;

/** Inline "what this pay actually works out to" restatement for a Tachlis
 * post's free-text compensation field -- renders nothing if `compensation`
 * doesn't parse into something confident (see parseCompensation.js). Sits
 * right alongside TachlisPostPage.js's existing compensation line. */
export default function CompensationEquivalent({ compensation }) {
  const parsed = parseCompensation(compensation);
  if (!parsed) return null;
  const { amount, period, currency } = parsed;

  let hourly;
  let monthly;
  let yearly;
  if (period === 'hourly') {
    hourly = amount;
    monthly = amount * HOURS_PER_MONTH;
    yearly = monthly * MONTHS_PER_YEAR;
  } else if (period === 'monthly') {
    monthly = amount;
    hourly = amount / HOURS_PER_MONTH;
    yearly = amount * MONTHS_PER_YEAR;
  } else {
    yearly = amount;
    monthly = amount / MONTHS_PER_YEAR;
    hourly = monthly / HOURS_PER_MONTH;
  }

  return (
    <div style={{ marginTop: 2 }}>
      <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '2px 0 0' }}>
        ≈ {formatMoney(hourly, currency)}/hr · {formatMoney(monthly, currency)}/mo · {formatMoney(yearly, currency)}/yr
      </p>
      {currency === 'ILS' && (
        <Link
          to={`/calculators?tab=israel_tax&grossMonthly=${encodeURIComponent(Math.round(monthly))}`}
          className="fin-back-link"
          style={{ marginBottom: 0, marginTop: 2, display: 'inline-block', fontSize: 12.5 }}
        >
          See this after Israeli tax →
        </Link>
      )}
    </div>
  );
}
