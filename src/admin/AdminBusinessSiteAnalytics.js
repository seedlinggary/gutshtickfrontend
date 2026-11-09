import React, { useEffect, useMemo, useState } from 'react';
import { Store } from 'lucide-react';
import apiRequest from '../ApiRequest';
import VisitorSessionsTable from './VisitorSessionsTable';

const NEW_COLOR = 'var(--info, #3b82f6)';
const RETURNING_COLOR = 'var(--accent, #f59e0b)';
const BOUNCED_COLOR = 'var(--muted-faint, #cbd5e1)';
const CHART_HEIGHT = 100;

function formatShortDate(isoDate) {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function Legend() {
  return (
    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 10, height: 10, borderRadius: 2, background: NEW_COLOR, display: 'inline-block' }} />
        New
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 10, height: 10, borderRadius: 2, background: RETURNING_COLOR, display: 'inline-block' }} />
        Returning
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 10, height: 10, borderRadius: 2, background: BOUNCED_COLOR, display: 'inline-block' }} />
        Bounced
      </span>
    </div>
  );
}

/**
 * Traffic for business-owner storefronts (site='business-site' -- every
 * subdomain a claimed business built with the site builder), kept separate
 * from the rest of Gut Shtick's analytics instead of folded into the
 * all-sites dashboard, with the same depth (visitors, geography,
 * new-vs-returning, session length, "who's coming") plus a picker for
 * "every storefront" vs. one/a few specific businesses -- the one thing
 * the generic per-sub-site dashboard can't do, since every storefront
 * self-reports the same generic site id (see siteMode.js's
 * businessSiteDescriptor; VisitorSession.business_id is what tells them
 * apart server-side).
 *
 * Mounted at the bottom of AdminAnalytics.js's Visitor Analytics panel.
 */
export default function AdminBusinessSiteAnalytics() {
  const [businesses, setBusinesses] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]); // empty = all businesses
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest('GET', null, '/analytics/business-site-businesses')
      .then((d) => setBusinesses(d.businesses || []))
      .catch(() => setBusinesses([]));
  }, []);

  const businessIdsParam = useMemo(() => (selectedIds.length > 0 ? selectedIds.join(',') : ''), [selectedIds]);

  function load() {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ site: 'business-site' });
    if (businessIdsParam) params.set('business_id', businessIdsParam);
    apiRequest('GET', null, `/analytics/dashboard?${params.toString()}`)
      .then((d) => setData(d))
      .catch((e) => setError(typeof e === 'string' ? e : 'Failed to load business-site analytics.'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [businessIdsParam]); // eslint-disable-line react-hooks/exhaustive-deps

  const dailyNewReturning = data?.daily_new_vs_returning || [];
  const maxDaily = dailyNewReturning.reduce((m, d) => Math.max(m, d.new + d.returning + (d.bounced || 0)), 0) || 1;

  function toggleBusiness(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div style={{ marginTop: 40, paddingTop: 28, borderTop: '2px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}><Store size={18} /> Business-Site Analytics</h2>
          <p className="admin-empty" style={{ margin: '4px 0 0', padding: 0, textAlign: 'left' }}>
            Traffic for business-owner storefronts (every claimed business's own subdomain built with the site
            builder) -- kept separate from the rest of the platform's numbers above.
          </p>
        </div>
        <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={load} disabled={loading}>
          ↻ Refresh
        </button>
      </div>

      {businesses && businesses.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
            <button
              className={`difficulty-btn${selectedIds.length === 0 ? ' active' : ''}`}
              onClick={() => setSelectedIds([])}
            >
              All businesses ({businesses.length})
            </button>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              {selectedIds.length > 0 ? `${selectedIds.length} selected` : 'or pick specific businesses below'}
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 120, overflowY: 'auto', padding: 4 }}>
            {businesses.map((b) => (
              <button
                key={b.id}
                className={`difficulty-btn${selectedIds.includes(b.id) ? ' active' : ''}`}
                style={{ fontSize: 12 }}
                onClick={() => toggleBusiness(b.id)}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {businesses && businesses.length === 0 && (
        <div className="admin-empty" style={{ marginBottom: 18 }}>No storefront traffic tracked yet.</div>
      )}

      {loading && <div className="gs-loading"><div className="gs-spinner" /></div>}
      {!loading && error && <div className="gs-error-box">{error}</div>}

      {!loading && !error && data && (
        <div>
          <div className="superadmin-stats-grid" style={{ marginBottom: 24 }}>
            {['7d', '30d', '90d'].map((key) => {
              const v = data.visitors?.[key] || { total: 0, logged_in: 0, anonymous: 0 };
              const nr = data.new_vs_returning?.[key] || { new: 0, returning: 0, bounced: 0 };
              const colors = { '7d': 'blue', '30d': 'green', '90d': 'purple' };
              return (
                <div key={key} className={`sa-stat-card ${colors[key]}`}>
                  <div className="sa-stat-num">{v.total}</div>
                  <div className="sa-stat-label">{key.replace('d', '')}-Day Visitors</div>
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                    {v.logged_in} logged-in · {v.anonymous} anonymous
                  </div>
                  <div style={{ marginTop: 2, fontSize: 12, opacity: 0.75 }}>
                    {nr.new} new · {nr.returning} returning · {nr.bounced} never went past 1 page
                  </div>
                </div>
              );
            })}
            <div className="sa-stat-card teal">
              <div className="sa-stat-num">{data.avg_page_views ?? 0}</div>
              <div className="sa-stat-label">Avg. Page Views</div>
            </div>
            <div className="sa-stat-card blue">
              <div className="sa-stat-num">{data.session_duration?.avg_minutes ?? 0} min</div>
              <div className="sa-stat-label">Avg. Time on Site</div>
            </div>
            <div className="sa-stat-card amber">
              <div className="sa-stat-num">{data.session_duration?.bounce_rate ?? 0}%</div>
              <div className="sa-stat-label">Bounce Rate</div>
            </div>
          </div>

          <div className="sa-activity-grid">
            <div className="sa-activity-section">
              <h4>Top Countries</h4>
              {(!data.top_countries || data.top_countries.length === 0) && (
                <div className="admin-empty">No geo data yet.</div>
              )}
              {data.top_countries?.map((c, i) => (
                <div key={i} className="sa-activity-item">
                  <span>{c.country || 'Unknown'}</span>
                  <span>{c.count} visitor{c.count === 1 ? '' : 's'}</span>
                </div>
              ))}
            </div>

            <div className="sa-activity-section">
              <h4>New vs Returning vs Bounced — Last 30 Days</h4>
              {dailyNewReturning.length === 0 && <div className="admin-empty">No visitor activity yet.</div>}
              {dailyNewReturning.length > 0 && (
                <>
                  <Legend />
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start', gap: 2, height: CHART_HEIGHT, marginTop: 6, marginBottom: 6 }}>
                    {dailyNewReturning.map((d, i) => {
                      const bounced = d.bounced || 0;
                      const total = d.new + d.returning + bounced;
                      const totalPx = total > 0 ? Math.max(3, (total / maxDaily) * CHART_HEIGHT) : 0;
                      const segments = [
                        { value: d.new, color: NEW_COLOR },
                        { value: d.returning, color: RETURNING_COLOR },
                        { value: bounced, color: BOUNCED_COLOR },
                      ].filter((s) => s.value > 0);
                      return (
                        <div key={i} title={`${formatShortDate(d.date)}: ${total} total`} style={{ flex: '1 1 0', minWidth: 2, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: CHART_HEIGHT }}>
                          <div style={{ height: totalPx, borderRadius: '3px 3px 0 0', overflow: 'hidden' }}>
                            {segments.map((s, si) => (
                              <div key={si} style={{ height: `${(s.value / total) * 100}%`, background: s.color, opacity: 0.9 }} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)' }}>
                    <span>{formatShortDate(dailyNewReturning[0].date)}</span>
                    <span>{formatShortDate(dailyNewReturning[dailyNewReturning.length - 1].date)}</span>
                  </div>
                </>
              )}
            </div>

            {data.top_paths && data.top_paths.length > 0 && (
              <div className="sa-activity-section">
                <h4>Top Pages</h4>
                {data.top_paths.map((p, i) => (
                  <div key={i} className="sa-activity-item">
                    <span>{i + 1}. {p.path}</span>
                    <span>{p.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <VisitorSessionsTable
        site="business-site"
        businessIds={selectedIds.length > 0 ? selectedIds : null}
        heading="Who's Coming — Storefronts"
        description="Every real storefront visitor session. Filter to a single business above to see just their traffic."
        showBusinessColumn
        showSiteColumn={false}
      />
    </div>
  );
}
