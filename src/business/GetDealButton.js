import React, { useEffect, useState } from 'react';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';
import { trackBusinessEvent } from './analytics';
import { useLanguage } from './i18n';

/** Shared by DealsFeed.js and BusinessProfile.js's Deals tab. `referralCode`
 * (captured from a ?ref= link, see ReferralWidget.js) is passed through so
 * the backend can credit whoever referred this customer. */
export default function GetDealButton({ post, referralCode }) {
  const { t } = useLanguage();
  const [redemption, setRedemption] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { trackBusinessEvent(post.business_id || post.business?.id, 'business_deal_view'); }, [post.business_id, post.business?.id]);

  if (!isLoggedIn()) return null;

  const getDeal = () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    apiRequest('POST', { referral_code: referralCode || undefined }, `/business/deals/${post.id}/get`)
      .then((res) => { setRedemption(res); trackBusinessEvent(post.business_id || post.business?.id, 'business_deal_redeem'); })
      .catch((err) => setError(typeof err === 'string' ? err : "Couldn't get this deal -- try again."))
      .finally(() => setBusy(false));
  };

  if (redemption) {
    return <span className="biz-deal-code-badge">Code: {redemption.code} -- saved to your Deal Wallet</span>;
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <button type="button" className="biz-get-deal-btn" onClick={getDeal} disabled={busy}>
        {busy ? '…' : t('getThisDeal')}
      </button>
      {error && <span style={{ fontSize: 11, color: 'var(--error, #c0392b)' }}>{error}</span>}
    </span>
  );
}
