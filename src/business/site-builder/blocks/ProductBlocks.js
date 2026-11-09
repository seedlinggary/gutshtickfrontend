import React, { useEffect, useState } from 'react';
import { ShoppingBag, Plus, Check } from 'lucide-react';
import apiRequest from '../../../ApiRequest';
import { addToCart } from '../cart';

function formatCents(cents, currency) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: (currency || 'usd').toUpperCase() }).format((cents || 0) / 100);
}

function PriceDisplay({ product, size }) {
  if (!product.on_sale) {
    return <span style={{ fontSize: size, color: 'var(--muted)' }}>{formatCents(product.price_cents, product.currency)}</span>;
  }
  return (
    <span style={{ fontSize: size }}>
      <span style={{ textDecoration: 'line-through', color: 'var(--muted)', marginRight: 6 }}>{formatCents(product.compare_at_price_cents, product.currency)}</span>
      <strong style={{ color: 'var(--sb-primary, var(--accent))' }}>{formatCents(product.price_cents, product.currency)}</strong>
    </span>
  );
}

function AddToCartButton({ subdomain, productId, editable }) {
  const [added, setAdded] = useState(false);
  if (editable) {
    return <span className="sb-button sb-button-sm" style={{ opacity: 0.6 }}><Plus size={13} /> Add to cart</span>;
  }
  return (
    <button
      type="button"
      className="sb-button sb-button-sm"
      onClick={(e) => { e.preventDefault(); addToCart(subdomain, productId, 1); setAdded(true); setTimeout(() => setAdded(false), 1500); }}
    >
      {added ? <><Check size={13} /> Added</> : <><Plus size={13} /> Add to cart</>}
    </button>
  );
}

/** editable (owner canvas) fetches the owner-authenticated list (every
 * product, draft site or not); public render fetches the published-only
 * public list. Using the public list for BOTH used to mean a brand new
 * product never showed up in this block at all while the site was still
 * in Draft (every site starts in Draft) -- that endpoint 404s for
 * anything not yet published, by design, since a stranger shouldn't be
 * able to tell "draft" apart from "doesn't exist." The owner editing their
 * own site isn't that stranger. */
function fetchProductsFor(editable, businessId, subdomain) {
  if (editable && businessId) {
    return apiRequest('GET', null, `/business/businesses/${businessId}/products`)
      .then((d) => (d.products || []).map((p) => ({ ...p, in_stock: p.inventory_count == null || p.inventory_count > 0 })));
  }
  if (!subdomain) return Promise.resolve([]);
  return apiRequest('GET', null, `/business-site/public/${encodeURIComponent(subdomain)}/products`).then((d) => d.products);
}

export function ProductGridBody({ subdomain, businessId, editable }) {
  const [products, setProducts] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => fetchProductsFor(editable, businessId, subdomain).then((list) => { if (!cancelled) setProducts(list); }).catch(() => { if (!cancelled) setProducts([]); });
    load();
    // ProductsPanel.js (a separate screen entirely from this canvas) fires
    // this after create/update/delete -- without it, a product added while
    // this block is already mounted has no way to know anything changed,
    // since there's no shared state between the two components otherwise.
    const onChanged = () => load();
    window.addEventListener('gs-products-changed', onChanged);
    return () => { cancelled = true; window.removeEventListener('gs-products-changed', onChanged); };
  }, [subdomain, businessId, editable]);

  if (products === null) {
    return <div className="gs-loading" style={{ height: '100%' }}><div className="gs-spinner" /></div>;
  }
  if (products.length === 0) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6, color: 'var(--muted)' }}>
        <ShoppingBag size={22} style={{ opacity: 0.4 }} />
        <span style={{ fontSize: 13 }}>No products yet</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, width: '100%', height: '100%', overflow: 'auto' }}>
      {products.map((p) => (
        <div key={p.id} style={{ border: '1px solid var(--border, #e5e1d6)', borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {p.images?.[0] ? (
            <img src={p.images[0]} alt={p.name} style={{ width: '100%', height: 120, objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: 120, background: 'var(--border-soft, #eef3f0)' }} />
          )}
          <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
            <strong style={{ fontSize: 14 }}>{p.name}</strong>
            <PriceDisplay product={p} size={13} />
            <div style={{ marginTop: 'auto' }}>
              {p.in_stock ? (
                <AddToCartButton subdomain={subdomain} productId={p.id} editable={editable} />
              ) : (
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Out of stock</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProductDetailBody({ content, subdomain, businessId, editable }) {
  const [product, setProduct] = useState(null);
  const productId = content?.productId;

  useEffect(() => {
    if (!productId) { setProduct(null); return; }
    let cancelled = false;
    const load = () => {
      if (editable && businessId) {
        // No owner-side "get one product" route exists -- the list is
        // small enough per business that fetching it and picking the one
        // we want is simpler than adding a new backend endpoint for this.
        apiRequest('GET', null, `/business/businesses/${businessId}/products`)
          .then((d) => {
            if (cancelled) return;
            const p = (d.products || []).find((x) => x.id === productId);
            setProduct(p ? { ...p, in_stock: p.inventory_count == null || p.inventory_count > 0 } : null);
          })
          .catch(() => { if (!cancelled) setProduct(null); });
        return;
      }
      if (!subdomain) { setProduct(null); return; }
      apiRequest('GET', null, `/business-site/public/${encodeURIComponent(subdomain)}/products/${productId}`)
        .then((p) => { if (!cancelled) setProduct(p); })
        .catch(() => { if (!cancelled) setProduct(null); });
    };
    load();
    const onChanged = () => load();
    window.addEventListener('gs-products-changed', onChanged);
    return () => { cancelled = true; window.removeEventListener('gs-products-changed', onChanged); };
  }, [subdomain, businessId, productId, editable]);

  if (!productId) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>
        Pick a product in the panel on the right
      </div>
    );
  }
  if (!product) return <div className="gs-loading" style={{ height: '100%' }}><div className="gs-spinner" /></div>;

  return (
    <div className="sb-product-detail">
      {product.images?.[0] && <img src={product.images[0]} alt={product.name} className="sb-product-detail-image" />}
      <div className="sb-product-detail-body">
        <h2 style={{ margin: 0 }}>{product.name}</h2>
        <PriceDisplay product={product} size={18} />
        {product.description && <p style={{ color: 'var(--muted)' }}>{product.description}</p>}
        {product.in_stock ? (
          <AddToCartButton subdomain={subdomain} productId={product.id} editable={editable} />
        ) : (
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>Out of stock</span>
        )}
      </div>
    </div>
  );
}
