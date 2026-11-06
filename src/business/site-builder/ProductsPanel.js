import React, { useEffect, useState } from 'react';
import { Package, Plus, Pencil, Trash2, ClipboardList, Tag } from 'lucide-react';
import apiRequest from '../../ApiRequest';
import UploadFile from '../../Uploadfile';

function formatCents(cents, currency) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: (currency || 'usd').toUpperCase() }).format((cents || 0) / 100);
}

function ProductForm({ businessId, product, onSaved, onCancel }) {
  const [name, setName] = useState(product?.name || '');
  const [description, setDescription] = useState(product?.description || '');
  const [price, setPrice] = useState(product ? (product.price_cents / 100).toFixed(2) : '');
  const [compareAtPrice, setCompareAtPrice] = useState(product?.compare_at_price_cents ? (product.compare_at_price_cents / 100).toFixed(2) : '');
  const [inventory, setInventory] = useState(product?.inventory_count ?? '');
  const [images, setImages] = useState(product?.images || []);
  const [active, setActive] = useState(product?.active ?? true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const uploadImage = (filename) => {
    apiRequest('GET', null, `/business/upload-url/${filename}`).then(({ url }) => setImages((imgs) => [...imgs, url]));
  };

  const submit = (e) => {
    e.preventDefault();
    const priceCents = Math.round(Number(price) * 100);
    if (!name.trim() || !priceCents || priceCents <= 0) {
      setError('A name and a price greater than $0 are required.');
      return;
    }
    const compareAtPriceCents = compareAtPrice === '' ? null : Math.round(Number(compareAtPrice) * 100);
    if (compareAtPriceCents !== null && compareAtPriceCents <= priceCents) {
      setError('The "was" price must be higher than the current price for it to show as a sale.');
      return;
    }
    setSaving(true);
    setError('');
    const body = {
      name: name.trim(),
      description: description.trim() || null,
      price_cents: priceCents,
      compare_at_price_cents: compareAtPriceCents,
      images,
      inventory_count: inventory === '' ? null : Number(inventory),
      active,
    };
    const req = product
      ? apiRequest('PUT', body, `/business/products/${product.id}`)
      : apiRequest('POST', body, `/business/businesses/${businessId}/products`);
    req.then(onSaved).catch((err) => setError(typeof err === 'string' ? err : 'Could not save.')).finally(() => setSaving(false));
  };

  return (
    <form onSubmit={submit} className="sb-new-page-form" style={{ maxWidth: 420 }}>
      {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13 }}>{error}</p>}
      <input className="gs-input" placeholder="Product name" value={name} onChange={(e) => setName(e.target.value)} required />
      <textarea className="gs-input" placeholder="Description (optional)" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input className="gs-input" type="number" step="0.01" min="0.01" placeholder="Price ($)" value={price} onChange={(e) => setPrice(e.target.value)} style={{ flex: '1 1 140px' }} required />
        <input className="gs-input" type="number" step="0.01" min="0.01" placeholder="Was price (optional, for a sale)" value={compareAtPrice} onChange={(e) => setCompareAtPrice(e.target.value)} style={{ flex: '1 1 140px' }} />
        <input className="gs-input" type="number" min="0" placeholder="Stock (blank = unlimited)" value={inventory} onChange={(e) => setInventory(e.target.value)} style={{ flex: '1 1 140px' }} />
      </div>
      <div>
        <UploadFile apiextension="/business/upload" setInvestors={uploadImage} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {images.map((src, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <img src={src} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6 }} />
              <button type="button" className="sb-icon-btn sb-gallery-remove" onClick={() => setImages(images.filter((_, idx) => idx !== i))}><Trash2 size={10} /></button>
            </div>
          ))}
        </div>
      </div>
      <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active (visible on your site)
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="gs-btn gs-btn-sm" disabled={saving}>Save</button>
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function OrdersList({ businessId }) {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  const load = () => apiRequest('GET', null, `/business/businesses/${businessId}/orders`).then((d) => setOrders(d.orders)).catch(() => setOrders([]));
  useEffect(() => { load(); }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fulfill = (id) => {
    setError('');
    apiRequest('PATCH', {}, `/business/orders/${id}/fulfill`).then(load).catch((err) => setError(typeof err === 'string' ? err : 'Could not mark that order fulfilled.'));
  };

  if (!orders) return <div className="gs-loading"><div className="gs-spinner" /></div>;
  if (orders.length === 0) return <p className="gs-empty">No orders yet.</p>;

  return (
    <div>
      {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13 }}>{error}</p>}
    <div className="admin-list">
      {orders.map((o) => (
        <div key={o.id} className="admin-card">
          <div className="admin-card-top">
            <span className={`admin-badge ${o.status === 'paid' || o.status === 'fulfilled' ? 'approved' : 'pending'}`}>{o.status}</span>
            <span className="admin-date">{o.created_at ? new Date(o.created_at).toLocaleDateString() : ''}</span>
          </div>
          <div style={{ fontSize: 13 }}>
            {o.customer_label} -- {formatCents(o.total_cents, o.currency)}
            {o.promo_code && <span style={{ color: 'var(--muted)' }}> (code {o.promo_code}, -{formatCents(o.discount_cents, o.currency)})</span>}
          </div>
          <div className="admin-card-meta">{o.items.map((i) => `${i.quantity}x ${i.product_name}`).join(', ')}</div>
          {o.status === 'paid' && (
            <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" style={{ marginTop: 8 }} onClick={() => fulfill(o.id)}>Mark fulfilled</button>
          )}
        </div>
      ))}
    </div>
    </div>
  );
}

function PromoCodeForm({ businessId, promo, onSaved, onCancel }) {
  const [code, setCode] = useState(promo?.code || '');
  const [discountType, setDiscountType] = useState(promo?.discount_type || 'percent');
  const [amount, setAmount] = useState(promo ? (promo.discount_type === 'percent' ? promo.amount : (promo.amount / 100).toFixed(2)) : '');
  const [maxRedemptions, setMaxRedemptions] = useState(promo?.max_redemptions ?? '');
  const [expiresAt, setExpiresAt] = useState(promo?.expires_at ? promo.expires_at.slice(0, 10) : '');
  const [active, setActive] = useState(promo?.active ?? true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    const amountNum = Number(amount);
    if (!code.trim() || !amountNum || amountNum <= 0) {
      setError('A code and an amount greater than 0 are required.');
      return;
    }
    setSaving(true);
    setError('');
    const body = {
      code: code.trim(),
      discount_type: discountType,
      amount: discountType === 'percent' ? Math.round(amountNum) : Math.round(amountNum * 100),
      max_redemptions: maxRedemptions === '' ? null : Number(maxRedemptions),
      expires_at: expiresAt || null,
      active,
    };
    const req = promo
      ? apiRequest('PUT', body, `/business/promo-codes/${promo.id}`)
      : apiRequest('POST', body, `/business/businesses/${businessId}/promo-codes`);
    req.then(onSaved).catch((err) => setError(typeof err === 'string' ? err : 'Could not save.')).finally(() => setSaving(false));
  };

  return (
    <form onSubmit={submit} className="sb-new-page-form" style={{ maxWidth: 420 }}>
      {error && <p style={{ color: 'var(--danger, #b42318)', fontSize: 13 }}>{error}</p>}
      <input className="gs-input" placeholder="Code (e.g. SAVE10)" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <select className="gs-select" value={discountType} onChange={(e) => setDiscountType(e.target.value)} style={{ flex: '1 1 140px' }}>
          <option value="percent">% off</option>
          <option value="fixed">$ off</option>
        </select>
        <input className="gs-input" type="number" step={discountType === 'percent' ? '1' : '0.01'} min="0.01"
          placeholder={discountType === 'percent' ? 'Percent off (e.g. 10)' : 'Amount off ($)'}
          value={amount} onChange={(e) => setAmount(e.target.value)} style={{ flex: '1 1 140px' }} required />
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input className="gs-input" type="number" min="1" placeholder="Max uses (blank = unlimited)" value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value)} style={{ flex: '1 1 140px' }} />
        <input className="gs-input" type="date" placeholder="Expires (optional)" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} style={{ flex: '1 1 140px' }} />
      </div>
      <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="gs-btn gs-btn-sm" disabled={saving}>Save</button>
        <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function PromoCodesPanel({ businessId }) {
  const [promos, setPromos] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = () => apiRequest('GET', null, `/business/businesses/${businessId}/promo-codes`).then((d) => setPromos(d.promo_codes)).catch(() => setPromos([]));
  useEffect(() => { load(); }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!promos) return <div className="gs-loading"><div className="gs-spinner" /></div>;

  return (
    <div className="gs-card" style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}><Tag size={18} /> Discount codes</h3>
        {!formOpen && (
          <button type="button" className="gs-btn gs-btn-sm" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus size={14} /> Add code</button>
        )}
      </div>

      {formOpen && (
        <div style={{ marginTop: 14 }}>
          <PromoCodeForm
            businessId={businessId}
            promo={editing}
            onSaved={() => { setFormOpen(false); setEditing(null); load(); }}
            onCancel={() => { setFormOpen(false); setEditing(null); }}
          />
        </div>
      )}

      <div className="admin-list" style={{ marginTop: 14 }}>
        {promos.length === 0 && !formOpen && <p className="gs-empty">No discount codes yet.</p>}
        {promos.map((promo) => (
          <div key={promo.id} className="admin-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <strong>{promo.code}</strong> {!promo.active && <span className="admin-badge rejected">Inactive</span>}
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {promo.discount_type === 'percent' ? `${promo.amount}% off` : `${formatCents(promo.amount, 'usd')} off`}
                {' · '}{promo.redemption_count} used{promo.max_redemptions ? ` / ${promo.max_redemptions}` : ''}
                {promo.expires_at && ` · expires ${new Date(promo.expires_at).toLocaleDateString()}`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => { setEditing(promo); setFormOpen(true); }}><Pencil size={13} /> Edit</button>
              <button
                type="button"
                className="sb-icon-btn"
                title="Delete"
                onClick={() => { if (window.confirm(`Delete code "${promo.code}"?`)) apiRequest('DELETE', null, `/business/promo-codes/${promo.id}`).then(load); }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProductsPanel({ businessId }) {
  const [products, setProducts] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showOrders, setShowOrders] = useState(false);

  // ProductsPanel lives on the Site settings screen; the product_grid/
  // product_detail blocks that actually DISPLAY products live over in the
  // separate full-bleed PageEditor (ProductBlocks.js). They have no shared
  // state otherwise, so this is how one tells the other "something
  // changed" -- without it, a product added here never shows up over
  // there until that other screen happens to remount.
  const load = () => apiRequest('GET', null, `/business/businesses/${businessId}/products`)
    .then((d) => { setProducts(d.products); window.dispatchEvent(new Event('gs-products-changed')); })
    .catch(() => setProducts([]));
  useEffect(() => { load(); }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!products) return <div className="gs-loading"><div className="gs-spinner" /></div>;

  return (
    <>
    <div className="gs-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}><Package size={18} /> Products</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setShowOrders((s) => !s)}>
            <ClipboardList size={14} /> {showOrders ? 'Hide orders' : 'Orders'}
          </button>
          {!formOpen && (
            <button type="button" className="gs-btn gs-btn-sm" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus size={14} /> Add product</button>
          )}
        </div>
      </div>

      {showOrders && <div style={{ marginTop: 14 }}><OrdersList businessId={businessId} /></div>}

      {formOpen && (
        <div style={{ marginTop: 14 }}>
          <ProductForm
            businessId={businessId}
            product={editing}
            onSaved={() => { setFormOpen(false); setEditing(null); load(); }}
            onCancel={() => { setFormOpen(false); setEditing(null); }}
          />
        </div>
      )}

      <div className="admin-list" style={{ marginTop: 14 }}>
        {products.length === 0 && !formOpen && <p className="gs-empty">No products yet.</p>}
        {products.map((p) => (
          <div key={p.id} className="admin-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {p.images?.[0] && <img src={p.images[0]} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6 }} />}
              <div>
                <strong>{p.name}</strong> {!p.active && <span className="admin-badge rejected">Hidden</span>} {p.on_sale && <span className="admin-badge approved">Sale</span>}
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {p.on_sale ? (
                    <>
                      <span style={{ textDecoration: 'line-through' }}>{formatCents(p.compare_at_price_cents, p.currency)}</span>{' '}
                      {formatCents(p.price_cents, p.currency)}
                    </>
                  ) : formatCents(p.price_cents, p.currency)}
                  {' · '}{p.inventory_count === null ? 'Unlimited stock' : `${p.inventory_count} in stock`}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => { setEditing(p); setFormOpen(true); }}><Pencil size={13} /> Edit</button>
              <button
                type="button"
                className="sb-icon-btn"
                title="Delete"
                onClick={() => { if (window.confirm(`Delete "${p.name}"?`)) apiRequest('DELETE', null, `/business/products/${p.id}`).then(load); }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
    <PromoCodesPanel businessId={businessId} />
    </>
  );
}
