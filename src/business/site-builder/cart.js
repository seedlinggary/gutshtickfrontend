// Client-side-only cart (localStorage, keyed per subdomain) -- no server
// Cart table exists (see plan file tender-inventing-teapot.md's Phase 4
// section: "no server-side Cart table in v1"). A real Order only gets
// created at checkout time (POST /business-site/public/:subdomain/checkout),
// where every price is re-read fresh from the Product row server-side --
// nothing stored here is ever trusted as a price.
//
// Dispatches a window event on every write so components that don't own
// the cart (BusinessSiteNavbar's item-count badge) can react without a
// shared React context -- a plain `storage` event doesn't fire for writes
// made in the SAME tab, which is the common case here.
const EVENT = 'sb-cart-changed';

function keyFor(subdomain) {
  return `sb_cart_${subdomain}`;
}

export function getCart(subdomain) {
  try {
    return JSON.parse(localStorage.getItem(keyFor(subdomain)) || '{}');
  } catch (_) {
    return {};
  }
}

function setCart(subdomain, cart) {
  try {
    localStorage.setItem(keyFor(subdomain), JSON.stringify(cart));
  } catch (_) {
    // private window / blocked storage -- cart just won't persist, no crash
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { subdomain } }));
}

export function addToCart(subdomain, productId, quantity = 1) {
  const cart = getCart(subdomain);
  cart[productId] = (cart[productId] || 0) + quantity;
  setCart(subdomain, cart);
}

export function setCartQuantity(subdomain, productId, quantity) {
  const cart = getCart(subdomain);
  if (quantity <= 0) delete cart[productId];
  else cart[productId] = quantity;
  setCart(subdomain, cart);
}

export function clearCart(subdomain) {
  setCart(subdomain, {});
}

export function cartItemCount(subdomain) {
  return Object.values(getCart(subdomain)).reduce((sum, q) => sum + q, 0);
}

export function subscribeCart(callback) {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}
