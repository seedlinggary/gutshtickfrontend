/** Pure math shared by every calculator on the Calculators page -- kept in
 * one place so the amortization formula (the one piece every calculator
 * ultimately depends on) only exists once. No currency assumptions live
 * here; callers format with their own currency symbol. */

/** Standard fixed-rate mortgage payment formula. `annualRatePct` is e.g. 6.5
 * for 6.5%; `years` is the loan term. Returns the flat monthly principal +
 * interest payment. A 0% rate (someone testing the math, or a genuine
 * interest-free loan) is handled separately since the formula divides by
 * zero otherwise. */
export function monthlyPI(principal, annualRatePct, years) {
  const n = years * 12;
  if (n <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / n;
  return (principal * r * (1 + r) ** n) / ((1 + r) ** n - 1);
}

/** Remaining loan balance after `yearsElapsed` of a `years`-term loan --
 * what's left to pay off if you sold at that point. Used by the Rent vs Buy
 * calculator to figure out how much equity a sale would actually net. */
export function remainingBalance(principal, annualRatePct, years, yearsElapsed) {
  const n = years * 12;
  const p = Math.min(yearsElapsed * 12, n);
  const r = annualRatePct / 100 / 12;
  if (r === 0) return Math.max(0, principal * (1 - p / n));
  return principal * ((1 + r) ** n - (1 + r) ** p) / ((1 + r) ** n - 1);
}

/** Total interest paid over the full life of the loan. */
export function totalInterest(principal, annualRatePct, years) {
  const payment = monthlyPI(principal, annualRatePct, years);
  return payment * years * 12 - principal;
}

/** Future value of a lump sum growing at `annualRatePct` for `years`. */
export function futureValue(amount, annualRatePct, years) {
  return amount * (1 + annualRatePct / 100) ** years;
}

/** Present value -- the inverse of futureValue: how big a lump sum today
 * needs to be to grow into `targetAmount` after `years` at `annualRatePct`,
 * with no further contributions. Used by the Coast FIRE calculator (how
 * much do I need *right now* to coast to my number) and the Savings Goal
 * calculator's "one-time deposit" mode. */
export function presentValue(targetAmount, annualRatePct, years) {
  return targetAmount / (1 + annualRatePct / 100) ** years;
}

/** Total of a monthly amount that grows once a year by `annualGrowthPct`
 * (e.g. rent that goes up every lease renewal), summed over `years`. */
export function growingAnnualTotal(monthlyAmount, annualGrowthPct, years) {
  let total = 0;
  let current = monthlyAmount;
  for (let y = 0; y < years; y++) {
    total += current * 12;
    current *= 1 + annualGrowthPct / 100;
  }
  return total;
}

/** Marginal-bracket tax, the same mechanism income tax (or Israel's Mas
 * Rechisha purchase tax) uses: each bracket's rate only applies to the slice
 * of the amount that falls within it, not the whole amount. `brackets` is an
 * ascending array of {upTo, ratePct} where the last entry's `upTo` should be
 * null/Infinity (the open-ended top bracket). Returns {total, breakdown}
 * where breakdown lists how much tax came from each bracket, for a
 * transparent line-by-line display. */
export function tieredTax(amount, brackets) {
  let remaining = amount;
  let lastThreshold = 0;
  let total = 0;
  const breakdown = [];
  for (const b of brackets) {
    const upTo = b.upTo == null ? Infinity : Number(b.upTo);
    const sliceWidth = Math.max(0, Math.min(remaining, upTo - lastThreshold));
    const sliceTax = sliceWidth * (Number(b.ratePct) / 100);
    if (sliceWidth > 0) breakdown.push({ from: lastThreshold, to: upTo, ratePct: b.ratePct, taxable: sliceWidth, tax: sliceTax });
    total += sliceTax;
    remaining -= sliceWidth;
    lastThreshold = upTo;
    if (remaining <= 0) break;
  }
  return { total, breakdown };
}

/** Future value of a principal PLUS a regular monthly contribution, both
 * compounding monthly at `annualRatePct` for `years` -- the standard
 * retirement/savings-growth formula. Used by Gut Money's Retirement and
 * Savings Goal calculators. */
export function futureValueWithContributions(principal, monthlyContribution, annualRatePct, years) {
  const n = years * 12;
  const r = annualRatePct / 100 / 12;
  const growthOnPrincipal = principal * (1 + r) ** n;
  const growthOnContributions = r === 0 ? monthlyContribution * n : monthlyContribution * (((1 + r) ** n - 1) / r);
  return growthOnPrincipal + growthOnContributions;
}

/** Months to pay off `balance` at `annualRatePct` with a fixed
 * `monthlyPayment` -- the inverse of the mortgage-payment formula. Returns
 * Infinity if the payment doesn't even cover the first month's interest
 * (balance never shrinks). Used by the Debt Payoff calculator. */
export function monthsToPayoff(balance, annualRatePct, monthlyPayment) {
  const r = annualRatePct / 100 / 12;
  if (r === 0) return monthlyPayment > 0 ? balance / monthlyPayment : Infinity;
  if (monthlyPayment <= balance * r) return Infinity;
  return -Math.log(1 - (r * balance) / monthlyPayment) / Math.log(1 + r);
}

export function formatMoney(value, currency = 'USD') {
  const symbol = currency === 'ILS' ? '₪' : '$';
  if (!isFinite(value)) return `${symbol}0`;
  const rounded = Math.round(value);
  return `${rounded < 0 ? '-' : ''}${symbol}${Math.abs(rounded).toLocaleString()}`;
}
