import React, { useEffect, useState } from 'react';
import { Gift } from 'lucide-react';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';

/** Customer-facing "refer a friend" -- a personal link that, when a new
 * customer gets a deal through it, is recorded against the referrer (see
 * backend's get_deal). The owner grants the reward informally from their
 * Referrals tab; there's no automatic discount applied at checkout. */
export default function ReferralWidget({ businessId, reward }) {
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) return;
    apiRequest('GET', null, `/business/businesses/${businessId}/referral/my-code`).then(setData).catch(() => {});
  }, [businessId]);

  if (!isLoggedIn() || !data) return null;

  const link = `${window.location.origin}/business/${window.location.pathname.split('/').pop()}?ref=${data.code}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      window.prompt('Copy this link:', link);
    }
  };

  return (
    <div className="biz-referral-widget">
      <h3 className="biz-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Gift size={19} /> Refer a Friend</h3>
      <p className="biz-referral-widget-explainer">Share your link -- when a friend uses it to get a deal here, you both get:</p>
      {reward && <p className="biz-referral-widget-reward">{reward}</p>}
      <div className="biz-referral-widget-link-row">
        <input type="text" readOnly value={link} onFocus={(e) => e.target.select()} />
        <button type="button" onClick={copy}>{copied ? 'Copied!' : 'Copy'}</button>
      </div>
      {data.use_count > 0 && <p className="biz-referral-widget-count">{data.use_count} friend{data.use_count === 1 ? '' : 's'} referred so far</p>}
    </div>
  );
}
