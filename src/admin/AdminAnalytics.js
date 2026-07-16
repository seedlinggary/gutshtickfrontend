import React, { useEffect, useState } from 'react';
import apiRequest from '../ApiRequest';

const NEW_COLOR = 'var(--info, #3b82f6)';
const RETURNING_COLOR = 'var(--accent, #f59e0b)';
const CHART_HEIGHT = 100;

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
    </div>
  );
}

/**
 * Self-contained SuperAdmin panel: visitor/session analytics for reporting
 * to advertisers (unique visitors, geography, new-vs-returning). Same
 * self-contained-panel pattern as AdminAiPosts.js -- no required props,
 * fetches its own data. Meant to be dropped into its own SuperAdminDashboard
 * tab (e.g. alongside 'overview', 'users', 'ads', ...).
 *
 * Backed by GET /analytics/dashboard, which is server-side cached for 60s
 * (@cache.cached), so "Refresh" won't show brand-new numbers more often
 * than that -- expected, not a bug. Localhost traffic and admin/super_admin
 * accounts' own activity are both excluded server-side, so these numbers
 * reflect real visitors only.
 */
export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    setError('');
    apiRequest('GET', null, '/analytics/dashboard')
      .then((d) => setData(d))
      .catch((e) => setError(typeof e === 'string' ? e : 'Failed to load visitor analytics.'))
      .finally(() => setLoading(false));
  }

  const dailyNewReturning = data?.daily_new_vs_returning || [];
  const maxDaily = dailyNewReturning.reduce((m, d) => Math.max(m, d.new + d.returning), 0) || 1;

  return (
    <div className="admin-analytics">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <h3 className="shtick-caption" style={{ marginBottom: 4 }}>📈 Visitor Analytics</h3>
          <p className="admin-empty" style={{ margin: 0 }}>
            Anonymous + logged-in traffic. Localhost/dev traffic and admin activity are excluded automatically.
          </p>
        </div>
        <button className="gs-btn gs-btn-outline gs-btn-sm" onClick={load} disabled={loading}>
          ↻ Refresh
        </button>
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
              const nr = data.new_vs_returning?.[key] || { new: 0, returning: 0 };
              const colors = { '7d': 'blue', '30d': 'green', '90d': 'purple' };
              return (
                <div key={key} className={`sa-stat-card ${colors[key]}`}>
                  <div className="sa-stat-num">{v.total}</div>
                  <div className="sa-stat-label">{key.replace('d', '')}-Day Visitors</div>
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                    {v.logged_in} logged-in · {v.anonymous} anonymous
                  </div>
                  <div style={{ marginTop: 2, fontSize: 12, opacity: 0.75 }}>
                    {nr.new} new · {nr.returning} returning
                  </div>
                </div>
              );
            })}
            <div className="sa-stat-card teal">
              <div className="sa-stat-num">{data.avg_page_views ?? 0}</div>
              <div className="sa-stat-label">Avg. Page Views</div>
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
              <h4>New vs Returning — Last 30 Days</h4>
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
                      display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start', gap: 3,
                      height: CHART_HEIGHT, marginTop: 6, marginBottom: 6,
                    }}
                  >
                    {dailyNewReturning.map((d, i) => {
                      const total = d.new + d.returning;
                      const totalPx = Math.max(4, (total / maxDaily) * CHART_HEIGHT);
                      const newPx = total > 0 ? (d.new / total) * totalPx : 0;
                      const returningPx = Math.max(0, totalPx - newPx - (d.new > 0 && d.returning > 0 ? 2 : 0));
                      return (
                        <div
                          key={i}
                          title={`${formatShortDate(d.date)}: ${d.new} new, ${d.returning} returning`}
                          style={{
                            flex: '0 1 32px', minWidth: 3,
                            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                            height: CHART_HEIGHT,
                          }}
                        >
                          {d.new > 0 && (
                            <div style={{ height: newPx, background: NEW_COLOR, borderRadius: '2px 2px 0 0', opacity: 0.9 }} />
                          )}
                          {d.new > 0 && d.returning > 0 && <div style={{ height: 2 }} />}
                          {d.returning > 0 && (
                            <div
                              style={{
                                height: returningPx, background: RETURNING_COLOR, opacity: 0.9,
                                borderRadius: d.new > 0 ? '0 0 2px 2px' : '2px',
                              }}
                            />
                          )}
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
          </div>
        </div>
      )}
    </div>
  );
}
