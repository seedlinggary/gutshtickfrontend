import React from 'react';
import { Link } from 'react-router-dom';
import { Calculator } from 'lucide-react';
import { monthlyPI, formatMoney } from '../shared/calculatorMath';

/** Same defaults MortgageCalculator.js's own DEFAULTS constant uses (20%
 * down, 6.5% rate, 30yr term) -- kept in sync on purpose so this instant,
 * no-input estimate and the full calculator never disagree with each other
 * if someone flips between the two for the same listing. */
const DOWN_PCT = 20;
const RATE_PCT = 6.5;
const YEARS = 30;

/** Small "can you afford this?" inline estimate for a for-sale Estates
 * listing -- sits right under the price/spec row on ListingProfile.js.
 * Deliberately principal-&-interest only (via monthlyPI straight from
 * calculatorMath.js, no property tax/insurance/PMI guesswork) since those
 * vary too much by location to assume here; the full Mortgage calculator
 * (linked below, pre-filled with this same price) is where that full
 * breakdown belongs. */
export default function AffordabilityInline({ price, currency }) {
  if (price == null || !isFinite(price) || price <= 0) return null;

  const loan = price * (1 - DOWN_PCT / 100);
  const monthly = monthlyPI(loan, RATE_PCT, YEARS);
  const safeCurrency = currency || 'USD';

  return (
    <div className="est-afford-inline">
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--text)' }}>
        <Calculator size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        <span>Est. <strong>{formatMoney(monthly, safeCurrency)}</strong>/mo at today's rates</span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 8px' }}>
        Principal &amp; interest only -- assumes {DOWN_PCT}% down, {RATE_PCT}% rate, {YEARS}yr term. Taxes, insurance
        and HOA aren't included here.
      </p>
      <Link
        to={`/calculators?tab=mortgage&price=${encodeURIComponent(price)}&currency=${encodeURIComponent(safeCurrency)}`}
        className="est-back-link"
        style={{ marginBottom: 0 }}
      >
        Open full mortgage calculator →
      </Link>
    </div>
  );
}
