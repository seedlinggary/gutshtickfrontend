import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Ticket, Star } from 'lucide-react';
import apiRequest from '../ApiRequest';

/** Customer-facing digital punch card -- shown on a business's profile when
 * that business has opted into a loyalty program. The QR encodes the card's
 * own stable customer_code; an owner scans/types it back in to add a stamp
 * (see BusinessOwnerTools.js's LoyaltyTab). */
export default function LoyaltyCard({ businessId }) {
  const [card, setCard] = useState(null);
  const [error, setError] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    apiRequest('GET', null, `/business/businesses/${businessId}/loyalty/my-card`)
      .then(setCard)
      .catch(() => setError(true));
  }, [businessId]);

  useEffect(() => {
    if (card?.customer_code && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, card.customer_code, { width: 120, margin: 1 }).catch(() => {});
    }
  }, [card]);

  if (error || !card) return null;

  const dots = Array.from({ length: card.threshold }, (_, i) => i < card.stamps);

  return (
    <div className="biz-loyalty-card">
      <h3 className="biz-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Ticket size={19} /> Loyalty Card</h3>
      <p className="biz-loyalty-explainer">Visit, show this code, get a stamp -- collect enough and the reward below is yours.</p>
      <p className="biz-loyalty-reward">{card.reward}</p>
      <div className="biz-loyalty-dots">
        {dots.map((filled, i) => (
          <span key={i} className={`biz-loyalty-dot${filled ? ' filled' : ''}`}>{filled ? <Star size={13} fill="currentColor" color="currentColor" /> : ''}</span>
        ))}
      </div>
      <p className="biz-loyalty-progress">{card.stamps} / {card.threshold} stamps{card.rewards_redeemed > 0 && ` · ${card.rewards_redeemed} reward${card.rewards_redeemed === 1 ? '' : 's'} earned`}</p>
      <canvas ref={canvasRef} className="biz-loyalty-qr" />
      <p className="biz-loyalty-code">{card.customer_code}</p>
      <p className="biz-loyalty-hint">Show this code to the business to get a stamp.</p>
    </div>
  );
}
