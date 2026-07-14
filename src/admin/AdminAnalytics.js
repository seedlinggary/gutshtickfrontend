import React, { useEffect, useState } from 'react';
import apiRequest from '../ApiRequest';

const ROLE_LABEL = { logged_in: 'Logged-in', anonymous: 'Anonymous' };

function formatShortDate(isoDate) {
  // isoDate comes back as 'YYYY-MM-DD' from the backend's daily_trend.
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Self-contained SuperAdmin panel: visitor/session analytics for reporting
 * to advertisers (unique visitors, session length, geography). Same
 * self-contained-panel pattern as AdminAiPosts.js -- no required props,
 * fetches its own data. Meant to be dropped into its own SuperAdminDashboard
 * tab (e.g. alongside 'overview', 'users', 'ads', ...).
 *
 * Backed by GET /analytics/dashboard, which is server-side cached for 60s
 * (@cache.cached), so "Refresh" won't show brand-new numbers more often
 * than that -- expected, not a bug.
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

  const trend = data?.daily_trend || [];
  const maxTrend = trend.reduce((m, d) => Math.max(m, d.count), 0) || 1;

  return (
    <div className="admin-analytics">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <h3 className="shtick-caption" style={{ marginBottom: 4 }}>📈 Visitor Analytics</h3>
          <p className="admin-empty" style={{ margin: 0 }}>
            Anonymous (cookie-based) + logged-in traffic. Localhost/dev traffic is excluded automatically.
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
              const colors = { '7d': 'blue', '30d': 'green', '90d': 'purple' };
              return (
                <div key={key} className={`sa-stat-card ${colors[key]}`}>
                  <div className="sa-stat-num">{v.total}</div>
                  <div className="sa-stat-label">{key.replace('d', '')}-Day Visitors</div>
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                    {v.logged_in} logged-in · {v.anonymous} anonymous
                  </div>
                </div>
              );
            })}
            <div className="sa-stat-card teal">
              <div className="sa-stat-num">{data.avg_session_minutes ?? 0}</div>
              <div className="sa-stat-label">Avg. Session (min)</div>
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

            {/* ── Daily new-visitor trend (last 30 days) ── */}
            <div className="sa-activity-section">
              <h4>New Visitors — Last 30 Days</h4>
              {trend.length === 0 && <div className="admin-empty">No visitor activity yet.</div>}
              {trend.length > 0 && (
                <div
                  style={{
                    display: 'flex', alignItems: 'flex-end', gap: 3,
                    height: 90, marginTop: 10, marginBottom: 6,
                  }}
                >
                  {trend.map((d, i) => (
                    <div
                      key={i}
                      title={`${formatShortDate(d.date)}: ${d.count} new visitor${d.count === 1 ? '' : 's'}`}
                      style={{
                        flex: 1,
                        minWidth: 3,
                        height: `${Math.max(4, (d.count / maxTrend) * 100)}%`,
                        background: 'var(--accent, #3b82f6)',
                        borderRadius: 2,
                        opacity: 0.85,
                      }}
                    />
                  ))}
                </div>
              )}
              {trend.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)' }}>
                  <span>{formatShortDate(trend[0].date)}</span>
                  <span>{formatShortDate(trend[trend.length - 1].date)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
