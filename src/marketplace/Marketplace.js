import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Search, Plus, Star } from 'lucide-react';
import apiRequest from '../ApiRequest';
import { isLoggedIn } from '../auth';
import { useNearMe, NearMeShakeControls } from '../shared/NearMeShake';
import MarketplaceCard from './MarketplaceCard';
import { CONDITION_OPTIONS, COUNTRY_OPTIONS } from './constants';
import './marketplace.css';

const NEAR_ME_RADIUS_MILES = 25;

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'nearest', label: 'Nearest' },
];

export default function Marketplace() {
  const [categories, setCategories] = useState(null);

  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [condition, setCondition] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [freeOnly, setFreeOnly] = useState(false);
  const [shipsOnly, setShipsOnly] = useState(false);
  const [sort, setSort] = useState('newest');
  const [nearCoords, setNearCoords] = useState(null);

  const [page, setPage] = useState(1);
  const [items, setItems] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(20);
  const [loading, setLoading] = useState(true);
  const [shaking, setShaking] = useState(false);

  const { locating, nearMeActive, nearMeError, findNearMe } = useNearMe(
    (coords) => { setNearCoords(coords); setSort('nearest'); setPage(1); },
    () => { setNearCoords(null); setSort((s) => (s === 'nearest' ? 'newest' : s)); setPage(1); }
  );

  // There's no `sort=random` on this backend (unlike Business/Community's
  // own "shake the board") -- so "shake" here jumps to a random already-
  // known page of the current filtered set instead, for the same
  // "surprise me with something else" discovery feeling.
  const shake = () => {
    if (shaking) return;
    const maxPage = Math.max(1, Math.ceil(total / perPage));
    const randomPage = maxPage <= 1 ? 1 : 1 + Math.floor(Math.random() * maxPage);
    setShaking(true);
    setPage(randomPage);
    setTimeout(() => setShaking(false), 500);
  };

  useEffect(() => {
    apiRequest('GET', null, '/marketplace/categories').then((d) => setCategories(d.categories || {})).catch(() => setCategories({}));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), sort });
    if (q.trim()) params.set('q', q.trim());
    if (category) params.set('category', category);
    if (subcategory) params.set('subcategory', subcategory);
    if (city.trim()) params.set('city', city.trim());
    if (country) params.set('country', country);
    if (condition) params.set('condition', condition);
    if (freeOnly) params.set('free_only', '1');
    if (shipsOnly) params.set('ships_only', '1');
    if (priceMin !== '') params.set('price_min', priceMin);
    if (priceMax !== '') params.set('price_max', priceMax);
    if (nearCoords) { params.set('lat', nearCoords.lat); params.set('lng', nearCoords.lng); params.set('radius_miles', String(NEAR_ME_RADIUS_MILES)); }
    apiRequest('GET', null, `/marketplace/listings?${params.toString()}`)
      .then((d) => { setItems(d.items || []); setHasMore(!!d.has_more); setTotal(d.total || 0); setPerPage(d.per_page || 20); })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category, subcategory, city, country, condition, priceMin, priceMax, freeOnly, shipsOnly, sort, nearCoords, page]);

  const subcats = (category && categories && categories[category]?.subcategories) || [];

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 1180 }}>
        <div className="est-masthead">
          <div className="est-masthead-row">
            <div className="est-masthead-copy">
              <div className="est-masthead-kicker"><ShoppingBag size={13} /> Marketplace</div>
              <h1 className="est-masthead-title">Buy, sell, trade &amp; give away</h1>
              <p className="est-masthead-sub">Browse what the community is posting -- baby gear, furniture, seforim, and more. Free listings are tagged, and anything that ships isn't limited to your area.</p>
            </div>
            <NearMeShakeControls
              nearMeActive={nearMeActive} locating={locating} onNearMe={findNearMe}
              radiusMiles={NEAR_ME_RADIUS_MILES} shaking={shaking} onShake={shake} nearMeError={nearMeError}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0' }}>
          {isLoggedIn() && (
            <Link to="/marketplace/new" className="gs-btn gs-btn-primary"><Plus size={15} /> Post an Item</Link>
          )}
          {isLoggedIn() && (
            <Link to="/marketplace/mine" className="gs-btn gs-btn-outline"><Star size={15} /> My Marketplace</Link>
          )}
        </div>

        <div className="mp-filter-bar">
          <div style={{ position: 'relative', flex: '1 1 220px' }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--muted)' }} />
            <input
              className="gs-input"
              style={{ paddingLeft: 32, width: '100%' }}
              placeholder="Search items…"
              value={q}
              onChange={(e) => { setPage(1); setQ(e.target.value); }}
            />
          </div>

          <select className="gs-input" value={category} onChange={(e) => { setPage(1); setCategory(e.target.value); setSubcategory(''); }}>
            <option value="">All categories</option>
            {categories && Object.entries(categories).map(([key, c]) => <option key={key} value={key}>{c.label}</option>)}
          </select>

          {subcats.length > 0 && (
            <select className="gs-input" value={subcategory} onChange={(e) => { setPage(1); setSubcategory(e.target.value); }}>
              <option value="">All subcategories</option>
              {subcats.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}

          <input className="gs-input" style={{ flex: '1 1 140px' }} placeholder="City" value={city} onChange={(e) => { setPage(1); setCity(e.target.value); }} />

          <select className="gs-input" value={country} onChange={(e) => { setPage(1); setCountry(e.target.value); }}>
            <option value="">All countries</option>
            {COUNTRY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <select className="gs-input" value={condition} onChange={(e) => { setPage(1); setCondition(e.target.value); }}>
            <option value="">Any condition</option>
            {CONDITION_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>

          <input className="gs-input" style={{ flex: '1 1 100px' }} type="number" placeholder="Min $" value={priceMin} onChange={(e) => { setPage(1); setPriceMin(e.target.value); }} />
          <input className="gs-input" style={{ flex: '1 1 100px' }} type="number" placeholder="Max $" value={priceMax} onChange={(e) => { setPage(1); setPriceMax(e.target.value); }} />

          <select className="gs-input" value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} disabled={o.value === 'nearest' && !nearCoords}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="mp-chip-row" style={{ margin: '0 0 16px' }}>
          <button type="button" className={`difficulty-btn${freeOnly ? ' active' : ''}`} onClick={() => { setPage(1); setFreeOnly((v) => !v); }}>Free only</button>
          <button type="button" className={`difficulty-btn${shipsOnly ? ' active' : ''}`} onClick={() => { setPage(1); setShipsOnly((v) => !v); }}>Ships only</button>
        </div>

        {loading && <div className="gs-loading"><div className="gs-spinner" /> Loading listings…</div>}

        {!loading && items && items.length === 0 && (
          <div className="gs-empty">No listings found. Try different filters, or be the first to post one.</div>
        )}

        {!loading && items && items.length > 0 && (
          <div className="est-listing-grid">
            {items.map((l) => <MarketplaceCard key={l.id} listing={l} categories={categories} />)}
          </div>
        )}

        {!loading && (page > 1 || hasMore) && (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', margin: '20px 0' }}>
            <button className="gs-btn gs-btn-outline gs-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
            <button className="gs-btn gs-btn-outline gs-btn-sm" disabled={!hasMore} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
