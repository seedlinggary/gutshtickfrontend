import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

function Sources({ items }) {
  return (
    <div className="fin-sources">
      <h4>Sources</h4>
      <ol>
        {items.map((s) => (
          <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></li>
        ))}
      </ol>
    </div>
  );
}

export default function Learn() {
  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 820 }}>
        <div className="fin-masthead">
          <div className="fin-masthead-kicker"><BookOpen size={13} /> Learn</div>
          <h1 className="fin-masthead-title">The basics, explained plainly</h1>
          <p className="fin-masthead-sub">Budgeting, investing, debt and credit -- enough to make sense of the decisions ahead of you. Every section lists the sources used to write it.</p>
        </div>

        <div className="fin-guide-section">
          <span className="fin-guide-kicker">Budgeting</span>
          <h2>A simple way to structure a budget</h2>
          <p>A widely-used starting framework is the <strong>50/30/20 rule</strong> (popularized by Elizabeth Warren and Amelia Warren Tyagi): roughly 50% of your after-tax income toward needs (rent/mortgage, utilities, groceries, insurance, minimum debt payments), 30% toward wants (dining out, entertainment, subscriptions), and 20% toward savings and extra debt payoff. It's a starting ratio to adjust, not a strict rule -- high cost-of-living areas often need a bigger "needs" share.</p>
          <p>The <Link to="/budgeting">Budgeting page</Link> lets you build your own category-by-category budget and see the breakdown as a chart, rather than just following the 50/30/20 split blindly.</p>
          <Sources items={[
            { label: 'The 50/30/20 Rule for Budgeting (InCharge Debt Solutions)', url: 'https://www.incharge.org/financial-literacy/budgeting-saving/50-30-20-rule/' },
            { label: 'Investing basics: how to use the 50/30/20 rule for budgeting (Morningstar)', url: 'https://www.morningstar.com.au/personal-finance/investing-basics-how-to-use-the-50-30-20-rule-for-budgeting' },
          ]} />
        </div>

        <div className="fin-guide-section">
          <span className="fin-guide-kicker">Investing</span>
          <h2>Stocks, bonds, index funds and retirement accounts</h2>
          <h3>The basic building blocks</h3>
          <p>A <strong>stock</strong> is a small ownership share in one company -- its value rises and falls with that company's prospects, which makes a single stock risky on its own. A <strong>bond</strong> is a loan you make to a company or government in exchange for regular interest payments, generally steadier but with lower long-term returns than stocks. An <strong>index fund</strong> pools money to buy a whole basket of stocks or bonds at once (e.g. "the S&amp;P 500"), spreading your risk across hundreds of companies instead of betting on one -- this diversification is why index funds are a common default recommendation for long-term investors who don't want to pick individual stocks.</p>
          <h3>Retirement accounts (US)</h3>
          <p>A <strong>401(k)</strong> is an employer-sponsored account, often with an employer match (effectively free money up to a limit -- a common piece of advice is to contribute at least enough to get the full match before anything else). An <strong>IRA</strong> (Individual Retirement Account) is opened on your own, independent of an employer. Both come in traditional (contributions reduce your taxable income now, withdrawals are taxed later) and Roth (contributions are taxed now, withdrawals in retirement are tax-free) versions. For 2026, the IRS set the 401(k) employee contribution limit at $24,500/year ($32,500 if you're 50+), and the IRA limit at $7,500/year ($8,600 if you're 50+) -- these are adjusted most years, so check the current IRS figures before planning around them.</p>
          <p>Use the <Link to="/investing">Investing page</Link> to look up real quotes and charts for specific tickers, and the <Link to="/calculators">Retirement calculator</Link> to project what consistent contributions could grow into.</p>
          <Sources items={[
            { label: 'IRS reveals new 401(k), IRA contribution limits for 2026 (InvestmentNews)', url: 'https://www.investmentnews.com/retirement-planning/irs-reveals-new-401k-ira-contribution-limits-for-2026/263029' },
            { label: '401(k) and IRAs: 2026 Contribution Limits (Vision Retirement)', url: 'https://www.visionretirement.com/401k-and-ira-contribution-limits' },
          ]} />
        </div>

        <div className="fin-guide-section">
          <span className="fin-guide-kicker">Debt</span>
          <h2>Two ways to pay off multiple debts</h2>
          <p>Whichever method you use, you keep paying at least the minimum on every debt and put any extra money toward just one of them at a time.</p>
          <h3>Avalanche: highest interest rate first</h3>
          <p>Mathematically optimal -- the debt costing you the most in interest gets paid off first, which minimizes the total interest you'll pay over time.</p>
          <h3>Snowball: smallest balance first</h3>
          <p>Pays off the smallest balance first regardless of its interest rate, to get a quick win and build momentum -- can cost a bit more in total interest than avalanche, but the early payoffs can make it easier to actually stick with the plan.</p>
          <div className="fin-guide-note">Run your own numbers on the <Link to="/calculators">Debt Payoff calculator</Link> to see exactly how much a given payment amount costs you in interest and how long it takes.</div>
          <Sources items={[
            { label: 'Debt snowball method vs. debt avalanche: What\'s the difference? (Fox Business)', url: 'https://www.foxbusiness.com/fox-money/personal-loans/debt-snowball-method-vs-debt-avalanche' },
            { label: 'Debt snowball vs. avalanche: which payoff method works best (Chase)', url: 'https://www.chase.com/personal/banking/education/basics/debt-snowball-vs-avalanche' },
          ]} />
        </div>

        <div className="fin-guide-section">
          <span className="fin-guide-kicker">Credit</span>
          <h2>What actually makes up your credit score</h2>
          <p>A FICO score (the most widely used credit scoring model) is built from five weighted factors:</p>
          <ul>
            <li><strong>Payment history (35%)</strong> -- the single biggest factor. Late payments, collections and bankruptcies hurt the most.</li>
            <li><strong>Amounts owed (30%)</strong> -- mainly your credit utilization ratio (balance vs. credit limit on revolving accounts like credit cards). A common rule of thumb is to stay under 30% utilization, ideally under 10%.</li>
            <li><strong>Length of credit history (15%)</strong> -- older accounts help; this is part of why closing your oldest credit card can hurt your score.</li>
            <li><strong>New credit (10%)</strong> -- opening several new accounts in a short window can look risky.</li>
            <li><strong>Credit mix (10%)</strong> -- having a mix of account types (credit cards, installment loans) can help slightly.</li>
          </ul>
          <Sources items={[
            { label: '5 factors that affect your credit score (CardRatings)', url: 'https://www.cardratings.com/credit-score/factors-that-affect-your-credit-score.html' },
            { label: 'How Your Credit Score Is Calculated (ConsumerAffairs)', url: 'https://www.consumeraffairs.com/online/how-is-credit-score-calculated.html' },
          ]} />
        </div>

        <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 24 }}>
          This page is a general overview, not financial, tax or investment advice. It was written from the sources
          linked in each section, but rules, limits and typical guidance all change over time and those sources may
          have updated since -- always confirm current details with a licensed financial advisor, accountant, or the
          IRS directly before making a decision.
        </p>
      </div>
    </div>
  );
}
