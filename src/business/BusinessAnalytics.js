import React, { useEffect, useState } from 'react';
import apiRequest from '../ApiRequest';

const EVENT_LABELS = {
  business_view: 'Profile views',
  business_whatsapp_click: 'WhatsApp taps',
  business_directions_click: 'Directions taps',
  business_deal_view: 'Deal views',
  business_deal_redeem: 'Deals redeemed',
  business_share: 'Shares',
};

function Sparkline({ points }) {
  if (!points.length) return null;
  const max = Math.max(1, ...points.map((p) => p.count));
  const w = 280, h = 48, step = points.length > 1 ? w / (points.length - 1) : 0;
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${h - (p.count / max) * h}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="biz-analytics-sparkline" preserveAspectRatio="none">
      <path d={path} fill="none" stroke="var(--biz-accent, #b17d34)" strokeWidth="2" />
    </svg>
  );
}

export default function BusinessAnalytics({ businessId }) {
  const [data, setData] = useState(null);
  const [window_, setWindow] = useState('30d');
  const [error, setError] = useState(null);

  useEffect(() => {
    apiRequest('GET', null, `/business/businesses/${businessId}/analytics`).then(setData).catch(setError);
  }, [businessId]);

  if (error) return <p className="biz-error">Could not load analytics.</p>;
  if (!data) return <p>Loading...</p>;

  const counts = data[window_];

  return (
    <div className="biz-analytics">
      <div className="biz-analytics-window-picker">
        {['7d', '30d', '90d'].map((w) => (
          <button key={w} type="button" className={w === window_ ? 'active' : ''} onClick={() => setWindow(w)}>
            {w === '7d' ? '7 days' : w === '30d' ? '30 days' : '90 days'}
          </button>
        ))}
      </div>
      <div className="biz-analytics-tiles">
        {Object.entries(EVENT_LABELS).map(([key, label]) => (
          <div key={key} className="biz-analytics-tile">
            <div className="biz-analytics-tile-value">{counts[key] || 0}</div>
            <div className="biz-analytics-tile-label">{label}</div>
          </div>
        ))}
      </div>
      {data.daily_views && data.daily_views.length > 1 && (
        <div className="biz-analytics-chart">
          <h4>Profile views, last 30 days</h4>
          <Sparkline points={data.daily_views} />
        </div>
      )}
    </div>
  );
}
