import React, { useEffect, useState, useCallback, useRef, Suspense, lazy } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  MapPin, Users, Landmark, Droplets, ShoppingBasket, UtensilsCrossed, FerrisWheel,
  Pencil, Trash2, GraduationCap, HeartHandshake, Map, Info, Star, Home, Briefcase,
  DollarSign, Compass, Building2, ArrowRight, LayoutGrid, AlertTriangle,
} from 'lucide-react';
import apiRequest, { apiRequestRaw } from '../ApiRequest';
import { isLoggedIn } from '../auth';
import { siteUrl } from '../siteMode';
import ErrorBoundary from '../ErrorBoundary';
import BusinessCard from './BusinessCard';
import { formatPrice } from '../estates/ListingCard';
import { CATEGORY_COLORS, CATEGORY_LABELS } from './BusinessMap';

const BusinessMap = lazy(() => import('./BusinessMap'));

function MapErrorFallback(error, retry) {
  return (
    <div className="gs-empty" style={{ padding: 24 }}>
      <Map size={32} style={{ marginBottom: 8, color: 'var(--muted-faint)' }} />
      <p>The map couldn't load.</p>
      <button className="gs-btn gs-btn-outline gs-btn-sm" style={{ marginTop: 8 }} onClick={retry}>Try again</button>
    </div>
  );
}

const SECTIONS = [
  { key: 'shuls', label: 'Shuls', icon: Landmark, emptyHint: 'No shuls found nearby yet. Know of one? Add it to the directory.' },
  { key: 'mikvahs', label: 'Mikvahs', icon: Droplets, emptyHint: 'No mikvah found nearby yet.' },
  { key: 'groceries', label: 'Groceries', icon: ShoppingBasket, emptyHint: 'No kosher grocery found nearby yet.' },
  { key: 'restaurants', label: 'Restaurants', icon: UtensilsCrossed, emptyHint: 'No restaurant found nearby yet.' },
  { key: 'schools', label: 'Schools & Yeshivos', icon: GraduationCap, emptyHint: 'No schools found nearby yet.' },
  { key: 'organizations', label: 'Community Organizations', icon: HeartHandshake, emptyHint: 'No community organizations (Hatzalah, Chevra Kadisha, Vaad Hakashrus, etc.) found nearby yet.' },
  { key: 'attractions', label: 'Activities & Attractions', icon: FerrisWheel, emptyHint: 'No activities added nearby yet.' },
];

// Mirrors src/estates/AreaPage.js's own LISTING_TYPE_LABEL exactly -- kept as
// a small local copy rather than importing it since AreaPage.js doesn't
// export it, same reasoning as other tiny enum-ish maps duplicated
// client-side elsewhere in this codebase.
const LISTING_TYPE_LABEL = { sale: 'For Sale', long_term_lease: 'For Rent (Long-Term)', short_term_lease: 'Short-Term Rentals' };

const HOUSING_ORDER = ['sale', 'long_term_lease', 'short_term_lease'];

// Same $ / ₪ convention as src/estates/ListingCard.js's formatPrice and
// AreaPage.js -- never assume $, since a bbox can genuinely mix USD and
// ILS listings (confirmed live near Beit Shemesh), and the backend now
// returns a separate median per currency rather than one blended number.
function formatCurrencyAmount(value, currency) {
  if (value == null) return '—';
  const symbol = currency === 'ILS' ? '₪' : '$';
  return `${symbol}${Math.round(value).toLocaleString()}`;
}

const COL_FIELDS = [
  { key: 'cost_of_living_index', label: 'Cost of Living Index' },
  { key: 'groceries', label: 'Groceries' },
  { key: 'utilities', label: 'Utilities' },
  { key: 'transportation', label: 'Transportation' },
  { key: 'day_school_tuition', label: 'Day School Tuition' },
  { key: 'kosher_grocery_premium', label: 'Kosher Grocery Premium' },
];

const TAB_META = {
  overview: { label: 'Overview', Icon: Compass },
  amenities: { label: 'Amenities', Icon: LayoutGrid },
  housing: { label: 'Housing', Icon: Home },
  jobs: { label: 'Jobs', Icon: Briefcase },
  cost_of_living: { label: 'Cost of Living', Icon: DollarSign },
  map: { label: 'Map', Icon: Map },
};

/** A lighter-weight cross-site listing tile for the Housing tab -- reuses
 * the exact same `.est-listing-card` markup/CSS as src/estates/ListingCard.js
 * (same class, so it looks identical), but swaps the inner react-router
 * `<Link to="/listings/:slug">` for a plain cross-domain `<a href>` built
 * via siteUrl(). This page lives on the Business sub-site while listings
 * live on Estates (a different hostname in production), so ListingCard's
 * own same-site <Link> would try to resolve "/listings/:slug" against this
 * site's own router instead of navigating across domains -- exactly the
 * "awkward cross-site" case the task called out to watch for. */
function HousingCard({ listing }) {
  return (
    <a
      href={siteUrl('estates', `/listings/${listing.slug}`)}
      target="_blank"
      rel="noopener noreferrer"
      className="est-listing-card"
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      {listing.cover_photo_url ? (
        <img src={listing.cover_photo_url} alt={listing.title} className="est-listing-card-img" />
      ) : (
        <div className="est-listing-card-img est-listing-card-img-placeholder"><Home size={28} /></div>
      )}
      <div className="est-listing-card-body">
        <div className="est-listing-card-price">{formatPrice(listing)}</div>
        <h3 dir="auto">{listing.title}</h3>
      </div>
    </a>
  );
}

/** A lighter inline card for the Jobs tab -- see HousingCard's note above
 * for why: src/money/Tachlis.js's PostCard also hard-codes a same-site
 * `<Link to="/tachlis/post/:id">`, and the job-post card objects this page
 * gets back only guarantee title/location/category/compensation/pub_date/
 * business_name (not the fuller fields PostCard's badges rely on), so a
 * purpose-built card is the cleaner fit the task description allows for. */
function JobCard({ post }) {
  return (
    <div className="gs-card" style={{ marginBottom: 10 }}>
      <div className="gs-card-body">
        <strong>{post.title}</strong>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 13, color: 'var(--muted)', margin: '6px 0' }}>
          {post.business_name && <span>{post.business_name}</span>}
          {post.location && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin size={13} /> {post.location}</span>}
          {post.category && <span>{post.category}</span>}
          {post.compensation && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><DollarSign size={13} /> {post.compensation}</span>}
        </div>
        <a href={siteUrl('money', `/tachlis/post/${post.id}`)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          View on Gut Money <ArrowRight size={13} />
        </a>
      </div>
    </div>
  );
}

export default function CommunityProfile() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [community, setCommunity] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState('overview');
  const [saving, setSaving] = useState(false);

  const [colData, setColData] = useState(null);
  const [colLoading, setColLoading] = useState(false);
  const [colError, setColError] = useState(false);
  const [selectedArea, setSelectedArea] = useState('');
  const prevSlugRef = useRef(slug);

  const fetchCommunity = useCallback((area) => {
    const params = area ? `?area=${encodeURIComponent(area)}` : '';
    return apiRequest('GET', null, `/business/communities/${slug}${params}`)
      .then(setCommunity)
      .catch(() => setNotFound(true));
  }, [slug]);

  // One combined effect, re-run whenever [slug, selectedArea] changes, per
  // the task's note to reuse the same fetch call on mount and on area
  // selection. Only resets the tab/cost-of-living cache/selected area when
  // navigating to a genuinely different community (not on every sub-area
  // re-fetch for the SAME community) -- if a slug change also needs the
  // area reset to '', that state update re-triggers this same effect rather
  // than issuing a second, redundant fetch here.
  useEffect(() => {
    const slugChanged = prevSlugRef.current !== slug;
    prevSlugRef.current = slug;
    setNotFound(false);
    if (slugChanged) {
      setCommunity(null);
      setTab('overview');
      setColData(null);
      setColError(false);
      if (selectedArea) { setSelectedArea(''); return; }
    }
    fetchCommunity(selectedArea);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, selectedArea]);

  useEffect(() => {
    if (tab !== 'cost_of_living' || colData || colLoading) return;
    setColLoading(true);
    setColError(false);
    apiRequestRaw('GET', null, `/business/communities/${slug}/cost-of-living`)
      .then(({ ok, data }) => {
        if (!ok || !data?.col) { setColError(true); return; }
        setColData(data.col);
      })
      .catch(() => setColError(true))
      .finally(() => setColLoading(false));
  }, [tab, slug, colData, colLoading]);

  const remove = () => {
    if (!window.confirm(`Delete the "${community.name}" community page? This won't delete any businesses.`)) return;
    apiRequest('DELETE', null, `/business/communities/${community.id}`)
      .then(() => navigate('/communities'))
      .catch(() => {});
  };

  const toggleSave = () => {
    if (saving || !community) return;
    const next = !community.is_saved;
    setSaving(true);
    setCommunity((c) => ({ ...c, is_saved: next }));
    apiRequest(next ? 'POST' : 'DELETE', null, `/business/communities/${slug}/save`)
      .catch(() => setCommunity((c) => ({ ...c, is_saved: !next })))
      .finally(() => setSaving(false));
  };

  if (notFound) {
    return (
      <div className="feed-section"><div className="gs-container" style={{ maxWidth: 1180 }}>
        <p>Community not found. <Link to="/communities">Back to Community</Link></p>
      </div></div>
    );
  }
  if (!community) {
    return <div className="feed-section"><div className="gs-container" style={{ maxWidth: 1180 }}><p style={{ color: 'var(--muted)' }}>Loading…</p></div></div>;
  }

  const amenities = community.amenities || {};
  const housing = community.housing || {};
  const jobs = community.jobs || { count: 0, radius_miles: 8, posts: [] };
  const subAreas = community.sub_areas || [];
  const meta = TAB_META[tab] || TAB_META.overview;

  // One combined points array for the Map tab -- built entirely from data
  // already in `community` state (no new fetch), tagged with `category` (so
  // BusinessMap's dot coloring applies) and `kind` (so the click handler
  // below knows whether to route same-site to a business profile or
  // cross-site to an Estates listing).
  const combinedPoints = [];
  SECTIONS.forEach(({ key }) => {
    (amenities[key] || []).forEach((b) => {
      // Businesses and Estates listings are separate tables with their own
      // independent id sequences -- tagging each point's `id` (the only
      // thing BusinessMap's click handler reports back) with a kind prefix
      // avoids a business and a listing colliding on the same raw numeric id.
      combinedPoints.push({ ...b, id: `b-${b.id}`, category: key, kind: 'business' });
    });
  });
  HOUSING_ORDER.forEach((key) => {
    (housing[key]?.listings || []).forEach((l) => {
      // BusinessMap reads lat/lng off `primary_location` (same adapter shape
      // FindCommunity.js uses for its own non-business points) -- estates
      // listing cards carry lat/lng at the top level instead.
      combinedPoints.push({ ...l, id: `h-${l.id}`, category: 'housing', kind: 'estates', primary_location: { lat: l.lat, lng: l.lng, city: l.city } });
    });
  });
  const presentCategories = Array.from(new Set(combinedPoints.map((p) => p.category)));
  const areaNote = `(showing all of ${community.name} — amenities/jobs aren't narrowed by sub-area yet)`;

  return (
    <div className="feed-section">
      <div className="gs-container" style={{ maxWidth: 1180 }}>
        <Link to="/communities" style={{ fontSize: 13, color: 'var(--muted)' }}>← All communities</Link>

        <div className="biz-masthead">
          <div className="biz-masthead-row">
            <div className="biz-masthead-copy">
              <div className="biz-masthead-kicker"><Users size={13} /> Community</div>
              <h1 className="biz-masthead-title">{community.name}</h1>
              <p className="biz-masthead-sub" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={14} /> {[community.city, community.state, community.country].filter(Boolean).join(', ')}
              </p>
              {community.description && <p className="biz-masthead-sub">{community.description}</p>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {isLoggedIn() && (
                <button
                  className={`gs-btn gs-btn-outline gs-btn-sm${community.is_saved ? ' active' : ''}`}
                  onClick={toggleSave}
                  disabled={saving}
                >
                  <Star size={13} fill={community.is_saved ? 'currentColor' : 'none'} /> {community.is_saved ? 'Saved' : 'Save'}
                </button>
              )}
              {community.can_manage && (
                <>
                  <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => navigate(`/communities/${slug}/edit`)}><Pencil size={13} /> Edit</button>
                  <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={remove}><Trash2 size={13} /> Delete</button>
                </>
              )}
            </div>
          </div>
        </div>

        {subAreas.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', margin: '16px 0' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Sub-area:</span>
            <button
              type="button"
              className={`gs-btn gs-btn-sm${selectedArea === '' ? ' gs-btn-primary' : ' gs-btn-outline'}`}
              onClick={() => setSelectedArea('')}
            >
              All of {community.name}
            </button>
            {subAreas.map((a) => (
              <button
                key={a.name}
                type="button"
                className={`gs-btn gs-btn-sm${selectedArea === a.name ? ' gs-btn-primary' : ' gs-btn-outline'}`}
                onClick={() => setSelectedArea(a.name)}
              >
                {a.name}
              </button>
            ))}
          </div>
        )}

        <div className="biz-owner-tools-layout">
          <nav className="biz-owner-tools-sidebar">
            <div className="biz-owner-tools-group">
              {Object.entries(TAB_META).map(([key, { label, Icon }]) => (
                <button
                  key={key}
                  type="button"
                  className={`biz-owner-tools-navbtn${key === tab ? ' active' : ''}`}
                  onClick={() => setTab(key)}
                >
                  <Icon size={16} /> {label}
                </button>
              ))}
            </div>
          </nav>

          <div className="biz-owner-tools-content">
            <h2 className="biz-owner-tools-content-title"><meta.Icon size={22} /> {meta.label}</h2>

            {tab === 'overview' && (
              <div>
                {(community.eruv_status || community.eruv_map_image_url) && (
                  <div className="gs-card" style={{ marginBottom: 16 }}>
                    <div className="gs-card-body">
                      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 6px' }}><Map size={18} /> Eruv</h3>
                      {community.eruv_status && (
                        <p style={{ margin: '0 0 6px' }}>
                          {community.eruv_status}
                          {community.eruv_url && (
                            <> — <a href={community.eruv_url} target="_blank" rel="noopener noreferrer">view eruv map</a></>
                          )}
                        </p>
                      )}
                      {community.eruv_map_image_url && (
                        <a href={community.eruv_map_image_url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={community.eruv_map_image_url}
                            alt={`${community.name} eruv map`}
                            style={{ maxWidth: '100%', borderRadius: 8, marginBottom: 8, display: 'block' }}
                          />
                        </a>
                      )}
                      {community.eruv_disclaimer && (
                        <p style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: 'var(--muted)', margin: 0 }}>
                          <Info size={13} /> {community.eruv_disclaimer}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="gs-card" style={{ marginBottom: 16 }}>
                  <div className="gs-card-body">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 10px' }}><Building2 size={18} /> Amenities</h3>
                    {community.radius_miles && (
                      <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 0 }}>
                        Within {community.radius_miles} miles of {community.name}.
                      </p>
                    )}
                    <p style={{ margin: '0 0 10px' }}>
                      {SECTIONS.map(({ key, label }, i) => {
                        const count = Object.keys(amenities[key] || {}).length;
                        return (
                          <span key={key}>
                            {i > 0 && ' · '}
                            {count} {label}
                          </span>
                        );
                      })}
                    </p>
                    <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setTab('amenities')}>
                      See amenities <ArrowRight size={13} />
                    </button>
                  </div>
                </div>

                <div className="gs-card" style={{ marginBottom: 16 }}>
                  <div className="gs-card-body">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 10px' }}><Home size={18} /> Housing</h3>
                    {HOUSING_ORDER.map((key) => {
                      const h = housing[key];
                      if (!h) return null;
                      return (
                        <p key={key} style={{ margin: '0 0 6px' }}>
                          {LISTING_TYPE_LABEL[key]}: {h.count || 0} listing{h.count === 1 ? '' : 's'}
                          {(h.by_currency || []).map((bc) => (
                            <span key={bc.currency}>
                              {' · '}median {formatCurrencyAmount(bc.median_price, bc.currency)}
                            </span>
                          ))}
                        </p>
                      );
                    })}
                    <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setTab('housing')}>
                      See housing <ArrowRight size={13} />
                    </button>
                  </div>
                </div>

                <div className="gs-card" style={{ marginBottom: 16 }}>
                  <div className="gs-card-body">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 10px' }}><Briefcase size={18} /> Jobs</h3>
                    <p style={{ margin: '0 0 10px' }}>
                      {jobs.count || 0} job{jobs.count === 1 ? '' : 's'} within about {jobs.radius_miles || 8} miles.
                    </p>
                    <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setTab('jobs')}>
                      See jobs <ArrowRight size={13} />
                    </button>
                  </div>
                </div>

                <div className="gs-card">
                  <div className="gs-card-body">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 10px' }}><DollarSign size={18} /> Cost of Living</h3>
                    <button type="button" className="gs-btn gs-btn-outline gs-btn-sm" onClick={() => setTab('cost_of_living')}>
                      See the full cost-of-living breakdown <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tab === 'amenities' && (
              <div>
                {selectedArea && (
                  <p style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: 'var(--muted)' }}>
                    <Info size={13} style={{ flexShrink: 0, marginTop: 2 }} /> {areaNote}
                  </p>
                )}
                {community.amenities_note && <p style={{ color: 'var(--muted)', fontSize: 13 }}>{community.amenities_note}</p>}
                {community.radius_miles && (
                  <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 0 }}>
                    Showing businesses within {community.radius_miles} miles of {community.name}.
                  </p>
                )}
                {SECTIONS.map(({ key, label, icon: Icon, emptyHint }) => {
                  const items = (community.amenities || {})[key] || [];
                  return (
                    <div key={key} style={{ marginBottom: 24 }}>
                      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}><Icon size={19} /> {label}</h3>
                      {items.length === 0 ? (
                        <p style={{ color: 'var(--muted)', fontSize: 13 }}>{emptyHint}</p>
                      ) : (
                        <div className="biz-amenity-grid">
                          {items.map((b) => <BusinessCard key={b.id} business={b} />)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {tab === 'housing' && (
              <div>
                {HOUSING_ORDER.map((key) => {
                  const h = housing[key];
                  const listings = h?.listings || [];
                  return (
                    <div key={key} style={{ marginBottom: 28 }}>
                      <h3 style={{ marginBottom: 4 }}>{LISTING_TYPE_LABEL[key]}</h3>
                      <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 0, marginBottom: 4 }}>
                        {h?.count || 0} listing{h?.count === 1 ? '' : 's'}
                        {(h?.by_currency || []).map((bc) => (
                          <span key={bc.currency}>
                            {' · '}median {formatCurrencyAmount(bc.median_price, bc.currency)} ({bc.count})
                          </span>
                        ))}
                      </p>
                      {(h?.by_currency || []).map((bc) => (
                        bc.by_bedrooms.length > 0 && (
                          <p key={bc.currency} style={{ color: 'var(--muted)', fontSize: 12, marginTop: 0, marginBottom: 4 }}>
                            {bc.currency}: {bc.by_bedrooms.map((bucket) => (
                              `${bucket.is_max_bucket ? `${bucket.bedrooms}+` : bucket.bedrooms} BR: ${formatCurrencyAmount(bucket.median_price, bc.currency)} (${bucket.count})`
                            )).join(' · ')}
                          </p>
                        )
                      ))}
                      {listings.length === 0 ? (
                        <p style={{ color: 'var(--muted)', fontSize: 13 }}>No {LISTING_TYPE_LABEL[key].toLowerCase()} listings found nearby yet.</p>
                      ) : (
                        <div className="est-listing-grid">
                          {listings.map((l) => <HousingCard key={l.id} listing={l} />)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {tab === 'jobs' && (
              <div>
                {selectedArea && (
                  <p style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: 'var(--muted)' }}>
                    <Info size={13} style={{ flexShrink: 0, marginTop: 2 }} /> {areaNote}
                  </p>
                )}
                <p style={{ color: 'var(--muted)', fontSize: 13 }}>
                  Jobs within about a {jobs.radius_miles || 8}-mile radius of {community.name} — straight-line distance, not real drive time.
                </p>
                {(jobs.posts || []).length === 0 ? (
                  <p style={{ color: 'var(--muted)', fontSize: 13 }}>No job posts found nearby yet.</p>
                ) : (
                  (jobs.posts || []).map((p) => <JobCard key={p.id} post={p} />)
                )}
              </div>
            )}

            {tab === 'cost_of_living' && (
              <div>
                <p style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
                  <Info size={13} style={{ flexShrink: 0, marginTop: 2 }} /> AI-generated general estimate — not precise local data.
                </p>
                {colLoading && (
                  <div className="gs-loading"><div className="gs-spinner" /> Loading cost-of-living estimate…</div>
                )}
                {!colLoading && colError && (
                  <p style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted)' }}>
                    <AlertTriangle size={15} /> Cost-of-living estimates aren't available right now.
                  </p>
                )}
                {!colLoading && !colError && colData && (
                  <div className="biz-analytics-tiles">
                    {COL_FIELDS.map(({ key, label }) => (
                      <div key={key} className="biz-analytics-tile">
                        <div className="biz-analytics-tile-value">{colData[key] || '—'}</div>
                        <div className="biz-analytics-tile-label">{label}</div>
                      </div>
                    ))}
                  </div>
                )}
                {!colLoading && !colError && colData?.confidence_note && (
                  <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 14 }}>{colData.confidence_note}</p>
                )}
              </div>
            )}

            {tab === 'map' && (
              <div>
                <ErrorBoundary fallback={MapErrorFallback}>
                  <Suspense fallback={<div className="gs-loading"><div className="gs-spinner" /> Loading map…</div>}>
                    <BusinessMap
                      businesses={combinedPoints}
                      onSelectBusiness={(id) => {
                        const item = combinedPoints.find((p) => p.id === id);
                        if (!item) return;
                        if (item.kind === 'business') navigate(`/business/${item.slug}`);
                        else if (item.kind === 'estates') window.open(siteUrl('estates', `/listings/${item.slug}`), '_blank', 'noopener,noreferrer');
                      }}
                    />
                  </Suspense>
                </ErrorBoundary>
                {presentCategories.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 12, fontSize: 12, color: 'var(--muted)' }}>
                    {presentCategories.map((cat) => (
                      <span key={cat} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: CATEGORY_COLORS[cat] || CATEGORY_COLORS.default, display: 'inline-block' }} />
                        {CATEGORY_LABELS[cat] || cat}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
