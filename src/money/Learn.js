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
          <p>Use the <Link to="/investing">Investing page</Link> to look up real quotes and charts for specific tickers, and the <Link to="/">Retirement calculator</Link> to project what consistent contributions could grow into.</p>
          <Sources items={[
            { label: 'IRS reveals new 401(k), IRA contribution limits for 2026 (InvestmentNews)', url: 'https://www.investmentnews.com/retirement-planning/irs-reveals-new-401k-ira-contribution-limits-for-2026/263029' },
            { label: '401(k) and IRAs: 2026 Contribution Limits (Vision Retirement)', url: 'https://www.visionretirement.com/401k-and-ira-contribution-limits' },
          ]} />
        </div>

        <div className="fin-guide-section">
          <span className="fin-guide-kicker">Retiring early</span>
          <h2>FIRE, Coast FIRE, and the 4% rule</h2>
          <h3>The 4% rule</h3>
          <p>
            The <strong>4% rule</strong> is a rule of thumb for how much you can safely withdraw from a retirement
            portfolio each year without running out of money. It traces back to financial planner William Bengen's
            1994 research, then the 1998 "Trinity Study" (three professors analyzing US stock/bond returns from 1926
            to 1995): a 4% first-year withdrawal, increased for inflation every year after, survived 95% of every
            rolling 30-year historical period they tested with a 50/50 stock-bond portfolio. Flip it around and it
            tells you your <strong>"FIRE number"</strong> -- the portfolio size you'd need -- by dividing your annual
            spending by 4% (equivalently, multiplying it by 25). It's a historical rule of thumb based on US market
            data, not a guarantee: it doesn't account for taxes or fees, and some planners now suggest 3-3.5% for
            extra safety, especially for a retirement likely to run longer than 30 years.
          </p>
          <h3>FIRE and Coast FIRE</h3>
          <p>
            <strong>FIRE</strong> ("Financial Independence, Retire Early") is the broader movement of saving
            aggressively toward that FIRE number well before traditional retirement age. <strong>Coast FIRE</strong>{' '}
            is the specific milestone where you've saved <em>enough</em> that, even if you stopped contributing to
            retirement entirely today, compound growth alone would carry that balance to your full FIRE number by a
            normal retirement age -- from that point on you only need to earn enough to cover current living costs
            ("coast"), not to keep saving for retirement too. It doesn't mean stopping work altogether, just that
            further retirement saving becomes optional rather than necessary.
          </p>
          <p>
            Use the <Link to="/">FIRE Number calculator</Link> to find your own number from the 4% rule,
            and the <Link to="/">Coast FIRE calculator</Link> to see whether you've already reached it or
            how much more you'd need as a lump sum today.
          </p>
          <Sources items={[
            { label: '4% rule (Wikipedia)', url: 'https://en.wikipedia.org/wiki/4%25_rule' },
            { label: 'Trinity study (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Trinity_study' },
            { label: 'What is Coast FIRE? (ChooseFI)', url: 'https://choosefi.com/coast-fire' },
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
          <div className="fin-guide-note">Run your own numbers on the <Link to="/">Debt Payoff calculator</Link> to see exactly how much a given payment amount costs you in interest and how long it takes.</div>
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

        <div className="fin-masthead" style={{ marginTop: 36 }}>
          <div className="fin-masthead-kicker"><BookOpen size={13} /> Israel</div>
          <h1 className="fin-masthead-title">Money in Israel, A to Z</h1>
          <p className="fin-masthead-sub">How Israeli income tax, National Insurance, pensions and investing actually work -- written for anyone who's never had to deal with mas hachnasa, Bituach Leumi or a keren pensia before.</p>
        </div>

        <div className="fin-guide-section">
          <span className="fin-guide-kicker">Income tax (Mas Hachnasa)</span>
          <h2>How your paycheck gets taxed</h2>
          <p>Israel uses a <strong>marginal bracket system</strong> just like the US does: each bracket's rate only applies to the slice of income inside it, not your whole salary. For 2026-2027 (frozen, not adjusted for inflation during this period), the annual brackets are 10% up to ₪84,120, 14% up to ₪120,720, 20% up to ₪228,000, 31% up to ₪301,200, 35% up to ₪560,280, then 47% above that -- plus a 3% surtax ("mas yisuf") on income over ₪721,560/year, pushing the effective top rate to 50% for very high earners.</p>
          <h3>Tax credit points (nekudot zikui)</h3>
          <p>Before you pay a shekel of calculated tax, it gets reduced by your <strong>credit points</strong> -- each one worth ₪242/month (₪2,904/year) in 2026. Every resident starts with a base amount (2.25 points for men, 2.75 for women), with extra points for children, single parents, new immigrants (for their first 54 months on a declining schedule), discharged soldiers, and more. Unlike a US tax deduction, points reduce the tax bill itself, not your taxable income -- and if your calculated tax is lower than your points are worth, it just drops to zero rather than paying you the difference (with a few specific exceptions).</p>
          <div className="fin-guide-note">Run your own numbers -- gross salary in, net pay out, with the full breakdown -- on the <strong>Israel Net Salary</strong> calculator on the <Link to="/">Calculators page</Link>.</div>
          <Sources items={[
            { label: 'Taxes in Israel 2026: brackets, credit points, refunds (Din-AI)', url: 'https://din-ai.co.il/legal-guide/en/taxes' },
            { label: 'Net Salary Calculator Israel 2026 (Expatriation.io)', url: 'https://app.expatriation.io/net-salary/israel' },
            { label: 'Nekudot Zikui for Olim: NIS 242 a Point (Meidahon)', url: 'https://meidahon.co.il/olim/taxes/israeli-taxes/nekudot-zikui-basics' },
          ]} />
        </div>

        <div className="fin-guide-section">
          <span className="fin-guide-kicker">Bituach Leumi &amp; Bituach Briut</span>
          <h2>National Insurance and the health tax</h2>
          <p>Separate from income tax, every paycheck also has <strong>Bituach Leumi</strong> (National Insurance, which funds things like maternity leave, unemployment, disability and old-age pensions) and <strong>Bituach Briut</strong> (the health tax, which funds Israel's public healthcare system). Both are calculated on the same two-tier structure based on 60% of the national average wage (₪7,703/month in 2026): a low combined rate of about 4.27% up to that threshold, and a much higher 12.16% on the portion above it, up to a monthly ceiling of ₪51,910 (nothing is owed on pay above the ceiling). Your employer pays its own separate, larger share on top -- that part never touches your paycheck.</p>
          <Sources items={[
            { label: 'Israel Payroll 2026: Bituach Leumi, Tax & Form 102 (WhichPayroll)', url: 'https://whichpayroll.com/countries/israel/global-payroll' },
            { label: 'Israel Bituach Leumi Calculator 2026 (Teamz Lab)', url: 'https://tool.teamzlab.com/il/bituach-leumi-2026-calculator/' },
          ]} />
        </div>

        <div className="fin-guide-section">
          <span className="fin-guide-kicker">New immigrants</span>
          <h2>Tax benefits for olim and returning residents</h2>
          <p>A new immigrant (oleh) or long-term returning resident gets a <strong>10-year exemption on foreign-source income and capital gains</strong> -- money earned or invested outside Israel generally isn't taxed by Israel during that window (it may still be taxed by the country it came from). On top of that, olim get extra tax credit points for their first 54 months. Rules around reporting foreign assets have been tightening for residencies starting in 2026, so this exemption no longer means "nothing to report" -- it just means "not taxed," and the income/assets still need to be disclosed. None of this applies to Israeli-source income, which is taxed the same as for any other resident.</p>
          <Sources items={[
            { label: 'Olim Tax Exemption Israel 2026 (CWS Israel)', url: 'https://www.cwsisrael.com/olim-tax-exemption-israel-2026/' },
            { label: 'Your Taxes: The budget\'s tax breaks (Jerusalem Post)', url: 'https://www.jpost.com/business-and-innovation/banking-and-finance/article-892524' },
          ]} />
        </div>

        <div className="fin-guide-section">
          <span className="fin-guide-kicker">Long-term savings</span>
          <h2>Pension, Kupat Gemel, and Keren Hishtalmut</h2>
          <p>Israel has three main tax-advantaged savings vehicles, usually all deducted straight from your payslip:</p>
          <ul>
            <li><strong>Keren Pensia (pension fund)</strong> -- mandatory for employees. A common split is around 6% from you and 6.5-8.5% more from your employer (split between retirement savings and severance), all going into a pension fund that pays out as a monthly income in retirement, with life/disability insurance built in.</li>
            <li><strong>Kupat Gemel (provident fund)</strong> -- a more flexible investment fund, these days mostly used by the self-employed or for additional voluntary savings, since employer-sponsored plans mostly default to pension funds now.</li>
            <li><strong>Keren Hishtalmut (study fund)</strong> -- despite the name, this isn't just for education. Usually a 2.5% employee / 7.5% employer split, it's tax-free on the way in (up to a salary ceiling, ₪15,712/month in 2026) and the entire balance -- contributions plus all investment growth -- comes out completely tax-free after a <strong>6-year lock-in</strong>. It's one of the best tax-advantaged accounts available to Israeli employees precisely because of that full tax-free growth.</li>
          </ul>
          <p>Self-employed people don't get an employer match on any of these, but can still deduct pension contributions (recognized up to roughly 16.5% of qualifying income, split between a deductible expense and a tax credit) and keren hishtalmut contributions (up to about 4.5% of income) against their own tax bill.</p>
          <div className="fin-guide-note">Turn on "Include pension + study fund contributions" in the <strong>Israel Net Salary</strong> calculator to see exactly how much these take out of your paycheck versus how much they save you in tax.</div>
          <Sources items={[
            { label: 'Study Fund (Keren Hishtalmut): Complete Guide 2026 (Yesh Cash)', url: 'https://yesh-cash.com/en/pension/study-fund' },
            { label: 'The ultimate guide to Keren Hishtalmut (Blue & White Finance)', url: 'https://bluewhitefinance.com/the-ultimate-guide-to-keren-hishtalmut/' },
            { label: 'Freelancer Pension Rights in Israel: The 2026 Guide (CWS Israel)', url: 'https://www.cwsisrael.com/freelancer-pension-rights-israel-2026/' },
          ]} />
        </div>

        <div className="fin-guide-section">
          <span className="fin-guide-kicker">Investing in Israel</span>
          <h2>Where Israeli investing actually happens</h2>
          <p>The <strong>Tel Aviv Stock Exchange (TASE)</strong> is Israel's main stock market -- its flagship index is the TA-125. Most everyday investors don't pick individual TASE stocks though; they buy into <strong>kranot</strong> (mutual funds) or <strong>ETFs</strong> ("katrot sal" / tracker funds), which pool money across many companies or bonds the same way a US index fund does, including funds that track US indexes like the S&amp;P 500 for Israelis who want international exposure.</p>
          <h3>How to actually open an account</h3>
          <p>Three common routes: (1) your <strong>bank's own brokerage arm</strong> -- easiest to set up since you likely already bank there, but usually the highest fees; (2) a dedicated <strong>Israeli brokerage</strong> (e.g. Meitav, IBI, Psagot) -- typically lower fees than a bank, built specifically for trading and funds; (3) an <strong>international broker</strong> that accepts Israeli residents -- can offer the lowest fees and widest access to US/global markets, but adds currency conversion and foreign-reporting considerations. Whichever route, compare the per-trade commission, account-keeping fees, and currency-conversion spread -- these vary a lot between providers and compound over decades of investing.</p>
          <div className="fin-guide-note">Look up real TASE and US tickers, compare them against Israeli economic indicators, and track a watchlist on the <Link to="/investing">Investing page</Link>.</div>
          <Sources items={[
            { label: 'Taxation in Israel (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Taxation_in_Israel' },
            { label: 'Global Expansion Guide: Tax in Israel (DLA Piper)', url: 'https://intelligence.dlapiper.com/global-expansion-tax/?c=IL' },
          ]} />
        </div>

        <div className="fin-guide-section">
          <span className="fin-guide-kicker">Investment taxes</span>
          <h2>What you owe when you sell</h2>
          <p>Capital gains on securities (stocks, ETFs, mutual funds) are taxed at a flat <strong>25%</strong> for individuals, or <strong>30%</strong> if you held 10% or more of the company ("substantial shareholder"). Dividends are generally taxed the same way. There's one major exception: a <strong>foreign (non-Israeli) tax resident</strong> selling securities listed on the TASE is usually exempt from Israeli capital gains tax entirely -- except on REITs and short-term government bonds -- though a withholding-exemption certificate from the Tax Authority is needed beforehand to avoid tax being withheld automatically at the sale. Real estate uses a completely different set of taxes, covered next.</p>
          <div className="fin-guide-note">Estimate the tax on a specific sale with the <strong>Israel Investment Tax</strong> calculator on the <Link to="/">Calculators page</Link>.</div>
          <Sources items={[
            { label: 'Doing Business in Israel (Harris Consulting & Tax)', url: 'https://hcat.co/doing-business-in-israel/' },
          ]} />
        </div>

        <div className="fin-guide-section">
          <span className="fin-guide-kicker">Real estate</span>
          <h2>Selling (and buying) property in Israel</h2>
          <h3>Selling: mas shevach (the gain tax)</h3>
          <p>When you sell real estate, the <strong>gain</strong> (sale price minus purchase price, roughly -- a real calculation also adjusts for inflation and deducts documented improvement costs) is taxed as <strong>mas shevach</strong>, not regular capital gains tax. Most people selling their own home never pay it at all, thanks to the <strong>sole qualifying-residence exemption</strong>: if the property is your only home in Israel, you've owned it 18+ months, and you haven't used this exemption on a different sale in the prior 18 months, the gain is fully exempt up to a sale price of <strong>₪5,008,000</strong> (2026). Sell above that ceiling and the exemption still applies, just proportionally -- the share of the gain attributable to the value under the ceiling stays exempt, and only the rest is taxed at up to 25%. An investment property, a second home, or a sale that doesn't meet those conditions is taxed on the full real gain instead (at up to 25%, with a more favorable linear calculation for any part of the gain that built up before 2014).</p>
          <h3>Buying: mas rechisha (purchase tax)</h3>
          <p>Buyers pay a separate bracketed <strong>purchase tax</strong>, and which bracket table applies depends entirely on whether this is your only home. A <strong>sole/only-home</strong> purchase gets a 0% band on roughly the first ₪1.98M, then climbing rates (3.5%, 5%, 8%, 10%) on the value above that. An <strong>additional or investment property</strong> -- including a non-resident's only Israeli home -- skips the 0% band entirely and starts at a flat <strong>8%</strong> from the first shekel, rising to 10% above roughly ₪6.06M. This is exactly why timing matters if you're selling one home to buy another: buying the new place before closing the sale on the old one can mean paying the much higher "additional dwelling" rate, even though you'll only own two homes for a short overlap.</p>
          <div className="fin-guide-note">Run a specific sale or purchase through the <strong>Israel Property Tax</strong> calculator on the <Link to="/">Calculators page</Link> -- it covers both mas shevach and mas rechisha, with the sole-residence exemption and the additional-dwelling rate built in.</div>
          <Sources items={[
            { label: 'Mas Shevach Israel 2026 - Capital Gains Tax Guide (New Homes Israel)', url: 'https://newhomesisrael.com/en/blog/mas-shevach-capital-gains' },
            { label: 'מס רכישה 2026: מדרגות דירה יחידה מול דירה נוספת (Bizportal)', url: 'https://www.bizportal.co.il/realestates/news/article/20038028' },
            { label: 'Israel Purchase Tax & Real Estate Taxes 2026 (Global Law Experts)', url: 'https://globallawexperts.com/purchase-tax-israel/' },
          ]} />
        </div>

        <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 24 }}>
          This page is a general overview, not financial, tax or investment advice. It was written from the sources
          linked in each section, but rules, limits and typical guidance all change over time and those sources may
          have updated since -- always confirm current details with a licensed financial advisor, accountant (ro'eh
          cheshbon), the Israel Tax Authority, Bituach Leumi, or the IRS directly before making a decision.
        </p>
      </div>
    </div>
  );
}
