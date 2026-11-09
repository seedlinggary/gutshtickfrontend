import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import apiRequest from '../ApiRequest';

const PAGE_SIZE = 50;
const MAX_SORT_KEYS = 3;

const COLUMNS = [
  { field: 'user_name', label: 'Who', sortable: true, width: '140px' },
  { field: 'business_name', label: 'Business', sortable: true, businessOnly: true, width: '140px' },
  { field: 'site', label: 'Site', sortable: true, width: '110px' },
  { field: 'country', label: 'Country', sortable: true, width: '100px' },
  { field: 'first_seen', label: 'First seen', sortable: true, width: '140px' },
  { field: 'last_seen', label: 'Last seen', sortable: true, width: '140px' },
  { field: 'page_view_count', label: 'Page views', sortable: true, width: '90px' },
  { field: 'days_active', label: 'Status', sortable: false, width: '130px' },
];

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/**
 * Reusable "who's coming" session table -- backs both the site-wide Visitor
 * Analytics panel (AdminAnalytics.js) and the per-storefront section
 * (AdminBusinessSiteAnalytics.js) so the same depth (filter by any column,
 * multi-column priority sort) is available in both places instead of only
 * the main one.
 *
 * Sorting: click a column to sort by just that column (click again to flip
 * direction); shift-click to ADD it as another sort key instead of
 * replacing -- up to 3 keys deep, each shown with its priority number and
 * direction arrow, e.g. click "Page views" then shift-click "Last seen" to
 * sort by page views first, breaking ties by last seen. Mirrors
 * /analytics/sessions' own ?sort=field:dir,field2:dir2 shape (see
 * visitor.py's _parse_sort).
 *
 * Filtering: every column has a real filter -- text-contains for Who/
 * Site/Country, a min/max range for Page views, plus the existing Logged-
 * in/Anonymous and Repeat-visitors-only toggles and the day-window picker.
 */
export default function VisitorSessionsTable({
  site = null,
  businessIds = null,
  heading = "Who's Coming",
  description,
  showBusinessColumn = false,
  showSiteColumn = true,
}) {
  const [days, setDays] = useState(30);
  const [loggedInFilter, setLoggedInFilter] = useState('');
  const [repeatOnly, setRepeatOnly] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [countryInput, setCountryInput] = useState('');
  const [minViews, setMinViews] = useState('');
  const [maxViews, setMaxViews] = useState('');
  const [sortKeys, setSortKeys] = useState([{ field: 'last_seen', desc: true }]);
  const [page, setPage] = useState(1);

  const [sessions, setSessions] = useState(null);
  const [loading, setLoading] = useState(true);

  const name = useDebounced(nameInput);
  const country = useDebounced(countryInput);

  const businessIdsKey = (businessIds || []).join(',');

  function load() {
    setLoading(true);
    const params = new URLSearchParams({ days: String(days), page: String(page) });
    if (site) params.set('site', site);
    if (businessIds && businessIds.length > 0) params.set('business_id', businessIds.join(','));
    if (loggedInFilter) params.set('logged_in', loggedInFilter);
    if (repeatOnly) params.set('repeat_only', '1');
    if (name.trim()) params.set('name', name.trim());
    if (country.trim()) params.set('country', country.trim());
    if (minViews !== '') params.set('min_views', minViews);
    if (maxViews !== '') params.set('max_views', maxViews);
    if (sortKeys.length > 0) params.set('sort', sortKeys.map((k) => `${k.field}:${k.desc ? 'desc' : 'asc'}`).join(','));
    apiRequest('GET', null, `/analytics/sessions?${params.toString()}`)
      .then((d) => setSessions(d))
      .catch(() => setSessions({ sessions: [], total: 0 }))
      .finally(() => setLoading(false));
  }

  useEffect(load, [site, businessIdsKey, days, loggedInFilter, repeatOnly, name, country, minViews, maxViews, sortKeys, page]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1); }, [site, businessIdsKey, days, loggedInFilter, repeatOnly, name, country, minViews, maxViews, sortKeys]); // eslint-disable-line react-hooks/exhaustive-deps

  const columns = useMemo(
    () => COLUMNS.filter((c) => (c.businessOnly ? showBusinessColumn : true) && (c.field !== 'site' || showSiteColumn)),
    [showBusinessColumn, showSiteColumn],
  );
  // The shared .sa-session-row CSS class fixes a 7-column grid -- this
  // table's column set varies (business column optional, site column
  // sometimes hidden), so the actual track widths are set inline per row
  // instead, overriding just that one property.
  const gridTemplateColumns = columns.map((c) => c.width).join(' ');

  function toggleSort(field, additive) {
    setSortKeys((prev) => {
      const idx = prev.findIndex((k) => k.field === field);
      if (additive) {
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { field, desc: !next[idx].desc };
          return next;
        }
        return [...prev, { field, desc: false }].slice(0, MAX_SORT_KEYS);
      }
      if (prev.length === 1 && idx === 0) return [{ field, desc: !prev[0].desc }];
      return [{ field, desc: false }];
    });
  }

  const hasActiveFilters = loggedInFilter || repeatOnly || nameInput || countryInput || minViews !== '' || maxViews !== '';

  return (
    <div className="sa-activity" style={{ marginTop: 28 }}>
      <h2>{heading}</h2>
      {description && (
        <p className="admin-empty" style={{ margin: '0 0 12px', padding: 0, textAlign: 'left' }}>{description}</p>
      )}

      <div className="sa-user-filters" style={{ alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <select className="gs-select" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
        {[
          { key: '', label: 'All' },
          { key: 'true', label: 'Logged-in' },
          { key: 'false', label: 'Anonymous' },
        ].map((o) => (
          <button key={o.key} className={`difficulty-btn${loggedInFilter === o.key ? ' active' : ''}`} onClick={() => setLoggedInFilter(o.key)}>
            {o.label}
          </button>
        ))}
        <button className={`difficulty-btn${repeatOnly ? ' active' : ''}`} onClick={() => setRepeatOnly((v) => !v)}>
          Repeat visitors only
        </button>
        {hasActiveFilters && (
          <button
            className="gs-btn gs-btn-outline gs-btn-sm"
            onClick={() => { setLoggedInFilter(''); setRepeatOnly(false); setNameInput(''); setCountryInput(''); setMinViews(''); setMaxViews(''); }}
          >
            Clear filters
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '8px 0 12px' }}>
        <input
          type="text" className="auth-input" style={{ maxWidth: 200 }}
          placeholder="Filter by who…" value={nameInput} onChange={(e) => setNameInput(e.target.value)}
        />
        <input
          type="text" className="auth-input" style={{ maxWidth: 160 }}
          placeholder="Filter by country…" value={countryInput} onChange={(e) => setCountryInput(e.target.value)}
        />
        <input
          type="number" className="auth-input" style={{ maxWidth: 130 }}
          placeholder="Min page views" value={minViews} onChange={(e) => setMinViews(e.target.value)}
        />
        <input
          type="number" className="auth-input" style={{ maxWidth: 130 }}
          placeholder="Max page views" value={maxViews} onChange={(e) => setMaxViews(e.target.value)}
        />
      </div>
      <p className="admin-empty" style={{ margin: '0 0 10px', padding: 0, textAlign: 'left', fontSize: 12 }}>
        Click a column to sort by it; shift-click another column to add it as a tie-breaker (up to 3, shown as 1/2/3).
      </p>

      {loading && <div className="gs-loading"><div className="gs-spinner" /></div>}

      {!loading && sessions && sessions.sessions.length === 0 && (
        <div className="admin-empty">No matching visitor sessions in this window.</div>
      )}

      {!loading && sessions && sessions.sessions.length > 0 && (
        <>
          <div className="sa-user-table">
            <div className="sa-session-row header" style={{ gridTemplateColumns }}>
              {columns.map((c) => {
                const sortIdx = sortKeys.findIndex((k) => k.field === c.field);
                const active = sortIdx >= 0;
                return (
                  <span
                    key={c.field}
                    onClick={c.sortable ? (e) => toggleSort(c.field, e.shiftKey) : undefined}
                    style={c.sortable ? { cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, userSelect: 'none' } : undefined}
                    title={c.sortable ? 'Click to sort, shift-click to add as tie-breaker' : undefined}
                  >
                    {c.label}
                    {active && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: 'var(--accent)' }}>
                        {sortKeys.length > 1 && <span style={{ fontSize: 10, fontWeight: 700 }}>{sortIdx + 1}</span>}
                        {sortKeys[sortIdx].desc ? <ArrowDown size={11} /> : <ArrowUp size={11} />}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
            {sessions.sessions.map((s, i) => (
              <div key={i} className="sa-session-row" style={{ gridTemplateColumns }}>
                <span className="sa-profile">{s.user_name || 'Anonymous'}</span>
                {showBusinessColumn && <span>{s.business_name || '—'}</span>}
                {showSiteColumn && <span>{s.site_label}</span>}
                <span>{s.country}</span>
                <span>{formatDateTime(s.first_seen)}</span>
                <span>{formatDateTime(s.last_seen)}</span>
                <span>{s.page_view_count}</span>
                <span>
                  {s.is_returning
                    ? <span className="admin-badge approved">Returning · {s.days_active}d</span>
                    : <span className="admin-badge pending">New</span>}
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{sessions.total} total</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="gs-btn gs-btn-outline gs-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Newer</button>
              <button className="gs-btn gs-btn-outline gs-btn-sm" disabled={!sessions.has_more} onClick={() => setPage((p) => p + 1)}>Older</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
