import React, { useEffect, useState } from 'react';
import { LineChart } from 'lucide-react';
import apiRequest from '../ApiRequest';
import { listAllSites } from '../siteMode';
import VisitorSessionsTable from './VisitorSessionsTable';
import AdminBusinessSiteAnalytics from './AdminBusinessSiteAnalytics';

const NEW_COLOR = 'var(--info, #3b82f6)';
const RETURNING_COLOR = 'var(--accent, #f59e0b)';
const BOUNCED_COLOR = 'var(--muted-faint, #cbd5e1)';
const BY_SITE_COLOR = 'var(--accent, #f59e0b)';
const CHART_HEIGHT = 100;

// Real registry list (listAllSites()) instead of a hand-copied array that
// would drift from src/sites/registry.js as sites are added.
const SITES = [{ key: '', label: 'All sites' }, ...listAllSites().map((s) => ({ key: s.id, label: s.label }))];

function formatShortDate(isoDate) {
  // isoDate comes back as 'YYYY-MM-DD' from the backend's daily aggregates.
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
        Bounced (1 page, never came back)
      </span>
    </div>
  );
}

/**
 * Self-contained SuperAdmin panel: visitor/session analytics for reporting
 * to advertisers (unique visitors, geography, new-vs-returning), PLUS a
 * filterable, named list of actual sessions ("who's coming", and which of
 * them are repeat visitors) -- the aggregate counts above answer "how
 * many," this answers "who." Same self-contained-panel pattern as
 * AdminAiPosts.js -- no required props, fetches its own data.
 *
 * Backed by GET /analytics/dashboard (cached 60s server-side, varying by
 * `site`) and GET /analytics/sessions. Localhost traffic and every
 * admin/super_admin account's own activity (including any bot account,
 * since bots are given the `admin` role -- see the account-creation note
 * in memory) are excluded server-side from both, so these numbers and this
 * list reflect real visitors only, never your own testing or local dev.
 */
export default function AdminAnalytics() {
  const [site, setSite] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function loadDashboard() {
    setLoading(true);
    setError('');
    apiRequest('GET', null, `/analytics/dashboard?site=${encodeURIComponent(site)}`)
      .then((d) => setData(d))
      .catch((e) => setError(typeof e === 'string' ? e : 'Failed to load visitor analytics.'))
      .finally(() => setLoading(false));
  }

  useEffect(loadDashboard, [site]); // eslint-disable-line react-hooks/exhaustive-deps

  const dailyNewReturning = data?.daily_new_vs_returning || [];
  const maxDaily = dailyNewReturning.reduce((m, d) => Math.max(m, d.new + d.returning + (d.bounced || 0)), 0) || 1;

  return (
    <div className="admin-analytics">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h3 className="shtick-caption admin-section-label" style={{ marginBottom: 4 }}><LineChart size={16} /> Visitor Analytics</h3>
          <p className="admin-empty" style={{ margin: 0, padding: 0, textAlign: 'left' }}>
            Anonymous + logged-in traffic. Localhost/dev traffic and any admin or bot account's own activity are excluded automatically.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select className="gs-select" value={site} onChange={(e) => setSite(e.target.value)}>
            {SITES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={loadDashboard} disabled={loading}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {loading && (
        <div className="gs-loading"><div className="gs-spinner" /></div>
      )}

      {!loading && error && (
        <div className="gs-error-box">{error}</div>
      )}

      {!loading && !error && data && (
        <div>
          {/* ── Unique visitor counts ── */}
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
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>Across every visit, bounces included as 0</div>
            </div>
            <div className="sa-stat-card blue">
              <div className="sa-stat-num">{data.session_duration?.avg_minutes_engaged ?? 0} min</div>
              <div className="sa-stat-label">Avg. Time (Engaged Visits)</div>
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>Only visits that went past one page</div>
            </div>
            <div className="sa-stat-card amber">
              <div className="sa-stat-num">{data.session_duration?.bounce_rate ?? 0}%</div>
              <div className="sa-stat-label">Bounce Rate</div>
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>% of visit sessions, last 7 days</div>
            </div>
          </div>

          <div className="sa-activity-grid">
            {/* ── Top countries ── */}
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

            {/* ── New vs returning, per day (last 30 days) ── */}
            <div className="sa-activity-section">
              <h4>New vs Returning vs Bounced — Last 30 Days</h4>
              {dailyNewReturning.length === 0 && <div className="admin-empty">No visitor activity yet.</div>}
              {dailyNewReturning.length > 0 && dailyNewReturning.length < 3 && (
                <div className="admin-empty" style={{ marginBottom: 8 }}>
                  Only {dailyNewReturning.length} day{dailyNewReturning.length === 1 ? '' : 's'} of tracked
                  history so far — the trend will fill in as more days pass.
                </div>
              )}
              {dailyNewReturning.length > 0 && (
                <>
                  <Legend />
                  <div
                    style={{
                      display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start', gap: 2,
                      height: CHART_HEIGHT, marginTop: 6, marginBottom: 6,
                    }}
                  >
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
                        <div
                          key={i}
                          title={`${formatShortDate(d.date)}: ${total} total — ${d.new} new, ${d.returning} returning, ${bounced} bounced`}
                          style={{
                            flex: '1 1 0', minWidth: 2,
                            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                            height: CHART_HEIGHT,
                          }}
                        >
                          {/* One rounded, clipped container per bar -- segments inside
                              it are plain flush percentage-height fills, so the bar
                              always reads as a single clean pill regardless of how
                              many of the 3 categories are actually present that day. */}
                          <div style={{ height: totalPx, borderRadius: '3px 3px 0 0', overflow: 'hidden' }}>
                            {segments.map((s, si) => (
                              <div
                                key={si}
                                style={{ height: `${(s.value / total) * 100}%`, background: s.color, opacity: 0.9 }}
                              />
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

            {/* ── Which sites -- only present when viewing "All sites" ── */}
            {data.by_site && data.by_site.length > 0 && (
              <div className="sa-activity-section">
                <h4>Which Sites</h4>
                {(() => {
                  const maxTotal = data.by_site.reduce((m, s) => Math.max(m, s.total), 0) || 1;
                  return data.by_site.map((s) => (
                    <div key={s.site} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                        <span>{s.label || s.site}</span>
                        <span style={{ color: 'var(--muted)' }}>{s.total}</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.max(2, (s.total / maxTotal) * 100)}%`,
                            background: BY_SITE_COLOR,
                            borderRadius: 4,
                          }}
                        />
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}

            {/* ── Top pages ── */}
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

      {/* ── Who's coming -- filterable, sortable session list ── */}
      <VisitorSessionsTable
        site={site || null}
        description="Every real visitor session, named when they're logged in. “Returning” uses the same 2+ distinct days definition as the chart above, so this list and that chart always agree."
      />

      {/* ── Business-site (storefront) analytics -- kept separate from the
          rest of Gut Shtick's traffic below, same depth, with an
          all-businesses/just-these picker. ── */}
      <AdminBusinessSiteAnalytics />
    </div>
  );
}
