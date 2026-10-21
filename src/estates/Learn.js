import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Users } from 'lucide-react';

/** A plain numbered source list for one guide section -- `items` is
 * [{label, url}]. Kept as one small component so every section cites the
 * same way instead of hand-rolling a list each time. These are the actual
 * pages used while writing the section's claims (researched directly, not
 * recalled from memory), but websites change -- the Learn page's own
 * closing disclaimer still applies: verify anything you're relying on. */
function Sources({ items }) {
  return (
    <div className="est-sources">
      <h4>Sources</h4>
      <ol>
        {items.map((s) => (
          <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></li>
        ))}
      </ol>
    </div>
  );
}

const US_CONTENT = (
  <>
    <div className="est-guide-section">
      <span className="est-guide-kicker">United States · Buying</span>
      <h2>How buying a home works</h2>
      <h3>1. Get pre-approved for a mortgage</h3>
      <p>A lender checks your income, debt and credit score and tells you how much you can borrow -- do this before you start touring homes. A pre-approval letter is usually required just to get a seller to take your offer seriously.</p>
      <h3>2. Find a home and make an offer</h3>
      <p>Buyers typically work with a buyer's agent. Until August 2024, sellers routinely paid both agents' commissions through the MLS listing; a National Association of Realtors antitrust settlement ended that requirement, and buyer-agent compensation is now negotiated directly between buyer and agent in a written agreement, signed before touring homes. In practice, average buyer-agent commissions have stayed close to where they were -- around 2.37% nationally as of late 2025, trending slightly lower on expensive homes and slightly higher on cheaper ones. Your offer itself includes the price, financing terms, and contingencies (inspection, appraisal, financing).</p>
      <h3>3. Inspection and appraisal</h3>
      <p>A home inspector checks the property's condition -- you can usually renegotiate or walk away if serious issues turn up. Separately, the lender orders an appraisal to confirm the home is worth what you're paying (they won't lend more than the appraised value).</p>
      <h3>4. Closing</h3>
      <p>Closing costs (lender fees, title search and insurance, taxes, escrow) typically run 2-5% of the purchase price on a conventional loan, on top of your down payment -- FHA loans run a bit higher (closer to 2-6%) and are capped at 6% by rule. At closing you sign the final loan documents and get the keys.</p>
      <div className="est-guide-note">Typical minimum down payment: 3.5% for FHA loans (3% on some conventional first-time-buyer programs), with 20% needed to avoid private mortgage insurance (PMI) on a conventional loan -- PMI protects the lender, not you, and can usually be cancelled once you've paid the loan down to 80% of the home's value.</div>
      <Sources items={[
        { label: 'What the $418M NAR Settlement Means for Buyers, Sellers, and Real Estate Agents (The Mortgage Reports)', url: 'https://themortgagereports.com/111812/nar-realtor-commissions-settlement' },
        { label: 'Average broker compensation remains nearly unchanged since NAR settlement (Scotsman Guide)', url: 'https://www.scotsmanguide.com/news/average-broker-compensation-remains-nearly-unchanged-since-nar-settlement' },
        { label: 'What are closing costs and how much are they? (Wells Fargo)', url: 'https://www.wellsfargo.com/mortgage/learning/closing-costs/' },
        { label: 'FHA loan down payment requirements (Rocket Mortgage)', url: 'https://rocketmortgage.com/learn/fha-loan-down-payment-requirements' },
        { label: 'Private Mortgage Insurance FAQs (Maryland Insurance Administration)', url: 'https://insurance.maryland.gov/Consumer/Pages/Private-Mortgage-Insurance.aspx' },
      ]} />
    </div>

    <div className="est-guide-section">
      <span className="est-guide-kicker">United States · Renting</span>
      <h2>How renting works</h2>
      <h3>Applying</h3>
      <p>Expect an application fee, a credit/background check, and proof of income -- landlords commonly screen for gross monthly income at 2.5-3x the rent (some competitive markets ask for even more). This is a landlord screening norm, not a law, so a guarantor/co-signer, strong credit, or extra savings can sometimes substitute if your income alone doesn't clear the bar.</p>
      <h3>Security deposit &amp; lease terms</h3>
      <p>There's no federal security deposit law -- limits, interest requirements and return deadlines are set state by state (and sometimes by city), and vary widely: some states cap deposits at one month's rent, others allow two or more, and a few set no cap at all. Standard leases run 12 months; month-to-month is common for short stays but usually costs more.</p>
      <h3>Know your rights</h3>
      <p>Habitability requirements (working heat, water, no serious safety hazards), notice periods before a landlord can enter, and eviction procedures are all governed by state and sometimes city law -- they vary a lot, so check your specific state's tenant rights before signing.</p>
      <Sources items={[
        { label: 'What Does 2.5x Rent Mean When Renting an Apartment? (Bay Management Group)', url: 'https://baymgmtgroup.com/blog/what-does-2-5x-rent-mean-when-renting-an-apartment/' },
        { label: 'State Security Deposit Laws: A Comprehensive Overview (Tellus)', url: 'https://resources.tellusapp.com/tenants/security-deposits/state-security-deposit-laws-overview' },
        { label: 'Chart: Landlord-Tenant Statutes by State (FindLaw)', url: 'https://www.findlaw.com/realestate/landlord-tenant-law/chart-landlord-tenant-statutes-state-by-state.html' },
      ]} />
    </div>
  </>
);

const IL_CONTENT = (
  <>
    <div className="est-guide-section">
      <span className="est-guide-kicker">Israel · Buying</span>
      <h2>How buying a home works</h2>
      <h3>1. A lawyer is essentially mandatory</h3>
      <p>A real estate lawyer (typically paid by the buyer, commonly cited around 0.5-1.5% of the price) investigates the property's registration -- ideally at the Tabu (Land Registry), the strongest form of registration, though some properties sit under other, less secure registration systems -- checks for liens, and drafts and negotiates the purchase contract. Buyer and seller each use their own lawyer; the seller's lawyer represents the seller's interests, not yours.</p>
      <h3>2. Mas Rechisha (purchase tax)</h3>
      <p>Purchase tax is tiered like income tax -- only the slice of the price inside each bracket is taxed at that bracket's rate -- and the brackets depend on whether this is your only home in Israel. A single home gets a 0% bracket up to a threshold the Tax Authority re-indexes for inflation every January, then rising rates above it; an additional/investment home is taxed from the first shekel at a flat-ish higher rate. The <Link to="/calculators">Israel Purchase Tax calculator</Link> runs the actual tiered math for you -- but always check the current thresholds at misim.gov.il before budgeting, since they change.</p>
      <h3>3. Mashkanta (mortgage)</h3>
      <p>Israeli mortgages are usually split across several tracks (fixed-rate, Prime-linked, and CPI-linked) rather than one flat rate -- a mortgage advisor (yoetz mashkantaot) is standard practice, often at no direct cost since they're paid by the bank. Maximum loan-to-value has historically been capped by Bank of Israel regulation (70% generally, 75% for a first home, 50% for an investment property) -- confirm the current cap, since banking regulation like this gets revisited.</p>
      <h3>4. Buying "al haneyar" (on paper / pre-construction)</h3>
      <p>Very common in Israel: buying directly from a developer before the building is finished, at a meaningfully lower price than a finished unit. Buyer protection comes from the Sale Law (Apartments) -- a developer can only collect a limited share of the price before providing security, almost always a bank guarantee covering every payment you make until delivery. This is exactly the market Gut Estates' <Link to="/group-buy">Group Buy</Link> feature is built around: a large enough group of buyers on the same project can negotiate a further bulk discount beyond the normal pre-construction pricing.</p>
      <div className="est-guide-note">Government programs like Mechir Lamishtaken ("price for a resident") periodically offer below-market pre-construction units via lottery to applicants who meet eligibility rules (generally, not having owned a home in the last several years) -- worth checking if you qualify before buying at full market price.</div>
      <Sources items={[
        { label: 'When Do I Really Own My Home? (Nefesh B\'Nefesh)', url: 'https://www.nbn.org.il/life-in-israel/community-and-housing/buying-and-renting/when-do-i-really-own-my-home/' },
        { label: 'מדרגות מס רכישה - המדריך השלם (Nadlan Center)', url: 'https://www.nadlancenter.co.il/article/3036' },
        { label: 'עדכון מדרגות מס רכישה (Bizportal)', url: 'https://www.bizportal.co.il/realestates/news/article/20038028' },
        { label: 'Draft directive limiting loan-to-value ratio in housing loans (Bank of Israel)', url: 'https://boi.org.il/en/communication-and-publications/press-releases/the-supervisor-of-banks-publishes-a-draft-directive-to-limit-the-loan-to-value-ratio-in-housing-loans/' },
        { label: 'Buying an Apartment on Paper: Protect Your Money (Nefesh B\'Nefesh)', url: 'https://www.nbn.org.il/life-in-israel/community-and-housing/buying-and-renting/buying-an-apartment-on-paper-protect-your-money/' },
        { label: 'הוצאת אישור זכאות לתוכנית מחיר למשתכן (Kol Zchut)', url: encodeURI('https://www.kolzchut.org.il/he/הוצאת_אישור_זכאות_לתוכנית_דירה_בהנחה_(מחיר_למשתכן)') },
      ]} />
    </div>

    <div className="est-guide-section">
      <span className="est-guide-kicker">Israel · Renting</span>
      <h2>How renting works</h2>
      <h3>Standard lease (Chozeh Sechirut)</h3>
      <p>One-year leases are standard, often with an option to extend for a second year at a pre-agreed increase. Rent is typically paid via post-dated checks (a set of 12, handed over at signing) or standing bank transfer.</p>
      <h3>Guarantors (Arevim)</h3>
      <p>Landlords commonly require one or two guarantors who sign on to cover unpaid rent -- this is far more common than in the US and can be a real hurdle for new immigrants (olim) without local guarantors. A bank guarantee (freezing funds in your own account, releasable only by court order) is a common alternative some landlords will accept instead.</p>
      <h3>Broker fee (Dmei Tivuch)</h3>
      <p>Where a broker is involved, the usual fee is around one month's rent plus VAT. Who actually owes it is less clear-cut than it might seem: guidance citing the Fair Rental Law (Section 25ט) suggests a tenant generally isn't required to pay a broker who was engaged only by the landlord -- a tenant owes a fee only to a broker they themselves hired to search for them. Confirm this with your lawyer or the broker's written agreement before assuming you owe it.</p>
      <Sources items={[
        { label: 'Israeli Rental Glossary (Realta)', url: 'https://realta.co.il/en/glossary/' },
        { label: 'Guarantees when renting in Israel (Realta)', url: 'https://realta.co.il/en/guides/guarantees' },
        { label: 'Renting an Apartment in Israel (Nefesh B\'Nefesh)', url: 'https://www.nbn.org.il/life-in-israel/community-and-housing/buying-and-renting/renting-in-israel/' },
      ]} />
    </div>
  </>
);

export default function Learn() {
  const [market, setMarket] = useState('us');

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 820 }}>
        <div className="est-masthead">
          <div className="est-masthead-kicker"><BookOpen size={13} /> Learn</div>
          <h1 className="est-masthead-title">How buying and renting actually works</h1>
          <p className="est-masthead-sub">A plain-language overview of the US and Israeli real estate markets -- enough to know what to expect and what to ask a professional about next. Every section lists the sources used to write it.</p>
        </div>

        <div className="est-guide-tabs">
          <button type="button" className={`est-chip${market === 'us' ? ' active' : ''}`} onClick={() => setMarket('us')}>United States</button>
          <button type="button" className={`est-chip${market === 'il' ? ' active' : ''}`} onClick={() => setMarket('il')}>Israel</button>
        </div>

        {market === 'us' ? US_CONTENT : IL_CONTENT}

        <div className="est-guide-section">
          <span className="est-guide-kicker">Run the numbers</span>
          <h2>See what this actually costs you</h2>
          <p>Once you have a price range in mind, the <Link to="/calculators">Calculators</Link> page turns this into real numbers -- monthly mortgage payment, how much you can likely afford, cash needed at closing, a rent-vs-buy comparison, and (for Israel) a purchase tax estimate.</p>
        </div>

        <div className="est-guide-section">
          <span className="est-guide-kicker"><Users size={12} style={{ verticalAlign: -1 }} /> Buying with a group</span>
          <h2>Thinking about buying pre-construction with others?</h2>
          <p>If you're interested in a specific pre-construction project and think you could round up enough other buyers to negotiate a group discount, browse or start a listing on the <Link to="/group-buy">Group Buy</Link> page -- it's built exactly for this.</p>
        </div>

        <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 24 }}>
          This page is a general overview, not legal, tax or financial advice. It was written from the sources linked
          in each section, but rules, thresholds and typical practice all change over time and those sources may have
          updated since -- always confirm current details with a licensed attorney, accountant or mortgage advisor in
          the relevant jurisdiction before making a decision.
        </p>
      </div>
    </div>
  );
}
