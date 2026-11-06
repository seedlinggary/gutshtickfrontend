import React, { useEffect, useMemo, useState } from 'react';
import { Trash2, ShoppingCart, Tag } from 'lucide-react';
import apiRequest from '../../ApiRequest';
import { isLoggedIn } from '../../auth';
import { getCart, setCartQuantity, clearCart } from './cart';
import TurnstileWidget from './TurnstileWidget';
import SiteFooter from './SiteFooter';
import './theme.css';

function formatCents(cents, currency) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: (currency || 'usd').toUpperCase() }).format((cents || 0) / 100);
}

export default function CartPage({ subdomain }) {
  const [products, setProducts] = useState(null);
  const [cart, setCart] = useState(() => getCart(subdomain));
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [error, setError] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState(null); // {code, discount_cents} once applied
  const [promoError, setPromoError] = useState('');
  const [applyingPromo, setApplyingPromo] = useState(false);
  // undefined = not resolved yet (either waiting on the widget to load, or
  // waiting for the visitor to solve it); null = resolved as "no CAPTCHA
  // configured on this deployment, proceed freely" (see TurnstileWidget.js).
  const [captchaToken, setCaptchaToken] = useState(undefined);
  const loggedIn = isLoggedIn();

  useEffect(() => {
    apiRequest('GET', null, `/business-site/public/${encodeURIComponent(subdomain)}/products`)
      .then((d) => setProducts(d.products))
      .catch(() => setProducts([]));
  }, [subdomain]);

  const lines = useMemo(() => {
    if (!products) return [];
    return Object.entries(cart)
      .map(([productId, quantity]) => ({ product: products.find((p) => String(p.id) === String(productId)), quantity }))
      .filter((l) => l.product);
  }, [products, cart]);

  const subtotalCents = lines.reduce((sum, l) => sum + l.product.price_cents * l.quantity, 0);
  const currency = lines[0]?.product.currency;
  const discountCents = promo?.discount_cents || 0;
  const totalCents = Math.max(0, subtotalCents - discountCents);

  const updateQuantity = (productId, quantity) => {
    setCartQuantity(subdomain, productId, quantity);
    setCart(getCart(subdomain));
  };

  const applyPromo = () => {
    if (!promoInput.trim()) return;
    setApplyingPromo(true);
    setPromoError('');
    apiRequest('POST', { code: promoInput.trim(), subtotal_cents: subtotalCents },
      `/business-site/public/${encodeURIComponent(subdomain)}/promo-codes/validate`)
      .then((d) => setPromo({ code: d.code, discount_cents: d.discount_cents }))
      .catch((err) => { setPromo(null); setPromoError(typeof err === 'string' ? err : 'That code is not valid.'); })
      .finally(() => setApplyingPromo(false));
  };

  const removePromo = () => { setPromo(null); setPromoInput(''); setPromoError(''); };

  const checkout = () => {
    setError('');
    if (!loggedIn && !guestEmail.trim()) {
      setError('An email is required to check out.');
      return;
    }
    setCheckingOut(true);
    apiRequest('POST', {
      items: lines.map((l) => ({ product_id: l.product.id, quantity: l.quantity })),
      guest_email: guestEmail.trim() || undefined,
      guest_phone: guestPhone.trim() || undefined,
      captcha_token: captchaToken || undefined,
      promo_code: promo?.code || undefined,
    }, `/business-site/public/${encodeURIComponent(subdomain)}/checkout`)
      .then(({ checkout_url }) => {
        clearCart(subdomain);
        window.location.href = checkout_url;
      })
      .catch((err) => { setError(typeof err === 'string' ? err : 'Could not start checkout.'); setCheckingOut(false); });
  };

  if (!products) return <div className="gs-loading" style={{ minHeight: '40vh' }}><div className="gs-spinner" /></div>;

  return (
    <div className="sb-theme">
      <div style={{ maxWidth: 560, margin: '0 auto', padding: 24 }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><ShoppingCart size={24} /> Your cart</h1>

        {lines.length === 0 && <p className="gs-empty">Your cart is empty.</p>}

        {lines.map((l) => (
          <div key={l.product.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--sb-border, #e5e1d6)' }}>
            {l.product.images?.[0] && <img src={l.product.images[0]} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }} />}
            <div style={{ flex: 1 }}>
              <strong>{l.product.name}</strong>
              <div style={{ fontSize: 13, color: 'var(--sb-muted, #6b5f53)' }}>{formatCents(l.product.price_cents, l.product.currency)} each</div>
            </div>
            <input className="sb-input" type="number" min={1} max={50} value={l.quantity} style={{ width: 64 }}
              onChange={(e) => updateQuantity(l.product.id, Number(e.target.value) || 1)} />
            <button type="button" className="sb-icon-btn" onClick={() => updateQuantity(l.product.id, 0)}><Trash2 size={14} /></button>
          </div>
        ))}

        {lines.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 0', flexWrap: 'wrap' }}>
              {promo ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <Tag size={14} /> Code <strong>{promo.code}</strong> applied
                  <button type="button" className="sb-icon-btn" onClick={removePromo}>Remove</button>
                </div>
              ) : (
                <>
                  <input className="sb-input" placeholder="Discount code" value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())} style={{ maxWidth: 160 }} />
                  <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" disabled={applyingPromo || !promoInput.trim()} onClick={applyPromo}>
                    Apply
                  </button>
                </>
              )}
            </div>
            {promoError && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13, marginTop: -6 }}>{promoError}</p>}

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 14 }}>
              <span>Subtotal</span>
              <span>{formatCents(subtotalCents, currency)}</span>
            </div>
            {discountCents > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 14, color: 'var(--sb-primary, var(--accent))' }}>
                <span>Discount</span>
                <span>-{formatCents(discountCents, currency)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 16px', fontWeight: 600, borderTop: '1px solid var(--sb-border, #e5e1d6)', marginTop: 4 }}>
              <span>Total</span>
              <span>{formatCents(totalCents, currency)}</span>
            </div>

            {!loggedIn && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                <input className="sb-input" type="email" placeholder="Your email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} required />
                <input className="sb-input" placeholder="Phone (optional)" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} />
              </div>
            )}

            <TurnstileWidget onToken={setCaptchaToken} />

            {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13 }}>{error}</p>}

            <button type="button" className="sb-button" disabled={checkingOut || captchaToken === undefined} onClick={checkout} style={{ width: '100%' }}>
              {checkingOut ? 'Redirecting to checkout…' : 'Checkout'}
            </button>
          </>
        )}
      </div>
      <SiteFooter subdomain={subdomain} />
    </div>
  );
}
