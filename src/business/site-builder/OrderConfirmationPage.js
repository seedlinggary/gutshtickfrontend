import React from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import SiteFooter from './SiteFooter';
import './theme.css';

/** Landed on after a successful Stripe Checkout redirect (see
 * success_url in backend's submit_checkout). Deliberately doesn't fetch
 * live order details -- there's no public "get order by id" lookup built
 * yet (it would need the order's own guest_manage_token to prove the
 * visitor is allowed to see it, not just a guessable numeric id), and the
 * actual payment truth already lives server-side via the Stripe webhook,
 * not this page. Just a friendly landing; a real receipt/invoice is
 * Phase 6's job. */
export default function OrderConfirmationPage({ subdomain }) {
  const { orderId } = useParams();
  return (
    <div className="sb-theme">
      <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, textAlign: 'center', padding: 24 }}>
        <CheckCircle2 size={40} style={{ color: 'var(--sb-primary, #C8553D)' }} />
        <h1 style={{ margin: 0 }}>Thank you for your order</h1>
        <p style={{ color: 'var(--sb-muted, #6b5f53)' }}>Order #{orderId} is confirmed -- you'll receive a confirmation shortly.</p>
      </div>
      <SiteFooter subdomain={subdomain} />
    </div>
  );
}
