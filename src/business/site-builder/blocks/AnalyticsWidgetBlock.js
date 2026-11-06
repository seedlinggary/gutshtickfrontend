import React, { useEffect, useState } from 'react';
import { TrendingUp, Eye, MessageCircle, Navigation, Tag, Share2 } from 'lucide-react';
import apiRequest from '../../../ApiRequest';

const STAT_META = [
  { key: 'business_view', label: 'Views', Icon: Eye },
  { key: 'business_whatsapp_click', label: 'WhatsApp taps', Icon: MessageCircle },
  { key: 'business_directions_click', label: 'Directions', Icon: Navigation },
  { key: 'business_deal_view', label: 'Deal views', Icon: Tag },
  { key: 'business_deal_redeem', label: 'Deals redeemed', Icon: Tag },
  { key: 'business_share', label: 'Shares', Icon: Share2 },
];

/**
 * Owner-only by construction, not by anything special in this component:
 * GET /business/businesses/:id/analytics is already owner-gated
 * server-side (see business_analytics.py), so a random visitor's browser
 * (no owner token) just gets a 403 here and sees the fallback message
 * below -- the same real security boundary the rest of the app already
 * relies on, not a new one invented for this block.
 */
export default function AnalyticsWidgetBlock({ businessId, editable }) {
  const [data, setData] = useState(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    apiRequest('GET', null, `/business/businesses/${businessId}/analytics`)
      .then(setData)
      .catch(() => setDenied(true));
  }, [businessId]);

  if (!businessId) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>
        Analytics widget
      </div>
    );
  }
  if (denied) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: 8 }}>
        {editable ? 'Loading…' : 'Analytics are only visible to the business owner.'}
      </div>
    );
  }
  if (!data) return <div className="gs-loading" style={{ height: '100%' }}><div className="gs-spinner" /></div>;

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--muted)' }}>
        <TrendingUp size={14} /> Last 30 days
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10 }}>
        {STAT_META.map(({ key, label, Icon }) => (
          <div key={key} style={{ border: '1px solid var(--border, #e5e1d6)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
            <Icon size={16} style={{ opacity: 0.6 }} />
            <div style={{ fontSize: 20, fontWeight: 700 }}>{data['30d']?.[key] ?? 0}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
